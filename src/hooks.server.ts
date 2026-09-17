import { getSessionUser } from '$lib/server/auth';
import { redirect, type Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = await getSessionUser(event);

	if (event.url.pathname.startsWith('/admin') && !event.locals.user) {
		const next = encodeURIComponent(`${event.url.pathname}${event.url.search}`);
		throw redirect(303, `/login?next=${next}`);
	}

	return resolve(event);
};
