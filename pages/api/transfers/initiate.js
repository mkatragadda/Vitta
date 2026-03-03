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

    // Fetch transfer account to validate it exists and is active
    // Note: plaid_account_id is stored in transfer record for later retrieval
    // Account details (number, routing) are fetched dynamically during execute
    console.log('[transfers/initiate] Validating plaid account', {
      account_id: plaid_transfer_account_id,
      account_id_preview: `${plaid_transfer_account_id.substring(0, 15)}...`,
      user_id: userId,
    });

    // Debug: Log the incoming request
    console.log('[transfers/initiate] ===== REQUEST DETAILS =====');
    console.log('[transfers/initiate] Request Body:', {
      beneficiary_id: `${beneficiary_id.substring(0, 15)}...`,
      plaid_transfer_account_id: `${plaid_transfer_account_id.substring(0, 15)}...`,
      source_amount,
      exchange_rate,
    });
    console.log('[transfers/initiate] User ID from header:', `${userId.substring(0, 15)}...`);

    // First, check table structure - get one row to see all columns
    console.log('[transfers/initiate] ===== TABLE STRUCTURE CHECK =====');
    const { data: tableCheck, error: tableError } = await db
      .from('plaid_accounts')
      .select('*')
      .limit(1);

    console.log('[transfers/initiate] Table structure check:', {
      hasData: !!tableCheck && tableCheck.length > 0,
      error: tableError?.message,
      columns: tableCheck && tableCheck.length > 0 ? Object.keys(tableCheck[0]) : 'N/A',
      sampleRow: tableCheck && tableCheck.length > 0 ? tableCheck[0] : null,
    });

    // Get all accounts for current user by joining through plaid_items
    console.log('[transfers/initiate] ===== FETCHING USER ACCOUNTS =====');
    const { data: userAccounts, error: userAccountsError } = await db
      .from('plaid_accounts')
      .select('*, plaid_items(user_id)')
      .filter('plaid_items.user_id', 'eq', userId);

    console.log('[transfers/initiate] User accounts query result:', {
      count: userAccounts?.length || 0,
      error: userAccountsError?.message,
      accounts: userAccounts?.map((a) => ({
        id: a.id,
        plaid_account_id: a.plaid_account_id,
        plaid_item_id: a.plaid_item_id,
        is_active: a.is_active,
        plaid_item_user_id: a.plaid_items?.user_id,
      })),
    });

    // First, try to fetch without .single() to see what we get
    // NOTE: Search by plaid_account_id (the actual Plaid ID), not the database id
    console.log('[transfers/initiate] ===== SEARCHING FOR TARGET ACCOUNT =====');
    const { data: allAccounts, error: allAccountsError } = await db
      .from('plaid_accounts')
      .select('*')
      .eq('plaid_account_id', plaid_transfer_account_id);

    console.log('[transfers/initiate] Query result (without .single())', {
      searchingFor: plaid_transfer_account_id,
      error: allAccountsError?.message,
      count: allAccounts?.length || 0,
      data: allAccounts,
    });

    // Fetch target account with plaid_items to verify user ownership
    console.log('[transfers/initiate] ===== FETCHING TARGET ACCOUNT WITH OWNERSHIP CHECK =====');
    const { data: transferAccount, error: transferError } = await db
      .from('plaid_accounts')
      .select('*, plaid_items(user_id)')
      .eq('plaid_account_id', plaid_transfer_account_id)
      .single();

    console.log('[transfers/initiate] Query result (with .single())', {
      hasData: !!transferAccount,
      error: transferError?.message,
      errorCode: transferError?.code,
      account_user_id: transferAccount?.plaid_items?.user_id,
      requesting_user_id: userId,
      data: transferAccount,
    });

    // Verify account exists
    if (transferError || !transferAccount) {
      console.error('[transfers/initiate] ===== PLAID ACCOUNT NOT FOUND =====', {
        account_id: plaid_transfer_account_id,
        error: transferError?.message,
        errorCode: transferError?.code,
        possibleCauses: [
          'Account not linked yet',
          'Account does not exist',
          'Incorrect plaid_account_id format',
        ],
      });

      return res.status(404).json({
        success: false,
        error: 'Transfer account not found',
        error_code: 'ACCOUNT_NOT_FOUND',
      });
    }

    // Verify user ownership (the plaid_items.user_id must match the requesting user_id)
    if (transferAccount.plaid_items?.user_id !== userId) {
      console.error('[transfers/initiate] ===== USER OWNERSHIP MISMATCH =====', {
        account_id: plaid_transfer_account_id,
        plaid_item_user_id: transferAccount.plaid_items?.user_id,
        requesting_user_id: userId,
      });

      return res.status(403).json({
        success: false,
        error: 'Unauthorized: account does not belong to this user',
        error_code: 'OWNERSHIP_MISMATCH',
      });
    }

    if (!transferAccount.is_active) {
      console.warn('[transfers/initiate] Plaid account is inactive', {
        account_id: plaid_transfer_account_id,
      });
      return res.status(400).json({
        success: false,
        error: 'Transfer account is inactive',
        error_code: 'ACCOUNT_INACTIVE',
      });
    }

    console.log('[transfers/initiate] Plaid account validated successfully', {
      account_id: `${plaid_transfer_account_id.substring(0, 15)}...`,
      plaid_item_id: `${transferAccount.plaid_item_id.substring(0, 15)}...`,
    });

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
