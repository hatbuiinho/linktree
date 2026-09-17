import { icons as mdiCollection } from '@iconify-json/mdi';
import { icons as simpleIconsCollection } from '@iconify-json/simple-icons';
import { humanizeIconName, type IconSet } from '$lib/icons';

type IconData = {
	body: string;
	width?: number;
	height?: number;
};

type IconCollection = {
	width?: number;
	height?: number;
	icons: Record<string, IconData>;
};

export type IconSearchResult = {
	ref: string;
	name: string;
	label: string;
	set: IconSet;
};

const collections: Record<IconSet, IconCollection> = {
	mdi: mdiCollection as IconCollection,
	si: simpleIconsCollection as IconCollection
};

const allIcons: IconSearchResult[] = (Object.keys(collections) as IconSet[]).flatMap((set) =>
	Object.keys(collections[set].icons).map((name) => ({
		ref: `${set}:${name}`,
		name,
		label: humanizeIconName(name),
		set
	}))
);

const popularRefs = [
	'mdi:web',
	'mdi:link-variant',
	'mdi:home',
	'mdi:account',
	'mdi:information-outline',
	'mdi:email',
	'mdi:phone',
	'mdi:map-marker',
	'mdi:calendar',
	'mdi:file-document',
	'mdi:download',
	'mdi:qrcode',
	'mdi:book-open-page-variant',
	'mdi:play-circle',
	'mdi:image',
	'mdi:bell',
	'mdi:heart',
	'mdi:star',
	'mdi:share-variant',
	'mdi:youtube',
	'mdi:facebook',
	'mdi:instagram',
	'mdi:tiktok',
	'si:youtube',
	'si:facebook',
	'si:instagram',
	'si:tiktok',
	'si:zalo',
	'si:telegram',
	'si:whatsapp',
	'si:spotify',
	'si:googlemaps'
];

const popularIcons = popularRefs
	.map((ref) => allIcons.find((icon) => icon.ref === ref))
	.filter((icon): icon is IconSearchResult => Boolean(icon));

const vietnameseSearchAliases: Record<string, string> = {
	chua: 'temple buddhist',
	phat: 'temple buddhist',
	'phat giao': 'temple buddhist',
	'trang chu': 'home',
	website: 'web',
	'lien ket': 'link',
	'dien thoai': 'phone',
	'thu dien tu': 'email',
	'ban do': 'map marker',
	'dia diem': 'map marker',
	lich: 'calendar',
	'tai lieu': 'file document',
	'tai xuong': 'download',
	'am nhac': 'music',
	video: 'video play',
	anh: 'image',
	'chia se': 'share',
	'thong bao': 'bell',
	'nguoi dung': 'account'
};

function normalizeSearch(value: string) {
	return value
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.replace(/[đĐ]/g, 'd')
		.toLowerCase()
		.trim();
}

function queryTerms(query: string) {
	const normalized = normalizeSearch(query);
	if (!normalized) return [];
	const translated = vietnameseSearchAliases[normalized];
	return normalizeSearch(translated ?? normalized)
		.split(/[\s:_-]+/)
		.filter(Boolean);
}

function scoreIcon(icon: IconSearchResult, terms: string[]) {
	const name = normalizeSearch(icon.name);
	const words = normalizeSearch(icon.label);
	const haystack = `${name.replaceAll('-', ' ')} ${words}`;
	if (!terms.every((term) => haystack.includes(term))) return null;

	const compactQuery = terms.join('-');
	if (name === compactQuery) return 0;
	if (name.startsWith(compactQuery)) return 5;
	if (name.includes(compactQuery)) return 10;
	return 20 + terms.reduce((score, term) => score + Math.max(0, haystack.indexOf(term)), 0);
}

export const TOTAL_ICON_COUNT = allIcons.length;

export function searchIcons(query: string, set: IconSet | 'all' = 'all', limit = 96) {
	const source = set === 'all' ? allIcons : allIcons.filter((icon) => icon.set === set);
	const terms = queryTerms(query);

	if (terms.length === 0) {
		const items = popularIcons.filter((icon) => set === 'all' || icon.set === set).slice(0, limit);
		return { items, total: source.length };
	}

	const matches = source
		.map((icon) => ({ icon, score: scoreIcon(icon, terms) }))
		.filter((entry): entry is { icon: IconSearchResult; score: number } => entry.score !== null)
		.sort((a, b) => a.score - b.score || a.icon.name.localeCompare(b.icon.name));

	return {
		items: matches.slice(0, limit).map((entry) => entry.icon),
		total: matches.length
	};
}

export function getIconSvg(set: string, name: string) {
	if (set !== 'mdi' && set !== 'si') return null;
	if (!/^[a-z0-9-]+$/i.test(name)) return null;

	const collection = collections[set];
	const icon = collection.icons[name];
	if (!icon) return null;

	const width = icon.width ?? collection.width ?? 24;
	const height = icon.height ?? collection.height ?? 24;
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">${icon.body}</svg>`;
}
