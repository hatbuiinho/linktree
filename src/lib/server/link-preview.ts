import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { env } from '$env/dynamic/private';
import { youtubeVideoId, youtubeWatchUrl } from '$lib/youtube';
import { storeLinkPreviewImage } from './uploads';

// Open Graph tags live in the document head. Reading only this prefix avoids
// downloading large application payloads such as YouTube channel pages.
const MAX_HTML_HEAD_SIZE = 384 * 1024;
// YouTube puts channel Open Graph tags after a large bootstrap script, often
// 700 KB or more into the response instead of near the start of <head>.
const MAX_YOUTUBE_CHANNEL_HTML_SIZE = 3 * 1024 * 1024;
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 8_000;
const MAX_REDIRECTS = 3;

export type LinkPreview = {
	url: string;
	title: string;
	description: string | null;
	imageUrl: string | null;
};

type YouTubeChannel = {
	title: string;
	thumbnailUrl: string | null;
	subscriberCount: string | null;
};

type YouTubeOEmbed = {
	title?: string;
	author_name?: string;
	author_url?: string;
};

function isPrivateIpv4(address: string) {
	const parts = address.split('.').map(Number);
	if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255))
		return true;
	const [a, b] = parts;
	return (
		a === 0 ||
		a === 10 ||
		a === 127 ||
		(a === 100 && b >= 64 && b <= 127) ||
		(a === 169 && b === 254) ||
		(a === 172 && b >= 16 && b <= 31) ||
		(a === 192 && b === 168) ||
		(a === 198 && (b === 18 || b === 19)) ||
		a >= 224
	);
}

function isPrivateAddress(address: string) {
	const version = isIP(address);
	if (version === 4) return isPrivateIpv4(address);
	if (version !== 6) return true;
	const normalized = address.toLowerCase();
	if (
		normalized === '::' ||
		normalized === '::1' ||
		normalized.startsWith('fc') ||
		normalized.startsWith('fd')
	)
		return true;
	if (
		normalized.startsWith('fe8') ||
		normalized.startsWith('fe9') ||
		normalized.startsWith('fea') ||
		normalized.startsWith('feb')
	)
		return true;
	const mappedIpv4 = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
	return mappedIpv4 ? isPrivateIpv4(mappedIpv4[1]) : false;
}

export async function assertPublicHttpUrl(value: string) {
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		throw new Error('URL không hợp lệ.');
	}
	if (url.protocol !== 'http:' && url.protocol !== 'https:')
		throw new Error('Chỉ hỗ trợ URL http hoặc https.');
	if (url.username || url.password || (url.port && url.port !== '80' && url.port !== '443'))
		throw new Error('URL không được phép.');
	if (url.hostname.toLowerCase() === 'localhost') throw new Error('URL nội bộ không được phép.');

	const directIp = isIP(url.hostname);
	if (directIp) {
		if (isPrivateAddress(url.hostname)) throw new Error('URL nội bộ không được phép.');
		return url;
	}

	const addresses = await lookup(url.hostname, { all: true, verbatim: true });
	if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address)))
		throw new Error('URL nội bộ không được phép.');
	return url;
}

async function fetchPublicUrl(input: URL) {
	let url = input;
	for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
		const response = await fetch(url, {
			redirect: 'manual',
			signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
			headers: {
				'user-agent': 'TTPQ Links Preview/1.0',
				accept: 'text/html, image/*;q=0.8, */*;q=0.1'
			}
		});
		if (response.status < 300 || response.status >= 400) return { response, url };
		const location = response.headers.get('location');
		if (!location || redirect === MAX_REDIRECTS) throw new Error('URL chuyển hướng quá nhiều lần.');
		url = await assertPublicHttpUrl(new URL(location, url).toString());
	}
	throw new Error('Không thể tải URL.');
}

async function readBody(response: Response, maxSize: number) {
	const contentLength = Number(response.headers.get('content-length') || 0);
	if (contentLength > maxSize) throw new Error('Nội dung quá lớn.');
	if (!response.body) return new Uint8Array();
	const reader = response.body.getReader();
	const chunks: Uint8Array[] = [];
	let size = 0;
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			size += value.byteLength;
			if (size > maxSize) throw new Error('Nội dung quá lớn.');
			chunks.push(value);
		}
	} finally {
		reader.releaseLock();
	}
	const result = new Uint8Array(size);
	let offset = 0;
	for (const chunk of chunks) {
		result.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return result;
}

async function readHtmlHead(response: Response) {
	if (!response.body) return new Uint8Array();

	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let html = '';
	let size = 0;
	try {
		while (size < MAX_HTML_HEAD_SIZE) {
			const { done, value } = await reader.read();
			if (done) {
				html += decoder.decode();
				break;
			}
			const remaining = MAX_HTML_HEAD_SIZE - size;
			const chunk = value.byteLength > remaining ? value.subarray(0, remaining) : value;
			size += chunk.byteLength;
			html += decoder.decode(chunk, { stream: true });
			const headEnd = html.search(/<\/head\s*>/i);
			if (headEnd >= 0) return new TextEncoder().encode(html.slice(0, headEnd + 7));
		}
		return new TextEncoder().encode(html);
	} finally {
		await reader.cancel().catch(() => undefined);
		reader.releaseLock();
	}
}

async function readYoutubeChannelHtml(response: Response) {
	if (!response.body) return '';
	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let html = '';
	let size = 0;
	try {
		while (size < MAX_YOUTUBE_CHANNEL_HTML_SIZE) {
			const { done, value } = await reader.read();
			if (done) break;
			const remaining = MAX_YOUTUBE_CHANNEL_HTML_SIZE - size;
			const chunk = value.byteLength > remaining ? value.subarray(0, remaining) : value;
			size += chunk.byteLength;
			html += decoder.decode(chunk, { stream: true });
			if (/property=["']og:image["'][^>]*>/i.test(html)) break;
		}
		return html;
	} finally {
		await reader.cancel().catch(() => undefined);
		reader.releaseLock();
	}
}

function decodeHtml(value: string) {
	return value
		.replace(/&#(x[0-9a-f]+|\d+);?/gi, (_, code: string) => {
			const value = code.startsWith('x')
				? Number.parseInt(code.slice(1), 16)
				: Number.parseInt(code, 10);
			return Number.isFinite(value) ? String.fromCodePoint(value) : '';
		})
		.replace(
			/&(amp|quot|apos|lt|gt);/gi,
			(_, entity: string) =>
				({ amp: '&', quot: '"', apos: "'", lt: '<', gt: '>' })[entity.toLowerCase()] ?? ''
		);
}

function text(value: string | undefined, maxLength: number) {
	if (!value) return null;
	const cleaned = decodeHtml(value.replace(/<[^>]+>/g, ' '))
		.replace(/\s+/g, ' ')
		.trim();
	return cleaned ? cleaned.slice(0, maxLength) : null;
}

function attributes(tag: string) {
	const values = new Map<string, string>();
	for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g)) {
		values.set(match[1].toLowerCase(), match[2] ?? match[3] ?? match[4] ?? '');
	}
	return values;
}

function metadata(html: string, key: string) {
	for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
		const values = attributes(tag);
		if ((values.get('property') ?? values.get('name') ?? '').toLowerCase() === key)
			return values.get('content');
	}
	return undefined;
}

function youtubeHandle(url: URL) {
	if (!/(^|\.)youtube\.com$/i.test(url.hostname)) return null;
	const handle = url.pathname.split('/').find((part) => part.startsWith('@'));
	return handle ? decodeURIComponent(handle) : null;
}

function channelTitle(value: string | null) {
	return value?.replace(/\s*-\s*YouTube$/i, '').trim() || null;
}

function formatSubscriberCount(value: string | undefined) {
	const count = Number(value);
	if (!Number.isFinite(count)) return null;
	return `${new Intl.NumberFormat('vi-VN', {
		notation: 'compact',
		maximumFractionDigits: 1
	}).format(count)} người đăng ký`;
}

function youtubeChannelReference(value: string) {
	try {
		const url = new URL(value);
		if (!/(^|\.)youtube\.com$/i.test(url.hostname)) return null;
		const channelId = /^\/channel\/([A-Za-z0-9_-]+)\/?$/.exec(url.pathname)?.[1];
		if (channelId) return { channelId, handle: null, url };
		const handle = url.pathname.split('/').find((part) => part.startsWith('@')) ?? null;
		return handle ? { channelId: null, handle: decodeURIComponent(handle), url } : null;
	} catch {
		return null;
	}
}

async function fetchYoutubeChannelFromPage(value: string): Promise<YouTubeChannel | null> {
	try {
		const requestedUrl = await assertPublicHttpUrl(value);
		const { response } = await fetchPublicUrl(requestedUrl);
		if (!response.ok) return null;
		const html = await readYoutubeChannelHtml(response);
		const title = channelTitle(
			text(metadata(html, 'og:title') ?? metadata(html, 'twitter:title'), 180)
		);
		const image = metadata(html, 'og:image') ?? metadata(html, 'twitter:image');
		return title || image
			? {
					title: title ?? 'Kênh YouTube',
					thumbnailUrl: image ? new URL(decodeHtml(image), requestedUrl).toString() : null,
					subscriberCount: null
				}
			: null;
	} catch {
		return null;
	}
}

async function fetchYoutubeChannel(value: string): Promise<YouTubeChannel | null> {
	const reference = youtubeChannelReference(value);
	const apiKey = env.YOUTUBE_API_KEY?.trim();
	if (apiKey && reference) {
		try {
			const requestUrl = new URL('https://www.googleapis.com/youtube/v3/channels');
			requestUrl.searchParams.set('part', 'snippet,statistics');
			if (reference.channelId) requestUrl.searchParams.set('id', reference.channelId);
			else if (reference.handle) requestUrl.searchParams.set('forHandle', reference.handle);
			requestUrl.searchParams.set('key', apiKey);
			const response = await fetch(requestUrl, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
			if (!response.ok) return null;
			const body = (await response.json()) as {
				items?: Array<{
					snippet?: {
						title?: string;
						thumbnails?: { high?: { url?: string }; default?: { url?: string } };
					};
					statistics?: { subscriberCount?: string; hiddenSubscriberCount?: boolean };
				}>;
			};
			const channel = body.items?.[0];
			if (!channel?.snippet?.title) return null;
			return {
				title: channel.snippet.title,
				thumbnailUrl:
					channel.snippet.thumbnails?.high?.url ?? channel.snippet.thumbnails?.default?.url ?? null,
				subscriberCount: channel.statistics?.hiddenSubscriberCount
					? null
					: formatSubscriberCount(channel.statistics?.subscriberCount)
			};
		} catch {
			// The public channel page remains a useful no-key fallback.
		}
	}
	return fetchYoutubeChannelFromPage(value);
}

async function fetchYoutubeVideoPreview(value: string): Promise<LinkPreview | null> {
	const id = youtubeVideoId(value);
	const watchUrl = youtubeWatchUrl(value);
	if (!id || !watchUrl) return null;

	try {
		const requestUrl = new URL('https://www.youtube.com/oembed');
		requestUrl.searchParams.set('url', watchUrl);
		requestUrl.searchParams.set('format', 'json');
		const response = await fetch(requestUrl, {
			signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
			headers: { 'user-agent': 'TTPQ Links Preview/1.0' }
		});
		if (!response.ok) return null;
		const body = (await response.json()) as YouTubeOEmbed;
		const channel = body.author_url ? await fetchYoutubeChannel(body.author_url) : null;
		const authorName = text(body.author_name, 120);
		return {
			url: watchUrl,
			title: text(body.title, 180) ?? 'Video YouTube',
			description: channel?.title ?? authorName,
			imageUrl: channel?.thumbnailUrl ?? null
		};
	} catch {
		return null;
	}
}

export async function fetchLinkPreview(value: string): Promise<LinkPreview> {
	const youtubePreview = await fetchYoutubeVideoPreview(value);
	if (youtubePreview) return youtubePreview;

	const requestedUrl = await assertPublicHttpUrl(value);
	const { response, url } = await fetchPublicUrl(requestedUrl);
	if (!response.ok) throw new Error(`Không thể tải trang (${response.status}).`);
	if (!response.headers.get('content-type')?.toLowerCase().includes('text/html'))
		throw new Error('URL không trả về trang web HTML.');

	const html = new TextDecoder().decode(await readHtmlHead(response));
	const documentTitle = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1];
	let title = text(
		metadata(html, 'og:title') ?? metadata(html, 'twitter:title') ?? documentTitle,
		180
	);
	let description = text(
		metadata(html, 'og:description') ??
			metadata(html, 'twitter:description') ??
			metadata(html, 'description'),
		160
	);
	const image = metadata(html, 'og:image') ?? metadata(html, 'twitter:image');
	let imageUrl: string | null = null;
	if (image) {
		try {
			imageUrl = (await assertPublicHttpUrl(new URL(decodeHtml(image), url).toString())).toString();
		} catch {
			// A page preview remains useful even when its social image is unavailable.
		}
	}
	const handle = youtubeHandle(url);
	if (handle) {
		const channel = await fetchYoutubeChannel(url.toString());
		title = channel?.title ?? channelTitle(title) ?? handle;
		if (channel?.thumbnailUrl) imageUrl = channel.thumbnailUrl;
		description = [handle, channel?.subscriberCount].filter(Boolean).join(' · ') || description;
	}

	return { url: url.toString(), title: title ?? url.hostname, description, imageUrl };
}

export async function importLinkPreviewImage(pageId: string, value: string) {
	const { response } = await fetchPublicUrl(await assertPublicHttpUrl(value));
	if (!response.ok) throw new Error(`Không thể tải ảnh (${response.status}).`);
	const contentType =
		response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() || '';
	if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(contentType))
		throw new Error('Ảnh xem trước phải là JPG, PNG, WEBP hoặc GIF.');
	const content = await readBody(response, MAX_IMAGE_SIZE);
	return storeLinkPreviewImage({ pageId, contentType, content });
}
