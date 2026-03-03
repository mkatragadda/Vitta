/**
 * POST /api/transfers/execute
 * Execute a pending transfer with Chimoney payout
 * Implements smart rate logic: improves → silent, worsens <1% → silent, worsens >1% → alert
 *
 * Flow:
 * 1. Fetch transfer record with plaid_account_id
 * 2. Get plaid_item and access_token from database
 * 3. Call Plaid /auth/get API to get account and routing numbers
 * 4. Call Chimoney with beneficiary details and account info
 */

import { createClient } from '@supabase/supabase-js';
import transferService from '../../../services/transfer/transferService';
import encryptionService from '../../../services/encryption/encryptionService';
import getChimoneyConfig from '../../../config/chimoney';
import { getAuthData } from '../../../services/plaid/plaidAuthService';
import { executeWithIdempotency, buildIdempotencyKey } from '../../../services/payment/idempotencyService';
import { decryptToken } from '../../../utils/encryption';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const chimoneyConfig = getChimoneyConfig();
const chimonyApiKey = chimoneyConfig.apiKey;
const encryptionKey = process.env.ENCRYPTION_KEY;

const db = createClient(supabaseUrl, supabaseAnonKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        error_code: 'MISSING_AUTH',
      });
    }

    const { transfer_id, rate_confirmation } = req.body;

    // Validate required fields
    if (!transfer_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        error_code: 'INVALID_REQUEST',
      });
    }

    // Fetch transfer
    const { data: transfer, error: transferError } = await db
      .from('transfers')
      .select(
        `*,
        beneficiaries(*),
        plaid_accounts(*)
      `
      )
      .eq('id', transfer_id)
      .eq('user_id', userId)
      .single();

    if (transferError || !transfer) {
      return res.status(404).json({
        success: false,
        error: 'Transfer not found',
        error_code: 'TRANSFER_NOT_FOUND',
      });
    }

    if (transfer.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Cannot execute transfer with status: ${transfer.status}`,
        error_code: 'INVALID_TRANSFER_STATUS',
      });
    }

    // Re-check current exchange rate
    const currentRate = await transferService.getExchangeRate(
      transfer.source_amount,
      transfer.source_currency,
      transfer.target_currency
    );

    if (!currentRate) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch current exchange rate',
        error_code: 'RATE_FETCH_FAILED',
      });
    }

    // Apply smart rate logic
    const rateDecision = transferService.handleRateChange(
      transfer.exchange_rate,
      currentRate.rate,
      transfer.source_amount
    );

    // Handle rate change decision
    if (
      rateDecision.action === 'ALERT_USER' &&
      rateDecision.requires_confirmation &&
      !rate_confirmation
    ) {
      // Rate worsened >1%, user confirmation needed
      return res.status(400).json({
        success: false,
        error: 'Exchange rate changed, user confirmation required',
        error_code: 'RATE_CHANGED',
        requires_confirmation: true,
        rate_decision: {
          original_rate: transfer.exchange_rate,
          current_rate: currentRate.rate,
          change_percent: rateDecision.change_percent,
          loss_amount: rateDecision.loss_amount,
          action: rateDecision.action,
          message: rateDecision.message,
        },
      });
    }

    // Fetch beneficiary with encrypted fields
    const { data: beneficiary } = await db
      .from('beneficiaries')
      .select('*')
      .eq('id', transfer.beneficiary_id)
      .single();

    if (!beneficiary) {
      return res.status(404).json({
        success: false,
        error: 'Beneficiary not found',
        error_code: 'BENEFICIARY_NOT_FOUND',
      });
    }

    // Decrypt sensitive beneficiary data
    let decryptedBeneficiary;
    try {
      if (beneficiary.payment_method === 'upi') {
        decryptedBeneficiary = {
          ...beneficiary,
          recipient_upi: encryptionService.decrypt(
            beneficiary.recipient_upi_encrypted,
            encryptionKey
          ),
        };
      } else if (beneficiary.payment_method === 'bank_account') {
        decryptedBeneficiary = {
          ...beneficiary,
          recipient_bank_account: encryptionService.decrypt(
            beneficiary.recipient_bank_account_encrypted,
            encryptionKey
          ),
        };
      }
    } catch (decryptError) {
      console.error('[execute] Decryption error:', decryptError);
      return res.status(500).json({
        success: false,
        error: 'Failed to decrypt beneficiary data',
        error_code: 'DECRYPTION_ERROR',
      });
    }

    // Calculate final amounts based on current rate
    const finalAmounts = transferService.calculateTransferAmounts(
      transfer.source_amount,
      currentRate.rate,
      0.5 // fee percentage
    );

    // ═════════════════════════════════════════════════════════════════════
    // STEP: Retrieve Plaid account details for source account
    // ═════════════════════════════════════════════════════════════════════
    console.log('[execute] Retrieving Plaid account details', {
      plaid_account_id: `${transfer.plaid_transfer_account_id.substring(0, 15)}...`,
    });

    let plaidAccountDetails;
    try {
      // Fetch plaid_item to get access_token
      // NOTE: Search by plaid_account_id (Plaid ID), not by database id
      console.log('[execute] Looking up Plaid account', {
        searching_by_plaid_account_id: transfer.plaid_transfer_account_id,
      });

      const { data: plaidAccount, error: plaidAccountError } = await db
        .from('plaid_accounts')
        .select('id, plaid_item_id, plaid_account_id')
        .eq('plaid_account_id', transfer.plaid_transfer_account_id)
        .single();

      console.log('[execute] Plaid account lookup result', {
        found: !!plaidAccount,
        error: plaidAccountError?.message,
        account_data: plaidAccount ? { id: plaidAccount.id, plaid_item_id: plaidAccount.plaid_item_id } : null,
      });

      if (plaidAccountError || !plaidAccount) {
        console.error('[execute] Failed to fetch plaid_account', {
          account_id: transfer.plaid_transfer_account_id,
          error: plaidAccountError?.message,
        });
        throw new Error('Source account not found in database');
      }

      // Fetch plaid_item to get access_token (stored encrypted as access_token_enc)
      console.log('[execute] Fetching Plaid item for access token', {
        plaid_item_id: plaidAccount.plaid_item_id,
      });

      const { data: plaidItem, error: plaidItemError } = await db
        .from('plaid_items')
        .select('id, access_token_enc, created_at')
        .eq('id', plaidAccount.plaid_item_id)
        .single();

      console.log('[execute] Plaid item lookup result', {
        found: !!plaidItem,
        error: plaidItemError?.message,
        has_access_token_enc: !!plaidItem?.access_token_enc,
      });

      if (plaidItemError || !plaidItem || !plaidItem.access_token_enc) {
        console.error('[execute] Failed to fetch plaid_item', {
          plaid_item_id: plaidAccount.plaid_item_id,
          error: plaidItemError?.message,
          has_token: !!plaidItem?.access_token_enc,
        });
        throw new Error('Plaid access token not found');
      }

      // Decrypt the access token
      let accessToken;
      try {
        console.log('[execute] Decrypting Plaid access token', {
          token_length: plaidItem.access_token_enc?.length || 0,
        });

        accessToken = decryptToken(plaidItem.access_token_enc);
        console.log('[execute] Successfully decrypted Plaid access token', {
          decrypted_token_preview: `${accessToken.substring(0, 20)}...`,
        });
      } catch (decryptError) {
        console.error('[execute] Failed to decrypt access token:', {
          error: decryptError.message,
          token_length: plaidItem.access_token_enc?.length || 0,
          token_preview: plaidItem.access_token_enc?.substring(0, 50) || 'N/A',
        });
        throw new Error('Failed to decrypt Plaid access token');
      }

      // Call Plaid /auth/get to retrieve account and routing numbers
      plaidAccountDetails = await getAuthData(
        accessToken,
        transfer.plaid_transfer_account_id
      );

      console.log('[execute] Successfully retrieved Plaid account details', {
        account_id: `****${plaidAccountDetails.account_number.slice(-4)}`,
        routing: plaidAccountDetails.routing_number,
      });
    } catch (plaidError) {
      console.error('[execute] Plaid auth error:', {
        error_message: plaidError.message,
        account_id: transfer.plaid_transfer_account_id,
      });

      // Log failed Plaid retrieval
      await db.from('transfer_status_log').insert({
        transfer_id: transfer.id,
        old_status: transfer.status,
        new_status: 'failed',
        reason: 'Failed to retrieve bank account details from Plaid',
        metadata: { error_message: plaidError.message },
      });

      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve source account details',
        error_code: 'PLAID_AUTH_FAILED',
        error_message: plaidError.message,
      });
    }

    // ═════════════════════════════════════════════════════════════════════
    // Call Chimoney API with idempotency protection
    // ═════════════════════════════════════════════════════════════════════
    const idempotencyKey = buildIdempotencyKey(transfer.id);

    // Define execute callback for Chimoney payout
    const executeChimonyPayout = async () => {
      if (decryptedBeneficiary.payment_method === 'upi') {
        return await callChimoneyUPI(
          decryptedBeneficiary,
          finalAmounts,
          transfer.id,
          chimonyApiKey,
          plaidAccountDetails
        );
      } else if (decryptedBeneficiary.payment_method === 'bank_account') {
        return await callChimoneyBank(
          decryptedBeneficiary,
          finalAmounts,
          transfer.id,
          chimonyApiKey,
          plaidAccountDetails
        );
      } else {
        const error = new Error('Invalid payment method');
        error.statusCode = 400;
        error.code = 'INVALID_PAYMENT_METHOD';
        throw error;
      }
    };

    // Define verify callback to check if transfer already processed
    const verifyTransferProcessed = async () => {
      const { data: existingTransfer, error: queryError } = await db
        .from('transfers')
        .select('status, chimoney_transaction_id, chimoney_reference')
        .eq('id', transfer.id)
        .single();

      if (queryError) {
        console.error('[execute] Verification query error:', queryError);
        return { processed: false };
      }

      // If transfer already has a Chimoney transaction ID, it was processed
      if (existingTransfer?.chimoney_transaction_id) {
        console.log('[execute] Transfer verified as already processed', {
          transfer_id: transfer.id,
          chimoney_transaction_id: existingTransfer.chimoney_transaction_id,
        });

        return {
          processed: true,
          data: {
            transaction_id: existingTransfer.chimoney_transaction_id,
            reference: existingTransfer.chimoney_reference,
          },
        };
      }

      return { processed: false };
    };

    // Execute with idempotency
    let idempotencyResult;
    try {
      idempotencyResult = await executeWithIdempotency({
        idempotencyKey,
        execute: executeChimonyPayout,
        verify: verifyTransferProcessed,
        logger: console,
        maxRetries: 3,
        initialBackoffMs: 100,
      });
    } catch (error) {
      console.error('[execute] Idempotency error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to execute transfer',
        error_code: 'IDEMPOTENCY_ERROR',
        details: error.message,
      });
    }

    // Handle idempotency result
    if (!idempotencyResult.success) {
      console.error('[execute] Transfer execution failed after retries', {
        transfer_id: transfer.id,
        error: idempotencyResult.error,
        errorCode: idempotencyResult.errorCode,
        attempt: idempotencyResult.attempt,
      });

      // Log failed execution
      await db.from('transfer_status_log').insert({
        transfer_id: transfer.id,
        old_status: 'pending',
        new_status: 'failed',
        reason: 'Chimoney API call failed after retries',
        metadata: {
          error: idempotencyResult.error,
          errorCode: idempotencyResult.errorCode,
          attempts: idempotencyResult.attempt,
        },
      });

      return res.status(500).json({
        success: false,
        error: 'Failed to execute transfer with Chimoney',
        error_code: 'CHIMONEY_EXECUTION_FAILED',
        details: idempotencyResult.error,
      });
    }

    // Extract Chimoney response from idempotency result
    const chimonyResponse = idempotencyResult.data;

    // If this was a duplicate request (409), log it but continue
    if (idempotencyResult.isDuplicate) {
      console.log('[execute] Duplicate transfer execution detected', {
        transfer_id: transfer.id,
        chimoney_transaction_id: chimonyResponse.transaction_id,
      });
    }

    // If this was reconciled from a failed attempt, log it
    if (idempotencyResult.isReconciled) {
      console.log('[execute] Transfer execution reconciled after server error', {
        transfer_id: transfer.id,
        chimoney_transaction_id: chimonyResponse.transaction_id,
        failureReconciled: idempotencyResult.failureReconciled,
      });
    }

    // Update transfer with Chimoney reference and final amounts
    const { data: updatedTransfer, error: updateError } = await db
      .from('transfers')
      .update({
        status: 'processing',
        chimoney_transaction_id: chimonyResponse.transaction_id,
        chimoney_reference: chimonyResponse.reference,
        final_exchange_rate: currentRate.rate,
        final_target_amount: finalAmounts.target_amount,
        executed_at: new Date().toISOString(),
        rate_change_log: {
          original_rate: transfer.exchange_rate,
          final_rate: currentRate.rate,
          change_percent: rateDecision.change_percent,
          action_taken: rateDecision.action,
          reason: rateDecision.reason,
          user_confirmed: !!rate_confirmation,
        },
      })
      .eq('id', transfer_id)
      .select()
      .single();

    if (updateError || !updatedTransfer) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update transfer status',
        error_code: 'TRANSFER_UPDATE_FAILED',
      });
    }

    // Log execution in transfer_status_log
    await db.from('transfer_status_log').insert({
      transfer_id: transfer.id,
      old_status: 'pending',
      new_status: 'processing',
      reason: `Transfer sent to Chimoney. ${rateDecision.message}`,
      metadata: {
        chimoney_transaction_id: chimonyResponse.transaction_id,
        original_rate: transfer.exchange_rate,
        final_rate: currentRate.rate,
        change_percent: rateDecision.change_percent,
        action_taken: rateDecision.action,
        user_confirmed: !!rate_confirmation,
        source_amount: finalAmounts.source_amount,
        final_amount: finalAmounts.target_amount,
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        transfer_id: updatedTransfer.id,
        status: updatedTransfer.status,
        chimoney_transaction_id: chimonyResponse.transaction_id,
        chimoney_reference: chimonyResponse.reference,
        executed_at: updatedTransfer.executed_at,
        source_amount: updatedTransfer.source_amount,
        source_currency: updatedTransfer.source_currency,
        final_target_amount: finalAmounts.target_amount,
        target_currency: updatedTransfer.target_currency,
        final_exchange_rate: currentRate.rate,
        rate_improvement: {
          changed: rateDecision.change_percent !== 0,
          improved: rateDecision.change_percent < 0,
          percent: Math.abs(rateDecision.change_percent),
          amount_difference: Math.abs(rateDecision.loss_amount),
        },
      },
    });
  } catch (error) {
    console.error('[execute] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to execute transfer',
      error_code: 'INTERNAL_ERROR',
    });
  }
}

/**
 * Call Chimoney API for UPI payout
 */
async function callChimoneyUPI(beneficiary, amounts, transferId, apiKey, sourceAccountDetails) {
  const url = 'https://api.chimoney.io/v0.2.4/payouts/upi';
  const payload = {
    receiver: [
      {
        phoneNumber: beneficiary.recipient_phone,
        upiAddress: beneficiary.recipient_upi,
        fullName: beneficiary.recipient_name,
        amount: amounts.target_amount,
        currency: amounts.target_currency,
        reference: `VIT-${transferId.substring(0, 8)}`,
        narration: 'International transfer from Vitta',
      },
    ],
  };

  console.log('[execute] Sending UPI payout request to Chimoney:', {
    url,
    transferId,
    amount: amounts.target_amount,
    currency: amounts.target_currency,
    apiKeyPrefix: apiKey.substring(0, 10) + '...',
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  console.log('[execute] Chimoney UPI response received:', {
    status: response.status,
    statusText: response.statusText,
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('[execute] Chimoney UPI error response:', error);
    throw new Error(`Chimoney UPI error: ${error.message || response.statusText}`);
  }

  const data = await response.json();
  console.log('[execute] Chimoney UPI success response:', {
    transactionId: data.data?.payouts?.[0]?.id,
    reference: data.data?.payouts?.[0]?.reference,
  });

  return {
    transaction_id: data.data?.payouts?.[0]?.id || data.transaction_id,
    reference: data.data?.payouts?.[0]?.reference || `VIT-${transferId.substring(0, 8)}`,
  };
}

/**
 * Call Chimoney API for Bank Account payout
 */
async function callChimoneyBank(beneficiary, amounts, transferId, apiKey, sourceAccountDetails) {
  const url = 'https://api.chimoney.io/v0.2.4/payouts/bank';
  const payload = {
    receiver: [
      {
        bankCode: beneficiary.recipient_bank_code,
        accountNumber: beneficiary.recipient_bank_account,
        fullName: beneficiary.recipient_name,
        amount: amounts.target_amount,
        currency: amounts.target_currency,
        reference: `VIT-${transferId.substring(0, 8)}`,
        narration: 'International transfer from Vitta',
      },
    ],
  };

  console.log('[execute] Sending Bank payout request to Chimoney:', {
    url,
    transferId,
    bankCode: beneficiary.recipient_bank_code,
    amount: amounts.target_amount,
    currency: amounts.target_currency,
    sourceAccount: sourceAccountDetails ? `****${sourceAccountDetails.account_number.slice(-4)}` : 'unknown',
    apiKeyPrefix: apiKey.substring(0, 10) + '...',
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  console.log('[execute] Chimoney Bank response received:', {
    status: response.status,
    statusText: response.statusText,
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('[execute] Chimoney Bank error response:', error);
    throw new Error(`Chimoney Bank error: ${error.message || response.statusText}`);
  }

  const data = await response.json();
  console.log('[execute] Chimoney Bank success response:', {
    transactionId: data.data?.payouts?.[0]?.id,
    reference: data.data?.payouts?.[0]?.reference,
  });

  return {
    transaction_id: data.data?.payouts?.[0]?.id || data.transaction_id,
    reference: data.data?.payouts?.[0]?.reference || `VIT-${transferId.substring(0, 8)}`,
  };
}
