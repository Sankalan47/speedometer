/**
 * db/pool.ts
 * Singleton pg.Pool for all database query operations.
 *
 * Design note: A single pool instance is reused across the entire process so
 * connection slots are shared rather than opened per-request.
 */

import { Pool } from 'pg';

const {
  DB_HOST,
  DB_PORT,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
} = process.env;

if (!DB_HOST || !DB_USER || !DB_PASSWORD || !DB_NAME) {
  throw new Error('Missing required database environment variables: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME');
}

const pool = new Pool({
  host: DB_HOST,
  port: DB_PORT ? parseInt(DB_PORT, 10) : 5432,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
});

// Log connection errors without crashing — the pool will attempt to reconnect.
pool.on('error', (err) => {
  console.error('[pool] Unexpected client error:', err.message);
});

export default pool;
