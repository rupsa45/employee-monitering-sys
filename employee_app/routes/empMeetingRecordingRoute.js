const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const empMeetingRecordingController = require('../controller/empMeetingRecordingController');
const { authentication } = require('../../middleware/authToken');

// Ensure employee middleware
const ensureEmployee = (req, res, next) => {
  if (req.user && req.user.role === 'employee') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Access denied. Employee role required.'
    });
  }
};

// Apply authentication and employee role check to all routes
router.use(authentication);
router.use(ensureEmployee);

// Configure multer for video file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/recordings');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const meetingId = req.params.id;
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    cb(null, `meeting_${meetingId}_${timestamp}${extension}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Accept video files only
  const allowedMimeTypes = [
    'video/webm',
    'video/mp4',
    'video/avi',
    'video/mov',
    'video/wmv',
    'video/flv',
    'video/mkv',
    'video/ogg'
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only video files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max file size
    files: 1 // Only one file per request
  }
});

/**
 * Meeting Recording Routes
 * 
 * POST /emp/meetings/:id/recordings - Upload a recording
 * GET /emp/meetings/:id/recordings - Get recordings for a meeting
 * DELETE /emp/meetings/:id/recordings/:recordingId - Delete a recording
 * GET /emp/meetings/:id/recordings/stats - Get recording statistics
 */

// Upload a meeting recording
router.post('/:id/recordings', upload.single('file'), empMeetingRecordingController.uploadRecording);

// Get recordings for a meeting
router.get('/:id/recordings', empMeetingRecordingController.getMeetingRecordings);

// Delete a recording
router.delete('/:id/recordings/:recordingId', empMeetingRecordingController.deleteRecording);

// Get recording statistics
router.get('/:id/recordings/stats', empMeetingRecordingController.getRecordingStats);

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 500MB.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Only one file allowed per request.'
      });
    }
    return res.status(400).json({
      success: false,
      message: 'File upload error: ' + error.message
    });
  }
  
  if (error.message === 'Only video files are allowed') {
    return res.status(400).json({
      success: false,
      message: 'Only video files are allowed for recordings.'
    });
  }
  
  next(error);
});

module.exports = router;


