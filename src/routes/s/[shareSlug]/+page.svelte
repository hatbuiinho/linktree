<script lang="ts">
	import { onMount } from 'svelte';

	let { data } = $props();
	let title = $derived(data.block.title || data.page.title);
	let description = $derived(data.block.subtitle || data.page.description || data.page.title);
	let parentPageBlockUrl = $derived(`${data.pageUrl}?block=${encodeURIComponent(data.block.id)}`);

	// Keep this lightweight preview route for social crawlers to read this block's OG tags.
	// Real visitors are sent to the parent Linktree and its shared block.
	onMount(() => {
		window.location.replace(parentPageBlockUrl);
	});
</script>

<svelte:head>
	<title>{title} · {data.page.title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={data.shareUrl} />
	<meta property="og:type" content="website" />
	<meta property="og:url" content={data.shareUrl} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content={data.ogImageUrl} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:image" content={data.ogImageUrl} />
</svelte:head>

<main>
	<section>
		{#if data.previewImage}<img src={data.previewImage} alt="" />{/if}
		<p>{data.page.title}</p>
		<h1>{title}</h1>
		{#if data.block.subtitle}<div>{data.block.subtitle}</div>{/if}
		<a href={parentPageBlockUrl}>Mở trang liên kết <span aria-hidden="true">→</span></a>
	</section>
</main>

<style>
	main { display: grid; min-height: 100dvh; place-items: center; padding: 28px; background: #f8fafc; font-family: Inter, ui-sans-serif, system-ui, sans-serif; color: #0f172a; }
	section { width: min(100%, 440px); overflow: hidden; border: 1px solid #e2e8f0; border-radius: 20px; background: white; box-shadow: 0 18px 46px rgb(15 23 42 / 0.1); text-align: center; }
	img { display: block; width: 100%; aspect-ratio: 1.91 / 1; object-fit: cover; background: #e2e8f0; }
	p { margin: 22px 24px 5px; font-size: .75rem; font-weight: 750; color: #64748b; }
	h1 { margin: 0 24px; font-size: 1.35rem; }
	div { margin: 9px 24px 0; color: #475569; }
	a { display: inline-flex; gap: 7px; align-items: center; justify-content: center; margin: 22px 24px 24px; padding: 12px 18px; border-radius: 12px; background: #2563eb; color: white; font-weight: 750; text-decoration: none; }
</style>
