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
      console.log('[plaid/create-link-token] Calling Plaid with client_id:', process.env.PLAID_CLIENT_ID?.substring(0, 10) + '...');
      console.log('[plaid/create-link-token] Plaid environment:', process.env.PLAID_ENV);

      // Build request body
      const requestBody = {
        user: {
          client_user_id: user_id,
        },
        client_name: 'Vitta',
        products: ['auth'], // Auth product for account verification and basic account info
        optional_products: ['liabilities', 'transactions'], // Request liabilities/transactions if available
        country_codes: ['US'],
        language: 'en',
      };

      // Add webhook only if configured
      if (process.env.PLAID_WEBHOOK_URL) {
        requestBody.webhook = process.env.PLAID_WEBHOOK_URL;
      }

      const linkTokenResponse = await plaidPost(
        '/link/token/create',
        requestBody,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      console.log('[plaid/create-link-token] Link token created successfully');
      console.log('[plaid/create-link-token] Response expiration:', linkTokenResponse.expiration);

      // Map PLAID_ENV to Plaid SDK environment names
      const envMap = {
        sandbox: 'tartan',
        development: 'development',
        production: 'production',
      };
      const sdkEnv = envMap[process.env.PLAID_ENV] || 'tartan';

      return res.status(200).json({
        link_token: linkTokenResponse.link_token,
        env: sdkEnv,
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError.name === 'AbortError') {
        console.error('[plaid/create-link-token] Request timeout (30s)');
        return res.status(504).json({ error: 'Request timeout' });
      }

      // Forward Plaid errors with their status code
      if (fetchError.plaidError) {
        console.error('[plaid/create-link-token] Plaid API error response:', {
          status: fetchError.statusCode,
          error_type: fetchError.plaidError?.error_type,
          error_code: fetchError.plaidError?.error_code,
          error_message: fetchError.plaidError?.error_message,
          display_message: fetchError.plaidError?.display_message,
          request_id: fetchError.plaidError?.request_id,
          full_response: fetchError.plaidError,
        });
        return res.status(fetchError.statusCode || 400).json({
          error: 'Plaid API error',
          error_type: fetchError.plaidError?.error_type,
          error_code: fetchError.plaidError?.error_code,
          error_message: fetchError.plaidError?.error_message,
          display_message: fetchError.plaidError?.display_message,
          request_id: fetchError.plaidError?.request_id,
          details: fetchError.plaidError,
        });
      }

      // Log non-Plaid errors with full stack trace
      console.error('[plaid/create-link-token] Unexpected error:', {
        name: fetchError.name,
        message: fetchError.message,
        status: fetchError.status,
        statusCode: fetchError.statusCode,
        stack: fetchError.stack,
      });

      throw fetchError;
    }
  } catch (error) {
    console.error('[plaid/create-link-token] Outer catch - Unexpected error:', {
      name: error.name,
      message: error.message,
      status: error.status,
      statusCode: error.statusCode,
      stack: error.stack,
      fullError: error,
    });
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      error_type: error.name,
      debug_info: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}
