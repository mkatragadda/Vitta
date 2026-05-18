/**
 * AgentPhone Webhook Signature Verifier (Svix)
 *
 * AgentPhone uses Svix for webhook delivery.
 * Svix signing algorithm:
 *   1. Signed content = "{webhook-id}.{webhook-timestamp}.{raw-body}"
 *   2. Secret = base64-decode(AGENTPHONE_WEBHOOK_SECRET after stripping "whsec_" prefix)
 *   3. Signature = base64(HMAC-SHA256(secret, signed-content))
 *   4. Header "webhook-signature" contains "v1,<base64>" (space-separated, may be multiple)
 *
 * Docs: https://docs.svix.com/receiving/verifying-payloads/how
 */

const crypto = require('crypto');

const TOLERANCE_SECONDS = 300; // 5 minutes replay protection

class WebhookVerifier {
  constructor() {
    const raw = process.env.AGENTPHONE_WEBHOOK_SECRET || '';

    if (!raw) {
      console.warn('[WebhookVerifier] AGENTPHONE_WEBHOOK_SECRET not configured');
      this.secretBytes = null;
    } else {
      // Strip "whsec_" prefix and base64-decode into raw bytes
      const b64 = raw.startsWith('whsec_') ? raw.slice(6) : raw;
      this.secretBytes = Buffer.from(b64, 'base64');
    }
  }

  /**
   * Verify a Svix-signed webhook request.
   * @param {Object} req - Next.js request with rawBodyString attached
   * @param {string} rawBodyString - The exact raw body string (must match what was signed)
   * @returns {boolean}
   */
  verifyRequest(req, rawBodyString) {
    if (!this.secretBytes) {
      console.error('[WebhookVerifier] Secret not configured — cannot verify');
      return false;
    }

    const msgId        = req.headers['webhook-id'];
    const msgTimestamp = req.headers['webhook-timestamp'];
    const msgSignature = req.headers['webhook-signature'];

    if (!msgId || !msgTimestamp || !msgSignature) {
      console.error('[WebhookVerifier] Missing Svix headers:', {
        'webhook-id': msgId,
        'webhook-timestamp': msgTimestamp,
        'webhook-signature': msgSignature
      });
      return false;
    }

    // Replay protection — reject webhooks older than 5 minutes
    const ts = parseInt(msgTimestamp, 10);
    const age = Math.floor(Date.now() / 1000) - ts;
    if (isNaN(ts) || age > TOLERANCE_SECONDS || age < -60) {
      console.error(`[WebhookVerifier] Timestamp out of tolerance: age=${age}s`);
      return false;
    }

    // Signed content = "{id}.{timestamp}.{body}"
    const signedContent = `${msgId}.${msgTimestamp}.${rawBodyString}`;

    // Compute expected signature
    const hmac = crypto.createHmac('sha256', this.secretBytes);
    hmac.update(signedContent);
    const computed = hmac.digest('base64');

    // webhook-signature header may contain multiple sigs: "v1,<b64> v1,<b64>"
    const signatures = msgSignature.split(' ');
    const isValid = signatures.some(sig => {
      const comma = sig.indexOf(',');
      if (comma === -1) return false;
      const version = sig.slice(0, comma);
      const value   = sig.slice(comma + 1);
      if (version !== 'v1') return false;
      // Constant-time compare
      try {
        return crypto.timingSafeEqual(
          Buffer.from(value, 'base64'),
          Buffer.from(computed, 'base64')
        );
      } catch {
        return false;
      }
    });

    if (!isValid) {
      console.error('[WebhookVerifier] Signature mismatch');
      console.error('[WebhookVerifier] Computed:', computed);
      console.error('[WebhookVerifier] Received sigs:', msgSignature);
    } else {
      console.log('[WebhookVerifier] ✓ Signature verified');
    }

    return isValid;
  }
}

const webhookVerifier = new WebhookVerifier();
module.exports = webhookVerifier;
