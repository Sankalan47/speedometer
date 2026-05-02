/**
 * routes/index.ts
 * Aggregates all sub-routers into a single Express Router.
 *
 * Design note: A single barrel keeps app.ts free of per-route mount logic;
 * adding a new route group is a one-line change here.
 */

import { Router } from 'express';
import healthRoutes from './healthRoutes';
import speedRoutes from './speedRoutes';

const router = Router();

router.use('/', healthRoutes);
router.use('/api', speedRoutes);

export default router;
