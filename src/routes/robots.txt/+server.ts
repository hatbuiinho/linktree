import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const content = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /login
Disallow: /share/
Disallow: /s/
Disallow: /go/
Disallow: /track/
Disallow: /og/
Sitemap: ${new URL('/sitemap.xml', url.origin).toString()}
`;
	return new Response(content, {
		headers: {
			'content-type': 'text/plain; charset=utf-8',
			'cache-control': 'public, max-age=3600'
		}
	});
};
