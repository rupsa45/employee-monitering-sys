const jwt = require('jsonwebtoken');
const { prisma } = require('../config/prismaConfig');
// Logger removed for cleaner output

/**
 * Meeting Auth Service - JWT Token Management for Meeting Access
 * Handles short-lived meeting access tokens for Socket.IO connections
 */

class MeetingAuthService {
  /**
   * Issue a meeting access token
   * @param {Object} params - Token parameters
   * @param {string} params.meetingId - Meeting ID
   * @param {string} params.empId - Employee ID
   * @param {string} params.role - Meeting role (HOST, COHOST, PARTICIPANT)
   * @returns {Promise<string>} JWT token
   */
  async issueMeetingAccessToken({ meetingId, empId, role }) {
    try {
      // Validate meeting exists
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId }
      });

      if (!meeting) {
        throw new Error('Meeting not found');
      }

      // Validate employee exists
      const employee = await prisma.employee.findUnique({
        where: { id: empId, isActive: true }
      });

      if (!employee) {
        throw new Error('Employee not found or inactive');
      }

      // Validate role
      const validRoles = ['HOST', 'COHOST', 'PARTICIPANT'];
      if (!validRoles.includes(role)) {
        throw new Error('Invalid meeting role');
      }

      // Check if employee is actually a participant or host
      if (role === 'HOST') {
        if (meeting.hostId !== empId) {
          throw new Error('Employee is not the meeting host');
        }
      } else {
        const participant = await prisma.meetingParticipant.findUnique({
          where: {
            meetingId_empId: {
              meetingId,
              empId
            }
          }
        });

        if (!participant) {
          throw new Error('Employee is not a meeting participant');
        }

        if (participant.isBanned) {
          throw new Error('Employee is banned from this meeting');
        }
      }

      // Create token payload
      const payload = {
        sub: empId,
        meetingId,
        role,
        type: 'meeting_access'
      };

      // Generate token with 15-minute expiration
      const token = jwt.sign(payload, process.env.MEETING_JWT_SECRET, {
        expiresIn: '15m'
      });

      return token;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Verify a meeting access token
   * @param {string} token - JWT token
   * @returns {Promise<Object>} Decoded token payload
   */
  async verifyMeetingAccessToken(token) {
    try {
      if (!token) {
        throw new Error('Token is required');
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.MEETING_JWT_SECRET);

      // Validate token type
      if (decoded.type !== 'meeting_access') {
        throw new Error('Invalid token type');
      }

      // Validate required fields
      if (!decoded.sub || !decoded.meetingId || !decoded.role) {
        throw new Error('Invalid token payload');
      }

      // Check if meeting still exists and is active
      const meeting = await prisma.meeting.findUnique({
        where: { id: decoded.meetingId }
      });

      if (!meeting) {
        throw new Error('Meeting not found');
      }

      if (meeting.status === 'ENDED' || meeting.status === 'CANCELED') {
        throw new Error('Meeting has ended or been canceled');
      }

      // Check if employee is still valid
      const employee = await prisma.employee.findUnique({
        where: { id: decoded.sub, isActive: true }
      });

      if (!employee) {
        throw new Error('Employee not found or inactive');
      }

      // For non-host roles, check if still a participant and not banned
      if (decoded.role !== 'HOST') {
        const participant = await prisma.meetingParticipant.findUnique({
          where: {
            meetingId_empId: {
              meetingId: decoded.meetingId,
              empId: decoded.sub
            }
          }
        });

        if (!participant) {
          throw new Error('Employee is no longer a meeting participant');
        }

        if (participant.isBanned) {
          throw new Error('Employee is banned from this meeting');
        }
      }

      return decoded;
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      }

      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expired');
      }

      throw error;
    }
  }

  /**
   * Extract token from authorization header
   * @param {string} authHeader - Authorization header
   * @returns {string|null} Token or null
   */
  extractTokenFromHeader(authHeader) {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  /**
   * Middleware for Socket.IO authentication
   * @param {Object} socket - Socket.IO socket object
   * @param {Function} next - Next function
   */
  async socketAuthMiddleware(socket, next) {
    try {
      const token = this.extractTokenFromHeader(socket.handshake.auth.meetingAccessToken);

      if (!token) {
        return next(new Error('Meeting access token required'));
      }

      const decoded = await this.verifyMeetingAccessToken(token);

      // Attach user info to socket
      socket.user = {
        empId: decoded.sub,
        meetingId: decoded.meetingId,
        role: decoded.role
      };

      // Join meeting room
      socket.join(`meeting:${decoded.meetingId}`);

      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  }

  /**
   * Check if user has host permissions
   * @param {Object} user - User object from socket
   * @param {string} meetingId - Meeting ID
   * @returns {boolean} True if user is host
   */
  isHost(user, meetingId) {
    return user && user.meetingId === meetingId && user.role === 'HOST';
  }

  /**
   * Check if user has cohost permissions
   * @param {Object} user - User object from socket
   * @param {string} meetingId - Meeting ID
   * @returns {boolean} True if user is host or cohost
   */
  isCohost(user, meetingId) {
    return user && user.meetingId === meetingId && (user.role === 'HOST' || user.role === 'COHOST');
  }

  /**
   * Check if user is participant in meeting
   * @param {Object} user - User object from socket
   * @param {string} meetingId - Meeting ID
   * @returns {boolean} True if user is participant
   */
  isParticipant(user, meetingId) {
    return user && user.meetingId === meetingId;
  }
}

module.exports = new MeetingAuthService();






