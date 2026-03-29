/**
 * Transfer Service Tests
 * Comprehensive test coverage for smart rate logic
 * Focus: All 3 rate scenarios + error handling
 */

const transferService = require('../../../services/transfer/transferService');

describe('Transfer Service', () => {
  describe('handleRateChange - Smart Rate Logic', () => {
    // ========================================================================
    // SCENARIO 1: Rate Improves (User gets MORE money) ✅
    // ========================================================================
    describe('SCENARIO 1: Rate Improves - Accept Silently', () => {
      test('should ACCEPT SILENTLY when rate improves significantly (0.3%)', () => {
        const result = transferService.handleRateChange(83.25, 83.50, 500);

        expect(result.action).toBe('ACCEPT_SILENTLY');
        expect(result.reason).toBe('favorable');
        expect(result.benefit).toBeGreaterThan(0);
        expect(parseFloat(result.change_percent)).toBeGreaterThan(0);
      });

      test('should calculate correct benefit amount when rate improves', () => {
        const result = transferService.handleRateChange(83.25, 83.50, 500);

        const originalAmount = 500 * 83.25; // 41,625
        const newAmount = 500 * 83.50; // 41,750
        const expectedBenefit = newAmount - originalAmount; // 125

        expect(result.old_amount).toBe(originalAmount);
        expect(result.new_amount).toBe(newAmount);
        expect(result.benefit).toBe(expectedBenefit);
      });

      test('should accept silently for small improvement (0.01%)', () => {
        const result = transferService.handleRateChange(83.25, 83.2583, 500);

        expect(result.action).toBe('ACCEPT_SILENTLY');
        expect(result.reason).toBe('favorable');
      });

      test('should accept silently for large improvement (1.5%)', () => {
        const result = transferService.handleRateChange(83.25, 84.50, 500);

        expect(result.action).toBe('ACCEPT_SILENTLY');
        expect(result.reason).toBe('favorable');
      });
    });

    // ========================================================================
    // SCENARIO 2: Rate Worsens <1% (Negligible) ✅
    // ========================================================================
    describe('SCENARIO 2: Rate Worsens <1% - Accept Silently (Negligible)', () => {
      test('should ACCEPT SILENTLY when rate worsens <1% (0.5%)', () => {
        // 83.25 → 82.84 is about -0.5%
        const result = transferService.handleRateChange(83.25, 82.83, 500);

        expect(result.action).toBe('ACCEPT_SILENTLY');
        expect(result.reason).toBe('negligible_change');
        expect(result.loss).toBeGreaterThan(0);
      });

      test('should accept silently at exactly 1% decline', () => {
        // 83.25 → 82.4175 is exactly -1%
        const result = transferService.handleRateChange(83.25, 82.4175, 500);

        expect(result.action).toBe('ACCEPT_SILENTLY');
        expect(result.reason).toBe('negligible_change');
      });

      test('should calculate correct loss amount when worsens <1%', () => {
        const result = transferService.handleRateChange(83.25, 82.83, 500);

        const originalAmount = 500 * 83.25; // 41,625
        const newAmount = 500 * 82.83; // 41,415
        const expectedLoss = originalAmount - newAmount; // ~210

        expect(result.old_amount).toBe(originalAmount);
        expect(result.new_amount).toBe(newAmount);
        expect(result.loss).toBeCloseTo(expectedLoss, 0);
      });

      test('should accept silently for very small decline (0.01%)', () => {
        const result = transferService.handleRateChange(83.25, 83.2417, 500);

        expect(result.action).toBe('ACCEPT_SILENTLY');
        expect(result.reason).toBe('negligible_change');
      });
    });

    // ========================================================================
    // SCENARIO 3: Rate Worsens >1% (Alert User) ⚠️
    // ========================================================================
    describe('SCENARIO 3: Rate Worsens >1% - Alert User for Confirmation', () => {
      test('should ALERT USER when rate worsens >1% (1.4%)', () => {
        // 83.25 → 82.08 is about -1.4%
        const result = transferService.handleRateChange(83.25, 82.08, 500);

        expect(result.action).toBe('ALERT_USER');
        expect(result.reason).toBe('significant_loss');
        expect(result.requires_confirmation).toBe(true);
      });

      test('should alert user just above 1% threshold (1.01%)', () => {
        // 83.25 → 82.41 is about -1.01%
        const result = transferService.handleRateChange(83.25, 82.41, 500);

        expect(result.action).toBe('ALERT_USER');
        expect(result.requires_confirmation).toBe(true);
      });

      test('should calculate correct loss when worsens >1%', () => {
        const result = transferService.handleRateChange(83.25, 82.08, 500);

        const originalAmount = 500 * 83.25; // 41,625
        const newAmount = 500 * 82.08; // 41,040
        const expectedLoss = originalAmount - newAmount; // ~585

        expect(result.old_amount).toBe(originalAmount);
        expect(result.new_amount).toBe(newAmount);
        expect(result.loss).toBeCloseTo(expectedLoss, 0);
      });

      test('should alert for significant decline (5%)', () => {
        // 83.25 → 79.0875 is -5%
        const result = transferService.handleRateChange(83.25, 79.0875, 500);

        expect(result.action).toBe('ALERT_USER');
        expect(result.requires_confirmation).toBe(true);
      });

      test('should include change_percent in alert', () => {
        const result = transferService.handleRateChange(83.25, 82.08, 500);

        expect(result.change_percent).toBeDefined();
        // change_percent is absolute value for alert scenarios
        expect(parseFloat(result.change_percent)).toBeGreaterThan(1);
      });
    });

    // ========================================================================
    // EDGE CASES & ERROR HANDLING
    // ========================================================================
    describe('Edge Cases & Validation', () => {
      test('should throw error for missing original rate', () => {
        expect(() => transferService.handleRateChange(null, 83.25, 500)).toThrow();
      });

      test('should throw error for missing current rate', () => {
        expect(() => transferService.handleRateChange(83.25, null, 500)).toThrow();
      });

      test('should throw error for invalid source amount', () => {
        expect(() => transferService.handleRateChange(83.25, 83.50, 0)).toThrow();
      });

      test('should throw error for negative source amount', () => {
        expect(() => transferService.handleRateChange(83.25, 83.50, -100)).toThrow();
      });

      test('should handle rate staying exactly the same', () => {
        const result = transferService.handleRateChange(83.25, 83.25, 500);

        expect(result.action).toBe('ACCEPT_SILENTLY');
        expect(result.reason).toBe('negligible_change');
        expect(result.loss).toBe(0);
      });

      test('should handle very large amounts', () => {
        const result = transferService.handleRateChange(83.25, 83.50, 999999);

        expect(result.action).toBe('ACCEPT_SILENTLY');
        expect(result.benefit).toBeGreaterThan(0);
      });

      test('should handle very small amounts', () => {
        const result = transferService.handleRateChange(83.25, 83.50, 0.01);

        expect(result.action).toBe('ACCEPT_SILENTLY');
        expect(result.benefit).toBeGreaterThan(0);
      });
    });
  });

  describe('calculateTransferAmounts', () => {
    test('should calculate correct breakdown with default fee', () => {
      const amounts = transferService.calculateTransferAmounts(500, 83.25, 0.5);

      expect(amounts.source_amount).toBe(500);
      expect(amounts.source_currency).toBe('USD');
      expect(amounts.target_amount).toBe(41625);
      expect(amounts.fee_amount).toBe(2.50);
      expect(amounts.fee_percentage).toBe(0.5);
      expect(amounts.final_amount).toBe(41622.50);
    });

    test('should calculate without fee parameter', () => {
      const amounts = transferService.calculateTransferAmounts(500, 83.25);

      expect(amounts.fee_percentage).toBe(0.5);
      expect(amounts.fee_amount).toBe(2.50);
    });

    test('should handle different fee percentages', () => {
      const amounts = transferService.calculateTransferAmounts(500, 83.25, 1.0);

      expect(amounts.fee_amount).toBe(5.00);
      expect(amounts.final_amount).toBe(41620);
    });

    test('should throw error for invalid parameters', () => {
      expect(() => transferService.calculateTransferAmounts(0, 83.25)).toThrow();
      expect(() => transferService.calculateTransferAmounts(500, 0)).toThrow();
      expect(() => transferService.calculateTransferAmounts(500, 83.25, -1)).toThrow();
    });
  });

  describe('validateTransfer', () => {
    const mockTransferAccount = {
      is_active: true,
      transaction_limit: 50000,
      daily_transfer_limit: 5000,
    };

    const mockBeneficiary = {
      verification_status: 'verified',
      is_active: true,
    };

    test('should validate successful transfer', () => {
      const transfer = { source_amount: 500 };
      const result = transferService.validateTransfer(transfer, mockTransferAccount, mockBeneficiary);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject if account is not active', () => {
      const transfer = { source_amount: 500 };
      const account = { ...mockTransferAccount, is_active: false };
      const result = transferService.validateTransfer(transfer, account, mockBeneficiary);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Account is not active');
    });

    test('should reject if account is not active (alternative check)', () => {
      const transfer = { source_amount: 500 };
      const account = { ...mockTransferAccount, is_active: false };
      const result = transferService.validateTransfer(transfer, account, mockBeneficiary);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Account is not active');
    });

    test('should reject if amount exceeds transaction limit', () => {
      const transfer = { source_amount: 60000 };
      const result = transferService.validateTransfer(transfer, mockTransferAccount, mockBeneficiary);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('transaction limit'))).toBe(true);
    });

    test('should reject if amount exceeds daily limit', () => {
      const transfer = { source_amount: 10000 };
      const result = transferService.validateTransfer(transfer, mockTransferAccount, mockBeneficiary);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('daily limit'))).toBe(true);
    });

    test('should reject if beneficiary not verified', () => {
      const transfer = { source_amount: 500 };
      const beneficiary = { ...mockBeneficiary, verification_status: 'pending' };
      const result = transferService.validateTransfer(transfer, mockTransferAccount, beneficiary);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Beneficiary is not verified');
    });

    test('should reject if amount too small', () => {
      const transfer = { source_amount: 0.50 };
      const result = transferService.validateTransfer(transfer, mockTransferAccount, mockBeneficiary);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Transfer amount must be at least $1');
    });

    test('should reject if amount too large', () => {
      const transfer = { source_amount: 9999999 };
      const result = transferService.validateTransfer(transfer, mockTransferAccount, mockBeneficiary);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Transfer amount exceeds maximum limit');
    });
  });

  describe('formatRateChangeMessage', () => {
    test('should format improvement message', () => {
      const decision = { benefit: 125 };
      const message = transferService.formatRateChangeMessage(decision, 83.50, 83.25);

      expect(message).toContain('Great news');
      expect(message).toContain('improved');
      expect(message).toContain('125');
    });

    test('should format decline message', () => {
      const decision = { loss: 62 };
      const message = transferService.formatRateChangeMessage(decision, 82.50, 83.25);

      expect(message).toContain('changed');
      expect(message).toContain('62');
    });

    test('should format same rate message', () => {
      const decision = {};
      const message = transferService.formatRateChangeMessage(decision, 83.25, 83.25);

      expect(message).toContain('remained the same');
    });
  });

  describe('createStatusLogEntry', () => {
    test('should create status log entry', () => {
      const transfer = { id: 'transfer-123' };
      const entry = transferService.createStatusLogEntry(
        transfer,
        'pending',
        'processing',
        'User confirmed transfer',
        { amount: 500 }
      );

      expect(entry.transfer_id).toBe('transfer-123');
      expect(entry.old_status).toBe('pending');
      expect(entry.new_status).toBe('processing');
      expect(entry.reason).toBe('User confirmed transfer');
      expect(entry.metadata.amount).toBe(500);
    });
  });
});
