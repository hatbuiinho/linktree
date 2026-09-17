<script lang="ts">
	import PublicPage from '$lib/components/PublicPage.svelte';
	let { data } = $props();
</script>

<svelte:head>
	<title>{data.page.title}</title>
	<meta name="description" content={data.page.description || data.page.title} />
</svelte:head>

<PublicPage {data} />
