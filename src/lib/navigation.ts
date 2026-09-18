export const navigationTypes = ['external', 'page', 'route', 'back'] as const;
export type NavigationType = (typeof navigationTypes)[number];

export const publicRoutes = [{ path: '/', label: 'Trang chính' }] as const;
export type PublicRoutePath = (typeof publicRoutes)[number]['path'];

export function navigationType(metadata: Record<string, unknown>): NavigationType {
	const value = metadata.navigationType;
	return typeof value === 'string' && navigationTypes.includes(value as NavigationType)
		? (value as NavigationType)
		: 'external';
}

export function navigationValue(metadata: Record<string, unknown>) {
	return typeof metadata.navigationValue === 'string' ? metadata.navigationValue : '';
}

export function navigationFallback(metadata: Record<string, unknown>): PublicRoutePath {
	const value = metadata.navigationFallback;
	return typeof value === 'string' && isPublicRoute(value) ? (value as PublicRoutePath) : '/';
}

export function isPublicRoute(path: string) {
	return publicRoutes.some((route) => route.path === path);
}
