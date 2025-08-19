const request = require('supertest');
const express = require('express');
const empMeetingRoute = require('../../employee_app/routes/empMeetingRoute');
const meetingService = require('../../service/meetingService');
const meetingAuthService = require('../../service/meetingAuthService');
const { authentication } = require('../../middleware/authToken');

// Mock dependencies
jest.mock('../../service/meetingService');
jest.mock('../../service/meetingAuthService');
jest.mock('../../middleware/authToken');
jest.mock('../../config/prismaConfig', () => ({
  prisma: {
    meeting: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn()
    },
    meetingParticipant: {
      findUnique: jest.fn(),
      update: jest.fn()
    }
  }
}));

const { prisma } = require('../../config/prismaConfig');

describe('Employee Meeting Routes', () => {
  let app;
  let mockEmployeeUser;
  let mockAdminUser;
  let mockMeeting;
  let mockParticipant;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock users
    mockEmployeeUser = {
      id: 'emp123',
      role: 'EMPLOYEE',
      empName: 'Employee User',
      empEmail: 'employee@company.com'
    };

    mockAdminUser = {
      id: 'admin123',
      role: 'ADMIN',
      empName: 'Admin User',
      empEmail: 'admin@company.com'
    };

    mockMeeting = {
      id: 'meeting123',
      title: 'Test Meeting',
      description: 'A test meeting',
      type: 'BASIC',
      hostId: 'admin123',
      roomCode: 'ABC123',
      status: 'SCHEDULED',
      isPersistent: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      host: mockAdminUser,
      participants: []
    };

    mockParticipant = {
      id: 'participant123',
      meetingId: 'meeting123',
      empId: 'emp123',
      role: 'PARTICIPANT',
      joinedAt: new Date().toISOString(),
      leftAt: null,
      attendanceSec: 0,
      isBanned: false,
      employee: mockEmployeeUser
    };

    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/emp/meetings', empMeetingRoute);
  });

  describe('Authentication & Authorization', () => {
    test('should return 401 when no token provided', async () => {
      authentication.mockImplementation((req, res, next) => {
        return res.status(401).json({
          success: false,
          message: 'Token Not Found'
        });
      });

      const response = await request(app)
        .get('/emp/meetings')
        .expect(401);

      expect(response.body.message).toBe('Token Not Found');
    });

    test('should return 403 when non-employee user tries to access', async () => {
      authentication.mockImplementation((req, res, next) => {
        req.user = mockAdminUser;
        next();
      });

      const response = await request(app)
        .get('/emp/meetings')
        .expect(403);

      expect(response.body.message).toBe('Access denied. Employee privileges required.');
    });

    test('should allow employee user to access routes', async () => {
      authentication.mockImplementation((req, res, next) => {
        req.user = mockEmployeeUser;
        next();
      });

      meetingService.listMeetingsForEmployee.mockResolvedValue({
        meetings: [mockMeeting],
        pagination: { page: 1, limit: 20, total: 1, pages: 1 }
      });

      const response = await request(app)
        .get('/emp/meetings')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /emp/meetings', () => {
    beforeEach(() => {
      authentication.mockImplementation((req, res, next) => {
        req.user = mockEmployeeUser;
        next();
      });
    });

    test('should list employee meetings successfully', async () => {
      const mockResult = {
        meetings: [mockMeeting],
        pagination: { page: 1, limit: 20, total: 1, pages: 1 }
      };

      meetingService.listMeetingsForEmployee.mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/emp/meetings')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResult);
    });

    test('should apply filters correctly', async () => {
      meetingService.listMeetingsForEmployee.mockResolvedValue({
        meetings: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 0 }
      });

      await request(app)
        .get('/emp/meetings?type=BASIC&status=LIVE&page=2&limit=10')
        .expect(200);

      expect(meetingService.listMeetingsForEmployee).toHaveBeenCalledWith({
        empId: 'emp123',
        type: 'BASIC',
        status: 'LIVE',
        page: 2,
        limit: 10
      });
    });

    test('should return 400 for invalid pagination', async () => {
      const response = await request(app)
        .get('/emp/meetings?page=0&limit=200')
        .expect(400);

      expect(response.body.message).toBe('Invalid pagination parameters');
    });
  });

  describe('GET /emp/meetings/:roomCode', () => {
    beforeEach(() => {
      authentication.mockImplementation((req, res, next) => {
        req.user = mockEmployeeUser;
        next();
      });
    });

    test('should get meeting details successfully', async () => {
      meetingService.getMeetingByCode.mockResolvedValue(mockMeeting);
      meetingService.canJoin.mockResolvedValue({ canJoin: true });

      const response = await request(app)
        .get('/emp/meetings/ABC123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.meeting).toEqual(mockMeeting);
      expect(response.body.data.canJoin).toBe(true);
    });

    test('should return 404 when meeting not found', async () => {
      meetingService.getMeetingByCode.mockResolvedValue(null);

      const response = await request(app)
        .get('/emp/meetings/INVALID')
        .expect(404);

      expect(response.body.message).toBe('Meeting not found');
    });

    test('should show participant status correctly', async () => {
      const meetingWithParticipant = {
        ...mockMeeting,
        participants: [mockParticipant]
      };

      meetingService.getMeetingByCode.mockResolvedValue(meetingWithParticipant);
      meetingService.canJoin.mockResolvedValue({ canJoin: true });

      const response = await request(app)
        .get('/emp/meetings/ABC123')
        .expect(200);

      expect(response.body.data.isParticipant).toBe(true);
      expect(response.body.data.role).toBe('PARTICIPANT');
    });

    test('should show host role correctly', async () => {
      const meetingAsHost = {
        ...mockMeeting,
        hostId: 'emp123',
        host: mockEmployeeUser
      };

      meetingService.getMeetingByCode.mockResolvedValue(meetingAsHost);
      meetingService.canJoin.mockResolvedValue({ canJoin: true });

      const response = await request(app)
        .get('/emp/meetings/ABC123')
        .expect(200);

      expect(response.body.data.role).toBe('HOST');
    });
  });

  describe('POST /emp/meetings/:roomCode/join', () => {
    beforeEach(() => {
      authentication.mockImplementation((req, res, next) => {
        req.user = mockEmployeeUser;
        next();
      });
    });

    test('should join meeting successfully', async () => {
      meetingService.getMeetingByCode.mockResolvedValue(mockMeeting);
      meetingService.canJoin.mockResolvedValue({ canJoin: true });
      meetingService.markJoin.mockResolvedValue({ success: true, participant: mockParticipant });
      meetingAuthService.issueMeetingAccessToken.mockResolvedValue('mock-token');

      const response = await request(app)
        .post('/emp/meetings/ABC123/join')
        .send({ password: 'test123' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Successfully joined meeting');
      expect(response.body.data.meetingAccessToken).toBe('mock-token');
    });

    test('should return 404 when meeting not found', async () => {
      meetingService.getMeetingByCode.mockResolvedValue(null);

      const response = await request(app)
        .post('/emp/meetings/INVALID/join')
        .send({ password: 'test123' })
        .expect(404);

      expect(response.body.message).toBe('Meeting not found');
    });

    test('should return 403 when cannot join', async () => {
      meetingService.getMeetingByCode.mockResolvedValue(mockMeeting);
      meetingService.canJoin.mockResolvedValue({ 
        canJoin: false, 
        reason: 'Meeting password required' 
      });

      const response = await request(app)
        .post('/emp/meetings/ABC123/join')
        .send({})
        .expect(403);

      expect(response.body.message).toBe('Meeting password required');
    });

    test('should join without password for non-password-protected meeting', async () => {
      meetingService.getMeetingByCode.mockResolvedValue(mockMeeting);
      meetingService.canJoin.mockResolvedValue({ canJoin: true });
      meetingService.markJoin.mockResolvedValue({ success: true, participant: mockParticipant });
      meetingAuthService.issueMeetingAccessToken.mockResolvedValue('mock-token');

      const response = await request(app)
        .post('/emp/meetings/ABC123/join')
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /emp/meetings/:roomCode/leave', () => {
    beforeEach(() => {
      authentication.mockImplementation((req, res, next) => {
        req.user = mockEmployeeUser;
        next();
      });
    });

    test('should leave meeting successfully', async () => {
      const meetingWithParticipant = {
        ...mockMeeting,
        participants: [mockParticipant]
      };

      meetingService.getMeetingByCode.mockResolvedValue(meetingWithParticipant);
      meetingService.markLeave.mockResolvedValue({ 
        success: true, 
        participant: { ...mockParticipant, attendanceSec: 300 } 
      });

      const response = await request(app)
        .post('/emp/meetings/ABC123/leave')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Successfully left meeting');
      expect(response.body.data.attendanceSec).toBe(300);
    });

    test('should return 404 when meeting not found', async () => {
      meetingService.getMeetingByCode.mockResolvedValue(null);

      const response = await request(app)
        .post('/emp/meetings/INVALID/leave')
        .expect(404);

      expect(response.body.message).toBe('Meeting not found');
    });

    test('should return 400 when not a participant', async () => {
      meetingService.getMeetingByCode.mockResolvedValue(mockMeeting);

      const response = await request(app)
        .post('/emp/meetings/ABC123/leave')
        .expect(400);

      expect(response.body.message).toBe('You are not a participant in this meeting');
    });
  });

  describe('POST /emp/meetings/:roomCode/access-token', () => {
    beforeEach(() => {
      authentication.mockImplementation((req, res, next) => {
        req.user = mockEmployeeUser;
        next();
      });
    });

    test('should generate access token for participant', async () => {
      const meetingWithParticipant = {
        ...mockMeeting,
        participants: [mockParticipant]
      };

      meetingService.getMeetingByCode.mockResolvedValue(meetingWithParticipant);
      meetingAuthService.issueMeetingAccessToken.mockResolvedValue('mock-token');

      const response = await request(app)
        .post('/emp/meetings/ABC123/access-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Meeting access token generated successfully');
      expect(response.body.data.meetingAccessToken).toBe('mock-token');
      expect(response.body.data.role).toBe('PARTICIPANT');
    });

    test('should generate access token for host', async () => {
      const meetingAsHost = {
        ...mockMeeting,
        hostId: 'emp123',
        host: mockEmployeeUser
      };

      meetingService.getMeetingByCode.mockResolvedValue(meetingAsHost);
      meetingAuthService.issueMeetingAccessToken.mockResolvedValue('mock-token');

      const response = await request(app)
        .post('/emp/meetings/ABC123/access-token')
        .expect(200);

      expect(response.body.data.role).toBe('HOST');
    });

    test('should return 404 when meeting not found', async () => {
      meetingService.getMeetingByCode.mockResolvedValue(null);

      const response = await request(app)
        .post('/emp/meetings/INVALID/access-token')
        .expect(404);

      expect(response.body.message).toBe('Meeting not found');
    });

    test('should return 403 when not a participant', async () => {
      meetingService.getMeetingByCode.mockResolvedValue(mockMeeting);

      const response = await request(app)
        .post('/emp/meetings/ABC123/access-token')
        .expect(403);

      expect(response.body.message).toBe('You are not a participant in this meeting');
    });

    test('should return 403 when banned from meeting', async () => {
      const bannedParticipant = {
        ...mockParticipant,
        isBanned: true
      };

      const meetingWithBannedParticipant = {
        ...mockMeeting,
        participants: [bannedParticipant]
      };

      meetingService.getMeetingByCode.mockResolvedValue(meetingWithBannedParticipant);

      const response = await request(app)
        .post('/emp/meetings/ABC123/access-token')
        .expect(403);

      expect(response.body.message).toBe('You are banned from this meeting');
    });
  });
});




