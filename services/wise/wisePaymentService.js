/**
 * Wise Payment Service
 * Funds transfers (Step 4 of Wise flow)
 *
 * API Reference: https://docs.wise.com/api-reference/transfer
 */

class WisePaymentService {
  constructor(wiseClient, supabase) {
    this.client = wiseClient;
    this.db = supabase;
    this.profileId = wiseClient.profileId;
  }

  /**
   * Fund a transfer (execute payment)
   *
   * Wise API: POST /v3/profiles/{profileId}/transfers/{transferId}/payments
   *
   * IMPORTANT: This is the step that actually sends the money!
   * Transfer must be created first (Step 3).
   */
  async fundTransfer({ transferId, paymentType = 'BALANCE' }) {
    console.log('[WisePaymentService] Funding transfer:', { transferId, paymentType });

    try {
      // Get transfer from database
      const { data: transfer, error: transferError } = await this.db
        .from('wise_transfers')
        .select('*')
        .eq('id', transferId)
        .single();

      if (transferError || !transfer) {
        throw new Error('Transfer not found');
      }

      if (transfer.is_funded) {
        throw new Error('Transfer already funded');
      }

      // Prepare payment payload
      const paymentPayload = {
        type: paymentType, // 'BALANCE', 'BANK_TRANSFER', 'CARD'
      };

      // Call Wise API to fund transfer
      const endpoint = `/v3/profiles/${this.profileId}/transfers/${transfer.wise_transfer_id}/payments`;
      const wisePayment = await this.client.post(endpoint, paymentPayload);

      console.log('[WisePaymentService] Payment completed:', wisePayment.status);

      // Save payment record
      const paymentData = {
        user_id: transfer.user_id,
        wise_transfer_id: transferId,
        payment_type: paymentType,
        wise_payment_status: wisePayment.status,
        balance_transaction_id: wisePayment.balanceTransactionId,
        amount: transfer.source_amount,
        currency: transfer.source_currency,
        payment_completed_at: wisePayment.status === 'COMPLETED' ? new Date().toISOString() : null,
        wise_api_response: wisePayment,
      };

      const { data: savedPayment, error: paymentDbError } = await this.db
        .from('wise_payments')
        .insert(paymentData)
        .select()
        .single();

      if (paymentDbError) {
        console.error('[WisePaymentService] Database error:', paymentDbError);
        throw paymentDbError;
      }

      // Update transfer as funded
      await this.db
        .from('wise_transfers')
        .update({
          is_funded: true,
          funded_at: new Date().toISOString(),
          wise_payment_id: savedPayment.id,
          status: 'processing',
          wise_status: 'processing',
        })
        .eq('id', transferId);

      // Log event
      await this._logPaymentEvent({
        userId: transfer.user_id,
        transferId,
        eventType: 'payment_completed',
        paymentStatus: wisePayment.status,
      });

      console.log('[WisePaymentService] Payment saved to DB:', savedPayment.id);

      return savedPayment;

    } catch (error) {
      console.error('[WisePaymentService] Failed to fund transfer:', error);
      throw new Error(`Payment funding failed: ${error.message}`);
    }
  }

  /**
   * Private: Log payment event
   */
  async _logPaymentEvent({ userId, transferId, eventType, paymentStatus }) {
    await this.db
      .from('wise_transfer_events')
      .insert({
        user_id: userId, // Required by Phase 2 schema
        wise_transfer_id: transferId,
        event_type: eventType,
        new_status: paymentStatus,
        source: 'payment_api',
      });
  }
}

export default WisePaymentService;
