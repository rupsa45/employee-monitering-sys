const moment = require('moment');
const { prisma } = require('../../config/prismaConfig');
const empLeaveLogger = require('../../utils/empLeaveLogger/empLeaveLogger');

module.exports = {
    // Apply for leave
    empLeave: async (req, res) => {
        try {
            const {
                empId,
                leaveType,
                startDate,
                endDate,
                message
            } = req.body;

            // Validate dates
            const start = moment(startDate);
            const end = moment(endDate);
            
            if (start.isAfter(end)) {
                return res.status(400).json({
                    success: false,
                    message: "Start date cannot be after end date"
                });
            }

            if (start.isBefore(moment(), 'day')) {
                return res.status(400).json({
                    success: false,
                    message: "Cannot apply leave for past dates"
                });
            }

            // Calculate leave duration
            const duration = end.diff(start, 'days') + 1;

            // Create leave request
            const leaveRequest = await prisma.empLeave.create({
                data: {
                    empId: empId,
                    leaveType: leaveType.toUpperCase(),
                    startDate: start.toDate(),
                    endDate: end.toDate(),
                    message: message || "",
                    status: 'PENDING',
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

            empLeaveLogger.log('info', "Leave request submitted successfully");
            res.status(201).json({
                success: true,
                message: "Leave request submitted successfully",
                leaveRequest: {
                    id: leaveRequest.id,
                    leaveType: leaveRequest.leaveType,
                    startDate: leaveRequest.startDate,
                    endDate: leaveRequest.endDate,
                    duration: duration,
                    status: leaveRequest.status,
                    employee: leaveRequest.employee
                }
            });
        } catch (error) {
            empLeaveLogger.log('error', `Error: ${error.message}`);
            res.status(500).json({
                success: false,
                message: "Error submitting leave request",
                error: error.message
            });
        }
    },

    // Get employee leave history
    getLeaveHistory: async (req, res) => {
        try {
            const { empId } = req.params;
            const { startDate, endDate, status } = req.query;

            let whereClause = {
                empId: empId,
                isActive: true
            };

            // Add date filter if provided
            if (startDate && endDate) {
                whereClause.startDate = {
                    gte: new Date(startDate),
                    lte: new Date(endDate)
                };
            }

            // Add status filter if provided
            if (status) {
                whereClause.status = status.toUpperCase();
            }

            const leaveHistory = await prisma.empLeave.findMany({
                where: whereClause,
                orderBy: {
                    createdAt: 'desc'
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

            // Calculate duration for each leave
            const leavesWithDuration = leaveHistory.map(leave => {
                const start = moment(leave.startDate);
                const end = moment(leave.endDate);
                const duration = end.diff(start, 'days') + 1;
                
                return {
                    ...leave,
                    duration: duration
                };
            });

            empLeaveLogger.log('info', "Leave history retrieved successfully");
            res.status(200).json({
                success: true,
                message: "Leave history retrieved successfully",
                data: leavesWithDuration,
                total: leavesWithDuration.length
            });
        } catch (error) {
            empLeaveLogger.log('error', `Error: ${error.message}`);
            res.status(500).json({
                success: false,
                message: "Error retrieving leave history",
                error: error.message
            });
        }
    },

    // Get leave balance
    getLeaveBalance: async (req, res) => {
        try {
            const { empId } = req.params;

            // Get all approved leaves for the employee
            const approvedLeaves = await prisma.empLeave.findMany({
                where: {
                    empId: empId,
                    status: 'APPROVE',
                    isActive: true
                }
            });

            // Calculate used leaves by type
            const usedLeaves = {
                CASUAL: 0,
                SICK: 0,
                OTHER: 0
            };

            approvedLeaves.forEach(leave => {
                const start = moment(leave.startDate);
                const end = moment(leave.endDate);
                const duration = end.diff(start, 'days') + 1;
                usedLeaves[leave.leaveType] += duration;
            });

            // Default leave balance (10 each)
            const totalBalance = {
                CASUAL: 10,
                SICK: 10,
                OTHER: 10
            };

            // Calculate remaining balance
            const remainingBalance = {
                CASUAL: totalBalance.CASUAL - usedLeaves.CASUAL,
                SICK: totalBalance.SICK - usedLeaves.SICK,
                OTHER: totalBalance.OTHER - usedLeaves.OTHER
            };

            empLeaveLogger.log('info', "Leave balance retrieved successfully");
            res.status(200).json({
                success: true,
                message: "Leave balance retrieved successfully",
                data: {
                    totalBalance,
                    usedLeaves,
                    remainingBalance
                }
            });
        } catch (error) {
            empLeaveLogger.log('error', `Error: ${error.message}`);
            res.status(500).json({
                success: false,
                message: "Error retrieving leave balance",
                error: error.message
            });
        }
    },

    // Cancel leave request
    cancelLeave: async (req, res) => {
        try {
            const { leaveId } = req.params;
            const { empId } = req.body;

            const leaveRequest = await prisma.empLeave.findFirst({
                where: {
                    id: leaveId,
                    empId: empId,
                    isActive: true
                }
            });

            if (!leaveRequest) {
                return res.status(404).json({
                    success: false,
                    message: "Leave request not found"
                });
            }

            if (leaveRequest.status !== 'PENDING') {
                return res.status(400).json({
                    success: false,
                    message: "Cannot cancel leave that is not pending"
                });
            }

            // Soft delete the leave request
            await prisma.empLeave.update({
                where: { id: leaveId },
                data: { isActive: false }
            });

            empLeaveLogger.log('info', "Leave request cancelled successfully");
            res.status(200).json({
                success: true,
                message: "Leave request cancelled successfully"
            });
        } catch (error) {
            empLeaveLogger.log('error', `Error: ${error.message}`);
            res.status(500).json({
                success: false,
                message: "Error cancelling leave request",
                error: error.message
            });
        }
    }
};
