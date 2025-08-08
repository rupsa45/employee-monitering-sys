const express = require('express')

const employee = require('../controller/empController')
const { employeeLoginSchema, forgotPasswordSchema, passwordResetSchema, employeeProfileUpdateSchema } = require('../../authValidations/employee/empValidator')
const authService = require('../../middleware/authService')
const { upload } = require('../../middleware/empImageStorage')
const { authentication } = require('../../middleware/authToken')

const router = express.Router()

// Validation middleware
const validateEmployeeLogin = (req, res, next) => {
    const { error } = employeeLoginSchema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            message: error.details[0].message
        });
    }
    next();
};

const validateForgotPassword = (req, res, next) => {
    const { error } = forgotPasswordSchema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            message: error.details[0].message
        });
    }
    next();
};

const validateResetPassword = (req, res, next) => {
    const { error } = passwordResetSchema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            message: error.details[0].message
        });
    }
    next();
};

const validateProfileUpdate = (req, res, next) => {
    const { error } = employeeProfileUpdateSchema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            message: error.details[0].message
        });
    }
    next();
};

// Employee routes
router.post('/login', validateEmployeeLogin, employee.loginEmployee)
router.post('/emailForReset', validateForgotPassword, employee.resetPassword)
router.patch('/empResetPassword/:id/:token', validateResetPassword, employee.resetPassword)
router.patch('/setNewPassword/:id', authentication, validateResetPassword, employee.setNewPassword)
router.patch('/editProfile/:id', authentication, upload.single("empProfile"), validateProfileUpdate, employee.editProfile)
router.get('/notifications/:id', authentication, employee.getNotifications)

module.exports = router
