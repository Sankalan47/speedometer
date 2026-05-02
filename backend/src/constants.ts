/**
 * constants.ts
 * Central registry for all environment-backed configuration defaults.
 *
 * Design note: Keeping every env default in one place prevents silent
 * drift where the same variable is defaulted differently across files.
 */

export const PORT                  = parseInt(process.env.PORT                   ?? '3001',  10);
export const PRUNE_KEEP_ROWS       = parseInt(process.env.PRUNE_KEEP_ROWS        ?? '10000', 10);
export const HISTORY_ON_CONNECT    = parseInt(process.env.HISTORY_ON_CONNECT     ?? '10',    10);
export const HEARTBEAT_INTERVAL_MS = parseInt(process.env.HEARTBEAT_INTERVAL_MS  ?? '30000', 10);
export const SENSOR_INTERVAL_MS    = parseInt(process.env.SENSOR_INTERVAL_MS     ?? '1000',  10);
