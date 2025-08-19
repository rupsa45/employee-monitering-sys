const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { prisma } = require('../../config/prismaConfig');
const employeeLogger = require('../../utils/empLogger/employeeLogger');
const emailService = require('../../service/emailService');

module.exports = {
    // Get employee profile
    getUserProfile: async (req, res) => {
        try {
            const empId = req.user.userData.empId;

            const employee = await prisma.employee.findUnique({
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

            if (!employee) {
                employeeLogger.log("error", "Employee profile not found");
                return res.status(404).json({
                    success: false,
                    message: "Employee profile not found"
                });
            }

            // Get additional statistics
            const totalLeaves = await prisma.empLeave.count({
                where: { empId, isActive: true }
            });

            const totalTimeSheets = await prisma.timeSheet.count({
                where: { empId, isActive: true }
            });

            const totalTasks = await prisma.task.count({
                where: {
                    assignedEmployees: {
                        some: { id: empId }
                    },
                    isActive: true
                }
            });

            const completedTasks = await prisma.task.count({
                where: {
                    assignedEmployees: {
                        some: { id: empId }
                    },
                    status: 'COMPLETED',
                    isActive: true
                }
            });

            const profileData = {
                ...employee,
                statistics: {
                    totalLeaves,
                    totalTimeSheets,
                    totalTasks,
                    completedTasks,
                    completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
                }
            };

            employeeLogger.log("info", "Employee profile retrieved successfully");
            res.status(200).json({
                success: true,
                message: "Employee profile retrieved successfully",
                data: profileData
            });
        } catch (error) {
            employeeLogger.log('error', `Error: ${error.message}`);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    // Employee login (only login, no registration)
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

            // Generate JWT token
            const token = jwt.sign(
                { 
                    userData: {
                        empId: employee.id,
                        empEmail: employee.empEmail,
                        empRole: employee.empRole
                    }
                },
                process.env.SECRET_KEY,
                { expiresIn: "15d" }
            );

            // Prepare user data for frontend
            const userData = {
                empId: employee.id,
                empEmail: employee.empEmail,
                empName: employee.empName,
                empRole: employee.empRole,
                empPhone: employee.empPhone,
                empTechnology: employee.empTechnology,
                empGender: employee.empGender
            };

            employeeLogger.log("info", "Employee logged in successfully");
            res.status(200).json({
                success: true,
                message: "Employee logged in successfully",
                accessToken: token,
                user: userData
            });
        } catch (error) {
            employeeLogger.log('error', `Error: ${error.message}`);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    // Edit employee profile
    editProfile: async (req, res) => {
        try {
            const { id } = req.params;
            const { empTechnology, empPhone } = req.body;

            const updatedEmployee = await prisma.employee.update({
                where: { id },
                data: {
                    empTechnology,
                    empPhone: empPhone ? String(empPhone) : undefined
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

    // Set new password
    setNewPassword: async (req, res) => {
        try {
            const { id } = req.params;
            const { empPassword, confirmPassword } = req.body;

            if (empPassword !== confirmPassword) {
                return res.status(400).json({
                    success: false,
                    message: "Password and confirm password do not match"
                });
            }

            // Hash new password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(empPassword, salt);

            await prisma.employee.update({
                where: { id },
                data: {
                    empPassword: hashedPassword,
                    confirmPassword: hashedPassword
                }
            });

            employeeLogger.log("info", "Password updated successfully");
            res.status(200).json({
                success: true,
                message: "Password updated successfully"
            });
        } catch (error) {
            employeeLogger.log('error', `Error: ${error.message}`);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    // Reset password (forgot password)
    resetPassword: async (req, res) => {
        try {
            const { empEmail } = req.body;

            const employee = await prisma.employee.findUnique({
                where: { empEmail }
            });

            if (!employee) {
                return res.status(404).json({
                    success: false,
                    message: "Employee not found"
                });
            }

            // Generate new password
            const newPassword = Math.random().toString(36).slice(-8);
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);

            // Update password
            await prisma.employee.update({
                where: { id: employee.id },
                data: {
                    empPassword: hashedPassword,
                    confirmPassword: hashedPassword
                }
            });

            // Send email with new password
            const emailContent = `
                <h2>Password Reset</h2>
                <p>Your new password is: <strong>${newPassword}</strong></p>
                <p>Please change your password after logging in.</p>
            `;

            await emailService.sendEmail(empEmail, "Password Reset", emailContent);

            employeeLogger.log("info", "Password reset email sent successfully");
            res.status(200).json({
                success: true,
                message: "Password reset email sent successfully"
            });
        } catch (error) {
            employeeLogger.log('error', `Error: ${error.message}`);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    // Get employee notifications
    getNotifications: async (req, res) => {
        try {
            const { id } = req.params;

            const notifications = await prisma.notification.findMany({
                where: {
                    empId: id,
                    isActive: true
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });

            res.status(200).json({
                success: true,
                message: "Notifications retrieved successfully",
                data: notifications
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
