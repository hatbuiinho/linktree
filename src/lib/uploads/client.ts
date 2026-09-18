import { resolve } from '$app/paths';

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

type ImageKind = 'logo' | 'background' | 'block-image';

type PresignedUpload = {
	bucket: string;
	object_key: string;
	upload_url: string;
	public_url: string;
	expires_at: string;
};

export type ResponsiveBackgroundUpload = {
	desktopUrl: string;
	mobileUrl: string | null;
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

function loadImage(file: File) {
	return new Promise<HTMLImageElement>((resolveImage, reject) => {
		const image = new Image();
		const objectUrl = URL.createObjectURL(file);
		image.onload = () => {
			URL.revokeObjectURL(objectUrl);
			resolveImage(image);
		};
		image.onerror = () => {
			URL.revokeObjectURL(objectUrl);
			reject(new Error('Không thể đọc dữ liệu ảnh.'));
		};
		image.src = objectUrl;
	});
}

async function optimizeImage(file: File, maxDimension: number, quality: number) {
	const image = await loadImage(file);
	const longestSide = Math.max(image.naturalWidth, image.naturalHeight);
	const scale = Math.min(1, maxDimension / longestSide);
	const width = Math.max(1, Math.round(image.naturalWidth * scale));
	const height = Math.max(1, Math.round(image.naturalHeight * scale));
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const context = canvas.getContext('2d');
	if (!context) throw new Error('Trình duyệt không thể tối ưu ảnh.');
	context.drawImage(image, 0, 0, width, height);
	const blob = await new Promise<Blob | null>((resolveBlob) =>
		canvas.toBlob(resolveBlob, 'image/webp', quality)
	);
	if (!blob) throw new Error('Không thể nén ảnh.');
	return new File([blob], `${file.name.replace(/\.[^.]+$/, '') || 'background'}.webp`, {
		type: 'image/webp'
	});
}

/**
 * Creates two WebP variants for raster backgrounds. GIFs intentionally stay untouched so their
 * animation survives; their original file is used on every viewport.
 */
export async function uploadResponsiveBackground(
	pageId: string,
	file: File
): Promise<ResponsiveBackgroundUpload> {
	if (!allowedTypes.has(file.type)) throw new Error('Chỉ hỗ trợ JPG, PNG, WEBP hoặc GIF.');
	if (file.size <= 0) throw new Error('File ảnh không hợp lệ.');
	if (file.size > MAX_IMAGE_SIZE) throw new Error('Ảnh tối đa 8 MB.');

	if (file.type === 'image/gif') {
		return { desktopUrl: await uploadImage(pageId, 'background', file), mobileUrl: null };
	}

	let desktopFile: File;
	let mobileFile: File | null = null;
	try {
		const image = await loadImage(file);
		desktopFile = await optimizeImage(file, 1920, 0.84);
		if (Math.max(image.naturalWidth, image.naturalHeight) > 1080) {
			mobileFile = await optimizeImage(file, 1080, 0.8);
		}
	} catch {
		// Keep the original upload path available for browsers that cannot encode WebP.
		desktopFile = file;
	}

	const desktopUrl = await uploadImage(pageId, 'background', desktopFile);
	const mobileUrl = mobileFile ? await uploadImage(pageId, 'background', mobileFile) : null;
	return { desktopUrl, mobileUrl };
}
