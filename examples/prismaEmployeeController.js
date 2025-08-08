const bcrypt = require('bcrypt');
const { prisma } = require('../config/prismaConfig');
const employeeLogger = require('../utils/empLogger/employeeLogger');
const emailService = require('../service/emailService');

// Example: Converted Employee Controller using Prisma

module.exports = {
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
                empGender
            } = req.body;

            // Check if employee already exists
            const existingEmployee = await prisma.employee.findUnique({
                where: { empEmail }
            });

            if (existingEmployee) {
                employeeLogger.log("error", "Employee Already Exists With This Email");
                return res.status(409).json({
                    success: false,
                    message: 'Employee Already Exists With This Email'
                });
            }

            // Hash password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(empPassword, salt);

            // Set default profile picture based on gender
            let empProfile = '../upload/maleAvatar.png'; // Default
            if (empGender === 'FEMALE') {
                empProfile = '../upload/femaleAvatar.png';
            }

            // Create employee using Prisma
            const employee = await prisma.employee.create({
                data: {
                    empName,
                    empEmail,
                    empPhone: parseInt(empPhone),
                    empPassword: hashedPassword,
                    confirmPassword: hashedPassword, // Store hashed version
                    empTechnology,
                    empGender,
                    empProfile,
                    empRole: 'employee' // Default role
                }
            });

            employeeLogger.log('info', "Employee Created Successfully");
            res.status(201).json({
                success: true,
                message: 'Employee Created Successfully',
                employee: {
                    id: employee.id,
                    empName: employee.empName,
                    empEmail: employee.empEmail,
                    empTechnology: employee.empTechnology,
                    empGender: employee.empGender,
                    empRole: employee.empRole
                }
            });
        } catch (error) {
            employeeLogger.log("error", `Error: ${error.message}`);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    // Employee login
    loginEmployee: async (req, res) => {
        try {
            const { empEmail, empPassword } = req.body;

            // Find employee by email
            const employee = await prisma.employee.findUnique({
                where: { empEmail }
            });

            if (!employee) {
                employeeLogger.log("error", "Employee not found");
                return res.status(404).json({
                    success: false,
                    message: "Employee not found"
                });
            }

            // Verify password
            const isValidPassword = await bcrypt.compare(empPassword, employee.empPassword);
            if (!isValidPassword) {
                employeeLogger.log("error", "Invalid password");
                return res.status(401).json({
                    success: false,
                    message: "Invalid password"
                });
            }

            // Generate JWT token (you'll need to implement this)
            const jwt = require('jsonwebtoken');
            const token = jwt.sign(
                { 
                    userData: {
                        empId: employee.id,
                        empEmail: employee.empEmail,
                        empRole: employee.empRole
                    }
                },
                process.env.SECRET_KEY,
                { expiresIn: "1h" }
            );

            employeeLogger.log("info", "Employee logged in successfully");
            res.status(200).json({
                success: true,
                message: "Employee logged in successfully",
                accessToken: token
            });
        } catch (error) {
            employeeLogger.log('error', `Error: ${error.message}`);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    // Get employee profile
    getEmployeeProfile: async (req, res) => {
        try {
            const { id } = req.params;

            const employee = await prisma.employee.findUnique({
                where: { id },
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
                    createdAt: true
                }
            });

            if (!employee) {
                return res.status(404).json({
                    success: false,
                    message: "Employee not found"
                });
            }

            res.status(200).json({
                success: true,
                message: "Employee profile retrieved successfully",
                employee
            });
        } catch (error) {
            employeeLogger.log('error', `Error: ${error.message}`);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    // Update employee profile
    updateEmployeeProfile: async (req, res) => {
        try {
            const { id } = req.params;
            const { empTechnology, empPhone } = req.body;

            const updatedEmployee = await prisma.employee.update({
                where: { id },
                data: {
                    empTechnology,
                    empPhone: empPhone ? parseInt(empPhone) : undefined
                },
                select: {
                    id: true,
                    empName: true,
                    empEmail: true,
                    empPhone: true,
                    empTechnology: true,
                    empGender: true,
                    empProfile: true,
                    empRole: true
                }
            });

            employeeLogger.log("info", "Employee profile updated successfully");
            res.status(200).json({
                success: true,
                message: "Employee profile updated successfully",
                employee: updatedEmployee
            });
        } catch (error) {
            employeeLogger.log('error', `Error: ${error.message}`);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    // Get employee timesheets
    getEmployeeTimeSheets: async (req, res) => {
        try {
            const { id } = req.params;
            const { startDate, endDate } = req.query;

            let whereClause = {
                empId: id,
                isActive: true
            };

            // Add date filter if provided
            if (startDate && endDate) {
                whereClause.createdAt = {
                    gte: new Date(startDate),
                    lte: new Date(endDate)
                };
            }

            const timeSheets = await prisma.timeSheet.findMany({
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

            res.status(200).json({
                success: true,
                message: "Employee timesheets retrieved successfully",
                data: timeSheets,
                total: timeSheets.length
            });
        } catch (error) {
            employeeLogger.log('error', `Error: ${error.message}`);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
};
