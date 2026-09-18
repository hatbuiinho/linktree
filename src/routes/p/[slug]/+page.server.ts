import { getPublicPage } from '$lib/server/page-service';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	const data = await getPublicPage(params.slug);
	if (!data) throw error(404, 'Không tìm thấy trang.');
	return {
		...data,
		canonicalUrl: new URL(url.pathname, url.origin).toString(),
		previewImage:
			data.page.logoUrl ||
			(data.theme?.backgroundType === 'image' ? data.theme.backgroundValue : null)
	};
};
