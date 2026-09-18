<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { splitIconRef } from '$lib/icons';
	import {
		isPublicRoute,
		navigationFallback,
		navigationType,
		navigationValue
	} from '$lib/navigation';
	import { OG_RENDER_VERSION } from '$lib/og';
	import { blockShareSlug } from '$lib/share';
	import type { Block, Page, Theme } from '$lib/server/db/schema';

	type PublicPageData = {
		page: Page;
		theme: Theme | null | undefined;
		blocks: Block[];
	};

	type PublicPageProps = {
		data: PublicPageData;
		compact?: boolean;
		onBlockSelect?: (blockId: string) => void;
	};

	let { data, compact = false, onBlockSelect }: PublicPageProps = $props();
	let sharingBlock = $state<Block | null>(null);
	let shareStatus = $state('');
	let highlightedBlockId = $state<string | null>(null);

	onMount(() => {
		const blockId = new URLSearchParams(window.location.search).get('block');
		if (!blockId || !data.blocks.some((block) => block.id === blockId)) return;

		highlightedBlockId = blockId;
		requestAnimationFrame(() => {
			document.getElementById(`block-${blockId}`)?.scrollIntoView({
				behavior: 'smooth',
				block: 'center'
			});
		});

		const clearHighlight = window.setTimeout(() => {
			highlightedBlockId = null;
		}, 4_000);

		return () => window.clearTimeout(clearHighlight);
	});

	function selectBlock(blockId: string) {
		onBlockSelect?.(blockId);
	}

	function goBack(block: Block, event: MouseEvent) {
		if (onBlockSelect) {
			event.preventDefault();
			selectBlock(block.id);
			return;
		}

		event.preventDefault();
		trackLink(block.id);

		const fallback = navigationFallback(block.metadata);
		if (history.length > 1) {
			history.back();
			return;
		}
		void goto(resolve(fallback));
	}

	function trackLink(blockId: string) {
		const endpoint = resolve('/track/[blockId]', { blockId });
		if (navigator.sendBeacon?.(endpoint, '')) return;
		void fetch(endpoint, { method: 'POST', keepalive: true });
	}

	function directHref(block: Block) {
		const type = navigationType(block.metadata);
		if (type === 'external') return block.url;
		if (type === 'route') {
			const route = navigationValue(block.metadata);
			return isPublicRoute(route) ? route : null;
		}
		if (type === 'page') {
			const path = block.metadata.destinationPath;
			return typeof path === 'string' && path.startsWith('/') ? path : null;
		}
		return resolve(navigationFallback(block.metadata));
	}

	function iconUrl(icon: string | null) {
		const parts = splitIconRef(icon);
		if (!parts) return null;
		return resolve('/icon/[set]/[name]', { set: parts.set, name: parts.name });
	}

	function blockImageUrl(metadata: Record<string, unknown>) {
		return typeof metadata.imageUrl === 'string' ? metadata.imageUrl : null;
	}

	function isCardImage(metadata: Record<string, unknown>) {
		return metadata.imageDisplay === 'card';
	}

	function shareVersion(block: Block) {
		return Math.max(
			block.updatedAt.getTime(),
			data.page.updatedAt.getTime(),
			data.theme?.updatedAt.getTime() ?? 0
		);
	}

	function shareUrl(block: Block) {
		const path = resolve('/s/[shareSlug]', { shareSlug: blockShareSlug(block) });
		return typeof window === 'undefined' ? path : new URL(path, window.location.origin).toString();
	}

	function ogImageUrl(block: Block) {
		const path = `${resolve('/og/[blockId].png', { blockId: blockShareSlug(block) })}?v=${shareVersion(block)}-${OG_RENDER_VERSION}`;
		return typeof window === 'undefined' ? path : new URL(path, window.location.origin).toString();
	}

	function openShareMenu(block: Block) {
		sharingBlock = block;
		shareStatus = '';
	}

	function closeShareMenu() {
		sharingBlock = null;
		shareStatus = '';
	}

	async function copyShareLink() {
		if (!sharingBlock) return;
		const url = shareUrl(sharingBlock);
		try {
			await navigator.clipboard.writeText(url);
			shareStatus = 'Đã sao chép liên kết.';
		} catch {
			const input = document.createElement('textarea');
			input.value = url;
			input.style.position = 'fixed';
			input.style.opacity = '0';
			document.body.append(input);
			input.select();
			document.execCommand('copy');
			input.remove();
			shareStatus = 'Đã sao chép liên kết.';
		}
	}

	async function shareBlock() {
		if (!sharingBlock) return;
		const url = shareUrl(sharingBlock);
		if (!navigator.share) {
			await copyShareLink();
			return;
		}

		try {
			await navigator.share({
				title: sharingBlock.title || data.page.title,
				text: sharingBlock.subtitle || data.page.description || '',
				url
			});
			closeShareMenu();
		} catch (cause) {
			if (!(cause instanceof DOMException && cause.name === 'AbortError'))
				shareStatus = 'Không thể mở trình chia sẻ. Bạn có thể sao chép liên kết.';
		}
	}

	function youtubeEmbedUrl(value: string | null) {
		if (!value) return null;
		try {
			const url = new URL(value);
			return url.hostname === 'www.youtube-nocookie.com' &&
				/^\/embed\/[A-Za-z0-9_-]{11}$/.test(url.pathname)
				? url.toString()
				: null;
		} catch {
			return null;
		}
	}

	let theme = $derived(
		data.theme ?? {
			backgroundType: 'color' as const,
			backgroundValue: '#ffffff',
			backgroundMobileValue: null,
			backgroundPosition: 'center',
			backgroundFocalX: 50,
			backgroundFocalY: 50,
			backgroundOverlayColor: '#0f172a',
			backgroundOverlayOpacity: 0,
			buttonColor: '#8ec2ee',
			buttonTextColor: '#172554',
			textColor: '#1d39ff',
			buttonRadius: 999,
			buttonPaddingX: 22,
			buttonPaddingY: 10,
			fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif'
		}
	);

	function rgbaFromHex(color: string, opacity: number) {
		const match = color.match(/^#([0-9a-f]{6})$/i);
		if (!match) return `rgb(15 23 42 / ${opacity / 100})`;
		const value = match[1];
		return `rgb(${Number.parseInt(value.slice(0, 2), 16)} ${Number.parseInt(value.slice(2, 4), 16)} ${Number.parseInt(value.slice(4, 6), 16)} / ${opacity / 100})`;
	}

	function imageBackground(url: string) {
		const position = `${theme.backgroundFocalX}% ${theme.backgroundFocalY}%`;
		const image = `url("${url}") ${position} / cover no-repeat scroll`;
		if (theme.backgroundOverlayOpacity === 0) return image;
		const overlay = rgbaFromHex(theme.backgroundOverlayColor, theme.backgroundOverlayOpacity);
		return `linear-gradient(${overlay}, ${overlay}) center / cover no-repeat, ${image}`;
	}

	let background = $derived(
		theme.backgroundType === 'image'
			? imageBackground(theme.backgroundValue)
			: theme.backgroundValue
	);

	let mobileBackground = $derived(
		theme.backgroundType === 'image'
			? imageBackground(theme.backgroundMobileValue || theme.backgroundValue)
			: theme.backgroundValue
	);

	let shellStyle = $derived(
		`--page-bg:${background};--page-bg-mobile:${mobileBackground};--button-color:${theme.buttonColor};--button-text:${theme.buttonTextColor};--page-text:${theme.textColor};--button-radius:${theme.buttonRadius}px;--button-padding-x:${theme.buttonPaddingX}px;--button-padding-y:${theme.buttonPaddingY}px;--page-font:${theme.fontFamily}`
	);
</script>

<svelte:window onkeydown={(event) => event.key === 'Escape' && sharingBlock && closeShareMenu()} />

<main
	class:compact
	class:image-background={theme.backgroundType === 'image'}
	class="public-page"
	style={shellStyle}
>
	<div class="background-blur" aria-hidden="true"></div>
	<div class="page-card">
		<header class="page-header">
			{#if data.page.logoUrl}
				<img class="page-logo" src={data.page.logoUrl} alt={data.page.title} />
			{:else}
				<div class="page-logo page-logo-placeholder" aria-hidden="true">
					<span class="icon-[mdi--dharmachakra]"></span>
				</div>
			{/if}
			<h1>{data.page.title}</h1>
			{#if data.page.description}<p>{data.page.description}</p>{/if}
		</header>

		<section class="blocks" aria-label="Liên kết">
			{#each data.blocks as block (block.id)}
				{#if block.type === 'heading'}
					{#if onBlockSelect}
						<button
							class="preview-heading preview-selectable"
							type="button"
							onclick={() => selectBlock(block.id)}>{block.title}</button
						>
					{:else}
						<h2>{block.title}</h2>
					{/if}
				{:else if block.type === 'text'}
					{#if onBlockSelect}
						<button
							class="text-block preview-text preview-selectable"
							type="button"
							onclick={() => selectBlock(block.id)}
						>
							{#if block.title}<strong>{block.title}</strong>{/if}
							{#if block.subtitle}<p>{block.subtitle}</p>{/if}
						</button>
					{:else}
						<div class="text-block">
							{#if block.title}<strong>{block.title}</strong>{/if}
							{#if block.subtitle}<p>{block.subtitle}</p>{/if}
						</div>
					{/if}
				{:else if block.type === 'divider'}
					{#if onBlockSelect}
						<button
							class="preview-divider preview-selectable"
							type="button"
							aria-label="Chỉnh sửa đường phân cách"
							onclick={() => selectBlock(block.id)}><hr /></button
						>
					{:else}
						<hr />
					{/if}
				{:else if block.type === 'youtube'}
					{@const embedUrl = youtubeEmbedUrl(block.url)}
					{#if embedUrl}
						<div class="video-block">
							<iframe
								src={embedUrl}
								title={block.title || 'Video YouTube'}
								allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
								allowfullscreen
							></iframe>
						</div>
					{:else}
						<div class="video-unavailable">Video YouTube chưa hợp lệ.</div>
					{/if}
				{:else}
					{@const blockIconUrl = iconUrl(block.icon)}
					{@const imageUrl = blockImageUrl(block.metadata)}
					{@const cardImage = imageUrl && isCardImage(block.metadata)}
					{@const targetType = navigationType(block.metadata)}
					{@const href = directHref(block)}
					{@const isAvailable = Boolean(href)}
					<div
						id={`block-${block.id}`}
						class:link-card={cardImage}
						class:shared-block-highlight={highlightedBlockId === block.id}
						class="link-block"
					>
						<a
							class:disabled={!isAvailable}
							class:link-card={cardImage}
							class="link-button"
							href={href || undefined}
							target={targetType === 'external' && block.openNewTab ? '_blank' : undefined}
							rel="external noreferrer"
							aria-disabled={!isAvailable}
							onclick={(event) => {
								if (targetType === 'back') return goBack(block, event);
								if (onBlockSelect) {
									event.preventDefault();
									selectBlock(block.id);
									return;
								}
								trackLink(block.id);
							}}
						>
							{#if imageUrl}
								<img class:card-image={cardImage} class="link-image" src={imageUrl} alt="" />
							{:else if blockIconUrl}
								<span
									class="link-icon"
									style={`--icon-image: url("${blockIconUrl}")`}
									aria-hidden="true"
								></span>
							{:else}
								<span class="link-icon-empty" aria-hidden="true"></span>
							{/if}
							<span class="link-copy">
								<strong>{block.title || 'Liên kết'}</strong>
								{#if block.subtitle}<small>{block.subtitle}</small>{/if}
							</span>
							<span class="link-menu-spacer" aria-hidden="true"></span>
						</a>
						{#if !onBlockSelect}
							<button
								class="link-menu"
								type="button"
								aria-label={`Chia sẻ ${block.title || 'liên kết'}`}
								onclick={(event) => {
									event.stopPropagation();
									openShareMenu(block);
								}}
								><span class="icon-[mdi--dots-vertical]" aria-hidden="true"></span></button
							>
						{/if}
					</div>
				{/if}
			{/each}
		</section>
	</div>
</main>

{#if sharingBlock}
	<div class="share-backdrop">
		<button type="button" class="share-dismiss" aria-label="Đóng" onclick={closeShareMenu}></button>
		<div class="share-dialog" role="dialog" aria-modal="true" aria-labelledby="share-dialog-title">
			<div class="share-dialog-heading">
				<div>
					<span>PREVIEW KHI CHIA SẺ</span>
					<h2 id="share-dialog-title">{sharingBlock.title || data.page.title}</h2>
				</div>
				<button type="button" class="share-close" aria-label="Đóng" onclick={closeShareMenu}
					>×</button
				>
			</div>
			<div class="share-preview-card">
				<img src={ogImageUrl(sharingBlock)} alt="" />
				<div>
					<strong>{sharingBlock.title || data.page.title}</strong>
					{#if sharingBlock.subtitle || data.page.description}
						<p>{sharingBlock.subtitle || data.page.description}</p>
					{/if}
					<small>{shareUrl(sharingBlock).replace(/^https?:\/\//, '')}</small>
				</div>
			</div>
			<div class="share-actions">
				<button type="button" class="share-primary" onclick={shareBlock}>
					<span class="icon-[mdi--share-variant-outline]" aria-hidden="true"></span> Chia sẻ
				</button>
				<button type="button" onclick={copyShareLink}>
					<span class="icon-[mdi--content-copy]" aria-hidden="true"></span> Sao chép link
				</button>
			</div>
			{#if shareStatus}<p class="share-status" aria-live="polite">{shareStatus}</p>{/if}
		</div>
	</div>
{/if}

<style>
	body,
	html {
		overscroll-behavior: none;
	}

	.public-page {
		position: relative;
		isolation: isolate;
		min-height: 100dvh;
		background: transparent;
		font-family: var(--page-font);
		color: var(--page-text);
		padding: 60px 18px 72px;
	}

	.background-blur {
		position: fixed;
		inset: -40px;
		z-index: -1;
		background: var(--page-bg);
		filter: blur(24px) brightness(0.65);
		transform: scale(1.15);
	}

	.public-page::before {
		position: fixed;
		z-index: 1;
		inset: 0;
		content: '';
		pointer-events: none;
		background: rgb(15 23 42 / 0.38);
		backdrop-filter: blur(3px);
		opacity: 0;
		transition: opacity 280ms ease;
	}

	.public-page:has(.shared-block-highlight)::before {
		opacity: 1;
	}

	@media (max-width: 720px) {
		.public-page {
			background: var(--page-bg);
		}

		.public-page.image-background {
			background: var(--page-bg-mobile);
		}

		.background-blur {
			display: none;
		}
	}

	.page-card {
		width: min(100%, 720px);
		margin: 0 auto;
	}

	@media (min-width: 768px) {
		.public-page {
			display: flex;
			justify-content: center;
			padding: 32px;
		}

		.page-card {
			width: min(680px, 100%);
			min-height: calc(100dvh - 64px);
			box-sizing: border-box;
			padding: 48px 36px 72px;
			border-radius: 28px;
			background: var(--page-bg);
			box-shadow: 0 20px 60px rgb(15 23 42 / 0.14);
		}
	}

	@media (max-width: 767px) {
		.page-card {
			padding: 0;
			background: transparent;
			border-radius: 0;
			box-shadow: none;
		}
	}

	.page-header {
		text-align: center;
		margin-bottom: 36px;
	}

	.page-logo {
		width: 112px;
		height: 112px;
		border-radius: 50%;
		object-fit: contain;
		background: rgb(255 255 255 / 0.82);
		box-shadow: 0 10px 32px rgb(15 23 42 / 0.09);
		margin: 0 auto 20px;
	}

	.page-logo-placeholder {
		display: grid;
		place-items: center;
		font-size: 54px;
		color: #e11d48;
	}

	h1 {
		font-size: clamp(1.6rem, 5vw, 2.15rem);
		font-weight: 800;
		letter-spacing: 0.015em;
		margin: 0;
	}

	.page-header p {
		max-width: 560px;
		margin: 10px auto 0;
		color: color-mix(in srgb, var(--page-text), transparent 26%);
	}

	.blocks {
		display: grid;
		gap: 16px;
	}

	.page-header,
	.blocks > * {
		transition: filter 280ms ease, opacity 280ms ease;
	}

	.link-block {
		position: relative;
		scroll-margin-block: 24px;
		transition: filter 280ms ease, opacity 280ms ease;
	}

	.public-page:has(.shared-block-highlight) .page-header,
	.public-page:has(.shared-block-highlight) .blocks > :not(.shared-block-highlight) {
		filter: blur(2px);
		opacity: 0.48;
	}

	.link-block.shared-block-highlight {
		z-index: 2;
	}

	.link-block.shared-block-highlight .link-button {
		outline: 3px solid #fbbf24;
		outline-offset: 4px;
		animation: shared-block-highlight 1.8s ease-in-out 2;
	}

	@keyframes shared-block-highlight {
		50% {
			box-shadow: 0 0 0 10px rgb(251 191 36 / 0.2), 0 12px 28px rgb(15 23 42 / 0.16);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.link-block:target .link-button {
			animation: none;
		}
	}

	.link-button {
		display: grid;
		grid-template-columns: 42px 1fr 28px;
		align-items: center;
		padding: var(--button-padding-y) var(--button-padding-x);
		border-radius: var(--button-radius);
		background: var(--button-color);
		color: var(--button-text);
		text-decoration: none;
		box-shadow: 0 8px 22px rgb(15 23 42 / 0.06);
		transition:
			transform 150ms ease,
			box-shadow 150ms ease;
	}

	.link-button[href]:hover {
		transform: translateY(-2px);
		box-shadow: 0 12px 28px rgb(15 23 42 / 0.11);
	}

	.link-button.disabled {
		opacity: 0.72;
		cursor: default;
	}

	.link-icon {
		width: 26px;
		height: 26px;
		justify-self: start;
		background: currentColor;
		-webkit-mask: var(--icon-image) center / contain no-repeat;
		mask: var(--icon-image) center / contain no-repeat;
	}

	.link-icon-empty {
		width: 26px;
		height: 26px;
	}

	.link-image {
		width: 32px;
		height: 32px;
		object-fit: contain;
		border-radius: var(--button-radius);
	}

	.link-button.link-card {
		display: block;
		min-height: 0;
		padding: 0;
		overflow: hidden;
	}

	.link-image.card-image {
		display: block;
		width: 100%;
		height: auto;
		aspect-ratio: 16 / 9;
		border: 0;
		border-radius: var(--button-radius) var(--button-radius) 0 0;
		background: rgb(15 23 42 / 0.06);
	}

	.link-card .link-copy {
		padding: var(--button-padding-y) var(--button-padding-x);
	}

	.link-copy {
		display: grid;
		gap: 3px;
		text-align: center;
		font-size: 1rem;
	}

	.link-copy strong {
		font-weight: 650;
	}

	.link-copy small {
		opacity: 0.72;
	}

	.link-menu {
		position: absolute;
		top: 50%;
		right: 8px;
		display: grid;
		width: 36px;
		height: 36px;
		place-items: center;
		padding: 0;
		transform: translateY(-50%);
		border: 0;
		border-radius: 50%;
		background: transparent;
		color: inherit;
		font-size: 1.3rem;
		opacity: 0.64;
		cursor: pointer;
		z-index: 2;
	}

	.link-menu:hover,
	.link-menu:focus-visible {
		background: rgb(15 23 42 / 0.12);
		opacity: 1;
	}

	.link-block.link-card .link-menu {
		top: 14px;
		right: 14px;
		transform: none;
		background: rgb(15 23 42 / 0.48);
		color: white;
		opacity: 1;
	}

	.link-block.link-card .link-menu:hover,
	.link-block.link-card .link-menu:focus-visible {
		background: rgb(15 23 42 / 0.7);
	}

	.share-backdrop {
		position: fixed;
		z-index: 10;
		inset: 0;
		display: grid;
		place-items: center;
		padding: 16px;
		background: rgb(15 23 42 / 0.52);
	}

	.share-dismiss {
		position: absolute;
		inset: 0;
		border: 0;
		background: transparent;
		cursor: default;
	}

	.share-dialog {
		position: relative;
		z-index: 1;
		box-sizing: border-box;
		width: calc(100vw - 32px);
		max-width: 760px;
		max-height: calc(100dvh - 32px);
		overflow-y: auto;
		padding: 18px;
		border-radius: 20px;
		background: white;
		color: #0f172a;
		box-shadow: 0 24px 70px rgb(15 23 42 / 0.3);
	}

	.share-dialog-heading {
		display: flex;
		align-items: start;
		justify-content: space-between;
		gap: 12px;
	}

	.share-dialog-heading > div {
		min-width: 0;
	}

	.share-dialog-heading span {
		font-size: 0.64rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		color: #64748b;
	}

	.share-dialog-heading h2 {
		margin: 4px 0 0;
		overflow-wrap: anywhere;
		text-align: left;
		font-size: 1.08rem;
	}

	.share-close {
		flex: 0 0 auto;
		width: 32px;
		height: 32px;
		padding: 0;
		border: 0;
		border-radius: 50%;
		background: #f1f5f9;
		font-size: 1.4rem;
		line-height: 1;
		cursor: pointer;
	}

	.share-preview-card {
		width: 100%;
		overflow: hidden;
		margin-top: 16px;
		border: 1px solid #e2e8f0;
		border-radius: 14px;
		background: #f8fafc;
	}

	.share-preview-card img {
		display: block;
		width: 100%;
		height: auto;
		aspect-ratio: 1.91 / 1;
		object-fit: cover;
		background: #e2e8f0;
	}

	.share-preview-card > div {
		padding: 12px;
	}

	.share-preview-card strong,
	.share-preview-card small {
		display: block;
	}

	.share-preview-card p {
		margin: 4px 0 7px;
		font-size: 0.82rem;
		color: #475569;
	}

	.share-preview-card small {
		overflow: hidden;
		color: #64748b;
		font-size: 0.7rem;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.share-actions {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
		margin-top: 14px;
	}

	.share-actions button {
		padding: 10px 12px;
		border: 1px solid #cbd5e1;
		border-radius: 10px;
		background: white;
		font-weight: 700;
		color: #334155;
		cursor: pointer;
	}

	.share-actions .share-primary {
		border-color: #1d4ed8;
		background: #2563eb;
		color: white;
	}

	.share-status {
		margin: 10px 0 0;
		text-align: center;
		font-size: 0.8rem;
		color: #047857;
	}

	h2 {
		font-size: 1.1rem;
		text-align: center;
		font-weight: 800;
		margin: 17px 0 2px;
		letter-spacing: 0.02em;
	}

	.text-block {
		text-align: center;
		padding: 12px 16px;
	}

	.text-block p {
		margin: 6px 0 0;
	}

	.preview-selectable {
		cursor: pointer;
	}

	.preview-selectable:focus-visible {
		outline: 2px solid var(--button-color);
		outline-offset: 3px;
	}

	.preview-divider {
		width: 100%;
		padding: 0;
		border: 0;
		background: transparent;
		border-radius: 6px;
	}

	.preview-heading,
	.preview-text {
		width: 100%;
		border: 0;
		background: transparent;
		color: inherit;
		font: inherit;
	}

	.preview-heading {
		font-size: 1.1rem;
		font-weight: 800;
		letter-spacing: 0.02em;
		margin: 17px 0 2px;
	}

	.video-block {
		position: relative;
		width: 100%;
		aspect-ratio: 16 / 9;
		overflow: hidden;
		border-radius: var(--button-radius);
		background: rgb(15 23 42 / 0.12);
		box-shadow: 0 8px 22px rgb(15 23 42 / 0.06);
	}

	.video-block iframe {
		position: absolute;
		width: 100%;
		height: 100%;
		border: 0;
	}

	.video-unavailable {
		padding: 18px;
		border-radius: var(--button-radius);
		background: rgb(15 23 42 / 0.08);
		text-align: center;
		font-size: 0.86rem;
	}

	hr {
		width: 72%;
		border: 0;
		border-top: 1px solid color-mix(in srgb, var(--page-text), transparent 72%);
		margin: 10px auto;
	}

	.compact {
		min-height: 100%;
		padding: 30px 18px 72px;
	}

	.compact .page-logo {
		width: 76px;
		height: 76px;
		margin-bottom: 14px;
	}

	.compact .page-logo-placeholder {
		font-size: 36px;
	}

	.compact h1 {
		font-size: 1.25rem;
	}

	.compact .page-header {
		margin-bottom: 22px;
	}

	.compact .blocks {
		gap: 10px;
	}

	.compact .link-button {
		grid-template-columns: 32px 1fr 20px;
		font-size: 0.86rem;
	}

	.compact .link-image {
		width: 26px;
		height: 26px;
	}

	.compact .link-image.card-image {
		width: 100%;
		height: auto;
	}

	.compact h2 {
		font-size: 0.88rem;
	}

	@media (max-width: 560px) {
		.public-page {
			padding-top: 48px;
		}

		.page-logo {
			width: 92px;
			height: 92px;
		}

		.share-dialog {
			padding: 14px;
			border-radius: 16px;
		}

		.share-actions {
			grid-template-columns: 1fr;
		}
	}
</style>
