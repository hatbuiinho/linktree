export function shareTitleSlug(value: string | null | undefined) {
	const slug = (value || 'link')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/đ/g, 'd')
		.replace(/Đ/g, 'D')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 56)
		.replace(/-+$/g, '');

	return slug || 'link';
}

export function blockShareSlug(block: { title: string | null; shareCode: string }) {
	return `${shareTitleSlug(block.title)}-${block.shareCode.toLowerCase()}`;
}

export function shareCodeFromSlug(value: string) {
	const match = value.match(/(?:^|-)([A-Za-z0-9]{8})$/);
	return match?.[1] ?? null;
}
