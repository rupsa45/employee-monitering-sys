const express = require('express')

const empLeaveController = require('../controller/empLeaveController')
const { authentication } = require('../../middleware/authToken')
const authService = require('../../middleware/authService')

const router = express.Router()

// Apply for leave
router.post('/empLeave/:id', authentication, authService.isEmployee, empLeaveController.empLeave)

// Get leave history with comprehensive filtering
router.get('/getLeaveHistory/:empId', authentication, authService.isEmployee, empLeaveController.getLeaveHistory)

// Get leave balance with year-wise tracking
// router.get('/getLeaveBalance/:empId', authentication, authService.isEmployee, empLeaveController.getLeaveBalance)

// Cancel leave request
router.put('/cancelLeave/:leaveId', authentication, authService.isEmployee, empLeaveController.cancelLeave)

module.exports = router
