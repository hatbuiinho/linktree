import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

// Serverless instances are short lived and can scale independently. Keeping one
// connection per instance prevents traffic spikes from exhausting PostgreSQL's
// connection limit; local Node deployments may reuse a small pool instead.
const client = postgres(env.DATABASE_URL, {
	max: env.VERCEL ? 1 : 10,
	idle_timeout: 20,
	connect_timeout: 10,
	prepare: !env.VERCEL
});

export const db = drizzle(client, { schema });
