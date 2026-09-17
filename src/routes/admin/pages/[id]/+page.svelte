<script lang="ts">
	import { resolve } from '$app/paths';
	import IconPicker from '$lib/components/IconPicker.svelte';
	import PublicPage from '$lib/components/PublicPage.svelte';
	import { uploadImage } from '$lib/uploads/client';

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
			buttonColor: '#93c5fd',
			buttonTextColor: '#172554',
			textColor: '#172554',
			buttonRadius: 999,
			fontFamily: 'system-ui',
			createdAt: new Date(),
			updatedAt: new Date()
		}
	);
	// svelte-ignore state_referenced_locally
	let blocks = $state(data.blocks.map((block) => ({ ...block })));
	let activeTab = $state<'content' | 'appearance'>('content');
	let draggedId = $state<string | null>(null);
	let reorderStatus = $state('');
	let uploadingKind = $state<'logo' | 'background' | null>(null);
	let imageUploadMessage = $state('');
	let imageUploadError = $state('');
	let solidBackground = $state('#ffffff');
	let gradientColor1 = $state('#eff6ff');
	let gradientColor2 = $state('#dcfce7');
	let gradientDirection = $state('135deg');
	let backgroundImageUrl = $state('');
	let backgroundFileInput = $state<HTMLInputElement>();

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

	async function dropOn(targetId: string) {
		if (!draggedId || draggedId === targetId) return;
		const sourceIndex = blocks.findIndex((block) => block.id === draggedId);
		const targetIndex = blocks.findIndex((block) => block.id === targetId);
		if (sourceIndex < 0 || targetIndex < 0) return;
		const reordered = [...blocks];
		const [item] = reordered.splice(sourceIndex, 1);
		reordered.splice(targetIndex, 0, item);
		blocks = reordered;
		draggedId = null;
		await persistOrder();
	}

	async function persistImage(
		kind: 'logo' | 'background',
		file: File,
		input?: HTMLInputElement | null
	) {
		uploadingKind = kind;
		imageUploadMessage = '';
		imageUploadError = '';

		try {
			const url = await uploadImage(page.id, kind, file);
			const payload = new FormData();
			payload.set('kind', kind);
			payload.set('url', url);
			const response = await fetch('?/upload', { method: 'POST', body: payload });
			if (!response.ok) throw new Error('Ảnh đã tải lên MinIO nhưng không thể lưu URL vào trang.');

			if (kind === 'logo') {
				page.logoUrl = url;
			} else {
				backgroundImageUrl = url;
				theme.backgroundType = 'image';
				theme.backgroundValue = url;
			}

			if (input) input.value = '';
			imageUploadMessage = kind === 'logo' ? 'Đã cập nhật logo.' : 'Đã cập nhật ảnh nền.';
		} catch (cause) {
			imageUploadError = cause instanceof Error ? cause.message : 'Không thể tải ảnh.';
		} finally {
			uploadingKind = null;
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
</script>

<svelte:head><title>{page.title} · TTPQ Admin</title></svelte:head>

<main class="editor-shell">
	<header class="editor-header">
		<div>
			<a class="back" href={resolve('/admin')}
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
				<form method="POST" action="?/updatePage" class="panel-card">
					<div class="card-heading">
						<div>
							<h2>Thông tin trang</h2>
							<p>Tên, địa chỉ và trạng thái xuất bản.</p>
						</div>
						<button class="primary">Lưu</button>
					</div>
					<div class="field-grid two">
						<label>Tên trang <input name="title" bind:value={page.title} required /></label>
						<label>Slug <input name="slug" bind:value={page.slug} /></label>
					</div>
					<label
						>Mô tả <textarea name="description" rows="2" bind:value={page.description}
						></textarea></label
					>
					<label
						>Trạng thái
						<select name="status" bind:value={page.status}
							><option value="draft">Bản nháp</option><option value="published">Đã xuất bản</option
							></select
						>
					</label>
				</form>

				<div class="panel-card">
					<div class="card-heading">
						<div>
							<h2>Logo</h2>
							<p>JPG, PNG, WEBP hoặc GIF · tối đa 8 MB.</p>
						</div>
						{#if page.logoUrl}<img class="logo-thumb" src={page.logoUrl} alt="Logo hiện tại" />{/if}
					</div>
					<form class="upload-row" onsubmit={(event) => handleImageUpload(event, 'logo')}>
						<input
							name="file"
							type="file"
							accept="image/jpeg,image/png,image/webp,image/gif"
							required
						/>
						<button disabled={uploadingKind !== null}
							>{uploadingKind === 'logo' ? 'Đang tải…' : 'Tải logo'}</button
						>
					</form>
					{#if imageUploadError}<p class="upload-message error-text">{imageUploadError}</p>{/if}
					{#if imageUploadMessage}<p class="upload-message success-text">
							{imageUploadMessage}
						</p>{/if}
				</div>

				<div class="panel-card blocks-card">
					<div class="card-heading">
						<div>
							<h2>Nội dung</h2>
							<p>Kéo thả để đổi thứ tự. Mỗi block có thể bật/tắt riêng.</p>
						</div>
						<small class="reorder-status">{reorderStatus}</small>
					</div>

					<div class="block-list">
						{#each blocks as block (block.id)}
							<article
								class:dragging={draggedId === block.id}
								class="block-editor"
								draggable="true"
								ondragstart={() => (draggedId = block.id)}
								ondragend={() => (draggedId = null)}
								ondragover={(event) => event.preventDefault()}
								ondrop={() => dropOn(block.id)}
							>
								<div class="drag-handle" title="Kéo để sắp xếp">
									<span class="icon-[mdi--drag-vertical]" aria-hidden="true"></span>
								</div>
								<form method="POST" action="?/updateBlock" class="block-form">
									<input type="hidden" name="blockId" value={block.id} />
									<div class="block-top">
										<span class="block-type">{block.type}</span>
										<span class="clicks">{block.clicks} click</span>
									</div>
									{#if block.type !== 'divider'}
										<label>Tiêu đề <input name="title" bind:value={block.title} /></label>
									{/if}
									{#if block.type === 'link' || block.type === 'text'}
										<label>Mô tả phụ <input name="subtitle" bind:value={block.subtitle} /></label>
									{/if}
									{#if block.type === 'link'}
										<label
											>URL <input
												name="url"
												bind:value={block.url}
												placeholder="https://…"
											/></label
										>
										<div class="field-grid two">
											<IconPicker bind:value={block.icon} />
											<label class="check"
												><input name="openNewTab" type="checkbox" bind:checked={block.openNewTab} /> Mở
												tab mới</label
											>
										</div>
									{/if}
									<div class="block-actions">
										<label class="check"
											><input name="enabled" type="checkbox" bind:checked={block.enabled} /> Hiển thị</label
										>
										<button class="save">Lưu block</button>
									</div>
								</form>
								<form
									method="POST"
									action="?/deleteBlock"
									onsubmit={(event) => !confirm('Xóa block này?') && event.preventDefault()}
								>
									<input type="hidden" name="blockId" value={block.id} />
									<button class="icon-danger" title="Xóa block" aria-label="Xóa block"
										><span class="icon-[mdi--delete-outline]" aria-hidden="true"></span></button
									>
								</form>
							</article>
						{/each}
					</div>

					<form method="POST" action="?/addBlock" class="add-block">
						<select name="type"
							><option value="link">Link</option><option value="heading">Heading</option><option
								value="text">Text</option
							><option value="divider">Divider</option></select
						>
						<button><span class="icon-[mdi--plus]" aria-hidden="true"></span> Thêm block</button>
					</form>
				</div>
			{:else}
				<form method="POST" action="?/updateTheme" class="panel-card appearance-card">
					<div class="card-heading">
						<div>
							<h2>Giao diện trang</h2>
							<p>Chọn theo ý thích và xem kết quả ngay ở bản xem trước.</p>
						</div>
						<button class="primary" type="submit">Lưu giao diện</button>
					</div>

					<input type="hidden" name="backgroundType" value={theme.backgroundType} />
					<input type="hidden" name="backgroundValue" value={theme.backgroundValue} />
					<input type="hidden" name="buttonColor" value={theme.buttonColor} />
					<input type="hidden" name="buttonTextColor" value={theme.buttonTextColor} />
					<input type="hidden" name="textColor" value={theme.textColor} />
					<input type="hidden" name="buttonRadius" value={theme.buttonRadius} />
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
										onclick={() => backgroundFileInput?.click()}
										>{uploadingKind === 'background'
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
					<form method="POST" action="?/setHome" class="panel-card set-home">
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
				<div class="phone-screen"><PublicPage data={previewData} compact /></div>
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
	.preview-label .icon-\[mdi--open-in-new\],
	.add-block .icon-\[mdi--plus\] {
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

	.upload-row input {
		flex: 1;
	}

	.upload-row button:disabled {
		cursor: wait;
		opacity: 0.6;
	}

	.upload-message {
		margin: 9px 0 0;
		font-size: 0.78rem;
		font-weight: 650;
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

	.add-block select {
		max-width: 180px;
	}

	.reorder-status {
		color: #2563eb;
		font-weight: 700;
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

		.phone-frame {
			width: min(100%, 340px);
		}
	}
</style>
