import { getPublicPage } from '$lib/server/page-service';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url, setHeaders }) => {
	const data = await getPublicPage(params.slug);
	if (!data) throw error(404, 'Không tìm thấy trang.');
	setHeaders({
		'cache-control': 'public, s-maxage=60, stale-while-revalidate=300'
	});
	return {
		...data,
		canonicalUrl: new URL(url.pathname, url.origin).toString(),
		previewImage:
			data.page.logoUrl ||
			data.page.logoSourceUrl ||
			(data.theme?.backgroundType === 'image' ? data.theme.backgroundValue : null)
	};
};
