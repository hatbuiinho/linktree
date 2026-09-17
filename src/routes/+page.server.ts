import { getPublicPage } from '$lib/server/page-service';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const data = await getPublicPage('home');
	if (!data) throw error(404, 'Trang chính chưa được xuất bản.');
	return data;
};
