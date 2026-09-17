<script lang="ts">
	import { resolve } from '$app/paths';

	let { data, children } = $props();
</script>

<div class="admin-shell">
	<aside>
		<a class="admin-brand" href={resolve('/admin')}>
			<span>☸</span>
			<div><strong>TTPQ Links</strong><small>Quản trị</small></div>
		</a>
		<nav>
			<a href={resolve('/admin')}>▦ <span>Trang chia sẻ</span></a>
			<a href={resolve('/')} target="_blank" rel="noreferrer">↗ <span>Xem trang chính</span></a>
		</nav>
		<div class="admin-user">
			<small>Đang đăng nhập</small>
			<strong>{data.user?.email}</strong>
			<form method="POST" action={resolve('/logout')}><button>Đăng xuất</button></form>
		</div>
	</aside>
	<div class="admin-main">
		{@render children()}
	</div>
</div>

<style>
	.admin-shell {
		min-height: 100dvh;
		display: grid;
		grid-template-columns: 240px minmax(0, 1fr);
		background: #f8fafc;
		color: #0f172a;
	}

	aside {
		position: sticky;
		top: 0;
		height: 100dvh;
		background: #0f172a;
		color: white;
		padding: 20px 16px;
		display: flex;
		flex-direction: column;
	}

	.admin-brand {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 8px;
		color: white;
		text-decoration: none;
	}

	.admin-brand > span {
		width: 42px;
		height: 42px;
		display: grid;
		place-items: center;
		background: #1d4ed8;
		border-radius: 13px;
		font-size: 24px;
	}

	.admin-brand div {
		display: grid;
	}

	.admin-brand small {
		color: #94a3b8;
		margin-top: 2px;
	}

	nav {
		display: grid;
		gap: 6px;
		margin-top: 28px;
	}

	nav a {
		display: flex;
		gap: 10px;
		align-items: center;
		padding: 11px 12px;
		border-radius: 10px;
		color: #cbd5e1;
		text-decoration: none;
	}

	nav a:hover {
		background: #1e293b;
		color: white;
	}

	.admin-user {
		margin-top: auto;
		padding: 12px 8px 4px;
		display: grid;
		gap: 5px;
		min-width: 0;
	}

	.admin-user small {
		color: #94a3b8;
	}

	.admin-user strong {
		font-size: 0.86rem;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.admin-user button {
		border: 0;
		background: transparent;
		color: #93c5fd;
		padding: 6px 0 0;
		cursor: pointer;
		font-weight: 650;
	}

	.admin-main {
		min-width: 0;
	}

	@media (max-width: 780px) {
		.admin-shell {
			grid-template-columns: 1fr;
		}

		aside {
			position: static;
			height: auto;
			padding: 12px 16px;
			flex-direction: row;
			align-items: center;
			gap: 12px;
		}

		.admin-brand div,
		.admin-user small,
		.admin-user strong,
		nav span {
			display: none;
		}

		nav {
			display: flex;
			margin: 0 0 0 auto;
		}

		.admin-user {
			margin: 0;
			padding: 0;
		}
	}
</style>
