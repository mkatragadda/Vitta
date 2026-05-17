/**
 * AgentPhone Webhook Signature Verifier
 *
 * Verifies HMAC-SHA256 signatures from AgentPhone webhooks to ensure
 * authenticity and prevent tampering.
 *
 * Security flow:
 * 1. AgentPhone sends webhook with X-Webhook-Signature header
 * 2. Signature format: "sha256=<hex_digest>"
 * 3. We compute HMAC-SHA256(secret, payload) and compare
 */

const crypto = require('crypto');

class WebhookVerifier {
  constructor() {
    this.secret = process.env.AGENTPHONE_WEBHOOK_SECRET;

    if (!this.secret) {
      console.warn('[WebhookVerifier] AGENTPHONE_WEBHOOK_SECRET not configured - webhook verification will fail');
    }
  }

  /**
   * Verify webhook signature
   * @param {string} signature - Signature from X-Webhook-Signature header
   * @param {string|Object} payload - Raw request body (string) or parsed JSON object
   * @param {number} timestamp - Webhook timestamp (optional, for replay attack prevention)
   * @returns {boolean} True if signature is valid
   */
  verifySignature(signature, payload, timestamp = null) {
    if (!this.secret) {
      console.error('[WebhookVerifier] Cannot verify signature - secret not configured');
      return false;
    }

    if (!signature) {
      console.error('[WebhookVerifier] No signature provided');
      return false;
    }

    try {
      // Extract hex digest from "sha256=<hex>" format
      const signatureParts = signature.split('=');
      if (signatureParts.length !== 2 || signatureParts[0] !== 'sha256') {
        console.error('[WebhookVerifier] Invalid signature format:', signature);
        return false;
      }
      const receivedDigest = signatureParts[1];

      // Convert payload to string if it's an object
      const payloadString = typeof payload === 'string'
        ? payload
        : JSON.stringify(payload);

      // Compute HMAC-SHA256
      const hmac = crypto.createHmac('sha256', this.secret);
      hmac.update(payloadString);
      const computedDigest = hmac.digest('hex');

      // Constant-time comparison to prevent timing attacks
      const isValid = crypto.timingSafeEqual(
        Buffer.from(receivedDigest, 'hex'),
        Buffer.from(computedDigest, 'hex')
      );

      if (!isValid) {
        console.error('[WebhookVerifier] Signature mismatch');
        console.error('[WebhookVerifier] Expected:', computedDigest);
        console.error('[WebhookVerifier] Received:', receivedDigest);
        return false;
      }

      // Optional: Check timestamp to prevent replay attacks
      // AgentPhone webhooks should be processed within 5 minutes
      if (timestamp) {
        const now = Math.floor(Date.now() / 1000);
        const age = now - timestamp;

        if (age > 300) { // 5 minutes
          console.error('[WebhookVerifier] Webhook too old:', age, 'seconds');
          return false;
        }

        if (age < -60) { // 1 minute in the future (clock skew tolerance)
          console.error('[WebhookVerifier] Webhook timestamp in future');
          return false;
        }
      }

      console.log('[WebhookVerifier] Signature verified successfully');
      return true;

    } catch (error) {
      console.error('[WebhookVerifier] Verification error:', error.message);
      return false;
    }
  }

  /**
   * Verify webhook from Express/Next.js request
   * @param {Object} req - Request object with headers and body
   * @returns {boolean} True if signature is valid
   */
  verifyRequest(req) {
    const signature = req.headers['x-webhook-signature'];
    const timestamp = req.headers['x-webhook-timestamp']
      ? parseInt(req.headers['x-webhook-timestamp'], 10)
      : null;

    // Use raw body if available, otherwise stringify the parsed body
    const payload = req.rawBody || req.body;

    return this.verifySignature(signature, payload, timestamp);
  }

  /**
   * Check if verifier is properly configured
   * @returns {boolean} True if webhook secret is set
   */
  isConfigured() {
    return !!this.secret;
  }

  /**
   * Generate signature for testing purposes
   * @param {string|Object} payload - Payload to sign
   * @returns {string} Signature in "sha256=<hex>" format
   */
  generateSignature(payload) {
    if (!this.secret) {
      throw new Error('Webhook secret not configured');
    }

    const payloadString = typeof payload === 'string'
      ? payload
      : JSON.stringify(payload);

    const hmac = crypto.createHmac('sha256', this.secret);
    hmac.update(payloadString);
    const digest = hmac.digest('hex');

    return `sha256=${digest}`;
  }
}

// Export singleton instance
const webhookVerifier = new WebhookVerifier();

module.exports = webhookVerifier;
