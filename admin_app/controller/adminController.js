const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const moment = require("moment");
const { prisma } = require("../../config/prismaConfig");
// Logger removed for cleaner output

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

      // Prepare user data for frontend
      const userData = {
        empId: admin.id,
        empEmail: admin.empEmail,
        empName: admin.empName,
        empRole: admin.empRole,
        empTechnology: admin.empTechnology,
        empGender: admin.empGender
      };

      
      res.status(200).json({
        success: true,
        message: "Admin logged in successfully",
        accessToken: token,
        user: userData
      });
    } catch (error) {
      
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
      
      res.status(500).json({
        success: false,
        message: error.message,
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

      
      res.status(200).json({
        success: true,
        message: "Employee leaves retrieved successfully",
        data: leavesWithDuration,
        total: leavesWithDuration.length,
      });
    } catch (error) {
      
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
      
      res.status(500).json({
        success: false,
        message: "Error processing leave request",
        error: error.message,
      });
    }
  },

  // Get admin profile
  getUserProfile: async (req, res) => {
    try {
      const empId = req.user.userData.empId;

      const admin = await prisma.employee.findUnique({
        where: { id: empId },
        select: {
          id: true,
          empName: true,
          empEmail: true,
          empPhone: true,
          empTechnology: true,
          empGender: true,
          empProfile: true,
          empRole: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!admin) {
        
        return res.status(404).json({
          success: false,
          message: "Admin profile not found"
        });
      }

      // Get additional statistics for admin
      const totalEmployees = await prisma.employee.count({
        where: { 
          empRole: 'employee',
          isActive: true 
        }
      });

      const totalActiveEmployees = await prisma.employee.count({
        where: { 
          empRole: 'employee',
          isActive: true 
        }
      });

      const pendingLeaves = await prisma.empLeave.count({
        where: { 
          status: 'PENDING',
          isActive: true 
        }
      });

      const totalTasks = await prisma.task.count({
        where: { isActive: true }
      });

      const completedTasks = await prisma.task.count({
        where: { 
          status: 'COMPLETED',
          isActive: true 
        }
      });

      const todayAttendance = await prisma.timeSheet.count({
        where: {
          dayPresent: '1',
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      });

      const profileData = {
        ...admin,
        statistics: {
          totalEmployees,
          totalActiveEmployees,
          pendingLeaves,
          totalTasks,
          completedTasks,
          todayAttendance,
          taskCompletionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
          attendanceRate: totalEmployees > 0 ? Math.round((todayAttendance / totalEmployees) * 100) : 0
        }
      };

      
      res.status(200).json({
        success: true,
        message: "Admin profile retrieved successfully",
        data: profileData
      });
    } catch (error) {
      
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Get all employees
  getAllEmployees: async (req, res) => {
    try {
      const employees = await prisma.employee.findMany({
        where: {
          empRole: 'employee',
          isActive: true
        },
        select: {
          id: true,
          empName: true,
          empEmail: true,
          empPhone: true,
          empTechnology: true,
          empRole: true,
          empGender: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      const total = await prisma.employee.count({
        where: {
          empRole: 'employee',
          isActive: true
        }
      });

      
      res.status(200).json({
        success: true,
        message: "All employees retrieved successfully",
        data: employees,
        total: total
      });
    } catch (error) {
      
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },
};
