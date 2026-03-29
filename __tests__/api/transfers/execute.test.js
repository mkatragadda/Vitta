/**
 * API Tests: POST /api/transfers/execute
 *
 * Basic validation tests for transfer execution endpoint
 * Smart rate logic is thoroughly tested in transferService.test.js
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

describe('POST /api/transfers/execute', () => {
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

  describe('Basic Request Validation', () => {
    test('should reject non-POST requests', async () => {
      const req = { method: 'GET', headers: {} };
      await handler(req, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(405);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Method not allowed' })
      );
    });

    test('should reject requests without user ID header', async () => {
      const req = {
        method: 'POST',
        headers: {},
        body: { transfer_id: 'transfer-123' },
      };

      await handler(req, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error_code: 'MISSING_AUTH' })
      );
    });

    test('should reject requests without transfer_id in body', async () => {
      const req = {
        method: 'POST',
        headers: { 'x-user-id': 'user-123' },
        body: {},
      };

      await handler(req, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error_code: 'INVALID_REQUEST' })
      );
    });
  });
});
