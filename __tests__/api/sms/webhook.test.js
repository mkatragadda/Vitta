/**
 * Integration tests for SMS Webhook Handler
 *
 * Tests:
 *  - Request validation (Phase 1 — preserved)
 *  - Event routing (Phase 1 — preserved)
 *  - Signature verification (Phase 1 — preserved)
 *  - Intent processing via Phase 2 services (new)
 */

const crypto = require('crypto');

// ── Environment ────────────────────────────────────────────────────────────────
process.env.AGENTPHONE_WEBHOOK_SECRET = 'test_webhook_secret';
process.env.AGENTPHONE_API_KEY = 'test_api_key';
process.env.AGENTPHONE_AGENT_ID = 'test_agent_id';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test_anon_key';
process.env.NEXT_PUBLIC_APP_URL = 'https://vitta.app';

// ── Supabase mock ──────────────────────────────────────────────────────────────
// Returns a verified user by default; individual tests can override.
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      insert: jest.fn(() => Promise.resolve({ error: null })),
      maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
      single: jest.fn(() => Promise.resolve({
        data: { user_id: 'user_123', is_verified: true },
        error: null
      }))
    }))
  }))
}));

// ── AgentPhone mock ────────────────────────────────────────────────────────────
jest.mock('../../../services/agentphone/agentphoneClient', () => ({
  sendMessage: jest.fn(() => Promise.resolve({ success: true, messageId: 'msg_test_123' })),
  isConfigured: jest.fn(() => true)
}));

// ── Phase 2 service mocks ──────────────────────────────────────────────────────
jest.mock('../../../services/sms/smsIntentParser', () => ({
  parseIntent: jest.fn()
}));

jest.mock('../../../services/sms/recipientMatcher', () => ({
  matchRecipient: jest.fn()
}));

jest.mock('../../../services/sms/conversationManager', () => ({
  getConversation: jest.fn(() => Promise.resolve(null)),
  setConversationState: jest.fn(() => Promise.resolve({ id: 'conv_001', state: 'idle' })),
  resetConversation: jest.fn(() => Promise.resolve()),
  updateConversationContext: jest.fn(() => Promise.resolve())
}));

const agentPhoneClient = require('../../../services/agentphone/agentphoneClient');
const { parseIntent } = require('../../../services/sms/smsIntentParser');
const { matchRecipient } = require('../../../services/sms/recipientMatcher');
const { getConversation, setConversationState, resetConversation } = require('../../../services/sms/conversationManager');

const handler = require('../../../pages/api/sms/webhook').default;

// ── Helpers ────────────────────────────────────────────────────────────────────

const WEBHOOK_SECRET = 'test_webhook_secret';

function generateSignature(payload) {
  return `sha256=${crypto.createHmac('sha256', WEBHOOK_SECRET).update(JSON.stringify(payload)).digest('hex')}`;
}

function makeReq(payload, sig = null) {
  return {
    method: 'POST',
    headers: {
      'x-webhook-signature': sig || generateSignature(payload),
      'x-webhook-timestamp': Math.floor(Date.now() / 1000).toString()
    },
    body: payload
  };
}

function makeRes() {
  const res = { status: jest.fn(() => res), json: jest.fn(() => res) };
  return res;
}

const inboundPayload = (body = 'Send $100 to mom') => ({
  event: 'message.received',
  data: {
    id: 'msg_123',
    conversation_id: 'conv_456',
    from: '+1234567890',
    to: '+0987654321',
    body,
    channel: 'sms',
    created_at: '2026-05-17T12:00:00Z'
  }
});

const mockRecipient = {
  id: 'rec_001',
  account_holder_name: 'Maria Garcia',
  currency: 'INR',
  type: 'upi',
  upi_id: 'maria@paytm'
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('SMS Webhook Handler', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    // Safe defaults for Phase 2 mocks
    parseIntent.mockReturnValue({ intent: 'unknown', confidence: 0, entities: {} });
    matchRecipient.mockResolvedValue({ status: 'not_found' });
    getConversation.mockResolvedValue(null);
    setConversationState.mockResolvedValue({ id: 'conv_001', state: 'idle' });
    resetConversation.mockResolvedValue();
  });

  // ── Phase 1: Request Validation (preserved) ──────────────────────────────

  describe('Request Validation', () => {
    it('rejects non-POST requests', async () => {
      const res = makeRes();
      await handler({ method: 'GET' }, res);
      expect(res.status).toHaveBeenCalledWith(405);
      expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
    });

    it('rejects requests with invalid signature', async () => {
      const payload = inboundPayload();
      const res = makeRes();
      await handler(makeReq(payload, 'sha256=' + 'a'.repeat(64)), res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('rejects requests without signature header', async () => {
      const res = makeRes();
      await handler({ method: 'POST', headers: {}, body: inboundPayload() }, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('rejects invalid payload structure (no event/data)', async () => {
      const payload = { invalid: 'structure' };
      const res = makeRes();
      await handler(makeReq(payload), res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid payload' });
    });

    it('rejects null data field', async () => {
      const payload = { event: 'message.received', data: null };
      const res = makeRes();
      await handler(makeReq(payload), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ── Phase 1: Event Routing (preserved) ───────────────────────────────────

  describe('Event Routing', () => {
    it('returns 200 for message.sent event', async () => {
      const payload = { event: 'message.sent', data: { id: 'msg_789', status: 'sent' } };
      const res = makeRes();
      await handler(makeReq(payload), res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });

    it('returns 200 for message.failed event', async () => {
      const payload = { event: 'message.failed', data: { id: 'msg_fail', error: 'Delivery failed' } };
      const res = makeRes();
      await handler(makeReq(payload), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('returns 200 for unknown event types', async () => {
      const payload = { event: 'unknown.event', data: {} };
      const res = makeRes();
      await handler(makeReq(payload), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ── Phase 1: Signature Verification (preserved) ──────────────────────────

  describe('Signature Verification', () => {
    it('accepts a valid HMAC-SHA256 signature', async () => {
      parseIntent.mockReturnValue({ intent: 'unknown', confidence: 0, entities: {} });
      const payload = inboundPayload('hello');
      const res = makeRes();
      await handler(makeReq(payload, generateSignature(payload)), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('rejects a tampered payload', async () => {
      const original = inboundPayload();
      const sig = generateSignature(original);
      const tampered = inboundPayload('send $999999 to hacker');
      const res = makeRes();
      await handler(makeReq(tampered, sig), res);
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  // ── Phase 2: Intent Processing ────────────────────────────────────────────

  describe('Intent Processing (Phase 2)', () => {

    describe('transfer_money — single recipient match', () => {
      it('sends transfer-ready SMS and stores ready_for_confirmation state', async () => {
        parseIntent.mockReturnValue({
          intent: 'transfer_money',
          confidence: 0.95,
          entities: {
            amount: { value: 500, currency: 'USD', raw: '500' },
            recipient: { value: 'mom', raw: 'mom' }
          }
        });
        matchRecipient.mockResolvedValue({ status: 'matched', recipient: mockRecipient, matchType: 'nickname' });

        const res = makeRes();
        await handler(makeReq(inboundPayload('Send $500 to mom')), res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(matchRecipient).toHaveBeenCalledWith('mom', 'user_123');
        expect(setConversationState).toHaveBeenCalledWith(
          '+1234567890', 'user_123', 'ready_for_confirmation',
          expect.objectContaining({ recipient: mockRecipient, amount: 500 }),
          'conv_456'
        );

        const sentMsg = agentPhoneClient.sendMessage.mock.calls[0][1];
        expect(sentMsg).toMatch(/Transfer Ready/i);
        expect(sentMsg).toMatch(/Maria Garcia/);
        expect(sentMsg).toMatch(/500\.00/);
      });
    });

    describe('transfer_money — multiple recipient matches', () => {
      it('sends disambiguation prompt and stores awaiting_disambiguation state', async () => {
        parseIntent.mockReturnValue({
          intent: 'transfer_money',
          confidence: 0.95,
          entities: {
            amount: { value: 100, currency: 'USD', raw: '100' },
            recipient: { value: 'maria', raw: 'Maria' }
          }
        });
        matchRecipient.mockResolvedValue({
          status: 'multiple',
          matches: [
            { ...mockRecipient, account_holder_name: 'Maria Garcia' },
            { ...mockRecipient, id: 'rec_002', account_holder_name: 'Maria Lopez' }
          ],
          matchType: 'name'
        });

        const res = makeRes();
        await handler(makeReq(inboundPayload('Send $100 to Maria')), res);

        expect(setConversationState).toHaveBeenCalledWith(
          '+1234567890', 'user_123', 'awaiting_disambiguation',
          expect.objectContaining({ amount: 100, matches: expect.any(Array) }),
          'conv_456'
        );

        const sentMsg = agentPhoneClient.sendMessage.mock.calls[0][1];
        expect(sentMsg).toMatch(/found 2 contacts/i);
        expect(sentMsg).toMatch(/Maria Garcia/);
        expect(sentMsg).toMatch(/Maria Lopez/);
      });
    });

    describe('transfer_money — recipient not found', () => {
      it('sends not-found error SMS', async () => {
        parseIntent.mockReturnValue({
          intent: 'transfer_money',
          confidence: 0.95,
          entities: {
            amount: { value: 50, currency: 'USD', raw: '50' },
            recipient: { value: 'stranger', raw: 'stranger' }
          }
        });
        matchRecipient.mockResolvedValue({ status: 'not_found' });

        const res = makeRes();
        await handler(makeReq(inboundPayload('Send $50 to stranger')), res);

        const sentMsg = agentPhoneClient.sendMessage.mock.calls[0][1];
        expect(sentMsg).toMatch(/couldn't find/i);
        expect(sentMsg).toMatch(/stranger/i);
      });
    });

    describe('disambiguation_response', () => {
      it('resolves to correct recipient when user replies with a number', async () => {
        getConversation.mockResolvedValue({
          state: 'awaiting_disambiguation',
          context: {
            matches: [
              { ...mockRecipient, account_holder_name: 'Maria Garcia' },
              { ...mockRecipient, id: 'rec_002', account_holder_name: 'Maria Lopez' }
            ],
            amount: 100,
            currency: 'USD'
          }
        });
        parseIntent.mockReturnValue({
          intent: 'disambiguation_response',
          confidence: 1.0,
          entities: { selection: 1 }
        });

        const res = makeRes();
        await handler(makeReq(inboundPayload('1')), res);

        expect(setConversationState).toHaveBeenCalledWith(
          '+1234567890', 'user_123', 'ready_for_confirmation',
          expect.objectContaining({ amount: 100, recipient: expect.objectContaining({ account_holder_name: 'Maria Garcia' }) }),
          'conv_456'
        );

        const sentMsg = agentPhoneClient.sendMessage.mock.calls[0][1];
        expect(sentMsg).toMatch(/Transfer Ready/i);
        expect(sentMsg).toMatch(/Maria Garcia/);
      });
    });

    describe('cancellation', () => {
      it('resets conversation and sends cancellation confirmation', async () => {
        parseIntent.mockReturnValue({ intent: 'cancellation', confidence: 1.0, entities: {} });

        const res = makeRes();
        await handler(makeReq(inboundPayload('cancel')), res);

        expect(resetConversation).toHaveBeenCalledWith('+1234567890');
        const sentMsg = agentPhoneClient.sendMessage.mock.calls[0][1];
        expect(sentMsg).toMatch(/cancelled/i);
      });
    });

    describe('help', () => {
      it('sends help message', async () => {
        parseIntent.mockReturnValue({ intent: 'help', confidence: 1.0, entities: {} });

        const res = makeRes();
        await handler(makeReq(inboundPayload('help')), res);

        const sentMsg = agentPhoneClient.sendMessage.mock.calls[0][1];
        expect(sentMsg).toMatch(/commands/i);
        expect(sentMsg).toMatch(/Send \$500 to mom/i);
      });
    });

    describe('unknown intent', () => {
      it('sends guidance message and resets conversation', async () => {
        parseIntent.mockReturnValue({ intent: 'unknown', confidence: 0, entities: {} });

        const res = makeRes();
        await handler(makeReq(inboundPayload('blah blah')), res);

        expect(resetConversation).toHaveBeenCalled();
        const sentMsg = agentPhoneClient.sendMessage.mock.calls[0][1];
        expect(sentMsg).toMatch(/didn't understand/i);
      });
    });

    describe('always returns 200', () => {
      it('returns 200 even when intent processing throws', async () => {
        parseIntent.mockImplementation(() => { throw new Error('parser crash'); });

        const res = makeRes();
        await handler(makeReq(inboundPayload('test')), res);

        expect(res.status).toHaveBeenCalledWith(200);
      });
    });
  });
});
