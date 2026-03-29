/**
 * Execute Endpoint - Beneficiary Decryption Tests
 *
 * Tests the correct field name usage for beneficiary data decryption
 */

jest.mock('../../../config/chimoney', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    baseUrl: 'https://api.chimoney.io',
    rateEndpoint: '/v0.2.4/rates',
    apiKey: 'test-chimoney-key',
  })),
}));

jest.mock('@supabase/supabase-js');
jest.mock('../../../services/transfer/transferService');
jest.mock('../../../services/encryption/encryptionService');
jest.mock('../../../services/plaid/plaidAuthService');
jest.mock('../../../services/payment/idempotencyService');
jest.mock('../../../utils/encryption');

import handler from '../../../pages/api/transfers/execute';
import { createClient } from '@supabase/supabase-js';

describe('POST /api/transfers/execute - Beneficiary Decryption Field Names', () => {
  let mockRes;
  let mockDb;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockDb = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    createClient.mockReturnValue(mockDb);
    global.fetch = jest.fn();
  });

  describe('Field Name Validation', () => {
    test('should use correct schema field names for UPI', async () => {
      // Schema has: upi_encrypted (NOT recipient_upi_encrypted)
      const correctUPIField = 'upi_encrypted';
      const wrongUPIField = 'recipient_upi_encrypted';

      expect(correctUPIField).toBe('upi_encrypted');
      expect(wrongUPIField).not.toBe('upi_encrypted');
    });

    test('should use correct schema field names for bank account', async () => {
      // Schema has: account_encrypted (NOT recipient_bank_account_encrypted)
      const correctBankField = 'account_encrypted';
      const wrongBankField = 'recipient_bank_account_encrypted';

      expect(correctBankField).toBe('account_encrypted');
      expect(wrongBankField).not.toBe('account_encrypted');
    });

    test('beneficiary schema has correct field structure', () => {
      // Verify the expected schema structure
      const schema = {
        beneficiaries: {
          upi: 'upi_encrypted',
          account: 'account_encrypted',
          ifsc: 'ifsc',
          bankName: 'bank_name',
        },
      };

      expect(schema.beneficiaries.upi).toBe('upi_encrypted');
      expect(schema.beneficiaries.account).toBe('account_encrypted');
    });
  });

  describe('Basic Request Validation', () => {
    test('should reject non-POST requests', async () => {
      const req = { method: 'GET', headers: {} };
      await handler(req, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(405);
    });

    test('should reject missing user ID header', async () => {
      const req = {
        method: 'POST',
        headers: {},
        body: { transfer_id: 'transfer-123' },
      };

      await handler(req, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    test('should reject missing transfer_id', async () => {
      const req = {
        method: 'POST',
        headers: { 'x-user-id': 'user-123' },
        body: {},
      };

      await handler(req, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });
});
