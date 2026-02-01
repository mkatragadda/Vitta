/**
 * Encryption Utility — AES-256-GCM for Plaid access tokens
 *
 * Server-side only. Uses Node.js built-in crypto module.
 * Called exclusively from pages/api/plaid/* routes — never from client code.
 *
 * Algorithm:  AES-256-GCM (authenticated encryption)
 * Key size:   256 bits (32 bytes), base64-encoded in PLAID_ENCRYPTION_KEY
 * IV size:    96 bits (12 bytes), randomly generated per encryption
 * Auth tag:   128 bits (16 bytes), appended for integrity verification
 * Stored format: base64(iv):base64(ciphertext):base64(authTag)
 *
 * Key generation (one-time, add output to .env.local as PLAID_ENCRYPTION_KEY):
 *   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 */

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits — NIST recommended for GCM

/**
 * Reads and validates the encryption key from the environment.
 * Throws if PLAID_ENCRYPTION_KEY is missing or not exactly 32 bytes.
 * @returns {Buffer} 32-byte key buffer
 */
function getKey() {
  const raw = process.env.PLAID_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error('[encryption] PLAID_ENCRYPTION_KEY is not set');
  }
  const buf = Buffer.from(raw, 'base64');
  if (buf.length !== 32) {
    throw new Error(
      '[encryption] PLAID_ENCRYPTION_KEY must decode to exactly 32 bytes. ' +
      `Got ${buf.length} bytes. Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
    );
  }
  return buf;
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * @param {string} plaintext - The value to encrypt (e.g. a Plaid access token)
 * @returns {string} Encrypted string in format: base64(iv):base64(ciphertext):base64(authTag)
 */
function encryptToken(plaintext) {
  if (typeof plaintext !== 'string' || plaintext.length === 0) {
    throw new Error('[encryption] encryptToken requires a non-empty string');
  }

  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag().toString('base64');

  return `${iv.toString('base64')}:${encrypted}:${authTag}`;
}

/**
 * Decrypts a value previously produced by encryptToken.
 * Throws if the format is invalid or authentication fails (tampered data).
 * @param {string} encrypted - The encrypted string: base64(iv):base64(ciphertext):base64(authTag)
 * @returns {string} The original plaintext
 */
function decryptToken(encrypted) {
  if (typeof encrypted !== 'string') {
    throw new Error('[encryption] decryptToken requires a string argument');
  }

  const parts = encrypted.split(':');
  if (parts.length !== 3) {
    throw new Error(
      '[encryption] Invalid encrypted format. Expected iv:ciphertext:authTag (3 colon-separated parts)'
    );
  }

  const [ivB64, ciphertextB64, tagB64] = parts;
  const key = getKey();
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(tagB64, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertextB64, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

module.exports = { encryptToken, decryptToken };
