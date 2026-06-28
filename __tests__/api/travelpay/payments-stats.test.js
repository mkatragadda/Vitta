/**
 * Tests for GET /api/payments/stats
 *
 * Returns this-week payment count + totals shown on HomeScreen weekly summary.
 * If this returns 500, the stats section shows nothing after login.
 *
 * Root cause of past 500s: stale .next webpack cache (use `npm run dev:clean`).
 */

/** @jest-environment node */

// ─── Supabase mock ───────────────────────────────────────────────────────────

let mockQueryResult = { data: null, error: null };

const mockQueryChain = {
  select: jest.fn().mockReturnThis(),
  eq:     jest.fn().mockReturnThis(),
  gte:    jest.fn().mockReturnThis(),
  in:     jest.fn().mockImplementation(() => Promise.resolve(mockQueryResult)),
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => mockQueryChain),
  })),
}));

import handler from '../../../pages/api/payments/stats';

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

function paymentRow(amountInr, amountUsd, status = 'completed') {
  return { amount_inr: String(amountInr), usd_equivalent: String(amountUsd), status };
}

// ─── tests ──────────────────────────────────────────────────────────────────

describe('GET /api/payments/stats', () => {
  let res;

  beforeEach(() => {
    res = makeRes();
    Object.values(mockQueryChain).forEach(fn => fn.mockClear());
    mockQueryChain.select.mockReturnThis();
    mockQueryChain.eq.mockReturnThis();
    mockQueryChain.gte.mockReturnThis();
    mockQueryChain.in.mockImplementation(() => Promise.resolve(mockQueryResult));
  });

  // ── Auth guard ────────────────────────────────────────────────────────────

  test('returns 401 when x-user-id header is missing', async () => {
    const req = { method: 'GET', headers: {} };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
  });

  // ── Method guard ──────────────────────────────────────────────────────────

  test('returns 405 for POST', async () => {
    const req = { method: 'POST', headers: { 'x-user-id': 'user-123' } };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  // ── Happy path ────────────────────────────────────────────────────────────

  test('returns zero stats when user has no payments this week', async () => {
    mockQueryResult = { data: [], error: null };

    await handler(makeReq(), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { paymentsThisWeek: 0, totalInr: 0, totalUsd: 0 },
    });
  });

  test('counts and sums multiple payments correctly', async () => {
    mockQueryResult = {
      data: [
        paymentRow(850, 10.16),
        paymentRow(1200, 14.32),
        paymentRow(300, 3.58),
      ],
      error: null,
    };

    await handler(makeReq(), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        paymentsThisWeek: 3,
        totalInr: 2350,
        totalUsd: 28.06,
      },
    });
  });

  test('rounds totals to 2 decimal places', async () => {
    mockQueryResult = {
      data: [paymentRow('100.005', '1.1115')],
      error: null,
    };

    await handler(makeReq(), res);

    const [[{ data }]] = res.json.mock.calls;
    // Totals should be rounded to at most 2dp
    expect(data.totalInr.toString()).toMatch(/^\d+(\.\d{1,2})?$/);
    expect(data.totalUsd.toString()).toMatch(/^\d+(\.\d{1,2})?$/);
  });

  test('handles null data gracefully (treats as empty)', async () => {
    mockQueryResult = { data: null, error: null };

    await handler(makeReq(), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { paymentsThisWeek: 0, totalInr: 0, totalUsd: 0 },
    });
  });

  test('coerces string amounts to numbers in sum', async () => {
    mockQueryResult = {
      data: [paymentRow('500', '5.96')],
      error: null,
    };

    await handler(makeReq(), res);

    const [[{ data }]] = res.json.mock.calls;
    expect(data.totalInr).toBe(500);
    expect(data.totalUsd).toBe(5.96);
  });

  // ── Week boundary logic ───────────────────────────────────────────────────

  test('filters payments from start of current ISO week (Monday)', async () => {
    mockQueryResult = { data: [], error: null };

    await handler(makeReq(), res);

    // gte must have been called with a monday 00:00:00 UTC timestamp
    const [field, weekStart] = mockQueryChain.gte.mock.calls[0];
    expect(field).toBe('launched_at');

    const d = new Date(weekStart);
    expect(d.getUTCHours()).toBe(0);
    expect(d.getUTCMinutes()).toBe(0);
    expect(d.getUTCSeconds()).toBe(0);
    // UTC day 1 = Monday
    expect(d.getUTCDay()).toBe(1);
  });

  test('only counts launched and completed statuses', async () => {
    mockQueryResult = { data: [], error: null };

    await handler(makeReq(), res);

    expect(mockQueryChain.in).toHaveBeenCalledWith(
      'status',
      expect.arrayContaining(['launched', 'completed'])
    );
  });

  // ── Supabase errors ───────────────────────────────────────────────────────

  test('returns zero stats (not 500) when Supabase returns error', async () => {
    mockQueryResult = { data: null, error: { message: 'relation does not exist' } };

    await handler(makeReq(), res);

    // Gracefully degrade — empty stats, not a crash
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { paymentsThisWeek: 0, totalInr: 0, totalUsd: 0 },
    });
  });

  // ── Query targets correct user ────────────────────────────────────────────

  test('filters by the authenticated user ID', async () => {
    mockQueryResult = { data: [], error: null };

    await handler(makeReq('user-xyz-456'), res);

    expect(mockQueryChain.eq).toHaveBeenCalledWith('user_id', 'user-xyz-456');
  });

  // ── Response shape ────────────────────────────────────────────────────────

  test('response always contains all three stat fields', async () => {
    mockQueryResult = { data: [paymentRow(500, 5.96)], error: null };

    await handler(makeReq(), res);

    const [[payload]] = res.json.mock.calls;
    expect(payload.data).toHaveProperty('paymentsThisWeek');
    expect(payload.data).toHaveProperty('totalInr');
    expect(payload.data).toHaveProperty('totalUsd');
  });
});
