/**
 * main.tsx
 * React application entrypoint — mounts App into the DOM root.
 *
 * Design note: StrictMode is enabled to surface effect double-invocation
 * issues during development without affecting production behaviour.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element #root not found in document');
}

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
