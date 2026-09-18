import { db } from '$lib/server/db';
import { blocks, clickEvents, pages } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

function deviceType(userAgent: string) {
	if (/tablet|ipad/i.test(userAgent)) return 'tablet';
	if (/mobile|android|iphone/i.test(userAgent)) return 'mobile';
	return 'desktop';
}

export const POST: RequestHandler = async ({ params, request }) => {
	const [row] = await db
		.select({ pageId: pages.id, blockId: blocks.id })
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
		pageId: row.pageId,
		blockId: row.blockId,
		referrer: request.headers.get('referer'),
		deviceType: deviceType(request.headers.get('user-agent') || '')
	});

	return new Response(null, { status: 204 });
};
