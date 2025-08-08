const express = require('express');
const empTaskController = require('../controller/empTaskController');
const { authentication } = require('../../middleware/authToken');
const authService = require('../../middleware/authService');
const { taskStatusUpdateSchema } = require('../../authValidations/employee/empValidator');

const router = express.Router();

// Validation middleware
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

// All employee task routes require employee authentication
router.use(authentication);
router.use(authService.isEmployee);

// Employee task management routes (READ-ONLY + STATUS UPDATE)
router.get('/my-tasks', empTaskController.getMyTasks);
router.get('/my-tasks/:taskId', empTaskController.getMyTaskById);
router.patch('/my-tasks/:taskId/status', validateTaskStatusUpdate, empTaskController.updateMyTaskStatus);
router.get('/my-task-stats', empTaskController.getMyTaskStats);

module.exports = router;
