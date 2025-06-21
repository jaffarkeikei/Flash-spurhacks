module.exports = {
  // Indicates whether the coverage information should be collected while executing the test
  collectCoverage: true,

  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',

  // An array of glob patterns indicating a set of files for which coverage 
  // information should be collected
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!**/node_modules/**',
    '!**/vendor/**',
  ],

  // The test environment that will be used for testing
  testEnvironment: 'node',

  // A preset that is used as a base for Jest's configuration
  preset: 'ts-jest/presets/js-with-ts',

  // The glob patterns Jest uses to detect test files
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],

  // An array of regexp pattern strings that are matched against all test paths
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
  ],

  // A map from regular expressions to paths to transformers
  transform: {
    '^.+\\.(js|ts)$': 'babel-jest',
  },

  // Automatically clear mock calls and instances between every test
  clearMocks: true,

  // The maximum amount of workers used to run your tests
  maxWorkers: '50%',

  // An array of regexp pattern strings that are matched against all file paths before executing tests
  watchPathIgnorePatterns: [
    'node_modules',
    'dist',
  ],
}; 