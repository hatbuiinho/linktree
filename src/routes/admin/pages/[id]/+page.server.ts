import { db } from '$lib/server/db';
import { blocks, clickEvents, pages, themes } from '$lib/server/db/schema';
import { isPublicRoute, navigationTypes } from '$lib/navigation';
import { createShareCode } from '$lib/server/share-code';
import { uniqueSlug } from '$lib/server/page-service';
import { validateManagedImageUrl } from '$lib/server/uploads';
import { and, asc, count, eq, max } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const blockTypes = new Set(['link', 'heading', 'text', 'divider', 'youtube']);
const backgroundTypes = new Set(['color', 'gradient', 'image']);

function asBoolean(value: FormDataEntryValue | null) {
	return value === 'on' || value === 'true' || value === '1';
}

function boundedInteger(
	value: FormDataEntryValue | null,
	fallback: number,
	min: number,
	max: number
) {
	const number = Number(value);
	if (!Number.isFinite(number)) return fallback;
	return Math.max(min, Math.min(max, Math.round(number)));
}

function cleanUrl(value: FormDataEntryValue | null) {
	const url = String(value || '').trim();
	if (!url) return null;
	if (!/^(https?:\/\/|mailto:|tel:)/i.test(url))
		throw new Error('URL phải bắt đầu bằng http://, https://, mailto: hoặc tel:.');
	return url;
}

function cleanYouTubeUrl(value: FormDataEntryValue | null) {
	const raw = String(value || '').trim();
	if (!raw) return null;

	let url: URL;
	try {
		url = new URL(raw);
	} catch {
		throw new Error('URL YouTube không hợp lệ.');
	}

	const host = url.hostname.replace(/^www\./, '').toLowerCase();
	const id =
		host === 'youtu.be'
			? url.pathname.slice(1).split('/')[0]
			: host === 'youtube.com' || host === 'm.youtube.com'
				? url.pathname.startsWith('/embed/')
					? url.pathname.split('/')[2]
					: url.searchParams.get('v')
				: null;
	if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) throw new Error('URL YouTube không hợp lệ.');
	return `https://www.youtube-nocookie.com/embed/${id}`;
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
	const linkablePages = await db
		.select({ id: pages.id, title: pages.title, slug: pages.slug, isHome: pages.isHome })
		.from(pages)
		.where(eq(pages.status, 'published'))
		.orderBy(asc(pages.title));
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
		linkablePages,
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
		const buttonPaddingX = boundedInteger(form.get('buttonPaddingX'), 22, 0, 72);
		const buttonPaddingY = boundedInteger(form.get('buttonPaddingY'), 10, 0, 48);
		const backgroundMobileValue = String(form.get('backgroundMobileValue') || '').trim();
		const overlayColor = String(form.get('backgroundOverlayColor') || '#0f172a').trim();
		if (!/^#[0-9a-f]{6}$/i.test(overlayColor))
			return fail(400, { error: 'Màu lớp phủ không hợp lệ.' });

		try {
			if (backgroundType === 'image') {
				validateManagedImageUrl(String(form.get('backgroundValue') || '').trim());
				if (backgroundMobileValue) validateManagedImageUrl(backgroundMobileValue);
			}
		} catch (cause) {
			return fail(400, { error: cause instanceof Error ? cause.message : 'Ảnh nền không hợp lệ.' });
		}

		await db
			.update(themes)
			.set({
				backgroundType: backgroundType as 'color' | 'gradient' | 'image',
				backgroundValue: String(form.get('backgroundValue') || '#ffffff').trim(),
				backgroundMobileValue: backgroundMobileValue || null,
				backgroundFocalX: boundedInteger(form.get('backgroundFocalX'), 50, 0, 100),
				backgroundFocalY: boundedInteger(form.get('backgroundFocalY'), 50, 0, 100),
				backgroundOverlayColor: overlayColor,
				backgroundOverlayOpacity: boundedInteger(form.get('backgroundOverlayOpacity'), 0, 0, 80),
				buttonColor: String(form.get('buttonColor') || '#93c5fd'),
				buttonTextColor: String(form.get('buttonTextColor') || '#172554'),
				textColor: String(form.get('textColor') || '#172554'),
				buttonRadius,
				buttonPaddingX,
				buttonPaddingY,
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
			divider: '',
			youtube: 'VIDEO MỚI'
		};
		const [block] = await db
			.insert(blocks)
			.values({
				shareCode: createShareCode(),
				pageId: params.id,
				type: type as 'link' | 'heading' | 'text' | 'divider' | 'youtube',
				title: labels[type],
				position: (position?.value ?? -1) + 1
			})
			.returning();
		return { success: true, message: 'Đã thêm block.', block };
	},

	updateBlock: async ({ params, request }) => {
		const form = await request.formData();
		const blockId = String(form.get('blockId') || '');
		const block = await ownedBlock(params.id, blockId);
		if (!block) return fail(404, { error: 'Không tìm thấy block.' });

		try {
			let metadata = block.metadata;
			let url: string | null = null;
			if (block.type === 'link' && form.has('imageUrl')) {
				const imageUrl = String(form.get('imageUrl') || '').trim();
				const rest = { ...block.metadata };
				delete rest.imageUrl;
				metadata = imageUrl ? { ...rest, imageUrl: validateManagedImageUrl(imageUrl) } : rest;
			}
			if (block.type === 'link' && form.has('imageDisplay')) {
				metadata = {
					...metadata,
					imageDisplay: form.get('imageDisplay') === 'card' ? 'card' : 'icon'
				};
			}
			if (block.type === 'link') {
				const navigationType = String(form.get('navigationType') || 'external');
				if (!navigationTypes.includes(navigationType as (typeof navigationTypes)[number]))
					throw new Error('Kiểu điều hướng không hợp lệ.');
				const navigationValue = String(form.get('navigationValue') || '').trim();
				const navigationFallback = String(form.get('navigationFallback') || '/').trim();

				if (navigationType === 'external') {
					url = cleanUrl(form.get('url'));
					if (!url) throw new Error('Vui lòng nhập URL đích.');
				} else if (navigationType === 'page') {
					const [targetPage] = await db
						.select({ id: pages.id })
						.from(pages)
						.where(and(eq(pages.id, navigationValue), eq(pages.status, 'published')))
						.limit(1);
					if (!targetPage) throw new Error('Trang đích chưa được xuất bản hoặc không tồn tại.');
				} else if (navigationType === 'route' && !isPublicRoute(navigationValue)) {
					throw new Error('Route đích không được phép.');
				}

				metadata = {
					...metadata,
					navigationType,
					navigationValue: navigationType === 'back' ? '' : navigationValue,
					navigationFallback: isPublicRoute(navigationFallback) ? navigationFallback : '/'
				};
			} else if (block.type === 'youtube') {
				url = cleanYouTubeUrl(form.get('url'));
			}
			await db
				.update(blocks)
				.set({
					title: String(form.get('title') || '').trim() || null,
					subtitle: String(form.get('subtitle') || '').trim() || null,
					url,
					icon: String(form.get('icon') || '').trim() || null,
					metadata,
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
		return { success: true, message: 'Đã xóa block.', deletedBlockId: blockId };
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
				const mobileUrl = String(form.get('mobileUrl') || '').trim();
				const backgroundMobileValue = mobileUrl ? validateManagedImageUrl(mobileUrl) : null;
				await db
					.update(themes)
					.set({
						backgroundType: 'image',
						backgroundValue: url,
						backgroundMobileValue
					})
					.where(eq(themes.pageId, params.id));
			} else if (kind === 'block-image') {
				const blockId = String(form.get('blockId') || '');
				const block = await ownedBlock(params.id, blockId);
				if (!block || block.type !== 'link')
					return fail(404, { error: 'Không tìm thấy block liên kết.' });
				await db
					.update(blocks)
					.set({ metadata: { ...block.metadata, imageUrl: url } })
					.where(eq(blocks.id, block.id));
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
		return { success: true, message: 'Đã đặt làm trang chính.', isHome: true };
	}
};
