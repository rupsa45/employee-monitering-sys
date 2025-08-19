const { prisma } = require('../../config/prismaConfig');
const cloudinary = require('../../config/cloudinaryConfig');
// Logger removed for cleaner output

module.exports = {
  // Upload screenshot from Electron app
  uploadScreenshot: async (req, res) => {
    try {
      const { agentId } = req.body;
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No screenshot file provided'
        });
      }

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

      // Check if employee is currently clocked in
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const currentTimeSheet = await prisma.timeSheet.findFirst({
        where: {
          empId: agentId,
          createdAt: {
            gte: today,
            lt: tomorrow
          },
          isActive: true,
          clockIn: { not: '' }, // Has clocked in
          clockOut: '' // Has not clocked out
        }
      });

      if (!currentTimeSheet) {
        return res.status(403).json({
          success: false,
          message: 'Screenshots can only be captured when employee is clocked in'
        });
      }

      // Upload to Cloudinary
      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder: 'employee-screenshots',
        resource_type: 'image',
        transformation: [
          { quality: 'auto:good' },
          { fetch_format: 'auto' }
        ]
      });

      // Save to database
      const screenshot = await prisma.screenshot.create({
        data: {
          imageUrl: uploadResult.secure_url,
          publicId: uploadResult.public_id,
          empId: agentId
        }
      });

      
      
      res.status(201).json({
        success: true,
        message: 'Screenshot uploaded successfully',
        screenshot: {
          id: screenshot.id,
          imageUrl: screenshot.imageUrl,
          createdAt: screenshot.createdAt
        }
      });

    } catch (error) {
      
      res.status(500).json({
        success: false,
        message: 'Error uploading screenshot',
        error: error.message
      });
    }
  },

  // Get screenshots for an employee
  getEmployeeScreenshots: async (req, res) => {
    try {
      const { empId } = req.params;
      const { page = 1, limit = 20 } = req.query;

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

      // Get screenshots with pagination
      const screenshots = await prisma.screenshot.findMany({
        where: {
          empId: empId,
          isActive: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: parseInt(skip),
        take: parseInt(limit),
        include: {
          employee: {
            select: {
              id: true,
              empName: true,
              email: true,
              profilePic: true
            }
          }
        }
      });

      // Get total count
      const totalScreenshots = await prisma.screenshot.count({
        where: {
          empId: empId,
          isActive: true
        }
      });

      
      
      res.status(200).json({
        success: true,
        message: 'Screenshots retrieved successfully',
        data: {
          screenshots,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalScreenshots / limit),
            totalScreenshots,
            hasNext: skip + screenshots.length < totalScreenshots,
            hasPrev: page > 1
          }
        }
      });

    } catch (error) {
      
      res.status(500).json({
        success: false,
        message: 'Error retrieving screenshots',
        error: error.message
      });
    }
  },

  // Get all screenshots (admin view)
  getAllScreenshots: async (req, res) => {
    try {
      const { page = 1, limit = 20 } = req.query;

      const skip = (page - 1) * limit;

      // Get screenshots with pagination and employee info
      const screenshots = await prisma.screenshot.findMany({
        where: {
          isActive: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: parseInt(skip),
        take: parseInt(limit),
        include: {
          employee: {
            select: {
              id: true,
              empName: true,
              email: true,
              profilePic: true
            }
          }
        }
      });

      // Get total count
      const totalScreenshots = await prisma.screenshot.count({
        where: {
          isActive: true
        }
      });

      adminLogger.log('info', `All screenshots retrieved`);
      
      res.status(200).json({
        success: true,
        message: 'Screenshots retrieved successfully',
        data: {
          screenshots,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalScreenshots / limit),
            totalScreenshots,
            hasNext: skip + screenshots.length < totalScreenshots,
            hasPrev: page > 1
          }
        }
      });

    } catch (error) {
      adminLogger.log('error', `Get all screenshots error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error retrieving screenshots',
        error: error.message
      });
    }
  },

  // Delete screenshot
  deleteScreenshot: async (req, res) => {
    try {
      const { id } = req.params;

      const screenshot = await prisma.screenshot.findUnique({
        where: { id }
      });

      if (!screenshot) {
        return res.status(404).json({
          success: false,
          message: 'Screenshot not found'
        });
      }

      // Delete from Cloudinary
      await cloudinary.uploader.destroy(screenshot.publicId);

      // Soft delete from database
      await prisma.screenshot.update({
        where: { id },
        data: { isActive: false }
      });

      
      
      res.status(200).json({
        success: true,
        message: 'Screenshot deleted successfully'
      });

    } catch (error) {
      
      res.status(500).json({
        success: false,
        message: 'Error deleting screenshot',
        error: error.message
      });
    }
  }
};
