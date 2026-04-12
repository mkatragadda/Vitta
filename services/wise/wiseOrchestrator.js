/**
 * Wise Orchestrator Service
 * Coordinates the complete 4-step Wise transfer flow
 *
 * Flow: Quote → Recipient → Transfer → Fund Transfer
 */

class WiseOrchestrator {
  constructor({ quoteService, recipientService, transferService, paymentService, supabase }) {
    this.quoteService = quoteService;
    this.recipientService = recipientService;
    this.transferService = transferService;
    this.paymentService = paymentService;
    this.db = supabase;
  }

  /**
   * Execute complete transfer flow (all 4 steps)
   *
   * Step 1: Create Quote
   * Step 2: Get/Create Recipient
   * Step 3: Create Transfer
   * Step 4: Fund Transfer
   */
  async executeTransfer({
    userId,
    upiScanId,
    sourceAmount,
    sourceCurrency,
    targetCurrency,
    upiId,
    payeeName,
    reference,
  }) {
    console.log('[WiseOrchestrator] Starting transfer execution:', {
      userId,
      upiScanId,
      sourceAmount,
      sourceCurrency,
      targetCurrency,
      upiId,
    });

    try {
      // Step 1: Create Quote
      console.log('[WiseOrchestrator] Step 1/4: Creating quote...');
      const quote = await this.quoteService.createQuote({
        userId,
        sourceAmount,
        sourceCurrency,
        targetCurrency,
        upiScanId,
      });

      console.log('[WiseOrchestrator] Quote created:', quote.id);

      // Step 2: Get/Create Recipient
      console.log('[WiseOrchestrator] Step 2/4: Getting/creating recipient...');
      const recipient = await this.recipientService.getOrCreateRecipient({
        userId,
        upiId,
        payeeName,
      });

      console.log('[WiseOrchestrator] Recipient ready:', recipient.id);

      // Step 3: Create Transfer
      console.log('[WiseOrchestrator] Step 3/4: Creating transfer...');
      const transfer = await this.transferService.createTransfer({
        userId,
        quoteId: quote.id,
        recipientId: recipient.id,
        upiScanId,
        reference,
      });

      console.log('[WiseOrchestrator] Transfer created:', transfer.id);

      // Step 4: Fund Transfer
      console.log('[WiseOrchestrator] Step 4/4: Funding transfer...');
      const payment = await this.paymentService.fundTransfer({
        transferId: transfer.id,
        paymentType: 'BALANCE',
      });

      console.log('[WiseOrchestrator] Transfer funded successfully!');

      // Update UPI scan status if provided
      if (upiScanId) {
        await this._updateUpiScanStatus(upiScanId, transfer.id);
      }

      // Mark quote as used
      await this.quoteService.markQuoteUsed(quote.id, transfer.id);

      // Return complete transfer details
      return {
        transfer,
        payment,
        quote,
        recipient,
      };

    } catch (error) {
      console.error('[WiseOrchestrator] Transfer execution failed:', error);
      throw new Error(`Transfer failed: ${error.message}`);
    }
  }

  /**
   * Get transfer status and details
   */
  async getTransferStatus(transferId) {
    console.log('[WiseOrchestrator] Getting transfer status:', transferId);

    try {
      const { data: transfer, error } = await this.db
        .from('wise_transfers')
        .select(`
          *,
          wise_quotes (
            source_amount,
            target_amount,
            exchange_rate,
            fee_total,
            fee_transferwise,
            fee_partner
          ),
          wise_recipients (
            upi_id,
            payee_name
          ),
          wise_payments (
            payment_type,
            wise_payment_status,
            payment_completed_at
          )
        `)
        .eq('id', transferId)
        .single();

      if (error || !transfer) {
        throw new Error('Transfer not found');
      }

      return {
        id: transfer.id,
        status: transfer.status,
        wiseStatus: transfer.wise_status,
        sourceAmount: transfer.source_amount,
        sourceCurrency: transfer.source_currency,
        targetAmount: transfer.target_amount,
        targetCurrency: transfer.target_currency,
        exchangeRate: transfer.exchange_rate,
        feeTotal: transfer.wise_quotes?.fee_total || 0,
        feeTransferwise: transfer.wise_quotes?.fee_transferwise || 0,
        feePartner: transfer.wise_quotes?.fee_partner || 0,
        totalDebit: transfer.source_amount + (transfer.wise_quotes?.fee_total || 0),
        reference: transfer.reference,
        isFunded: transfer.is_funded,
        fundedAt: transfer.funded_at,
        createdAt: transfer.created_at,
        recipient: {
          upiId: transfer.wise_recipients?.upi_id,
          payeeName: transfer.wise_recipients?.payee_name,
        },
        payment: transfer.wise_payments ? {
          type: transfer.wise_payments.payment_type,
          status: transfer.wise_payments.wise_payment_status,
          completedAt: transfer.wise_payments.payment_completed_at,
        } : null,
      };

    } catch (error) {
      console.error('[WiseOrchestrator] Failed to get transfer status:', error);
      throw new Error(`Failed to get transfer status: ${error.message}`);
    }
  }

  /**
   * Private: Update UPI scan status
   */
  async _updateUpiScanStatus(upiScanId, transferId) {
    try {
      await this.db
        .from('upi_scans')
        .update({
          transfer_status: 'processing',
          wise_transfer_id: transferId,
        })
        .eq('id', upiScanId);

      console.log('[WiseOrchestrator] Updated UPI scan status:', upiScanId);
    } catch (error) {
      console.error('[WiseOrchestrator] Failed to update UPI scan status:', error);
      // Non-critical error, don't throw
    }
  }
}

export default WiseOrchestrator;
