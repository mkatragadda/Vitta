/**
 * Plaid API Route G: Add More Accounts From Existing Bank Link
 * POST /api/plaid/add-more-accounts
 *
 * User previously linked a bank and selected some accounts.
 * Now they want to add more accounts from the same bank.
 *
 * Returns both already-added and available accounts so UI can show the distinction.
 * Available accounts flow through the same confirm-accounts logic as initial link.
 *
 * Request:  { user_id: string, plaid_item_id: string }
 * Response: {
 *            plaid_item_id: string,
 *            already_added_accounts: [{plaid_account_id, name, vitta_card_id, ...}],
 *            available_accounts: [{plaid_account_id, name, ...}]
 *          }
 */

import { getSupabase, isSupabaseConfigured } from '../../../config/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user_id, plaid_item_id } = req.body;

    if (!user_id || !plaid_item_id) {
      return res.status(400).json({
        error: 'Missing required fields: user_id, plaid_item_id',
      });
    }

    if (!isSupabaseConfigured()) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    const supabase = getSupabase();

    // ────────────────────────────────────────────────────────────────────────
    // 1. Verify plaid_item exists and belongs to this user
    // ────────────────────────────────────────────────────────────────────────
    const { data: item, error: itemError } = await supabase
      .from('plaid_items')
      .select('*')
      .eq('id', plaid_item_id)
      .eq('user_id', user_id)
      .single();

    if (itemError || !item) {
      return res.status(404).json({
        error: 'Plaid item not found',
        message: 'This bank link does not exist or does not belong to you.',
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // 2. Fetch ALL accounts for this item (both already-added and available)
    // ────────────────────────────────────────────────────────────────────────
    const { data: allAccounts, error: accountsError } = await supabase
      .from('plaid_accounts')
      .select('*')
      .eq('plaid_item_id', plaid_item_id)
      .order('name', { ascending: true });

    if (accountsError) {
      throw new Error(`Failed to fetch plaid_accounts: ${accountsError.message}`);
    }

    if (!allAccounts || allAccounts.length === 0) {
      return res.status(404).json({
        error: 'No accounts found',
        message: 'This bank link has no accounts.',
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // 3. Separate into already-added and available
    // ────────────────────────────────────────────────────────────────────────
    const alreadyAdded = [];
    const available = [];

    for (const account of allAccounts) {
      const baseAccountData = {
        plaid_account_id: account.plaid_account_id,
        name: account.name,
        mask: account.mask,
        account_type: account.account_type,
        account_subtype: account.account_subtype,
        current_balance: account.current_balance,
        credit_limit: account.credit_limit,
      };

      if (account.vitta_card_id) {
        // Already added to wallet
        alreadyAdded.push({
          ...baseAccountData,
          vitta_card_id: account.vitta_card_id,
        });
      } else {
        // Available to add
        available.push(baseAccountData);
      }
    }

    // ────────────────────────────────────────────────────────────────────────
    // 4. For available accounts, fetch liability data (if credit account)
    // ────────────────────────────────────────────────────────────────────────
    const availableWithLiabilities = [];

    for (const account of available) {
      let liability = null;
      if (account.account_subtype === 'credit_card') {
        const { data: liabilityData } = await supabase
          .from('plaid_liabilities')
          .select('purchase_apr, minimum_payment_amount, last_statement_date, next_payment_due_date')
          .eq('plaid_item_id', plaid_item_id)
          .eq('plaid_account_id', account.plaid_account_id)
          .single();

        liability = liabilityData;
      }

      availableWithLiabilities.push({
        ...account,
        liability: liability
          ? {
              purchase_apr: liability.purchase_apr,
              minimum_payment: liability.minimum_payment_amount,
              last_statement_date: liability.last_statement_date,
              next_payment_due_date: liability.next_payment_due_date,
            }
          : null,
      });
    }

    return res.status(200).json({
      plaid_item_id,
      institution_name: item.institution_name,
      already_added_accounts: alreadyAdded,
      available_accounts: availableWithLiabilities,
    });
  } catch (error) {
    console.error('[plaid/add-more-accounts] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
}
