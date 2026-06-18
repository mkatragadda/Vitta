/**
 * PaymentLaunchService tests
 * Uses a mock Supabase client so no real DB connection is needed.
 */

import PaymentLaunchService from '../paymentLaunchService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal valid launch payload. */
const validLaunch = (overrides = {}) => ({
  recipientUpiId: 'amit.kumar@okicici',
  recipientName: 'Amit Kumar',
  amountInr: 5000,
  usdEquivalent: 59.8,
  exchangeRate: 83.61,
  rail: 'wise',
  ...overrides,
});

/** Build a Supabase client mock where .insert().select().single() resolves to `result`. */
function makeSupabase({ insertResult = null, insertError = null, updateResult = null, updateError = null } = {}) {
  const insertChain = {
    select: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: insertResult, error: insertError }),
  };
  const updateChain = {
    eq: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: updateResult, error: updateError }),
  };

  return {
    from: jest.fn((table) => {
      if (table === 'payment_launches') {
        return {
          insert: jest.fn().mockReturnValue(insertChain),
          update: jest.fn().mockReturnValue(updateChain),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    }),
  };
}

// ---------------------------------------------------------------------------
// Constructor
// ---------------------------------------------------------------------------
describe('PaymentLaunchService — constructor', () => {
  test('throws when supabase client is missing', () => {
    expect(() => new PaymentLaunchService(null)).toThrow('Supabase client is required');
  });

  test('constructs successfully with a client', () => {
    const svc = new PaymentLaunchService(makeSupabase());
    expect(svc).toBeInstanceOf(PaymentLaunchService);
  });
});

// ---------------------------------------------------------------------------
// logLaunch — happy path
// ---------------------------------------------------------------------------
describe('logLaunch — happy path', () => {
  let svc;

  beforeEach(() => {
    svc = new PaymentLaunchService(
      makeSupabase({ insertResult: { id: 'launch-uuid-1234' } })
    );
  });

  test('returns success with launchId on valid input', async () => {
    const result = await svc.logLaunch('user-1', validLaunch());
    expect(result.success).toBe(true);
    expect(result.launchId).toBe('launch-uuid-1234');
  });

  test('normalises recipientUpiId to lowercase', async () => {
    const supabase = makeSupabase({ insertResult: { id: 'abc' } });
    const svc2 = new PaymentLaunchService(supabase);
    await svc2.logLaunch('user-1', validLaunch({ recipientUpiId: 'AMIT@OKICICI' }));

    const insertedRow = supabase.from.mock.calls[0] && supabase.from('payment_launches').insert.mock?.calls?.[0]?.[0]?.[0];
    // We can inspect the insert args via the mock
    const fromCall = supabase.from.mock.results[0]?.value;
    const insertArg = fromCall?.insert.mock.calls[0]?.[0]?.[0];
    expect(insertArg?.recipient_upi_id).toBe('amit@okicici');
  });

  test('sets status to "launched" always', async () => {
    const supabase = makeSupabase({ insertResult: { id: 'abc' } });
    const svc2 = new PaymentLaunchService(supabase);
    await svc2.logLaunch('user-1', validLaunch());
    const fromCall = supabase.from.mock.results[0]?.value;
    const insertArg = fromCall?.insert.mock.calls[0]?.[0]?.[0];
    expect(insertArg?.status).toBe('launched');
  });

  test('defaults rail to "wise" when omitted', async () => {
    const supabase = makeSupabase({ insertResult: { id: 'abc' } });
    const svc2 = new PaymentLaunchService(supabase);
    await svc2.logLaunch('user-1', validLaunch({ rail: undefined }));
    const fromCall = supabase.from.mock.results[0]?.value;
    const insertArg = fromCall?.insert.mock.calls[0]?.[0]?.[0];
    expect(insertArg?.rail).toBe('wise');
  });

  test('stores numeric amountInr as a number', async () => {
    const supabase = makeSupabase({ insertResult: { id: 'abc' } });
    const svc2 = new PaymentLaunchService(supabase);
    await svc2.logLaunch('user-1', validLaunch({ amountInr: '1500' }));
    const fromCall = supabase.from.mock.results[0]?.value;
    const insertArg = fromCall?.insert.mock.calls[0]?.[0]?.[0];
    expect(typeof insertArg?.amount_inr).toBe('number');
    expect(insertArg?.amount_inr).toBe(1500);
  });

  test('stores null for optional fields when omitted', async () => {
    const supabase = makeSupabase({ insertResult: { id: 'abc' } });
    const svc2 = new PaymentLaunchService(supabase);
    await svc2.logLaunch('user-1', { recipientUpiId: 'x@bank', amountInr: 100 });
    const fromCall = supabase.from.mock.results[0]?.value;
    const insertArg = fromCall?.insert.mock.calls[0]?.[0]?.[0];
    expect(insertArg?.recipient_name).toBeNull();
    expect(insertArg?.usd_equivalent).toBeNull();
    expect(insertArg?.exchange_rate).toBeNull();
    expect(insertArg?.note).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// logLaunch — validation errors
// ---------------------------------------------------------------------------
describe('logLaunch — validation', () => {
  let svc;
  beforeEach(() => { svc = new PaymentLaunchService(makeSupabase()); });

  test('returns error when userId is missing', async () => {
    const result = await svc.logLaunch(null, validLaunch());
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/userId/i);
  });

  test('returns error when recipientUpiId is missing', async () => {
    const result = await svc.logLaunch('user-1', validLaunch({ recipientUpiId: undefined }));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/recipientUpiId/i);
  });

  test('returns error for invalid UPI format (no @)', async () => {
    const result = await svc.logLaunch('user-1', validLaunch({ recipientUpiId: 'notaupi' }));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/UPI address/i);
  });

  test('returns error for invalid UPI format (@ at start)', async () => {
    const result = await svc.logLaunch('user-1', validLaunch({ recipientUpiId: '@bank' }));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/UPI address/i);
  });

  test('returns error when amountInr is zero', async () => {
    const result = await svc.logLaunch('user-1', validLaunch({ amountInr: 0 }));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/amountInr/i);
  });

  test('returns error when amountInr is negative', async () => {
    const result = await svc.logLaunch('user-1', validLaunch({ amountInr: -100 }));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/amountInr/i);
  });

  test('returns error for unknown rail', async () => {
    const result = await svc.logLaunch('user-1', validLaunch({ rail: 'paypal' }));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/rail/i);
  });

  test('returns error when DB insert fails', async () => {
    const svc2 = new PaymentLaunchService(
      makeSupabase({ insertError: { message: 'connection refused' } })
    );
    const result = await svc2.logLaunch('user-1', validLaunch());
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/connection refused/i);
  });
});

// ---------------------------------------------------------------------------
// updateStatus — happy path
// ---------------------------------------------------------------------------
describe('updateStatus — happy path', () => {
  let svc;

  beforeEach(() => {
    svc = new PaymentLaunchService(
      makeSupabase({ updateResult: { id: 'launch-uuid-1234' } })
    );
  });

  test('returns success for "completed"', async () => {
    const result = await svc.updateStatus('launch-id', 'user-1', 'completed');
    expect(result.success).toBe(true);
  });

  test('returns success for "cancelled"', async () => {
    const result = await svc.updateStatus('launch-id', 'user-1', 'cancelled');
    expect(result.success).toBe(true);
  });

  test('returns success for "failed"', async () => {
    const result = await svc.updateStatus('launch-id', 'user-1', 'failed');
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// updateStatus — validation errors
// ---------------------------------------------------------------------------
describe('updateStatus — validation', () => {
  let svc;
  beforeEach(() => { svc = new PaymentLaunchService(makeSupabase()); });

  test('returns error when launchId is missing', async () => {
    const result = await svc.updateStatus(null, 'user-1', 'completed');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/launchId/i);
  });

  test('returns error when userId is missing', async () => {
    const result = await svc.updateStatus('launch-id', null, 'completed');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/userId/i);
  });

  test('cannot reset status back to "launched"', async () => {
    const result = await svc.updateStatus('launch-id', 'user-1', 'launched');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/launched/i);
  });

  test('rejects unknown status values', async () => {
    const result = await svc.updateStatus('launch-id', 'user-1', 'pending');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/status/i);
  });

  test('returns error when DB returns no match (wrong user)', async () => {
    const svc2 = new PaymentLaunchService(
      makeSupabase({ updateResult: null, updateError: { message: 'PGRST116' } })
    );
    const result = await svc2.updateStatus('launch-id', 'wrong-user', 'completed');
    expect(result.success).toBe(false);
  });
});
