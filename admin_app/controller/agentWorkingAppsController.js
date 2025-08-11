const { prisma } = require('../../config/prismaConfig');
const adminLogger = require('../../utils/adminLogger/adminLogger');

module.exports = {
  // Set agent working app data from Electron app
  setAgentWorkingApp: async (req, res) => {
    try {
      const { agentId, appData } = req.body;

      // Verify employee exists
      const employee = await prisma.employee.findUnique({
        where: { id: agentId }
      });

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      // Validate app data
      if (!appData || !appData.appName || !appData.appOpenAt || !appData.appCloseAt) {
        return res.status(400).json({
          success: false,
          message: 'Invalid app data provided'
        });
      }

      // Create working app record
      const workingApp = await prisma.agentWorkingApp.create({
        data: {
          appName: appData.appName,
          appPath: appData.appPath || null,
          appOpenAt: new Date(appData.appOpenAt),
          appCloseAt: new Date(appData.appCloseAt),
          keysPressed: appData.keysPressed || 0,
          mouseClicks: appData.mouseClicks || 0,
          empId: agentId
        }
      });

      adminLogger.log('info', `Working app data saved for employee: ${employee.empName} - App: ${appData.appName}`);
      
      res.status(201).json({
        success: true,
        message: 'Working app data saved successfully',
        data: {
          id: workingApp.id,
          appName: workingApp.appName,
          appOpenAt: workingApp.appOpenAt,
          appCloseAt: workingApp.appCloseAt,
          keysPressed: workingApp.keysPressed,
          mouseClicks: workingApp.mouseClicks
        }
      });

    } catch (error) {
      adminLogger.log('error', `Set working app error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error saving working app data',
        error: error.message
      });
    }
  },

  // Get working apps for an employee
  getEmployeeWorkingApps: async (req, res) => {
    try {
      const { empId } = req.params;
      const { page = 1, limit = 50, date } = req.query;

      const skip = (page - 1) * limit;

      // Verify employee exists
      const employee = await prisma.employee.findUnique({
        where: { id: empId }
      });

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      // Build where clause
      const whereClause = {
        empId: empId,
        isActive: true
      };

      // Add date filter if provided
      if (date) {
        const startDate = new Date(date);
        const endDate = new Date(date);
        endDate.setDate(endDate.getDate() + 1);
        
        whereClause.appOpenAt = {
          gte: startDate,
          lt: endDate
        };
      }

      // Get working apps with pagination
      const workingApps = await prisma.agentWorkingApp.findMany({
        where: whereClause,
        orderBy: {
          appOpenAt: 'desc'
        },
        skip: parseInt(skip),
        take: parseInt(limit),
        select: {
          id: true,
          appName: true,
          appPath: true,
          appOpenAt: true,
          appCloseAt: true,
          keysPressed: true,
          mouseClicks: true,
          createdAt: true
        }
      });

      // Get total count
      const totalApps = await prisma.agentWorkingApp.count({
        where: whereClause
      });

      // Calculate summary statistics
      const summary = await prisma.agentWorkingApp.aggregate({
        where: whereClause,
        _sum: {
          keysPressed: true,
          mouseClicks: true
        },
        _count: true
      });

      adminLogger.log('info', `Working apps retrieved for employee: ${employee.empName}`);
      
      res.status(200).json({
        success: true,
        message: 'Working apps retrieved successfully',
        data: {
          workingApps,
          summary: {
            totalApps: summary._count,
            totalKeysPressed: summary._sum.keysPressed || 0,
            totalMouseClicks: summary._sum.mouseClicks || 0
          },
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalApps / limit),
            totalApps,
            hasNext: skip + workingApps.length < totalApps,
            hasPrev: page > 1
          }
        }
      });

    } catch (error) {
      adminLogger.log('error', `Get working apps error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error retrieving working apps',
        error: error.message
      });
    }
  },

  // Get working apps summary for all employees (admin view)
  getAllWorkingAppsSummary: async (req, res) => {
    try {
      const { date } = req.query;

      // Build where clause
      const whereClause = {
        isActive: true
      };

      // Add date filter if provided
      if (date) {
        const startDate = new Date(date);
        const endDate = new Date(date);
        endDate.setDate(endDate.getDate() + 1);
        
        whereClause.appOpenAt = {
          gte: startDate,
          lt: endDate
        };
      }

      // Get summary by employee
      const summary = await prisma.agentWorkingApp.groupBy({
        by: ['empId'],
        where: whereClause,
        _sum: {
          keysPressed: true,
          mouseClicks: true
        },
        _count: true
      });

      // Get employee details for each summary
      const summaryWithEmployeeDetails = await Promise.all(
        summary.map(async (item) => {
          const employee = await prisma.employee.findUnique({
            where: { id: item.empId },
            select: {
              id: true,
              empName: true,
              empEmail: true,
              empTechnology: true
            }
          });

          return {
            employee,
            totalApps: item._count,
            totalKeysPressed: item._sum.keysPressed || 0,
            totalMouseClicks: item._sum.mouseClicks || 0
          };
        })
      );

      adminLogger.log('info', 'Working apps summary retrieved for all employees');
      
      res.status(200).json({
        success: true,
        message: 'Working apps summary retrieved successfully',
        data: summaryWithEmployeeDetails
      });

    } catch (error) {
      adminLogger.log('error', `Get working apps summary error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error retrieving working apps summary',
        error: error.message
      });
    }
  }
};
