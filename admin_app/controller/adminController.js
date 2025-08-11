const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const moment = require("moment");
const { prisma } = require("../../config/prismaConfig");
const adminLogger = require("../../utils/adminLogger/adminLogger");

module.exports = {
  // Admin registration (public endpoint)
  adminRegister: async (req, res) => {
    try {
      const {
        empName,
        empEmail,
        empPhone,
        empPassword,
        confirmPassword,
        empTechnology,
        empGender,
      } = req.body;

      // Check if admin already exists
      const existingAdmin = await prisma.employee.findUnique({
        where: { empEmail },
      });

      if (existingAdmin) {
        adminLogger.log("error", "Admin Already Exists With This Email");
        return res.status(409).json({
          success: false,
          message: "Admin Already Exists With This Email",
        });
      }

      // Validate password confirmation
      if (empPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: "Password and confirm password do not match",
        });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(empPassword, salt);

      // Set default profile picture based on gender
      let empProfile = "../upload/maleAvatar.png"; // Default
      if (empGender === "FEMALE") {
        empProfile = "../upload/femaleAvatar.png";
      }

      // Create admin using Prisma
      const admin = await prisma.employee.create({
        data: {
          empName,
          empEmail,
          empPhone: String(empPhone),
          empPassword: hashedPassword,
          confirmPassword: hashedPassword,
          empTechnology,
          empGender,
          empProfile,
          empRole: "admin", // Set role as admin
        },
      });
      if (empPassword !== confirmPassword) {
        return res.status(400).json({ message: "Passwords do not match" });
      }

      adminLogger.log("info", "Admin Registered Successfully");
      res.status(201).json({
        success: true,
        message: "Admin Registered Successfully",
        admin: {
          id: admin.id,
          empName: admin.empName,
          empEmail: admin.empEmail,
          empTechnology: admin.empTechnology,
          empGender: admin.empGender,
          empRole: admin.empRole,
        },
      });
    } catch (error) {
      adminLogger.log("error", `Error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // Admin login
  adminLogin: async (req, res) => {
    try {
      const { empEmail, empPassword } = req.body;

      // Find admin by email
      const admin = await prisma.employee.findUnique({
        where: { empEmail },
      });

      if (!admin || admin.empRole !== "admin") {
        adminLogger.log("error", "Admin not found");
        return res.status(404).json({
          success: false,
          message: "Admin not found",
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(
        empPassword,
        admin.empPassword
      );
      if (!isValidPassword) {
        adminLogger.log("error", "Invalid password");
        return res.status(401).json({
          success: false,
          message: "Invalid password",
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          userData: {
            empId: admin.id,
            empEmail: admin.empEmail,
            empRole: admin.empRole,
          },
        },
        process.env.SECRET_KEY,
        { expiresIn: "1h" }
      );

      adminLogger.log("info", "Admin logged in successfully");
      res.status(200).json({
        success: true,
        message: "Admin logged in successfully",
        accessToken: token,
      });
    } catch (error) {
      adminLogger.log("error", `Error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // Create employee (Admin only)
  createEmployee: async (req, res) => {
    try {
      const {
        empName,
        empEmail,
        empPhone,
        empPassword,
        confirmPassword,
        empTechnology,
        empGender,
      } = req.body;

      // Check if employee already exists
      const existingEmployee = await prisma.employee.findUnique({
        where: { empEmail },
      });

      if (existingEmployee) {
        adminLogger.log("error", "Employee Already Exists With This Email");
        return res.status(409).json({
          success: false,
          message: "Employee Already Exists With This Email",
        });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(empPassword, salt);

      // Set default profile picture based on gender
      let empProfile = "../upload/maleAvatar.png"; // Default
      if (empGender === "FEMALE") {
        empProfile = "../upload/femaleAvatar.png";
      }

      // Create employee using Prisma
      const employee = await prisma.employee.create({
        data: {
          empName,
          empEmail,
          empPhone: String(empPhone),
          empPassword: hashedPassword,
          confirmPassword: hashedPassword,
          empTechnology,
          empGender,
          empProfile,
          empRole: "employee",
        },
      });

      adminLogger.log("info", "Employee Created Successfully");
      res.status(201).json({
        success: true,
        message: "Employee Created Successfully",
        employee: {
          id: employee.id,
          empName: employee.empName,
          empEmail: employee.empEmail,
          empTechnology: employee.empTechnology,
          empGender: employee.empGender,
          empRole: employee.empRole,
        },
      });
    } catch (error) {
      adminLogger.log("error", `Error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // Employee dashboard for admin
  empDashBoard: async (req, res) => {
    try {
      const today = moment().startOf("day");

      // Get all employees with their timesheets for today
      const employees = await prisma.employee.findMany({
        where: {
          empRole: "employee",
          isActive: true,
        },
        include: {
          timeSheets: {
            where: {
              createdAt: {
                gte: today.toDate(),
                lt: moment(today).endOf("day").toDate(),
              },
              isActive: true,
            },
          },
        },
      });

      // Process employee data
      const employeeData = employees.map((emp) => {
        const todayTimeSheet = emp.timeSheets[0] || null;
        const isClockedIn =
          todayTimeSheet && todayTimeSheet.clockIn && !todayTimeSheet.clockOut;
        const isOnBreak =
          todayTimeSheet &&
          todayTimeSheet.breakStart &&
          !todayTimeSheet.breakEnd;
        const isCompleted =
          todayTimeSheet && todayTimeSheet.clockIn && todayTimeSheet.clockOut;

        return {
          id: emp.id,
          empName: emp.empName,
          empEmail: emp.empEmail,
          empTechnology: emp.empTechnology,
          empGender: emp.empGender,
          isClockedIn,
          isOnBreak,
          isCompleted,
          clockInTime: todayTimeSheet?.clockIn || null,
          clockOutTime: todayTimeSheet?.clockOut || null,
          breakStartTime: todayTimeSheet?.breakStart || null,
          totalBreakTime: todayTimeSheet?.totalBreakTime || 0,
          workHours: todayTimeSheet?.hoursLoggedIn || 0,
          status: todayTimeSheet?.status || "ABSENT",
        };
      });

      // Calculate summary statistics
      const summary = {
        totalEmployees: employees.length,
        clockedInToday: employeeData.filter((emp) => emp.isClockedIn).length,
        completedToday: employeeData.filter((emp) => emp.isCompleted).length,
        onBreak: employeeData.filter((emp) => emp.isOnBreak).length,
        present: employeeData.filter((emp) => emp.status === "PRESENT").length,
        absent: employeeData.filter((emp) => emp.status === "ABSENT").length,
        halfDay: employeeData.filter((emp) => emp.status === "HALFDAY").length,
        late: employeeData.filter((emp) => emp.status === "LATE").length,
      };

      adminLogger.log("info", "Employee dashboard data retrieved successfully");
      res.status(200).json({
        success: true,
        message: "Employee dashboard data retrieved successfully",
        summary,
        employees: employeeData,
      });
    } catch (error) {
      adminLogger.log("error", `Error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: "Error retrieving dashboard data",
        error: error.message,
      });
    }
  },

  // Show employee leaves
  showEmpLeaves: async (req, res) => {
    try {
      const { status, startDate, endDate } = req.query;

      let whereClause = {
        isActive: true,
      };

      // Add status filter if provided
      if (status) {
        whereClause.status = status.toUpperCase();
      }

      // Add date filter if provided
      if (startDate && endDate) {
        whereClause.startDate = {
          gte: new Date(startDate),
          lte: new Date(endDate),
        };
      }

      const leaves = await prisma.empLeave.findMany({
        where: whereClause,
        orderBy: {
          createdAt: "desc",
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

      // Calculate duration for each leave
      const leavesWithDuration = leaves.map((leave) => {
        const start = moment(leave.startDate);
        const end = moment(leave.endDate);
        const duration = end.diff(start, "days") + 1;

        return {
          ...leave,
          duration: duration,
        };
      });

      adminLogger.log("info", "Employee leaves retrieved successfully");
      res.status(200).json({
        success: true,
        message: "Employee leaves retrieved successfully",
        data: leavesWithDuration,
        total: leavesWithDuration.length,
      });
    } catch (error) {
      adminLogger.log("error", `Error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: "Error retrieving employee leaves",
        error: error.message,
      });
    }
  },

  // Approve/Reject leave
  empLeavePermit: async (req, res) => {
    try {
      const { leaveId } = req.params;
      const { status, adminMessage } = req.body;

      const leaveRequest = await prisma.empLeave.findUnique({
        where: { id: leaveId },
      });

      if (!leaveRequest) {
        return res.status(404).json({
          success: false,
          message: "Leave request not found",
        });
      }

      if (leaveRequest.status !== "PENDING") {
        return res.status(400).json({
          success: false,
          message: "Leave request has already been processed",
        });
      }

      // Update leave status
      const updatedLeave = await prisma.empLeave.update({
        where: { id: leaveId },
        data: {
          status: status.toUpperCase(),
          message: adminMessage || leaveRequest.message,
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

      adminLogger.log("info", `Leave ${status.toLowerCase()} successfully`);
      res.status(200).json({
        success: true,
        message: `Leave ${status.toLowerCase()} successfully`,
        leaveRequest: updatedLeave,
      });
    } catch (error) {
      adminLogger.log("error", `Error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: "Error processing leave request",
        error: error.message,
      });
    }
  },
};
