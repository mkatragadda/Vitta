/**
 * Tests for GET /api/transfers/exchange-rate
 * Covers: rate validation, amount calculation
 */

import handler from '../../../pages/api/transfers/exchange-rate';

// Mock transfer service
jest.mock('../../../services/transfer/transferService', () => ({
  getExchangeRate: jest.fn(),
  calculateTransferAmounts: jest.fn(),
}));

describe('GET /api/transfers/exchange-rate', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      method: 'GET',
      query: {
        amount: '500',
        source: 'USD',
        target: 'INR',
      },
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('Method Validation', () => {
    it('should reject non-GET requests', async () => {
      mockReq.method = 'POST';
      await handler(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(405);
    });
  });

  describe('Amount Validation', () => {
    it('should return rate for valid amount', async () => {
      const transferService = require('../../../services/transfer/transferService');

      transferService.getExchangeRate.mockResolvedValue({
        rate: 83.25,
        expiresAt: new Date(Date.now() + 30000),
      });

      transferService.calculateTransferAmounts.mockReturnValue({
        source_amount: 500,
        source_currency: 'USD',
        target_amount: 41625,
        target_currency: 'INR',
        exchange_rate: 83.25,
        fee_amount: 2.5,
        fee_percentage: 0.5,
      });

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            exchange_rate: 83.25,
            source_amount: 500,
            target_amount: 41625,
          }),
        })
      );
    });

    it('should reject missing amount parameter', async () => {
      mockReq.query = {};
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        })
      );
    });

    it('should reject invalid amount', async () => {
      mockReq.query.amount = 'invalid';
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        })
      );
    });

    it('should reject zero amount', async () => {
      mockReq.query.amount = '0';
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        })
      );
    });

    it('should reject negative amount', async () => {
      mockReq.query.amount = '-500';
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        })
      );
    });

    it('should reject amount too large', async () => {
      mockReq.query.amount = '1000000';
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle service failures gracefully', async () => {
      const transferService = require('../../../services/transfer/transferService');

      transferService.getExchangeRate.mockRejectedValue(
        new Error('Service error')
      );

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        })
      );
    });

    it('should handle rate fetch returning null', async () => {
      const transferService = require('../../../services/transfer/transferService');

      transferService.getExchangeRate.mockResolvedValue(null);

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        })
      );
    });
  });

  describe('Success Response Format', () => {
    it('should return properly formatted success response', async () => {
      const transferService = require('../../../services/transfer/transferService');
      const expiryTime = new Date(Date.now() + 30000);

      transferService.getExchangeRate.mockResolvedValue({
        rate: 83.25,
        expiresAt: expiryTime,
      });

      transferService.calculateTransferAmounts.mockReturnValue({
        source_amount: 500,
        source_currency: 'USD',
        target_amount: 41625,
        target_currency: 'INR',
        exchange_rate: 83.25,
        fee_amount: 2.5,
        fee_percentage: 0.5,
      });

      mockReq.query.amount = '1000';

      await handler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            exchange_rate: expect.any(Number),
            source_amount: expect.any(Number),
            source_currency: expect.any(String),
            target_amount: expect.any(Number),
            target_currency: expect.any(String),
            fee_amount: expect.any(Number),
            fee_percentage: expect.any(Number),
          }),
        })
      );
    });
  });
});
