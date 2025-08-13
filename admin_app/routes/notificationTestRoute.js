const express = require('express');
const router = express.Router();
const TaskNotificationService = require('../../service/taskNotificationService');
const ScheduledNotificationService = require('../../service/scheduledNotificationService');
const { prisma } = require('../../config/prismaConfig');

// Test endpoint to manually trigger task assignment notifications
router.post('/test-task-notification', async (req, res) => {
    try {
        const { taskId } = req.body;
        
        if (!taskId) {
            return res.status(400).json({
                success: false,
                message: 'Task ID is required'
            });
        }

        // Get task with assigned employees
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            include: {
                assignedEmployees: {
                    select: {
                        id: true,
                        empName: true,
                        empEmail: true,
                        empTechnology: true
                    }
                }
            }
        });

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        // Send test notification
        const result = await TaskNotificationService.sendTaskAssignmentNotifications(
            task,
            task.assignedEmployees,
            'created'
        );

        res.status(200).json({
            success: true,
            message: 'Test notification sent successfully',
            result
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error sending test notification',
            error: error.message
        });
    }
});

// Test endpoint to manually trigger daily task reminders
router.post('/test-daily-reminders', async (req, res) => {
    try {
        await ScheduledNotificationService.sendDailyTaskReminders();
        
        res.status(200).json({
            success: true,
            message: 'Daily task reminders sent successfully'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error sending daily reminders',
            error: error.message
        });
    }
});

// Test endpoint to manually trigger weekly task summary
router.post('/test-weekly-summary', async (req, res) => {
    try {
        await ScheduledNotificationService.sendWeeklyTaskSummary();
        
        res.status(200).json({
            success: true,
            message: 'Weekly task summary sent successfully'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error sending weekly summary',
            error: error.message
        });
    }
});

// Test endpoint to get notification statistics
router.get('/notification-stats', async (req, res) => {
    try {
        const totalNotifications = await prisma.notification.count();
        const activeNotifications = await prisma.notification.count({
            where: { isActive: true }
        });
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayNotifications = await prisma.notification.count({
            where: {
                createdAt: {
                    gte: today
                }
            }
        });

        res.status(200).json({
            success: true,
            message: 'Notification statistics retrieved successfully',
            stats: {
                total: totalNotifications,
                active: activeNotifications,
                today: todayNotifications
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error retrieving notification statistics',
            error: error.message
        });
    }
});

module.exports = router;

