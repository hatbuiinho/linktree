import { db } from '$lib/server/db';
import { blocks, pages, themes } from '$lib/server/db/schema';
import { navigationType, navigationValue } from '$lib/navigation';
import { normalizeSlug } from '$lib/slug';
import { and, asc, eq, inArray, ne } from 'drizzle-orm';

export { normalizeSlug } from '$lib/slug';

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
	const pageTargetIds = pageBlocks
		.filter((block) => navigationType(block.metadata) === 'page')
		.map((block) => navigationValue(block.metadata))
		.filter(Boolean);
	const targetPages = pageTargetIds.length
		? await db
				.select({ id: pages.id, slug: pages.slug, isHome: pages.isHome })
				.from(pages)
				.where(and(eq(pages.status, 'published'), inArray(pages.id, pageTargetIds)))
		: [];
	const targetPaths = new Map(
		targetPages.map((target) => [
			target.id,
			target.isHome ? '/' : `/p/${encodeURIComponent(target.slug)}`
		])
	);

	return {
		page,
		theme,
		blocks: pageBlocks.map((block) => {
			const targetPath = targetPaths.get(navigationValue(block.metadata));
			return targetPath
				? { ...block, metadata: { ...block.metadata, destinationPath: targetPath } }
				: block;
		})
	};
}
