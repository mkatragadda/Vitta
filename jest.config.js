/**
 * Jest Configuration
 * Testing framework for critical financial calculations
 */

const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  // Test environment
  testEnvironment: 'node',

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Test match patterns
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/__tests__/**/*.test.jsx',
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'utils/**/*.js',
    'services/recommendations/**/*.js',
    'services/chat/**/*.js',
    '!**/*.test.js',
    '!**/node_modules/**',
    '!**/.next/**',
  ],

  // Coverage thresholds for critical files
  coverageThreshold: {
    './utils/statementCycleUtils.js': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    './utils/paymentCycleUtils.js': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    './services/recommendations/recommendationStrategies.js': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },

  // Module paths
  modulePaths: ['<rootDir>'],

  // Transform files
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['@swc/jest'],
  },

  // Module name mapper for absolute imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
  ],

  // Verbose output
  verbose: true,

  // Timeout for tests (increase for integration tests)
  testTimeout: 10000,
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);

