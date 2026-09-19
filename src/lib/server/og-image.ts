import sharp from 'sharp';
import type { Block, Page, Theme } from '$lib/server/db/schema';
import { blockImageUrl } from './share-link';
import { assertPublicHttpUrl } from './link-preview';

const WIDTH = 1200;
const HEIGHT = 630;
const MAX_REMOTE_IMAGE_SIZE = 8 * 1024 * 1024;
const OG_FONT_FAMILY = 'Noto Og';

let ogFontCss: Promise<string> | null = null;

function loadOgFont(origin: string) {
	if (!ogFontCss) {
		ogFontCss = fetch(new URL('/fonts/NotoSans-Bold.ttf', origin))
			.then(async (response) => {
				if (!response.ok) throw new Error(`Không thể tải font OG: ${response.status}`);
				const font = Buffer.from(await response.arrayBuffer()).toString('base64');
				return `@font-face { font-family: '${OG_FONT_FAMILY}'; src: url(data:font/ttf;base64,${font}) format('truetype'); font-weight: 400 900; }`;
			})
			.catch(() => '');
	}
	return ogFontCss;
}

function escapeXml(value: string) {
	return value.replace(/[<>&'"]/g, (character) => {
		return (
			{ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[character] || ''
		);
	});
}

function wrapTitle(value: string, limit = 20) {
	const words = value.trim().split(/\s+/).filter(Boolean);
	const lines: string[] = [];
	let line = '';
	for (const word of words) {
		const candidate = line ? `${line} ${word}` : word;
		if (candidate.length > limit && line) {
			lines.push(line);
			line = word;
		} else {
			line = candidate;
		}
	}
	if (line) lines.push(line);

	// OG title area only has room for two rows. Merge the remaining text into
	// the second row while keeping a safe width for SVG rendering.
	if (lines.length > 2) {
		return [lines[0], lines.slice(1).join(' ')];
	}
	return lines.length ? lines : ['LIÊN KẾT'];
}

function titleFontSize(value: string) {
	const length = value.trim().length;
	if (length > 48) return 34;
	if (length > 32) return 40;
	if (length > 20) return 48;
	return 58;
}

function backgroundColor(theme: Theme | null) {
	return theme?.backgroundType === 'color' && /^#[0-9a-f]{6}$/i.test(theme.backgroundValue)
		? theme.backgroundValue
		: '#172554';
}

function darken({ r, g, b }: { r: number; g: number; b: number }, amount: number) {
	return `rgb(${Math.round(r * amount)} ${Math.round(g * amount)} ${Math.round(b * amount)})`;
}

async function prominentColor(image: Buffer) {
	const { data, info } = await sharp(image)
		.resize(80, 80, { fit: 'cover' })
		.removeAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });
	const buckets = new Map<string, { r: number; g: number; b: number; score: number }>();

	for (let index = 0; index < data.length; index += info.channels) {
		const r = data[index];
		const g = data[index + 1];
		const b = data[index + 2];
		const max = Math.max(r, g, b);
		const min = Math.min(r, g, b);
		const saturation = max === 0 ? 0 : (max - min) / max;
		if (saturation < 0.32 || max < 65) continue;
		const key = `${Math.round(r / 32)}-${Math.round(g / 32)}-${Math.round(b / 32)}`;
		const bucket = buckets.get(key) || { r: 0, g: 0, b: 0, score: 0 };
		const weight = saturation * (0.55 + max / 510);
		bucket.r += r * weight;
		bucket.g += g * weight;
		bucket.b += b * weight;
		bucket.score += weight;
		buckets.set(key, bucket);
	}

	const winner = [...buckets.values()].sort((a, b) => b.score - a.score)[0];
	if (!winner) return null;
	return {
		r: Math.round(winner.r / winner.score),
		g: Math.round(winner.g / winner.score),
		b: Math.round(winner.b / winner.score)
	};
}

function destinationLabel(value: string | null) {
	if (!value) return 'Chia sẻ từ trang liên kết';
	try {
		const url = new URL(value);
		const path = url.pathname.length > 1 ? url.pathname : '';
		return `${url.hostname.replace(/^www\./, '')}${path}`.slice(0, 46);
	} catch {
		return 'Chia sẻ từ trang liên kết';
	}
}

async function fetchImage(url: string | null, publicOnly = false) {
	if (!url) return null;
	try {
		let target = publicOnly ? await assertPublicHttpUrl(url) : new URL(url);
		let response: Response | null = null;
		for (let redirects = 0; redirects <= 3; redirects += 1) {
			response = await fetch(target, { redirect: 'manual', signal: AbortSignal.timeout(4_000) });
			if (response.status < 300 || response.status >= 400) break;
			const location = response.headers.get('location');
			if (!location || redirects === 3) return null;
			target = publicOnly
				? await assertPublicHttpUrl(new URL(location, target).toString())
				: new URL(location, target);
		}
		if (!response) return null;
		if (!response.ok) return null;
		const contentLength = Number(response.headers.get('content-length') || 0);
		if (contentLength > MAX_REMOTE_IMAGE_SIZE) return null;
		const buffer = Buffer.from(await response.arrayBuffer());
		return buffer.byteLength <= MAX_REMOTE_IMAGE_SIZE ? buffer : null;
	} catch {
		return null;
	}
}

function overlaySvg(input: {
	title: string;
	pageTitle: string;
	visual: 'icon' | 'card' | 'none';
	accent: string;
	accentDark: string;
	destination: string;
	fontCss: string;
}) {
	const titleLines = wrapTitle(input.title);
	const titleSize = titleFontSize(input.title);
	if (input.visual === 'icon' || input.visual === 'card') {
		const isIcon = input.visual === 'icon';
		const title = titleLines
			.map(
				(line, index) =>
					`<text x="600" y="${isIcon ? 418 + index * Math.max(54, titleSize) : 400 + index * Math.max(54, titleSize)}" fill="#ffffff" text-anchor="middle" font-family="${OG_FONT_FAMILY}, sans-serif" font-size="${titleSize}" font-weight="700">${escapeXml(line)}</text>`
			)
			.join('');
		return Buffer.from(`
			<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
				<style>${input.fontCss}</style>
				<defs><linearGradient id="background" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${input.accent}"/><stop offset="1" stop-color="${input.accentDark}"/></linearGradient></defs>
				<rect width="1200" height="630" fill="url(#background)"/>
				${isIcon ? '<circle cx="600" cy="170" r="210" fill="#ffffff" fill-opacity="0.05"/><rect x="430" y="42" width="340" height="270" rx="34" fill="#ffffff" fill-opacity="0.13"/><circle cx="600" cy="177" r="117" fill="none" stroke="#ffffff" stroke-width="7"/>' : '<rect x="310" y="42" width="580" height="280" rx="34" fill="#ffffff" fill-opacity="0.13"/>'}
				${title}
				<text x="600" y="570" fill="#ffffff" fill-opacity="0.82" text-anchor="middle" font-family="${OG_FONT_FAMILY}, sans-serif" font-size="24">${escapeXml(input.destination)}</text>
			</svg>
		`);
	}

	const textX = 76;
	const titleY = 438;
	const title = titleLines
		.map(
			(line, index) =>
				`<text x="${textX}" y="${titleY + index * Math.max(60, titleSize + 12)}" fill="#ffffff" font-family="${OG_FONT_FAMILY}, sans-serif" font-size="${titleSize}" font-weight="700">${escapeXml(line)}</text>`
		)
		.join('');
	const labelY = 378;

	return Buffer.from(`
		<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
			<style>${input.fontCss}</style>
			<defs><linearGradient id="shade" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#020617" stop-opacity="0.12"/><stop offset="1" stop-color="#020617" stop-opacity="0.68"/></linearGradient></defs><rect width="1200" height="630" fill="url(#shade)"/>
			<text x="${textX}" y="${labelY}" fill="#cbd5e1" font-family="${OG_FONT_FAMILY}, sans-serif" font-size="26" font-weight="600" letter-spacing="2">${escapeXml(input.pageTitle.toUpperCase().slice(0, 54))}</text>
			${title}
			<rect x="${textX}" y="552" width="190" height="4" rx="2" fill="#60a5fa"/>
			<text x="${textX}" y="595" fill="#cbd5e1" font-family="${OG_FONT_FAMILY}, sans-serif" font-size="22">${escapeXml(input.destination)}</text>
		</svg>
	`);
}

export async function createOgImage(
	input: { block: Block; page: Page; theme: Theme | null },
	origin: string
) {
	const fontCss = await loadOgFont(origin);
	const blockImage = blockImageUrl(input.block.metadata);
	const blockSourceImage =
		typeof input.block.metadata.sourceImageUrl === 'string'
			? input.block.metadata.sourceImageUrl
			: null;
	const isCardImage = input.block.metadata.imageDisplay === 'card';
	const primaryBuffer =
		(await fetchImage(blockImage)) ||
		(await fetchImage(blockSourceImage, true)) ||
		(await fetchImage(input.page.logoUrl)) ||
		(await fetchImage(input.page.logoSourceUrl, true));
	const dominant = primaryBuffer ? await prominentColor(primaryBuffer) : null;
	const themeBackground =
		input.theme?.backgroundType === 'image' ? await fetchImage(input.theme.backgroundValue) : null;
	const title = input.block.title || input.page.title;

	const accent = dominant ? darken(dominant, 0.62) : backgroundColor(input.theme);
	const accentDark = dominant ? darken(dominant, 0.3) : '#172554';
	let canvas = sharp({
		create: { width: WIDTH, height: HEIGHT, channels: 4, background: accent }
	});

	if (!primaryBuffer && themeBackground) {
		canvas = sharp(
			await sharp(themeBackground)
				.resize(WIDTH, HEIGHT, { fit: 'cover' })
				.blur(3)
				.modulate({ brightness: 0.48 })
				.png()
				.toBuffer()
		);
	}

	const composites: Array<{ input: Buffer; left?: number; top?: number }> = [
		{
			input: overlaySvg({
				title,
				pageTitle: input.page.title,
				visual: primaryBuffer ? (isCardImage ? 'card' : 'icon') : 'none',
				accent,
				accentDark,
				destination: destinationLabel(input.block.url),
				fontCss
			})
		}
	];
	if (!isCardImage && primaryBuffer) {
		const iconSource = await sharp(primaryBuffer)
			.resize(270, 270, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
			.png()
			.toBuffer();
		const circleMask = Buffer.from(
			'<svg width="270" height="270" xmlns="http://www.w3.org/2000/svg"><circle cx="135" cy="135" r="132" fill="white"/></svg>'
		);
		const icon = await sharp(iconSource)
			.composite([{ input: circleMask, blend: 'dest-in' }])
			.png()
			.toBuffer();
		composites.push({ input: icon, left: 465, top: 42 });
	} else if (isCardImage && primaryBuffer) {
		const cardSource = await sharp(primaryBuffer)
			.resize(540, 240, { fit: 'cover' })
			.png()
			.toBuffer();
		const cardMask = Buffer.from(
			'<svg width="540" height="240" xmlns="http://www.w3.org/2000/svg"><rect width="540" height="240" rx="24" fill="white"/></svg>'
		);
		const card = await sharp(cardSource)
			.composite([{ input: cardMask, blend: 'dest-in' }])
			.png()
			.toBuffer();
		composites.push({ input: card, left: 330, top: 62 });
	}

	return canvas.composite(composites).png().toBuffer();
}
