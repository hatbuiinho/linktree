import { blockShareSlug } from '$lib/share';
import { OG_RENDER_VERSION } from '$lib/og';
import { getPublicShareLink } from '$lib/server/share-link';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	const row = await getPublicShareLink(params.shareSlug);

	if (!row) throw error(404, 'Liên kết không khả dụng.');

	const shareUrl = url.origin + `/s/${encodeURIComponent(blockShareSlug(row.block))}`;
	// The image response is immutable, so its URL must change whenever either
	// the share content or the renderer changes. This also prevents social
	// crawlers from serving an older OG composition.
	const ogImageVersion = Math.max(
		row.block.updatedAt.getTime(),
		row.page.updatedAt.getTime(),
		row.theme?.updatedAt.getTime() ?? 0
	);
	const ogImageUrl =
		url.origin + `/og/${row.block.id}.png?v=${ogImageVersion}-${OG_RENDER_VERSION}`;

	return {
		...row,
		shareUrl,
		pageUrl: url.origin + `/p/${row.page.slug}`,
		ogImageUrl,
		goUrl: `/go/${row.block.id}`,
		previewImage:
			typeof row.block.metadata.imageUrl === 'string'
				? row.block.metadata.imageUrl
				: typeof row.block.metadata.sourceImageUrl === 'string'
					? row.block.metadata.sourceImageUrl
					: null
	};
};
