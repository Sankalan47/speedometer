/**
 * routes/healthRoutes.ts
 * Route declaration for the health-check endpoint.
 *
 * Design note: Route is intentionally thin — logic lives in
 * controllers/healthController.ts to maintain single responsibility.
 */

import { Router } from 'express';
import { healthHandler } from '../controllers/healthController';

const router = Router();

router.get('/health', healthHandler);

export default router;
