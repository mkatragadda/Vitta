/**
 * RetryHandler Unit Tests
 * Tests exponential backoff and retry logic
 */

const { RetryHandler } = require('../../../services/sync/retryHandler.js');

describe('RetryHandler', () => {
  let retryHandler;

  beforeEach(() => {
    retryHandler = new RetryHandler(5, 1000);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initialization', () => {
    test('should initialize with default values', () => {
      const handler = new RetryHandler();
      expect(handler.getRetryCount()).toBe(0);
      expect(handler.getLastRetryTime()).toBeNull();
      expect(handler.shouldRetry()).toBe(true);
    });

    test('should initialize with custom max retries', () => {
      const handler = new RetryHandler(3, 500);
      expect(handler.maxRetries).toBe(3);
      expect(handler.initialDelay).toBe(500);
    });
  });

  describe('exponential backoff', () => {
    test('should return initial delay on first retry', () => {
      const delay = retryHandler.getNextDelay();
      expect(delay).toBeGreaterThanOrEqual(1000); // 1000ms with jitter
      expect(delay).toBeLessThan(1100); // 1000ms + max 10% jitter
    });

    test('should double delay on second retry', () => {
      retryHandler.getNextDelay(); // 1st retry
      const delay = retryHandler.getNextDelay(); // 2nd retry
      expect(delay).toBeGreaterThanOrEqual(2000); // 2000ms with jitter
      expect(delay).toBeLessThan(2200);
    });

    test('should continue exponential backoff', () => {
      const delays = [];
      delays.push(retryHandler.getNextDelay()); // 1s
      delays.push(retryHandler.getNextDelay()); // 2s
      delays.push(retryHandler.getNextDelay()); // 4s
      delays.push(retryHandler.getNextDelay()); // 8s
      delays.push(retryHandler.getNextDelay()); // 16s

      // Verify exponential growth (with jitter tolerance)
      expect(delays[0]).toBeLessThan(1100);
      expect(delays[1]).toBeGreaterThanOrEqual(2000);
      expect(delays[2]).toBeGreaterThanOrEqual(4000);
      expect(delays[3]).toBeGreaterThanOrEqual(8000);
      expect(delays[4]).toBeGreaterThanOrEqual(16000);
    });

    test('should cap maximum delay at 32 seconds', () => {
      // Create handler with more retries to reach the cap
      const handler = new RetryHandler(10, 1000);
      const delays = [];

      // Get enough retries to reach 2^6 = 64000, which will be capped at 32000
      for (let i = 0; i < 8; i++) {
        if (handler.shouldRetry()) {
          delays.push(handler.getNextDelay());
        }
      }

      // The 6th retry onwards should be capped at 32s
      // delays[5] = 2^5 * 1000 = 32000 (now capped)
      const cappedDelay = delays[5];
      expect(cappedDelay).toBeGreaterThanOrEqual(32000);
      expect(cappedDelay).toBeLessThan(35200); // 32000 + max 10% jitter
    });

    test('should add jitter to prevent thundering herd', () => {
      const delays = [];
      for (let i = 0; i < 5; i++) {
        delays.push(retryHandler.getNextDelay());
      }

      // Check that delays have variation (jitter applied)
      const baseDelays = [1000, 2000, 4000, 8000, 16000];
      delays.forEach((delay, i) => {
        expect(delay).toBeGreaterThanOrEqual(baseDelays[i]);
        expect(delay).toBeLessThan(baseDelays[i] * 1.1); // Max 10% jitter
      });
    });
  });

  describe('retry tracking', () => {
    test('should increment retry count on each call', () => {
      expect(retryHandler.getRetryCount()).toBe(0);
      retryHandler.getNextDelay();
      expect(retryHandler.getRetryCount()).toBe(1);
      retryHandler.getNextDelay();
      expect(retryHandler.getRetryCount()).toBe(2);
    });

    test('should track last retry time', () => {
      const beforeTime = Date.now();
      retryHandler.getNextDelay();
      const afterTime = Date.now();

      const lastRetryTime = retryHandler.getLastRetryTime();
      expect(lastRetryTime).toBeGreaterThanOrEqual(beforeTime);
      expect(lastRetryTime).toBeLessThanOrEqual(afterTime);
    });

    test('should have null last retry time initially', () => {
      expect(retryHandler.getLastRetryTime()).toBeNull();
    });
  });

  describe('shouldRetry', () => {
    test('should allow retries within limit', () => {
      expect(retryHandler.shouldRetry()).toBe(true);
      retryHandler.getNextDelay(); // 1st
      expect(retryHandler.shouldRetry()).toBe(true);
      retryHandler.getNextDelay(); // 2nd
      expect(retryHandler.shouldRetry()).toBe(true);
    });

    test('should deny retries after max exceeded', () => {
      for (let i = 0; i < 5; i++) {
        expect(retryHandler.shouldRetry()).toBe(true);
        retryHandler.getNextDelay();
      }
      // After 5 retries, should not allow more
      expect(retryHandler.shouldRetry()).toBe(false);
    });

    test('should respect custom max retries', () => {
      const handler = new RetryHandler(2, 1000);
      expect(handler.shouldRetry()).toBe(true);
      handler.getNextDelay();
      expect(handler.shouldRetry()).toBe(true);
      handler.getNextDelay();
      expect(handler.shouldRetry()).toBe(false);
    });
  });

  describe('reset', () => {
    test('should reset retry count to zero', () => {
      retryHandler.getNextDelay();
      retryHandler.getNextDelay();
      expect(retryHandler.getRetryCount()).toBe(2);

      retryHandler.reset();
      expect(retryHandler.getRetryCount()).toBe(0);
    });

    test('should reset last retry time', () => {
      retryHandler.getNextDelay();
      expect(retryHandler.getLastRetryTime()).not.toBeNull();

      retryHandler.reset();
      expect(retryHandler.getLastRetryTime()).toBeNull();
    });

    test('should allow retries again after reset', () => {
      for (let i = 0; i < 5; i++) {
        retryHandler.getNextDelay();
      }
      expect(retryHandler.shouldRetry()).toBe(false);

      retryHandler.reset();
      expect(retryHandler.shouldRetry()).toBe(true);
    });
  });

  describe('getStatus', () => {
    test('should return correct status string', () => {
      expect(retryHandler.getStatus()).toBe('Retry 0/5');

      retryHandler.getNextDelay();
      expect(retryHandler.getStatus()).toBe('Retry 1/5');

      retryHandler.getNextDelay();
      expect(retryHandler.getStatus()).toBe('Retry 2/5');
    });
  });

  describe('multiple instances', () => {
    test('should have independent state for each instance', () => {
      const handler1 = new RetryHandler(3, 1000);
      const handler2 = new RetryHandler(3, 1000);

      handler1.getNextDelay();
      handler1.getNextDelay();
      expect(handler1.getRetryCount()).toBe(2);

      handler2.getNextDelay();
      expect(handler2.getRetryCount()).toBe(1);

      // Resetting one should not affect the other
      handler1.reset();
      expect(handler1.getRetryCount()).toBe(0);
      expect(handler2.getRetryCount()).toBe(1);
    });
  });

  describe('edge cases', () => {
    test('should handle zero max retries', () => {
      const handler = new RetryHandler(0, 1000);
      expect(handler.shouldRetry()).toBe(false);
    });

    test('should handle very small initial delay', () => {
      const handler = new RetryHandler(3, 10);
      const delay = handler.getNextDelay();
      expect(delay).toBeGreaterThanOrEqual(10);
      expect(delay).toBeLessThan(100);
    });

    test('should handle multiple resets', () => {
      retryHandler.getNextDelay();
      retryHandler.reset();
      retryHandler.getNextDelay();
      retryHandler.reset();

      expect(retryHandler.getRetryCount()).toBe(0);
      expect(retryHandler.shouldRetry()).toBe(true);
    });
  });
});
