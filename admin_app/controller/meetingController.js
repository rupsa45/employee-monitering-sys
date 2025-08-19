const meetingService = require('../../service/meetingService');
const meetingSchedulingService = require('../../service/meetingSchedulingService');
const { prisma } = require('../../config/prismaConfig');
// Logger removed for cleaner output

/**
 * Admin Meeting Controller
 * Handles meeting management operations for administrators
 */

class MeetingController {
  /**
   * Create a new meeting
   * POST /admin/meetings
   */
  async createMeeting(req, res) {
    try {
      const {
        hostId,
        title,
        description,
        type = 'BASIC',
        scheduledStart,
        scheduledEnd,
        password,
        isPersistent = false
      } = req.body;

      // Validate required fields
      if (!hostId || !title) {
        return res.status(400).json({
          success: false,
          message: 'Host ID and title are required'
        });
      }

      // Validate meeting type
      const validTypes = ['BASIC', 'NORMAL', 'LONG'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid meeting type. Must be BASIC, NORMAL, or LONG'
        });
      }

      // Parse dates if provided
      const parsedScheduledStart = scheduledStart ? new Date(scheduledStart) : null;
      const parsedScheduledEnd = scheduledEnd ? new Date(scheduledEnd) : null;

      // Validate date logic
      if (parsedScheduledStart && parsedScheduledEnd && parsedScheduledStart >= parsedScheduledEnd) {
        return res.status(400).json({
          success: false,
          message: 'Scheduled end time must be after scheduled start time'
        });
      }

      const meeting = await meetingService.createMeeting({
        hostId,
        title,
        description,
        type,
        scheduledStart: parsedScheduledStart,
        scheduledEnd: parsedScheduledEnd,
        password,
        isPersistent
      });

      logger.info('Admin created meeting', {
        adminId: req.user.id,
        meetingId: meeting.id,
        hostId: meeting.hostId
      });

      res.status(201).json({
        success: true,
        message: 'Meeting created successfully',
        data: meeting
      });
    } catch (error) {
      logger.error('Error creating meeting', {
        adminId: req.user?.id,
        error: error.message
      });

      if (error.message.includes('Host not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to create meeting',
        error: error.message
      });
    }
  }

  /**
   * Update an existing meeting
   * PATCH /admin/meetings/:id
   */
  async updateMeeting(req, res) {
    try {
      const { id } = req.params;
      const {
        title,
        description,
        type,
        scheduledStart,
        scheduledEnd,
        password,
        isPersistent
      } = req.body;

      // Validate meeting type if provided
      if (type) {
        const validTypes = ['BASIC', 'NORMAL', 'LONG'];
        if (!validTypes.includes(type)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid meeting type. Must be BASIC, NORMAL, or LONG'
          });
        }
      }

      // Parse dates if provided
      const parsedScheduledStart = scheduledStart ? new Date(scheduledStart) : undefined;
      const parsedScheduledEnd = scheduledEnd ? new Date(scheduledEnd) : undefined;

      // Validate date logic
      if (parsedScheduledStart && parsedScheduledEnd && parsedScheduledStart >= parsedScheduledEnd) {
        return res.status(400).json({
          success: false,
          message: 'Scheduled end time must be after scheduled start time'
        });
      }

      const meeting = await meetingService.updateMeeting({
        meetingId: id,
        byEmpId: req.user.id,
        title,
        description,
        type,
        scheduledStart: parsedScheduledStart,
        scheduledEnd: parsedScheduledEnd,
        password,
        isPersistent
      });

      logger.info('Admin updated meeting', {
        adminId: req.user.id,
        meetingId: id
      });

      res.json({
        success: true,
        message: 'Meeting updated successfully',
        data: meeting
      });
    } catch (error) {
      logger.error('Error updating meeting', {
        adminId: req.user?.id,
        meetingId: req.params.id,
        error: error.message
      });

      if (error.message.includes('Meeting not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('Only meeting host can update')) {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('Cannot update ended or canceled')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update meeting',
        error: error.message
      });
    }
  }

  /**
   * Cancel a meeting
   * POST /admin/meetings/:id/cancel
   */
  async cancelMeeting(req, res) {
    try {
      const { id } = req.params;

      const meeting = await meetingService.cancelMeeting({
        meetingId: id,
        byEmpId: req.user.id
      });

      logger.info('Admin canceled meeting', {
        adminId: req.user.id,
        meetingId: id
      });

      res.json({
        success: true,
        message: 'Meeting canceled successfully',
        data: meeting
      });
    } catch (error) {
      logger.error('Error canceling meeting', {
        adminId: req.user?.id,
        meetingId: req.params.id,
        error: error.message
      });

      if (error.message.includes('Meeting not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('Only meeting host can cancel')) {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('already ended or canceled')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to cancel meeting',
        error: error.message
      });
    }
  }

  /**
   * Start a meeting
   * POST /admin/meetings/:id/start
   */
  async startMeeting(req, res) {
    try {
      const { id } = req.params;

      const meeting = await meetingService.startMeeting({
        meetingId: id,
        byEmpId: req.user.id
      });

      logger.info('Admin started meeting', {
        adminId: req.user.id,
        meetingId: id
      });

      res.json({
        success: true,
        message: 'Meeting started successfully',
        data: meeting
      });
    } catch (error) {
      logger.error('Error starting meeting', {
        adminId: req.user?.id,
        meetingId: req.params.id,
        error: error.message
      });

      if (error.message.includes('Meeting not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('Only meeting host can start')) {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('already live') || error.message.includes('Cannot start ended')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to start meeting',
        error: error.message
      });
    }
  }

  /**
   * End a meeting
   * POST /admin/meetings/:id/end
   */
  async endMeeting(req, res) {
    try {
      const { id } = req.params;

      const meeting = await meetingService.endMeeting({
        meetingId: id,
        byEmpId: req.user.id
      });

      logger.info('Admin ended meeting', {
        adminId: req.user.id,
        meetingId: id
      });

      res.json({
        success: true,
        message: 'Meeting ended successfully',
        data: meeting
      });
    } catch (error) {
      logger.error('Error ending meeting', {
        adminId: req.user?.id,
        meetingId: req.params.id,
        error: error.message
      });

      if (error.message.includes('Meeting not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('Only meeting host can end')) {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('already ended or canceled')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to end meeting',
        error: error.message
      });
    }
  }

  /**
   * List meetings with filters
   * GET /admin/meetings
   */
  async listMeetings(req, res) {
    try {
      const {
        hostId,
        type,
        status,
        startDate,
        endDate,
        page = 1,
        limit = 20
      } = req.query;

      // Parse and validate pagination
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);

      if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
        return res.status(400).json({
          success: false,
          message: 'Invalid pagination parameters'
        });
      }

      // Parse dates if provided
      const parsedStartDate = startDate ? new Date(startDate) : undefined;
      const parsedEndDate = endDate ? new Date(endDate) : undefined;

      const result = await meetingService.listMeetingsForAdmin({
        hostId,
        type,
        status,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        page: pageNum,
        limit: limitNum
      });

      logger.info('Admin listed meetings', {
        adminId: req.user.id,
        filters: { hostId, type, status, startDate, endDate },
        page: pageNum,
        limit: limitNum
      });

      res.json({
        success: true,
        message: 'Meetings retrieved successfully',
        data: result
      });
    } catch (error) {
      logger.error('Error listing meetings', {
        adminId: req.user?.id,
        error: error.message
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve meetings',
        error: error.message
      });
    }
  }

  /**
   * Get meeting by ID
   * GET /admin/meetings/:id
   */
  async getMeetingById(req, res) {
    try {
      const { id } = req.params;

      const meeting = await prisma.meeting.findUnique({
        where: { id },
        include: {
          host: {
            select: {
              id: true,
              empName: true,
              empEmail: true,
              empTechnology: true
            }
          },
          participants: {
            include: {
              employee: {
                select: {
                  id: true,
                  empName: true,
                  empEmail: true,
                  empTechnology: true
                }
              }
            }
          },
          recordings: {
            include: {
              createdBy: {
                select: {
                  id: true,
                  empName: true,
                  empEmail: true
                }
              }
            }
          },
          events: {
            include: {
              employee: {
                select: {
                  id: true,
                  empName: true,
                  empEmail: true
                }
              }
            },
            orderBy: { at: 'desc' },
            take: 50
          }
        }
      });

      if (!meeting) {
        return res.status(404).json({
          success: false,
          message: 'Meeting not found'
        });
      }

      logger.info('Admin retrieved meeting', {
        adminId: req.user.id,
        meetingId: id
      });

      res.json({
        success: true,
        message: 'Meeting retrieved successfully',
        data: meeting
      });
    } catch (error) {
      logger.error('Error getting meeting by ID', {
        adminId: req.user?.id,
        meetingId: req.params.id,
        error: error.message
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve meeting',
        error: error.message
      });
    }
  }

  /**
   * Kick participant from meeting
   * POST /admin/meetings/:id/kick
   */
  async kickParticipant(req, res) {
    try {
      const { id } = req.params;
      const { empId } = req.body;

      if (!empId) {
        return res.status(400).json({
          success: false,
          message: 'Employee ID is required'
        });
      }

      // Verify meeting exists and user is host
      const meeting = await prisma.meeting.findUnique({
        where: { id },
        include: { host: true }
      });

      if (!meeting) {
        return res.status(404).json({
          success: false,
          message: 'Meeting not found'
        });
      }

      if (meeting.hostId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Only meeting host can kick participants'
        });
      }

      // Find and update participant
      const participant = await prisma.meetingParticipant.findUnique({
        where: {
          meetingId_empId: {
            meetingId: id,
            empId
          }
        }
      });

      if (!participant) {
        return res.status(404).json({
          success: false,
          message: 'Participant not found in this meeting'
        });
      }

      // Mark participant as left
      await meetingService.markLeave({
        meetingId: id,
        empId
      });

      logger.info('Admin kicked participant', {
        adminId: req.user.id,
        meetingId: id,
        kickedEmpId: empId
      });

      res.json({
        success: true,
        message: 'Participant kicked successfully'
      });
    } catch (error) {
      logger.error('Error kicking participant', {
        adminId: req.user?.id,
        meetingId: req.params.id,
        empId: req.body.empId,
        error: error.message
      });

      res.status(500).json({
        success: false,
        message: 'Failed to kick participant',
        error: error.message
      });
    }
  }

  /**
   * Ban participant from meeting
   * POST /admin/meetings/:id/ban
   */
  async banParticipant(req, res) {
    try {
      const { id } = req.params;
      const { empId } = req.body;

      if (!empId) {
        return res.status(400).json({
          success: false,
          message: 'Employee ID is required'
        });
      }

      // Verify meeting exists and user is host
      const meeting = await prisma.meeting.findUnique({
        where: { id },
        include: { host: true }
      });

      if (!meeting) {
        return res.status(404).json({
          success: false,
          message: 'Meeting not found'
        });
      }

      if (meeting.hostId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Only meeting host can ban participants'
        });
      }

      // Find and ban participant
      const participant = await prisma.meetingParticipant.findUnique({
        where: {
          meetingId_empId: {
            meetingId: id,
            empId
          }
        }
      });

      if (!participant) {
        return res.status(404).json({
          success: false,
          message: 'Participant not found in this meeting'
        });
      }

      if (participant.isBanned) {
        return res.status(400).json({
          success: false,
          message: 'Participant is already banned'
        });
      }

      // Ban participant
      await prisma.meetingParticipant.update({
        where: { id: participant.id },
        data: { isBanned: true }
      });

      logger.info('Admin banned participant', {
        adminId: req.user.id,
        meetingId: id,
        bannedEmpId: empId
      });

      res.json({
        success: true,
        message: 'Participant banned successfully'
      });
    } catch (error) {
      logger.error('Error banning participant', {
        adminId: req.user?.id,
        meetingId: req.params.id,
        empId: req.body.empId,
        error: error.message
      });

      res.status(500).json({
        success: false,
        message: 'Failed to ban participant',
        error: error.message
      });
    }
  }

  /**
   * Get meeting attendance report
   * GET /admin/meetings/:id/attendance
   */
  async getMeetingAttendance(req, res) {
    try {
      const { id } = req.params;

      if (!id || id.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Meeting ID is required'
        });
      }

      const attendanceReport = await meetingService.getMeetingAttendance(id);

      logger.info('Admin retrieved meeting attendance', {
        adminId: req.user.id,
        meetingId: id,
        totalParticipants: attendanceReport.summary.totalParticipants
      });

      res.json({
        success: true,
        message: 'Meeting attendance retrieved successfully',
        data: attendanceReport
      });
    } catch (error) {
      logger.error('Error getting meeting attendance', {
        adminId: req.user?.id,
        meetingId: req.params.id,
        error: error.message
      });

      if (error.message.includes('Meeting not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to get meeting attendance',
        error: error.message
      });
    }
  }

  /**
   * Send meeting invites to employees
   * POST /admin/meetings/:id/remind
   */
  async sendMeetingInvites(req, res) {
    try {
      const { id } = req.params;
      const { empIds, message } = req.body;

      if (!empIds || !Array.isArray(empIds) || empIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Employee IDs array is required and must not be empty'
        });
      }

      const inviteResult = await meetingSchedulingService.sendMeetingInvite({
        meetingId: id,
        empIds,
        message
      });

      logger.info('Admin sent meeting invites', {
        adminId: req.user.id,
        meetingId: id,
        totalInvites: inviteResult.totalInvites,
        successfulEmails: inviteResult.successfulEmails
      });

      res.json({
        success: true,
        message: 'Meeting invites sent successfully',
        data: inviteResult
      });
    } catch (error) {
      logger.error('Error sending meeting invites', {
        adminId: req.user?.id,
        meetingId: req.params.id,
        error: error.message
      });

      if (error.message.includes('Meeting not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('Cannot send invites for ended')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('No valid employees found')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to send meeting invites',
        error: error.message
      });
    }
  }

  /**
   * Get scheduled meetings with date range filters
   * GET /admin/meetings?from=...&to=...&status=...
   */
  async getScheduledMeetings(req, res) {
    try {
      const {
        from,
        to,
        status,
        hostId,
        page = 1,
        limit = 20
      } = req.query;

      // Parse and validate pagination
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);

      if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
        return res.status(400).json({
          success: false,
          message: 'Invalid pagination parameters'
        });
      }

      // Parse dates if provided
      const parsedFrom = from ? new Date(from) : undefined;
      const parsedTo = to ? new Date(to) : undefined;

      // Validate date logic
      if (parsedFrom && parsedTo && parsedFrom >= parsedTo) {
        return res.status(400).json({
          success: false,
          message: 'From date must be before to date'
        });
      }

      const result = await meetingSchedulingService.getScheduledMeetings({
        from: parsedFrom,
        to: parsedTo,
        status,
        hostId,
        page: pageNum,
        limit: limitNum
      });

      logger.info('Admin retrieved scheduled meetings', {
        adminId: req.user.id,
        filters: { from, to, status, hostId },
        page: pageNum,
        limit: limitNum
      });

      res.json({
        success: true,
        message: 'Scheduled meetings retrieved successfully',
        data: result
      });
    } catch (error) {
      logger.error('Error getting scheduled meetings', {
        adminId: req.user?.id,
        error: error.message
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve scheduled meetings',
        error: error.message
      });
    }
  }

  /**
   * Send meeting reminders for upcoming meetings
   * POST /admin/meetings/reminders
   */
  async sendMeetingReminders(req, res) {
    try {
      const { minutesAhead = 15 } = req.body;

      if (minutesAhead < 1 || minutesAhead > 1440) {
        return res.status(400).json({
          success: false,
          message: 'Minutes ahead must be between 1 and 1440 (24 hours)'
        });
      }

      const reminderResult = await meetingSchedulingService.sendMeetingReminders({
        minutesAhead
      });

      logger.info('Admin sent meeting reminders', {
        adminId: req.user.id,
        minutesAhead,
        totalMeetings: reminderResult.totalMeetings,
        totalReminders: reminderResult.totalReminders
      });

      res.json({
        success: true,
        message: 'Meeting reminders sent successfully',
        data: reminderResult
      });
    } catch (error) {
      logger.error('Error sending meeting reminders', {
        adminId: req.user?.id,
        error: error.message
      });

      res.status(500).json({
        success: false,
        message: 'Failed to send meeting reminders',
        error: error.message
      });
    }
  }
}

module.exports = new MeetingController();

