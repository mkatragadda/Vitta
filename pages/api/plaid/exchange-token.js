/**
 * Plaid API Route B: Exchange Token
 * POST /api/plaid/exchange-token
 *
 * Exchanges a one-time public_token for a permanent access_token.
 * Encrypts the token immediately. Fetches accounts and liabilities in parallel.
 * Persists everything to the database. Triggers async transaction sync.
 *
 * CRITICAL: access_token is NEVER returned in the response.
 *
 * Request:  { public_token: string, user_id: string }
 * Response: { plaid_item_id, accounts[] }
 */

import { getSupabase, isSupabaseConfigured } from '../../../config/supabase';
import { encryptToken } from '../../../utils/encryption';
import { plaidPost } from '../../../services/plaid/plaidApi';
import { syncTransactions } from '../../../services/plaid/syncService';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { public_token, user_id } = req.body;

    if (!public_token || !user_id) {
      return res.status(400).json({ error: 'Missing required fields: public_token, user_id' });
    }

    if (!isSupabaseConfigured()) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      // 1. Exchange public_token for access_token
      console.log('[plaid/exchange-token] Exchanging public_token...');
      console.log('[plaid/exchange-token] Public token received:', public_token ? public_token.substring(0, 20) + '...' : 'MISSING');

      const exchangeResult = await plaidPost(
        '/item/public_token/exchange',
        { public_token },
        { signal: controller.signal }
      );

      const { access_token, item_id } = exchangeResult;
      console.log('[plaid/exchange-token] Exchange successful, item_id:', item_id);

      // 2. Encrypt access_token immediately
      const encryptedToken = encryptToken(access_token);

      // 3. Fetch accounts (required) and liabilities (optional) in parallel
      const accountsResult = await plaidPost('/accounts/get', { access_token }, { signal: controller.signal });
      const accounts = accountsResult.accounts || [];

      // Try to fetch liabilities, but don't fail if not available
      let creditLiabilities = [];
      try {
        const liabilitiesResult = await plaidPost('/liabilities/get', { access_token }, { signal: controller.signal });
        const liabilities = liabilitiesResult.liabilities || {};
        creditLiabilities = liabilities.credit || [];
      } catch (liabilityError) {
        // Liabilities might not be available for this bank/user
        console.log('[plaid/exchange-token] Liabilities not available:', liabilityError.message);
        // Continue without liabilities data
      }

      clearTimeout(timeoutId);

      // 4. Prepare database records
      const supabase = getSupabase();

      // Create a map of liabilities by account_id for easy lookup
      const liabilityByAccountId = {};
      for (const liability of creditLiabilities) {
        liabilityByAccountId[liability.account_id] = liability;
      }

      // ────────────────────────────────────────────────────────────────────────
      // 5. Check if this bank is already linked (prevent duplicate links)
      // ────────────────────────────────────────────────────────────────────────
      const { data: existingItem } = await supabase
        .from('plaid_items')
        .select('id, institution_name')
        .eq('user_id', user_id)
        .eq('plaid_item_id', item_id)
        .single();

      if (existingItem) {
        // Bank already linked. Guide user to add more accounts instead.
        return res.status(409).json({
          error: 'Bank already linked',
          message: `${existingItem.institution_name} is already connected to your Vitta account.`,
          suggestion: 'Use "Add More Accounts" to add additional accounts from this bank.',
          plaid_item_id: existingItem.id,
        });
      }

      // ────────────────────────────────────────────────────────────────────────
      // 6. Insert plaid_items (new bank link)
      // ────────────────────────────────────────────────────────────────────────
      const { data: insertedItem, error: itemError } = await supabase
        .from('plaid_items')
        .insert([
          {
            user_id,
            plaid_item_id: item_id,
            access_token_enc: encryptedToken,
            institution_id: accountsResult.institution?.institution_id || null,
            institution_name: accountsResult.institution?.name || null,
            products: ['auth'],
            status: 'active',
            transactions_cursor: '', // Empty = full historical sync on first call
          },
        ])
        .select()
        .single();

      if (itemError) {
        throw new Error(`Failed to insert plaid_item: ${itemError.message}`);
      }

      const dbItemId = insertedItem.id;

      // 6. Insert plaid_accounts and plaid_liabilities
      for (const account of accounts) {
        const { error: accountError } = await supabase
          .from('plaid_accounts')
          .insert([
            {
              plaid_item_id: dbItemId,
              plaid_account_id: account.account_id,
              mask: account.mask || null,
              name: account.name,
              official_name: account.official_name || null,
              account_type: account.subtype || account.type, // Use subtype if available, else type
              account_subtype: account.subtype || null,
              current_balance: account.balances?.current || 0,
              available_balance: account.balances?.available || null,
              credit_limit: account.balances?.limit || null,
              is_active: true,
            },
          ]);

        if (accountError) {
          throw new Error(`Failed to insert plaid_account: ${accountError.message}`);
        }

        // Insert liability data if this is a credit account with liability info
        if (account.subtype === 'credit_card' && liabilityByAccountId[account.account_id]) {
          const liability = liabilityByAccountId[account.account_id];

          // Extract scalar fields
          const aprList = liability.aprs || [];
          const purchaseApr = aprList.find(a => a.apr_type === 'purchase')?.apr_percentage || null;
          const cashAdvanceApr = aprList.find(a => a.apr_type === 'cash_advance')?.apr_percentage || null;
          const balanceTransferApr = aprList.find(
            a => a.apr_type === 'balance_transfer'
          )?.apr_percentage || null;

          const { error: liabilityError } = await supabase
            .from('plaid_liabilities')
            .insert([
              {
                plaid_item_id: dbItemId,
                plaid_account_id: account.account_id,
                purchase_apr: purchaseApr,
                cash_advance_apr: cashAdvanceApr,
                balance_transfer_apr: balanceTransferApr,
                minimum_payment_amount: liability.minimum_payment_amount || null,
                last_payment_amount: liability.last_payment_amount || null,
                last_payment_date: liability.last_payment_date || null,
                last_statement_balance: liability.last_statement_balance || null,
                last_statement_date: liability.last_statement_date || null,
                next_payment_due_date: liability.next_payment_due_date || null,
                apr_list: aprList, // Full APR breakdown for payment optimizer
                raw_liability: liability, // Full raw response for audit
              },
            ]);

          if (liabilityError) {
            throw new Error(`Failed to insert plaid_liability: ${liabilityError.message}`);
          }
        }
      }

      // 7. Trigger async transaction sync (fire and forget)
      // Do NOT await this — return the response immediately
      setImmediate(async () => {
        try {
          await syncTransactions({
            accessToken: access_token,
            itemId: dbItemId,
            cursor: '',
            supabase,
          });
          console.log(`[plaid/exchange-token] Initial sync completed for item ${dbItemId}`);
        } catch (syncError) {
          console.error(`[plaid/exchange-token] Initial sync failed: ${syncError.message}`);
          // Don't throw — this is async background work
        }
      });

      // 8. Build response (merge liability data into accounts)
      const responseAccounts = accounts.map(account => ({
        plaid_account_id: account.account_id,
        name: account.name,
        mask: account.mask,
        account_type: account.type,
        account_subtype: account.subtype,
        current_balance: account.balances?.current || 0,
        credit_limit: account.balances?.limit || null,
        liability: liabilityByAccountId[account.account_id] || null,
      }));

      return res.status(200).json({
        plaid_item_id: dbItemId,
        accounts: responseAccounts,
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError.name === 'AbortError') {
        return res.status(504).json({ error: 'Request timeout' });
      }

      if (fetchError.plaidError) {
        return res.status(fetchError.statusCode || 400).json({
          error: 'Plaid API error',
          details: fetchError.plaidError,
        });
      }

      throw fetchError;
    }
  } catch (error) {
    console.error('[plaid/exchange-token] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
}
