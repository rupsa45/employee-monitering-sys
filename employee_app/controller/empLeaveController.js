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

    // Get employee leave history with comprehensive filtering
    getLeaveHistory: async (req, res) => {
        try {
            const { empId } = req.params;
            const { 
                startDate, 
                endDate, 
                status, 
                leaveType, 
                year,
                month,
                page = 1,
                limit = 10,
                sortBy = 'createdAt',
                sortOrder = 'desc'
            } = req.query;

            // Validate employee exists
            const employee = await prisma.employee.findUnique({
                where: { id: empId, isActive: true },
                select: { id: true, empName: true, empEmail: true }
            });

            if (!employee) {
                return res.status(404).json({
                    success: false,
                    message: "Employee not found"
                });
            }

            let whereClause = {
                empId: empId,
                isActive: true
            };

            // Date range filter
            if (startDate && endDate) {
                whereClause.startDate = {
                    gte: new Date(startDate),
                    lte: new Date(endDate)
                };
            } else if (startDate) {
                whereClause.startDate = {
                    gte: new Date(startDate)
                };
            } else if (endDate) {
                whereClause.startDate = {
                    lte: new Date(endDate)
                };
            }

            // Status filter
            if (status) {
                whereClause.status = status.toUpperCase();
            }

            // Leave type filter
            if (leaveType) {
                whereClause.leaveType = leaveType.toUpperCase();
            }

            // Year filter
            if (year) {
                const yearStart = new Date(parseInt(year), 0, 1);
                const yearEnd = new Date(parseInt(year), 11, 31, 23, 59, 59);
                whereClause.startDate = {
                    gte: yearStart,
                    lte: yearEnd
                };
            }

            // Month filter (requires year)
            if (month && year) {
                const monthStart = new Date(parseInt(year), parseInt(month) - 1, 1);
                const monthEnd = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
                whereClause.startDate = {
                    gte: monthStart,
                    lte: monthEnd
                };
            }

            // Pagination
            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            const skip = (pageNum - 1) * limitNum;

            // Sorting
            const orderBy = {};
            orderBy[sortBy] = sortOrder.toLowerCase();

            // Get total count for pagination
            const totalCount = await prisma.empLeave.count({
                where: whereClause
            });

            // Get leave history with pagination
            const leaveHistory = await prisma.empLeave.findMany({
                where: whereClause,
                orderBy: orderBy,
                skip: skip,
                take: limitNum,
                select: {
                    id: true,
                    leaveType: true,
                    status: true,
                    message: true,
                    startDate: true,
                    endDate: true,
                    isActive: true,
                    createdAt: true,
                    updatedAt: true,
                    empId: true,
                    employee: {
                        select: {
                            empName: true,
                            empEmail: true,
                            empTechnology: true
                        }
                    }
                }
            });

            // Calculate duration and additional info for each leave
            const leavesWithDetails = leaveHistory.map(leave => {
                const start = moment(leave.startDate);
                const end = moment(leave.endDate);
                const duration = end.diff(start, 'days') + 1;
                
                // Calculate working days (excluding weekends)
                let workingDays = 0;
                let current = start.clone();
                while (current.isSameOrBefore(end)) {
                    if (current.day() !== 0 && current.day() !== 6) { // Not Sunday or Saturday
                        workingDays++;
                    }
                    current.add(1, 'day');
                }

                return {
                    ...leave,
                    duration: duration,
                    workingDays: workingDays,
                    isOverlapping: false, // Will be calculated if needed
                    formattedStartDate: start.format('DD MMM YYYY'),
                    formattedEndDate: end.format('DD MMM YYYY'),
                    appliedOn: moment(leave.createdAt).format('DD MMM YYYY HH:mm'),
                    statusColor: getStatusColor(leave.status),
                    leaveTypeIcon: getLeaveTypeIcon(leave.leaveType)
                };
            });

            // Calculate statistics
            const statistics = await calculateLeaveStatistics(empId, year);

            empLeaveLogger.log('info', `Leave history retrieved successfully for employee ${empId}`);
            res.status(200).json({
                success: true,
                message: "Leave history retrieved successfully",
                data: {
                    employee: {
                        id: employee.id,
                        empName: employee.empName,
                        empEmail: employee.empEmail
                    },
                    leaves: leavesWithDetails,
                    statistics: statistics,
                    pagination: {
                        currentPage: pageNum,
                        totalPages: Math.ceil(totalCount / limitNum),
                        totalItems: totalCount,
                        itemsPerPage: limitNum,
                        hasNextPage: pageNum < Math.ceil(totalCount / limitNum),
                        hasPrevPage: pageNum > 1
                    },
                    filters: {
                        applied: {
                            startDate,
                            endDate,
                            status,
                            leaveType,
                            year,
                            month
                        }
                    }
                }
            });
        } catch (error) {
            empLeaveLogger.log('error', `Error retrieving leave history: ${error.message}`);
            res.status(500).json({
                success: false,
                message: "Error retrieving leave history",
                error: error.message
            });
        }
    },

    // Get comprehensive leave balance with year-wise tracking
    // getLeaveBalance: async (req, res) => {
    //     try {
    //         const { empId } = req.params;
    //         const { year = new Date().getFullYear() } = req.query;

    //         // Validate employee exists
    //         const employee = await prisma.employee.findUnique({
    //             where: { id: empId, isActive: true },
    //             select: { id: true, empName: true, empEmail: true }
    //         });

    //         if (!employee) {
    //             return res.status(404).json({
    //                 success: false,
    //                 message: "Employee not found"
    //             });
    //         }

    //         const yearNum = parseInt(year);
    //         const yearStart = new Date(yearNum, 0, 1);
    //         const yearEnd = new Date(yearNum, 11, 31, 23, 59, 59);

    //         // Get all leaves for the year
    //         const yearLeaves = await prisma.empLeave.findMany({
    //             where: {
    //                 empId: empId,
    //                 startDate: {
    //                     gte: yearStart,
    //                     lte: yearEnd
    //                 },
    //                 isActive: true
    //             },
    //             orderBy: {
    //                 startDate: 'asc'
    //             },
    //             select: {
    //                 id: true,
    //                 leaveType: true,
    //                 status: true,
    //                 startDate: true,
    //                 endDate: true,
    //                 isActive: true
    //             }
    //         });

    //         // Calculate detailed statistics
    //         const statistics = {
    //             total: { approved: 0, pending: 0, rejected: 0, cancelled: 0 },
    //             byType: {
    //                 CASUAL: { approved: 0, pending: 0, rejected: 0, cancelled: 0 },
    //                 SICK: { approved: 0, pending: 0, rejected: 0, cancelled: 0 },
    //                 OTHER: { approved: 0, pending: 0, rejected: 0, cancelled: 0 }
    //             },
    //             byMonth: Array(12).fill(0).map(() => ({
    //                 approved: 0,
    //                 pending: 0,
    //                 rejected: 0,
    //                 cancelled: 0
    //             }))
    //         };

    //         // Process each leave
    //         yearLeaves.forEach(leave => {
    //             const start = moment(leave.startDate);
    //             const end = moment(leave.endDate);
    //             const duration = end.diff(start, 'days') + 1;
    //             const status = leave.status.toLowerCase();

    //             // Update total statistics
    //             statistics.total[status] += duration;

    //             // Update type-wise statistics
    //             statistics.byType[leave.leaveType][status] += duration;

    //             // Update month-wise statistics
    //             const month = start.month();
    //             statistics.byMonth[month][status] += duration;
    //         });

    //         // Calculate leave balance
    //         const defaultBalance = {
    //             CASUAL: 10,
    //             SICK: 10,
    //             OTHER: 10
    //         };

    //         const usedLeaves = {
    //             CASUAL: statistics.byType.CASUAL.approved,
    //             SICK: statistics.byType.SICK.approved,
    //             OTHER: statistics.byType.OTHER.approved
    //         };

    //         const remainingBalance = {
    //             CASUAL: Math.max(0, defaultBalance.CASUAL - usedLeaves.CASUAL),
    //             SICK: Math.max(0, defaultBalance.SICK - usedLeaves.SICK),
    //             OTHER: Math.max(0, defaultBalance.OTHER - usedLeaves.OTHER)
    //         };

    //         // Calculate utilization percentage
    //         const utilization = {
    //             CASUAL: Math.round((usedLeaves.CASUAL / defaultBalance.CASUAL) * 100),
    //             SICK: Math.round((usedLeaves.SICK / defaultBalance.SICK) * 100),
    //             OTHER: Math.round((usedLeaves.OTHER / defaultBalance.OTHER) * 100)
    //         };

    //         // Get pending leave requests
    //         const pendingLeaves = yearLeaves.filter(leave => leave.status === 'PENDING');

    //         empLeaveLogger.log('info', `Leave balance retrieved successfully for employee ${empId} for year ${year}`);
    //         res.status(200).json({
    //             success: true,
    //             message: "Leave balance retrieved successfully",
    //             data: {
    //                 employee: {
    //                     id: employee.id,
    //                     empName: employee.empName,
    //                     empEmail: employee.empEmail
    //                 },
    //                 year: yearNum,
    //                 balance: {
    //                     default: defaultBalance,
    //                     used: usedLeaves,
    //                     remaining: remainingBalance,
    //                     utilization: utilization
    //                 },
    //                 statistics: statistics,
    //                 pendingRequests: pendingLeaves.length,
    //                 summary: {
    //                     totalLeaves: yearLeaves.length,
    //                     approvedLeaves: statistics.total.approved,
    //                     pendingLeaves: statistics.total.pending,
    //                     rejectedLeaves: statistics.total.rejected,
    //                     cancelledLeaves: statistics.total.cancelled
    //                 }
    //             }
    //         });
    //     } catch (error) {
    //         empLeaveLogger.log('error', `Error retrieving leave balance: ${error.message}`);
    //         res.status(500).json({
    //             success: false,
    //             message: "Error retrieving leave balance",
    //             error: error.message
    //         });
    //     }
    // },

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

// Helper functions
function getStatusColor(status) {
    const colors = {
        'PENDING': '#ffc107',
        'APPROVE': '#28a745',
        'REJECT': '#dc3545',
        'CANCELLED': '#6c757d'
    };
    return colors[status] || '#6c757d';
}

function getLeaveTypeIcon(leaveType) {
    const icons = {
        'CASUAL': '🎉',
        'SICK': '🏥',
        'OTHER': '📋'
    };
    return icons[leaveType] || '📋';
}

async function calculateLeaveStatistics(empId, year = new Date().getFullYear()) {
    try {
        const yearNum = parseInt(year);
        const yearStart = new Date(yearNum, 0, 1);
        const yearEnd = new Date(yearNum, 11, 31, 23, 59, 59);

        // Get all leaves for the year
        const yearLeaves = await prisma.empLeave.findMany({
            where: {
                empId: empId,
                startDate: {
                    gte: yearStart,
                    lte: yearEnd
                },
                isActive: true
            },
            select: {
                id: true,
                leaveType: true,
                status: true,
                startDate: true,
                endDate: true,
                isActive: true
            }
        });

        // Calculate statistics
        const stats = {
            totalLeaves: yearLeaves.length,
            totalDays: 0,
            approvedDays: 0,
            pendingDays: 0,
            rejectedDays: 0,
            cancelledDays: 0,
            byType: {
                CASUAL: { 
                    requests: 0, days: 0, approved: 0, pending: 0, rejected: 0, cancelled: 0 
                },
                SICK: { 
                    requests: 0, days: 0, approved: 0, pending: 0, rejected: 0, cancelled: 0 
                },
                OTHER: { 
                    requests: 0, days: 0, approved: 0, pending: 0, rejected: 0, cancelled: 0 
                }
            },
            byMonth: Array(12).fill(0).map(() => ({
                requests: 0,
                days: 0,
                approved: 0,
                pending: 0,
                rejected: 0,
                cancelled: 0
            }))
        };

        yearLeaves.forEach(leave => {
            const start = moment(leave.startDate);
            const end = moment(leave.endDate);
            const duration = end.diff(start, 'days') + 1;
            
            // Map status correctly (APPROVE -> approved, REJECT -> rejected, etc.)
            let status;
            switch (leave.status) {
                case 'APPROVE':
                    status = 'approved';
                    break;
                case 'REJECT':
                    status = 'rejected';
                    break;
                case 'PENDING':
                    status = 'pending';
                    break;
                default:
                    status = 'pending';
            }

            // Update total statistics (days)
            stats.totalDays += duration;
            stats[`${status}Days`] += duration;

            // Update type-wise statistics
            stats.byType[leave.leaveType].requests += 1;  // Count requests
            stats.byType[leave.leaveType].days += duration;  // Count days
            stats.byType[leave.leaveType][status] += duration;  // Count days by status

            // Update month-wise statistics
            const month = start.month();
            stats.byMonth[month].requests += 1;  // Count requests
            stats.byMonth[month].days += duration;  // Count days
            stats.byMonth[month][status] += duration;  // Count days by status
        });

        return stats;
    } catch (error) {
        empLeaveLogger.log('error', `Error calculating leave statistics: ${error.message}`);
        return {
            totalLeaves: 0,
            totalDays: 0,
            approvedDays: 0,
            pendingDays: 0,
            rejectedDays: 0,
            cancelledDays: 0,
            byType: {
                CASUAL: { 
                    requests: 0, days: 0, approved: 0, pending: 0, rejected: 0, cancelled: 0 
                },
                SICK: { 
                    requests: 0, days: 0, approved: 0, pending: 0, rejected: 0, cancelled: 0 
                },
                OTHER: { 
                    requests: 0, days: 0, approved: 0, pending: 0, rejected: 0, cancelled: 0 
                }
            },
            byMonth: Array(12).fill(0).map(() => ({
                requests: 0,
                total: 0,
                approved: 0,
                pending: 0,
                rejected: 0,
                cancelled: 0
            }))
        };
    }
}
