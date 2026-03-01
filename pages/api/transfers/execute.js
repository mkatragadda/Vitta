/**
 * POST /api/transfers/execute
 * Execute a pending transfer with Chimoney payout
 * Implements smart rate logic: improves → silent, worsens <1% → silent, worsens >1% → alert
 */

import { createClient } from '@supabase/supabase-js';
import transferService from '../../../services/transfer/transferService';
import encryptionService from '../../../services/encryption/encryptionService';
import getChimoneyConfig from '../../../config/chimoney';

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
        plaid_transfer_accounts(*)
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

    // Call Chimoney API for payout
    let chimonyResponse;
    try {
      if (decryptedBeneficiary.payment_method === 'upi') {
        chimonyResponse = await callChimoneyUPI(
          decryptedBeneficiary,
          finalAmounts,
          transfer.id,
          chimonyApiKey
        );
      } else if (decryptedBeneficiary.payment_method === 'bank_account') {
        chimonyResponse = await callChimoneyBank(
          decryptedBeneficiary,
          finalAmounts,
          transfer.id,
          chimonyApiKey
        );
      } else {
        return res.status(400).json({
          success: false,
          error: 'Invalid payment method',
          error_code: 'INVALID_PAYMENT_METHOD',
        });
      }
    } catch (chimonyError) {
      console.error('[execute] Chimoney error:', chimonyError);

      // Log failed execution
      await db.from('transfer_status_log').insert({
        transfer_id: transfer.id,
        old_status: 'pending',
        new_status: 'failed',
        reason: 'Chimoney API call failed',
        metadata: {
          error: chimonyError.message,
        },
      });

      return res.status(500).json({
        success: false,
        error: 'Failed to execute transfer with Chimoney',
        error_code: 'CHIMONEY_EXECUTION_FAILED',
        details: chimonyError.message,
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
async function callChimoneyUPI(beneficiary, amounts, transferId, apiKey) {
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
async function callChimoneyBank(beneficiary, amounts, transferId, apiKey) {
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
