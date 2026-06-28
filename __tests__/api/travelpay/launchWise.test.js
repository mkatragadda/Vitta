/** @jest-environment node */
/**
 * Tests for launchWise() in services/upi/upiDeepLink.js
 *
 * Three paths:
 *   Android  → intent:// URL via window.location.href (Chrome handles fallback)
 *   iOS      → wise:// + 2-second timer → wise.com/send if app not opened
 *   Desktop  → always window.open('https://wise.com/send', '_blank', 'noopener')
 *
 * Environment: @jest-environment node (window === undefined by default).
 * We set global.window to a plain mock object in beforeEach so that
 * window.location.href, window.open, window.addEventListener, etc.
 * all hit our spies — no jsdom navigation interceptors involved.
 */

import { launchWise } from '../../../services/upi/upiDeepLink';

// ── Per-test accumulators ─────────────────────────────────────────────────────
let hrefLog      = [];   // every value written to window.location.href
let openLog      = [];   // every window.open() call
let clipboardLog = [];   // every clipboard.writeText() call

let _visibilityState    = 'visible';
let _visChangeListeners = [];
let _pagehideListeners  = [];

// ── Helpers ───────────────────────────────────────────────────────────────────

function setNavigator({ platform = 'MacIntel', userAgent = 'Mozilla/5.0 Chrome/113' } = {}) {
  global.navigator = {
    platform,
    userAgent,
    clipboard: {
      writeText: jest.fn().mockImplementation((v) => {
        clipboardLog.push(v);
        return Promise.resolve();
      }),
    },
  };
}

function lastHref() { return hrefLog[hrefLog.length - 1] ?? ''; }

// Simulate Wise app taking over the screen
function simulateAppOpen() {
  _visibilityState = 'hidden';
  _visChangeListeners.slice().forEach(cb => cb());
  _pagehideListeners.slice().forEach(cb => cb());
}

// ── Global mock setup ─────────────────────────────────────────────────────────

beforeEach(() => {
  hrefLog      = [];
  openLog      = [];
  clipboardLog = [];
  _visibilityState    = 'visible';
  _visChangeListeners = [];
  _pagehideListeners  = [];

  jest.useFakeTimers();

  // In @jest-environment node, window is NOT defined — global.window = undefined.
  // Freely assign a complete mock object. Source code's `window.*` references
  // will resolve to these mocks.
  const mockLocation = {};
  Object.defineProperty(mockLocation, 'href', {
    get:          () => lastHref(),
    set:          (v) => hrefLog.push(v),
    configurable: true,
    enumerable:   true,
  });

  global.window = {
    location: mockLocation,

    open: jest.fn((url) => openLog.push(url)),

    addEventListener: jest.fn((event, cb) => {
      if (event === 'pagehide') _pagehideListeners.push(cb);
    }),
    removeEventListener: jest.fn(),
  };

  // document is also undefined in node env — assign freely
  global.document = {
    get visibilityState() { return _visibilityState; },
    addEventListener: jest.fn((event, cb) => {
      if (event === 'visibilitychange') _visChangeListeners.push(cb);
    }),
    removeEventListener: jest.fn(),
  };

  // Default: desktop navigator
  setNavigator();
});

afterEach(() => {
  jest.useRealTimers();
  // Restore to undefined so tests are isolated
  delete global.window;
  delete global.document;
});

// ─── Android ──────────────────────────────────────────────────────────────────

describe('launchWise — Android', () => {
  beforeEach(() => {
    setNavigator({
      platform:  'Linux armv8l',
      userAgent: 'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 Chrome/113 Mobile Safari/537.36',
    });
  });

  test('sets window.location.href to intent:// URL with Wise package', async () => {
    await launchWise('merchant@okicici');
    expect(lastHref()).toMatch(/^intent:\/\/send#Intent/);
    expect(lastHref()).toContain('com.transferwise.android');
  });

  test('includes wise.com/send as encoded browser_fallback_url', async () => {
    await launchWise('merchant@okicici');
    expect(lastHref()).toContain('S.browser_fallback_url=');
    expect(lastHref()).toContain(encodeURIComponent('https://wise.com/send'));
  });

  test('does NOT call window.open (Chrome handles fallback natively)', async () => {
    await launchWise('merchant@okicici');
    expect(window.open).not.toHaveBeenCalled();
  });

  test('copies UPI ID to clipboard', async () => {
    await launchWise('merchant@okicici');
    expect(clipboardLog).toContain('merchant@okicici');
  });

  test('returns { platform: "android", copied: true }', async () => {
    const r = await launchWise('test@upi');
    expect(r).toMatchObject({ platform: 'android', copied: true });
  });
});

// ─── iOS ──────────────────────────────────────────────────────────────────────

describe('launchWise — iOS', () => {
  beforeEach(() => {
    setNavigator({
      platform:  'iPhone',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
    });
  });

  test('fires wise://send custom scheme (syntactically valid — opens Wise app)', async () => {
    await launchWise('friend@upi');
    expect(hrefLog[0]).toBe('wise://send');
  });

  test('navigates to wise.com/send after 1.5 s when app is NOT installed', async () => {
    await launchWise('friend@upi');

    jest.advanceTimersByTime(1499);
    expect(hrefLog).toHaveLength(1); // only the wise://send attempt

    jest.advanceTimersByTime(2);
    expect(hrefLog[1]).toBe('https://wise.com/send');
  });

  test('does NOT fall back to web when app IS installed (page hides)', async () => {
    await launchWise('friend@upi');

    simulateAppOpen();
    jest.advanceTimersByTime(3000);

    expect(hrefLog).toHaveLength(1); // only wise://send, no fallback
  });

  test('cancels web fallback when app opens within 1.5 s', async () => {
    await launchWise('friend@upi');

    jest.advanceTimersByTime(400);
    simulateAppOpen();
    jest.advanceTimersByTime(2000);

    expect(hrefLog).toHaveLength(1);
  });

  test('copies UPI ID to clipboard', async () => {
    await launchWise('friend@upi');
    expect(clipboardLog).toContain('friend@upi');
  });

  test('returns { platform: "ios", copied: true }', async () => {
    const r = await launchWise('test@upi');
    expect(r).toMatchObject({ platform: 'ios', copied: true });
  });
});

// ─── Desktop ─────────────────────────────────────────────────────────────────

describe('launchWise — Desktop', () => {
  beforeEach(() => {
    setNavigator({
      platform:  'MacIntel',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/113',
    });
  });

  test('opens wise.com/send in a new tab', async () => {
    await launchWise('someone@upi');
    expect(window.open).toHaveBeenCalledWith('https://wise.com/send', '_blank', 'noopener');
  });

  test('does NOT touch window.location.href', async () => {
    await launchWise('someone@upi');
    expect(hrefLog).toHaveLength(0);
  });

  test('returns { platform: "web" }', async () => {
    const r = await launchWise('test@upi');
    expect(r.platform).toBe('web');
  });
});

// ─── DevTools responsive-mode guard ──────────────────────────────────────────

describe('launchWise — DevTools responsive mode', () => {
  test('uses desktop path when UA says Android but platform is MacIntel', async () => {
    setNavigator({
      platform:  'MacIntel',   // DevTools does NOT spoof navigator.platform
      userAgent: 'Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 Chrome/113 Mobile Safari/537.36',
    });

    await launchWise('test@upi');

    expect(window.open).toHaveBeenCalledWith('https://wise.com/send', '_blank', 'noopener');
    expect(hrefLog).toHaveLength(0);
  });
});
