/**
 * controllers/speedController.ts
 * Request handlers for speed readings — SSE stream and REST fallback.
 *
 * Design note: Handlers are separated from route definitions so each layer
 * has a single responsibility; routes declare paths, controllers own logic.
 */

import { Request, Response, NextFunction } from 'express';
import { addClient, removeClient } from '../services/notificationService';
import { getRecent } from '../repositories/speedRepository';
import { HISTORY_ON_CONNECT, HEARTBEAT_INTERVAL_MS } from '../constants';

/**
 * GET /api/stream — establishes a Server-Sent Events connection.
 * Keeps the response open indefinitely; never calls res.end().
 *
 * @param req - Express Request.
 * @param res - Express Response held open as an SSE stream.
 */
export async function streamHandler(req: Request, res: Response): Promise<void> {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  // Tells nginx not to buffer this response
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  addClient(res);

  try {
    const history = await getRecent(HISTORY_ON_CONNECT);
    res.write(`event: connected\ndata: ${JSON.stringify({ history })}\n\n`);
  } catch (err) {
    console.error('[speedController] Failed to fetch history on connect:', (err as Error).message);
    res.write(`event: connected\ndata: ${JSON.stringify({ history: [] })}\n\n`);
  }

  const heartbeat = setInterval(() => {
    try {
      res.write('event: heartbeat\ndata: {}\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, HEARTBEAT_INTERVAL_MS);

  req.on('close', () => {
    removeClient(res);
    clearInterval(heartbeat);
  });
}

/**
 * GET /api/readings — REST fallback returning recent speed readings.
 *
 * @param req - Express Request with optional `limit` and `sensor_id` query params.
 * @param res - Express Response.
 * @param next - Express next function for error forwarding.
 */
export async function readingsHandler(
  req: Request<object, object, object, { limit?: string; sensor_id?: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const limit = Math.min(parseInt(req.query.limit ?? '60', 10), 500);
    const readings = await getRecent(limit);
    res.json({ readings, count: readings.length });
  } catch (err) {
    next(err);
  }
}
