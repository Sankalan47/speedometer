/**
 * db/listener.ts
 * Dedicated pg.Client that holds a persistent LISTEN connection on the
 * 'speed_update' channel and invokes a callback on each notification.
 *
 * Design note: LISTEN must use a standalone client, never a pool connection.
 * Pools recycle connections, which silently drops LISTEN registrations.
 */

import { Client } from 'pg';
import { SpeedReading } from '../types/index';

/** Backoff delays in ms — after the last entry repeats at 30 000 ms. */
const BACKOFF_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000];

/**
 * Creates a dedicated pg.Client that LISTENs on 'speed_update'.
 * Reconnects with exponential backoff on error.
 *
 * @param onNotify - Called with a parsed SpeedReading on each notification.
 */
export async function createListener(
  onNotify: (data: SpeedReading) => void,
): Promise<void> {
  let attempt = 0;

  async function connect(): Promise<void> {
    const client = new Client({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    try {
      await client.connect();
      attempt = 0; // reset backoff on successful connect

      await client.query('LISTEN speed_update');
      console.log('[listener] LISTEN speed_update — connected');

      client.on('notification', (msg) => {
        if (!msg.payload) return;
        try {
          const data = JSON.parse(msg.payload) as SpeedReading;
          onNotify(data);
        } catch (err) {
          console.error('[listener] Failed to parse notification payload:', err);
        }
      });

      client.on('error', (err) => {
        console.error('[listener] Client error:', err.message);
        void client.end().catch(() => undefined);
        scheduleReconnect();
      });

    } catch (err) {
      console.error('[listener] Connection failed:', (err as Error).message);
      void client.end().catch(() => undefined);
      scheduleReconnect();
    }
  }

  function scheduleReconnect(): void {
    const delay = BACKOFF_DELAYS[Math.min(attempt, BACKOFF_DELAYS.length - 1)];
    attempt++;
    console.log(`[listener] Reconnecting in ${delay}ms (attempt ${attempt})`);
    setTimeout(() => { void connect(); }, delay);
  }

  await connect();
}
