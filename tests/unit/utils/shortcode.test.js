const { generateShortcode, validateShortcode, ALPHABET } = require('../../../utils/shortcode');

describe('Shortcode Utility', () => {
  describe('generateShortcode', () => {
    test('should generate a 6-character code by default', () => {
      const code = generateShortcode();
      expect(code).toHaveLength(6);
      expect(validateShortcode(code)).toBe(true);
    });

    test('should generate codes of specified length', () => {
      const code4 = generateShortcode(4);
      const code8 = generateShortcode(8);
      
      expect(code4).toHaveLength(4);
      expect(code8).toHaveLength(8);
      expect(validateShortcode(code4)).toBe(true);
      expect(validateShortcode(code8)).toBe(true);
    });

    test('should generate unique codes', () => {
      const codes = new Set();
      for (let i = 0; i < 100; i++) {
        codes.add(generateShortcode());
      }
      expect(codes.size).toBe(100);
    });

    test('should only use characters from ALPHABET', () => {
      const code = generateShortcode();
      const validChars = new Set(ALPHABET.split(''));
      
      for (const char of code) {
        expect(validChars.has(char)).toBe(true);
      }
    });

    test('should throw error for invalid length', () => {
      expect(() => generateShortcode(3)).toThrow('Shortcode length must be between 4 and 8 characters');
      expect(() => generateShortcode(9)).toThrow('Shortcode length must be between 4 and 8 characters');
    });
  });

  describe('validateShortcode', () => {
    test('should validate correct codes', () => {
      expect(validateShortcode('ABCDEF')).toBe(true);
      expect(validateShortcode('ABC')).toBe(false); // Too short
      expect(validateShortcode('ABCDEFGHI')).toBe(false); // Too long
    });

    test('should reject codes with invalid characters', () => {
      expect(validateShortcode('ABC123')).toBe(false); // Contains 1
      expect(validateShortcode('ABCD0F')).toBe(false); // Contains 0
      expect(validateShortcode('ABCDOF')).toBe(false); // Contains O
    });

    test('should handle edge cases', () => {
      expect(validateShortcode('')).toBe(false);
      expect(validateShortcode(null)).toBe(false);
      expect(validateShortcode(undefined)).toBe(false);
      expect(validateShortcode(123)).toBe(false);
    });
  });

  describe('ALPHABET', () => {
    test('should not contain ambiguous characters', () => {
      expect(ALPHABET).not.toContain('0');
      expect(ALPHABET).not.toContain('O');
      expect(ALPHABET).not.toContain('1');
      expect(ALPHABET).not.toContain('I');
    });

    test('should contain valid characters', () => {
      expect(ALPHABET).toContain('A');
      expect(ALPHABET).toContain('Z');
      expect(ALPHABET).toContain('2');
      expect(ALPHABET).toContain('9');
    });
  });
});





