const express = require('express');
const router = express.Router();
const meetingController = require('../controller/meetingController');
const { authentication } = require('../../middleware/authToken');
const {
  meetingCreationLimiter,
  meetingInviteLimiter,
  generalApiLimiter
} = require('../../middleware/rateLimiter');

/**
 * Admin Meeting Routes
 * All routes require authentication and admin privileges
 */

// Apply authentication middleware to all routes
router.use(authentication);

// Middleware to ensure user is admin
const ensureAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }
  next();
};

// Apply admin check to all routes
router.use(ensureAdmin);

/**
 * POST /admin/meetings
 * Create a new meeting
 */
router.post('/', meetingCreationLimiter, meetingController.createMeeting);

/**
 * GET /admin/meetings
 * List meetings with filters and pagination
 * Query parameters:
 * - hostId: Filter by host ID
 * - type: Filter by meeting type (BASIC, NORMAL, LONG)
 * - status: Filter by status (SCHEDULED, LIVE, ENDED, CANCELED)
 * - startDate: Filter by start date (ISO string)
 * - endDate: Filter by end date (ISO string)
 * - from: Filter by scheduled start date (ISO string) - for scheduling
 * - to: Filter by scheduled end date (ISO string) - for scheduling
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 */
router.get('/', generalApiLimiter, meetingController.getScheduledMeetings);

/**
 * GET /admin/meetings/:id/attendance
 * Get meeting attendance report with timesheet links
 * Returns detailed attendance data including:
 * - Participant list with join/leave times
 * - Attendance duration in seconds/minutes
 * - Linked timesheet information
 * - Summary statistics
 */
router.get('/:id/attendance', meetingController.getMeetingAttendance);

/**
 * GET /admin/meetings/:id
 * Get meeting details by ID
 */
router.get('/:id', meetingController.getMeetingById);

/**
 * PATCH /admin/meetings/:id
 * Update meeting details
 * Body parameters (all optional):
 * - title: Meeting title
 * - description: Meeting description
 * - type: Meeting type (BASIC, NORMAL, LONG)
 * - scheduledStart: Scheduled start time (ISO string)
 * - scheduledEnd: Scheduled end time (ISO string)
 * - password: Meeting password
 * - isPersistent: Whether meeting is persistent
 */
router.patch('/:id', meetingController.updateMeeting);

/**
 * POST /admin/meetings/:id/start
 * Start a meeting (set status to LIVE)
 */
router.post('/:id/start', meetingController.startMeeting);

/**
 * POST /admin/meetings/:id/end
 * End a meeting (set status to ENDED)
 */
router.post('/:id/end', meetingController.endMeeting);

/**
 * POST /admin/meetings/:id/cancel
 * Cancel a meeting (set status to CANCELED)
 */
router.post('/:id/cancel', meetingController.cancelMeeting);

/**
 * POST /admin/meetings/:id/kick
 * Kick a participant from the meeting
 * Body parameters:
 * - empId: Employee ID to kick
 */
router.post('/:id/kick', meetingController.kickParticipant);

/**
 * POST /admin/meetings/:id/ban
 * Ban a participant from the meeting
 * Body parameters:
 * - empId: Employee ID to ban
 */
router.post('/:id/ban', meetingController.banParticipant);

/**
 * POST /admin/meetings/:id/remind
 * Send meeting invites to selected employees
 * Body parameters:
 * - empIds: Array of employee IDs to invite
 * - message: Custom message for the invite (optional)
 */
router.post('/:id/remind', meetingInviteLimiter, meetingController.sendMeetingInvites);

/**
 * POST /admin/meetings/reminders
 * Send meeting reminders for upcoming meetings
 * Body parameters:
 * - minutesAhead: Minutes ahead to send reminders (default: 15, max: 1440)
 */
router.post('/reminders', meetingController.sendMeetingReminders);

module.exports = router;

