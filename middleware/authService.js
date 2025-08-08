const { prisma } = require('../config/prismaConfig');

// Middleware to check if user is an employee
const isEmployee = async (req, res, next) => {
    try {
        // First try to get role from JWT token
        if (req.user && req.user.userData && req.user.userData.empRole) {
            if (req.user.userData.empRole === 'employee') {
                return next();
            } else {
                return res.status(403).json({
                    success: false,
                    message: "Access denied. Employee role required."
                });
            }
        }

        // Fallback: check database if role not in token
        const empId = req.user?.userData?.empId;
        if (!empId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        const employee = await prisma.employee.findUnique({
            where: { id: empId },
            select: { empRole: true, isActive: true }
        });

        if (!employee || !employee.isActive) {
            return res.status(401).json({
                success: false,
                message: "Employee not found or inactive"
            });
        }

        if (employee.empRole !== 'employee') {
            return res.status(403).json({
                success: false,
                message: "Access denied. Employee role required."
            });
        }

        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({
            success: false,
            message: "Authentication error"
        });
    }
};

// Middleware to check if user is an admin
const isAdmin = async (req, res, next) => {
    try {
        // First try to get role from JWT token
        if (req.user && req.user.userData && req.user.userData.empRole) {
            if (req.user.userData.empRole === 'admin') {
                return next();
            } else {
                return res.status(403).json({
                    success: false,
                    message: "Access denied. Admin role required."
                });
            }
        }

        // Fallback: check database if role not in token
        const empId = req.user?.userData?.empId;
        if (!empId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        const employee = await prisma.employee.findUnique({
            where: { id: empId },
            select: { empRole: true, isActive: true }
        });

        if (!employee || !employee.isActive) {
            return res.status(401).json({
                success: false,
                message: "Employee not found or inactive"
            });
        }

        if (employee.empRole !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Access denied. Admin role required."
            });
        }

        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({
            success: false,
            message: "Authentication error"
        });
    }
};

module.exports = {
    isEmployee,
    isAdmin
};
