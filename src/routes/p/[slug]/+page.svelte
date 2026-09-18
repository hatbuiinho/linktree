<script lang="ts">
	import PublicPage from '$lib/components/PublicPage.svelte';
	let { data } = $props();
</script>

<svelte:head>
	<title>{data.page.title}</title>
	<meta name="description" content={data.page.description || data.page.title} />
	<link rel="canonical" href={data.canonicalUrl} />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content={data.page.title} />
	<meta property="og:url" content={data.canonicalUrl} />
	<meta property="og:title" content={data.page.title} />
	<meta property="og:description" content={data.page.description || data.page.title} />
	{#if data.previewImage}
		<meta property="og:image" content={data.previewImage} />
		<meta name="twitter:card" content="summary_large_image" />
		<meta name="twitter:image" content={data.previewImage} />
	{:else}
		<meta name="twitter:card" content="summary" />
	{/if}
	<meta name="twitter:title" content={data.page.title} />
	<meta name="twitter:description" content={data.page.description || data.page.title} />
</svelte:head>

<PublicPage {data} />
