import { scryptSync, randomBytes } from 'node:crypto';
import { chmod, writeFile } from 'node:fs/promises';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import { blocks, pages, themes, users } from '../src/lib/server/db/schema.ts';
import { createShareCode } from '../src/lib/server/share-code.ts';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const client = postgres(process.env.DATABASE_URL, { max: 1 });
const db = drizzle(client);

function passwordHash(password: string) {
	const salt = randomBytes(16).toString('hex');
	return `scrypt$${salt}$${scryptSync(password, salt, 64).toString('hex')}`;
}

async function seedAdmin() {
	const email = (process.env.ADMIN_EMAIL || 'admin@ttpq.local').toLowerCase();
	const [existing] = await db
		.select({ id: users.id })
		.from(users)
		.where(eq(users.email, email))
		.limit(1);
	if (existing) return;

	const password = randomBytes(18).toString('base64url');
	await db.insert(users).values({ email, passwordHash: passwordHash(password) });
	const credentialText = `TTPQ admin credentials\nEmail: ${email}\nPassword: ${password}\n`;
	await writeFile('.admin-credentials', credentialText, { mode: 0o600 });
	await chmod('.admin-credentials', 0o600);
	console.log('Created initial admin. Credentials saved to .admin-credentials');
}

async function seedHomePage() {
	const [existing] = await db
		.select({ id: pages.id })
		.from(pages)
		.where(eq(pages.isHome, true))
		.limit(1);
	if (existing) return;

	const [page] = await db
		.insert(pages)
		.values({
			slug: 'home',
			title: 'THÔNG TIN CHÙA',
			description: 'Các kênh thông tin và hướng dẫn của chùa',
			isHome: true,
			status: 'published'
		})
		.returning();

	await db.insert(themes).values({
		pageId: page.id,
		backgroundType: 'gradient',
		backgroundValue: 'linear-gradient(180deg, #fbfffb 0%, #dcfbd2 100%)',
		buttonColor: '#8ec2ee',
		buttonTextColor: '#172554',
		textColor: '#1d39ff',
		buttonRadius: 999,
		fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif'
	});

	await db.insert(blocks).values([
		{ shareCode: createShareCode(), pageId: page.id, type: 'link', title: 'WEBSITE', icon: 'globe', position: 0 },
		{ shareCode: createShareCode(), pageId: page.id, type: 'link', title: 'YOUTUBE (Tổng hợp)', icon: 'youtube', position: 1 },
		{ shareCode: createShareCode(), pageId: page.id, type: 'link', title: 'FACEBOOK (Tổng hợp)', icon: 'facebook', position: 2 },
		{
			shareCode: createShareCode(),
			pageId: page.id,
			type: 'link',
			title: 'DIGITAL CPQ - Các nền tảng số',
			icon: 'music',
			position: 3
		},
		{ shareCode: createShareCode(), pageId: page.id, type: 'link', title: 'TIKTOK', icon: 'tiktok', position: 4 },
		{ shareCode: createShareCode(), pageId: page.id, type: 'heading', title: 'HƯỚNG DẪN NGHI THỨC', position: 5 },
		{ shareCode: createShareCode(), pageId: page.id, type: 'link', title: 'THỈNH THÁNH ĐỘ MỆNH', icon: 'chevrons', position: 6 },
		{ shareCode: createShareCode(), pageId: page.id, type: 'link', title: 'QUY Y TAM BẢO', icon: 'chevrons', position: 7 }
	]);
}

try {
	await seedAdmin();
	await seedHomePage();
	console.log('Seed complete.');
} finally {
	await client.end();
}
