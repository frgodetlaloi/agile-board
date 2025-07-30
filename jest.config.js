/**
 * Configuration Jest pour le plugin Agile Board
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],

  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],

  testMatch: [
    '**/tests/**/*.test.(ts|js)',
    '**/src/**/*.test.(ts|js)',
    '**/__tests__/**/*.(ts|js)'
  ],

  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/main.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],

  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  verbose: true
};