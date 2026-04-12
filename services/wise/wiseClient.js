/**
 * Wise API HTTP Client
 * Low-level HTTP communication with retry logic
 */

class WiseClient {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.profileId = config.profileId;
    this.baseURL = config.baseURL;
    this.environment = config.environment;

    console.log('[WiseClient] Initialized:', {
      environment: this.environment,
      baseURL: this.baseURL,
      profileId: this.profileId,
    });
  }

  /**
   * GET request with retry logic
   */
  async get(path, params = {}) {
    const url = new URL(path, this.baseURL);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

    return this._fetchWithRetry(url.toString(), {
      method: 'GET',
      headers: this._getHeaders(),
    });
  }

  /**
   * POST request with retry logic
   */
  async post(path, data = {}) {
    const url = `${this.baseURL}${path}`;

    return this._fetchWithRetry(url, {
      method: 'POST',
      headers: this._getHeaders(),
      body: JSON.stringify(data),
    });
  }

  /**
   * Private: Build headers
   */
  _getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Private: Fetch with exponential backoff retry
   */
  async _fetchWithRetry(url, options, attempt = 1, maxAttempts = 3) {
    try {
      console.log(`[WiseClient] Request [${attempt}/${maxAttempts}]:`, {
        method: options.method,
        url,
      });

      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(30000), // 30s timeout
      });

      // Parse response
      const data = await response.json();

      if (!response.ok) {
        throw this._mapError(response.status, data);
      }

      console.log('[WiseClient] Success:', {
        status: response.status,
        data: JSON.stringify(data).substring(0, 200) + '...',
      });

      return data;

    } catch (error) {
      console.error(`[WiseClient] Error [${attempt}/${maxAttempts}]:`, error.message);

      // Retry on network errors or 5xx (but not 4xx)
      const isRetryable = error.name === 'AbortError' ||
                          error.code?.startsWith('5') ||
                          error.message?.includes('fetch');

      if (isRetryable && attempt < maxAttempts) {
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        console.log(`[WiseClient] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this._fetchWithRetry(url, options, attempt + 1, maxAttempts);
      }

      throw error;
    }
  }

  /**
   * Private: Map Wise API errors to friendly messages
   */
  _mapError(status, data) {
    const errorCode = data.error?.code || 'UNKNOWN_ERROR';
    const errorMessage = data.error?.message || data.message || 'Unknown error';

    const errorMap = {
      'INSUFFICIENT_FUNDS': 'Your Wise balance is too low',
      'INVALID_QUOTE': 'Quote has expired, please refresh',
      'DUPLICATE_TRANSFER': 'This transfer was already processed',
      'RECIPIENT_NOT_FOUND': 'Recipient not configured',
      'RATE_LIMIT_EXCEEDED': 'Too many requests, please wait',
    };

    const friendlyMessage = errorMap[errorCode] || errorMessage;

    const error = new Error(friendlyMessage);
    error.code = errorCode;
    error.status = status;
    error.details = data;

    return error;
  }
}

export default WiseClient;
