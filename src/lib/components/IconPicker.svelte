<script lang="ts">
	import { resolve } from '$app/paths';
	import { iconRefLabel, splitIconRef, type IconSet } from '$lib/icons';

	type IconResult = {
		ref: string;
		name: string;
		label: string;
		set: IconSet;
	};

	type SearchResponse = {
		items: IconResult[];
		total: number;
		available: number;
	};

	let { value = $bindable<string | null>(null), name = 'icon' } = $props<{
		value?: string | null;
		name?: string;
	}>();

	let open = $state(false);
	let query = $state('');
	let setFilter = $state<'all' | IconSet>('all');
	let results = $state<IconResult[]>([]);
	let total = $state(0);
	let available = $state(0);
	let loading = $state(false);
	let loadError = $state('');
	let requestVersion = 0;

	let selectedLabel = $derived(iconRefLabel(value));
	let selectedUrl = $derived(iconUrl(value));

	function iconUrl(ref: string | null | undefined) {
		const parts = splitIconRef(ref);
		if (!parts) return null;
		return resolve('/icon/[set]/[name]', { set: parts.set, name: parts.name });
	}

	async function loadIcons(searchQuery: string, filter: 'all' | IconSet) {
		const version = ++requestVersion;
		loading = true;
		loadError = '';
		try {
			const url = new URL(resolve('/admin/api/icons'), window.location.origin);
			if (searchQuery.trim()) url.searchParams.set('q', searchQuery.trim());
			if (filter !== 'all') url.searchParams.set('set', filter);

			const response = await fetch(url);
			if (!response.ok) throw new Error('Không thể tải thư viện icon.');
			const data = (await response.json()) as SearchResponse;
			if (version !== requestVersion) return;
			results = data.items;
			total = data.total;
			available = data.available;
		} catch {
			if (version === requestVersion) loadError = 'Không thể tải thư viện icon.';
		} finally {
			if (version === requestVersion) loading = false;
		}
	}

	function chooseIcon(ref: string) {
		value = ref;
		open = false;
	}

	function clearIcon() {
		value = null;
		open = false;
	}

	$effect(() => {
		if (!open) return;
		const searchQuery = query;
		const filter = setFilter;
		const timer = window.setTimeout(() => void loadIcons(searchQuery, filter), 160);
		return () => window.clearTimeout(timer);
	});
</script>

<div class="icon-picker">
	<span class="field-title">Icon</span>
	<input type="hidden" {name} value={value ?? ''} />
	<button class="picker-trigger" type="button" onclick={() => (open = !open)} aria-expanded={open}>
		<span class="selected-preview">
			{#if selectedUrl}
				<span class="icon-mask" style={`--icon-image: url("${selectedUrl}")`} aria-hidden="true"
				></span>
			{:else}
				<span class="empty-icon" aria-hidden="true">−</span>
			{/if}
		</span>
		<span class="selected-copy">
			<strong>{selectedLabel}</strong>
			<small>{value ? 'Bấm để đổi icon' : 'Tìm và chọn trong thư viện'}</small>
		</span>
		<span class="caret" aria-hidden="true">⌄</span>
	</button>

	{#if open}
		<div class="picker-panel">
			<div class="picker-toolbar">
				<input
					type="search"
					placeholder="Tìm icon: home, youtube, phone, chùa…"
					bind:value={query}
					autocomplete="off"
				/>
				<select bind:value={setFilter} aria-label="Bộ icon">
					<option value="all">Tất cả</option>
					<option value="mdi">Giao diện</option>
					<option value="si">Thương hiệu</option>
				</select>
			</div>

			<div class="picker-meta">
				{#if loading}
					<span>Đang tìm…</span>
				{:else if query.trim()}
					<span>{total.toLocaleString('vi-VN')} kết quả</span>
				{:else}
					<span>Icon phổ biến · {available.toLocaleString('vi-VN')} icon khả dụng</span>
				{/if}
				<small>MDI + Simple Icons</small>
			</div>

			{#if loadError}
				<p class="picker-error">{loadError}</p>
			{:else if !loading && results.length === 0}
				<div class="empty-results">Không tìm thấy icon phù hợp. Hãy thử từ khóa khác.</div>
			{:else}
				<div class="icon-grid">
					{#each results as icon (icon.ref)}
						<button
							type="button"
							class:selected={value === icon.ref}
							onclick={() => chooseIcon(icon.ref)}
							title={`${icon.label} · ${icon.set === 'mdi' ? 'Material Design Icons' : 'Simple Icons'}`}
						>
							<span
								class="icon-mask"
								style={`--icon-image: url("${iconUrl(icon.ref)}")`}
								aria-hidden="true"
							></span>
							<small>{icon.label}</small>
						</button>
					{/each}
				</div>
			{/if}

			<div class="picker-actions">
				<button type="button" class="clear" onclick={clearIcon}>Không dùng icon</button>
				<button type="button" onclick={() => (open = false)}>Đóng</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.icon-picker {
		position: relative;
		display: grid;
		gap: 6px;
		min-width: 0;
	}

	.field-title {
		font-size: 0.78rem;
		font-weight: 700;
		color: #475569;
	}

	.picker-trigger {
		width: 100%;
		min-height: 46px;
		display: grid;
		grid-template-columns: 34px minmax(0, 1fr) 18px;
		gap: 9px;
		align-items: center;
		padding: 6px 10px;
		border: 1px solid #cbd5e1;
		border-radius: 9px;
		background: white;
		color: #0f172a;
		text-align: left;
		cursor: pointer;
	}

	.picker-trigger:hover,
	.picker-trigger[aria-expanded='true'] {
		border-color: #60a5fa;
		box-shadow: 0 0 0 3px rgb(59 130 246 / 0.09);
	}

	.selected-preview {
		width: 32px;
		height: 32px;
		display: grid;
		place-items: center;
		border-radius: 8px;
		background: #eff6ff;
		color: #1d4ed8;
	}

	.icon-mask {
		display: inline-block;
		width: 22px;
		height: 22px;
		background: currentColor;
		-webkit-mask: var(--icon-image) center / contain no-repeat;
		mask: var(--icon-image) center / contain no-repeat;
	}

	.empty-icon {
		color: #94a3b8;
		font-size: 1.2rem;
	}

	.selected-copy {
		display: grid;
		min-width: 0;
	}

	.selected-copy strong,
	.selected-copy small {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.selected-copy strong {
		font-size: 0.8rem;
		font-weight: 700;
	}

	.selected-copy small {
		margin-top: 1px;
		color: #94a3b8;
		font-size: 0.67rem;
		font-weight: 500;
	}

	.caret {
		justify-self: end;
		color: #64748b;
		font-size: 1rem;
	}

	.picker-panel {
		position: absolute;
		z-index: 50;
		top: calc(100% + 8px);
		left: 0;
		width: min(540px, calc(100vw - 56px));
		padding: 12px;
		border: 1px solid #dbe4f0;
		border-radius: 14px;
		background: white;
		box-shadow: 0 18px 50px rgb(15 23 42 / 0.2);
	}

	.picker-toolbar {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 126px;
		gap: 8px;
	}

	.picker-toolbar input,
	.picker-toolbar select {
		width: 100%;
		border: 1px solid #cbd5e1;
		border-radius: 9px;
		padding: 9px 10px;
		background: white;
		color: #0f172a;
		font: inherit;
		font-size: 0.78rem;
	}

	.picker-meta {
		display: flex;
		justify-content: space-between;
		gap: 10px;
		padding: 9px 2px 8px;
		color: #64748b;
		font-size: 0.7rem;
	}

	.picker-meta small {
		color: #94a3b8;
	}

	.icon-grid {
		display: grid;
		grid-template-columns: repeat(6, minmax(0, 1fr));
		gap: 6px;
		max-height: 320px;
		overflow: auto;
		padding: 2px;
	}

	.icon-grid button {
		min-width: 0;
		height: 72px;
		display: grid;
		place-items: center;
		align-content: center;
		gap: 5px;
		padding: 7px 4px;
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		background: #f8fafc;
		color: #334155;
		cursor: pointer;
	}

	.icon-grid button:hover {
		border-color: #93c5fd;
		background: #eff6ff;
		color: #1d4ed8;
	}

	.icon-grid button.selected {
		border-color: #2563eb;
		background: #dbeafe;
		color: #1d4ed8;
		box-shadow: 0 0 0 2px rgb(37 99 235 / 0.12);
	}

	.icon-grid small {
		width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 0.6rem;
		font-weight: 600;
		text-align: center;
	}

	.picker-actions {
		display: flex;
		justify-content: space-between;
		gap: 8px;
		padding-top: 10px;
	}

	.picker-actions button {
		border: 1px solid #cbd5e1;
		border-radius: 9px;
		padding: 7px 10px;
		background: white;
		color: #334155;
		font: inherit;
		font-size: 0.72rem;
		font-weight: 700;
		cursor: pointer;
	}

	.picker-actions .clear {
		color: #64748b;
	}

	.picker-error,
	.empty-results {
		margin: 0;
		padding: 28px 12px;
		border-radius: 10px;
		background: #f8fafc;
		color: #64748b;
		font-size: 0.76rem;
		text-align: center;
	}

	.picker-error {
		color: #b91c1c;
	}

	@media (max-width: 640px) {
		.picker-panel {
			position: fixed;
			top: 50%;
			left: 50%;
			width: min(94vw, 540px);
			transform: translate(-50%, -50%);
		}

		.picker-toolbar {
			grid-template-columns: 1fr;
		}

		.icon-grid {
			grid-template-columns: repeat(4, minmax(0, 1fr));
			max-height: 52vh;
		}
	}
</style>
