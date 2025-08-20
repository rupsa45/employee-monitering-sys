const express = require('express');
const agentWorkingAppsController = require('../controller/agentWorkingAppsController');
const { authentication } = require('../../middleware/authToken');

const router = express.Router();

// Routes - All routes require authentication
router.post('/set', authentication, agentWorkingAppsController.setAgentWorkingApp);
router.get('/employee/:empId', authentication, agentWorkingAppsController.getEmployeeWorkingApps);
router.get('/summary', authentication, agentWorkingAppsController.getAllWorkingAppsSummary);

module.exports = router;
