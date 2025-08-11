const express = require('express');
const agentWorkingAppsController = require('../controller/agentWorkingAppsController');

const router = express.Router();

// Routes
router.post('/set', agentWorkingAppsController.setAgentWorkingApp);
router.get('/employee/:empId', agentWorkingAppsController.getEmployeeWorkingApps);
router.get('/summary', agentWorkingAppsController.getAllWorkingAppsSummary);

module.exports = router;
