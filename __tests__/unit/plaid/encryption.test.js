/**
 * Encryption Utility Tests — Phase 2
 *
 * Validates AES-256-GCM encrypt/decrypt behaviour, key validation,
 * input guards, and the security properties the rest of the Plaid
 * integration depends on.
 */

const crypto = require('crypto');

// ---------------------------------------------------------------------------
// Helper: generate a valid 32-byte key and set it in the environment
// ---------------------------------------------------------------------------
function setValidKey() {
  process.env.PLAID_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');
}

// Fresh require after each env change so getKey() re-reads process.env
function loadModule() {
  jest.resetModules();
  return require('../../../utils/encryption');
}

// ---------------------------------------------------------------------------
// 1. Round-trip correctness
// ---------------------------------------------------------------------------

describe('Encryption — round-trip correctness', () => {
  beforeEach(() => {
    setValidKey();
  });

  afterEach(() => {
    delete process.env.PLAID_ENCRYPTION_KEY;
  });

  test('encrypting then decrypting returns the original plaintext', () => {
    const { encryptToken, decryptToken } = loadModule();
    const original = 'access-sandbox-abc123def456';

    const encrypted = encryptToken(original);
    const decrypted = decryptToken(encrypted);

    expect(decrypted).toBe(original);
  });

  test('round-trips a long token string', () => {
    const { encryptToken, decryptToken } = loadModule();
    const original = 'access-sandbox-' + 'x'.repeat(200);

    expect(decryptToken(encryptToken(original))).toBe(original);
  });

  test('round-trips a token with special characters', () => {
    const { encryptToken, decryptToken } = loadModule();
    const original = 'access-sandbox-Ab+/Cd==EfGh_IjKl';

    expect(decryptToken(encryptToken(original))).toBe(original);
  });
});

// ---------------------------------------------------------------------------
// 2. Ciphertext format
// ---------------------------------------------------------------------------

describe('Encryption — ciphertext format', () => {
  beforeEach(() => {
    setValidKey();
  });

  afterEach(() => {
    delete process.env.PLAID_ENCRYPTION_KEY;
  });

  test('encrypted output has exactly 3 colon-separated parts', () => {
    const { encryptToken } = loadModule();
    const encrypted = encryptToken('test-token');
    const parts = encrypted.split(':');

    expect(parts).toHaveLength(3);
  });

  test('IV part decodes to 12 bytes', () => {
    const { encryptToken } = loadModule();
    const encrypted = encryptToken('test-token');
    const ivB64 = encrypted.split(':')[0];
    const ivBuf = Buffer.from(ivB64, 'base64');

    expect(ivBuf.length).toBe(12);
  });

  test('auth tag part decodes to 16 bytes', () => {
    const { encryptToken } = loadModule();
    const encrypted = encryptToken('test-token');
    const tagB64 = encrypted.split(':')[2];
    const tagBuf = Buffer.from(tagB64, 'base64');

    expect(tagBuf.length).toBe(16);
  });

  test('ciphertext part is non-empty base64', () => {
    const { encryptToken } = loadModule();
    const encrypted = encryptToken('test-token');
    const ciphertextB64 = encrypted.split(':')[1];

    expect(ciphertextB64.length).toBeGreaterThan(0);
    // Valid base64 should not throw when decoded
    const buf = Buffer.from(ciphertextB64, 'base64');
    expect(buf.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 3. Non-determinism (different ciphertext each time)
// ---------------------------------------------------------------------------

describe('Encryption — non-determinism', () => {
  beforeEach(() => {
    setValidKey();
  });

  afterEach(() => {
    delete process.env.PLAID_ENCRYPTION_KEY;
  });

  test('two encryptions of the same plaintext produce different ciphertexts', () => {
    const { encryptToken } = loadModule();
    const plaintext = 'access-sandbox-same-input';

    const a = encryptToken(plaintext);
    const b = encryptToken(plaintext);

    // IVs are random — the full outputs must differ
    expect(a).not.toBe(b);
  });

  test('IVs differ between consecutive encryptions', () => {
    const { encryptToken } = loadModule();

    const ivA = encryptToken('token').split(':')[0];
    const ivB = encryptToken('token').split(':')[0];

    expect(ivA).not.toBe(ivB);
  });
});

// ---------------------------------------------------------------------------
// 4. Plaintext is NOT recoverable from ciphertext without the key
// ---------------------------------------------------------------------------

describe('Encryption — plaintext not visible in ciphertext', () => {
  beforeEach(() => {
    setValidKey();
  });

  afterEach(() => {
    delete process.env.PLAID_ENCRYPTION_KEY;
  });

  test('plaintext does not appear as a substring of the encrypted output', () => {
    const { encryptToken } = loadModule();
    const plaintext = 'access-sandbox-unique-marker-12345';

    const encrypted = encryptToken(plaintext);

    expect(encrypted).not.toContain(plaintext);
  });
});

// ---------------------------------------------------------------------------
// 5. Tamper detection (GCM authentication tag)
// ---------------------------------------------------------------------------

describe('Encryption — tamper detection', () => {
  beforeEach(() => {
    setValidKey();
  });

  afterEach(() => {
    delete process.env.PLAID_ENCRYPTION_KEY;
  });

  test('modifying the ciphertext part causes decryption to throw', () => {
    const { encryptToken, decryptToken } = loadModule();
    const encrypted = encryptToken('test-token');
    const [iv, , tag] = encrypted.split(':');

    // Flip a character in the ciphertext
    const tampered = `${iv}:AAAA:${tag}`;

    expect(() => decryptToken(tampered)).toThrow();
  });

  test('modifying the auth tag causes decryption to throw', () => {
    const { encryptToken, decryptToken } = loadModule();
    const encrypted = encryptToken('test-token');
    const [iv, ct] = encrypted.split(':');

    // Replace tag with garbage
    const tampered = `${iv}:${ct}:AAAAAAAAAAAAAAAAAAAAAA==`;

    expect(() => decryptToken(tampered)).toThrow();
  });

  test('modifying the IV causes decryption to throw', () => {
    const { encryptToken, decryptToken } = loadModule();
    const encrypted = encryptToken('test-token');
    const [, ct, tag] = encrypted.split(':');

    // Replace IV with a different random 12-byte value
    const fakeIv = crypto.randomBytes(12).toString('base64');
    const tampered = `${fakeIv}:${ct}:${tag}`;

    expect(() => decryptToken(tampered)).toThrow();
  });

  test('decryption with a different key throws', () => {
    const { encryptToken } = loadModule();
    const encrypted = encryptToken('test-token');

    // Switch to a different valid key
    process.env.PLAID_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');
    const { decryptToken } = loadModule();

    expect(() => decryptToken(encrypted)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// 6. Key validation — missing or wrong size
// ---------------------------------------------------------------------------

describe('Encryption — key validation', () => {
  afterEach(() => {
    delete process.env.PLAID_ENCRYPTION_KEY;
  });

  test('encryptToken throws when PLAID_ENCRYPTION_KEY is not set', () => {
    delete process.env.PLAID_ENCRYPTION_KEY;
    const { encryptToken } = loadModule();

    expect(() => encryptToken('test')).toThrow(/PLAID_ENCRYPTION_KEY is not set/);
  });

  test('decryptToken throws when PLAID_ENCRYPTION_KEY is not set', () => {
    delete process.env.PLAID_ENCRYPTION_KEY;
    const { decryptToken } = loadModule();

    expect(() => decryptToken('a:b:c')).toThrow(/PLAID_ENCRYPTION_KEY is not set/);
  });

  test('encryptToken throws when key is too short (16 bytes)', () => {
    process.env.PLAID_ENCRYPTION_KEY = crypto.randomBytes(16).toString('base64');
    const { encryptToken } = loadModule();

    expect(() => encryptToken('test')).toThrow(/exactly 32 bytes/);
  });

  test('encryptToken throws when key is too long (64 bytes)', () => {
    process.env.PLAID_ENCRYPTION_KEY = crypto.randomBytes(64).toString('base64');
    const { encryptToken } = loadModule();

    expect(() => encryptToken('test')).toThrow(/exactly 32 bytes/);
  });

  test('encryptToken throws when key is empty string', () => {
    process.env.PLAID_ENCRYPTION_KEY = '';
    const { encryptToken } = loadModule();

    expect(() => encryptToken('test')).toThrow(/PLAID_ENCRYPTION_KEY is not set/);
  });
});

// ---------------------------------------------------------------------------
// 7. Input guards — encryptToken
// ---------------------------------------------------------------------------

describe('Encryption — encryptToken input guards', () => {
  beforeEach(() => {
    setValidKey();
  });

  afterEach(() => {
    delete process.env.PLAID_ENCRYPTION_KEY;
  });

  test('throws on empty string', () => {
    const { encryptToken } = loadModule();
    expect(() => encryptToken('')).toThrow(/non-empty string/);
  });

  test('throws on null', () => {
    const { encryptToken } = loadModule();
    expect(() => encryptToken(null)).toThrow(/non-empty string/);
  });

  test('throws on undefined', () => {
    const { encryptToken } = loadModule();
    expect(() => encryptToken(undefined)).toThrow(/non-empty string/);
  });

  test('throws on number', () => {
    const { encryptToken } = loadModule();
    expect(() => encryptToken(12345)).toThrow(/non-empty string/);
  });
});

// ---------------------------------------------------------------------------
// 8. Input guards — decryptToken
// ---------------------------------------------------------------------------

describe('Encryption — decryptToken input guards', () => {
  beforeEach(() => {
    setValidKey();
  });

  afterEach(() => {
    delete process.env.PLAID_ENCRYPTION_KEY;
  });

  test('throws on non-string input', () => {
    const { decryptToken } = loadModule();
    expect(() => decryptToken(null)).toThrow(/requires a string/);
  });

  test('throws when format has fewer than 3 parts', () => {
    const { decryptToken } = loadModule();
    expect(() => decryptToken('only-one-part')).toThrow(/3 colon-separated parts/);
  });

  test('throws when format has more than 3 parts', () => {
    const { decryptToken } = loadModule();
    expect(() => decryptToken('a:b:c:d')).toThrow(/3 colon-separated parts/);
  });

  test('throws when format has exactly 2 parts', () => {
    const { decryptToken } = loadModule();
    expect(() => decryptToken('iv:ciphertext')).toThrow(/3 colon-separated parts/);
  });
});
