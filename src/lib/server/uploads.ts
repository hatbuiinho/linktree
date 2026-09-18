import { env } from '$env/dynamic/private';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const PRESIGN_EXPIRES_SECONDS = 5 * 60;

const allowedTypes: Record<string, string> = {
	'image/jpeg': '.jpg',
	'image/png': '.png',
	'image/webp': '.webp',
	'image/gif': '.gif'
};

export type ImageKind = 'logo' | 'background' | 'block-image';

type MinioConfig = {
	endpoint: string;
	accessKey: string;
	secretKey: string;
	bucket: string;
	region: string;
	publicBaseUrl: string;
};

let cachedClient: { signature: string; client: S3Client } | null = null;

function asBoolean(value: string | undefined) {
	return value?.trim().toLowerCase() === 'true';
}

function requiredEnv(name: string, value: string | undefined) {
	const cleaned = value?.trim();
	if (!cleaned) throw new Error(`Thiếu biến môi trường ${name}.`);
	return cleaned;
}

function normalizeEndpoint(value: string, useSSL: boolean) {
	const endpoint = value.replace(/\/+$/, '');
	return /^https?:\/\//i.test(endpoint) ? endpoint : `${useSSL ? 'https' : 'http'}://${endpoint}`;
}

function config(): MinioConfig {
	const useSSL = asBoolean(env.MINIO_USE_SSL);
	const endpoint = normalizeEndpoint(requiredEnv('MINIO_ENDPOINT', env.MINIO_ENDPOINT), useSSL);
	const bucket = requiredEnv('MINIO_BUCKET', env.MINIO_BUCKET);
	const configuredPublicBase = env.MINIO_PUBLIC_BASE_URL?.trim().replace(/\/+$/, '');

	return {
		endpoint,
		accessKey: requiredEnv('MINIO_ACCESS_KEY', env.MINIO_ACCESS_KEY),
		secretKey: requiredEnv('MINIO_SECRET_KEY', env.MINIO_SECRET_KEY),
		bucket,
		region: env.MINIO_REGION?.trim() || 'us-east-1',
		publicBaseUrl: configuredPublicBase || `${endpoint}/${encodeURIComponent(bucket)}`
	};
}

function clientFor(cfg: MinioConfig) {
	const signature = [cfg.endpoint, cfg.accessKey, cfg.secretKey, cfg.region].join('|');
	if (cachedClient?.signature === signature) return cachedClient.client;

	const client = new S3Client({
		endpoint: cfg.endpoint,
		region: cfg.region,
		forcePathStyle: true,
		credentials: {
			accessKeyId: cfg.accessKey,
			secretAccessKey: cfg.secretKey
		}
	});
	cachedClient = { signature, client };
	return client;
}

function encodeObjectKey(key: string) {
	return key
		.split('/')
		.map((part) => encodeURIComponent(part))
		.join('/');
}

export function validateImageUpload(kind: string, contentType: string, size: number) {
	if (kind !== 'logo' && kind !== 'background' && kind !== 'block-image')
		throw new Error('Loại ảnh không hợp lệ.');
	const extension = allowedTypes[contentType.toLowerCase()];
	if (!extension) throw new Error('Chỉ hỗ trợ JPG, PNG, WEBP hoặc GIF.');
	if (!Number.isFinite(size) || size <= 0) throw new Error('File ảnh không hợp lệ.');
	if (size > MAX_IMAGE_SIZE) throw new Error('Ảnh tối đa 8 MB.');
	return { kind: kind as ImageKind, extension };
}

export async function presignImageUpload(input: {
	pageId: string;
	kind: string;
	contentType: string;
	size: number;
}) {
	const { kind, extension } = validateImageUpload(input.kind, input.contentType, input.size);
	const cfg = config();
	const objectKey = `pages/${input.pageId}/${kind}/${randomUUID()}${extension}`;
	const command = new PutObjectCommand({
		Bucket: cfg.bucket,
		Key: objectKey,
		ContentType: input.contentType
	});
	const uploadUrl = await getSignedUrl(clientFor(cfg), command, {
		expiresIn: PRESIGN_EXPIRES_SECONDS
	});

	return {
		bucket: cfg.bucket,
		object_key: objectKey,
		upload_url: uploadUrl,
		public_url: `${cfg.publicBaseUrl}/${encodeObjectKey(objectKey)}`,
		expires_at: new Date(Date.now() + PRESIGN_EXPIRES_SECONDS * 1000).toISOString()
	};
}

export function validateManagedImageUrl(value: string) {
	const cfg = config();
	let url: URL;
	let base: URL;
	try {
		url = new URL(value);
		base = new URL(`${cfg.publicBaseUrl}/`);
	} catch {
		throw new Error('URL ảnh không hợp lệ.');
	}

	const basePath = base.pathname.endsWith('/') ? base.pathname : `${base.pathname}/`;
	if (url.origin !== base.origin || !url.pathname.startsWith(basePath)) {
		throw new Error('URL ảnh không thuộc kho MinIO đã cấu hình.');
	}
	return url.toString();
}
