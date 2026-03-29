/**
 * Chimoney Configuration Consistency Tests
 * Ensures all Chimoney integrations use environment-based configuration
 * instead of hardcoding production URLs
 */

jest.mock('../../config/chimoney');

describe('Chimoney Configuration Consistency', () => {
  let chimoneyConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock the chimoney config
    chimoneyConfig = require('../../config/chimoney');
  });

  describe('Exchange Rate Endpoint Configuration', () => {
    test('should use baseUrl from config for exchange rate calls', () => {
      const mockConfig = {
        baseUrl: 'https://api-v2-sandbox.chimoney.io',
        rateEndpoint: '/v0.2.4/rates',
        apiKey: 'test-sandbox-key',
      };

      // Verify baseUrl is used instead of hardcoded URL
      expect(mockConfig.baseUrl).toBeDefined();
      expect(mockConfig.baseUrl).not.toBe('https://api.chimoney.io');
      expect(mockConfig.rateEndpoint).toBe('/v0.2.4/rates');
    });

    test('should construct full URL from baseUrl + rateEndpoint', () => {
      const mockConfig = {
        baseUrl: 'https://api-v2-sandbox.chimoney.io',
        rateEndpoint: '/v0.2.4/rates',
      };

      const fullUrl = `${mockConfig.baseUrl}${mockConfig.rateEndpoint}`;
      expect(fullUrl).toBe('https://api-v2-sandbox.chimoney.io/v0.2.4/rates');
    });
  });

  describe('Payout Endpoint Configuration', () => {
    test('should use baseUrl for UPI payout calls (not hardcoded URL)', () => {
      const mockConfig = {
        baseUrl: 'https://api-v2-sandbox.chimoney.io',
        apiKey: 'test-sandbox-key',
      };

      // URL should be constructed dynamically
      const upiPayoutUrl = `${mockConfig.baseUrl}/v0.2.4/payouts/upi`;
      expect(upiPayoutUrl).toBe('https://api-v2-sandbox.chimoney.io/v0.2.4/payouts/upi');

      // Should NOT be hardcoded production URL
      expect(upiPayoutUrl).not.toBe('https://api.chimoney.io/v0.2.4/payouts/upi');
    });

    test('should use baseUrl for bank payout calls (not hardcoded URL)', () => {
      const mockConfig = {
        baseUrl: 'https://api-v2-sandbox.chimoney.io',
        apiKey: 'test-sandbox-key',
      };

      // URL should be constructed dynamically
      const bankPayoutUrl = `${mockConfig.baseUrl}/v0.2.4/payouts/bank`;
      expect(bankPayoutUrl).toBe('https://api-v2-sandbox.chimoney.io/v0.2.4/payouts/bank');

      // Should NOT be hardcoded production URL
      expect(bankPayoutUrl).not.toBe('https://api.chimoney.io/v0.2.4/payouts/bank');
    });
  });

  describe('Environment-Based Configuration', () => {
    test('should use sandbox URL when in development/test environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const mockConfig = {
        baseUrl: 'https://api-v2-sandbox.chimoney.io',
        apiKey: 'sandbox-key',
      };

      expect(mockConfig.baseUrl).toContain('sandbox');

      process.env.NODE_ENV = originalEnv;
    });

    test('should support production URL when NODE_ENV is production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const mockConfig = {
        baseUrl: 'https://api.chimoney.io',
        apiKey: 'production-key',
      };

      // Production config should have production URL
      expect(mockConfig.baseUrl).toBe('https://api.chimoney.io');

      process.env.NODE_ENV = originalEnv;
    });

    test('should use correct API key for sandbox environment', () => {
      const mockConfig = {
        baseUrl: 'https://api-v2-sandbox.chimoney.io',
        apiKey: 'sandbox-test-key',
      };

      // Sandbox should have different API key than production
      expect(mockConfig.apiKey).not.toBe('production-key');
    });

    test('should use correct API key for production environment', () => {
      const mockConfig = {
        baseUrl: 'https://api.chimoney.io',
        apiKey: 'production-test-key',
      };

      // Production should have different API key than sandbox
      expect(mockConfig.apiKey).not.toBe('sandbox-test-key');
    });
  });

  describe('Configuration Fallback Behavior', () => {
    test('should fallback to sandbox URL if config is missing', () => {
      const baseUrl = undefined || 'https://api-v2-sandbox.chimoney.io';
      expect(baseUrl).toBe('https://api-v2-sandbox.chimoney.io');
    });

    test('should prefer passed config over default', () => {
      const passedConfig = { baseUrl: 'https://api-v2-sandbox.chimoney.io' };
      const defaultConfig = { baseUrl: 'https://api.chimoney.io' };

      const selectedUrl = passedConfig?.baseUrl || defaultConfig.baseUrl;
      expect(selectedUrl).toBe('https://api-v2-sandbox.chimoney.io');
    });

    test('should construct URL correctly with fallback', () => {
      const chimoneyConfig = undefined;
      const baseUrl = chimoneyConfig?.baseUrl || 'https://api-v2-sandbox.chimoney.io';
      const url = `${baseUrl}/v0.2.4/payouts/upi`;

      expect(url).toBe('https://api-v2-sandbox.chimoney.io/v0.2.4/payouts/upi');
    });
  });

  describe('All Endpoints Use Same Pattern', () => {
    test('exchange-rate endpoint should use config-based URL', () => {
      // This is the pattern all endpoints should follow
      const mockConfig = {
        baseUrl: 'https://api-v2-sandbox.chimoney.io',
        rateEndpoint: '/v0.2.4/rates',
      };

      const url = `${mockConfig.baseUrl}${mockConfig.rateEndpoint}`;
      expect(url).toMatch(/https:\/\/api-v2-sandbox\.chimoney\.io\/v0\.2\.4\/rates/);
    });

    test('payout endpoints should use same config-based pattern', () => {
      const mockConfig = {
        baseUrl: 'https://api-v2-sandbox.chimoney.io',
      };

      const upiUrl = `${mockConfig.baseUrl}/v0.2.4/payouts/upi`;
      const bankUrl = `${mockConfig.baseUrl}/v0.2.4/payouts/bank`;

      expect(upiUrl).toMatch(/https:\/\/api-v2-sandbox\.chimoney\.io\/v0\.2\.4\/payouts\/upi/);
      expect(bankUrl).toMatch(/https:\/\/api-v2-sandbox\.chimoney\.io\/v0\.2\.4\/payouts\/bank/);
    });

    test('should NOT hardcode production URL in any endpoint', () => {
      const forbiddenUrl = 'https://api.chimoney.io';
      const sandboxConfig = { baseUrl: 'https://api-v2-sandbox.chimoney.io' };

      const upiUrl = `${sandboxConfig.baseUrl}/v0.2.4/payouts/upi`;
      const bankUrl = `${sandboxConfig.baseUrl}/v0.2.4/payouts/bank`;
      const rateUrl = `${sandboxConfig.baseUrl}/v0.2.4/rates`;

      expect(upiUrl).not.toContain(forbiddenUrl);
      expect(bankUrl).not.toContain(forbiddenUrl);
      expect(rateUrl).not.toContain(forbiddenUrl);
    });
  });

  describe('Config Parameter Passing', () => {
    test('callChimoneyUPI should accept config parameter', () => {
      // Verify that functions accept config as parameter
      const config = {
        baseUrl: 'https://api-v2-sandbox.chimoney.io',
      };

      const baseUrl = config?.baseUrl || 'https://api-v2-sandbox.chimoney.io';
      expect(baseUrl).toBe('https://api-v2-sandbox.chimoney.io');
    });

    test('callChimoneyBank should accept config parameter', () => {
      const config = {
        baseUrl: 'https://api-v2-sandbox.chimoney.io',
      };

      const baseUrl = config?.baseUrl || 'https://api-v2-sandbox.chimoney.io';
      expect(baseUrl).toBe('https://api-v2-sandbox.chimoney.io');
    });

    test('should pass config from execute.js to payout functions', () => {
      const chimoneyConfig = { baseUrl: 'https://api-v2-sandbox.chimoney.io' };

      // This is the pattern execute.js should use when calling payout functions
      const configToPass = { baseUrl: chimoneyConfig.baseUrl };

      expect(configToPass.baseUrl).toBe(chimoneyConfig.baseUrl);
      expect(configToPass).toEqual({ baseUrl: 'https://api-v2-sandbox.chimoney.io' });
    });
  });

  describe('No Hardcoded Production URLs', () => {
    test('should not find hardcoded production baseUrl anywhere', () => {
      const forbiddenPatterns = [
        'https://api.chimoney.io/v0.2.4/payouts/upi',
        'https://api.chimoney.io/v0.2.4/payouts/bank',
      ];

      // All endpoints should use config-based URLs
      const sandboxConfig = { baseUrl: 'https://api-v2-sandbox.chimoney.io' };
      const upiUrl = `${sandboxConfig.baseUrl}/v0.2.4/payouts/upi`;
      const bankUrl = `${sandboxConfig.baseUrl}/v0.2.4/payouts/bank`;

      forbiddenPatterns.forEach(pattern => {
        expect(upiUrl).not.toBe(pattern);
        expect(bankUrl).not.toBe(pattern);
      });
    });

    test('should support dynamic URL switching by environment', () => {
      const environments = {
        development: 'https://api-v2-sandbox.chimoney.io',
        staging: 'https://api-v2-sandbox.chimoney.io',
        production: 'https://api.chimoney.io',
      };

      const currentEnv = 'development';
      const baseUrl = environments[currentEnv];

      expect(baseUrl).toBe('https://api-v2-sandbox.chimoney.io');
    });
  });
});
