import type { Config } from 'jest';

const ignore = ['<rootDir>/lib/', '<rootDir>/node_modules/'];
const config: Config = {
  automock: false,
  clearMocks: true,
  coverageDirectory: 'coverage',
  testEnvironment: 'jsdom',
  roots: ['src'],
  coveragePathIgnorePatterns: ignore,
  moduleFileExtensions: ['js', 'ts', 'tsx'],
  testPathIgnorePatterns: ignore,
  transformIgnorePatterns: ignore,
  transform: {
    '^.+\\.(t|j)sx?$': '@swc/jest',
  },
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.tsx'],
  moduleNameMapper: {
    'shared-store-object': '<rootDir>/src/index.ts',
  },
};

export default config;
