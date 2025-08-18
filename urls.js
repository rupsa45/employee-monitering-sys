const express = require('express');
const adminRoute = require('./admin_app/routes/adminRoute');
const adminDashboardRoute = require('./admin_app/routes/adminDashboardRoute');
const employeeRoute = require('./employee_app/routes/employeeRoute');
const timeSheetRoute = require('./employee_app/routes/empTimeSheetRoute');
const empLeaveRoute = require('./employee_app/routes/empLeaveRoute');
const benchRoute = require('./admin_app/routes/benchRoute');
const notificationRoute = require('./admin_app/routes/notificationRoute');
const adminTimeSheetRoute = require('./admin_app/routes/adminTimeSheetRoute');
const taskRoute = require('./admin_app/routes/taskRoute');
const empTaskRoute = require('./employee_app/routes/empTaskRoute');
const screenshotRoute = require('./admin_app/routes/screenshotRoute');
const agentWorkingAppsRoute = require('./admin_app/routes/agentWorkingAppsRoute');
const agentIdleTimeRoute = require('./admin_app/routes/agentIdleTimeRoute');
const notificationTestRoute = require('./admin_app/routes/notificationTestRoute');

const router = express.Router();

// Health check endpoint for monitoring
router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version
  });
});

// API status endpoint
router.get('/api/status', (req, res) => {
  res.status(200).json({ 
    message: 'Employee Monitoring System API is running',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Admin routes
router.use('/admin', adminRoute);

// Admin Dashboard routes
router.use('/admin/dashboard', adminDashboardRoute);

// Employee routes
router.use('/employee', employeeRoute);

// Timesheet routes
router.use('/timeSheet', timeSheetRoute);

// Leave routes
router.use('/empLeave', empLeaveRoute);

// Bench management routes
router.use('/bench', benchRoute);

// Notification routes
router.use('/notification', notificationRoute);

// Admin timesheet routes
router.use('/admin-timesheet', adminTimeSheetRoute);

// Task management routes
router.use('/tasks', taskRoute);

// Employee task routes
router.use('/emp-tasks', empTaskRoute);

// Screenshot routes (Electron app integration)
router.use('/screenshots', screenshotRoute);

// Agent working apps routes (Electron app integration)
router.use('/agent-working-apps', agentWorkingAppsRoute);

// Agent idle time routes (Electron app integration)
router.use('/agent-idle-time', agentIdleTimeRoute);

// Notification test routes (for development/testing)
router.use('/notification-test', notificationTestRoute);

module.exports = router;
