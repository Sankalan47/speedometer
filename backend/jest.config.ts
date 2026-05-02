import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  // Intercept pool.ts at every relative depth so unit tests never hit the real DB
  moduleNameMapper: {
    '^(\\.{1,2}/)+db/pool$': '<rootDir>/src/__mocks__/pool.ts',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/server.ts',
    '!src/types/**',
    '!src/__mocks__/**',
    '!src/__tests__/**',
  ],
  coverageThreshold: {
    global: { lines: 80, branches: 75 },
  },
};

export default config;
