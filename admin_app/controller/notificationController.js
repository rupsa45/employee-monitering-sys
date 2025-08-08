const { prisma } = require('../../config/prismaConfig');
const notificationLogger = require('../../utils/notificationLogger/notificationLogger');

module.exports = {
    // Create notification
    createNotification: async (req, res) => {
        try {
            const { title, message, empId } = req.body;

            const notification = await prisma.notification.create({
                data: {
                    title,
                    message,
                    empId,
                    isActive: true
                },
                include: {
                    employee: {
                        select: {
                            empName: true,
                            empEmail: true,
                            empTechnology: true
                        }
                    }
                }
            });

            notificationLogger.log('info', "Notification created successfully");
            res.status(201).json({
                success: true,
                message: "Notification created successfully",
                notification: notification
            });
        } catch (error) {
            notificationLogger.log('error', `Error: ${error.message}`);
            res.status(500).json({
                success: false,
                message: "Error creating notification",
                error: error.message
            });
        }
    },

    // Get all notifications
    getAllNotifications: async (req, res) => {
        try {
            const { empId, isActive } = req.query;

            let whereClause = {};

            // Filter by employee if provided
            if (empId) {
                whereClause.empId = empId;
            }

            // Filter by active status if provided
            if (isActive !== undefined) {
                whereClause.isActive = isActive === 'true';
            }

            const notifications = await prisma.notification.findMany({
                where: whereClause,
                include: {
                    employee: {
                        select: {
                            empName: true,
                            empEmail: true,
                            empTechnology: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });

            notificationLogger.log('info', "All notifications retrieved successfully");
            res.status(200).json({
                success: true,
                message: "All notifications retrieved successfully",
                data: notifications,
                total: notifications.length
            });
        } catch (error) {
            notificationLogger.log('error', `Error: ${error.message}`);
            res.status(500).json({
                success: false,
                message: "Error retrieving notifications",
                error: error.message
            });
        }
    },

    // Update notification
    updateNotification: async (req, res) => {
        try {
            const { id } = req.params;
            const { title, message, isActive } = req.body;

            const notification = await prisma.notification.update({
                where: { id },
                data: {
                    title,
                    message,
                    isActive
                },
                include: {
                    employee: {
                        select: {
                            empName: true,
                            empEmail: true,
                            empTechnology: true
                        }
                    }
                }
            });

            notificationLogger.log('info', "Notification updated successfully");
            res.status(200).json({
                success: true,
                message: "Notification updated successfully",
                notification: notification
            });
        } catch (error) {
            notificationLogger.log('error', `Error: ${error.message}`);
            res.status(500).json({
                success: false,
                message: "Error updating notification",
                error: error.message
            });
        }
    },

    // Delete notification (soft delete)
    deleteNotification: async (req, res) => {
        try {
            const { id } = req.params;

            await prisma.notification.update({
                where: { id },
                data: { isActive: false }
            });

            notificationLogger.log('info', "Notification deleted successfully");
            res.status(200).json({
                success: true,
                message: "Notification deleted successfully"
            });
        } catch (error) {
            notificationLogger.log('error', `Error: ${error.message}`);
            res.status(500).json({
                success: false,
                message: "Error deleting notification",
                error: error.message
            });
        }
    },

    // Get notification by ID
    getNotificationById: async (req, res) => {
        try {
            const { id } = req.params;

            const notification = await prisma.notification.findUnique({
                where: { id },
                include: {
                    employee: {
                        select: {
                            empName: true,
                            empEmail: true,
                            empTechnology: true
                        }
                    }
                }
            });

            if (!notification) {
                return res.status(404).json({
                    success: false,
                    message: "Notification not found"
                });
            }

            notificationLogger.log('info', "Notification retrieved successfully");
            res.status(200).json({
                success: true,
                message: "Notification retrieved successfully",
                notification: notification
            });
        } catch (error) {
            notificationLogger.log('error', `Error: ${error.message}`);
            res.status(500).json({
                success: false,
                message: "Error retrieving notification",
                error: error.message
            });
        }
    }
};
