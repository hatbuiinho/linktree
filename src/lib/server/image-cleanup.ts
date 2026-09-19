import { db } from '$lib/server/db';
import { blocks, pages, themes } from '$lib/server/db/schema';
import { deleteManagedImage } from '$lib/server/uploads';
import { eq, or, sql } from 'drizzle-orm';

/**
 * Removes a cached image only after every page, theme and block stopped using it.
 * This matters because duplicated pages intentionally share existing asset URLs.
 */
export async function deleteManagedImageIfUnreferenced(value: unknown) {
	if (typeof value !== 'string' || !value) return;

	const [pageReference, themeReference, blockReference] = await Promise.all([
		db.select({ id: pages.id }).from(pages).where(eq(pages.logoUrl, value)).limit(1),
		db
			.select({ id: themes.id })
			.from(themes)
			.where(or(eq(themes.backgroundValue, value), eq(themes.backgroundMobileValue, value)))
			.limit(1),
		db
			.select({ id: blocks.id })
			.from(blocks)
			.where(sql`${blocks.metadata} ->> 'imageUrl' = ${value}`)
			.limit(1)
	]);

	if (pageReference.length || themeReference.length || blockReference.length) return;
	try {
		await deleteManagedImage(value);
	} catch {
		// Cleanup is best effort and must not roll back a successful content change.
	}
}

export async function deleteManagedImagesIfUnreferenced(values: unknown[]) {
	const uniqueValues = [
		...new Set(
			values.filter((value): value is string => typeof value === 'string' && Boolean(value))
		)
	];
	await Promise.allSettled(uniqueValues.map(deleteManagedImageIfUnreferenced));
}
