import { hashPassword, requireAdmin } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { sessions, users } from '$lib/server/db/schema';
import { and, asc, count, eq, sql } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const roles = new Set(['admin', 'editor']);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value: FormDataEntryValue | null) {
	return String(value || '')
		.trim()
		.toLowerCase();
}

function normalizeName(value: FormDataEntryValue | null) {
	const name = String(value || '').trim();
	return name || null;
}

function parseRole(value: FormDataEntryValue | null) {
	const role = String(value || 'editor');
	return roles.has(role) ? (role as 'admin' | 'editor') : null;
}

function validateIdentity(displayName: string | null, email: string) {
	if (displayName && displayName.length > 100) return 'Tên hiển thị tối đa 100 ký tự.';
	if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) return 'Email không hợp lệ.';
	return null;
}

function validatePassword(password: string) {
	if (password.length < 10) return 'Mật khẩu phải có ít nhất 10 ký tự.';
	if (password.length > 128) return 'Mật khẩu tối đa 128 ký tự.';
	return null;
}

function isUniqueViolation(cause: unknown) {
	return Boolean(cause && typeof cause === 'object' && 'code' in cause && cause.code === '23505');
}

async function lockAdminGuard(tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) {
	await tx.execute(sql`select pg_advisory_xact_lock(hashtext('ttpq_user_admin_guard'))`);
}

async function activeAdminCount(tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) {
	const [row] = await tx
		.select({ total: count() })
		.from(users)
		.where(and(eq(users.role, 'admin'), eq(users.isActive, true)));
	return row?.total ?? 0;
}

export const load: PageServerLoad = async (event) => {
	requireAdmin(event);
	const rows = await db
		.select({
			id: users.id,
			displayName: users.displayName,
			email: users.email,
			role: users.role,
			isActive: users.isActive,
			lastLoginAt: users.lastLoginAt,
			createdAt: users.createdAt,
			updatedAt: users.updatedAt
		})
		.from(users)
		.orderBy(asc(users.displayName), asc(users.email));

	return { users: rows };
};

export const actions: Actions = {
	create: async (event) => {
		requireAdmin(event);
		const form = await event.request.formData();
		const displayName = normalizeName(form.get('displayName'));
		const email = normalizeEmail(form.get('email'));
		const password = String(form.get('password') || '');
		const role = parseRole(form.get('role'));

		const identityError = validateIdentity(displayName, email);
		if (identityError) return fail(400, { error: identityError });
		const passwordError = validatePassword(password);
		if (passwordError) return fail(400, { error: passwordError });
		if (!role) return fail(400, { error: 'Quyền người dùng không hợp lệ.' });

		try {
			await db.insert(users).values({
				displayName,
				email,
				passwordHash: hashPassword(password),
				role,
				isActive: true
			});
		} catch (cause) {
			if (isUniqueViolation(cause)) return fail(409, { error: 'Email này đã được sử dụng.' });
			throw cause;
		}

		return { success: true, message: 'Đã tạo người dùng.' };
	},

	update: async (event) => {
		const currentUser = requireAdmin(event);
		const form = await event.request.formData();
		const id = String(form.get('id') || '');
		const displayName = normalizeName(form.get('displayName'));
		const email = normalizeEmail(form.get('email'));
		const role = parseRole(form.get('role'));

		const identityError = validateIdentity(displayName, email);
		if (identityError) return fail(400, { error: identityError });
		if (!role) return fail(400, { error: 'Quyền người dùng không hợp lệ.' });

		try {
			const result = await db.transaction(async (tx) => {
				await lockAdminGuard(tx);
				const [target] = await tx.select().from(users).where(eq(users.id, id)).limit(1);
				if (!target) return { error: 'Không tìm thấy người dùng.', status: 404 } as const;
				if (target.id === currentUser.id && role !== target.role) {
					return { error: 'Bạn không thể thay đổi quyền của chính mình.', status: 400 } as const;
				}
				if (target.role === 'admin' && target.isActive && role !== 'admin') {
					if ((await activeAdminCount(tx)) <= 1) {
						return {
							error: 'Phải luôn có ít nhất một admin đang hoạt động.',
							status: 400
						} as const;
					}
				}

				await tx.update(users).set({ displayName, email, role }).where(eq(users.id, id));
				return { success: true } as const;
			});

			if ('error' in result) return fail(result.status ?? 400, { error: result.error });
		} catch (cause) {
			if (isUniqueViolation(cause)) return fail(409, { error: 'Email này đã được sử dụng.' });
			throw cause;
		}

		return { success: true, message: 'Đã cập nhật người dùng.' };
	},

	toggleActive: async (event) => {
		const currentUser = requireAdmin(event);
		const form = await event.request.formData();
		const id = String(form.get('id') || '');

		const result = await db.transaction(async (tx) => {
			await lockAdminGuard(tx);
			const [target] = await tx.select().from(users).where(eq(users.id, id)).limit(1);
			if (!target) return { error: 'Không tìm thấy người dùng.', status: 404 } as const;
			if (target.id === currentUser.id) {
				return { error: 'Bạn không thể vô hiệu hóa chính mình.', status: 400 } as const;
			}

			const nextActive = !target.isActive;
			if (target.role === 'admin' && target.isActive && !nextActive) {
				if ((await activeAdminCount(tx)) <= 1) {
					return { error: 'Phải luôn có ít nhất một admin đang hoạt động.', status: 400 } as const;
				}
			}

			await tx.update(users).set({ isActive: nextActive }).where(eq(users.id, id));
			if (!nextActive) await tx.delete(sessions).where(eq(sessions.userId, id));
			return { success: true, active: nextActive } as const;
		});

		if ('error' in result) return fail(result.status ?? 400, { error: result.error });
		return {
			success: true,
			message: result.active
				? 'Đã kích hoạt người dùng.'
				: 'Đã vô hiệu hóa và đăng xuất người dùng.'
		};
	},

	resetPassword: async (event) => {
		requireAdmin(event);
		const form = await event.request.formData();
		const id = String(form.get('id') || '');
		const password = String(form.get('password') || '');
		const passwordError = validatePassword(password);
		if (passwordError) return fail(400, { error: passwordError });

		const [target] = await db.select({ id: users.id }).from(users).where(eq(users.id, id)).limit(1);
		if (!target) return fail(404, { error: 'Không tìm thấy người dùng.' });

		await db.transaction(async (tx) => {
			await tx
				.update(users)
				.set({ passwordHash: hashPassword(password) })
				.where(eq(users.id, id));
			await tx.delete(sessions).where(eq(sessions.userId, id));
		});

		return { success: true, message: 'Đã đổi mật khẩu và đăng xuất người dùng trên mọi thiết bị.' };
	},

	delete: async (event) => {
		const currentUser = requireAdmin(event);
		const form = await event.request.formData();
		const id = String(form.get('id') || '');

		const result = await db.transaction(async (tx) => {
			await lockAdminGuard(tx);
			const [target] = await tx.select().from(users).where(eq(users.id, id)).limit(1);
			if (!target) return { error: 'Không tìm thấy người dùng.', status: 404 } as const;
			if (target.id === currentUser.id) {
				return { error: 'Bạn không thể xóa chính mình.', status: 400 } as const;
			}
			if (target.role === 'admin' && target.isActive && (await activeAdminCount(tx)) <= 1) {
				return { error: 'Không thể xóa admin đang hoạt động cuối cùng.', status: 400 } as const;
			}

			await tx.delete(users).where(eq(users.id, id));
			return { success: true } as const;
		});

		if ('error' in result) return fail(result.status ?? 400, { error: result.error });
		return { success: true, message: 'Đã xóa người dùng.' };
	}
};
