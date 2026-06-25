module.exports = module.exports = {
  transform: {
    '^.+.[jt]sx?$': 'babel-jest',
  },
  moduleNameMapper: {
    '\\.(css|scss)$': '<rootDir>/mocks/empty-mock.ts',
  },
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: [
    '<rootDir>/dist/',
  ],
  setupFiles: [
    './jest-setup.ts',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'mjs'],
  collectCoverage: true,
  collectCoverageFrom: [
    '<rootDir>/src/**/*.{ts,tsx}',
  ],
  coverageDirectory: '<rootDir>/coverage/',
  coveragePathIgnorePatterns: [
    'app.tsx',
    'index.tsx',
    'index-dev.tsx',
    'dev-configs.ts',
  ],
  coverageReporters: [
    'lcov',
    'text',
    'text-summary',
  ],
};
