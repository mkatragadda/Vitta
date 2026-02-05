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
  sandbox: 'https://sandbox.plaid.com',
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

  console.log('[plaidApi] Making request:', {
    endpoint,
    environment: env,
    url,
    client_id: process.env.PLAID_CLIENT_ID?.substring(0, 10) + '...',
    body_keys: Object.keys(body),
  });

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.PLAID_CLIENT_ID,
        secret: process.env.PLAID_SECRET,
        ...body,
      }),
      ...(signal && { signal }),
    });
  } catch (fetchNetworkError) {
    console.error('[plaidApi] Network error during fetch:', {
      error_name: fetchNetworkError.name,
      error_message: fetchNetworkError.message,
      error_code: fetchNetworkError.code,
      cause: fetchNetworkError.cause,
      url,
      endpoint,
    });
    throw fetchNetworkError;
  }

  console.log('[plaidApi] Response status:', response.status, 'Content-Type:', response.headers.get('content-type'));

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (parseError) {
      console.error('[plaidApi] Failed to parse error response:', parseError.message);
      errorData = { display_message: 'Unknown Plaid error' };
    }

    console.error('[plaidApi] Plaid API error response:', {
      status: response.status,
      endpoint,
      error_type: errorData.error_type,
      error_code: errorData.error_code,
      error_message: errorData.error_message,
      display_message: errorData.display_message,
      request_id: errorData.request_id,
      full_response: errorData,
    });

    const plaidError = new Error(
      errorData.display_message || `Plaid API error: ${response.status}`
    );
    plaidError.plaidError = errorData;
    plaidError.statusCode = response.status;
    throw plaidError;
  }

  const data = await response.json();
  console.log('[plaidApi] Success response received for endpoint:', endpoint);
  return data;
}

module.exports = { plaidPost };
