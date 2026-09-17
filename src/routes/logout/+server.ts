import { invalidateSession } from '$lib/server/auth';
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	await invalidateSession(event);
	throw redirect(303, '/login');
};
