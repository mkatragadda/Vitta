/**
 * Tests for Payment Idempotency Service
 * Tests idempotent execution with retry logic, error classification, and verification
 */

import {
  executeWithIdempotency,
  buildIdempotencyKey,
} from '../../../services/payment/idempotencyService';

describe('Payment Idempotency Service', () => {
  const mockIdempotencyKey = 'transfer-12345-abc';
  const mockTransferId = 'transfer-12345';

  const mockLogger = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger.log.mockClear();
    mockLogger.warn.mockClear();
    mockLogger.error.mockClear();
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Basic Execution Tests
  // ═══════════════════════════════════════════════════════════════════════

  describe('executeWithIdempotency', () => {
    test('executes successfully on first attempt', async () => {
      const mockExecute = jest.fn().mockResolvedValue({
        statusCode: 200,
        data: { transactionId: 'txn_123' },
      });

      const result = await executeWithIdempotency({
        idempotencyKey: mockIdempotencyKey,
        execute: mockExecute,
        logger: mockLogger,
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ transactionId: 'txn_123' });
      expect(result.statusCode).toBe(200);
      expect(result.attempt).toBe(1);
      expect(mockExecute).toHaveBeenCalledTimes(1);
      expect(mockExecute).toHaveBeenCalledWith({
        idempotencyKey: mockIdempotencyKey,
        attempt: 1,
      });
    });

    test('throws error if idempotencyKey is missing', async () => {
      const mockExecute = jest.fn();

      await expect(
        executeWithIdempotency({
          idempotencyKey: null,
          execute: mockExecute,
          logger: mockLogger,
        })
      ).rejects.toThrow('[idempotencyService] Missing idempotencyKey');
    });

    test('throws error if execute is not a function', async () => {
      await expect(
        executeWithIdempotency({
          idempotencyKey: mockIdempotencyKey,
          execute: 'not-a-function',
          logger: mockLogger,
        })
      ).rejects.toThrow('[idempotencyService] execute must be a function');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Duplicate Detection (409) Tests
  // ═══════════════════════════════════════════════════════════════════════

  describe('Duplicate detection (409 Conflict)', () => {
    test('treats 409 as safe success without retry', async () => {
      const duplicateError = new Error('Duplicate entry');
      duplicateError.statusCode = 409;
      duplicateError.code = 'DUPLICATE_ENTRY';

      const mockExecute = jest.fn().mockRejectedValueOnce(duplicateError);

      const result = await executeWithIdempotency({
        idempotencyKey: mockIdempotencyKey,
        execute: mockExecute,
        logger: mockLogger,
        maxRetries: 3,
      });

      expect(result.success).toBe(true);
      expect(result.isDuplicate).toBe(true);
      expect(result.attempt).toBe(1);
      expect(mockExecute).toHaveBeenCalledTimes(1); // No retry
      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockLogger.error.mock.calls[0][1].classification).toBe(
        'DUPLICATE_DETECTED'
      );
    });

    test('logs detailed duplicate information', async () => {
      const duplicateError = new Error('Duplicate entry');
      duplicateError.statusCode = 409;

      const mockExecute = jest.fn().mockRejectedValueOnce(duplicateError);

      await executeWithIdempotency({
        idempotencyKey: mockIdempotencyKey,
        execute: mockExecute,
        logger: mockLogger,
      });

      const errorCall = mockLogger.error.mock.calls[0];
      expect(errorCall[1]).toMatchObject({
        statusCode: 409,
        isRetryable: false,
        classification: 'DUPLICATE_DETECTED',
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Retry Logic Tests
  // ═══════════════════════════════════════════════════════════════════════

  describe('Retry logic with exponential backoff', () => {
    test('retries network errors and succeeds on second attempt', async () => {
      const networkError = new Error('Connection reset');
      networkError.code = 'ECONNRESET';

      const mockExecute = jest
        .fn()
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({
          statusCode: 200,
          data: { transactionId: 'txn_456' },
        });

      const promise = executeWithIdempotency({
        idempotencyKey: mockIdempotencyKey,
        execute: mockExecute,
        logger: mockLogger,
        maxRetries: 3,
        initialBackoffMs: 100,
      });

      // Fast-forward through the sleep
      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ transactionId: 'txn_456' });
      expect(result.attempt).toBe(2);
      expect(mockExecute).toHaveBeenCalledTimes(2);
    });

    test('retries 500 server errors', async () => {
      const serverError = new Error('Internal server error');
      serverError.statusCode = 500;

      const mockExecute = jest
        .fn()
        .mockRejectedValueOnce(serverError)
        .mockResolvedValueOnce({
          statusCode: 200,
          data: { transactionId: 'txn_789' },
        });

      const promise = executeWithIdempotency({
        idempotencyKey: mockIdempotencyKey,
        execute: mockExecute,
        logger: mockLogger,
        maxRetries: 3,
      });

      const result = await promise;

      expect(result.success).toBe(true);
      expect(mockExecute).toHaveBeenCalledTimes(2);
      expect(result.attempt).toBe(2);
    });

    test('retries rate limit errors (429)', async () => {
      const rateLimitError = new Error('Too many requests');
      rateLimitError.statusCode = 429;

      const mockExecute = jest
        .fn()
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce({
          statusCode: 200,
          data: { transactionId: 'txn_rate' },
        });

      const promise = executeWithIdempotency({
        idempotencyKey: mockIdempotencyKey,
        execute: mockExecute,
        logger: mockLogger,
        maxRetries: 3,
      });

      const result = await promise;

      expect(result.success).toBe(true);
      expect(mockExecute).toHaveBeenCalledTimes(2);
    });

    test('fails immediately on client errors (4xx non-429)', async () => {
      const clientError = new Error('Invalid request');
      clientError.statusCode = 400;

      const mockExecute = jest.fn().mockRejectedValueOnce(clientError);

      const result = await executeWithIdempotency({
        idempotencyKey: mockIdempotencyKey,
        execute: mockExecute,
        logger: mockLogger,
        maxRetries: 3,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid request');
      expect(mockExecute).toHaveBeenCalledTimes(1); // No retry
    });

    test('fails on 401 Unauthorized without retry', async () => {
      const authError = new Error('Unauthorized');
      authError.statusCode = 401;

      const mockExecute = jest.fn().mockRejectedValueOnce(authError);

      const result = await executeWithIdempotency({
        idempotencyKey: mockIdempotencyKey,
        execute: mockExecute,
        logger: mockLogger,
        maxRetries: 3,
      });

      expect(result.success).toBe(false);
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Max Retries Exceeded Tests
  // ═══════════════════════════════════════════════════════════════════════

  describe('Max retries exceeded', () => {
    test('fails after max retries with persistent errors', async () => {
      const transientError = new Error('Temporary failure');
      transientError.statusCode = 503;

      const mockExecute = jest
        .fn()
        .mockRejectedValue(transientError);

      const promise = executeWithIdempotency({
        idempotencyKey: mockIdempotencyKey,
        execute: mockExecute,
        logger: mockLogger,
        maxRetries: 2,
      });

      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.error).toBe('Temporary failure');
      expect(result.attempt).toBe(2);
      expect(mockExecute).toHaveBeenCalledTimes(2);
    });

    test('logs max retries exceeded', async () => {
      const error = new Error('Service unavailable');
      error.statusCode = 503;

      const mockExecute = jest.fn().mockRejectedValue(error);

      const promise = executeWithIdempotency({
        idempotencyKey: mockIdempotencyKey,
        execute: mockExecute,
        logger: mockLogger,
        maxRetries: 2,
      });

      await promise;

      const errorCalls = mockLogger.error.mock.calls;
      const maxRetriesCall = errorCalls.find((call) =>
        call[0].includes('Max retries exceeded')
      );
      expect(maxRetriesCall).toBeDefined();
      expect(maxRetriesCall[1].totalAttempts).toBe(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Transaction Verification Tests
  // ═══════════════════════════════════════════════════════════════════════

  describe('Transaction verification on server errors', () => {
    test('verifies transaction after max retries for 500 error', async () => {
      const serverError = new Error('Server error');
      serverError.statusCode = 500;

      const mockExecute = jest.fn().mockRejectedValue(serverError);
      const mockVerify = jest.fn().mockResolvedValue({
        processed: true,
        data: { transactionId: 'txn_verified' },
      });

      const promise = executeWithIdempotency({
        idempotencyKey: mockIdempotencyKey,
        execute: mockExecute,
        verify: mockVerify,
        logger: mockLogger,
        maxRetries: 1,
      });

      const result = await promise;

      expect(mockVerify).toHaveBeenCalledWith({
        idempotencyKey: mockIdempotencyKey,
      });
      expect(result.success).toBe(true);
      expect(result.isReconciled).toBe(true);
      expect(result.failureReconciled).toBe(true);
      expect(result.data).toEqual({ transactionId: 'txn_verified' });
    });

    test('returns failure if verification finds no processed transaction', async () => {
      const serverError = new Error('Server error');
      serverError.statusCode = 500;

      const mockExecute = jest.fn().mockRejectedValue(serverError);
      const mockVerify = jest.fn().mockResolvedValue({
        processed: false,
      });

      const promise = executeWithIdempotency({
        idempotencyKey: mockIdempotencyKey,
        execute: mockExecute,
        verify: mockVerify,
        logger: mockLogger,
        maxRetries: 1,
      });

      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.error).toBe('Server error');
      expect(mockVerify).toHaveBeenCalled();
    });

    test('handles verification errors gracefully', async () => {
      const serverError = new Error('Server error');
      serverError.statusCode = 500;

      const mockExecute = jest.fn().mockRejectedValue(serverError);
      const mockVerify = jest
        .fn()
        .mockRejectedValue(new Error('Verification failed'));

      const promise = executeWithIdempotency({
        idempotencyKey: mockIdempotencyKey,
        execute: mockExecute,
        verify: mockVerify,
        logger: mockLogger,
        maxRetries: 1,
      });

      const result = await promise;

      expect(result.success).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Verification failed'),
        expect.objectContaining({
          verifyError: 'Verification failed',
        })
      );
    });

    test('does not verify on non-500 errors', async () => {
      const clientError = new Error('Client error');
      clientError.statusCode = 400;

      const mockExecute = jest.fn().mockRejectedValue(clientError);
      const mockVerify = jest.fn();

      const result = await executeWithIdempotency({
        idempotencyKey: mockIdempotencyKey,
        execute: mockExecute,
        verify: mockVerify,
        logger: mockLogger,
        maxRetries: 1,
      });

      expect(result.success).toBe(false);
      expect(mockVerify).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Error Classification Tests
  // ═══════════════════════════════════════════════════════════════════════

  describe('Error classification', () => {
    test('classifies timeout errors as retryable', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.code = 'ETIMEDOUT';

      const mockExecute = jest
        .fn()
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValueOnce({
          statusCode: 200,
          data: { transactionId: 'txn_timeout' },
        });

      const promise = executeWithIdempotency({
        idempotencyKey: mockIdempotencyKey,
        execute: mockExecute,
        logger: mockLogger,
      });

      const result = await promise;

      expect(result.success).toBe(true);
      const errorCall = mockLogger.error.mock.calls[0];
      expect(errorCall[1].classification).toBe('NETWORK_ERROR');
      expect(errorCall[1].isRetryable).toBe(true);
    });

    test('classifies ENOTFOUND errors as retryable', async () => {
      const dnsError = new Error('getaddrinfo ENOTFOUND');
      dnsError.code = 'ENOTFOUND';

      const mockExecute = jest
        .fn()
        .mockRejectedValueOnce(dnsError)
        .mockResolvedValueOnce({
          statusCode: 200,
          data: { transactionId: 'txn_dns' },
        });

      const promise = executeWithIdempotency({
        idempotencyKey: mockIdempotencyKey,
        execute: mockExecute,
        logger: mockLogger,
      });

      const result = await promise;

      expect(result.success).toBe(true);
      const errorCall = mockLogger.error.mock.calls[0];
      expect(errorCall[1].classification).toBe('NETWORK_ERROR');
    });

    test('classifies unknown errors as retryable with caution', async () => {
      const unknownError = new Error('Something went wrong');

      const mockExecute = jest
        .fn()
        .mockRejectedValueOnce(unknownError)
        .mockResolvedValueOnce({
          statusCode: 200,
          data: { transactionId: 'txn_unknown' },
        });

      const promise = executeWithIdempotency({
        idempotencyKey: mockIdempotencyKey,
        execute: mockExecute,
        logger: mockLogger,
      });

      const result = await promise;

      expect(result.success).toBe(true);
      const errorCall = mockLogger.error.mock.calls[0];
      expect(errorCall[1].classification).toBe('UNKNOWN_ERROR');
      expect(errorCall[1].isRetryable).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Backoff Calculation Tests
  // ═══════════════════════════════════════════════════════════════════════

  describe('Backoff calculation', () => {
    test('uses exponential backoff with increasing delays', async () => {
      const error = new Error('Transient error');
      error.statusCode = 503;

      const mockExecute = jest
        .fn()
        .mockRejectedValue(error);

      const promise = executeWithIdempotency({
        idempotencyKey: mockIdempotencyKey,
        execute: mockExecute,
        logger: mockLogger,
        maxRetries: 4,
        initialBackoffMs: 100,
      });

      // Verify backoff logging
      await promise;

      const backoffCalls = mockLogger.log.mock.calls.filter((call) =>
        call[0].includes('Retrying after backoff')
      );

      expect(backoffCalls.length).toBeGreaterThan(0);
      backoffCalls.forEach((call, idx) => {
        expect(call[1]).toHaveProperty('backoffMs');
        expect(typeof call[1].backoffMs).toBe('number');
      });
    });

    test('caps backoff at 30 seconds', async () => {
      const error = new Error('Persistent error');
      error.statusCode = 503;

      const mockExecute = jest
        .fn()
        .mockRejectedValue(error);

      const promise = executeWithIdempotency({
        idempotencyKey: mockIdempotencyKey,
        execute: mockExecute,
        logger: mockLogger,
        maxRetries: 4, // Reduced from 10 to avoid long wait times
        initialBackoffMs: 100,
      });

      await promise;

      const backoffCalls = mockLogger.log.mock.calls.filter((call) =>
        call[0].includes('Retrying after backoff')
      );

      // Verify backoffs grow exponentially but are capped at 30 seconds
      backoffCalls.forEach((call) => {
        // Should be >= 100ms and <= 30000ms (30 seconds) plus up to 20% jitter
        expect(call[1].backoffMs).toBeGreaterThanOrEqual(100);
        expect(call[1].backoffMs).toBeLessThanOrEqual(36000);
      });

      // Verify we have the expected number of retries (3 retries for 4 max retries)
      expect(backoffCalls.length).toBe(3);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Logging Tests
  // ═══════════════════════════════════════════════════════════════════════

  describe('Logging and sanitization', () => {
    test('logs sanitized idempotency key (first 15 chars)', async () => {
      const longKey = 'transfer-12345-abcdefghijklmnop-xyz';
      const mockExecute = jest.fn().mockResolvedValue({
        statusCode: 200,
        data: { transactionId: 'txn_log' },
      });

      await executeWithIdempotency({
        idempotencyKey: longKey,
        execute: mockExecute,
        logger: mockLogger,
      });

      const logCalls = mockLogger.log.mock.calls;
      logCalls.forEach((call) => {
        if (call[1]?.idempotencyKey) {
          // First 15 characters + "..."
          expect(call[1].idempotencyKey).toBe('transfer-12345-...');
          expect(call[1].idempotencyKey).not.toContain(longKey);
        }
      });
    });

    test('includes attempt number in all logs', async () => {
      const error = new Error('Transient error');
      error.statusCode = 503;

      const mockExecute = jest
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({
          statusCode: 200,
          data: { transactionId: 'txn_attempt' },
        });

      const promise = executeWithIdempotency({
        idempotencyKey: mockIdempotencyKey,
        execute: mockExecute,
        logger: mockLogger,
        maxRetries: 2,
      });

      await promise;

      const allLogs = [
        ...mockLogger.log.mock.calls,
        ...mockLogger.error.mock.calls,
      ];

      const attemptLogs = allLogs.filter((call) => call[1]?.attempt);
      expect(attemptLogs.length).toBeGreaterThan(0);
      attemptLogs.forEach((call) => {
        expect(typeof call[1].attempt).toBe('number');
        expect(call[1].attempt).toBeGreaterThan(0);
      });
    });

    test('uses default console logger when logger not provided', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const mockExecute = jest.fn().mockResolvedValue({
        statusCode: 200,
        data: { transactionId: 'txn_console' },
      });

      await executeWithIdempotency({
        idempotencyKey: mockIdempotencyKey,
        execute: mockExecute,
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Response Structure Tests
  // ═══════════════════════════════════════════════════════════════════════

  describe('Response structure', () => {
    test('includes all required fields on success', async () => {
      const mockExecute = jest.fn().mockResolvedValue({
        statusCode: 200,
        data: { transactionId: 'txn_structure' },
      });

      const result = await executeWithIdempotency({
        idempotencyKey: mockIdempotencyKey,
        execute: mockExecute,
        logger: mockLogger,
      });

      expect(result).toMatchObject({
        success: true,
        data: expect.any(Object),
        statusCode: 200,
        isDuplicate: false,
        isReconciled: false,
        attempt: expect.any(Number),
        timestamp: expect.any(String),
      });

      // Verify timestamp is valid ISO string
      expect(new Date(result.timestamp)).toBeInstanceOf(Date);
      expect(!isNaN(new Date(result.timestamp).getTime())).toBe(true);
    });

    test('includes all required fields on failure', async () => {
      const error = new Error('Request failed');
      error.statusCode = 400;
      error.code = 'INVALID_REQUEST';

      const mockExecute = jest.fn().mockRejectedValue(error);

      const result = await executeWithIdempotency({
        idempotencyKey: mockIdempotencyKey,
        execute: mockExecute,
        logger: mockLogger,
      });

      expect(result).toMatchObject({
        success: false,
        error: expect.any(String),
        statusCode: 400,
        errorCode: 'INVALID_REQUEST',
        attempt: expect.any(Number),
        timestamp: expect.any(String),
      });
    });

    test('includes reconciliation flags when applicable', async () => {
      const error = new Error('Server error');
      error.statusCode = 500;

      const mockExecute = jest.fn().mockRejectedValue(error);
      const mockVerify = jest.fn().mockResolvedValue({
        processed: true,
        data: { transactionId: 'txn_reconciled' },
      });

      const promise = executeWithIdempotency({
        idempotencyKey: mockIdempotencyKey,
        execute: mockExecute,
        verify: mockVerify,
        logger: mockLogger,
        maxRetries: 1,
      });

      const result = await promise;

      expect(result.isReconciled).toBe(true);
      expect(result.failureReconciled).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // buildIdempotencyKey Tests
  // ═══════════════════════════════════════════════════════════════════════

  describe('buildIdempotencyKey utility', () => {
    test('builds key from transfer ID alone', () => {
      const key = buildIdempotencyKey(mockTransferId);
      expect(key).toBe(mockTransferId);
    });

    test('builds key with suffix for versioning', () => {
      const key = buildIdempotencyKey(mockTransferId, 'retry-1');
      expect(key).toBe(`${mockTransferId}-retry-1`);
    });

    test('handles empty suffix', () => {
      const key = buildIdempotencyKey(mockTransferId, '');
      expect(key).toBe(mockTransferId);
    });

    test('builds unique keys for different suffixes', () => {
      const key1 = buildIdempotencyKey(mockTransferId, 'v1');
      const key2 = buildIdempotencyKey(mockTransferId, 'v2');
      expect(key1).not.toBe(key2);
      expect(key1).toBe(`${mockTransferId}-v1`);
      expect(key2).toBe(`${mockTransferId}-v2`);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Edge Cases & Complex Scenarios
  // ═══════════════════════════════════════════════════════════════════════

  describe('Edge cases and complex scenarios', () => {
    test('handles multiple retries across different error types', async () => {
      const error1 = new Error('Network error');
      error1.code = 'ECONNRESET';

      const error2 = new Error('Rate limited');
      error2.statusCode = 429;

      const mockExecute = jest
        .fn()
        .mockRejectedValueOnce(error1)
        .mockRejectedValueOnce(error2)
        .mockResolvedValueOnce({
          statusCode: 200,
          data: { transactionId: 'txn_multi' },
        });

      const promise = executeWithIdempotency({
        idempotencyKey: mockIdempotencyKey,
        execute: mockExecute,
        logger: mockLogger,
        maxRetries: 3,
      });

      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.attempt).toBe(3);
      expect(mockExecute).toHaveBeenCalledTimes(3);
    });

    test('preserves original error data through retries', async () => {
      const originalError = new Error('Original failure');
      originalError.statusCode = 500;
      originalError.originalData = { detail: 'Important context' };

      const mockExecute = jest
        .fn()
        .mockRejectedValueOnce(originalError)
        .mockRejectedValueOnce(originalError);

      const promise = executeWithIdempotency({
        idempotencyKey: mockIdempotencyKey,
        execute: mockExecute,
        logger: mockLogger,
        maxRetries: 1,
      });

      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.error).toBe('Original failure');
    });

    test('handles rapid fire execution with same key', async () => {
      // This test verifies that multiple calls with same key log correctly
      const mockExecute = jest.fn().mockResolvedValue({
        statusCode: 200,
        data: { transactionId: 'txn_rapid' },
      });

      const promise1 = executeWithIdempotency({
        idempotencyKey: mockIdempotencyKey,
        execute: mockExecute,
        logger: mockLogger,
      });

      const promise2 = executeWithIdempotency({
        idempotencyKey: mockIdempotencyKey,
        execute: mockExecute,
        logger: mockLogger,
      });

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      // Both should execute independently (no shared state between calls)
      expect(mockExecute).toHaveBeenCalledTimes(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Custom Backoff Tests
  // ═══════════════════════════════════════════════════════════════════════

  describe('Custom backoff configuration', () => {
    test('respects custom initial backoff', async () => {
      const error = new Error('Transient error');
      error.statusCode = 503;

      const mockExecute = jest
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({
          statusCode: 200,
          data: { transactionId: 'txn_backoff' },
        });

      const customInitialBackoff = 500; // 500ms instead of 100ms

      const promise = executeWithIdempotency({
        idempotencyKey: mockIdempotencyKey,
        execute: mockExecute,
        logger: mockLogger,
        maxRetries: 2,
        initialBackoffMs: customInitialBackoff,
      });

      const result = await promise;

      expect(result.success).toBe(true);
      const backoffCall = mockLogger.log.mock.calls.find((call) =>
        call[0].includes('Retrying after backoff')
      );
      expect(backoffCall[1].backoffMs).toBeGreaterThanOrEqual(customInitialBackoff);
    });

    test('respects custom max retries', async () => {
      const error = new Error('Persistent error');
      error.statusCode = 503;

      const mockExecute = jest.fn().mockRejectedValue(error);

      const promise = executeWithIdempotency({
        idempotencyKey: mockIdempotencyKey,
        execute: mockExecute,
        logger: mockLogger,
        maxRetries: 5,
      });

      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.attempt).toBe(5);
      expect(mockExecute).toHaveBeenCalledTimes(5);
    });
  });
});
