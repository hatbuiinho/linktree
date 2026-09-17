import { db } from '$lib/server/db';
import { blocks, pages, themes } from '$lib/server/db/schema';
import { and, asc, eq, ne } from 'drizzle-orm';

export function normalizeSlug(value: string) {
	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80);
}

export async function slugAvailable(slug: string, excludeId?: string) {
	const where = excludeId
		? and(eq(pages.slug, slug), ne(pages.id, excludeId))
		: eq(pages.slug, slug);
	const [existing] = await db.select({ id: pages.id }).from(pages).where(where).limit(1);
	return !existing;
}

export async function uniqueSlug(input: string, excludeId?: string) {
	const base = normalizeSlug(input) || 'page';
	let candidate = base;
	let suffix = 2;
	while (!(await slugAvailable(candidate, excludeId))) candidate = `${base}-${suffix++}`;
	return candidate;
}

export async function getPublicPage(where: 'home' | string) {
	const condition =
		where === 'home'
			? and(eq(pages.isHome, true), eq(pages.status, 'published'))
			: and(eq(pages.slug, where), eq(pages.status, 'published'));

	const [page] = await db.select().from(pages).where(condition).limit(1);
	if (!page) return null;

	const [theme] = await db.select().from(themes).where(eq(themes.pageId, page.id)).limit(1);
	const pageBlocks = await db
		.select()
		.from(blocks)
		.where(and(eq(blocks.pageId, page.id), eq(blocks.enabled, true)))
		.orderBy(asc(blocks.position));

	return { page, theme, blocks: pageBlocks };
}
