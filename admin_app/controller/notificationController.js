const { prisma } = require('../../config/prismaConfig');
// Logger removed for cleaner output

module.exports = {
    // Create notification
    createNotification: async (req, res) => {
        try {
            const { title, message, empIds, sendToAll } = req.body;

            let targetEmployees = [];

            if (sendToAll) {
                // Get all active employees
                const allEmployees = await prisma.employee.findMany({
                    where: {
                        isActive: true,
                        empRole: 'employee'
                    },
                    select: { id: true }
                });
                targetEmployees = allEmployees.map(emp => emp.id);
            } else if (empIds && empIds.length > 0) {
                // Verify all provided employee IDs exist and are active
                const employees = await prisma.employee.findMany({
                    where: {
                        id: { in: empIds },
                        isActive: true,
                        empRole: 'employee'
                    },
                    select: { id: true }
                });
                targetEmployees = employees.map(emp => emp.id);
            } else {
                return res.status(400).json({
                    success: false,
                    message: "Either empIds array or sendToAll=true must be provided"
                });
            }

            if (targetEmployees.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "No valid employees found to send notification to"
                });
            }

            // Create notifications for all target employees
            const notifications = await Promise.all(
                targetEmployees.map(empId =>
                    prisma.notification.create({
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
                    })
                )
            );

            
            res.status(201).json({
                success: true,
                message: `Notification created successfully for ${notifications.length} employees`,
                notifications: notifications,
                totalRecipients: notifications.length,
                recipients: notifications.map(n => ({
                    empId: n.empId,
                    empName: n.employee.empName,
                    empEmail: n.employee.empEmail
                }))
            });
        } catch (error) {
            
            res.status(500).json({
                success: false,
                message: "Error creating notification",
                error: error.message
            });
        }
    },

    // Get all active employees for notification selection
    getActiveEmployees: async (req, res) => {
        try {
            const employees = await prisma.employee.findMany({
                where: {
                    isActive: true,
                    empRole: 'employee'
                },
                select: {
                    id: true,
                    empName: true,
                    empEmail: true,
                    empTechnology: true,
                    empPhone: true
                },
                orderBy: {
                    empName: 'asc'
                }
            });

            
            res.status(200).json({
                success: true,
                message: "Active employees retrieved successfully",
                data: employees,
                total: employees.length
            });
        } catch (error) {
            
            res.status(500).json({
                success: false,
                message: "Error retrieving active employees",
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

            
            res.status(200).json({
                success: true,
                message: "All notifications retrieved successfully",
                data: notifications,
                total: notifications.length
            });
        } catch (error) {
            
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

            
            res.status(200).json({
                success: true,
                message: "Notification updated successfully",
                notification: notification
            });
        } catch (error) {
            
            res.status(500).json({
                success: false,
                message: "Error updating notification",
                error: error.message
            });
        }
    },

    // Delete notification (soft delete)
    inactivateNotification: async (req, res) => {
        try {
            const { id } = req.params;

            await prisma.notification.update({
                where: { id },
                data: { isActive: false }
            });

            
            res.status(200).json({
                success: true,
                message: "Notification inactive successfully"
            });
        } catch (error) {
            
            res.status(500).json({
                success: false,
                message: "Error while inactivate notification",
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

            
            res.status(200).json({
                success: true,
                message: "Notification retrieved successfully",
                notification: notification
            });
        } catch (error) {
            
            res.status(500).json({
                success: false,
                message: "Error retrieving notification",
                error: error.message
            });
        }
    }
};
