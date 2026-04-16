/**
 * Wise Transfer Service
 * Creates transfers (combines quote + recipient)
 *
 * API Reference: https://docs.wise.com/api-reference/transfer
 */

import { randomUUID } from 'crypto';

class WiseTransferService {
  constructor(wiseClient, supabase) {
    this.client = wiseClient;
    this.db = supabase;
    this.profileId = wiseClient.profileId;
  }

  /**
   * Create transfer in Wise (NOT YET FUNDED)
   *
   * Wise API: POST /v1/transfers
   *
   * IMPORTANT: This creates the transfer but does NOT fund it.
   * You must call fundTransfer() separately (Step 4).
   */
  async createTransfer({ userId, quoteId, recipientId, upiScanId, reference }) {
    console.log('[WiseTransferService] Creating transfer:', {
      quoteId,
      recipientId,
    });

    try {
      // Get quote from database
      const { data: quote, error: quoteError } = await this.db
        .from('wise_quotes')
        .select('*')
        .eq('id', quoteId)
        .single();

      if (quoteError || !quote) {
        throw new Error('Quote not found');
      }

      // Get recipient from database
      const { data: recipient, error: recipientError } = await this.db
        .from('wise_recipients')
        .select('*')
        .eq('id', recipientId)
        .single();

      if (recipientError || !recipient) {
        throw new Error('Recipient not found');
      }

      // Generate idempotency key (prevents duplicate transfers on retry)
      const customerTransactionId = randomUUID();

      // Prepare transfer payload
      // Note: UPI transfers may not support reference field
      const transferPayload = {
        targetAccount: recipient.wise_account_id, // Wise recipient ID
        quoteUuid: quote.wise_quote_id, // Wise quote ID
        customerTransactionId, // Our idempotency key
        details: {
          reference: '', // Empty reference for UPI (reference field has very strict limits)
          transferPurpose: 'Family Purpose', // Required for UPI transfers
        },
      };

      console.log('[WiseTransferService] Transfer payload:', JSON.stringify(transferPayload, null, 2));

      // Call Wise API to create transfer
      const wiseTransfer = await this.client.post('/v1/transfers', transferPayload);

      console.log('[WiseTransferService] Transfer created in Wise:', wiseTransfer.id);

      // Save to database
      const transferData = {
        user_id: userId,
        upi_scan_id: upiScanId || null,
        wise_transfer_id: wiseTransfer.id,
        wise_quote_id: quoteId,
        wise_recipient_id: recipientId,
        source_amount: quote.source_amount,
        source_currency: quote.source_currency,
        target_amount: quote.target_amount,
        target_currency: quote.target_currency,
        exchange_rate: quote.exchange_rate,
        reference: transferPayload.details.reference,
        customer_transaction_id: customerTransactionId,
        wise_status: wiseTransfer.status,
        status: this._mapWiseStatus(wiseTransfer.status),
        is_funded: false, // Not yet funded!
        wise_api_response: wiseTransfer,
      };

      const { data: savedTransfer, error: dbError } = await this.db
        .from('wise_transfers')
        .insert(transferData)
        .select()
        .single();

      if (dbError) {
        console.error('[WiseTransferService] Database error:', dbError);
        throw dbError;
      }

      console.log('[WiseTransferService] Transfer saved to DB:', savedTransfer.id);

      // Log event
      await this._logTransferEvent({
        userId,
        transferId: savedTransfer.id,
        eventType: 'status_change',
        newStatus: wiseTransfer.status,
        source: 'api',
      });

      return savedTransfer;

    } catch (error) {
      console.error('[WiseTransferService] Failed to create transfer:', error);
      if (error.details) {
        console.error('[WiseTransferService] Error details:', JSON.stringify(error.details, null, 2));
      }
      throw new Error(`Transfer creation failed: ${error.message}`);
    }
  }

  /**
   * Private: Map Wise status to our simplified status
   */
  _mapWiseStatus(wiseStatus) {
    const statusMap = {
      'incoming_payment_waiting': 'pending',
      'processing': 'processing',
      'funds_converted': 'processing',
      'outgoing_payment_sent': 'processing',
      'bounced_back': 'failed',
      'funds_refunded': 'failed',
      'cancelled': 'cancelled',
    };

    return statusMap[wiseStatus] || 'pending';
  }

  /**
   * Private: Log transfer event to audit trail
   */
  async _logTransferEvent({ userId, transferId, eventType, oldStatus, newStatus, source }) {
    await this.db
      .from('wise_transfer_events')
      .insert({
        user_id: userId, // Required by Phase 2 schema
        wise_transfer_id: transferId,
        event_type: eventType,
        old_status: oldStatus || null,
        new_status: newStatus,
        source: source,
      });
  }
}

export default WiseTransferService;
