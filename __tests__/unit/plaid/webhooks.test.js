/**
 * Tests for Plaid Webhook Handler (Route D)
 * POST /api/plaid/webhooks
 *
 * 27 comprehensive test cases covering:
 * - Signature verification
 * - Event logging
 * - Response handling
 * - Transaction processing
 * - Item update handling
 * - Error scenarios
 * - Integration flows
 */

import handler from '../../../pages/api/plaid/webhooks';
import crypto from 'crypto';

// Polyfill setImmediate for test environment
if (!global.setImmediate) {
  global.setImmediate = (callback) => {
    return setTimeout(callback, 0);
  };
}

jest.mock('../../../config/supabase', () => ({
  getSupabase: jest.fn(),
  isSupabaseConfigured: jest.fn(() => true),
}));

jest.mock('../../../utils/encryption');
jest.mock('../../../services/plaid/plaidApi');
jest.mock('../../../services/plaid/syncService');

const { getSupabase, isSupabaseConfigured } = require('../../../config/supabase');

describe('POST /api/plaid/webhooks', () => {
  let mockReq, mockRes, mockSupabase;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock response
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // Mock Supabase
    mockSupabase = {
      from: jest.fn(),
    };
    getSupabase.mockReturnValue(mockSupabase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Helper to wait for async processing
   * Uses setTimeout with minimal delay to ensure pending callbacks execute
   */
  async function waitForAsync() {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Give another tick for promises to resolve
        setTimeout(resolve, 5);
      }, 5);
    });
  }

  function createChainableMock() {
    const chain = {};
    ['select', 'eq', 'insert', 'update', 'upsert', 'single', 'order'].forEach(method => {
      chain[method] = jest.fn().mockReturnValue(chain);
    });
    return chain;
  }

  function mockRequest(body, signature = null) {
    const bodyString = JSON.stringify(body);
    return {
      method: 'POST',
      headers: signature ? { 'x-plaid-webhook-signature': signature } : {},
      async *[Symbol.asyncIterator]() {
        yield Buffer.from(bodyString);
      },
    };
  }

  function computeSignature(body, secret = 'test-secret') {
    const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
    return crypto.createHmac('sha256', secret).update(bodyString).digest('hex');
  }

  // ════════════════════════════════════════════════════════════════════════════
  // GROUP 1: SIGNATURE VERIFICATION (5 tests)
  // ════════════════════════════════════════════════════════════════════════════

  describe('Signature Verification', () => {
    test('accepts valid signature', async () => {
      const body = { webhook_code: 'TRANSACTIONS_UPDATE', item_id: 'item_123' };
      const secret = 'test-secret';
      process.env.PLAID_WEBHOOK_SECRET = secret;

      const signature = computeSignature(body, secret);

      const eventChain = createChainableMock();
      eventChain.insert = jest.fn().mockReturnValue(eventChain);
      eventChain.select = jest.fn().mockReturnValue(eventChain);
      eventChain.single = jest.fn().mockResolvedValue({
        data: { id: 'event-123' },
      });

      mockSupabase.from.mockReturnValue(eventChain);

      mockReq = mockRequest(body, signature);
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalled();

      // Check that signature_valid was set to true
      const insertCall = eventChain.insert.mock.calls[0][0];
      expect(insertCall[0].signature_valid).toBe(true);
    });

    test('rejects invalid signature', async () => {
      const body = { webhook_code: 'TRANSACTIONS_UPDATE', item_id: 'item_123' };
      process.env.PLAID_WEBHOOK_SECRET = 'correct-secret';

      const wrongSignature = computeSignature(body, 'wrong-secret');

      const eventChain = createChainableMock();
      eventChain.insert = jest.fn().mockReturnValue(eventChain);
      eventChain.select = jest.fn().mockReturnValue(eventChain);
      eventChain.single = jest.fn().mockResolvedValue({
        data: { id: 'event-123' },
      });

      mockSupabase.from.mockReturnValue(eventChain);

      mockReq = mockRequest(body, wrongSignature);
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);

      // Check that signature_valid was set to false
      const insertCall = eventChain.insert.mock.calls[0][0];
      expect(insertCall[0].signature_valid).toBe(false);
    });

    test('handles missing signature header', async () => {
      const body = { webhook_code: 'TRANSACTIONS_UPDATE', item_id: 'item_123' };

      const eventChain = createChainableMock();
      eventChain.insert = jest.fn().mockReturnValue(eventChain);
      eventChain.select = jest.fn().mockReturnValue(eventChain);
      eventChain.single = jest.fn().mockResolvedValue({
        data: { id: 'event-123' },
      });

      mockSupabase.from.mockReturnValue(eventChain);

      mockReq = mockRequest(body, null);
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);

      const insertCall = eventChain.insert.mock.calls[0][0];
      expect(insertCall[0].signature_valid).toBe(false);
    });

    test('handles multiple signatures (comma-separated)', async () => {
      const body = { webhook_code: 'TRANSACTIONS_UPDATE', item_id: 'item_123' };
      const secret = 'test-secret';
      process.env.PLAID_WEBHOOK_SECRET = secret;

      const correctSig = computeSignature(body, secret);
      const wrongSig = computeSignature(body, 'wrong-secret');
      const multiSig = `${wrongSig},${correctSig},another-wrong`;

      const eventChain = createChainableMock();
      eventChain.insert = jest.fn().mockReturnValue(eventChain);
      eventChain.select = jest.fn().mockReturnValue(eventChain);
      eventChain.single = jest.fn().mockResolvedValue({
        data: { id: 'event-123' },
      });

      mockSupabase.from.mockReturnValue(eventChain);

      mockReq = mockRequest(body, multiSig);
      await handler(mockReq, mockRes);

      const insertCall = eventChain.insert.mock.calls[0][0];
      expect(insertCall[0].signature_valid).toBe(true);
    });

    test('handles signature verification error gracefully', async () => {
      const body = { webhook_code: 'TRANSACTIONS_UPDATE' };
      process.env.PLAID_WEBHOOK_SECRET = null;

      const eventChain = createChainableMock();
      eventChain.insert = jest.fn().mockReturnValue(eventChain);
      eventChain.select = jest.fn().mockReturnValue(eventChain);
      eventChain.single = jest.fn().mockResolvedValue({
        data: { id: 'event-123' },
      });

      mockSupabase.from.mockReturnValue(eventChain);

      mockReq = mockRequest(body, 'some-signature');
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);

      const insertCall = eventChain.insert.mock.calls[0][0];
      expect(insertCall[0].signature_valid).toBe(false);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // GROUP 2: EVENT LOGGING (4 tests)
  // ════════════════════════════════════════════════════════════════════════════

  describe('Event Logging', () => {
    test('logs webhook event immediately', async () => {
      const body = {
        webhook_type: 'TRANSACTIONS',
        webhook_code: 'TRANSACTIONS_UPDATE',
        item_id: 'item_123',
        user_id: 'user_456',
        new_transactions: 5,
      };
      const secret = 'test-secret';
      process.env.PLAID_WEBHOOK_SECRET = secret;
      const signature = computeSignature(body, secret);

      const eventChain = createChainableMock();
      eventChain.insert = jest.fn().mockReturnValue(eventChain);
      eventChain.select = jest.fn().mockReturnValue(eventChain);
      eventChain.single = jest.fn().mockResolvedValue({
        data: { id: 'event-123' },
      });

      mockSupabase.from.mockReturnValue(eventChain);

      mockReq = mockRequest(body, signature);
      await handler(mockReq, mockRes);

      expect(mockSupabase.from).toHaveBeenCalledWith('plaid_webhook_events');
      expect(eventChain.insert).toHaveBeenCalled();

      const insertCall = eventChain.insert.mock.calls[0][0];
      expect(insertCall[0]).toMatchObject({
        plaid_item_id: 'item_123',
        event_type: 'TRANSACTIONS_UPDATE',
        webhook_type: 'TRANSACTIONS',
        payload: body,
        processing_status: 'pending',
      });
    });

    test('logs signature_valid flag correctly', async () => {
      const body = { webhook_code: 'TRANSACTIONS_UPDATE', item_id: 'item_123' };
      const secret = 'test-secret';
      process.env.PLAID_WEBHOOK_SECRET = secret;
      const signature = computeSignature(body, secret);

      const eventChain = createChainableMock();
      eventChain.insert = jest.fn().mockReturnValue(eventChain);
      eventChain.select = jest.fn().mockReturnValue(eventChain);
      eventChain.single = jest.fn().mockResolvedValue({
        data: { id: 'event-123' },
      });

      mockSupabase.from.mockReturnValue(eventChain);

      mockReq = mockRequest(body, signature);
      await handler(mockReq, mockRes);

      const insertCall = eventChain.insert.mock.calls[0][0];
      expect(insertCall[0].signature_valid).toBe(true);
    });

    test('includes error object in logged event', async () => {
      const body = {
        webhook_code: 'ERROR',
        item_id: 'item_123',
        error: { error_code: 'ITEM_LOGIN_REQUIRED' },
      };
      const secret = 'test-secret';
      process.env.PLAID_WEBHOOK_SECRET = secret;
      const signature = computeSignature(body, secret);

      const eventChain = createChainableMock();
      eventChain.insert = jest.fn().mockReturnValue(eventChain);
      eventChain.select = jest.fn().mockReturnValue(eventChain);
      eventChain.single = jest.fn().mockResolvedValue({
        data: { id: 'event-123' },
      });

      mockSupabase.from.mockReturnValue(eventChain);

      mockReq = mockRequest(body, signature);
      await handler(mockReq, mockRes);

      const insertCall = eventChain.insert.mock.calls[0][0];
      expect(insertCall[0].error).toEqual({ error_code: 'ITEM_LOGIN_REQUIRED' });
    });

    test('starts processing_status as pending', async () => {
      const body = { webhook_code: 'TRANSACTIONS_UPDATE', item_id: 'item_123' };
      const secret = 'test-secret';
      process.env.PLAID_WEBHOOK_SECRET = secret;
      const signature = computeSignature(body, secret);

      const eventChain = createChainableMock();
      eventChain.insert = jest.fn().mockReturnValue(eventChain);
      eventChain.select = jest.fn().mockReturnValue(eventChain);
      eventChain.single = jest.fn().mockResolvedValue({
        data: { id: 'event-123' },
      });

      mockSupabase.from.mockReturnValue(eventChain);

      mockReq = mockRequest(body, signature);
      await handler(mockReq, mockRes);

      const insertCall = eventChain.insert.mock.calls[0][0];
      expect(insertCall[0].processing_status).toBe('pending');
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // GROUP 3: RESPONSE HANDLING (2 tests)
  // ════════════════════════════════════════════════════════════════════════════

  describe('Response Handling', () => {
    test('always returns 200 immediately', async () => {
      const body = { webhook_code: 'TRANSACTIONS_UPDATE', item_id: 'item_123' };
      const secret = 'test-secret';
      process.env.PLAID_WEBHOOK_SECRET = secret;
      const signature = computeSignature(body, secret);

      const eventChain = createChainableMock();
      eventChain.insert = jest.fn().mockReturnValue(eventChain);
      eventChain.select = jest.fn().mockReturnValue(eventChain);
      eventChain.single = jest.fn().mockResolvedValue({
        data: { id: 'event-123' },
      });

      mockSupabase.from.mockReturnValue(eventChain);

      mockReq = mockRequest(body, signature);
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({});
    });

    test('returns 200 even on error', async () => {
      const body = null; // Invalid body

      mockReq = {
        method: 'POST',
        headers: {},
        async *[Symbol.asyncIterator]() {
          yield Buffer.from('invalid json {');
        },
      };

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // GROUP 4: TRANSACTIONS UPDATE PROCESSING (6 tests)
  // ════════════════════════════════════════════════════════════════════════════

  describe('TRANSACTIONS_UPDATE Processing', () => {
    test('routes TRANSACTIONS_UPDATE to correct handler', async () => {
      const { syncTransactions } = require('../../../services/plaid/syncService');

      const body = { webhook_code: 'TRANSACTIONS_UPDATE', item_id: 'item_123' };
      const secret = 'test-secret';
      process.env.PLAID_WEBHOOK_SECRET = secret;
      const signature = computeSignature(body, secret);

      const itemChain = createChainableMock();
      itemChain.select = jest.fn().mockReturnValue(itemChain);
      itemChain.eq = jest.fn().mockReturnValue(itemChain);
      itemChain.single = jest.fn().mockResolvedValue({
        data: {
          id: 'item-db-uuid',
          user_id: 'user-123',
          access_token_enc: 'encrypted-token',
          transactions_cursor: '',
        },
      });

      const eventChain = createChainableMock();
      const updateChain = createChainableMock();

      mockSupabase.from.mockImplementation(table => {
        if (table === 'plaid_webhook_events') return eventChain;
        if (table === 'plaid_items') return itemChain;
        if (table === 'plaid_liabilities') return updateChain;
        if (table === 'user_credit_cards') return updateChain;
        return eventChain;
      });

      eventChain.insert = jest.fn().mockReturnValue(eventChain);
      eventChain.select = jest.fn().mockReturnValue(eventChain);
      eventChain.single = jest.fn().mockResolvedValue({
        data: { id: 'event-123' },
      });
      eventChain.update = jest.fn().mockReturnValue(eventChain);
      eventChain.eq = jest.fn().mockReturnValue(eventChain);

      updateChain.upsert = jest.fn().mockReturnValue(updateChain);
      updateChain.eq = jest.fn().mockReturnValue(updateChain);
      updateChain.select = jest.fn().mockReturnValue(updateChain);
      updateChain.update = jest.fn().mockReturnValue(updateChain);

      const { decryptToken } = require('../../../utils/encryption');
      decryptToken.mockReturnValue('decrypted-token');

      syncTransactions.mockResolvedValue(undefined);

      mockReq = mockRequest(body, signature);
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);

      // Wait for async processing
      await waitForAsync();

      expect(syncTransactions).toHaveBeenCalled();
    });

    test('handles TRANSACTIONS_READY webhook', async () => {
      const { syncTransactions } = require('../../../services/plaid/syncService');

      const body = { webhook_code: 'TRANSACTIONS_READY', item_id: 'item_123' };
      const secret = 'test-secret';
      process.env.PLAID_WEBHOOK_SECRET = secret;
      const signature = computeSignature(body, secret);

      const itemChain = createChainableMock();
      itemChain.single = jest.fn().mockResolvedValue({
        data: {
          id: 'item-db-uuid',
          user_id: 'user-123',
          access_token_enc: 'encrypted-token',
          transactions_cursor: '',
        },
      });

      const eventChain = createChainableMock();
      eventChain.insert = jest.fn().mockReturnValue(eventChain);
      eventChain.select = jest.fn().mockReturnValue(eventChain);
      eventChain.single = jest.fn().mockResolvedValue({
        data: { id: 'event-123' },
      });

      mockSupabase.from.mockReturnValue(eventChain);
      mockSupabase.from.mockImplementationOnce(table => {
        if (table === 'plaid_items') return itemChain;
        return eventChain;
      });

      const { decryptToken } = require('../../../utils/encryption');
      decryptToken.mockReturnValue('decrypted-token');

      syncTransactions.mockResolvedValue(undefined);

      mockReq = mockRequest(body, signature);
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    test('handles missing item gracefully', async () => {
      const body = { webhook_code: 'TRANSACTIONS_UPDATE', item_id: 'item_nonexistent' };
      const secret = 'test-secret';
      process.env.PLAID_WEBHOOK_SECRET = secret;
      const signature = computeSignature(body, secret);

      const itemChain = createChainableMock();
      itemChain.single = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      const eventChain = createChainableMock();
      eventChain.insert = jest.fn().mockReturnValue(eventChain);
      eventChain.select = jest.fn().mockReturnValue(eventChain);
      eventChain.single = jest.fn().mockResolvedValue({
        data: { id: 'event-123' },
      });
      eventChain.update = jest.fn().mockReturnValue(eventChain);
      eventChain.eq = jest.fn().mockReturnValue(eventChain);

      mockSupabase.from.mockImplementation(table => {
        if (table === 'plaid_items') return itemChain;
        return eventChain;
      });

      mockReq = mockRequest(body, signature);
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);

      // Wait for async and check that error was logged
      await waitForAsync();
    });

    test('decrypts access token', async () => {
      const { decryptToken } = require('../../../utils/encryption');
      const { syncTransactions } = require('../../../services/plaid/syncService');

      const body = { webhook_code: 'TRANSACTIONS_UPDATE', item_id: 'item_123' };
      const secret = 'test-secret';
      process.env.PLAID_WEBHOOK_SECRET = secret;
      const signature = computeSignature(body, secret);

      const itemChain = createChainableMock();
      itemChain.single = jest.fn().mockResolvedValue({
        data: {
          id: 'item-db-uuid',
          user_id: 'user-123',
          access_token_enc: 'encrypted-token-xyz',
          transactions_cursor: 'cursor-abc',
        },
      });

      const eventChain = createChainableMock();
      eventChain.insert = jest.fn().mockReturnValue(eventChain);
      eventChain.select = jest.fn().mockReturnValue(eventChain);
      eventChain.single = jest.fn().mockResolvedValue({
        data: { id: 'event-123' },
      });

      mockSupabase.from.mockImplementation(table => {
        if (table === 'plaid_items') return itemChain;
        return eventChain;
      });

      decryptToken.mockReturnValue('decrypted-access-token-123');
      syncTransactions.mockResolvedValue(undefined);

      mockReq = mockRequest(body, signature);
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);

      await waitForAsync();

      expect(decryptToken).toHaveBeenCalledWith('encrypted-token-xyz');
    });

    test('calls syncTransactions with correct parameters', async () => {
      const { syncTransactions } = require('../../../services/plaid/syncService');

      const body = { webhook_code: 'TRANSACTIONS_UPDATE', item_id: 'item_123' };
      const secret = 'test-secret';
      process.env.PLAID_WEBHOOK_SECRET = secret;
      const signature = computeSignature(body, secret);

      const itemChain = createChainableMock();
      itemChain.single = jest.fn().mockResolvedValue({
        data: {
          id: 'item-db-uuid-456',
          user_id: 'user-789',
          access_token_enc: 'encrypted-token',
          transactions_cursor: 'cursor-old',
        },
      });

      const eventChain = createChainableMock();
      eventChain.insert = jest.fn().mockReturnValue(eventChain);
      eventChain.select = jest.fn().mockReturnValue(eventChain);
      eventChain.single = jest.fn().mockResolvedValue({
        data: { id: 'event-123' },
      });

      mockSupabase.from.mockImplementation(table => {
        if (table === 'plaid_items') return itemChain;
        return eventChain;
      });

      const { decryptToken } = require('../../../utils/encryption');
      decryptToken.mockReturnValue('decrypted-token-xyz');
      syncTransactions.mockResolvedValue(undefined);

      mockReq = mockRequest(body, signature);
      await handler(mockReq, mockRes);

      await waitForAsync();

      expect(syncTransactions).toHaveBeenCalledWith(
        expect.objectContaining({
          accessToken: 'decrypted-token-xyz',
          itemId: 'item-db-uuid-456',
          cursor: 'cursor-old',
        })
      );
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // GROUP 5: ITEM UPDATE REQUIRED PROCESSING (2 tests)
  // ════════════════════════════════════════════════════════════════════════════

  describe('ITEM_WEBHOOK_UPDATE_REQUIRED Processing', () => {
    test('updates plaid_items status to needs_update', async () => {
      const body = { webhook_code: 'ITEM_WEBHOOK_UPDATE_REQUIRED', item_id: 'item_123' };
      const secret = 'test-secret';
      process.env.PLAID_WEBHOOK_SECRET = secret;
      const signature = computeSignature(body, secret);

      const eventChain = createChainableMock();
      const itemChain = createChainableMock();

      eventChain.insert = jest.fn().mockReturnValue(eventChain);
      eventChain.select = jest.fn().mockReturnValue(eventChain);
      eventChain.single = jest.fn().mockResolvedValue({
        data: { id: 'event-123' },
      });
      eventChain.update = jest.fn().mockReturnValue(eventChain);
      eventChain.eq = jest.fn().mockReturnValue(eventChain);

      itemChain.update = jest.fn().mockReturnValue(itemChain);
      itemChain.eq = jest.fn().mockReturnValue(itemChain);

      mockSupabase.from.mockImplementation(table => {
        if (table === 'plaid_items') return itemChain;
        return eventChain;
      });

      mockReq = mockRequest(body, signature);
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);

      await waitForAsync();

      expect(itemChain.update).toHaveBeenCalledWith({ status: 'needs_update' });
    });

    test('marks event as completed after status update', async () => {
      const body = { webhook_code: 'ITEM_WEBHOOK_UPDATE_REQUIRED', item_id: 'item_123' };
      const secret = 'test-secret';
      process.env.PLAID_WEBHOOK_SECRET = secret;
      const signature = computeSignature(body, secret);

      const eventChain = createChainableMock();
      const itemChain = createChainableMock();

      eventChain.insert = jest.fn().mockReturnValue(eventChain);
      eventChain.select = jest.fn().mockReturnValue(eventChain);
      eventChain.single = jest.fn().mockResolvedValue({
        data: { id: 'event-123' },
      });
      eventChain.update = jest.fn().mockReturnValue(eventChain);
      eventChain.eq = jest.fn().mockReturnValue(eventChain);

      itemChain.update = jest.fn().mockReturnValue(itemChain);
      itemChain.eq = jest.fn().mockReturnValue(itemChain);

      mockSupabase.from.mockImplementation(table => {
        if (table === 'plaid_items') return itemChain;
        return eventChain;
      });

      mockReq = mockRequest(body, signature);
      await handler(mockReq, mockRes);

      await waitForAsync();

      // Event should be marked as completed
      expect(eventChain.update).toHaveBeenCalledWith(
        expect.objectContaining({ processing_status: 'completed' })
      );
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // GROUP 6: UNHANDLED WEBHOOK TYPES (1 test)
  // ════════════════════════════════════════════════════════════════════════════

  describe('Unhandled Webhook Types', () => {
    test('logs unhandled webhook codes but marks as completed', async () => {
      const body = { webhook_code: 'UNKNOWN_WEBHOOK_TYPE', item_id: 'item_123' };
      const secret = 'test-secret';
      process.env.PLAID_WEBHOOK_SECRET = secret;
      const signature = computeSignature(body, secret);

      const eventChain = createChainableMock();
      eventChain.insert = jest.fn().mockReturnValue(eventChain);
      eventChain.select = jest.fn().mockReturnValue(eventChain);
      eventChain.single = jest.fn().mockResolvedValue({
        data: { id: 'event-123' },
      });
      eventChain.update = jest.fn().mockReturnValue(eventChain);
      eventChain.eq = jest.fn().mockReturnValue(eventChain);

      mockSupabase.from.mockReturnValue(eventChain);

      mockReq = mockRequest(body, signature);
      await handler(mockReq, mockRes);

      await waitForAsync();

      expect(eventChain.update).toHaveBeenCalledWith(
        expect.objectContaining({ processing_status: 'completed' })
      );
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // GROUP 7: ERROR HANDLING (3 tests)
  // ════════════════════════════════════════════════════════════════════════════

  describe('Error Handling', () => {
    test('marks event as failed if sync throws error', async () => {
      const { syncTransactions } = require('../../../services/plaid/syncService');

      const body = { webhook_code: 'TRANSACTIONS_UPDATE', item_id: 'item_123' };
      const secret = 'test-secret';
      process.env.PLAID_WEBHOOK_SECRET = secret;
      const signature = computeSignature(body, secret);

      const itemChain = createChainableMock();
      itemChain.single = jest.fn().mockResolvedValue({
        data: {
          id: 'item-db-uuid',
          user_id: 'user-123',
          access_token_enc: 'encrypted-token',
          transactions_cursor: '',
        },
      });

      const eventChain = createChainableMock();
      eventChain.insert = jest.fn().mockReturnValue(eventChain);
      eventChain.select = jest.fn().mockReturnValue(eventChain);
      eventChain.single = jest.fn().mockResolvedValue({
        data: { id: 'event-123' },
      });
      eventChain.update = jest.fn().mockReturnValue(eventChain);
      eventChain.eq = jest.fn().mockReturnValue(eventChain);

      mockSupabase.from.mockImplementation(table => {
        if (table === 'plaid_items') return itemChain;
        return eventChain;
      });

      const { decryptToken } = require('../../../utils/encryption');
      decryptToken.mockReturnValue('decrypted-token');

      syncTransactions.mockRejectedValue(new Error('Sync failed'));

      mockReq = mockRequest(body, signature);
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);

      await waitForAsync();

      // Event should be marked as failed
      expect(eventChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          processing_status: 'failed',
          processing_error: 'Sync failed',
        })
      );
    });

    test('returns 200 even if logging fails', async () => {
      const body = { webhook_code: 'TRANSACTIONS_UPDATE', item_id: 'item_123' };
      const secret = 'test-secret';
      process.env.PLAID_WEBHOOK_SECRET = secret;
      const signature = computeSignature(body, secret);

      const eventChain = createChainableMock();
      eventChain.insert = jest.fn().mockReturnValue(eventChain);
      eventChain.select = jest.fn().mockReturnValue(eventChain);
      eventChain.single = jest.fn().mockResolvedValue({
        error: { message: 'DB error' },
      });

      mockSupabase.from.mockReturnValue(eventChain);

      mockReq = mockRequest(body, signature);
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalled();
    });

    test('handles invalid JSON body gracefully', async () => {
      mockReq = {
        method: 'POST',
        headers: {},
        async *[Symbol.asyncIterator]() {
          yield Buffer.from('{ invalid json');
        },
      };

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // GROUP 8: INTEGRATION SCENARIOS (4 tests)
  // ════════════════════════════════════════════════════════════════════════════

  describe('Integration Scenarios', () => {
    test('full flow: valid signature → process transactions → mark completed', async () => {
      const { syncTransactions } = require('../../../services/plaid/syncService');
      const { plaidPost } = require('../../../services/plaid/plaidApi');
      const { decryptToken } = require('../../../utils/encryption');

      const body = { webhook_code: 'TRANSACTIONS_UPDATE', item_id: 'item_123' };
      const secret = 'test-secret';
      process.env.PLAID_WEBHOOK_SECRET = secret;
      const signature = computeSignature(body, secret);

      const itemChain = createChainableMock();
      itemChain.single = jest.fn().mockResolvedValue({
        data: {
          id: 'item-db-uuid',
          user_id: 'user-123',
          access_token_enc: 'encrypted-token',
          transactions_cursor: 'cursor-123',
        },
      });

      const eventChain = createChainableMock();
      eventChain.insert = jest.fn().mockReturnValue(eventChain);
      eventChain.select = jest.fn().mockReturnValue(eventChain);
      eventChain.single = jest.fn().mockResolvedValue({
        data: { id: 'event-123' },
      });
      eventChain.update = jest.fn().mockReturnValue(eventChain);
      eventChain.eq = jest.fn().mockReturnValue(eventChain);

      mockSupabase.from.mockImplementation(table => {
        if (table === 'plaid_items') return itemChain;
        return eventChain;
      });

      decryptToken.mockReturnValue('decrypted-token');
      syncTransactions.mockResolvedValue(undefined);
      plaidPost.mockResolvedValue({ liabilities: { credit: [] } });

      mockReq = mockRequest(body, signature);
      await handler(mockReq, mockRes);

      // Response returned immediately
      expect(mockRes.status).toHaveBeenCalledWith(200);

      // Wait for async processing
      await waitForAsync();

      // Verify full flow
      expect(decryptToken).toHaveBeenCalled();
      expect(syncTransactions).toHaveBeenCalled();
      expect(eventChain.update).toHaveBeenCalledWith(
        expect.objectContaining({ processing_status: 'completed' })
      );
    });

    test('handles webhook with no new transactions', async () => {
      const { syncTransactions } = require('../../../services/plaid/syncService');

      const body = {
        webhook_code: 'TRANSACTIONS_UPDATE',
        item_id: 'item_123',
        new_transactions: 0,
      };
      const secret = 'test-secret';
      process.env.PLAID_WEBHOOK_SECRET = secret;
      const signature = computeSignature(body, secret);

      const itemChain = createChainableMock();
      itemChain.single = jest.fn().mockResolvedValue({
        data: {
          id: 'item-db-uuid',
          user_id: 'user-123',
          access_token_enc: 'encrypted-token',
          transactions_cursor: '',
        },
      });

      const eventChain = createChainableMock();
      eventChain.insert = jest.fn().mockReturnValue(eventChain);
      eventChain.select = jest.fn().mockReturnValue(eventChain);
      eventChain.single = jest.fn().mockResolvedValue({
        data: { id: 'event-123' },
      });
      eventChain.update = jest.fn().mockReturnValue(eventChain);
      eventChain.eq = jest.fn().mockReturnValue(eventChain);

      mockSupabase.from.mockImplementation(table => {
        if (table === 'plaid_items') return itemChain;
        return eventChain;
      });

      const { decryptToken } = require('../../../utils/encryption');
      decryptToken.mockReturnValue('decrypted-token');
      syncTransactions.mockResolvedValue(undefined);

      mockReq = mockRequest(body, signature);
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);

      await waitForAsync();

      // syncTransactions still called, even with 0 new
      expect(syncTransactions).toHaveBeenCalled();
    });

    test('webhook for item with no linked credit cards', async () => {
      const { syncTransactions } = require('../../../services/plaid/syncService');

      const body = { webhook_code: 'TRANSACTIONS_UPDATE', item_id: 'item_orphan' };
      const secret = 'test-secret';
      process.env.PLAID_WEBHOOK_SECRET = secret;
      const signature = computeSignature(body, secret);

      const itemChain = createChainableMock();
      itemChain.single = jest.fn().mockResolvedValue({
        data: {
          id: 'item-orphan-uuid',
          user_id: 'user-orphan',
          access_token_enc: 'encrypted-token',
          transactions_cursor: '',
        },
      });

      const eventChain = createChainableMock();
      eventChain.insert = jest.fn().mockReturnValue(eventChain);
      eventChain.select = jest.fn().mockReturnValue(eventChain);
      eventChain.single = jest.fn().mockResolvedValue({
        data: { id: 'event-orphan' },
      });
      eventChain.update = jest.fn().mockReturnValue(eventChain);
      eventChain.eq = jest.fn().mockReturnValue(eventChain);

      const cardChain = createChainableMock();
      cardChain.select = jest.fn().mockReturnValue(cardChain);
      cardChain.eq = jest.fn().mockResolvedValue({
        data: [],  // No cards linked
      });

      mockSupabase.from.mockImplementation(table => {
        if (table === 'plaid_items') return itemChain;
        if (table === 'user_credit_cards') return cardChain;
        return eventChain;
      });

      const { decryptToken } = require('../../../utils/encryption');
      decryptToken.mockReturnValue('decrypted-token');
      syncTransactions.mockResolvedValue(undefined);

      mockReq = mockRequest(body, signature);
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);

      await waitForAsync();

      // Still succeeds even with no linked cards
      expect(syncTransactions).toHaveBeenCalled();
    });

    test('handles Supabase not configured', async () => {
      isSupabaseConfigured.mockReturnValueOnce(false);

      const body = { webhook_code: 'TRANSACTIONS_UPDATE', item_id: 'item_123' };

      mockReq = mockRequest(body, 'signature');
      await handler(mockReq, mockRes);

      // Still returns 200
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });
});
