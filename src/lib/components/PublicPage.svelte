<script lang="ts">
	import { resolve } from '$app/paths';
	import { splitIconRef } from '$lib/icons';
	import type { Block, Page, Theme } from '$lib/server/db/schema';

	type PublicPageData = {
		page: Page;
		theme: Theme | null | undefined;
		blocks: Block[];
	};

	let { data, compact = false } = $props<{ data: PublicPageData; compact?: boolean }>();

	function iconUrl(icon: string | null) {
		const parts = splitIconRef(icon);
		if (!parts) return null;
		return resolve('/icon/[set]/[name]', { set: parts.set, name: parts.name });
	}

	let theme = $derived(
		data.theme ?? {
			backgroundType: 'color' as const,
			backgroundValue: '#ffffff',
			buttonColor: '#8ec2ee',
			buttonTextColor: '#172554',
			textColor: '#1d39ff',
			buttonRadius: 999,
			fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif'
		}
	);

	let background = $derived(
		theme.backgroundType === 'image'
			? `url("${theme.backgroundValue}") center / cover no-repeat fixed`
			: theme.backgroundValue
	);

	let shellStyle = $derived(
		`--page-bg:${background};--button-color:${theme.buttonColor};--button-text:${theme.buttonTextColor};--page-text:${theme.textColor};--button-radius:${theme.buttonRadius}px;--page-font:${theme.fontFamily}`
	);
</script>

<main class:compact class="public-page" style={shellStyle}>
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
					<h2>{block.title}</h2>
				{:else if block.type === 'text'}
					<div class="text-block">
						{#if block.title}<strong>{block.title}</strong>{/if}
						{#if block.subtitle}<p>{block.subtitle}</p>{/if}
					</div>
				{:else if block.type === 'divider'}
					<hr />
				{:else}
					{@const blockIconUrl = iconUrl(block.icon)}
					<a
						class:disabled={!block.url}
						class="link-button"
						href={block.url ? resolve('/go/[blockId]', { blockId: block.id }) : undefined}
						target={block.url && block.openNewTab ? '_blank' : undefined}
						rel={block.url && block.openNewTab ? 'noreferrer' : undefined}
						aria-disabled={!block.url}
					>
						{#if blockIconUrl}
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
						<span class="link-menu icon-[mdi--dots-vertical]" aria-hidden="true"></span>
					</a>
				{/if}
			{/each}
		</section>
	</div>
</main>

<style>
	.public-page {
		min-height: 100dvh;
		background: var(--page-bg);
		font-family: var(--page-font);
		color: var(--page-text);
		padding: 44px 18px 72px;
	}

	.page-card {
		width: min(100%, 720px);
		margin: 0 auto;
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

	.link-button {
		display: grid;
		grid-template-columns: 42px 1fr 28px;
		align-items: center;
		min-height: 78px;
		padding: 10px 22px;
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
		justify-self: end;
		font-size: 1.3rem;
		opacity: 0.58;
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

	hr {
		width: 72%;
		border: 0;
		border-top: 1px solid color-mix(in srgb, var(--page-text), transparent 72%);
		margin: 10px auto;
	}

	.compact {
		min-height: 0;
		padding: 26px 14px 42px;
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
		min-height: 58px;
		grid-template-columns: 32px 1fr 20px;
		padding: 8px 14px;
		font-size: 0.86rem;
	}

	.compact h2 {
		font-size: 0.88rem;
	}

	@media (max-width: 560px) {
		.public-page {
			padding-top: 30px;
		}

		.page-logo {
			width: 92px;
			height: 92px;
		}

		.link-button {
			min-height: 68px;
			padding-inline: 18px;
		}
	}
</style>
