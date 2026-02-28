/**
 * Unit Tests for BeneficiaryService
 *
 * Test Coverage:
 * - Input validation (name, phone, payment method)
 * - UPI specific validation
 * - Bank account validation
 * - Duplicate detection (3 scenarios: verified, failed, pending)
 * - Encryption/decryption
 * - Error handling
 * - User authorization scoping
 */

const BeneficiaryService = require('../beneficiary-service');

describe('BeneficiaryService', () => {
  let beneficiaryService;
  let mockDb;
  // 32-byte hex key (64 characters: 32 bytes * 2 hex chars per byte)
  const ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const TEST_USER_ID = 'test-user-123';
  const TEST_BENEFICIARY_ID = 'test-beneficiary-456';

  beforeEach(() => {
    // Mock database
    mockDb = {
      beneficiaries: {
        create: jest.fn(),
        findOne: jest.fn(),
        findAll: jest.fn(),
        update: jest.fn()
      },
      beneficiary_verification_log: {
        create: jest.fn()
      }
    };

    beneficiaryService = new BeneficiaryService(mockDb, ENCRYPTION_KEY);
  });

  describe('Constructor', () => {
    test('should initialize with valid db and encryption key', () => {
      expect(beneficiaryService.db).toBe(mockDb);
      expect(beneficiaryService.encryptionKey).toBe(ENCRYPTION_KEY);
    });

    test('should throw error if db is missing', () => {
      expect(() => new BeneficiaryService(null, ENCRYPTION_KEY)).toThrow(
        'Database instance is required'
      );
    });

    test('should throw error if encryption key is missing', () => {
      expect(() => new BeneficiaryService(mockDb, null)).toThrow(
        'Encryption key is required'
      );
    });
  });

  describe('Input Validation', () => {
    describe('Name Validation', () => {
      test('should reject missing name', async () => {
        const result = await beneficiaryService.addBeneficiary(TEST_USER_ID, {
          name: '',
          phone: '9876543210',
          paymentMethod: 'upi',
          upiId: 'amit@okhdfcbank'
        });

        expect(result.success).toBe(false);
        expect(result.error_code).toBe('INVALID_NAME');
        expect(result.error_message).toMatch(/Name/);
      });

      test('should reject name shorter than 2 characters', async () => {
        const result = await beneficiaryService.addBeneficiary(TEST_USER_ID, {
          name: 'A',
          phone: '9876543210',
          paymentMethod: 'upi',
          upiId: 'amit@okhdfcbank'
        });

        expect(result.success).toBe(false);
        expect(result.error_code).toBe('INVALID_NAME');
      });

      test('should reject name longer than 255 characters', async () => {
        const result = await beneficiaryService.addBeneficiary(TEST_USER_ID, {
          name: 'A'.repeat(256),
          phone: '9876543210',
          paymentMethod: 'upi',
          upiId: 'amit@okhdfcbank'
        });

        expect(result.success).toBe(false);
        expect(result.error_code).toBe('INVALID_NAME');
      });

      test('should accept valid name (2 characters)', async () => {
        mockDb.beneficiaries.create.mockResolvedValue({
          id: TEST_BENEFICIARY_ID,
          name: 'Am'
        });
        mockDb.beneficiaries.findOne.mockResolvedValue(null);
        mockDb.beneficiary_verification_log.create.mockResolvedValue({});

        const result = await beneficiaryService.addBeneficiary(TEST_USER_ID, {
          name: 'Am',
          phone: '9876543210',
          paymentMethod: 'upi',
          upiId: 'amit@okhdfcbank',
          relationship: 'family'
        });

        expect(result.success).toBe(true);
      });

      test('should accept valid name (255 characters)', async () => {
        mockDb.beneficiaries.create.mockResolvedValue({
          id: TEST_BENEFICIARY_ID,
          name: 'A'.repeat(255)
        });
        mockDb.beneficiaries.findOne.mockResolvedValue(null);
        mockDb.beneficiary_verification_log.create.mockResolvedValue({});

        const result = await beneficiaryService.addBeneficiary(TEST_USER_ID, {
          name: 'A'.repeat(255),
          phone: '9876543210',
          paymentMethod: 'upi',
          upiId: 'amit@okhdfcbank',
          relationship: 'family'
        });

        expect(result.success).toBe(true);
      });
    });

    describe('Phone Validation', () => {
      test('should reject invalid phone (not 10 digits)', async () => {
        const result = await beneficiaryService.addBeneficiary(TEST_USER_ID, {
          name: 'Amit Kumar',
          phone: '98765432',
          paymentMethod: 'upi',
          upiId: 'amit@okhdfcbank'
        });

        expect(result.success).toBe(false);
        expect(result.error_code).toBe('INVALID_PHONE');
      });

      test('should reject phone not starting with 6-9', async () => {
        const result = await beneficiaryService.addBeneficiary(TEST_USER_ID, {
          name: 'Amit Kumar',
          phone: '5876543210',
          paymentMethod: 'upi',
          upiId: 'amit@okhdfcbank'
        });

        expect(result.success).toBe(false);
        expect(result.error_code).toBe('INVALID_PHONE');
      });

      test('should accept valid phone starting with 6', async () => {
        mockDb.beneficiaries.create.mockResolvedValue({
          id: TEST_BENEFICIARY_ID,
          name: 'Amit Kumar'
        });
        mockDb.beneficiaries.findOne.mockResolvedValue(null);
        mockDb.beneficiary_verification_log.create.mockResolvedValue({});

        const result = await beneficiaryService.addBeneficiary(TEST_USER_ID, {
          name: 'Amit Kumar',
          phone: '6876543210',
          paymentMethod: 'upi',
          upiId: 'amit@okhdfcbank',
          relationship: 'family'
        });

        expect(result.success).toBe(true);
      });

      test('should accept valid phone starting with 9', async () => {
        mockDb.beneficiaries.create.mockResolvedValue({
          id: TEST_BENEFICIARY_ID,
          name: 'Amit Kumar'
        });
        mockDb.beneficiaries.findOne.mockResolvedValue(null);
        mockDb.beneficiary_verification_log.create.mockResolvedValue({});

        const result = await beneficiaryService.addBeneficiary(TEST_USER_ID, {
          name: 'Amit Kumar',
          phone: '9876543210',
          paymentMethod: 'upi',
          upiId: 'amit@okhdfcbank',
          relationship: 'family'
        });

        expect(result.success).toBe(true);
      });
    });

    describe('Payment Method Validation', () => {
      test('should reject invalid payment method', async () => {
        const result = await beneficiaryService.addBeneficiary(TEST_USER_ID, {
          name: 'Amit Kumar',
          phone: '9876543210',
          paymentMethod: 'wallet',
          relationship: 'family'
        });

        expect(result.success).toBe(false);
        expect(result.error_code).toBe('INVALID_PAYMENT_METHOD');
      });

      test('should accept upi payment method', async () => {
        mockDb.beneficiaries.create.mockResolvedValue({
          id: TEST_BENEFICIARY_ID,
          name: 'Amit Kumar'
        });
        mockDb.beneficiaries.findOne.mockResolvedValue(null);
        mockDb.beneficiary_verification_log.create.mockResolvedValue({});

        const result = await beneficiaryService.addBeneficiary(TEST_USER_ID, {
          name: 'Amit Kumar',
          phone: '9876543210',
          paymentMethod: 'upi',
          upiId: 'amit@okhdfcbank',
          relationship: 'family'
        });

        expect(result.success).toBe(true);
      });

      test('should accept bank_account payment method', async () => {
        mockDb.beneficiaries.create.mockResolvedValue({
          id: TEST_BENEFICIARY_ID,
          name: 'Amit Kumar'
        });
        mockDb.beneficiaries.findOne.mockResolvedValue(null);
        mockDb.beneficiary_verification_log.create.mockResolvedValue({});

        const result = await beneficiaryService.addBeneficiary(TEST_USER_ID, {
          name: 'Amit Kumar',
          phone: '9876543210',
          paymentMethod: 'bank_account',
          account: '1234567890123456',
          ifsc: 'HDFC0000001',
          bankName: 'HDFC Bank',
          relationship: 'family'
        });

        expect(result.success).toBe(true);
      });
    });
  });

  describe('UPI Validation', () => {
    test('should reject missing UPI ID', async () => {
      const result = await beneficiaryService.addBeneficiary(TEST_USER_ID, {
        name: 'Amit Kumar',
        phone: '9876543210',
        paymentMethod: 'upi',
        upiId: ''
      });

      expect(result.success).toBe(false);
      expect(result.error_code).toBe('INVALID_UPI_FORMAT');
    });

    test('should reject invalid UPI format (missing @)', async () => {
      const result = await beneficiaryService.addBeneficiary(TEST_USER_ID, {
        name: 'Amit Kumar',
        phone: '9876543210',
        paymentMethod: 'upi',
        upiId: 'amitoukhdfcbank',
        relationship: 'family'
      });

      expect(result.success).toBe(false);
      expect(result.error_code).toBe('INVALID_UPI_FORMAT');
    });

    test('should reject invalid UPI format (invalid characters)', async () => {
      const result = await beneficiaryService.addBeneficiary(TEST_USER_ID, {
        name: 'Amit Kumar',
        phone: '9876543210',
        paymentMethod: 'upi',
        upiId: 'amit@hd@fc',
        relationship: 'family'
      });

      expect(result.success).toBe(false);
      expect(result.error_code).toBe('INVALID_UPI_FORMAT');
    });

    test('should accept valid UPI format', async () => {
      mockDb.beneficiaries.create.mockResolvedValue({
        id: TEST_BENEFICIARY_ID,
        name: 'Amit Kumar'
      });
      mockDb.beneficiaries.findOne.mockResolvedValue(null);
      mockDb.beneficiary_verification_log.create.mockResolvedValue({});

      const result = await beneficiaryService.addBeneficiary(TEST_USER_ID, {
        name: 'Amit Kumar',
        phone: '9876543210',
        paymentMethod: 'upi',
        upiId: 'amit@okhdfcbank',
        relationship: 'family'
      });

      expect(result.success).toBe(true);
    });

    test('should accept UPI with dots and underscores', async () => {
      mockDb.beneficiaries.create.mockResolvedValue({
        id: TEST_BENEFICIARY_ID,
        name: 'Amit Kumar'
      });
      mockDb.beneficiaries.findOne.mockResolvedValue(null);
      mockDb.beneficiary_verification_log.create.mockResolvedValue({});

      const result = await beneficiaryService.addBeneficiary(TEST_USER_ID, {
        name: 'Amit Kumar',
        phone: '9876543210',
        paymentMethod: 'upi',
        upiId: 'amit.raj_123@okhdfcbank',
        relationship: 'family'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Bank Account Validation', () => {
    test('should reject invalid account (too short)', async () => {
      const result = await beneficiaryService.addBeneficiary(TEST_USER_ID, {
        name: 'Amit Kumar',
        phone: '9876543210',
        paymentMethod: 'bank_account',
        account: '12345678',
        ifsc: 'HDFC0000001',
        bankName: 'HDFC Bank'
      });

      expect(result.success).toBe(false);
      expect(result.error_code).toBe('INVALID_ACCOUNT_NUMBER');
    });

    test('should reject invalid account (too long)', async () => {
      const result = await beneficiaryService.addBeneficiary(TEST_USER_ID, {
        name: 'Amit Kumar',
        phone: '9876543210',
        paymentMethod: 'bank_account',
        account: '123456789012345678901',
        ifsc: 'HDFC0000001',
        bankName: 'HDFC Bank'
      });

      expect(result.success).toBe(false);
      expect(result.error_code).toBe('INVALID_ACCOUNT_NUMBER');
    });

    test('should reject invalid account (non-numeric)', async () => {
      const result = await beneficiaryService.addBeneficiary(TEST_USER_ID, {
        name: 'Amit Kumar',
        phone: '9876543210',
        paymentMethod: 'bank_account',
        account: '123456789abc456',
        ifsc: 'HDFC0000001',
        bankName: 'HDFC Bank'
      });

      expect(result.success).toBe(false);
      expect(result.error_code).toBe('INVALID_ACCOUNT_NUMBER');
    });

    test('should reject invalid IFSC (wrong length)', async () => {
      const result = await beneficiaryService.addBeneficiary(TEST_USER_ID, {
        name: 'Amit Kumar',
        phone: '9876543210',
        paymentMethod: 'bank_account',
        account: '1234567890123456',
        ifsc: 'HDFC',
        bankName: 'HDFC Bank'
      });

      expect(result.success).toBe(false);
      expect(result.error_code).toBe('INVALID_IFSC_CODE');
    });

    test('should accept IFSC (lowercase, auto-uppercase)', async () => {
      mockDb.beneficiaries.create.mockResolvedValue({
        id: TEST_BENEFICIARY_ID,
        name: 'Amit Kumar'
      });
      mockDb.beneficiaries.findOne.mockResolvedValue(null);
      mockDb.beneficiary_verification_log.create.mockResolvedValue({});

      const result = await beneficiaryService.addBeneficiary(TEST_USER_ID, {
        name: 'Amit Kumar',
        phone: '9876543210',
        paymentMethod: 'bank_account',
        account: '1234567890123456',
        ifsc: 'hdfc0000001',
        bankName: 'HDFC Bank',
        relationship: 'family'
      });

      expect(result.success).toBe(true);
    });

    test('should accept valid bank account details', async () => {
      mockDb.beneficiaries.create.mockResolvedValue({
        id: TEST_BENEFICIARY_ID,
        name: 'Amit Kumar'
      });
      mockDb.beneficiaries.findOne.mockResolvedValue(null);
      mockDb.beneficiary_verification_log.create.mockResolvedValue({});

      const result = await beneficiaryService.addBeneficiary(TEST_USER_ID, {
        name: 'Amit Kumar',
        phone: '9876543210',
        paymentMethod: 'bank_account',
        account: '1234567890123456',
        ifsc: 'HDFC0000001',
        bankName: 'HDFC Bank',
        relationship: 'family'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Duplicate Detection', () => {
    test('should return existing verified UPI beneficiary without creating new', async () => {
      const existingBeneficiary = {
        id: 'existing-123',
        name: 'Amit Kumar',
        payment_method: 'upi',
        upi_encrypted: beneficiaryService._encryptField('amit@okhdfcbank'),
        verification_status: 'verified'
      };

      mockDb.beneficiaries.findOne.mockResolvedValue(existingBeneficiary);

      const result = await beneficiaryService.addBeneficiary(TEST_USER_ID, {
        name: 'Amit Kumar',
        phone: '9876543210',
        paymentMethod: 'upi',
        upiId: 'amit@okhdfcbank',
        relationship: 'family'
      });

      expect(result.success).toBe(true);
      expect(result.isDuplicate).toBe(true);
      expect(result.beneficiary_id).toBe('existing-123');
      expect(mockDb.beneficiaries.create).not.toHaveBeenCalled();
    });

    test('should allow retry for failed UPI verification', async () => {
      const failedBeneficiary = {
        id: 'failed-123',
        name: 'Amit Kumar',
        payment_method: 'upi',
        upi_encrypted: beneficiaryService._encryptField('amit@okhdfcbank'),
        verification_status: 'failed'
      };

      mockDb.beneficiaries.findOne.mockResolvedValue(failedBeneficiary);
      mockDb.beneficiaries.create.mockResolvedValue({
        id: 'new-123',
        name: 'Amit Kumar'
      });
      mockDb.beneficiary_verification_log.create.mockResolvedValue({});

      const result = await beneficiaryService.addBeneficiary(TEST_USER_ID, {
        name: 'Amit Kumar',
        phone: '9876543210',
        paymentMethod: 'upi',
        upiId: 'amit@okhdfcbank',
        relationship: 'family'
      });

      expect(result.success).toBe(true);
      expect(mockDb.beneficiaries.create).toHaveBeenCalled();
    });

    test('should block verification in progress', async () => {
      const pendingBeneficiary = {
        id: 'pending-123',
        name: 'Amit Kumar',
        payment_method: 'upi',
        upi_encrypted: beneficiaryService._encryptField('amit@okhdfcbank'),
        verification_status: 'pending'
      };

      mockDb.beneficiaries.findOne.mockResolvedValue(pendingBeneficiary);

      const result = await beneficiaryService.addBeneficiary(TEST_USER_ID, {
        name: 'Amit Kumar',
        phone: '9876543210',
        paymentMethod: 'upi',
        upiId: 'amit@okhdfcbank',
        relationship: 'family'
      });

      expect(result.success).toBe(false);
      expect(result.error_code).toBe('VERIFICATION_IN_PROGRESS');
      expect(result.isDuplicate).toBe(true);
    });

    test('should detect duplicate bank account with same IFSC', async () => {
      const existingBeneficiary = {
        id: 'existing-123',
        name: 'Amit Kumar',
        payment_method: 'bank_account',
        account_encrypted: beneficiaryService._encryptField('1234567890123456'),
        ifsc: 'HDFC0000001',
        verification_status: 'verified'
      };

      mockDb.beneficiaries.findOne.mockResolvedValue(existingBeneficiary);

      const result = await beneficiaryService.addBeneficiary(TEST_USER_ID, {
        name: 'Amit Kumar',
        phone: '9876543210',
        paymentMethod: 'bank_account',
        account: '1234567890123456',
        ifsc: 'HDFC0000001',
        bankName: 'HDFC Bank',
        relationship: 'family'
      });

      expect(result.success).toBe(true);
      expect(result.isDuplicate).toBe(true);
    });
  });

  describe('Encryption/Decryption', () => {
    test('should encrypt and decrypt UPI ID correctly', () => {
      const upi = 'amit@okhdfcbank';

      const encrypted = beneficiaryService._encryptField(upi);
      expect(encrypted).toContain(':');
      expect(encrypted.split(':')[0].length).toBe(32); // IV is 16 bytes = 32 hex chars

      const decrypted = beneficiaryService._decryptField(encrypted);
      expect(decrypted).toBe(upi);
    });

    test('should encrypt and decrypt account number correctly', () => {
      const account = '1234567890123456';

      const encrypted = beneficiaryService._encryptField(account);
      const decrypted = beneficiaryService._decryptField(encrypted);

      expect(decrypted).toBe(account);
    });

    test('should generate different ciphertext for same plaintext (random IV)', () => {
      const plaintext = 'amit@okhdfcbank';

      const encrypted1 = beneficiaryService._encryptField(plaintext);
      const encrypted2 = beneficiaryService._encryptField(plaintext);

      expect(encrypted1).not.toBe(encrypted2); // Different IVs
      expect(beneficiaryService._decryptField(encrypted1)).toBe(plaintext);
      expect(beneficiaryService._decryptField(encrypted2)).toBe(plaintext);
    });

    test('should handle decryption of null', () => {
      const result = beneficiaryService._decryptField(null);
      expect(result).toBe(null);
    });

    test('should handle decryption of malformed data', () => {
      const result = beneficiaryService._decryptField('invalid:data:format');
      expect(result).toBeNull();
    });
  });

  describe('Error Handling', () => {
    test('should return error response on database failure', async () => {
      mockDb.beneficiaries.findOne.mockResolvedValue(null);
      mockDb.beneficiaries.create.mockRejectedValue(
        new Error('Database connection failed')
      );

      const result = await beneficiaryService.addBeneficiary(TEST_USER_ID, {
        name: 'Amit Kumar',
        phone: '9876543210',
        paymentMethod: 'upi',
        upiId: 'amit@okhdfcbank',
        relationship: 'family'
      });

      expect(result.success).toBe(false);
      expect(result.error_message).toContain('Database connection failed');
    });

    test('should log failed verification', async () => {
      mockDb.beneficiaries.findOne.mockResolvedValue(null);
      mockDb.beneficiaries.create.mockRejectedValue(new Error('DB Error'));
      mockDb.beneficiary_verification_log.create.mockResolvedValue({});

      await beneficiaryService.addBeneficiary(TEST_USER_ID, {
        name: 'Amit Kumar',
        phone: '9876543210',
        paymentMethod: 'upi',
        upiId: 'amit@okhdfcbank',
        relationship: 'family'
      });

      expect(mockDb.beneficiary_verification_log.create).toHaveBeenCalled();
    });
  });

  describe('Authorization Scoping', () => {
    test('should use user_id in all database queries', async () => {
      mockDb.beneficiaries.create.mockResolvedValue({
        id: TEST_BENEFICIARY_ID
      });
      mockDb.beneficiaries.findOne.mockResolvedValue(null);
      mockDb.beneficiary_verification_log.create.mockResolvedValue({});

      const userId = 'specific-user-456';
      await beneficiaryService.addBeneficiary(userId, {
        name: 'Amit Kumar',
        phone: '9876543210',
        paymentMethod: 'upi',
        upiId: 'amit@okhdfcbank',
        relationship: 'family'
      });

      // Verify user_id is scoped in create call
      expect(mockDb.beneficiaries.create).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: userId })
      );
    });
  });

  describe('Logging and Audit Trail', () => {
    test('should log verification attempt on success', async () => {
      mockDb.beneficiaries.create.mockResolvedValue({
        id: TEST_BENEFICIARY_ID
      });
      mockDb.beneficiaries.findOne.mockResolvedValue(null);
      mockDb.beneficiary_verification_log.create.mockResolvedValue({});

      await beneficiaryService.addBeneficiary(TEST_USER_ID, {
        name: 'Amit Kumar',
        phone: '9876543210',
        paymentMethod: 'upi',
        upiId: 'amit@okhdfcbank',
        relationship: 'family',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      });

      expect(mockDb.beneficiary_verification_log.create).toHaveBeenCalledWith(
        expect.objectContaining({
          beneficiary_id: TEST_BENEFICIARY_ID,
          user_id: TEST_USER_ID,
          verification_status: 'verified'
        })
      );
    });
  });
});
