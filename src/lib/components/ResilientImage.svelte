<script lang="ts">
	let {
		primaryUrl = null,
		fallbackUrl = null,
		alt = '',
		class: className = '',
		loading = 'lazy',
		width,
		height,
		fetchpriority,
		decoding = 'async'
	}: {
		primaryUrl?: string | null;
		fallbackUrl?: string | null;
		alt?: string;
		class?: string;
		loading?: 'eager' | 'lazy';
		width?: number | string;
		height?: number | string;
		fetchpriority?: 'high' | 'low' | 'auto';
		decoding?: 'async' | 'sync' | 'auto';
	} = $props();

	let src = $state('');
	let triedFallback = $state(false);

	$effect(() => {
		src = primaryUrl || fallbackUrl || '';
		triedFallback = false;
	});

	function handleError() {
		if (!triedFallback && fallbackUrl && src !== fallbackUrl) {
			triedFallback = true;
			src = fallbackUrl;
			return;
		}
		src = '';
	}
</script>

{#if src}
	<img
		class={className}
		{src}
		{alt}
		{loading}
		{width}
		{height}
		{fetchpriority}
		{decoding}
		onerror={handleError}
	/>
{/if}
