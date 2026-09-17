<script lang="ts">
	import { resolve } from '$app/paths';

	let { data, form } = $props();
	let showCreate = $state(false);
	let copiedId = $state<string | null>(null);

	async function copyPageUrl(id: string, path: string) {
		await navigator.clipboard.writeText(`${window.location.origin}${path}`);
		copiedId = id;
		setTimeout(() => (copiedId = null), 1400);
	}
</script>

<svelte:head><title>Trang chia sẻ · TTPQ Admin</title></svelte:head>

<main class="admin-page">
	<header class="page-topbar">
		<div>
			<p class="eyebrow">TTPQ LINKS</p>
			<h1>Trang chia sẻ</h1>
			<p>Quản lý trang chính và các trang con dùng để chia sẻ liên kết.</p>
		</div>
		<button class="primary" onclick={() => (showCreate = !showCreate)}>+ Tạo trang</button>
	</header>

	{#if form?.error}<div class="alert">{form.error}</div>{/if}

	{#if showCreate}
		<form method="POST" action="?/create" class="create-card">
			<label>Tên trang <input name="title" placeholder="Ví dụ: NGHI THỨC" required /></label>
			<label>Slug <input name="slug" placeholder="nghi-thuc (có thể để trống)" /></label>
			<div class="actions"><button class="primary">Tạo và chỉnh sửa</button></div>
		</form>
	{/if}

	<section class="page-grid">
		{#each data.pages as page (page.id)}
			<article class:home={page.isHome} class="page-item">
				<div class="status-row">
					<span class:published={page.status === 'published'} class="status"
						>{page.status === 'published' ? 'Đã xuất bản' : 'Bản nháp'}</span
					>
					{#if page.isHome}<span class="home-badge">★ Trang chính</span>{/if}
				</div>
				<h2>{page.title}</h2>
				<a
					class="page-url"
					href={page.isHome ? resolve('/') : resolve('/p/[slug]', { slug: page.slug })}
					target="_blank"
					rel="noreferrer"
				>
					{page.isHome ? 'ttpq.hatbuinho.me' : `ttpq.hatbuinho.me/p/${page.slug}`}
				</a>
				<div class="metric"><strong>{page.clicks}</strong><span>lượt click</span></div>
				<div class="card-actions">
					<a class="edit" href={resolve('/admin/pages/[id]', { id: page.id })}>Chỉnh sửa</a>
					<button
						type="button"
						onclick={() => copyPageUrl(page.id, page.isHome ? '/' : `/p/${page.slug}`)}
						>{copiedId === page.id ? 'Đã copy ✓' : 'Copy URL'}</button
					>
					<form method="POST" action="?/toggle">
						<input type="hidden" name="id" value={page.id} />
						<button>{page.status === 'published' ? 'Ẩn trang' : 'Xuất bản'}</button>
					</form>
					<form method="POST" action="?/clone">
						<input type="hidden" name="id" value={page.id} />
						<button>Nhân bản</button>
					</form>
					{#if !page.isHome}
						<form
							method="POST"
							action="?/delete"
							onsubmit={(event) => !confirm('Xóa trang này?') && event.preventDefault()}
						>
							<input type="hidden" name="id" value={page.id} />
							<button class="danger">Xóa</button>
						</form>
					{/if}
				</div>
			</article>
		{/each}
	</section>
</main>

<style>
	.admin-page {
		max-width: 1180px;
		margin: 0 auto;
		padding: 40px 32px 72px;
	}

	.page-topbar {
		display: flex;
		justify-content: space-between;
		gap: 20px;
		align-items: end;
		margin-bottom: 28px;
	}

	.eyebrow {
		font-size: 0.72rem;
		font-weight: 800;
		letter-spacing: 0.14em;
		color: #2563eb !important;
		margin: 0 0 8px !important;
	}

	h1 {
		margin: 0;
		font-size: 2rem;
	}

	.page-topbar p {
		margin: 7px 0 0;
		color: #64748b;
	}

	button,
	.edit {
		border: 1px solid #cbd5e1;
		border-radius: 10px;
		background: white;
		color: #334155;
		padding: 9px 12px;
		font-weight: 650;
		text-decoration: none;
		cursor: pointer;
	}

	.primary,
	.edit {
		background: #1d4ed8;
		border-color: #1d4ed8;
		color: white;
	}

	.create-card {
		display: grid;
		grid-template-columns: 1fr 1fr auto;
		gap: 14px;
		align-items: end;
		background: white;
		border: 1px solid #dbeafe;
		box-shadow: 0 12px 38px rgb(30 64 175 / 0.08);
		border-radius: 18px;
		padding: 18px;
		margin-bottom: 22px;
	}

	label {
		display: grid;
		gap: 7px;
		font-size: 0.85rem;
		font-weight: 700;
		color: #475569;
	}

	input {
		border: 1px solid #cbd5e1;
		border-radius: 10px;
		padding: 10px 12px;
	}

	.page-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
		gap: 18px;
	}

	.page-item {
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 18px;
		padding: 20px;
		box-shadow: 0 6px 22px rgb(15 23 42 / 0.04);
	}

	.page-item.home {
		border-color: #93c5fd;
	}

	.status-row {
		display: flex;
		gap: 8px;
		align-items: center;
		min-height: 24px;
	}

	.status,
	.home-badge {
		font-size: 0.72rem;
		font-weight: 750;
		border-radius: 99px;
		padding: 4px 8px;
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

	.page-item h2 {
		margin: 16px 0 6px;
		font-size: 1.15rem;
	}

	.page-url {
		display: block;
		color: #2563eb;
		font-size: 0.84rem;
		text-decoration: none;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.metric {
		display: flex;
		align-items: baseline;
		gap: 6px;
		margin: 24px 0;
	}

	.metric strong {
		font-size: 1.8rem;
	}

	.metric span {
		color: #64748b;
		font-size: 0.85rem;
	}

	.card-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.danger {
		color: #b91c1c;
		border-color: #fecaca;
	}

	.alert {
		margin-bottom: 18px;
		background: #fef2f2;
		color: #b91c1c;
		padding: 12px 14px;
		border-radius: 12px;
	}

	@media (max-width: 760px) {
		.admin-page {
			padding: 28px 18px 56px;
		}

		.page-topbar {
			align-items: start;
			flex-direction: column;
		}

		.create-card {
			grid-template-columns: 1fr;
		}
	}
</style>
