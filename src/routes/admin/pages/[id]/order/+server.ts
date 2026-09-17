import { db } from '$lib/server/db';
import { blocks } from '$lib/server/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, request }) => {
	const body = (await request.json().catch(() => null)) as { ids?: string[] } | null;
	const ids = body?.ids;
	if (!ids?.length || new Set(ids).size !== ids.length)
		return json({ error: 'Thứ tự không hợp lệ.' }, { status: 400 });

	const owned = await db
		.select({ id: blocks.id })
		.from(blocks)
		.where(and(eq(blocks.pageId, params.id), inArray(blocks.id, ids)));
	if (owned.length !== ids.length)
		return json({ error: 'Block không thuộc trang này.' }, { status: 400 });

	await db.transaction(async (tx) => {
		for (const [position, id] of ids.entries()) {
			await tx
				.update(blocks)
				.set({ position })
				.where(and(eq(blocks.id, id), eq(blocks.pageId, params.id)));
		}
	});

	return json({ success: true });
};
