/**
 * components/ConnectionStatus.tsx
 * Pill badge that reflects the current SSE connection state.
 *
 * Design note: Purely presentational — all state comes from props so the
 * component is trivially testable.
 */

import { StreamStatus } from '../types/index';

interface Props {
  status: StreamStatus;
  reconnectAttempt?: number;
}

const DOT = 'inline-block w-2 h-2 rounded-full mr-2';

const CONFIG: Record<StreamStatus, { dot: string; label: (attempt?: number) => string; pill: string }> = {
  CONNECTED: {
    dot: `${DOT} bg-green-400`,
    label: () => 'LIVE',
    pill: 'bg-green-900/40 border-green-700 text-green-300',
  },
  CONNECTING: {
    dot: `${DOT} bg-yellow-400 animate-pulse`,
    label: () => 'CONNECTING...',
    pill: 'bg-yellow-900/40 border-yellow-700 text-yellow-300',
  },
  RECONNECTING: {
    dot: `${DOT} bg-yellow-400 animate-pulse`,
    label: (attempt) => `RECONNECTING${attempt ? ` (${attempt})` : ''}`,
    pill: 'bg-yellow-900/40 border-yellow-700 text-yellow-300',
  },
  FAILED: {
    dot: `${DOT} bg-red-400`,
    label: () => 'DISCONNECTED',
    pill: 'bg-red-900/40 border-red-700 text-red-300',
  },
};

export function ConnectionStatus({ status, reconnectAttempt }: Props) {
  const cfg = CONFIG[status];
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-mono font-bold tracking-widest ${cfg.pill}`}
    >
      <span className={cfg.dot} />
      {cfg.label(reconnectAttempt)}
    </span>
  );
}
