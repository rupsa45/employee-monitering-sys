const moment = require('moment');
const { prisma } = require('../../config/prismaConfig');
// Logger removed for cleaner output

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
            
            
            res.status(200).json({
                success: true,
                message: 'All employee timesheets retrieved successfully',
                data: timeSheets,
                total: timeSheets.length
            });
        } catch (error) {
            
            res.status(500).json({
                success: false,
                message: 'Error retrieving timesheets',
                error: error.message
            });
        }
    },

    // Get comprehensive date-wise attendance history for all employees
    getDateWiseAttendanceHistory: async (req, res) => {
        try {
            const { startDate, endDate, empId } = req.query;
            
            // Get all active employees
            const allEmployees = await prisma.employee.findMany({
                where: { 
                    empRole: 'employee', 
                    isActive: true 
                },
                select: {
                    id: true,
                    empName: true,
                    empEmail: true,
                    empTechnology: true
                }
            });

            // Determine date range
            const start = startDate ? moment(startDate).startOf('day') : moment().subtract(30, 'days').startOf('day');
            const end = endDate ? moment(endDate).endOf('day') : moment().endOf('day');
            
            // Get all timesheets in the date range
            const timeSheets = await prisma.timeSheet.findMany({
                where: {
                    createdAt: {
                        gte: start.toDate(),
                        lte: end.toDate()
                    },
                    isActive: true,
                    ...(empId && { empId })
                },
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

            // Create a map of employee attendance by date
            const attendanceMap = new Map();
            
            // Initialize all employees for all dates in range
            const currentDate = start.clone();
            while (currentDate.isSameOrBefore(end, 'day')) {
                const dateKey = currentDate.format('YYYY-MM-DD');
                attendanceMap.set(dateKey, []);
                
                // Add all employees for this date
                allEmployees.forEach(emp => {
                    attendanceMap.get(dateKey).push({
                        empId: emp.id,
                        empName: emp.empName,
                        empEmail: emp.empEmail,
                        empTechnology: emp.empTechnology,
                        date: dateKey,
                        clockIn: null,
                        clockOut: null,
                        hoursLoggedIn: 0,
                        totalBreakTime: 0,
                        status: 'ABSENT',
                        hasTimesheet: false
                    });
                });
                
                currentDate.add(1, 'day');
            }

            // Fill in actual attendance data
            timeSheets.forEach(timesheet => {
                const dateKey = moment(timesheet.createdAt).format('YYYY-MM-DD');
                const employeeAttendance = attendanceMap.get(dateKey)?.find(
                    att => att.empId === timesheet.empId
                );
                
                if (employeeAttendance) {
                    employeeAttendance.clockIn = timesheet.clockIn || null;
                    employeeAttendance.clockOut = timesheet.clockOut || null;
                    employeeAttendance.hoursLoggedIn = timesheet.hoursLoggedIn || 0;
                    employeeAttendance.totalBreakTime = timesheet.totalBreakTime || 0;
                    employeeAttendance.status = timesheet.status || 'ABSENT';
                    employeeAttendance.hasTimesheet = true;
                    employeeAttendance.timesheetId = timesheet.id;
                    employeeAttendance.createdAt = timesheet.createdAt;
                    employeeAttendance.updatedAt = timesheet.updatedAt;
                }
            });

            // Convert map to array and sort by date
            const attendanceHistory = Array.from(attendanceMap.entries())
                .map(([date, employees]) => ({
                    date,
                    employees: employees.sort((a, b) => a.empName.localeCompare(b.empName))
                }))
                .sort((a, b) => moment(b.date).diff(moment(a.date))); // Most recent first

            res.status(200).json({
                success: true,
                message: 'Date-wise attendance history retrieved successfully',
                data: attendanceHistory,
                total: attendanceHistory.length,
                dateRange: {
                    start: start.format('YYYY-MM-DD'),
                    end: end.format('YYYY-MM-DD')
                },
                totalEmployees: allEmployees.length
            });
        } catch (error) {
            console.error('Error in getDateWiseAttendanceHistory:', error);
            res.status(500).json({
                success: false,
                message: 'Error retrieving date-wise attendance history',
                error: error.message
            });
        }
    },

    // Get today's attendance summary for admin dashboard
    getTodayAttendanceSummary: async (req, res) => {
        try {
            const today = moment().startOf('day');
            const tomorrow = moment().endOf('day');
            
            // Get all active employees
            const allEmployees = await prisma.employee.findMany({
                where: { 
                    empRole: 'employee', 
                    isActive: true 
                },
                select: {
                    id: true,
                    empName: true,
                    empEmail: true,
                    empTechnology: true
                }
            });
            
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

            // Create a map of employees who have timesheets today
            const employeesWithTimesheets = new Set(todayTimeSheets.map(ts => ts.empId));
            
            // Calculate summary statistics
            const totalEmployees = allEmployees.length;
            const clockedInToday = todayTimeSheets.filter(ts => ts.clockIn && !ts.clockOut).length;
            const completedToday = todayTimeSheets.filter(ts => ts.clockIn && ts.clockOut).length;
            const onBreak = todayTimeSheets.filter(ts => ts.breakStart && !ts.breakEnd).length;
            const present = employeesWithTimesheets.size; // Employees who have clocked in
            const absent = totalEmployees - present; // Employees who haven't clocked in
            
            // Calculate average working hours
            let totalWorkHours = 0;
            let employeesWithWorkHours = 0;
            
            todayTimeSheets.forEach(timesheet => {
                if (timesheet.clockIn) {
                    let workHours = 0;
                    if (timesheet.clockOut) {
                        // If clocked out, calculate the difference
                        const clockInTime = new Date(timesheet.clockIn);
                        const clockOutTime = new Date(timesheet.clockOut);
                        const diffMs = clockOutTime.getTime() - clockInTime.getTime();
                        workHours = diffMs / (1000 * 60 * 60); // Convert to hours
                        
                        // Subtract break time if any
                        const breakTimeHours = (timesheet.totalBreakTime || 0) / 60;
                        workHours = Math.max(0, workHours - breakTimeHours);
                    } else {
                        // If not clocked out, calculate from clock in to now
                        const clockInTime = new Date(timesheet.clockIn);
                        const now = new Date();
                        const diffMs = now.getTime() - clockInTime.getTime();
                        workHours = diffMs / (1000 * 60 * 60); // Convert to hours
                        
                        // Subtract break time if any
                        const breakTimeHours = (timesheet.totalBreakTime || 0) / 60;
                        workHours = Math.max(0, workHours - breakTimeHours);
                    }
                    
                    // Round to 2 decimal places
                    workHours = Math.round(workHours * 100) / 100;
                    totalWorkHours += workHours;
                    employeesWithWorkHours++;
                }
            });
            
            const averageWorkHours = employeesWithWorkHours > 0 ? (totalWorkHours / employeesWithWorkHours).toFixed(2) : "0.00";
            
            const summary = {
                totalEmployees,
                clockedInToday,
                completedToday,
                onBreak,
                presentToday: present,
                absentToday: absent,
                halfDay: todayTimeSheets.filter(ts => ts.status === 'HALFDAY').length,
                late: todayTimeSheets.filter(ts => ts.status === 'LATE').length,
                totalWorkHours: Math.round(totalWorkHours * 100) / 100,
                averageWorkHours: parseFloat(averageWorkHours)
            };

            
            res.status(200).json({
                success: true,
                message: 'Today\'s attendance summary retrieved successfully',
                summary,
                timeSheets: todayTimeSheets
            });
        } catch (error) {
            
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
            
            
            res.status(200).json({
                success: true,
                message: 'Employee activity snapshots retrieved successfully',
                data: activitySnapshots,
                total: activitySnapshots.length
            });
        } catch (error) {
            
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
            
            
            res.status(200).json({
                success: true,
                message: 'Activity snapshot updated successfully',
                data: snapshot
            });
        } catch (error) {
            
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
            
            res.status(500).json({
                success: false,
                message: 'Error retrieving employee timesheet',
                error: error.message
            });
        }
    }
};
