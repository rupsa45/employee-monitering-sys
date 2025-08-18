const express = require('express');
const taskController = require('../controller/taskController');
const { authentication } = require('../../middleware/authToken');
const authService = require('../../middleware/authService');
const { taskCreationSchema, taskUpdateSchema, taskStatusUpdateSchema } = require('../../authValidations/employee/empValidator');

const router = express.Router();

// Validation middleware
const validateTaskCreation = (req, res, next) => {
    const { error } = taskCreationSchema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            message: error.details[0].message
        });
    }
    next();
};

const validateTaskUpdate = (req, res, next) => {
    const { error } = taskUpdateSchema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            message: error.details[0].message
        });
    }
    next();
};

const validateTaskStatusUpdate = (req, res, next) => {
    const { error } = taskStatusUpdateSchema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            message: error.details[0].message
        });
    }
    next();
};

// All task routes require admin authentication
router.use(authentication);
router.use(authService.isAdmin);

// Admin task management routes (FULL ACCESS)
router.post('/create', validateTaskCreation, taskController.createTask);
router.get('/all', taskController.getAllTasks);
router.get('/:taskId', taskController.getTaskById);
router.put('/:taskId', validateTaskUpdate, taskController.updateTask);
router.delete('/delete/:taskId', taskController.deleteTask);
router.delete('/:taskId', taskController.inactiveTask);

// Admin can also update task status
router.patch('/:taskId/status', validateTaskStatusUpdate, taskController.updateTaskStatus);

module.exports = router;
