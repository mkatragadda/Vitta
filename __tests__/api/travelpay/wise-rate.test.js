/**
 * Tests for GET /api/wise/rate
 *
 * This route fetches the live USD→INR rate from Wise and is called on every
 * HomeScreen mount. If it returns 500, the live rate pill stays blank.
 *
 * Root cause of past 500s: stale .next webpack cache (use `npm run dev:clean`).
 * These tests validate the handler logic independently of the server cache.
 */

/** @jest-environment node */

// Must mock fetch BEFORE importing the handler (handler runs createClient at module level)
const mockFetch = jest.fn();
global.fetch = mockFetch;

import handler from '../../../pages/api/wise/rate';

// ─── helpers ────────────────────────────────────────────────────────────────

function makeRes() {
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}

function wiseOkResponse(rate = 94.45) {
  return {
    ok: true,
    json: async () => ({ rate, sourceCurrency: 'USD', targetCurrency: 'INR' }),
  };
}

function wiseErrorResponse(status = 503) {
  return {
    ok: false,
    status,
    text: async () => 'Service Unavailable',
  };
}

// ─── tests ──────────────────────────────────────────────────────────────────

describe('GET /api/wise/rate', () => {
  let req, res;

  beforeEach(() => {
    req = { method: 'GET', query: { source: 'USD', target: 'INR' } };
    res = makeRes();
    mockFetch.mockReset();
  });

  // ── Method guard ──────────────────────────────────────────────────────────

  test('returns 405 for POST', async () => {
    req.method = 'POST';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  test('returns 405 for DELETE', async () => {
    req.method = 'DELETE';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  // ── Happy path ────────────────────────────────────────────────────────────

  test('returns rate and currencies on Wise API success', async () => {
    mockFetch.mockResolvedValueOnce(wiseOkResponse(94.45));

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        rate: 94.45,
        source: 'USD',
        target: 'INR',
        timestamp: expect.any(String),
      },
    });
  });

  test('forwards custom source/target currencies to Wise', async () => {
    req.query = { source: 'EUR', target: 'USD' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ rate: 1.08, sourceCurrency: 'EUR', targetCurrency: 'USD' }),
    });

    await handler(req, res);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({ sourceCurrency: 'EUR', targetCurrency: 'USD', sourceAmount: 1 }),
      })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('defaults to USD/INR when query params omitted', async () => {
    req.query = {};
    mockFetch.mockResolvedValueOnce(wiseOkResponse(83.5));

    await handler(req, res);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({ sourceCurrency: 'USD', targetCurrency: 'INR', sourceAmount: 1 }),
      })
    );
  });

  // ── Wise API errors ───────────────────────────────────────────────────────

  test('returns 500 when Wise API returns non-2xx', async () => {
    mockFetch.mockResolvedValueOnce(wiseErrorResponse(503));

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: expect.stringContaining('503') })
    );
  });

  test('returns 500 when network fetch throws (ECONNREFUSED)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
  });

  test('returns 500 when Wise returns invalid JSON', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => { throw new SyntaxError('Unexpected token'); },
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  // ── Response shape contract ───────────────────────────────────────────────

  test('response timestamp is a valid ISO string', async () => {
    mockFetch.mockResolvedValueOnce(wiseOkResponse(94.0));

    await handler(req, res);

    const [[{ data }]] = res.json.mock.calls;
    expect(() => new Date(data.timestamp)).not.toThrow();
    expect(new Date(data.timestamp).getFullYear()).toBeGreaterThan(2020);
  });
});
