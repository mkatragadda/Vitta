/**
 * API Route: Execute Complete Wise Transfer
 * POST /api/wise/transfer/execute
 *
 * Executes all 4 steps of Wise transfer flow:
 * 1. Create Quote
 * 2. Get/Create Recipient
 * 3. Create Transfer
 * 4. Fund Transfer
 */

import { createClient } from '@supabase/supabase-js';
import WiseClient from '../../../../services/wise/wiseClient.js';
import WiseQuoteService from '../../../../services/wise/wiseQuoteService.js';
import WiseRecipientService from '../../../../services/wise/wiseRecipientService.js';
import WiseTransferService from '../../../../services/wise/wiseTransferService.js';
import WisePaymentService from '../../../../services/wise/wisePaymentService.js';
import WiseOrchestrator from '../../../../services/wise/wiseOrchestrator.js';

const wiseConfig = {
  apiKey: process.env.WISE_API_KEY,
  profileId: process.env.WISE_PROFILE_ID,
  baseURL: process.env.WISE_BASE_URL || 'https://api.sandbox.transferwise.tech',
  environment: process.env.WISE_ENVIRONMENT || 'sandbox',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Get user ID from header
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User ID required' });
    }

    // Validate Wise configuration
    if (!wiseConfig.apiKey || !wiseConfig.profileId) {
      return res.status(500).json({
        success: false,
        error: 'Wise API not configured. Please contact support.',
      });
    }

    // Extract and validate request body
    const {
      upiScanId,
      sourceAmount,
      sourceCurrency,
      targetCurrency,
      upiId,
      payeeName,
      reference,
    } = req.body;

    // Validate required fields
    if (!sourceAmount || !sourceCurrency || !targetCurrency || !upiId || !payeeName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: sourceAmount, sourceCurrency, targetCurrency, upiId, payeeName',
      });
    }

    // Validate types
    if (typeof sourceAmount !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'sourceAmount must be a number',
      });
    }

    if (
      typeof sourceCurrency !== 'string' ||
      typeof targetCurrency !== 'string' ||
      typeof upiId !== 'string' ||
      typeof payeeName !== 'string'
    ) {
      return res.status(400).json({
        success: false,
        error: 'sourceCurrency, targetCurrency, upiId, and payeeName must be strings',
      });
    }

    // Validate amount range
    if (sourceAmount < 1) {
      return res.status(400).json({
        success: false,
        error: 'Minimum transfer amount is $1',
      });
    }

    if (sourceAmount > 10000) {
      return res.status(400).json({
        success: false,
        error: 'Maximum transfer amount is $10,000',
      });
    }

    // Validate UPI ID format
    const upiIdRegex = /^[\w.-]+@[\w.-]+$/;
    if (!upiIdRegex.test(upiId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid UPI ID format. Expected format: username@bank',
      });
    }

    // Initialize services
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const wiseClient = new WiseClient(wiseConfig);
    const quoteService = new WiseQuoteService(wiseClient, supabase);
    const recipientService = new WiseRecipientService(wiseClient, supabase);
    const transferService = new WiseTransferService(wiseClient, supabase);
    const paymentService = new WisePaymentService(wiseClient, supabase);

    const orchestrator = new WiseOrchestrator({
      quoteService,
      recipientService,
      transferService,
      paymentService,
      supabase,
    });

    // Execute complete transfer flow
    const result = await orchestrator.executeTransfer({
      userId,
      upiScanId: upiScanId || null,
      sourceAmount,
      sourceCurrency,
      targetCurrency,
      upiId,
      payeeName,
      reference: reference || `Vitta Payment ${new Date().toISOString().split('T')[0]}`,
    });

    // Return complete transfer details
    return res.status(200).json({
      success: true,
      data: {
        transferId: result.transfer.id,
        status: result.transfer.status,
        wiseStatus: result.transfer.wise_status,
        sourceAmount: result.transfer.source_amount,
        sourceCurrency: result.transfer.source_currency,
        targetAmount: result.transfer.target_amount,
        targetCurrency: result.transfer.target_currency,
        exchangeRate: result.transfer.exchange_rate,
        feeTotal: result.quote.fee_total,
        feeTransferwise: result.quote.fee_transferwise,
        feePartner: result.quote.fee_partner,
        totalDebit: result.quote.total_debit,
        reference: result.transfer.reference,
        isFunded: result.transfer.is_funded,
        fundedAt: result.transfer.funded_at,
        recipient: {
          upiId: result.recipient.upi_id,
          payeeName: result.recipient.payee_name,
        },
        payment: {
          type: result.payment.payment_type,
          status: result.payment.wise_payment_status,
          completedAt: result.payment.payment_completed_at,
        },
      },
    });

  } catch (error) {
    console.error('[API /wise/transfer/execute] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to execute transfer',
    });
  }
}
