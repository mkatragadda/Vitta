/**
 * wiseLauncher tests
 * Pure functions — no mocks needed.
 */

import {
  detectPlatform,
  buildWiseLaunchUrl,
  buildPaymentSummary,
  WISE_WEB_URL,
  WISE_APP_SCHEME,
} from '../wiseLauncher';

// ---------------------------------------------------------------------------
// detectPlatform
// ---------------------------------------------------------------------------
describe('detectPlatform', () => {
  test('detects iPhone', () => {
    expect(detectPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe('ios');
  });

  test('detects iPad', () => {
    expect(detectPlatform('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)')).toBe('ios');
  });

  test('detects iPod', () => {
    expect(detectPlatform('Mozilla/5.0 (iPod touch; CPU iPhone OS 17_0 like Mac OS X)')).toBe('ios');
  });

  test('detects Android phone', () => {
    expect(detectPlatform('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit')).toBe('android');
  });

  test('detects Android tablet', () => {
    expect(detectPlatform('Mozilla/5.0 (Linux; Android 13; SM-T870) AppleWebKit')).toBe('android');
  });

  test('returns desktop for macOS Chrome', () => {
    expect(detectPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120')).toBe('desktop');
  });

  test('returns desktop for Windows Edge', () => {
    expect(detectPlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edg/120')).toBe('desktop');
  });

  test('returns desktop for empty string', () => {
    expect(detectPlatform('')).toBe('desktop');
  });

  test('returns desktop when called with no argument', () => {
    expect(detectPlatform()).toBe('desktop');
  });

  test('is case-insensitive for user agents', () => {
    expect(detectPlatform('IPHONE SAFARI')).toBe('ios');
    expect(detectPlatform('ANDROID CHROME')).toBe('android');
  });
});

// ---------------------------------------------------------------------------
// buildWiseLaunchUrl
// ---------------------------------------------------------------------------
describe('buildWiseLaunchUrl', () => {
  test('returns app scheme as primary for ios', () => {
    const { primary, fallback } = buildWiseLaunchUrl({ platform: 'ios' });
    expect(primary).toBe(WISE_APP_SCHEME);
    expect(fallback).toBe(WISE_WEB_URL);
  });

  test('returns app scheme as primary for android', () => {
    const { primary, fallback } = buildWiseLaunchUrl({ platform: 'android' });
    expect(primary).toBe(WISE_APP_SCHEME);
    expect(fallback).toBe(WISE_WEB_URL);
  });

  test('returns web URL for both slots on desktop', () => {
    const { primary, fallback } = buildWiseLaunchUrl({ platform: 'desktop' });
    expect(primary).toBe(WISE_WEB_URL);
    expect(fallback).toBe(WISE_WEB_URL);
  });

  test('defaults to desktop when platform is omitted', () => {
    const { primary } = buildWiseLaunchUrl();
    expect(primary).toBe(WISE_WEB_URL);
  });

  test('defaults to desktop when options object is empty', () => {
    const { primary } = buildWiseLaunchUrl({});
    expect(primary).toBe(WISE_WEB_URL);
  });

  test('fallback is always a valid https URL', () => {
    for (const platform of ['ios', 'android', 'desktop']) {
      const { fallback } = buildWiseLaunchUrl({ platform });
      expect(fallback).toMatch(/^https:\/\//);
    }
  });
});

// ---------------------------------------------------------------------------
// buildPaymentSummary
// ---------------------------------------------------------------------------
describe('buildPaymentSummary', () => {
  const base = {
    upiId: 'amit.kumar@okicici',
    payeeName: 'Amit Kumar',
    amountInr: 5000,
    usdEquivalent: 59.8,
    exchangeRate: 83.61,
  };

  test('includes UPI ID', () => {
    expect(buildPaymentSummary(base)).toContain('amit.kumar@okicici');
  });

  test('includes payee name when provided', () => {
    expect(buildPaymentSummary(base)).toContain('Amit Kumar');
  });

  test('includes INR amount formatted to 2 decimals', () => {
    expect(buildPaymentSummary(base)).toContain('₹5000.00 INR');
  });

  test('includes USD equivalent when provided', () => {
    expect(buildPaymentSummary(base)).toContain('$59.80 USD');
  });

  test('includes exchange rate when provided', () => {
    expect(buildPaymentSummary(base)).toContain('₹83.61 per USD');
  });

  test('omits payee name line when not provided', () => {
    const summary = buildPaymentSummary({ ...base, payeeName: undefined });
    expect(summary).not.toContain('Name:');
  });

  test('omits USD equivalent line when not provided', () => {
    const summary = buildPaymentSummary({ ...base, usdEquivalent: undefined });
    // The "≈ $X.XX USD" line should be absent; "per USD" in the rate line is fine
    expect(summary).not.toMatch(/≈ \$/);
  });

  test('omits rate line when not provided', () => {
    const summary = buildPaymentSummary({ ...base, exchangeRate: undefined });
    expect(summary).not.toContain('Rate:');
  });

  test('formats amountInr with exactly 2 decimal places', () => {
    const summary = buildPaymentSummary({ ...base, amountInr: 100 });
    expect(summary).toContain('₹100.00 INR');
  });

  test('formats usdEquivalent with exactly 2 decimal places', () => {
    const summary = buildPaymentSummary({ ...base, usdEquivalent: 1.1 });
    expect(summary).toContain('$1.10 USD');
  });

  test('returns a newline-separated string', () => {
    const summary = buildPaymentSummary(base);
    expect(summary.split('\n').length).toBeGreaterThan(1);
  });
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
describe('exported constants', () => {
  test('WISE_WEB_URL is a valid https URL', () => {
    expect(WISE_WEB_URL).toMatch(/^https:\/\//);
  });

  test('WISE_APP_SCHEME starts with wise://', () => {
    expect(WISE_APP_SCHEME).toMatch(/^wise:\/\//);
  });
});
