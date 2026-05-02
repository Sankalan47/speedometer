/**
 * __mocks__/pool.ts
 * Manual Jest mock for the pg Pool singleton.
 *
 * Design note: pool.ts throws at import time if DB env vars are absent.
 * This mock intercepts every import of ../db/pool (via moduleNameMapper)
 * so unit tests can import repository / controller modules without needing
 * real database credentials.
 */

const mockPool = {
  query: jest.fn(),
  end: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
};

export default mockPool;
