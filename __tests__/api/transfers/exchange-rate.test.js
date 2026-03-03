/**
 * Test: GET /api/transfers/exchange-rate
 *
 * Verifies the exchange rate endpoint:
 * - Validates query parameters
 * - Calls Chimoney API correctly
 * - Returns proper response format
 * - Handles errors gracefully
 */

import handler from '../../../pages/api/transfers/exchange-rate';
import transferService from '../../../services/transfer/transferService';
import getChimoneyConfig from '../../../config/chimoney';

// Mock dependencies
jest.mock('../../../services/transfer/transferService');
jest.mock('../../../config/chimoney');

describe('GET /api/transfers/exchange-rate', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock request
    mockReq = {
      method: 'GET',
      query: {
        amount: '500',
        source: 'USD',
        target: 'INR'
      }
    };

    // Mock response
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // Mock Chimoney config
    getChimoneyConfig.mockReturnValue({
      apiKey: 'test-key',
      environment: 'sandbox',
      baseUrl: 'https://api-v2-sandbox.chimoney.io',
      rateEndpoint: '/v0.2.4/info/exchange-rates'
    });

    // Mock transfer service
    transferService.getExchangeRate = jest.fn();
    transferService.calculateTransferAmounts = jest.fn();
  });

  describe('Method validation', () => {
    test('rejects non-GET requests', async () => {
      mockReq.method = 'POST';
      await handler(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(405);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Method not allowed'
      });
    });
  });

  describe('Parameter validation', () => {
    test('requires amount parameter', async () => {
      mockReq.query = { source: 'USD', target: 'INR' };
      await handler(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'amount parameter required'
      });
    });

    test('rejects non-numeric amount', async () => {
      mockReq.query = { amount: 'abc', source: 'USD', target: 'INR' };
      await handler(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid amount'
      });
    });

    test('rejects zero amount', async () => {
      mockReq.query = { amount: '0', source: 'USD', target: 'INR' };
      await handler(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid amount'
      });
    });

    test('rejects amount below minimum ($1)', async () => {
      mockReq.query = { amount: '0.50', source: 'USD', target: 'INR' };
      await handler(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Amount out of range'
      });
    });

    test('rejects amount above maximum ($999,999)', async () => {
      mockReq.query = { amount: '1000000', source: 'USD', target: 'INR' };
      await handler(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Amount out of range'
      });
    });
  });

  describe('Successful exchange rate fetch', () => {
    test('returns exchange rate with valid parameters', async () => {
      const mockExpiryDate = new Date(Date.now() + 30000);

      transferService.getExchangeRate.mockResolvedValue({
        rate: 83.25,
        expiresAt: mockExpiryDate,
        validForSeconds: 30
      });

      transferService.calculateTransferAmounts.mockReturnValue({
        source_amount: 500.00,
        source_currency: 'USD',
        target_amount: 41625.00,
        target_currency: 'INR',
        exchange_rate: 83.25,
        fee_amount: 2.50,
        fee_percentage: 0.5,
        final_amount: 41622.50
      });

      await handler(mockReq, mockRes);

      expect(transferService.getExchangeRate).toHaveBeenCalled();
      expect(transferService.calculateTransferAmounts).toHaveBeenCalledWith(500, 83.25, 0.5);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const callArgs = mockRes.json.mock.calls[0][0];

      expect(callArgs.success).toBe(true);
      expect(callArgs.data.exchange_rate).toBe(83.25);
      expect(callArgs.data.source_amount).toBe(500.00);
      expect(callArgs.data.target_amount).toBe(41625.00);
      expect(callArgs.data.final_amount).toBe(41622.50);
    });

    test('includes rate lock information in response', async () => {
      const mockExpiryDate = new Date(Date.now() + 30000);

      transferService.getExchangeRate.mockResolvedValue({
        rate: 83.25,
        expiresAt: mockExpiryDate,
        validForSeconds: 30
      });

      transferService.calculateTransferAmounts.mockReturnValue({
        source_amount: 500.00,
        source_currency: 'USD',
        target_amount: 41625.00,
        target_currency: 'INR',
        exchange_rate: 83.25,
        fee_amount: 2.50,
        fee_percentage: 0.5,
        final_amount: 41622.50
      });

      await handler(mockReq, mockRes);

      const callArgs = mockRes.json.mock.calls[0][0];
      expect(callArgs.data.expires_at).toBeDefined();
      expect(callArgs.data.rate_valid_for_seconds).toBe(30);
      expect(callArgs.data.is_locked).toBe(false);
    });

    test('uses default source/target currencies when not provided', async () => {
      mockReq.query = { amount: '500' };

      const mockExpiryDate = new Date(Date.now() + 30000);
      transferService.getExchangeRate.mockResolvedValue({
        rate: 83.25,
        expiresAt: mockExpiryDate,
        validForSeconds: 30
      });

      transferService.calculateTransferAmounts.mockReturnValue({
        source_amount: 500.00,
        source_currency: 'USD',
        target_amount: 41625.00,
        target_currency: 'INR',
        exchange_rate: 83.25,
        fee_amount: 2.50,
        fee_percentage: 0.5,
        final_amount: 41622.50
      });

      await handler(mockReq, mockRes);

      // Verify it called with default USD/INR currency codes
      expect(transferService.getExchangeRate).toHaveBeenCalledWith(
        expect.any(Object),
        'USD',
        'INR'
      );
    });
  });

  describe('Error handling', () => {
    test('handles Chimoney API failures', async () => {
      transferService.getExchangeRate.mockRejectedValue(
        new Error('Failed to fetch exchange rate: API error')
      );

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to fetch exchange rate'
      });
    });

    test('handles missing rate data', async () => {
      transferService.getExchangeRate.mockResolvedValue(null);

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to fetch exchange rate'
      });
    });

    test('handles amount calculation errors', async () => {
      transferService.getExchangeRate.mockResolvedValue({
        rate: 83.25,
        expiresAt: new Date(Date.now() + 30000),
        validForSeconds: 30
      });

      transferService.calculateTransferAmounts.mockImplementation(() => {
        throw new Error('Calculation error');
      });

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to fetch exchange rate'
      });
    });
  });

  describe('Response format validation', () => {
    test('response includes all required fields', async () => {
      const mockExpiryDate = new Date(Date.now() + 30000);

      transferService.getExchangeRate.mockResolvedValue({
        rate: 83.25,
        expiresAt: mockExpiryDate,
        validForSeconds: 30
      });

      transferService.calculateTransferAmounts.mockReturnValue({
        source_amount: 500.00,
        source_currency: 'USD',
        target_amount: 41625.00,
        target_currency: 'INR',
        exchange_rate: 83.25,
        fee_amount: 2.50,
        fee_percentage: 0.5,
        final_amount: 41622.50
      });

      await handler(mockReq, mockRes);

      const callArgs = mockRes.json.mock.calls[0][0];
      const data = callArgs.data;

      expect(data).toHaveProperty('exchange_rate');
      expect(data).toHaveProperty('expires_at');
      expect(data).toHaveProperty('rate_locked_until');
      expect(data).toHaveProperty('is_locked');
      expect(data).toHaveProperty('source_amount');
      expect(data).toHaveProperty('source_currency');
      expect(data).toHaveProperty('target_amount');
      expect(data).toHaveProperty('target_currency');
      expect(data).toHaveProperty('fee_amount');
      expect(data).toHaveProperty('fee_percentage');
      expect(data).toHaveProperty('final_amount');
      expect(data).toHaveProperty('rate_valid_for_seconds');
    });
  });

  describe('Different currency pairs', () => {
    test('supports USD to INR (default)', async () => {
      const mockExpiryDate = new Date(Date.now() + 30000);

      transferService.getExchangeRate.mockResolvedValue({
        rate: 83.25,
        expiresAt: mockExpiryDate,
        validForSeconds: 30
      });

      transferService.calculateTransferAmounts.mockReturnValue({
        source_amount: 500.00,
        source_currency: 'USD',
        target_amount: 41625.00,
        target_currency: 'INR',
        exchange_rate: 83.25,
        fee_amount: 2.50,
        fee_percentage: 0.5,
        final_amount: 41622.50
      });

      await handler(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    test('supports custom currency pairs', async () => {
      mockReq.query = { amount: '500', source: 'EUR', target: 'GBP' };

      const mockExpiryDate = new Date(Date.now() + 30000);

      transferService.getExchangeRate.mockResolvedValue({
        rate: 0.86,
        expiresAt: mockExpiryDate,
        validForSeconds: 30
      });

      transferService.calculateTransferAmounts.mockReturnValue({
        source_amount: 500.00,
        source_currency: 'EUR',
        target_amount: 430.00,
        target_currency: 'GBP',
        exchange_rate: 0.86,
        fee_amount: 2.50,
        fee_percentage: 0.5,
        final_amount: 427.50
      });

      await handler(mockReq, mockRes);

      // Verify it passes currency codes directly to transferService
      expect(transferService.getExchangeRate).toHaveBeenCalledWith(
        expect.any(Object),
        'EUR',
        'GBP'
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });
});
