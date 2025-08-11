module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js',
    '**/__tests__/**/*.js'
  ],
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'tests/coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    '**/*.js',
    '!**/node_modules/**',
    '!**/tests/**',
    '!**/coverage/**',
    '!jest.config.js',
    '!index.js'
  ],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup/testSetup.js'],
  
  // Test timeout
  testTimeout: 30000,
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Module name mapping for imports
          moduleNameMapper: {
          '^@/(.*)$': '<rootDir>/$1'
        },
  
  // Test environment variables
  testEnvironmentOptions: {
    NODE_ENV: 'test'
  }
};
