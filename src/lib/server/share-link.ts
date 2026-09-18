import { db } from '$lib/server/db';
import { blocks, pages, themes } from '$lib/server/db/schema';
import { shareCodeFromSlug } from '$lib/share';
import { and, eq, ilike } from 'drizzle-orm';

export function blockImageUrl(metadata: Record<string, unknown>) {
	return typeof metadata.imageUrl === 'string' ? metadata.imageUrl : null;
}

export async function getPublicShareLink(identifier: string) {
	const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
		identifier
	);
	const shareCode = isUuid ? null : shareCodeFromSlug(identifier);
	if (!isUuid && !shareCode) return null;

	const [row] = await db
		.select({ block: blocks, page: pages, theme: themes })
		.from(blocks)
		.innerJoin(pages, eq(blocks.pageId, pages.id))
		.leftJoin(themes, eq(themes.pageId, pages.id))
		.where(
			and(
				isUuid ? eq(blocks.id, identifier) : ilike(blocks.shareCode, shareCode!),
				eq(blocks.enabled, true),
				eq(blocks.type, 'link'),
				eq(pages.status, 'published')
			)
		)
		.limit(1);

	return row ?? null;
}
