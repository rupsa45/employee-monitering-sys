const request = require('supertest');
const express = require('express');
const meetingRoute = require('../../admin_app/routes/meetingRoute');
const meetingSchedulingService = require('../../service/meetingSchedulingService');
const { authentication } = require('../../middleware/authToken');

// Mock dependencies
jest.mock('../../service/meetingSchedulingService');
jest.mock('../../middleware/authToken');

describe('Admin Meeting Scheduling Routes', () => {
  let app;
  let mockAdminUser;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock admin user
    mockAdminUser = {
      id: 'admin1',
      role: 'ADMIN',
      empName: 'Admin User',
      empEmail: 'admin@company.com'
    };

    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/admin/meetings', meetingRoute);

    // Mock authentication middleware
    authentication.mockImplementation((req, res, next) => {
      req.user = mockAdminUser;
      next();
    });
  });

  describe('POST /admin/meetings/:id/remind', () => {
    it('should send meeting invites successfully', async () => {
      const mockInviteResult = {
        success: true,
        meetingId: 'meeting1',
        totalInvites: 2,
        successfulEmails: 2,
        failedEmails: 0,
        employees: [
          { id: 'emp1', name: 'John Doe', email: 'john@example.com' },
          { id: 'emp2', name: 'Jane Smith', email: 'jane@example.com' }
        ]
      };

      meetingSchedulingService.sendMeetingInvite.mockResolvedValue(mockInviteResult);

      const response = await request(app)
        .post('/admin/meetings/meeting1/remind')
        .send({
          empIds: ['emp1', 'emp2'],
          message: 'Custom invite message'
        })
        .expect(200);

      expect(meetingSchedulingService.sendMeetingInvite).toHaveBeenCalledWith({
        meetingId: 'meeting1',
        empIds: ['emp1', 'emp2'],
        message: 'Custom invite message'
      });

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Meeting invites sent successfully');
      expect(response.body.data).toEqual(mockInviteResult);
    });

    it('should return 400 when empIds is missing', async () => {
      const response = await request(app)
        .post('/admin/meetings/meeting1/remind')
        .send({ message: 'Test message' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Employee IDs array is required and must not be empty');
      expect(meetingSchedulingService.sendMeetingInvite).not.toHaveBeenCalled();
    });

    it('should return 400 when empIds is empty array', async () => {
      const response = await request(app)
        .post('/admin/meetings/meeting1/remind')
        .send({ empIds: [] })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Employee IDs array is required and must not be empty');
      expect(meetingSchedulingService.sendMeetingInvite).not.toHaveBeenCalled();
    });

    it('should return 404 when meeting not found', async () => {
      meetingSchedulingService.sendMeetingInvite.mockRejectedValue(new Error('Meeting not found'));

      const response = await request(app)
        .post('/admin/meetings/nonexistent/remind')
        .send({ empIds: ['emp1'] })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Meeting not found');
    });

    it('should return 400 when meeting is ended', async () => {
      meetingSchedulingService.sendMeetingInvite.mockRejectedValue(
        new Error('Cannot send invites for ended or canceled meeting')
      );

      const response = await request(app)
        .post('/admin/meetings/meeting1/remind')
        .send({ empIds: ['emp1'] })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Cannot send invites for ended or canceled meeting');
    });
  });

  describe('GET /admin/meetings (scheduled meetings)', () => {
    it('should get scheduled meetings with filters', async () => {
      const mockMeetings = [
        {
          id: 'meeting1',
          title: 'Scheduled Meeting',
          scheduledStart: '2024-01-01T10:00:00.000Z',
          host: { id: 'host1', empName: 'Host User' },
          participants: []
        }
      ];

      const mockResult = {
        meetings: mockMeetings,
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          pages: 1
        }
      };

      meetingSchedulingService.getScheduledMeetings.mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/admin/meetings')
        .query({
          from: '2024-01-01T00:00:00.000Z',
          to: '2024-01-01T23:59:59.000Z',
          status: 'SCHEDULED',
          hostId: 'host1',
          page: 1,
          limit: 20
        })
        .expect(200);

      expect(meetingSchedulingService.getScheduledMeetings).toHaveBeenCalledWith({
        from: new Date('2024-01-01T00:00:00.000Z'),
        to: new Date('2024-01-01T23:59:59.000Z'),
        status: 'SCHEDULED',
        hostId: 'host1',
        page: 1,
        limit: 20
      });

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Scheduled meetings retrieved successfully');
      expect(response.body.data).toEqual(mockResult);
    });

    it('should return 400 for invalid pagination', async () => {
      const response = await request(app)
        .get('/admin/meetings')
        .query({ page: 0, limit: 20 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid pagination parameters');
      expect(meetingSchedulingService.getScheduledMeetings).not.toHaveBeenCalled();
    });

    it('should return 400 when from date is after to date', async () => {
      const response = await request(app)
        .get('/admin/meetings')
        .query({
          from: '2024-01-02T00:00:00.000Z',
          to: '2024-01-01T00:00:00.000Z'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('From date must be before to date');
      expect(meetingSchedulingService.getScheduledMeetings).not.toHaveBeenCalled();
    });
  });

  describe('POST /admin/meetings/reminders', () => {
    it('should send meeting reminders successfully', async () => {
      const mockReminderResult = {
        success: true,
        totalMeetings: 2,
        totalReminders: 5,
        successfulReminders: 4
      };

      meetingSchedulingService.sendMeetingReminders.mockResolvedValue(mockReminderResult);

      const response = await request(app)
        .post('/admin/meetings/reminders')
        .send({ minutesAhead: 15 })
        .expect(200);

      expect(meetingSchedulingService.sendMeetingReminders).toHaveBeenCalledWith({
        minutesAhead: 15
      });

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Meeting reminders sent successfully');
      expect(response.body.data).toEqual(mockReminderResult);
    });

    it('should use default minutesAhead when not provided', async () => {
      const mockReminderResult = {
        success: true,
        totalMeetings: 0,
        totalReminders: 0,
        successfulReminders: 0
      };

      meetingSchedulingService.sendMeetingReminders.mockResolvedValue(mockReminderResult);

      const response = await request(app)
        .post('/admin/meetings/reminders')
        .send({})
        .expect(200);

      expect(meetingSchedulingService.sendMeetingReminders).toHaveBeenCalledWith({
        minutesAhead: 15
      });

      expect(response.body.success).toBe(true);
    });

    it('should return 400 for invalid minutesAhead', async () => {
      const response = await request(app)
        .post('/admin/meetings/reminders')
        .send({ minutesAhead: 0 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Minutes ahead must be between 1 and 1440 (24 hours)');
      expect(meetingSchedulingService.sendMeetingReminders).not.toHaveBeenCalled();
    });

    it('should return 400 for minutesAhead too high', async () => {
      const response = await request(app)
        .post('/admin/meetings/reminders')
        .send({ minutesAhead: 1500 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Minutes ahead must be between 1 and 1440 (24 hours)');
      expect(meetingSchedulingService.sendMeetingReminders).not.toHaveBeenCalled();
    });
  });
});



