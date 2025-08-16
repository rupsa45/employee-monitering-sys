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

// Admin-only: initiate password reset email for an employee
router.post('/emailForReset', authentication, authService.isAdmin, validateForgotPassword, employee.resetPassword)

// Admin-only: set a new password for an employee
router.patch('/setNewPassword/:id', authentication, authService.isAdmin, validateResetPassword, employee.setNewPassword)

// Admin-only: update an employee profile (multipart/form-data supported)
router.patch('/editProfile/:id', authentication, upload.single("empProfile"), validateProfileUpdate, employee.editProfile)

// Employees can view only their own notifications
router.get('/notifications/:id', authentication, authService.isEmployee, employee.getNotifications)

// Get employee profile (authenticated employee can view their own profile)
router.get('/profile', authentication, authService.isEmployee, employee.getUserProfile)

module.exports = router
