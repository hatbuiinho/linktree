<script lang="ts">
	import { navigating } from '$app/state';
	import { onMount } from 'svelte';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();

	onMount(() => {
		function showNativeSubmitLoading(event: SubmitEvent) {
			if (event.defaultPrevented || !(event.submitter instanceof HTMLButtonElement)) return;
			event.submitter.classList.add('app-loading');
			event.submitter.setAttribute('aria-busy', 'true');
		}

		document.addEventListener('submit', showNativeSubmitLoading);
		return () => document.removeEventListener('submit', showNativeSubmitLoading);
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{#if navigating.to}
	<div class="route-progress" role="progressbar" aria-label="Đang tải trang">
		<span></span>
	</div>
{/if}
{@render children()}
