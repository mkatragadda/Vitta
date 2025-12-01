/**
 * Query Analytics
 * 
 * Tracks query patterns for system improvement and insights.
 * Provides statistics, trends, and performance metrics.
 * 
 * @module services/chat/learning/queryAnalytics
 * 
 * @example
 * const analytics = new QueryAnalytics();
 * await analytics.trackQuery(query, entities, structuredQuery, result, metadata);
 * const stats = await analytics.getQueryStats('7d');
 */

import { supabase } from '../../../config/supabase.js';
import crypto from 'crypto';

/**
 * QueryAnalytics class for tracking and analyzing queries
 */
export class QueryAnalytics {
  /**
   * Create a new QueryAnalytics instance
   * 
   * @param {Object} options - Analytics options
   * @property {boolean} options.enableTracking - Enable query tracking (default: true)
   * @property {boolean} options.enableCaching - Enable statistics caching (default: true)
   * @property {number} options.cacheTTL - Cache TTL in seconds (default: 300)
   * 
   * @example
   * const analytics = new QueryAnalytics({ enableTracking: true });
   */
  constructor(options = {}) {
    this.options = {
      enableTracking: options.enableTracking !== false,
      enableCaching: options.enableCaching !== false,
      cacheTTL: options.cacheTTL || 300, // 5 minutes
      ...options
    };

    // In-memory cache for statistics
    this.cache = new Map();
    this.cacheTimestamps = new Map();
  }

  /**
   * Track query execution
   * 
   * @param {string} query - Natural language query
   * @param {Object} entities - Extracted entities
   * @param {Object} structuredQuery - Structured query object
   * @param {Object} result - Query execution result
   * @param {Object} metadata - Additional metadata
   * @property {string} metadata.userId - User ID
   * @property {number} metadata.responseTime - Response time in milliseconds
   * @property {boolean} metadata.success - Whether query succeeded
   * @property {string} metadata.errorMessage - Error message if failed
   * @property {string} metadata.patternId - Pattern ID if pattern was used
   * @property {string} metadata.decompositionMethod - Method used: 'pattern_match', 'direct', 'gpt_fallback'
   * @property {number} metadata.resultCount - Number of results returned
   * @returns {Promise<string>} - Query log ID
   * 
   * @example
   * await analytics.trackQuery(
   *   "what are the different issuers",
   *   { distinctQuery: { field: 'issuer' } },
   *   { subIntent: 'distinct', distinct: { field: 'issuer' } },
   *   { values: [...], total: 5 },
   *   {
   *     userId: 'user-123',
   *     responseTime: 45,
   *     success: true,
   *     patternId: 'pattern-456',
   *     decompositionMethod: 'pattern_match',
   *     resultCount: 5
   *   }
   * );
   */
  async trackQuery(query, entities, structuredQuery, result, metadata = {}) {
    if (!this.options.enableTracking) {
      return null;
    }

    if (!query) {
      console.warn('[QueryAnalytics] Query is required for tracking');
      return null;
    }

    try {
      console.log('[QueryAnalytics] Tracking query:', query.substring(0, 50));

      const {
        userId = null,
        responseTime = null,
        success = true,
        errorMessage = null,
        patternId = null,
        decompositionMethod = 'direct',
        resultCount = null,
        intent = null
      } = metadata;

      // Calculate query hash for deduplication
      const queryHash = crypto
        .createHash('sha256')
        .update(query.toLowerCase().trim())
        .digest('hex');

      // Determine result count
      let finalResultCount = resultCount;
      if (finalResultCount === null && result) {
        if (result.total !== undefined) {
          finalResultCount = result.total;
        } else if (Array.isArray(result.results)) {
          finalResultCount = result.results.length;
        } else if (result.values && Array.isArray(result.values)) {
          finalResultCount = result.values.length;
        } else if (result.results && typeof result.results === 'object') {
          finalResultCount = 1;
        }
      }

      // Helper to safely serialize objects (remove circular references)
      const safeSerialize = (obj) => {
        if (!obj) return null;
        try {
          const visited = new WeakSet();
          let depth = 0;
          // Use JSON.parse/stringify to remove circular references
          return JSON.parse(JSON.stringify(obj, (key, value) => {
            // Skip functions and undefined values
            if (typeof value === 'function' || value === undefined) {
              return null;
            }
            // Skip circular references
            if (typeof value === 'object' && value !== null) {
              // Check for circular reference
              if (visited.has(value)) {
                return '[Circular]';
              }
              visited.add(value);
              // Limit depth to prevent huge objects
              depth++;
              if (depth > 10) {
                depth--;
                return '[Too Deep]';
              }
            }
            return value;
          }));
        } catch (error) {
          console.warn('[QueryAnalytics] Error serializing object:', error.message);
          // Return simplified version if full serialization fails
          return typeof obj === 'object' ? {} : obj;
        }
      };

      // Prepare log entry
      const logEntry = {
        user_id: userId,
        query: query,
        query_hash: queryHash,
        matched_intent: intent || structuredQuery?.intent || 'unknown',
        similarity_score: null, // Not applicable for query tracking
        detection_method: decompositionMethod,
        
        // Phase 6 extended fields - safely serialize to avoid circular references
        entities: safeSerialize(entities) || {},
        structured_query: safeSerialize(structuredQuery),
        decomposition_method: decompositionMethod,
        pattern_id: patternId,
        response_time_ms: responseTime,
        success: success,
        error_message: errorMessage ? String(errorMessage).substring(0, 500) : null,
        result_count: finalResultCount,
        user_feedback: null,
        
        created_at: new Date().toISOString()
      };

      // Insert log entry
      const { data, error } = await supabase
        .from('intent_logs')
        .insert(logEntry)
        .select('id')
        .single();

      if (error) {
        console.error('[QueryAnalytics] Error tracking query:', error);
        throw error;
      }

      console.log(`[QueryAnalytics] Tracked query: ${data.id} (method: ${decompositionMethod}, success: ${success})`);

      // Clear cache when new data is added
      if (this.options.enableCaching) {
        this._clearCache();
      }

      return data.id;
    } catch (error) {
      console.error('[QueryAnalytics] Error tracking query:', error);
      // Don't throw - analytics shouldn't break query execution
      return null;
    }
  }

  /**
   * Get query statistics
   * 
   * @param {string} timeRange - Time range: '1d', '7d', '30d', '90d' (default: '7d')
   * @param {Object} filters - Optional filters
   * @property {string} filters.intent - Filter by intent
   * @property {string} filters.userId - Filter by user ID
   * @property {string} filters.decompositionMethod - Filter by method
   * @returns {Promise<Object>} - Query statistics
   * 
   * @example
   * const stats = await analytics.getQueryStats('7d', { intent: 'query_card_data' });
   */
  async getQueryStats(timeRange = '7d', filters = {}) {
    try {
      // Check cache
      const cacheKey = `stats_${timeRange}_${JSON.stringify(filters)}`;
      if (this.options.enableCaching && this._isCacheValid(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      // Calculate date range
      const days = this._parseTimeRange(timeRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateISO = startDate.toISOString();

      // Build query
      let query = supabase
        .from('intent_logs')
        .select('*')
        .gte('created_at', startDateISO);

      // Apply filters
      if (filters.intent) {
        query = query.eq('matched_intent', filters.intent);
      }
      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters.decompositionMethod) {
        query = query.eq('decomposition_method', filters.decompositionMethod);
      }

      const { data: logs, error } = await query;

      if (error) {
        throw error;
      }

      if (!logs || logs.length === 0) {
        return this._getEmptyStats();
      }

      // Calculate statistics
      const stats = {
        timeRange,
        startDate: startDateISO,
        endDate: new Date().toISOString(),
        
        // Basic metrics
        totalQueries: logs.length,
        successfulQueries: logs.filter(l => l.success !== false).length,
        failedQueries: logs.filter(l => l.success === false).length,
        successRate: logs.length > 0 
          ? (logs.filter(l => l.success !== false).length / logs.length) * 100 
          : 0,

        // Performance metrics
        avgResponseTime: this._calculateAverage(logs, 'response_time_ms'),
        minResponseTime: this._calculateMin(logs, 'response_time_ms'),
        maxResponseTime: this._calculateMax(logs, 'response_time_ms'),
        medianResponseTime: this._calculateMedian(logs, 'response_time_ms'),

        // Intent distribution
        intentDistribution: this._calculateIntentDistribution(logs),
        
        // Method distribution
        methodDistribution: this._calculateMethodDistribution(logs),

        // Result metrics
        avgResultCount: this._calculateAverage(logs, 'result_count'),
        totalResultsReturned: logs.reduce((sum, l) => sum + (l.result_count || 0), 0),

        // Pattern usage
        patternUsageCount: logs.filter(l => l.pattern_id).length,
        patternUsageRate: logs.length > 0
          ? (logs.filter(l => l.pattern_id).length / logs.length) * 100
          : 0,

        // Error analysis
        errorsByMethod: this._calculateErrorsByMethod(logs),
        topErrors: this._calculateTopErrors(logs),

        // Trends (if we have enough data)
        trends: logs.length >= 7 ? this._calculateTrends(logs) : null,

        // Timestamps
        calculatedAt: new Date().toISOString()
      };

      // Cache results
      if (this.options.enableCaching) {
        this._setCache(cacheKey, stats);
      }

      return stats;
    } catch (error) {
      console.error('[QueryAnalytics] Error getting query stats:', error);
      return this._getEmptyStats();
    }
  }

  /**
   * Get user-specific analytics
   * 
   * @param {string} userId - User ID
   * @param {string} timeRange - Time range (default: '30d')
   * @returns {Promise<Object>} - User analytics
   * 
   * @example
   * const userStats = await analytics.getUserAnalytics('user-123', '30d');
   */
  async getUserAnalytics(userId, timeRange = '30d') {
    if (!userId) {
      throw new Error('QueryAnalytics: userId is required');
    }

    try {
      // Get user-specific stats
      const stats = await this.getQueryStats(timeRange, { userId });

      // Get user's query patterns
      const days = this._parseTimeRange(timeRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: logs, error } = await supabase
        .from('intent_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Analyze user patterns
      const patterns = {
        mostFrequentQueries: this._getMostFrequentQueries(logs || []),
        mostFrequentIntents: this._getMostFrequentIntents(logs || []),
        queryFrequency: this._calculateQueryFrequency(logs || []),
        peakUsageTimes: this._calculatePeakUsageTimes(logs || []),
        followUpPatterns: this._detectFollowUpPatterns(logs || [])
      };

      return {
        ...stats,
        userId,
        patterns,
        totalQueriesByUser: logs?.length || 0
      };
    } catch (error) {
      console.error('[QueryAnalytics] Error getting user analytics:', error);
      throw error;
    }
  }

  /**
   * Get pattern performance metrics
   * 
   * @param {string} patternId - Pattern ID (optional, if not provided returns all patterns)
   * @returns {Promise<Object|Array>} - Pattern metrics
   * 
   * @example
   * const patternMetrics = await analytics.getPatternMetrics('pattern-123');
   */
  async getPatternMetrics(patternId = null) {
    try {
      if (patternId) {
        // Get specific pattern metrics
        const { data: pattern, error } = await supabase
          .from('query_patterns')
          .select('*')
          .eq('id', patternId)
          .single();

        if (error || !pattern) {
          throw new Error(`Pattern not found: ${patternId}`);
        }

        // Get logs for this pattern
        const { data: logs, error: logsError } = await supabase
          .from('intent_logs')
          .select('*')
          .eq('pattern_id', patternId)
          .order('created_at', { ascending: false })
          .limit(100);

        if (logsError) {
          throw logsError;
        }

        return {
          pattern: {
            id: pattern.id,
            naturalQuery: pattern.natural_query,
            intent: pattern.intent,
            successRate: parseFloat(pattern.success_rate) || 0,
            usageCount: pattern.usage_count || 0,
            confidence: parseFloat(pattern.confidence) || 0,
            lastUsedAt: pattern.last_used_at
          },
          performance: {
            totalUses: logs?.length || 0,
            successRate: logs && logs.length > 0
              ? (logs.filter(l => l.success !== false).length / logs.length) * 100
              : 100,
            avgResponseTime: this._calculateAverage(logs || [], 'response_time_ms'),
            avgResultCount: this._calculateAverage(logs || [], 'result_count')
          }
        };
      } else {
        // Get all pattern metrics using the view
        const { data: patterns, error } = await supabase
          .from('pattern_performance')
          .select('*')
          .order('usage_count', { ascending: false })
          .limit(50);

        if (error) {
          throw error;
        }

        return patterns || [];
      }
    } catch (error) {
      console.error('[QueryAnalytics] Error getting pattern metrics:', error);
      throw error;
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Parse time range string to days
   * @private
   */
  _parseTimeRange(timeRange) {
    const match = timeRange.match(/(\d+)([dwmy])/);
    if (!match) return 7; // Default to 7 days

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'd': return value;
      case 'w': return value * 7;
      case 'm': return value * 30;
      case 'y': return value * 365;
      default: return 7;
    }
  }

  /**
   * Calculate average for a field
   * @private
   */
  _calculateAverage(logs, field) {
    const values = logs
      .map(l => l[field])
      .filter(v => v !== null && v !== undefined && !isNaN(v));
    
    if (values.length === 0) return null;
    
    const sum = values.reduce((a, b) => a + b, 0);
    return Math.round((sum / values.length) * 100) / 100;
  }

  /**
   * Calculate minimum for a field
   * @private
   */
  _calculateMin(logs, field) {
    const values = logs
      .map(l => l[field])
      .filter(v => v !== null && v !== undefined && !isNaN(v));
    
    return values.length > 0 ? Math.min(...values) : null;
  }

  /**
   * Calculate maximum for a field
   * @private
   */
  _calculateMax(logs, field) {
    const values = logs
      .map(l => l[field])
      .filter(v => v !== null && v !== undefined && !isNaN(v));
    
    return values.length > 0 ? Math.max(...values) : null;
  }

  /**
   * Calculate median for a field
   * @private
   */
  _calculateMedian(logs, field) {
    const values = logs
      .map(l => l[field])
      .filter(v => v !== null && v !== undefined && !isNaN(v))
      .sort((a, b) => a - b);
    
    if (values.length === 0) return null;
    
    const mid = Math.floor(values.length / 2);
    return values.length % 2 === 0
      ? (values[mid - 1] + values[mid]) / 2
      : values[mid];
  }

  /**
   * Calculate intent distribution
   * @private
   */
  _calculateIntentDistribution(logs) {
    const distribution = {};
    
    logs.forEach(log => {
      const intent = log.matched_intent || 'unknown';
      distribution[intent] = (distribution[intent] || 0) + 1;
    });

    return Object.entries(distribution)
      .map(([intent, count]) => ({ intent, count, percentage: (count / logs.length) * 100 }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Calculate method distribution
   * @private
   */
  _calculateMethodDistribution(logs) {
    const distribution = {};
    
    logs.forEach(log => {
      const method = log.decomposition_method || 'direct';
      distribution[method] = (distribution[method] || 0) + 1;
    });

    return Object.entries(distribution)
      .map(([method, count]) => ({ method, count, percentage: (count / logs.length) * 100 }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Calculate errors by method
   * @private
   */
  _calculateErrorsByMethod(logs) {
    const errorsByMethod = {};
    
    logs
      .filter(l => l.success === false)
      .forEach(log => {
        const method = log.decomposition_method || 'unknown';
        errorsByMethod[method] = (errorsByMethod[method] || 0) + 1;
      });

    return errorsByMethod;
  }

  /**
   * Calculate top errors
   * @private
   */
  _calculateTopErrors(logs, limit = 10) {
    const errorMessages = {};
    
    logs
      .filter(l => l.success === false && l.error_message)
      .forEach(log => {
        const msg = log.error_message;
        errorMessages[msg] = (errorMessages[msg] || 0) + 1;
      });

    return Object.entries(errorMessages)
      .map(([message, count]) => ({ message, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Calculate trends (daily breakdown)
   * @private
   */
  _calculateTrends(logs) {
    const trends = {};
    
    logs.forEach(log => {
      const date = new Date(log.created_at).toISOString().split('T')[0];
      if (!trends[date]) {
        trends[date] = { date, count: 0, successCount: 0, avgResponseTime: [] };
      }
      trends[date].count++;
      if (log.success !== false) {
        trends[date].successCount++;
      }
      if (log.response_time_ms) {
        trends[date].avgResponseTime.push(log.response_time_ms);
      }
    });

    return Object.values(trends).map(trend => ({
      date: trend.date,
      count: trend.count,
      successRate: (trend.successCount / trend.count) * 100,
      avgResponseTime: trend.avgResponseTime.length > 0
        ? Math.round((trend.avgResponseTime.reduce((a, b) => a + b, 0) / trend.avgResponseTime.length) * 100) / 100
        : null
    })).sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Get most frequent queries
   * @private
   */
  _getMostFrequentQueries(logs, limit = 10) {
    const queryCounts = {};
    
    logs.forEach(log => {
      const query = log.query?.toLowerCase().trim();
      if (query) {
        queryCounts[query] = (queryCounts[query] || 0) + 1;
      }
    });

    return Object.entries(queryCounts)
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Get most frequent intents
   * @private
   */
  _getMostFrequentIntents(logs, limit = 10) {
    const intentCounts = {};
    
    logs.forEach(log => {
      const intent = log.matched_intent || 'unknown';
      intentCounts[intent] = (intentCounts[intent] || 0) + 1;
    });

    return Object.entries(intentCounts)
      .map(([intent, count]) => ({ intent, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Calculate query frequency
   * @private
   */
  _calculateQueryFrequency(logs) {
    if (logs.length === 0) return 'No queries';
    
    const days = Math.max(1, Math.ceil(
      (new Date() - new Date(logs[logs.length - 1].created_at)) / (1000 * 60 * 60 * 24)
    ));
    
    const queriesPerDay = logs.length / days;
    
    if (queriesPerDay >= 1) {
      return `${Math.round(queriesPerDay * 10) / 10} queries/day`;
    } else {
      const queriesPerWeek = queriesPerDay * 7;
      return `${Math.round(queriesPerWeek * 10) / 10} queries/week`;
    }
  }

  /**
   * Calculate peak usage times
   * @private
   */
  _calculatePeakUsageTimes(logs) {
    const hourCounts = Array(24).fill(0);
    
    logs.forEach(log => {
      const hour = new Date(log.created_at).getHours();
      hourCounts[hour]++;
    });

    const maxCount = Math.max(...hourCounts);
    const peakHours = hourCounts
      .map((count, hour) => ({ hour, count }))
      .filter(h => h.count === maxCount)
      .map(h => h.hour);

    return {
      peakHours: peakHours,
      distribution: hourCounts.map((count, hour) => ({ hour, count }))
    };
  }

  /**
   * Detect follow-up patterns
   * @private
   */
  _detectFollowUpPatterns(logs) {
    const followUps = [];
    const FOLLOW_UP_WINDOW = 5 * 60 * 1000; // 5 minutes in milliseconds
    
    for (let i = 1; i < logs.length; i++) {
      const current = new Date(logs[i].created_at);
      const previous = new Date(logs[i - 1].created_at);
      const timeDiff = current - previous;
      
      if (timeDiff < FOLLOW_UP_WINDOW) {
        followUps.push({
          previousQuery: logs[i - 1].query,
          currentQuery: logs[i].query,
          timeDiff: timeDiff,
          sameIntent: logs[i].matched_intent === logs[i - 1].matched_intent
        });
      }
    }
    
    return {
      totalFollowUps: followUps.length,
      sameIntentFollowUps: followUps.filter(f => f.sameIntent).length,
      followUpRate: logs.length > 0 ? (followUps.length / logs.length) * 100 : 0
    };
  }

  /**
   * Get empty stats object
   * @private
   */
  _getEmptyStats() {
    return {
      totalQueries: 0,
      successfulQueries: 0,
      failedQueries: 0,
      successRate: 0,
      avgResponseTime: null,
      intentDistribution: [],
      methodDistribution: [],
      avgResultCount: null,
      patternUsageCount: 0,
      patternUsageRate: 0
    };
  }

  /**
   * Check if cache is valid
   * @private
   */
  _isCacheValid(key) {
    if (!this.cache.has(key)) return false;
    
    const timestamp = this.cacheTimestamps.get(key);
    const now = Date.now();
    return (now - timestamp) < (this.options.cacheTTL * 1000);
  }

  /**
   * Set cache value
   * @private
   */
  _setCache(key, value) {
    this.cache.set(key, value);
    this.cacheTimestamps.set(key, Date.now());
    
    // Limit cache size
    if (this.cache.size > 50) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
      this.cacheTimestamps.delete(oldestKey);
    }
  }

  /**
   * Clear cache
   * @private
   */
  _clearCache() {
    this.cache.clear();
    this.cacheTimestamps.clear();
  }
}

