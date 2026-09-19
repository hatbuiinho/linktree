import { fetchLinkPreview, importLinkPreviewImage } from '$lib/server/link-preview';
import { db } from '$lib/server/db';
import { pages } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	try {
		const body = (await request.json()) as { url?: unknown; pageId?: unknown };
		const url = typeof body.url === 'string' ? body.url.trim() : '';
		const pageId = typeof body.pageId === 'string' ? body.pageId : '';
		if (!url || !pageId) return json({ error: 'Thiếu URL hoặc trang.' }, { status: 400 });
		const [page] = await db
			.select({ id: pages.id })
			.from(pages)
			.where(eq(pages.id, pageId))
			.limit(1);
		if (!page) return json({ error: 'Không tìm thấy trang.' }, { status: 404 });

		const preview = await fetchLinkPreview(url);
		const sourceImageUrl = preview.imageUrl;
		let imageUrl: string | null = null;
		if (sourceImageUrl) {
			try {
				imageUrl = await importLinkPreviewImage(pageId, sourceImageUrl);
			} catch {
				// Metadata still fills the editor when a remote image cannot be imported.
			}
		}
		return json({ ...preview, sourceImageUrl, imageUrl });
	} catch (cause) {
		return json(
			{ error: cause instanceof Error ? cause.message : 'Không thể lấy thông tin liên kết.' },
			{ status: 400 }
		);
	}
};
