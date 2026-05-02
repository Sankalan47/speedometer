/**
 * types/index.ts
 * Shared interfaces and types used across the backend.
 *
 * Design note: Centralising types here avoids duplication between the
 * repository, service, and route layers.
 */

export interface SpeedReading {
  id: number;
  speed_kmh: number;
  /** ISO 8601 string as returned by pg */
  recorded_at: string;
  sensor_id: string;
}

export interface NotifyPayload extends SpeedReading {}

export type SimulatorState = 'IDLE' | 'ACCELERATING' | 'CRUISING' | 'BRAKING';

export interface HealthResponse {
  status: 'ok' | 'error';
  clients: number;
  uptime: number;
  timestamp: string;
}
