const jwt = require('jsonwebtoken');
const meetingAuthService = require('../../service/meetingAuthService');

// Mock dependencies
jest.mock('../../config/prismaConfig', () => ({
  prisma: {
    meeting: {
      findUnique: jest.fn()
    },
    employee: {
      findUnique: jest.fn()
    },
    meetingParticipant: {
      findUnique: jest.fn()
    }
  }
}));

jest.mock('../../utils/logger');

const { prisma } = require('../../config/prismaConfig');

describe('MeetingAuthService', () => {
  let mockMeeting;
  let mockEmployee;
  let mockParticipant;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock data
    mockMeeting = {
      id: 'meeting123',
      title: 'Test Meeting',
      hostId: 'emp123',
      status: 'LIVE'
    };

    mockEmployee = {
      id: 'emp123',
      empName: 'John Doe',
      empEmail: 'john@company.com',
      isActive: true
    };

    mockParticipant = {
      id: 'participant123',
      meetingId: 'meeting123',
      empId: 'emp123',
      role: 'PARTICIPANT',
      isBanned: false
    };

    // Mock JWT
    process.env.MEETING_JWT_SECRET = 'test-secret';
  });

  describe('issueMeetingAccessToken', () => {
    test('should issue token for host successfully', async () => {
      prisma.meeting.findUnique.mockResolvedValue(mockMeeting);
      prisma.employee.findUnique.mockResolvedValue(mockEmployee);

      const token = await meetingAuthService.issueMeetingAccessToken({
        meetingId: 'meeting123',
        empId: 'emp123',
        role: 'HOST'
      });

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      // Verify token payload
      const decoded = jwt.verify(token, process.env.MEETING_JWT_SECRET);
      expect(decoded.sub).toBe('emp123');
      expect(decoded.meetingId).toBe('meeting123');
      expect(decoded.role).toBe('HOST');
      expect(decoded.type).toBe('meeting_access');
    });

    test('should issue token for participant successfully', async () => {
      prisma.meeting.findUnique.mockResolvedValue(mockMeeting);
      prisma.employee.findUnique.mockResolvedValue(mockEmployee);
      prisma.meetingParticipant.findUnique.mockResolvedValue(mockParticipant);

      const token = await meetingAuthService.issueMeetingAccessToken({
        meetingId: 'meeting123',
        empId: 'emp123',
        role: 'PARTICIPANT'
      });

      expect(token).toBeDefined();
      const decoded = jwt.verify(token, process.env.MEETING_JWT_SECRET);
      expect(decoded.role).toBe('PARTICIPANT');
    });

    test('should throw error if meeting not found', async () => {
      prisma.meeting.findUnique.mockResolvedValue(null);

      await expect(
        meetingAuthService.issueMeetingAccessToken({
          meetingId: 'invalid',
          empId: 'emp123',
          role: 'HOST'
        })
      ).rejects.toThrow('Meeting not found');
    });

    test('should throw error if employee not found', async () => {
      prisma.meeting.findUnique.mockResolvedValue(mockMeeting);
      prisma.employee.findUnique.mockResolvedValue(null);

      await expect(
        meetingAuthService.issueMeetingAccessToken({
          meetingId: 'meeting123',
          empId: 'invalid',
          role: 'HOST'
        })
      ).rejects.toThrow('Employee not found or inactive');
    });

    test('should throw error if invalid role', async () => {
      prisma.meeting.findUnique.mockResolvedValue(mockMeeting);
      prisma.employee.findUnique.mockResolvedValue(mockEmployee);

      await expect(
        meetingAuthService.issueMeetingAccessToken({
          meetingId: 'meeting123',
          empId: 'emp123',
          role: 'INVALID_ROLE'
        })
      ).rejects.toThrow('Invalid meeting role');
    });

    test('should throw error if employee is not the host', async () => {
      prisma.meeting.findUnique.mockResolvedValue(mockMeeting);
      prisma.employee.findUnique.mockResolvedValue(mockEmployee);

      await expect(
        meetingAuthService.issueMeetingAccessToken({
          meetingId: 'meeting123',
          empId: 'other_emp',
          role: 'HOST'
        })
      ).rejects.toThrow('Employee is not the meeting host');
    });

    test('should throw error if participant not found', async () => {
      prisma.meeting.findUnique.mockResolvedValue(mockMeeting);
      prisma.employee.findUnique.mockResolvedValue(mockEmployee);
      prisma.meetingParticipant.findUnique.mockResolvedValue(null);

      await expect(
        meetingAuthService.issueMeetingAccessToken({
          meetingId: 'meeting123',
          empId: 'emp123',
          role: 'PARTICIPANT'
        })
      ).rejects.toThrow('Employee is not a meeting participant');
    });

    test('should throw error if participant is banned', async () => {
      prisma.meeting.findUnique.mockResolvedValue(mockMeeting);
      prisma.employee.findUnique.mockResolvedValue(mockEmployee);
      prisma.meetingParticipant.findUnique.mockResolvedValue({
        ...mockParticipant,
        isBanned: true
      });

      await expect(
        meetingAuthService.issueMeetingAccessToken({
          meetingId: 'meeting123',
          empId: 'emp123',
          role: 'PARTICIPANT'
        })
      ).rejects.toThrow('Employee is banned from this meeting');
    });
  });

  describe('verifyMeetingAccessToken', () => {
    test('should verify valid token successfully', async () => {
      const token = jwt.sign({
        sub: 'emp123',
        meetingId: 'meeting123',
        role: 'HOST',
        type: 'meeting_access'
      }, process.env.MEETING_JWT_SECRET, { expiresIn: '15m' });

      prisma.meeting.findUnique.mockResolvedValue(mockMeeting);
      prisma.employee.findUnique.mockResolvedValue(mockEmployee);

      const decoded = await meetingAuthService.verifyMeetingAccessToken(token);

      expect(decoded.sub).toBe('emp123');
      expect(decoded.meetingId).toBe('meeting123');
      expect(decoded.role).toBe('HOST');
    });

    test('should verify participant token successfully', async () => {
      const token = jwt.sign({
        sub: 'emp123',
        meetingId: 'meeting123',
        role: 'PARTICIPANT',
        type: 'meeting_access'
      }, process.env.MEETING_JWT_SECRET, { expiresIn: '15m' });

      prisma.meeting.findUnique.mockResolvedValue(mockMeeting);
      prisma.employee.findUnique.mockResolvedValue(mockEmployee);
      prisma.meetingParticipant.findUnique.mockResolvedValue(mockParticipant);

      const decoded = await meetingAuthService.verifyMeetingAccessToken(token);

      expect(decoded.role).toBe('PARTICIPANT');
    });

    test('should throw error if token is missing', async () => {
      await expect(
        meetingAuthService.verifyMeetingAccessToken(null)
      ).rejects.toThrow('Token is required');
    });

    test('should throw error if token is invalid', async () => {
      await expect(
        meetingAuthService.verifyMeetingAccessToken('invalid-token')
      ).rejects.toThrow('Invalid token');
    });

    test('should throw error if token type is invalid', async () => {
      const token = jwt.sign({
        sub: 'emp123',
        meetingId: 'meeting123',
        role: 'HOST',
        type: 'invalid_type'
      }, process.env.MEETING_JWT_SECRET, { expiresIn: '15m' });

      await expect(
        meetingAuthService.verifyMeetingAccessToken(token)
      ).rejects.toThrow('Invalid token type');
    });

    test('should throw error if token payload is incomplete', async () => {
      const token = jwt.sign({
        sub: 'emp123',
        // missing meetingId and role
        type: 'meeting_access'
      }, process.env.MEETING_JWT_SECRET, { expiresIn: '15m' });

      await expect(
        meetingAuthService.verifyMeetingAccessToken(token)
      ).rejects.toThrow('Invalid token payload');
    });

    test('should throw error if meeting not found', async () => {
      const token = jwt.sign({
        sub: 'emp123',
        meetingId: 'meeting123',
        role: 'HOST',
        type: 'meeting_access'
      }, process.env.MEETING_JWT_SECRET, { expiresIn: '15m' });

      prisma.meeting.findUnique.mockResolvedValue(null);

      await expect(
        meetingAuthService.verifyMeetingAccessToken(token)
      ).rejects.toThrow('Meeting not found');
    });

    test('should throw error if meeting is ended', async () => {
      const token = jwt.sign({
        sub: 'emp123',
        meetingId: 'meeting123',
        role: 'HOST',
        type: 'meeting_access'
      }, process.env.MEETING_JWT_SECRET, { expiresIn: '15m' });

      prisma.meeting.findUnique.mockResolvedValue({
        ...mockMeeting,
        status: 'ENDED'
      });

      await expect(
        meetingAuthService.verifyMeetingAccessToken(token)
      ).rejects.toThrow('Meeting has ended or been canceled');
    });

    test('should throw error if employee not found', async () => {
      const token = jwt.sign({
        sub: 'emp123',
        meetingId: 'meeting123',
        role: 'HOST',
        type: 'meeting_access'
      }, process.env.MEETING_JWT_SECRET, { expiresIn: '15m' });

      prisma.meeting.findUnique.mockResolvedValue(mockMeeting);
      prisma.employee.findUnique.mockResolvedValue(null);

      await expect(
        meetingAuthService.verifyMeetingAccessToken(token)
      ).rejects.toThrow('Employee not found or inactive');
    });

    test('should throw error if participant is no longer in meeting', async () => {
      const token = jwt.sign({
        sub: 'emp123',
        meetingId: 'meeting123',
        role: 'PARTICIPANT',
        type: 'meeting_access'
      }, process.env.MEETING_JWT_SECRET, { expiresIn: '15m' });

      prisma.meeting.findUnique.mockResolvedValue(mockMeeting);
      prisma.employee.findUnique.mockResolvedValue(mockEmployee);
      prisma.meetingParticipant.findUnique.mockResolvedValue(null);

      await expect(
        meetingAuthService.verifyMeetingAccessToken(token)
      ).rejects.toThrow('Employee is no longer a meeting participant');
    });

    test('should throw error if participant is banned', async () => {
      const token = jwt.sign({
        sub: 'emp123',
        meetingId: 'meeting123',
        role: 'PARTICIPANT',
        type: 'meeting_access'
      }, process.env.MEETING_JWT_SECRET, { expiresIn: '15m' });

      prisma.meeting.findUnique.mockResolvedValue(mockMeeting);
      prisma.employee.findUnique.mockResolvedValue(mockEmployee);
      prisma.meetingParticipant.findUnique.mockResolvedValue({
        ...mockParticipant,
        isBanned: true
      });

      await expect(
        meetingAuthService.verifyMeetingAccessToken(token)
      ).rejects.toThrow('Employee is banned from this meeting');
    });
  });

  describe('extractTokenFromHeader', () => {
    test('should extract token from valid header', () => {
      const token = meetingAuthService.extractTokenFromHeader('Bearer test-token');
      expect(token).toBe('test-token');
    });

    test('should return null for missing header', () => {
      const token = meetingAuthService.extractTokenFromHeader(null);
      expect(token).toBeNull();
    });

    test('should return null for invalid header format', () => {
      const token = meetingAuthService.extractTokenFromHeader('Invalid test-token');
      expect(token).toBeNull();
    });

    test('should return null for header without token', () => {
      const token = meetingAuthService.extractTokenFromHeader('Bearer ');
      expect(token).toBe('');
    });
  });

  describe('Permission checks', () => {
    const mockUser = {
      empId: 'emp123',
      meetingId: 'meeting123',
      role: 'HOST'
    };

    test('isHost should return true for host', () => {
      const result = meetingAuthService.isHost(mockUser, 'meeting123');
      expect(result).toBe(true);
    });

    test('isHost should return false for non-host', () => {
      const participantUser = { ...mockUser, role: 'PARTICIPANT' };
      const result = meetingAuthService.isHost(participantUser, 'meeting123');
      expect(result).toBe(false);
    });

    test('isHost should return false for different meeting', () => {
      const result = meetingAuthService.isHost(mockUser, 'different-meeting');
      expect(result).toBe(false);
    });

    test('isCohost should return true for host', () => {
      const result = meetingAuthService.isCohost(mockUser, 'meeting123');
      expect(result).toBe(true);
    });

    test('isCohost should return true for cohost', () => {
      const cohostUser = { ...mockUser, role: 'COHOST' };
      const result = meetingAuthService.isCohost(cohostUser, 'meeting123');
      expect(result).toBe(true);
    });

    test('isCohost should return false for participant', () => {
      const participantUser = { ...mockUser, role: 'PARTICIPANT' };
      const result = meetingAuthService.isCohost(participantUser, 'meeting123');
      expect(result).toBe(false);
    });

    test('isParticipant should return true for any role in meeting', () => {
      const result = meetingAuthService.isParticipant(mockUser, 'meeting123');
      expect(result).toBe(true);
    });

    test('isParticipant should return false for different meeting', () => {
      const result = meetingAuthService.isParticipant(mockUser, 'different-meeting');
      expect(result).toBe(false);
    });
  });

  describe('Socket.IO middleware', () => {
    test('should authenticate socket successfully', async () => {
      const token = jwt.sign({
        sub: 'emp123',
        meetingId: 'meeting123',
        role: 'HOST',
        type: 'meeting_access'
      }, process.env.MEETING_JWT_SECRET, { expiresIn: '15m' });

      const mockSocket = {
        id: 'socket123',
        handshake: {
          auth: {
            meetingAccessToken: `Bearer ${token}`
          }
        },
        join: jest.fn()
      };

      const mockNext = jest.fn();

      prisma.meeting.findUnique.mockResolvedValue(mockMeeting);
      prisma.employee.findUnique.mockResolvedValue(mockEmployee);

      await meetingAuthService.socketAuthMiddleware(mockSocket, mockNext);

      expect(mockSocket.user).toEqual({
        empId: 'emp123',
        meetingId: 'meeting123',
        role: 'HOST'
      });
      expect(mockSocket.join).toHaveBeenCalledWith('meeting:meeting123');
      expect(mockNext).toHaveBeenCalledWith();
    });

    test('should reject socket without token', async () => {
      const mockSocket = {
        id: 'socket123',
        handshake: {
          auth: {}
        }
      };

      const mockNext = jest.fn();

      await meetingAuthService.socketAuthMiddleware(mockSocket, mockNext);

      expect(mockNext).toHaveBeenCalledWith(new Error('Meeting access token required'));
    });

    test('should reject socket with invalid token', async () => {
      const mockSocket = {
        id: 'socket123',
        handshake: {
          auth: {
            meetingAccessToken: 'Bearer invalid-token'
          }
        }
      };

      const mockNext = jest.fn();

      await meetingAuthService.socketAuthMiddleware(mockSocket, mockNext);

      expect(mockNext).toHaveBeenCalledWith(new Error('Authentication failed'));
    });
  });
});





