/**
 * middleware/errorHandler.ts
 * Centralised Express error handler for the entire application.
 *
 * Design note: The 4-argument signature is required by Express to distinguish
 * an error handler from a regular middleware.
 */

import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  // next must be declared even if unused — Express requires 4 params
  _next: NextFunction,
): void {
  if (process.env.NODE_ENV !== 'production') {
    console.error('[errorHandler]', err);
  }

  const status = (err as Error & { status?: number }).status ?? 500;
  res.status(status).json({ error: err.message });
}
