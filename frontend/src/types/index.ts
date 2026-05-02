/**
 * types/index.ts
 * Shared frontend interfaces matching the backend API shape.
 *
 * Design note: Mirroring only the fields the frontend actually uses keeps
 * this decoupled from any future backend schema additions.
 */

export interface SpeedReading {
  id: number;
  speed_kmh: number;
  recorded_at: string;
  sensor_id: string;
}

export type StreamStatus = 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'FAILED';

export interface ConnectedEventData {
  history: SpeedReading[];
}

export interface SpeedGaugeProps {
  /** Current speed in km/h to display on the gauge. */
  speed: number;
  /** Maximum speed for the gauge arc; defaults to 200. */
  maxSpeed?: number;
  /** Canvas logical size in px; defaults to 400. Pass a smaller value on mobile. */
  size?: number;
}

export interface UseSpeedStreamReturn {
  currentSpeed: number;
  history: SpeedReading[];
  status: StreamStatus;
  maxSpeed: number;
  minSpeed: number;
  avgSpeed: number;
}

export interface ReconnectAttempt {
  count: number;
}
