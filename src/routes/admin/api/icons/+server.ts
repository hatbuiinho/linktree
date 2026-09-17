import { searchIcons, TOTAL_ICON_COUNT } from '$lib/server/icons';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const query = url.searchParams.get('q')?.slice(0, 100) ?? '';
	const requestedSet = url.searchParams.get('set');
	const set = requestedSet === 'mdi' || requestedSet === 'si' ? requestedSet : 'all';
	const result = searchIcons(query, set, 96);

	return json({ ...result, available: TOTAL_ICON_COUNT });
};
