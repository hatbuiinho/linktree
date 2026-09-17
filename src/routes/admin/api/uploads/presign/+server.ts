import { db } from '$lib/server/db';
import { pages } from '$lib/server/db/schema';
import { presignImageUpload } from '$lib/server/uploads';
import { eq } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const payload = await request.json();
		const pageId = String(payload.page_id || '').trim();
		const fileName = String(payload.file_name || '').trim();
		const contentType = String(payload.content_type || '')
			.trim()
			.toLowerCase();
		const kind = String(payload.kind || '').trim();
		const size = Number(payload.size);

		if (!pageId || !fileName || fileName.length > 255) {
			return json({ error: 'Thông tin file không hợp lệ.' }, { status: 400 });
		}

		const [page] = await db
			.select({ id: pages.id })
			.from(pages)
			.where(eq(pages.id, pageId))
			.limit(1);
		if (!page) return json({ error: 'Không tìm thấy trang.' }, { status: 404 });

		const result = await presignImageUpload({ pageId, kind, contentType, size });
		return json(result);
	} catch (cause) {
		const message = cause instanceof Error ? cause.message : 'Không thể chuẩn bị tải ảnh.';
		const status = message.startsWith('Thiếu biến môi trường') ? 503 : 400;
		return json({ error: message }, { status });
	}
};
