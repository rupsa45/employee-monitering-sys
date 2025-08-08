const { prisma } = require('../../config/prismaConfig');
const adminLogger = require('../../utils/adminLogger/adminLogger');

module.exports = {
    // Create a new task (ADMIN ONLY)
    createTask: async (req, res) => {
        try {
            const {
                title,
                description,
                assignedTo, // Array of employee IDs
                dueDate
            } = req.body;

            // Validate required fields
            if (!title || !description || !assignedTo || !dueDate) {
                return res.status(400).json({
                    success: false,
                    message: "Title, description, assigned employees, and due date are required"
                });
            }

            // Validate assigned employees exist
            const employees = await prisma.employee.findMany({
                where: {
                    id: { in: assignedTo },
                    isActive: true,
                    empRole: 'employee' // Only assign to employees, not admins
                },
                select: { id: true, empName: true, empEmail: true }
            });

            if (employees.length !== assignedTo.length) {
                return res.status(400).json({
                    success: false,
                    message: "One or more assigned employees not found or are not valid employees"
                });
            }

            // Create task with assigned employees
            const task = await prisma.task.create({
                data: {
                    title,
                    description,
                    dueDate: new Date(dueDate),
                    assignedEmployees: {
                        connect: assignedTo.map(empId => ({ id: empId }))
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

            adminLogger.log('info', `Task "${title}" created successfully by admin`);
            res.status(201).json({
                success: true,
                message: "Task created successfully",
                task: {
                    id: task.id,
                    title: task.title,
                    description: task.description,
                    status: task.status,
                    dueDate: task.dueDate,
                    assignedEmployees: task.assignedEmployees,
                    createdAt: task.createdAt
                }
            });
        } catch (error) {
            adminLogger.log('error', `Error creating task: ${error.message}`);
            res.status(500).json({
                success: false,
                message: "Error creating task",
                error: error.message
            });
        }
    },

    // Get all tasks (ADMIN ONLY)
    getAllTasks: async (req, res) => {
        try {
            const { status, assignedTo } = req.query;

            let whereClause = {
                isActive: true
            };

            // Filter by status if provided
            if (status) {
                whereClause.status = status.toUpperCase();
            }

            // Filter by assigned employee if provided
            if (assignedTo) {
                whereClause.assignedEmployees = {
                    some: {
                        id: assignedTo
                    }
                };
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
                    createdAt: 'desc'
                }
            });

            adminLogger.log('info', "All tasks retrieved successfully by admin");
            res.status(200).json({
                success: true,
                message: "Tasks retrieved successfully",
                data: tasks,
                total: tasks.length
            });
        } catch (error) {
            adminLogger.log('error', `Error retrieving tasks: ${error.message}`);
            res.status(500).json({
                success: false,
                message: "Error retrieving tasks",
                error: error.message
            });
        }
    },

    // Get task by ID (ADMIN ONLY)
    getTaskById: async (req, res) => {
        try {
            const { taskId } = req.params;

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
                    message: "Task not found"
                });
            }

            adminLogger.log('info', `Task "${task.title}" retrieved successfully by admin`);
            res.status(200).json({
                success: true,
                message: "Task retrieved successfully",
                task
            });
        } catch (error) {
            adminLogger.log('error', `Error retrieving task: ${error.message}`);
            res.status(500).json({
                success: false,
                message: "Error retrieving task",
                error: error.message
            });
        }
    },

    // Update task (ADMIN ONLY)
    updateTask: async (req, res) => {
        try {
            const { taskId } = req.params;
            const {
                title,
                description,
                assignedTo,
                status,
                dueDate
            } = req.body;

            // Check if task exists
            const existingTask = await prisma.task.findUnique({
                where: { id: taskId }
            });

            if (!existingTask) {
                return res.status(404).json({
                    success: false,
                    message: "Task not found"
                });
            }

            // Prepare update data
            const updateData = {};
            if (title) updateData.title = title;
            if (description) updateData.description = description;
            if (status) updateData.status = status.toUpperCase();
            if (dueDate) updateData.dueDate = new Date(dueDate);

            // Update task
            const updatedTask = await prisma.task.update({
                where: { id: taskId },
                data: updateData,
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

            // Update assigned employees if provided
            if (assignedTo) {
                // Validate assigned employees exist and are employees (not admins)
                const employees = await prisma.employee.findMany({
                    where: {
                        id: { in: assignedTo },
                        isActive: true,
                        empRole: 'employee'
                    }
                });

                if (employees.length !== assignedTo.length) {
                    return res.status(400).json({
                        success: false,
                        message: "One or more assigned employees not found or are not valid employees"
                    });
                }

                // Update assignments
                await prisma.task.update({
                    where: { id: taskId },
                    data: {
                        assignedEmployees: {
                            set: [], // Clear existing assignments
                            connect: assignedTo.map(empId => ({ id: empId }))
                        }
                    }
                });

                // Get updated task with new assignments
                const finalTask = await prisma.task.findUnique({
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

                adminLogger.log('info', `Task "${finalTask.title}" updated successfully by admin`);
                res.status(200).json({
                    success: true,
                    message: "Task updated successfully",
                    task: finalTask
                });
            } else {
                adminLogger.log('info', `Task "${updatedTask.title}" updated successfully by admin`);
                res.status(200).json({
                    success: true,
                    message: "Task updated successfully",
                    task: updatedTask
                });
            }
        } catch (error) {
            adminLogger.log('error', `Error updating task: ${error.message}`);
            res.status(500).json({
                success: false,
                message: "Error updating task",
                error: error.message
            });
        }
    },

    // Delete task (ADMIN ONLY - soft delete)
    deleteTask: async (req, res) => {
        try {
            const { taskId } = req.params;

            const task = await prisma.task.findUnique({
                where: { id: taskId }
            });

            if (!task) {
                return res.status(404).json({
                    success: false,
                    message: "Task not found"
                });
            }

            // Soft delete
            await prisma.task.update({
                where: { id: taskId },
                data: { isActive: false }
            });

            adminLogger.log('info', `Task "${task.title}" deleted successfully by admin`);
            res.status(200).json({
                success: true,
                message: "Task deleted successfully"
            });
        } catch (error) {
            adminLogger.log('error', `Error deleting task: ${error.message}`);
            res.status(500).json({
                success: false,
                message: "Error deleting task",
                error: error.message
            });
        }
    },

    // Get tasks assigned to a specific employee (EMPLOYEE ACCESS)
    getEmployeeTasks: async (req, res) => {
        try {
            const { empId } = req.params;
            const { status } = req.query;

            // Check if employee exists and is an employee (not admin)
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

            adminLogger.log('info', `Tasks for employee "${employee.empName}" retrieved successfully`);
            res.status(200).json({
                success: true,
                message: "Employee tasks retrieved successfully",
                employee,
                data: tasks,
                total: tasks.length
            });
        } catch (error) {
            adminLogger.log('error', `Error retrieving employee tasks: ${error.message}`);
            res.status(500).json({
                success: false,
                message: "Error retrieving employee tasks",
                error: error.message
            });
        }
    },

    // Update task status (EMPLOYEE ACCESS - can update status of assigned tasks)
    updateTaskStatus: async (req, res) => {
        try {
            const { taskId } = req.params;
            const { status, empId } = req.body;

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

            adminLogger.log('info', `Task "${task.title}" status updated to ${status} by employee ${empId}`);
            res.status(200).json({
                success: true,
                message: "Task status updated successfully",
                task: updatedTask
            });
        } catch (error) {
            adminLogger.log('error', `Error updating task status: ${error.message}`);
            res.status(500).json({
                success: false,
                message: "Error updating task status",
                error: error.message
            });
        }
    }
};
