/**
 * POST /api/transfers/initiate
 * Create pending transfer record after user confirms details
 */

import { createClient } from '@supabase/supabase-js';
import transferService from '../../../services/transfer/transferService';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
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

    const {
      beneficiary_id,
      plaid_transfer_account_id,
      source_amount,
      exchange_rate,
      expires_at,
    } = req.body;

    // Validate required fields
    if (!beneficiary_id || !plaid_transfer_account_id || !source_amount || !exchange_rate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        error_code: 'INVALID_REQUEST',
      });
    }

    // Validate amounts
    const parsedAmount = parseFloat(source_amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid source amount',
        error_code: 'INVALID_AMOUNT',
      });
    }

    const parsedRate = parseFloat(exchange_rate);
    if (isNaN(parsedRate) || parsedRate <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid exchange rate',
        error_code: 'INVALID_RATE',
      });
    }

    // Check rate hasn't expired
    if (expires_at) {
      const expiresDate = new Date(expires_at);
      if (expiresDate < new Date()) {
        return res.status(400).json({
          success: false,
          error: 'Exchange rate expired',
          error_code: 'RATE_EXPIRED',
        });
      }
    }

    // Fetch beneficiary
    const { data: beneficiary, error: beneficiaryError } = await db
      .from('beneficiaries')
      .select('*')
      .eq('id', beneficiary_id)
      .eq('user_id', userId)
      .single();

    if (beneficiaryError || !beneficiary) {
      return res.status(404).json({
        success: false,
        error: 'Beneficiary not found',
        error_code: 'BENEFICIARY_NOT_FOUND',
      });
    }

    if (beneficiary.verification_status !== 'verified') {
      return res.status(400).json({
        success: false,
        error: 'Beneficiary not verified',
        error_code: 'BENEFICIARY_NOT_VERIFIED',
      });
    }

    if (!beneficiary.is_active) {
      return res.status(400).json({
        success: false,
        error: 'Beneficiary is inactive',
        error_code: 'BENEFICIARY_INACTIVE',
      });
    }

    // Fetch transfer account
    const { data: transferAccount, error: transferError } = await db
      .from('plaid_transfer_accounts')
      .select('*')
      .eq('id', plaid_transfer_account_id)
      .eq('user_id', userId)
      .single();

    if (transferError || !transferAccount) {
      return res.status(404).json({
        success: false,
        error: 'Transfer account not found',
        error_code: 'ACCOUNT_NOT_FOUND',
      });
    }

    if (!transferAccount.can_transfer_out) {
      return res.status(400).json({
        success: false,
        error: 'Account not enabled for transfers',
        error_code: 'ACCOUNT_TRANSFER_DISABLED',
      });
    }

    if (!transferAccount.is_verified_for_transfer) {
      return res.status(400).json({
        success: false,
        error: 'Account transfer verification pending',
        error_code: 'ACCOUNT_NOT_VERIFIED',
      });
    }

    // Calculate amounts
    const amounts = transferService.calculateTransferAmounts(
      parsedAmount,
      parsedRate,
      0.5
    );

    // Validate transfer
    const validation = transferService.validateTransfer(amounts, transferAccount, beneficiary);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Transfer validation failed',
        error_code: 'TRANSFER_VALIDATION_FAILED',
        errors: validation.errors,
      });
    }

    // Create transfer record
    const { data: transfer, error: insertError } = await db
      .from('transfers')
      .insert({
        user_id: userId,
        plaid_transfer_account_id,
        beneficiary_id,
        source_amount: amounts.source_amount,
        source_currency: amounts.source_currency,
        target_amount: amounts.target_amount,
        target_currency: amounts.target_currency,
        exchange_rate: amounts.exchange_rate,
        fee_amount: amounts.fee_amount,
        fee_percentage: amounts.fee_percentage,
        status: 'pending',
        initiated_at: new Date().toISOString(),
        ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        user_agent: req.headers['user-agent'],
      })
      .select()
      .single();

    if (insertError || !transfer) {
      return res.status(500).json({
        success: false,
        error: 'Failed to initiate transfer',
        error_code: 'TRANSFER_CREATION_FAILED',
      });
    }

    // Log transfer initiation
    await db.from('transfer_status_log').insert({
      transfer_id: transfer.id,
      old_status: null,
      new_status: 'pending',
      reason: 'User initiated transfer',
      metadata: {
        source_amount: amounts.source_amount,
        exchange_rate: amounts.exchange_rate,
        target_amount: amounts.target_amount,
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        transfer_id: transfer.id,
        status: transfer.status,
        initiated_at: transfer.initiated_at,
        valid_until: expires_at,
        source_amount: amounts.source_amount,
        source_currency: amounts.source_currency,
        target_amount: amounts.target_amount,
        target_currency: amounts.target_currency,
        exchange_rate: amounts.exchange_rate,
        fee_amount: amounts.fee_amount,
      },
    });
  } catch (error) {
    console.error('[initiate] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to initiate transfer',
      error_code: 'INTERNAL_ERROR',
    });
  }
}
