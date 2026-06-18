/**
 * wiseLauncher — Wise deep link builder and platform detector.
 *
 * Vitta does not move money.  This module's only job is to build the
 * correct URL to hand the user off to Wise (app or web) with the
 * clearest possible context so they can complete the transfer themselves.
 *
 * Design constraints:
 *  - Pure functions; no side effects (window.open lives in the component).
 *  - Accepts userAgent as a parameter so every branch is unit-testable.
 *  - Named exports only — no default export keeps imports explicit.
 */

/** Wise web send URL — universal fallback that works on every platform. */
const WISE_WEB_URL = 'https://wise.com/send';

/**
 * Wise custom URL scheme.
 * Opens the Wise app directly on iOS and Android when installed.
 * The OS falls back to doing nothing if the app is absent, so callers
 * must also schedule a delayed window.open(WISE_WEB_URL) as a safety net.
 */
const WISE_APP_SCHEME = 'wise://';

/**
 * Detect the user's platform from a User-Agent string.
 *
 * @param {string} [userAgent=''] - navigator.userAgent
 * @returns {'ios' | 'android' | 'desktop'}
 */
function detectPlatform(userAgent = '') {
  const ua = userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  return 'desktop';
}

/**
 * Build the best Wise launch URL pair for the given platform.
 *
 * On mobile, primary is the app scheme and fallback is the web URL.
 * On desktop, both are the web URL — no app scheme needed.
 *
 * Callers should:
 *   1. Navigate to `primary` immediately.
 *   2. If on mobile, open `fallback` after ~1 500 ms so the user lands
 *      somewhere useful if Wise is not installed.
 *
 * @param {{ platform?: 'ios'|'android'|'desktop' }} [options={}]
 * @returns {{ primary: string, fallback: string }}
 */
function buildWiseLaunchUrl({ platform = 'desktop' } = {}) {
  if (platform === 'ios' || platform === 'android') {
    return { primary: WISE_APP_SCHEME, fallback: WISE_WEB_URL };
  }
  return { primary: WISE_WEB_URL, fallback: WISE_WEB_URL };
}

/**
 * Build a plain-text payment summary suitable for clipboard copy.
 * Users paste this into Wise (or any other app) when they cannot scan.
 *
 * @param {object} params
 * @param {string}  params.upiId         - e.g. "amit.kumar@okicici"
 * @param {string}  [params.payeeName]   - display name from QR
 * @param {number}  params.amountInr     - INR target amount
 * @param {number}  [params.usdEquivalent]
 * @param {number}  [params.exchangeRate]
 * @returns {string}
 */
function buildPaymentSummary({ upiId, payeeName, amountInr, usdEquivalent, exchangeRate }) {
  const lines = [
    `UPI ID: ${upiId}`,
    payeeName ? `Name:   ${payeeName}` : null,
    `Amount: ₹${Number(amountInr).toFixed(2)} INR`,
    usdEquivalent != null ? `≈ $${Number(usdEquivalent).toFixed(2)} USD` : null,
    exchangeRate != null ? `Rate:   ₹${Number(exchangeRate).toFixed(2)} per USD` : null,
  ];
  return lines.filter(Boolean).join('\n');
}

module.exports = {
  detectPlatform,
  buildWiseLaunchUrl,
  buildPaymentSummary,
  WISE_WEB_URL,
  WISE_APP_SCHEME,
};
