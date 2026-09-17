import { dev } from '$app/environment';
import { db } from '$lib/server/db';
import { sessions, users, type User } from '$lib/server/db/schema';
import { and, eq, gt } from 'drizzle-orm';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { error, type RequestEvent } from '@sveltejs/kit';

export const SESSION_COOKIE = 'ttpq_admin_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export function hashPassword(password: string) {
	const salt = randomBytes(16).toString('hex');
	const digest = scryptSync(password, salt, 64).toString('hex');
	return `scrypt$${salt}$${digest}`;
}

export function verifyPassword(password: string, stored: string) {
	const [algorithm, salt, expectedHex] = stored.split('$');
	if (algorithm !== 'scrypt' || !salt || !expectedHex) return false;

	const actual = scryptSync(password, salt, 64);
	const expected = Buffer.from(expectedHex, 'hex');
	return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function hashSessionToken(token: string) {
	return createHash('sha256').update(token).digest('hex');
}

export async function createSession(event: RequestEvent, userId: string) {
	const token = randomBytes(32).toString('base64url');
	const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);

	await db.insert(sessions).values({
		userId,
		tokenHash: hashSessionToken(token),
		expiresAt
	});

	event.cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		maxAge: SESSION_TTL_SECONDS
	});
}

export async function getSessionUser(event: RequestEvent): Promise<User | null> {
	const token = event.cookies.get(SESSION_COOKIE);
	if (!token) return null;

	const [row] = await db
		.select({ user: users })
		.from(sessions)
		.innerJoin(users, eq(sessions.userId, users.id))
		.where(
			and(
				eq(sessions.tokenHash, hashSessionToken(token)),
				gt(sessions.expiresAt, new Date()),
				eq(users.isActive, true)
			)
		)
		.limit(1);

	return row?.user ?? null;
}

export function requireAdmin(event: RequestEvent) {
	const user = event.locals.user;
	if (!user || user.role !== 'admin') {
		throw error(403, 'Bạn không có quyền quản lý người dùng.');
	}
	return user;
}

export async function invalidateUserSessions(userId: string) {
	await db.delete(sessions).where(eq(sessions.userId, userId));
}

export async function invalidateSession(event: RequestEvent) {
	const token = event.cookies.get(SESSION_COOKIE);
	if (token) {
		await db.delete(sessions).where(eq(sessions.tokenHash, hashSessionToken(token)));
	}
	event.cookies.delete(SESSION_COOKIE, { path: '/' });
}
