/** Extract a video id from every YouTube URL form accepted by the editor. */
export function youtubeVideoId(value: string | null | undefined): string | null {
	if (!value?.trim()) return null;

	let url: URL;
	try {
		url = new URL(value.trim());
	} catch {
		return null;
	}
	if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

	const host = url.hostname.replace(/^www\./, '');
	let id: string | null = null;
	if (host === 'youtu.be') {
		id = /^\/([A-Za-z0-9_-]{11})\/?$/.exec(url.pathname)?.[1] ?? null;
	} else if (host === 'youtube.com' || host === 'm.youtube.com') {
		id =
			url.pathname === '/watch'
				? url.searchParams.get('v')
				: (/^\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})\/?$/.exec(url.pathname)?.[1] ?? null);
	} else if (host === 'youtube-nocookie.com') {
		id = /^\/embed\/([A-Za-z0-9_-]{11})\/?$/.exec(url.pathname)?.[1] ?? null;
	}

	return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
}

/** Normalize supported YouTube video links for embedded playback. */
export function youtubeEmbedUrl(value: string | null | undefined): string | null {
	const id = youtubeVideoId(value);
	return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
}

/** Normalize supported YouTube video links for a regular outbound card. */
export function youtubeWatchUrl(value: string | null | undefined): string | null {
	const id = youtubeVideoId(value);
	return id ? `https://www.youtube.com/watch?v=${id}` : null;
}
