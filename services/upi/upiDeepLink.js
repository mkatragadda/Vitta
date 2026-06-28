/**
 * upiDeepLink.js
 *
 * Pure functions for building and firing UPI deep links.
 * No React dependencies — safe to test in Node.
 *
 * Supported apps: 'gpay', 'phonepe'
 * Wise is NOT a UPI app — handled separately via clipboard + app open.
 *
 * Deep link specs:
 *   iOS   : custom URL scheme  (tez://, phonepe://)
 *   Android: Intent URL        (intent://...#Intent;scheme=upi;package=...;end)
 *   Web   : not launchable for UPI apps
 */

// ---------------------------------------------------------------------------
// Platform detection
// ---------------------------------------------------------------------------

/**
 * Detect the current platform from userAgent.
 * Checks navigator.platform first to avoid false positives in Chrome DevTools
 * responsive mode, which spoofs userAgent but leaves platform as "MacIntel".
 *
 * @returns {'ios' | 'android' | 'web'}
 */
export function detectPlatform() {
  if (typeof navigator === 'undefined') return 'web';

  const ua       = (navigator.userAgent || '').toLowerCase();
  const platform = (navigator.platform  || '').toLowerCase();

  // Chrome DevTools responsive mode: UA looks mobile but platform is desktop
  const isRealMobile = /iphone|ipad|ipod|android/.test(platform);

  if (isRealMobile || /iphone|ipad|ipod/.test(ua))  return 'ios';
  if (isRealMobile || /android/.test(ua))            return 'android';
  return 'web';
}

// ---------------------------------------------------------------------------
// UPI parameter builder
// ---------------------------------------------------------------------------

const PLAY_STORE = {
  gpay:    'https://play.google.com/store/apps/details?id=com.google.android.apps.nbu.paisa.user',
  phonepe: 'https://play.google.com/store/apps/details?id=com.phonepe.app',
};

const PACKAGES = {
  gpay:    'com.google.android.apps.nbu.paisa.user',
  phonepe: 'com.phonepe.app',
};

/**
 * Build the NPCI-spec UPI parameter string.
 * Amount is omitted when falsy (open-amount QR — the app will prompt).
 *
 * @param {object} p
 * @param {string}  p.upiId       - payee UPI VPA (e.g. "merchant@okicici")
 * @param {string}  [p.payeeName] - display name
 * @param {number}  [p.amountInr] - INR amount; omit for open-amount
 * @param {string}  [p.note]      - transaction note
 * @param {string}  [p.merchantCode] - mc param for P2M
 * @returns {string} URL-encoded params (no leading "?")
 */
export function buildUpiParams({ upiId, payeeName, amountInr, note, merchantCode }) {
  const params = new URLSearchParams();
  params.set('pa', upiId);
  if (payeeName)    params.set('pn', payeeName);
  if (amountInr > 0) params.set('am', amountInr.toFixed(2));
  params.set('cu', 'INR');
  params.set('tn', note || 'Vitta Payment');
  if (merchantCode) params.set('mc', merchantCode);
  return params.toString();
}

// ---------------------------------------------------------------------------
// Per-app URL builders
// ---------------------------------------------------------------------------

/**
 * Build the deep link URL for a given app and platform.
 *
 * @param {'gpay' | 'phonepe'} appId
 * @param {'ios' | 'android' | 'web'} platform
 * @param {string} upiParams - result of buildUpiParams()
 * @returns {string | null} URL to fire, or null when not launchable
 */
export function buildDeepLinkUrl(appId, platform, upiParams) {
  if (platform === 'web') return null;

  if (appId === 'gpay') {
    if (platform === 'ios') {
      // Google Pay renamed from "Google Tez" — official iOS scheme is now gpay://
      return `gpay://upi/pay?${upiParams}`;
    }
    // Android Intent URL — Chrome intercepts natively, no JS needed
    // UPI URI spec is upi://pay?... so intent:// host must be 'pay', not 'upi/pay'
    const fallback = encodeURIComponent(PLAY_STORE.gpay);
    return `intent://pay?${upiParams}#Intent;scheme=upi;package=${PACKAGES.gpay};S.browser_fallback_url=${fallback};end`;
  }

  if (appId === 'phonepe') {
    if (platform === 'ios') {
      return `phonepe://pay?${upiParams}`;
    }
    const fallback = encodeURIComponent(PLAY_STORE.phonepe);
    return `intent://pay?${upiParams}#Intent;scheme=upi;package=${PACKAGES.phonepe};S.browser_fallback_url=${fallback};end`;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Launch
// ---------------------------------------------------------------------------

/**
 * Fire a UPI deep link by setting window.location.href.
 * Must be called synchronously inside a user-gesture handler (tap/click)
 * or popup blockers / iOS Safari will suppress it.
 *
 * Returns the URL that was fired (for logging) or null on web.
 *
 * @param {'gpay' | 'phonepe'} appId
 * @param {object} upiData  - same shape as buildUpiParams input
 * @returns {{ url: string | null, platform: string }}
 */
export function launchUpiApp(appId, upiData) {
  const platform  = detectPlatform();
  const upiParams = buildUpiParams(upiData);
  const url       = buildDeepLinkUrl(appId, platform, upiParams);

  if (url && typeof window !== 'undefined') {
    window.location.href = url;
  }

  return { url, platform };
}

/**
 * Open Wise for the user to complete a transfer.
 * Copies upiId to clipboard and pre-fills amount + currency in the deep link.
 *
 * @param {string} upiId      - payee UPI VPA (copied to clipboard for pasting in Wise)
 * @param {number} [amountInr] - INR amount to pre-fill in the Wise send screen
 * @returns {{ platform: string, copied: boolean }}
 */
export async function launchWise(upiId, amountInr = 0) {
  const platform = detectPlatform();
  let copied = false;

  // Copy UPI ID to clipboard so user can paste it as the recipient in Wise
  if (upiId && typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(upiId);
      copied = true;
    } catch { /* non-fatal */ }
  }

  if (typeof window === 'undefined') return { platform, copied };

  // Web fallback URL — wise.com/send supports sendAmount/sourceCurrency/targetCurrency
  // for the web form, but the native app scheme (transferwise://) ignores all params.
  const webFallback = amountInr > 0
    ? `https://wise.com/send?sendAmount=${amountInr}&sourceCurrency=INR&targetCurrency=INR`
    : 'https://wise.com/send';

  // Guard against Chrome DevTools UA spoofing.
  const nativePlatform    = (navigator.platform || '').toLowerCase();
  const DESKTOP_PLATFORMS = /^(macintel|macppc|mac68k|win32|wince|linux x86_64|linux i686|linux i386|freebsd|sunos|openbsd)/;
  const isRealMobile      = !DESKTOP_PLATFORMS.test(nativePlatform);

  // ── Android ───────────────────────────────────────────────────────────────
  // Wise's Android package is com.transferwise.android; scheme is 'wise'.
  // Intent URL lets Chrome open the app (with amount params) or fall back to web.
  if (isRealMobile && platform === 'android') {
    // Native app params not supported — pass clean scheme, web fallback has params
    const fallback = encodeURIComponent(webFallback);
    window.location.href =
      `intent://send#Intent;scheme=wise;package=com.transferwise.android;S.browser_fallback_url=${fallback};end`;
    return { platform, copied };
  }

  // ── iOS ───────────────────────────────────────────────────────────────────
  // Wise's iOS URL scheme is 'transferwise://' (old name, still registered).
  // Navigation is handled by an <a href="transferwise://send?..."> anchor in
  // QuickPaySheet — custom schemes on iOS require a real user-gesture tap.
  // This branch is a safe fallback when called from a non-anchor context.
  if (isRealMobile && platform === 'ios') {
    window.open(webFallback, '_blank', 'noopener');
    return { platform, copied };
  }

  // ── Desktop / web ─────────────────────────────────────────────────────────
  window.open(webFallback, '_blank', 'noopener');
  return { platform, copied };
}

// ---------------------------------------------------------------------------
// App catalog (used by UI to render the bottom sheet rows)
// ---------------------------------------------------------------------------

export const APP_CATALOG = [
  {
    id:          'gpay',
    name:        'Google Pay',
    shortName:   'GPay',
    recommended: true,
  },
  {
    id:          'phonepe',
    name:        'PhonePe',
    shortName:   'PhonePe',
    recommended: false,
  },
];
