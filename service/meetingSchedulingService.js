const { prisma } = require('../config/prismaConfig');
const mailOptions = require('./emailService');
const logger = require('../utils/logger');

/**
 * Meeting Scheduling Service
 * Handles meeting scheduling, reminders, and email notifications
 */

class MeetingSchedulingService {
  /**
   * Send meeting invite emails to selected employees
   * @param {Object} params - Invite parameters
   * @param {string} params.meetingId - Meeting ID
   * @param {string[]} params.empIds - Array of employee IDs to invite
   * @param {string} params.message - Custom message for the invite (optional)
   * @returns {Promise<Object>} Invite result
   */
  async sendMeetingInvite({ meetingId, empIds, message = '' }) {
    try {
      // Validate meeting exists
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

      if (meeting.status === 'ENDED' || meeting.status === 'CANCELED') {
        throw new Error('Cannot send invites for ended or canceled meeting');
      }

      // Get employee details
      const employees = await prisma.employee.findMany({
        where: {
          id: { in: empIds },
          isActive: true
        },
        select: {
          id: true,
          empName: true,
          empEmail: true,
          empTechnology: true
        }
      });

      if (employees.length === 0) {
        throw new Error('No valid employees found to invite');
      }

      // Create or update meeting participants
      const participantPromises = employees.map(emp => 
        prisma.meetingParticipant.upsert({
          where: {
            meetingId_empId: {
              meetingId,
              empId: emp.id
            }
          },
          update: {
            role: 'PARTICIPANT'
          },
          create: {
            meetingId,
            empId: emp.id,
            role: 'PARTICIPANT'
          }
        })
      );

      await Promise.all(participantPromises);

      // Send email invites
      const emailPromises = employees.map(emp => {
        const subject = `Meeting Invitation: ${meeting.title}`;
        const customMessage = message || `You have been invited to join "${meeting.title}" by ${meeting.host.empName}.`;
        
        return this.sendInviteEmail({
          to: emp.empEmail,
          subject,
          meeting,
          employee: emp,
          host: meeting.host,
          message: customMessage
        });
      });

      const emailResults = await Promise.allSettled(emailPromises);
      const successfulEmails = emailResults.filter(result => result.status === 'fulfilled').length;
      const failedEmails = emailResults.filter(result => result.status === 'rejected').length;

      logger.info('Meeting invites sent', {
        meetingId,
        totalInvites: employees.length,
        successfulEmails,
        failedEmails
      });

      return {
        success: true,
        meetingId,
        totalInvites: employees.length,
        successfulEmails,
        failedEmails,
        employees: employees.map(emp => ({
          id: emp.id,
          name: emp.empName,
          email: emp.empEmail
        }))
      };
    } catch (error) {
      logger.error('Error sending meeting invites', {
        meetingId,
        empIds,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Send individual invite email
   * @param {Object} params - Email parameters
   * @param {string} params.to - Recipient email
   * @param {string} params.subject - Email subject
   * @param {Object} params.meeting - Meeting details
   * @param {Object} params.employee - Employee details
   * @param {Object} params.host - Host details
   * @param {string} params.message - Custom message
   * @returns {Promise<boolean>} Email send result
   */
  async sendInviteEmail({ to, subject, meeting, employee, host, message }) {
    try {
      const htmlContent = this.generateInviteEmailHTML({
        meeting,
        employee,
        host,
        message
      });

      await mailOptions(to, subject, 'invited', message, null);
      
      return true;
    } catch (error) {
      logger.error('Error sending invite email', {
        to,
        meetingId: meeting.id,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Generate HTML content for meeting invite email
   * @param {Object} params - Email content parameters
   * @returns {string} HTML content
   */
  generateInviteEmailHTML({ meeting, employee, host, message }) {
    const scheduledStart = meeting.scheduledStart ? new Date(meeting.scheduledStart).toLocaleString() : 'TBD';
    const scheduledEnd = meeting.scheduledEnd ? new Date(meeting.scheduledEnd).toLocaleString() : 'TBD';
    
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #007bff; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f8f9fa; padding: 20px; border-radius: 0 0 5px 5px; }
          .meeting-details { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #007bff; }
          .room-code { background: #e9ecef; padding: 10px; border-radius: 3px; font-family: monospace; font-weight: bold; }
          .footer { text-align: center; margin-top: 20px; color: #6c757d; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Meeting Invitation</h1>
          </div>
          <div class="content">
            <p>Hello ${employee.empName},</p>
            
            <p>${message}</p>
            
            <div class="meeting-details">
              <h3>Meeting Details:</h3>
              <p><strong>Title:</strong> ${meeting.title}</p>
              <p><strong>Host:</strong> ${host.empName}</p>
              <p><strong>Type:</strong> ${meeting.type}</p>
              <p><strong>Scheduled Start:</strong> ${scheduledStart}</p>
              <p><strong>Scheduled End:</strong> ${scheduledEnd}</p>
              <p><strong>Room Code:</strong> <span class="room-code">${meeting.roomCode}</span></p>
              ${meeting.description ? `<p><strong>Description:</strong> ${meeting.description}</p>` : ''}
            </div>
            
            <p>Please join the meeting using the room code above when it's time to start.</p>
            
            <p>Best regards,<br>Employee Monitoring System</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Get meetings within a time range for scheduling
   * @param {Object} params - Filter parameters
   * @param {Date} params.from - Start date
   * @param {Date} params.to - End date
   * @param {string} params.status - Meeting status filter
   * @param {string} params.hostId - Host ID filter
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   * @returns {Promise<Object>} Paginated meetings
   */
  async getScheduledMeetings({ from, to, status, hostId, page = 1, limit = 20 }) {
    try {
      const skip = (page - 1) * limit;

      // Build where clause
      const where = {};
      
      if (from || to) {
        where.scheduledStart = {};
        if (from) where.scheduledStart.gte = from;
        if (to) where.scheduledStart.lte = to;
      }
      
      if (status) where.status = status;
      if (hostId) where.hostId = hostId;

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
          orderBy: { scheduledStart: 'asc' },
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
      logger.error('Error getting scheduled meetings', {
        filters: { from, to, status, hostId },
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get upcoming meetings for an employee
   * @param {Object} params - Filter parameters
   * @param {string} params.empId - Employee ID
   * @param {number} params.minutesAhead - Minutes ahead to look (default: 30)
   * @returns {Promise<Array>} Upcoming meetings
   */
  async getUpcomingMeetings({ empId, minutesAhead = 30 }) {
    try {
      const now = new Date();
      const futureTime = new Date(now.getTime() + minutesAhead * 60 * 1000);

      const meetings = await prisma.meeting.findMany({
        where: {
          OR: [
            { hostId: empId },
            {
              participants: {
                some: { empId }
              }
            }
          ],
          status: { in: ['SCHEDULED', 'LIVE'] },
          scheduledStart: {
            gte: now,
            lte: futureTime
          }
        },
        include: {
          host: {
            select: {
              id: true,
              empName: true,
              empEmail: true
            }
          }
        },
        orderBy: { scheduledStart: 'asc' }
      });

      return meetings;
    } catch (error) {
      logger.error('Error getting upcoming meetings', {
        empId,
        minutesAhead,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Send reminder emails for meetings starting soon
   * @param {Object} params - Reminder parameters
   * @param {number} params.minutesAhead - Minutes ahead to send reminders (default: 15)
   * @returns {Promise<Object>} Reminder result
   */
  async sendMeetingReminders({ minutesAhead = 15 }) {
    try {
      const now = new Date();
      const reminderTime = new Date(now.getTime() + minutesAhead * 60 * 1000);

      // Find meetings starting soon
      const upcomingMeetings = await prisma.meeting.findMany({
        where: {
          status: 'SCHEDULED',
          scheduledStart: {
            gte: now,
            lte: reminderTime
          }
        },
        include: {
          host: {
            select: {
              id: true,
              empName: true,
              empEmail: true
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
        }
      });

      let totalReminders = 0;
      let successfulReminders = 0;

      for (const meeting of upcomingMeetings) {
        const participants = meeting.participants.map(p => p.employee);
        
        // Send reminders to all participants
        const reminderPromises = participants.map(participant => {
          const subject = `Reminder: ${meeting.title} starts in ${minutesAhead} minutes`;
          const message = `This is a reminder that "${meeting.title}" starts in ${minutesAhead} minutes. Please join using room code: ${meeting.roomCode}`;
          
          return this.sendInviteEmail({
            to: participant.empEmail,
            subject,
            meeting,
            employee: participant,
            host: meeting.host,
            message
          });
        });

        const results = await Promise.allSettled(reminderPromises);
        totalReminders += participants.length;
        successfulReminders += results.filter(r => r.status === 'fulfilled' && r.value).length;
      }

      logger.info('Meeting reminders sent', {
        totalMeetings: upcomingMeetings.length,
        totalReminders,
        successfulReminders
      });

      return {
        success: true,
        totalMeetings: upcomingMeetings.length,
        totalReminders,
        successfulReminders
      };
    } catch (error) {
      logger.error('Error sending meeting reminders', {
        minutesAhead,
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = new MeetingSchedulingService();

