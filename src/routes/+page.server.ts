import { getPublicPage } from '$lib/server/page-service';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, setHeaders }) => {
	const data = await getPublicPage('home');
	if (!data) throw error(404, 'Trang chính chưa được xuất bản.');
	// Public pages have no per-user content. Serving a short-lived copy at the CDN
	// removes the database round-trip for most visitors while limiting publishing
	// delay to one minute.
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
