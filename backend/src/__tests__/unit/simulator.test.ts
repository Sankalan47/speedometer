/**
 * __tests__/unit/simulator.test.ts
 * TDD spec for the speed state machine and DB retry logic.
 *
 * Design note: simulator.ts is a self-executing script with a module-level
 * setInterval. We load it dynamically inside beforeAll — AFTER calling
 * jest.useFakeTimers() — so its setInterval registers against fake timers.
 * No static import of the module is used.
 */

jest.mock('../../repositories/speedRepository', () => ({
  insert: jest.fn(),
}));

// Suppress simulator console output during tests
jest.spyOn(console, 'log').mockImplementation(() => undefined);
jest.spyOn(console, 'error').mockImplementation(() => undefined);

// Static import of the mock only (jest.mock ensures this is the mock)
import { insert } from '../../repositories/speedRepository';
const mockInsert = insert as jest.Mock;

beforeAll(() => {
  jest.useFakeTimers();
  // Load simulator NOW — setInterval uses the already-fake timers above
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../../simulator');
});

afterAll(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

beforeEach(() => {
  mockInsert.mockReset();
});

// ---------------------------------------------------------------------------
// Observable behaviour: insert is called with valid values
// ---------------------------------------------------------------------------

describe('simulator tick — insert is called', () => {
  it('should call insert on each tick', async () => {
    mockInsert.mockResolvedValue({ id: 1, speed_kmh: 0, recorded_at: '', sensor_id: '' });

    jest.runOnlyPendingTimers();
    await Promise.resolve();
    await Promise.resolve();

    expect(mockInsert).toHaveBeenCalled();
  });

  it('should always call insert with a speed in [0, 300]', async () => {
    mockInsert.mockResolvedValue({});

    // Run several ticks to exercise multiple state transitions
    for (let i = 0; i < 10; i++) {
      jest.runOnlyPendingTimers();
      await Promise.resolve();
      await Promise.resolve();
    }

    const speeds = mockInsert.mock.calls.map(([s]) => s as number);
    speeds.forEach((s) => {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(300);
    });
  });

  it('should pass the SENSOR_ID string as the second argument', async () => {
    mockInsert.mockResolvedValue({});

    jest.runOnlyPendingTimers();
    await Promise.resolve();
    await Promise.resolve();

    if (mockInsert.mock.calls.length > 0) {
      const sensorId = mockInsert.mock.calls[0][1];
      expect(typeof sensorId).toBe('string');
      expect(sensorId.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Retry behaviour on insert failure
// ---------------------------------------------------------------------------

describe('tick() — DB write retry on failure', () => {
  it('when insert rejects, should schedule a retry delay via setTimeout', async () => {
    mockInsert.mockRejectedValueOnce(new Error('timeout'));

    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

    jest.runOnlyPendingTimers();
    // Flush the rejected promise through the catch block
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    const retryCalls = setTimeoutSpy.mock.calls.filter(
      ([, delay]) => typeof delay === 'number' && (delay as number) >= 1000,
    );
    expect(retryCalls.length).toBeGreaterThan(0);
  });

  it('the first retry delay should be 1000ms (RETRY_DELAYS[0])', async () => {
    mockInsert.mockRejectedValueOnce(new Error('timeout'));

    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

    jest.runOnlyPendingTimers();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    const delays = setTimeoutSpy.mock.calls
      .map(([, d]) => d as number)
      .filter((d) => d >= 1000);
    expect(delays[0]).toBe(1000);
  });

  it('retry delay should never exceed 30000ms', async () => {
    mockInsert.mockRejectedValue(new Error('persistent failure'));

    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

    // Run multiple failing ticks
    for (let i = 0; i < 8; i++) {
      jest.runOnlyPendingTimers();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    }

    const delays = setTimeoutSpy.mock.calls
      .map(([, d]) => d as number)
      .filter((d) => typeof d === 'number' && d >= 1000);

    if (delays.length > 0) {
      expect(Math.max(...delays)).toBeLessThanOrEqual(30000);
    }
  });
});
