/**
 * __tests__/unit/constants.test.ts
 * TDD spec for environment-backed configuration defaults.
 */

describe('constants', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  describe('given no environment variables are set', () => {
    beforeEach(() => {
      delete process.env.PORT;
      delete process.env.PRUNE_KEEP_ROWS;
      delete process.env.HISTORY_ON_CONNECT;
      delete process.env.HEARTBEAT_INTERVAL_MS;
      delete process.env.SENSOR_INTERVAL_MS;
    });

    it('should default PORT to 3001', async () => {
      const { PORT } = await import('../../constants');
      expect(PORT).toBe(3001);
    });

    it('should default PRUNE_KEEP_ROWS to 10000', async () => {
      const { PRUNE_KEEP_ROWS } = await import('../../constants');
      expect(PRUNE_KEEP_ROWS).toBe(10000);
    });

    it('should default HISTORY_ON_CONNECT to 10', async () => {
      const { HISTORY_ON_CONNECT } = await import('../../constants');
      expect(HISTORY_ON_CONNECT).toBe(10);
    });

    it('should default HEARTBEAT_INTERVAL_MS to 30000', async () => {
      const { HEARTBEAT_INTERVAL_MS } = await import('../../constants');
      expect(HEARTBEAT_INTERVAL_MS).toBe(30000);
    });

    it('should default SENSOR_INTERVAL_MS to 1000', async () => {
      const { SENSOR_INTERVAL_MS } = await import('../../constants');
      expect(SENSOR_INTERVAL_MS).toBe(1000);
    });
  });

  describe('given environment variables are overridden', () => {
    it('should parse PORT from env as an integer', async () => {
      process.env.PORT = '8080';
      const { PORT } = await import('../../constants');
      expect(PORT).toBe(8080);
    });

    it('should parse PRUNE_KEEP_ROWS from env as an integer', async () => {
      process.env.PRUNE_KEEP_ROWS = '5000';
      const { PRUNE_KEEP_ROWS } = await import('../../constants');
      expect(PRUNE_KEEP_ROWS).toBe(5000);
    });

    it('should parse HEARTBEAT_INTERVAL_MS from env as an integer', async () => {
      process.env.HEARTBEAT_INTERVAL_MS = '15000';
      const { HEARTBEAT_INTERVAL_MS } = await import('../../constants');
      expect(HEARTBEAT_INTERVAL_MS).toBe(15000);
    });
  });
});
