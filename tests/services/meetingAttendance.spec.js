const meetingService = require('../../service/meetingService');

// Mock dependencies
jest.mock('../../config/prismaConfig', () => ({
  prisma: {
    meeting: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn()
    },
    meetingParticipant: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    },
    timeSheet: {
      findFirst: jest.fn()
    }
  }
}));

jest.mock('../../utils/logger');

const { prisma } = require('../../config/prismaConfig');

describe('Meeting Attendance & Timesheet Link Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('markJoin with timesheet linking', () => {
    it('should link to active timesheet when timeSheetId not provided', async () => {
      const mockTimeSheet = {
        id: 'timesheet1',
        empId: 'emp1',
        clockIn: '09:00',
        clockOut: '',
        status: 'PRESENT',
        isActive: true,
        createdAt: new Date()
      };

      const mockParticipant = {
        id: 'participant1',
        meetingId: 'meeting1',
        empId: 'emp1',
        joinedAt: new Date(),
        timeSheetId: 'timesheet1',
        employee: {
          id: 'emp1',
          empName: 'John Doe',
          empEmail: 'john@example.com',
          empTechnology: 'React'
        },
        timeSheet: mockTimeSheet
      };

      prisma.meetingParticipant.findUnique.mockResolvedValue(null);
      prisma.timeSheet.findFirst.mockResolvedValue(mockTimeSheet);
      prisma.meetingParticipant.create.mockResolvedValue(mockParticipant);

      const result = await meetingService.markJoin({
        meetingId: 'meeting1',
        empId: 'emp1'
      });

      expect(prisma.timeSheet.findFirst).toHaveBeenCalledWith({
        where: {
          empId: 'emp1',
          createdAt: expect.any(Object),
          isActive: true
        },
        orderBy: { createdAt: 'desc' }
      });

      expect(prisma.meetingParticipant.create).toHaveBeenCalledWith({
        data: {
          meetingId: 'meeting1',
          empId: 'emp1',
          joinedAt: expect.any(Date),
          timeSheetId: 'timesheet1'
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

      expect(result.success).toBe(true);
      expect(result.participant.timeSheetId).toBe('timesheet1');
    });

    it('should not link timesheet when no active timesheet found', async () => {
      const mockParticipant = {
        id: 'participant1',
        meetingId: 'meeting1',
        empId: 'emp1',
        joinedAt: new Date(),
        timeSheetId: null,
        employee: {
          id: 'emp1',
          empName: 'John Doe',
          empEmail: 'john@example.com',
          empTechnology: 'React'
        },
        timeSheet: null
      };

      prisma.meetingParticipant.findUnique.mockResolvedValue(null);
      prisma.timeSheet.findFirst.mockResolvedValue(null);
      prisma.meetingParticipant.create.mockResolvedValue(mockParticipant);

      const result = await meetingService.markJoin({
        meetingId: 'meeting1',
        empId: 'emp1'
      });

      expect(prisma.timeSheet.findFirst).toHaveBeenCalled();
      expect(prisma.meetingParticipant.create).toHaveBeenCalledWith({
        data: {
          meetingId: 'meeting1',
          empId: 'emp1',
          joinedAt: expect.any(Date),
          timeSheetId: undefined
        },
        include: expect.any(Object)
      });

      expect(result.success).toBe(true);
      expect(result.participant.timeSheetId).toBeNull();
    });

    it('should use provided timeSheetId when available', async () => {
      const mockParticipant = {
        id: 'participant1',
        meetingId: 'meeting1',
        empId: 'emp1',
        joinedAt: new Date(),
        timeSheetId: 'provided-timesheet',
        employee: {
          id: 'emp1',
          empName: 'John Doe',
          empEmail: 'john@example.com',
          empTechnology: 'React'
        },
        timeSheet: {
          id: 'provided-timesheet',
          clockIn: '08:00',
          clockOut: '',
          status: 'PRESENT'
        }
      };

      prisma.meetingParticipant.findUnique.mockResolvedValue(null);
      prisma.meetingParticipant.create.mockResolvedValue(mockParticipant);

      const result = await meetingService.markJoin({
        meetingId: 'meeting1',
        empId: 'emp1',
        timeSheetId: 'provided-timesheet'
      });

      expect(prisma.timeSheet.findFirst).not.toHaveBeenCalled();
      expect(prisma.meetingParticipant.create).toHaveBeenCalledWith({
        data: {
          meetingId: 'meeting1',
          empId: 'emp1',
          joinedAt: expect.any(Date),
          timeSheetId: 'provided-timesheet'
        },
        include: expect.any(Object)
      });

      expect(result.success).toBe(true);
      expect(result.participant.timeSheetId).toBe('provided-timesheet');
    });
  });

  describe('endMeeting with attendance recomputation', () => {
    it('should recompute attendance for active participants', async () => {
      const mockMeeting = {
        id: 'meeting1',
        hostId: 'host1',
        status: 'LIVE',
        host: { id: 'host1', empName: 'Host User' }
      };

      const mockActiveParticipants = [
        {
          id: 'participant1',
          meetingId: 'meeting1',
          empId: 'emp1',
          joinedAt: new Date(Date.now() - 3600000), // 1 hour ago
          leftAt: null,
          attendanceSec: 0
        },
        {
          id: 'participant2',
          meetingId: 'meeting1',
          empId: 'emp2',
          joinedAt: new Date(Date.now() - 1800000), // 30 minutes ago
          leftAt: null,
          attendanceSec: 300 // 5 minutes already
        }
      ];

      const mockEndedMeeting = {
        id: 'meeting1',
        status: 'ENDED',
        actualEnd: new Date(),
        host: mockMeeting.host
      };

      prisma.meeting.findUnique.mockResolvedValue(mockMeeting);
      prisma.meetingParticipant.findMany.mockResolvedValue(mockActiveParticipants);
      prisma.meetingParticipant.update
        .mockResolvedValueOnce({ ...mockActiveParticipants[0], leftAt: new Date(), attendanceSec: 3600 })
        .mockResolvedValueOnce({ ...mockActiveParticipants[1], leftAt: new Date(), attendanceSec: 2100 });
      prisma.meeting.update.mockResolvedValue(mockEndedMeeting);

      const result = await meetingService.endMeeting({
        meetingId: 'meeting1',
        byEmpId: 'host1'
      });

      expect(prisma.meetingParticipant.findMany).toHaveBeenCalledWith({
        where: {
          meetingId: 'meeting1',
          joinedAt: { not: null },
          leftAt: null
        }
      });

      expect(prisma.meetingParticipant.update).toHaveBeenCalledTimes(2);
      expect(prisma.meeting.update).toHaveBeenCalledWith({
        where: { id: 'meeting1' },
        data: {
          status: 'ENDED',
          actualEnd: expect.any(Date)
        },
        include: expect.any(Object)
      });

      expect(result.status).toBe('ENDED');
    });

    it('should handle meeting with no active participants', async () => {
      const mockMeeting = {
        id: 'meeting1',
        hostId: 'host1',
        status: 'LIVE',
        host: { id: 'host1', empName: 'Host User' }
      };

      const mockEndedMeeting = {
        id: 'meeting1',
        status: 'ENDED',
        actualEnd: new Date(),
        host: mockMeeting.host
      };

      prisma.meeting.findUnique.mockResolvedValue(mockMeeting);
      prisma.meetingParticipant.findMany.mockResolvedValue([]);
      prisma.meeting.update.mockResolvedValue(mockEndedMeeting);

      const result = await meetingService.endMeeting({
        meetingId: 'meeting1',
        byEmpId: 'host1'
      });

      expect(prisma.meetingParticipant.findMany).toHaveBeenCalled();
      expect(prisma.meetingParticipant.update).not.toHaveBeenCalled();
      expect(result.status).toBe('ENDED');
    });
  });

  describe('getMeetingAttendance', () => {
    it('should return comprehensive attendance report', async () => {
      const mockMeeting = {
        id: 'meeting1',
        title: 'Test Meeting',
        roomCode: 'ABC123',
        status: 'ENDED',
        scheduledStart: new Date('2024-01-01T10:00:00Z'),
        scheduledEnd: new Date('2024-01-01T11:00:00Z'),
        actualStart: new Date('2024-01-01T10:05:00Z'),
        actualEnd: new Date('2024-01-01T10:55:00Z'),
        host: {
          id: 'host1',
          empName: 'Host User',
          empEmail: 'host@example.com'
        }
      };

      const mockParticipants = [
        {
          id: 'participant1',
          empId: 'emp1',
          role: 'PARTICIPANT',
          joinedAt: new Date('2024-01-01T10:05:00Z'),
          leftAt: new Date('2024-01-01T10:45:00Z'),
          attendanceSec: 2400, // 40 minutes
          isBanned: false,
          timeSheetId: 'timesheet1',
          employee: {
            id: 'emp1',
            empName: 'John Doe',
            empEmail: 'john@example.com',
            empTechnology: 'React'
          },
          timeSheet: {
            id: 'timesheet1',
            clockIn: '09:00',
            clockOut: '17:00',
            status: 'PRESENT',
            createdAt: new Date('2024-01-01T09:00:00Z')
          }
        },
        {
          id: 'participant2',
          empId: 'emp2',
          role: 'COHOST',
          joinedAt: new Date('2024-01-01T10:00:00Z'),
          leftAt: null,
          attendanceSec: 3300, // 55 minutes
          isBanned: false,
          timeSheetId: null,
          employee: {
            id: 'emp2',
            empName: 'Jane Smith',
            empEmail: 'jane@example.com',
            empTechnology: 'Node.js'
          },
          timeSheet: null
        }
      ];

      prisma.meeting.findUnique.mockResolvedValue(mockMeeting);
      prisma.meetingParticipant.findMany.mockResolvedValue(mockParticipants);

      const result = await meetingService.getMeetingAttendance('meeting1');

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

      expect(prisma.meetingParticipant.findMany).toHaveBeenCalledWith({
        where: { meetingId: 'meeting1' },
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

      expect(result.meeting.id).toBe('meeting1');
      expect(result.summary.totalParticipants).toBe(2);
      expect(result.summary.activeParticipants).toBe(1);
      expect(result.summary.totalAttendanceSeconds).toBe(5700); // 2400 + 3300
      expect(result.summary.totalAttendanceMinutes).toBe(95);
      expect(result.summary.totalAttendanceHours).toBe(1.58);
      expect(result.summary.linkedTimeSheets).toBe(1);
      expect(result.summary.linkRate).toBe(50);

      expect(result.participants).toHaveLength(2);
      expect(result.participants[0].attendanceMinutes).toBe(40);
      expect(result.participants[0].isActive).toBe(false);
      expect(result.participants[0].timeSheetId).toBe('timesheet1');
      expect(result.participants[1].attendanceMinutes).toBe(55);
      expect(result.participants[1].isActive).toBe(true);
      expect(result.participants[1].timeSheetId).toBeNull();
    });

    it('should throw error for non-existent meeting', async () => {
      prisma.meeting.findUnique.mockResolvedValue(null);

      await expect(meetingService.getMeetingAttendance('nonexistent'))
        .rejects.toThrow('Meeting not found');

      expect(prisma.meeting.findUnique).toHaveBeenCalledWith({
        where: { id: 'nonexistent' },
        include: expect.any(Object)
      });
    });
  });
});
