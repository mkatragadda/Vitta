/**
 * Cache Warmup Module
 * Pre-caches embeddings for common queries on app initialization
 *
 * Benefits:
 * - Reduces latency for first queries
 * - Improves cache hit rate by pre-populating with high-value queries
 * - Spreads API load across startup rather than first user interaction
 */

import { getCachedEmbedding } from '../embedding/embeddingService.js';
import { PERFORMANCE_CONFIG } from '../../config/performance.js';

// Track warmup state
let warmupStarted = false;
let warmupComplete = false;

/**
 * Warm up the embedding cache with common queries
 * Runs asynchronously in background - doesn't block app startup
 */
export async function warmupCache() {
  // Prevent duplicate warmup
  if (warmupStarted) {
    console.log('[CacheWarmup] Warmup already in progress');
    return;
  }

  if (warmupComplete) {
    console.log('[CacheWarmup] Cache already warmed up');
    return;
  }

  warmupStarted = true;

  console.log(
    '[CacheWarmup] Starting cache warmup with',
    PERFORMANCE_CONFIG.warmupQueries.length,
    'queries'
  );

  const startTime = Date.now();
  let successCount = 0;
  let failureCount = 0;

  // Warm up queries sequentially with small delays to avoid overwhelming API
  for (let i = 0; i < PERFORMANCE_CONFIG.warmupQueries.length; i++) {
    const query = PERFORMANCE_CONFIG.warmupQueries[i];

    try {
      await getCachedEmbedding(query);
      successCount++;

      // Add small delay between requests (50ms) to spread API load
      if (i < PERFORMANCE_CONFIG.warmupQueries.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    } catch (error) {
      failureCount++;
      console.warn('[CacheWarmup] Failed to warm up query:', query, error.message);
    }
  }

  const duration = Date.now() - startTime;
  warmupComplete = true;

  console.log(
    '[CacheWarmup] Warmup complete. Success: ' +
      successCount +
      ', Failed: ' +
      failureCount +
      ', Duration: ' +
      duration +
      'ms'
  );

  return {
    success: successCount,
    failed: failureCount,
    durationMs: duration,
    queriesWarmup: PERFORMANCE_CONFIG.warmupQueries.length
  };
}

/**
 * Get warmup status
 */
export function getWarmupStatus() {
  return {
    started: warmupStarted,
    complete: warmupComplete
  };
}

/**
 * Reset warmup state (useful for testing)
 */
export function resetWarmup() {
  warmupStarted = false;
  warmupComplete = false;
}
