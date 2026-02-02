/**
 * Plaid API Route F: Refresh
 * POST /api/plaid/refresh
 *
 * Manually triggers a full refresh of transactions + liabilities for all user's active items.
 * Same async processing as the webhook handler, but user-initiated (e.g., "Refresh" button).
 *
 * Returns immediately with refreshing=true and item_count.
 * Actual sync happens asynchronously in the background.
 *
 * Request:  { user_id: string }
 * Response: { refreshing: true, item_count: number }
 */

import { getSupabase, isSupabaseConfigured } from '../../../config/supabase';
import { decryptToken } from '../../../utils/encryption';
import { syncTransactions } from '../../../services/plaid/syncService';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'Missing required field: user_id' });
    }

    if (!isSupabaseConfigured()) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    const supabase = getSupabase();

    // Fetch all active plaid_items for this user
    const { data: items, error: itemsError } = await supabase
      .from('plaid_items')
      .select('*')
      .eq('user_id', user_id)
      .eq('status', 'active');

    if (itemsError) {
      throw new Error(`Failed to fetch plaid_items: ${itemsError.message}`);
    }

    const itemCount = (items || []).length;

    // Return immediately (200 response)
    res.status(200).json({ refreshing: true, item_count: itemCount });

    // ────────────────────────────────────────────────────────────────────────
    // [Async] Trigger refresh for each item (fire and forget)
    // ────────────────────────────────────────────────────────────────────────
    setImmediate(async () => {
      for (const item of items || []) {
        try {
          // Decrypt access token
          let accessToken;
          try {
            accessToken = decryptToken(item.access_token_enc);
          } catch (decryptError) {
            console.error(
              `[plaid/refresh] Failed to decrypt token for item ${item.id}:`,
              decryptError.message
            );
            continue;
          }

          // Run sync with current cursor
          await syncTransactions({
            accessToken,
            itemId: item.id,
            cursor: item.transactions_cursor || '',
            supabase,
          });

          console.log(`[plaid/refresh] Completed sync for item ${item.id}`);
        } catch (syncError) {
          console.error(`[plaid/refresh] Sync failed for item ${item.id}:`, syncError.message);
          // Continue to next item — don't bail
        }
      }

      console.log(`[plaid/refresh] Background refresh completed for ${itemCount} items`);
    });
  } catch (error) {
    console.error('[plaid/refresh] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
}
