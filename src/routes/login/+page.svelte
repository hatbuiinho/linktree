<script lang="ts">
	let { data, form } = $props();
</script>

<svelte:head><title>Đăng nhập quản trị · TTPQ</title></svelte:head>

<main class="login-shell">
	<form method="POST" class="login-card">
		<div class="brand">☸</div>
		<h1>Quản trị TTPQ</h1>
		<p>Đăng nhập để quản lý các trang chia sẻ.</p>
		<input type="hidden" name="next" value={data.next} />
		<label>
			<span>Email</span>
			<input name="email" type="email" autocomplete="username" value={form?.email || ''} required />
		</label>
		<label>
			<span>Mật khẩu</span>
			<input name="password" type="password" autocomplete="current-password" required />
		</label>
		{#if form?.error}<div class="error">{form.error}</div>{/if}
		<button type="submit">Đăng nhập</button>
	</form>
</main>

<style>
	.login-shell {
		min-height: 100dvh;
		display: grid;
		place-items: center;
		padding: 24px;
		background: linear-gradient(145deg, #eff6ff, #f7fee7 48%, #fff7ed);
	}

	.login-card {
		width: min(100%, 420px);
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 24px;
		padding: 34px;
		box-shadow: 0 24px 80px rgb(15 23 42 / 0.1);
	}

	.brand {
		width: 58px;
		height: 58px;
		display: grid;
		place-items: center;
		border-radius: 18px;
		background: #eff6ff;
		font-size: 30px;
		color: #1d4ed8;
		margin-bottom: 18px;
	}

	h1 {
		margin: 0;
		font-size: 1.7rem;
		color: #0f172a;
	}

	p {
		margin: 8px 0 24px;
		color: #64748b;
	}

	label {
		display: grid;
		gap: 7px;
		margin-top: 16px;
		font-weight: 650;
		color: #334155;
	}

	input {
		width: 100%;
		border: 1px solid #cbd5e1;
		border-radius: 12px;
		padding: 12px 14px;
		outline: none;
	}

	input:focus {
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgb(59 130 246 / 0.12);
	}

	button {
		width: 100%;
		border: 0;
		border-radius: 12px;
		padding: 13px 16px;
		margin-top: 22px;
		background: #1d4ed8;
		color: white;
		font-weight: 750;
		cursor: pointer;
	}

	.error {
		margin-top: 14px;
		padding: 10px 12px;
		border-radius: 10px;
		background: #fef2f2;
		color: #b91c1c;
		font-size: 0.9rem;
	}
</style>
