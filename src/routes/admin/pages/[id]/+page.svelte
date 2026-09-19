<script lang="ts">
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import { onDestroy, tick } from 'svelte';
	import type { SubmitFunction } from '@sveltejs/kit';
	import IconPicker from '$lib/components/IconPicker.svelte';
	import ImageField from '$lib/components/ImageField.svelte';
	import ResilientImage from '$lib/components/ResilientImage.svelte';
	import PublicPage from '$lib/components/PublicPage.svelte';
	import {
		navigationFallback,
		navigationType,
		navigationValue,
		publicRoutes,
		type NavigationType
	} from '$lib/navigation';
	import { uploadImage, uploadResponsiveBackground } from '$lib/uploads/client';

	type BackgroundType = 'color' | 'gradient' | 'image';

	const palette = [
		'#ffffff',
		'#f8fafc',
		'#eff6ff',
		'#ecfdf5',
		'#fefce8',
		'#fff7ed',
		'#fdf2f8',
		'#0f172a'
	];
	const gradientDirections = [
		{ value: '180deg', name: 'Từ trên xuống' },
		{ value: '135deg', name: 'Chéo xuống phải' },
		{ value: '90deg', name: 'Từ trái sang phải' }
	];
	const radiusOptions = [
		{ label: 'Vuông', value: 0 },
		{ label: 'Bo nhẹ', value: 10 },
		{ label: 'Bo tròn', value: 22 },
		{ label: 'Viên thuốc', value: 999 }
	];
	const fontOptions = [
		{
			label: 'Hiện đại',
			sample: 'Gọn gàng, hiện đại',
			value: 'Inter, ui-sans-serif, system-ui, sans-serif'
		},
		{
			label: 'Dễ đọc',
			sample: 'Rõ ràng, thân thiện',
			value: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
		},
		{ label: 'Thanh lịch', sample: 'Mềm mại, tinh tế', value: 'Georgia, "Times New Roman", serif' },
		{
			label: 'Trang trọng',
			sample: 'Cổ điển, trang nghiêm',
			value: '"Palatino Linotype", Palatino, Georgia, serif'
		}
	];
	const themePresets = [
		{
			id: 'light',
			name: 'Sáng',
			description: 'Sạch và nhẹ nhàng',
			previewBackground: '#f8fafc',
			backgroundType: 'color' as const,
			backgroundValue: '#f8fafc',
			buttonColor: '#93c5fd',
			buttonTextColor: '#172554',
			textColor: '#172554',
			buttonRadius: 999,
			fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif'
		},
		{
			id: 'calm-blue',
			name: 'Xanh dịu',
			description: 'Mát và thân thiện',
			previewBackground: 'linear-gradient(135deg, #eff6ff, #dcfce7)',
			backgroundType: 'gradient' as const,
			backgroundValue: 'linear-gradient(135deg, #eff6ff, #dcfce7)',
			buttonColor: '#2563eb',
			buttonTextColor: '#ffffff',
			textColor: '#172554',
			buttonRadius: 22,
			fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif'
		},
		{
			id: 'ceremonial',
			name: 'Trang nghiêm',
			description: 'Ấm và trang trọng',
			previewBackground: 'linear-gradient(180deg, #fefce8, #fff7ed)',
			backgroundType: 'gradient' as const,
			backgroundValue: 'linear-gradient(180deg, #fefce8, #fff7ed)',
			buttonColor: '#92400e',
			buttonTextColor: '#ffffff',
			textColor: '#451a03',
			buttonRadius: 10,
			fontFamily: 'Georgia, "Times New Roman", serif'
		},
		{
			id: 'minimal',
			name: 'Tối giản',
			description: 'Trắng và tinh gọn',
			previewBackground: '#ffffff',
			backgroundType: 'color' as const,
			backgroundValue: '#ffffff',
			backgroundPosition: 'center',
			buttonColor: '#f1f5f9',
			buttonTextColor: '#0f172a',
			textColor: '#0f172a',
			buttonRadius: 10,
			fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
		},
		{
			id: 'dark',
			name: 'Tối',
			description: 'Tương phản rõ nét',
			previewBackground: '#0f172a',
			backgroundType: 'color' as const,
			backgroundValue: '#0f172a',
			buttonColor: '#334155',
			buttonTextColor: '#ffffff',
			textColor: '#f8fafc',
			buttonRadius: 22,
			fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif'
		},
		{
			id: 'warm',
			name: 'Ấm áp',
			description: 'Nhẹ nhàng, gần gũi',
			previewBackground: 'linear-gradient(135deg, #fff7ed, #fdf2f8)',
			backgroundType: 'gradient' as const,
			backgroundValue: 'linear-gradient(135deg, #fff7ed, #fdf2f8)',
			buttonColor: '#be185d',
			buttonTextColor: '#ffffff',
			textColor: '#831843',
			buttonRadius: 999,
			fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
		}
	];

	let { data, form } = $props();
	// svelte-ignore state_referenced_locally
	let page = $state({ ...data.page });
	// svelte-ignore state_referenced_locally
	let theme = $state(
		data.theme ?? {
			id: '',
			pageId: data.page.id,
			backgroundType: 'color' as const,
			backgroundValue: '#ffffff',
			backgroundMobileValue: null,
			backgroundPosition: 'center',
			backgroundFocalX: 50,
			backgroundFocalY: 50,
			backgroundOverlayColor: '#0f172a',
			backgroundOverlayOpacity: 0,
			buttonColor: '#93c5fd',
			buttonTextColor: '#172554',
			textColor: '#172554',
			buttonRadius: 999,
			buttonPaddingX: 22,
			buttonPaddingY: 10,
			buttonMinHeight: 0,
			buttonFontSize: 16,
			fontFamily: 'system-ui',
			createdAt: new Date(),
			updatedAt: new Date()
		}
	);
	// svelte-ignore state_referenced_locally
	let blocks = $state(data.blocks.map((block) => ({ ...block })));
	let activeTab = $state<'content' | 'appearance'>('content');
	let draggedId = $state<string | null>(null);
	let dropIndex = $state<number | null>(null);
	let reorderStatus = $state('');
	let uploadingKind = $state<'logo' | 'background' | 'block-image' | null>(null);
	let imageUploadMessage = $state('');
	let imageUploadError = $state('');
	let solidBackground = $state('#ffffff');
	let gradientColor1 = $state('#eff6ff');
	let gradientColor2 = $state('#dcfce7');
	let gradientDirection = $state('135deg');
	let backgroundImageUrl = $state('');
	let backgroundFileInput = $state<HTMLInputElement>();
	let pageSettingsElement = $state<HTMLDetailsElement>();
	let highlightedBlockId = $state<string | null>(null);
	let pageSettingsHighlighted = $state(false);
	let expandedBlockId = $state<string | null>(null);
	let adjustingFocalPoint = $state(false);
	let linkPreviewStatus = $state<Record<string, string>>({});
	let fetchingPreviewIds = $state<string[]>([]);
	let togglingBlockIds = $state<string[]>([]);
	const linkPreviewTimers = new Map<string, ReturnType<typeof setTimeout>>();
	let pageSettingsHighlightTimer: ReturnType<typeof setTimeout> | undefined;

	onDestroy(() => {
		for (const timer of linkPreviewTimers.values()) clearTimeout(timer);
		if (pageSettingsHighlightTimer) clearTimeout(pageSettingsHighlightTimer);
	});

	let previewData = $derived({ page, theme, blocks });
	let publicPath = $derived(page.isHome ? '/' : `/p/${page.slug}`);
	let publicUrl = $derived(page.isHome ? resolve('/') : resolve('/p/[slug]', { slug: page.slug }));

	$effect(() => {
		page = { ...data.page };
		if (data.theme) {
			theme = { ...data.theme };
			syncBackgroundControls(data.theme.backgroundType, data.theme.backgroundValue);
		}
		blocks = data.blocks.map((block) => ({ ...block }));
	});

	function syncBackgroundControls(type: BackgroundType, value: string) {
		if (type === 'color' && /^#[0-9a-f]{6}$/i.test(value)) solidBackground = value;
		if (type === 'image') backgroundImageUrl = value;

		if (type === 'gradient') {
			const match = value.match(
				/^linear-gradient\(\s*([^,]+),\s*(#[0-9a-f]{6})\s*,\s*(#[0-9a-f]{6})\s*\)$/i
			);
			if (match) {
				gradientDirection = match[1].trim();
				gradientColor1 = match[2];
				gradientColor2 = match[3];
			}
		}
	}

	function clampPercent(value: number) {
		return Math.max(0, Math.min(100, Math.round(value)));
	}

	function rgbaFromHex(color: string, opacity: number) {
		const match = color.match(/^#([0-9a-f]{6})$/i);
		if (!match) return `rgb(15 23 42 / ${opacity / 100})`;
		const value = match[1];
		return `rgb(${Number.parseInt(value.slice(0, 2), 16)} ${Number.parseInt(value.slice(2, 4), 16)} ${Number.parseInt(value.slice(4, 6), 16)} / ${opacity / 100})`;
	}

	function focalPreviewStyle() {
		return `--focal-image:url("${backgroundImageUrl}");--focal-position:${theme.backgroundFocalX}% ${theme.backgroundFocalY}%;--focal-overlay:${rgbaFromHex(theme.backgroundOverlayColor, theme.backgroundOverlayOpacity)};`;
	}

	function setFocalPoint(event: PointerEvent) {
		const preview = event.currentTarget as HTMLElement;
		const bounds = preview.getBoundingClientRect();
		theme.backgroundFocalX = clampPercent(((event.clientX - bounds.left) / bounds.width) * 100);
		theme.backgroundFocalY = clampPercent(((event.clientY - bounds.top) / bounds.height) * 100);
	}

	function startFocalPointAdjustment(event: PointerEvent) {
		adjustingFocalPoint = true;
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		setFocalPoint(event);
	}

	function moveFocalPoint(event: PointerEvent) {
		if (adjustingFocalPoint) setFocalPoint(event);
	}

	function stopFocalPointAdjustment() {
		adjustingFocalPoint = false;
	}

	function moveFocalPointWithKeyboard(event: KeyboardEvent) {
		const step = event.shiftKey ? 10 : 2;
		if (event.key === 'ArrowLeft')
			theme.backgroundFocalX = clampPercent(theme.backgroundFocalX - step);
		else if (event.key === 'ArrowRight')
			theme.backgroundFocalX = clampPercent(theme.backgroundFocalX + step);
		else if (event.key === 'ArrowUp')
			theme.backgroundFocalY = clampPercent(theme.backgroundFocalY - step);
		else if (event.key === 'ArrowDown')
			theme.backgroundFocalY = clampPercent(theme.backgroundFocalY + step);
		else return;
		event.preventDefault();
	}

	function applyPreset(preset: (typeof themePresets)[number]) {
		theme.backgroundType = preset.backgroundType;
		theme.backgroundValue = preset.backgroundValue;
		theme.buttonColor = preset.buttonColor;
		theme.buttonTextColor = preset.buttonTextColor;
		theme.textColor = preset.textColor;
		theme.buttonRadius = preset.buttonRadius;
		theme.fontFamily = preset.fontFamily;
		syncBackgroundControls(preset.backgroundType, preset.backgroundValue);
	}

	function presetIsActive(preset: (typeof themePresets)[number]) {
		return (
			theme.backgroundType === preset.backgroundType &&
			theme.backgroundValue === preset.backgroundValue &&
			theme.buttonColor === preset.buttonColor &&
			theme.buttonTextColor === preset.buttonTextColor &&
			theme.textColor === preset.textColor &&
			theme.buttonRadius === preset.buttonRadius &&
			theme.fontFamily === preset.fontFamily
		);
	}

	function setBackgroundType(type: BackgroundType) {
		theme.backgroundType = type;
		if (type === 'color') theme.backgroundValue = solidBackground;
		if (type === 'gradient') applyGradient();
		if (type === 'image') theme.backgroundValue = backgroundImageUrl;
	}

	function applySolidColor(color: string) {
		solidBackground = color;
		theme.backgroundType = 'color';
		theme.backgroundValue = color;
	}

	function applyGradient() {
		theme.backgroundType = 'gradient';
		theme.backgroundValue = `linear-gradient(${gradientDirection}, ${gradientColor1}, ${gradientColor2})`;
	}

	function selectGradientDirection(direction: string) {
		gradientDirection = direction;
		applyGradient();
	}

	function getBlockImageUrl(metadata: Record<string, unknown>) {
		return typeof metadata.imageUrl === 'string' ? metadata.imageUrl : '';
	}

	function getBlockSourceImageUrl(metadata: Record<string, unknown>) {
		return typeof metadata.sourceImageUrl === 'string' ? metadata.sourceImageUrl : '';
	}

	function getBlockImageDisplay(metadata: Record<string, unknown>) {
		return metadata.imageDisplay === 'card' ? 'card' : 'icon';
	}

	function getYoutubeOpenMode(metadata: Record<string, unknown>) {
		return metadata.youtubeOpenMode === 'external' ? 'external' : 'popup';
	}

	function setYoutubeOpenMode(block: (typeof blocks)[number], value: string) {
		block.metadata = {
			...block.metadata,
			youtubeOpenMode: value === 'external' ? 'external' : 'popup'
		};
	}

	function getYoutubeMuted(metadata: Record<string, unknown>) {
		return metadata.youtubeMuted === true;
	}

	function setYoutubeMuted(block: (typeof blocks)[number], value: string) {
		block.metadata = { ...block.metadata, youtubeMuted: value === 'true' };
	}

	function getYoutubeDisplay(metadata: Record<string, unknown>) {
		return metadata.youtubeDisplay === 'iframe' ? 'iframe' : 'avatar';
	}

	function setYoutubeDisplay(block: (typeof blocks)[number], value: string) {
		block.metadata = {
			...block.metadata,
			youtubeDisplay: value === 'iframe' ? 'iframe' : 'avatar'
		};
	}

	function blockTypeLabel(type: string) {
		return (
			{
				link: 'Liên kết',
				youtube: 'YouTube',
				heading: 'Tiêu đề',
				text: 'Văn bản',
				divider: 'Đường phân cách'
			}[type] ?? type
		);
	}

	function blockTypeIcon(type: string) {
		return (
			{
				link: 'icon-[mdi--link-variant]',
				youtube: 'icon-[mdi--youtube]',
				heading: 'icon-[mdi--format-header-1]',
				text: 'icon-[mdi--text-short]',
				divider: 'icon-[mdi--minus]'
			}[type] ?? 'icon-[mdi--shape-outline]'
		);
	}

	function toggleBlock(blockId: string) {
		expandedBlockId = expandedBlockId === blockId ? null : blockId;
	}

	async function toggleBlockVisibility(block: (typeof blocks)[number], enabled: boolean) {
		if (togglingBlockIds.includes(block.id)) return;
		const previousEnabled = block.enabled;
		block.enabled = enabled;
		togglingBlockIds = [...togglingBlockIds, block.id];

		const form = new FormData();
		form.set('blockId', block.id);
		form.set('enabled', String(enabled));

		try {
			const response = await fetch('?/toggleBlock', { method: 'POST', body: form });
			if (!response.ok) throw new Error('Không thể lưu trạng thái hiển thị.');
		} catch {
			block.enabled = previousEnabled;
			window.alert('Không thể lưu trạng thái hiển thị. Vui lòng thử lại.');
		} finally {
			togglingBlockIds = togglingBlockIds.filter((id) => id !== block.id);
		}
	}

	function setBlockImageDisplay(block: (typeof blocks)[number], value: string) {
		block.metadata = { ...block.metadata, imageDisplay: value === 'card' ? 'card' : 'icon' };
	}

	function setNavigationType(block: (typeof blocks)[number], type: NavigationType) {
		const metadata = { ...block.metadata };
		delete metadata.destinationPath;
		block.metadata = {
			...metadata,
			navigationType: type,
			navigationValue: type === 'route' ? publicRoutes[0].path : type === 'back' ? '' : ''
		};
	}

	function setNavigationValue(block: (typeof blocks)[number], value: string) {
		const metadata = { ...block.metadata };
		delete metadata.destinationPath;
		const targetPage =
			navigationType(block.metadata) === 'page'
				? data.linkablePages.find((page) => page.id === value)
				: undefined;
		block.metadata = {
			...metadata,
			navigationValue: value,
			...(targetPage ? { destinationPath: targetPage.isHome ? '/' : `/p/${targetPage.slug}` } : {})
		};
	}

	function setNavigationFallback(block: (typeof blocks)[number], value: string) {
		block.metadata = { ...block.metadata, navigationFallback: value };
	}

	async function fillLinkFromPreview(block: (typeof blocks)[number]) {
		const url = block.url?.trim();
		if (!url) {
			linkPreviewStatus = { ...linkPreviewStatus, [block.id]: 'Nhập URL trước khi lấy thông tin.' };
			return;
		}
		if (fetchingPreviewIds.includes(block.id)) return;

		fetchingPreviewIds = [...fetchingPreviewIds, block.id];
		linkPreviewStatus = { ...linkPreviewStatus, [block.id]: 'Đang lấy thông tin…' };
		try {
			const response = await fetch(resolve('/admin/api/link-preview'), {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ url, pageId: page.id })
			});
			const preview = (await response.json()) as {
				error?: string;
				url?: string;
				title?: string;
				description?: string | null;
				imageUrl?: string | null;
				sourceImageUrl?: string | null;
			};
			if (!response.ok) throw new Error(preview.error || 'Không thể lấy thông tin liên kết.');

			block.url = preview.url || url;
			if (preview.title) block.title = preview.title;
			if (preview.description) block.subtitle = preview.description;
			block.metadata = {
				...block.metadata,
				...(preview.imageUrl ? { imageUrl: preview.imageUrl } : {}),
				...(preview.sourceImageUrl ? { sourceImageUrl: preview.sourceImageUrl } : {}),
				imageDisplay: 'icon'
			};
			linkPreviewStatus = {
				...linkPreviewStatus,
				[block.id]: preview.imageUrl
					? 'Đã điền thông tin và lưu ảnh. Nhấn Lưu block để áp dụng.'
					: 'Đã điền tiêu đề và mô tả. Nhấn Lưu block để áp dụng.'
			};
		} catch (cause) {
			linkPreviewStatus = {
				...linkPreviewStatus,
				[block.id]: cause instanceof Error ? cause.message : 'Không thể lấy thông tin liên kết.'
			};
		} finally {
			fetchingPreviewIds = fetchingPreviewIds.filter((id) => id !== block.id);
		}
	}

	function scheduleLinkPreview(block: (typeof blocks)[number], value: string) {
		block.url = value;
		const previousTimer = linkPreviewTimers.get(block.id);
		if (previousTimer) clearTimeout(previousTimer);
		if (!value.trim()) {
			linkPreviewStatus = { ...linkPreviewStatus, [block.id]: '' };
			return;
		}
		linkPreviewStatus = { ...linkPreviewStatus, [block.id]: 'Đang chuẩn bị lấy thông tin…' };
		linkPreviewTimers.set(
			block.id,
			setTimeout(() => {
				linkPreviewTimers.delete(block.id);
				void fillLinkFromPreview(block);
			}, 700)
		);
	}

	function goBackToAdmin(event: MouseEvent) {
		event.preventDefault();
		if (history.length > 1) {
			history.back();
			return;
		}
		window.location.assign(resolve('/admin'));
	}

	const enhanceMutation: SubmitFunction = ({ submitter }) => {
		const submitButton = submitter instanceof HTMLButtonElement ? submitter : null;
		submitButton?.classList.add('app-loading');
		submitButton?.setAttribute('aria-busy', 'true');

		return async ({ result, update }) => {
			try {
				if (result.type === 'success') {
					const actionData = result.data as {
						block?: (typeof blocks)[number];
						deletedBlockId?: string;
						isHome?: boolean;
					};
					if (actionData.block) {
						blocks = [...blocks, { ...actionData.block, clicks: 0 }];
						expandedBlockId = actionData.block.id;
						await tick();
						document.getElementById(`block-editor-${actionData.block.id}`)?.scrollIntoView({
							behavior: 'smooth',
							block: 'center'
						});
					}
					if (actionData.deletedBlockId)
						blocks = blocks.filter((block) => block.id !== actionData.deletedBlockId);
					if (actionData.isHome) page.isHome = true;
				}
				await update({ invalidateAll: false, reset: false });
			} finally {
				submitButton?.classList.remove('app-loading');
				submitButton?.removeAttribute('aria-busy');
			}
		};
	};

	async function focusBlockFromPreview(blockId: string) {
		activeTab = 'content';
		expandedBlockId = blockId;
		highlightedBlockId = blockId;
		await tick();
		document.getElementById(`block-editor-${blockId}`)?.scrollIntoView({
			behavior: 'smooth',
			block: 'center'
		});
		setTimeout(() => {
			if (highlightedBlockId === blockId) highlightedBlockId = null;
		}, 1800);
	}

	async function focusPageSettingsFromPreview() {
		activeTab = 'content';
		pageSettingsHighlighted = true;
		await tick();
		if (!pageSettingsElement) return;
		pageSettingsElement.open = true;
		pageSettingsElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
		if (pageSettingsHighlightTimer) clearTimeout(pageSettingsHighlightTimer);
		pageSettingsHighlightTimer = setTimeout(() => {
			pageSettingsHighlighted = false;
			pageSettingsHighlightTimer = undefined;
		}, 1800);
	}

	async function persistOrder() {
		reorderStatus = 'Đang lưu thứ tự…';
		const response = await fetch(resolve('/admin/pages/[id]/order', { id: page.id }), {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ ids: blocks.map((block) => block.id) })
		});
		reorderStatus = response.ok ? 'Đã lưu thứ tự' : 'Không thể lưu thứ tự';
		setTimeout(() => (reorderStatus = ''), 1600);
	}

	function startDragging(event: DragEvent, blockId: string) {
		draggedId = blockId;
		dropIndex = null;
		if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
	}

	function updateDropIndex(event: DragEvent, targetIndex: number) {
		event.preventDefault();
		if (!draggedId) return;
		const target = event.currentTarget as HTMLElement;
		const bounds = target.getBoundingClientRect();
		dropIndex = targetIndex + (event.clientY > bounds.top + bounds.height / 2 ? 1 : 0);
		if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
	}

	function stopDragging() {
		draggedId = null;
		dropIndex = null;
	}

	async function dropAt(targetIndex: number) {
		if (!draggedId) return;
		const sourceIndex = blocks.findIndex((block) => block.id === draggedId);
		if (sourceIndex < 0) return;
		const reordered = [...blocks];
		const [item] = reordered.splice(sourceIndex, 1);
		const insertionIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
		if (insertionIndex === sourceIndex) {
			stopDragging();
			return;
		}
		reordered.splice(insertionIndex, 0, item);
		blocks = reordered;
		stopDragging();
		await persistOrder();
	}

	async function persistImage(
		kind: 'logo' | 'background' | 'block-image',
		file: File,
		input?: HTMLInputElement | null,
		block?: (typeof blocks)[number]
	) {
		uploadingKind = kind;
		imageUploadMessage = '';
		imageUploadError = '';

		try {
			const responsiveBackground =
				kind === 'background' ? await uploadResponsiveBackground(page.id, file) : null;
			const url = responsiveBackground?.desktopUrl ?? (await uploadImage(page.id, kind, file));
			const payload = new FormData();
			payload.set('kind', kind);
			payload.set('url', url);
			if (responsiveBackground?.mobileUrl) payload.set('mobileUrl', responsiveBackground.mobileUrl);
			if (block) payload.set('blockId', block.id);
			const response = await fetch('?/upload', { method: 'POST', body: payload });
			if (!response.ok) throw new Error('Ảnh đã tải lên MinIO nhưng không thể lưu URL vào trang.');

			if (kind === 'logo') {
				page.logoUrl = url;
			} else if (kind === 'background') {
				backgroundImageUrl = url;
				theme.backgroundType = 'image';
				theme.backgroundValue = url;
				theme.backgroundMobileValue = responsiveBackground?.mobileUrl ?? null;
			} else if (block) {
				const metadata = { ...block.metadata };
				delete metadata.sourceImageUrl;
				block.metadata = { ...metadata, imageUrl: url };
			}

			if (input) input.value = '';
			imageUploadMessage =
				kind === 'logo'
					? 'Đã cập nhật logo.'
					: kind === 'background'
						? responsiveBackground?.mobileUrl
							? 'Đã cập nhật ảnh nền và bản tối ưu cho điện thoại.'
							: 'Đã cập nhật ảnh nền.'
						: 'Đã cập nhật ảnh cho liên kết.';
		} catch (cause) {
			imageUploadError = cause instanceof Error ? cause.message : 'Không thể tải ảnh.';
		} finally {
			uploadingKind = null;
		}
	}

	async function saveImageSelection(
		kind: 'logo' | 'block-image',
		value: { imageUrl: string; sourceImageUrl: string },
		block?: (typeof blocks)[number]
	) {
		const payload = new FormData();
		payload.set('kind', kind);
		payload.set('url', value.imageUrl);
		payload.set('sourceUrl', value.sourceImageUrl);
		if (!value.imageUrl && !value.sourceImageUrl) payload.set('remove', 'true');
		if (block) payload.set('blockId', block.id);
		const response = await fetch('?/upload', { method: 'POST', body: payload });
		if (!response.ok) throw new Error('Không thể lưu ảnh.');
		if (kind === 'logo') {
			page.logoUrl = value.imageUrl || null;
			page.logoSourceUrl = value.sourceImageUrl || null;
		} else if (block) {
			const metadata = { ...block.metadata };
			if (value.imageUrl) metadata.imageUrl = value.imageUrl;
			else delete metadata.imageUrl;
			if (value.sourceImageUrl) metadata.sourceImageUrl = value.sourceImageUrl;
			else delete metadata.sourceImageUrl;
			block.metadata = metadata;
		}
	}

	async function handleImageUpload(event: SubmitEvent, kind: 'logo' | 'background') {
		event.preventDefault();
		const formElement = event.currentTarget as HTMLFormElement;
		const input = formElement.elements.namedItem('file') as HTMLInputElement | null;
		const file = input?.files?.[0];
		if (!file) {
			imageUploadError = 'Vui lòng chọn ảnh.';
			return;
		}

		await persistImage(kind, file, input);
	}

	async function handleBackgroundFileChange(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		await persistImage('background', file, input);
	}

	async function handleBlockImageChange(block: (typeof blocks)[number], event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		await persistImage('block-image', file, input, block);
	}
</script>

<svelte:head><title>{page.title} · TTPQ Admin</title></svelte:head>

<main class="editor-shell">
	<header class="editor-header">
		<div>
			<a class="back" href={resolve('/admin')} onclick={goBackToAdmin}
				><span class="icon-[mdi--arrow-left]" aria-hidden="true"></span> Tất cả trang</a
			>
			<div class="title-row">
				<h1>{page.title}</h1>
				<span class:published={page.status === 'published'} class="status"
					>{page.status === 'published' ? 'Đã xuất bản' : 'Bản nháp'}</span
				>
				{#if page.isHome}<span class="home-badge"
						><span class="icon-[mdi--star]" aria-hidden="true"></span> Trang chính</span
					>{/if}
			</div>
			<a class="public-url" href={publicUrl} target="_blank" rel="noreferrer"
				>{page.isHome ? 'ttpq.hatbuinho.me' : `ttpq.hatbuinho.me${publicPath}`}
				<span class="icon-[mdi--open-in-new]" aria-hidden="true"></span></a
			>
		</div>
		<div class="header-metric"><strong>{data.totalClicks}</strong><span>tổng click</span></div>
	</header>

	{#if form?.error}<div class="alert error">{form.error}</div>{/if}
	{#if form?.message}<div class="alert success">{form.message}</div>{/if}

	<div class="editor-grid">
		<section class="editor-panel">
			<div class="tabs">
				<button class:active={activeTab === 'content'} onclick={() => (activeTab = 'content')}
					>Nội dung</button
				>
				<button class:active={activeTab === 'appearance'} onclick={() => (activeTab = 'appearance')}
					>Giao diện</button
				>
			</div>

			{#if activeTab === 'content'}
				<section class="content-toolbar" aria-labelledby="content-heading">
					<div>
						<span class="section-kicker">TRÌNH BIÊN TẬP</span>
						<h2 id="content-heading">Xây dựng trang của bạn</h2>
						<p>Thêm nội dung, sắp xếp rồi chọn từng card để chỉnh chi tiết.</p>
					</div>
					<div class="quick-add-grid">
						<form method="POST" action="?/addBlock" use:enhance={enhanceMutation}>
							<input type="hidden" name="type" value="link" />
							<button class="quick-add primary-add">
								<span class="icon-[mdi--plus]" aria-hidden="true"></span> Thêm liên kết
							</button>
						</form>
						<form method="POST" action="?/addBlock" use:enhance={enhanceMutation}>
							<input type="hidden" name="type" value="heading" />
							<button class="quick-add secondary-add">
								<span class="icon-[mdi--format-header-1]" aria-hidden="true"></span> Thêm tiêu đề
							</button>
						</form>
					</div>
					<form method="POST" action="?/addBlock" class="more-add" use:enhance={enhanceMutation}>
						<label for="block-type">Nội dung khác</label>
						<select id="block-type" name="type">
							<option value="youtube">Video YouTube</option>
							<option value="text">Văn bản</option>
							<option value="divider">Đường phân cách</option>
						</select>
						<button><span class="icon-[mdi--plus]" aria-hidden="true"></span> Thêm</button>
					</form>
				</section>

				<details
					bind:this={pageSettingsElement}
					class:preview-selected={pageSettingsHighlighted}
					class="panel-card page-settings"
				>
					<summary>
						<span
							class="settings-summary-icon icon-[mdi--account-circle-outline]"
							aria-hidden="true"
						></span>
						<span
							><strong>Hồ sơ & cài đặt trang</strong><small
								>Tiêu đề, logo, địa chỉ và xuất bản</small
							></span
						>
						<span class="chevron icon-[mdi--chevron-down]" aria-hidden="true"></span>
					</summary>
					<div class="page-settings-body">
						<form method="POST" action="?/updatePage" use:enhance={enhanceMutation}>
							<div class="field-grid two">
								<label>Tên trang <input name="title" bind:value={page.title} required /></label>
								<label>Slug <input name="slug" bind:value={page.slug} /></label>
							</div>
							<label
								>Mô tả <textarea name="description" rows="2" bind:value={page.description}
								></textarea></label
							>
							<div class="page-settings-actions">
								<label
									>Trạng thái
									<select name="status" bind:value={page.status}
										><option value="draft">Bản nháp</option><option value="published"
											>Đã xuất bản</option
										></select
									>
								</label>
								<button class="primary">Lưu thông tin</button>
							</div>
						</form>
						<ImageField
							pageId={page.id}
							kind="logo"
							label="Ảnh đại diện"
							imageUrl={page.logoUrl || ''}
							sourceImageUrl={page.logoSourceUrl || ''}
							library={data.imageLibrary}
							onchange={(value) => saveImageSelection('logo', value)}
						/>
						{#if imageUploadError}<p class="upload-message error-text">{imageUploadError}</p>{/if}
						{#if imageUploadMessage}<p class="upload-message success-text">
								{imageUploadMessage}
							</p>{/if}
					</div>
				</details>

				<div class="blocks-workspace">
					<div class="blocks-heading">
						<div>
							<h2>Nội dung</h2>
							<p>Kéo biểu tượng bên trái để đổi thứ tự.</p>
						</div>
						<small
							class:loading={reorderStatus.startsWith('Đang')}
							class="reorder-status"
							aria-live="polite">{reorderStatus}</small
						>
					</div>

					<div class="block-list">
						{#each blocks as block, index (block.id)}
							{#if draggedId && dropIndex === index}
								<div
									class="block-drop-placeholder"
									role="separator"
									aria-label="Vị trí thả block"
									ondragover={(event) => event.preventDefault()}
									ondrop={(event) => {
										event.preventDefault();
										void dropAt(index);
									}}
								>
									<span>Thả block tại đây</span>
								</div>
							{/if}
							<article
								id={`block-editor-${block.id}`}
								class:dragging={draggedId === block.id}
								class:preview-selected={highlightedBlockId === block.id}
								class="block-editor"
								draggable="true"
								ondragstart={(event) => startDragging(event, block.id)}
								ondragend={stopDragging}
								ondragover={(event) => updateDropIndex(event, index)}
								ondrop={(event) => {
									event.preventDefault();
									void dropAt(dropIndex ?? index);
								}}
							>
								<div class="drag-handle" title="Kéo để sắp xếp" aria-label="Kéo để sắp xếp">
									<span class="icon-[mdi--drag-vertical]" aria-hidden="true"></span>
								</div>
								<form
									method="POST"
									action="?/updateBlock"
									class="block-form"
									use:enhance={enhanceMutation}
								>
									<input type="hidden" name="blockId" value={block.id} />
									<div class="block-summary">
										<button
											type="button"
											class="block-summary-button"
											onclick={() => toggleBlock(block.id)}
											aria-expanded={expandedBlockId === block.id}
										>
											<span
												class={`block-kind-icon ${blockTypeIcon(block.type)}`}
												aria-hidden="true"
											></span>
											<span class="block-summary-copy">
												<strong>{block.title || blockTypeLabel(block.type)}</strong>
												<small
													>{block.type === 'link'
														? block.url || 'Chưa có địa chỉ liên kết'
														: block.subtitle || blockTypeLabel(block.type)}</small
												>
											</span>
											<span class="block-summary-meta"
												><span class="icon-[mdi--chart-bar]" aria-hidden="true"></span>
												{block.clicks}</span
											>
											<span
												class:expanded={expandedBlockId === block.id}
												class="block-chevron icon-[mdi--chevron-down]"
												aria-hidden="true"
											></span>
										</button>
										<label
											class="visibility-toggle"
											class:toggling={togglingBlockIds.includes(block.id)}
											aria-busy={togglingBlockIds.includes(block.id)}
											title={block.enabled ? 'Đang hiển thị' : 'Đang ẩn'}
										>
											<input
												name="enabled"
												type="checkbox"
												checked={block.enabled}
												disabled={togglingBlockIds.includes(block.id)}
												onchange={(event) =>
													void toggleBlockVisibility(block, event.currentTarget.checked)}
											/>
											<span aria-hidden="true"></span><span class="sr-only">Hiển thị block</span>
										</label>
									</div>
									<div class:expanded={expandedBlockId === block.id} class="block-details">
										<div class="block-details-heading">
											<span>{blockTypeLabel(block.type)}</span><small
												>{block.clicks} lượt nhấp</small
											>
										</div>
										{#if block.type !== 'divider'}
											<label>Tiêu đề <input name="title" bind:value={block.title} /></label>
										{/if}
										{#if block.type === 'link' || block.type === 'text' || block.type === 'youtube'}
											<label>Mô tả phụ <input name="subtitle" bind:value={block.subtitle} /></label>
										{/if}
										{#if block.type === 'link'}
											<label
												>Hành động
												<select
													name="navigationType"
													value={navigationType(block.metadata)}
													onchange={(event) =>
														setNavigationType(block, event.currentTarget.value as NavigationType)}
												>
													<option value="external">Mở website ngoài</option>
													<option value="page">Mở trang trong hệ thống</option>
													<option value="route">Mở route của app</option>
													<option value="back">Quay lại trang trước</option>
												</select>
											</label>
											{#if navigationType(block.metadata) === 'external'}
												<label
													>URL <input
														name="url"
														bind:value={block.url}
														placeholder="https://…"
														oninput={(event) =>
															scheduleLinkPreview(block, event.currentTarget.value)}
													/></label
												>
												<div class="link-preview-tools">
													<button
														type="button"
														disabled={fetchingPreviewIds.includes(block.id)}
														aria-busy={fetchingPreviewIds.includes(block.id)}
														onclick={() => fillLinkFromPreview(block)}
													>
														<span class="icon-[mdi--magic-staff]" aria-hidden="true"></span> Lấy thông
														tin link
													</button>
													{#if linkPreviewStatus[block.id]}
														<small aria-live="polite">{linkPreviewStatus[block.id]}</small>
													{/if}
												</div>
											{:else if navigationType(block.metadata) === 'page'}
												<label
													>Trang đích
													<select
														name="navigationValue"
														value={navigationValue(block.metadata)}
														onchange={(event) =>
															setNavigationValue(block, event.currentTarget.value)}
													>
														<option value="">Chọn trang đã xuất bản</option>
														{#each data.linkablePages as targetPage (targetPage.id)}
															<option value={targetPage.id}
																>{targetPage.isHome ? 'Trang chính' : targetPage.title}</option
															>
														{/each}
													</select>
												</label>
											{:else if navigationType(block.metadata) === 'route'}
												<label
													>Route đích
													<select
														name="navigationValue"
														value={navigationValue(block.metadata)}
														onchange={(event) =>
															setNavigationValue(block, event.currentTarget.value)}
													>
														{#each publicRoutes as route (route.path)}
															<option value={route.path}>{route.label} ({route.path})</option>
														{/each}
													</select>
												</label>
											{:else}
												<input type="hidden" name="navigationValue" value="" />
												<label
													>Điểm đến khi không có lịch sử
													<select
														name="navigationFallback"
														value={navigationFallback(block.metadata)}
														onchange={(event) =>
															setNavigationFallback(block, event.currentTarget.value)}
													>
														{#each publicRoutes as route (route.path)}
															<option value={route.path}>{route.label}</option>
														{/each}
													</select>
												</label>
											{/if}
											<div class="field-grid two">
												<IconPicker bind:value={block.icon} />
												<label
													class="check"
													class:visually-hidden={navigationType(block.metadata) !== 'external'}
													><input
														name="openNewTab"
														type="checkbox"
														bind:checked={block.openNewTab}
													/> Mở tab mới</label
												>
											</div>
											<div class="block-image-control">
												<input
													type="hidden"
													name="imageUrl"
													value={getBlockImageUrl(block.metadata)}
												/>
												<input
													type="hidden"
													name="sourceImageUrl"
													value={getBlockSourceImageUrl(block.metadata)}
												/>
												<div>
													<ImageField
														pageId={page.id}
														kind="block-image"
														label="Ảnh thay icon"
														imageUrl={getBlockImageUrl(block.metadata)}
														sourceImageUrl={getBlockSourceImageUrl(block.metadata)}
														library={data.imageLibrary}
														onchange={(value) => saveImageSelection('block-image', value, block)}
													/>
													<label class="image-display-field"
														>Hiển thị ảnh
														<select
															name="imageDisplay"
															value={getBlockImageDisplay(block.metadata)}
															onchange={(event) =>
																setBlockImageDisplay(block, event.currentTarget.value)}
														>
															<option value="icon">Icon</option>
															<option value="card">Card ảnh</option>
														</select>
													</label>
												</div>
											</div>
										{:else if block.type === 'youtube'}
											<input
												type="hidden"
												name="imageUrl"
												value={getBlockImageUrl(block.metadata)}
											/>
											<input
												type="hidden"
												name="sourceImageUrl"
												value={getBlockSourceImageUrl(block.metadata)}
											/>
											<label
												>URL YouTube <input
													name="url"
													bind:value={block.url}
													placeholder="https://youtu.be/..."
													oninput={(event) => scheduleLinkPreview(block, event.currentTarget.value)}
												/></label
											>
											<label
												>Kiểu hiển thị
												<select
													name="youtubeDisplay"
													value={getYoutubeDisplay(block.metadata)}
													onchange={(event) => setYoutubeDisplay(block, event.currentTarget.value)}
												>
													<option value="avatar">Avatar kênh</option>
													<option value="iframe">Trình phát video</option>
												</select>
											</label>
											<div class="field-grid two">
												<label
													>Khi nhấn vào video
													<select
														name="youtubeOpenMode"
														value={getYoutubeOpenMode(block.metadata)}
														onchange={(event) =>
															setYoutubeOpenMode(block, event.currentTarget.value)}
													>
														<option value="popup">Mở popup trong trang</option>
														<option value="external">Mở trang YouTube</option>
													</select>
												</label>
												{#if getYoutubeOpenMode(block.metadata) === 'popup'}
													<label
														>Âm thanh khi mở
														<select
															name="youtubeMuted"
															value={String(getYoutubeMuted(block.metadata))}
															onchange={(event) =>
																setYoutubeMuted(block, event.currentTarget.value)}
														>
															<option value="false">Có âm thanh</option>
															<option value="true">Tắt âm</option>
														</select>
													</label>
												{:else}
													<input
														type="hidden"
														name="youtubeMuted"
														value={String(getYoutubeMuted(block.metadata))}
													/>
													<label class="check">
														<input
															name="openNewTab"
															type="checkbox"
															bind:checked={block.openNewTab}
														/> Mở trong tab mới
													</label>
												{/if}
											</div>
											<div class="youtube-preview-tools">
												{#if getBlockImageUrl(block.metadata) || getBlockSourceImageUrl(block.metadata)}
													<ResilientImage
														primaryUrl={getBlockImageUrl(block.metadata)}
														fallbackUrl={getBlockSourceImageUrl(block.metadata)}
														alt="Avatar kênh YouTube"
													/>
												{:else}
													<span class="icon-[mdi--youtube]" aria-hidden="true"></span>
												{/if}
												<div>
													<strong>Tự động lấy thông tin video</strong>
													<small aria-live="polite"
														>{linkPreviewStatus[block.id] ||
															'Dán link để lấy tên video và avatar kênh.'}</small
													>
												</div>
												<button
													type="button"
													disabled={fetchingPreviewIds.includes(block.id)}
													aria-busy={fetchingPreviewIds.includes(block.id)}
													onclick={() => fillLinkFromPreview(block)}>Lấy lại</button
												>
											</div>
										{/if}
										<div class="block-actions">
											<span>Mọi thay đổi chỉ hiển thị công khai sau khi lưu.</span><button
												class="save">Lưu thay đổi</button
											>
										</div>
									</div>
								</form>
								<form
									method="POST"
									action="?/deleteBlock"
									use:enhance={enhanceMutation}
									onsubmit={(event) => !confirm('Xóa block này?') && event.preventDefault()}
								>
									<input type="hidden" name="blockId" value={block.id} />
									<button class="icon-danger" title="Xóa block" aria-label="Xóa block"
										><span class="icon-[mdi--delete-outline]" aria-hidden="true"></span></button
									>
								</form>
							</article>
						{/each}
						{#if draggedId && dropIndex === blocks.length}
							<div
								class="block-drop-placeholder"
								role="separator"
								aria-label="Vị trí thả block"
								ondragover={(event) => event.preventDefault()}
								ondrop={(event) => {
									event.preventDefault();
									void dropAt(blocks.length);
								}}
							>
								<span>Thả block tại đây</span>
							</div>
						{/if}
					</div>

					{#if blocks.length === 0}
						<div class="empty-blocks">
							<span class="icon-[mdi--link-plus]" aria-hidden="true"></span><strong
								>Trang đang trống</strong
							>
							<p>Thêm liên kết đầu tiên để bắt đầu.</p>
						</div>
					{/if}
				</div>
			{:else}
				<form
					method="POST"
					action="?/updateTheme"
					class="panel-card appearance-card"
					use:enhance={enhanceMutation}
				>
					<div class="card-heading">
						<div>
							<h2>Giao diện trang</h2>
							<p>Chọn theo ý thích và xem kết quả ngay ở bản xem trước.</p>
						</div>
						<button class="primary" type="submit">Lưu giao diện</button>
					</div>

					<input type="hidden" name="backgroundType" value={theme.backgroundType} />
					<input type="hidden" name="backgroundValue" value={theme.backgroundValue} />
					<input
						type="hidden"
						name="backgroundMobileValue"
						value={theme.backgroundMobileValue || ''}
					/>
					<input type="hidden" name="backgroundFocalX" value={theme.backgroundFocalX} />
					<input type="hidden" name="backgroundFocalY" value={theme.backgroundFocalY} />
					<input type="hidden" name="backgroundOverlayColor" value={theme.backgroundOverlayColor} />
					<input
						type="hidden"
						name="backgroundOverlayOpacity"
						value={theme.backgroundOverlayOpacity}
					/>
					<input type="hidden" name="buttonColor" value={theme.buttonColor} />
					<input type="hidden" name="buttonTextColor" value={theme.buttonTextColor} />
					<input type="hidden" name="textColor" value={theme.textColor} />
					<input type="hidden" name="buttonRadius" value={theme.buttonRadius} />
					<input type="hidden" name="buttonPaddingX" value={theme.buttonPaddingX} />
					<input type="hidden" name="buttonPaddingY" value={theme.buttonPaddingY} />
					<input type="hidden" name="buttonMinHeight" value={theme.buttonMinHeight} />
					<input type="hidden" name="buttonFontSize" value={theme.buttonFontSize} />
					<input type="hidden" name="fontFamily" value={theme.fontFamily} />

					<section class="appearance-section first-section">
						<div class="section-heading">
							<h3>Phong cách có sẵn</h3>
							<p>Chọn một mẫu làm điểm bắt đầu, sau đó chỉnh thêm nếu muốn.</p>
						</div>
						<div class="preset-grid">
							{#each themePresets as preset (preset.id)}
								<button
									type="button"
									class="preset-card"
									class:selected={presetIsActive(preset)}
									aria-pressed={presetIsActive(preset)}
									onclick={() => applyPreset(preset)}
								>
									<span class="preset-preview" style={`background: ${preset.previewBackground}`}>
										<span style={`background: ${preset.buttonColor}`}></span>
										<span style={`background: ${preset.buttonColor}`}></span>
									</span>
									<strong>{preset.name}</strong>
									<small>{preset.description}</small>
								</button>
							{/each}
						</div>
					</section>

					<section class="appearance-section">
						<div class="section-heading">
							<h3>Nền trang</h3>
							<p>Dùng màu đơn, chuyển màu hoặc ảnh riêng của bạn.</p>
						</div>

						<div class="background-tabs" role="group" aria-label="Kiểu nền">
							<button
								type="button"
								class:selected={theme.backgroundType === 'color'}
								aria-pressed={theme.backgroundType === 'color'}
								onclick={() => setBackgroundType('color')}>Màu đơn</button
							>
							<button
								type="button"
								class:selected={theme.backgroundType === 'gradient'}
								aria-pressed={theme.backgroundType === 'gradient'}
								onclick={() => setBackgroundType('gradient')}>Chuyển màu</button
							>
							<button
								type="button"
								class:selected={theme.backgroundType === 'image'}
								aria-pressed={theme.backgroundType === 'image'}
								onclick={() => setBackgroundType('image')}>Ảnh nền</button
							>
						</div>

						{#if theme.backgroundType === 'color'}
							<div class="background-controls">
								<div class="palette" aria-label="Bảng màu nền">
									{#each palette as color (color)}
										<button
											type="button"
											class="swatch"
											class:selected={theme.backgroundValue.toLowerCase() === color.toLowerCase()}
											style={`background: ${color}`}
											aria-label={`Chọn màu nền ${color}`}
											aria-pressed={theme.backgroundValue.toLowerCase() === color.toLowerCase()}
											onclick={() => applySolidColor(color)}
										></button>
									{/each}
								</div>
								<label class="visual-color-field">
									<span>Màu tuỳ chọn</span>
									<input
										type="color"
										value={solidBackground}
										oninput={(event) => applySolidColor(event.currentTarget.value)}
									/>
								</label>
							</div>
						{:else if theme.backgroundType === 'gradient'}
							<div class="gradient-controls">
								<div class="gradient-colors">
									<label class="visual-color-field">
										<span>Màu 1</span>
										<input
											type="color"
											value={gradientColor1}
											oninput={(event) => {
												gradientColor1 = event.currentTarget.value;
												applyGradient();
											}}
										/>
									</label>
									<label class="visual-color-field">
										<span>Màu 2</span>
										<input
											type="color"
											value={gradientColor2}
											oninput={(event) => {
												gradientColor2 = event.currentTarget.value;
												applyGradient();
											}}
										/>
									</label>
								</div>
								<div class="direction-row">
									<span>Hướng chuyển màu</span>
									<div role="group" aria-label="Hướng chuyển màu">
										{#each gradientDirections as direction (direction.value)}
											<button
												type="button"
												class:selected={gradientDirection === direction.value}
												aria-label={direction.name}
												aria-pressed={gradientDirection === direction.value}
												title={direction.name}
												onclick={() => selectGradientDirection(direction.value)}
												>{#if direction.value === '180deg'}<span
														class="icon-[mdi--arrow-down]"
														aria-hidden="true"
													></span>{:else if direction.value === '135deg'}<span
														class="icon-[mdi--arrow-bottom-right]"
														aria-hidden="true"
													></span>{:else}<span class="icon-[mdi--arrow-right]" aria-hidden="true"
													></span>{/if}</button
											>
										{/each}
									</div>
								</div>
							</div>
						{:else}
							<div class="image-background-control">
								{#if backgroundImageUrl}
									<img src={backgroundImageUrl} alt="Ảnh nền hiện tại" />
								{:else}
									<div class="image-placeholder" aria-hidden="true">
										<span class="icon-[mdi--image-outline]"></span>
									</div>
								{/if}
								<div>
									<strong>{backgroundImageUrl ? 'Ảnh nền hiện tại' : 'Chưa có ảnh nền'}</strong>
									<p>JPG, PNG, WEBP hoặc GIF · tối đa 8 MB.</p>
									<input
										class="hidden-file-input"
										bind:this={backgroundFileInput}
										type="file"
										accept="image/jpeg,image/png,image/webp,image/gif"
										onchange={handleBackgroundFileChange}
									/>
									<button
										type="button"
										class="image-upload-button"
										disabled={uploadingKind !== null}
										aria-busy={uploadingKind === 'background'}
										onclick={() => backgroundFileInput?.click()}
										><span
											class={uploadingKind === 'background'
												? 'icon-[mdi--loading]'
												: backgroundImageUrl
													? 'icon-[mdi--image-edit-outline]'
													: 'icon-[mdi--cloud-upload-outline]'}
											aria-hidden="true"
										></span>{uploadingKind === 'background'
											? 'Đang tải…'
											: backgroundImageUrl
												? 'Đổi ảnh'
												: 'Chọn ảnh'}</button
									>
								</div>
							</div>
							{#if imageUploadError}<p class="upload-message error-text">{imageUploadError}</p>{/if}
							{#if imageUploadMessage}<p class="upload-message success-text">
									{imageUploadMessage}
								</p>{/if}
							<div class="background-composition-control">
								<div>
									<strong>Điểm lấy nét</strong>
									<p>Kéo điểm tròn đến phần ảnh cần luôn được ưu tiên khi ảnh bị cắt.</p>
								</div>
								<div
									class:adjusting={adjustingFocalPoint}
									class="focal-preview"
									style={focalPreviewStyle()}
									role="application"
									aria-label="Khung chọn điểm lấy nét ảnh nền"
									onpointerdown={startFocalPointAdjustment}
									onpointermove={moveFocalPoint}
									onpointerup={stopFocalPointAdjustment}
									onpointercancel={stopFocalPointAdjustment}
								>
									<span class="focal-preview-overlay" aria-hidden="true"></span>
									<button
										class="focal-point"
										type="button"
										style={`left:${theme.backgroundFocalX}%;top:${theme.backgroundFocalY}%;`}
										aria-label={`Điểm lấy nét: ngang ${theme.backgroundFocalX}%, dọc ${theme.backgroundFocalY}%. Dùng phím mũi tên để điều chỉnh.`}
										onkeydown={moveFocalPointWithKeyboard}
									></button>
								</div>
								<div class="focal-sliders">
									<label
										>Ngang <input
											type="range"
											min="0"
											max="100"
											bind:value={theme.backgroundFocalX}
										/></label
									>
									<label
										>Dọc <input
											type="range"
											min="0"
											max="100"
											bind:value={theme.backgroundFocalY}
										/></label
									>
									<button
										type="button"
										onclick={() => {
											theme.backgroundFocalX = 50;
											theme.backgroundFocalY = 50;
										}}>Đặt giữa</button
									>
								</div>
							</div>

							<div class="background-overlay-control">
								<div>
									<strong>Lớp phủ tăng tương phản</strong>
									<p>Giúp chữ và nút dễ đọc hơn trên ảnh nền nhiều chi tiết.</p>
								</div>
								<label class="visual-color-field">
									<span>Màu phủ</span>
									<input type="color" bind:value={theme.backgroundOverlayColor} />
								</label>
								<label class="overlay-opacity">
									<span>Độ đậm <output>{theme.backgroundOverlayOpacity}%</output></span>
									<input
										type="range"
										min="0"
										max="80"
										bind:value={theme.backgroundOverlayOpacity}
									/>
								</label>
							</div>
						{/if}
					</section>

					<section class="appearance-section">
						<div class="section-heading">
							<h3>Màu sắc</h3>
							<p>Chọn màu cho các thành phần chính trên trang.</p>
						</div>
						<div class="color-choice-grid">
							<label class="color-choice">
								<span>Màu nút</span>
								<input type="color" bind:value={theme.buttonColor} />
							</label>
							<label class="color-choice">
								<span>Chữ trên nút</span>
								<input type="color" bind:value={theme.buttonTextColor} />
							</label>
							<label class="color-choice">
								<span>Chữ chính</span>
								<input type="color" bind:value={theme.textColor} />
							</label>
						</div>
					</section>

					<section class="appearance-section">
						<div class="section-heading">
							<h3>Kiểu nút</h3>
							<p>Chọn độ bo góc phù hợp với phong cách trang.</p>
						</div>
						<div class="radius-grid">
							{#each radiusOptions as option (option.value)}
								<button
									type="button"
									class="radius-option"
									class:selected={theme.buttonRadius === option.value}
									aria-pressed={theme.buttonRadius === option.value}
									onclick={() => (theme.buttonRadius = option.value)}
								>
									<span class="radius-sample" style={`border-radius: ${option.value}px`}></span>
									<strong>{option.label}</strong>
								</button>
							{/each}
						</div>
						<div class="block-padding-control">
							<strong>Khoảng đệm block</strong>
							<p>Điều chỉnh không gian bên trong các block liên kết.</p>
							<label>
								<span>Ngang <output>{theme.buttonPaddingX}px</output></span>
								<input type="range" min="8" max="48" bind:value={theme.buttonPaddingX} />
							</label>
							<label>
								<span>Dọc <output>{theme.buttonPaddingY}px</output></span>
								<input type="range" min="4" max="36" bind:value={theme.buttonPaddingY} />
							</label>
							<label>
								<span
									>Chiều cao tối thiểu <output>{theme.buttonMinHeight || 'Tự động'}</output></span
								>
								<input type="range" min="0" max="180" step="4" bind:value={theme.buttonMinHeight} />
							</label>
							<label>
								<span>Cỡ chữ <output>{theme.buttonFontSize}px</output></span>
								<input type="range" min="12" max="32" bind:value={theme.buttonFontSize} />
							</label>
						</div>
					</section>

					<section class="appearance-section">
						<div class="section-heading">
							<h3>Kiểu chữ</h3>
							<p>Chọn cảm giác chữ phù hợp với nội dung của trang.</p>
						</div>
						<div class="font-grid">
							{#each fontOptions as font (font.value)}
								<button
									type="button"
									class="font-option"
									class:selected={theme.fontFamily === font.value}
									aria-pressed={theme.fontFamily === font.value}
									onclick={() => (theme.fontFamily = font.value)}
								>
									<span class="font-sample" style={`font-family: ${font.value}`}>Aa</span>
									<span>
										<strong>{font.label}</strong>
										<small>{font.sample}</small>
									</span>
								</button>
							{/each}
						</div>
					</section>

					<details class="advanced-settings">
						<summary>Tuỳ chỉnh nâng cao</summary>
						<p>Dành cho trường hợp cần nhập chính xác mã màu hoặc CSS.</p>
						<div class="field-grid two advanced-grid">
							<label>Giá trị nền <input bind:value={theme.backgroundValue} /></label>
							<label>Font family <input bind:value={theme.fontFamily} /></label>
							<label>Màu nút <input bind:value={theme.buttonColor} /></label>
							<label>Màu chữ nút <input bind:value={theme.buttonTextColor} /></label>
							<label>Màu chữ chính <input bind:value={theme.textColor} /></label>
							<label
								>Bo góc (px)
								<input type="number" min="0" max="999" bind:value={theme.buttonRadius} />
							</label>
						</div>
					</details>
				</form>

				{#if !page.isHome}
					<form
						method="POST"
						action="?/setHome"
						class="panel-card set-home"
						use:enhance={enhanceMutation}
					>
						<div>
							<h2>Đặt làm trang chính</h2>
							<p>
								Trang này sẽ hiển thị tại <strong>ttpq.hatbuinho.me</strong> và được xuất bản tự động.
							</p>
						</div>
						<button>Đặt làm trang chính</button>
					</form>
				{/if}
			{/if}
		</section>

		<aside class="preview-panel">
			<div class="preview-label">
				<span>PREVIEW</span><a href={publicUrl} target="_blank" rel="noreferrer"
					>Mở trang <span class="icon-[mdi--open-in-new]" aria-hidden="true"></span></a
				>
			</div>
			<div class="phone-frame">
				<div class="phone-notch"></div>
				<div class="phone-screen">
					<PublicPage
						data={previewData}
						compact
						onBlockSelect={focusBlockFromPreview}
						onPageSelect={focusPageSettingsFromPreview}
					/>
				</div>
			</div>
		</aside>
	</div>
</main>

<style>
	.editor-shell {
		max-width: 1480px;
		margin: 0 auto;
		padding: 28px 28px 70px;
	}

	.editor-header {
		display: flex;
		justify-content: space-between;
		gap: 24px;
		align-items: end;
		margin-bottom: 24px;
	}

	.back {
		font-size: 0.84rem;
		font-weight: 700;
		color: #64748b;
		text-decoration: none;
	}

	.back .icon-\[mdi--arrow-left\],
	.home-badge .icon-\[mdi--star\],
	.public-url .icon-\[mdi--open-in-new\],
	.preview-label .icon-\[mdi--open-in-new\] {
		vertical-align: -0.14em;
	}

	.title-row {
		display: flex;
		align-items: center;
		gap: 9px;
		flex-wrap: wrap;
		margin-top: 8px;
	}

	h1 {
		margin: 0;
		font-size: 1.8rem;
	}

	.status,
	.home-badge {
		font-size: 0.7rem;
		font-weight: 800;
		padding: 4px 8px;
		border-radius: 999px;
		background: #f1f5f9;
		color: #64748b;
	}

	.status.published {
		background: #ecfdf5;
		color: #047857;
	}

	.home-badge {
		background: #eff6ff;
		color: #1d4ed8;
	}

	.public-url {
		display: inline-block;
		margin-top: 7px;
		color: #2563eb;
		font-size: 0.82rem;
		text-decoration: none;
	}

	.header-metric {
		display: grid;
		text-align: right;
	}

	.header-metric strong {
		font-size: 1.8rem;
	}

	.header-metric span {
		color: #64748b;
		font-size: 0.78rem;
	}

	.editor-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 400px;
		gap: 28px;
		align-items: start;
	}

	.tabs {
		display: flex;
		gap: 4px;
		background: #e2e8f0;
		width: fit-content;
		padding: 4px;
		border-radius: 12px;
		margin-bottom: 16px;
	}

	.tabs button {
		border: 0;
		background: transparent;
		padding: 9px 16px;
		border-radius: 9px;
		font-weight: 750;
		color: #64748b;
		cursor: pointer;
	}

	.tabs button.active {
		background: white;
		color: #0f172a;
		box-shadow: 0 2px 8px rgb(15 23 42 / 0.08);
	}

	.panel-card {
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 18px;
		padding: 20px;
		margin-bottom: 16px;
		box-shadow: 0 5px 18px rgb(15 23 42 / 0.035);
	}

	.card-heading {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		align-items: start;
		margin-bottom: 18px;
	}

	h2 {
		font-size: 1rem;
		margin: 0;
	}

	.card-heading p,
	.set-home p {
		color: #64748b;
		font-size: 0.8rem;
		margin: 4px 0 0;
	}

	label {
		display: grid;
		gap: 6px;
		font-size: 0.78rem;
		font-weight: 700;
		color: #475569;
		margin-top: 12px;
	}

	input,
	textarea,
	select {
		width: 100%;
		border: 1px solid #cbd5e1;
		border-radius: 10px;
		padding: 9px 11px;
		background: white;
		color: #0f172a;
		font: inherit;
	}

	textarea {
		resize: vertical;
	}

	.field-grid {
		display: grid;
		gap: 12px;
	}

	.field-grid.two {
		grid-template-columns: 1fr 1fr;
	}

	button {
		border: 1px solid #cbd5e1;
		border-radius: 10px;
		padding: 9px 13px;
		background: white;
		font-weight: 700;
		color: #334155;
		cursor: pointer;
	}

	button.primary,
	button.save {
		background: #1d4ed8;
		border-color: #1d4ed8;
		color: white;
	}

	.logo-thumb {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		object-fit: cover;
	}

	.upload-row {
		display: flex;
		gap: 10px;
		align-items: center;
	}

	.upload-message {
		margin: 9px 0 0;
		font-size: 0.78rem;
		font-weight: 650;
	}

	.link-preview-tools {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: -4px;
	}

	.link-preview-tools button {
		padding: 6px 9px;
		font-size: 0.72rem;
	}

	.link-preview-tools small {
		font-size: 0.7rem;
		color: #64748b;
	}

	.youtube-preview-tools {
		display: grid;
		grid-template-columns: 46px minmax(0, 1fr) auto;
		gap: 10px;
		align-items: center;
		margin-top: 10px;
		padding: 10px;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		background: #fff;
	}

	.youtube-preview-tools > :global(img),
	.youtube-preview-tools > span {
		width: 46px;
		height: 46px;
		border-radius: 50%;
		object-fit: cover;
		background: #fef2f2;
	}

	.youtube-preview-tools > span {
		display: grid;
		place-items: center;
		color: #ef4444;
		font-size: 1.55rem;
	}

	.youtube-preview-tools strong,
	.youtube-preview-tools small {
		display: block;
	}

	.youtube-preview-tools strong {
		font-size: 0.75rem;
		color: #334155;
	}

	.youtube-preview-tools small {
		margin-top: 3px;
		font-size: 0.68rem;
		color: #64748b;
	}

	.youtube-preview-tools button {
		padding: 7px 9px;
		font-size: 0.7rem;
		white-space: nowrap;
	}

	.block-image-control {
		display: block;
		margin-top: 12px;
		padding: 10px;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		background: white;
	}

	.block-image-control .image-display-field {
		margin: 7px 0 0;
		font-size: 0.7rem;
	}

	.block-image-control .image-display-field select {
		padding: 5px 7px;
		font-size: 0.72rem;
	}

	.error-text {
		color: #b91c1c;
	}

	.success-text {
		color: #047857;
	}

	.block-list {
		display: grid;
		gap: 10px;
	}

	.block-editor {
		display: grid;
		grid-template-columns: 24px 1fr 30px;
		gap: 10px;
		align-items: start;
		padding: 14px;
		border: 1px solid #e2e8f0;
		border-radius: 14px;
		background: #f8fafc;
		transition:
			opacity 120ms ease,
			border-color 120ms ease;
	}

	.block-editor.dragging {
		opacity: 0.45;
		border-color: #3b82f6;
	}

	.block-drop-placeholder {
		display: grid;
		min-height: 72px;
		place-items: center;
		border: 2px dashed #8b5cf6;
		border-radius: 14px;
		background: rgb(139 92 246 / 0.07);
		color: #6d28d9;
		font-size: 0.78rem;
		font-weight: 750;
		pointer-events: auto;
	}

	.block-editor.preview-selected {
		border-color: #2563eb;
		box-shadow: 0 0 0 3px rgb(37 99 235 / 0.14);
	}

	.drag-handle {
		padding-top: 6px;
		color: #94a3b8;
		font-size: 1.3rem;
		cursor: grab;
		user-select: none;
	}

	.block-form {
		min-width: 0;
	}

	.block-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.block-type {
		font-size: 0.66rem;
		font-weight: 850;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #2563eb;
	}

	.clicks {
		font-size: 0.7rem;
		color: #64748b;
	}

	.check {
		display: flex;
		align-items: center;
		gap: 7px;
		font-size: 0.78rem;
		font-weight: 650;
	}

	.check input {
		width: auto;
	}

	.visually-hidden {
		display: none;
	}

	.block-actions {
		display: flex;
		align-items: end;
		justify-content: space-between;
		gap: 12px;
		margin-top: 12px;
	}

	.icon-danger {
		display: grid;
		place-items: center;
		width: 30px;
		height: 30px;
		padding: 0;
		font-size: 1.25rem;
		line-height: 1.2;
		border: 0;
		background: transparent;
		color: #dc2626;
	}

	.add-block {
		display: flex;
		gap: 8px;
		margin-top: 14px;
	}

	.reorder-status {
		color: #2563eb;
		font-weight: 700;
	}

	.reorder-status.loading::before {
		display: inline-block;
		width: 10px;
		height: 10px;
		margin-right: 5px;
		border: 2px solid rgb(37 99 235 / 0.25);
		border-top-color: #2563eb;
		border-radius: 50%;
		vertical-align: -1px;
		content: '';
		animation: editor-spinner 0.65s linear infinite;
	}

	.appearance-card {
		padding-top: 0;
	}

	.appearance-card > .card-heading {
		margin: 0 -20px;
		padding: 20px;
		border-bottom: 1px solid #e2e8f0;
		align-items: center;
	}

	.appearance-section {
		padding: 22px 0;
		border-top: 1px solid #e2e8f0;
	}

	.appearance-section.first-section {
		border-top: 0;
	}

	.section-heading {
		margin-bottom: 14px;
	}

	.section-heading h3 {
		margin: 0;
		font-size: 0.92rem;
		color: #0f172a;
	}

	.section-heading p {
		margin: 4px 0 0;
		font-size: 0.76rem;
		color: #64748b;
	}

	.preset-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 10px;
	}

	.preset-card {
		display: grid;
		gap: 4px;
		padding: 9px;
		text-align: left;
		border: 1px solid #dbe3ee;
		background: #fff;
		transition:
			border-color 120ms ease,
			box-shadow 120ms ease,
			transform 120ms ease;
	}

	.preset-card:hover {
		transform: translateY(-1px);
		border-color: #94a3b8;
	}

	.preset-card.selected,
	.radius-option.selected,
	.font-option.selected {
		border-color: #2563eb;
		box-shadow: 0 0 0 2px rgb(37 99 235 / 0.12);
	}

	.preset-preview {
		display: grid;
		align-content: center;
		gap: 6px;
		height: 66px;
		padding: 0 12px;
		border: 1px solid rgb(148 163 184 / 0.22);
		border-radius: 9px;
	}

	.preset-preview span {
		display: block;
		height: 9px;
		border-radius: 999px;
		opacity: 0.92;
	}

	.preset-card strong {
		margin-top: 3px;
		font-size: 0.78rem;
		color: #0f172a;
	}

	.preset-card small {
		font-size: 0.66rem;
		font-weight: 550;
		color: #64748b;
	}

	.background-tabs {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 4px;
		padding: 4px;
		border-radius: 12px;
		background: #f1f5f9;
	}

	.background-tabs button {
		border: 0;
		background: transparent;
		color: #64748b;
	}

	.background-tabs button.selected {
		background: #fff;
		color: #1d4ed8;
		box-shadow: 0 2px 8px rgb(15 23 42 / 0.08);
	}

	.background-controls,
	.gradient-controls,
	.image-background-control {
		margin-top: 12px;
		padding: 14px;
		border: 1px solid #e2e8f0;
		border-radius: 14px;
		background: #f8fafc;
	}

	.background-controls {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
	}

	.palette {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}

	.swatch {
		width: 38px;
		height: 38px;
		padding: 0;
		border: 1px solid #cbd5e1;
		border-radius: 50%;
		box-shadow: inset 0 0 0 2px rgb(255 255 255 / 0.65);
	}

	.swatch.selected {
		border-color: #2563eb;
		box-shadow:
			inset 0 0 0 2px white,
			0 0 0 2px #2563eb;
	}

	.visual-color-field {
		display: flex;
		align-items: center;
		gap: 9px;
		margin: 0;
		white-space: nowrap;
	}

	.visual-color-field input[type='color'],
	.color-choice input[type='color'] {
		width: 46px;
		height: 40px;
		padding: 3px;
		border-radius: 10px;
		cursor: pointer;
	}

	.gradient-controls {
		display: grid;
		gap: 14px;
	}

	.gradient-colors {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 10px;
	}

	.gradient-colors .visual-color-field {
		justify-content: space-between;
		padding: 9px 11px;
		border: 1px solid #e2e8f0;
		border-radius: 11px;
		background: white;
	}

	.direction-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 14px;
		font-size: 0.76rem;
		font-weight: 700;
		color: #475569;
	}

	.direction-row > div {
		display: flex;
		gap: 6px;
	}

	.direction-row button {
		width: 42px;
		height: 38px;
		padding: 0;
		font-size: 1.05rem;
	}

	.direction-row button.selected {
		border-color: #2563eb;
		background: #eff6ff;
		color: #1d4ed8;
	}

	.image-background-control {
		display: grid;
		grid-template-columns: 132px 1fr;
		gap: 14px;
		align-items: center;
	}

	.image-background-control img,
	.image-placeholder {
		width: 132px;
		height: 88px;
		border-radius: 11px;
		object-fit: cover;
		border: 1px solid #dbe3ee;
		background: white;
	}

	.image-placeholder {
		display: grid;
		place-items: center;
		font-size: 2rem;
		color: #94a3b8;
	}

	.image-background-control strong {
		display: block;
		font-size: 0.8rem;
		color: #334155;
	}

	.image-background-control p {
		margin: 4px 0 9px;
		font-size: 0.72rem;
		color: #64748b;
	}

	.hidden-file-input {
		display: none;
	}

	.image-upload-button:disabled {
		cursor: wait;
		opacity: 0.6;
	}

	.image-upload-button {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		border-color: #ddd6fe;
		background: linear-gradient(135deg, #faf5ff, #f5f3ff);
		color: #6d28d9;
		box-shadow: 0 5px 14px rgb(109 40 217 / 0.08);
	}

	.image-upload-button:hover:not(:disabled) {
		border-color: #a78bfa;
		background: #ede9fe;
		transform: translateY(-1px);
	}

	.image-upload-button .icon-\[mdi--loading\] {
		animation: editor-spinner 0.7s linear infinite;
	}

	.background-composition-control,
	.background-overlay-control {
		margin-top: 12px;
		padding: 14px;
		border: 1px solid #e2e8f0;
		border-radius: 14px;
		background: #f8fafc;
	}

	.background-composition-control > div:first-child strong,
	.background-overlay-control strong {
		display: block;
		font-size: 0.76rem;
		color: #475569;
	}

	.background-composition-control p,
	.background-overlay-control p {
		margin: 3px 0 10px;
		font-size: 0.72rem;
		color: #64748b;
	}

	.focal-preview {
		position: relative;
		height: 218px;
		margin-top: 8px;
		overflow: hidden;
		border: 1px solid #dbe3ee;
		border-radius: 12px;
		background-image: var(--focal-image);
		background-position: var(--focal-position);
		background-size: cover;
		cursor: crosshair;
		touch-action: none;
	}

	.focal-preview.adjusting {
		cursor: grabbing;
	}

	.focal-preview-overlay {
		position: absolute;
		inset: 0;
		background: var(--focal-overlay);
		pointer-events: none;
	}

	.focal-point {
		position: absolute;
		z-index: 1;
		width: 28px;
		height: 28px;
		padding: 0;
		transform: translate(-50%, -50%);
		border: 3px solid white;
		border-radius: 50%;
		background: #2563eb;
		box-shadow: 0 0 0 2px rgb(15 23 42 / 0.38);
		cursor: grab;
	}

	.focal-point:focus-visible {
		outline: 3px solid #fbbf24;
		outline-offset: 3px;
	}

	.focal-sliders {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr)) auto;
		gap: 10px;
		align-items: end;
		margin-top: 10px;
	}

	.focal-sliders label,
	.overlay-opacity {
		margin: 0;
		font-size: 0.72rem;
		font-weight: 700;
		color: #475569;
	}

	.focal-sliders input,
	.overlay-opacity input {
		width: 100%;
		margin-top: 5px;
	}

	.focal-sliders button {
		padding: 7px 9px;
		font-size: 0.72rem;
		white-space: nowrap;
	}

	.background-overlay-control {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 12px 16px;
		align-items: center;
	}

	.background-overlay-control .visual-color-field {
		justify-self: end;
	}

	.overlay-opacity {
		grid-column: 1 / -1;
	}

	.overlay-opacity span {
		display: flex;
		justify-content: space-between;
	}

	.overlay-opacity output {
		font-variant-numeric: tabular-nums;
		color: #1d4ed8;
	}

	.color-choice-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 9px;
	}

	.color-choice {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		margin: 0;
		padding: 10px 11px;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		background: #f8fafc;
	}

	.radius-grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 8px;
	}

	.radius-option {
		display: grid;
		gap: 8px;
		justify-items: center;
		padding: 12px 8px;
		font-size: 0.72rem;
		background: #fff;
	}

	.radius-sample {
		display: block;
		width: 56px;
		height: 24px;
		background: #bfdbfe;
		border: 1px solid #60a5fa;
	}

	.block-padding-control {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 10px 14px;
		margin-top: 12px;
		padding: 12px 14px;
		border: 1px solid #e2e8f0;
		border-radius: 14px;
		background: #f8fafc;
	}

	.block-padding-control > strong,
	.block-padding-control > p {
		grid-column: 1 / -1;
	}

	.block-padding-control > strong {
		font-size: 0.76rem;
		color: #475569;
	}

	.block-padding-control > p {
		margin: -6px 0 0;
		font-size: 0.72rem;
		color: #64748b;
	}

	.block-padding-control label {
		margin: 0;
		font-size: 0.72rem;
		font-weight: 700;
		color: #475569;
	}

	.block-padding-control label > span {
		display: flex;
		justify-content: space-between;
	}

	.block-padding-control input {
		width: 100%;
		margin-top: 5px;
	}

	.block-padding-control output {
		font-variant-numeric: tabular-nums;
		color: #1d4ed8;
	}

	.font-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 9px;
	}

	.font-option {
		display: grid;
		grid-template-columns: 44px 1fr;
		gap: 10px;
		align-items: center;
		padding: 10px;
		text-align: left;
		background: #fff;
	}

	.font-sample {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		border-radius: 10px;
		background: #f1f5f9;
		font-size: 1.15rem;
		color: #0f172a;
	}

	.font-option strong,
	.font-option small {
		display: block;
	}

	.font-option strong {
		font-size: 0.78rem;
		color: #0f172a;
	}

	.font-option small {
		margin-top: 2px;
		font-size: 0.66rem;
		font-weight: 550;
		color: #64748b;
	}

	.advanced-settings {
		margin-top: 4px;
		padding: 13px 14px;
		border: 1px dashed #cbd5e1;
		border-radius: 12px;
		background: #f8fafc;
	}

	.advanced-settings summary {
		cursor: pointer;
		font-size: 0.78rem;
		font-weight: 750;
		color: #475569;
	}

	.advanced-settings > p {
		margin: 7px 0 0;
		font-size: 0.72rem;
		color: #64748b;
	}

	.advanced-grid {
		margin-top: 5px;
	}

	.set-home {
		display: flex;
		justify-content: space-between;
		gap: 18px;
		align-items: center;
	}

	.preview-panel {
		position: sticky;
		top: 20px;
	}

	.preview-label {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin: 0 10px 10px;
		font-size: 0.7rem;
		font-weight: 850;
		letter-spacing: 0.1em;
		color: #64748b;
	}

	.preview-label a {
		font-size: 0.72rem;
		letter-spacing: 0;
		color: #2563eb;
		text-decoration: none;
	}

	.phone-frame {
		position: relative;
		width: min(100%, 380px);
		margin: 0 auto;
		background: #0f172a;
		padding: 10px;
		border-radius: 42px;
		box-shadow: 0 24px 60px rgb(15 23 42 / 0.18);
	}

	.phone-screen {
		height: 720px;
		overflow: auto;
		border-radius: 33px;
		background: white;
	}

	.phone-notch {
		position: absolute;
		z-index: 2;
		width: 110px;
		height: 22px;
		border-radius: 0 0 15px 15px;
		background: #0f172a;
		left: 50%;
		transform: translateX(-50%);
	}

	.alert {
		padding: 11px 14px;
		border-radius: 11px;
		margin-bottom: 14px;
		font-size: 0.86rem;
	}

	.alert.error {
		background: #fef2f2;
		color: #b91c1c;
	}

	.alert.success {
		background: #ecfdf5;
		color: #047857;
	}

	/* Linktree-inspired editing surface: actions first, details on demand. */
	.editor-shell {
		max-width: 1540px;
		padding: 24px 32px 72px;
	}

	.editor-header {
		margin-bottom: 18px;
	}

	.editor-grid {
		grid-template-columns: minmax(520px, 760px) minmax(330px, 410px);
		justify-content: space-between;
		gap: clamp(28px, 4vw, 64px);
	}

	.editor-panel {
		min-width: 0;
	}

	.tabs {
		width: 100%;
		margin-bottom: 14px;
		padding: 5px;
		background: #e9eef5;
	}

	.tabs button {
		flex: 1;
		padding: 10px 16px;
	}

	.tabs button.active {
		color: #4c1d95;
	}

	.content-toolbar {
		padding: 24px;
		margin-bottom: 14px;
		border: 1px solid #e3e8f0;
		border-radius: 22px;
		background: radial-gradient(circle at 92% 8%, rgb(139 92 246 / 0.12), transparent 30%), white;
		box-shadow: 0 12px 34px rgb(15 23 42 / 0.055);
	}

	.content-toolbar h2 {
		margin-top: 5px;
		font-size: 1.15rem;
	}

	.content-toolbar > div:first-child p,
	.blocks-heading p {
		margin: 5px 0 0;
		font-size: 0.78rem;
		color: #64748b;
	}

	.section-kicker {
		font-size: 0.64rem;
		font-weight: 850;
		letter-spacing: 0.14em;
		color: #7c3aed;
	}

	.quick-add-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 10px;
		margin-top: 18px;
	}

	.quick-add-grid form:first-child,
	.quick-add-grid .quick-add {
		width: 100%;
	}

	.quick-add {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		min-height: 48px;
		border-radius: 14px;
		font-size: 0.88rem;
	}

	.primary-add {
		border-color: #6d28d9;
		background: linear-gradient(135deg, #6d28d9, #4f46e5);
		color: white;
		box-shadow: 0 8px 18px rgb(91 33 182 / 0.2);
	}

	.primary-add:hover {
		background: linear-gradient(135deg, #5b21b6, #4338ca);
	}

	.secondary-add {
		padding-inline: 18px;
		border-color: #ddd6fe;
		background: #f5f3ff;
		color: #5b21b6;
	}

	.more-add {
		display: grid;
		grid-template-columns: auto minmax(150px, 1fr) auto;
		gap: 8px;
		align-items: center;
		margin-top: 10px;
	}

	.more-add label {
		margin: 0 4px 0 0;
		font-size: 0.72rem;
		color: #64748b;
	}

	.more-add select,
	.more-add button {
		min-height: 38px;
		padding-block: 7px;
		font-size: 0.75rem;
	}

	.page-settings {
		padding: 0;
		margin-bottom: 18px;
		overflow: hidden;
		border-radius: 16px;
		box-shadow: none;
		transition:
			border-color 120ms ease,
			box-shadow 120ms ease;
	}

	.page-settings.preview-selected {
		border-color: #7c3aed;
		box-shadow: 0 0 0 3px rgb(124 58 237 / 0.13);
	}

	.page-settings summary {
		display: grid;
		grid-template-columns: 38px 1fr 24px;
		gap: 11px;
		align-items: center;
		padding: 14px 16px;
		cursor: pointer;
		list-style: none;
	}

	.page-settings summary::-webkit-details-marker {
		display: none;
	}

	.settings-summary-icon {
		display: grid;
		place-items: center;
		width: 38px;
		height: 38px;
		border-radius: 11px;
		background: #eef2ff;
		color: #4f46e5;
		font-size: 1.25rem;
	}

	.page-settings summary strong,
	.page-settings summary small {
		display: block;
	}

	.page-settings summary strong {
		font-size: 0.82rem;
		color: #1e293b;
	}

	.page-settings summary small {
		margin-top: 2px;
		font-size: 0.69rem;
		color: #64748b;
	}

	.page-settings .chevron {
		color: #94a3b8;
		transition: transform 160ms ease;
	}

	.page-settings[open] .chevron {
		transform: rotate(180deg);
	}

	.page-settings-body {
		padding: 2px 18px 18px;
		border-top: 1px solid #eef2f7;
	}

	.page-settings-actions {
		display: flex;
		align-items: end;
		justify-content: space-between;
		gap: 14px;
	}

	.page-settings-actions label {
		flex: 1;
		max-width: 260px;
	}

	.logo-placeholder {
		display: grid;
		place-items: center;
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background: #f1f5f9;
		color: #94a3b8;
		font-size: 1.25rem;
	}

	.blocks-workspace {
		padding-top: 3px;
	}

	.blocks-heading {
		display: flex;
		align-items: end;
		justify-content: space-between;
		gap: 12px;
		padding: 0 4px;
		margin-bottom: 10px;
	}

	.blocks-heading h2 {
		font-size: 0.95rem;
	}

	.block-list {
		gap: 12px;
	}

	.block-editor {
		grid-template-columns: 22px minmax(0, 1fr) 30px;
		gap: 9px;
		padding: 10px 10px 10px 8px;
		border-color: #e1e7ef;
		border-radius: 17px;
		background: white;
		box-shadow: 0 7px 20px rgb(15 23 42 / 0.045);
		transition:
			opacity 120ms ease,
			border-color 120ms ease,
			box-shadow 120ms ease,
			transform 120ms ease;
	}

	.block-editor:hover {
		border-color: #c4b5fd;
		box-shadow: 0 10px 28px rgb(76 29 149 / 0.08);
	}

	.block-editor.preview-selected {
		border-color: #7c3aed;
		box-shadow: 0 0 0 3px rgb(124 58 237 / 0.13);
	}

	.drag-handle {
		align-self: center;
		padding-top: 0;
		color: #a1aab8;
	}

	.block-summary {
		display: flex;
		align-items: center;
		gap: 10px;
		min-height: 58px;
	}

	.block-summary-button {
		display: grid;
		grid-template-columns: 40px minmax(0, 1fr) auto 18px;
		gap: 10px;
		align-items: center;
		flex: 1;
		min-width: 0;
		padding: 3px;
		border: 0;
		background: transparent;
		text-align: left;
	}

	.block-kind-icon {
		display: grid;
		place-items: center;
		width: 40px;
		height: 40px;
		border-radius: 12px;
		background: #f3f0ff;
		color: #6d28d9;
		font-size: 1.15rem;
	}

	.block-summary-copy {
		min-width: 0;
	}

	.block-summary-copy strong,
	.block-summary-copy small {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.block-summary-copy strong {
		font-size: 0.84rem;
		color: #1e293b;
	}

	.block-summary-copy small {
		margin-top: 4px;
		font-size: 0.69rem;
		font-weight: 550;
		color: #748094;
	}

	.block-summary-meta {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 0.68rem;
		color: #7b8798;
	}

	.block-chevron {
		color: #94a3b8;
		transition: transform 160ms ease;
	}

	.block-chevron.expanded {
		transform: rotate(180deg);
	}

	.visibility-toggle {
		position: relative;
		display: inline-block;
		width: 38px;
		height: 22px;
		margin: 0;
		cursor: pointer;
	}

	.visibility-toggle input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}

	.visibility-toggle > span:first-of-type {
		display: block;
		width: 38px;
		height: 22px;
		border-radius: 999px;
		background: #cbd5e1;
		transition: background 150ms ease;
	}

	.visibility-toggle > span:first-of-type::after {
		content: '';
		position: absolute;
		top: 3px;
		left: 3px;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: white;
		box-shadow: 0 1px 3px rgb(15 23 42 / 0.25);
		transition: transform 150ms ease;
	}

	.visibility-toggle input:checked + span {
		background: #16a34a;
	}

	.visibility-toggle input:checked + span::after {
		transform: translateX(16px);
	}

	.visibility-toggle input:focus-visible + span {
		outline: 3px solid rgb(99 102 241 / 0.25);
		outline-offset: 2px;
	}

	.visibility-toggle.toggling > span:first-of-type {
		opacity: 0.45;
	}

	.visibility-toggle.toggling::after {
		position: absolute;
		top: 50%;
		left: 50%;
		width: 14px;
		height: 14px;
		margin: -7px 0 0 -7px;
		border: 2px solid rgb(100 116 139 / 0.3);
		border-top-color: #475569;
		border-radius: 50%;
		content: '';
		animation: editor-spinner 0.65s linear infinite;
	}

	@keyframes editor-spinner {
		to {
			transform: rotate(360deg);
		}
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.block-details {
		display: none;
		padding: 14px 3px 4px;
		border-top: 1px solid #edf0f5;
		animation: reveal-details 150ms ease-out;
	}

	.block-details.expanded {
		display: block;
	}

	@keyframes reveal-details {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.block-details-heading {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 4px;
		font-size: 0.67rem;
		font-weight: 850;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #6d28d9;
	}

	.block-details-heading small {
		font-weight: 650;
		letter-spacing: 0;
		text-transform: none;
		color: #94a3b8;
	}

	.block-actions {
		align-items: center;
		padding-top: 12px;
		border-top: 1px solid #eef2f7;
	}

	.block-actions > span {
		max-width: 300px;
		font-size: 0.67rem;
		color: #7b8798;
	}

	.block-actions .save {
		background: #5b21b6;
		border-color: #5b21b6;
	}

	.icon-danger {
		align-self: center;
		color: #94a3b8;
	}

	.icon-danger:hover {
		background: #fef2f2;
		color: #dc2626;
	}

	.empty-blocks {
		display: grid;
		justify-items: center;
		padding: 34px 20px;
		border: 1px dashed #cbd5e1;
		border-radius: 16px;
		background: rgb(255 255 255 / 0.55);
		text-align: center;
	}

	.empty-blocks > span {
		font-size: 1.8rem;
		color: #8b5cf6;
	}

	.empty-blocks strong {
		margin-top: 8px;
		font-size: 0.86rem;
	}

	.empty-blocks p {
		margin: 4px 0 0;
		font-size: 0.74rem;
		color: #64748b;
	}

	.preview-panel {
		top: 16px;
	}

	.phone-frame {
		box-shadow: 0 28px 70px rgb(15 23 42 / 0.2);
	}

	@media (max-width: 1120px) {
		.editor-grid {
			grid-template-columns: minmax(0, 1fr) 340px;
		}

		.phone-screen {
			height: 640px;
		}
	}

	@media (max-width: 920px) {
		.editor-grid {
			grid-template-columns: 1fr;
		}

		.preview-panel {
			position: static;
		}

		.phone-frame {
			width: 340px;
		}
	}

	@media (max-width: 620px) {
		.editor-shell {
			padding: 22px 14px 50px;
		}

		.content-toolbar {
			padding: 18px;
			border-radius: 18px;
		}

		.quick-add-grid {
			grid-template-columns: 1fr;
		}

		.more-add {
			grid-template-columns: 1fr auto;
		}

		.more-add label {
			grid-column: 1 / -1;
		}

		.page-settings-actions {
			align-items: stretch;
			flex-direction: column;
		}

		.page-settings-actions label {
			max-width: none;
		}

		.editor-header {
			align-items: start;
		}

		.header-metric {
			display: none;
		}

		.field-grid.two {
			grid-template-columns: 1fr;
		}

		.preset-grid,
		.color-choice-grid,
		.font-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.radius-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.background-tabs {
			grid-template-columns: 1fr;
		}

		.gradient-colors,
		.image-background-control {
			grid-template-columns: 1fr;
		}

		.image-background-control img,
		.image-placeholder {
			width: 100%;
			height: 140px;
		}

		.direction-row {
			align-items: flex-start;
			flex-direction: column;
		}

		.upload-row,
		.set-home {
			align-items: stretch;
			flex-direction: column;
		}

		.block-editor {
			grid-template-columns: 20px 1fr 24px;
			padding: 10px;
		}

		.block-summary-button {
			grid-template-columns: 36px minmax(0, 1fr) 16px;
			gap: 8px;
		}

		.block-kind-icon {
			width: 36px;
			height: 36px;
		}

		.block-summary-meta {
			display: none;
		}

		.block-actions {
			align-items: stretch;
			flex-direction: column;
		}

		.block-actions .save {
			width: 100%;
		}

		.youtube-preview-tools {
			grid-template-columns: 46px minmax(0, 1fr);
		}

		.youtube-preview-tools button {
			grid-column: 1 / -1;
		}

		.phone-frame {
			width: min(100%, 340px);
		}
	}
</style>
