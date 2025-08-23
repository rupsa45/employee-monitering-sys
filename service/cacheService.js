const NodeCache = require('node-cache');
const Redis = require('ioredis');

/**
 * Advanced Caching Service
 * Provides multi-layer caching with Redis and in-memory fallback
 */
class CacheService {
  constructor() {
    this.memoryCache = new NodeCache({
      stdTTL: 300, // 5 minutes default
      checkperiod: 60, // Check for expired keys every minute
      useClones: false,
      deleteOnExpire: true
    });

    this.redisClient = null;
    this.isRedisConnected = false;
    this.cacheStats = {
      memoryHits: 0,
      memoryMisses: 0,
      redisHits: 0,
      redisMisses: 0,
      totalRequests: 0
    };

    this.initializeRedis();
  }

  /**
   * Initialize Redis connection
   */
  async initializeRedis() {
    try {
      this.redisClient = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        db: process.env.REDIS_DB || 0,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true
      });

      this.redisClient.on('connect', () => {
        console.log('✅ Redis cache connected');
        this.isRedisConnected = true;
      });

      this.redisClient.on('error', (error) => {
        console.warn('⚠️ Redis cache error:', error.message);
        this.isRedisConnected = false;
      });

      this.redisClient.on('close', () => {
        console.warn('⚠️ Redis cache disconnected');
        this.isRedisConnected = false;
      });

      await this.redisClient.connect();
    } catch (error) {
      console.warn('⚠️ Redis cache unavailable, using memory cache only:', error.message);
      this.isRedisConnected = false;
    }
  }

  /**
   * Generate cache key
   * @param {string} prefix - Cache prefix
   * @param {Object} params - Parameters to hash
   * @returns {string} Cache key
   */
  generateKey(prefix, params = {}) {
    const hash = require('crypto').createHash('md5')
      .update(JSON.stringify(params))
      .digest('hex');
    return `${prefix}:${hash}`;
  }

  /**
   * Get value from cache (Redis first, then memory)
   * @param {string} key - Cache key
   * @returns {Promise<any>} Cached value or null
   */
  async get(key) {
    this.cacheStats.totalRequests++;
    
    try {
      // Try Redis first
      if (this.isRedisConnected && this.redisClient) {
        const value = await this.redisClient.get(key);
        if (value !== null) {
          this.cacheStats.redisHits++;
          return JSON.parse(value);
        }
        this.cacheStats.redisMisses++;
      }

      // Fallback to memory cache
      const memoryValue = this.memoryCache.get(key);
      if (memoryValue !== undefined) {
        this.cacheStats.memoryHits++;
        return memoryValue;
      }
      this.cacheStats.memoryMisses++;

      return null;
    } catch (error) {
      console.warn('Cache get error:', error.message);
      // Fallback to memory cache on Redis error
      const memoryValue = this.memoryCache.get(key);
      if (memoryValue !== undefined) {
        this.cacheStats.memoryHits++;
        return memoryValue;
      }
      this.cacheStats.memoryMisses++;
      return null;
    }
  }

  /**
   * Set value in cache (both Redis and memory)
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} Success status
   */
  async set(key, value, ttl = 300) {
    try {
      // Set in memory cache
      this.memoryCache.set(key, value, ttl);

      // Set in Redis if available
      if (this.isRedisConnected && this.redisClient) {
        await this.redisClient.setex(key, ttl, JSON.stringify(value));
      }

      return true;
    } catch (error) {
      console.warn('Cache set error:', error.message);
      // Memory cache should still work
      return true;
    }
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Success status
   */
  async delete(key) {
    try {
      this.memoryCache.del(key);
      
      if (this.isRedisConnected && this.redisClient) {
        await this.redisClient.del(key);
      }

      return true;
    } catch (error) {
      console.warn('Cache delete error:', error.message);
      return false;
    }
  }

  /**
   * Clear all cache
   * @returns {Promise<boolean>} Success status
   */
  async clear() {
    try {
      this.memoryCache.flushAll();
      
      if (this.isRedisConnected && this.redisClient) {
        await this.redisClient.flushdb();
      }

      return true;
    } catch (error) {
      console.warn('Cache clear error:', error.message);
      return false;
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    const memoryStats = this.memoryCache.getStats();
    const totalHits = this.cacheStats.memoryHits + this.cacheStats.redisHits;
    const totalMisses = this.cacheStats.memoryMisses + this.cacheStats.redisMisses;
    const hitRate = totalHits + totalMisses > 0 ? (totalHits / (totalHits + totalMisses)) * 100 : 0;

    return {
      memory: {
        keys: memoryStats.keys,
        hits: this.cacheStats.memoryHits,
        misses: this.cacheStats.memoryMisses,
        hitRate: memoryStats.keys > 0 ? (this.cacheStats.memoryHits / (this.cacheStats.memoryHits + this.cacheStats.memoryMisses)) * 100 : 0
      },
      redis: {
        connected: this.isRedisConnected,
        hits: this.cacheStats.redisHits,
        misses: this.cacheStats.redisMisses
      },
      overall: {
        totalRequests: this.cacheStats.totalRequests,
        totalHits,
        totalMisses,
        hitRate: hitRate.toFixed(2)
      }
    };
  }

  /**
   * Cache middleware for Express routes
   * @param {number} ttl - Cache TTL in seconds
   * @param {Function} keyGenerator - Custom key generator function
   * @returns {Function} Express middleware
   */
  middleware(ttl = 300, keyGenerator = null) {
    return async (req, res, next) => {
      if (req.method !== 'GET') {
        return next();
      }

      const key = keyGenerator ? keyGenerator(req) : this.generateKey(`route:${req.originalUrl}`, req.query);
      
      try {
        const cached = await this.get(key);
        if (cached !== null) {
          return res.json(cached);
        }

        // Store original send method
        const originalSend = res.json;
        
        // Override send method to cache response
        res.json = function(data) {
          this.set(key, data, ttl);
          return originalSend.call(this, data);
        };

        next();
      } catch (error) {
        console.warn('Cache middleware error:', error.message);
        next();
      }
    };
  }

  /**
   * Invalidate cache by pattern
   * @param {string} pattern - Cache key pattern
   * @returns {Promise<number>} Number of keys deleted
   */
  async invalidatePattern(pattern) {
    try {
      let deletedCount = 0;

      // Clear memory cache keys matching pattern
      const memoryKeys = this.memoryCache.keys();
      const matchingMemoryKeys = memoryKeys.filter(key => key.includes(pattern));
      matchingMemoryKeys.forEach(key => this.memoryCache.del(key));
      deletedCount += matchingMemoryKeys.length;

      // Clear Redis keys matching pattern
      if (this.isRedisConnected && this.redisClient) {
        const redisKeys = await this.redisClient.keys(`*${pattern}*`);
        if (redisKeys.length > 0) {
          await this.redisClient.del(...redisKeys);
          deletedCount += redisKeys.length;
        }
      }

      return deletedCount;
    } catch (error) {
      console.warn('Cache pattern invalidation error:', error.message);
      return 0;
    }
  }
}

// Create singleton instance
const cacheService = new CacheService();

module.exports = cacheService;
