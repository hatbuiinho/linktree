<script lang="ts">
	import { resolve } from '$app/paths';
	import IconPicker from '$lib/components/IconPicker.svelte';
	import PublicPage from '$lib/components/PublicPage.svelte';
	import { uploadImage } from '$lib/uploads/client';

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

	let previewData = $derived({ page, theme, blocks });
	let publicPath = $derived(page.isHome ? '/' : `/p/${page.slug}`);
	let publicUrl = $derived(page.isHome ? resolve('/') : resolve('/p/[slug]', { slug: page.slug }));

	$effect(() => {
		page = { ...data.page };
		if (data.theme) theme = { ...data.theme };
		blocks = data.blocks.map((block) => ({ ...block }));
	});

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

	async function handleImageUpload(event: SubmitEvent, kind: 'logo' | 'background') {
		event.preventDefault();
		const formElement = event.currentTarget as HTMLFormElement;
		const input = formElement.elements.namedItem('file') as HTMLInputElement | null;
		const file = input?.files?.[0];
		if (!file) {
			imageUploadError = 'Vui lòng chọn ảnh.';
			return;
		}

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
</script>

<svelte:head><title>{page.title} · TTPQ Admin</title></svelte:head>

<main class="editor-shell">
	<header class="editor-header">
		<div>
			<a class="back" href={resolve('/admin')}>← Tất cả trang</a>
			<div class="title-row">
				<h1>{page.title}</h1>
				<span class:published={page.status === 'published'} class="status"
					>{page.status === 'published' ? 'Đã xuất bản' : 'Bản nháp'}</span
				>
				{#if page.isHome}<span class="home-badge">★ Trang chính</span>{/if}
			</div>
			<a class="public-url" href={publicUrl} target="_blank" rel="noreferrer"
				>{page.isHome ? 'ttpq.hatbuinho.me' : `ttpq.hatbuinho.me${publicPath}`} ↗</a
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
								<div class="drag-handle" title="Kéo để sắp xếp">⠿</div>
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
									<button class="icon-danger" title="Xóa block">×</button>
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
						<button>+ Thêm block</button>
					</form>
				</div>
			{:else}
				<form method="POST" action="?/updateTheme" class="panel-card">
					<div class="card-heading">
						<div>
							<h2>Theme</h2>
							<p>Thay đổi được phản ánh ngay ở bản xem trước.</p>
						</div>
						<button class="primary">Lưu giao diện</button>
					</div>
					<div class="field-grid two">
						<label
							>Kiểu nền
							<select name="backgroundType" bind:value={theme.backgroundType}
								><option value="color">Màu</option><option value="gradient">Gradient</option><option
									value="image">Ảnh</option
								></select
							>
						</label>
						<label
							>Giá trị nền <input
								name="backgroundValue"
								bind:value={theme.backgroundValue}
								placeholder="#ffffff hoặc linear-gradient(...)"
							/></label
						>
						<label
							>Màu nút <div class="color-field">
								<input type="color" bind:value={theme.buttonColor} /><input
									name="buttonColor"
									bind:value={theme.buttonColor}
								/>
							</div></label
						>
						<label
							>Màu chữ nút <div class="color-field">
								<input type="color" bind:value={theme.buttonTextColor} /><input
									name="buttonTextColor"
									bind:value={theme.buttonTextColor}
								/>
							</div></label
						>
						<label
							>Màu chữ chính <div class="color-field">
								<input type="color" bind:value={theme.textColor} /><input
									name="textColor"
									bind:value={theme.textColor}
								/>
							</div></label
						>
						<label
							>Bo góc nút ({theme.buttonRadius}px)
							<input
								name="buttonRadius"
								type="range"
								min="0"
								max="999"
								bind:value={theme.buttonRadius}
							/></label
						>
					</div>
					<label
						>Font <input
							name="fontFamily"
							bind:value={theme.fontFamily}
							placeholder="Inter, system-ui, sans-serif"
						/></label
					>
				</form>

				<div class="panel-card">
					<div class="card-heading">
						<div>
							<h2>Ảnh nền</h2>
							<p>Tải ảnh lên sẽ tự chuyển kiểu nền sang Image.</p>
						</div>
					</div>
					<form class="upload-row" onsubmit={(event) => handleImageUpload(event, 'background')}>
						<input
							name="file"
							type="file"
							accept="image/jpeg,image/png,image/webp,image/gif"
							required
						/>
						<button disabled={uploadingKind !== null}
							>{uploadingKind === 'background' ? 'Đang tải…' : 'Tải ảnh nền'}</button
						>
					</form>
					{#if imageUploadError}<p class="upload-message error-text">{imageUploadError}</p>{/if}
					{#if imageUploadMessage}<p class="upload-message success-text">
							{imageUploadMessage}
						</p>{/if}
				</div>

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
				<span>PREVIEW</span><a href={publicUrl} target="_blank" rel="noreferrer">Mở trang ↗</a>
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
		padding: 2px 7px;
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

	.color-field {
		display: grid;
		grid-template-columns: 46px 1fr;
		gap: 8px;
	}

	.color-field input[type='color'] {
		padding: 3px;
		height: 40px;
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
			order: -1;
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
