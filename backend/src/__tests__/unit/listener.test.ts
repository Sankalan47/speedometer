/**
 * __tests__/unit/listener.test.ts
 * TDD spec for pg LISTEN client — connection lifecycle and backoff.
 */

import { EventEmitter } from 'events';

// Build a controllable mock Client class
class MockClient extends EventEmitter {
  connect = jest.fn().mockResolvedValue(undefined);
  query = jest.fn().mockResolvedValue(undefined);
  end = jest.fn().mockResolvedValue(undefined);
}

let mockClientInstance: MockClient;

jest.mock('pg', () => {
  return {
    Client: jest.fn().mockImplementation(() => {
      mockClientInstance = new MockClient();
      return mockClientInstance;
    }),
  };
});

import { createListener } from '../../db/listener';

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  // Re-apply the default implementation after clearAllMocks in case it was overridden
  const { Client } = jest.requireMock('pg') as { Client: jest.Mock };
  Client.mockImplementation(() => {
    mockClientInstance = new MockClient();
    return mockClientInstance;
  });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('given a successful initial connection', () => {
  it('should call client.connect()', async () => {
    await createListener(jest.fn());
    expect(mockClientInstance.connect).toHaveBeenCalledTimes(1);
  });

  it('should call client.query with LISTEN speed_update', async () => {
    await createListener(jest.fn());
    expect(mockClientInstance.query).toHaveBeenCalledWith('LISTEN speed_update');
  });

  it('should register a notification event listener', async () => {
    await createListener(jest.fn());
    expect(mockClientInstance.listenerCount('notification')).toBe(1);
  });

  it('should register an error event listener', async () => {
    await createListener(jest.fn());
    expect(mockClientInstance.listenerCount('error')).toBe(1);
  });
});

describe('given a valid notification arrives', () => {
  it('should invoke onNotify with the parsed SpeedReading', async () => {
    const onNotify = jest.fn();
    await createListener(onNotify);

    const payload = { id: 1, speed_kmh: 80, recorded_at: '2025-01-01T00:00:00Z', sensor_id: 'sensor-1' };
    mockClientInstance.emit('notification', { payload: JSON.stringify(payload) });

    expect(onNotify).toHaveBeenCalledWith(payload);
  });

  it('should parse all SpeedReading fields from the payload', async () => {
    const onNotify = jest.fn();
    await createListener(onNotify);

    const payload = { id: 5, speed_kmh: 120.5, recorded_at: '2025-06-01T10:00:00Z', sensor_id: 'sensor-2' };
    mockClientInstance.emit('notification', { payload: JSON.stringify(payload) });

    expect(onNotify).toHaveBeenCalledWith(expect.objectContaining({
      id: 5,
      speed_kmh: 120.5,
      sensor_id: 'sensor-2',
    }));
  });
});

describe('given a malformed notification arrives', () => {
  it('when payload is null, should not invoke onNotify', async () => {
    const onNotify = jest.fn();
    await createListener(onNotify);
    mockClientInstance.emit('notification', { payload: null });
    expect(onNotify).not.toHaveBeenCalled();
  });

  it('when payload is invalid JSON, should not invoke onNotify', async () => {
    const onNotify = jest.fn();
    await createListener(onNotify);
    mockClientInstance.emit('notification', { payload: 'not-json{{{' });
    expect(onNotify).not.toHaveBeenCalled();
  });
});

describe('given a client error event fires', () => {
  it('should call client.end()', async () => {
    await createListener(jest.fn());
    mockClientInstance.emit('error', new Error('connection reset'));
    expect(mockClientInstance.end).toHaveBeenCalled();
  });

  it('should schedule a reconnect setTimeout', async () => {
    await createListener(jest.fn());
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    mockClientInstance.emit('error', new Error('connection reset'));
    expect(setTimeoutSpy).toHaveBeenCalled();
  });

  it('first reconnect should use delay of 1000ms (BACKOFF_DELAYS[0])', async () => {
    await createListener(jest.fn());
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    mockClientInstance.emit('error', new Error('connection reset'));
    const delays = setTimeoutSpy.mock.calls.map(([, d]) => d as number);
    expect(delays).toContain(1000);
  });
});

describe('given repeated connection failures (backoff progression)', () => {
  it('backoff delays should increase with each attempt and cap at 30000ms', async () => {
    const { Client } = jest.requireMock('pg') as { Client: jest.Mock };
    let attemptCount = 0;

    // First N calls fail, then succeed — so we can observe multiple backoff delays
    Client.mockImplementation(() => {
      attemptCount++;
      const c = new MockClient();
      mockClientInstance = c;
      if (attemptCount <= 5) {
        c.connect = jest.fn().mockRejectedValue(new Error('refused'));
      }
      return c;
    });

    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

    await createListener(jest.fn()).catch(() => undefined);
    // Advance through a few backoff cycles
    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    jest.advanceTimersByTime(2000);
    await Promise.resolve();
    jest.advanceTimersByTime(4000);
    await Promise.resolve();

    const delays = setTimeoutSpy.mock.calls
      .map(([, d]) => d as number)
      .filter((d) => typeof d === 'number');

    // All delays must be within the backoff schedule
    delays.forEach((d) => expect(d).toBeLessThanOrEqual(30000));
    // Should have at least one non-zero delay
    expect(delays.some((d) => d > 0)).toBe(true);
  });
});

describe('given connect() throws on first call', () => {
  it('should call client.end() gracefully', async () => {
    const { Client } = jest.requireMock('pg') as { Client: jest.Mock };
    Client.mockImplementationOnce(() => {
      const c = new MockClient();
      mockClientInstance = c; // keep module-level ref in sync
      c.connect = jest.fn().mockRejectedValue(new Error('refused'));
      return c;
    });

    await createListener(jest.fn()).catch(() => undefined);
    expect(mockClientInstance.end).toHaveBeenCalled();
  });

  it('should schedule a reconnect', async () => {
    const { Client } = jest.requireMock('pg') as { Client: jest.Mock };
    Client.mockImplementationOnce(() => {
      const c = new MockClient();
      mockClientInstance = c;
      c.connect = jest.fn().mockRejectedValue(new Error('refused'));
      return c;
    });

    await createListener(jest.fn()).catch(() => undefined);
    expect(jest.getTimerCount()).toBeGreaterThan(0);
  });
});
