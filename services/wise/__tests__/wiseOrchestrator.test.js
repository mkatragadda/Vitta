/**
 * WiseOrchestrator Tests
 * Tests for complete transfer flow orchestration
 */

import WiseOrchestrator from '../wiseOrchestrator.js';

describe('WiseOrchestrator', () => {
  let orchestrator;
  let mockQuoteService;
  let mockRecipientService;
  let mockTransferService;
  let mockPaymentService;
  let mockSupabase;

  beforeEach(() => {
    // Mock quote service
    mockQuoteService = {
      createQuote: jest.fn(),
      markQuoteUsed: jest.fn(),
    };

    // Mock recipient service
    mockRecipientService = {
      getOrCreateRecipient: jest.fn(),
    };

    // Mock transfer service
    mockTransferService = {
      createTransfer: jest.fn(),
    };

    // Mock payment service
    mockPaymentService = {
      fundTransfer: jest.fn(),
    };

    // Mock Supabase
    mockSupabase = {
      from: jest.fn(() => mockSupabase),
      select: jest.fn(() => mockSupabase),
      update: jest.fn(() => mockSupabase),
      eq: jest.fn(() => mockSupabase),
      single: jest.fn(),
    };

    orchestrator = new WiseOrchestrator({
      quoteService: mockQuoteService,
      recipientService: mockRecipientService,
      transferService: mockTransferService,
      paymentService: mockPaymentService,
      supabase: mockSupabase,
    });
  });

  describe('executeTransfer', () => {
    const mockQuote = {
      id: 'quote-123',
      source_amount: 10,
      target_amount: 835,
      exchange_rate: 83.5,
      fee_total: 5.0,
      fee_transferwise: 4.0,
      fee_partner: 1.0,
    };

    const mockRecipient = {
      id: 'recipient-123',
      upi_id: 'user@bank',
      payee_name: 'John Doe',
    };

    const mockTransfer = {
      id: 'transfer-123',
      wise_transfer_id: 'wise-transfer-123',
      status: 'pending',
      wise_status: 'incoming_payment_waiting',
      source_amount: 10,
      source_currency: 'USD',
      target_amount: 835,
      target_currency: 'INR',
      exchange_rate: 83.5,
      reference: 'Test payment',
      is_funded: false,
    };

    const mockPayment = {
      id: 'payment-123',
      payment_type: 'BALANCE',
      wise_payment_status: 'COMPLETED',
      payment_completed_at: '2026-04-11T12:00:00Z',
    };

    test('executes complete transfer flow successfully', async () => {
      // Setup mocks
      mockQuoteService.createQuote.mockResolvedValue(mockQuote);
      mockRecipientService.getOrCreateRecipient.mockResolvedValue(mockRecipient);
      mockTransferService.createTransfer.mockResolvedValue(mockTransfer);
      mockPaymentService.fundTransfer.mockResolvedValue(mockPayment);
      mockQuoteService.markQuoteUsed.mockResolvedValue();

      const result = await orchestrator.executeTransfer({
        userId: 'user-123',
        upiScanId: 'scan-123',
        sourceAmount: 10,
        sourceCurrency: 'USD',
        targetCurrency: 'INR',
        upiId: 'user@bank',
        payeeName: 'John Doe',
        reference: 'Test payment',
      });

      // Verify all 4 steps were called in order
      expect(mockQuoteService.createQuote).toHaveBeenCalledWith({
        userId: 'user-123',
        sourceAmount: 10,
        sourceCurrency: 'USD',
        targetCurrency: 'INR',
        upiScanId: 'scan-123',
      });

      expect(mockRecipientService.getOrCreateRecipient).toHaveBeenCalledWith({
        userId: 'user-123',
        upiId: 'user@bank',
        payeeName: 'John Doe',
      });

      expect(mockTransferService.createTransfer).toHaveBeenCalledWith({
        userId: 'user-123',
        quoteId: 'quote-123',
        recipientId: 'recipient-123',
        upiScanId: 'scan-123',
        reference: 'Test payment',
      });

      expect(mockPaymentService.fundTransfer).toHaveBeenCalledWith({
        transferId: 'transfer-123',
        paymentType: 'BALANCE',
      });

      expect(mockQuoteService.markQuoteUsed).toHaveBeenCalledWith(
        'quote-123',
        'transfer-123'
      );

      // Verify result
      expect(result).toEqual({
        transfer: mockTransfer,
        payment: mockPayment,
        quote: mockQuote,
        recipient: mockRecipient,
      });
    });

    test('updates UPI scan status when upiScanId is provided', async () => {
      mockQuoteService.createQuote.mockResolvedValue(mockQuote);
      mockRecipientService.getOrCreateRecipient.mockResolvedValue(mockRecipient);
      mockTransferService.createTransfer.mockResolvedValue(mockTransfer);
      mockPaymentService.fundTransfer.mockResolvedValue(mockPayment);
      mockQuoteService.markQuoteUsed.mockResolvedValue();
      mockSupabase.eq.mockResolvedValue({ error: null });

      await orchestrator.executeTransfer({
        userId: 'user-123',
        upiScanId: 'scan-123',
        sourceAmount: 10,
        sourceCurrency: 'USD',
        targetCurrency: 'INR',
        upiId: 'user@bank',
        payeeName: 'John Doe',
        reference: 'Test payment',
      });

      // Verify UPI scan was updated
      expect(mockSupabase.from).toHaveBeenCalledWith('upi_scans');
      expect(mockSupabase.update).toHaveBeenCalledWith({
        transfer_status: 'processing',
        wise_transfer_id: 'transfer-123',
      });
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'scan-123');
    });

    test('does not update UPI scan when upiScanId is not provided', async () => {
      mockQuoteService.createQuote.mockResolvedValue(mockQuote);
      mockRecipientService.getOrCreateRecipient.mockResolvedValue(mockRecipient);
      mockTransferService.createTransfer.mockResolvedValue(mockTransfer);
      mockPaymentService.fundTransfer.mockResolvedValue(mockPayment);
      mockQuoteService.markQuoteUsed.mockResolvedValue();

      await orchestrator.executeTransfer({
        userId: 'user-123',
        sourceAmount: 10,
        sourceCurrency: 'USD',
        targetCurrency: 'INR',
        upiId: 'user@bank',
        payeeName: 'John Doe',
        reference: 'Test payment',
      });

      // Verify UPI scan update was not called
      expect(mockSupabase.from).not.toHaveBeenCalledWith('upi_scans');
    });

    test('handles errors in quote creation', async () => {
      mockQuoteService.createQuote.mockRejectedValue(new Error('Quote failed'));

      await expect(
        orchestrator.executeTransfer({
          userId: 'user-123',
          sourceAmount: 10,
          sourceCurrency: 'USD',
          targetCurrency: 'INR',
          upiId: 'user@bank',
          payeeName: 'John Doe',
        })
      ).rejects.toThrow('Transfer failed: Quote failed');

      // Verify subsequent steps were not called
      expect(mockRecipientService.getOrCreateRecipient).not.toHaveBeenCalled();
      expect(mockTransferService.createTransfer).not.toHaveBeenCalled();
      expect(mockPaymentService.fundTransfer).not.toHaveBeenCalled();
    });

    test('handles errors in recipient creation', async () => {
      mockQuoteService.createQuote.mockResolvedValue(mockQuote);
      mockRecipientService.getOrCreateRecipient.mockRejectedValue(
        new Error('Recipient failed')
      );

      await expect(
        orchestrator.executeTransfer({
          userId: 'user-123',
          sourceAmount: 10,
          sourceCurrency: 'USD',
          targetCurrency: 'INR',
          upiId: 'user@bank',
          payeeName: 'John Doe',
        })
      ).rejects.toThrow('Transfer failed: Recipient failed');

      // Verify subsequent steps were not called
      expect(mockTransferService.createTransfer).not.toHaveBeenCalled();
      expect(mockPaymentService.fundTransfer).not.toHaveBeenCalled();
    });

    test('handles errors in transfer creation', async () => {
      mockQuoteService.createQuote.mockResolvedValue(mockQuote);
      mockRecipientService.getOrCreateRecipient.mockResolvedValue(mockRecipient);
      mockTransferService.createTransfer.mockRejectedValue(
        new Error('Transfer failed')
      );

      await expect(
        orchestrator.executeTransfer({
          userId: 'user-123',
          sourceAmount: 10,
          sourceCurrency: 'USD',
          targetCurrency: 'INR',
          upiId: 'user@bank',
          payeeName: 'John Doe',
        })
      ).rejects.toThrow('Transfer failed: Transfer failed');

      // Verify payment step was not called
      expect(mockPaymentService.fundTransfer).not.toHaveBeenCalled();
    });

    test('handles errors in payment funding', async () => {
      mockQuoteService.createQuote.mockResolvedValue(mockQuote);
      mockRecipientService.getOrCreateRecipient.mockResolvedValue(mockRecipient);
      mockTransferService.createTransfer.mockResolvedValue(mockTransfer);
      mockPaymentService.fundTransfer.mockRejectedValue(new Error('Payment failed'));

      await expect(
        orchestrator.executeTransfer({
          userId: 'user-123',
          sourceAmount: 10,
          sourceCurrency: 'USD',
          targetCurrency: 'INR',
          upiId: 'user@bank',
          payeeName: 'John Doe',
        })
      ).rejects.toThrow('Transfer failed: Payment failed');
    });

    test('continues even if UPI scan update fails', async () => {
      mockQuoteService.createQuote.mockResolvedValue(mockQuote);
      mockRecipientService.getOrCreateRecipient.mockResolvedValue(mockRecipient);
      mockTransferService.createTransfer.mockResolvedValue(mockTransfer);
      mockPaymentService.fundTransfer.mockResolvedValue(mockPayment);
      mockQuoteService.markQuoteUsed.mockResolvedValue();
      mockSupabase.eq.mockResolvedValue({ error: { message: 'UPI scan update failed' } });

      // Should not throw even if UPI scan update fails
      const result = await orchestrator.executeTransfer({
        userId: 'user-123',
        upiScanId: 'scan-123',
        sourceAmount: 10,
        sourceCurrency: 'USD',
        targetCurrency: 'INR',
        upiId: 'user@bank',
        payeeName: 'John Doe',
      });

      expect(result.transfer).toEqual(mockTransfer);
    });
  });

  describe('getTransferStatus', () => {
    const mockTransferData = {
      id: 'transfer-123',
      status: 'processing',
      wise_status: 'processing',
      source_amount: 10,
      source_currency: 'USD',
      target_amount: 835,
      target_currency: 'INR',
      exchange_rate: 83.5,
      reference: 'Test payment',
      is_funded: true,
      funded_at: '2026-04-11T12:00:00Z',
      created_at: '2026-04-11T11:00:00Z',
      wise_quotes: {
        fee_total: 5.0,
        fee_transferwise: 4.0,
        fee_partner: 1.0,
      },
      wise_recipients: {
        upi_id: 'user@bank',
        payee_name: 'John Doe',
      },
      wise_payments: {
        payment_type: 'BALANCE',
        wise_payment_status: 'COMPLETED',
        payment_completed_at: '2026-04-11T12:00:00Z',
      },
    };

    test('returns transfer status successfully', async () => {
      mockSupabase.single.mockResolvedValue({
        data: mockTransferData,
        error: null,
      });

      const result = await orchestrator.getTransferStatus('transfer-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('wise_transfers');
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'transfer-123');

      expect(result).toEqual({
        id: 'transfer-123',
        status: 'processing',
        wiseStatus: 'processing',
        sourceAmount: 10,
        sourceCurrency: 'USD',
        targetAmount: 835,
        targetCurrency: 'INR',
        exchangeRate: 83.5,
        feeTotal: 5.0,
        feeTransferwise: 4.0,
        feePartner: 1.0,
        totalDebit: 15.0,
        reference: 'Test payment',
        isFunded: true,
        fundedAt: '2026-04-11T12:00:00Z',
        createdAt: '2026-04-11T11:00:00Z',
        recipient: {
          upiId: 'user@bank',
          payeeName: 'John Doe',
        },
        payment: {
          type: 'BALANCE',
          status: 'COMPLETED',
          completedAt: '2026-04-11T12:00:00Z',
        },
      });
    });

    test('handles transfer not found', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      await expect(
        orchestrator.getTransferStatus('transfer-123')
      ).rejects.toThrow('Failed to get transfer status: Transfer not found');
    });

    test('handles missing payment data', async () => {
      const transferWithoutPayment = {
        ...mockTransferData,
        wise_payments: null,
      };

      mockSupabase.single.mockResolvedValue({
        data: transferWithoutPayment,
        error: null,
      });

      const result = await orchestrator.getTransferStatus('transfer-123');

      expect(result.payment).toBeNull();
    });

    test('handles missing fee data', async () => {
      const transferWithoutFees = {
        ...mockTransferData,
        wise_quotes: null,
      };

      mockSupabase.single.mockResolvedValue({
        data: transferWithoutFees,
        error: null,
      });

      const result = await orchestrator.getTransferStatus('transfer-123');

      expect(result.feeTotal).toBe(0);
      expect(result.feeTransferwise).toBe(0);
      expect(result.feePartner).toBe(0);
      expect(result.totalDebit).toBe(10);
    });
  });
});
