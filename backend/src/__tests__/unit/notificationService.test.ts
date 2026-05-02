/**
 * __tests__/unit/notificationService.test.ts
 * TDD spec for SSE client registry and broadcast logic.
 */

// Mock createListener so module load never opens a real DB connection
jest.mock('../../db/listener', () => ({
  createListener: jest.fn().mockResolvedValue(undefined),
}));

import { createListener } from '../../db/listener';

// Helper that returns a minimal mock of an Express Response for SSE
function mockRes() {
  return {
    write: jest.fn().mockReturnValue(true),
    setHeader: jest.fn(),
    flushHeaders: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
  };
}

// Re-import a fresh module instance for each describe block that checks
// getClientCount() so module-level Set state does not leak between suites.
async function freshModule() {
  jest.resetModules();
  // Re-apply the listener mock after resetModules clears the registry
  jest.mock('../../db/listener', () => ({
    createListener: jest.fn().mockResolvedValue(undefined),
  }));
  return import('../../services/notificationService');
}

describe('addClient / removeClient / getClientCount', () => {
  let svc: Awaited<ReturnType<typeof freshModule>>;

  beforeEach(async () => {
    svc = await freshModule();
  });

  describe('given no clients are registered', () => {
    it('getClientCount should return 0', () => {
      expect(svc.getClientCount()).toBe(0);
    });
  });

  describe('given addClient is called with a mock Response', () => {
    it('getClientCount should return 1', () => {
      svc.addClient(mockRes() as never);
      expect(svc.getClientCount()).toBe(1);
    });
  });

  describe('given the same Response is added twice', () => {
    it('getClientCount should still return 1 (Set deduplication)', () => {
      const res = mockRes() as never;
      svc.addClient(res);
      svc.addClient(res);
      expect(svc.getClientCount()).toBe(1);
    });
  });

  describe('given removeClient is called for a registered client', () => {
    it('getClientCount should return 0', () => {
      const res = mockRes() as never;
      svc.addClient(res);
      svc.removeClient(res);
      expect(svc.getClientCount()).toBe(0);
    });
  });

  describe('given removeClient is called for an unknown client', () => {
    it('should not throw and count should remain unchanged', () => {
      expect(() => svc.removeClient(mockRes() as never)).not.toThrow();
      expect(svc.getClientCount()).toBe(0);
    });
  });
});

describe('broadcast', () => {
  let svc: Awaited<ReturnType<typeof freshModule>>;

  beforeEach(async () => {
    svc = await freshModule();
  });

  describe('given no clients are registered', () => {
    it('should not call res.write on any client', () => {
      const res = mockRes();
      // deliberately NOT registering the client
      svc.broadcast('speed_update', { speed_kmh: 80 });
      expect(res.write).not.toHaveBeenCalled();
    });

    it('should return early without error', () => {
      expect(() => svc.broadcast('speed_update', {})).not.toThrow();
    });
  });

  describe('given 2 registered clients', () => {
    it('should call res.write on both clients', () => {
      const r1 = mockRes();
      const r2 = mockRes();
      svc.addClient(r1 as never);
      svc.addClient(r2 as never);
      svc.broadcast('speed_update', { speed_kmh: 50 });
      expect(r1.write).toHaveBeenCalledTimes(1);
      expect(r2.write).toHaveBeenCalledTimes(1);
    });

    it('should format the SSE payload correctly', () => {
      const r1 = mockRes();
      svc.addClient(r1 as never);
      svc.broadcast('speed_update', { speed_kmh: 50 });
      const written = (r1.write as jest.Mock).mock.calls[0][0] as string;
      expect(written).toMatch(/^event: speed_update\n/);
      expect(written).toMatch(/\ndata: /);
      expect(written).toMatch(/\n\n$/);
    });

    it('the data segment should be valid JSON', () => {
      const r1 = mockRes();
      svc.addClient(r1 as never);
      svc.broadcast('speed_update', { speed_kmh: 50 });
      const written = (r1.write as jest.Mock).mock.calls[0][0] as string;
      const dataLine = written.split('\n').find((l) => l.startsWith('data:'))!;
      expect(() => JSON.parse(dataLine.replace('data: ', ''))).not.toThrow();
    });
  });

  describe('given a client whose res.write throws', () => {
    it('should catch the error and remove the faulty client', () => {
      const bad = mockRes();
      const good = mockRes();
      (bad.write as jest.Mock).mockImplementation(() => { throw new Error('broken pipe'); });
      svc.addClient(bad as never);
      svc.addClient(good as never);

      expect(() => svc.broadcast('speed_update', {})).not.toThrow();
      expect(svc.getClientCount()).toBe(1);
    });

    it('should continue broadcasting to remaining healthy clients', () => {
      const bad = mockRes();
      const good = mockRes();
      (bad.write as jest.Mock).mockImplementation(() => { throw new Error('broken pipe'); });
      svc.addClient(bad as never);
      svc.addClient(good as never);

      svc.broadcast('speed_update', {});
      expect(good.write).toHaveBeenCalledTimes(1);
    });
  });
});

describe('startNotificationService', () => {
  let svc: Awaited<ReturnType<typeof freshModule>>;
  let mockCreateListener: jest.Mock;

  beforeEach(async () => {
    jest.resetModules();
    mockCreateListener = jest.fn().mockResolvedValue(undefined);
    jest.mock('../../db/listener', () => ({ createListener: mockCreateListener }));
    svc = await import('../../services/notificationService');
  });

  describe('when called', () => {
    it('should call createListener with a callback function', () => {
      svc.startNotificationService();
      expect(mockCreateListener).toHaveBeenCalledWith(expect.any(Function));
    });

    it('when createListener rejects, should not throw', async () => {
      mockCreateListener.mockRejectedValue(new Error('db down'));
      expect(() => svc.startNotificationService()).not.toThrow();
      // Allow the rejected promise to settle
      await new Promise((r) => setTimeout(r, 0));
    });
  });

  describe('when the createListener callback is invoked with a SpeedReading', () => {
    it('should broadcast with event name "speed_update"', () => {
      svc.startNotificationService();
      const callback = mockCreateListener.mock.calls[0][0] as (d: unknown) => void;

      const res = mockRes();
      svc.addClient(res as never);
      callback({ id: 1, speed_kmh: 90, recorded_at: '2025-01-01T00:00:00Z', sensor_id: 'sensor-1' });

      const written = (res.write as jest.Mock).mock.calls[0][0] as string;
      expect(written).toMatch(/event: speed_update/);
    });
  });
});
