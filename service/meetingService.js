const { prisma } = require('../config/prismaConfig');
const { generateShortcode } = require('../utils/shortcode');
const { hashMeetingPassword, verifyMeetingPassword } = require('../utils/hash');
const logger = require('../utils/logger');

/**
 * Meeting Service - Business Logic for Meeting Operations
 * Shared between admin and employee apps
 */

class MeetingService {
  /**
   * Create a new meeting
   * @param {Object} params - Meeting creation parameters
   * @param {string} params.hostId - Employee ID of the host
   * @param {string} params.title - Meeting title
   * @param {string} params.description - Meeting description (optional)
   * @param {string} params.type - Meeting type (BASIC, NORMAL, LONG)
   * @param {Date} params.scheduledStart - Scheduled start time (optional)
   * @param {Date} params.scheduledEnd - Scheduled end time (optional)
   * @param {string} params.password - Meeting password (optional)
   * @param {boolean} params.isPersistent - Whether meeting is persistent (optional)
   * @returns {Promise<Object>} Created meeting
   */
  async createMeeting({ hostId, title, description, type, scheduledStart, scheduledEnd, password, isPersistent = false }) {
    try {
      // Validate host exists
      const host = await prisma.employee.findUnique({
        where: { id: hostId, isActive: true }
      });

      if (!host) {
        throw new Error('Host not found or inactive');
      }

      // Generate unique room code
      let roomCode;
      let attempts = 0;
      const maxAttempts = 10;

      do {
        roomCode = generateShortcode();
        attempts++;
        
        const existingMeeting = await prisma.meeting.findUnique({
          where: { roomCode }
        });

        if (!existingMeeting) break;
      } while (attempts < maxAttempts);

      if (attempts >= maxAttempts) {
        throw new Error('Failed to generate unique room code');
      }

      // Hash password if provided
      const passwordHash = password ? await hashMeetingPassword(password) : null;

      // Create meeting
      const meeting = await prisma.meeting.create({
        data: {
          title,
          description,
          type,
          hostId,
          roomCode,
          passwordHash,
          scheduledStart,
          scheduledEnd,
          isPersistent,
          status: 'SCHEDULED'
        },
        include: {
          host: {
            select: {
              id: true,
              empName: true,
              empEmail: true,
              empTechnology: true
            }
          }
        }
      });

      logger.info('Meeting created successfully', {
        meetingId: meeting.id,
        roomCode: meeting.roomCode,
        hostId: meeting.hostId,
        type: meeting.type
      });

      return meeting;
    } catch (error) {
      logger.error('Error creating meeting', {
        hostId,
        title,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Update an existing meeting
   * @param {Object} params - Update parameters
   * @param {string} params.meetingId - Meeting ID
   * @param {string} params.byEmpId - Employee ID making the update
   * @param {string} params.title - New title (optional)
   * @param {string} params.description - New description (optional)
   * @param {string} params.type - New type (optional)
   * @param {Date} params.scheduledStart - New scheduled start (optional)
   * @param {Date} params.scheduledEnd - New scheduled end (optional)
   * @param {string} params.password - New password (optional)
   * @param {boolean} params.isPersistent - New persistence setting (optional)
   * @returns {Promise<Object>} Updated meeting
   */
  async updateMeeting({ meetingId, byEmpId, title, description, type, scheduledStart, scheduledEnd, password, isPersistent }) {
    try {
      // Find meeting and verify permissions
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
        include: { host: true }
      });

      if (!meeting) {
        throw new Error('Meeting not found');
      }

      if (meeting.hostId !== byEmpId) {
        throw new Error('Only meeting host can update meeting');
      }

      if (meeting.status === 'ENDED' || meeting.status === 'CANCELED') {
        throw new Error('Cannot update ended or canceled meeting');
      }

      // Prepare update data
      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (type !== undefined) updateData.type = type;
      if (scheduledStart !== undefined) updateData.scheduledStart = scheduledStart;
      if (scheduledEnd !== undefined) updateData.scheduledEnd = scheduledEnd;
      if (isPersistent !== undefined) updateData.isPersistent = isPersistent;

      // Handle password update
      if (password !== undefined) {
        updateData.passwordHash = password ? await hashMeetingPassword(password) : null;
      }

      // Update meeting
      const updatedMeeting = await prisma.meeting.update({
        where: { id: meetingId },
        data: updateData,
        include: {
          host: {
            select: {
              id: true,
              empName: true,
              empEmail: true,
              empTechnology: true
            }
          }
        }
      });

      logger.info('Meeting updated successfully', {
        meetingId,
        updatedBy: byEmpId,
        updatedFields: Object.keys(updateData)
      });

      return updatedMeeting;
    } catch (error) {
      logger.error('Error updating meeting', {
        meetingId,
        byEmpId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Cancel a meeting
   * @param {Object} params - Cancel parameters
   * @param {string} params.meetingId - Meeting ID
   * @param {string} params.byEmpId - Employee ID canceling the meeting
   * @returns {Promise<Object>} Canceled meeting
   */
  async cancelMeeting({ meetingId, byEmpId }) {
    try {
      // Find meeting and verify permissions
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
        include: { host: true }
      });

      if (!meeting) {
        throw new Error('Meeting not found');
      }

      if (meeting.hostId !== byEmpId) {
        throw new Error('Only meeting host can cancel meeting');
      }

      if (meeting.status === 'ENDED' || meeting.status === 'CANCELED') {
        throw new Error('Meeting is already ended or canceled');
      }

      // Cancel meeting
      const canceledMeeting = await prisma.meeting.update({
        where: { id: meetingId },
        data: { status: 'CANCELED' },
        include: {
          host: {
            select: {
              id: true,
              empName: true,
              empEmail: true,
              empTechnology: true
            }
          }
        }
      });

      logger.info('Meeting canceled successfully', {
        meetingId,
        canceledBy: byEmpId
      });

      return canceledMeeting;
    } catch (error) {
      logger.error('Error canceling meeting', {
        meetingId,
        byEmpId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Start a meeting
   * @param {Object} params - Start parameters
   * @param {string} params.meetingId - Meeting ID
   * @param {string} params.byEmpId - Employee ID starting the meeting
   * @returns {Promise<Object>} Started meeting
   */
  async startMeeting({ meetingId, byEmpId }) {
    try {
      // Find meeting and verify permissions
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
        include: { host: true }
      });

      if (!meeting) {
        throw new Error('Meeting not found');
      }

      if (meeting.hostId !== byEmpId) {
        throw new Error('Only meeting host can start meeting');
      }

      if (meeting.status === 'LIVE') {
        throw new Error('Meeting is already live');
      }

      if (meeting.status === 'ENDED' || meeting.status === 'CANCELED') {
        throw new Error('Cannot start ended or canceled meeting');
      }

      // Start meeting
      const startedMeeting = await prisma.meeting.update({
        where: { id: meetingId },
        data: {
          status: 'LIVE',
          actualStart: new Date()
        },
        include: {
          host: {
            select: {
              id: true,
              empName: true,
              empEmail: true,
              empTechnology: true
            }
          }
        }
      });

      logger.info('Meeting started successfully', {
        meetingId,
        startedBy: byEmpId
      });

      return startedMeeting;
    } catch (error) {
      logger.error('Error starting meeting', {
        meetingId,
        byEmpId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * End a meeting
   * @param {Object} params - End parameters
   * @param {string} params.meetingId - Meeting ID
   * @param {string} params.byEmpId - Employee ID ending the meeting
   * @returns {Promise<Object>} Ended meeting
   */
  async endMeeting({ meetingId, byEmpId }) {
    try {
      // Find meeting and verify permissions
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
        include: { host: true }
      });

      if (!meeting) {
        throw new Error('Meeting not found');
      }

      if (meeting.hostId !== byEmpId) {
        throw new Error('Only meeting host can end meeting');
      }

      if (meeting.status === 'ENDED' || meeting.status === 'CANCELED') {
        throw new Error('Meeting is already ended or canceled');
      }

      const now = new Date();

      // Recompute attendance for still-connected participants
      const activeParticipants = await prisma.meetingParticipant.findMany({
        where: {
          meetingId,
          joinedAt: { not: null },
          leftAt: null
        }
      });

      // Update attendance for each active participant
      for (const participant of activeParticipants) {
        const duration = Math.floor((now - participant.joinedAt) / 1000);
        const totalAttendance = (participant.attendanceSec || 0) + duration;

        await prisma.meetingParticipant.update({
          where: { id: participant.id },
          data: {
            leftAt: now,
            attendanceSec: totalAttendance
          }
        });
      }

      // End meeting
      const endedMeeting = await prisma.meeting.update({
        where: { id: meetingId },
        data: {
          status: 'ENDED',
          actualEnd: now
        },
        include: {
          host: {
            select: {
              id: true,
              empName: true,
              empEmail: true,
              empTechnology: true
            }
          }
        }
      });

      logger.info('Meeting ended successfully', {
        meetingId,
        endedBy: byEmpId,
        activeParticipantsCount: activeParticipants.length
      });

      return endedMeeting;
    } catch (error) {
      logger.error('Error ending meeting', {
        meetingId,
        byEmpId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get meeting by room code
   * @param {string} roomCode - Room code
   * @returns {Promise<Object|null>} Meeting or null
   */
  async getMeetingByCode(roomCode) {
    try {
      const meeting = await prisma.meeting.findUnique({
        where: { roomCode },
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
          }
        }
      });

      return meeting;
    } catch (error) {
      logger.error('Error getting meeting by code', {
        roomCode,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * List meetings for admin with filters
   * @param {Object} params - Filter parameters
   * @param {string} params.hostId - Filter by host ID (optional)
   * @param {string} params.type - Filter by meeting type (optional)
   * @param {string} params.status - Filter by status (optional)
   * @param {Date} params.startDate - Filter by start date (optional)
   * @param {Date} params.endDate - Filter by end date (optional)
   * @param {number} params.page - Page number (default: 1)
   * @param {number} params.limit - Items per page (default: 20)
   * @returns {Promise<Object>} Paginated meetings
   */
  async listMeetingsForAdmin({ hostId, type, status, startDate, endDate, page = 1, limit = 20 }) {
    try {
      const skip = (page - 1) * limit;

      // Build where clause
      const where = {};
      if (hostId) where.hostId = hostId;
      if (type) where.type = type;
      if (status) where.status = status;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      // Get meetings with pagination
      const [meetings, total] = await Promise.all([
        prisma.meeting.findMany({
          where,
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
                    empEmail: true
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.meeting.count({ where })
      ]);

      return {
        meetings,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error listing meetings for admin', {
        filters: { hostId, type, status, startDate, endDate },
        error: error.message
      });
      throw error;
    }
  }

  /**
   * List meetings for employee
   * @param {Object} params - Filter parameters
   * @param {string} params.empId - Employee ID
   * @param {string} params.type - Filter by meeting type (optional)
   * @param {string} params.status - Filter by status (optional)
   * @param {number} params.page - Page number (default: 1)
   * @param {number} params.limit - Items per page (default: 20)
   * @returns {Promise<Object>} Paginated meetings
   */
  async listMeetingsForEmployee({ empId, type, status, page = 1, limit = 20 }) {
    try {
      const skip = (page - 1) * limit;

      // Build where clause for meetings where employee is host or participant
      const where = {
        OR: [
          { hostId: empId },
          {
            participants: {
              some: { empId }
            }
          }
        ]
      };

      if (type) where.type = type;
      if (status) where.status = status;

      // Get meetings with pagination
      const [meetings, total] = await Promise.all([
        prisma.meeting.findMany({
          where,
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
              where: { empId },
              include: {
                employee: {
                  select: {
                    id: true,
                    empName: true,
                    empEmail: true
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.meeting.count({ where })
      ]);

      return {
        meetings,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error listing meetings for employee', {
        empId,
        filters: { type, status },
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Check if employee can join meeting
   * @param {Object} params - Join check parameters
   * @param {Object} params.meeting - Meeting object
   * @param {string} params.empId - Employee ID
   * @param {string} params.password - Meeting password (optional)
   * @returns {Promise<Object>} Join permission result
   */
  async canJoin({ meeting, empId, password }) {
    try {
      // Check if meeting exists and is active
      if (!meeting) {
        return { canJoin: false, reason: 'Meeting not found' };
      }

      if (meeting.status === 'ENDED' || meeting.status === 'CANCELED') {
        return { canJoin: false, reason: 'Meeting has ended or been canceled' };
      }

      // Check if employee is banned
      const participant = await prisma.meetingParticipant.findUnique({
        where: {
          meetingId_empId: {
            meetingId: meeting.id,
            empId
          }
        }
      });

      if (participant && participant.isBanned) {
        return { canJoin: false, reason: 'You are banned from this meeting' };
      }

      // Check password if required
      if (meeting.passwordHash) {
        if (!password) {
          return { canJoin: false, reason: 'Meeting password required' };
        }

        const passwordValid = await verifyMeetingPassword(password, meeting.passwordHash);
        if (!passwordValid) {
          return { canJoin: false, reason: 'Invalid meeting password' };
        }
      }

      return { canJoin: true };
    } catch (error) {
      logger.error('Error checking join permission', {
        meetingId: meeting?.id,
        empId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Mark employee as joined to meeting
   * @param {Object} params - Join parameters
   * @param {string} params.meetingId - Meeting ID
   * @param {string} params.empId - Employee ID
   * @param {string} params.timeSheetId - Timesheet ID (optional)
   * @returns {Promise<Object>} Join result
   */
  async markJoin({ meetingId, empId, timeSheetId }) {
    try {
      // Check if already joined
      const existingParticipant = await prisma.meetingParticipant.findUnique({
        where: {
          meetingId_empId: {
            meetingId,
            empId
          }
        }
      });

      if (existingParticipant) {
        // Update join time if not already set
        if (!existingParticipant.joinedAt) {
          await prisma.meetingParticipant.update({
            where: { id: existingParticipant.id },
            data: { joinedAt: new Date() }
          });
        }
        return { success: true, participant: existingParticipant };
      }

      // Find active timesheet for today if not provided
      let linkedTimeSheetId = timeSheetId;
      if (!linkedTimeSheetId) {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1);

        const activeTimeSheet = await prisma.timeSheet.findFirst({
          where: {
            empId,
            createdAt: {
              gte: startOfDay,
              lte: endOfDay
            },
            isActive: true
          },
          orderBy: { createdAt: 'desc' }
        });

        if (activeTimeSheet) {
          linkedTimeSheetId = activeTimeSheet.id;
        }
      }

      // Create new participant
      const participant = await prisma.meetingParticipant.create({
        data: {
          meetingId,
          empId,
          joinedAt: new Date(),
          timeSheetId: linkedTimeSheetId
        },
        include: {
          employee: {
            select: {
              id: true,
              empName: true,
              empEmail: true,
              empTechnology: true
            }
          },
          timeSheet: {
            select: {
              id: true,
              clockIn: true,
              clockOut: true,
              status: true
            }
          }
        }
      });

      logger.info('Employee joined meeting', {
        meetingId,
        empId,
        timeSheetId: linkedTimeSheetId
      });

      return { success: true, participant };
    } catch (error) {
      logger.error('Error marking employee join', {
        meetingId,
        empId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Mark employee as left meeting
   * @param {Object} params - Leave parameters
   * @param {string} params.meetingId - Meeting ID
   * @param {string} params.empId - Employee ID
   * @returns {Promise<Object>} Leave result
   */
  async markLeave({ meetingId, empId }) {
    try {
      const participant = await prisma.meetingParticipant.findUnique({
        where: {
          meetingId_empId: {
            meetingId,
            empId
          }
        }
      });

      if (!participant) {
        throw new Error('Participant not found');
      }

      const now = new Date();
      const leftAt = participant.leftAt || now;

      // Calculate attendance duration
      let attendanceSec = participant.attendanceSec || 0;
      if (participant.joinedAt && !participant.leftAt) {
        const duration = Math.floor((leftAt - participant.joinedAt) / 1000);
        attendanceSec += duration;
      }

      // Update participant
      const updatedParticipant = await prisma.meetingParticipant.update({
        where: { id: participant.id },
        data: {
          leftAt,
          attendanceSec
        },
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
      });

      logger.info('Employee left meeting', {
        meetingId,
        empId,
        attendanceSec: updatedParticipant.attendanceSec
      });

      return { success: true, participant: updatedParticipant };
    } catch (error) {
      logger.error('Error marking employee leave', {
        meetingId,
        empId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get meeting attendance report for admin
   * @param {string} meetingId - Meeting ID
   * @returns {Promise<Object>} Attendance report
   */
  async getMeetingAttendance(meetingId) {
    try {
      // Verify meeting exists
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
        include: {
          host: {
            select: {
              id: true,
              empName: true,
              empEmail: true
            }
          }
        }
      });

      if (!meeting) {
        throw new Error('Meeting not found');
      }

      // Get all participants with attendance data
      const participants = await prisma.meetingParticipant.findMany({
        where: { meetingId },
        include: {
          employee: {
            select: {
              id: true,
              empName: true,
              empEmail: true,
              empTechnology: true
            }
          },
          timeSheet: {
            select: {
              id: true,
              clockIn: true,
              clockOut: true,
              status: true,
              createdAt: true
            }
          }
        },
        orderBy: { joinedAt: 'asc' }
      });

      // Calculate summary statistics
      const totalParticipants = participants.length;
      const activeParticipants = participants.filter(p => !p.leftAt).length;
      const totalAttendanceSeconds = participants.reduce((sum, p) => sum + (p.attendanceSec || 0), 0);
      const linkedTimeSheets = participants.filter(p => p.timeSheetId).length;

      const attendanceReport = {
        meeting: {
          id: meeting.id,
          title: meeting.title,
          roomCode: meeting.roomCode,
          status: meeting.status,
          scheduledStart: meeting.scheduledStart,
          scheduledEnd: meeting.scheduledEnd,
          actualStart: meeting.actualStart,
          actualEnd: meeting.actualEnd,
          host: meeting.host
        },
        summary: {
          totalParticipants,
          activeParticipants,
          totalAttendanceSeconds,
          totalAttendanceMinutes: Math.round(totalAttendanceSeconds / 60),
          totalAttendanceHours: Math.round(totalAttendanceSeconds / 3600 * 100) / 100,
          linkedTimeSheets,
          linkRate: totalParticipants > 0 ? Math.round((linkedTimeSheets / totalParticipants) * 100) : 0
        },
        participants: participants.map(p => ({
          id: p.id,
          empId: p.empId,
          role: p.role,
          joinedAt: p.joinedAt,
          leftAt: p.leftAt,
          attendanceSec: p.attendanceSec || 0,
          attendanceMinutes: Math.round((p.attendanceSec || 0) / 60),
          isActive: !p.leftAt,
          isBanned: p.isBanned,
          timeSheetId: p.timeSheetId,
          employee: p.employee,
          timeSheet: p.timeSheet
        }))
      };

      logger.info('Meeting attendance report generated', {
        meetingId,
        totalParticipants,
        activeParticipants,
        totalAttendanceSeconds
      });

      return attendanceReport;
    } catch (error) {
      logger.error('Error getting meeting attendance', {
        meetingId,
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = new MeetingService();


