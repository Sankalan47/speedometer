/**
 * __tests__/unit/speedController.test.ts
 * TDD spec for SSE stream handler and REST readings handler.
 */

jest.mock('../../services/notificationService', () => ({
  addClient: jest.fn(),
  removeClient: jest.fn(),
}));

jest.mock('../../repositories/speedRepository', () => ({
  getRecent: jest.fn(),
}));

import { EventEmitter } from 'events';
import { Request, Response, NextFunction } from 'express';
import { addClient, removeClient } from '../../services/notificationService';
import { getRecent } from '../../repositories/speedRepository';
import { streamHandler, readingsHandler } from '../../controllers/speedController';

function mockSseReqRes() {
  const req = new EventEmitter() as unknown as Request;
  const res = {
    setHeader: jest.fn(),
    flushHeaders: jest.fn(),
    write: jest.fn().mockReturnValue(true),
    end: jest.fn(),
    on: jest.fn(),
  } as unknown as Response;
  const next = jest.fn() as NextFunction;
  return { req, res, next };
}

function mockRestReqRes(query: Record<string, string> = {}) {
  const req = { query } as unknown as Request;
  const res = { json: jest.fn() } as unknown as Response;
  const next = jest.fn() as NextFunction;
  return { req, res, next };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('streamHandler — SSE setup', () => {
  beforeEach(() => {
    (getRecent as jest.Mock).mockResolvedValue([]);
  });

  it('should set Content-Type to text/event-stream', async () => {
    const { req, res } = mockSseReqRes();
    await streamHandler(req, res);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
  });

  it('should set Cache-Control to no-cache', async () => {
    const { req, res } = mockSseReqRes();
    await streamHandler(req, res);
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
  });

  it('should set Connection to keep-alive', async () => {
    const { req, res } = mockSseReqRes();
    await streamHandler(req, res);
    expect(res.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
  });

  it('should set X-Accel-Buffering to no', async () => {
    const { req, res } = mockSseReqRes();
    await streamHandler(req, res);
    expect(res.setHeader).toHaveBeenCalledWith('X-Accel-Buffering', 'no');
  });

  it('should call res.flushHeaders()', async () => {
    const { req, res } = mockSseReqRes();
    await streamHandler(req, res);
    expect(res.flushHeaders).toHaveBeenCalledTimes(1);
  });

  it('should call addClient(res)', async () => {
    const { req, res } = mockSseReqRes();
    await streamHandler(req, res);
    expect(addClient).toHaveBeenCalledWith(res);
  });
});

describe('streamHandler — history on connect', () => {
  it('when getRecent resolves with readings, should write SSE event "connected" with history array', async () => {
    const history = [
      { id: 1, speed_kmh: 80, recorded_at: '2025-01-01T00:00:00Z', sensor_id: 'sensor-1' },
    ];
    (getRecent as jest.Mock).mockResolvedValue(history);

    const { req, res } = mockSseReqRes();
    await streamHandler(req, res);

    const written = (res.write as jest.Mock).mock.calls[0][0] as string;
    expect(written).toMatch(/event: connected/);
    const dataLine = written.split('\n').find((l) => l.startsWith('data:'))!;
    const parsed = JSON.parse(dataLine.replace('data: ', ''));
    expect(parsed.history).toEqual(history);
  });

  it('when getRecent rejects, should write SSE event "connected" with empty history array', async () => {
    (getRecent as jest.Mock).mockRejectedValue(new Error('db error'));

    const { req, res } = mockSseReqRes();
    await streamHandler(req, res);

    const written = (res.write as jest.Mock).mock.calls[0][0] as string;
    expect(written).toMatch(/event: connected/);
    const dataLine = written.split('\n').find((l) => l.startsWith('data:'))!;
    const parsed = JSON.parse(dataLine.replace('data: ', ''));
    expect(parsed.history).toEqual([]);
  });
});

describe('streamHandler — heartbeat', () => {
  it('after HEARTBEAT_INTERVAL_MS elapsed, should write heartbeat event', async () => {
    (getRecent as jest.Mock).mockResolvedValue([]);
    const { req, res } = mockSseReqRes();
    await streamHandler(req, res);

    jest.runOnlyPendingTimers();

    const writes = (res.write as jest.Mock).mock.calls.map(([s]) => s as string);
    expect(writes.some((w) => w.includes('event: heartbeat'))).toBe(true);
  });
});

describe('streamHandler — client disconnect', () => {
  it('when req emits close, should call removeClient(res)', async () => {
    (getRecent as jest.Mock).mockResolvedValue([]);
    const { req, res } = mockSseReqRes();
    await streamHandler(req, res);

    (req as unknown as EventEmitter).emit('close');
    expect(removeClient).toHaveBeenCalledWith(res);
  });
});

describe('readingsHandler', () => {
  describe('given no query params', () => {
    it('should call getRecent with default limit 60', async () => {
      (getRecent as jest.Mock).mockResolvedValue([]);
      const { req, res, next } = mockRestReqRes();
      await readingsHandler(req, res, next);
      expect(getRecent).toHaveBeenCalledWith(60);
    });
  });

  describe('given limit=100 query param', () => {
    it('should call getRecent with 100', async () => {
      (getRecent as jest.Mock).mockResolvedValue([]);
      const { req, res, next } = mockRestReqRes({ limit: '100' });
      await readingsHandler(req, res, next);
      expect(getRecent).toHaveBeenCalledWith(100);
    });
  });

  describe('given limit=600 (over cap of 500)', () => {
    it('should cap limit to 500', async () => {
      (getRecent as jest.Mock).mockResolvedValue([]);
      const { req, res, next } = mockRestReqRes({ limit: '600' });
      await readingsHandler(req, res, next);
      expect(getRecent).toHaveBeenCalledWith(500);
    });
  });

  describe('given getRecent resolves successfully', () => {
    it('should respond with { readings, count }', async () => {
      const rows = [
        { id: 1, speed_kmh: 80, recorded_at: '2025-01-01T00:00:00Z', sensor_id: 'sensor-1' },
      ];
      (getRecent as jest.Mock).mockResolvedValue(rows);
      const { req, res, next } = mockRestReqRes();
      await readingsHandler(req, res, next);
      expect(res.json).toHaveBeenCalledWith({ readings: rows, count: 1 });
    });
  });

  describe('given getRecent rejects', () => {
    it('should call next(err) to forward the error to errorHandler', async () => {
      const err = new Error('db error');
      (getRecent as jest.Mock).mockRejectedValue(err);
      const { req, res, next } = mockRestReqRes();
      await readingsHandler(req, res, next);
      expect(next).toHaveBeenCalledWith(err);
    });
  });
});
