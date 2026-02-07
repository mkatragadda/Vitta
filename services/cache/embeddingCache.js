/**
 * Enhanced LRU Embedding Cache with TTL Support
 * Replaces simple Map-based cache with proper eviction policies and monitoring
 *
 * Features:
 * - Configurable capacity (default 1000 entries vs 100 previously)
 * - TTL-based eviction (default 1 hour)
 * - True LRU eviction based on lastAccessed timestamp
 * - Cache statistics (hits, misses, hit rate)
 * - Performance monitoring
 */

class EmbeddingCache {
  constructor(options = {}) {
    this.capacity = options.capacity || 1000;
    this.ttlMs = options.ttlMs || 3600000; // 1 hour default

    // Cache storage: key -> { value, createdAt, lastAccessed, accessCount }
    this.cache = new Map();

    // Statistics tracking
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      ttlEvictions: 0,
      getHitRate: () => {
        const total = this.stats.hits + this.stats.misses;
        return total === 0 ? 0 : (this.stats.hits / total * 100).toFixed(2) + '%';
      }
    };

    // Start TTL cleanup interval (every 5 minutes)
    this.cleanupInterval = setInterval(() => this._cleanupExpired(), 300000);
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {any} - Cached value or undefined if not found/expired
   */
  get(key) {
    const normalizedKey = this._normalizeKey(key);
    const entry = this.cache.get(normalizedKey);

    if (!entry) {
      this.stats.misses++;
      console.log(
        '[EmbeddingCache] Cache miss. Hit rate: ' + this.stats.getHitRate()
      );
      return undefined;
    }

    // Check if expired
    if (this._isExpired(entry)) {
      this.cache.delete(normalizedKey);
      this.stats.misses++;
      this.stats.ttlEvictions++;
      console.log('[EmbeddingCache] Cache expired (TTL). Hit rate: ' + this.stats.getHitRate());
      return undefined;
    }

    // Update access tracking for LRU
    entry.lastAccessed = Date.now();
    entry.accessCount = (entry.accessCount || 0) + 1;

    this.stats.hits++;
    console.log(
      '[EmbeddingCache] Cache hit! Hit rate: ' + this.stats.getHitRate()
    );
    return entry.value;
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   */
  set(key, value) {
    const normalizedKey = this._normalizeKey(key);

    // Remove old entry if exists to update position
    if (this.cache.has(normalizedKey)) {
      this.cache.delete(normalizedKey);
    }

    // Add new entry
    this.cache.set(normalizedKey, {
      value,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 0
    });

    // Evict if over capacity
    if (this.cache.size > this.capacity) {
      this._evictLRU();
    }
  }

  /**
   * Check if cache has key
   * @param {string} key - Cache key
   * @returns {boolean}
   */
  has(key) {
    const normalizedKey = this._normalizeKey(key);
    if (!this.cache.has(normalizedKey)) {
      return false;
    }

    const entry = this.cache.get(normalizedKey);
    if (this._isExpired(entry)) {
      this.cache.delete(normalizedKey);
      this.stats.ttlEvictions++;
      return false;
    }

    return true;
  }

  /**
   * Clear entire cache
   */
  clear() {
    this.cache.clear();
    console.log('[EmbeddingCache] Cache cleared');
  }

  /**
   * Get cache statistics
   * @returns {Object} - Statistics including size, hit rate, eviction counts
   */
  getStats() {
    return {
      size: this.cache.size,
      capacity: this.capacity,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: this.stats.getHitRate(),
      evictions: this.stats.evictions,
      ttlEvictions: this.stats.ttlEvictions,
      utilizationPercent: ((this.cache.size / this.capacity) * 100).toFixed(2) + '%'
    };
  }

  /**
   * Get top N entries by access frequency
   * @param {number} n - Number of top entries to return
   * @returns {Array}
   */
  getTopEntries(n = 10) {
    return Array.from(this.cache.entries())
      .sort(([, a], [, b]) => (b.accessCount || 0) - (a.accessCount || 0))
      .slice(0, n)
      .map(([key, entry]) => ({
        key: key.substring(0, 50),
        accessCount: entry.accessCount || 0,
        lastAccessedMs: Date.now() - entry.lastAccessed,
        ageMs: Date.now() - entry.createdAt
      }));
  }

  /**
   * Destroy cache and cleanup interval
   */
  destroy() {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
    console.log('[EmbeddingCache] Cache destroyed');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Normalize cache key (lowercase, trimmed)
   * @private
   */
  _normalizeKey(key) {
    return String(key).toLowerCase().trim();
  }

  /**
   * Check if cache entry is expired (TTL)
   * @private
   */
  _isExpired(entry) {
    return Date.now() - entry.createdAt > this.ttlMs;
  }

  /**
   * Evict least recently used entry
   * @private
   */
  _evictLRU() {
    // Find entry with oldest lastAccessed time
    let lruKey = null;
    let lruTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      this.stats.evictions++;
      console.log(
        '[EmbeddingCache] LRU eviction triggered. Cache size: ' + this.cache.size
      );
    }
  }

  /**
   * Clean up expired entries
   * @private
   */
  _cleanupExpired() {
    let evictedCount = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (this._isExpired(entry)) {
        this.cache.delete(key);
        this.stats.ttlEvictions++;
        evictedCount++;
      }
    }

    if (evictedCount > 0) {
      console.log(
        '[EmbeddingCache] Cleanup removed ' + evictedCount + ' expired entries'
      );
    }
  }
}

export default EmbeddingCache;
