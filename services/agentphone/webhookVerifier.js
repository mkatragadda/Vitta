/**
 * AgentPhone Webhook Signature Verifier
 *
 * AgentPhone signs: HMAC-SHA256("{timestamp}.{rawBody}", secret)
 * Headers: X-Webhook-Signature (sha256=<hex>), X-Webhook-Timestamp
 *
 * Set SKIP_WEBHOOK_SIGNATURE=true to bypass in development.
 */

const crypto = require('crypto');

const REPLAY_WINDOW_SECONDS = 300;

class WebhookVerifier {
  constructor() {
    const raw = (process.env.AGENTPHONE_WEBHOOK_SECRET || '').trim();
    this.skip = process.env.SKIP_WEBHOOK_SIGNATURE === 'true';

    if (this.skip) {
      console.warn('[WebhookVerifier] ⚠️  Verification DISABLED (SKIP_WEBHOOK_SIGNATURE=true)');
    }

    if (!raw) {
      console.warn('[WebhookVerifier] AGENTPHONE_WEBHOOK_SECRET not set');
      this.secretRaw      = null;
      this.secretStripped = null;
      this.secretDecoded  = null;
      return;
    }

    const stripped = raw.startsWith('whsec_') ? raw.slice(6) : raw;

    this.secretRaw      = raw;                              // full string e.g. "whsec_XYZ"
    this.secretStripped = stripped;                         // part after whsec_
    try { this.secretDecoded = Buffer.from(stripped, 'base64'); } catch { this.secretDecoded = null; }

    console.log(`[WebhookVerifier] Initialized | secretLen=${raw.length} | hasPrefix=${raw.startsWith('whsec_')}`);
  }

  verifyRequest(req, rawBodyString) {
    if (this.skip) return true;

    if (!this.secretRaw) {
      console.error('[WebhookVerifier] Cannot verify — secret not set');
      return false;
    }

    const sigHeader = req.headers['x-webhook-signature'];
    const tsHeader  = req.headers['x-webhook-timestamp'];

    if (!sigHeader) {
      console.error('[WebhookVerifier] Missing x-webhook-signature');
      console.error('[WebhookVerifier] Headers present:', Object.keys(req.headers).join(', '));
      return false;
    }

    // Replay attack protection
    if (tsHeader) {
      const ts  = parseInt(tsHeader, 10);
      const age = Math.floor(Date.now() / 1000) - ts;
      if (isNaN(ts) || age > REPLAY_WINDOW_SECONDS || age < -60) {
        console.error(`[WebhookVerifier] Timestamp rejected: age=${age}s`);
        return false;
      }
    }

    // Extract hex digest from "sha256=<hex>" or plain "<hex>"
    const received = sigHeader.includes('=')
      ? sigHeader.split('=').slice(1).join('=').toLowerCase()
      : sigHeader.toLowerCase();

    // Try all 6 combinations: 2 payloads × 3 key formats
    const payloads = {
      'timestamp.body': tsHeader ? `${tsHeader}.${rawBodyString}` : null,
      'body only':      rawBodyString,
    };
    const keys = {
      'raw':     this.secretRaw      ? Buffer.from(this.secretRaw)      : null,
      'stripped': this.secretStripped ? Buffer.from(this.secretStripped) : null,
      'decoded': this.secretDecoded,
    };

    for (const [payloadLabel, payload] of Object.entries(payloads)) {
      if (!payload) continue;
      for (const [keyLabel, key] of Object.entries(keys)) {
        if (!key) continue;
        const computed = this._hmac(payload, key);
        if (this._safeEqual(received, computed)) {
          console.log(`[WebhookVerifier] ✓ Verified | payload="${payloadLabel}" | key="${keyLabel}"`);
          return true;
        }
      }
    }

    // All 6 failed — log everything needed to diagnose
    console.error('[WebhookVerifier] ✗ Signature mismatch — all 6 combinations failed');
    console.error('[WebhookVerifier] Received                         :', received);
    console.error('[WebhookVerifier] Timestamp header                 :', tsHeader || 'MISSING');
    console.error('[WebhookVerifier] Raw body length                  :', rawBodyString.length);
    console.error('[WebhookVerifier] Raw body (first 80 chars)        :', rawBodyString.slice(0, 80));
    for (const [payloadLabel, payload] of Object.entries(payloads)) {
      if (!payload) continue;
      for (const [keyLabel, key] of Object.entries(keys)) {
        if (!key) continue;
        console.error(`[WebhookVerifier] Computed [${payloadLabel}][${keyLabel}]:`, this._hmac(payload, key));
      }
    }

    return false;
  }

  _hmac(payload, key) {
    return crypto.createHmac('sha256', key).update(payload).digest('hex');
  }

  _safeEqual(a, b) {
    try {
      return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
    } catch {
      return false;
    }
  }
}

module.exports = new WebhookVerifier();
