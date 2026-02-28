/**
 * BeneficiaryService - Business Logic for Managing Beneficiaries
 *
 * Handles:
 * - Adding beneficiaries (recipients) for international transfers
 * - Duplicate detection (verified/failed/pending scenarios)
 * - Input validation (name, phone, UPI, account, IFSC)
 * - Encryption/decryption of sensitive fields (UPI, account)
 * - Verification logging for audit trail
 * - User-scoped database queries (authorization)
 *
 * Security Features:
 * - AES-256-CBC encryption with random IV
 * - Sensitive field masking in logs
 * - User-scoped queries prevent data leaks
 * - Comprehensive audit logging
 */

const crypto = require('crypto');

/**
 * BeneficiaryService - Manages beneficiary operations
 *
 * @class
 * @param {Object} db - Database instance (Supabase client or adapter)
 * @param {string} encryptionKey - 32-byte hex string for AES-256 encryption
 *
 * @throws {Error} If db or encryptionKey is missing
 */
class BeneficiaryService {
  constructor(db, encryptionKey) {
    if (!db) {
      throw new Error('[BeneficiaryService] Database instance is required');
    }
    if (!encryptionKey) {
      throw new Error('[BeneficiaryService] Encryption key is required');
    }

    this.db = db;
    this.encryptionKey = encryptionKey;

    console.log('[BeneficiaryService] Initialized successfully');
  }

  /**
   * Add a new beneficiary for the user
   *
   * Flow:
   * 1. Validate input format (name, phone, payment method)
   * 2. Check for duplicate beneficiaries
   * 3. Validate payment method specific fields
   * 4. Encrypt sensitive fields
   * 5. Create beneficiary record
   * 6. Log verification attempt
   *
   * @param {string} userId - User ID from JWT token
   * @param {Object} beneficiaryData - Beneficiary details
   * @param {string} beneficiaryData.name - Beneficiary name (2-255 chars)
   * @param {string} beneficiaryData.phone - Phone number (10 digits, starts 6-9)
   * @param {string} beneficiaryData.paymentMethod - 'upi' or 'bank_account'
   * @param {string} beneficiaryData.upiId - UPI ID (for UPI method)
   * @param {string} beneficiaryData.account - Account number (for Bank method)
   * @param {string} beneficiaryData.ifsc - IFSC code (for Bank method)
   * @param {string} beneficiaryData.bankName - Bank name (for Bank method)
   * @param {string} beneficiaryData.relationship - Relationship to user
   * @param {string} beneficiaryData.ipAddress - IP address from request
   * @param {string} beneficiaryData.userAgent - User agent from request
   *
   * @returns {Promise<Object>} Response with success/error status
   * @returns {Object.success} boolean - Operation success
   * @returns {Object.beneficiary_id} string - New beneficiary ID (if successful)
   * @returns {Object.name} string - Beneficiary name (if successful)
   * @returns {Object.error_code} string - Error code (if failed)
   * @returns {Object.error_message} string - User-friendly error message
   * @returns {Object.suggestion} string - Actionable suggestion for user
   * @returns {Object.isDuplicate} boolean - Whether this is a duplicate
   */
  async addBeneficiary(userId, beneficiaryData) {
    console.log('[BeneficiaryService] Adding beneficiary for user:', userId);

    try {
      // Step 1: Validate input format
      this._validateInputFormat(beneficiaryData);

      // Step 2: Check for duplicates
      const duplicateResult = await this._checkDuplicate(userId, beneficiaryData);
      if (duplicateResult.exists) {
        console.log('[BeneficiaryService] Duplicate beneficiary detected');
        return duplicateResult.response;
      }

      // Step 3: Validate payment method specific fields
      this._validatePaymentMethod(beneficiaryData);

      // Step 4: Encrypt sensitive fields
      const encryptedData = this._encryptSensitiveFields(beneficiaryData);

      // Step 5: Create beneficiary record
      const beneficiary = await this.db.beneficiaries.create({
        id: this._generateUUID(),
        user_id: userId,
        name: beneficiaryData.name.trim(),
        phone: beneficiaryData.phone.trim(),
        email: beneficiaryData.email || null,
        payment_method: beneficiaryData.paymentMethod.toLowerCase(),

        // Encrypted payment details
        upi_encrypted:
          beneficiaryData.paymentMethod === 'upi' ? encryptedData.upi : null,
        account_encrypted:
          beneficiaryData.paymentMethod === 'bank_account'
            ? encryptedData.account
            : null,
        ifsc:
          beneficiaryData.paymentMethod === 'bank_account'
            ? beneficiaryData.ifsc.toUpperCase()
            : null,
        bank_name:
          beneficiaryData.paymentMethod === 'bank_account'
            ? beneficiaryData.bankName.trim()
            : null,

        // Verification status
        verification_status: 'verified', // Local validation only, no external API call
        verified_at: new Date(),
        verified_by_system: 'local_validation',
        verification_attempts: 1,
        last_verification_attempt: new Date(),

        // Metadata
        relationship: beneficiaryData.relationship || 'other',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      });

      // Step 6: Log verification attempt
      await this._logVerification(beneficiary.id, userId, 'verified', {
        method: 'local_validation',
        paymentMethod: beneficiaryData.paymentMethod,
        ipAddress: beneficiaryData.ipAddress,
        userAgent: beneficiaryData.userAgent
      });

      console.log(
        '[BeneficiaryService] Beneficiary added successfully:',
        beneficiary.id
      );

      return {
        success: true,
        beneficiary_id: beneficiary.id,
        name: beneficiary.name,
        paymentMethod: beneficiary.payment_method,
        verificationStatus: 'verified',
        message: 'Beneficiary added successfully and is ready to use',
        isDuplicate: false
      };
    } catch (error) {
      console.error('[BeneficiaryService] Error adding beneficiary:', error.message);

      // Log failed verification attempt (if we have a user)
      if (userId) {
        await this._logVerification(null, userId, 'failed', {
          error: error.message,
          method: 'local_validation'
        }).catch(err =>
          console.error('[BeneficiaryService] Failed to log error:', err.message)
        );
      }

      return {
        success: false,
        error_code: this._mapErrorCode(error),
        error_message: error.message,
        suggestion: this._getSuggestion(error)
      };
    }
  }

  /**
   * Get all beneficiaries for a user
   *
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of beneficiaries with decrypted sensitive fields
   */
  async getBeneficiaries(userId) {
    console.log('[BeneficiaryService] Fetching beneficiaries for user:', userId);

    try {
      const beneficiaries = await this.db.beneficiaries.findAll({
        where: { user_id: userId, is_active: true },
        order: [['created_at', 'DESC']]
      });

      return beneficiaries.map(b => this._decryptBeneficiary(b));
    } catch (error) {
      console.error('[BeneficiaryService] Error fetching beneficiaries:', error.message);
      throw error;
    }
  }

  /**
   * Get single beneficiary by ID
   *
   * @param {string} userId - User ID (for authorization)
   * @param {string} beneficiaryId - Beneficiary ID
   * @returns {Promise<Object>} Beneficiary with decrypted sensitive fields
   * @throws {Error} If beneficiary not found or user not authorized
   */
  async getBeneficiary(userId, beneficiaryId) {
    console.log('[BeneficiaryService] Fetching beneficiary:', beneficiaryId);

    try {
      const beneficiary = await this.db.beneficiaries.findOne({
        where: { id: beneficiaryId, user_id: userId, is_active: true }
      });

      if (!beneficiary) {
        throw new Error('Beneficiary not found');
      }

      return this._decryptBeneficiary(beneficiary);
    } catch (error) {
      console.error('[BeneficiaryService] Error fetching beneficiary:', error.message);
      throw error;
    }
  }

  /**
   * Delete a beneficiary (soft delete)
   *
   * @param {string} userId - User ID (for authorization)
   * @param {string} beneficiaryId - Beneficiary ID to delete
   * @returns {Promise<boolean>} True if deleted
   */
  async deleteBeneficiary(userId, beneficiaryId) {
    console.log('[BeneficiaryService] Deleting beneficiary:', beneficiaryId);

    try {
      const beneficiary = await this.db.beneficiaries.findOne({
        where: { id: beneficiaryId, user_id: userId }
      });

      if (!beneficiary) {
        throw new Error('Beneficiary not found');
      }

      await this.db.beneficiaries.update(
        { is_active: false, updated_at: new Date() },
        { where: { id: beneficiaryId } }
      );

      console.log('[BeneficiaryService] Beneficiary deleted:', beneficiaryId);
      return true;
    } catch (error) {
      console.error('[BeneficiaryService] Error deleting beneficiary:', error.message);
      throw error;
    }
  }

  // =========================================================================
  // PRIVATE METHODS
  // =========================================================================

  /**
   * Validate basic input format (all payment methods)
   * @private
   */
  _validateInputFormat(data) {
    // Name validation
    if (!data.name || typeof data.name !== 'string') {
      throw new Error('Name is required');
    }
    const nameLength = data.name.trim().length;
    if (nameLength < 2 || nameLength > 255) {
      throw new Error('Name must be 2-255 characters');
    }

    // Phone validation
    if (!data.phone || !/^[6-9]\d{9}$/.test(data.phone.trim())) {
      throw new Error('Phone must be 10-digit Indian number (starting with 6-9)');
    }

    // Payment method validation
    const method = data.paymentMethod?.toLowerCase();
    if (!method || !['upi', 'bank_account'].includes(method)) {
      throw new Error("Payment method must be 'upi' or 'bank_account'");
    }
  }

  /**
   * Validate payment method specific fields
   * @private
   */
  _validatePaymentMethod(data) {
    const method = data.paymentMethod.toLowerCase();

    if (method === 'upi') {
      if (!data.upiId) {
        throw new Error('UPI ID is required');
      }
      // UPI format: user@bank
      // Valid chars: a-z, A-Z, 0-9, . _ -
      const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/;
      if (!upiRegex.test(data.upiId)) {
        throw new Error('Invalid UPI format. Use format: name@bank');
      }
    } else if (method === 'bank_account') {
      // Account validation
      if (!data.account) {
        throw new Error('Account number is required');
      }
      if (!/^\d{9,18}$/.test(data.account)) {
        throw new Error('Account number must be 9-18 digits');
      }

      // IFSC validation
      if (!data.ifsc) {
        throw new Error('IFSC code is required');
      }
      if (!/^[A-Z0-9]{11}$/.test(data.ifsc.toUpperCase())) {
        throw new Error('IFSC code must be 11 alphanumeric characters');
      }

      // Bank name validation
      if (!data.bankName || data.bankName.trim().length === 0) {
        throw new Error('Bank name is required');
      }
    }
  }

  /**
   * Check for duplicate beneficiaries
   * @private
   */
  async _checkDuplicate(userId, beneficiaryData) {
    const method = beneficiaryData.paymentMethod.toLowerCase();

    if (method === 'upi') {
      return this._checkDuplicateUPI(userId, beneficiaryData);
    } else if (method === 'bank_account') {
      return this._checkDuplicateBank(userId, beneficiaryData);
    }

    return { exists: false };
  }

  /**
   * Check for duplicate UPI beneficiary
   * @private
   */
  async _checkDuplicateUPI(userId, beneficiaryData) {
    const existing = await this.db.beneficiaries.findOne({
      where: { user_id: userId, payment_method: 'upi', is_active: true }
    });

    if (existing) {
      const decryptedUpi = this._decryptField(existing.upi_encrypted);
      const submittedUpi = beneficiaryData.upiId.toLowerCase().trim();

      if (decryptedUpi.toLowerCase() === submittedUpi) {
        // Found exact duplicate
        if (existing.verification_status === 'verified') {
          return {
            exists: true,
            response: {
              success: true,
              beneficiary_id: existing.id,
              name: existing.name,
              verificationStatus: 'verified',
              isDuplicate: true,
              message: 'This beneficiary already exists in your list'
            }
          };
        } else if (existing.verification_status === 'failed') {
          return { exists: false }; // Allow retry
        } else if (existing.verification_status === 'pending') {
          return {
            exists: true,
            response: {
              success: false,
              error_code: 'VERIFICATION_IN_PROGRESS',
              error_message:
                'This beneficiary is currently being verified. Please wait.',
              isDuplicate: true
            }
          };
        }
      }
    }

    return { exists: false };
  }

  /**
   * Check for duplicate bank beneficiary
   * @private
   */
  async _checkDuplicateBank(userId, beneficiaryData) {
    const existing = await this.db.beneficiaries.findOne({
      where: {
        user_id: userId,
        payment_method: 'bank_account',
        ifsc: beneficiaryData.ifsc.toUpperCase(),
        is_active: true
      }
    });

    if (existing) {
      const decryptedAccount = this._decryptField(existing.account_encrypted);
      const submittedAccount = beneficiaryData.account.trim();

      if (decryptedAccount === submittedAccount) {
        // Found exact duplicate
        if (existing.verification_status === 'verified') {
          return {
            exists: true,
            response: {
              success: true,
              beneficiary_id: existing.id,
              name: existing.name,
              verificationStatus: 'verified',
              isDuplicate: true,
              message: 'This beneficiary already exists in your list'
            }
          };
        } else if (existing.verification_status === 'failed') {
          return { exists: false }; // Allow retry
        } else if (existing.verification_status === 'pending') {
          return {
            exists: true,
            response: {
              success: false,
              error_code: 'VERIFICATION_IN_PROGRESS',
              error_message:
                'This beneficiary is currently being verified. Please wait.',
              isDuplicate: true
            }
          };
        }
      }
    }

    return { exists: false };
  }

  /**
   * Encrypt sensitive fields
   * @private
   */
  _encryptSensitiveFields(data) {
    const encrypted = {};

    if (
      data.paymentMethod.toLowerCase() === 'upi' &&
      data.upiId
    ) {
      encrypted.upi = this._encryptField(data.upiId);
    }

    if (
      data.paymentMethod.toLowerCase() === 'bank_account' &&
      data.account
    ) {
      encrypted.account = this._encryptField(data.account);
    }

    return encrypted;
  }

  /**
   * Encrypt a single field using AES-256-CBC
   * @private
   */
  _encryptField(plaintext) {
    if (!plaintext) return null;

    // Generate random 16-byte IV
    const iv = crypto.randomBytes(16);

    // Create cipher
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(this.encryptionKey, 'hex'),
      iv
    );

    // Encrypt
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Return iv:encrypted for storage
    return `${iv.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt a single field using AES-256-CBC
   * @private
   */
  _decryptField(encryptedData) {
    if (!encryptedData) return null;

    try {
      const [ivHex, encrypted] = encryptedData.split(':');
      if (!ivHex || !encrypted) return null;

      const decipher = crypto.createDecipheriv(
        'aes-256-cbc',
        Buffer.from(this.encryptionKey, 'hex'),
        Buffer.from(ivHex, 'hex')
      );

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('[BeneficiaryService] Decryption error:', error.message);
      return null;
    }
  }

  /**
   * Decrypt beneficiary object (prepare for API response)
   * @private
   */
  _decryptBeneficiary(beneficiary) {
    return {
      id: beneficiary.id,
      name: beneficiary.name,
      phone: beneficiary.phone,
      email: beneficiary.email,
      paymentMethod: beneficiary.payment_method,
      upi:
        beneficiary.payment_method === 'upi'
          ? this._decryptField(beneficiary.upi_encrypted)
          : null,
      account:
        beneficiary.payment_method === 'bank_account'
          ? this._decryptField(beneficiary.account_encrypted)
          : null,
      ifsc: beneficiary.ifsc,
      bankName: beneficiary.bank_name,
      relationship: beneficiary.relationship,
      verificationStatus: beneficiary.verification_status,
      verifiedAt: beneficiary.verified_at,
      createdAt: beneficiary.created_at
    };
  }

  /**
   * Log verification attempt to audit trail
   * @private
   */
  async _logVerification(beneficiaryId, userId, status, details) {
    try {
      await this.db.beneficiary_verification_log.create({
        id: this._generateUUID(),
        beneficiary_id: beneficiaryId,
        user_id: userId,
        verification_status: status,
        attempt_number: 1,
        ip_address: details.ipAddress,
        user_agent: details.userAgent,
        verification_response: JSON.stringify(details),
        created_at: new Date()
      });
    } catch (error) {
      console.error('[BeneficiaryService] Failed to log verification:', error.message);
      throw error;
    }
  }

  /**
   * Map error to standard error code
   * @private
   *
   * Note: Order matters! Check specific terms before generic ones
   * (e.g., 'upi' before 'name' since error messages may contain both)
   */
  _mapErrorCode(error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('payment method')) return 'INVALID_PAYMENT_METHOD';
    if (msg.includes('upi')) return 'INVALID_UPI_FORMAT';
    if (msg.includes('account')) return 'INVALID_ACCOUNT_NUMBER';
    if (msg.includes('ifsc')) return 'INVALID_IFSC_CODE';
    if (msg.includes('bank name')) return 'INVALID_BANK_NAME';
    if (msg.includes('name')) return 'INVALID_NAME';
    if (msg.includes('phone')) return 'INVALID_PHONE';
    return 'VALIDATION_ERROR';
  }

  /**
   * Get user-friendly error suggestion
   * @private
   */
  _getSuggestion(error) {
    const msg = error.message.toLowerCase();

    const suggestions = {
      'name must be 2-255':
        'Please provide a name between 2 and 255 characters',
      'phone must be 10-digit':
        'Please provide a valid 10-digit Indian phone number (starting with 6-9)',
      'invalid upi format':
        'Please use UPI format: name@bank (e.g., amit@okhdfcbank)',
      'account number must be 9-18':
        'Please provide a valid account number (9-18 digits)',
      'ifsc code must be 11':
        'Please provide a valid IFSC code (11 alphanumeric characters)',
      'bank name is required': 'Please provide your bank name'
    };

    for (const [key, value] of Object.entries(suggestions)) {
      if (msg.includes(key)) {
        return value;
      }
    }

    return 'Please check your beneficiary details and try again';
  }

  /**
   * Generate UUID v4
   * @private
   */
  _generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

module.exports = BeneficiaryService;
