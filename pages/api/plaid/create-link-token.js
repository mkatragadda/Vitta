/**
 * Plaid API Route A: Create Link Token
 * POST /api/plaid/create-link-token
 *
 * Creates a short-lived Link token (4h expiry) for Plaid Link flow.
 * Requests both 'transactions' and 'liabilities' products to unlock full integration.
 *
 * Request:  { user_id: string }
 * Response: { link_token: string }
 */

import { plaidPost } from '../../../services/plaid/plaidApi';

export default async function handler(req, res) {
  // 1. Method guard
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 2. Body validation
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'Missing required field: user_id' });
    }

    // 3. Env var validation (fail fast)
    const requiredEnv = ['PLAID_CLIENT_ID', 'PLAID_SECRET', 'PLAID_ENV', 'PLAID_WEBHOOK_URL'];
    const missing = requiredEnv.filter(env => !process.env[env]);
    if (missing.length > 0) {
      console.error('[plaid/create-link-token] Missing env vars:', missing);
      return res.status(500).json({
        error: 'Plaid configuration incomplete',
        details: `Missing: ${missing.join(', ')}`,
      });
    }

    // 4. AbortController for 30s timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      // 5. Call Plaid API
      const linkTokenResponse = await plaidPost(
        '/link/token/create',
        {
          user: {
            client_user_id: user_id,
            name: 'Vitta User',
          },
          client_name: 'Vitta',
          products: ['transactions', 'liabilities'], // Request both products
          country_codes: ['US'],
          language: 'en',
          webhook: process.env.PLAID_WEBHOOK_URL,
        },
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      console.log('[plaid/create-link-token] Link token created successfully');

      return res.status(200).json({ link_token: linkTokenResponse.link_token });
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError.name === 'AbortError') {
        console.error('[plaid/create-link-token] Request timeout');
        return res.status(504).json({ error: 'Request timeout' });
      }

      // Forward Plaid errors with their status code
      if (fetchError.plaidError) {
        console.error('[plaid/create-link-token] Plaid error:', fetchError.plaidError);
        return res.status(fetchError.statusCode || 400).json({
          error: 'Plaid API error',
          details: fetchError.plaidError,
        });
      }

      throw fetchError;
    }
  } catch (error) {
    console.error('[plaid/create-link-token] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
}
