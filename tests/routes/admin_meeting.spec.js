const request = require('supertest');
const express = require('express');
const meetingRoute = require('../../admin_app/routes/meetingRoute');
const meetingService = require('../../service/meetingService');
const { authentication } = require('../../middleware/authToken');

// Mock dependencies
jest.mock('../../service/meetingService');
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

describe('Admin Meeting Routes', () => {
  let app;
  let mockAdminUser;
  let mockEmployeeUser;
  let mockMeeting;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock users
    mockAdminUser = {
      id: 'admin123',
      role: 'ADMIN',
      empName: 'Admin User',
      empEmail: 'admin@company.com'
    };

    mockEmployeeUser = {
      id: 'emp123',
      role: 'EMPLOYEE',
      empName: 'Employee User',
      empEmail: 'employee@company.com'
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
      host: mockAdminUser
    };

    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/admin/meetings', meetingRoute);
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
        .get('/admin/meetings')
        .expect(401);

      expect(response.body.message).toBe('Token Not Found');
    });

    test('should return 403 when non-admin user tries to access', async () => {
      authentication.mockImplementation((req, res, next) => {
        req.user = mockEmployeeUser;
        next();
      });

      const response = await request(app)
        .get('/admin/meetings')
        .expect(403);

      expect(response.body.message).toBe('Access denied. Admin privileges required.');
    });

    test('should allow admin user to access routes', async () => {
      authentication.mockImplementation((req, res, next) => {
        req.user = mockAdminUser;
        next();
      });

      meetingService.listMeetingsForAdmin.mockResolvedValue({
        meetings: [mockMeeting],
        pagination: { page: 1, limit: 20, total: 1, pages: 1 }
      });

      const response = await request(app)
        .get('/admin/meetings')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /admin/meetings', () => {
    beforeEach(() => {
      authentication.mockImplementation((req, res, next) => {
        req.user = mockAdminUser;
        next();
      });
    });

    test('should create meeting successfully', async () => {
      meetingService.createMeeting.mockResolvedValue(mockMeeting);

      const meetingData = {
        hostId: 'emp123',
        title: 'Test Meeting',
        description: 'A test meeting',
        type: 'BASIC'
      };

      const response = await request(app)
        .post('/admin/meetings')
        .send(meetingData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Meeting created successfully');
      expect(meetingService.createMeeting).toHaveBeenCalledWith({
        ...meetingData,
        scheduledStart: null,
        scheduledEnd: null,
        password: undefined,
        isPersistent: false
      });
    });

    test('should return 400 when required fields are missing', async () => {
      const response = await request(app)
        .post('/admin/meetings')
        .send({ description: 'A test meeting' })
        .expect(400);

      expect(response.body.message).toBe('Host ID and title are required');
    });

    test('should return 400 when meeting type is invalid', async () => {
      const response = await request(app)
        .post('/admin/meetings')
        .send({
          hostId: 'emp123',
          title: 'Test Meeting',
          type: 'INVALID_TYPE'
        })
        .expect(400);

      expect(response.body.message).toBe('Invalid meeting type. Must be BASIC, NORMAL, or LONG');
    });

    test('should return 400 when scheduled end is before start', async () => {
      const response = await request(app)
        .post('/admin/meetings')
        .send({
          hostId: 'emp123',
          title: 'Test Meeting',
          scheduledStart: '2024-01-01T10:00:00Z',
          scheduledEnd: '2024-01-01T09:00:00Z'
        })
        .expect(400);

      expect(response.body.message).toBe('Scheduled end time must be after scheduled start time');
    });

    test('should return 404 when host not found', async () => {
      meetingService.createMeeting.mockRejectedValue(new Error('Host not found or inactive'));

      const response = await request(app)
        .post('/admin/meetings')
        .send({
          hostId: 'invalid',
          title: 'Test Meeting'
        })
        .expect(404);

      expect(response.body.message).toBe('Host not found or inactive');
    });
  });

  describe('GET /admin/meetings', () => {
    beforeEach(() => {
      authentication.mockImplementation((req, res, next) => {
        req.user = mockAdminUser;
        next();
      });
    });

    test('should list meetings successfully', async () => {
      const mockResult = {
        meetings: [mockMeeting],
        pagination: { page: 1, limit: 20, total: 1, pages: 1 }
      };

      meetingService.listMeetingsForAdmin.mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/admin/meetings')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResult);
    });

    test('should apply filters correctly', async () => {
      meetingService.listMeetingsForAdmin.mockResolvedValue({
        meetings: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 0 }
      });

      await request(app)
        .get('/admin/meetings?hostId=emp123&type=BASIC&status=LIVE&page=2&limit=10')
        .expect(200);

      expect(meetingService.listMeetingsForAdmin).toHaveBeenCalledWith({
        hostId: 'emp123',
        type: 'BASIC',
        status: 'LIVE',
        startDate: undefined,
        endDate: undefined,
        page: 2,
        limit: 10
      });
    });

    test('should return 400 for invalid pagination', async () => {
      const response = await request(app)
        .get('/admin/meetings?page=0&limit=200')
        .expect(400);

      expect(response.body.message).toBe('Invalid pagination parameters');
    });
  });

  describe('GET /admin/meetings/:id', () => {
    beforeEach(() => {
      authentication.mockImplementation((req, res, next) => {
        req.user = mockAdminUser;
        next();
      });
    });

    test('should get meeting by ID successfully', async () => {
      const mockMeetingWithDetails = {
        ...mockMeeting,
        participants: [],
        recordings: [],
        events: []
      };

      prisma.meeting.findUnique.mockResolvedValue(mockMeetingWithDetails);

      const response = await request(app)
        .get('/admin/meetings/meeting123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockMeetingWithDetails);
    });

    test('should return 404 when meeting not found', async () => {
      prisma.meeting.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/admin/meetings/invalid')
        .expect(404);

      expect(response.body.message).toBe('Meeting not found');
    });
  });

  describe('PATCH /admin/meetings/:id', () => {
    beforeEach(() => {
      authentication.mockImplementation((req, res, next) => {
        req.user = mockAdminUser;
        next();
      });
    });

    test('should update meeting successfully', async () => {
      const updatedMeeting = { ...mockMeeting, title: 'Updated Meeting' };
      meetingService.updateMeeting.mockResolvedValue(updatedMeeting);

      const response = await request(app)
        .patch('/admin/meetings/meeting123')
        .send({ title: 'Updated Meeting' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(meetingService.updateMeeting).toHaveBeenCalledWith({
        meetingId: 'meeting123',
        byEmpId: 'admin123',
        title: 'Updated Meeting'
      });
    });

    test('should return 400 for invalid meeting type', async () => {
      const response = await request(app)
        .patch('/admin/meetings/meeting123')
        .send({ type: 'INVALID_TYPE' })
        .expect(400);

      expect(response.body.message).toBe('Invalid meeting type. Must be BASIC, NORMAL, or LONG');
    });

    test('should return 404 when meeting not found', async () => {
      meetingService.updateMeeting.mockRejectedValue(new Error('Meeting not found'));

      const response = await request(app)
        .patch('/admin/meetings/invalid')
        .send({ title: 'Updated Meeting' })
        .expect(404);

      expect(response.body.message).toBe('Meeting not found');
    });

    test('should return 403 when not the host', async () => {
      meetingService.updateMeeting.mockRejectedValue(new Error('Only meeting host can update meeting'));

      const response = await request(app)
        .patch('/admin/meetings/meeting123')
        .send({ title: 'Updated Meeting' })
        .expect(403);

      expect(response.body.message).toBe('Only meeting host can update meeting');
    });
  });

  describe('POST /admin/meetings/:id/start', () => {
    beforeEach(() => {
      authentication.mockImplementation((req, res, next) => {
        req.user = mockAdminUser;
        next();
      });
    });

    test('should start meeting successfully', async () => {
      const startedMeeting = { ...mockMeeting, status: 'LIVE', actualStart: new Date() };
      meetingService.startMeeting.mockResolvedValue(startedMeeting);

      const response = await request(app)
        .post('/admin/meetings/meeting123/start')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(meetingService.startMeeting).toHaveBeenCalledWith({
        meetingId: 'meeting123',
        byEmpId: 'admin123'
      });
    });

    test('should return 404 when meeting not found', async () => {
      meetingService.startMeeting.mockRejectedValue(new Error('Meeting not found'));

      const response = await request(app)
        .post('/admin/meetings/invalid/start')
        .expect(404);

      expect(response.body.message).toBe('Meeting not found');
    });

    test('should return 403 when not the host', async () => {
      meetingService.startMeeting.mockRejectedValue(new Error('Only meeting host can start meeting'));

      const response = await request(app)
        .post('/admin/meetings/meeting123/start')
        .expect(403);

      expect(response.body.message).toBe('Only meeting host can start meeting');
    });
  });

  describe('POST /admin/meetings/:id/end', () => {
    beforeEach(() => {
      authentication.mockImplementation((req, res, next) => {
        req.user = mockAdminUser;
        next();
      });
    });

    test('should end meeting successfully', async () => {
      const endedMeeting = { ...mockMeeting, status: 'ENDED', actualEnd: new Date() };
      meetingService.endMeeting.mockResolvedValue(endedMeeting);

      const response = await request(app)
        .post('/admin/meetings/meeting123/end')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(meetingService.endMeeting).toHaveBeenCalledWith({
        meetingId: 'meeting123',
        byEmpId: 'admin123'
      });
    });
  });

  describe('POST /admin/meetings/:id/cancel', () => {
    beforeEach(() => {
      authentication.mockImplementation((req, res, next) => {
        req.user = mockAdminUser;
        next();
      });
    });

    test('should cancel meeting successfully', async () => {
      const canceledMeeting = { ...mockMeeting, status: 'CANCELED' };
      meetingService.cancelMeeting.mockResolvedValue(canceledMeeting);

      const response = await request(app)
        .post('/admin/meetings/meeting123/cancel')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(meetingService.cancelMeeting).toHaveBeenCalledWith({
        meetingId: 'meeting123',
        byEmpId: 'admin123'
      });
    });
  });

  describe('POST /admin/meetings/:id/kick', () => {
    beforeEach(() => {
      authentication.mockImplementation((req, res, next) => {
        req.user = mockAdminUser;
        next();
      });
    });

    test('should kick participant successfully', async () => {
      prisma.meeting.findUnique.mockResolvedValue(mockMeeting);
      prisma.meetingParticipant.findUnique.mockResolvedValue({
        id: 'participant123',
        meetingId: 'meeting123',
        empId: 'emp123'
      });
      meetingService.markLeave.mockResolvedValue({ success: true });

      const response = await request(app)
        .post('/admin/meetings/meeting123/kick')
        .send({ empId: 'emp123' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Participant kicked successfully');
    });

    test('should return 400 when empId is missing', async () => {
      const response = await request(app)
        .post('/admin/meetings/meeting123/kick')
        .send({})
        .expect(400);

      expect(response.body.message).toBe('Employee ID is required');
    });

    test('should return 404 when meeting not found', async () => {
      prisma.meeting.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/admin/meetings/invalid/kick')
        .send({ empId: 'emp123' })
        .expect(404);

      expect(response.body.message).toBe('Meeting not found');
    });

    test('should return 403 when not the host', async () => {
      const meetingWithDifferentHost = { ...mockMeeting, hostId: 'other_admin' };
      prisma.meeting.findUnique.mockResolvedValue(meetingWithDifferentHost);

      const response = await request(app)
        .post('/admin/meetings/meeting123/kick')
        .send({ empId: 'emp123' })
        .expect(403);

      expect(response.body.message).toBe('Only meeting host can kick participants');
    });
  });

  describe('POST /admin/meetings/:id/ban', () => {
    beforeEach(() => {
      authentication.mockImplementation((req, res, next) => {
        req.user = mockAdminUser;
        next();
      });
    });

    test('should ban participant successfully', async () => {
      prisma.meeting.findUnique.mockResolvedValue(mockMeeting);
      prisma.meetingParticipant.findUnique.mockResolvedValue({
        id: 'participant123',
        meetingId: 'meeting123',
        empId: 'emp123',
        isBanned: false
      });
      prisma.meetingParticipant.update.mockResolvedValue({
        id: 'participant123',
        isBanned: true
      });

      const response = await request(app)
        .post('/admin/meetings/meeting123/ban')
        .send({ empId: 'emp123' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Participant banned successfully');
    });

    test('should return 400 when participant already banned', async () => {
      prisma.meeting.findUnique.mockResolvedValue(mockMeeting);
      prisma.meetingParticipant.findUnique.mockResolvedValue({
        id: 'participant123',
        meetingId: 'meeting123',
        empId: 'emp123',
        isBanned: true
      });

      const response = await request(app)
        .post('/admin/meetings/meeting123/ban')
        .send({ empId: 'emp123' })
        .expect(400);

      expect(response.body.message).toBe('Participant is already banned');
    });
  });
});
