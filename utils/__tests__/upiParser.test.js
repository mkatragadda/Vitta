/**
 * UPI Parser Tests
 * Tests for UPI QR code parsing utility
 */

import { parseUPIQR, isValidUPI } from '../upiParser';

describe('upiParser', () => {
  describe('parseUPIQR', () => {
    test('parses valid UPI QR code with all fields', () => {
      const qrData = 'upi://pay?pa=merchant@paytm&pn=Taj+Hotel&am=500&cu=INR&tn=Room+booking&mc=1234';

      const result = parseUPIQR(qrData);

      expect(result).toEqual({
        upiId: 'merchant@paytm',
        payeeName: 'Taj Hotel',
        amount: 500,
        currency: 'INR',
        note: 'Room booking',
        merchantCode: '1234',
      });
    });

    test('parses minimal valid UPI QR code', () => {
      const qrData = 'upi://pay?pa=test@bank';

      const result = parseUPIQR(qrData);

      expect(result).toEqual({
        upiId: 'test@bank',
        payeeName: '',
        amount: 0,
        currency: 'INR',
        note: '',
        merchantCode: '',
      });
    });

    test('handles special characters in payee name', () => {
      const qrData = 'upi://pay?pa=merchant@bank&pn=R%26D+Foods';

      const result = parseUPIQR(qrData);

      expect(result.payeeName).toBe('R&D Foods');
    });

    test('returns null for non-UPI protocol', () => {
      const qrData = 'http://example.com';

      const result = parseUPIQR(qrData);

      expect(result).toBeNull();
    });

    test('returns null for missing UPI ID', () => {
      const qrData = 'upi://pay?am=100';

      const result = parseUPIQR(qrData);

      expect(result).toBeNull();
    });

    test('returns null for invalid UPI ID format', () => {
      const qrData = 'upi://pay?pa=invalid-upi-id';

      const result = parseUPIQR(qrData);

      expect(result).toBeNull();
    });

    test('returns null for invalid QR data', () => {
      const qrData = 'not-a-url';

      const result = parseUPIQR(qrData);

      expect(result).toBeNull();
    });

    test('handles missing optional fields', () => {
      const qrData = 'upi://pay?pa=merchant@bank&am=100';

      const result = parseUPIQR(qrData);

      expect(result).toMatchObject({
        upiId: 'merchant@bank',
        amount: 100,
        payeeName: '',
        note: '',
        merchantCode: '',
      });
    });

    test('defaults currency to INR if missing', () => {
      const qrData = 'upi://pay?pa=test@bank';

      const result = parseUPIQR(qrData);

      expect(result.currency).toBe('INR');
    });

    test('parses amount as float', () => {
      const qrData = 'upi://pay?pa=merchant@bank&am=123.45';

      const result = parseUPIQR(qrData);

      expect(result.amount).toBe(123.45);
    });
  });

  describe('isValidUPI', () => {
    test('validates correct UPI ID', () => {
      expect(isValidUPI('merchant@paytm')).toBe(true);
      expect(isValidUPI('test@bank')).toBe(true);
      expect(isValidUPI('user.name@provider')).toBe(true);
      expect(isValidUPI('test-123@bank')).toBe(true);
    });

    test('rejects invalid UPI IDs', () => {
      expect(isValidUPI('invalid')).toBe(false);
      expect(isValidUPI('@bank')).toBe(false);
      expect(isValidUPI('user@')).toBe(false);
      expect(isValidUPI('')).toBe(false);
      expect(isValidUPI('user @bank')).toBe(false);
    });
  });
});
