/**
 * Plaid API Webhook Endpoint
 * POST /api/plaid/webhooks
 *
 * Receives webhooks from Plaid when:
 * - User makes a transaction (TRANSACTIONS_UPDATE)
 * - Transaction sync completes (TRANSACTIONS_READY)
 * - User needs to re-authenticate (ITEM_WEBHOOK_UPDATE_REQUIRED)
 * - Other events (logged but not processed)
 *
 * CRITICAL: Always returns 200 within 10 seconds to acknowledge receipt.
 * Processing happens asynchronously in background (fire-and-forget).
 */

import { getSupabase, isSupabaseConfigured } from '../../../config/supabase';
import { getRawBody } from '../../../utils/rawBody';
import { verifyWebhookSignature } from '../../../utils/webhookVerification';
import { decryptToken } from '../../../utils/encryption';
import { plaidPost } from '../../../services/plaid/plaidApi';
import { syncTransactions } from '../../../services/plaid/syncService';

// Disable Next.js built-in body parsing so we can read the raw body
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  try {
    // ────────────────────────────────────────────────────────────────────────
    // 1. Read raw body (required for signature verification)
    // ────────────────────────────────────────────────────────────────────────
    const rawBody = await getRawBody(req);
    let body;

    try {
      body = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('[plaid/webhooks] Failed to parse JSON body:', parseError);
      return res.status(200).json({});
    }

    // ────────────────────────────────────────────────────────────────────────
    // 2. Verify webhook signature
    // ────────────────────────────────────────────────────────────────────────
    const signatureHeader = req.headers['x-plaid-webhook-signature'];
    const secret = process.env.PLAID_WEBHOOK_SECRET;

    const verification = verifyWebhookSignature(rawBody, signatureHeader, secret);

    if (!verification.valid) {
      console.warn(
        '[plaid/webhooks] Invalid signature:',
        verification.reason,
        'Expected computed signature, got header:',
        signatureHeader
      );
    }

    // ────────────────────────────────────────────────────────────────────────
    // 3. Log webhook event immediately (before async processing)
    // ────────────────────────────────────────────────────────────────────────
    if (!isSupabaseConfigured()) {
      console.error('[plaid/webhooks] Supabase not configured, cannot log event');
      return res.status(200).json({});
    }

    const supabase = getSupabase();
    const { data: loggedEvent, error: logError } = await supabase
      .from('plaid_webhook_events')
      .insert([
        {
          plaid_item_id: body.item_id || null,
          event_type: body.webhook_code || null,
          webhook_type: body.webhook_type || null,
          error: body.error || null,
          payload: body,
          signature_valid: verification.valid,
          verification_state: verification.valid ? 'verified' : 'failed',
          processing_status: 'pending',
          received_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (logError) {
      console.error('[plaid/webhooks] Failed to log event:', logError);
      // Don't fail the request if logging fails — still return 200
    }

    const eventId = loggedEvent?.id;

    // ────────────────────────────────────────────────────────────────────────
    // 4. Return 200 immediately to Plaid
    // ────────────────────────────────────────────────────────────────────────
    // Plaid requires acknowledgment within 10 seconds or it retries.
    res.status(200).json({});

    // ────────────────────────────────────────────────────────────────────────
    // 5. [Async] Process webhook if signature is valid
    // ────────────────────────────────────────────────────────────────────────
    // Fire-and-forget: don't await this, don't block response
    if (verification.valid && body.webhook_code) {
      setImmediate(async () => {
        await processWebhookAsync(body, eventId, supabase);
      });
    } else if (!verification.valid && eventId) {
      // Mark invalid signature as failed
      await supabase
        .from('plaid_webhook_events')
        .update({
          processing_status: 'failed',
          processing_error: 'Invalid signature',
        })
        .eq('id', eventId);
    }
  } catch (error) {
    console.error('[plaid/webhooks] Error:', error);
    // Return 200 even on error — Plaid expects this
    res.status(200).json({});
  }
}

/**
 * Process webhook asynchronously
 * Routes to specific handler based on webhook_code
 */
async function processWebhookAsync(body, eventId, supabase) {
  try {
    const { webhook_code, item_id } = body;

    // Mark as processing
    if (eventId) {
      await supabase
        .from('plaid_webhook_events')
        .update({ processing_status: 'processing' })
        .eq('id', eventId);
    }

    // Route based on webhook code
    if (webhook_code === 'TRANSACTIONS_UPDATE' || webhook_code === 'TRANSACTIONS_READY') {
      await processTransactionsUpdate(item_id, supabase);
    } else if (webhook_code === 'ITEM_WEBHOOK_UPDATE_REQUIRED') {
      await processItemUpdateRequired(item_id, supabase);
    } else {
      // Log other webhook codes but don't process them
      console.log(`[plaid/webhooks] Unhandled webhook code: ${webhook_code}`);
    }

    // Mark as completed
    if (eventId) {
      await supabase
        .from('plaid_webhook_events')
        .update({
          processing_status: 'completed',
          processed_at: new Date().toISOString(),
        })
        .eq('id', eventId);
    }

    console.log(`[plaid/webhooks] Completed processing ${webhook_code}`);
  } catch (error) {
    console.error('[plaid/webhooks] Async processing failed:', error);

    // Mark as failed
    if (eventId) {
      await supabase
        .from('plaid_webhook_events')
        .update({
          processing_status: 'failed',
          processing_error: error.message,
        })
        .eq('id', eventId);
    }
  }
}

/**
 * Handle TRANSACTIONS_UPDATE / TRANSACTIONS_READY
 * Syncs transactions and liabilities
 */
async function processTransactionsUpdate(plaidItemId, supabase) {
  // 1. Look up plaid_items by plaid_item_id
  const { data: item, error: itemError } = await supabase
    .from('plaid_items')
    .select('id, user_id, access_token_enc, transactions_cursor')
    .eq('plaid_item_id', plaidItemId)
    .single();

  if (itemError || !item) {
    throw new Error(`Item not found: ${plaidItemId}`);
  }

  // 2. Decrypt access token
  let accessToken;
  try {
    accessToken = decryptToken(item.access_token_enc);
  } catch (decryptError) {
    throw new Error(`Failed to decrypt token for item ${item.id}: ${decryptError.message}`);
  }

  // 3. Sync transactions using syncService (handles cursor + pagination)
  await syncTransactions({
    accessToken,
    itemId: item.id,
    cursor: item.transactions_cursor || '',
    supabase,
  });

  // 4. Refresh liabilities
  let liabilitiesResult;
  try {
    liabilitiesResult = await plaidPost('/liabilities/get', { access_token: accessToken });
  } catch (error) {
    console.error(`[plaid/webhooks] Failed to fetch liabilities for item ${item.id}:`, error);
    // Don't fail the whole webhook if liabilities fetch fails
    liabilitiesResult = { liabilities: {} };
  }

  const creditLiabilities = liabilitiesResult.liabilities?.credit || [];

  // 5. Upsert plaid_liabilities
  for (const liability of creditLiabilities) {
    const aprList = liability.aprs || [];

    await supabase
      .from('plaid_liabilities')
      .upsert(
        {
          plaid_item_id: item.id,
          plaid_account_id: liability.account_id,
          purchase_apr:
            aprList.find(a => a.apr_type === 'purchase')?.apr_percentage || null,
          cash_advance_apr:
            aprList.find(a => a.apr_type === 'cash_advance')?.apr_percentage || null,
          balance_transfer_apr:
            aprList.find(a => a.apr_type === 'balance_transfer')?.apr_percentage ||
            null,
          minimum_payment_amount: liability.minimum_payment_amount || null,
          last_payment_amount: liability.last_payment_amount || null,
          last_payment_date: liability.last_payment_date || null,
          last_statement_balance: liability.last_statement_balance || null,
          last_statement_date: liability.last_statement_date || null,
          next_payment_due_date: liability.next_payment_due_date || null,
          apr_list: aprList,
          raw_liability: liability,
        },
        { onConflict: 'plaid_item_id,plaid_account_id' }
      );
  }

  // 6. Update user_credit_cards with new liability data
  const { data: creditCards } = await supabase
    .from('user_credit_cards')
    .select('id, plaid_account_id')
    .eq('user_id', item.user_id);

  for (const card of creditCards || []) {
    const liability = creditLiabilities.find(l => l.account_id === card.plaid_account_id);

    if (liability) {
      const purchaseApr = liability.aprs?.find(a => a.apr_type === 'purchase')
        ?.apr_percentage || 0;

      await supabase
        .from('user_credit_cards')
        .update({
          apr: purchaseApr,
          amount_to_pay: liability.minimum_payment_amount || 0,
        })
        .eq('id', card.id);
    }
  }

  console.log(`[plaid/webhooks] Synced transactions and liabilities for item ${item.id}`);
}

/**
 * Handle ITEM_WEBHOOK_UPDATE_REQUIRED
 * User needs to re-authenticate (password changed, consent expired, etc.)
 */
async function processItemUpdateRequired(plaidItemId, supabase) {
  // Mark item as needing re-authentication
  const { error } = await supabase
    .from('plaid_items')
    .update({ status: 'needs_update' })
    .eq('plaid_item_id', plaidItemId);

  if (error) {
    throw new Error(`Failed to update item status: ${error.message}`);
  }

  console.log(`[plaid/webhooks] Marked item as needs_update: ${plaidItemId}`);
}
