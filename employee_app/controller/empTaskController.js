const { prisma } = require('../../config/prismaConfig');
const empLogger = require('../../utils/empLogger/empLogger');

module.exports = {
    // Get tasks assigned to the logged-in employee (EMPLOYEE ACCESS)
    getMyTasks: async (req, res) => {
        try {
            const empId = req.user.userData.empId; // Get from JWT token
            const { status } = req.query;

            // Verify the employee exists and is active
            const employee = await prisma.employee.findUnique({
                where: { 
                    id: empId,
                    empRole: 'employee',
                    isActive: true
                },
                select: { id: true, empName: true, empEmail: true, empTechnology: true }
            });

            if (!employee) {
                return res.status(404).json({
                    success: false,
                    message: "Employee not found or not authorized"
                });
            }

            let whereClause = {
                assignedEmployees: {
                    some: {
                        id: empId
                    }
                },
                isActive: true
            };

            // Filter by status if provided
            if (status) {
                whereClause.status = status.toUpperCase();
            }

            const tasks = await prisma.task.findMany({
                where: whereClause,
                include: {
                    assignedEmployees: {
                        select: {
                            id: true,
                            empName: true,
                            empEmail: true,
                            empTechnology: true
                        }
                    }
                },
                orderBy: {
                    dueDate: 'asc'
                }
            });

            empLogger.log('info', `Tasks for employee "${employee.empName}" retrieved successfully`);
            res.status(200).json({
                success: true,
                message: "Your assigned tasks retrieved successfully",
                employee: {
                    id: employee.id,
                    empName: employee.empName,
                    empEmail: employee.empEmail,
                    empTechnology: employee.empTechnology
                },
                data: tasks,
                total: tasks.length
            });
        } catch (error) {
            empLogger.log('error', `Error retrieving employee tasks: ${error.message}`);
            res.status(500).json({
                success: false,
                message: "Error retrieving your tasks",
                error: error.message
            });
        }
    },

    // Get specific task details (EMPLOYEE ACCESS - only if assigned)
    getMyTaskById: async (req, res) => {
        try {
            const { taskId } = req.params;
            const empId = req.user.userData.empId; // Get from JWT token

            // Check if task exists and is assigned to the employee
            const task = await prisma.task.findFirst({
                where: { 
                    id: taskId,
                    isActive: true,
                    assignedEmployees: {
                        some: {
                            id: empId,
                            empRole: 'employee'
                        }
                    }
                },
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
                    message: "Task not found or not assigned to you"
                });
            }

            empLogger.log('info', `Task "${task.title}" details retrieved by employee ${empId}`);
            res.status(200).json({
                success: true,
                message: "Task details retrieved successfully",
                task
            });
        } catch (error) {
            empLogger.log('error', `Error retrieving task details: ${error.message}`);
            res.status(500).json({
                success: false,
                message: "Error retrieving task details",
                error: error.message
            });
        }
    },

    // Update task status (EMPLOYEE ACCESS - can update status of assigned tasks)
    updateMyTaskStatus: async (req, res) => {
        try {
            const { taskId } = req.params;
            const { status } = req.body;
            const empId = req.user.userData.empId; // Get from JWT token

            if (!status) {
                return res.status(400).json({
                    success: false,
                    message: "Status is required"
                });
            }

            const validStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];
            if (!validStatuses.includes(status.toUpperCase())) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid status. Must be PENDING, IN_PROGRESS, or COMPLETED"
                });
            }

            // Check if task exists and is assigned to the employee
            const task = await prisma.task.findFirst({
                where: { 
                    id: taskId,
                    isActive: true,
                    assignedEmployees: {
                        some: {
                            id: empId,
                            empRole: 'employee'
                        }
                    }
                }
            });

            if (!task) {
                return res.status(404).json({
                    success: false,
                    message: "Task not found or not assigned to you"
                });
            }

            const updatedTask = await prisma.task.update({
                where: { id: taskId },
                data: { status: status.toUpperCase() },
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

            empLogger.log('info', `Task "${task.title}" status updated to ${status} by employee ${empId}`);
            res.status(200).json({
                success: true,
                message: "Task status updated successfully",
                task: updatedTask
            });
        } catch (error) {
            empLogger.log('error', `Error updating task status: ${error.message}`);
            res.status(500).json({
                success: false,
                message: "Error updating task status",
                error: error.message
            });
        }
    },

    // Get task statistics for the employee (EMPLOYEE ACCESS)
    getMyTaskStats: async (req, res) => {
        try {
            const empId = req.user.userData.empId; // Get from JWT token

            // Verify the employee exists and is active
            const employee = await prisma.employee.findUnique({
                where: { 
                    id: empId,
                    empRole: 'employee',
                    isActive: true
                },
                select: { id: true, empName: true, empEmail: true }
            });

            if (!employee) {
                return res.status(404).json({
                    success: false,
                    message: "Employee not found or not authorized"
                });
            }

            // Get all tasks assigned to the employee
            const allTasks = await prisma.task.findMany({
                where: {
                    assignedEmployees: {
                        some: {
                            id: empId
                        }
                    },
                    isActive: true
                },
                select: {
                    status: true,
                    dueDate: true,
                    createdAt: true
                }
            });

            // Calculate statistics
            const stats = {
                total: allTasks.length,
                pending: allTasks.filter(task => task.status === 'PENDING').length,
                inProgress: allTasks.filter(task => task.status === 'IN_PROGRESS').length,
                completed: allTasks.filter(task => task.status === 'COMPLETED').length,
                overdue: allTasks.filter(task => 
                    task.status !== 'COMPLETED' && 
                    new Date(task.dueDate) < new Date()
                ).length,
                dueToday: allTasks.filter(task => {
                    const today = new Date();
                    const dueDate = new Date(task.dueDate);
                    return dueDate.toDateString() === today.toDateString() && task.status !== 'COMPLETED';
                }).length
            };

            empLogger.log('info', `Task statistics retrieved for employee "${employee.empName}"`);
            res.status(200).json({
                success: true,
                message: "Task statistics retrieved successfully",
                employee: {
                    id: employee.id,
                    empName: employee.empName,
                    empEmail: employee.empEmail
                },
                statistics: stats
            });
        } catch (error) {
            empLogger.log('error', `Error retrieving task statistics: ${error.message}`);
            res.status(500).json({
                success: false,
                message: "Error retrieving task statistics",
                error: error.message
            });
        }
    }
};
