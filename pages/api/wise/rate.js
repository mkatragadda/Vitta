/**
 * GET /api/wise/rate
 * Get live exchange rate from Wise API using the authenticated /v1/rates endpoint.
 *
 * Query params:
 * - source: Source currency (default: 'USD')
 * - target: Target currency (default: 'INR')
 */

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { source = 'USD', target = 'INR' } = req.query;

    const isSandbox = process.env.WISE_ENVIRONMENT === 'sandbox';
    const apiToken  = isSandbox
      ? process.env.WISE_API_TOKEN_SANDBOX
      : process.env.WISE_API_TOKEN_LIVE;

    const baseURL = isSandbox
      ? 'https://api.sandbox.transferwise.tech'
      : 'https://api.transferwise.com';

    const url = `${baseURL}/v1/rates?source=${source}&target=${target}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API /wise/rate] Wise API error:', response.status, errorText);
      throw new Error(`Wise API error: ${response.status}`);
    }

    const rates = await response.json();
    // Response is an array: [{ rate, source, target, time }]
    const rateObj = Array.isArray(rates) ? rates[0] : rates;

    if (!rateObj || !rateObj.rate) {
      throw new Error('No rate returned from Wise API');
    }

    return res.status(200).json({
      success: true,
      data: {
        rate:      rateObj.rate,
        source:    rateObj.source,
        target:    rateObj.target,
        timestamp: rateObj.time || new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('[API /wise/rate] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch exchange rate',
    });
  }
}
