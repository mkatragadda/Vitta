/**
 * Plaid Service
 *
 * Unified query layer for Plaid data (transactions, liabilities, accounts).
 * All database access for chat queries and UI features goes through this service.
 *
 * Functions:
 * - getTransactions(userId, filters) - Query transactions with optional filtering
 * - getSpendingSummary(userId, period) - Get spending breakdown by category/card
 * - getLiabilityByCardId(vittaCardId) - Fetch detailed APR breakdown for a card
 */

import { getSupabase, isSupabaseConfigured } from '../../config/supabase';

/**
 * Get transactions for a user with optional filtering
 *
 * Default behavior: Returns only transactions from linked accounts (vitta_card_id IS NOT NULL)
 * plus manually-added transactions. Filters out unlinked Plaid account transactions.
 *
 * @param {string} userId - User UUID
 * @param {Object} filters - Optional filters
 * @param {Object} filters.dateRange - { start: ISO date, end: ISO date }
 * @param {string} filters.category - Filter by category (e.g., 'groceries')
 * @param {string} filters.merchantName - Filter by merchant name (substring match)
 * @param {string} filters.cardId - Filter by vitta_card_id
 * @param {boolean} filters.pending - If true, only return pending transactions
 * @param {boolean} filters.includeUnlinkedAccounts - If true, include ALL Plaid transactions
 * @returns {Promise<Array>} Array of transaction objects
 *
 * @example
 * // Get all spending this month
 * const txns = await getTransactions(userId, {
 *   dateRange: { start: '2025-02-01', end: '2025-02-28' }
 * });
 *
 * // Get grocery spending
 * const groceries = await getTransactions(userId, { category: 'groceries' });
 *
 * // Get Amazon spending
 * const amazon = await getTransactions(userId, { merchantName: 'Amazon' });
 */
async function getTransactions(userId, filters = {}) {
  if (!isSupabaseConfigured()) {
    console.log('[plaidService] Supabase not configured, returning empty transactions');
    return [];
  }

  try {
    const supabase = getSupabase();
    let query = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId);

    // By default, ONLY show transactions for cards in user's wallet
    // (vitta_card_id IS NOT NULL means the account is linked to a user_credit_cards row)
    if (!filters.includeUnlinkedAccounts) {
      query = query
        .not('vitta_card_id', 'is', null) // Only linked accounts
        .or('source.eq.manual'); // Plus manually-added transactions
    }

    // Apply optional filters
    if (filters.dateRange) {
      query = query
        .gte('transaction_date', filters.dateRange.start)
        .lte('transaction_date', filters.dateRange.end);
    }

    if (filters.category) {
      query = query.eq('category', filters.category);
    }

    if (filters.merchantName) {
      query = query.ilike('merchant_name', `%${filters.merchantName}%`);
    }

    if (filters.cardId) {
      query = query.eq('vitta_card_id', filters.cardId);
    }

    if (filters.pending === true) {
      query = query.eq('is_pending', true);
    }

    const { data, error } = await query.order('transaction_date', { ascending: false });

    if (error) {
      console.error('[plaidService] Error fetching transactions:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[plaidService] Exception in getTransactions:', error);
    return [];
  }
}

/**
 * Get spending summary for a user during a specific period
 *
 * Returns total spending broken down by category and by card.
 * Only includes linked account transactions and manual entries.
 *
 * @param {string} userId - User UUID
 * @param {string} period - 'today' | 'this_week' | 'this_month' | 'last_month'
 * @returns {Promise<Object>} {
 *   total: number,
 *   byCategory: { [category]: number, ... },
 *   byCard: { [cardName]: number, ... },
 *   transactionCount: number
 * }
 *
 * @example
 * const summary = await getSpendingSummary(userId, 'this_month');
 * console.log(`Total: $${summary.total}`);
 * console.log(`Groceries: $${summary.byCategory.groceries}`);
 */
async function getSpendingSummary(userId, period) {
  if (!isSupabaseConfigured()) {
    return { total: 0, byCategory: {}, byCard: {}, transactionCount: 0 };
  }

  try {
    // Compute date range based on period
    const today = new Date();
    const start = new Date();

    switch (period) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'this_week':
        start.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
        start.setHours(0, 0, 0, 0);
        break;
      case 'this_month':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        break;
      case 'last_month':
        start.setMonth(start.getMonth() - 1);
        start.setDate(1);
        const nextMonth = new Date(start);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const dateRange = {
          start: start.toISOString().split('T')[0],
          end: new Date(nextMonth.getTime() - 1).toISOString().split('T')[0],
        };
        return await getSpendingSummaryForRange(userId, dateRange);
      default:
        throw new Error(`Unknown period: ${period}`);
    }

    const dateRange = {
      start: start.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0],
    };

    return await getSpendingSummaryForRange(userId, dateRange);
  } catch (error) {
    console.error('[plaidService] Error in getSpendingSummary:', error);
    return { total: 0, byCategory: {}, byCard: {}, transactionCount: 0 };
  }
}

/**
 * Helper: Get spending summary for a specific date range
 */
async function getSpendingSummaryForRange(userId, dateRange) {
  const transactions = await getTransactions(userId, {
    dateRange,
    includeUnlinkedAccounts: false,
  });

  const summary = {
    total: 0,
    byCategory: {},
    byCard: {},
    transactionCount: transactions.length,
  };

  for (const txn of transactions) {
    const amount = parseFloat(txn.amount) || 0;
    summary.total += amount;

    // By category
    const category = txn.category || 'default';
    summary.byCategory[category] = (summary.byCategory[category] || 0) + amount;

    // By card (need card name from join, using vitta_card_id as key for now)
    const cardKey = txn.vitta_card_id || 'manual';
    summary.byCard[cardKey] = (summary.byCard[cardKey] || 0) + amount;
  }

  return summary;
}

/**
 * Get detailed liability data for a specific credit card
 *
 * Fetches APR breakdown, minimum payment, statement dates, and other
 * liability details from the plaid_liabilities table.
 *
 * Returns null if the card has no Plaid liability data (e.g., manual entry).
 *
 * @param {string} vittaCardId - user_credit_cards.id (UUID)
 * @returns {Promise<Object|null>} Liability object with APR details, or null
 *
 * @example
 * const liability = await getLiabilityByCardId(cardId);
 * if (liability) {
 *   console.log(`Purchase APR: ${liability.purchase_apr}%`);
 *   console.log(`Cash Advance APR: ${liability.cash_advance_apr}%`);
 * }
 */
async function getLiabilityByCardId(vittaCardId) {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const supabase = getSupabase();

    // Join to get plaid_account_id from user_credit_cards
    const { data: card, error: cardError } = await supabase
      .from('user_credit_cards')
      .select('id')
      .eq('id', vittaCardId)
      .single();

    if (cardError || !card) {
      console.log(`[plaidService] Card not found: ${vittaCardId}`);
      return null;
    }

    // Now we need to find the plaid_account via plaid_accounts table
    // plaid_accounts.vitta_card_id = card.id
    const { data: account, error: accountError } = await supabase
      .from('plaid_accounts')
      .select('plaid_item_id, plaid_account_id')
      .eq('vitta_card_id', vittaCardId)
      .single();

    if (accountError || !account) {
      console.log(`[plaidService] Plaid account not found for card: ${vittaCardId}`);
      return null; // Card is not linked to Plaid
    }

    // Fetch liability data
    const { data: liability, error: liabilityError } = await supabase
      .from('plaid_liabilities')
      .select('*')
      .eq('plaid_item_id', account.plaid_item_id)
      .eq('plaid_account_id', account.plaid_account_id)
      .single();

    if (liabilityError) {
      console.log(`[plaidService] No liability data for card: ${vittaCardId}`);
      return null;
    }

    return liability || null;
  } catch (error) {
    console.error('[plaidService] Error in getLiabilityByCardId:', error);
    return null;
  }
}

module.exports = {
  getTransactions,
  getSpendingSummary,
  getLiabilityByCardId,
};
