/**
 * services/notificationService.ts
 * Observer that bridges pg LISTEN notifications to SSE client responses.
 *
 * Design note: Using a Set<Response> lets addClient/removeClient run in O(1).
 * The listener is started once on module load so the LISTEN connection is
 * established before any client connects.
 */

import { Response } from 'express';
import { createListener } from '../db/listener';
import { SpeedReading } from '../types/index';

const clients = new Set<Response>();

/**
 * Register a new SSE client response object.
 *
 * @param res - The Express Response for the SSE connection.
 */
export function addClient(res: Response): void {
  clients.add(res);
}

/**
 * Deregister an SSE client response object.
 *
 * @param res - The Express Response to remove.
 */
export function removeClient(res: Response): void {
  clients.delete(res);
}

/**
 * Write an SSE event to all connected clients.
 * No-op when there are no clients.
 *
 * @param eventName - The SSE event name.
 * @param data - Serialisable payload.
 */
export function broadcast(eventName: string, data: unknown): void {
  if (clients.size === 0) return;
  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    try {
      res.write(payload);
    } catch (err) {
      console.error('[notificationService] Failed to write to client:', (err as Error).message);
      clients.delete(res);
    }
  }
}

/**
 * Returns the number of currently connected SSE clients.
 *
 * @returns Current client count.
 */
export function getClientCount(): number {
  return clients.size;
}

/**
 * Establish the pg LISTEN connection and begin broadcasting speed updates.
 * Called once during server startup — not on module load — so the module
 * can be imported in tests without triggering a live DB connection.
 *
 * @returns void
 */
export function startNotificationService(): void {
  createListener((data: SpeedReading) => {
    broadcast('speed_update', data);
  }).catch((err: unknown) => {
    console.error('[notificationService] Failed to start listener:', (err as Error).message);
  });
}
