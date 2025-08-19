const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const screenshotController = require('../controller/screenshotController');
const { authentication } = require('../../middleware/authToken');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads/screenshots');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'screenshot-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Routes - All screenshot routes require authentication
router.post('/upload', authentication, upload.single('files'), screenshotController.uploadScreenshot);
router.get('/employee/:empId', authentication, screenshotController.getEmployeeScreenshots);
router.get('/', authentication, screenshotController.getAllScreenshots);
router.delete('/:id', authentication, screenshotController.deleteScreenshot);

module.exports = router;
