/**
 * Payment Idempotency Service
 * Implements safe, idempotent payment API calls with automatic retry logic
 *
 * Handles:
 * - Idempotency-Key generation and tracking
 * - Exponential backoff retry with jitter
 * - Duplicate detection (409 Conflict)
 * - Server error reconciliation (500)
 * - Transaction status verification
 * - Comprehensive error classification
 */

/**
 * Execute payment request with full idempotency
 *
 * @param {Object} config - Execution configuration
 * @param {string} config.idempotencyKey - Unique key for idempotency (e.g., transfer ID)
 * @param {Function} config.execute - Function that performs the API call
 * @param {Function} config.verify - Function that verifies transaction was processed
 * @param {Object} config.logger - Logger object with log, warn, error methods
 * @param {number} config.maxRetries - Max retry attempts (default: 3)
 * @param {number} config.initialBackoffMs - Initial backoff in ms (default: 100)
 * @returns {Promise<Object>} Result with success, data, and metadata
 */
export async function executeWithIdempotency({
  idempotencyKey,
  execute,
  verify,
  logger = console,
  maxRetries = 3,
  initialBackoffMs = 100,
}) {
  if (!idempotencyKey) {
    throw new Error('[idempotencyService] Missing idempotencyKey');
  }

  if (typeof execute !== 'function') {
    throw new Error('[idempotencyService] execute must be a function');
  }

  logger.log('[idempotencyService] Starting idempotent request', {
    idempotencyKey: `${idempotencyKey.substring(0, 15)}...`,
    maxRetries,
  });

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await execute({
        idempotencyKey,
        attempt,
      });

      logger.log('[idempotencyService] Request succeeded', {
        attempt,
        idempotencyKey: `${idempotencyKey.substring(0, 15)}...`,
        statusCode: result.statusCode,
        isDuplicate: result.isDuplicate || false,
        isReconciled: result.isReconciled || false,
      });

      return {
        success: true,
        data: result.data,
        statusCode: result.statusCode,
        isDuplicate: result.isDuplicate || false,
        isReconciled: result.isReconciled || false,
        attempt,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const classification = classifyError(error);

      logger.error('[idempotencyService] Request failed', {
        attempt,
        maxRetries,
        idempotencyKey: `${idempotencyKey.substring(0, 15)}...`,
        errorMessage: error.message,
        errorCode: error.code || 'UNKNOWN',
        statusCode: error.statusCode,
        isRetryable: classification.isRetryable,
        classification: classification.type,
      });

      // Non-retryable errors: fail immediately (except safe successes like 409 duplicates)
      if (!classification.isRetryable) {
        // 409 Conflict (duplicate) is a safe success - idempotent request already processed
        if (classification.isSafeSuccess) {
          return {
            success: true,
            data: null,
            statusCode: error.statusCode,
            isDuplicate: true,
            attempt,
            timestamp: new Date().toISOString(),
          };
        }

        return {
          success: false,
          error: error.message,
          statusCode: error.statusCode,
          errorCode: error.code,
          attempt,
          timestamp: new Date().toISOString(),
        };
      }

      // Last attempt: fail
      if (attempt === maxRetries) {
        logger.error('[idempotencyService] Max retries exceeded', {
          idempotencyKey: `${idempotencyKey.substring(0, 15)}...`,
          totalAttempts: maxRetries,
        });

        // Try verification on last failure
        if (verify && classification.type === 'SERVER_ERROR') {
          try {
            logger.log('[idempotencyService] Attempting post-failure verification', {
              idempotencyKey: `${idempotencyKey.substring(0, 15)}...`,
            });

            const verificationResult = await verify({ idempotencyKey });
            if (verificationResult.processed) {
              logger.log('[idempotencyService] Transaction verified after failure', {
                idempotencyKey: `${idempotencyKey.substring(0, 15)}...`,
              });

              return {
                success: true,
                data: verificationResult.data,
                isReconciled: true,
                failureReconciled: true,
                attempt: maxRetries,
                timestamp: new Date().toISOString(),
              };
            }
          } catch (verifyError) {
            logger.error('[idempotencyService] Verification failed after retries', {
              idempotencyKey: `${idempotencyKey.substring(0, 15)}...`,
              verifyError: verifyError.message,
            });
          }
        }

        return {
          success: false,
          error: error.message,
          statusCode: error.statusCode,
          errorCode: error.code,
          attempt: maxRetries,
          timestamp: new Date().toISOString(),
        };
      }

      // Calculate backoff with jitter
      const backoffMs = calculateBackoff(attempt, initialBackoffMs);
      logger.log('[idempotencyService] Retrying after backoff', {
        attempt,
        backoffMs,
        nextAttempt: attempt + 1,
        idempotencyKey: `${idempotencyKey.substring(0, 15)}...`,
      });

      await sleep(backoffMs);
    }
  }

  throw new Error('[idempotencyService] Unexpected: loop ended without result');
}

/**
 * Classify error for retry decision
 * @param {Error} error - Error object from API call
 * @returns {Object} Classification with isRetryable flag and type
 */
function classifyError(error) {
  const statusCode = error.statusCode || 0;

  // 409 Conflict: Duplicate detected by API (idempotent success)
  if (statusCode === 409 || error.code === 'DUPLICATE_ENTRY') {
    return {
      type: 'DUPLICATE_DETECTED',
      isRetryable: false,
      isSafeSuccess: true,
      description: 'Request already processed (duplicate detected)',
    };
  }

  // 400-499: Client errors (non-retryable)
  if (statusCode >= 400 && statusCode < 500) {
    // 429 is special: rate limit (retryable)
    if (statusCode === 429) {
      return {
        type: 'RATE_LIMIT',
        isRetryable: true,
        description: 'Rate limited - retry with backoff',
      };
    }

    return {
      type: 'CLIENT_ERROR',
      isRetryable: false,
      description: 'Client error - request is invalid',
    };
  }

  // 5xx: Server errors (retryable with verification)
  if (statusCode >= 500) {
    return {
      type: 'SERVER_ERROR',
      isRetryable: true,
      description: 'Server error - should verify before retrying',
      requiresVerification: true,
    };
  }

  // Network timeouts: retryable
  if (
    error.code === 'ETIMEDOUT' ||
    error.code === 'ECONNRESET' ||
    error.code === 'ENOTFOUND' ||
    error.message?.includes('timeout')
  ) {
    return {
      type: 'NETWORK_ERROR',
      isRetryable: true,
      description: 'Network error - safe to retry with idempotency key',
    };
  }

  // Unknown: treat as retryable with caution
  return {
    type: 'UNKNOWN_ERROR',
    isRetryable: true,
    description: 'Unknown error - will retry but verify recommended',
  };
}

/**
 * Calculate backoff with exponential increase and jitter
 * Formula: initialBackoff * (2 ^ attempt) + random(0, jitter)
 *
 * @param {number} attempt - Attempt number (1-based)
 * @param {number} initialBackoffMs - Initial backoff in milliseconds
 * @returns {number} Backoff time in milliseconds
 */
function calculateBackoff(attempt, initialBackoffMs = 100) {
  // Exponential: 100ms, 200ms, 400ms, 800ms, etc.
  const exponentialMs = initialBackoffMs * Math.pow(2, attempt - 1);

  // Cap at 30 seconds to prevent excessive waits
  const cappedMs = Math.min(exponentialMs, 30000);

  // Add random jitter (0-20% of backoff) to prevent thundering herd
  const jitterMs = Math.random() * (cappedMs * 0.2);

  return Math.floor(cappedMs + jitterMs);
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Build idempotency key for transaction
 * @param {string} transferId - Transfer ID
 * @param {string} [suffix] - Optional suffix for versioning
 * @returns {string} Idempotency key
 */
export function buildIdempotencyKey(transferId, suffix = '') {
  return suffix ? `${transferId}-${suffix}` : transferId;
}

export default {
  executeWithIdempotency,
  classifyError,
  buildIdempotencyKey,
};
