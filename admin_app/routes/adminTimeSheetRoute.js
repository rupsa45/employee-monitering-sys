const express = require('express');
const adminTimeSheetController = require('../controller/adminTimeSheetController');
const { authentication } = require('../../middleware/authToken');
const authService = require('../../middleware/authService');

const router = express.Router();

// Admin timesheet management routes
router.get('/all-timesheets', authentication, authService.isAdmin, adminTimeSheetController.getAllEmployeeTimeSheets);
router.get('/today-summary', authentication, authService.isAdmin, adminTimeSheetController.getTodayAttendanceSummary);
router.get('/employee-timesheet/:empId', authentication, authService.isAdmin, adminTimeSheetController.getEmployeeDetailedTimeSheet);

// Activity snapshot routes for admin monitoring
router.get('/activity-snapshots', authentication, authService.isAdmin, adminTimeSheetController.getEmployeeActivitySnapshot);
router.post('/update-activity-snapshot', authentication, authService.isAdmin, adminTimeSheetController.updateActivitySnapshot);

module.exports = router;
