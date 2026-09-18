import { createOgImage } from '$lib/server/og-image';
import { getPublicShareLink } from '$lib/server/share-link';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, url }) => {
	const row = await getPublicShareLink(params.blockId.replace(/\.png$/, ''));
	if (!row) throw error(404, 'Liên kết không khả dụng.');

	const image = await createOgImage(row, url.origin);
	return new Response(image, {
		headers: {
			'content-type': 'image/png',
			'cache-control': 'public, max-age=31536000, immutable'
		}
	});
};
