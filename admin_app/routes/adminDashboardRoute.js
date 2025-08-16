const express = require('express');
const adminDashboardController = require('../controller/adminDashboardController');
const { authentication } = require('../../middleware/authToken');
const authService = require('../../middleware/authService');

const router = express.Router();

// Main dashboard overview
router.get('/overview', authentication, authService.isAdmin, adminDashboardController.getDashboardOverview);

// Employee management
router.get('/employees', authentication, authService.isAdmin, adminDashboardController.getEmployeeManagement);

// Attendance analytics
router.get('/attendance', authentication, authService.isAdmin, adminDashboardController.getAttendanceAnalytics);

// Task management
router.get('/tasks', authentication, authService.isAdmin, adminDashboardController.getTaskManagement);

// Leave management
router.get('/leaves', authentication, authService.isAdmin, adminDashboardController.getLeaveManagement);

// Performance analytics
router.get('/performance', authentication, authService.isAdmin, adminDashboardController.getPerformanceAnalytics);

// Real-time monitoring
router.get('/monitoring', authentication, authService.isAdmin, adminDashboardController.getRealTimeMonitoring);

module.exports = router;





