import { db } from '$lib/server/db';
import { pages } from '$lib/server/db/schema';
import { asc, eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

function escapeXml(value: string) {
	return value.replace(/[<>&'"]/g, (character) => {
		return (
			{ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[character] || ''
		);
	});
}

export const GET: RequestHandler = async ({ url }) => {
	const publicPages = await db
		.select({ slug: pages.slug, isHome: pages.isHome, updatedAt: pages.updatedAt })
		.from(pages)
		.where(eq(pages.status, 'published'))
		.orderBy(asc(pages.slug));
	const entries = publicPages
		.map((page) => {
			const path = page.isHome ? '/' : `/p/${encodeURIComponent(page.slug)}`;
			const location = new URL(path, url.origin).toString();
			return `<url><loc>${escapeXml(location)}</loc><lastmod>${page.updatedAt.toISOString()}</lastmod><changefreq>weekly</changefreq></url>`;
		})
		.join('');

	return new Response(
		`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</urlset>`,
		{
			headers: {
				'content-type': 'application/xml; charset=utf-8',
				'cache-control': 'public, max-age=3600'
			}
		}
	);
};
