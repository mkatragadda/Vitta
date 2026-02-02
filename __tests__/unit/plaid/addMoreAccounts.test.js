/**
 * Tests for Route G: Add More Accounts From Existing Bank Link
 * POST /api/plaid/add-more-accounts
 */

import handler from '../../../pages/api/plaid/add-more-accounts';

// Mock Supabase
jest.mock('../../../config/supabase', () => ({
  getSupabase: jest.fn(),
  isSupabaseConfigured: jest.fn(() => true),
}));

const { getSupabase } = require('../../../config/supabase');

describe('POST /api/plaid/add-more-accounts', () => {
  let mockReq, mockRes, mockSupabase;

  function mockRequest(body) {
    return { method: 'POST', body };
  }

  function mockResponse() {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    return res;
  }

  function createChainableMock() {
    const chain = {};
    ['select', 'eq', 'order', 'single'].forEach(method => {
      chain[method] = jest.fn().mockReturnValue(chain);
    });
    return chain;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = {
      from: jest.fn(),
    };
    getSupabase.mockReturnValue(mockSupabase);
  });

  describe('Method guard', () => {
    test('returns 405 for GET request', async () => {
      mockReq = { method: 'GET', body: {} };
      mockRes = mockResponse();
      await handler(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(405);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
    });
  });

  describe('Validation', () => {
    test('returns 400 if user_id is missing', async () => {
      mockReq = mockRequest({ plaid_item_id: 'item-123' });
      mockRes = mockResponse();
      await handler(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Missing required fields: user_id, plaid_item_id',
      });
    });

    test('returns 400 if plaid_item_id is missing', async () => {
      mockReq = mockRequest({ user_id: 'user-123' });
      mockRes = mockResponse();
      await handler(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    test('returns 500 if Supabase not configured', async () => {
      const { isSupabaseConfigured } = require('../../../config/supabase');
      isSupabaseConfigured.mockReturnValueOnce(false);
      mockReq = mockRequest({ user_id: 'user-123', plaid_item_id: 'item-123' });
      mockRes = mockResponse();
      await handler(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Supabase not configured' });
    });
  });

  describe('Core functionality', () => {
    test('returns 404 if plaid_item not found', async () => {
      const selectChain = createChainableMock();
      selectChain.single.mockResolvedValueOnce({ data: null, error: null });
      mockSupabase.from.mockReturnValueOnce(selectChain);

      mockReq = mockRequest({ user_id: 'user-123', plaid_item_id: 'item-123' });
      mockRes = mockResponse();
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Plaid item not found',
        message: 'This bank link does not exist or does not belong to you.',
      });
    });

    test('returns 404 if no accounts found', async () => {
      const selectChain1 = createChainableMock();
      selectChain1.single.mockResolvedValueOnce({
        data: { id: 'item-db-123', institution_name: 'Chase' },
        error: null,
      });

      const selectChain2 = createChainableMock();
      selectChain2.order.mockReturnValue(selectChain2);
      selectChain2.order.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      mockSupabase.from
        .mockReturnValueOnce(selectChain1)
        .mockReturnValueOnce(selectChain2);

      mockReq = mockRequest({ user_id: 'user-123', plaid_item_id: 'item-123' });
      mockRes = mockResponse();
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'No accounts found',
        message: 'This bank link has no accounts.',
      });
    });

    test('returns both already-added and available accounts', async () => {
      const selectChain1 = createChainableMock();
      selectChain1.single.mockResolvedValueOnce({
        data: { id: 'item-db-123', institution_name: 'Chase' },
        error: null,
      });

      const selectChain2 = createChainableMock();
      selectChain2.order.mockReturnValue(selectChain2);
      selectChain2.order.mockResolvedValueOnce({
        data: [
          {
            plaid_account_id: 'account-1',
            name: 'Chase Sapphire Credit',
            mask: '4582',
            account_type: 'credit',
            account_subtype: 'credit_card',
            current_balance: 1500,
            credit_limit: 5000,
            vitta_card_id: 'card-123', // Already added
          },
          {
            plaid_account_id: 'account-2',
            name: 'Chase Freedom Unlimited',
            mask: '7890',
            account_type: 'credit',
            account_subtype: 'credit_card',
            current_balance: 2000,
            credit_limit: 10000,
            vitta_card_id: null, // Available to add
          },
          {
            plaid_account_id: 'account-3',
            name: 'Chase Checking',
            mask: '1234',
            account_type: 'depository',
            account_subtype: 'checking',
            current_balance: 5000,
            credit_limit: null,
            vitta_card_id: null, // Available to add
          },
        ],
        error: null,
      });

      const selectChain3 = createChainableMock();
      selectChain3.single.mockResolvedValueOnce({
        data: {
          purchase_apr: 18.99,
          minimum_payment_amount: 60,
          last_statement_date: '2025-01-15',
          next_payment_due_date: '2025-02-10',
        },
        error: null,
      });

      const selectChain4 = createChainableMock();
      selectChain4.single.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      mockSupabase.from
        .mockReturnValueOnce(selectChain1)
        .mockReturnValueOnce(selectChain2)
        .mockReturnValueOnce(selectChain3)
        .mockReturnValueOnce(selectChain4);

      mockReq = mockRequest({ user_id: 'user-123', plaid_item_id: 'item-123' });
      mockRes = mockResponse();
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const response = mockRes.json.mock.calls[0][0];

      // Verify structure
      expect(response.plaid_item_id).toBe('item-123');
      expect(response.institution_name).toBe('Chase');

      // Verify already-added accounts
      expect(response.already_added_accounts).toHaveLength(1);
      expect(response.already_added_accounts[0]).toEqual({
        plaid_account_id: 'account-1',
        name: 'Chase Sapphire Credit',
        mask: '4582',
        account_type: 'credit',
        account_subtype: 'credit_card',
        current_balance: 1500,
        credit_limit: 5000,
        vitta_card_id: 'card-123',
      });

      // Verify available accounts (with liability data for credit accounts)
      expect(response.available_accounts).toHaveLength(2);
      expect(response.available_accounts[0]).toEqual({
        plaid_account_id: 'account-2',
        name: 'Chase Freedom Unlimited',
        mask: '7890',
        account_type: 'credit',
        account_subtype: 'credit_card',
        current_balance: 2000,
        credit_limit: 10000,
        liability: {
          purchase_apr: 18.99,
          minimum_payment: 60,
          last_statement_date: '2025-01-15',
          next_payment_due_date: '2025-02-10',
        },
      });

      // Depository account (no liability data)
      expect(response.available_accounts[1]).toEqual({
        plaid_account_id: 'account-3',
        name: 'Chase Checking',
        mask: '1234',
        account_type: 'depository',
        account_subtype: 'checking',
        current_balance: 5000,
        credit_limit: null,
        liability: null,
      });
    });

    test('accounts are sorted by name', async () => {
      const selectChain1 = createChainableMock();
      selectChain1.single.mockResolvedValueOnce({
        data: { id: 'item-db-123', institution_name: 'Chase' },
        error: null,
      });

      const selectChain2 = createChainableMock();
      selectChain2.order.mockReturnValue(selectChain2);

      mockSupabase.from
        .mockReturnValueOnce(selectChain1)
        .mockReturnValueOnce(selectChain2);

      mockReq = mockRequest({ user_id: 'user-123', plaid_item_id: 'item-123' });
      mockRes = mockResponse();
      await handler(mockReq, mockRes);

      // Verify that order() was called with correct parameters
      expect(selectChain2.order).toHaveBeenCalledWith('name', { ascending: true });
    });
  });

  describe('Error handling', () => {
    test('returns 500 with error message on database error', async () => {
      const selectChain1 = createChainableMock();
      selectChain1.single.mockResolvedValueOnce({
        data: { id: 'item-db-123', institution_name: 'Chase' },
        error: null,
      });

      const selectChain2 = createChainableMock();
      selectChain2.order.mockReturnValue(selectChain2);
      selectChain2.order.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database connection failed' },
      });

      mockSupabase.from
        .mockReturnValueOnce(selectChain1)
        .mockReturnValueOnce(selectChain2);

      mockReq = mockRequest({ user_id: 'user-123', plaid_item_id: 'item-123' });
      mockRes = mockResponse();
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json.mock.calls[0][0]).toMatchObject({
        error: 'Internal server error',
        message: expect.stringContaining('Database connection failed'),
      });
    });
  });

  describe('Edge cases', () => {
    test('handles mix of all account types', async () => {
      const selectChain1 = createChainableMock();
      selectChain1.single.mockResolvedValueOnce({
        data: { id: 'item-db-123', institution_name: 'Bank' },
        error: null,
      });

      const selectChain2 = createChainableMock();
      selectChain2.order.mockReturnValue(selectChain2);
      selectChain2.order.mockResolvedValueOnce({
        data: [
          {
            plaid_account_id: 'cc1',
            name: 'Credit Card 1',
            account_type: 'credit',
            account_subtype: 'credit_card',
            vitta_card_id: 'card-1', // Added
          },
          {
            plaid_account_id: 'cc2',
            name: 'Credit Card 2',
            account_type: 'credit',
            account_subtype: 'credit_card',
            vitta_card_id: null, // Available
          },
          {
            plaid_account_id: 'checking',
            name: 'Checking',
            account_type: 'depository',
            account_subtype: 'checking',
            vitta_card_id: null, // Available
          },
          {
            plaid_account_id: 'savings',
            name: 'Savings',
            account_type: 'depository',
            account_subtype: 'savings',
            vitta_card_id: null, // Available
          },
          {
            plaid_account_id: 'loan',
            name: 'Loan',
            account_type: 'loan',
            account_subtype: 'personal_loan',
            vitta_card_id: null, // Available
          },
        ],
        error: null,
      });

      // Mock liability fetches for the 2 available credit cards
      const selectChain3 = createChainableMock();
      selectChain3.single.mockResolvedValueOnce({
        data: { purchase_apr: 22.5, minimum_payment_amount: 75 },
        error: null,
      });

      const selectChain4 = createChainableMock();
      selectChain4.single.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      mockSupabase.from
        .mockReturnValueOnce(selectChain1)
        .mockReturnValueOnce(selectChain2)
        .mockReturnValueOnce(selectChain3)
        .mockReturnValueOnce(selectChain4);

      mockReq = mockRequest({ user_id: 'user-123', plaid_item_id: 'item-123' });
      mockRes = mockResponse();
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const response = mockRes.json.mock.calls[0][0];

      // 1 already added
      expect(response.already_added_accounts).toHaveLength(1);

      // 4 available (2 credit cards + 1 checking + 1 savings + 1 loan)
      expect(response.available_accounts).toHaveLength(4);
    });
  });
});
