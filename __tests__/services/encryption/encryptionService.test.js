/**
 * Encryption Service Tests
 * Comprehensive test coverage for AES-256-CBC encryption/decryption
 */

const encryptionService = require('../../../services/encryption/encryptionService');

describe('Encryption Service - AES-256-CBC', () => {
  const validKey = 'a'.repeat(64);
  const plaintext = '1234567890';

  describe('Encryption', () => {
    test('should encrypt plaintext successfully', () => {
      const encrypted = encryptionService.encrypt(plaintext, validKey);
      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
      expect(encrypted).toContain(':');
    });

    test('should return IV:encrypted format', () => {
      const encrypted = encryptionService.encrypt(plaintext, validKey);
      const [iv, encryptedPart] = encrypted.split(':');
      expect(iv).toBeDefined();
      expect(encryptedPart).toBeDefined();
      expect(iv.length).toBe(32);
    });

    test('should generate unique encryption each time', () => {
      const encrypted1 = encryptionService.encrypt(plaintext, validKey);
      const encrypted2 = encryptionService.encrypt(plaintext, validKey);
      expect(encrypted1).not.toBe(encrypted2);
    });

    test('should throw error for invalid key length', () => {
      expect(() => {
        encryptionService.encrypt(plaintext, 'tooshort');
      }).toThrow(/Invalid encryption key length/);
    });
  });

  describe('Decryption', () => {
    test('should decrypt encrypted data successfully', () => {
      const encrypted = encryptionService.encrypt(plaintext, validKey);
      const decrypted = encryptionService.decrypt(encrypted, validKey);
      expect(decrypted).toBe(plaintext);
    });

    test('should throw error for invalid format', () => {
      expect(() => {
        encryptionService.decrypt('invalidentrypeddata', validKey);
      }).toThrow(/Invalid encrypted data format/);
    });

    test('should throw error for wrong encryption key', () => {
      const encrypted = encryptionService.encrypt(plaintext, validKey);
      const wrongKey = 'b'.repeat(64);
      expect(() => {
        encryptionService.decrypt(encrypted, wrongKey);
      }).toThrow(/Decryption failed/);
    });
  });

  describe('End-to-End Encryption/Decryption', () => {
    test('should encrypt and decrypt UPI ID correctly', () => {
      const upiId = 'user@okhdfcbank';
      const encrypted = encryptionService.encrypt(upiId, validKey);
      const decrypted = encryptionService.decrypt(encrypted, validKey);
      expect(decrypted).toBe(upiId);
    });

    test('should encrypt and decrypt bank account number correctly', () => {
      const accountNumber = '1234567890123456';
      const encrypted = encryptionService.encrypt(accountNumber, validKey);
      const decrypted = encryptionService.decrypt(encrypted, validKey);
      expect(decrypted).toBe(accountNumber);
    });

    test('should maintain data integrity through multiple cycles', () => {
      const testData = ['9876543210', 'user@bank', '!@#$%^&*()', 'a'.repeat(1000), ''];
      testData.forEach((data) => {
        const encrypted = encryptionService.encrypt(data, validKey);
        const decrypted = encryptionService.decrypt(encrypted, validKey);
        expect(decrypted).toBe(data);
      });
    });
  });

  describe('Key Validation', () => {
    test('should validate correct encryption key', () => {
      const validKeyHex = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      expect(encryptionService.isValidEncryptionKey(validKeyHex)).toBe(true);
    });

    test('should reject key with wrong length', () => {
      expect(encryptionService.isValidEncryptionKey('tooshort')).toBe(false);
    });

    test('should reject non-hex characters', () => {
      const invalidKey = 'g'.repeat(64);
      expect(encryptionService.isValidEncryptionKey(invalidKey)).toBe(false);
    });
  });

  describe('Key Generation', () => {
    test('should generate valid encryption key', () => {
      const key = encryptionService.generateEncryptionKey();
      expect(encryptionService.isValidEncryptionKey(key)).toBe(true);
    });

    test('should generate unique keys', () => {
      const key1 = encryptionService.generateEncryptionKey();
      const key2 = encryptionService.generateEncryptionKey();
      expect(key1).not.toBe(key2);
    });

    test('should generate usable key for encryption/decryption', () => {
      const key = encryptionService.generateEncryptionKey();
      const testData = 'test_data_123';
      const encrypted = encryptionService.encrypt(testData, key);
      const decrypted = encryptionService.decrypt(encrypted, key);
      expect(decrypted).toBe(testData);
    });
  });

  describe('Data Masking', () => {
    test('should mask sensitive data showing last 4 digits', () => {
      const sensitiveData = '1234567890';
      const masked = encryptionService.maskData(sensitiveData);
      expect(masked).toBe('****7890');
    });

    test('should mask UPI ID correctly', () => {
      const upi = 'user@okhdfcbank';
      const masked = encryptionService.maskData(upi);
      expect(masked).toBe('****bank');
    });

    test('should return **** for short data', () => {
      expect(encryptionService.maskData('ab')).toBe('****');
      expect(encryptionService.maskData('a')).toBe('****');
    });
  });
});
