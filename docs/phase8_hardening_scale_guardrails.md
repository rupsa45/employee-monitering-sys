# Phase 8: Hardening & Scale Guardrails

## Overview

Phase 8 implements security hardening and scalability improvements for the video meeting system. This phase adds rate limiting, security measures, and prepares the system for future scaling with Redis and TURN servers.

## Features Implemented

### 1. Rate Limiting System

**Comprehensive Rate Limiting:**
- **Meeting Access Tokens**: 15 requests per 15 minutes per user
- **Meeting Joins**: 10 joins per hour per user
- **Meeting Creation**: 5 meetings per hour per admin
- **Meeting Invites**: 20 invite batches per hour per admin
- **Socket Connections**: 30 connections per 15 minutes per IP
- **General API**: 1000 requests per 15 minutes per IP

**Socket.IO Event Rate Limiting:**
- **WebRTC Offers**: 10 per minute per socket
- **WebRTC Answers**: 10 per minute per socket
- **ICE Candidates**: 50 per minute per socket
- **Room Joins/Leaves**: 5 per minute per socket
- **Host Actions**: 3 per minute per socket (kick/ban)
- **Meeting End**: 2 per minute per socket

### 2. Redis Integration (Optional)

**Scalable Rate Limiting:**
- Redis store for distributed rate limiting
- Automatic fallback to memory store if Redis unavailable
- Support for multi-instance deployments
- Configurable Redis connection via `REDIS_URL` environment variable

### 3. Security Hardening

**Rate Limit Enforcement:**
- Per-user and per-IP rate limiting
- Detailed logging of rate limit violations
- Graceful error responses with retry-after headers
- Automatic cleanup of old rate limit data

**Socket.IO Security:**
- Connection rate limiting before authentication
- Event-level rate limiting for WebRTC signaling
- Protection against signaling spam and DoS attacks

## Rate Limiting Configuration

### Environment Variables

```bash
# Redis configuration (optional)
REDIS_URL=redis://localhost:6379

# Rate limiting can work without Redis (uses memory store)
```

### Rate Limiter Types

#### 1. Meeting Token Limiter
```javascript
// 15 token requests per 15 minutes per user
const meetingTokenLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  keyGenerator: (req) => req.user ? `token:${req.user.id}` : `token:${req.ip}`
});
```

#### 2. Meeting Join Limiter
```javascript
// 10 joins per hour per user
const meetingJoinLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  keyGenerator: (req) => req.user ? `join:${req.user.id}` : `join:${req.ip}`
});
```

#### 3. Meeting Creation Limiter
```javascript
// 5 meetings per hour per admin
const meetingCreationLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  keyGenerator: (req) => req.user ? `create:${req.user.id}` : `create:${req.ip}`
});
```

#### 4. Socket.IO Rate Limiter
```javascript
// In-memory rate limiting for Socket.IO events
class SocketRateLimiter {
  canConnect(ip) // 30 connections per 15 minutes
  canEmitEvent(socketId, event) // Event-specific limits
}
```

## API Endpoints with Rate Limiting

### Admin Endpoints

```javascript
// Meeting creation with rate limiting
router.post('/', meetingCreationLimiter, meetingController.createMeeting);

// Meeting invites with rate limiting
router.post('/:id/remind', meetingInviteLimiter, meetingController.sendMeetingInvites);

// General API with rate limiting
router.get('/', generalApiLimiter, meetingController.getScheduledMeetings);
```

### Employee Endpoints

```javascript
// Meeting joins with rate limiting
router.post('/:roomCode/join', meetingJoinLimiter, empMeetingController.joinMeeting);

// Access tokens with rate limiting
router.post('/:roomCode/access-token', meetingTokenLimiter, empMeetingController.getMeetingAccessToken);

// General API with rate limiting
router.get('/', generalApiLimiter, empMeetingController.listMyMeetings);
```

## Socket.IO Rate Limiting

### Connection Rate Limiting

```javascript
// Applied before authentication
meetingsNamespace.use(async (socket, next) => {
  const clientIp = socket.handshake.address;
  if (!socketRateLimiter.canConnect(clientIp)) {
    return next(new Error('Connection rate limit exceeded'));
  }
  // ... authentication logic
});
```

### Event Rate Limiting

```javascript
// WebRTC signaling events
socket.on('signal:offer', (data) => {
  if (!socketRateLimiter.canEmitEvent(socket.id, 'offer')) {
    socket.emit('error', {
      message: 'Too many offer attempts. Please wait before sending another offer.',
      code: 'RATE_LIMITED'
    });
    return;
  }
  // ... offer handling logic
});
```

## Error Responses

### Rate Limit Exceeded

```json
{
  "success": false,
  "message": "Too many requests, please try again later.",
  "retryAfter": 900
}
```

### Socket.IO Rate Limited

```json
{
  "message": "Too many offer attempts. Please wait before sending another offer.",
  "code": "RATE_LIMITED"
}
```

## Logging

### Rate Limit Violations

```javascript
logger.warn('Rate limit exceeded', {
  ip: req.ip,
  userId: req.user?.id,
  path: req.path,
  userAgent: req.get('User-Agent')
});
```

### Socket Rate Limiting

```javascript
logger.warn('Socket connection rate limited', {
  socketId: socket.id,
  ip: clientIp
});

logger.warn('WebRTC offer rate limited', {
  socketId: socket.id,
  empId: userData.empId
});
```

## Future Scaling Considerations

### 1. Redis Adapter for Socket.IO

**For Multi-Instance Deployments:**

```javascript
// Future implementation for Socket.IO Redis adapter
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));
```

**Benefits:**
- Shared socket state across multiple server instances
- Automatic room synchronization
- Horizontal scaling support
- Load balancing compatibility

### 2. TURN Server Configuration

**For Connectivity Issues:**

When STUN servers are insufficient (NAT traversal issues), implement TURN servers:

```javascript
// Enhanced ICE configuration with TURN servers
const iceConfig = {
  iceServers: [
    // STUN servers (current)
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    
    // TURN servers (future)
    {
      urls: 'turn:your-turn-server.com:3478',
      username: 'username',
      credential: 'password'
    }
  ]
};
```

**TURN Server Setup (Coturn):**

```bash
# Install Coturn
sudo apt-get install coturn

# Configure /etc/turnserver.conf
listening-port=3478
tls-listening-port=5349
listening-ip=YOUR_SERVER_IP
external-ip=YOUR_SERVER_IP
realm=your-domain.com
server-name=your-domain.com
user-quota=12
total-quota=1200
authentication-method=long-term
user=username:password
cert=/path/to/cert.pem
pkey=/path/to/private.key
```

### 3. Load Balancer Configuration

**For High Availability:**

```nginx
# Nginx configuration for WebSocket support
upstream socket_nodes {
    ip_hash;
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
}

server {
    listen 80;
    server_name your-domain.com;

    location /socket.io/ {
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $http_host;
        proxy_set_header X-NginX-Proxy true;

        proxy_pass http://socket_nodes;
        proxy_redirect off;

        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## Monitoring and Metrics

### Rate Limit Metrics

```javascript
// Track rate limit violations
const rateLimitMetrics = {
  totalViolations: 0,
  violationsByEndpoint: {},
  violationsByUser: {},
  violationsByIP: {}
};

// Log metrics periodically
setInterval(() => {
  logger.info('Rate limit metrics', rateLimitMetrics);
}, 5 * 60 * 1000); // Every 5 minutes
```

### Socket.IO Metrics

```javascript
// Track socket connections and events
const socketMetrics = {
  totalConnections: 0,
  activeConnections: 0,
  eventsPerMinute: {},
  rateLimitViolations: 0
};
```

## Security Best Practices

### 1. Rate Limiting Strategy

- **Progressive Limits**: Stricter limits for sensitive operations
- **User-Based Limits**: Per-user limits for authenticated requests
- **IP-Based Fallback**: IP-based limits for unauthenticated requests
- **Event-Specific Limits**: Different limits for different WebRTC events

### 2. Redis Security

```javascript
// Secure Redis configuration
const redisClient = redis.createClient({
  url: process.env.REDIS_URL,
  password: process.env.REDIS_PASSWORD,
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined
});
```

### 3. Environment Variables

```bash
# Required for production
REDIS_URL=redis://username:password@host:port
REDIS_PASSWORD=your_redis_password
REDIS_TLS=true

# Optional TURN server configuration
TURN_SERVER_URL=turn:your-turn-server.com:3478
TURN_SERVER_USERNAME=username
TURN_SERVER_PASSWORD=password
```

## Testing Rate Limits

### Unit Tests

```javascript
describe('Rate Limiting', () => {
  it('should limit meeting token requests', async () => {
    // Make 16 requests (over the limit of 15)
    for (let i = 0; i < 16; i++) {
      const response = await request(app)
        .post('/emp/meetings/ABC123/access-token')
        .set('Authorization', `Bearer ${token}`);
      
      if (i === 15) {
        expect(response.status).toBe(429);
        expect(response.body.message).toContain('Too many token requests');
      }
    }
  });
});
```

### Load Testing

```javascript
// Artillery.js configuration for load testing
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Normal load"
    - duration: 30
      arrivalRate: 50
      name: "High load"
    - duration: 30
      arrivalRate: 100
      name: "Peak load"
```

## Performance Considerations

### 1. Memory Usage

- Rate limit data is automatically cleaned up every 10 minutes
- Old entries older than 30 minutes are removed
- Redis store reduces memory usage in multi-instance deployments

### 2. CPU Impact

- Rate limiting checks are O(1) operations
- Minimal impact on request processing time
- Efficient cleanup prevents memory leaks

### 3. Network Overhead

- Rate limit headers are minimal
- Redis communication is optimized for low latency
- Graceful degradation when Redis is unavailable

## Deployment Checklist

### Pre-Production

- [ ] Configure Redis for rate limiting
- [ ] Set appropriate rate limits for your use case
- [ ] Test rate limiting with load testing
- [ ] Monitor rate limit violations
- [ ] Configure logging for rate limit events

### Production

- [ ] Enable Redis TLS for security
- [ ] Set up monitoring and alerting
- [ ] Configure load balancer for WebSocket support
- [ ] Plan for TURN server deployment if needed
- [ ] Document rate limit policies for users

## Files Modified

- `middleware/rateLimiter.js` - New rate limiting middleware
- `admin_app/routes/meetingRoute.js` - Added rate limiting to admin routes
- `employee_app/routes/empMeetingRoute.js` - Added rate limiting to employee routes
- `socket/meetings.js` - Added Socket.IO rate limiting
- `package.json` - Added rate limiting dependencies

## Dependencies Added

```json
{
  "express-rate-limit": "^7.1.5",
  "rate-limit-redis": "^4.2.0",
  "redis": "^4.6.12"
}
```

## Benefits

1. **Security**: Prevents abuse and DoS attacks
2. **Scalability**: Prepares system for multi-instance deployment
3. **Reliability**: Graceful degradation when Redis is unavailable
4. **Monitoring**: Comprehensive logging and metrics
5. **Performance**: Minimal overhead with efficient algorithms
6. **Future-Proof**: Easy to extend for additional security measures

## Next Steps

1. **Monitor**: Track rate limit violations in production
2. **Tune**: Adjust limits based on actual usage patterns
3. **Scale**: Deploy Redis for multi-instance support
4. **Enhance**: Add TURN servers if connectivity issues arise
5. **Optimize**: Fine-tune cleanup intervals and memory usage



