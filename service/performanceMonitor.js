const os = require('os');
const { EventEmitter } = require('events');
const { promisify } = require('util');

/**
 * Advanced Performance Monitoring Service
 * Provides comprehensive system monitoring, metrics, and performance optimization
 */
class PerformanceMonitor extends EventEmitter {
  constructor() {
    super();
    
    this.metrics = {
      system: {},
      application: {},
      database: {},
      network: {},
      custom: {}
    };

    this.thresholds = {
      cpu: 80, // 80% CPU usage
      memory: 85, // 85% memory usage
      disk: 90, // 90% disk usage
      responseTime: 2000, // 2 seconds
      errorRate: 5 // 5% error rate
    };

    this.alerts = [];
    this.isMonitoring = false;
    this.monitoringInterval = null;
    this.healthChecks = new Map();

    this.initializeMonitoring();
  }

  /**
   * Initialize performance monitoring
   */
  initializeMonitoring() {
    this.setupSystemMetrics();
    this.setupApplicationMetrics();
    this.setupDatabaseMetrics();
    this.setupNetworkMetrics();
    this.setupCustomMetrics();
  }

  /**
   * Setup system metrics collection
   */
  setupSystemMetrics() {
    this.metrics.system = {
      cpu: {
        usage: 0,
        loadAverage: [],
        cores: os.cpus().length
      },
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: 0,
        usage: 0
      },
      disk: {
        total: 0,
        free: 0,
        used: 0,
        usage: 0
      },
      uptime: 0,
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname()
    };
  }

  /**
   * Setup application metrics collection
   */
  setupApplicationMetrics() {
    this.metrics.application = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        rate: 0
      },
      responseTime: {
        average: 0,
        min: Infinity,
        max: 0,
        percentiles: {
          p50: 0,
          p90: 0,
          p95: 0,
          p99: 0
        }
      },
      errors: {
        total: 0,
        rate: 0,
        byType: new Map()
      },
      activeConnections: 0,
      memoryUsage: process.memoryUsage(),
      uptime: 0
    };
  }

  /**
   * Setup database metrics collection
   */
  setupDatabaseMetrics() {
    this.metrics.database = {
      connections: {
        active: 0,
        idle: 0,
        total: 0
      },
      queries: {
        total: 0,
        slow: 0,
        failed: 0,
        averageTime: 0
      },
      performance: {
        responseTime: 0,
        throughput: 0,
        cacheHitRate: 0
      }
    };
  }

  /**
   * Setup network metrics collection
   */
  setupNetworkMetrics() {
    this.metrics.network = {
      connections: {
        incoming: 0,
        outgoing: 0,
        active: 0
      },
      bandwidth: {
        incoming: 0,
        outgoing: 0,
        total: 0
      },
      latency: {
        average: 0,
        min: Infinity,
        max: 0
      }
    };
  }

  /**
   * Setup custom metrics collection
   */
  setupCustomMetrics() {
    this.metrics.custom = {
      meetings: {
        active: 0,
        total: 0,
        participants: 0
      },
      recordings: {
        total: 0,
        size: 0,
        processing: 0
      },
      emails: {
        sent: 0,
        failed: 0,
        queued: 0
      }
    };
  }

  /**
   * Start performance monitoring
   * @param {number} interval - Monitoring interval in milliseconds
   */
  startMonitoring(interval = 30000) { // 30 seconds default
    if (this.isMonitoring) {
      console.log('⚠️ Performance monitoring already running');
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
      this.checkThresholds();
      this.emit('metrics', this.metrics);
    }, interval);

    console.log(`✅ Performance monitoring started (${interval}ms interval)`);
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    this.isMonitoring = false;
    console.log('⏹️ Performance monitoring stopped');
  }

  /**
   * Collect all metrics
   */
  collectMetrics() {
    this.collectSystemMetrics();
    this.collectApplicationMetrics();
    this.collectDatabaseMetrics();
    this.collectNetworkMetrics();
    this.collectCustomMetrics();
  }

  /**
   * Collect system metrics
   */
  collectSystemMetrics() {
    try {
      // CPU usage
      const cpus = os.cpus();
      let totalIdle = 0;
      let totalTick = 0;

      cpus.forEach(cpu => {
        for (const type in cpu.times) {
          totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
      });

      const idle = totalIdle / cpus.length;
      const total = totalTick / cpus.length;
      const usage = 100 - (100 * idle / total);

      this.metrics.system.cpu.usage = Math.round(usage * 100) / 100;
      this.metrics.system.cpu.loadAverage = os.loadavg();
      this.metrics.system.uptime = os.uptime();

      // Memory usage
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;

      this.metrics.system.memory.free = freeMem;
      this.metrics.system.memory.used = usedMem;
      this.metrics.system.memory.usage = Math.round((usedMem / totalMem) * 100 * 100) / 100;

      // Application uptime
      this.metrics.application.uptime = process.uptime();
      this.metrics.application.memoryUsage = process.memoryUsage();
    } catch (error) {
      console.warn('Failed to collect system metrics:', error.message);
    }
  }

  /**
   * Collect application metrics
   */
  collectApplicationMetrics() {
    try {
      // Calculate response time percentiles
      if (this.metrics.application.responseTime.average > 0) {
        const responseTimes = this.getResponseTimeHistory();
        if (responseTimes.length > 0) {
          responseTimes.sort((a, b) => a - b);
          const len = responseTimes.length;
          
          this.metrics.application.responseTime.percentiles.p50 = responseTimes[Math.floor(len * 0.5)];
          this.metrics.application.responseTime.percentiles.p90 = responseTimes[Math.floor(len * 0.9)];
          this.metrics.application.responseTime.percentiles.p95 = responseTimes[Math.floor(len * 0.95)];
          this.metrics.application.responseTime.percentiles.p99 = responseTimes[Math.floor(len * 0.99)];
        }
      }

      // Calculate rates
      const now = Date.now();
      const timeWindow = 60000; // 1 minute
      
      // Request rate
      this.metrics.application.requests.rate = this.calculateRate(
        this.metrics.application.requests.total,
        timeWindow
      );

      // Error rate
      this.metrics.application.errors.rate = this.calculateRate(
        this.metrics.application.errors.total,
        timeWindow
      );
    } catch (error) {
      console.warn('Failed to collect application metrics:', error.message);
    }
  }

  /**
   * Collect database metrics
   */
  collectDatabaseMetrics() {
    try {
      // This would be populated by database monitoring hooks
      // For now, we'll keep the structure ready
    } catch (error) {
      console.warn('Failed to collect database metrics:', error.message);
    }
  }

  /**
   * Collect network metrics
   */
  collectNetworkMetrics() {
    try {
      // This would be populated by network monitoring hooks
      // For now, we'll keep the structure ready
    } catch (error) {
      console.warn('Failed to collect network metrics:', error.message);
    }
  }

  /**
   * Collect custom metrics
   */
  collectCustomMetrics() {
    try {
      // This would be populated by application-specific monitoring
      // For now, we'll keep the structure ready
    } catch (error) {
      console.warn('Failed to collect custom metrics:', error.message);
    }
  }

  /**
   * Check performance thresholds and generate alerts
   */
  checkThresholds() {
    const alerts = [];

    // CPU threshold check
    if (this.metrics.system.cpu.usage > this.thresholds.cpu) {
      alerts.push({
        type: 'WARNING',
        metric: 'CPU',
        value: this.metrics.system.cpu.usage,
        threshold: this.thresholds.cpu,
        message: `High CPU usage: ${this.metrics.system.cpu.usage}%`,
        timestamp: new Date().toISOString()
      });
    }

    // Memory threshold check
    if (this.metrics.system.memory.usage > this.thresholds.memory) {
      alerts.push({
        type: 'WARNING',
        metric: 'Memory',
        value: this.metrics.system.memory.usage,
        threshold: this.thresholds.memory,
        message: `High memory usage: ${this.metrics.system.memory.usage}%`,
        timestamp: new Date().toISOString()
      });
    }

    // Response time threshold check
    if (this.metrics.application.responseTime.average > this.thresholds.responseTime) {
      alerts.push({
        type: 'WARNING',
        metric: 'ResponseTime',
        value: this.metrics.application.responseTime.average,
        threshold: this.thresholds.responseTime,
        message: `High response time: ${this.metrics.application.responseTime.average}ms`,
        timestamp: new Date().toISOString()
      });
    }

    // Error rate threshold check
    if (this.metrics.application.errors.rate > this.thresholds.errorRate) {
      alerts.push({
        type: 'CRITICAL',
        metric: 'ErrorRate',
        value: this.metrics.application.errors.rate,
        threshold: this.thresholds.errorRate,
        message: `High error rate: ${this.metrics.application.errors.rate}%`,
        timestamp: new Date().toISOString()
      });
    }

    // Emit alerts if any
    if (alerts.length > 0) {
      this.alerts.push(...alerts);
      this.emit('alerts', alerts);
      
      // Keep only last 100 alerts
      if (this.alerts.length > 100) {
        this.alerts = this.alerts.slice(-100);
      }
    }
  }

  /**
   * Record a request
   * @param {Object} requestData - Request information
   */
  recordRequest(requestData) {
    const { success, duration, errorType } = requestData;
    
    this.metrics.application.requests.total++;
    
    if (success) {
      this.metrics.application.requests.successful++;
    } else {
      this.metrics.application.requests.failed++;
      this.metrics.application.errors.total++;
      
      if (errorType) {
        const currentCount = this.metrics.application.errors.byType.get(errorType) || 0;
        this.metrics.application.errors.byType.set(errorType, currentCount + 1);
      }
    }

    // Update response time metrics
    if (duration !== undefined) {
      const currentAvg = this.metrics.application.responseTime.average;
      const totalRequests = this.metrics.application.requests.total;
      
      this.metrics.application.responseTime.average = 
        ((currentAvg * (totalRequests - 1)) + duration) / totalRequests;
      
      this.metrics.application.responseTime.min = 
        Math.min(this.metrics.application.responseTime.min, duration);
      
      this.metrics.application.responseTime.max = 
        Math.max(this.metrics.application.responseTime.max, duration);
    }
  }

  /**
   * Add custom metric
   * @param {string} category - Metric category
   * @param {string} name - Metric name
   * @param {any} value - Metric value
   */
  addCustomMetric(category, name, value) {
    if (!this.metrics.custom[category]) {
      this.metrics.custom[category] = {};
    }
    
    this.metrics.custom[category][name] = value;
  }

  /**
   * Get performance report
   * @returns {Object} Performance report
   */
  getPerformanceReport() {
    return {
      timestamp: new Date().toISOString(),
      system: this.metrics.system,
      application: this.metrics.application,
      database: this.metrics.database,
      network: this.metrics.network,
      custom: this.metrics.custom,
      alerts: this.alerts.slice(-10), // Last 10 alerts
      status: this.getSystemStatus()
    };
  }

  /**
   * Get system status
   * @returns {string} System status
   */
  getSystemStatus() {
    const criticalAlerts = this.alerts.filter(alert => alert.type === 'CRITICAL');
    const warningAlerts = this.alerts.filter(alert => alert.type === 'WARNING');
    
    if (criticalAlerts.length > 0) {
      return 'CRITICAL';
    } else if (warningAlerts.length > 0) {
      return 'WARNING';
    } else {
      return 'HEALTHY';
    }
  }

  /**
   * Calculate rate over time window
   * @param {number} total - Total count
   * @param {number} timeWindow - Time window in milliseconds
   * @returns {number} Rate per second
   */
  calculateRate(total, timeWindow) {
    return Math.round((total / (timeWindow / 1000)) * 100) / 100;
  }

  /**
   * Get response time history
   * @returns {Array} Array of response times
   */
  getResponseTimeHistory() {
    // This would return actual response time history
    // For now, return empty array
    return [];
  }

  /**
   * Set performance thresholds
   * @param {Object} newThresholds - New threshold values
   */
  setThresholds(newThresholds) {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    console.log('✅ Performance thresholds updated:', newThresholds);
  }

  /**
   * Add health check
   * @param {string} name - Health check name
   * @param {Function} checkFunction - Health check function
   * @param {number} interval - Check interval in milliseconds
   */
  addHealthCheck(name, checkFunction, interval = 60000) { // 1 minute default
    this.healthChecks.set(name, {
      function: checkFunction,
      interval: setInterval(async () => {
        try {
          const result = await checkFunction();
          this.emit('healthCheck', { name, status: 'PASS', result, timestamp: new Date().toISOString() });
        } catch (error) {
          this.emit('healthCheck', { name, status: 'FAIL', error: error.message, timestamp: new Date().toISOString() });
        }
      }, interval),
      lastCheck: null,
      status: 'UNKNOWN'
    });

    console.log(`✅ Health check added: ${name}`);
  }

  /**
   * Remove health check
   * @param {string} name - Health check name
   */
  removeHealthCheck(name) {
    const healthCheck = this.healthChecks.get(name);
    if (healthCheck) {
      clearInterval(healthCheck.interval);
      this.healthChecks.delete(name);
      console.log(`✅ Health check removed: ${name}`);
    }
  }

  /**
   * Get all health checks status
   * @returns {Object} Health checks status
   */
  getHealthChecksStatus() {
    const status = {};
    
    for (const [name, check] of this.healthChecks) {
      status[name] = {
        status: check.status,
        lastCheck: check.lastCheck
      };
    }
    
    return status;
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

module.exports = performanceMonitor;
