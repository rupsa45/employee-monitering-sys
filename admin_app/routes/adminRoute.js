const express = require('express');
const adminController = require('../controller/adminController');
const authentication = require('../../middleware/authToken');
const authService = require('../../middleware/authService');
const { adminRegistrationSchema, adminLoginSchema, employeeRegistrationSchema } = require('../../authValidations/employee/empValidator');

const router = express.Router();

// Validation middleware
const validateAdminRegistration = (req, res, next) => {
    const { error } = adminRegistrationSchema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            message: error.details[0].message
        });
    }
    next();
};

const validateAdminLogin = (req, res, next) => {
    const { error } = adminLoginSchema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            message: error.details[0].message
        });
    }
    next();
};

const validateEmployeeCreation = (req, res, next) => {
    const { error } = employeeRegistrationSchema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            message: error.details[0].message
        });
    }
    next();
};

// Public routes (no authentication required)
router.post('/adminRegister', validateAdminRegistration, adminController.adminRegister);
router.post('/adminLogin', validateAdminLogin, adminController.adminLogin);

// Protected routes (authentication required)
router.post('/createEmployee', authentication, authService.isAdmin, validateEmployeeCreation, adminController.createEmployee);
router.get('/empDashBoard', authentication, authService.isAdmin, adminController.empDashBoard);
router.get('/showEmpLeaves', authentication, authService.isAdmin, adminController.showEmpLeaves);
router.patch('/empLeavePermit/:leaveId', authentication, authService.isAdmin, adminController.empLeavePermit);

module.exports = router;
