import { resolve } from '$app/paths';

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

type ImageKind = 'logo' | 'background';

type PresignedUpload = {
	bucket: string;
	object_key: string;
	upload_url: string;
	public_url: string;
	expires_at: string;
};

export async function uploadImage(pageId: string, kind: ImageKind, file: File) {
	if (!allowedTypes.has(file.type)) throw new Error('Chỉ hỗ trợ JPG, PNG, WEBP hoặc GIF.');
	if (file.size <= 0) throw new Error('File ảnh không hợp lệ.');
	if (file.size > MAX_IMAGE_SIZE) throw new Error('Ảnh tối đa 8 MB.');

	const presignResponse = await fetch(resolve('/admin/api/uploads/presign'), {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({
			page_id: pageId,
			file_name: file.name,
			content_type: file.type,
			size: file.size,
			kind
		})
	});
	const presigned = (await presignResponse.json()) as PresignedUpload & { error?: string };
	if (!presignResponse.ok) throw new Error(presigned.error || 'Không thể chuẩn bị tải ảnh.');

	const uploadResponse = await fetch(presigned.upload_url, {
		method: 'PUT',
		headers: { 'Content-Type': file.type },
		body: file
	});
	if (!uploadResponse.ok)
		throw new Error(`Không thể tải ảnh lên MinIO (${uploadResponse.status}).`);

	return presigned.public_url;
}
