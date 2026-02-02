/**
 * Plaid Webhook Signature Verification
 *
 * Verifies that a webhook came from Plaid (not a malicious actor).
 * Uses HMAC-SHA256 with PLAID_WEBHOOK_SECRET.
 *
 * How it works:
 * 1. Plaid computes: HMAC-SHA256(rawBody, PLAID_WEBHOOK_SECRET)
 * 2. Plaid sends signature in X-Plaid-Webhook-Signature header
 * 3. We compute the same hash and compare
 * 4. If they match → webhook is authentic
 *
 * Plaid can send multiple signatures (comma-separated) for key rotation.
 * We check if any of them match.
 */

const crypto = require('crypto');

function verifyWebhookSignature(rawBody, signatureHeader, secret) {
  // Validate inputs
  if (!signatureHeader) {
    return {
      valid: false,
      reason: 'No signature header provided',
      incoming: [],
      computed: null,
    };
  }

  if (!secret) {
    return {
      valid: false,
      reason: 'No webhook secret configured',
      incoming: [],
      computed: null,
    };
  }

  try {
    // Compute our own signature from the raw body
    const computed = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    // Plaid sends signatures separated by commas (for key rotation)
    // Example: "sig1,sig2,sig3"
    const incomingSignatures = signatureHeader
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    // Check if any incoming signature matches our computed signature
    const matches = incomingSignatures.some(sig => sig === computed);

    return {
      valid: matches,
      reason: matches ? 'Valid signature' : 'Signature mismatch',
      computed,
      incoming: incomingSignatures,
    };
  } catch (error) {
    return {
      valid: false,
      reason: `Error during verification: ${error.message}`,
      error: error.message,
      computed: null,
      incoming: [signatureHeader],
    };
  }
}

module.exports = { verifyWebhookSignature };
