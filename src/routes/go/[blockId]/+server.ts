import { db } from '$lib/server/db';
import { blocks, clickEvents, pages } from '$lib/server/db/schema';
import { isPublicRoute, navigationType, navigationValue } from '$lib/navigation';
import { and, eq } from 'drizzle-orm';
import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

function deviceType(userAgent: string) {
	if (/tablet|ipad/i.test(userAgent)) return 'tablet';
	if (/mobile|android|iphone/i.test(userAgent)) return 'mobile';
	return 'desktop';
}

function validTarget(url: string) {
	return /^(https?:\/\/|mailto:|tel:)/i.test(url);
}

export const GET: RequestHandler = async ({ params, request, url }) => {
	const [row] = await db
		.select({ block: blocks, page: pages })
		.from(blocks)
		.innerJoin(pages, eq(blocks.pageId, pages.id))
		.where(
			and(
				eq(blocks.id, params.blockId),
				eq(blocks.enabled, true),
				eq(blocks.type, 'link'),
				eq(pages.status, 'published')
			)
		)
		.limit(1);

	if (!row) throw error(404, 'Liên kết không khả dụng.');

	await db.insert(clickEvents).values({
		pageId: row.page.id,
		blockId: row.block.id,
		referrer: request.headers.get('referer'),
		deviceType: deviceType(request.headers.get('user-agent') || '')
	});

	const type = navigationType(row.block.metadata);
	if (type === 'back') {
		if (url.searchParams.has('track')) return new Response(null, { status: 204 });
		throw redirect(302, '/');
	}

	if (type === 'external') {
		if (!row.block.url || !validTarget(row.block.url)) throw error(404, 'Liên kết không khả dụng.');
		throw redirect(302, row.block.url);
	}

	const target = navigationValue(row.block.metadata);
	if (type === 'route' && isPublicRoute(target)) throw redirect(302, target);

	if (type === 'page') {
		const [targetPage] = await db
			.select({ slug: pages.slug, isHome: pages.isHome })
			.from(pages)
			.where(and(eq(pages.id, target), eq(pages.status, 'published')))
			.limit(1);
		if (targetPage)
			throw redirect(302, targetPage.isHome ? '/' : `/p/${encodeURIComponent(targetPage.slug)}`);
	}

	throw error(404, 'Trang đích không khả dụng.');
};
