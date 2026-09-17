import { createSession, verifyPassword } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

function safeNext(value: FormDataEntryValue | string | null) {
	const next = String(value || '/admin');
	return next.startsWith('/admin') && !next.startsWith('//') ? next : '/admin';
}

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user) throw redirect(303, safeNext(url.searchParams.get('next')));
	return { next: safeNext(url.searchParams.get('next')) };
};

export const actions: Actions = {
	default: async (event) => {
		const form = await event.request.formData();
		const email = String(form.get('email') || '')
			.trim()
			.toLowerCase();
		const password = String(form.get('password') || '');
		const next = safeNext(form.get('next'));

		const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
		if (!user || !verifyPassword(password, user.passwordHash)) {
			return fail(400, { error: 'Email hoặc mật khẩu không đúng.', email });
		}
		if (!user.isActive) {
			return fail(403, {
				error: 'Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.',
				email
			});
		}

		await createSession(event, user.id);
		await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
		throw redirect(303, next);
	}
};
