const { prisma } = require("../../config/prismaConfig");
const moment = require("moment");
const adminLogger = require("../../utils/adminLogger/adminLogger");

module.exports = {
  // Main dashboard overview
  getDashboardOverview: async (req, res) => {
    try {
      const today = moment().startOf("day");
      const thisWeek = moment().startOf("week");
      const thisMonth = moment().startOf("month");

      // Get total employees
      const totalEmployees = await prisma.employee.count({
        where: {
          empRole: "employee",
          isActive: true,
        },
      });

      // Get today's attendance
      const todayAttendance = await prisma.timeSheet.count({
        where: {
          createdAt: {
            gte: today.toDate(),
            lt: moment(today).endOf("day").toDate(),
          },
          isActive: true,
        },
      });

      // Get this week's attendance
      const weekAttendance = await prisma.timeSheet.count({
        where: {
          createdAt: {
            gte: thisWeek.toDate(),
            lt: moment(thisWeek).endOf("week").toDate(),
          },
          isActive: true,
        },
      });

      // Get pending leave requests
      const pendingLeaves = await prisma.empLeave.count({
        where: {
          status: "PENDING",
          isActive: true,
        },
      });

      // Get active tasks
      const activeTasks = await prisma.task.count({
        where: {
          status: {
            in: ["PENDING", "IN_PROGRESS"],
          },
          isActive: true,
        },
      });

      // Get recent activities (last 7 days)
      const recentActivities = await prisma.timeSheet.findMany({
        where: {
          createdAt: {
            gte: moment().subtract(7, "days").toDate(),
          },
          isActive: true,
        },
        include: {
          employee: {
            select: {
              empName: true,
              empEmail: true,
              empTechnology: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      });

      adminLogger.log("info", "Dashboard overview retrieved successfully");
      res.status(200).json({
        success: true,
        message: "Dashboard overview retrieved successfully",
        data: {
          summary: {
            totalEmployees,
            todayAttendance,
            weekAttendance,
            pendingLeaves,
            activeTasks,
          },
          recentActivities,
        },
      });
    } catch (error) {
      adminLogger.log("error", `Error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: "Error retrieving dashboard overview",
        error: error.message,
      });
    }
  },

  // Employee management dashboard
  getEmployeeManagement: async (req, res) => {
    try {
      const { page = 1, limit = 10, search, technology, status } = req.query;
      const skip = (page - 1) * limit;

      let whereClause = {
        empRole: "employee",
        isActive: true,
      };

      // Add search filter
      if (search) {
        whereClause.OR = [
          { empName: { contains: search, mode: "insensitive" } },
          { empEmail: { contains: search, mode: "insensitive" } },
        ];
      }

      // Add technology filter
      if (technology) {
        whereClause.empTechnology = technology;
      }

      // Get employees with pagination
      const employees = await prisma.employee.findMany({
        where: whereClause,
        select: {
          id: true,
          empName: true,
          empEmail: true,
          empPhone: true,
          empTechnology: true,
          empGender: true,
          empProfile: true,
          createdAt: true,
          updatedAt: true,
          timeSheets: {
            where: {
              createdAt: {
                gte: moment().startOf("day").toDate(),
              },
              isActive: true,
            },
            take: 1,
          },
          leaves: {
            where: {
              status: "PENDING",
              isActive: true,
            },
            take: 1,
          },
          assignedTasks: {
            where: {
              status: {
                in: ["PENDING", "IN_PROGRESS"],
              },
              isActive: true,
            },
            take: 1,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: parseInt(skip),
        take: parseInt(limit),
      });

      // Get total count for pagination
      const totalEmployees = await prisma.employee.count({
        where: whereClause,
      });

      // Get technology distribution
      const technologyStats = await prisma.employee.groupBy({
        by: ["empTechnology"],
        where: {
          empRole: "employee",
          isActive: true,
        },
        _count: {
          empTechnology: true,
        },
      });

      // Process employee data
      const processedEmployees = employees.map((emp) => {
        const todayTimeSheet = emp.timeSheets[0] || null;
        const pendingLeave = emp.leaves[0] || null;
        const activeTask = emp.assignedTasks[0] || null;

        return {
          id: emp.id,
          empName: emp.empName,
          empEmail: emp.empEmail,
          empPhone: emp.empPhone,
          empTechnology: emp.empTechnology,
          empGender: emp.empGender,
          empProfile: emp.empProfile,
          createdAt: emp.createdAt,
          updatedAt: emp.updatedAt,
          status: {
            isClockedIn: todayTimeSheet && todayTimeSheet.clockIn && !todayTimeSheet.clockOut,
            hasPendingLeave: !!pendingLeave,
            hasActiveTask: !!activeTask,
            attendanceStatus: todayTimeSheet?.status || "ABSENT",
          },
        };
      });

      adminLogger.log("info", "Employee management data retrieved successfully");
      res.status(200).json({
        success: true,
        message: "Employee management data retrieved successfully",
        data: {
          employees: processedEmployees,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalEmployees / limit),
            totalEmployees,
            limit: parseInt(limit),
          },
          technologyStats,
        },
      });
    } catch (error) {
      adminLogger.log("error", `Error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: "Error retrieving employee management data",
        error: error.message,
      });
    }
  },

  // Attendance analytics
  getAttendanceAnalytics: async (req, res) => {
    try {
      const { startDate, endDate, employeeId } = req.query;
      
      let dateFilter = {};
      if (startDate && endDate) {
        dateFilter = {
          gte: new Date(startDate),
          lte: new Date(endDate),
        };
      } else {
        // Default to current month
        const startOfMonth = moment().startOf("month");
        const endOfMonth = moment().endOf("month");
        dateFilter = {
          gte: startOfMonth.toDate(),
          lte: endOfMonth.toDate(),
        };
      }

      let whereClause = {
        createdAt: dateFilter,
        isActive: true,
      };

      if (employeeId) {
        whereClause.empId = employeeId;
      }

      // Get attendance data
      const attendanceData = await prisma.timeSheet.findMany({
        where: whereClause,
        include: {
          employee: {
            select: {
              empName: true,
              empEmail: true,
              empTechnology: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      // Calculate analytics
      const totalDays = attendanceData.length;
      const presentDays = attendanceData.filter(record => record.status === "PRESENT").length;
      const absentDays = attendanceData.filter(record => record.status === "ABSENT").length;
      const lateDays = attendanceData.filter(record => record.status === "LATE").length;
      const halfDays = attendanceData.filter(record => record.status === "HALFDAY").length;

      // Daily attendance breakdown
      const dailyBreakdown = {};
      attendanceData.forEach(record => {
        const date = moment(record.createdAt).format("YYYY-MM-DD");
        if (!dailyBreakdown[date]) {
          dailyBreakdown[date] = {
            present: 0,
            absent: 0,
            late: 0,
            halfDay: 0,
            total: 0,
          };
        }
        dailyBreakdown[date][record.status.toLowerCase()]++;
        dailyBreakdown[date].total++;
      });

      // Employee-wise attendance
      const employeeAttendance = {};
      attendanceData.forEach(record => {
        const empId = record.empId;
        if (!employeeAttendance[empId]) {
          employeeAttendance[empId] = {
            empName: record.employee.empName,
            empEmail: record.employee.empEmail,
            empTechnology: record.employee.empTechnology,
            present: 0,
            absent: 0,
            late: 0,
            halfDay: 0,
            total: 0,
          };
        }
        employeeAttendance[empId][record.status.toLowerCase()]++;
        employeeAttendance[empId].total++;
      });

      adminLogger.log("info", "Attendance analytics retrieved successfully");
      res.status(200).json({
        success: true,
        message: "Attendance analytics retrieved successfully",
        data: {
          summary: {
            totalDays,
            presentDays,
            absentDays,
            lateDays,
            halfDays,
            attendanceRate: totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(2) : 0,
          },
          dailyBreakdown,
          employeeAttendance: Object.values(employeeAttendance),
        },
      });
    } catch (error) {
      adminLogger.log("error", `Error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: "Error retrieving attendance analytics",
        error: error.message,
      });
    }
  },

  // Task management dashboard
  getTaskManagement: async (req, res) => {
    try {
      const { page = 1, limit = 10, status, priority, assignedTo } = req.query;
      const skip = (page - 1) * limit;

      let whereClause = {
        isActive: true,
      };

      if (status) {
        whereClause.status = status.toUpperCase();
      }

      if (priority) {
        whereClause.priority = priority.toUpperCase();
      }

      // Get tasks with pagination
      const tasks = await prisma.task.findMany({
        where: whereClause,
        include: {
          assignedEmployees: {
            select: {
              id: true,
              empName: true,
              empEmail: true,
              empTechnology: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: parseInt(skip),
        take: parseInt(limit),
      });

      // Get total count
      const totalTasks = await prisma.task.count({
        where: whereClause,
      });

      // Get task statistics
      const taskStats = await prisma.task.groupBy({
        by: ["status"],
        where: {
          isActive: true,
        },
        _count: {
          status: true,
        },
      });

      // Get priority distribution
      const priorityStats = await prisma.task.groupBy({
        by: ["priority"],
        where: {
          isActive: true,
        },
        _count: {
          priority: true,
        },
      });

      // Filter by assigned employee if specified
      let filteredTasks = tasks;
      if (assignedTo) {
        filteredTasks = tasks.filter(task =>
          task.assignedEmployees.some(emp => emp.id === assignedTo)
        );
      }

      adminLogger.log("info", "Task management data retrieved successfully");
      res.status(200).json({
        success: true,
        message: "Task management data retrieved successfully",
        data: {
          tasks: filteredTasks,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalTasks / limit),
            totalTasks,
            limit: parseInt(limit),
          },
          statistics: {
            statusDistribution: taskStats,
            priorityDistribution: priorityStats,
          },
        },
      });
    } catch (error) {
      adminLogger.log("error", `Error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: "Error retrieving task management data",
        error: error.message,
      });
    }
  },

  // Leave management dashboard
  getLeaveManagement: async (req, res) => {
    try {
      const { page = 1, limit = 10, status, leaveType, startDate, endDate } = req.query;
      const skip = (page - 1) * limit;

      let whereClause = {
        isActive: true,
      };

      if (status) {
        whereClause.status = status.toUpperCase();
      }

      if (leaveType) {
        whereClause.leaveType = leaveType.toUpperCase();
      }

      if (startDate && endDate) {
        whereClause.startDate = {
          gte: new Date(startDate),
          lte: new Date(endDate),
        };
      }

      // Get leave requests
      const leaves = await prisma.empLeave.findMany({
        where: whereClause,
        include: {
          employee: {
            select: {
              empName: true,
              empEmail: true,
              empTechnology: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: parseInt(skip),
        take: parseInt(limit),
      });

      // Get total count
      const totalLeaves = await prisma.empLeave.count({
        where: whereClause,
      });

      // Calculate duration for each leave
      const leavesWithDuration = leaves.map((leave) => {
        const start = moment(leave.startDate);
        const end = moment(leave.endDate);
        const duration = end.diff(start, "days") + 1;

        return {
          ...leave,
          duration,
        };
      });

      // Get leave statistics
      const leaveStats = await prisma.empLeave.groupBy({
        by: ["status"],
        where: {
          isActive: true,
        },
        _count: {
          status: true,
        },
      });

      // Get leave type distribution
      const leaveTypeStats = await prisma.empLeave.groupBy({
        by: ["leaveType"],
        where: {
          isActive: true,
        },
        _count: {
          leaveType: true,
        },
      });

      adminLogger.log("info", "Leave management data retrieved successfully");
      res.status(200).json({
        success: true,
        message: "Leave management data retrieved successfully",
        data: {
          leaves: leavesWithDuration,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalLeaves / limit),
            totalLeaves,
            limit: parseInt(limit),
          },
          statistics: {
            statusDistribution: leaveStats,
            leaveTypeDistribution: leaveTypeStats,
          },
        },
      });
    } catch (error) {
      adminLogger.log("error", `Error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: "Error retrieving leave management data",
        error: error.message,
      });
    }
  },

  // Performance analytics
  getPerformanceAnalytics: async (req, res) => {
    try {
      const { startDate, endDate, employeeId } = req.query;

      let dateFilter = {};
      if (startDate && endDate) {
        dateFilter = {
          gte: new Date(startDate),
          lte: new Date(endDate),
        };
      } else {
        // Default to current month
        const startOfMonth = moment().startOf("month");
        const endOfMonth = moment().endOf("month");
        dateFilter = {
          gte: startOfMonth.toDate(),
          lte: endOfMonth.toDate(),
        };
      }

      // Get timesheet data for performance analysis
      const timesheets = await prisma.timeSheet.findMany({
        where: {
          createdAt: dateFilter,
          isActive: true,
          ...(employeeId && { empId: employeeId }),
        },
        include: {
          employee: {
            select: {
              empName: true,
              empEmail: true,
              empTechnology: true,
            },
          },
        },
      });

      // Get task completion data
      const tasks = await prisma.task.findMany({
        where: {
          createdAt: dateFilter,
          isActive: true,
          ...(employeeId && {
            assignedEmployees: {
              some: {
                id: employeeId,
              },
            },
          }),
        },
        include: {
          assignedEmployees: {
            select: {
              id: true,
              empName: true,
              empEmail: true,
            },
          },
        },
      });

      // Calculate performance metrics
      const performanceMetrics = {
        attendance: {
          totalDays: timesheets.length,
          presentDays: timesheets.filter(t => t.status === "PRESENT").length,
          absentDays: timesheets.filter(t => t.status === "ABSENT").length,
          lateDays: timesheets.filter(t => t.status === "LATE").length,
          attendanceRate: timesheets.length > 0 
            ? ((timesheets.filter(t => t.status === "PRESENT").length / timesheets.length) * 100).toFixed(2)
            : 0,
        },
        tasks: {
          totalAssigned: tasks.length,
          completed: tasks.filter(t => t.status === "COMPLETED").length,
          inProgress: tasks.filter(t => t.status === "IN_PROGRESS").length,
          pending: tasks.filter(t => t.status === "PENDING").length,
          completionRate: tasks.length > 0
            ? ((tasks.filter(t => t.status === "COMPLETED").length / tasks.length) * 100).toFixed(2)
            : 0,
        },
        productivity: {
          averageWorkHours: timesheets.length > 0
            ? (timesheets.reduce((sum, t) => sum + (t.hoursLoggedIn || 0), 0) / timesheets.length).toFixed(2)
            : 0,
          totalWorkHours: timesheets.reduce((sum, t) => sum + (t.hoursLoggedIn || 0), 0),
        },
      };

      // Employee-wise performance (if no specific employee)
      if (!employeeId) {
        const employeePerformance = {};
        
        timesheets.forEach(timesheet => {
          const empId = timesheet.empId;
          if (!employeePerformance[empId]) {
            employeePerformance[empId] = {
              empName: timesheet.employee.empName,
              empEmail: timesheet.employee.empEmail,
              empTechnology: timesheet.employee.empTechnology,
              attendance: { present: 0, absent: 0, late: 0, total: 0 },
              tasks: { completed: 0, inProgress: 0, pending: 0, total: 0 },
              workHours: 0,
            };
          }
          
          employeePerformance[empId].attendance[timesheet.status.toLowerCase()]++;
          employeePerformance[empId].attendance.total++;
          employeePerformance[empId].workHours += timesheet.hoursLoggedIn || 0;
        });

        tasks.forEach(task => {
          task.assignedEmployees.forEach(emp => {
            if (employeePerformance[emp.id]) {
              employeePerformance[emp.id].tasks[task.status.toLowerCase()]++;
              employeePerformance[emp.id].tasks.total++;
            }
          });
        });

        performanceMetrics.employeePerformance = Object.values(employeePerformance);
      }

      adminLogger.log("info", "Performance analytics retrieved successfully");
      res.status(200).json({
        success: true,
        message: "Performance analytics retrieved successfully",
        data: performanceMetrics,
      });
    } catch (error) {
      adminLogger.log("error", `Error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: "Error retrieving performance analytics",
        error: error.message,
      });
    }
  },

  // Real-time monitoring
  getRealTimeMonitoring: async (req, res) => {
    try {
      const today = moment().startOf("day");
      const now = moment();

      // Get current online employees
      const onlineEmployees = await prisma.timeSheet.findMany({
        where: {
          createdAt: {
            gte: today.toDate(),
            lt: moment(today).endOf("day").toDate(),
          },
          clockIn: { not: "" },
          clockOut: "",
          isActive: true,
        },
        include: {
          employee: {
            select: {
              empName: true,
              empEmail: true,
              empTechnology: true,
            },
          },
        },
      });

      // Get employees on break
      const onBreakEmployees = await prisma.timeSheet.findMany({
        where: {
          createdAt: {
            gte: today.toDate(),
            lt: moment(today).endOf("day").toDate(),
          },
          breakStart: { not: "" },
          breakEnd: "",
          isActive: true,
        },
        include: {
          employee: {
            select: {
              empName: true,
              empEmail: true,
              empTechnology: true,
            },
          },
        },
      });

      // Get recent activities (last 30 minutes)
      const recentActivities = await prisma.timeSheet.findMany({
        where: {
          updatedAt: {
            gte: moment().subtract(30, "minutes").toDate(),
          },
          isActive: true,
        },
        include: {
          employee: {
            select: {
              empName: true,
              empEmail: true,
              empTechnology: true,
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
        take: 20,
      });

      // Get system statistics
      const totalEmployees = await prisma.employee.count({
        where: {
          empRole: "employee",
          isActive: true,
        },
      });

      const todayAttendance = await prisma.timeSheet.count({
        where: {
          createdAt: {
            gte: today.toDate(),
            lt: moment(today).endOf("day").toDate(),
          },
          isActive: true,
        },
      });

      const pendingTasks = await prisma.task.count({
        where: {
          status: "PENDING",
          isActive: true,
        },
      });

      const pendingLeaves = await prisma.empLeave.count({
        where: {
          status: "PENDING",
          isActive: true,
        },
      });

      adminLogger.log("info", "Real-time monitoring data retrieved successfully");
      res.status(200).json({
        success: true,
        message: "Real-time monitoring data retrieved successfully",
        data: {
          currentTime: now.toISOString(),
          onlineEmployees: onlineEmployees.map(emp => ({
            empName: emp.employee.empName,
            empEmail: emp.employee.empEmail,
            empTechnology: emp.employee.empTechnology,
            clockInTime: emp.clockIn,
            workHours: emp.hoursLoggedIn || 0,
          })),
          onBreakEmployees: onBreakEmployees.map(emp => ({
            empName: emp.employee.empName,
            empEmail: emp.employee.empEmail,
            empTechnology: emp.employee.empTechnology,
            breakStartTime: emp.breakStart,
            breakDuration: emp.totalBreakTime || 0,
          })),
          recentActivities: recentActivities.map(activity => ({
            empName: activity.employee.empName,
            empEmail: activity.employee.empEmail,
            action: activity.clockOut ? "Clock Out" : 
                   activity.clockIn ? "Clock In" :
                   activity.breakEnd ? "Break End" :
                   activity.breakStart ? "Break Start" : "Activity",
            timestamp: activity.updatedAt,
          })),
          systemStats: {
            totalEmployees,
            todayAttendance,
            onlineCount: onlineEmployees.length,
            onBreakCount: onBreakEmployees.length,
            pendingTasks,
            pendingLeaves,
          },
        },
      });
    } catch (error) {
      adminLogger.log("error", `Error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: "Error retrieving real-time monitoring data",
        error: error.message,
      });
    }
  },
};

