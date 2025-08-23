const { prisma } = require('../config/prismaConfig');
const EmailReminderService = require('./emailReminderService');
const NotificationPreferencesService = require('./notificationPreferencesService');

/**
 * Enhanced Meeting Scheduling Service
 * Handles advanced meeting scheduling with recurring meetings, conflict detection, and availability checking
 */
class EnhancedMeetingSchedulingService {
  constructor() {
    this.defaultMeetingDuration = 60; // minutes
    this.maxRecurringInstances = 52; // Maximum 1 year of weekly meetings
  }

  /**
   * Schedule a new meeting with advanced features
   * @param {Object} meetingData - Meeting data
   * @param {string} meetingData.title - Meeting title
   * @param {string} meetingData.description - Meeting description
   * @param {string} meetingData.hostId - Host employee ID
   * @param {Date} meetingData.scheduledStart - Meeting start time
   * @param {Date} meetingData.scheduledEnd - Meeting end time
   * @param {string} meetingData.type - Meeting type
   * @param {string[]} meetingData.participantIds - Array of participant IDs
   * @param {Object} meetingData.recurring - Recurring meeting configuration
   * @param {string} meetingData.templateId - Meeting template ID (optional)
   * @returns {Promise<Object>} Created meeting
   */
  async scheduleMeeting(meetingData) {
    try {
      // Validate meeting data
      await this.validateMeetingData(meetingData);

      // Check for conflicts
      const conflicts = await this.checkMeetingConflicts(meetingData);
      if (conflicts.length > 0) {
        throw new Error(`Meeting conflicts detected: ${conflicts.map(c => c.reason).join(', ')}`);
      }

      // Generate room code
      const roomCode = this.generateRoomCode();

      // Create meeting
      const meeting = await prisma.meeting.create({
        data: {
          title: meetingData.title,
          description: meetingData.description,
          hostId: meetingData.hostId,
          scheduledStart: meetingData.scheduledStart,
          scheduledEnd: meetingData.scheduledEnd,
          type: meetingData.type,
          roomCode,
          status: 'SCHEDULED',
          recurring: meetingData.recurring ? JSON.stringify(meetingData.recurring) : null
        }
      });

      // Add participants
      if (meetingData.participantIds && meetingData.participantIds.length > 0) {
        await this.addParticipants(meeting.id, meetingData.participantIds);
      }

      // Send meeting invites
      if (meetingData.participantIds && meetingData.participantIds.length > 0) {
        await EmailReminderService.sendMeetingInvites({
          meetingId: meeting.id,
          empIds: meetingData.participantIds,
          message: meetingData.inviteMessage || ''
        });
      }

      // Create recurring instances if needed
      if (meetingData.recurring) {
        await this.createRecurringInstances(meeting.id, meetingData.recurring);
      }

      return meeting;
    } catch (error) {
      console.error('Failed to schedule meeting:', error);
      throw error;
    }
  }

  /**
   * Schedule a recurring meeting
   * @param {Object} recurringData - Recurring meeting data
   * @returns {Promise<Object>} Created recurring meeting series
   */
  async scheduleRecurringMeeting(recurringData) {
    try {
      const {
        title,
        description,
        hostId,
        startDate,
        endDate,
        duration,
        type,
        participantIds,
        pattern,
        inviteMessage
      } = recurringData;

      // Validate recurring pattern
      this.validateRecurringPattern(pattern);

      // Calculate recurring instances
      const instances = this.calculateRecurringInstances(startDate, endDate, pattern);
      
      if (instances.length > this.maxRecurringInstances) {
        throw new Error(`Too many recurring instances. Maximum allowed: ${this.maxRecurringInstances}`);
      }

      // Create parent meeting
      const parentMeeting = await prisma.meeting.create({
        data: {
          title,
          description,
          hostId,
          scheduledStart: startDate,
          scheduledEnd: new Date(startDate.getTime() + (duration || this.defaultMeetingDuration) * 60 * 1000),
          type,
          roomCode: this.generateRoomCode(),
          status: 'SCHEDULED',
          recurring: JSON.stringify({
            pattern,
            instances: instances.length,
            endDate
          })
        }
      });

      // Create recurring instances
      const createdInstances = [];
      for (const instance of instances) {
        const instanceMeeting = await prisma.meeting.create({
          data: {
            title,
            description,
            hostId,
            scheduledStart: instance.start,
            scheduledEnd: instance.end,
            type,
            roomCode: this.generateRoomCode(),
            status: 'SCHEDULED',
            parentMeetingId: parentMeeting.id,
            recurring: JSON.stringify({
              pattern,
              instanceNumber: createdInstances.length + 1,
              totalInstances: instances.length
            })
          }
        });

        // Add participants to instance
        if (participantIds && participantIds.length > 0) {
          await this.addParticipants(instanceMeeting.id, participantIds);
        }

        createdInstances.push(instanceMeeting);
      }

      // Send invites for first instance
      if (participantIds && participantIds.length > 0) {
        await EmailReminderService.sendMeetingInvites({
          meetingId: createdInstances[0].id,
          empIds: participantIds,
          message: inviteMessage || `You have been invited to a recurring meeting: ${title}`
        });
      }

      return {
        parentMeeting,
        instances: createdInstances,
        totalInstances: createdInstances.length
      };
    } catch (error) {
      console.error('Failed to schedule recurring meeting:', error);
      throw error;
    }
  }

  /**
   * Check for meeting conflicts
   * @param {Object} meetingData - Meeting data
   * @returns {Promise<Array>} Array of conflicts
   */
  async checkMeetingConflicts(meetingData) {
    try {
      const conflicts = [];
      const { scheduledStart, scheduledEnd, hostId, participantIds } = meetingData;

      // Check host conflicts
      const hostConflicts = await this.checkEmployeeAvailability(hostId, scheduledStart, scheduledEnd);
      if (hostConflicts.length > 0) {
        conflicts.push({
          type: 'HOST_CONFLICT',
          employeeId: hostId,
          reason: 'Host has conflicting meetings',
          conflicts: hostConflicts
        });
      }

      // Check participant conflicts
      if (participantIds && participantIds.length > 0) {
        for (const participantId of participantIds) {
          const participantConflicts = await this.checkEmployeeAvailability(participantId, scheduledStart, scheduledEnd);
          if (participantConflicts.length > 0) {
            conflicts.push({
              type: 'PARTICIPANT_CONFLICT',
              employeeId: participantId,
              reason: 'Participant has conflicting meetings',
              conflicts: participantConflicts
            });
          }
        }
      }

      return conflicts;
    } catch (error) {
      console.error('Failed to check meeting conflicts:', error);
      throw error;
    }
  }

  /**
   * Check employee availability for a time slot
   * @param {string} empId - Employee ID
   * @param {Date} startTime - Start time
   * @param {Date} endTime - End time
   * @returns {Promise<Array>} Array of conflicting meetings
   */
  async checkEmployeeAvailability(empId, startTime, endTime) {
    try {
      const conflicts = await prisma.meeting.findMany({
        where: {
          OR: [
            { hostId: empId },
            {
              participants: {
                some: { empId }
              }
            }
          ],
          status: {
            in: ['SCHEDULED', 'LIVE']
          },
          OR: [
            {
              scheduledStart: {
                lt: endTime,
                gte: startTime
              }
            },
            {
              scheduledEnd: {
                gt: startTime,
                lte: endTime
              }
            },
            {
              AND: [
                { scheduledStart: { lte: startTime } },
                { scheduledEnd: { gte: endTime } }
              ]
            }
          ]
        },
        include: {
          host: {
            select: {
              empName: true
            }
          }
        }
      });

      return conflicts;
    } catch (error) {
      console.error('Failed to check employee availability:', error);
      throw error;
    }
  }

  /**
   * Find available time slots for a group of participants
   * @param {Array} participantIds - Array of participant IDs
   * @param {number} duration - Meeting duration in minutes
   * @param {Object} dateRange - Date range object
   * @param {Date} dateRange.start - Start date
   * @param {Date} dateRange.end - End date
   * @returns {Promise<Array>} Array of available time slots
   */
  async findAvailableTimeSlots(participantIds, duration, dateRange) {
    try {
      const slots = [];
      const { start, end } = dateRange;
      const workingHours = { start: 9, end: 17 }; // 9 AM to 5 PM
      const slotDuration = duration || this.defaultMeetingDuration;

      // Generate time slots for each day
      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        const dayStart = new Date(date);
        dayStart.setHours(workingHours.start, 0, 0, 0);

        const dayEnd = new Date(date);
        dayEnd.setHours(workingHours.end, 0, 0, 0);

        // Generate 30-minute slots
        for (let slotStart = new Date(dayStart); slotStart < dayEnd; slotStart.setMinutes(slotStart.getMinutes() + 30)) {
          const slotEnd = new Date(slotStart.getTime() + slotDuration * 60 * 1000);

          if (slotEnd <= dayEnd) {
            // Check if all participants are available
            let allAvailable = true;
            for (const participantId of participantIds) {
              const conflicts = await this.checkEmployeeAvailability(participantId, slotStart, slotEnd);
              if (conflicts.length > 0) {
                allAvailable = false;
                break;
              }
            }

            if (allAvailable) {
              slots.push({
                start: new Date(slotStart),
                end: new Date(slotEnd),
                duration: slotDuration
              });
            }
          }
        }
      }

      return slots;
    } catch (error) {
      console.error('Failed to find available time slots:', error);
      throw error;
    }
  }

  /**
   * Suggest meeting times for a group of participants
   * @param {Array} participantIds - Array of participant IDs
   * @param {number} duration - Meeting duration in minutes
   * @param {Object} dateRange - Date range object
   * @param {number} maxSuggestions - Maximum number of suggestions
   * @returns {Promise<Array>} Array of suggested meeting times
   */
  async suggestMeetingTimes(participantIds, duration, dateRange, maxSuggestions = 5) {
    try {
      const availableSlots = await this.findAvailableTimeSlots(participantIds, duration, dateRange);
      
      // Sort by start time and return top suggestions
      return availableSlots
        .sort((a, b) => a.start.getTime() - b.start.getTime())
        .slice(0, maxSuggestions);
    } catch (error) {
      console.error('Failed to suggest meeting times:', error);
      throw error;
    }
  }

  /**
   * Update meeting schedule
   * @param {string} meetingId - Meeting ID
   * @param {Object} updates - Meeting updates
   * @returns {Promise<Object>} Updated meeting
   */
  async updateMeetingSchedule(meetingId, updates) {
    try {
      // Check if meeting exists
      const existingMeeting = await prisma.meeting.findUnique({
        where: { id: meetingId }
      });

      if (!existingMeeting) {
        throw new Error('Meeting not found');
      }

      // Check for conflicts if time is being updated
      if (updates.scheduledStart || updates.scheduledEnd) {
        const newStart = updates.scheduledStart || existingMeeting.scheduledStart;
        const newEnd = updates.scheduledEnd || existingMeeting.scheduledEnd;

        const conflicts = await this.checkEmployeeAvailability(existingMeeting.hostId, newStart, newEnd);
        if (conflicts.length > 0) {
          throw new Error('Meeting conflicts detected');
        }
      }

      // Update meeting
      const updatedMeeting = await prisma.meeting.update({
        where: { id: meetingId },
        data: updates
      });

      // Send update notifications
      await this.sendMeetingUpdateNotifications(meetingId, updates);

      return updatedMeeting;
    } catch (error) {
      console.error('Failed to update meeting schedule:', error);
      throw error;
    }
  }

  /**
   * Cancel a meeting
   * @param {string} meetingId - Meeting ID
   * @param {string} reason - Cancellation reason
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelMeeting(meetingId, reason) {
    try {
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
        include: {
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

      if (!meeting) {
        throw new Error('Meeting not found');
      }

      // Update meeting status
      await prisma.meeting.update({
        where: { id: meetingId },
        data: {
          status: 'CANCELED',
          canceledAt: new Date(),
          cancelReason: reason
        }
      });

      // Send cancellation notifications
      const participantIds = meeting.participants.map(p => p.employee.id);
      if (participantIds.length > 0) {
        await this.sendMeetingCancellationNotifications(meeting, participantIds, reason);
      }

      return {
        success: true,
        meetingId,
        canceledAt: new Date(),
        reason
      };
    } catch (error) {
      console.error('Failed to cancel meeting:', error);
      throw error;
    }
  }

  /**
   * Add participants to a meeting
   * @param {string} meetingId - Meeting ID
   * @param {Array} empIds - Array of employee IDs
   * @returns {Promise<Object>} Add result
   */
  async addParticipants(meetingId, empIds) {
    try {
      const participantPromises = empIds.map(empId => 
        prisma.meetingParticipant.upsert({
          where: {
            meetingId_empId: {
              meetingId,
              empId
            }
          },
          update: {
            role: 'PARTICIPANT'
          },
          create: {
            meetingId,
            empId,
            role: 'PARTICIPANT'
          }
        })
      );

      await Promise.all(participantPromises);

      return {
        success: true,
        meetingId,
        addedParticipants: empIds.length
      };
    } catch (error) {
      console.error('Failed to add participants:', error);
      throw error;
    }
  }

  /**
   * Remove participants from a meeting
   * @param {string} meetingId - Meeting ID
   * @param {Array} empIds - Array of employee IDs
   * @returns {Promise<Object>} Remove result
   */
  async removeParticipants(meetingId, empIds) {
    try {
      const removePromises = empIds.map(empId => 
        prisma.meetingParticipant.delete({
          where: {
            meetingId_empId: {
              meetingId,
              empId
            }
          }
        })
      );

      await Promise.all(removePromises);

      return {
        success: true,
        meetingId,
        removedParticipants: empIds.length
      };
    } catch (error) {
      console.error('Failed to remove participants:', error);
      throw error;
    }
  }

  /**
   * Update participant role
   * @param {string} meetingId - Meeting ID
   * @param {string} empId - Employee ID
   * @param {string} role - New role
   * @returns {Promise<Object>} Update result
   */
  async updateParticipantRole(meetingId, empId, role) {
    try {
      const updatedParticipant = await prisma.meetingParticipant.update({
        where: {
          meetingId_empId: {
            meetingId,
            empId
          }
        },
        data: {
          role
        }
      });

      return {
        success: true,
        meetingId,
        empId,
        role: updatedParticipant.role
      };
    } catch (error) {
      console.error('Failed to update participant role:', error);
      throw error;
    }
  }

  /**
   * Create meeting template
   * @param {Object} templateData - Template data
   * @returns {Promise<Object>} Created template
   */
  async createMeetingTemplate(templateData) {
    try {
      const template = await prisma.meetingTemplate.create({
        data: {
          name: templateData.name,
          description: templateData.description,
          duration: templateData.duration || this.defaultMeetingDuration,
          type: templateData.type,
          defaultParticipants: templateData.defaultParticipants || [],
          settings: templateData.settings || {},
          createdBy: templateData.createdBy
        }
      });

      return template;
    } catch (error) {
      console.error('Failed to create meeting template:', error);
      throw error;
    }
  }

  /**
   * Use meeting template to create a meeting
   * @param {string} templateId - Template ID
   * @param {Object} meetingData - Meeting data
   * @returns {Promise<Object>} Created meeting
   */
  async useMeetingTemplate(templateId, meetingData) {
    try {
      const template = await prisma.meetingTemplate.findUnique({
        where: { id: templateId }
      });

      if (!template) {
        throw new Error('Meeting template not found');
      }

      // Merge template data with meeting data
      const mergedData = {
        ...meetingData,
        duration: meetingData.duration || template.duration,
        type: meetingData.type || template.type,
        participantIds: meetingData.participantIds || template.defaultParticipants
      };

      return await this.scheduleMeeting(mergedData);
    } catch (error) {
      console.error('Failed to use meeting template:', error);
      throw error;
    }
  }

  /**
   * Get meeting templates
   * @param {string} createdBy - Filter by creator
   * @returns {Promise<Array>} Array of templates
   */
  async getMeetingTemplates(createdBy = null) {
    try {
      const where = {};
      if (createdBy) {
        where.createdBy = createdBy;
      }

      const templates = await prisma.meetingTemplate.findMany({
        where,
        orderBy: { createdAt: 'desc' }
      });

      return templates;
    } catch (error) {
      console.error('Failed to get meeting templates:', error);
      throw error;
    }
  }

  /**
   * Generate room code
   * @returns {string} Room code
   */
  generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Validate meeting data
   * @param {Object} meetingData - Meeting data
   * @returns {Promise<void>}
   */
  async validateMeetingData(meetingData) {
    if (!meetingData.title || meetingData.title.trim().length === 0) {
      throw new Error('Meeting title is required');
    }

    if (!meetingData.hostId) {
      throw new Error('Meeting host is required');
    }

    if (!meetingData.scheduledStart || !meetingData.scheduledEnd) {
      throw new Error('Meeting start and end times are required');
    }

    if (meetingData.scheduledStart >= meetingData.scheduledEnd) {
      throw new Error('Meeting start time must be before end time');
    }

    if (meetingData.scheduledStart < new Date()) {
      throw new Error('Meeting start time cannot be in the past');
    }

    // Validate host exists
    const host = await prisma.employee.findUnique({
      where: { id: meetingData.hostId }
    });

    if (!host) {
      throw new Error('Meeting host not found');
    }
  }

  /**
   * Validate recurring pattern
   * @param {Object} pattern - Recurring pattern
   * @returns {void}
   */
  validateRecurringPattern(pattern) {
    if (!pattern.frequency) {
      throw new Error('Recurring frequency is required');
    }

    if (!['DAILY', 'WEEKLY', 'MONTHLY'].includes(pattern.frequency)) {
      throw new Error('Invalid recurring frequency');
    }

    if (pattern.frequency === 'WEEKLY' && !pattern.weekDays) {
      throw new Error('Week days are required for weekly recurring meetings');
    }

    if (pattern.frequency === 'MONTHLY' && !pattern.monthDay) {
      throw new Error('Month day is required for monthly recurring meetings');
    }
  }

  /**
   * Calculate recurring instances
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Object} pattern - Recurring pattern
   * @returns {Array} Array of instances
   */
  calculateRecurringInstances(startDate, endDate, pattern) {
    const instances = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate && instances.length < this.maxRecurringInstances) {
      let shouldInclude = false;

      switch (pattern.frequency) {
        case 'DAILY':
          shouldInclude = true;
          break;
        case 'WEEKLY':
          const dayOfWeek = currentDate.getDay();
          shouldInclude = pattern.weekDays.includes(dayOfWeek);
          break;
        case 'MONTHLY':
          const dayOfMonth = currentDate.getDate();
          shouldInclude = dayOfMonth === pattern.monthDay;
          break;
      }

      if (shouldInclude) {
        const instanceEnd = new Date(currentDate.getTime() + (pattern.duration || this.defaultMeetingDuration) * 60 * 1000);
        instances.push({
          start: new Date(currentDate),
          end: instanceEnd
        });
      }

      // Move to next occurrence
      switch (pattern.frequency) {
        case 'DAILY':
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        case 'WEEKLY':
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case 'MONTHLY':
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
      }
    }

    return instances;
  }

  /**
   * Create recurring instances
   * @param {string} parentMeetingId - Parent meeting ID
   * @param {Object} recurring - Recurring configuration
   * @returns {Promise<void>}
   */
  async createRecurringInstances(parentMeetingId, recurring) {
    // This method would create the actual recurring meeting instances
    // Implementation depends on the specific requirements
    console.log('Creating recurring instances for meeting:', parentMeetingId);
  }

  /**
   * Send meeting update notifications
   * @param {string} meetingId - Meeting ID
   * @param {Object} updates - Meeting updates
   * @returns {Promise<void>}
   */
  async sendMeetingUpdateNotifications(meetingId, updates) {
    // Implementation for sending meeting update notifications
    console.log('Sending meeting update notifications for meeting:', meetingId);
  }

  /**
   * Send meeting cancellation notifications
   * @param {Object} meeting - Meeting object
   * @param {Array} participantIds - Participant IDs
   * @param {string} reason - Cancellation reason
   * @returns {Promise<void>}
   */
  async sendMeetingCancellationNotifications(meeting, participantIds, reason) {
    // Implementation for sending meeting cancellation notifications
    console.log('Sending meeting cancellation notifications for meeting:', meeting.id);
  }
}

module.exports = new EnhancedMeetingSchedulingService();

