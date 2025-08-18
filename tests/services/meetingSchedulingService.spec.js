const meetingSchedulingService = require('../../service/meetingSchedulingService');

// Mock dependencies
jest.mock('../../config/prismaConfig', () => ({
  prisma: {
    meeting: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn()
    },
    meetingParticipant: {
      upsert: jest.fn()
    },
    employee: {
      findMany: jest.fn()
    }
  }
}));

jest.mock('../../service/emailService');
jest.mock('../../utils/logger');

const { prisma } = require('../../config/prismaConfig');
const mailOptions = require('../../service/emailService');

describe('Meeting Scheduling Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendMeetingInvite', () => {
    it('should send meeting invites successfully', async () => {
      const mockMeeting = {
        id: 'meeting1',
        title: 'Test Meeting',
        status: 'SCHEDULED',
        host: {
          id: 'host1',
          empName: 'Host User',
          empEmail: 'host@example.com'
        }
      };

      const mockEmployees = [
        {
          id: 'emp1',
          empName: 'John Doe',
          empEmail: 'john@example.com',
          empTechnology: 'React'
        },
        {
          id: 'emp2',
          empName: 'Jane Smith',
          empEmail: 'jane@example.com',
          empTechnology: 'Node.js'
        }
      ];

      prisma.meeting.findUnique.mockResolvedValue(mockMeeting);
      prisma.employee.findMany.mockResolvedValue(mockEmployees);
      prisma.meetingParticipant.upsert
        .mockResolvedValueOnce({ id: 'participant1' })
        .mockResolvedValueOnce({ id: 'participant2' });
      mailOptions.mockResolvedValue(true);

      const result = await meetingSchedulingService.sendMeetingInvite({
        meetingId: 'meeting1',
        empIds: ['emp1', 'emp2'],
        message: 'Custom invite message'
      });

      expect(prisma.meeting.findUnique).toHaveBeenCalledWith({
        where: { id: 'meeting1' },
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

      expect(prisma.employee.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['emp1', 'emp2'] },
          isActive: true
        },
        select: {
          id: true,
          empName: true,
          empEmail: true,
          empTechnology: true
        }
      });

      expect(prisma.meetingParticipant.upsert).toHaveBeenCalledTimes(2);
      expect(mailOptions).toHaveBeenCalledTimes(2);

      expect(result.success).toBe(true);
      expect(result.totalInvites).toBe(2);
      expect(result.successfulEmails).toBe(2);
      expect(result.failedEmails).toBe(0);
    });

    it('should throw error for non-existent meeting', async () => {
      prisma.meeting.findUnique.mockResolvedValue(null);

      await expect(meetingSchedulingService.sendMeetingInvite({
        meetingId: 'nonexistent',
        empIds: ['emp1']
      })).rejects.toThrow('Meeting not found');
    });

    it('should throw error for ended meeting', async () => {
      const mockMeeting = {
        id: 'meeting1',
        status: 'ENDED',
        host: { id: 'host1', empName: 'Host', empEmail: 'host@example.com' }
      };

      prisma.meeting.findUnique.mockResolvedValue(mockMeeting);

      await expect(meetingSchedulingService.sendMeetingInvite({
        meetingId: 'meeting1',
        empIds: ['emp1']
      })).rejects.toThrow('Cannot send invites for ended or canceled meeting');
    });

    it('should throw error for no valid employees', async () => {
      const mockMeeting = {
        id: 'meeting1',
        status: 'SCHEDULED',
        host: { id: 'host1', empName: 'Host', empEmail: 'host@example.com' }
      };

      prisma.meeting.findUnique.mockResolvedValue(mockMeeting);
      prisma.employee.findMany.mockResolvedValue([]);

      await expect(meetingSchedulingService.sendMeetingInvite({
        meetingId: 'meeting1',
        empIds: ['emp1']
      })).rejects.toThrow('No valid employees found to invite');
    });
  });

  describe('getScheduledMeetings', () => {
    it('should get scheduled meetings with filters', async () => {
      const mockMeetings = [
        {
          id: 'meeting1',
          title: 'Meeting 1',
          scheduledStart: new Date('2024-01-01T10:00:00Z'),
          host: { id: 'host1', empName: 'Host 1' },
          participants: []
        }
      ];

      prisma.meeting.findMany.mockResolvedValue(mockMeetings);
      prisma.meeting.count.mockResolvedValue(1);

      const result = await meetingSchedulingService.getScheduledMeetings({
        from: new Date('2024-01-01T00:00:00Z'),
        to: new Date('2024-01-01T23:59:59Z'),
        status: 'SCHEDULED',
        hostId: 'host1',
        page: 1,
        limit: 20
      });

      expect(prisma.meeting.findMany).toHaveBeenCalledWith({
        where: {
          scheduledStart: {
            gte: new Date('2024-01-01T00:00:00Z'),
            lte: new Date('2024-01-01T23:59:59Z')
          },
          status: 'SCHEDULED',
          hostId: 'host1'
        },
        include: expect.any(Object),
        orderBy: { scheduledStart: 'asc' },
        skip: 0,
        take: 20
      });

      expect(result.meetings).toEqual(mockMeetings);
      expect(result.pagination.total).toBe(1);
    });

    it('should handle empty filters', async () => {
      prisma.meeting.findMany.mockResolvedValue([]);
      prisma.meeting.count.mockResolvedValue(0);

      const result = await meetingSchedulingService.getScheduledMeetings({
        page: 1,
        limit: 20
      });

      expect(prisma.meeting.findMany).toHaveBeenCalledWith({
        where: {},
        include: expect.any(Object),
        orderBy: { scheduledStart: 'asc' },
        skip: 0,
        take: 20
      });

      expect(result.meetings).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('getUpcomingMeetings', () => {
    it('should get upcoming meetings for employee', async () => {
      const mockMeetings = [
        {
          id: 'meeting1',
          title: 'Upcoming Meeting',
          scheduledStart: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
          host: { id: 'host1', empName: 'Host', empEmail: 'host@example.com' }
        }
      ];

      prisma.meeting.findMany.mockResolvedValue(mockMeetings);

      const result = await meetingSchedulingService.getUpcomingMeetings({
        empId: 'emp1',
        minutesAhead: 30
      });

      expect(prisma.meeting.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { hostId: 'emp1' },
            {
              participants: {
                some: { empId: 'emp1' }
              }
            }
          ],
          status: { in: ['SCHEDULED', 'LIVE'] },
          scheduledStart: expect.any(Object)
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

      expect(result).toEqual(mockMeetings);
    });
  });

  describe('sendMeetingReminders', () => {
    it('should send reminders for upcoming meetings', async () => {
      const mockMeetings = [
        {
          id: 'meeting1',
          title: 'Reminder Meeting',
          roomCode: 'ABC123',
          scheduledStart: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
          host: {
            id: 'host1',
            empName: 'Host User',
            empEmail: 'host@example.com'
          },
          participants: [
            {
              employee: {
                id: 'emp1',
                empName: 'John Doe',
                empEmail: 'john@example.com'
              }
            }
          ]
        }
      ];

      prisma.meeting.findMany.mockResolvedValue(mockMeetings);
      mailOptions.mockResolvedValue(true);

      const result = await meetingSchedulingService.sendMeetingReminders({
        minutesAhead: 15
      });

      expect(prisma.meeting.findMany).toHaveBeenCalledWith({
        where: {
          status: 'SCHEDULED',
          scheduledStart: expect.any(Object)
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

      expect(mailOptions).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(true);
      expect(result.totalMeetings).toBe(1);
      expect(result.totalReminders).toBe(1);
      expect(result.successfulReminders).toBe(1);
    });

    it('should handle no upcoming meetings', async () => {
      prisma.meeting.findMany.mockResolvedValue([]);

      const result = await meetingSchedulingService.sendMeetingReminders({
        minutesAhead: 15
      });

      expect(result.success).toBe(true);
      expect(result.totalMeetings).toBe(0);
      expect(result.totalReminders).toBe(0);
      expect(result.successfulReminders).toBe(0);
    });
  });

  describe('generateInviteEmailHTML', () => {
    it('should generate proper HTML content', () => {
      const meeting = {
        title: 'Test Meeting',
        type: 'BASIC',
        roomCode: 'ABC123',
        description: 'Test description',
        scheduledStart: new Date('2024-01-01T10:00:00Z'),
        scheduledEnd: new Date('2024-01-01T11:00:00Z')
      };

      const employee = {
        empName: 'John Doe'
      };

      const host = {
        empName: 'Host User'
      };

      const message = 'Custom invite message';

      const html = meetingSchedulingService.generateInviteEmailHTML({
        meeting,
        employee,
        host,
        message
      });

      expect(html).toContain('Meeting Invitation');
      expect(html).toContain('John Doe');
      expect(html).toContain('Custom invite message');
      expect(html).toContain('Test Meeting');
      expect(html).toContain('Host User');
      expect(html).toContain('ABC123');
      expect(html).toContain('Test description');
    });

    it('should handle meeting without description', () => {
      const meeting = {
        title: 'Test Meeting',
        type: 'BASIC',
        roomCode: 'ABC123',
        scheduledStart: new Date('2024-01-01T10:00:00Z'),
        scheduledEnd: new Date('2024-01-01T11:00:00Z')
      };

      const employee = { empName: 'John Doe' };
      const host = { empName: 'Host User' };
      const message = 'Test message';

      const html = meetingSchedulingService.generateInviteEmailHTML({
        meeting,
        employee,
        host,
        message
      });

      expect(html).toContain('Test Meeting');
      expect(html).not.toContain('Description:');
    });
  });
});



