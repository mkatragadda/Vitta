/**
 * Plaid API — Shared fetch wrapper
 *
 * Thin wrapper around fetch that handles:
 * - URL construction based on PLAID_ENV
 * - Client credentials injection (client_id + secret)
 * - Error extraction and structured error throwing
 * - Support for AbortController signals (30s timeout)
 *
 * All server-side Plaid API calls use this wrapper (Routes A, B, C, E, F + webhook handler).
 */

const PLAID_URLS = {
  sandbox: 'https://sandbox.plaidapi.com',
  development: 'https://development.plaidapi.com',
  production: 'https://api.plaidapi.com',
};

/**
 * Make a POST request to Plaid API.
 * @param {string} endpoint - API endpoint (e.g., '/link/token/create')
 * @param {Object} body - Request body (client_id and secret are injected automatically)
 * @param {Object} options - Optional config
 * @param {AbortSignal} options.signal - AbortSignal from AbortController (for timeouts)
 * @returns {Promise<Object>} Parsed JSON response from Plaid
 * @throws {Error} With plaidError and statusCode properties if Plaid returns an error
 */
async function plaidPost(endpoint, body, { signal } = {}) {
  const env = process.env.PLAID_ENV || 'sandbox';
  const baseUrl = PLAID_URLS[env];

  if (!baseUrl) {
    throw new Error(`[plaidApi] Unknown PLAID_ENV: ${env}`);
  }

  const url = `${baseUrl}${endpoint}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.PLAID_CLIENT_ID,
      secret: process.env.PLAID_SECRET,
      ...body,
    }),
    ...(signal && { signal }),
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (parseError) {
      errorData = { display_message: 'Unknown Plaid error' };
    }

    const plaidError = new Error(
      errorData.display_message || `Plaid API error: ${response.status}`
    );
    plaidError.plaidError = errorData;
    plaidError.statusCode = response.status;
    throw plaidError;
  }

  return response.json();
}

module.exports = { plaidPost };
