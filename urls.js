const express = require('express');
const adminRoute = require('./admin_app/routes/adminRoute');
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

const router = express.Router();

// Admin routes
router.use('/admin', adminRoute);

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

module.exports = router;
