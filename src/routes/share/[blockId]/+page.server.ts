import { blockShareSlug } from '$lib/share';
import { getPublicShareLink } from '$lib/server/share-link';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const row = await getPublicShareLink(params.blockId);

	if (!row) throw error(404, 'Liên kết không khả dụng.');
	throw redirect(308, `/s/${encodeURIComponent(blockShareSlug(row.block))}`);
};
