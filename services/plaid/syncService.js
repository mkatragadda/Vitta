/**
 * Plaid Transaction Sync Service
 *
 * Shared logic for cursor-based incremental transaction synchronization.
 * Called by:
 *   - Route B (exchangeToken): async initial sync after token exchange
 *   - Route F (refresh): manual refresh for all user's items
 *   - Phase 4 webhook handler: TRANSACTIONS_UPDATE webhook processing
 *
 * Uses Plaid's `/transactions/sync` endpoint (recommended over legacy `/transactions/get`).
 * Implements full upsert logic for added/modified transactions and deletion logic for removed.
 * Persists cursor after each batch for incremental syncing on next call.
 */

const { plaidPost } = require('./plaidApi');

/**
 * Sync all transactions for a Plaid item using cursor-based incremental sync.
 * Loops until has_more is false. Upserts added/modified transactions, deletes removed.
 * Updates transactions_cursor in plaid_items after each successful batch.
 *
 * Decrypted access token must be passed in — sync service never touches encrypted tokens.
 *
 * @param {Object} params
 * @param {string} params.accessToken - Decrypted Plaid access token
 * @param {string} params.itemId - plaid_items.id (DB UUID)
 * @param {string} params.cursor - Current transactions_cursor ('' = first sync for full history)
 * @param {Object} params.supabase - Initialized Supabase client
 * @param {AbortSignal} params.signal - Optional AbortSignal for timeouts (passed to plaidPost)
 * @returns {Promise<Object>} { cursor: final cursor, transactionCount: total upserted }
 * @throws {Error} If Plaid API fails or DB operations fail
 */
async function syncTransactions({
  accessToken,
  itemId,
  cursor,
  supabase,
  signal,
}) {
  if (!accessToken || !itemId || !supabase) {
    throw new Error('[syncService] Missing required parameters: accessToken, itemId, supabase');
  }

  let currentCursor = cursor || '';
  let hasMore = true;
  let totalTransactionsProcessed = 0;

  while (hasMore) {
    // ────────────────────────────────────────────────────────────────────────
    // Call Plaid /transactions/sync with current cursor
    // ────────────────────────────────────────────────────────────────────────
    const syncResult = await plaidPost(
      '/transactions/sync',
      {
        access_token: accessToken,
        cursor: currentCursor,
        count: 500, // Plaid batch size
      },
      { signal }
    );

    const { added = [], modified = [], removed = [], next_cursor, has_more } = syncResult;

    // ────────────────────────────────────────────────────────────────────────
    // Upsert added transactions (idempotent via ON CONFLICT on plaid_transaction_id)
    // ────────────────────────────────────────────────────────────────────────
    for (const txn of added) {
      await upsertTransaction(txn, itemId, supabase);
    }

    // ────────────────────────────────────────────────────────────────────────
    // Upsert modified transactions (same upsert logic as added)
    // ────────────────────────────────────────────────────────────────────────
    for (const txn of modified) {
      await upsertTransaction(txn, itemId, supabase);
    }

    // ────────────────────────────────────────────────────────────────────────
    // Delete removed transactions (pending txns that cleared, etc.)
    // ────────────────────────────────────────────────────────────────────────
    if (removed.length > 0) {
      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .in('plaid_transaction_id', removed);

      if (deleteError) {
        throw new Error(`[syncService] Failed to delete removed transactions: ${deleteError.message}`);
      }
    }

    totalTransactionsProcessed += added.length + modified.length;

    // ────────────────────────────────────────────────────────────────────────
    // Persist cursor after successful batch
    // ────────────────────────────────────────────────────────────────────────
    const { error: cursorError } = await supabase
      .from('plaid_items')
      .update({ transactions_cursor: next_cursor })
      .eq('id', itemId);

    if (cursorError) {
      throw new Error(`[syncService] Failed to update cursor: ${cursorError.message}`);
    }

    currentCursor = next_cursor;
    hasMore = has_more;
  }

  return {
    cursor: currentCursor,
    transactionCount: totalTransactionsProcessed,
  };
}

/**
 * Upsert a single transaction into the database.
 * Converts Plaid transaction format to Vitta schema.
 * Uses upsert with ON CONFLICT to handle idempotent inserts.
 *
 * Note: category and category_confidence are left null here. They are filled in
 * by Phase 5's categoryMapper service during post-processing.
 *
 * @param {Object} plaidTxn - Transaction object from Plaid /transactions/sync
 * @param {string} itemId - plaid_items.id (for context, though not stored in this row)
 * @param {Object} supabase - Supabase client
 */
async function upsertTransaction(plaidTxn, itemId, supabase) {
  const amount = Math.abs(plaidTxn.amount || 0);
  const amountSign = (plaidTxn.amount || 0) < 0 ? 'credit' : 'debit';
  const merchantName =
    (plaidTxn.merchant && plaidTxn.merchant.name) ||
    plaidTxn.name ||
    null;

  const row = {
    source: 'plaid',
    plaid_transaction_id: plaidTxn.transaction_id,
    plaid_account_id: plaidTxn.account_id,
    amount,
    amount_sign: amountSign,
    merchant_name: merchantName,
    category: null, // Phase 5 categoryMapper fills this
    category_confidence: null, // Phase 5
    transaction_date: plaidTxn.date,
    description: plaidTxn.name || null,
    location_city: (plaidTxn.location && plaidTxn.location.city) || null,
    location_state: (plaidTxn.location && plaidTxn.location.state) || null,
    location_country: (plaidTxn.location && plaidTxn.location.country) || 'US',
    is_pending: plaidTxn.pending || false,
  };

  const { error } = await supabase.from('transactions').upsert(
    [row],
    { onConflict: 'plaid_transaction_id', ignoreDuplicates: false } // ignoreDuplicates: false → update on conflict
  );

  if (error) {
    throw new Error(`[syncService] Failed to upsert transaction ${plaidTxn.transaction_id}: ${error.message}`);
  }
}

module.exports = { syncTransactions };
