const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { prisma } = require('../../config/prismaConfig');

// Check if employee exists by email
const isEmployeeExist = async (empEmail) => {
    try {
        const employee = await prisma.employee.findUnique({
            where: { empEmail }
        });
        return !!employee;
    } catch (error) {
        console.error('Error checking employee existence:', error);
        return false;
    }
};

// Validate employee credentials and generate token
const validateEmployee = async (empEmail, empPassword) => {
    try {
        const employee = await prisma.employee.findUnique({
            where: { empEmail }
        });

        if (!employee) {
            return { value: false, generatedToken: null };
        }

        const isValidPassword = await bcrypt.compare(empPassword, employee.empPassword);
        if (!isValidPassword) {
            return { value: false, generatedToken: null };
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

        return { 
            value: true, 
            generatedToken: token,
            empData: employee
        };
    } catch (error) {
        console.error('Error validating employee:', error);
        return { value: false, generatedToken: null };
    }
};

// Get employee by email
const getEmployeeByEmail = async (empEmail) => {
    try {
        const employee = await prisma.employee.findUnique({
            where: { empEmail },
            select: {
                id: true,
                empName: true,
                empEmail: true,
                empRole: true,
                isActive: true
            }
        });
        return employee;
    } catch (error) {
        console.error('Error getting employee by email:', error);
        return null;
    }
};

// Get employee by ID
const getEmployeeById = async (empId) => {
    try {
        const employee = await prisma.employee.findUnique({
            where: { id: empId },
            select: {
                id: true,
                empName: true,
                empEmail: true,
                empRole: true,
                empTechnology: true,
                empGender: true,
                empProfile: true,
                isActive: true
            }
        });
        return employee;
    } catch (error) {
        console.error('Error getting employee by ID:', error);
        return null;
    }
};

module.exports = {
    isEmployeeExist,
    validateEmployee,
    getEmployeeByEmail,
    getEmployeeById
};
