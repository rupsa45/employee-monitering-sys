const jwt = require('jsonwebtoken');
const { createMockRequest, createMockResponse, createMockNext, generateTestToken } = require('../../utils/testHelpers');

// Mock dependencies
jest.mock('jsonwebtoken');

// Import the middleware
const { authentication: authToken } = require('../../../middleware/authToken');

describe('Auth Token Middleware', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = createMockRequest();
    mockRes = createMockResponse();
    mockNext = createMockNext();
  });

  describe('Valid Token', () => {
    it('should call next() when valid token is provided', () => {
      // Arrange
      const validToken = 'valid.jwt.token';
      const decodedToken = {
        userData: {
          empId: 'EMP001',
          empEmail: 'test@example.com',
          empRole: 'employee'
        }
      };

      mockReq.headers.authorization = `Bearer ${validToken}`;
      jwt.verify.mockImplementation((token, secret, callback) => {
        callback(null, decodedToken);
      });

      // Act
      authToken(mockReq, mockRes, mockNext);

      // Assert
      expect(jwt.verify).toHaveBeenCalledWith(validToken, process.env.SECRET_KEY, expect.any(Function));
      expect(mockReq.user).toEqual(decodedToken);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should handle token without Bearer prefix', () => {
      // Arrange
      const validToken = 'valid.jwt.token';
      const decodedToken = {
        userData: {
          empId: 'EMP001',
          empEmail: 'test@example.com',
          empRole: 'employee'
        }
      };

      mockReq.headers.authorization = `Bearer ${validToken}`;
      jwt.verify.mockImplementation((token, secret, callback) => {
        callback(null, decodedToken);
      });

      // Act
      authToken(mockReq, mockRes, mockNext);

      // Assert
      expect(jwt.verify).toHaveBeenCalledWith(validToken, process.env.SECRET_KEY, expect.any(Function));
      expect(mockReq.user).toEqual(decodedToken);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Invalid Token', () => {
    it('should return 401 when no authorization header is provided', () => {
      // Act
      authToken(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Token Not Found'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization header is empty', () => {
      // Arrange
      mockReq.headers.authorization = '';

      // Act
      authToken(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Token Not Found'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when token is invalid', () => {
      // Arrange
      const invalidToken = 'invalid.jwt.token';
      mockReq.headers.authorization = `Bearer ${invalidToken}`;
      
      jwt.verify.mockImplementation((token, secret, callback) => {
        callback(new Error('Invalid token'), null);
      });

      // Act
      authToken(mockReq, mockRes, mockNext);

      // Assert
      expect(jwt.verify).toHaveBeenCalledWith(invalidToken, process.env.SECRET_KEY, expect.any(Function));
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication Error!'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when token is expired', () => {
      // Arrange
      const expiredToken = 'expired.jwt.token';
      mockReq.headers.authorization = `Bearer ${expiredToken}`;
      
      jwt.verify.mockImplementation((token, secret, callback) => {
        const error = new Error('Token expired');
        error.name = 'TokenExpiredError';
        callback(error, null);
      });

      // Act
      authToken(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication Error!'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Token Verification', () => {
    it('should verify token with correct secret key', () => {
      // Arrange
      const token = 'test.jwt.token';
      mockReq.headers.authorization = `Bearer ${token}`;
      
      jwt.verify.mockImplementation((token, secret, callback) => {
        callback(null, { userData: { empId: 'EMP001' } });
      });

      // Act
      authToken(mockReq, mockRes, mockNext);

      // Assert
      expect(jwt.verify).toHaveBeenCalledWith(token, process.env.SECRET_KEY, expect.any(Function));
    });

    it('should set user data in request object', () => {
      // Arrange
      const token = 'test.jwt.token';
      const userData = {
        empId: 'EMP001',
        empEmail: 'test@example.com',
        empRole: 'admin'
      };

      mockReq.headers.authorization = `Bearer ${token}`;
      jwt.verify.mockImplementation((token, secret, callback) => {
        callback(null, { userData });
      });

      // Act
      authToken(mockReq, mockRes, mockNext);

      // Assert
      expect(mockReq.user).toEqual({ userData });
    });
  });

  describe('Error Handling', () => {
    it('should handle jwt.verify throwing generic error', () => {
      // Arrange
      const token = 'test.jwt.token';
      mockReq.headers.authorization = `Bearer ${token}`;
      
      jwt.verify.mockImplementation((token, secret, callback) => {
        callback(new Error('JWT verification failed'), null);
      });

      // Act
      authToken(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication Error!'
      });
    });

    it('should handle malformed authorization header', () => {
      // Arrange
      mockReq.headers.authorization = 'Bearer'; // Missing token

      // Act
      authToken(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication Error!'
      });
    });
  });
});
