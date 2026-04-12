/**
 * WiseClient Tests
 * Tests for Wise API HTTP client
 */

import WiseClient from '../wiseClient.js';

// Mock fetch globally
global.fetch = jest.fn();

// Mock AbortSignal.timeout
if (!global.AbortSignal.timeout) {
  global.AbortSignal.timeout = jest.fn(() => ({
    aborted: false,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }));
}

describe('WiseClient', () => {
  let client;
  const mockConfig = {
    apiKey: 'test-api-key',
    profileId: '12345',
    baseURL: 'https://api.sandbox.transferwise.tech',
    environment: 'sandbox',
  };

  beforeEach(() => {
    client = new WiseClient(mockConfig);
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    test('initializes with correct config', () => {
      expect(client.apiKey).toBe('test-api-key');
      expect(client.profileId).toBe('12345');
      expect(client.baseURL).toBe('https://api.sandbox.transferwise.tech');
      expect(client.environment).toBe('sandbox');
    });
  });

  describe('GET requests', () => {
    test('makes successful GET request', async () => {
      const mockResponse = { data: 'test' };

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await client.get('/v1/rates', { source: 'USD', target: 'INR' });

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/rates'),
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json',
          },
        })
      );
    });

    test('includes query parameters in URL', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await client.get('/v1/rates', { source: 'USD', target: 'INR' });

      const callUrl = fetch.mock.calls[0][0];
      expect(callUrl).toContain('source=USD');
      expect(callUrl).toContain('target=INR');
    });
  });

  describe('POST requests', () => {
    test('makes successful POST request', async () => {
      const mockResponse = { id: '123' };
      const postData = { amount: 100 };

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await client.post('/v1/quotes', postData);

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/quotes'),
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(postData),
        })
      );
    });
  });

  describe('Error handling', () => {
    test('throws error for 4xx responses', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            code: 'INVALID_QUOTE',
            message: 'Quote has expired',
          },
        }),
      });

      await expect(client.get('/v1/quotes')).rejects.toThrow('Quote has expired, please refresh');
    });

    test('maps known error codes to friendly messages', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            code: 'INSUFFICIENT_FUNDS',
            message: 'Not enough balance',
          },
        }),
      });

      await expect(client.get('/v1/test')).rejects.toThrow('Your Wise balance is too low');
    });

    test('retries on network errors', async () => {
      const networkError = new Error('Network error');
      networkError.message = 'fetch failed';

      fetch
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true }),
        });

      const result = await client.get('/v1/test');

      expect(result).toEqual({ success: true });
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    test('does not retry on 4xx errors', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: { code: 'BAD_REQUEST', message: 'Invalid input' },
        }),
      });

      await expect(client.get('/v1/test')).rejects.toThrow('Invalid input');
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    test('stops retrying after max attempts', async () => {
      const networkError = new Error('Network error');
      networkError.message = 'fetch failed';

      fetch.mockRejectedValue(networkError);

      await expect(client.get('/v1/test')).rejects.toThrow();
      expect(fetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe('_getHeaders', () => {
    test('returns correct headers', () => {
      const headers = client._getHeaders();

      expect(headers).toEqual({
        'Authorization': 'Bearer test-api-key',
        'Content-Type': 'application/json',
      });
    });
  });

  describe('_mapError', () => {
    test('maps error with code and message', () => {
      const error = client._mapError(400, {
        error: {
          code: 'INVALID_QUOTE',
          message: 'Quote expired',
        },
      });

      expect(error.message).toBe('Quote has expired, please refresh');
      expect(error.code).toBe('INVALID_QUOTE');
      expect(error.status).toBe(400);
    });

    test('handles unknown error codes', () => {
      const error = client._mapError(500, {
        error: {
          code: 'UNKNOWN_CODE',
          message: 'Something went wrong',
        },
      });

      expect(error.message).toBe('Something went wrong');
      expect(error.code).toBe('UNKNOWN_CODE');
    });
  });
});
