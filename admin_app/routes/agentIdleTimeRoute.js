const express = require('express');
const agentIdleTimeController = require('../controller/agentIdleTimeController');
const { authentication } = require('../../middleware/authToken');

const router = express.Router();

// Routes - All routes require authentication
router.post('/add', authentication, agentIdleTimeController.addAgentIdleTime);
router.get('/employee/:empId', authentication, agentIdleTimeController.getEmployeeIdleTime);
router.get('/summary', authentication, agentIdleTimeController.getAllIdleTimeSummary);

module.exports = router;
