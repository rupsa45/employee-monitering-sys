const express = require('express')

const bench = require('../controller/benchController')
const { authentication } = require('../../middleware/authToken')
const authService = require('../../middleware/authService')

const router = express.Router();

router.get('/empWorkingList', authentication, authService.isAdmin, bench.empWorkingList)
// router.get('/searchEmployee/:letter', authentication, authService.isAdmin, bench.searchEmployee)

module.exports = router
