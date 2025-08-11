const express = require('express');
const agentIdleTimeController = require('../controller/agentIdleTimeController');

const router = express.Router();

// Routes
router.post('/add', agentIdleTimeController.addAgentIdleTime);
router.get('/employee/:empId', agentIdleTimeController.getEmployeeIdleTime);
router.get('/summary', agentIdleTimeController.getAllIdleTimeSummary);

module.exports = router;
