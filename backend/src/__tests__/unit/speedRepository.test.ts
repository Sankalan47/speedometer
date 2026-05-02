/**
 * __tests__/unit/speedRepository.test.ts
 * TDD spec for speedRepository — all SQL logic, mocked pool.
 */

import { Pool } from 'pg';
import mockPool from '../../__mocks__/pool';

// Import functions under test — pool.ts is intercepted by moduleNameMapper
import {
  getRecent,
  getInRange,
  insert,
  pruneOldReadings,
} from '../../repositories/speedRepository';

const pool = mockPool as unknown as Pool;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getRecent', () => {
  describe('given the pool returns rows', () => {
    const fakeRows = [
      { id: 2, speed_kmh: 80, recorded_at: '2025-01-01T00:00:02Z', sensor_id: 'sensor-1' },
      { id: 1, speed_kmh: 60, recorded_at: '2025-01-01T00:00:01Z', sensor_id: 'sensor-1' },
    ];

    beforeEach(() => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: fakeRows });
    });

    it('when called with default limit, should query with LIMIT 60', async () => {
      await getRecent(60, pool);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $1'),
        [60],
      );
    });

    it('when called with limit=5, should query with LIMIT 5', async () => {
      await getRecent(5, pool);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $1'),
        [5],
      );
    });

    it('should return the rows array from the query result', async () => {
      const result = await getRecent(60, pool);
      expect(result).toEqual(fakeRows);
    });

    it('should select id, speed_kmh, recorded_at, sensor_id', async () => {
      await getRecent(60, pool);
      const sql = (mockPool.query as jest.Mock).mock.calls[0][0] as string;
      expect(sql).toMatch(/SELECT.*id.*speed_kmh.*recorded_at.*sensor_id/i);
    });

    it('should order results by recorded_at DESC', async () => {
      await getRecent(60, pool);
      const sql = (mockPool.query as jest.Mock).mock.calls[0][0] as string;
      expect(sql).toMatch(/ORDER BY recorded_at DESC/i);
    });
  });

  describe('given the pool returns empty rows', () => {
    it('should return an empty array', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });
      const result = await getRecent(60, pool);
      expect(result).toEqual([]);
    });
  });

  describe('given the pool throws', () => {
    it('should propagate the error to the caller', async () => {
      (mockPool.query as jest.Mock).mockRejectedValue(new Error('connection lost'));
      await expect(getRecent(60, pool)).rejects.toThrow('connection lost');
    });
  });
});

describe('getInRange', () => {
  const from = new Date('2025-01-01T00:00:00Z');
  const to = new Date('2025-01-01T00:01:00Z');

  describe('given valid from and to dates', () => {
    beforeEach(() => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });
    });

    it('should pass both dates as positional params $1 and $2', async () => {
      await getInRange(from, to, pool);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [from, to],
      );
    });

    it('should use BETWEEN in the query', async () => {
      await getInRange(from, to, pool);
      const sql = (mockPool.query as jest.Mock).mock.calls[0][0] as string;
      expect(sql).toMatch(/BETWEEN/i);
    });

    it('should order results by recorded_at DESC', async () => {
      await getInRange(from, to, pool);
      const sql = (mockPool.query as jest.Mock).mock.calls[0][0] as string;
      expect(sql).toMatch(/ORDER BY recorded_at DESC/i);
    });
  });

  describe('given from equals to', () => {
    it('should execute the query without error', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });
      await expect(getInRange(from, from, pool)).resolves.toEqual([]);
    });
  });

  describe('given the pool throws', () => {
    it('should propagate the error', async () => {
      (mockPool.query as jest.Mock).mockRejectedValue(new Error('timeout'));
      await expect(getInRange(from, to, pool)).rejects.toThrow('timeout');
    });
  });
});

describe('insert', () => {
  const fakeRow = { id: 1, speed_kmh: 80, recorded_at: '2025-01-01T00:00:00Z', sensor_id: 'sensor-1' };

  describe('given valid speed_kmh and sensor_id', () => {
    beforeEach(() => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [fakeRow] });
    });

    it('should use a parameterised INSERT query', async () => {
      await insert(80, 'sensor-1', pool);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO speed_readings'),
        expect.arrayContaining([80, 'sensor-1']),
      );
    });

    it('should include RETURNING clause with all required fields', async () => {
      await insert(80, 'sensor-1', pool);
      const sql = (mockPool.query as jest.Mock).mock.calls[0][0] as string;
      expect(sql).toMatch(/RETURNING.*id.*speed_kmh.*recorded_at.*sensor_id/i);
    });

    it('should return the first row of the result', async () => {
      const result = await insert(80, 'sensor-1', pool);
      expect(result).toEqual(fakeRow);
    });
  });

  describe('given speed_kmh=0 (lower boundary)', () => {
    it('should pass 0 to the query without modification', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [{ ...fakeRow, speed_kmh: 0 }] });
      await insert(0, 'sensor-1', pool);
      expect(mockPool.query).toHaveBeenCalledWith(expect.any(String), [0, 'sensor-1']);
    });
  });

  describe('given speed_kmh=300 (upper boundary)', () => {
    it('should pass 300 to the query without modification', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [{ ...fakeRow, speed_kmh: 300 }] });
      await insert(300, 'sensor-1', pool);
      expect(mockPool.query).toHaveBeenCalledWith(expect.any(String), [300, 'sensor-1']);
    });
  });

  describe('given the pool throws (e.g. CHECK constraint violation)', () => {
    it('should propagate the error to the caller', async () => {
      (mockPool.query as jest.Mock).mockRejectedValue(new Error('violates check constraint'));
      await expect(insert(-1, 'sensor-1', pool)).rejects.toThrow('violates check constraint');
    });
  });
});

describe('pruneOldReadings', () => {
  describe('given keepN=10000', () => {
    beforeEach(() => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });
    });

    it('should call the prune_old_readings function', async () => {
      await pruneOldReadings(10000, pool);
      const sql = (mockPool.query as jest.Mock).mock.calls[0][0] as string;
      expect(sql).toMatch(/prune_old_readings/i);
    });

    it('should pass keepN as positional param $1', async () => {
      await pruneOldReadings(10000, pool);
      expect(mockPool.query).toHaveBeenCalledWith(expect.any(String), [10000]);
    });

    it('should resolve without returning a value', async () => {
      const result = await pruneOldReadings(10000, pool);
      expect(result).toBeUndefined();
    });
  });

  describe('given the pool throws', () => {
    it('should propagate the error', async () => {
      (mockPool.query as jest.Mock).mockRejectedValue(new Error('db error'));
      await expect(pruneOldReadings(10000, pool)).rejects.toThrow('db error');
    });
  });
});
