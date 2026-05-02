/**
 * __tests__/unit/healthController.test.ts
 * TDD spec for the health-check endpoint handler.
 */

jest.mock('../../services/notificationService', () => ({
  getClientCount: jest.fn(),
}));

import { Request, Response } from 'express';
import { getClientCount } from '../../services/notificationService';
import { healthHandler } from '../../controllers/healthController';

function mockReqRes() {
  const res = {
    json: jest.fn(),
  } as unknown as Response;
  const req = {} as Request;
  return { req, res };
}

describe('healthHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('given 3 connected SSE clients', () => {
    beforeEach(() => {
      (getClientCount as jest.Mock).mockReturnValue(3);
    });

    it('should return status "ok"', () => {
      const { req, res } = mockReqRes();
      healthHandler(req, res);
      const body = (res.json as jest.Mock).mock.calls[0][0];
      expect(body.status).toBe('ok');
    });

    it('should return clients=3', () => {
      const { req, res } = mockReqRes();
      healthHandler(req, res);
      const body = (res.json as jest.Mock).mock.calls[0][0];
      expect(body.clients).toBe(3);
    });

    it('should return a numeric uptime greater than 0', () => {
      const { req, res } = mockReqRes();
      healthHandler(req, res);
      const body = (res.json as jest.Mock).mock.calls[0][0];
      expect(typeof body.uptime).toBe('number');
      expect(body.uptime).toBeGreaterThan(0);
    });

    it('should return a timestamp as a valid ISO 8601 string', () => {
      const { req, res } = mockReqRes();
      healthHandler(req, res);
      const body = (res.json as jest.Mock).mock.calls[0][0];
      expect(() => new Date(body.timestamp).toISOString()).not.toThrow();
      expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('given 0 connected SSE clients', () => {
    it('should return clients=0', () => {
      (getClientCount as jest.Mock).mockReturnValue(0);
      const { req, res } = mockReqRes();
      healthHandler(req, res);
      const body = (res.json as jest.Mock).mock.calls[0][0];
      expect(body.clients).toBe(0);
    });
  });

  describe('response shape', () => {
    it('body should contain exactly the keys: status, clients, uptime, timestamp', () => {
      (getClientCount as jest.Mock).mockReturnValue(1);
      const { req, res } = mockReqRes();
      healthHandler(req, res);
      const body = (res.json as jest.Mock).mock.calls[0][0];
      expect(Object.keys(body).sort()).toEqual(['clients', 'status', 'timestamp', 'uptime']);
    });
  });
});
