const express = require('express')

const timeSheetController = require('../../employee_app/controller/empTimeSheetController')
const { authentication } = require('../../middleware/authToken')
const authService = require('../../middleware/authService')

const router = express.Router()

// Only employees should be able to clock in/out
router.get('/clockIn/:id', authentication, authService.isEmployee, timeSheetController.clockIn)
router.patch('/clockOut/:id', authentication, authService.isEmployee, timeSheetController.employeeAttendance)

// Break functionality
router.post('/breakStart/:id', authentication, authService.isEmployee, timeSheetController.breakStart)
router.post('/breakEnd/:id', authentication, authService.isEmployee, timeSheetController.breakEnd)

// Get current status
router.get('/currentStatus/:id', authentication, authService.isEmployee, timeSheetController.getCurrentStatus)

module.exports = router
