/**
 * GET /api/transfers/exchange-rate
 * Fetch current exchange rate from Chimoney with 30-second soft lock
 */

import transferService from '../../../services/transfer/transferService';
import getChimoneyConfig from '../../../config/chimoney';

// Create Chimoney client with environment-appropriate API key
const createChimoneyClient = () => {
  const config = getChimoneyConfig();

  return {
    rate: {
      get: async (options) => {
        try {
          const url = `${config.baseUrl}${config.rateEndpoint}`;
          console.log('[exchange-rate] Sending request to Chimoney:', {
            url,
            environment: config.environment,
            apiKeyPrefix: config.apiKey.substring(0, 10) + '...',
          });

          const response = await fetch(url, {
            headers: {
              'X-API-KEY': config.apiKey,
            },
          });

          console.log('[exchange-rate] Chimoney response received:', {
            status: response.status,
            statusText: response.statusText,
          });

          if (!response.ok) {
            console.error('[exchange-rate] HTTP error from Chimoney:', {
              status: response.status,
              statusText: response.statusText,
            });
            return { success: false, error: { message: `HTTP ${response.status}` } };
          }

          const data = await response.json();
          console.log('[exchange-rate] Chimoney response data (FULL):', JSON.stringify(data, null, 2));

          return { success: true, data: data.data || data };
        } catch (error) {
          console.error('[exchange-rate] Chimoney API error:', error);
          return { success: false, error: { message: error.message } };
        }
      },
    },
  };
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { amount, source = 'USD', target = 'INR' } = req.query;

    // Validate amount
    if (!amount) {
      return res.status(400).json({
        success: false,
        error: 'amount parameter required',
      });
    }

    const sourceAmount = parseFloat(amount);
    if (isNaN(sourceAmount) || sourceAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount',
      });
    }

    if (sourceAmount < 1 || sourceAmount > 999999) {
      return res.status(400).json({
        success: false,
        error: 'Amount out of range',
      });
    }

    // Fetch rate from Chimoney
    // Note: Despite parameter names sourceCountry/targetCountry, the function actually expects
    // currency codes (USD, INR) which it concatenates to form rate keys like 'USDINR'
    const chimoney = createChimoneyClient();
    const rateData = await transferService.getExchangeRate(chimoney, source, target);

    if (!rateData) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch exchange rate',
      });
    }

    // Calculate amounts
    const amounts = transferService.calculateTransferAmounts(
      sourceAmount,
      rateData.rate,
      0.5 // 0.5% fee
    );

    return res.status(200).json({
      success: true,
      data: {
        exchange_rate: amounts.exchange_rate,
        expires_at: rateData.expiresAt.toISOString(),
        rate_locked_until: rateData.expiresAt.toISOString(),
        is_locked: false,
        source_amount: amounts.source_amount,
        source_currency: amounts.source_currency,
        target_amount: amounts.target_amount,
        target_currency: amounts.target_currency,
        fee_amount: amounts.fee_amount,
        fee_percentage: amounts.fee_percentage,
        final_amount: amounts.final_amount,
        rate_valid_for_seconds: rateData.validForSeconds,
      },
    });
  } catch (error) {
    console.error('[exchange-rate] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch exchange rate',
    });
  }
}
