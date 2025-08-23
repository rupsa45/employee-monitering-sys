const { prisma } = require('../config/prismaConfig');
const mailOptions = require('./emailService');
const fs = require('fs').promises;
const path = require('path');

/**
 * Email Reminder Service
 * Handles all email notifications, reminders, and delivery tracking
 */
class EmailReminderService {
  constructor() {
    this.templateCache = new Map();
    this.deliveryQueue = [];
    this.retryAttempts = 3;
    this.retryDelay = 5000; // 5 seconds
  }

  /**
   * Send meeting invite emails to selected employees
   * @param {Object} params - Invite parameters
   * @param {string} params.meetingId - Meeting ID
   * @param {string[]} params.empIds - Array of employee IDs to invite
   * @param {string} params.message - Custom message for the invite (optional)
   * @returns {Promise<Object>} Invite result
   */
  async sendMeetingInvites({ meetingId, empIds, message = '' }) {
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

      // Send email invites with tracking
      const emailPromises = employees.map(emp => 
        this.sendMeetingInviteEmail({
          to: emp.empEmail,
          meeting,
          employee: emp,
          host: meeting.host,
          message: message || `You have been invited to join "${meeting.title}" by ${meeting.host.empName}.`
        })
      );

      const emailResults = await Promise.allSettled(emailPromises);
      const successfulEmails = emailResults.filter(result => result.status === 'fulfilled').length;
      const failedEmails = emailResults.filter(result => result.status === 'rejected').length;

      // Log email delivery results
      await this.logEmailDelivery({
        type: 'MEETING_INVITE',
        meetingId,
        totalSent: employees.length,
        successful: successfulEmails,
        failed: failedEmails
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
      throw error;
    }
  }

  /**
   * Send meeting reminder emails
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
        const reminderPromises = participants.map(participant => 
          this.sendMeetingReminderEmail({
            to: participant.empEmail,
            meeting,
            employee: participant,
            host: meeting.host,
            minutesAhead
          })
        );

        const results = await Promise.allSettled(reminderPromises);
        totalReminders += participants.length;
        successfulReminders += results.filter(r => r.status === 'fulfilled' && r.value).length;
      }

      // Log reminder delivery results
      await this.logEmailDelivery({
        type: 'MEETING_REMINDER',
        totalSent: totalReminders,
        successful: successfulReminders,
        failed: totalReminders - successfulReminders,
        minutesAhead
      });

      return {
        success: true,
        totalMeetings: upcomingMeetings.length,
        totalReminders,
        successfulReminders
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Send task reminder emails
   * @param {Object} params - Task reminder parameters
   * @param {number} params.daysAhead - Days ahead to send reminders (default: 1)
   * @returns {Promise<Object>} Task reminder result
   */
  async sendTaskReminders({ daysAhead = 1 }) {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + daysAhead);
      tomorrow.setHours(0, 0, 0, 0);

      const dayAfterTomorrow = new Date(tomorrow);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

      // Find tasks due soon
      const upcomingTasks = await prisma.task.findMany({
        where: {
          dueDate: {
            gte: tomorrow,
            lt: dayAfterTomorrow
          },
          status: {
            in: ['PENDING', 'IN_PROGRESS']
          },
          isActive: true
        },
        include: {
          assignedEmployees: {
            select: {
              id: true,
              empName: true,
              empEmail: true
            }
          }
        }
      });

      let totalReminders = 0;
      let successfulReminders = 0;

      for (const task of upcomingTasks) {
        const reminderPromises = task.assignedEmployees.map(employee => 
          this.sendTaskReminderEmail({
            to: employee.empEmail,
            task,
            employee
          })
        );

        const results = await Promise.allSettled(reminderPromises);
        totalReminders += task.assignedEmployees.length;
        successfulReminders += results.filter(r => r.status === 'fulfilled' && r.value).length;
      }

      // Log task reminder delivery results
      await this.logEmailDelivery({
        type: 'TASK_REMINDER',
        totalSent: totalReminders,
        successful: successfulReminders,
        failed: totalReminders - successfulReminders,
        daysAhead
      });

      return {
        success: true,
        totalTasks: upcomingTasks.length,
        totalReminders,
        successfulReminders
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Send meeting invite email with template
   * @param {Object} params - Email parameters
   * @returns {Promise<boolean>} Email send result
   */
  async sendMeetingInviteEmail({ to, meeting, employee, host, message }) {
    try {
      const subject = `Meeting Invitation: ${meeting.title}`;
      const htmlContent = await this.generateMeetingInviteTemplate({
        meeting,
        employee,
        host,
        message
      });

      const emailId = await this.createEmailRecord({
        type: 'MEETING_INVITE',
        to,
        subject,
        meetingId: meeting.id,
        empId: employee.id
      });

      const result = await mailOptions(to, subject, 'invited', message, null, htmlContent);
      
      if (result) {
        await this.updateEmailDeliveryStatus(emailId, 'DELIVERED');
        return true;
      } else {
        await this.updateEmailDeliveryStatus(emailId, 'FAILED');
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Send meeting reminder email with template
   * @param {Object} params - Email parameters
   * @returns {Promise<boolean>} Email send result
   */
  async sendMeetingReminderEmail({ to, meeting, employee, host, minutesAhead }) {
    try {
      const subject = `Reminder: ${meeting.title} starts in ${minutesAhead} minutes`;
      const message = `This is a reminder that "${meeting.title}" starts in ${minutesAhead} minutes. Please join using room code: ${meeting.roomCode}`;
      
      const htmlContent = await this.generateMeetingReminderTemplate({
        meeting,
        employee,
        host,
        minutesAhead
      });

      const emailId = await this.createEmailRecord({
        type: 'MEETING_REMINDER',
        to,
        subject,
        meetingId: meeting.id,
        empId: employee.id
      });

      const result = await mailOptions(to, subject, 'reminder', message, null, htmlContent);
      
      if (result) {
        await this.updateEmailDeliveryStatus(emailId, 'DELIVERED');
        return true;
      } else {
        await this.updateEmailDeliveryStatus(emailId, 'FAILED');
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Send task reminder email with template
   * @param {Object} params - Email parameters
   * @returns {Promise<boolean>} Email send result
   */
  async sendTaskReminderEmail({ to, task, employee }) {
    try {
      const subject = `Task Reminder: ${task.title}`;
      const message = `Reminder: Task "${task.title}" is due on ${new Date(task.dueDate).toLocaleDateString()}. Current status: ${task.status}`;
      
      const htmlContent = await this.generateTaskReminderTemplate({
        task,
        employee
      });

      const emailId = await this.createEmailRecord({
        type: 'TASK_REMINDER',
        to,
        subject,
        taskId: task.id,
        empId: employee.id
      });

      const result = await mailOptions(to, subject, 'task_reminder', message, null, htmlContent);
      
      if (result) {
        await this.updateEmailDeliveryStatus(emailId, 'DELIVERED');
        return true;
      } else {
        await this.updateEmailDeliveryStatus(emailId, 'FAILED');
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate meeting invite email template
   * @param {Object} params - Template parameters
   * @returns {Promise<string>} HTML content
   */
  async generateMeetingInviteTemplate({ meeting, employee, host, message }) {
    const scheduledStart = meeting.scheduledStart ? new Date(meeting.scheduledStart).toLocaleString() : 'TBD';
    const scheduledEnd = meeting.scheduledEnd ? new Date(meeting.scheduledEnd).toLocaleString() : 'TBD';
    
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Meeting Invitation</title>
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0; 
            background-color: #f4f4f4; 
          }
          .container { 
            max-width: 600px; 
            margin: 20px auto; 
            background: white; 
            border-radius: 10px; 
            overflow: hidden; 
            box-shadow: 0 4px 6px rgba(0,0,0,0.1); 
          }
          .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 30px; 
            text-align: center; 
          }
          .header h1 { 
            margin: 0; 
            font-size: 28px; 
            font-weight: 300; 
          }
          .content { 
            padding: 30px; 
          }
          .meeting-details { 
            background: #f8f9fa; 
            padding: 20px; 
            margin: 20px 0; 
            border-radius: 8px; 
            border-left: 4px solid #667eea; 
          }
          .meeting-details h3 { 
            margin-top: 0; 
            color: #667eea; 
          }
          .room-code { 
            background: #e9ecef; 
            padding: 12px; 
            border-radius: 6px; 
            font-family: 'Courier New', monospace; 
            font-weight: bold; 
            color: #495057; 
            display: inline-block; 
            margin: 5px 0; 
          }
          .button { 
            display: inline-block; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 15px 30px; 
            text-decoration: none; 
            border-radius: 25px; 
            font-weight: 600; 
            margin: 20px 0; 
            transition: transform 0.2s; 
          }
          .button:hover { 
            transform: translateY(-2px); 
          }
          .footer { 
            background: #f8f9fa; 
            padding: 20px; 
            text-align: center; 
            color: #6c757d; 
            font-size: 14px; 
          }
          .detail-row { 
            margin: 10px 0; 
          }
          .detail-label { 
            font-weight: 600; 
            color: #495057; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📅 Meeting Invitation</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${employee.empName}</strong>,</p>
            
            <p>${message}</p>
            
            <div class="meeting-details">
              <h3>📋 Meeting Details</h3>
              <div class="detail-row">
                <span class="detail-label">Title:</span> ${meeting.title}
              </div>
              <div class="detail-row">
                <span class="detail-label">Host:</span> ${host.empName}
              </div>
              <div class="detail-row">
                <span class="detail-label">Type:</span> ${meeting.type}
              </div>
              <div class="detail-row">
                <span class="detail-label">Start Time:</span> ${scheduledStart}
              </div>
              <div class="detail-row">
                <span class="detail-label">End Time:</span> ${scheduledEnd}
              </div>
              <div class="detail-row">
                <span class="detail-label">Room Code:</span> 
                <span class="room-code">${meeting.roomCode}</span>
              </div>
              ${meeting.description ? `
                <div class="detail-row">
                  <span class="detail-label">Description:</span> ${meeting.description}
                </div>
              ` : ''}
            </div>
            
            <p>Please join the meeting using the room code above when it's time to start.</p>
            
            <a href="#" class="button">🎥 Join Meeting</a>
            
            <p>Best regards,<br><strong>Employee Monitoring System</strong></p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>© 2024 Employee Monitoring System. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate meeting reminder email template
   * @param {Object} params - Template parameters
   * @returns {Promise<string>} HTML content
   */
  async generateMeetingReminderTemplate({ meeting, employee, host, minutesAhead }) {
    const scheduledStart = meeting.scheduledStart ? new Date(meeting.scheduledStart).toLocaleString() : 'TBD';
    
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Meeting Reminder</title>
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0; 
            background-color: #f4f4f4; 
          }
          .container { 
            max-width: 600px; 
            margin: 20px auto; 
            background: white; 
            border-radius: 10px; 
            overflow: hidden; 
            box-shadow: 0 4px 6px rgba(0,0,0,0.1); 
          }
          .header { 
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); 
            color: white; 
            padding: 30px; 
            text-align: center; 
          }
          .header h1 { 
            margin: 0; 
            font-size: 28px; 
            font-weight: 300; 
          }
          .content { 
            padding: 30px; 
          }
          .reminder-alert { 
            background: #fff3cd; 
            border: 1px solid #ffeaa7; 
            color: #856404; 
            padding: 15px; 
            border-radius: 8px; 
            margin: 20px 0; 
            text-align: center; 
            font-weight: 600; 
          }
          .meeting-details { 
            background: #f8f9fa; 
            padding: 20px; 
            margin: 20px 0; 
            border-radius: 8px; 
            border-left: 4px solid #ff6b6b; 
          }
          .room-code { 
            background: #e9ecef; 
            padding: 12px; 
            border-radius: 6px; 
            font-family: 'Courier New', monospace; 
            font-weight: bold; 
            color: #495057; 
            display: inline-block; 
            margin: 5px 0; 
          }
          .button { 
            display: inline-block; 
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); 
            color: white; 
            padding: 15px 30px; 
            text-decoration: none; 
            border-radius: 25px; 
            font-weight: 600; 
            margin: 20px 0; 
            transition: transform 0.2s; 
          }
          .button:hover { 
            transform: translateY(-2px); 
          }
          .footer { 
            background: #f8f9fa; 
            padding: 20px; 
            text-align: center; 
            color: #6c757d; 
            font-size: 14px; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Meeting Reminder</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${employee.empName}</strong>,</p>
            
            <div class="reminder-alert">
              ⚠️ Your meeting starts in <strong>${minutesAhead} minutes</strong>!
            </div>
            
            <div class="meeting-details">
              <h3>📋 Meeting Details</h3>
              <p><strong>Title:</strong> ${meeting.title}</p>
              <p><strong>Host:</strong> ${host.empName}</p>
              <p><strong>Start Time:</strong> ${scheduledStart}</p>
              <p><strong>Room Code:</strong> <span class="room-code">${meeting.roomCode}</span></p>
            </div>
            
            <p>Please join the meeting now using the room code above.</p>
            
            <a href="#" class="button">🎥 Join Meeting Now</a>
            
            <p>Best regards,<br><strong>Employee Monitoring System</strong></p>
          </div>
          <div class="footer">
            <p>This is an automated reminder. Please do not reply to this email.</p>
            <p>© 2024 Employee Monitoring System. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate task reminder email template
   * @param {Object} params - Template parameters
   * @returns {Promise<string>} HTML content
   */
  async generateTaskReminderTemplate({ task, employee }) {
    const dueDate = new Date(task.dueDate).toLocaleDateString();
    const priorityClass = task.priority === 'HIGH' ? 'priority-high' : 
                         task.priority === 'MEDIUM' ? 'priority-medium' : 'priority-low';
    
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Task Reminder</title>
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0; 
            background-color: #f4f4f4; 
          }
          .container { 
            max-width: 600px; 
            margin: 20px auto; 
            background: white; 
            border-radius: 10px; 
            overflow: hidden; 
            box-shadow: 0 4px 6px rgba(0,0,0,0.1); 
          }
          .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 30px; 
            text-align: center; 
          }
          .header h1 { 
            margin: 0; 
            font-size: 28px; 
            font-weight: 300; 
          }
          .content { 
            padding: 30px; 
          }
          .task-details { 
            background: #f8f9fa; 
            padding: 20px; 
            margin: 20px 0; 
            border-radius: 8px; 
            border-left: 4px solid #667eea; 
          }
          .priority-high { border-left-color: #dc3545 !important; }
          .priority-medium { border-left-color: #ffc107 !important; }
          .priority-low { border-left-color: #28a745 !important; }
          .priority-badge { 
            display: inline-block; 
            padding: 4px 8px; 
            border-radius: 12px; 
            font-size: 12px; 
            font-weight: 600; 
            text-transform: uppercase; 
          }
          .priority-high .priority-badge { 
            background: #dc3545; 
            color: white; 
          }
          .priority-medium .priority-badge { 
            background: #ffc107; 
            color: #212529; 
          }
          .priority-low .priority-badge { 
            background: #28a745; 
            color: white; 
          }
          .button { 
            display: inline-block; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 15px 30px; 
            text-decoration: none; 
            border-radius: 25px; 
            font-weight: 600; 
            margin: 20px 0; 
            transition: transform 0.2s; 
          }
          .button:hover { 
            transform: translateY(-2px); 
          }
          .footer { 
            background: #f8f9fa; 
            padding: 20px; 
            text-align: center; 
            color: #6c757d; 
            font-size: 14px; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📋 Task Reminder</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${employee.empName}</strong>,</p>
            
            <p>This is a reminder about your upcoming task:</p>
            
            <div class="task-details ${priorityClass}">
              <h3>📋 Task Details</h3>
              <p><strong>Title:</strong> ${task.title}</p>
              <p><strong>Due Date:</strong> ${dueDate}</p>
              <p><strong>Priority:</strong> <span class="priority-badge">${task.priority}</span></p>
              <p><strong>Status:</strong> ${task.status}</p>
              ${task.description ? `<p><strong>Description:</strong> ${task.description}</p>` : ''}
            </div>
            
            <a href="#" class="button">📝 View Task</a>
            
            <p>Best regards,<br><strong>Employee Monitoring System</strong></p>
          </div>
          <div class="footer">
            <p>This is an automated reminder. Please do not reply to this email.</p>
            <p>© 2024 Employee Monitoring System. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Create email delivery record
   * @param {Object} params - Email record parameters
   * @returns {Promise<string>} Email record ID
   */
  async createEmailRecord({ type, to, subject, meetingId = null, taskId = null, empId = null }) {
    try {
      const emailRecord = await prisma.emailDelivery.create({
        data: {
          type,
          to,
          subject,
          meetingId,
          taskId,
          empId,
          status: 'PENDING',
          sentAt: new Date()
        }
      });

      return emailRecord.id;
    } catch (error) {
      console.error('Failed to create email record:', error);
      return null;
    }
  }

  /**
   * Update email delivery status
   * @param {string} emailId - Email record ID
   * @param {string} status - Delivery status
   * @returns {Promise<void>}
   */
  async updateEmailDeliveryStatus(emailId, status) {
    try {
      await prisma.emailDelivery.update({
        where: { id: emailId },
        data: {
          status,
          deliveredAt: status === 'DELIVERED' ? new Date() : null
        }
      });
    } catch (error) {
      console.error('Failed to update email delivery status:', error);
    }
  }

  /**
   * Log email delivery results
   * @param {Object} params - Log parameters
   * @returns {Promise<void>}
   */
  async logEmailDelivery({ type, meetingId = null, totalSent, successful, failed, ...metadata }) {
    try {
      await prisma.emailDeliveryLog.create({
        data: {
          type,
          meetingId,
          totalSent,
          successful,
          failed,
          metadata: JSON.stringify(metadata),
          createdAt: new Date()
        }
      });
    } catch (error) {
      console.error('Failed to log email delivery:', error);
    }
  }

  /**
   * Get email analytics
   * @param {Object} params - Analytics parameters
   * @param {Date} params.from - Start date
   * @param {Date} params.to - End date
   * @param {string} params.type - Email type filter
   * @returns {Promise<Object>} Analytics data
   */
  async getEmailAnalytics({ from, to, type = null }) {
    try {
      const where = {
        createdAt: {
          gte: from,
          lte: to
        }
      };

      if (type) {
        where.type = type;
      }

      const [deliveryStats, typeStats] = await Promise.all([
        prisma.emailDelivery.groupBy({
          by: ['status'],
          where,
          _count: {
            status: true
          }
        }),
        prisma.emailDelivery.groupBy({
          by: ['type'],
          where,
          _count: {
            type: true
          }
        })
      ]);

      const totalEmails = deliveryStats.reduce((sum, stat) => sum + stat._count.status, 0);
      const deliveredEmails = deliveryStats.find(stat => stat.status === 'DELIVERED')?._count.status || 0;
      const failedEmails = deliveryStats.find(stat => stat.status === 'FAILED')?._count.status || 0;

      return {
        totalEmails,
        deliveredEmails,
        failedEmails,
        deliveryRate: totalEmails > 0 ? (deliveredEmails / totalEmails) * 100 : 0,
        failureRate: totalEmails > 0 ? (failedEmails / totalEmails) * 100 : 0,
        typeBreakdown: typeStats.map(stat => ({
          type: stat.type,
          count: stat._count.type
        }))
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Resend failed emails
   * @param {Object} params - Resend parameters
   * @param {number} params.maxRetries - Maximum retry attempts
   * @returns {Promise<Object>} Resend result
   */
  async resendFailedEmails({ maxRetries = 3 } = {}) {
    try {
      const failedEmails = await prisma.emailDelivery.findMany({
        where: {
          status: 'FAILED',
          retryCount: {
            lt: maxRetries
          }
        },
        include: {
          meeting: true,
          task: true,
          employee: true
        }
      });

      let successfulResends = 0;
      let failedResends = 0;

      for (const email of failedEmails) {
        try {
          let result = false;

          switch (email.type) {
            case 'MEETING_INVITE':
              result = await this.sendMeetingInviteEmail({
                to: email.to,
                meeting: email.meeting,
                employee: email.employee,
                host: email.meeting.host,
                message: 'Meeting invitation (resend)'
              });
              break;
            case 'MEETING_REMINDER':
              result = await this.sendMeetingReminderEmail({
                to: email.to,
                meeting: email.meeting,
                employee: email.employee,
                host: email.meeting.host,
                minutesAhead: 15
              });
              break;
            case 'TASK_REMINDER':
              result = await this.sendTaskReminderEmail({
                to: email.to,
                task: email.task,
                employee: email.employee
              });
              break;
          }

          if (result) {
            successfulResends++;
            await this.updateEmailDeliveryStatus(email.id, 'DELIVERED');
          } else {
            failedResends++;
            await prisma.emailDelivery.update({
              where: { id: email.id },
              data: {
                retryCount: {
                  increment: 1
                }
              }
            });
          }
        } catch (error) {
          failedResends++;
          console.error(`Failed to resend email ${email.id}:`, error);
        }
      }

      return {
        success: true,
        totalFailed: failedEmails.length,
        successfulResends,
        failedResends
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new EmailReminderService();

