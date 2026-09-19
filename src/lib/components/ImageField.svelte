<script lang="ts">
	import ResilientImage from './ResilientImage.svelte';
	import { uploadImage } from '$lib/uploads/client';

	let {
		pageId,
		kind,
		label = 'Hình ảnh',
		imageUrl = '',
		sourceImageUrl = '',
		disabled = false,
		library = [],
		onchange
	}: {
		pageId: string;
		kind: 'logo' | 'block-image';
		label?: string;
		imageUrl?: string;
		sourceImageUrl?: string;
		disabled?: boolean;
		library?: Array<{ imageUrl: string | null; sourceImageUrl: string | null }>;
		onchange: (value: { imageUrl: string; sourceImageUrl: string }) => void | Promise<void>;
	} = $props();

	let mode = $state<'upload' | 'url' | 'library'>('upload');
	let urlInput = $state('');
	let busy = $state(false);
	let message = $state('');
	let fileInput = $state<HTMLInputElement>();
	let dragging = $state(false);

	$effect(() => {
		urlInput = sourceImageUrl || '';
	});

	async function uploadFile(file: File | undefined) {
		if (!file) return;
		busy = true;
		message = '';
		try {
			const url = await uploadImage(pageId, kind, file);
			await onchange({ imageUrl: url, sourceImageUrl: '' });
			message = 'Đã tải ảnh lên.';
		} catch (cause) {
			message = cause instanceof Error ? cause.message : 'Không thể tải ảnh.';
		} finally {
			busy = false;
			if (fileInput) fileInput.value = '';
		}
	}

	function upload(event: Event) {
		void uploadFile((event.currentTarget as HTMLInputElement).files?.[0]);
	}

	function dropFile(event: DragEvent) {
		event.preventDefault();
		dragging = false;
		if (busy || disabled) return;
		void uploadFile(event.dataTransfer?.files[0]);
	}

	async function useUrl() {
		const value = urlInput.trim();
		if (!/^https?:\/\//i.test(value)) {
			message = 'Link ảnh phải bắt đầu bằng http:// hoặc https://.';
			return;
		}
		busy = true;
		message = '';
		try {
			await onchange({ imageUrl: '', sourceImageUrl: value });
			message = 'Đã dùng link ảnh nguồn.';
		} catch (cause) {
			message = cause instanceof Error ? cause.message : 'Không thể lưu link ảnh.';
		} finally {
			busy = false;
		}
	}

	async function selectImage(value: { imageUrl: string; sourceImageUrl: string }) {
		busy = true;
		message = '';
		try {
			await onchange(value);
			message = value.imageUrl || value.sourceImageUrl ? 'Đã cập nhật ảnh.' : 'Đã bỏ ảnh.';
		} catch (cause) {
			message = cause instanceof Error ? cause.message : 'Không thể cập nhật ảnh.';
		} finally {
			busy = false;
		}
	}

	async function copy(value: string) {
		if (!value) return;
		await navigator.clipboard.writeText(value);
		message = 'Đã sao chép link ảnh.';
	}
</script>

<div class="image-field" aria-busy={busy}>
	<div class:busy class="preview">
		<ResilientImage primaryUrl={imageUrl} fallbackUrl={sourceImageUrl} alt={label} />
	</div>
	<div class="controls">
		<strong>{label}</strong>
		<div class="tabs">
			<button type="button" class:active={mode === 'upload'} onclick={() => (mode = 'upload')}
				><span class="icon-[mdi--tray-arrow-up]" aria-hidden="true"></span>Tải file</button
			>
			<button type="button" class:active={mode === 'url'} onclick={() => (mode = 'url')}
				><span class="icon-[mdi--link-variant]" aria-hidden="true"></span>Dùng link</button
			>
			{#if library.length}<button
					type="button"
					class:active={mode === 'library'}
					onclick={() => (mode = 'library')}
					><span class="icon-[mdi--image-multiple-outline]" aria-hidden="true"></span>Kho ảnh ({library.length})</button
				>{/if}
		</div>
		{#if mode === 'upload'}
			<input
				class="file-input"
				bind:this={fileInput}
				type="file"
				accept="image/jpeg,image/png,image/webp,image/gif"
				{disabled}
				onchange={upload}
			/>
			<button
				type="button"
				class:dragging
				class="upload-card"
				disabled={busy || disabled}
				onclick={() => fileInput?.click()}
				ondragenter={(event) => {
					event.preventDefault();
					if (!busy && !disabled) dragging = true;
				}}
				ondragover={(event) => event.preventDefault()}
				ondragleave={() => (dragging = false)}
				ondrop={dropFile}
			>
				<span class="upload-icon" aria-hidden="true">
					<span class={busy ? 'icon-[mdi--loading]' : 'icon-[mdi--cloud-upload-outline]'}></span>
				</span>
				<span class="upload-copy">
					<strong>{busy ? 'Đang tải ảnh…' : 'Chọn ảnh để tải lên'}</strong>
					<small>{dragging ? 'Thả ảnh tại đây' : 'Hoặc kéo và thả · JPG, PNG, WEBP, GIF'}</small>
				</span>
				<span class="choose-label">Chọn file</span>
			</button>
		{:else if mode === 'url'}
			<div class="url-row">
				<input type="url" bind:value={urlInput} placeholder="https://example.com/image.jpg" />
				<button type="button" disabled={busy || disabled} aria-busy={busy} onclick={useUrl}
					>Áp dụng</button
				>
			</div>
		{:else}
			<div class="library" aria-label="Kho ảnh đã sử dụng">
				{#each library as image}
					<button
						type="button"
						title="Dùng lại ảnh này"
						disabled={busy || disabled}
						onclick={() =>
							selectImage({
								imageUrl: image.imageUrl || '',
								sourceImageUrl: image.sourceImageUrl || ''
							})}
					>
						<ResilientImage primaryUrl={image.imageUrl} fallbackUrl={image.sourceImageUrl} alt="" />
					</button>
				{/each}
			</div>
		{/if}
		<div class="actions">
			{#if imageUrl}<button type="button" onclick={() => copy(imageUrl)}
					><span class="icon-[mdi--content-copy]" aria-hidden="true"></span>Copy link MinIO</button
				>{/if}
			{#if sourceImageUrl}<button type="button" onclick={() => copy(sourceImageUrl)}
					><span class="icon-[mdi--content-copy]" aria-hidden="true"></span>Copy link nguồn</button
				>{/if}
			{#if imageUrl || sourceImageUrl}<button
					type="button"
					class="remove"
					disabled={busy || disabled}
					onclick={() => selectImage({ imageUrl: '', sourceImageUrl: '' })}
					><span class="icon-[mdi--trash-can-outline]" aria-hidden="true"></span>Bỏ ảnh</button
				>{/if}
		</div>
		{#if busy}<small>Đang tải…</small>{:else if message}<small>{message}</small>{/if}
	</div>
</div>

<style>
	.image-field {
		display: grid;
		grid-template-columns: 56px minmax(0, 1fr);
		gap: 12px;
		padding: 12px;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		background: #fff;
	}
	.preview {
		position: relative;
		width: 56px;
		height: 56px;
		overflow: hidden;
		border-radius: 12px;
		background: #f1f5f9;
	}
	.preview :global(img) {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.preview.busy::before {
		position: absolute;
		inset: 0;
		z-index: 1;
		background: rgb(15 23 42 / 0.38);
		content: '';
	}
	.preview.busy::after {
		position: absolute;
		top: 50%;
		left: 50%;
		z-index: 2;
		width: 18px;
		height: 18px;
		margin: -9px 0 0 -9px;
		border: 2px solid rgb(255 255 255 / 0.4);
		border-top-color: #fff;
		border-radius: 50%;
		content: '';
		animation: image-spinner 0.65s linear infinite;
	}
	.controls,
	.controls strong,
	.controls small {
		display: block;
		min-width: 0;
	}
	.tabs,
	.actions,
	.url-row {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 8px;
	}
	.tabs button,
	.actions button {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 5px 8px;
		font-size: 0.68rem;
	}
	.tabs button.active {
		border-color: #7c3aed;
		color: #6d28d9;
		background: #f5f3ff;
	}
	.url-row input {
		flex: 1;
		min-width: 160px;
	}
	.file-input {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		opacity: 0;
		pointer-events: none;
	}
	.upload-card {
		display: grid;
		grid-template-columns: 38px minmax(0, 1fr) auto;
		gap: 10px;
		align-items: center;
		width: 100%;
		margin-top: 8px;
		padding: 10px;
		border: 1px dashed #c4b5fd;
		border-radius: 11px;
		background: linear-gradient(135deg, #faf5ff, #f8fafc);
		text-align: left;
		transition: 150ms ease;
	}
	.upload-card:hover,
	.upload-card.dragging {
		border-color: #7c3aed;
		background: #f5f3ff;
		box-shadow: 0 0 0 3px rgb(124 58 237 / 0.09);
		transform: translateY(-1px);
	}
	.upload-card:disabled {
		cursor: wait;
		opacity: 0.7;
	}
	.upload-icon {
		display: grid;
		width: 38px;
		height: 38px;
		place-items: center;
		border-radius: 10px;
		background: #ede9fe;
		color: #6d28d9;
		font-size: 1.2rem;
	}
	.upload-icon .icon-\[mdi--loading\] {
		animation: image-spinner 0.75s linear infinite;
	}
	.upload-copy,
	.upload-copy strong,
	.upload-copy small {
		display: block;
		min-width: 0;
	}
	.upload-copy strong {
		font-size: 0.72rem;
		color: #334155;
	}
	.upload-copy small {
		margin-top: 2px;
		font-size: 0.62rem;
		font-weight: 500;
		color: #7c8799;
	}
	.choose-label {
		padding: 6px 8px;
		border: 1px solid #ddd6fe;
		border-radius: 8px;
		background: white;
		font-size: 0.65rem;
		color: #6d28d9;
		white-space: nowrap;
	}
	.actions .remove {
		color: #b91c1c;
	}
	.library {
		display: grid;
		grid-template-columns: repeat(auto-fill, 52px);
		gap: 7px;
		margin-top: 8px;
		max-height: 180px;
		overflow: auto;
	}
	.library button {
		width: 52px;
		height: 52px;
		padding: 0;
		overflow: hidden;
		border-radius: 9px;
	}
	.library :global(img) {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.controls small {
		margin-top: 7px;
		color: #64748b;
	}
	@media (max-width: 560px) {
		.image-field {
			grid-template-columns: 46px minmax(0, 1fr);
		}
		.preview {
			width: 46px;
			height: 46px;
		}
		.upload-card {
			grid-template-columns: 34px minmax(0, 1fr);
		}
		.upload-icon {
			width: 34px;
			height: 34px;
		}
		.choose-label {
			display: none;
		}
	}
	@keyframes image-spinner {
		to {
			transform: rotate(360deg);
		}
	}
</style>
