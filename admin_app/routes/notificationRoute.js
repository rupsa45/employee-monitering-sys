const express = require('express')

const notification = require('../controller/notificationController')
const notificationValidator = require('../../authValidations/notification/notificationValidator')
const { authentication } = require('../../middleware/authToken')
const authService = require('../../middleware/authService')

const router = express.Router();

router.get('/active-employees', authentication, authService.isAdmin, notification.getActiveEmployees)
router.post('/createNotification/:id', authentication, authService.isAdmin, notificationValidator.createNotification, notification.createNotification)
router.patch('/updateNotification/:id', authentication, authService.isAdmin, notification.updateNotification)
router.delete('/inactiveNotification/:id', authentication, authService.isAdmin, notification.inactivateNotification)

module.exports = router
