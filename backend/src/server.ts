/**
 * server.ts
 * HTTP server entrypoint — binds the Express app to a port.
 *
 * Design note: Pruning on startup keeps the table bounded even if the
 * process restarted while the pruner was offline.
 */

import 'dotenv/config';
import http from 'http';
import app from './app';
import pool from './db/pool';
import { pruneOldReadings } from './repositories/speedRepository';
import { PORT, PRUNE_KEEP_ROWS } from './constants';
import { startNotificationService } from './services/notificationService';

const server = http.createServer(app);

async function start(): Promise<void> {
  startNotificationService();

  try {
    await pruneOldReadings(PRUNE_KEEP_ROWS);
    console.log(`[server] Pruned old readings, keeping ${PRUNE_KEEP_ROWS} rows`);
  } catch (err) {
    console.error('[server] Prune failed (non-fatal):', (err as Error).message);
  }

  server.listen(PORT, () => {
    console.log(`[server] Listening on port ${PORT}`);
  });
}

process.on('SIGTERM', () => {
  console.log('[server] SIGTERM received — shutting down gracefully');
  server.close(async () => {
    try {
      await pool.end();
      console.log('[server] Pool closed');
    } catch (err) {
      console.error('[server] Error closing pool:', (err as Error).message);
    }
    process.exit(0);
  });
});

start().catch((err: unknown) => {
  console.error('[server] Startup error:', (err as Error).message);
  process.exit(1);
});
