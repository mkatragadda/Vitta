/**
 * WiseQuoteService Tests
 * Tests for quote creation and management
 */

import WiseQuoteService from '../wiseQuoteService.js';

describe('WiseQuoteService', () => {
  let quoteService;
  let mockWiseClient;
  let mockSupabase;

  beforeEach(() => {
    mockWiseClient = {
      profileId: '12345',
      post: jest.fn(),
    };

    mockSupabase = {
      from: jest.fn(() => mockSupabase),
      insert: jest.fn(() => mockSupabase),
      select: jest.fn(() => mockSupabase),
      single: jest.fn(),
      eq: jest.fn(() => mockSupabase),
      update: jest.fn(() => mockSupabase),
    };

    quoteService = new WiseQuoteService(mockWiseClient, mockSupabase);
  });

  describe('createQuote', () => {
    const mockWiseQuote = {
      id: 'quote-123',
      targetAmount: 835.0,
      rate: 83.5,
      fee: {
        total: 5.0,
        transferwise: 4.0,
        partner: 1.0,
      },
      rateType: 'FIXED',
      expirationTime: '2026-04-12T00:00:00Z',
      rateExpiryTime: '2026-04-12T00:00:00Z',
    };

    test('creates quote successfully', async () => {
      mockWiseClient.post.mockResolvedValue(mockWiseQuote);
      mockSupabase.single.mockResolvedValue({
        data: { id: 'db-quote-123', ...mockWiseQuote },
        error: null,
      });

      const result = await quoteService.createQuote({
        userId: 'user-123',
        sourceAmount: 10,
        sourceCurrency: 'USD',
        targetCurrency: 'INR',
        upiScanId: 'scan-123',
      });

      // Verify Wise API was called correctly
      expect(mockWiseClient.post).toHaveBeenCalledWith(
        '/v3/profiles/12345/quotes',
        {
          sourceCurrency: 'USD',
          targetCurrency: 'INR',
          sourceAmount: 10,
        }
      );

      // Verify database insert
      expect(mockSupabase.from).toHaveBeenCalledWith('wise_quotes');
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          wise_quote_id: 'quote-123',
          user_id: 'user-123',
          upi_scan_id: 'scan-123',
          source_currency: 'USD',
          target_currency: 'INR',
          source_amount: 10,
          target_amount: 835.0,
          exchange_rate: 83.5,
          fee_total: 5.0,
          fee_transferwise: 4.0,
          fee_partner: 1.0,
          total_debit: 15.0, // sourceAmount + fee_total
          rate_type: 'FIXED',
          payment_type: 'BALANCE',
          expires_at: '2026-04-12T00:00:00Z',
          rate_expiry_time: '2026-04-12T00:00:00Z',
          status: 'active',
          wise_api_response: mockWiseQuote,
        })
      );
    });

    test('validates minimum amount', async () => {
      await expect(
        quoteService.createQuote({
          userId: 'user-123',
          sourceAmount: 0.5,
          sourceCurrency: 'USD',
          targetCurrency: 'INR',
        })
      ).rejects.toThrow('Minimum transfer amount is $1');
    });

    test('validates maximum amount', async () => {
      await expect(
        quoteService.createQuote({
          userId: 'user-123',
          sourceAmount: 15000,
          sourceCurrency: 'USD',
          targetCurrency: 'INR',
        })
      ).rejects.toThrow('Maximum transfer amount is $10,000');
    });

    test('handles API errors', async () => {
      mockWiseClient.post.mockRejectedValue(new Error('Wise API error'));

      await expect(
        quoteService.createQuote({
          userId: 'user-123',
          sourceAmount: 10,
          sourceCurrency: 'USD',
          targetCurrency: 'INR',
        })
      ).rejects.toThrow('Quote creation failed');
    });

    test('handles database errors', async () => {
      mockWiseClient.post.mockResolvedValue(mockWiseQuote);
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      await expect(
        quoteService.createQuote({
          userId: 'user-123',
          sourceAmount: 10,
          sourceCurrency: 'USD',
          targetCurrency: 'INR',
        })
      ).rejects.toThrow();
    });
  });

  describe('getQuote', () => {
    test('returns valid quote', async () => {
      const futureDate = new Date(Date.now() + 3600000).toISOString();

      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'quote-123',
          status: 'active',
          expires_at: futureDate,
        },
        error: null,
      });

      const result = await quoteService.getQuote('quote-123');

      expect(result.id).toBe('quote-123');
      expect(mockSupabase.from).toHaveBeenCalledWith('wise_quotes');
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'quote-123');
    });

    test('throws error for expired quote', async () => {
      const pastDate = new Date(Date.now() - 3600000).toISOString();

      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'quote-123',
          status: 'active',
          expires_at: pastDate,
        },
        error: null,
      });

      await expect(quoteService.getQuote('quote-123')).rejects.toThrow(
        'Quote has expired. Please create a new quote.'
      );

      // Verify it updated the status
      expect(mockSupabase.update).toHaveBeenCalledWith({ status: 'expired' });
    });

    test('throws error for non-active quote', async () => {
      const futureDate = new Date(Date.now() + 3600000).toISOString();

      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'quote-123',
          status: 'used',
          expires_at: futureDate,
        },
        error: null,
      });

      await expect(quoteService.getQuote('quote-123')).rejects.toThrow('Quote is used');
    });

    test('throws error when quote not found', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      await expect(quoteService.getQuote('quote-123')).rejects.toThrow('Quote not found');
    });
  });

  describe('markQuoteUsed', () => {
    test('marks quote as used', async () => {
      mockSupabase.eq.mockResolvedValue({
        error: null,
      });

      await quoteService.markQuoteUsed('quote-123', 'transfer-456');

      expect(mockSupabase.from).toHaveBeenCalledWith('wise_quotes');
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'used',
          used_for_transfer_id: 'transfer-456',
        })
      );
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'quote-123');
    });

    test('handles errors silently', async () => {
      mockSupabase.eq.mockResolvedValue({
        error: { message: 'Update failed' },
      });

      // Should not throw
      await expect(quoteService.markQuoteUsed('quote-123', 'transfer-456')).resolves.not.toThrow();
    });
  });
});
