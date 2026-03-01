/**
 * Encryption Service Tests
 * Tests for AES-256-CBC encryption/decryption
 */

const encryptionService = require('../../../services/encryption/encryptionService');

describe('Encryption Service', () => {
  const validKey = 'a'.repeat(64); // 64 hex chars

  describe('encrypt & decrypt', () => {
    test('should encrypt and decrypt data correctly', () => {
      const plaintext = '1234567890';
      const encrypted = encryptionService.encrypt(plaintext, validKey);
      const decrypted = encryptionService.decrypt(encrypted, validKey);

      expect(decrypted).toBe(plaintext);
    });

    test('should return different ciphertext for same plaintext (random IV)', () => {
      const plaintext = '1234567890';
      const encrypted1 = encryptionService.encrypt(plaintext, validKey);
      const encrypted2 = encryptionService.encrypt(plaintext, validKey);

      // Different due to random IVs
      expect(encrypted1).not.toBe(encrypted2);

      // But both decrypt to same value
      expect(encryptionService.decrypt(encrypted1, validKey)).toBe(plaintext);
      expect(encryptionService.decrypt(encrypted2, validKey)).toBe(plaintext);
    });

    test('should handle account numbers', () => {
      const accountNumber = '123456789012345';
      const encrypted = encryptionService.encrypt(accountNumber, validKey);
      const decrypted = encryptionService.decrypt(encrypted, validKey);

      expect(decrypted).toBe(accountNumber);
    });

    test('should handle empty strings', () => {
      const plaintext = '';
      const encrypted = encryptionService.encrypt(plaintext, validKey);
      const decrypted = encryptionService.decrypt(encrypted, validKey);

      expect(decrypted).toBe(plaintext);
    });

    test('should handle special characters', () => {
      const plaintext = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const encrypted = encryptionService.encrypt(plaintext, validKey);
      const decrypted = encryptionService.decrypt(encrypted, validKey);

      expect(decrypted).toBe(plaintext);
    });

    test('should throw error on invalid key', () => {
      const plaintext = '1234567890';
      const invalidKey = 'short'; // Too short

      expect(() => encryptionService.encrypt(plaintext, invalidKey)).toThrow();
    });

    test('should throw error on missing key', () => {
      const plaintext = '1234567890';

      expect(() => encryptionService.encrypt(plaintext, null)).toThrow();
      expect(() => encryptionService.encrypt(plaintext, undefined)).toThrow();
    });

    test('should throw error on corrupted encrypted data', () => {
      const validEncrypted = encryptionService.encrypt('1234567890', validKey);
      const corrupted = validEncrypted.substring(0, validEncrypted.length - 5); // Remove last 5 chars

      expect(() => encryptionService.decrypt(corrupted, validKey)).toThrow();
    });

    test('should throw error on invalid encrypted format', () => {
      const invalidFormat = 'not:valid:format'; // Too many colons
      expect(() => encryptionService.decrypt(invalidFormat, validKey)).toThrow();
    });

    test('should throw error on wrong key', () => {
      const plaintext = '1234567890';
      const encrypted = encryptionService.encrypt(plaintext, validKey);
      const wrongKey = 'b'.repeat(64);

      expect(() => encryptionService.decrypt(encrypted, wrongKey)).toThrow();
    });
  });

  describe('maskData', () => {
    test('should mask account number showing last 4 digits', () => {
      const result = encryptionService.maskData('1234567890');
      expect(result).toBe('****7890');
    });

    test('should mask routing number', () => {
      const result = encryptionService.maskData('123456789');
      expect(result).toBe('****6789');
    });

    test('should return **** for data with less than 4 digits', () => {
      expect(encryptionService.maskData('123')).toBe('****');
      expect(encryptionService.maskData('12')).toBe('****');
      expect(encryptionService.maskData('')).toBe('****');
      expect(encryptionService.maskData(null)).toBe('****');
    });

    test('should handle exactly 4 digits', () => {
      const result = encryptionService.maskData('1234');
      expect(result).toBe('****1234');
    });
  });

  describe('isValidEncryptionKey', () => {
    test('should validate correct key format', () => {
      const validKey = 'a'.repeat(64);
      expect(encryptionService.isValidEncryptionKey(validKey)).toBe(true);
    });

    test('should accept uppercase hex chars', () => {
      const validKey = 'A'.repeat(64);
      expect(encryptionService.isValidEncryptionKey(validKey)).toBe(true);
    });

    test('should accept mixed case hex', () => {
      const validKey = 'aAbBcCdDeEfF'.repeat(5) + 'aAbB';
      expect(encryptionService.isValidEncryptionKey(validKey)).toBe(true);
    });

    test('should reject key with wrong length', () => {
      expect(encryptionService.isValidEncryptionKey('a'.repeat(32))).toBe(false);
      expect(encryptionService.isValidEncryptionKey('a'.repeat(128))).toBe(false);
    });

    test('should reject non-hex characters', () => {
      const invalidKey = 'z'.repeat(64); // 'z' is not hex
      expect(encryptionService.isValidEncryptionKey(invalidKey)).toBe(false);
    });

    test('should reject null or undefined', () => {
      expect(encryptionService.isValidEncryptionKey(null)).toBe(false);
      expect(encryptionService.isValidEncryptionKey(undefined)).toBe(false);
    });

    test('should reject non-string types', () => {
      expect(encryptionService.isValidEncryptionKey(123)).toBe(false);
      expect(encryptionService.isValidEncryptionKey({})).toBe(false);
    });
  });

  describe('generateEncryptionKey', () => {
    test('should generate valid key', () => {
      const key = encryptionService.generateEncryptionKey();

      expect(encryptionService.isValidEncryptionKey(key)).toBe(true);
    });

    test('should generate different keys each time (random)', () => {
      const key1 = encryptionService.generateEncryptionKey();
      const key2 = encryptionService.generateEncryptionKey();

      expect(key1).not.toBe(key2);
    });

    test('should generate 64-char hex string', () => {
      const key = encryptionService.generateEncryptionKey();

      expect(key).toMatch(/^[0-9a-f]{64}$/i);
      expect(key.length).toBe(64);
    });

    test('should be usable for encryption', () => {
      const key = encryptionService.generateEncryptionKey();
      const plaintext = '1234567890';

      const encrypted = encryptionService.encrypt(plaintext, key);
      const decrypted = encryptionService.decrypt(encrypted, key);

      expect(decrypted).toBe(plaintext);
    });
  });
});
