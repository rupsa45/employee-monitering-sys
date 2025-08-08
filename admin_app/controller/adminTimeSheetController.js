const moment = require('moment');
const { prisma } = require('../../config/prismaConfig');
const adminLogger = require('../../utils/adminLogger/adminLogger');

module.exports = {
    // Get all employee timesheets for admin view
    getAllEmployeeTimeSheets: async (req, res) => {
        try {
            const { startDate, endDate, empId } = req.query;
            let whereClause = { isActive: true };
            
            // Filter by date range if provided
            if (startDate && endDate) {
                whereClause.createdAt = {
                    gte: moment(startDate).startOf('day').toDate(),
                    lte: moment(endDate).endOf('day').toDate()
                };
            }
            
            // Filter by specific employee if provided
            if (empId) {
                whereClause.empId = empId;
            }
            
            const timeSheets = await prisma.timeSheet.findMany({
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
            
            adminLogger.log('info', 'All employee timesheets retrieved successfully');
            res.status(200).json({
                success: true,
                message: 'All employee timesheets retrieved successfully',
                data: timeSheets,
                total: timeSheets.length
            });
        } catch (error) {
            adminLogger.log('error', `Error: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Error retrieving timesheets',
                error: error.message
            });
        }
    },

    // Get today's attendance summary for admin dashboard
    getTodayAttendanceSummary: async (req, res) => {
        try {
            const today = moment().startOf('day');
            const tomorrow = moment().endOf('day');
            
            const todayTimeSheets = await prisma.timeSheet.findMany({
                where: {
                    createdAt: {
                        gte: today.toDate(),
                        lte: tomorrow.toDate()
                    },
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

            // Calculate summary statistics
            const totalEmployees = await prisma.employee.count({
                where: { 
                    empRole: 'employee', 
                    isActive: true 
                }
            });
            
            const clockedInToday = todayTimeSheets.filter(ts => ts.clockIn && !ts.clockOut).length;
            const completedToday = todayTimeSheets.filter(ts => ts.clockIn && ts.clockOut).length;
            const onBreak = todayTimeSheets.filter(ts => ts.breakStart && !ts.breakEnd).length;
            
            const summary = {
                totalEmployees,
                clockedInToday,
                completedToday,
                onBreak,
                present: todayTimeSheets.filter(ts => ts.status === 'PRESENT').length,
                absent: todayTimeSheets.filter(ts => ts.status === 'ABSENT').length,
                halfDay: todayTimeSheets.filter(ts => ts.status === 'HALFDAY').length,
                late: todayTimeSheets.filter(ts => ts.status === 'LATE').length
            };

            adminLogger.log('info', 'Today\'s attendance summary retrieved successfully');
            res.status(200).json({
                success: true,
                message: 'Today\'s attendance summary retrieved successfully',
                summary,
                timeSheets: todayTimeSheets
            });
        } catch (error) {
            adminLogger.log('error', `Error: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Error retrieving attendance summary',
                error: error.message
            });
        }
    },

    // Get employee activity snapshot for admin monitoring
    getEmployeeActivitySnapshot: async (req, res) => {
        try {
            const { empId, date } = req.query;
            let whereClause = { isActive: true };
            
            if (empId) {
                whereClause.empId = empId;
            }
            
            if (date) {
                const targetDate = moment(date).startOf('day');
                whereClause.date = {
                    gte: targetDate.toDate(),
                    lte: moment(targetDate).endOf('day').toDate()
                };
            } else {
                // Default to today
                const today = moment().startOf('day');
                whereClause.date = {
                    gte: today.toDate(),
                    lte: moment(today).endOf('day').toDate()
                };
            }
            
            const activitySnapshots = await prisma.activitySnapshot.findMany({
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
                    date: 'desc'
                }
            });
            
            adminLogger.log('info', 'Employee activity snapshots retrieved successfully');
            res.status(200).json({
                success: true,
                message: 'Employee activity snapshots retrieved successfully',
                data: activitySnapshots,
                total: activitySnapshots.length
            });
        } catch (error) {
            adminLogger.log('error', `Error: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Error retrieving activity snapshots',
                error: error.message
            });
        }
    },

    // Create or update activity snapshot (for admin monitoring)
    updateActivitySnapshot: async (req, res) => {
        try {
            const { empId, date } = req.body;
            
            if (!empId || !date) {
                return res.status(400).json({
                    success: false,
                    message: 'Employee ID and date are required'
                });
            }
            
            const targetDate = moment(date).startOf('day');
            
            // Find existing snapshot or create new one
            let snapshot = await prisma.activitySnapshot.findFirst({
                where: {
                    empId,
                    date: {
                        gte: targetDate.toDate(),
                        lte: moment(targetDate).endOf('day').toDate()
                    }
                }
            });
            
            if (snapshot) {
                // Update existing snapshot
                snapshot = await prisma.activitySnapshot.update({
                    where: { id: snapshot.id },
                    data: {
                        lastActivity: moment().format('YYYY-MM-DD HH:mm:ss')
                    }
                });
            } else {
                // Create new snapshot
                snapshot = await prisma.activitySnapshot.create({
                    data: {
                        empId,
                        date: targetDate.toDate(),
                        lastActivity: moment().format('YYYY-MM-DD HH:mm:ss')
                    }
                });
            }
            
            adminLogger.log('info', 'Activity snapshot updated successfully');
            res.status(200).json({
                success: true,
                message: 'Activity snapshot updated successfully',
                data: snapshot
            });
        } catch (error) {
            adminLogger.log('error', `Error: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Error updating activity snapshot',
                error: error.message
            });
        }
    },

    // Get detailed timesheet for specific employee
    getEmployeeDetailedTimeSheet: async (req, res) => {
        try {
            const { empId } = req.params;
            const { startDate, endDate } = req.query;
            
            let whereClause = { empId, isActive: true };
            
            if (startDate && endDate) {
                whereClause.createdAt = {
                    gte: moment(startDate).startOf('day').toDate(),
                    lte: moment(endDate).endOf('day').toDate()
                };
            }
            
            const timeSheets = await prisma.timeSheet.findMany({
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
            
            // Calculate totals
            const totals = timeSheets.reduce((acc, ts) => {
                acc.totalHours += ts.hoursLoggedIn || 0;
                acc.totalBreakTime += ts.totalBreakTime || 0;
                acc.totalDays += 1;
                acc.presentDays += ts.status === 'PRESENT' ? 1 : 0;
                acc.absentDays += ts.status === 'ABSENT' ? 1 : 0;
                acc.halfDays += ts.status === 'HALFDAY' ? 1 : 0;
                acc.lateDays += ts.status === 'LATE' ? 1 : 0;
                return acc;
            }, {
                totalHours: 0,
                totalBreakTime: 0,
                totalDays: 0,
                presentDays: 0,
                absentDays: 0,
                halfDays: 0,
                lateDays: 0
            });
            
            adminLogger.log('info', 'Employee detailed timesheet retrieved successfully');
            res.status(200).json({
                success: true,
                message: 'Employee detailed timesheet retrieved successfully',
                data: {
                    timeSheets,
                    totals,
                    employee: timeSheets[0]?.employee || null
                }
            });
        } catch (error) {
            adminLogger.log('error', `Error: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Error retrieving employee timesheet',
                error: error.message
            });
        }
    }
};
