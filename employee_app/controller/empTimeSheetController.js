const moment = require('moment');
const { prisma } = require('../../config/prismaConfig');
// Logger removed for cleaner output

module.exports = {
    // Clock in functionality
    clockIn: async (req, res) => {
        try {
            const empId = req.params.id;
            const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');
            const today = moment().startOf('day');

            // Check if already clocked in today
            const existingTimeSheet = await prisma.timeSheet.findFirst({
                where: {
                    empId: empId,
                    createdAt: {
                        gte: today.toDate(),
                        lt: moment(today).endOf('day').toDate()
                    },
                    isActive: true
                }
            });

            if (existingTimeSheet && existingTimeSheet.clockIn) {
                return res.status(400).json({
                    success: false,
                    message: "Already clocked in today"
                });
            }

            // Create new timesheet or update existing one
            let timeSheet;
            if (existingTimeSheet) {
                timeSheet = await prisma.timeSheet.update({
                    where: { id: existingTimeSheet.id },
                    data: {
                        clockIn: currentTime,
                        status: 'PRESENT'
                    }
                });
            } else {
                timeSheet = await prisma.timeSheet.create({
                    data: {
                        empId: empId,
                        clockIn: currentTime,
                        status: 'PRESENT',
                        isActive: true
                    }
                });
            }

            
            res.status(200).json({
                success: true,
                message: "Clock in successful!",
                clockInTime: currentTime
            });
        } catch (error) {
            
            res.status(500).json({
                success: false,
                message: "Error!",
                error: error.message
            });
        }
    },

    // Clock out functionality
    employeeAttendance: async (req, res) => {
        try {
            const empId = req.params.id;
            const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');
            const today = moment().startOf('day');

            // Find today's timesheet
            const timeSheet = await prisma.timeSheet.findFirst({
                where: {
                    empId: empId,
                    createdAt: {
                        gte: today.toDate(),
                        lt: moment(today).endOf('day').toDate()
                    },
                    isActive: true
                }
            });

            if (!timeSheet || !timeSheet.clockIn) {
                return res.status(400).json({
                    success: false,
                    message: "Please clock in first"
                });
            }

            if (timeSheet.clockOut) {
                return res.status(400).json({
                    success: false,
                    message: "Already clocked out today"
                });
            }

            // Calculate work hours
            const clockInTime = moment(timeSheet.clockIn, 'YYYY-MM-DD HH:mm:ss');
            const clockOutTime = moment(currentTime, 'YYYY-MM-DD HH:mm:ss');
            const workHours = clockOutTime.diff(clockInTime, 'hours', true);

            // Update timesheet
            const updatedTimeSheet = await prisma.timeSheet.update({
                where: { id: timeSheet.id },
                data: {
                    clockOut: currentTime,
                    hoursLoggedIn: Math.round(workHours * 100) / 100,
                    totalWorkingDays: 1
                }
            });

            
            res.status(200).json({
                success: true,
                message: "Clock out successful!",
                clockOutTime: currentTime,
                workHours: Math.round(workHours * 100) / 100
            });
        } catch (error) {
            
            res.status(500).json({
                success: false,
                message: "Error!",
                error: error.message
            });
        }
    },

    // Break functionality
    breakStart: async (req, res) => {
        try {
            const empId = req.params.id;
            const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');
            const today = moment().startOf('day');

            // Find today's timesheet
            const timeSheet = await prisma.timeSheet.findFirst({
                where: {
                    empId: empId,
                    createdAt: {
                        gte: today.toDate(),
                        lt: moment(today).endOf('day').toDate()
                    },
                    isActive: true
                }
            });

            if (!timeSheet) {
                return res.status(404).json({
                    success: false,
                    message: "Timesheet not found. Please clock in first."
                });
            }

            if (timeSheet.breakStart && !timeSheet.breakEnd) {
                return res.status(400).json({
                    success: false,
                    message: "Break already started. Please end current break first."
                });
            }

            await prisma.timeSheet.update({
                where: { id: timeSheet.id },
                data: { breakStart: currentTime }
            });

            
            res.status(200).json({
                success: true,
                message: "Break started successfully!",
                breakStartTime: currentTime
            });
        } catch (error) {
            
            res.status(500).json({
                success: false,
                message: "Error!",
                error: error.message
            });
        }
    },

    breakEnd: async (req, res) => {
        try {
            const empId = req.params.id;
            const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');
            const today = moment().startOf('day');

            // Find today's timesheet
            const timeSheet = await prisma.timeSheet.findFirst({
                where: {
                    empId: empId,
                    createdAt: {
                        gte: today.toDate(),
                        lt: moment(today).endOf('day').toDate()
                    },
                    isActive: true
                }
            });

            if (!timeSheet) {
                return res.status(404).json({
                    success: false,
                    message: "Timesheet not found. Please clock in first."
                });
            }

            if (!timeSheet.breakStart) {
                return res.status(400).json({
                    success: false,
                    message: "No break started. Please start a break first."
                });
            }

            if (timeSheet.breakEnd) {
                return res.status(400).json({
                    success: false,
                    message: "Break already ended."
                });
            }

            // Calculate break duration
            const breakStart = moment(timeSheet.breakStart, 'YYYY-MM-DD HH:mm:ss');
            const breakEnd = moment(currentTime, 'YYYY-MM-DD HH:mm:ss');
            const breakDuration = breakEnd.diff(breakStart, 'minutes');

            await prisma.timeSheet.update({
                where: { id: timeSheet.id },
                data: {
                    breakEnd: currentTime,
                    totalBreakTime: breakDuration
                }
            });

            
            res.status(200).json({
                success: true,
                message: "Break ended successfully!",
                breakEndTime: currentTime,
                breakDuration: breakDuration
            });
        } catch (error) {
            
            res.status(500).json({
                success: false,
                message: "Error!",
                error: error.message
            });
        }
    },

    // Get current timesheet status
    getCurrentStatus: async (req, res) => {
        try {
            const empId = req.params.id;
            const today = moment().startOf('day');

            const timeSheet = await prisma.timeSheet.findFirst({
                where: {
                    empId: empId,
                    createdAt: {
                        gte: today.toDate(),
                        lt: moment(today).endOf('day').toDate()
                    },
                    isActive: true
                }
            });

            if (!timeSheet) {
                return res.status(200).json({
                    success: true,
                    message: "No timesheet found for today",
                    data: {
                        isClockedIn: false,
                        isClockedOut: false,
                        isOnBreak: false,
                        clockInTime: null,
                        clockOutTime: null,
                        breakStartTime: null,
                        totalBreakTime: 0,
                        status: 'ABSENT'
                    }
                });
            }

            const isOnBreak = timeSheet.breakStart && !timeSheet.breakEnd;

            res.status(200).json({
                success: true,
                message: "Current status retrieved successfully",
                data: {
                    isClockedIn: !!timeSheet.clockIn,
                    isClockedOut: !!timeSheet.clockOut,
                    isOnBreak: isOnBreak,
                    clockInTime: timeSheet.clockIn,
                    clockOutTime: timeSheet.clockOut,
                    breakStartTime: timeSheet.breakStart,
                    totalBreakTime: timeSheet.totalBreakTime || 0,
                    status: timeSheet.status || 'ABSENT'
                }
            });
        } catch (error) {
            
            res.status(500).json({
                success: false,
                message: "Error!",
                error: error.message
            });
        }
    }
};
