/**
 * hooks/useSpeedStream.ts
 * SSE connection state machine with exponential backoff reconnection.
 *
 * Design note: All SSE lifecycle logic lives here so components stay
 * presentational. The hook closes the EventSource on unmount to prevent
 * memory leaks.
 */

import { useState, useEffect, useRef } from 'react';
import {
  SpeedReading,
  StreamStatus,
  ConnectedEventData,
  UseSpeedStreamReturn,
} from '../types/index';
import { average } from '../utils/speedMath';

const SSE_URL = `${import.meta.env.VITE_API_URL ?? ''}/api/stream`;

/** Backoff delays in ms — capped at 30 000 ms after the last entry. */
const BACKOFF_DELAYS = [1000, 2000, 4000, 8000, 30000];
const MAX_RECONNECT_ATTEMPTS = 5;
const MAX_HISTORY = 60;

export function useSpeedStream(): UseSpeedStreamReturn {
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [history, setHistory] = useState<SpeedReading[]>([]);
  const [status, setStatus] = useState<StreamStatus>('CONNECTING');
  const [maxSpeed, setMaxSpeed] = useState(0);
  const [minSpeed, setMinSpeed] = useState(Infinity);

  const reconnectAttempt = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const esRef = useRef<EventSource | null>(null);

  function clearReconnectTimer(): void {
    if (reconnectTimer.current !== null) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
  }

  function connect(): void {
    if (esRef.current) {
      esRef.current.close();
    }

    const es = new EventSource(SSE_URL);
    esRef.current = es;

    es.addEventListener('connected', (e: MessageEvent<string>) => {
      reconnectAttempt.current = 0;
      setStatus('CONNECTED');
      try {
        const data = JSON.parse(e.data) as ConnectedEventData;
        if (Array.isArray(data.history)) {
          // pg driver returns NUMERIC as strings; coerce to number so average() works correctly
          setHistory(
            data.history.slice(-MAX_HISTORY).map((r) => ({ ...r, speed_kmh: Number(r.speed_kmh) }))
          );
        }
      } catch {
        // non-fatal — history seeding is best-effort
      }
    });

    es.addEventListener('speed_update', (e: MessageEvent<string>) => {
      try {
        const reading = JSON.parse(e.data) as SpeedReading;
        const speed = reading.speed_kmh;

        setCurrentSpeed(speed);
        setHistory((prev) => [...prev, reading].slice(-MAX_HISTORY));
        setMaxSpeed((prev) => Math.max(prev, speed));
        if (speed > 0) {
          setMinSpeed((prev) => Math.min(prev, speed));
        }
      } catch {
        // ignore malformed payloads
      }
    });

    es.addEventListener('heartbeat', () => {
      // Heartbeat received — connection is healthy
    });

    es.onerror = () => {
      es.close();
      esRef.current = null;

      if (reconnectAttempt.current >= MAX_RECONNECT_ATTEMPTS) {
        setStatus('FAILED');
        return;
      }

      setStatus('RECONNECTING');
      const delay =
        BACKOFF_DELAYS[Math.min(reconnectAttempt.current, BACKOFF_DELAYS.length - 1)];
      reconnectAttempt.current++;

      clearReconnectTimer();
      reconnectTimer.current = setTimeout(() => {
        connect();
      }, delay);
    };
  }

  useEffect(() => {
    connect();
    return () => {
      clearReconnectTimer();
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const avgSpeed = average(history.map((r) => r.speed_kmh));

  return {
    currentSpeed,
    history,
    status,
    maxSpeed,
    minSpeed: minSpeed === Infinity ? 0 : minSpeed,
    avgSpeed,
  };
}
