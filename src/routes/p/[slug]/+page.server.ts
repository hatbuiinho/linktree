import { getPublicPage } from '$lib/server/page-service';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const data = await getPublicPage(params.slug);
	if (!data) throw error(404, 'Không tìm thấy trang.');
	return data;
};
