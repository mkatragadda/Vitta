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
   */
  async createQuote({ userId, sourceAmount, sourceCurrency, targetCurrency, upiScanId }) {
    console.log('\n========== WISE QUOTE SERVICE - CREATE ==========');
    console.log('[WiseQuoteService] Creating quote for user:', userId);
    console.log('[WiseQuoteService] Source:', `${sourceAmount} ${sourceCurrency}`);
    console.log('[WiseQuoteService] Target:', targetCurrency);
    console.log('[WiseQuoteService] UPI Scan ID:', upiScanId || 'N/A');
    console.log('=================================================\n');

    // Validate amount
    if (sourceAmount < 1) {
      throw new Error('Minimum transfer amount is $1');
    }

    if (sourceAmount > 10000) {
      throw new Error('Maximum transfer amount is $10,000');
    }

    try {
      // Call Wise API to create quote
      // IMPORTANT: Endpoint requires profileId in path!
      console.log('[WiseQuoteService] Calling Wise API to create quote...');
      const wiseQuote = await this.client.post(
        `/v3/profiles/${this.profileId}/quotes`,
        {
          sourceCurrency,
          targetCurrency,
          sourceAmount,
          // Note: Do NOT send both sourceAmount and targetAmount
        }
      );

      console.log('[WiseQuoteService] ✅ Wise quote created successfully');
      console.log('[WiseQuoteService] Quote ID:', wiseQuote.id);
      console.log('[WiseQuoteService] Rate:', wiseQuote.rate);
      console.log('[WiseQuoteService] Wise Response Keys:', Object.keys(wiseQuote));

      // Wise API v3 returns paymentOptions array with targetAmount
      // We need to extract targetAmount from the first payment option
      const paymentOption = wiseQuote.paymentOptions?.[0] || wiseQuote;
      const targetAmount = paymentOption.targetAmount || wiseQuote.targetAmount;
      const fee = paymentOption.fee || wiseQuote.fee || {};

      // If targetAmount is still not available, calculate it manually
      const calculatedTargetAmount = targetAmount || (sourceAmount * wiseQuote.rate);

      console.log('[WiseQuoteService] Payment Options:', wiseQuote.paymentOptions?.length || 'none');
      console.log('[WiseQuoteService] Target Amount (from API):', targetAmount);
      console.log('[WiseQuoteService] Target Amount (calculated):', calculatedTargetAmount);
      console.log('[WiseQuoteService] Fee Total:', fee.total || 0);
      console.log('[WiseQuoteService] Expires:', wiseQuote.expirationTime);

      // Build quote object for database
      const quote = {
        wise_quote_id: wiseQuote.id,
        user_id: userId,
        upi_scan_id: upiScanId || null,
        source_currency: sourceCurrency,
        target_currency: targetCurrency,
        source_amount: sourceAmount,
        target_amount: calculatedTargetAmount, // Use calculated if API doesn't provide
        exchange_rate: wiseQuote.rate,

        // Fee breakdown (matches Phase 2 schema)
        fee_total: fee.total || 0,
        fee_transferwise: fee.transferwise || 0,
        fee_partner: fee.partner || 0,
        total_debit: sourceAmount + (fee.total || 0),

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
