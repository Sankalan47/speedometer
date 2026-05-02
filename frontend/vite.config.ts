/**
 * vite.config.ts
 * Vite build configuration for the React frontend.
 *
 * Design note: The dev server proxy keeps the SSE URL relative (/api/stream)
 * in both dev and prod, matching nginx proxy rules.
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL ?? 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
