const request = require('supertest');
const express = require('express');
const path = require('path');
const fs = require('fs');
const empMeetingRecordingRoute = require('../../employee_app/routes/empMeetingRecordingRoute');
const { authentication } = require('../../middleware/authToken');

// Mock dependencies
jest.mock('../../middleware/authToken');
jest.mock('../../service/cloudinaryClient', () => ({
  uploadFile: jest.fn(),
  deleteFile: jest.fn()
}));
jest.mock('../../config/prismaConfig', () => ({
  prisma: {
    meeting: {
      findUnique: jest.fn()
    },
    meetingRecording: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn()
    },
    employee: {
      findMany: jest.fn()
    }
  }
}));

const { prisma } = require('../../config/prismaConfig');
const { uploadFile, deleteFile } = require('../../service/cloudinaryClient');

describe('Employee Meeting Recording Routes', () => {
  let app;
  let mockEmployeeUser;
  let mockMeeting;
  let mockRecording;
  let testVideoPath;

  beforeAll(() => {
    // Create a test video file
    const uploadsDir = path.join(__dirname, '../../uploads/recordings');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    testVideoPath = path.join(uploadsDir, 'test-video.webm');
    fs.writeFileSync(testVideoPath, 'fake video content');
  });

  afterAll(() => {
    // Clean up test file
    if (fs.existsSync(testVideoPath)) {
      fs.unlinkSync(testVideoPath);
    }
  });

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/emp/meetings', empMeetingRecordingRoute);

    mockEmployeeUser = {
      id: 'emp123',
      empName: 'John Doe',
      empEmail: 'john@example.com',
      role: 'employee'
    };

    mockMeeting = {
      id: 'meeting123',
      title: 'Test Meeting',
      status: 'LIVE',
      hostId: 'host123',
      participants: [
        {
          empId: 'emp123',
          role: 'PARTICIPANT'
        }
      ]
    };

    mockRecording = {
      id: 'recording123',
      meetingId: 'meeting123',
      startedAt: new Date('2024-01-01T10:00:00Z'),
      endedAt: new Date('2024-01-01T11:00:00Z'),
      cloudinaryUrl: 'https://res.cloudinary.com/test/video/upload/test.mp4',
      publicId: 'meetings/meeting123/recording_123',
      bytes: 1024000,
      format: 'video/webm',
      createdById: 'emp123',
      createdAt: new Date(),
      createdBy: mockEmployeeUser
    };

    // Mock authentication middleware
    authentication.mockImplementation((req, res, next) => {
      req.user = mockEmployeeUser;
      next();
    });

    // Mock Prisma responses
    prisma.meeting.findUnique.mockResolvedValue(mockMeeting);
    prisma.meetingRecording.create.mockResolvedValue(mockRecording);
    prisma.meetingRecording.findMany.mockResolvedValue([mockRecording]);
    prisma.meetingRecording.count.mockResolvedValue(1);
    prisma.meetingRecording.findUnique.mockResolvedValue({
      ...mockRecording,
      meeting: mockMeeting
    });
    prisma.meetingRecording.delete.mockResolvedValue(mockRecording);
    prisma.meetingRecording.aggregate.mockResolvedValue({
      _count: { id: 1 },
      _sum: { bytes: 1024000 }
    });
    prisma.meetingRecording.groupBy.mockResolvedValue([
      {
        createdById: 'emp123',
        _count: { id: 1 },
        _sum: { bytes: 1024000 }
      }
    ]);
    prisma.employee.findMany.mockResolvedValue([mockEmployeeUser]);

    // Mock Cloudinary
    uploadFile.mockResolvedValue({
      secure_url: 'https://res.cloudinary.com/test/video/upload/test.mp4',
      public_id: 'meetings/meeting123/recording_123'
    });
    deleteFile.mockResolvedValue();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication & Authorization', () => {
    test('should return 401 when no token provided', async () => {
      authentication.mockImplementation((req, res, next) => {
        res.status(401).json({
          success: false,
          message: 'Token Not Found'
        });
      });

      const response = await request(app)
        .post('/emp/meetings/meeting123/recordings')
        .attach('file', testVideoPath)
        .field('startedAt', '2024-01-01T10:00:00Z')
        .field('endedAt', '2024-01-01T11:00:00Z');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('should return 403 when non-employee user tries to access', async () => {
      authentication.mockImplementation((req, res, next) => {
        req.user = { ...mockEmployeeUser, role: 'admin' };
        next();
      });

      const response = await request(app)
        .post('/emp/meetings/meeting123/recordings')
        .attach('file', testVideoPath)
        .field('startedAt', '2024-01-01T10:00:00Z')
        .field('endedAt', '2024-01-01T11:00:00Z');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied. Employee role required.');
    });

    test('should allow employee user to access routes', async () => {
      const response = await request(app)
        .get('/emp/meetings/meeting123/recordings');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /emp/meetings/:id/recordings', () => {
    test('should upload recording successfully', async () => {
      const response = await request(app)
        .post('/emp/meetings/meeting123/recordings')
        .attach('file', testVideoPath)
        .field('startedAt', '2024-01-01T10:00:00Z')
        .field('endedAt', '2024-01-01T11:00:00Z');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Recording uploaded successfully');
      expect(response.body.data).toHaveProperty('id', 'recording123');
      expect(response.body.data).toHaveProperty('durationSec', 3600);
      expect(response.body.data).toHaveProperty('cloudinaryUrl');

      expect(uploadFile).toHaveBeenCalledWith(
        expect.stringContaining('test-video.webm'),
        expect.objectContaining({
          resource_type: 'video',
          folder: 'meetings/meeting123'
        })
      );

      expect(prisma.meetingRecording.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            meetingId: 'meeting123',
            createdById: 'emp123'
          })
        })
      );
    });

    test('should return 400 when file is missing', async () => {
      const response = await request(app)
        .post('/emp/meetings/meeting123/recordings')
        .field('startedAt', '2024-01-01T10:00:00Z')
        .field('endedAt', '2024-01-01T11:00:00Z');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Recording file is required');
    });

    test('should return 400 when timestamps are missing', async () => {
      const response = await request(app)
        .post('/emp/meetings/meeting123/recordings')
        .attach('file', testVideoPath);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Started and ended timestamps are required');
    });

    test('should return 404 when meeting not found', async () => {
      prisma.meeting.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/emp/meetings/nonexistent/recordings')
        .attach('file', testVideoPath)
        .field('startedAt', '2024-01-01T10:00:00Z')
        .field('endedAt', '2024-01-01T11:00:00Z');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Meeting not found');
    });

    test('should return 403 when user is not a participant', async () => {
      const meetingWithoutParticipant = { ...mockMeeting, participants: [] };
      prisma.meeting.findUnique.mockResolvedValue(meetingWithoutParticipant);

      const response = await request(app)
        .post('/emp/meetings/meeting123/recordings')
        .attach('file', testVideoPath)
        .field('startedAt', '2024-01-01T10:00:00Z')
        .field('endedAt', '2024-01-01T11:00:00Z');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('You are not a participant in this meeting');
    });

    test('should return 400 for invalid file type', async () => {
      const textFilePath = path.join(__dirname, '../../uploads/recordings/test.txt');
      fs.writeFileSync(textFilePath, 'test content');

      const response = await request(app)
        .post('/emp/meetings/meeting123/recordings')
        .attach('file', textFilePath)
        .field('startedAt', '2024-01-01T10:00:00Z')
        .field('endedAt', '2024-01-01T11:00:00Z');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Only video files are allowed for recordings.');

      // Clean up
      fs.unlinkSync(textFilePath);
    });
  });

  describe('GET /emp/meetings/:id/recordings', () => {
    test('should get recordings successfully', async () => {
      const response = await request(app)
        .get('/emp/meetings/meeting123/recordings')
        .query({ page: '1', limit: '10' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('recordings');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.recordings).toHaveLength(1);
      expect(response.body.data.recordings[0]).toHaveProperty('id', 'recording123');
      expect(response.body.data.recordings[0]).toHaveProperty('durationSec', 3600);

      expect(prisma.meetingRecording.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { meetingId: 'meeting123' },
          skip: 0,
          take: 10
        })
      );
    });

    test('should apply pagination correctly', async () => {
      prisma.meetingRecording.findMany.mockResolvedValue([]);
      prisma.meetingRecording.count.mockResolvedValue(25);

      const response = await request(app)
        .get('/emp/meetings/meeting123/recordings')
        .query({ page: '2', limit: '10' });

      expect(response.status).toBe(200);
      expect(response.body.data.pagination).toEqual({
        page: 2,
        limit: 10,
        totalCount: 25,
        totalPages: 3,
        hasNext: true,
        hasPrev: true
      });

      expect(prisma.meetingRecording.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10
        })
      );
    });

    test('should return 404 when meeting not found', async () => {
      prisma.meeting.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/emp/meetings/nonexistent/recordings');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Meeting not found');
    });
  });

  describe('DELETE /emp/meetings/:id/recordings/:recordingId', () => {
    test('should delete recording successfully when user is creator', async () => {
      const response = await request(app)
        .delete('/emp/meetings/meeting123/recordings/recording123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Recording deleted successfully');

      expect(deleteFile).toHaveBeenCalledWith('meetings/meeting123/recording_123');
      expect(prisma.meetingRecording.delete).toHaveBeenCalledWith({
        where: { id: 'recording123' }
      });
    });

    test('should delete recording when user is meeting host', async () => {
      mockEmployeeUser.id = 'host123';
      const recordingWithHostMeeting = {
        ...mockRecording,
        createdById: 'emp123',
        meeting: { ...mockMeeting, hostId: 'host123' }
      };
      prisma.meetingRecording.findUnique.mockResolvedValue(recordingWithHostMeeting);

      const response = await request(app)
        .delete('/emp/meetings/meeting123/recordings/recording123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should return 404 when recording not found', async () => {
      prisma.meetingRecording.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .delete('/emp/meetings/meeting123/recordings/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Recording not found');
    });

    test('should return 403 when user is not creator or host', async () => {
      mockEmployeeUser.id = 'other123';
      const recordingWithMeeting = {
        ...mockRecording,
        createdById: 'emp123',
        meeting: { ...mockMeeting, hostId: 'host123' }
      };
      prisma.meetingRecording.findUnique.mockResolvedValue(recordingWithMeeting);

      const response = await request(app)
        .delete('/emp/meetings/meeting123/recordings/recording123');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('You can only delete recordings you created or if you are the meeting host');
    });
  });

  describe('GET /emp/meetings/:id/recordings/stats', () => {
    test('should get recording statistics successfully', async () => {
      const response = await request(app)
        .get('/emp/meetings/meeting123/recordings/stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalRecordings', 1);
      expect(response.body.data).toHaveProperty('totalBytes', 1024000);
      expect(response.body.data).toHaveProperty('creators');
      expect(response.body.data.creators).toHaveLength(1);

      expect(prisma.meetingRecording.aggregate).toHaveBeenCalledWith({
        where: { meetingId: 'meeting123' },
        _count: { id: true },
        _sum: { bytes: true }
      });
    });

    test('should return 404 when meeting not found', async () => {
      prisma.meeting.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/emp/meetings/nonexistent/recordings/stats');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Meeting not found');
    });
  });

  describe('File Upload Limits', () => {
    test('should return 400 for file size too large', async () => {
      // Create a large file (simulate)
      const largeFilePath = path.join(__dirname, '../../uploads/recordings/large-video.webm');
      const largeContent = Buffer.alloc(600 * 1024 * 1024); // 600MB
      fs.writeFileSync(largeFilePath, largeContent);

      const response = await request(app)
        .post('/emp/meetings/meeting123/recordings')
        .attach('file', largeFilePath)
        .field('startedAt', '2024-01-01T10:00:00Z')
        .field('endedAt', '2024-01-01T11:00:00Z');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('File size too large. Maximum size is 500MB.');

      // Clean up
      fs.unlinkSync(largeFilePath);
    });
  });
});




