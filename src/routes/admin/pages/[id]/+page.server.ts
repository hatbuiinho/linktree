import { db } from '$lib/server/db';
import { blocks, clickEvents, pages, themes } from '$lib/server/db/schema';
import { uniqueSlug } from '$lib/server/page-service';
import { validateManagedImageUrl } from '$lib/server/uploads';
import { and, asc, count, eq, max } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const blockTypes = new Set(['link', 'heading', 'text', 'divider']);
const backgroundTypes = new Set(['color', 'gradient', 'image']);

function asBoolean(value: FormDataEntryValue | null) {
	return value === 'on' || value === 'true' || value === '1';
}

function cleanUrl(value: FormDataEntryValue | null) {
	const url = String(value || '').trim();
	if (!url) return null;
	if (!/^(https?:\/\/|mailto:|tel:)/i.test(url))
		throw new Error('URL phải bắt đầu bằng http://, https://, mailto: hoặc tel:.');
	return url;
}

async function ownedBlock(pageId: string, blockId: string) {
	const [block] = await db
		.select()
		.from(blocks)
		.where(and(eq(blocks.id, blockId), eq(blocks.pageId, pageId)))
		.limit(1);
	return block;
}

export const load: PageServerLoad = async ({ params }) => {
	const [page] = await db.select().from(pages).where(eq(pages.id, params.id)).limit(1);
	if (!page) throw error(404, 'Không tìm thấy trang.');

	const [theme] = await db.select().from(themes).where(eq(themes.pageId, page.id)).limit(1);
	const pageBlocks = await db
		.select()
		.from(blocks)
		.where(eq(blocks.pageId, page.id))
		.orderBy(asc(blocks.position));
	const blockClicks = await db
		.select({ blockId: clickEvents.blockId, total: count() })
		.from(clickEvents)
		.where(eq(clickEvents.pageId, page.id))
		.groupBy(clickEvents.blockId);
	const [total] = await db
		.select({ total: count() })
		.from(clickEvents)
		.where(eq(clickEvents.pageId, page.id));
	const clickMap = new Map(blockClicks.map((row) => [row.blockId, row.total]));

	return {
		page,
		theme,
		blocks: pageBlocks.map((block) => ({ ...block, clicks: clickMap.get(block.id) ?? 0 })),
		totalClicks: total?.total ?? 0
	};
};

export const actions: Actions = {
	updatePage: async ({ params, request }) => {
		const form = await request.formData();
		const title = String(form.get('title') || '').trim();
		if (!title) return fail(400, { error: 'Tên trang không được để trống.' });
		const slug = await uniqueSlug(String(form.get('slug') || title), params.id);
		const status = form.get('status') === 'published' ? 'published' : 'draft';

		await db
			.update(pages)
			.set({
				title,
				slug,
				description: String(form.get('description') || '').trim() || null,
				status
			})
			.where(eq(pages.id, params.id));
		return { success: true, message: 'Đã lưu thông tin trang.' };
	},

	updateTheme: async ({ params, request }) => {
		const form = await request.formData();
		const backgroundType = String(form.get('backgroundType') || 'color');
		if (!backgroundTypes.has(backgroundType)) return fail(400, { error: 'Kiểu nền không hợp lệ.' });
		const buttonRadius = Math.max(0, Math.min(999, Number(form.get('buttonRadius') || 24)));

		await db
			.update(themes)
			.set({
				backgroundType: backgroundType as 'color' | 'gradient' | 'image',
				backgroundValue: String(form.get('backgroundValue') || '#ffffff').trim(),
				buttonColor: String(form.get('buttonColor') || '#93c5fd'),
				buttonTextColor: String(form.get('buttonTextColor') || '#172554'),
				textColor: String(form.get('textColor') || '#172554'),
				buttonRadius,
				fontFamily: String(form.get('fontFamily') || 'system-ui').trim() || 'system-ui'
			})
			.where(eq(themes.pageId, params.id));
		return { success: true, message: 'Đã lưu giao diện.' };
	},

	addBlock: async ({ params, request }) => {
		const form = await request.formData();
		const type = String(form.get('type') || 'link');
		if (!blockTypes.has(type)) return fail(400, { error: 'Loại block không hợp lệ.' });
		const [position] = await db
			.select({ value: max(blocks.position) })
			.from(blocks)
			.where(eq(blocks.pageId, params.id));
		const labels: Record<string, string> = {
			link: 'LIÊN KẾT MỚI',
			heading: 'TIÊU ĐỀ MỚI',
			text: 'NỘI DUNG MỚI',
			divider: ''
		};
		await db.insert(blocks).values({
			pageId: params.id,
			type: type as 'link' | 'heading' | 'text' | 'divider',
			title: labels[type],
			position: (position?.value ?? -1) + 1
		});
		return { success: true, message: 'Đã thêm block.' };
	},

	updateBlock: async ({ params, request }) => {
		const form = await request.formData();
		const blockId = String(form.get('blockId') || '');
		const block = await ownedBlock(params.id, blockId);
		if (!block) return fail(404, { error: 'Không tìm thấy block.' });

		try {
			await db
				.update(blocks)
				.set({
					title: String(form.get('title') || '').trim() || null,
					subtitle: String(form.get('subtitle') || '').trim() || null,
					url: block.type === 'link' ? cleanUrl(form.get('url')) : null,
					icon: String(form.get('icon') || '').trim() || null,
					enabled: asBoolean(form.get('enabled')),
					openNewTab: asBoolean(form.get('openNewTab'))
				})
				.where(eq(blocks.id, blockId));
			return { success: true, message: 'Đã cập nhật block.' };
		} catch (cause) {
			return fail(400, { error: cause instanceof Error ? cause.message : 'Không thể lưu block.' });
		}
	},

	deleteBlock: async ({ params, request }) => {
		const form = await request.formData();
		const blockId = String(form.get('blockId') || '');
		const block = await ownedBlock(params.id, blockId);
		if (!block) return fail(404, { error: 'Không tìm thấy block.' });
		await db.delete(blocks).where(eq(blocks.id, blockId));
		return { success: true, message: 'Đã xóa block.' };
	},

	upload: async ({ params, request }) => {
		const form = await request.formData();
		const kind = String(form.get('kind') || '');
		const value = String(form.get('url') || '').trim();
		if (!value) return fail(400, { error: 'URL ảnh không hợp lệ.' });

		try {
			const url = validateManagedImageUrl(value);
			if (kind === 'logo') {
				await db.update(pages).set({ logoUrl: url }).where(eq(pages.id, params.id));
			} else if (kind === 'background') {
				await db
					.update(themes)
					.set({ backgroundType: 'image', backgroundValue: url })
					.where(eq(themes.pageId, params.id));
			} else {
				return fail(400, { error: 'Loại ảnh không hợp lệ.' });
			}
			return { success: true, message: 'Đã lưu ảnh từ MinIO.' };
		} catch (cause) {
			return fail(400, { error: cause instanceof Error ? cause.message : 'Không thể lưu ảnh.' });
		}
	},

	setHome: async ({ params }) => {
		await db.transaction(async (tx) => {
			await tx.update(pages).set({ isHome: false }).where(eq(pages.isHome, true));
			await tx
				.update(pages)
				.set({ isHome: true, status: 'published' })
				.where(eq(pages.id, params.id));
		});
		return { success: true, message: 'Đã đặt làm trang chính.' };
	}
};
