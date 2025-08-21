const meetingService = require('../../service/meetingService');
const { generateShortcode } = require('../../utils/shortcode');
const { hashMeetingPassword, verifyMeetingPassword } = require('../../utils/hash');

// Mock dependencies
jest.mock('../../config/prismaConfig', () => ({
  prisma: {
    employee: {
      findUnique: jest.fn(),
      findMany: jest.fn()
    },
    meeting: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn()
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

jest.mock('../../utils/shortcode');
jest.mock('../../utils/hash');


const { prisma } = require('../../config/prismaConfig');

describe('MeetingService', () => {
  let mockEmployee;
  let mockMeeting;
  let mockParticipant;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock data
    mockEmployee = {
      id: 'emp123',
      empName: 'John Doe',
      empEmail: 'john@company.com',
      empTechnology: 'React',
      isActive: true
    };

    mockMeeting = {
      id: 'meeting123',
      title: 'Test Meeting',
      description: 'A test meeting',
      type: 'BASIC',
      hostId: 'emp123',
      roomCode: 'ABC123',
      passwordHash: null,
      status: 'SCHEDULED',
      isPersistent: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      host: mockEmployee
    };

    mockParticipant = {
      id: 'participant123',
      meetingId: 'meeting123',
      empId: 'emp123',
      role: 'PARTICIPANT',
      joinedAt: new Date(),
      leftAt: null,
      attendanceSec: 0,
      isBanned: false,
      employee: mockEmployee
    };

    // Default mock implementations
    generateShortcode.mockReturnValue('ABC123');
    hashMeetingPassword.mockResolvedValue('hashed_password');
    verifyMeetingPassword.mockResolvedValue(true);
  });

  describe('createMeeting', () => {
    test('should create a meeting successfully', async () => {
      prisma.employee.findUnique.mockResolvedValue(mockEmployee);
      prisma.meeting.findUnique.mockResolvedValue(null); // No existing meeting with same room code
      prisma.meeting.create.mockResolvedValue(mockMeeting);

      const result = await meetingService.createMeeting({
        hostId: 'emp123',
        title: 'Test Meeting',
        description: 'A test meeting',
        type: 'BASIC'
      });

      expect(result).toEqual(mockMeeting);
      expect(prisma.employee.findUnique).toHaveBeenCalledWith({
        where: { id: 'emp123', isActive: true }
      });
      expect(generateShortcode).toHaveBeenCalled();
      expect(prisma.meeting.create).toHaveBeenCalledWith({
        data: {
          title: 'Test Meeting',
          description: 'A test meeting',
          type: 'BASIC',
          hostId: 'emp123',
          roomCode: 'ABC123',
          passwordHash: null,
          scheduledStart: undefined,
          scheduledEnd: undefined,
          isPersistent: false,
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
    });

    test('should create meeting with password', async () => {
      prisma.employee.findUnique.mockResolvedValue(mockEmployee);
      prisma.meeting.findUnique.mockResolvedValue(null);
      prisma.meeting.create.mockResolvedValue({
        ...mockMeeting,
        passwordHash: 'hashed_password'
      });

      const result = await meetingService.createMeeting({
        hostId: 'emp123',
        title: 'Test Meeting',
        type: 'BASIC',
        password: 'secret123'
      });

      expect(hashMeetingPassword).toHaveBeenCalledWith('secret123');
      expect(result.passwordHash).toBe('hashed_password');
    });

    test('should throw error if host not found', async () => {
      prisma.employee.findUnique.mockResolvedValue(null);

      await expect(
        meetingService.createMeeting({
          hostId: 'invalid',
          title: 'Test Meeting',
          type: 'BASIC'
        })
      ).rejects.toThrow('Host not found or inactive');
    });

    test('should throw error if room code generation fails', async () => {
      prisma.employee.findUnique.mockResolvedValue(mockEmployee);
      prisma.meeting.findUnique.mockResolvedValue(mockMeeting); // Always return existing meeting

      await expect(
        meetingService.createMeeting({
          hostId: 'emp123',
          title: 'Test Meeting',
          type: 'BASIC'
        })
      ).rejects.toThrow('Failed to generate unique room code');
    });
  });

  describe('updateMeeting', () => {
    test('should update meeting successfully', async () => {
      prisma.meeting.findUnique.mockResolvedValue(mockMeeting);
      prisma.meeting.update.mockResolvedValue({
        ...mockMeeting,
        title: 'Updated Meeting'
      });

      const result = await meetingService.updateMeeting({
        meetingId: 'meeting123',
        byEmpId: 'emp123',
        title: 'Updated Meeting'
      });

      expect(result.title).toBe('Updated Meeting');
      expect(prisma.meeting.update).toHaveBeenCalled();
    });

    test('should throw error if meeting not found', async () => {
      prisma.meeting.findUnique.mockResolvedValue(null);

      await expect(
        meetingService.updateMeeting({
          meetingId: 'invalid',
          byEmpId: 'emp123',
          title: 'Updated Meeting'
        })
      ).rejects.toThrow('Meeting not found');
    });

    test('should throw error if not the host', async () => {
      prisma.meeting.findUnique.mockResolvedValue(mockMeeting);

      await expect(
        meetingService.updateMeeting({
          meetingId: 'meeting123',
          byEmpId: 'other_emp',
          title: 'Updated Meeting'
        })
      ).rejects.toThrow('Only meeting host can update meeting');
    });

    test('should throw error if meeting is ended', async () => {
      prisma.meeting.findUnique.mockResolvedValue({
        ...mockMeeting,
        status: 'ENDED'
      });

      await expect(
        meetingService.updateMeeting({
          meetingId: 'meeting123',
          byEmpId: 'emp123',
          title: 'Updated Meeting'
        })
      ).rejects.toThrow('Cannot update ended or canceled meeting');
    });
  });

  describe('cancelMeeting', () => {
    test('should cancel meeting successfully', async () => {
      prisma.meeting.findUnique.mockResolvedValue(mockMeeting);
      prisma.meeting.update.mockResolvedValue({
        ...mockMeeting,
        status: 'CANCELED'
      });

      const result = await meetingService.cancelMeeting({
        meetingId: 'meeting123',
        byEmpId: 'emp123'
      });

      expect(result.status).toBe('CANCELED');
      expect(prisma.meeting.update).toHaveBeenCalledWith({
        where: { id: 'meeting123' },
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
    });

    test('should throw error if not the host', async () => {
      prisma.meeting.findUnique.mockResolvedValue(mockMeeting);

      await expect(
        meetingService.cancelMeeting({
          meetingId: 'meeting123',
          byEmpId: 'other_emp'
        })
      ).rejects.toThrow('Only meeting host can cancel meeting');
    });
  });

  describe('startMeeting', () => {
    test('should start meeting successfully', async () => {
      prisma.meeting.findUnique.mockResolvedValue(mockMeeting);
      prisma.meeting.update.mockResolvedValue({
        ...mockMeeting,
        status: 'LIVE',
        actualStart: new Date()
      });

      const result = await meetingService.startMeeting({
        meetingId: 'meeting123',
        byEmpId: 'emp123'
      });

      expect(result.status).toBe('LIVE');
      expect(result.actualStart).toBeDefined();
    });

    test('should throw error if meeting already live', async () => {
      prisma.meeting.findUnique.mockResolvedValue({
        ...mockMeeting,
        status: 'LIVE'
      });

      await expect(
        meetingService.startMeeting({
          meetingId: 'meeting123',
          byEmpId: 'emp123'
        })
      ).rejects.toThrow('Meeting is already live');
    });
  });

  describe('endMeeting', () => {
    test('should end meeting successfully with attendance recomputation', async () => {
      const mockMeetingWithHost = {
        ...mockMeeting,
        status: 'LIVE',
        host: { id: 'emp123', empName: 'Host User' }
      };

      const mockActiveParticipants = [
        {
          id: 'participant1',
          meetingId: 'meeting123',
          empId: 'emp1',
          joinedAt: new Date(Date.now() - 3600000), // 1 hour ago
          leftAt: null,
          attendanceSec: 0
        }
      ];

      prisma.meeting.findUnique.mockResolvedValue(mockMeetingWithHost);
      prisma.meetingParticipant.findMany.mockResolvedValue(mockActiveParticipants);
      prisma.meetingParticipant.update.mockResolvedValue({
        ...mockActiveParticipants[0],
        leftAt: new Date(),
        attendanceSec: 3600
      });
      prisma.meeting.update.mockResolvedValue({
        ...mockMeetingWithHost,
        status: 'ENDED',
        actualEnd: new Date()
      });

      const result = await meetingService.endMeeting({
        meetingId: 'meeting123',
        byEmpId: 'emp123'
      });

      expect(prisma.meetingParticipant.findMany).toHaveBeenCalledWith({
        where: {
          meetingId: 'meeting123',
          joinedAt: { not: null },
          leftAt: null
        }
      });

      expect(prisma.meetingParticipant.update).toHaveBeenCalledWith({
        where: { id: 'participant1' },
        data: {
          leftAt: expect.any(Date),
          attendanceSec: 3600
        }
      });

      expect(result.status).toBe('ENDED');
      expect(result.actualEnd).toBeDefined();
    });

    test('should end meeting with no active participants', async () => {
      const mockMeetingWithHost = {
        ...mockMeeting,
        status: 'LIVE',
        host: { id: 'emp123', empName: 'Host User' }
      };

      prisma.meeting.findUnique.mockResolvedValue(mockMeetingWithHost);
      prisma.meetingParticipant.findMany.mockResolvedValue([]);
      prisma.meeting.update.mockResolvedValue({
        ...mockMeetingWithHost,
        status: 'ENDED',
        actualEnd: new Date()
      });

      const result = await meetingService.endMeeting({
        meetingId: 'meeting123',
        byEmpId: 'emp123'
      });

      expect(prisma.meetingParticipant.findMany).toHaveBeenCalled();
      expect(prisma.meetingParticipant.update).not.toHaveBeenCalled();
      expect(result.status).toBe('ENDED');
    });
  });

  describe('getMeetingByCode', () => {
    test('should return meeting by room code', async () => {
      prisma.meeting.findUnique.mockResolvedValue(mockMeeting);

      const result = await meetingService.getMeetingByCode('ABC123');

      expect(result).toEqual(mockMeeting);
      expect(prisma.meeting.findUnique).toHaveBeenCalledWith({
        where: { roomCode: 'ABC123' },
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
    });

    test('should return null if meeting not found', async () => {
      prisma.meeting.findUnique.mockResolvedValue(null);

      const result = await meetingService.getMeetingByCode('INVALID');

      expect(result).toBeNull();
    });
  });

  describe('listMeetingsForAdmin', () => {
    test('should return paginated meetings for admin', async () => {
      const mockMeetings = [mockMeeting];
      prisma.meeting.findMany.mockResolvedValue(mockMeetings);
      prisma.meeting.count.mockResolvedValue(1);

      const result = await meetingService.listMeetingsForAdmin({
        page: 1,
        limit: 20
      });

      expect(result.meetings).toEqual(mockMeetings);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        pages: 1
      });
    });

    test('should apply filters correctly', async () => {
      prisma.meeting.findMany.mockResolvedValue([]);
      prisma.meeting.count.mockResolvedValue(0);

      await meetingService.listMeetingsForAdmin({
        hostId: 'emp123',
        type: 'BASIC',
        status: 'LIVE',
        page: 1,
        limit: 10
      });

      expect(prisma.meeting.findMany).toHaveBeenCalledWith({
        where: {
          hostId: 'emp123',
          type: 'BASIC',
          status: 'LIVE'
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10
      });
    });
  });

  describe('listMeetingsForEmployee', () => {
    test('should return paginated meetings for employee', async () => {
      const mockMeetings = [mockMeeting];
      prisma.meeting.findMany.mockResolvedValue(mockMeetings);
      prisma.meeting.count.mockResolvedValue(1);

      const result = await meetingService.listMeetingsForEmployee({
        empId: 'emp123',
        page: 1,
        limit: 20
      });

      expect(result.meetings).toEqual(mockMeetings);
      expect(prisma.meeting.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { hostId: 'emp123' },
            {
              participants: {
                some: { empId: 'emp123' }
              }
            }
          ]
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20
      });
    });
  });

  describe('canJoin', () => {
    test('should allow join for valid meeting', async () => {
      prisma.meetingParticipant.findUnique.mockResolvedValue(null);

      const result = await meetingService.canJoin({
        meeting: mockMeeting,
        empId: 'emp123'
      });

      expect(result.canJoin).toBe(true);
    });

    test('should deny join for ended meeting', async () => {
      const result = await meetingService.canJoin({
        meeting: { ...mockMeeting, status: 'ENDED' },
        empId: 'emp123'
      });

      expect(result.canJoin).toBe(false);
      expect(result.reason).toBe('Meeting has ended or been canceled');
    });

    test('should deny join for banned participant', async () => {
      prisma.meetingParticipant.findUnique.mockResolvedValue({
        ...mockParticipant,
        isBanned: true
      });

      const result = await meetingService.canJoin({
        meeting: mockMeeting,
        empId: 'emp123'
      });

      expect(result.canJoin).toBe(false);
      expect(result.reason).toBe('You are banned from this meeting');
    });

    test('should require password for password-protected meeting', async () => {
      const passwordMeeting = {
        ...mockMeeting,
        passwordHash: 'hashed_password'
      };

      // Mock no existing participant (not banned)
      prisma.meetingParticipant.findUnique.mockResolvedValue(null);

      const result = await meetingService.canJoin({
        meeting: passwordMeeting,
        empId: 'emp123'
      });

      expect(result.canJoin).toBe(false);
      expect(result.reason).toBe('Meeting password required');
    });

    test('should validate password correctly', async () => {
      const passwordMeeting = {
        ...mockMeeting,
        passwordHash: 'hashed_password'
      };

      // Mock no existing participant (not banned)
      prisma.meetingParticipant.findUnique.mockResolvedValue(null);
      verifyMeetingPassword.mockResolvedValue(false);

      const result = await meetingService.canJoin({
        meeting: passwordMeeting,
        empId: 'emp123',
        password: 'wrong_password'
      });

      expect(result.canJoin).toBe(false);
      expect(result.reason).toBe('Invalid meeting password');
    });
  });

  describe('markJoin', () => {
    test('should create new participant with provided timeSheetId', async () => {
      const mockParticipantWithTimeSheet = {
        ...mockParticipant,
        timeSheetId: 'timesheet123',
        timeSheet: {
          id: 'timesheet123',
          clockIn: '09:00',
          clockOut: '',
          status: 'PRESENT'
        }
      };

      prisma.meetingParticipant.findUnique.mockResolvedValue(null);
      prisma.meetingParticipant.create.mockResolvedValue(mockParticipantWithTimeSheet);

      const result = await meetingService.markJoin({
        meetingId: 'meeting123',
        empId: 'emp123',
        timeSheetId: 'timesheet123'
      });

      expect(result.success).toBe(true);
      expect(result.participant).toEqual(mockParticipantWithTimeSheet);
      expect(prisma.meetingParticipant.create).toHaveBeenCalledWith({
        data: {
          meetingId: 'meeting123',
          empId: 'emp123',
          joinedAt: expect.any(Date),
          timeSheetId: 'timesheet123'
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
    });

    test('should create new participant and link to active timesheet', async () => {
      const mockTimeSheet = {
        id: 'timesheet123',
        empId: 'emp123',
        clockIn: '09:00',
        clockOut: '',
        status: 'PRESENT',
        isActive: true,
        createdAt: new Date()
      };

      const mockParticipantWithTimeSheet = {
        ...mockParticipant,
        timeSheetId: 'timesheet123',
        timeSheet: mockTimeSheet
      };

      prisma.meetingParticipant.findUnique.mockResolvedValue(null);
      prisma.timeSheet.findFirst.mockResolvedValue(mockTimeSheet);
      prisma.meetingParticipant.create.mockResolvedValue(mockParticipantWithTimeSheet);

      const result = await meetingService.markJoin({
        meetingId: 'meeting123',
        empId: 'emp123'
      });

      expect(result.success).toBe(true);
      expect(result.participant.timeSheetId).toBe('timesheet123');
      expect(prisma.timeSheet.findFirst).toHaveBeenCalled();
      expect(prisma.meetingParticipant.create).toHaveBeenCalledWith({
        data: {
          meetingId: 'meeting123',
          empId: 'emp123',
          joinedAt: expect.any(Date),
          timeSheetId: 'timesheet123'
        },
        include: expect.any(Object)
      });
    });

    test('should create new participant without timesheet when none found', async () => {
      const mockParticipantWithoutTimeSheet = {
        ...mockParticipant,
        timeSheetId: null,
        timeSheet: null
      };

      prisma.meetingParticipant.findUnique.mockResolvedValue(null);
      prisma.timeSheet.findFirst.mockResolvedValue(null);
      prisma.meetingParticipant.create.mockResolvedValue(mockParticipantWithoutTimeSheet);

      const result = await meetingService.markJoin({
        meetingId: 'meeting123',
        empId: 'emp123'
      });

      expect(result.success).toBe(true);
      expect(result.participant.timeSheetId).toBeNull();
      expect(prisma.timeSheet.findFirst).toHaveBeenCalled();
      expect(prisma.meetingParticipant.create).toHaveBeenCalledWith({
        data: {
          meetingId: 'meeting123',
          empId: 'emp123',
          joinedAt: expect.any(Date),
          timeSheetId: undefined
        },
        include: expect.any(Object)
      });
    });

    test('should update existing participant join time', async () => {
      const existingParticipant = {
        ...mockParticipant,
        joinedAt: null
      };

      prisma.meetingParticipant.findUnique.mockResolvedValue(existingParticipant);
      prisma.meetingParticipant.update.mockResolvedValue({
        ...existingParticipant,
        joinedAt: new Date()
      });

      const result = await meetingService.markJoin({
        meetingId: 'meeting123',
        empId: 'emp123'
      });

      expect(result.success).toBe(true);
      expect(prisma.meetingParticipant.update).toHaveBeenCalled();
    });
  });

  describe('markLeave', () => {
    test('should update participant leave time and attendance', async () => {
      const participantWithJoinTime = {
        ...mockParticipant,
        joinedAt: new Date(Date.now() - 60000), // 1 minute ago
        leftAt: null,
        attendanceSec: 0
      };

      prisma.meetingParticipant.findUnique.mockResolvedValue(participantWithJoinTime);
      prisma.meetingParticipant.update.mockResolvedValue({
        ...participantWithJoinTime,
        leftAt: expect.any(Date),
        attendanceSec: 60
      });

      const result = await meetingService.markLeave({
        meetingId: 'meeting123',
        empId: 'emp123'
      });

      expect(result.success).toBe(true);
      expect(result.participant.attendanceSec).toBe(60);
      expect(prisma.meetingParticipant.update).toHaveBeenCalled();
    });

    test('should throw error if participant not found', async () => {
      prisma.meetingParticipant.findUnique.mockResolvedValue(null);

      await expect(
        meetingService.markLeave({
          meetingId: 'meeting123',
          empId: 'emp123'
        })
      ).rejects.toThrow('Participant not found');
    });
  });
});
