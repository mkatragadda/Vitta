/**
 * Encryption Service
 * Handles AES-256-CBC encryption/decryption for sensitive data
 * Used for: account numbers, routing numbers (never stored, only for transit)
 */

const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

/**
 * Encrypt data using AES-256-CBC
 * @param {string} plaintext - Data to encrypt
 * @param {string} encryptionKey - 64 hex chars (32 bytes)
 * @returns {string} IV:encrypted (both hex)
 */
function encrypt(plaintext, encryptionKey) {
  if (!encryptionKey || encryptionKey.length !== 64) {
    throw new Error(
      `Invalid encryption key length: expected 64 hex chars, got ${encryptionKey?.length || 0}`
    );
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const keyBuffer = Buffer.from(encryptionKey, 'hex');
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt data encrypted with encrypt()
 * @param {string} encryptedWithIv - IV:encrypted (hex)
 * @param {string} encryptionKey - 64 hex chars (32 bytes)
 * @returns {string} Decrypted plaintext
 */
function decrypt(encryptedWithIv, encryptionKey) {
  if (!encryptionKey || encryptionKey.length !== 64) {
    throw new Error(
      `Invalid encryption key length: expected 64 hex chars, got ${encryptionKey?.length || 0}`
    );
  }

  const [ivHex, encrypted] = encryptedWithIv.split(':');

  if (!ivHex || !encrypted) {
    throw new Error('Invalid encrypted data format: expected IV:encrypted');
  }

  try {
    const iv = Buffer.from(ivHex, 'hex');
    const keyBuffer = Buffer.from(encryptionKey, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

/**
 * Mask sensitive data (show last 4 digits only)
 * @param {string} sensitiveData - Data to mask
 * @returns {string} ****1234
 */
function maskData(sensitiveData) {
  if (!sensitiveData || sensitiveData.length < 4) {
    return '****';
  }
  return `****${sensitiveData.slice(-4)}`;
}

/**
 * Validate encryption key format
 * @param {string} key - Key to validate
 * @returns {boolean} True if valid
 */
function isValidEncryptionKey(key) {
  if (!key || typeof key !== 'string') {
    return false;
  }
  return key.length === 64 && /^[0-9a-f]{64}$/i.test(key);
}

/**
 * Generate a new encryption key
 * @returns {string} 64 hex char key
 */
function generateEncryptionKey() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = {
  encrypt,
  decrypt,
  maskData,
  isValidEncryptionKey,
  generateEncryptionKey,
  ALGORITHM,
  IV_LENGTH,
};
