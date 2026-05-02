/**
 * __tests__/integration/app.integration.test.ts
 * HTTP-level integration tests using supertest.
 * Pool is intercepted by moduleNameMapper — no real DB required.
 */

import request from 'supertest';

// These mocks must be declared before importing app so Jest hoists them
jest.mock('../../services/notificationService', () => ({
  addClient: jest.fn(),
  removeClient: jest.fn(),
  getClientCount: jest.fn().mockReturnValue(2),
  startNotificationService: jest.fn(),
}));

jest.mock('../../repositories/speedRepository', () => ({
  getRecent: jest.fn().mockResolvedValue([]),
  pruneOldReadings: jest.fn().mockResolvedValue(undefined),
}));

import app from '../../app';

describe('GET /health', () => {
  it('should return 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });

  it('should return { status: "ok", clients, uptime, timestamp }', async () => {
    const res = await request(app).get('/health');
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.clients).toBe('number');
    expect(typeof res.body.uptime).toBe('number');
    expect(typeof res.body.timestamp).toBe('string');
  });

  it('timestamp should be a valid ISO 8601 string', async () => {
    const res = await request(app).get('/health');
    expect(() => new Date(res.body.timestamp).toISOString()).not.toThrow();
  });
});

describe('GET /api/readings', () => {
  const { getRecent } = jest.requireMock('../../repositories/speedRepository') as {
    getRecent: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('given getRecent resolves with mock data', () => {
    const rows = [
      { id: 1, speed_kmh: 80, recorded_at: '2025-01-01T00:00:00Z', sensor_id: 'sensor-1' },
    ];

    beforeEach(() => {
      getRecent.mockResolvedValue(rows);
    });

    it('should return 200', async () => {
      const res = await request(app).get('/api/readings');
      expect(res.status).toBe(200);
    });

    it('should return { readings, count }', async () => {
      const res = await request(app).get('/api/readings');
      expect(res.body.readings).toEqual(rows);
      expect(res.body.count).toBe(1);
    });
  });

  describe('given limit=5 query param', () => {
    it('should pass 5 to getRecent', async () => {
      getRecent.mockResolvedValue([]);
      await request(app).get('/api/readings?limit=5');
      expect(getRecent).toHaveBeenCalledWith(5);
    });
  });

  describe('given getRecent rejects', () => {
    it('should return 500 with { error: message }', async () => {
      getRecent.mockRejectedValue(new Error('db unavailable'));
      const res = await request(app).get('/api/readings');
      expect(res.status).toBe(500);
      expect(res.body.error).toBe('db unavailable');
    });
  });
});

describe('GET /api/stream', () => {
  const { getRecent } = jest.requireMock('../../repositories/speedRepository') as {
    getRecent: jest.Mock;
  };

  // SSE headers are fully verified in speedController.test.ts (unit).
  // Here we verify the route exists and sends the right Content-Type using Node's
  // http module, closing the connection immediately after reading headers.
  it('should return Content-Type text/event-stream and Cache-Control no-cache', (done) => {
    getRecent.mockResolvedValue([]);

    const server = app.listen(0, () => {
      const port = (server.address() as { port: number }).port;
      const http = require('http') as typeof import('http');
      const req = http.get(`http://localhost:${port}/api/stream`, (res) => {
        expect(res.headers['content-type']).toContain('text/event-stream');
        expect(res.headers['cache-control']).toContain('no-cache');
        req.destroy(); // close connection — SSE never ends naturally
        server.close(done);
      });
      req.on('error', () => server.close(done));
    });
  }, 8000);
});

describe('unknown routes', () => {
  it('GET /nonexistent should return 404', async () => {
    const res = await request(app).get('/nonexistent');
    expect(res.status).toBe(404);
  });
});
