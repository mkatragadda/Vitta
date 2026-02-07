/**
 * Request Coalescer
 * Deduplicates identical requests within a time window to avoid redundant API calls
 *
 * Usage:
 * const result = await coalescer.coalesce('embedding_request', async () => {
 *   return await getEmbedding(text);
 * });
 *
 * Features:
 * - Merges duplicate requests within 100ms window
 * - All duplicate requests return the same promise
 * - Automatic cleanup of expired pending requests
 */

class RequestCoalescer {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 100; // 100ms coalescing window
    this.cleanupIntervalMs = options.cleanupIntervalMs || 5000; // Check every 5s

    // Pending requests: key -> { promise, createdAt, count }
    this.pending = new Map();

    // Statistics
    this.stats = {
      coalesced: 0,
      deduped: 0,
      totalRequests: 0,
      getDedupeRate: () => {
        return this.stats.totalRequests === 0
          ? 0
          : ((this.stats.deduped / this.stats.totalRequests) * 100).toFixed(2) + '%';
      }
    };

    // Start cleanup interval
    this.cleanupInterval = setInterval(
      () => this._cleanupExpired(),
      this.cleanupIntervalMs
    );
  }

  /**
   * Coalesce a request - dedupe identical requests within time window
   * @param {string} key - Unique request key (e.g., text to embed)
   * @param {Function} requestFn - Async function to execute
   * @returns {Promise} - Resolves to same result for duplicate requests
   */
  async coalesce(key, requestFn) {
    this.stats.totalRequests++;

    const pending = this.pending.get(key);

    // Check if request is already pending
    if (pending && !this._isExpired(pending)) {
      this.stats.deduped++;
      pending.count++;
      console.log(
        '[RequestCoalescer] Deduped request. Key: ' + key.substring(0, 30) +
        ', Dedup rate: ' + this.stats.getDedupeRate()
      );
      return pending.promise;
    }

    // Start new request
    const startTime = Date.now();
    const promise = requestFn()
      .catch(error => {
        console.error('[RequestCoalescer] Request failed:', error);
        throw error;
      })
      .finally(() => {
        // Remove from pending after request completes
        this.pending.delete(key);
        const duration = Date.now() - startTime;
        if (duration > 1000) {
          console.log(
            '[RequestCoalescer] Slow request completed. Duration: ' + duration + 'ms'
          );
        }
      });

    // Store pending request
    this.pending.set(key, {
      promise,
      createdAt: Date.now(),
      count: 1
    });

    this.stats.coalesced++;
    console.log(
      '[RequestCoalescer] Started new request. Key: ' + key.substring(0, 30)
    );

    return promise;
  }

  /**
   * Get coalescer statistics
   * @returns {Object}
   */
  getStats() {
    return {
      pendingRequests: this.pending.size,
      totalRequests: this.stats.totalRequests,
      coalesced: this.stats.coalesced,
      deduped: this.stats.deduped,
      dedupeRate: this.stats.getDedupeRate(),
      windowMs: this.windowMs
    };
  }

  /**
   * Clear all pending requests
   */
  clear() {
    this.pending.clear();
    console.log('[RequestCoalescer] Cleared all pending requests');
  }

  /**
   * Destroy coalescer
   */
  destroy() {
    clearInterval(this.cleanupInterval);
    this.pending.clear();
    console.log('[RequestCoalescer] Destroyed');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Check if pending request is expired
   * @private
   */
  _isExpired(pending) {
    return Date.now() - pending.createdAt > this.windowMs;
  }

  /**
   * Clean up expired pending requests
   * @private
   */
  _cleanupExpired() {
    let cleanedCount = 0;
    for (const [key, pending] of this.pending.entries()) {
      if (this._isExpired(pending)) {
        // This shouldn't happen normally (request should remove itself via finally)
        // but cleanup stale entries just in case
        this.pending.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log('[RequestCoalescer] Cleaned up ' + cleanedCount + ' stale requests');
    }
  }
}

// Create a singleton instance for embedding requests
const embeddingCoalescer = new RequestCoalescer({ windowMs: 100 });

export { RequestCoalescer, embeddingCoalescer };
