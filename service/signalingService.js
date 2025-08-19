const { prisma } = require('../config/prismaConfig');
const meetingAuthService = require('./meetingAuthService');
const meetingService = require('./meetingService');
// Logger removed for cleaner output

/**
 * Signaling Service
 * Handles Socket.IO room management and WebRTC signaling for meetings
 */

class SignalingService {
  constructor() {
    this.rooms = new Map(); // roomId -> Set of socketIds
    this.socketToRoom = new Map(); // socketId -> roomId
    this.socketToUser = new Map(); // socketId -> { empId, meetingId, role }
  }

  /**
   * Authenticate socket connection using meeting access token
   * @param {string} token - Meeting access token
   * @returns {Object} User data if valid
   */
  async authenticateSocket(token) {
    try {
      if (!token) {
        throw new Error('Meeting access token required');
      }

      const userData = await meetingAuthService.verifyMeetingAccessToken(token);
      return userData;
    } catch (error) {
      logger.error('Socket authentication failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Join a meeting room
   * @param {string} socketId - Socket ID
   * @param {string} meetingId - Meeting ID
   * @param {Object} userData - User data from token
   */
  async joinRoom(socketId, meetingId, userData) {
    try {
      const roomId = `meeting:${meetingId}`;
      
      // Verify meeting exists and is live
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
        include: {
          participants: {
            where: { empId: userData.empId },
            include: { employee: true }
          }
        }
      });

      if (!meeting) {
        throw new Error('Meeting not found');
      }

      if (meeting.status !== 'LIVE') {
        throw new Error('Meeting is not live');
      }

      // Check if user is banned
      const participant = meeting.participants.find(p => p.empId === userData.empId);
      if (participant && participant.isBanned) {
        throw new Error('You are banned from this meeting');
      }

      // Add to room tracking
      if (!this.rooms.has(roomId)) {
        this.rooms.set(roomId, new Set());
      }
      this.rooms.get(roomId).add(socketId);

      // Track socket mappings
      this.socketToRoom.set(socketId, roomId);
      this.socketToUser.set(socketId, {
        empId: userData.empId,
        meetingId,
        role: userData.role,
        empName: participant?.employee?.empName || 'Unknown'
      });

      logger.info('User joined meeting room', {
        socketId,
        empId: userData.empId,
        meetingId,
        role: userData.role,
        roomId
      });

      return {
        roomId,
        userData: this.socketToUser.get(socketId),
        participants: this.getRoomParticipants(roomId)
      };
    } catch (error) {
      logger.error('Failed to join room', {
        socketId,
        meetingId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Leave a meeting room
   * @param {string} socketId - Socket ID
   */
  async leaveRoom(socketId) {
    try {
      const roomId = this.socketToRoom.get(socketId);
      const userData = this.socketToUser.get(socketId);

      if (!roomId || !userData) {
        return;
      }

      // Remove from room tracking
      const room = this.rooms.get(roomId);
      if (room) {
        room.delete(socketId);
        if (room.size === 0) {
          this.rooms.delete(roomId);
        }
      }

      // Clean up socket mappings
      this.socketToRoom.delete(socketId);
      this.socketToUser.delete(socketId);

      // Mark as left in database
      if (userData.empId && userData.meetingId) {
        try {
          await meetingService.markLeave({
            meetingId: userData.meetingId,
            empId: userData.empId
          });
        } catch (error) {
          logger.error('Failed to mark leave in database', {
            socketId,
            empId: userData.empId,
            meetingId: userData.meetingId,
            error: error.message
          });
        }
      }

      logger.info('User left meeting room', {
        socketId,
        empId: userData.empId,
        meetingId: userData.meetingId,
        roomId
      });

      return { roomId, userData };
    } catch (error) {
      logger.error('Failed to leave room', {
        socketId,
        error: error.message
      });
    }
  }

  /**
   * Get all participants in a room
   * @param {string} roomId - Room ID
   * @returns {Array} Array of participant data
   */
  getRoomParticipants(roomId) {
    const participants = [];
    const room = this.rooms.get(roomId);
    
    if (room) {
      for (const socketId of room) {
        const userData = this.socketToUser.get(socketId);
        if (userData) {
          participants.push({
            socketId,
            empId: userData.empId,
            role: userData.role,
            empName: userData.empName
          });
        }
      }
    }

    return participants;
  }

  /**
   * Get user data for a socket
   * @param {string} socketId - Socket ID
   * @returns {Object} User data
   */
  getUserData(socketId) {
    return this.socketToUser.get(socketId);
  }

  /**
   * Check if user is host in a meeting
   * @param {string} socketId - Socket ID
   * @param {string} meetingId - Meeting ID
   * @returns {boolean} True if user is host
   */
  isHost(socketId, meetingId) {
    const userData = this.socketToUser.get(socketId);
    return userData && userData.meetingId === meetingId && userData.role === 'HOST';
  }

  /**
   * Check if user is cohost in a meeting
   * @param {string} socketId - Socket ID
   * @param {string} meetingId - Meeting ID
   * @returns {boolean} True if user is cohost
   */
  isCohost(socketId, meetingId) {
    const userData = this.socketToUser.get(socketId);
    return userData && userData.meetingId === meetingId && 
           (userData.role === 'HOST' || userData.role === 'COHOST');
  }

  /**
   * Kick a participant from the meeting
   * @param {string} socketId - Socket ID of the kicker
   * @param {string} targetEmpId - Employee ID to kick
   * @returns {Object} Result of kick operation
   */
  async kickParticipant(socketId, targetEmpId) {
    try {
      const userData = this.socketToUser.get(socketId);
      if (!userData || !this.isCohost(socketId, userData.meetingId)) {
        throw new Error('Only host or cohost can kick participants');
      }

      // Find target participant's socket
      const roomId = `meeting:${userData.meetingId}`;
      const room = this.rooms.get(roomId);
      let targetSocketId = null;

      for (const sid of room) {
        const participantData = this.socketToUser.get(sid);
        if (participantData && participantData.empId === targetEmpId) {
          targetSocketId = sid;
          break;
        }
      }

      if (!targetSocketId) {
        throw new Error('Participant not found in meeting');
      }

      // Mark as left in database
      await meetingService.markLeave({
        meetingId: userData.meetingId,
        empId: targetEmpId
      });

      logger.info('Participant kicked from meeting', {
        kickerSocketId: socketId,
        kickerEmpId: userData.empId,
        targetEmpId,
        meetingId: userData.meetingId
      });

      return { targetSocketId, targetEmpId };
    } catch (error) {
      logger.error('Failed to kick participant', {
        socketId,
        targetEmpId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Ban a participant from the meeting
   * @param {string} socketId - Socket ID of the banner
   * @param {string} targetEmpId - Employee ID to ban
   * @returns {Object} Result of ban operation
   */
  async banParticipant(socketId, targetEmpId) {
    try {
      const userData = this.socketToUser.get(socketId);
      if (!userData || !this.isCohost(socketId, userData.meetingId)) {
        throw new Error('Only host or cohost can ban participants');
      }

      // Ban in database
      await prisma.meetingParticipant.updateMany({
        where: {
          meetingId: userData.meetingId,
          empId: targetEmpId
        },
        data: { isBanned: true }
      });

      // Kick from room
      const kickResult = await this.kickParticipant(socketId, targetEmpId);

      logger.info('Participant banned from meeting', {
        bannerSocketId: socketId,
        bannerEmpId: userData.empId,
        targetEmpId,
        meetingId: userData.meetingId
      });

      return { ...kickResult, banned: true };
    } catch (error) {
      logger.error('Failed to ban participant', {
        socketId,
        targetEmpId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * End a meeting (host only)
   * @param {string} socketId - Socket ID of the host
   * @returns {Object} Result of end operation
   */
  async endMeeting(socketId) {
    try {
      const userData = this.socketToUser.get(socketId);
      if (!userData || !this.isHost(socketId, userData.meetingId)) {
        throw new Error('Only host can end meeting');
      }

      // End meeting in database
      await meetingService.endMeeting({
        meetingId: userData.meetingId,
        byEmpId: userData.empId
      });

      logger.info('Meeting ended by host', {
        socketId,
        empId: userData.empId,
        meetingId: userData.meetingId
      });

      return { meetingId: userData.meetingId };
    } catch (error) {
      logger.error('Failed to end meeting', {
        socketId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get room statistics
   * @param {string} roomId - Room ID
   * @returns {Object} Room statistics
   */
  getRoomStats(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { participantCount: 0, participants: [] };
    }

    const participants = this.getRoomParticipants(roomId);
    return {
      participantCount: participants.length,
      participants
    };
  }

  /**
   * Clean up disconnected sockets
   * @param {string} socketId - Socket ID
   */
  async handleDisconnect(socketId) {
    try {
      await this.leaveRoom(socketId);
    } catch (error) {
      logger.error('Error handling disconnect', {
        socketId,
        error: error.message
      });
    }
  }
}

module.exports = new SignalingService();




