const express = require('express');
const router = express.Router();
const empMeetingController = require('../controller/empMeetingController');
const { authentication } = require('../../middleware/authToken');
const {
  meetingTokenLimiter,
  meetingJoinLimiter,
  generalApiLimiter
} = require('../../middleware/rateLimiter');

/**
 * Employee Meeting Routes
 * All routes require authentication
 */

// Apply authentication middleware to all routes
router.use(authentication);

// Middleware to ensure user is employee
const ensureEmployee = (req, res, next) => {
  if (!req.user || req.user.role !== 'EMPLOYEE') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Employee privileges required.'
    });
  }
  next();
};

// Apply employee check to all routes
router.use(ensureEmployee);

/**
 * GET /emp/meetings
 * List employee's meetings with filters and pagination
 * Query parameters:
 * - type: Filter by meeting type (BASIC, NORMAL, LONG)
 * - status: Filter by status (SCHEDULED, LIVE, ENDED, CANCELED)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 */
router.get('/', generalApiLimiter, empMeetingController.listMyMeetings);

/**
 * GET /emp/meetings/upcoming
 * Get upcoming meetings for employee within specified time range
 * Query parameters:
 * - minutesAhead: Minutes ahead to look for meetings (default: 30, max: 1440)
 */
router.get('/upcoming', empMeetingController.getUpcomingMeetings);

/**
 * GET /emp/meetings/:roomCode
 * Get meeting details by room code
 * Returns meeting info, join permissions, and participant status
 */
router.get('/:roomCode', empMeetingController.getMeetingByRoomCode);

/**
 * POST /emp/meetings/:roomCode/join
 * Join a meeting
 * Body parameters:
 * - password: Meeting password (optional, required if meeting is password-protected)
 * - timeSheetId: Timesheet ID to link attendance (optional)
 * Returns meeting access token and ICE configuration for WebRTC
 */
router.post('/:roomCode/join', meetingJoinLimiter, empMeetingController.joinMeeting);

/**
 * POST /emp/meetings/:roomCode/leave
 * Leave a meeting
 * Marks employee as left and calculates attendance duration
 */
router.post('/:roomCode/leave', empMeetingController.leaveMeeting);

/**
 * POST /emp/meetings/:roomCode/access-token
 * Get meeting access token for Socket.IO connection
 * Returns short-lived JWT token and ICE configuration
 * Alternative endpoint for getting access token without joining
 */
router.post('/:roomCode/access-token', meetingTokenLimiter, empMeetingController.getMeetingAccessToken);

module.exports = router;

