const request = require('supertest');
const express = require('express');
const {
  createRateLimiter,
  meetingTokenLimiter,
  meetingJoinLimiter,
  meetingCreationLimiter,
  meetingInviteLimiter,
  socketConnectionLimiter,
  generalApiLimiter,
  socketRateLimiter
} = require('../../middleware/rateLimiter');

// Mock Redis
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    on: jest.fn(),
    sendCommand: jest.fn()
  }))
}));

// Mock rate-limit-redis with a proper constructor
jest.mock('rate-limit-redis', () => ({
  RedisStore: jest.fn().mockImplementation(() => ({
    // Mock the store interface methods
    incr: jest.fn(),
    decrement: jest.fn(),
    resetKey: jest.fn(),
    resetAll: jest.fn()
  }))
}));

describe('Rate Limiter Middleware', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('createRateLimiter', () => {
    it('should create a rate limiter with default options', () => {
      const limiter = createRateLimiter();
      expect(limiter).toBeDefined();
      expect(typeof limiter).toBe('function');
    });

    it('should create a rate limiter with custom options', () => {
      const limiter = createRateLimiter({
        windowMs: 60 * 1000, // 1 minute
        max: 5,
        message: {
          success: false,
          message: 'Custom rate limit message'
        }
      });
      expect(limiter).toBeDefined();
    });
  });

  describe('Meeting Token Limiter', () => {
    it('should limit token requests per user', async () => {
      app.use('/test', meetingTokenLimiter, (req, res) => {
        res.json({ success: true, message: 'Token generated' });
      });

      // Mock user authentication
      app.use((req, res, next) => {
        req.user = { id: 'user123' };
        req.ip = '127.0.0.1';
        next();
      });

      // Make requests up to the limit (15)
      for (let i = 0; i < 15; i++) {
        const response = await request(app)
          .post('/test')
          .expect(200);
        
        expect(response.body.success).toBe(true);
      }

      // 16th request should be rate limited
      const rateLimitedResponse = await request(app)
        .post('/test')
        .expect(429);

      expect(rateLimitedResponse.body.success).toBe(false);
      expect(rateLimitedResponse.body.message).toContain('Too many token requests');
      expect(rateLimitedResponse.body.retryAfter).toBe(900); // 15 minutes
    });
  });

  describe('Meeting Join Limiter', () => {
    it('should limit join attempts per user', async () => {
      app.use('/test', meetingJoinLimiter, (req, res) => {
        res.json({ success: true, message: 'Joined meeting' });
      });

      // Mock user authentication
      app.use((req, res, next) => {
        req.user = { id: 'user123' };
        req.ip = '127.0.0.1';
        next();
      });

      // Make requests up to the limit (10)
      for (let i = 0; i < 10; i++) {
        const response = await request(app)
          .post('/test')
          .expect(200);
        
        expect(response.body.success).toBe(true);
      }

      // 11th request should be rate limited
      const rateLimitedResponse = await request(app)
        .post('/test')
        .expect(429);

      expect(rateLimitedResponse.body.success).toBe(false);
      expect(rateLimitedResponse.body.message).toContain('Too many meeting join attempts');
      expect(rateLimitedResponse.body.retryAfter).toBe(3600); // 1 hour
    });
  });

  describe('Meeting Creation Limiter', () => {
    it('should limit meeting creation per admin', async () => {
      app.use('/test', meetingCreationLimiter, (req, res) => {
        res.json({ success: true, message: 'Meeting created' });
      });

      // Mock admin authentication
      app.use((req, res, next) => {
        req.user = { id: 'admin123' };
        req.ip = '127.0.0.1';
        next();
      });

      // Make requests up to the limit (5)
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post('/test')
          .expect(200);
        
        expect(response.body.success).toBe(true);
      }

      // 6th request should be rate limited
      const rateLimitedResponse = await request(app)
        .post('/test')
        .expect(429);

      expect(rateLimitedResponse.body.success).toBe(false);
      expect(rateLimitedResponse.body.message).toContain('Too many meeting creation attempts');
    });
  });

  describe('Meeting Invite Limiter', () => {
    it('should limit invite batches per admin', async () => {
      app.use('/test', meetingInviteLimiter, (req, res) => {
        res.json({ success: true, message: 'Invites sent' });
      });

      // Mock admin authentication
      app.use((req, res, next) => {
        req.user = { id: 'admin123' };
        req.ip = '127.0.0.1';
        next();
      });

      // Make requests up to the limit (20)
      for (let i = 0; i < 20; i++) {
        const response = await request(app)
          .post('/test')
          .expect(200);
        
        expect(response.body.success).toBe(true);
      }

      // 21st request should be rate limited
      const rateLimitedResponse = await request(app)
        .post('/test')
        .expect(429);

      expect(rateLimitedResponse.body.success).toBe(false);
      expect(rateLimitedResponse.body.message).toContain('Too many meeting invite attempts');
    });
  });

  describe('General API Limiter', () => {
    it('should limit general API requests per IP', async () => {
      app.use('/test', generalApiLimiter, (req, res) => {
        res.json({ success: true, message: 'API response' });
      });

      // Mock IP address
      app.use((req, res, next) => {
        req.ip = '192.168.1.100';
        next();
      });

      // Make requests up to the limit (1000)
      for (let i = 0; i < 1000; i++) {
        const response = await request(app)
          .get('/test')
          .expect(200);
        
        expect(response.body.success).toBe(true);
      }

      // 1001st request should be rate limited
      const rateLimitedResponse = await request(app)
        .get('/test')
        .expect(429);

      expect(rateLimitedResponse.body.success).toBe(false);
      expect(rateLimitedResponse.body.message).toContain('Too many API requests');
    });
  });

  describe('Socket Rate Limiter', () => {
    beforeEach(() => {
      // Reset the socket rate limiter for each test
      socketRateLimiter.connectionAttempts.clear();
      socketRateLimiter.eventAttempts.clear();
    });

    describe('canConnect', () => {
      it('should allow connections within limit', () => {
        const ip = '192.168.1.100';
        
        // Allow 30 connections (the limit)
        for (let i = 0; i < 30; i++) {
          expect(socketRateLimiter.canConnect(ip)).toBe(true);
        }
      });

      it('should block connections over limit', () => {
        const ip = '192.168.1.100';
        
        // Make 30 connections (the limit)
        for (let i = 0; i < 30; i++) {
          socketRateLimiter.canConnect(ip);
        }

        // 31st connection should be blocked
        expect(socketRateLimiter.canConnect(ip)).toBe(false);
      });

      it('should track different IPs separately', () => {
        const ip1 = '192.168.1.100';
        const ip2 = '192.168.1.101';
        
        // Make 30 connections for IP1
        for (let i = 0; i < 30; i++) {
          socketRateLimiter.canConnect(ip1);
        }

        // IP1 should be blocked
        expect(socketRateLimiter.canConnect(ip1)).toBe(false);
        
        // IP2 should still be allowed
        expect(socketRateLimiter.canConnect(ip2)).toBe(true);
      });
    });

    describe('canEmitEvent', () => {
      it('should allow WebRTC offers within limit', () => {
        const socketId = 'socket123';
        
        // Allow 10 offers (the limit)
        for (let i = 0; i < 10; i++) {
          expect(socketRateLimiter.canEmitEvent(socketId, 'offer')).toBe(true);
        }
      });

      it('should block WebRTC offers over limit', () => {
        const socketId = 'socket123';
        
        // Make 10 offers (the limit)
        for (let i = 0; i < 10; i++) {
          socketRateLimiter.canEmitEvent(socketId, 'offer');
        }

        // 11th offer should be blocked
        expect(socketRateLimiter.canEmitEvent(socketId, 'offer')).toBe(false);
      });

      it('should allow more ICE candidates than offers', () => {
        const socketId = 'socket123';
        
        // ICE candidates have a higher limit (50)
        for (let i = 0; i < 50; i++) {
          expect(socketRateLimiter.canEmitEvent(socketId, 'ice-candidate')).toBe(true);
        }

        // 51st ICE candidate should be blocked
        expect(socketRateLimiter.canEmitEvent(socketId, 'ice-candidate')).toBe(false);
      });

      it('should track different events separately', () => {
        const socketId = 'socket123';
        
        // Make 10 offers (the limit)
        for (let i = 0; i < 10; i++) {
          socketRateLimiter.canEmitEvent(socketId, 'offer');
        }

        // Offers should be blocked
        expect(socketRateLimiter.canEmitEvent(socketId, 'offer')).toBe(false);
        
        // Answers should still be allowed
        expect(socketRateLimiter.canEmitEvent(socketId, 'answer')).toBe(true);
      });

      it('should track different sockets separately', () => {
        const socketId1 = 'socket123';
        const socketId2 = 'socket456';
        
        // Make 10 offers for socket1
        for (let i = 0; i < 10; i++) {
          socketRateLimiter.canEmitEvent(socketId1, 'offer');
        }

        // Socket1 offers should be blocked
        expect(socketRateLimiter.canEmitEvent(socketId1, 'offer')).toBe(false);
        
        // Socket2 offers should still be allowed
        expect(socketRateLimiter.canEmitEvent(socketId2, 'offer')).toBe(true);
      });
    });

    describe('getEventLimit', () => {
      it('should return correct limits for different events', () => {
        expect(socketRateLimiter.getEventLimit('offer')).toBe(10);
        expect(socketRateLimiter.getEventLimit('answer')).toBe(10);
        expect(socketRateLimiter.getEventLimit('ice-candidate')).toBe(50);
        expect(socketRateLimiter.getEventLimit('join-room')).toBe(5);
        expect(socketRateLimiter.getEventLimit('leave-room')).toBe(5);
        expect(socketRateLimiter.getEventLimit('kick-participant')).toBe(3);
        expect(socketRateLimiter.getEventLimit('ban-participant')).toBe(3);
        expect(socketRateLimiter.getEventLimit('end-meeting')).toBe(2);
        expect(socketRateLimiter.getEventLimit('unknown-event')).toBe(20); // default
      });
    });

    describe('cleanup', () => {
      it('should clean up old rate limit data', () => {
        const ip = '192.168.1.100';
        const socketId = 'socket123';
        
        // Add some old data (simulate by directly manipulating the Map)
        const oldTimestamp = Date.now() - (31 * 60 * 1000); // 31 minutes ago
        socketRateLimiter.connectionAttempts.set(`socket_connect:${ip}`, [oldTimestamp]);
        socketRateLimiter.eventAttempts.set(`socket_event:${socketId}:offer`, [oldTimestamp]);
        
        // Add some recent data
        const recentTimestamp = Date.now() - (5 * 60 * 1000); // 5 minutes ago
        socketRateLimiter.connectionAttempts.set(`socket_connect:192.168.1.101`, [recentTimestamp]);
        socketRateLimiter.eventAttempts.set(`socket_event:${socketId}:answer`, [recentTimestamp]);
        
        // Run cleanup
        socketRateLimiter.cleanup();
        
        // Old data should be removed
        expect(socketRateLimiter.connectionAttempts.has(`socket_connect:${ip}`)).toBe(false);
        expect(socketRateLimiter.eventAttempts.has(`socket_event:${socketId}:offer`)).toBe(false);
        
        // Recent data should remain
        expect(socketRateLimiter.connectionAttempts.has('socket_connect:192.168.1.101')).toBe(true);
        expect(socketRateLimiter.eventAttempts.has(`socket_event:${socketId}:answer`)).toBe(true);
      });
    });
  });

  describe('Rate Limiter Configuration', () => {
    it('should use user ID for authenticated requests', () => {
      const limiter = createRateLimiter({
        keyGenerator: (req) => req.user ? `user:${req.user.id}` : req.ip
      });
      
      expect(limiter).toBeDefined();
    });

    it('should include retry-after header', () => {
      app.use('/test', meetingTokenLimiter, (req, res) => {
        res.json({ success: true });
      });

      // Mock user authentication
      app.use((req, res, next) => {
        req.user = { id: 'user123' };
        req.ip = '127.0.0.1';
        next();
      });

      // Make requests to trigger rate limiting
      for (let i = 0; i < 16; i++) {
        request(app).post('/test');
      }

      // Check that retry-after header is set
      return request(app)
        .post('/test')
        .expect(429)
        .expect('Retry-After', /^\d+$/);
    });
  });
});
