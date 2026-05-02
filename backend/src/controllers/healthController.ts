/**
 * controllers/healthController.ts
 * Request handler for the health-check endpoint.
 *
 * Design note: Kept in a controller so the route file stays declarative
 * and the logic is independently testable.
 */

import { Request, Response } from 'express';
import { getClientCount } from '../services/notificationService';
import { HealthResponse } from '../types/index';

/**
 * GET /health — returns service status and connected SSE client count.
 *
 * @param _req - Express Request (unused).
 * @param res - Express Response.
 */
export function healthHandler(_req: Request, res: Response): void {
  const body: HealthResponse = {
    status: 'ok',
    clients: getClientCount(),
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };
  res.json(body);
}
