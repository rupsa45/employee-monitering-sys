/**
 * Hash utilities using bcrypt
 * Helper functions for password hashing and comparison
 */

const bcrypt = require('bcrypt');

const SALT_ROUNDS = 12;

/**
 * Hash a password
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
async function hashPassword(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }
  
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare a password with a hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} True if password matches
 */
async function comparePassword(password, hash) {
  if (!password || !hash) {
    return false;
  }
  
  return await bcrypt.compare(password, hash);
}

/**
 * Generate a hash for meeting passwords
 * @param {string} password - Meeting password
 * @returns {Promise<string>} Hashed password
 */
async function hashMeetingPassword(password) {
  if (!password) {
    return null; // Optional meeting passwords
  }
  
  return await hashPassword(password);
}

/**
 * Verify a meeting password
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} True if password matches
 */
async function verifyMeetingPassword(password, hash) {
  if (!hash) {
    return true; // No password required
  }
  
  return await comparePassword(password, hash);
}

module.exports = {
  hashPassword,
  comparePassword,
  hashMeetingPassword,
  verifyMeetingPassword,
  SALT_ROUNDS
};



