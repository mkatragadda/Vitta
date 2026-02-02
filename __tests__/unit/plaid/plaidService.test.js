/**
 * Tests for Plaid Service
 * Unified query layer for transactions, liabilities, and accounts
 */

import {
  getTransactions,
  getSpendingSummary,
  getLiabilityByCardId,
} from '../../../services/plaid/plaidService';

jest.mock('../../../config/supabase', () => ({
  getSupabase: jest.fn(),
  isSupabaseConfigured: jest.fn(() => true),
}));

const { getSupabase, isSupabaseConfigured } = require('../../../config/supabase');

describe('Plaid Service', () => {
  let mockSupabase;

  function createChainableMock() {
    const chain = {};
    ['select', 'eq', 'not', 'or', 'gte', 'lte', 'ilike', 'order', 'single', 'in'].forEach(
      method => {
        chain[method] = jest.fn().mockReturnValue(chain);
      }
    );
    return chain;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = {
      from: jest.fn(),
    };
    getSupabase.mockReturnValue(mockSupabase);
  });

  // ════════════════════════════════════════════════════════════════════════════
  // GROUP 1: getTransactions
  // ════════════════════════════════════════════════════════════════════════════

  describe('getTransactions', () => {
    test('returns empty array if Supabase not configured', async () => {
      isSupabaseConfigured.mockReturnValueOnce(false);

      const result = await getTransactions('user-123');
      expect(result).toEqual([]);
    });

    test('fetches transactions for user', async () => {
      const chain = createChainableMock();
      const txns = [
        { id: 'txn-1', amount: 100, category: 'groceries' },
        { id: 'txn-2', amount: 50, category: 'dining' },
      ];
      chain.order = jest.fn().mockResolvedValue({ data: txns, error: null });

      mockSupabase.from.mockReturnValue(chain);

      const result = await getTransactions('user-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('transactions');
      expect(chain.select).toHaveBeenCalledWith('*');
      expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(result).toEqual(txns);
    });

    test('filters by linked accounts by default', async () => {
      const chain = createChainableMock();
      chain.not = jest.fn().mockReturnValue(chain);
      chain.or = jest.fn().mockReturnValue(chain);
      chain.order = jest.fn().mockResolvedValue({ data: [], error: null });

      mockSupabase.from.mockReturnValue(chain);

      await getTransactions('user-123');

      expect(chain.not).toHaveBeenCalledWith('vitta_card_id', 'is', null);
      expect(chain.or).toHaveBeenCalledWith('source.eq.manual');
    });

    test('applies date range filter', async () => {
      const chain = createChainableMock();
      chain.gte = jest.fn().mockReturnValue(chain);
      chain.lte = jest.fn().mockReturnValue(chain);
      chain.order = jest.fn().mockResolvedValue({ data: [], error: null });

      mockSupabase.from.mockReturnValue(chain);

      await getTransactions('user-123', {
        dateRange: { start: '2025-02-01', end: '2025-02-28' },
      });

      expect(chain.gte).toHaveBeenCalledWith('transaction_date', '2025-02-01');
      expect(chain.lte).toHaveBeenCalledWith('transaction_date', '2025-02-28');
    });

    test('applies category filter', async () => {
      const chain = createChainableMock();
      chain.order = jest.fn().mockResolvedValue({ data: [], error: null });

      mockSupabase.from.mockReturnValue(chain);

      await getTransactions('user-123', { category: 'groceries' });

      // Find the eq call for category (not user_id)
      const calls = chain.eq.mock.calls;
      expect(calls.some(call => call[0] === 'category' && call[1] === 'groceries')).toBe(true);
    });

    test('applies merchant name filter (case-insensitive)', async () => {
      const chain = createChainableMock();
      chain.ilike = jest.fn().mockReturnValue(chain);
      chain.order = jest.fn().mockResolvedValue({ data: [], error: null });

      mockSupabase.from.mockReturnValue(chain);

      await getTransactions('user-123', { merchantName: 'Amazon' });

      expect(chain.ilike).toHaveBeenCalledWith('merchant_name', '%Amazon%');
    });

    test('applies card ID filter', async () => {
      const chain = createChainableMock();
      chain.order = jest.fn().mockResolvedValue({ data: [], error: null });

      mockSupabase.from.mockReturnValue(chain);

      await getTransactions('user-123', { cardId: 'card-456' });

      const calls = chain.eq.mock.calls;
      expect(calls.some(call => call[0] === 'vitta_card_id' && call[1] === 'card-456')).toBe(true);
    });

    test('applies pending filter', async () => {
      const chain = createChainableMock();
      chain.order = jest.fn().mockResolvedValue({ data: [], error: null });

      mockSupabase.from.mockReturnValue(chain);

      await getTransactions('user-123', { pending: true });

      const calls = chain.eq.mock.calls;
      expect(calls.some(call => call[0] === 'is_pending' && call[1] === true)).toBe(true);
    });

    test('orders by transaction_date descending', async () => {
      const chain = createChainableMock();
      chain.order = jest.fn().mockResolvedValue({ data: [], error: null });

      mockSupabase.from.mockReturnValue(chain);

      await getTransactions('user-123');

      expect(chain.order).toHaveBeenCalledWith('transaction_date', { ascending: false });
    });

    test('includes unlinked accounts when specified', async () => {
      const chain = createChainableMock();
      chain.not = jest.fn();
      chain.or = jest.fn();
      chain.order = jest.fn().mockResolvedValue({ data: [], error: null });

      mockSupabase.from.mockReturnValue(chain);

      await getTransactions('user-123', { includeUnlinkedAccounts: true });

      // not() and or() should NOT be called
      expect(chain.not).not.toHaveBeenCalled();
      expect(chain.or).not.toHaveBeenCalled();
    });

    test('returns empty array on database error', async () => {
      const chain = createChainableMock();
      chain.order = jest
        .fn()
        .mockResolvedValue({ data: null, error: { message: 'DB error' } });

      mockSupabase.from.mockReturnValue(chain);

      const result = await getTransactions('user-123');
      expect(result).toEqual([]);
    });

    test('returns empty array on exception', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Connection failed');
      });

      const result = await getTransactions('user-123');
      expect(result).toEqual([]);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // GROUP 2: getSpendingSummary
  // ════════════════════════════════════════════════════════════════════════════

  describe('getSpendingSummary', () => {
    test('returns empty summary if Supabase not configured', async () => {
      isSupabaseConfigured.mockReturnValueOnce(false);

      const result = await getSpendingSummary('user-123', 'this_month');
      expect(result).toEqual({
        total: 0,
        byCategory: {},
        byCard: {},
        transactionCount: 0,
      });
    });

    test('calculates spending summary from transactions', async () => {
      const chain = createChainableMock();
      const txns = [
        { id: 'txn-1', amount: 100, category: 'groceries', vitta_card_id: 'card-1' },
        { id: 'txn-2', amount: 50, category: 'groceries', vitta_card_id: 'card-1' },
        { id: 'txn-3', amount: 75, category: 'dining', vitta_card_id: 'card-2' },
      ];
      chain.order = jest.fn().mockResolvedValue({ data: txns, error: null });

      mockSupabase.from.mockReturnValue(chain);

      const result = await getSpendingSummary('user-123', 'this_month');

      expect(result.total).toBe(225);
      expect(result.byCategory.groceries).toBe(150);
      expect(result.byCategory.dining).toBe(75);
      expect(result.byCard['card-1']).toBe(150);
      expect(result.byCard['card-2']).toBe(75);
      expect(result.transactionCount).toBe(3);
    });

    test('supports "today" period', async () => {
      const chain = createChainableMock();
      chain.order = jest.fn().mockResolvedValue({ data: [], error: null });

      mockSupabase.from.mockReturnValue(chain);

      await getSpendingSummary('user-123', 'today');

      // Should have called with date range
      expect(chain.gte).toHaveBeenCalled();
    });

    test('supports "this_week" period', async () => {
      const chain = createChainableMock();
      chain.order = jest.fn().mockResolvedValue({ data: [], error: null });

      mockSupabase.from.mockReturnValue(chain);

      await getSpendingSummary('user-123', 'this_week');

      expect(chain.gte).toHaveBeenCalled();
    });

    test('supports "this_month" period', async () => {
      const chain = createChainableMock();
      chain.order = jest.fn().mockResolvedValue({ data: [], error: null });

      mockSupabase.from.mockReturnValue(chain);

      await getSpendingSummary('user-123', 'this_month');

      expect(chain.gte).toHaveBeenCalled();
    });

    test('supports "last_month" period', async () => {
      const chain = createChainableMock();
      chain.order = jest.fn().mockResolvedValue({ data: [], error: null });

      mockSupabase.from.mockReturnValue(chain);

      const result = await getSpendingSummary('user-123', 'last_month');

      expect(result).toBeDefined();
    });

    test('returns default summary on error', async () => {
      const chain = createChainableMock();
      chain.order = jest
        .fn()
        .mockResolvedValue({ data: null, error: { message: 'DB error' } });

      mockSupabase.from.mockReturnValue(chain);

      const result = await getSpendingSummary('user-123', 'this_month');
      expect(result).toEqual({
        total: 0,
        byCategory: {},
        byCard: {},
        transactionCount: 0,
      });
    });

    test('returns default summary for unknown period', async () => {
      const result = await getSpendingSummary('user-123', 'unknown_period');
      expect(result).toEqual({
        total: 0,
        byCategory: {},
        byCard: {},
        transactionCount: 0,
      });
    });

    test('includes manual transactions in spending', async () => {
      const chain = createChainableMock();
      const txns = [
        { id: 'txn-1', amount: 50, category: 'dining', vitta_card_id: 'card-1' },
        { id: 'txn-2', amount: 25, category: 'dining', vitta_card_id: null }, // Manual
      ];
      chain.order = jest.fn().mockResolvedValue({ data: txns, error: null });

      mockSupabase.from.mockReturnValue(chain);

      const result = await getSpendingSummary('user-123', 'this_month');
      expect(result.total).toBe(75);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // GROUP 3: getLiabilityByCardId
  // ════════════════════════════════════════════════════════════════════════════

  describe('getLiabilityByCardId', () => {
    test('returns null if Supabase not configured', async () => {
      isSupabaseConfigured.mockReturnValueOnce(false);

      const result = await getLiabilityByCardId('card-123');
      expect(result).toBeNull();
    });

    test('returns null if card not found', async () => {
      const chain = createChainableMock();
      chain.single = jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } });

      mockSupabase.from.mockReturnValue(chain);

      const result = await getLiabilityByCardId('card-nonexistent');
      expect(result).toBeNull();
    });

    test('returns null if plaid account not found', async () => {
      const chain1 = createChainableMock();
      chain1.single = jest.fn().mockResolvedValue({
        data: { id: 'card-123' },
        error: null,
      });

      const chain2 = createChainableMock();
      chain2.single = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      mockSupabase.from
        .mockReturnValueOnce(chain1)
        .mockReturnValueOnce(chain2);

      const result = await getLiabilityByCardId('card-123');
      expect(result).toBeNull();
    });

    test('returns liability data for linked card', async () => {
      const chain1 = createChainableMock();
      chain1.single = jest.fn().mockResolvedValue({
        data: { id: 'card-123' },
        error: null,
      });

      const chain2 = createChainableMock();
      chain2.single = jest.fn().mockResolvedValue({
        data: {
          plaid_item_id: 'item-123',
          plaid_account_id: 'account-456',
        },
        error: null,
      });

      const chain3 = createChainableMock();
      chain3.single = jest.fn().mockResolvedValue({
        data: {
          purchase_apr: 18.99,
          cash_advance_apr: 29.99,
          minimum_payment_amount: 50,
          last_statement_date: '2025-02-01',
          next_payment_due_date: '2025-03-01',
        },
        error: null,
      });

      mockSupabase.from
        .mockReturnValueOnce(chain1)
        .mockReturnValueOnce(chain2)
        .mockReturnValueOnce(chain3);

      const result = await getLiabilityByCardId('card-123');

      expect(result).not.toBeNull();
      expect(result.purchase_apr).toBe(18.99);
      expect(result.cash_advance_apr).toBe(29.99);
    });

    test('returns null if no liability data exists', async () => {
      const chain1 = createChainableMock();
      chain1.single = jest.fn().mockResolvedValue({
        data: { id: 'card-123' },
        error: null,
      });

      const chain2 = createChainableMock();
      chain2.single = jest.fn().mockResolvedValue({
        data: {
          plaid_item_id: 'item-123',
          plaid_account_id: 'account-456',
        },
        error: null,
      });

      const chain3 = createChainableMock();
      chain3.single = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      mockSupabase.from
        .mockReturnValueOnce(chain1)
        .mockReturnValueOnce(chain2)
        .mockReturnValueOnce(chain3);

      const result = await getLiabilityByCardId('card-123');
      expect(result).toBeNull();
    });

    test('returns null on exception', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Connection failed');
      });

      const result = await getLiabilityByCardId('card-123');
      expect(result).toBeNull();
    });

    test('queries correct tables in correct order', async () => {
      const chain1 = createChainableMock();
      chain1.single = jest.fn().mockResolvedValue({
        data: { id: 'card-123' },
        error: null,
      });

      const chain2 = createChainableMock();
      chain2.single = jest.fn().mockResolvedValue({
        data: {
          plaid_item_id: 'item-123',
          plaid_account_id: 'account-456',
        },
        error: null,
      });

      const chain3 = createChainableMock();
      chain3.single = jest.fn().mockResolvedValue({
        data: { purchase_apr: 18.99 },
        error: null,
      });

      mockSupabase.from
        .mockReturnValueOnce(chain1)
        .mockReturnValueOnce(chain2)
        .mockReturnValueOnce(chain3);

      await getLiabilityByCardId('card-123');

      // Should query user_credit_cards first
      expect(mockSupabase.from).toHaveBeenNthCalledWith(1, 'user_credit_cards');
      // Then plaid_accounts
      expect(mockSupabase.from).toHaveBeenNthCalledWith(2, 'plaid_accounts');
      // Then plaid_liabilities
      expect(mockSupabase.from).toHaveBeenNthCalledWith(3, 'plaid_liabilities');
    });
  });
});
