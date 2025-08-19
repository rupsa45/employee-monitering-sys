const rateLimit = require('express-rate-limit');
// Logger removed for cleaner output

// Optional Redis imports (will fail gracefully if not available)
let RedisStore = null;
let redis = null;

try {
  RedisStore = require('rate-limit-redis').RedisStore;
  redis = require('redis');
} catch (error) {
  logger.warn('Redis dependencies not available, using memory store only', { error: error.message });
}

// Redis client for rate limiting (optional, falls back to memory store)
let redisClient = null;

try {
  if (redis) {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    
      redisClient.on('error', (err) => {
    // Redis connection failed, using memory store for rate limiting
    redisClient = null;
  });
  
  redisClient.on('connect', () => {
    // Redis connected for rate limiting
  });

    // Only connect if Redis is available and we're not in test environment
    if (process.env.NODE_ENV !== 'test') {
      redisClient.connect().catch(err => {
        logger.warn('Redis connection failed, using memory store for rate limiting', { error: err.message });
        redisClient = null;
      });
    }
  }
    } catch (error) {
      // Redis not available, using memory store for rate limiting
      redisClient = null;
    }

/**
 * Create a rate limiter with Redis store (if available) or memory store
 * @param {Object} options - Rate limiter options
 * @returns {Function} Express rate limiter middleware
 */
function createRateLimiter(options = {}) {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
      success: false,
      message: 'Too many requests, please try again later.',
      retryAfter: Math.ceil(options.windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise use IP
      return req.user ? `user:${req.user.id}` : req.ip;
    },
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        message: 'Too many requests, please try again later.',
        retryAfter: Math.ceil(options.windowMs / 1000)
      });
    }
  };

  const limiterOptions = { ...defaultOptions, ...options };

           // Use Redis store if available, otherwise use memory store
         if (redisClient && RedisStore && redisClient.isReady) {
           try {
             const redisStore = new RedisStore({
               sendCommand: (...args) => redisClient.sendCommand(args)
             });
             
             // Verify the store is valid by checking if it has required methods
             if (redisStore && typeof redisStore.incr === 'function') {
               limiterOptions.store = redisStore;
             } else {
               // Redis store is not valid, using memory store
             }
           } catch (error) {
             // Failed to create Redis store, using memory store
           }
         }

  return rateLimit(limiterOptions);
}

/**
 * Rate limiters for different endpoints
 */

// Meeting access token rate limiter (15 requests per 15 minutes per user)
const meetingTokenLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // 15 token requests per 15 minutes
  message: {
    success: false,
    message: 'Too many token requests. Please wait before requesting another token.',
    retryAfter: 900 // 15 minutes
  },
  keyGenerator: (req) => {
    // Use user ID for authenticated requests
    return req.user ? `token:${req.user.id}` : `token:${req.ip}`;
  }
});

// Meeting join rate limiter (10 joins per hour per user)
const meetingJoinLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 joins per hour
  message: {
    success: false,
    message: 'Too many meeting join attempts. Please wait before joining another meeting.',
    retryAfter: 3600 // 1 hour
  },
  keyGenerator: (req) => {
    return req.user ? `join:${req.user.id}` : `join:${req.ip}`;
  }
});

// Meeting creation rate limiter (5 meetings per hour per admin)
const meetingCreationLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 meetings per hour
  message: {
    success: false,
    message: 'Too many meeting creation attempts. Please wait before creating another meeting.',
    retryAfter: 3600 // 1 hour
  },
  keyGenerator: (req) => {
    return req.user ? `create:${req.user.id}` : `create:${req.ip}`;
  }
});

// Meeting invite rate limiter (20 invites per hour per admin)
const meetingInviteLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 invite batches per hour
  message: {
    success: false,
    message: 'Too many meeting invite attempts. Please wait before sending more invites.',
    retryAfter: 3600 // 1 hour
  },
  keyGenerator: (req) => {
    return req.user ? `invite:${req.user.id}` : `invite:${req.ip}`;
  }
});

// Socket.IO connection rate limiter (30 connections per 15 minutes per IP)
const socketConnectionLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 socket connections per 15 minutes
  message: {
    success: false,
    message: 'Too many socket connections. Please wait before connecting again.',
    retryAfter: 900 // 15 minutes
  },
  keyGenerator: (req) => {
    return `socket:${req.ip}`;
  }
});

// General API rate limiter (1000 requests per 15 minutes per IP)
const generalApiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per 15 minutes
  message: {
    success: false,
    message: 'Too many API requests. Please wait before making more requests.',
    retryAfter: 900 // 15 minutes
  }
});

/**
 * Socket.IO rate limiting middleware
 * This is used within Socket.IO connection handlers
 */
class SocketRateLimiter {
  constructor() {
    this.connectionAttempts = new Map();
    this.eventAttempts = new Map();
  }

  /**
   * Check if socket connection is allowed
   * @param {string} ip - Client IP address
   * @returns {boolean} Whether connection is allowed
   */
  canConnect(ip) {
    const key = `socket_connect:${ip}`;
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxAttempts = 30;

    if (!this.connectionAttempts.has(key)) {
      this.connectionAttempts.set(key, []);
    }

    const attempts = this.connectionAttempts.get(key);
    
    // Remove old attempts outside the window
    const validAttempts = attempts.filter(timestamp => now - timestamp < windowMs);
    
    if (validAttempts.length >= maxAttempts) {
      logger.warn('Socket connection rate limit exceeded', { ip });
      return false;
    }

    validAttempts.push(now);
    this.connectionAttempts.set(key, validAttempts);
    return true;
  }

  /**
   * Check if socket event is allowed
   * @param {string} socketId - Socket ID
   * @param {string} event - Event name
   * @returns {boolean} Whether event is allowed
   */
  canEmitEvent(socketId, event) {
    const key = `socket_event:${socketId}:${event}`;
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    const maxAttempts = this.getEventLimit(event);

    if (!this.eventAttempts.has(key)) {
      this.eventAttempts.set(key, []);
    }

    const attempts = this.eventAttempts.get(key);
    
    // Remove old attempts outside the window
    const validAttempts = attempts.filter(timestamp => now - timestamp < windowMs);
    
    if (validAttempts.length >= maxAttempts) {
      logger.warn('Socket event rate limit exceeded', { socketId, event });
      return false;
    }

    validAttempts.push(now);
    this.eventAttempts.set(key, validAttempts);
    return true;
  }

  /**
   * Get rate limit for specific event types
   * @param {string} event - Event name
   * @returns {number} Maximum attempts per minute
   */
  getEventLimit(event) {
    const limits = {
      'offer': 10,        // WebRTC offers
      'answer': 10,       // WebRTC answers
      'ice-candidate': 50, // ICE candidates
      'join-room': 5,     // Room joins
      'leave-room': 5,    // Room leaves
      'kick-participant': 3, // Host actions
      'ban-participant': 3,
      'end-meeting': 2,
      'default': 20       // Default for other events
    };

    return limits[event] || limits.default;
  }

  /**
   * Clean up old rate limit data
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes

    // Clean connection attempts
    for (const [key, attempts] of this.connectionAttempts.entries()) {
      const validAttempts = attempts.filter(timestamp => now - timestamp < maxAge);
      if (validAttempts.length === 0) {
        this.connectionAttempts.delete(key);
      } else {
        this.connectionAttempts.set(key, validAttempts);
      }
    }

    // Clean event attempts
    for (const [key, attempts] of this.eventAttempts.entries()) {
      const validAttempts = attempts.filter(timestamp => now - timestamp < maxAge);
      if (validAttempts.length === 0) {
        this.eventAttempts.delete(key);
      } else {
        this.eventAttempts.set(key, validAttempts);
      }
    }
  }
}

// Create singleton instance
const socketRateLimiter = new SocketRateLimiter();

// Clean up old data every 10 minutes
setInterval(() => {
  socketRateLimiter.cleanup();
}, 10 * 60 * 1000);

module.exports = {
  createRateLimiter,
  meetingTokenLimiter,
  meetingJoinLimiter,
  meetingCreationLimiter,
  meetingInviteLimiter,
  socketConnectionLimiter,
  generalApiLimiter,
  socketRateLimiter
};
