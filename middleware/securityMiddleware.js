const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean'); // Note: Consider replacing with helmet's built-in XSS protection
const { promisify } = require('util');
const redis = require('ioredis');

/**
 * Advanced Security Middleware
 * Provides comprehensive security features for the application
 */
class SecurityMiddleware {
  constructor() {
    this.redisClient = null;
    this.initializeRedis();
  }

  /**
   * Initialize Redis for rate limiting
   */
  async initializeRedis() {
    try {
      this.redisClient = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        db: process.env.REDIS_RATE_LIMIT_DB || 1
      });

      this.redisClient.on('connect', () => {
        console.log('✅ Redis rate limiter connected');
      });

      this.redisClient.on('error', (error) => {
        console.warn('⚠️ Redis rate limiter error:', error.message);
      });
    } catch (error) {
      console.warn('⚠️ Redis rate limiter unavailable, using memory store:', error.message);
    }
  }

  /**
   * Get Redis store for rate limiting
   */
  getRedisStore() {
    if (!this.redisClient) return null;

    const RedisStore = require('rate-limit-redis');
    return new RedisStore({
      sendCommand: (...args) => this.redisClient.call(...args)
    });
  }

  /**
   * Basic rate limiter
   */
  basicRateLimit() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per windowMs
      message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false,
      store: this.getRedisStore(),
      handler: (req, res) => {
        res.status(429).json({
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil(15 * 60), // 15 minutes in seconds
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  /**
   * Strict rate limiter for sensitive endpoints
   */
  strictRateLimit() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 20, // Limit each IP to 20 requests per windowMs
      message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false,
      store: this.getRedisStore(),
      handler: (req, res) => {
        res.status(429).json({
          error: 'Rate limit exceeded',
          message: 'Too many requests to this sensitive endpoint.',
          retryAfter: Math.ceil(15 * 60),
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  /**
   * Authentication rate limiter
   */
  authRateLimit() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // Limit each IP to 5 login attempts per windowMs
      message: {
        error: 'Too many authentication attempts, please try again later.',
        retryAfter: '15 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false,
      store: this.getRedisStore(),
      handler: (req, res) => {
        res.status(429).json({
          error: 'Authentication rate limit exceeded',
          message: 'Too many login attempts. Please try again later.',
          retryAfter: Math.ceil(15 * 60),
          timestamp: new Date().toISOString()
        });
      },
      skipSuccessfulRequests: true // Don't count successful logins
    });
  }

  /**
   * API rate limiter
   */
  apiRateLimit() {
    return rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 60, // Limit each IP to 60 API requests per minute
      message: {
        error: 'API rate limit exceeded, please try again later.',
        retryAfter: '1 minute'
      },
      standardHeaders: true,
      legacyHeaders: false,
      store: this.getRedisStore(),
      handler: (req, res) => {
        res.status(429).json({
          error: 'API rate limit exceeded',
          message: 'Too many API requests. Please try again later.',
          retryAfter: Math.ceil(60), // 1 minute in seconds
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  /**
   * WebRTC rate limiter
   */
  webrtcRateLimit() {
    return rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 30, // Limit each IP to 30 WebRTC signaling requests per minute
      message: {
        error: 'WebRTC rate limit exceeded, please try again later.',
        retryAfter: '1 minute'
      },
      standardHeaders: true,
      legacyHeaders: false,
      store: this.getRedisStore(),
      handler: (req, res) => {
        res.status(429).json({
          error: 'WebRTC rate limit exceeded',
          message: 'Too many WebRTC requests. Please try again later.',
          retryAfter: Math.ceil(60),
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  /**
   * File upload rate limiter
   */
  uploadRateLimit() {
    return rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 10, // Limit each IP to 10 file uploads per hour
      message: {
        error: 'File upload rate limit exceeded, please try again later.',
        retryAfter: '1 hour'
      },
      standardHeaders: true,
      legacyHeaders: false,
      store: this.getRedisStore(),
      handler: (req, res) => {
        res.status(429).json({
          error: 'File upload rate limit exceeded',
          message: 'Too many file uploads. Please try again later.',
          retryAfter: Math.ceil(60 * 60), // 1 hour in seconds
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  /**
   * CORS configuration
   */
  corsConfig() {
    return cors({
      origin: (origin, callback) => {
        const allowedOrigins = [
          process.env.FRONTEND_URL || 'http://localhost:3000',
          process.env.ADMIN_FRONTEND_URL || 'http://localhost:3001',
          'http://localhost:3000',
          'http://localhost:3001'
        ];

        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'X-API-Key',
        'X-Request-ID'
      ],
      exposedHeaders: ['X-Total-Count', 'X-Page-Count', 'X-Current-Page'],
      maxAge: 86400 // 24 hours
    });
  }

  /**
   * Security headers configuration
   */
  securityHeaders() {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:"],
          scriptSrc: ["'self'"],
          connectSrc: ["'self'", "ws:", "wss:"],
          mediaSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameSrc: ["'none'"],
          upgradeInsecureRequests: []
        }
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" }
    });
  }

  /**
   * Request sanitization
   */
  sanitizeRequest() {
    return [
      // Sanitize MongoDB queries
      mongoSanitize({
        replaceWith: '_'
      }),
      
      // Sanitize XSS
      xss(),
      
      // Prevent HTTP Parameter Pollution
      hpp({
        whitelist: ['tags', 'categories'] // Allow these parameters to have multiple values
      })
    ];
  }

  /**
   * Request ID middleware
   */
  requestId() {
    return (req, res, next) => {
      req.id = req.headers['x-request-id'] || 
               req.headers['x-correlation-id'] || 
               require('crypto').randomUUID();
      
      res.setHeader('X-Request-ID', req.id);
      next();
    };
  }

  /**
   * Request logging middleware
   */
  requestLogger() {
    return (req, res, next) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        const logData = {
          timestamp: new Date().toISOString(),
          method: req.method,
          url: req.originalUrl,
          status: res.statusCode,
          duration: `${duration}ms`,
          ip: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
          requestId: req.id
        };

        // Log based on status code
        if (res.statusCode >= 400) {
          console.warn('🚨 Request Error:', logData);
        } else if (res.statusCode >= 300) {
          console.info('ℹ️ Request Redirect:', logData);
        } else {
          console.info('✅ Request Success:', logData);
        }
      });

      next();
    };
  }

  /**
   * Error handling middleware
   */
  errorHandler() {
    return (error, req, res, next) => {
      const errorResponse = {
        error: true,
        message: error.message || 'Internal Server Error',
        status: error.status || 500,
        timestamp: new Date().toISOString(),
        requestId: req.id,
        path: req.originalUrl,
        method: req.method
      };

      // Add stack trace in development
      if (process.env.NODE_ENV === 'development') {
        errorResponse.stack = error.stack;
      }

      // Log error
      console.error('❌ Error occurred:', errorResponse);

      // Send error response
      res.status(errorResponse.status).json(errorResponse);
    };
  }

  /**
   * 404 handler
   */
  notFoundHandler() {
    return (req, res) => {
      res.status(404).json({
        error: true,
        message: 'Route not found',
        status: 404,
        timestamp: new Date().toISOString(),
        requestId: req.id,
        path: req.originalUrl,
        method: req.method
      });
    };
  }

  /**
   * Health check endpoint
   */
  healthCheck() {
    return (req, res) => {
      const health = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      };

      res.status(200).json(health);
    };
  }

  /**
   * Get all security middleware
   */
  getAllMiddleware() {
    return {
      basicRateLimit: this.basicRateLimit(),
      strictRateLimit: this.strictRateLimit(),
      authRateLimit: this.authRateLimit(),
      apiRateLimit: this.apiRateLimit(),
      webrtcRateLimit: this.webrtcRateLimit(),
      uploadRateLimit: this.uploadRateLimit(),
      cors: this.corsConfig(),
      securityHeaders: this.securityHeaders(),
      sanitizeRequest: this.sanitizeRequest(),
      requestId: this.requestId(),
      requestLogger: this.requestLogger(),
      errorHandler: this.errorHandler(),
      notFoundHandler: this.notFoundHandler(),
      healthCheck: this.healthCheck()
    };
  }
}

module.exports = new SecurityMiddleware();
