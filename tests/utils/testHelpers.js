// Test utility functions for common testing operations

/**
 * Create a mock request object
 * @param {Object} body - Request body
 * @param {Object} params - Request parameters
 * @param {Object} query - Query parameters
 * @param {Object} headers - Request headers
 * @returns {Object} Mock request object
 */
const createMockRequest = (body = {}, params = {}, query = {}, headers = {}) => {
  return {
    body,
    params,
    query,
    headers: {
      'content-type': 'application/json',
      ...headers
    }
  };
};

/**
 * Create a mock response object
 * @returns {Object} Mock response object
 */
const createMockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.redirect = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  res.getHeader = jest.fn();
  return res;
};

/**
 * Create a mock next function for middleware testing
 * @returns {Function} Mock next function
 */
const createMockNext = () => {
  return jest.fn();
};

/**
 * Generate a valid JWT token for testing
 * @param {Object} payload - Token payload
 * @param {string} secret - Secret key
 * @returns {string} JWT token
 */
const generateTestToken = (payload = {}, secret = 'test_secret') => {
  const jwt = require('jsonwebtoken');
  return jwt.sign(payload, secret, { expiresIn: '1h' });
};

/**
 * Mock file upload for testing
 * @param {string} filename - File name
 * @param {string} mimetype - File MIME type
 * @param {number} size - File size in bytes
 * @returns {Object} Mock file object
 */
const createMockFile = (filename = 'test.jpg', mimetype = 'image/jpeg', size = 1024) => {
  return {
    fieldname: 'file',
    originalname: filename,
    encoding: '7bit',
    mimetype,
    size,
    destination: '/tmp/',
    filename: `test_${Date.now()}_${filename}`,
    path: `/tmp/test_${Date.now()}_${filename}`,
    buffer: Buffer.from('test file content')
  };
};

/**
 * Create a mock database error
 * @param {string} message - Error message
 * @param {string} code - Error code
 * @returns {Error} Database error
 */
const createDatabaseError = (message = 'Database error', code = 'DB_ERROR') => {
  const error = new Error(message);
  error.code = code;
  return error;
};

/**
 * Mock console methods to reduce noise in tests
 */
const mockConsole = () => {
  const originalConsole = { ...console };
  
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
  console.info = jest.fn();
  console.debug = jest.fn();
  
  return {
    restore: () => {
      console.log = originalConsole.log;
      console.error = originalConsole.error;
      console.warn = originalConsole.warn;
      console.info = originalConsole.info;
      console.debug = originalConsole.debug;
    }
  };
};

/**
 * Wait for a specified time (useful for async testing)
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise} Promise that resolves after the specified time
 */
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Create test data with timestamps
 * @param {Object} data - Base data object
 * @returns {Object} Data with timestamps
 */
const createTestDataWithTimestamps = (data) => {
  const now = new Date().toISOString();
  return {
    ...data,
    createdAt: now,
    updatedAt: now
  };
};

/**
 * Validate response structure
 * @param {Object} response - Response object
 * @param {boolean} expectSuccess - Whether to expect success response
 * @param {string} expectedMessage - Expected message
 */
const validateResponse = (response, expectSuccess = true, expectedMessage = null) => {
  expect(response).toHaveProperty('success');
  expect(typeof response.success).toBe('boolean');
  
  if (expectSuccess) {
    expect(response.success).toBe(true);
  } else {
    expect(response.success).toBe(false);
  }
  
  if (expectedMessage) {
    expect(response).toHaveProperty('message');
    expect(response.message).toBe(expectedMessage);
  }
};

/**
 * Create a mock Prisma client
 * @returns {Object} Mock Prisma client
 */
const createMockPrismaClient = () => {
  return {
    employee: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn()
    },
    timeSheet: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn()
    },
    leaveRequest: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn()
    },
    task: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn()
    },
    notification: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn()
    }
  };
};

/**
 * Reset all mocks
 */
const resetAllMocks = () => {
  jest.clearAllMocks();
  jest.resetAllMocks();
};

/**
 * Create test environment variables
 */
const setupTestEnvironment = () => {
  process.env.NODE_ENV = 'test';
  process.env.SECRET_KEY = 'test_secret_key';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
  process.env.PORT = '8001';
};

module.exports = {
  createMockRequest,
  createMockResponse,
  createMockNext,
  generateTestToken,
  createMockFile,
  createDatabaseError,
  mockConsole,
  wait,
  createTestDataWithTimestamps,
  validateResponse,
  createMockPrismaClient,
  resetAllMocks,
  setupTestEnvironment
};
