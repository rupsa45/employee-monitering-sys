const meetingService = require('../../service/meetingService');
const meetingSchedulingService = require('../../service/meetingSchedulingService');
const meetingAuthService = require('../../service/meetingAuthService');
const { prisma } = require('../../config/prismaConfig');
const iceConfig = require('../../utils/iceConfig');
const logger = require('../../utils/logger');

/**
 * Employee Meeting Controller
 * Handles meeting operations for employees
 */

class EmpMeetingController {
  /**
   * List employee's meetings
   * GET /emp/meetings
   */
  async listMyMeetings(req, res) {
    try {
      const {
        type,
        status,
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

      const result = await meetingService.listMeetingsForEmployee({
        empId: req.user.id,
        type,
        status,
        page: pageNum,
        limit: limitNum
      });

      logger.info('Employee listed meetings', {
        empId: req.user.id,
        filters: { type, status },
        page: pageNum,
        limit: limitNum
      });

      res.json({
        success: true,
        message: 'Meetings retrieved successfully',
        data: result
      });
    } catch (error) {
      logger.error('Error listing employee meetings', {
        empId: req.user?.id,
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
   * Get meeting details by room code
   * GET /emp/meetings/:roomCode
   */
  async getMeetingByRoomCode(req, res) {
    try {
      const { roomCode } = req.params;

      const meeting = await meetingService.getMeetingByCode(roomCode);

      if (!meeting) {
        return res.status(404).json({
          success: false,
          message: 'Meeting not found'
        });
      }

      // Check if employee can join this meeting
      const canJoinResult = await meetingService.canJoin({
        meeting,
        empId: req.user.id
      });

      // Determine if employee is already a participant
      const isParticipant = meeting.participants.some(
        p => p.employee.id === req.user.id
      );

      // Get employee's role in the meeting
      let role = null;
      if (meeting.host.id === req.user.id) {
        role = 'HOST';
      } else if (isParticipant) {
        const participant = meeting.participants.find(
          p => p.employee.id === req.user.id
        );
        role = participant.role;
      }

      logger.info('Employee retrieved meeting details', {
        empId: req.user.id,
        roomCode,
        isParticipant,
        role
      });

      res.json({
        success: true,
        message: 'Meeting details retrieved successfully',
        data: {
          meeting,
          canJoin: canJoinResult.canJoin,
          reason: canJoinResult.reason,
          isParticipant,
          role
        }
      });
    } catch (error) {
      logger.error('Error getting meeting by room code', {
        empId: req.user?.id,
        roomCode: req.params.roomCode,
        error: error.message
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve meeting details',
        error: error.message
      });
    }
  }

  /**
   * Join a meeting
   * POST /emp/meetings/:roomCode/join
   */
  async joinMeeting(req, res) {
    try {
      const { roomCode } = req.params;
      const { password, timeSheetId } = req.body;

      // Get meeting details
      const meeting = await meetingService.getMeetingByCode(roomCode);

      if (!meeting) {
        return res.status(404).json({
          success: false,
          message: 'Meeting not found'
        });
      }

      // Check if employee can join
      const canJoinResult = await meetingService.canJoin({
        meeting,
        empId: req.user.id,
        password
      });

      if (!canJoinResult.canJoin) {
        return res.status(403).json({
          success: false,
          message: canJoinResult.reason
        });
      }

      // Mark employee as joined
      const joinResult = await meetingService.markJoin({
        meetingId: meeting.id,
        empId: req.user.id,
        timeSheetId
      });

      // Determine role
      let role = 'PARTICIPANT';
      if (meeting.host.id === req.user.id) {
        role = 'HOST';
      }

      // Generate meeting access token
      const meetingAccessToken = await meetingAuthService.issueMeetingAccessToken({
        meetingId: meeting.id,
        empId: req.user.id,
        role
      });

      logger.info('Employee joined meeting', {
        empId: req.user.id,
        roomCode,
        meetingId: meeting.id,
        role
      });

      res.json({
        success: true,
        message: 'Successfully joined meeting',
        data: {
          meeting,
          participant: joinResult.participant,
          role,
          meetingAccessToken,
          iceConfig
        }
      });
    } catch (error) {
      logger.error('Error joining meeting', {
        empId: req.user?.id,
        roomCode: req.params.roomCode,
        error: error.message
      });

      if (error.message.includes('Meeting not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('Employee is banned')) {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to join meeting',
        error: error.message
      });
    }
  }

  /**
   * Leave a meeting
   * POST /emp/meetings/:roomCode/leave
   */
  async leaveMeeting(req, res) {
    try {
      const { roomCode } = req.params;

      // Get meeting details
      const meeting = await meetingService.getMeetingByCode(roomCode);

      if (!meeting) {
        return res.status(404).json({
          success: false,
          message: 'Meeting not found'
        });
      }

      // Check if employee is a participant
      const isParticipant = meeting.participants.some(
        p => p.employee.id === req.user.id
      );

      if (!isParticipant) {
        return res.status(400).json({
          success: false,
          message: 'You are not a participant in this meeting'
        });
      }

      // Mark employee as left
      const leaveResult = await meetingService.markLeave({
        meetingId: meeting.id,
        empId: req.user.id
      });

      logger.info('Employee left meeting', {
        empId: req.user.id,
        roomCode,
        meetingId: meeting.id,
        attendanceSec: leaveResult.participant.attendanceSec
      });

      res.json({
        success: true,
        message: 'Successfully left meeting',
        data: {
          participant: leaveResult.participant,
          attendanceSec: leaveResult.participant.attendanceSec
        }
      });
    } catch (error) {
      logger.error('Error leaving meeting', {
        empId: req.user?.id,
        roomCode: req.params.roomCode,
        error: error.message
      });

      if (error.message.includes('Meeting not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('Participant not found')) {
        return res.status(400).json({
          success: false,
          message: 'You are not a participant in this meeting'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to leave meeting',
        error: error.message
      });
    }
  }

  /**
   * Get meeting access token
   * POST /emp/meetings/:roomCode/access-token
   */
  async getMeetingAccessToken(req, res) {
    try {
      const { roomCode } = req.params;

      // Get meeting details
      const meeting = await meetingService.getMeetingByCode(roomCode);

      if (!meeting) {
        return res.status(404).json({
          success: false,
          message: 'Meeting not found'
        });
      }

      // Check if employee is a participant or host
      const isHost = meeting.host.id === req.user.id;
      const isParticipant = meeting.participants.some(
        p => p.employee.id === req.user.id
      );

      if (!isHost && !isParticipant) {
        return res.status(403).json({
          success: false,
          message: 'You are not a participant in this meeting'
        });
      }

      // Check if participant is banned
      if (isParticipant && !isHost) {
        const participant = meeting.participants.find(
          p => p.employee.id === req.user.id
        );
        if (participant.isBanned) {
          return res.status(403).json({
            success: false,
            message: 'You are banned from this meeting'
          });
        }
      }

      // Determine role
      const role = isHost ? 'HOST' : 'PARTICIPANT';

      // Generate meeting access token
      const meetingAccessToken = await meetingAuthService.issueMeetingAccessToken({
        meetingId: meeting.id,
        empId: req.user.id,
        role
      });

      logger.info('Employee requested meeting access token', {
        empId: req.user.id,
        roomCode,
        meetingId: meeting.id,
        role
      });

      res.json({
        success: true,
        message: 'Meeting access token generated successfully',
        data: {
          meetingAccessToken,
          role,
          iceConfig
        }
      });
    } catch (error) {
      logger.error('Error generating meeting access token', {
        empId: req.user?.id,
        roomCode: req.params.roomCode,
        error: error.message
      });

      if (error.message.includes('Meeting not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('Employee is banned')) {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to generate meeting access token',
        error: error.message
      });
    }
  }

  /**
   * Get upcoming meetings for employee
   * GET /emp/meetings/upcoming
   */
  async getUpcomingMeetings(req, res) {
    try {
      const { minutesAhead = 30 } = req.query;

      // Validate minutesAhead parameter
      const minutes = parseInt(minutesAhead);
      if (isNaN(minutes) || minutes < 1 || minutes > 1440) {
        return res.status(400).json({
          success: false,
          message: 'Minutes ahead must be between 1 and 1440 (24 hours)'
        });
      }

      const meetings = await meetingSchedulingService.getUpcomingMeetings({
        empId: req.user.id,
        minutesAhead: minutes
      });

      logger.info('Employee retrieved upcoming meetings', {
        empId: req.user.id,
        minutesAhead: minutes,
        meetingCount: meetings.length
      });

      res.json({
        success: true,
        message: 'Upcoming meetings retrieved successfully',
        data: {
          meetings,
          count: meetings.length,
          minutesAhead: minutes
        }
      });
    } catch (error) {
      logger.error('Error getting upcoming meetings', {
        empId: req.user?.id,
        error: error.message
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve upcoming meetings',
        error: error.message
      });
    }
  }
}

module.exports = new EmpMeetingController();

