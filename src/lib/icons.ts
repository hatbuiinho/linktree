export type IconSet = 'mdi' | 'si';

const legacyIconRefs: Record<string, string> = {
	globe: 'mdi:web',
	youtube: 'mdi:youtube',
	facebook: 'mdi:facebook',
	instagram: 'mdi:instagram',
	zalo: 'si:zalo',
	music: 'mdi:music',
	tiktok: 'mdi:tiktok',
	email: 'mdi:email',
	phone: 'mdi:phone',
	map: 'mdi:map-marker',
	calendar: 'mdi:calendar',
	document: 'mdi:file-document',
	download: 'mdi:download',
	link: 'mdi:link-variant',
	chevrons: 'mdi:chevron-double-right'
};

export function normalizeIconRef(value: string | null | undefined) {
	const trimmed = value?.trim();
	if (!trimmed) return null;
	if (legacyIconRefs[trimmed]) return legacyIconRefs[trimmed];
	if (/^(mdi|si):[a-z0-9-]+$/i.test(trimmed)) return trimmed.toLowerCase();
	return `mdi:${trimmed.toLowerCase()}`;
}

export function splitIconRef(value: string | null | undefined) {
	const ref = normalizeIconRef(value);
	if (!ref) return null;
	const separator = ref.indexOf(':');
	return {
		ref,
		set: ref.slice(0, separator) as IconSet,
		name: ref.slice(separator + 1)
	};
}

export function humanizeIconName(name: string) {
	return name
		.split('-')
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

export function iconRefLabel(value: string | null | undefined) {
	const parts = splitIconRef(value);
	if (!parts) return 'Không dùng icon';
	return humanizeIconName(parts.name);
}
