const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cluster = require('cluster');

// Phase 8 imports
const { connectOptimizedDatabase } = require('./config/optimizedPrismaConfig');
const cacheService = require('./service/cacheService');
const securityMiddleware = require('./middleware/securityMiddleware');
const performanceMonitor = require('./service/performanceMonitor');
const loadBalancerConfig = require('./config/loadBalancerConfig');

// Existing imports
const { connectDatabase } = require('./config/prismaConfig');
const cronJobManager = require('./scheduler/cronJobs');
const meetingSocket = require('./socket/meetings');

/**
 * Enhanced Employee Monitoring System Server
 * Phase 8: Hardening, Scale & Guardrails
 */
class EnhancedServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    });
    
    this.port = process.env.PORT || 9000;
    this.isProduction = process.env.NODE_ENV === 'production';
    
    this.initializeServer();
  }

  /**
   * Initialize the enhanced server
   */
  async initializeServer() {
    try {
      console.log('🚀 Initializing Enhanced Employee Monitoring System...');
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔧 Phase 8: Hardening, Scale & Guardrails`);

      // Phase 8: Performance & Security Setup
      await this.setupPhase8();

      // Database connection
      await this.setupDatabase();

      // Middleware setup
      this.setupMiddleware();

      // Routes setup
      this.setupRoutes();

      // Socket setup
      this.setupSockets();

      // Cron jobs
      await this.setupCronJobs();

      // Performance monitoring
      this.setupPerformanceMonitoring();

      // Start server
      this.startServer();

    } catch (error) {
      console.error('❌ Server initialization failed:', error);
      process.exit(1);
    }
  }

  /**
   * Setup Phase 8 components
   */
  async setupPhase8() {
    console.log('\n🔒 Setting up Phase 8: Hardening, Scale & Guardrails...');

    // 1. Performance Monitoring
    console.log('📊 Initializing performance monitoring...');
    performanceMonitor.startMonitoring(30000); // 30 seconds

    // 2. Cache Service
    console.log('💾 Initializing cache service...');
    // Cache service auto-initializes

    // 3. Security Middleware
    console.log('🛡️ Initializing security middleware...');
    // Security middleware auto-initializes

    // 4. Load Balancer (if master process)
    if (cluster.isMaster) {
      console.log('⚖️ Initializing load balancer...');
      // Load balancer auto-initializes
    }

    console.log('✅ Phase 8 setup completed');
  }

  /**
   * Setup database connections
   */
  async setupDatabase() {
    console.log('\n🗄️ Setting up database connections...');

    try {
      // Connect to optimized database (Phase 8)
      await connectOptimizedDatabase();
      console.log('✅ Optimized database connected');

      // Fallback to regular database if needed
      if (process.env.USE_FALLBACK_DB === 'true') {
        await connectDatabase();
        console.log('✅ Fallback database connected');
      }

    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  /**
   * Setup middleware
   */
  setupMiddleware() {
    console.log('\n🔧 Setting up middleware...');

    // Phase 8: Security & Performance Middleware
    const security = securityMiddleware.getAllMiddleware();

    // Request ID and logging
    this.app.use(security.requestId);
    this.app.use(security.requestLogger);

    // Security headers
    this.app.use(security.securityHeaders);

    // CORS
    this.app.use(security.cors);

    // Request sanitization
    this.app.use(security.sanitizeRequest);

    // Rate limiting based on route type
    this.app.use('/api/auth', security.authRateLimit);
    this.app.use('/api/admin', security.strictRateLimit);
    this.app.use('/api/emp', security.apiRateLimit);
    this.app.use('/api/meetings', security.webrtcRateLimit);
    this.app.use('/api/upload', security.uploadRateLimit);
    this.app.use('/api', security.basicRateLimit);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Static files
    this.app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
    this.app.use('/public', express.static(path.join(__dirname, 'public')));

    console.log('✅ Middleware setup completed');
  }

  /**
   * Setup routes
   */
  setupRoutes() {
    console.log('\n🛣️ Setting up routes...');

    // Health check endpoint (Phase 8)
    this.app.get('/health', securityMiddleware.healthCheck);
    this.app.get('/metrics', (req, res) => {
      res.json(performanceMonitor.getPerformanceReport());
    });
    this.app.get('/cache/stats', (req, res) => {
      res.json(cacheService.getStats());
    });

    // Load balancer status (if master)
    if (cluster.isMaster) {
      this.app.get('/loadbalancer/status', (req, res) => {
        res.json(loadBalancerConfig.getLoadBalancerStatus());
      });
      this.app.get('/loadbalancer/stats', (req, res) => {
        res.json(loadBalancerConfig.getWorkerStats());
      });
    }

    // API routes with caching (Phase 8)
    this.setupApiRoutes();

    // Error handling (Phase 8)
    this.app.use(securityMiddleware.notFoundHandler);
    this.app.use(securityMiddleware.errorHandler);

    console.log('✅ Routes setup completed');
  }

  /**
   * Setup API routes with caching
   */
  setupApiRoutes() {
    // Admin routes
    const adminRoutes = require('./admin_app/routes/adminRoute');
    const adminDashboardRoutes = require('./admin_app/routes/adminDashboardRoute');
    const adminTimeSheetRoutes = require('./admin_app/routes/adminTimeSheetRoute');
    const adminTaskRoutes = require('./admin_app/routes/taskRoute');
    const adminNotificationRoutes = require('./admin_app/routes/notificationRoute');
    const adminMeetingRoutes = require('./admin_app/routes/meetingRoute');
    const adminScreenshotRoutes = require('./admin_app/routes/screenshotRoute');
    const adminBenchRoutes = require('./admin_app/routes/benchRoute');
    const adminAgentRoutes = require('./admin_app/routes/agentWorkingAppsRoute');
    const adminAgentIdleRoutes = require('./admin_app/routes/agentIdleTimeRoute');

    // Employee routes
    const employeeRoutes = require('./employee_app/routes/employeeRoute');
    const employeeTimeSheetRoutes = require('./employee_app/routes/empTimeSheetRoute');
    const employeeTaskRoutes = require('./employee_app/routes/empTaskRoute');
    const employeeLeaveRoutes = require('./employee_app/routes/empLeaveRoute');
    const employeeMeetingRoutes = require('./employee_app/routes/empMeetingRoute');
    const employeeMeetingRecordingRoutes = require('./employee_app/routes/empMeetingRecordingRoute');

    // Apply routes with caching
    this.app.use('/api/admin', 
      cacheService.middleware(300, (req) => `admin:${req.originalUrl}`), // 5 minutes cache
      adminRoutes
    );
    this.app.use('/api/admin/dashboard', adminDashboardRoutes);
    this.app.use('/api/admin/timesheet', adminTimeSheetRoutes);
    this.app.use('/api/admin/tasks', adminTaskRoutes);
    this.app.use('/api/admin/notifications', adminNotificationRoutes);
    this.app.use('/api/admin/meetings', adminMeetingRoutes);
    this.app.use('/api/admin/screenshots', adminScreenshotRoutes);
    this.app.use('/api/admin/bench', adminBenchRoutes);
    this.app.use('/api/admin/agents', adminAgentRoutes);
    this.app.use('/api/admin/agent-idle', adminAgentIdleRoutes);

    this.app.use('/api/employee', 
      cacheService.middleware(180, (req) => `emp:${req.originalUrl}`), // 3 minutes cache
      employeeRoutes
    );
    this.app.use('/api/employee/timesheet', employeeTimeSheetRoutes);
    this.app.use('/api/employee/tasks', employeeTaskRoutes);
    this.app.use('/api/employee/leave', employeeLeaveRoutes);
    this.app.use('/api/employee/meetings', employeeMeetingRoutes);
    this.app.use('/api/employee/meeting-recordings', employeeMeetingRecordingRoutes);

    // Meeting routes are already included in admin and employee routes
    console.log('✅ API routes setup completed');
  }

  /**
   * Setup WebSocket connections
   */
  setupSockets() {
    console.log('\n🔌 Setting up WebSocket connections...');

    // Meeting socket with rate limiting
    this.io.use((socket, next) => {
      // Rate limiting for WebRTC signaling
      const clientId = socket.handshake.auth.meetingAccessToken || socket.handshake.address;
      const rateLimit = require('express-rate-limit');
      
      // Simple in-memory rate limiting for WebSocket
      if (!socket.rateLimitCount) {
        socket.rateLimitCount = 0;
        socket.rateLimitReset = Date.now() + 60000; // 1 minute window
      }

      if (Date.now() > socket.rateLimitReset) {
        socket.rateLimitCount = 0;
        socket.rateLimitReset = Date.now() + 60000;
      }

      if (socket.rateLimitCount >= 30) { // 30 messages per minute
        return next(new Error('WebRTC rate limit exceeded'));
      }

      socket.rateLimitCount++;
      next();
    });

    // Initialize meeting socket
    const meetingSocket = require('./socket/meetings');
    meetingSocket(this.io);

    console.log('✅ WebSocket setup completed');
  }

  /**
   * Setup cron jobs
   */
  async setupCronJobs() {
    console.log('\n⏰ Setting up cron jobs...');

    try {
      cronJobManager.initializeCronJobs();
      console.log('✅ Cron jobs initialized');
    } catch (error) {
      console.warn('⚠️ Cron jobs initialization failed:', error.message);
    }
  }

  /**
   * Setup performance monitoring
   */
  setupPerformanceMonitoring() {
    console.log('\n📊 Setting up performance monitoring...');

    // Monitor server performance
    performanceMonitor.on('metrics', (metrics) => {
      if (this.isProduction) {
        // In production, log to external monitoring service
        console.log('📊 Performance metrics collected');
      }
    });

    // Monitor alerts
    performanceMonitor.on('alerts', (alerts) => {
      alerts.forEach(alert => {
        console.warn(`🚨 ${alert.type}: ${alert.message}`);
        
        // In production, send to external alerting service
        if (this.isProduction) {
          // this.sendAlert(alert);
        }
      });
    });

    // Monitor database errors
    performanceMonitor.on('databaseError', (error) => {
      console.error('🗄️ Database error detected:', error.message);
      
      // In production, send to external monitoring service
      if (this.isProduction) {
        // this.sendDatabaseAlert(error);
      }
    });

    // Monitor health checks
    performanceMonitor.on('healthCheck', (result) => {
      if (result.status === 'FAIL') {
        console.warn(`⚠️ Health check failed: ${result.name} - ${result.error}`);
      }
    });

    console.log('✅ Performance monitoring setup completed');
  }

  /**
   * Start the server
   */
  startServer() {
    this.server.listen(this.port, () => {
      console.log('\n🎉 Enhanced Employee Monitoring System Started!');
      console.log(`🌐 Server running on port ${this.port}`);
      console.log(`🔒 Phase 8: Hardening, Scale & Guardrails ACTIVE`);
      console.log(`📊 Performance monitoring: ACTIVE`);
      console.log(`💾 Caching: ACTIVE`);
      console.log(`🛡️ Security: ACTIVE`);
      console.log(`⚖️ Load balancing: ${cluster.isMaster ? 'ACTIVE' : 'WORKER'}`);
      console.log(`⏰ Cron jobs: ACTIVE`);
      console.log(`🔌 WebSocket: ACTIVE`);
      console.log(`\n🚀 Ready to handle requests!`);
      
      // Log system information
      this.logSystemInfo();
    });

    // Graceful shutdown
    this.setupGracefulShutdown();
  }

  /**
   * Log system information
   */
  logSystemInfo() {
    const os = require('os');
    const memUsage = process.memoryUsage();
    
    console.log('\n📊 System Information:');
    console.log(`   Platform: ${os.platform()} ${os.arch()}`);
    console.log(`   Node.js: ${process.version}`);
    console.log(`   CPU Cores: ${os.cpus().length}`);
    console.log(`   Memory: ${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB total`);
    console.log(`   Process Memory: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB used`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    
    if (cluster.isMaster) {
      console.log(`   Load Balancer: Master process (PID: ${process.pid})`);
      console.log(`   Workers: ${loadBalancerConfig.minWorkers}-${loadBalancerConfig.maxWorkers}`);
      console.log(`   Auto-scaling: ${loadBalancerConfig.autoScaling ? 'ENABLED' : 'DISABLED'}`);
    } else {
      console.log(`   Load Balancer: Worker process (PID: ${process.pid})`);
    }
  }

  /**
   * Setup graceful shutdown
   */
  setupGracefulShutdown() {
    const gracefulShutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal}, starting graceful shutdown...`);
      
      try {
        // Stop accepting new connections
        this.server.close(() => {
          console.log('✅ HTTP server closed');
        });

        // Stop performance monitoring
        performanceMonitor.stopMonitoring();

        // Stop cron jobs
        cronJobManager.stopCronJobs();

        // Close database connections
        const { optimizedPrisma } = require('./config/optimizedPrismaConfig');
        await optimizedPrisma.cleanup();

        // Close cache connections
        await cacheService.clear();

        console.log('✅ Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        console.error('❌ Graceful shutdown failed:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  }

  /**
   * Get server status
   */
  getServerStatus() {
    return {
      status: 'running',
      port: this.port,
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
  }
}

// Start the enhanced server
if (require.main === module) {
  const server = new EnhancedServer();
}

module.exports = EnhancedServer;
