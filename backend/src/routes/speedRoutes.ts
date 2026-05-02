/**
 * routes/speedRoutes.ts
 * Route declarations for the speed readings API.
 *
 * Design note: Routes are intentionally thin — all handler logic lives in
 * controllers/speedController.ts to maintain single responsibility.
 */

import { Router } from 'express';
import { streamHandler, readingsHandler } from '../controllers/speedController';

const router = Router();

router.get('/stream', streamHandler);
router.get('/readings', readingsHandler);

export default router;
