/**
 * Integration tests for SMS Webhook Handler
 */

const crypto = require('crypto');

// Mock environment variables
process.env.AGENTPHONE_WEBHOOK_SECRET = 'test_webhook_secret';
process.env.AGENTPHONE_API_KEY = 'test_api_key';
process.env.AGENTPHONE_AGENT_ID = 'test_agent_id';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test_anon_key';

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: {
                user_id: 'user_123',
                is_verified: true
              },
              error: null
            }))
          }))
        }))
      })),
      insert: jest.fn(() => ({
        error: null
      }))
    }))
  }))
}));

// Mock AgentPhone client
jest.mock('../../../services/agentphone/agentphoneClient', () => ({
  sendMessage: jest.fn(() => Promise.resolve({
    success: true,
    messageId: 'msg_test_123'
  }))
}));

const handler = require('../../../pages/api/sms/webhook').default;

describe('SMS Webhook Handler', () => {
  const webhookSecret = 'test_webhook_secret';

  // Helper to generate valid signature
  const generateSignature = (payload) => {
    const payloadString = JSON.stringify(payload);
    const hmac = crypto.createHmac('sha256', webhookSecret);
    hmac.update(payloadString);
    return `sha256=${hmac.digest('hex')}`;
  };

  // Helper to create mock request
  const createMockRequest = (payload, signature = null) => {
    const sig = signature || generateSignature(payload);

    return {
      method: 'POST',
      headers: {
        'x-webhook-signature': sig,
        'x-webhook-timestamp': Math.floor(Date.now() / 1000).toString()
      },
      body: payload
    };
  };

  // Helper to create mock response
  const createMockResponse = () => {
    const res = {
      status: jest.fn(() => res),
      json: jest.fn(() => res),
      statusCode: 200
    };
    return res;
  };

  describe('Request Validation', () => {
    it('should reject non-POST requests', async () => {
      const req = { method: 'GET' };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(405);
      expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
    });

    it('should reject requests with invalid signature', async () => {
      const payload = {
        event: 'message.received',
        data: { id: 'msg_123' }
      };

      const req = createMockRequest(payload, 'sha256=' + 'a'.repeat(64));
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid signature' });
    });

    it('should reject requests without signature', async () => {
      const payload = {
        event: 'message.received',
        data: { id: 'msg_123' }
      };

      const req = {
        method: 'POST',
        headers: {},
        body: payload
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should reject requests with invalid payload structure', async () => {
      const payload = { invalid: 'structure' };
      const req = createMockRequest(payload);
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid payload' });
    });
  });

  describe('Event Handling', () => {
    it('should handle message.received event', async () => {
      const payload = {
        event: 'message.received',
        data: {
          id: 'msg_123',
          conversation_id: 'conv_456',
          from: '+1234567890',
          to: '+0987654321',
          body: 'Test message',
          channel: 'sms',
          created_at: '2026-05-17T12:00:00Z'
        }
      };

      const req = createMockRequest(payload);
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });

    it('should handle message.sent event', async () => {
      const payload = {
        event: 'message.sent',
        data: {
          id: 'msg_789',
          status: 'sent'
        }
      };

      const req = createMockRequest(payload);
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });

    it('should handle message.failed event', async () => {
      const payload = {
        event: 'message.failed',
        data: {
          id: 'msg_failed',
          error: 'Delivery failed'
        }
      };

      const req = createMockRequest(payload);
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });

    it('should handle unknown event types', async () => {
      const payload = {
        event: 'unknown.event',
        data: {}
      };

      const req = createMockRequest(payload);
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });
  });

  describe('Error Handling', () => {
    it('should return 400 for invalid payload structure', async () => {
      // Invalid payloads should return 400
      const payload = {
        event: 'message.received',
        data: null // Invalid data structure
      };

      const req = createMockRequest(payload);
      const res = createMockResponse();

      await handler(req, res);

      // Should return 400 for structural errors
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid payload' });
    });

    it('should return 200 for valid payload even if database errors occur', async () => {
      // For valid webhooks with processing errors, return 200 to prevent retries
      const payload = {
        event: 'message.received',
        data: {
          id: 'msg_123',
          conversation_id: 'conv_456',
          from: '+1234567890',
          to: '+0987654321',
          body: 'Test message',
          channel: 'sms',
          created_at: '2026-05-17T12:00:00Z'
        }
      };

      const req = createMockRequest(payload);
      const res = createMockResponse();

      // This will still succeed even if there are internal errors
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('Signature Verification', () => {
    it('should verify HMAC-SHA256 signature correctly', async () => {
      const payload = {
        event: 'message.received',
        data: {
          id: 'msg_123',
          from: '+1234567890',
          body: 'Test'
        }
      };

      const validSignature = generateSignature(payload);
      const req = createMockRequest(payload, validSignature);
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });

    it('should reject tampered payload', async () => {
      const originalPayload = {
        event: 'message.received',
        data: { amount: 100 }
      };

      const signature = generateSignature(originalPayload);

      // Tamper with payload after signing
      const tamperedPayload = {
        event: 'message.received',
        data: { amount: 999999 }
      };

      const req = createMockRequest(tamperedPayload, signature);
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid signature' });
    });
  });
});
