const { prisma } = require('../../config/prismaConfig');
const { uploadFile } = require('../../service/cloudinaryClient');
const logger = require('../../utils/logger');

/**
 * Employee Meeting Recording Controller
 * Handles recording uploads and management for meetings
 * 
 * Client Reference Implementation:
 * 
 * // Start screen share
 * const stream = await navigator.mediaDevices.getDisplayMedia({ 
 *   video: true, 
 *   audio: true 
 * });
 * 
 * // Record with MediaRecorder
 * const recorder = new MediaRecorder(stream, { 
 *   mimeType: 'video/webm;codecs=vp9' 
 * });
 * const chunks = [];
 * recorder.ondataavailable = e => e.data.size && chunks.push(e.data);
 * recorder.onstop = async () => {
 *   const blob = new Blob(chunks, { type: 'video/webm' });
 *   const fd = new FormData();
 *   fd.append('file', blob, `meeting-${meetingId}.webm`);
 *   fd.append('startedAt', startISO);
 *   fd.append('endedAt', new Date().toISOString());
 *   await fetch(`/emp/meetings/${meetingId}/recordings`, { 
 *     method: 'POST', 
 *     body: fd, 
 *     headers: { Authorization: `Bearer ${jwt}` } 
 *   });
 * };
 * recorder.start(1000);
 * 
 * // Optional: Composite multi-tile recording via <canvas>.captureStream()
 * // const canvas = document.createElement('canvas');
 * // const ctx = canvas.getContext('2d');
 * // const compositeStream = canvas.captureStream();
 */

class EmpMeetingRecordingController {
  /**
   * Upload a meeting recording
   * POST /emp/meetings/:id/recordings
   */
  async uploadRecording(req, res) {
    try {
      const { id: meetingId } = req.params;
      const { startedAt, endedAt } = req.body;
      const empId = req.user.id;

      // Validate required fields
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Recording file is required'
        });
      }

      if (!startedAt || !endedAt) {
        return res.status(400).json({
          success: false,
          message: 'Started and ended timestamps are required'
        });
      }

      // Validate meeting exists and is live/ended
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
        include: {
          participants: {
            where: { empId }
          }
        }
      });

      if (!meeting) {
        return res.status(404).json({
          success: false,
          message: 'Meeting not found'
        });
      }

      if (meeting.status === 'CANCELED') {
        return res.status(400).json({
          success: false,
          message: 'Cannot upload recording for canceled meeting'
        });
      }

      // Check if user is a participant in this meeting
      const participant = meeting.participants.find(p => p.empId === empId);
      if (!participant) {
        return res.status(403).json({
          success: false,
          message: 'You are not a participant in this meeting'
        });
      }

      // Validate timestamps
      const startTime = new Date(startedAt);
      const endTime = new Date(endedAt);
      
      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid timestamp format'
        });
      }

      if (endTime <= startTime) {
        return res.status(400).json({
          success: false,
          message: 'End time must be after start time'
        });
      }

      // Calculate duration in seconds
      const durationSec = Math.floor((endTime - startTime) / 1000);

      // Upload to Cloudinary
      const uploadOptions = {
        resource_type: 'video',
        folder: `meetings/${meetingId}`,
        public_id: `recording_${Date.now()}`,
        overwrite: false
      };

      const uploadResult = await uploadFile(req.file.path, uploadOptions);

      // Save recording metadata to database
      const recording = await prisma.meetingRecording.create({
        data: {
          meetingId,
          startedAt: startTime,
          endedAt: endTime,
          cloudinaryUrl: uploadResult.secure_url,
          publicId: uploadResult.public_id,
          bytes: req.file.size,
          format: req.file.mimetype,
          createdById: empId
        },
        include: {
          createdBy: {
            select: {
              id: true,
              empName: true,
              empEmail: true
            }
          }
        }
      });

      logger.info('Meeting recording uploaded successfully', {
        empId,
        meetingId,
        recordingId: recording.id,
        durationSec,
        fileSize: req.file.size,
        cloudinaryUrl: uploadResult.secure_url
      });

      res.status(201).json({
        success: true,
        message: 'Recording uploaded successfully',
        data: {
          id: recording.id,
          startedAt: recording.startedAt,
          endedAt: recording.endedAt,
          durationSec,
          cloudinaryUrl: recording.cloudinaryUrl,
          publicId: recording.publicId,
          bytes: recording.bytes,
          format: recording.format,
          createdBy: recording.createdBy
        }
      });

    } catch (error) {
      logger.error('Error uploading meeting recording', {
        empId: req.user?.id,
        meetingId: req.params.id,
        error: error.message
      });

      res.status(500).json({
        success: false,
        message: 'Failed to upload recording',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get recordings for a meeting
   * GET /emp/meetings/:id/recordings
   */
  async getMeetingRecordings(req, res) {
    try {
      const { id: meetingId } = req.params;
      const empId = req.user.id;
      const { page = 1, limit = 10 } = req.query;

      // Validate meeting exists and user is participant
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
        include: {
          participants: {
            where: { empId }
          }
        }
      });

      if (!meeting) {
        return res.status(404).json({
          success: false,
          message: 'Meeting not found'
        });
      }

      const participant = meeting.participants.find(p => p.empId === empId);
      if (!participant) {
        return res.status(403).json({
          success: false,
          message: 'You are not a participant in this meeting'
        });
      }

      // Get recordings with pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const [recordings, totalCount] = await Promise.all([
        prisma.meetingRecording.findMany({
          where: { meetingId },
          include: {
            createdBy: {
              select: {
                id: true,
                empName: true,
                empEmail: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: parseInt(limit)
        }),
        prisma.meetingRecording.count({
          where: { meetingId }
        })
      ]);

      const totalPages = Math.ceil(totalCount / parseInt(limit));
      const hasNext = parseInt(page) < totalPages;
      const hasPrev = parseInt(page) > 1;

      logger.info('Meeting recordings retrieved', {
        empId,
        meetingId,
        count: recordings.length,
        page: parseInt(page),
        totalCount
      });

      res.json({
        success: true,
        data: {
          recordings: recordings.map(recording => ({
            id: recording.id,
            startedAt: recording.startedAt,
            endedAt: recording.endedAt,
            durationSec: Math.floor((recording.endedAt - recording.startedAt) / 1000),
            cloudinaryUrl: recording.cloudinaryUrl,
            publicId: recording.publicId,
            bytes: recording.bytes,
            format: recording.format,
            createdBy: recording.createdBy,
            createdAt: recording.createdAt
          })),
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            totalCount,
            totalPages,
            hasNext,
            hasPrev
          }
        }
      });

    } catch (error) {
      logger.error('Error retrieving meeting recordings', {
        empId: req.user?.id,
        meetingId: req.params.id,
        error: error.message
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve recordings',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Delete a recording (only by creator or meeting host)
   * DELETE /emp/meetings/:id/recordings/:recordingId
   */
  async deleteRecording(req, res) {
    try {
      const { id: meetingId, recordingId } = req.params;
      const empId = req.user.id;

      // Get recording with meeting and creator info
      const recording = await prisma.meetingRecording.findUnique({
        where: { id: recordingId },
        include: {
          meeting: {
            include: {
              participants: {
                where: { empId }
              }
            }
          },
          createdBy: {
            select: {
              id: true,
              empName: true
            }
          }
        }
      });

      if (!recording) {
        return res.status(404).json({
          success: false,
          message: 'Recording not found'
        });
      }

      if (recording.meetingId !== meetingId) {
        return res.status(400).json({
          success: false,
          message: 'Recording does not belong to this meeting'
        });
      }

      // Check permissions (creator or meeting host)
      const isCreator = recording.createdById === empId;
      const isHost = recording.meeting.hostId === empId;
      const participant = recording.meeting.participants.find(p => p.empId === empId);

      if (!isCreator && !isHost) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete recordings you created or if you are the meeting host'
        });
      }

      // Delete from Cloudinary
      try {
        const { deleteFile } = require('../../service/cloudinaryClient');
        await deleteFile(recording.publicId);
      } catch (cloudinaryError) {
        logger.warn('Failed to delete from Cloudinary, proceeding with DB deletion', {
          recordingId,
          publicId: recording.publicId,
          error: cloudinaryError.message
        });
      }

      // Delete from database
      await prisma.meetingRecording.delete({
        where: { id: recordingId }
      });

      logger.info('Meeting recording deleted', {
        empId,
        meetingId,
        recordingId,
        deletedBy: isCreator ? 'creator' : 'host'
      });

      res.json({
        success: true,
        message: 'Recording deleted successfully'
      });

    } catch (error) {
      logger.error('Error deleting meeting recording', {
        empId: req.user?.id,
        meetingId: req.params.id,
        recordingId: req.params.recordingId,
        error: error.message
      });

      res.status(500).json({
        success: false,
        message: 'Failed to delete recording',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get recording statistics for a meeting
   * GET /emp/meetings/:id/recordings/stats
   */
  async getRecordingStats(req, res) {
    try {
      const { id: meetingId } = req.params;
      const empId = req.user.id;

      // Validate meeting exists and user is participant
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
        include: {
          participants: {
            where: { empId }
          }
        }
      });

      if (!meeting) {
        return res.status(404).json({
          success: false,
          message: 'Meeting not found'
        });
      }

      const participant = meeting.participants.find(p => p.empId === empId);
      if (!participant) {
        return res.status(403).json({
          success: false,
          message: 'You are not a participant in this meeting'
        });
      }

      // Get recording statistics
      const stats = await prisma.meetingRecording.aggregate({
        where: { meetingId },
        _count: { id: true },
        _sum: { bytes: true }
      });

      // Get recordings by creator
      const recordingsByCreator = await prisma.meetingRecording.groupBy({
        by: ['createdById'],
        where: { meetingId },
        _count: { id: true },
        _sum: { bytes: true }
      });

      // Get creator details
      const creatorIds = recordingsByCreator.map(r => r.createdById);
      const creators = await prisma.employee.findMany({
        where: { id: { in: creatorIds } },
        select: { id: true, empName: true, empEmail: true }
      });

      const creatorStats = recordingsByCreator.map(stat => {
        const creator = creators.find(c => c.id === stat.createdById);
        return {
          creator: creator ? {
            id: creator.id,
            empName: creator.empName,
            empEmail: creator.empEmail
          } : { id: stat.createdById, empName: 'Unknown', empEmail: 'unknown' },
          recordingCount: stat._count.id,
          totalBytes: stat._sum.bytes || 0
        };
      });

      logger.info('Meeting recording stats retrieved', {
        empId,
        meetingId,
        totalRecordings: stats._count.id,
        totalBytes: stats._sum.bytes
      });

      res.json({
        success: true,
        data: {
          totalRecordings: stats._count.id,
          totalBytes: stats._sum.bytes || 0,
          creators: creatorStats
        }
      });

    } catch (error) {
      logger.error('Error retrieving recording stats', {
        empId: req.user?.id,
        meetingId: req.params.id,
        error: error.message
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve recording statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
}

module.exports = new EmpMeetingRecordingController();


