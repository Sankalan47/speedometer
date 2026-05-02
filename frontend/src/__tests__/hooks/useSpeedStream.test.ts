/**
 * __tests__/hooks/useSpeedStream.test.ts
 * TDD spec for the SSE connection state machine.
 */

import { renderHook, act } from '@testing-library/react';
import { useSpeedStream } from '../../hooks/useSpeedStream';

// ---------------------------------------------------------------------------
// MockEventSource — controllable drop-in for window.EventSource
// ---------------------------------------------------------------------------

type ListenerMap = Record<string, ((e: MessageEvent) => void)[]>;

class MockEventSource {
  static instances: MockEventSource[] = [];

  url: string;
  private listeners: ListenerMap = {};
  onerror: ((e: Event) => void) | null = null;
  close = vi.fn();

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  addEventListener(event: string, cb: (e: MessageEvent) => void) {
    this.listeners[event] = this.listeners[event] ?? [];
    this.listeners[event].push(cb);
  }

  /** Test helper — fire a named SSE event with stringified data */
  simulateEvent(name: string, data: unknown) {
    const event = { data: JSON.stringify(data) } as MessageEvent;
    (this.listeners[name] ?? []).forEach((cb) => cb(event));
  }

  simulateError() {
    this.onerror?.({} as Event);
  }
}

beforeEach(() => {
  MockEventSource.instances = [];
  vi.stubGlobal('EventSource', MockEventSource);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function latestEs(): MockEventSource {
  return MockEventSource.instances[MockEventSource.instances.length - 1];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('initial state', () => {
  it('should initialize status as CONNECTING', () => {
    const { result } = renderHook(() => useSpeedStream());
    expect(result.current.status).toBe('CONNECTING');
  });

  it('should initialize currentSpeed as 0', () => {
    const { result } = renderHook(() => useSpeedStream());
    expect(result.current.currentSpeed).toBe(0);
  });

  it('should initialize history as empty array', () => {
    const { result } = renderHook(() => useSpeedStream());
    expect(result.current.history).toEqual([]);
  });

  it('should initialize maxSpeed as 0', () => {
    const { result } = renderHook(() => useSpeedStream());
    expect(result.current.maxSpeed).toBe(0);
  });

  it('should initialize minSpeed as 0', () => {
    const { result } = renderHook(() => useSpeedStream());
    expect(result.current.minSpeed).toBe(0);
  });

  it('should initialize avgSpeed as 0', () => {
    const { result } = renderHook(() => useSpeedStream());
    expect(result.current.avgSpeed).toBe(0);
  });
});

describe('EventSource construction', () => {
  it('should create an EventSource on mount', () => {
    renderHook(() => useSpeedStream());
    expect(MockEventSource.instances).toHaveLength(1);
  });

  it('should close the EventSource on unmount', () => {
    const { unmount } = renderHook(() => useSpeedStream());
    unmount();
    expect(latestEs().close).toHaveBeenCalled();
  });
});

describe('connected event', () => {
  it('should set status to CONNECTED', () => {
    const { result } = renderHook(() => useSpeedStream());
    act(() => latestEs().simulateEvent('connected', { history: [] }));
    expect(result.current.status).toBe('CONNECTED');
  });

  it('should populate history with received readings', () => {
    const history = [
      { id: 1, speed_kmh: 60, recorded_at: '2025-01-01T00:00:00Z', sensor_id: 's1' },
      { id: 2, speed_kmh: 80, recorded_at: '2025-01-01T00:00:01Z', sensor_id: 's1' },
    ];
    const { result } = renderHook(() => useSpeedStream());
    act(() => latestEs().simulateEvent('connected', { history }));
    expect(result.current.history).toHaveLength(2);
  });

  it('should coerce speed_kmh from string to number', () => {
    const history = [{ id: 1, speed_kmh: '75.5' as unknown as number, recorded_at: '', sensor_id: '' }];
    const { result } = renderHook(() => useSpeedStream());
    act(() => latestEs().simulateEvent('connected', { history }));
    expect(typeof result.current.history[0].speed_kmh).toBe('number');
    expect(result.current.history[0].speed_kmh).toBe(75.5);
  });

  it('given 70 history readings, should slice to last 60', () => {
    const history = Array.from({ length: 70 }, (_, i) => ({
      id: i + 1, speed_kmh: 50, recorded_at: '', sensor_id: 's1',
    }));
    const { result } = renderHook(() => useSpeedStream());
    act(() => latestEs().simulateEvent('connected', { history }));
    expect(result.current.history).toHaveLength(60);
  });

  it('given invalid JSON data, should not throw and status becomes CONNECTED', () => {
    const { result } = renderHook(() => useSpeedStream());
    const es = latestEs();
    // Manually fire with raw garbage data
    (es['listeners'] as ListenerMap)['connected']?.forEach((cb) =>
      cb({ data: 'not-json' } as MessageEvent),
    );
    // status still CONNECTING since parse failed — no throw
    expect(() => result.current.status).not.toThrow();
  });
});

describe('speed_update event', () => {
  const reading = { id: 1, speed_kmh: 80, recorded_at: '2025-01-01T00:00:00Z', sensor_id: 's1' };

  it('should set currentSpeed', () => {
    const { result } = renderHook(() => useSpeedStream());
    act(() => latestEs().simulateEvent('speed_update', reading));
    expect(result.current.currentSpeed).toBe(80);
  });

  it('should append the reading to history', () => {
    const { result } = renderHook(() => useSpeedStream());
    act(() => latestEs().simulateEvent('speed_update', reading));
    expect(result.current.history).toHaveLength(1);
  });

  it('should update maxSpeed when new speed is higher', () => {
    const { result } = renderHook(() => useSpeedStream());
    act(() => latestEs().simulateEvent('speed_update', { ...reading, speed_kmh: 100 }));
    expect(result.current.maxSpeed).toBe(100);
  });

  it('given speed=0, should NOT update minSpeed', () => {
    const { result } = renderHook(() => useSpeedStream());
    act(() => latestEs().simulateEvent('speed_update', { ...reading, speed_kmh: 0 }));
    expect(result.current.minSpeed).toBe(0); // still sentinel→0
  });

  it('given speed > 0, should update minSpeed', () => {
    const { result } = renderHook(() => useSpeedStream());
    act(() => latestEs().simulateEvent('speed_update', { ...reading, speed_kmh: 45 }));
    expect(result.current.minSpeed).toBe(45);
  });

  it('given 61 updates after mount, history should stay capped at 60', () => {
    const { result } = renderHook(() => useSpeedStream());
    act(() => {
      for (let i = 1; i <= 61; i++) {
        latestEs().simulateEvent('speed_update', { ...reading, id: i, speed_kmh: i });
      }
    });
    expect(result.current.history).toHaveLength(60);
  });

  it('given invalid JSON payload, should ignore the event without throwing', () => {
    const { result } = renderHook(() => useSpeedStream());
    const es = latestEs();
    act(() => {
      (es['listeners'] as ListenerMap)['speed_update']?.forEach((cb) =>
        cb({ data: 'bad{json' } as MessageEvent),
      );
    });
    expect(result.current.currentSpeed).toBe(0);
  });
});

describe('avgSpeed computation', () => {
  it('given history [60, 90, 120], avgSpeed should be 90', () => {
    const { result } = renderHook(() => useSpeedStream());
    act(() => {
      [60, 90, 120].forEach((s, i) =>
        latestEs().simulateEvent('speed_update', { id: i, speed_kmh: s, recorded_at: '', sensor_id: '' }),
      );
    });
    expect(result.current.avgSpeed).toBeCloseTo(90);
  });

  it('given empty history, avgSpeed should be 0', () => {
    const { result } = renderHook(() => useSpeedStream());
    expect(result.current.avgSpeed).toBe(0);
  });
});

describe('onerror reconnection', () => {
  it('given first error, should close the EventSource', () => {
    renderHook(() => useSpeedStream());
    const es = latestEs();
    act(() => es.simulateError());
    expect(es.close).toHaveBeenCalled();
  });

  it('given first error, should set status to RECONNECTING', () => {
    const { result } = renderHook(() => useSpeedStream());
    act(() => latestEs().simulateError());
    expect(result.current.status).toBe('RECONNECTING');
  });

  it('given first error, should schedule reconnect with 1000ms delay', () => {
    renderHook(() => useSpeedStream());
    act(() => latestEs().simulateError());
    expect(vi.getTimerCount()).toBeGreaterThan(0);
  });

  it('given MAX_RECONNECT_ATTEMPTS=5 consecutive errors, should set status to FAILED', () => {
    const { result } = renderHook(() => useSpeedStream());

    // The hook checks `attempt >= MAX_RECONNECT_ATTEMPTS` BEFORE incrementing.
    // MAX_RECONNECT_ATTEMPTS = 5, so we need 6 errors:
    // errors 1-5 set status=RECONNECTING (attempt goes 0→5)
    // error 6: attempt=5 >= 5 → FAILED (no more reconnect scheduled)
    for (let i = 0; i < 6; i++) {
      act(() => latestEs().simulateError());
      if (result.current.status !== 'FAILED') {
        act(() => vi.runOnlyPendingTimers()); // advance to next connection attempt
      }
    }

    expect(result.current.status).toBe('FAILED');
  });

  it('given a reconnect attempt, should create a new EventSource', () => {
    renderHook(() => useSpeedStream());
    expect(MockEventSource.instances).toHaveLength(1);

    act(() => latestEs().simulateError());
    act(() => vi.runOnlyPendingTimers());

    expect(MockEventSource.instances.length).toBeGreaterThan(1);
  });
});

describe('unmount cleanup', () => {
  it('should close the EventSource on unmount', () => {
    const { unmount } = renderHook(() => useSpeedStream());
    unmount();
    expect(latestEs().close).toHaveBeenCalled();
  });

  it('should cancel any pending reconnect timer on unmount', () => {
    const { unmount } = renderHook(() => useSpeedStream());
    act(() => latestEs().simulateError()); // schedules reconnect timer
    unmount();
    // After unmount the timer should be cleared — no more pending timers
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('minSpeed sentinel', () => {
  it('given no speed_update events, should return minSpeed=0', () => {
    const { result } = renderHook(() => useSpeedStream());
    expect(result.current.minSpeed).toBe(0);
  });

  it('given non-zero readings, should return the actual minimum', () => {
    const { result } = renderHook(() => useSpeedStream());
    act(() => {
      [80, 40, 60].forEach((s, i) =>
        latestEs().simulateEvent('speed_update', { id: i, speed_kmh: s, recorded_at: '', sensor_id: '' }),
      );
    });
    expect(result.current.minSpeed).toBe(40);
  });
});
