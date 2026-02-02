/**
 * Plaid API Route E: Get Accounts
 * GET /api/plaid/accounts?user_id=<uuid>
 *
 * Returns user's linked Plaid items, accounts, and latest liability data.
 * Used by UI to show connected banks and current card state.
 *
 * Query:    ?user_id=<uuid>
 * Response: { items: [{plaid_item_id, institution_name, status, accounts}] }
 */

import { getSupabase, isSupabaseConfigured } from '../../../config/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({ error: 'Missing required query param: user_id' });
    }

    if (!isSupabaseConfigured()) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    const supabase = getSupabase();

    // Fetch all plaid_items for this user
    const { data: items, error: itemsError } = await supabase
      .from('plaid_items')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });

    if (itemsError) {
      throw new Error(`Failed to fetch plaid_items: ${itemsError.message}`);
    }

    const responseItems = [];

    // For each item, fetch its accounts with liability data
    for (const item of items || []) {
      const { data: accounts, error: accountsError } = await supabase
        .from('plaid_accounts')
        .select('*')
        .eq('plaid_item_id', item.id)
        .order('name', { ascending: true });

      if (accountsError) {
        console.error(`Failed to fetch accounts for item ${item.id}:`, accountsError);
        continue;
      }

      const responseAccounts = [];

      for (const account of accounts || []) {
        // Fetch liability data if this is a credit account
        let liability = null;
        if (account.account_subtype === 'credit_card') {
          const { data: liabilityData } = await supabase
            .from('plaid_liabilities')
            .select('purchase_apr, minimum_payment_amount, last_statement_date, next_payment_due_date')
            .eq('plaid_item_id', item.id)
            .eq('plaid_account_id', account.plaid_account_id)
            .single();

          liability = liabilityData;
        }

        responseAccounts.push({
          plaid_account_id: account.plaid_account_id,
          name: account.name,
          mask: account.mask,
          account_type: account.account_type,
          account_subtype: account.account_subtype,
          vitta_card_id: account.vitta_card_id,
          current_balance: account.current_balance,
          credit_limit: account.credit_limit,
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

      responseItems.push({
        plaid_item_id: item.id,
        institution_name: item.institution_name,
        status: item.status,
        accounts: responseAccounts,
      });
    }

    return res.status(200).json({ items: responseItems });
  } catch (error) {
    console.error('[plaid/accounts] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
}
