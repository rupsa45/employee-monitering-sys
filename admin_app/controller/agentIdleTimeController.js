const { prisma } = require('../../config/prismaConfig');
// Logger removed for cleaner output

module.exports = {
  // Add agent idle time data from Electron app
  addAgentIdleTime: async (req, res) => {
    try {
      const { agentId, from, to } = req.body;

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

      // Validate time data
      if (!from || !to) {
        return res.status(400).json({
          success: false,
          message: 'From and to times are required'
        });
      }

      const fromTime = new Date(from);
      const toTime = new Date(to);
      const duration = toTime.getTime() - fromTime.getTime();

      // Validate duration (should be positive)
      if (duration <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid time range: end time must be after start time'
        });
      }

      // Create idle time record
      const idleTime = await prisma.agentIdleTime.create({
        data: {
          from: fromTime,
          to: toTime,
          duration: duration,
          empId: agentId
        }
      });

      console.log(`Idle time recorded for employee: ${employee.empName} - Duration: ${Math.round(duration / 1000 / 60)} minutes`);
      
      res.status(201).json({
        success: true,
        message: 'Idle time data saved successfully',
        data: {
          id: idleTime.id,
          from: idleTime.from,
          to: idleTime.to,
          duration: idleTime.duration,
          durationMinutes: Math.round(duration / 1000 / 60)
        }
      });

    } catch (error) {
      
      res.status(500).json({
        success: false,
        message: 'Error saving idle time data',
        error: error.message
      });
    }
  },

  // Get idle time for an employee
  getEmployeeIdleTime: async (req, res) => {
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
        
        whereClause.from = {
          gte: startDate,
          lt: endDate
        };
      }

      // Get idle time records with pagination
      const idleTimes = await prisma.agentIdleTime.findMany({
        where: whereClause,
        orderBy: {
          from: 'desc'
        },
        skip: parseInt(skip),
        take: parseInt(limit),
        select: {
          id: true,
          from: true,
          to: true,
          duration: true,
          createdAt: true
        }
      });

      // Get total count
      const totalIdleTimes = await prisma.agentIdleTime.count({
        where: whereClause
      });

      // Calculate summary statistics
      const summary = await prisma.agentIdleTime.aggregate({
        where: whereClause,
        _sum: {
          duration: true
        },
        _count: true
      });

      const totalDurationMinutes = Math.round((summary._sum.duration || 0) / 1000 / 60);

      
      
      res.status(200).json({
        success: true,
        message: 'Idle time retrieved successfully',
        data: {
          idleTimes: idleTimes.map(item => ({
            ...item,
            durationMinutes: Math.round(item.duration / 1000 / 60)
          })),
          summary: {
            totalIdleSessions: summary._count,
            totalIdleMinutes: totalDurationMinutes,
            averageIdleMinutes: summary._count > 0 ? Math.round(totalDurationMinutes / summary._count) : 0
          },
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalIdleTimes / limit),
            totalIdleTimes,
            hasNext: skip + idleTimes.length < totalIdleTimes,
            hasPrev: page > 1
          }
        }
      });

    } catch (error) {
      
      res.status(500).json({
        success: false,
        message: 'Error retrieving idle time',
        error: error.message
      });
    }
  },

  // Get idle time summary for all employees (admin view)
  getAllIdleTimeSummary: async (req, res) => {
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
        
        whereClause.from = {
          gte: startDate,
          lt: endDate
        };
      }

      // Get summary by employee
      const summary = await prisma.agentIdleTime.groupBy({
        by: ['empId'],
        where: whereClause,
        _sum: {
          duration: true
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

          const totalMinutes = Math.round((item._sum.duration || 0) / 1000 / 60);
          const averageMinutes = item._count > 0 ? Math.round(totalMinutes / item._count) : 0;

          return {
            employee,
            totalIdleSessions: item._count,
            totalIdleMinutes: totalMinutes,
            averageIdleMinutes: averageMinutes
          };
        })
      );

      
      
      res.status(200).json({
        success: true,
        message: 'Idle time summary retrieved successfully',
        data: summaryWithEmployeeDetails
      });

    } catch (error) {
      
      res.status(500).json({
        success: false,
        message: 'Error retrieving idle time summary',
        error: error.message
      });
    }
  }
};
