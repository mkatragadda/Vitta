/**
 * Chimoney Configuration
 * Loads appropriate API key and endpoint based on environment
 *
 * Sandbox: https://api-v2-sandbox.chimoney.io/v0.2.4/info/exchange-rates
 * Production: https://api.chimoney.io/v0.2.4/info/exchange-rates
 */

const getChimoneyConfig = () => {
  const env = process.env.NODE_ENV || 'development';

  // Sandbox configuration
  if (env === 'development' || env === 'staging') {
    const sandboxKey = process.env.CHIMONEY_API_KEY_SANDBOX;

    if (!sandboxKey) {
      throw new Error(
        'CHIMONEY_API_KEY_SANDBOX not found in environment variables. ' +
        'Add it to .env.local for development/testing.'
      );
    }

    return {
      apiKey: sandboxKey,
      environment: 'sandbox',
      baseUrl: 'https://api-v2-sandbox.chimoney.io',
      rateEndpoint: '/v0.2.4/info/exchange-rates',
      isSandbox: true,
    };
  }

  // Production configuration
  if (env === 'production') {
    const productionKey = process.env.CHIMONEY_API_KEY_PRODUCTION;

    if (!productionKey) {
      throw new Error(
        'CHIMONEY_API_KEY_PRODUCTION not found in environment variables. ' +
        'This is required for production deployments.'
      );
    }

    return {
      apiKey: productionKey,
      environment: 'production',
      baseUrl: 'https://api.chimoney.io',
      rateEndpoint: '/v0.2.4/info/exchange-rates',
      isSandbox: false,
    };
  }

  // Unknown environment
  throw new Error(`Unknown NODE_ENV: ${env}`);
};

export default getChimoneyConfig;
