/**
 * App.tsx
 * Root component — sets global styles and renders the Dashboard.
 *
 * Design note: The Google Font link is injected here (not index.html) so
 * it co-locates with the component that uses it.
 */

import { Dashboard } from './components/Dashboard';

export default function App() {
  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700&display=swap"
        rel="stylesheet"
      />
      <div
        style={{
          minHeight: '100vh',
          background: '#0a0e1a',
          fontFamily: "'Courier New', monospace",
        }}
      >
        <Dashboard />
      </div>
    </>
  );
}
