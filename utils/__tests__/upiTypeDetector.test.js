/**
 * Tests for UPI Type Detector
 * Verifies P2P vs P2M detection logic
 */

import { detectPaymentType, getWisePurposeCode } from '../upiTypeDetector';

describe('UPI Type Detector', () => {
  describe('detectPaymentType', () => {
    test('detects P2M payment with merchant code', () => {
      const result = detectPaymentType({
        merchantCode: '5411', // Grocery store
        amount: 250,
      });

      expect(result.paymentType).toBe('P2M');
      expect(result.transferPurpose).toContain('Business/Travel');
      expect(result.merchantCategory).toBe('Grocery Store');
      expect(result.detectionReasons.merchantCode).toBe(true);
    });

    test('detects P2M payment for restaurant', () => {
      const result = detectPaymentType({
        merchantCode: '5812', // Restaurant
        amount: 1500,
      });

      expect(result.paymentType).toBe('P2M');
      expect(result.merchantCategory).toBe('Restaurant/Dining');
    });

    test('detects P2P payment without merchant code', () => {
      const result = detectPaymentType({
        merchantCode: '', // No merchant code
        amount: 500,
      });

      expect(result.paymentType).toBe('P2P');
      expect(result.transferPurpose).toContain('family');
      expect(result.merchantCategory).toBeNull();
      expect(result.detectionReasons.merchantCode).toBe(false);
    });

    test('detects P2P payment with 0000 merchant code', () => {
      const result = detectPaymentType({
        merchantCode: '0000', // Personal payment indicator
        amount: 100,
      });

      expect(result.paymentType).toBe('P2P');
      expect(result.transferPurpose).toContain('family');
    });

    test('detects P2M payment with organization ID', () => {
      const result = detectPaymentType({
        merchantCode: '',
        amount: 2000,
        orgid: 'ORG123456', // Verified merchant
      });

      expect(result.paymentType).toBe('P2M');
      expect(result.detectionReasons.organizationId).toBe(true);
    });

    test('detects P2M payment with static QR mode and amount', () => {
      const result = detectPaymentType({
        merchantCode: '',
        amount: 150,
        mode: '02', // Static merchant QR
      });

      expect(result.paymentType).toBe('P2M');
      expect(result.detectionReasons.staticQR).toBe(true);
      expect(result.detectionReasons.preFilledAmount).toBe(true);
    });

    test('detects P2P payment with no amount (manual entry)', () => {
      const result = detectPaymentType({
        merchantCode: '',
        amount: 0, // User enters amount manually
      });

      expect(result.paymentType).toBe('P2P');
    });

    test('handles various merchant categories', () => {
      const categories = [
        { code: '5812', name: 'Restaurant/Dining' },
        { code: '5541', name: 'Service Station/Gas' },
        { code: '5814', name: 'Fast Food' },
        { code: '5999', name: 'Miscellaneous Retail' },
      ];

      categories.forEach(({ code, name }) => {
        const result = detectPaymentType({ merchantCode: code });
        expect(result.merchantCategory).toBe(name);
      });
    });

    test('returns generic "Merchant" for unknown merchant codes', () => {
      const result = detectPaymentType({
        merchantCode: '9999', // Unknown code
      });

      expect(result.paymentType).toBe('P2M');
      expect(result.merchantCategory).toBe('Merchant');
    });
  });

  describe('getWisePurposeCode', () => {
    test('returns business purpose for P2M', () => {
      const purpose = getWisePurposeCode('P2M');
      expect(purpose).toContain('Business/Travel');
    });

    test('returns family purpose for P2P', () => {
      const purpose = getWisePurposeCode('P2P');
      expect(purpose).toContain('family');
    });
  });

  describe('Real-world QR code scenarios', () => {
    test('Scenario: Scanning QR at a grocery store POS', () => {
      // Dynamic QR with amount and merchant code
      const result = detectPaymentType({
        merchantCode: '5411',
        amount: 356.75,
      });

      expect(result.paymentType).toBe('P2M');
      expect(result.transferPurpose).toContain('Business/Travel');
      console.log(`✅ Grocery Store: ${result.transferPurpose}`);
    });

    test('Scenario: Scanning QR to pay a friend', () => {
      // Personal QR, no merchant code, no pre-filled amount
      const result = detectPaymentType({
        merchantCode: '',
        amount: 0,
      });

      expect(result.paymentType).toBe('P2P');
      expect(result.transferPurpose).toContain('family');
      console.log(`✅ Friend Payment: ${result.transferPurpose}`);
    });

    test('Scenario: Scanning static QR at a restaurant', () => {
      // Static merchant QR with merchant code
      const result = detectPaymentType({
        merchantCode: '5812',
        amount: 0, // User enters amount
        mode: '02',
      });

      expect(result.paymentType).toBe('P2M');
      expect(result.merchantCategory).toBe('Restaurant/Dining');
      console.log(`✅ Restaurant: ${result.transferPurpose} (${result.merchantCategory})`);
    });

    test('Scenario: Sending money home to family', () => {
      // Personal transfer, typically no merchant code
      const result = detectPaymentType({
        merchantCode: '0000',
        amount: 5000,
      });

      expect(result.paymentType).toBe('P2P');
      console.log(`✅ Family Transfer: ${result.transferPurpose}`);
    });

    test('Scenario: Paying at a verified merchant with orgid', () => {
      // Verified merchant account
      const result = detectPaymentType({
        merchantCode: '',
        amount: 1299,
        orgid: 'MERCHANT_ORG_123',
      });

      expect(result.paymentType).toBe('P2M');
      expect(result.detectionReasons.organizationId).toBe(true);
      console.log(`✅ Verified Merchant: ${result.transferPurpose}`);
    });
  });
});
