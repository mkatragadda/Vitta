/**
 * Performance Configuration
 * Settings for cache, optimization, and monitoring
 */

export const PERFORMANCE_CONFIG = {
  // Embedding cache settings
  cache: {
    capacity: 1000,           // Up from 100, allows caching 1000 unique queries
    ttlMs: 3600000,           // 1 hour TTL for cache entries
    cleanupIntervalMs: 300000 // 5 minutes, cleanup expired entries
  },

  // Request coalescing settings
  coalescing: {
    windowMs: 100,            // 100ms coalescing window for identical requests
    cleanupIntervalMs: 5000   // Cleanup stale pending requests every 5s
  },

  // Performance monitoring thresholds
  monitoring: {
    slowQueryThresholdMs: 500,    // Log queries slower than 500ms
    slowApiCallThresholdMs: 1000, // Log API calls slower than 1s
    enableDetailedLogging: false  // Set to true for verbose performance logs
  },

  // Cache warming - common queries to pre-cache
  warmupQueries: [
    'show me my cards',
    'show my cards',
    'what cards do i have',
    'best card for groceries',
    'best card for dining',
    'which card should i use',
    'what are my balances',
    'payment recommendations',
    'help me optimize my payments',
    'split my payment',
    'compare my cards',
    'what are the rewards',
    'highest balance',
    'lowest apr'
  ],

  // Performance targets (p95 percentile)
  targets: {
    simpleQueryMs: 200,       // Simple queries like "show cards" should be < 200ms
    complexQueryMs: 500,      // Complex queries with entity extraction < 500ms
    cachedQueryMs: 100,       // Cached queries should be < 100ms
    cacheHitRatePercent: 60   // Target > 60% cache hit rate
  }
};

/**
 * Performance monitoring helper
 */
export class PerformanceMonitor {
  constructor() {
    this.metrics = {
      queryTimes: [],
      apiCallTimes: [],
      cacheHits: 0,
      cacheMisses: 0
    };
  }

  /**
   * Track a query execution time
   */
  trackQuery(durationMs, queryType = 'unknown') {
    this.metrics.queryTimes.push({ durationMs, queryType, timestamp: Date.now() });

    if (durationMs > PERFORMANCE_CONFIG.monitoring.slowQueryThresholdMs) {
      console.warn(
        `[PerformanceMonitor] Slow query: ${queryType} took ${durationMs}ms`
      );
    }

    // Keep only last 100 queries to avoid memory bloat
    if (this.metrics.queryTimes.length > 100) {
      this.metrics.queryTimes = this.metrics.queryTimes.slice(-100);
    }
  }

  /**
   * Track an API call execution time
   */
  trackApiCall(durationMs, callType = 'unknown') {
    this.metrics.apiCallTimes.push({ durationMs, callType, timestamp: Date.now() });

    if (durationMs > PERFORMANCE_CONFIG.monitoring.slowApiCallThresholdMs) {
      console.warn(
        `[PerformanceMonitor] Slow API call: ${callType} took ${durationMs}ms`
      );
    }

    // Keep only last 50 API calls
    if (this.metrics.apiCallTimes.length > 50) {
      this.metrics.apiCallTimes = this.metrics.apiCallTimes.slice(-50);
    }
  }

  /**
   * Get performance statistics
   */
  getStats() {
    const queryTimes = this.metrics.queryTimes.map(m => m.durationMs);
    const apiCallTimes = this.metrics.apiCallTimes.map(m => m.durationMs);

    const getPercentile = (arr, p) => {
      if (arr.length === 0) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const index = Math.ceil((p / 100) * sorted.length) - 1;
      return sorted[Math.max(0, index)];
    };

    return {
      queries: {
        count: this.metrics.queryTimes.length,
        averageMs: queryTimes.length > 0 ? Math.round(queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length) : 0,
        minMs: queryTimes.length > 0 ? Math.min(...queryTimes) : 0,
        maxMs: queryTimes.length > 0 ? Math.max(...queryTimes) : 0,
        p95Ms: getPercentile(queryTimes, 95),
        p99Ms: getPercentile(queryTimes, 99)
      },
      apiCalls: {
        count: this.metrics.apiCallTimes.length,
        averageMs: apiCallTimes.length > 0 ? Math.round(apiCallTimes.reduce((a, b) => a + b, 0) / apiCallTimes.length) : 0,
        minMs: apiCallTimes.length > 0 ? Math.min(...apiCallTimes) : 0,
        maxMs: apiCallTimes.length > 0 ? Math.max(...apiCallTimes) : 0,
        p95Ms: getPercentile(apiCallTimes, 95)
      },
      cache: {
        hits: this.metrics.cacheHits,
        misses: this.metrics.cacheMisses,
        hitRate: this.metrics.cacheHits + this.metrics.cacheMisses > 0
          ? ((this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)) * 100).toFixed(2) + '%'
          : 'N/A'
      }
    };
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.metrics = {
      queryTimes: [],
      apiCallTimes: [],
      cacheHits: 0,
      cacheMisses: 0
    };
  }
}

// Create singleton monitor instance
export const performanceMonitor = new PerformanceMonitor();
