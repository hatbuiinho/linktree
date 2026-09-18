import { db } from '$lib/server/db';
import { blocks, clickEvents, pages, themes } from '$lib/server/db/schema';
import { createShareCode } from '$lib/server/share-code';
import { uniqueSlug } from '$lib/server/page-service';
import { asc, count, desc, eq } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const pageRows = await db.select().from(pages).orderBy(desc(pages.isHome), asc(pages.createdAt));
	const clickRows = await db
		.select({ pageId: clickEvents.pageId, total: count() })
		.from(clickEvents)
		.groupBy(clickEvents.pageId);
	const clicks = new Map(clickRows.map((row) => [row.pageId, row.total]));

	return {
		pages: pageRows.map((page) => ({ ...page, clicks: clicks.get(page.id) ?? 0 }))
	};
};

export const actions: Actions = {
	create: async ({ request }) => {
		const form = await request.formData();
		const title = String(form.get('title') || '').trim();
		if (!title) return fail(400, { error: 'Vui lòng nhập tên trang.' });
		const slug = await uniqueSlug(String(form.get('slug') || title));

		const page = await db.transaction(async (tx) => {
			const [created] = await tx.insert(pages).values({ title, slug, status: 'draft' }).returning();
			await tx.insert(themes).values({ pageId: created.id });
			return created;
		});

		throw redirect(303, `/admin/pages/${page.id}`);
	},

	clone: async ({ request }) => {
		const form = await request.formData();
		const id = String(form.get('id') || '');
		const [source] = await db.select().from(pages).where(eq(pages.id, id)).limit(1);
		if (!source) return fail(404, { error: 'Không tìm thấy trang.' });
		const [sourceTheme] = await db.select().from(themes).where(eq(themes.pageId, id)).limit(1);
		const sourceBlocks = await db.select().from(blocks).where(eq(blocks.pageId, id));
		const slug = await uniqueSlug(`${source.slug}-copy`);

		const copy = await db.transaction(async (tx) => {
			const [created] = await tx
				.insert(pages)
				.values({
					slug,
					title: `${source.title} (bản sao)`,
					description: source.description,
					logoUrl: source.logoUrl,
					status: 'draft',
					isHome: false
				})
				.returning();

			await tx.insert(themes).values({
				pageId: created.id,
				backgroundType: sourceTheme?.backgroundType ?? 'color',
				backgroundValue: sourceTheme?.backgroundValue ?? '#ffffff',
				backgroundMobileValue: sourceTheme?.backgroundMobileValue ?? null,
				backgroundPosition: sourceTheme?.backgroundPosition ?? 'center',
				backgroundFocalX: sourceTheme?.backgroundFocalX ?? 50,
				backgroundFocalY: sourceTheme?.backgroundFocalY ?? 50,
				backgroundOverlayColor: sourceTheme?.backgroundOverlayColor ?? '#0f172a',
				backgroundOverlayOpacity: sourceTheme?.backgroundOverlayOpacity ?? 0,
				buttonColor: sourceTheme?.buttonColor ?? '#93c5fd',
				buttonTextColor: sourceTheme?.buttonTextColor ?? '#172554',
				textColor: sourceTheme?.textColor ?? '#172554',
				buttonRadius: sourceTheme?.buttonRadius ?? 999,
				buttonPaddingX: sourceTheme?.buttonPaddingX ?? 22,
				buttonPaddingY: sourceTheme?.buttonPaddingY ?? 10,
				buttonMinHeight: sourceTheme?.buttonMinHeight ?? 0,
				buttonFontSize: sourceTheme?.buttonFontSize ?? 16,
				fontFamily: sourceTheme?.fontFamily ?? 'system-ui'
			});

			if (sourceBlocks.length) {
				await tx.insert(blocks).values(
					sourceBlocks.map((block) => ({
						shareCode: createShareCode(),
						pageId: created.id,
						type: block.type,
						title: block.title,
						subtitle: block.subtitle,
						url: block.url,
						icon: block.icon,
						position: block.position,
						enabled: block.enabled,
						openNewTab: block.openNewTab,
						metadata: block.metadata
					}))
				);
			}
			return created;
		});

		throw redirect(303, `/admin/pages/${copy.id}`);
	},

	toggle: async ({ request }) => {
		const form = await request.formData();
		const id = String(form.get('id') || '');
		const [page] = await db.select().from(pages).where(eq(pages.id, id)).limit(1);
		if (!page) return fail(404, { error: 'Không tìm thấy trang.' });
		await db
			.update(pages)
			.set({ status: page.status === 'published' ? 'draft' : 'published' })
			.where(eq(pages.id, id));
		return { success: true };
	},

	delete: async ({ request }) => {
		const form = await request.formData();
		const id = String(form.get('id') || '');
		const [page] = await db.select().from(pages).where(eq(pages.id, id)).limit(1);
		if (!page) return fail(404, { error: 'Không tìm thấy trang.' });
		if (page.isHome) return fail(400, { error: 'Không thể xóa trang chính.' });
		await db.delete(pages).where(eq(pages.id, id));
		return { success: true };
	}
};
