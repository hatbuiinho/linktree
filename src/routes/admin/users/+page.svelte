<script lang="ts">
	let { data, form } = $props();
	let showCreate = $state(false);
	let editingId = $state<string | null>(null);
	let resettingId = $state<string | null>(null);
	let createPassword = $state('');
	let resetPassword = $state('');

	function randomPassword() {
		const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
		const values = new Uint32Array(18);
		crypto.getRandomValues(values);
		return Array.from(values, (value) => alphabet[value % alphabet.length]).join('');
	}
</script>

<svelte:head><title>Người dùng · TTPQ Admin</title></svelte:head>

<main class="admin-page">
	<header class="page-topbar">
		<div>
			<p class="eyebrow">TTPQ LINKS</p>
			<h1>Người dùng</h1>
			<p>Quản lý tài khoản được phép truy cập trang quản trị.</p>
		</div>
		<button class="primary" type="button" onclick={() => (showCreate = !showCreate)}
			><span class="icon-[mdi--plus]" aria-hidden="true"></span> Tạo user</button
		>
	</header>

	{#if form?.error}<div class="alert error">{form.error}</div>{/if}
	{#if form?.message}<div class="alert success">{form.message}</div>{/if}

	{#if showCreate}
		<form method="POST" action="?/create" class="panel create-form">
			<label
				>Tên hiển thị <input
					name="displayName"
					maxlength="100"
					placeholder="Ví dụ: Nguyễn Văn A"
				/></label
			>
			<label
				>Email <input
					name="email"
					type="email"
					maxlength="254"
					autocomplete="off"
					required
				/></label
			>
			<label>
				Quyền
				<select name="role">
					<option value="editor">Editor</option>
					<option value="admin">Admin</option>
				</select>
			</label>
			<label class="password-field">
				Mật khẩu
				<span class="password-row">
					<input
						name="password"
						type="text"
						minlength="10"
						maxlength="128"
						bind:value={createPassword}
						autocomplete="new-password"
						required
					/>
					<button type="button" onclick={() => (createPassword = randomPassword())}
						>Tạo ngẫu nhiên</button
					>
				</span>
			</label>
			<div class="form-actions"><button class="primary">Tạo người dùng</button></div>
		</form>
	{/if}

	<section class="panel table-wrap">
		<table>
			<thead>
				<tr>
					<th>Người dùng</th>
					<th>Email</th>
					<th>Quyền</th>
					<th>Trạng thái</th>
					<th>Đăng nhập cuối</th>
					<th>Thao tác</th>
				</tr>
			</thead>
			<tbody>
				{#each data.users as user (user.id)}
					<tr class:inactive={!user.isActive}>
						<td><strong>{user.displayName || 'Chưa đặt tên'}</strong></td>
						<td>{user.email}</td>
						<td
							><span class:admin={user.role === 'admin'} class="badge"
								>{user.role === 'admin' ? 'Admin' : 'Editor'}</span
							></td
						>
						<td
							><span class:active={user.isActive} class="status"
								>{user.isActive ? 'Hoạt động' : 'Đã khóa'}</span
							></td
						>
						<td
							>{user.lastLoginAt
								? new Date(user.lastLoginAt).toLocaleString('vi-VN')
								: 'Chưa đăng nhập'}</td
						>
						<td>
							<div class="row-actions">
								<button
									type="button"
									onclick={() => (editingId = editingId === user.id ? null : user.id)}>Sửa</button
								>
								<button
									type="button"
									onclick={() => {
										resettingId = resettingId === user.id ? null : user.id;
										resetPassword = '';
									}}>Đổi mật khẩu</button
								>
								<form method="POST" action="?/toggleActive">
									<input type="hidden" name="id" value={user.id} />
									<button>{user.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}</button>
								</form>
								<form
									method="POST"
									action="?/delete"
									onsubmit={(event) =>
										!confirm(`Xóa user ${user.email}?`) && event.preventDefault()}
								>
									<input type="hidden" name="id" value={user.id} />
									<button class="danger">Xóa</button>
								</form>
							</div>
						</td>
					</tr>
					{#if editingId === user.id}
						<tr class="editor-row">
							<td colspan="6">
								<form method="POST" action="?/update" class="inline-form">
									<input type="hidden" name="id" value={user.id} />
									<label
										>Tên hiển thị <input
											name="displayName"
											maxlength="100"
											value={user.displayName || ''}
										/></label
									>
									<label
										>Email <input
											name="email"
											type="email"
											maxlength="254"
											value={user.email}
											required
										/></label
									>
									<label
										>Quyền
										<select name="role" value={user.role}>
											<option value="editor">Editor</option>
											<option value="admin">Admin</option>
										</select>
									</label>
									<div class="form-actions"><button class="primary">Lưu thay đổi</button></div>
								</form>
							</td>
						</tr>
					{/if}
					{#if resettingId === user.id}
						<tr class="editor-row">
							<td colspan="6">
								<form method="POST" action="?/resetPassword" class="reset-form">
									<input type="hidden" name="id" value={user.id} />
									<label
										>Mật khẩu mới
										<span class="password-row">
											<input
												name="password"
												type="text"
												minlength="10"
												maxlength="128"
												bind:value={resetPassword}
												autocomplete="new-password"
												required
											/>
											<button type="button" onclick={() => (resetPassword = randomPassword())}
												>Tạo ngẫu nhiên</button
											>
										</span>
									</label>
									<button class="primary">Đổi mật khẩu</button>
								</form>
							</td>
						</tr>
					{/if}
				{/each}
			</tbody>
		</table>
	</section>
</main>

<style>
	.admin-page {
		max-width: 1240px;
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
	button {
		border: 1px solid #cbd5e1;
		border-radius: 10px;
		background: white;
		color: #334155;
		padding: 9px 12px;
		font-weight: 650;
		cursor: pointer;
	}
	button .icon-\[mdi--plus\] {
		vertical-align: -0.14em;
	}
	.primary {
		background: #1d4ed8;
		border-color: #1d4ed8;
		color: white;
	}
	.danger {
		color: #b91c1c;
		border-color: #fecaca;
	}
	.panel {
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 18px;
		box-shadow: 0 6px 22px rgb(15 23 42 / 0.04);
	}
	.create-form {
		display: grid;
		grid-template-columns: 1.1fr 1.3fr 0.7fr 1.6fr auto;
		gap: 14px;
		align-items: end;
		padding: 18px;
		margin-bottom: 22px;
	}
	label {
		display: grid;
		gap: 7px;
		font-size: 0.82rem;
		font-weight: 700;
		color: #475569;
	}
	input,
	select {
		min-width: 0;
		border: 1px solid #cbd5e1;
		border-radius: 10px;
		padding: 10px 12px;
		background: white;
		color: #0f172a;
	}
	.password-row {
		display: flex;
		gap: 8px;
	}
	.password-row input {
		flex: 1;
	}
	.form-actions {
		display: flex;
		align-items: end;
	}
	.alert {
		margin-bottom: 18px;
		padding: 12px 14px;
		border-radius: 12px;
	}
	.alert.error {
		background: #fef2f2;
		color: #b91c1c;
	}
	.alert.success {
		background: #ecfdf5;
		color: #047857;
	}
	.table-wrap {
		overflow-x: auto;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		min-width: 920px;
	}
	th,
	td {
		text-align: left;
		padding: 15px 16px;
		border-bottom: 1px solid #e2e8f0;
		vertical-align: middle;
	}
	th {
		color: #64748b;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	td {
		font-size: 0.87rem;
		color: #475569;
	}
	tbody tr:last-child td {
		border-bottom: 0;
	}
	tr.inactive > td {
		background: #f8fafc;
		color: #94a3b8;
	}
	.badge,
	.status {
		display: inline-flex;
		border-radius: 999px;
		padding: 4px 8px;
		background: #f1f5f9;
		color: #475569;
		font-size: 0.72rem;
		font-weight: 750;
	}
	.badge.admin {
		background: #eff6ff;
		color: #1d4ed8;
	}
	.status.active {
		background: #ecfdf5;
		color: #047857;
	}
	.row-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.row-actions button {
		padding: 7px 9px;
		font-size: 0.78rem;
	}
	.editor-row td {
		background: #f8fafc;
	}
	.inline-form {
		display: grid;
		grid-template-columns: 1fr 1.3fr 0.7fr auto;
		gap: 12px;
		align-items: end;
	}
	.reset-form {
		display: flex;
		gap: 12px;
		align-items: end;
		max-width: 700px;
	}
	.reset-form label {
		flex: 1;
	}
	@media (max-width: 900px) {
		.create-form {
			grid-template-columns: 1fr 1fr;
		}
		.inline-form {
			grid-template-columns: 1fr 1fr;
		}
	}
	@media (max-width: 760px) {
		.admin-page {
			padding: 28px 18px 56px;
		}
		.page-topbar {
			align-items: start;
			flex-direction: column;
		}
		.create-form,
		.inline-form {
			grid-template-columns: 1fr;
		}
		.reset-form {
			align-items: stretch;
			flex-direction: column;
		}
	}
</style>
