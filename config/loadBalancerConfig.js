const cluster = require('cluster');
const os = require('os');
const performanceMonitor = require('../service/performanceMonitor');

/**
 * Load Balancer & Scaling Configuration
 * Provides horizontal scaling, load balancing, and high availability
 */
class LoadBalancerConfig {
  constructor() {
    this.numCPUs = os.cpus().length;
    this.workers = new Map();
    this.isMaster = cluster.isMaster;
    this.workerCount = 0;
    this.maxWorkers = parseInt(process.env.MAX_WORKERS) || this.numCPUs;
    this.minWorkers = parseInt(process.env.MIN_WORKERS) || 2;
    this.autoScaling = process.env.AUTO_SCALING === 'true';
    this.scalingThresholds = {
      cpu: parseInt(process.env.SCALING_CPU_THRESHOLD) || 70,
      memory: parseInt(process.env.SCALING_MEMORY_THRESHOLD) || 80,
      responseTime: parseInt(process.env.SCALING_RESPONSE_TIME_THRESHOLD) || 1000
    };
    
    this.initializeLoadBalancer();
  }

  /**
   * Initialize load balancer
   */
  initializeLoadBalancer() {
    if (this.isMaster) {
      this.setupMasterProcess();
    }
  }

  /**
   * Setup worker process (placeholder for future worker-specific logic)
   */
  setupWorkerProcess() {
    // Worker process specific setup can be added here
    // For now, workers just run the main application
  }

  /**
   * Setup master process
   */
  setupMasterProcess() {
    console.log(`🚀 Master process started (PID: ${process.pid})`);
    console.log(`📊 System has ${this.numCPUs} CPU cores`);
    console.log(`👥 Starting with ${this.minWorkers} workers`);
    console.log(`⚖️ Auto-scaling: ${this.autoScaling ? 'ENABLED' : 'DISABLED'}`);

    // Start initial workers
    this.spawnWorkers(this.minWorkers);

    // Setup worker management
    this.setupWorkerManagement();

    // Setup auto-scaling if enabled
    if (this.autoScaling) {
      this.setupAutoScaling();
    }

    // Setup health monitoring
    this.setupHealthMonitoring();

    // Setup graceful shutdown
    this.setupGracefulShutdown();
  }

  /**
   * Setup worker management
   */
  setupWorkerManagement() {
    cluster.on('fork', (worker) => {
      console.log(`👶 Worker ${worker.process.pid} forked`);
      this.workers.set(worker.id, {
        id: worker.id,
        pid: worker.process.pid,
        status: 'starting',
        startTime: Date.now(),
        requests: 0,
        errors: 0,
        lastHeartbeat: Date.now()
      });
      this.workerCount++;
    });

    cluster.on('online', (worker) => {
      console.log(`✅ Worker ${worker.process.pid} is online`);
      const workerInfo = this.workers.get(worker.id);
      if (workerInfo) {
        workerInfo.status = 'online';
        workerInfo.lastHeartbeat = Date.now();
      }
    });

    cluster.on('listening', (worker, address) => {
      console.log(`🎧 Worker ${worker.process.pid} is listening on ${address.address}:${address.port}`);
    });

    cluster.on('disconnect', (worker) => {
      console.log(`🔌 Worker ${worker.process.pid} disconnected`);
      const workerInfo = this.workers.get(worker.id);
      if (workerInfo) {
        workerInfo.status = 'disconnected';
      }
    });

    cluster.on('exit', (worker, code, signal) => {
      console.log(`💀 Worker ${worker.process.pid} died (${signal || code})`);
      this.workers.delete(worker.id);
      this.workerCount--;

      // Restart worker if it's not a graceful shutdown
      if (worker.exitedAfterDisconnect === false) {
        console.log(`🔄 Restarting worker ${worker.id}...`);
        this.spawnWorker();
      }
    });

    cluster.on('message', (worker, message) => {
      this.handleWorkerMessage(worker, message);
    });
  }

  /**
   * Setup auto-scaling
   */
  setupAutoScaling() {
    setInterval(() => {
      this.checkScalingNeeds();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Check if scaling is needed
   */
  async checkScalingNeeds() {
    try {
      const metrics = performanceMonitor.getPerformanceReport();
      const shouldScale = this.shouldScale(metrics);

      if (shouldScale.scaleUp && this.workerCount < this.maxWorkers) {
        console.log(`📈 Scaling UP: ${shouldScale.reason}`);
        this.spawnWorker();
      } else if (shouldScale.scaleDown && this.workerCount > this.minWorkers) {
        console.log(`📉 Scaling DOWN: ${shouldScale.reason}`);
        this.scaleDown();
      }
    } catch (error) {
      console.warn('Auto-scaling check failed:', error.message);
    }
  }

  /**
   * Determine if scaling is needed
   * @param {Object} metrics - Performance metrics
   * @returns {Object} Scaling decision
   */
  shouldScale(metrics) {
    const { system, application } = metrics;
    
    // Check CPU usage
    if (system.cpu.usage > this.scalingThresholds.cpu) {
      return { scaleUp: true, scaleDown: false, reason: `High CPU usage: ${system.cpu.usage}%` };
    }

    // Check memory usage
    if (system.memory.usage > this.scalingThresholds.memory) {
      return { scaleUp: true, scaleDown: false, reason: `High memory usage: ${system.memory.usage}%` };
    }

    // Check response time
    if (application.responseTime.average > this.scalingThresholds.responseTime) {
      return { scaleUp: true, scaleDown: false, reason: `High response time: ${application.responseTime.average}ms` };
    }

    // Check if we can scale down
    if (system.cpu.usage < this.scalingThresholds.cpu * 0.5 && 
        system.memory.usage < this.scalingThresholds.memory * 0.5 &&
        application.responseTime.average < this.scalingThresholds.responseTime * 0.5) {
      return { scaleUp: false, scaleDown: true, reason: 'Low resource usage' };
    }

    return { scaleUp: false, scaleDown: false, reason: 'No scaling needed' };
  }

  /**
   * Setup health monitoring
   */
  setupHealthMonitoring() {
    setInterval(() => {
      this.checkWorkersHealth();
    }, 10000); // Check every 10 seconds
  }

  /**
   * Check workers health
   */
  checkWorkersHealth() {
    const now = Date.now();
    const unhealthyWorkers = [];

    for (const [workerId, workerInfo] of this.workers) {
      const timeSinceHeartbeat = now - workerInfo.lastHeartbeat;
      
      // Mark worker as unhealthy if no heartbeat for 30 seconds
      if (timeSinceHeartbeat > 30000) {
        workerInfo.status = 'unhealthy';
        unhealthyWorkers.push(workerId);
      }
    }

    // Restart unhealthy workers
    unhealthyWorkers.forEach(workerId => {
      const worker = cluster.workers[workerId];
      if (worker) {
        console.log(`🔄 Restarting unhealthy worker ${workerId}...`);
        worker.kill();
      }
    });
  }

  /**
   * Setup graceful shutdown
   */
  setupGracefulShutdown() {
    process.on('SIGTERM', () => {
      console.log('🛑 Received SIGTERM, starting graceful shutdown...');
      this.gracefulShutdown();
    });

    process.on('SIGINT', () => {
      console.log('🛑 Received SIGINT, starting graceful shutdown...');
      this.gracefulShutdown();
    });
  }

  /**
   * Graceful shutdown
   */
  async gracefulShutdown() {
    console.log('🔄 Gracefully shutting down workers...');
    
    // Stop accepting new connections
    for (const worker of Object.values(cluster.workers)) {
      worker.send('shutdown');
    }

    // Wait for workers to finish
    await new Promise(resolve => {
      let activeWorkers = Object.keys(cluster.workers).length;
      
      cluster.on('exit', () => {
        activeWorkers--;
        if (activeWorkers === 0) {
          resolve();
        }
      });
    });

    console.log('✅ All workers shut down gracefully');
    process.exit(0);
  }

  /**
   * Spawn workers
   * @param {number} count - Number of workers to spawn
   */
  spawnWorkers(count) {
    for (let i = 0; i < count; i++) {
      this.spawnWorker();
    }
  }

  /**
   * Spawn a single worker
   */
  spawnWorker() {
    if (this.workerCount >= this.maxWorkers) {
      console.log('⚠️ Maximum worker limit reached');
      return;
    }

    const worker = cluster.fork();
    console.log(`👶 Spawning worker ${worker.id}`);
  }

  /**
   * Scale down by removing a worker
   */
  scaleDown() {
    // Find the least busy worker
    let leastBusyWorker = null;
    let minRequests = Infinity;

    for (const [workerId, workerInfo] of this.workers) {
      if (workerInfo.status === 'online' && workerInfo.requests < minRequests) {
        minRequests = workerInfo.requests;
        leastBusyWorker = workerId;
      }
    }

    if (leastBusyWorker) {
      const worker = cluster.workers[leastBusyWorker];
      if (worker) {
        console.log(`📉 Scaling down: removing worker ${leastBusyWorker}`);
        worker.send('shutdown');
      }
    }
  }

  /**
   * Handle worker messages
   * @param {Worker} worker - Worker instance
   * @param {Object} message - Message from worker
   */
  handleWorkerMessage(worker, message) {
    const workerInfo = this.workers.get(worker.id);
    if (!workerInfo) return;

    switch (message.type) {
      case 'heartbeat':
        workerInfo.lastHeartbeat = Date.now();
        workerInfo.requests = message.requests || 0;
        workerInfo.errors = message.errors || 0;
        break;

      case 'status':
        workerInfo.status = message.status;
        break;

      case 'metrics':
        // Update worker-specific metrics
        if (message.metrics) {
          workerInfo.metrics = message.metrics;
        }
        break;

      default:
        console.log(`📨 Unknown message from worker ${worker.id}:`, message);
    }
  }

  /**
   * Get load balancer status
   * @returns {Object} Load balancer status
   */
  getLoadBalancerStatus() {
    return {
      isMaster: this.isMaster,
      workerCount: this.workerCount,
      maxWorkers: this.maxWorkers,
      minWorkers: this.minWorkers,
      autoScaling: this.autoScaling,
      scalingThresholds: this.scalingThresholds,
      workers: Array.from(this.workers.values()),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get worker statistics
   * @returns {Object} Worker statistics
   */
  getWorkerStats() {
    const stats = {
      total: this.workerCount,
      online: 0,
      starting: 0,
      disconnected: 0,
      unhealthy: 0,
      totalRequests: 0,
      totalErrors: 0,
      averageResponseTime: 0
    };

    for (const workerInfo of this.workers.values()) {
      switch (workerInfo.status) {
        case 'online':
          stats.online++;
          break;
        case 'starting':
          stats.starting++;
          break;
        case 'disconnected':
          stats.disconnected++;
          break;
        case 'unhealthy':
          stats.unhealthy++;
          break;
      }

      stats.totalRequests += workerInfo.requests || 0;
      stats.totalErrors += workerInfo.errors || 0;
    }

    if (stats.online > 0) {
      stats.averageResponseTime = stats.totalRequests / stats.online;
    }

    return stats;
  }

  /**
   * Distribute load across workers
   * @param {Object} request - Request object
   * @returns {Worker} Selected worker
   */
  distributeLoad(request) {
    // Simple round-robin distribution
    const onlineWorkers = Array.from(this.workers.values())
      .filter(w => w.status === 'online')
      .map(w => cluster.workers[w.id])
      .filter(Boolean);

    if (onlineWorkers.length === 0) {
      return null;
    }

    // Round-robin selection
    const selectedWorker = onlineWorkers[this.workerCount % onlineWorkers.length];
    this.workerCount = (this.workerCount + 1) % onlineWorkers.length;

    return selectedWorker;
  }
}

// Create singleton instance
const loadBalancerConfig = new LoadBalancerConfig();

module.exports = loadBalancerConfig;
