import {
	bigserial,
	boolean,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid
} from 'drizzle-orm/pg-core';
import { eq } from 'drizzle-orm';

export const pageStatus = pgEnum('page_status', ['draft', 'published']);
export const blockType = pgEnum('block_type', ['link', 'heading', 'text', 'divider', 'youtube']);
export const backgroundType = pgEnum('background_type', ['color', 'gradient', 'image']);
export const userRole = pgEnum('user_role', ['admin', 'editor']);

export const users = pgTable(
	'users',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		displayName: text('display_name'),
		email: text('email').notNull(),
		passwordHash: text('password_hash').notNull(),
		role: userRole('role').notNull().default('admin'),
		isActive: boolean('is_active').notNull().default(true),
		lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date())
	},
	(table) => [uniqueIndex('users_email_unique').on(table.email)]
);

export const sessions = pgTable(
	'sessions',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		tokenHash: text('token_hash').notNull(),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		uniqueIndex('sessions_token_hash_unique').on(table.tokenHash),
		index('sessions_user_id_idx').on(table.userId),
		index('sessions_expires_at_idx').on(table.expiresAt)
	]
);

export const pages = pgTable(
	'pages',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		slug: text('slug').notNull(),
		title: text('title').notNull(),
		description: text('description'),
		logoUrl: text('logo_url'),
		logoSourceUrl: text('logo_source_url'),
		isHome: boolean('is_home').notNull().default(false),
		status: pageStatus('status').notNull().default('draft'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date())
	},
	(table) => [
		uniqueIndex('pages_slug_unique').on(table.slug),
		index('pages_status_idx').on(table.status)
	]
);

export const themes = pgTable(
	'themes',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		pageId: uuid('page_id')
			.notNull()
			.references(() => pages.id, { onDelete: 'cascade' }),
		backgroundType: backgroundType('background_type').notNull().default('color'),
		backgroundValue: text('background_value').notNull().default('#ffffff'),
		backgroundMobileValue: text('background_mobile_value'),
		backgroundPosition: text('background_position').notNull().default('center'),
		backgroundFocalX: integer('background_focal_x').notNull().default(50),
		backgroundFocalY: integer('background_focal_y').notNull().default(50),
		backgroundOverlayColor: text('background_overlay_color').notNull().default('#0f172a'),
		backgroundOverlayOpacity: integer('background_overlay_opacity').notNull().default(0),
		buttonColor: text('button_color').notNull().default('#93c5fd'),
		buttonTextColor: text('button_text_color').notNull().default('#172554'),
		textColor: text('text_color').notNull().default('#172554'),
		buttonRadius: integer('button_radius').notNull().default(999),
		buttonPaddingX: integer('button_padding_x').notNull().default(22),
		buttonPaddingY: integer('button_padding_y').notNull().default(10),
		buttonMinHeight: integer('button_min_height').notNull().default(0),
		buttonFontSize: integer('button_font_size').notNull().default(16),
		fontFamily: text('font_family').notNull().default('system-ui'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date())
	},
	(table) => [uniqueIndex('themes_page_id_unique').on(table.pageId)]
);

export const blocks = pgTable(
	'blocks',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		shareCode: text('share_code').notNull(),
		pageId: uuid('page_id')
			.notNull()
			.references(() => pages.id, { onDelete: 'cascade' }),
		type: blockType('type').notNull(),
		title: text('title'),
		subtitle: text('subtitle'),
		url: text('url'),
		icon: text('icon'),
		position: integer('position').notNull().default(0),
		enabled: boolean('enabled').notNull().default(true),
		openNewTab: boolean('open_new_tab').notNull().default(true),
		metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date())
	},
	(table) => [
		uniqueIndex('blocks_share_code_unique').on(table.shareCode),
		index('blocks_page_id_idx').on(table.pageId),
		index('blocks_page_position_idx').on(table.pageId, table.position),
		index('blocks_public_page_position_idx')
			.on(table.pageId, table.position)
			.where(eq(table.enabled, true))
	]
);

export const clickEvents = pgTable(
	'click_events',
	{
		id: bigserial('id', { mode: 'number' }).primaryKey(),
		pageId: uuid('page_id')
			.notNull()
			.references(() => pages.id, { onDelete: 'cascade' }),
		blockId: uuid('block_id').references(() => blocks.id, { onDelete: 'set null' }),
		referrer: text('referrer'),
		deviceType: text('device_type'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		index('click_events_page_id_idx').on(table.pageId),
		index('click_events_block_id_idx').on(table.blockId),
		index('click_events_page_block_idx').on(table.pageId, table.blockId)
	]
);

export type Page = typeof pages.$inferSelect;
export type NewPage = typeof pages.$inferInsert;
export type Theme = typeof themes.$inferSelect;
export type Block = typeof blocks.$inferSelect;
export type User = typeof users.$inferSelect;
