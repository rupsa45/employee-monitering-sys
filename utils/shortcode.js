/**
 * Shortcode Generator for Meeting Rooms
 * Generates 6-8 character room codes (A-Z0-9, no ambiguous characters)
 */

const crypto = require('crypto');

// Characters that are easy to distinguish (no 0, O, 1, I, etc.)
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Generate a random room code
 * @param {number} length - Length of the code (default: 6)
 * @returns {string} Room code
 */
function generateShortcode(length = 6) {
  if (length < 4 || length > 8) {
    throw new Error('Shortcode length must be between 4 and 8 characters');
  }

  let code = '';
  const randomBytes = crypto.randomBytes(length);
  
  for (let i = 0; i < length; i++) {
    const randomIndex = randomBytes[i] % ALPHABET.length;
    code += ALPHABET[randomIndex];
  }
  
  return code;
}

/**
 * Validate a room code format
 * @param {string} code - Room code to validate
 * @returns {boolean} True if valid
 */
function validateShortcode(code) {
  if (!code || typeof code !== 'string') {
    return false;
  }
  
  if (code.length < 4 || code.length > 8) {
    return false;
  }
  
  // Check if all characters are in our alphabet
  return code.split('').every(char => ALPHABET.includes(char));
}

module.exports = {
  generateShortcode,
  validateShortcode,
  ALPHABET
};



