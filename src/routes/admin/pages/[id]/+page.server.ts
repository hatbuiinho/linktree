import { db } from '$lib/server/db';
import { blocks, clickEvents, pages, themes } from '$lib/server/db/schema';
import { isPublicRoute, navigationType, navigationTypes, navigationValue } from '$lib/navigation';
import { createShareCode } from '$lib/server/share-code';
import { uniqueSlug } from '$lib/server/page-service';
import { deleteManagedImageIfUnreferenced } from '$lib/server/image-cleanup';
import { assertPublicHttpUrl } from '$lib/server/link-preview';
import { validateManagedImageUrl } from '$lib/server/uploads';
import { youtubeWatchUrl } from '$lib/youtube';
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

async function cleanSourceImageUrl(value: FormDataEntryValue | null) {
	const raw = String(value || '').trim();
	if (!raw) return null;
	let url: URL;
	try {
		url = new URL(raw);
	} catch {
		throw new Error('URL ảnh nguồn không hợp lệ.');
	}
	if ((url.protocol !== 'https:' && url.protocol !== 'http:') || url.username || url.password)
		throw new Error('URL ảnh nguồn không hợp lệ.');
	return (await assertPublicHttpUrl(url.toString())).toString();
}

function cleanYouTubeUrl(value: FormDataEntryValue | null) {
	const raw = String(value || '').trim();
	if (!raw) return null;

	const watchUrl = youtubeWatchUrl(raw);
	if (!watchUrl) throw new Error('URL YouTube không hợp lệ.');
	return watchUrl;
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
	const [pageRows, themeRows, pageBlocks, linkablePages, blockClicks, assetPages, assetBlocks] = await Promise.all([
		db.select().from(pages).where(eq(pages.id, params.id)).limit(1),
		db.select().from(themes).where(eq(themes.pageId, params.id)).limit(1),
		db.select().from(blocks).where(eq(blocks.pageId, params.id)).orderBy(asc(blocks.position)),
		db
			.select({ id: pages.id, title: pages.title, slug: pages.slug, isHome: pages.isHome })
			.from(pages)
			.where(eq(pages.status, 'published'))
			.orderBy(asc(pages.title)),
		db
			.select({ blockId: clickEvents.blockId, total: count() })
			.from(clickEvents)
			.where(eq(clickEvents.pageId, params.id))
			.groupBy(clickEvents.blockId),
		db.select({ imageUrl: pages.logoUrl, sourceImageUrl: pages.logoSourceUrl }).from(pages),
		db.select({ metadata: blocks.metadata }).from(blocks)
	]);
	const [page] = pageRows;
	if (!page) throw error(404, 'Không tìm thấy trang.');

	const [theme] = themeRows;
	const clickMap = new Map(blockClicks.map((row) => [row.blockId, row.total]));
	const totalClicks = blockClicks.reduce((total, row) => total + row.total, 0);
	const targetPaths = new Map(
		linkablePages.map((target) => [
			target.id,
			target.isHome ? '/' : `/p/${encodeURIComponent(target.slug)}`
		])
	);
	const imageLibrary = [
		...assetPages,
		...assetBlocks.map(({ metadata }) => ({
			imageUrl: typeof metadata.imageUrl === 'string' ? metadata.imageUrl : null,
			sourceImageUrl: typeof metadata.sourceImageUrl === 'string' ? metadata.sourceImageUrl : null
		}))
	].filter(
		(value, index, values) =>
			Boolean(value.imageUrl || value.sourceImageUrl) &&
			values.findIndex(
				(candidate) =>
					candidate.imageUrl === value.imageUrl && candidate.sourceImageUrl === value.sourceImageUrl
			) === index
	);

	return {
		page,
		theme,
		blocks: pageBlocks.map((block) => {
			const destinationPath =
				navigationType(block.metadata) === 'page'
					? targetPaths.get(navigationValue(block.metadata))
					: undefined;
			return {
				...block,
				metadata: destinationPath ? { ...block.metadata, destinationPath } : block.metadata,
				clicks: clickMap.get(block.id) ?? 0
			};
		}),
		linkablePages,
		imageLibrary,
		totalClicks
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
		const buttonMinHeight = boundedInteger(form.get('buttonMinHeight'), 0, 0, 180);
		const buttonFontSize = boundedInteger(form.get('buttonFontSize'), 16, 12, 32);
		const backgroundValue = String(form.get('backgroundValue') || '#ffffff').trim();
		const backgroundMobileValue = String(form.get('backgroundMobileValue') || '').trim();
		const overlayColor = String(form.get('backgroundOverlayColor') || '#0f172a').trim();
		if (!/^#[0-9a-f]{6}$/i.test(overlayColor))
			return fail(400, { error: 'Màu lớp phủ không hợp lệ.' });

		try {
			if (backgroundType === 'image') {
				validateManagedImageUrl(backgroundValue);
				if (backgroundMobileValue) validateManagedImageUrl(backgroundMobileValue);
			}
		} catch (cause) {
			return fail(400, { error: cause instanceof Error ? cause.message : 'Ảnh nền không hợp lệ.' });
		}

		const [previousTheme] = await db
			.select({
				backgroundValue: themes.backgroundValue,
				backgroundMobileValue: themes.backgroundMobileValue
			})
			.from(themes)
			.where(eq(themes.pageId, params.id))
			.limit(1);
		await db
			.update(themes)
			.set({
				backgroundType: backgroundType as 'color' | 'gradient' | 'image',
				backgroundValue,
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
				buttonMinHeight,
				buttonFontSize,
				fontFamily: String(form.get('fontFamily') || 'system-ui').trim() || 'system-ui'
			})
			.where(eq(themes.pageId, params.id));
		if (previousTheme?.backgroundValue !== backgroundValue)
			await deleteManagedImageIfUnreferenced(previousTheme?.backgroundValue);
		if (previousTheme?.backgroundMobileValue !== (backgroundMobileValue || null))
			await deleteManagedImageIfUnreferenced(previousTheme?.backgroundMobileValue);
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
			const previousImageUrl =
				typeof block.metadata.imageUrl === 'string' ? block.metadata.imageUrl : null;
			let url: string | null = null;
			if ((block.type === 'link' || block.type === 'youtube') && form.has('imageUrl')) {
				const imageUrl = String(form.get('imageUrl') || '').trim();
				const rest = { ...block.metadata };
				delete rest.imageUrl;
				delete rest.sourceImageUrl;
				const sourceImageUrl = await cleanSourceImageUrl(form.get('sourceImageUrl'));
				metadata = {
					...rest,
					...(imageUrl ? { imageUrl: validateManagedImageUrl(imageUrl) } : {}),
					...(sourceImageUrl ? { sourceImageUrl } : {})
				};
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
				metadata = {
					...metadata,
					youtubeOpenMode: form.get('youtubeOpenMode') === 'external' ? 'external' : 'popup',
					youtubeMuted: form.get('youtubeMuted') === 'true',
					youtubeDisplay: form.get('youtubeDisplay') === 'iframe' ? 'iframe' : 'avatar'
				};
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
			const nextImageUrl = typeof metadata.imageUrl === 'string' ? metadata.imageUrl : null;
			if (previousImageUrl && previousImageUrl !== nextImageUrl)
				await deleteManagedImageIfUnreferenced(previousImageUrl);
			return { success: true, message: 'Đã cập nhật block.' };
		} catch (cause) {
			return fail(400, { error: cause instanceof Error ? cause.message : 'Không thể lưu block.' });
		}
	},

	toggleBlock: async ({ params, request }) => {
		const form = await request.formData();
		const blockId = String(form.get('blockId') || '');
		const block = await ownedBlock(params.id, blockId);
		if (!block) return fail(404, { error: 'Không tìm thấy block.' });

		const enabled = asBoolean(form.get('enabled'));
		await db.update(blocks).set({ enabled }).where(eq(blocks.id, blockId));

		return { success: true, message: enabled ? 'Đã hiện block.' : 'Đã ẩn block.' };
	},

	deleteBlock: async ({ params, request }) => {
		const form = await request.formData();
		const blockId = String(form.get('blockId') || '');
		const block = await ownedBlock(params.id, blockId);
		if (!block) return fail(404, { error: 'Không tìm thấy block.' });
		await db.delete(blocks).where(eq(blocks.id, blockId));
		await deleteManagedImageIfUnreferenced(block.metadata.imageUrl);
		return { success: true, message: 'Đã xóa block.', deletedBlockId: blockId };
	},

	upload: async ({ params, request }) => {
		const form = await request.formData();
		const kind = String(form.get('kind') || '');
		const value = String(form.get('url') || '').trim();
		let sourceUrl: string | null;
		try {
			sourceUrl = await cleanSourceImageUrl(form.get('sourceUrl'));
		} catch (cause) {
			return fail(400, { error: cause instanceof Error ? cause.message : 'URL ảnh không hợp lệ.' });
		}
		if (!value && !sourceUrl && form.get('remove') !== 'true')
			return fail(400, { error: 'URL ảnh không hợp lệ.' });

		try {
			const url = value ? validateManagedImageUrl(value) : null;
			if (kind === 'logo') {
				const [currentPage] = await db
					.select({ logoUrl: pages.logoUrl })
					.from(pages)
					.where(eq(pages.id, params.id))
					.limit(1);
				await db
					.update(pages)
					.set({ logoUrl: url, logoSourceUrl: sourceUrl })
					.where(eq(pages.id, params.id));
				if (currentPage?.logoUrl && currentPage.logoUrl !== url)
					await deleteManagedImageIfUnreferenced(currentPage.logoUrl);
			} else if (kind === 'background') {
				if (!url) return fail(400, { error: 'URL ảnh nền không hợp lệ.' });
				const mobileUrl = String(form.get('mobileUrl') || '').trim();
				const backgroundMobileValue = mobileUrl ? validateManagedImageUrl(mobileUrl) : null;
				const [currentTheme] = await db
					.select({
						backgroundValue: themes.backgroundValue,
						backgroundMobileValue: themes.backgroundMobileValue
					})
					.from(themes)
					.where(eq(themes.pageId, params.id))
					.limit(1);
				await db
					.update(themes)
					.set({
						backgroundType: 'image',
						backgroundValue: url,
						backgroundMobileValue
					})
					.where(eq(themes.pageId, params.id));
				if (currentTheme?.backgroundValue && currentTheme.backgroundValue !== url)
					await deleteManagedImageIfUnreferenced(currentTheme.backgroundValue);
				if (
					currentTheme?.backgroundMobileValue &&
					currentTheme.backgroundMobileValue !== backgroundMobileValue
				)
					await deleteManagedImageIfUnreferenced(currentTheme.backgroundMobileValue);
			} else if (kind === 'block-image') {
				const blockId = String(form.get('blockId') || '');
				const block = await ownedBlock(params.id, blockId);
				if (!block || (block.type !== 'link' && block.type !== 'youtube'))
					return fail(404, { error: 'Không tìm thấy block liên kết.' });
				const previousImageUrl =
					typeof block.metadata.imageUrl === 'string' ? block.metadata.imageUrl : null;
				const metadata: Record<string, unknown> = { ...block.metadata };
				if (url) metadata.imageUrl = url;
				else delete metadata.imageUrl;
				if (sourceUrl) metadata.sourceImageUrl = sourceUrl;
				else delete metadata.sourceImageUrl;
				await db.update(blocks).set({ metadata }).where(eq(blocks.id, block.id));
				if (previousImageUrl && previousImageUrl !== url)
					await deleteManagedImageIfUnreferenced(previousImageUrl);
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
