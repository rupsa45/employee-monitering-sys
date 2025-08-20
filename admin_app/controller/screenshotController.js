const { prisma } = require('../../config/prismaConfig');
const cloudinary = require('../../config/cloudinaryConfig');
// Logger removed for cleaner output

module.exports = {
  // Upload screenshot from Electron app
  uploadScreenshot: async (req, res) => {
    try {
      const { agentId } = req.body;
      
      console.log('📸 Screenshot upload request received:', {
        agentId,
        timestamp: new Date().toISOString(),
        fileSize: req.file?.size || 'No file',
        fileName: req.file?.originalname || 'No filename',
        userAgent: req.headers['user-agent'] || 'Unknown'
      });
      
      if (!req.file) {
        console.log('❌ Screenshot upload failed: No file provided');
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
        console.log('❌ Screenshot upload failed: Employee not found for agentId:', agentId);
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      console.log('✅ Employee verified:', {
        empId: employee.id,
        empName: employee.empName,
        empEmail: employee.empEmail
      });

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
        console.log('❌ Screenshot upload failed: Employee not clocked in', {
          empId: agentId,
          empName: employee.empName,
          currentTime: new Date().toISOString()
        });
        return res.status(403).json({
          success: false,
          message: 'Screenshots can only be captured when employee is clocked in'
        });
      }

      console.log('✅ Employee clock-in status verified:', {
        empId: agentId,
        empName: employee.empName,
        clockInTime: currentTimeSheet.clockIn,
        isActive: currentTimeSheet.isActive
      });

      // Upload to Cloudinary
      console.log('☁️ Uploading screenshot to Cloudinary...');
      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder: 'employee-screenshots',
        resource_type: 'image',
        transformation: [
          { quality: 'auto:good' },
          { fetch_format: 'auto' }
        ]
      });

      console.log('✅ Screenshot uploaded to Cloudinary:', {
        publicId: uploadResult.public_id,
        secureUrl: uploadResult.secure_url,
        fileSize: uploadResult.bytes,
        format: uploadResult.format
      });

      // Save to database
      console.log('💾 Saving screenshot to database...');
      const screenshot = await prisma.screenshot.create({
        data: {
          imageUrl: uploadResult.secure_url,
          publicId: uploadResult.public_id,
          empId: agentId
        }
      });

      console.log('✅ Screenshot saved to database:', {
        screenshotId: screenshot.id,
        empId: screenshot.empId,
        createdAt: screenshot.createdAt
      });

      console.log('🎉 Screenshot upload completed successfully for employee:', {
        empId: agentId,
        empName: employee.empName,
        screenshotId: screenshot.id,
        timestamp: new Date().toISOString()
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
      console.error('❌ Screenshot upload error:', {
        error: error.message,
        stack: error.stack,
        agentId,
        timestamp: new Date().toISOString()
      });
      
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

      console.log('📸 Screenshot retrieval request:', {
        empId,
        page,
        limit,
        timestamp: new Date().toISOString(),
        userAgent: req.headers['user-agent'] || 'Unknown'
      });

      const skip = (page - 1) * limit;

      // Verify employee exists
      const employee = await prisma.employee.findUnique({
        where: { id: empId }
      });

      if (!employee) {
        console.log('❌ Screenshot retrieval failed: Employee not found for empId:', empId);
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      console.log('✅ Employee found for screenshot retrieval:', {
        empId: employee.id,
        empName: employee.empName,
        empEmail: employee.empEmail
      });

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
              empEmail: true,
              empProfile: true
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

      console.log('✅ Screenshots retrieved successfully:', {
        empId,
        empName: employee.empName,
        screenshotsCount: screenshots.length,
        totalScreenshots,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalScreenshots / limit)
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
      console.error('❌ Screenshot retrieval error:', {
        error: error.message,
        empId,
        timestamp: new Date().toISOString()
      });
      
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

      console.log('📸 Admin screenshot retrieval request:', {
        page,
        limit,
        timestamp: new Date().toISOString(),
        userAgent: req.headers['user-agent'] || 'Unknown'
      });

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
              empEmail: true,
              empProfile: true
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

      console.log('✅ All screenshots retrieved successfully:', {
        screenshotsCount: screenshots.length,
        totalScreenshots,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalScreenshots / limit)
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
      console.error('❌ Admin screenshot retrieval error:', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
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
