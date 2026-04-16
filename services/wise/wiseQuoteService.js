/**
 * Wise Quote Service
 * Creates and manages transfer quotes using official Wise API
 *
 * API Reference: https://docs.wise.com/api-reference/quote
 */

class WiseQuoteService {
  constructor(wiseClient, supabase) {
    this.client = wiseClient;
    this.db = supabase;
    this.profileId = wiseClient.profileId; // Get from config
  }

  /**
   * Create a new transfer quote
   *
   * Wise API: POST /v3/profiles/{profileId}/quotes
   *
   * Supports TWO modes:
   * 1. sourceAmount: "I want to send X USD, how much INR will recipient get?"
   * 2. targetAmount: "I want recipient to get X INR, how much USD do I need?"
   *
   * IMPORTANT: Provide EITHER sourceAmount OR targetAmount, never both!
   */
  async createQuote({ userId, sourceAmount, targetAmount, sourceCurrency, targetCurrency, upiScanId }) {
    console.log('\n========== WISE QUOTE SERVICE - CREATE ==========');
    console.log('[WiseQuoteService] Creating quote for user:', userId);

    // Determine quote mode
    const isSourceMode = sourceAmount !== undefined && sourceAmount !== null;
    const isTargetMode = targetAmount !== undefined && targetAmount !== null;

    if (isSourceMode && isTargetMode) {
      throw new Error('Provide either sourceAmount OR targetAmount, not both');
    }

    if (!isSourceMode && !isTargetMode) {
      throw new Error('Must provide either sourceAmount or targetAmount');
    }

    const quoteMode = isSourceMode ? 'SOURCE' : 'TARGET';

    console.log('[WiseQuoteService] Mode:', quoteMode);
    console.log('[WiseQuoteService] Amount:', quoteMode === 'SOURCE' ? `${sourceAmount} ${sourceCurrency}` : `${targetAmount} ${targetCurrency}`);
    console.log('[WiseQuoteService] Source Currency:', sourceCurrency);
    console.log('[WiseQuoteService] Target Currency:', targetCurrency);
    console.log('[WiseQuoteService] UPI Scan ID:', upiScanId || 'N/A');
    console.log('=================================================\n');

    // Build quote payload
    const quotePayload = {
      sourceCurrency,
      targetCurrency,
      payOut: 'BALANCE', // Request BALANCE payment option
    };

    // Add EITHER sourceAmount OR targetAmount
    if (isSourceMode) {
      quotePayload.sourceAmount = sourceAmount;
    } else {
      quotePayload.targetAmount = targetAmount;
    }

    try {
      // Call Wise API to create quote
      // IMPORTANT: Endpoint requires profileId in path!
      console.log('[WiseQuoteService] Calling Wise API to create quote...');
      console.log('[WiseQuoteService] Payload:', JSON.stringify(quotePayload, null, 2));

      const wiseQuote = await this.client.post(
        `/v3/profiles/${this.profileId}/quotes`,
        quotePayload
      );

      console.log('[WiseQuoteService] ✅ Wise quote created successfully');
      console.log('[WiseQuoteService] Quote ID:', wiseQuote.id);
      console.log('[WiseQuoteService] Rate:', wiseQuote.rate);
      console.log('[WiseQuoteService] Wise Response Keys:', Object.keys(wiseQuote));

      // Wise API v3 returns paymentOptions array
      // Select BALANCE payment option (paying from Wise balance)
      const availableOptions = wiseQuote.paymentOptions?.filter(opt => !opt.disabled) || [];

      // Find BALANCE option
      const balanceOption = availableOptions.find(opt => opt.payIn === 'BALANCE');

      // Fallback to cheapest if BALANCE not available
      const cheapestOption = availableOptions.reduce((best, current) => {
        const currentFee = current.fee?.total || 0;
        const bestFee = best.fee?.total || 0;
        return currentFee < bestFee ? current : best;
      }, availableOptions[0]);

      const paymentOption = balanceOption || cheapestOption || wiseQuote;

      console.log('[WiseQuoteService] Available Options:', availableOptions.length);
      console.log('[WiseQuoteService] Selected Payment Method:', paymentOption.payIn);

      // Extract both amounts from Wise response (API provides both regardless of mode)
      const finalSourceAmount = paymentOption.sourceAmount || wiseQuote.sourceAmount;
      const finalTargetAmount = paymentOption.targetAmount || wiseQuote.targetAmount;
      const fee = paymentOption.fee || wiseQuote.fee || {};

      console.log('\n========== SELECTED PAYMENT OPTION DETAILS ==========');
      console.log('[WiseQuoteService] Selected Option Object:', JSON.stringify(paymentOption, null, 2));
      console.log('=====================================================');

      console.log('\n========== EXTRACTED VALUES ==========');
      console.log('[WiseQuoteService] finalSourceAmount (paymentOption.sourceAmount):', finalSourceAmount, sourceCurrency);
      console.log('[WiseQuoteService] finalTargetAmount (paymentOption.targetAmount):', finalTargetAmount, targetCurrency);
      console.log('[WiseQuoteService] fee.total:', fee.total || 0, sourceCurrency);
      console.log('[WiseQuoteService] fee.transferwise:', fee.transferwise || 0, sourceCurrency);
      console.log('[WiseQuoteService] fee.payIn:', fee.payIn || 0, sourceCurrency);
      console.log('[WiseQuoteService] Exchange Rate (wiseQuote.rate):', wiseQuote.rate);
      console.log('======================================');

      console.log('\n========== CALCULATION ==========');
      console.log('[WiseQuoteService] IMPORTANT: Wise sourceAmount ALREADY includes all fees!');
      console.log('[WiseQuoteService] Base conversion amount:', (finalSourceAmount - (fee.total || 0)).toFixed(2), sourceCurrency, '→', finalTargetAmount, targetCurrency);
      console.log('[WiseQuoteService] Fee total:', (fee.total || 0).toFixed(2), sourceCurrency);
      console.log('[WiseQuoteService] Total to debit:', finalSourceAmount.toFixed(2), sourceCurrency, '(sourceAmount, fees included)');
      console.log('=================================\n');

      // Build quote object for database
      const quote = {
        wise_quote_id: wiseQuote.id,
        user_id: userId,
        upi_scan_id: upiScanId || null,
        source_currency: sourceCurrency,
        target_currency: targetCurrency,
        source_amount: finalSourceAmount, // Amount from Wise API (works in both modes)
        target_amount: finalTargetAmount, // Amount from Wise API (works in both modes)
        exchange_rate: wiseQuote.rate,

        // Fee breakdown (matches Phase 2 schema)
        fee_total: fee.total || 0,
        fee_transferwise: fee.transferwise || 0,
        fee_partner: fee.partner || 0,
        // IMPORTANT: Wise's sourceAmount ALREADY includes fees! Don't add them again!
        total_debit: finalSourceAmount,

        // Quote validity
        rate_type: wiseQuote.rateType || 'FIXED',
        payment_type: paymentOption.paymentType || 'BALANCE',
        expires_at: wiseQuote.expirationTime,
        rate_expiry_time: wiseQuote.rateExpiryTime || null,

        status: 'active',
        wise_api_response: wiseQuote, // Store full response for debugging
      };

      // Save to database
      const { data, error } = await this.db
        .from('wise_quotes')
        .insert(quote)
        .select()
        .single();

      if (error) {
        console.error('[WiseQuoteService] Database error:', error);
        throw error;
      }

      console.log('[WiseQuoteService] ✅ Quote saved to database');
      console.log('[WiseQuoteService] Database ID:', data.id);
      console.log('[WiseQuoteService] Total Debit:', data.total_debit, sourceCurrency);
      console.log('=================================================\n');

      return data;

    } catch (error) {
      console.log('\n========== WISE QUOTE SERVICE - ERROR ==========');
      console.error('[WiseQuoteService] ❌ Failed to create quote');
      console.error('[WiseQuoteService] Error:', error.message);
      console.error('[WiseQuoteService] Stack:', error.stack);
      console.log('================================================\n');
      throw new Error(`Quote creation failed: ${error.message}`);
    }
  }

  /**
   * Get quote by ID and validate it's still valid
   */
  async getQuote(quoteId) {
    const { data: quote, error } = await this.db
      .from('wise_quotes')
      .select('*')
      .eq('id', quoteId)
      .single();

    if (error || !quote) {
      throw new Error('Quote not found');
    }

    // Check if expired
    const now = new Date();
    const expiresAt = new Date(quote.expires_at);

    if (now > expiresAt) {
      // Mark as expired
      await this.db
        .from('wise_quotes')
        .update({ status: 'expired' })
        .eq('id', quoteId);

      throw new Error('Quote has expired. Please create a new quote.');
    }

    if (quote.status !== 'active') {
      throw new Error(`Quote is ${quote.status}`);
    }

    return quote;
  }

  /**
   * Mark quote as used after transfer
   */
  async markQuoteUsed(quoteId, transferId) {
    const { error } = await this.db
      .from('wise_quotes')
      .update({
        status: 'used',
        used_for_transfer_id: transferId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', quoteId);

    if (error) {
      console.error('[WiseQuoteService] Failed to mark quote as used:', error);
    }
  }
}

export default WiseQuoteService;
