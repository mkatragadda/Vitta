/**
 * Retry Handler - Exponential backoff retry logic for failed sync operations
 *
 * Implements exponential backoff with jitter to reliably retry failed operations
 * while preventing thundering herd problem.
 *
 * Retry delays: 1s → 2s → 4s → 8s → 16s → 32s (with jitter)
 */

class RetryHandler {
  /**
   * Initialize retry handler
   * @param {number} maxRetries - Maximum retry attempts (default: 5)
   * @param {number} initialDelay - Initial delay in milliseconds (default: 1000)
   */
  constructor(maxRetries = 5, initialDelay = 1000) {
    this.maxRetries = maxRetries;
    this.initialDelay = initialDelay;
    this.retryCount = 0;
    this.lastRetryTime = null;
  }

  /**
   * Get the next retry delay with exponential backoff and jitter
   * Formula: min(initialDelay * 2^retryCount, 32000) * (1 + random jitter 0-10%)
   *
   * @returns {number} Delay in milliseconds
   */
  getNextDelay() {
    const exponentialDelay = this.initialDelay * Math.pow(2, this.retryCount);
    const cappedDelay = Math.min(exponentialDelay, 32000); // Cap at 32 seconds

    // Add jitter (random 0-10% variance) to prevent thundering herd
    const jitter = cappedDelay * (Math.random() * 0.1);
    const delayWithJitter = cappedDelay + jitter;

    this.retryCount++;
    this.lastRetryTime = Date.now();

    console.log(`[RetryHandler] Retry ${this.retryCount}/${this.maxRetries}, delay: ${Math.round(delayWithJitter)}ms`);

    return Math.round(delayWithJitter);
  }

  /**
   * Check if we should retry (haven't exceeded max retries)
   *
   * @returns {boolean} True if we can retry, false if max retries exceeded
   */
  shouldRetry() {
    const canRetry = this.retryCount < this.maxRetries;

    if (!canRetry) {
      console.warn(`[RetryHandler] Max retries (${this.maxRetries}) exceeded`);
    }

    return canRetry;
  }

  /**
   * Reset retry handler (called on successful operation)
   */
  reset() {
    this.retryCount = 0;
    this.lastRetryTime = null;
    console.log('[RetryHandler] Reset - ready for new operation');
  }

  /**
   * Get current retry count
   *
   * @returns {number} Number of retries attempted so far
   */
  getRetryCount() {
    return this.retryCount;
  }

  /**
   * Get last retry timestamp
   *
   * @returns {number|null} Timestamp of last retry attempt, or null if none
   */
  getLastRetryTime() {
    return this.lastRetryTime;
  }

  /**
   * Get human-readable retry status
   *
   * @returns {string} Status message like "Retry 2/5"
   */
  getStatus() {
    return `Retry ${this.retryCount}/${this.maxRetries}`;
  }
}

// Export as singleton instance and class
const defaultRetryHandler = new RetryHandler();

module.exports = {
  RetryHandler,
  defaultRetryHandler
};
