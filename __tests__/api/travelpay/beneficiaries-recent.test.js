/**
 * Tests for GET /api/beneficiaries/recent
 *
 * Returns up to 5 deduplicated recent payees for the HomeScreen.
 * If this returns 500, the "Recent payees" section shows empty on login.
 *
 * Root cause of past 500s: stale .next webpack cache (use `npm run dev:clean`).
 */

/** @jest-environment node */

// ─── Supabase mock ───────────────────────────────────────────────────────────
// Must be defined before handler import — Jest hoists jest.mock() calls.

let mockQueryResult = { data: null, error: null };

const mockQueryChain = {
  select: jest.fn().mockReturnThis(),
  eq:     jest.fn().mockReturnThis(),
  order:  jest.fn().mockReturnThis(),
  limit:  jest.fn().mockImplementation(() => Promise.resolve(mockQueryResult)),
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => mockQueryChain),
  })),
}));

import handler from '../../../pages/api/beneficiaries/recent';

// ─── helpers ────────────────────────────────────────────────────────────────

function makeRes() {
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}

function makeReq(userId = 'user-123') {
  return { method: 'GET', headers: { 'x-user-id': userId } };
}

function launchRow(overrides = {}) {
  return {
    recipient_upi_id:  'test@upi',
    recipient_name:    'Test Payee',
    amount_inr:        '850.00',
    usd_equivalent:    '10.16',
    launched_at:       '2026-06-17T10:00:00Z',
    rail:              'gpay',
    ...overrides,
  };
}

// ─── tests ──────────────────────────────────────────────────────────────────

describe('GET /api/beneficiaries/recent', () => {
  let res;

  beforeEach(() => {
    res = makeRes();
    // Reset mock chain call tracking
    Object.values(mockQueryChain).forEach(fn => fn.mockClear());
    mockQueryChain.select.mockReturnThis();
    mockQueryChain.eq.mockReturnThis();
    mockQueryChain.order.mockReturnThis();
    mockQueryChain.limit.mockImplementation(() => Promise.resolve(mockQueryResult));
  });

  // ── Auth guard ────────────────────────────────────────────────────────────

  test('returns 401 when x-user-id header is missing', async () => {
    const req = { method: 'GET', headers: {} };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: expect.any(String) })
    );
  });

  // ── Method guard ──────────────────────────────────────────────────────────

  test('returns 405 for POST', async () => {
    const req = { method: 'POST', headers: { 'x-user-id': 'user-123' } };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  // ── Happy path ────────────────────────────────────────────────────────────

  test('returns empty array when user has no payments', async () => {
    mockQueryResult = { data: [], error: null };

    await handler(makeReq(), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: [] });
  });

  test('returns empty array when data is null (supabase empty result)', async () => {
    mockQueryResult = { data: null, error: null };

    await handler(makeReq(), res);

    expect(res.json).toHaveBeenCalledWith({ success: true, data: [] });
  });

  test('returns correctly shaped payee objects', async () => {
    mockQueryResult = {
      data: [launchRow({ recipient_upi_id: 'chai@upi', recipient_name: 'Chai Point', rail: 'gpay' })],
      error: null,
    };

    await handler(makeReq(), res);

    const [[{ data }]] = res.json.mock.calls;
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({
      upiId:     'chai@upi',
      name:      'Chai Point',
      amountInr: 850,
      amountUsd: 10.16,
      upiType:   'p2m',  // gpay rail → p2m
      rail:      'gpay',
      lastPaidAt: expect.any(String),
    });
  });

  test('classifies wise rail as p2p', async () => {
    mockQueryResult = {
      data: [launchRow({ recipient_upi_id: 'friend@upi', rail: 'wise' })],
      error: null,
    };

    await handler(makeReq(), res);

    const [[{ data }]] = res.json.mock.calls;
    expect(data[0].upiType).toBe('p2p');
  });

  test('classifies gpay/phonepe/paytm rails as p2m', async () => {
    for (const rail of ['gpay', 'phonepe', 'paytm', 'bank']) {
      mockQueryResult = { data: [launchRow({ recipient_upi_id: `m@${rail}`, rail })], error: null };
      const localRes = makeRes();
      await handler(makeReq(), localRes);
      const [[{ data }]] = localRes.json.mock.calls;
      expect(data[0].upiType).toBe('p2m');
    }
  });

  // ── Deduplication ─────────────────────────────────────────────────────────

  test('deduplicates by UPI ID — keeps most recent occurrence', async () => {
    mockQueryResult = {
      data: [
        launchRow({ recipient_upi_id: 'same@upi', amount_inr: '200', launched_at: '2026-06-20T00:00:00Z' }),
        launchRow({ recipient_upi_id: 'same@upi', amount_inr: '100', launched_at: '2026-06-17T00:00:00Z' }),
      ],
      error: null,
    };

    await handler(makeReq(), res);

    const [[{ data }]] = res.json.mock.calls;
    expect(data).toHaveLength(1);
    expect(data[0].amountInr).toBe(200); // first (most recent) wins
  });

  test('deduplication is case-insensitive on UPI ID', async () => {
    mockQueryResult = {
      data: [
        launchRow({ recipient_upi_id: 'Chai@UPI' }),
        launchRow({ recipient_upi_id: 'chai@upi' }),
      ],
      error: null,
    };

    await handler(makeReq(), res);

    const [[{ data }]] = res.json.mock.calls;
    expect(data).toHaveLength(1);
  });

  test('returns at most 5 distinct payees', async () => {
    const rows = Array.from({ length: 10 }, (_, i) =>
      launchRow({ recipient_upi_id: `payee${i}@upi`, recipient_name: `Payee ${i}` })
    );
    mockQueryResult = { data: rows, error: null };

    await handler(makeReq(), res);

    const [[{ data }]] = res.json.mock.calls;
    expect(data).toHaveLength(5);
  });

  test('skips rows with empty recipient_upi_id', async () => {
    mockQueryResult = {
      data: [
        launchRow({ recipient_upi_id: '' }),
        launchRow({ recipient_upi_id: 'valid@upi', recipient_name: 'Valid' }),
      ],
      error: null,
    };

    await handler(makeReq(), res);

    const [[{ data }]] = res.json.mock.calls;
    expect(data).toHaveLength(1);
    expect(data[0].upiId).toBe('valid@upi');
  });

  // ── Numeric coercion ──────────────────────────────────────────────────────

  test('coerces string amounts to numbers', async () => {
    mockQueryResult = {
      data: [launchRow({ amount_inr: '1500.50', usd_equivalent: '17.89' })],
      error: null,
    };

    await handler(makeReq(), res);

    const [[{ data }]] = res.json.mock.calls;
    expect(typeof data[0].amountInr).toBe('number');
    expect(typeof data[0].amountUsd).toBe('number');
    expect(data[0].amountInr).toBe(1500.5);
  });

  test('sets amount to 0 when amount_inr is null', async () => {
    mockQueryResult = {
      data: [launchRow({ amount_inr: null, usd_equivalent: null })],
      error: null,
    };

    await handler(makeReq(), res);

    const [[{ data }]] = res.json.mock.calls;
    expect(data[0].amountInr).toBe(0);
    expect(data[0].amountUsd).toBe(0);
  });

  // ── Supabase errors ───────────────────────────────────────────────────────

  test('returns empty array (not 500) when Supabase returns error', async () => {
    mockQueryResult = { data: null, error: { message: 'column does not exist' } };

    await handler(makeReq(), res);

    // Should gracefully degrade — empty list, not crash
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: [] });
  });

  // ── Query targets correct user ─────────────────────────────────────────────

  test('filters by the authenticated user ID', async () => {
    mockQueryResult = { data: [], error: null };

    await handler(makeReq('user-abc-789'), res);

    expect(mockQueryChain.eq).toHaveBeenCalledWith('user_id', 'user-abc-789');
  });

  test('falls back to payee UPI ID as name when recipient_name is missing', async () => {
    mockQueryResult = {
      data: [launchRow({ recipient_name: null })],
      error: null,
    };

    await handler(makeReq(), res);

    const [[{ data }]] = res.json.mock.calls;
    expect(data[0].name).toBe('test@upi');
  });
});
