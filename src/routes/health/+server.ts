import { db } from '$lib/server/db';
import { sql } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		await db.execute(sql`select 1`);
		return json({ status: 'ok', database: 'connected' });
	} catch {
		return json({ status: 'error', database: 'unavailable' }, { status: 503 });
	}
};
