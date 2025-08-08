const express = require('express')

const empLeaveController = require('../controller/empLeaveController')
const { authentication } = require('../../middleware/authToken')
const authService = require('../../middleware/authService')

const router = express.Router('express')

router.post('/empLeave/:id', authentication, authService.isEmployee, empLeaveController.empLeave)

module.exports = router
