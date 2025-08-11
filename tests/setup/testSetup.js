// Test setup file for Jest
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.test') });

// Global test setup
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  
  // Mock console methods to reduce noise in tests
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
});

// Global test teardown
afterAll(async () => {
  // Cleanup any global resources
  jest.clearAllMocks();
});

// Global beforeEach setup
beforeEach(() => {
  // Reset all mocks before each test
  jest.clearAllMocks();
});

// Global afterEach cleanup
afterEach(() => {
  // Cleanup after each test
});
