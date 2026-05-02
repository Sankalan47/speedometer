/**
 * app.ts
 * Express application factory — does not call listen().
 *
 * Design note: Separating app creation from server startup makes the app
 * importable in tests without binding a port.
 */

import express from 'express';
import cors from 'cors';
import routes from './routes/index';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Allow the Netlify origin (or any origin in dev). Set CORS_ORIGIN to your
// deployed frontend URL in production to lock this down.
app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*' }));
app.use(express.json());

app.use(routes);

app.use(errorHandler);

export default app;
