/**
 * User Profile Analyzer
 *
 * Analyzes user behavior from intent_logs to generate personalized profiles.
 * Uses statistical analysis and pattern detection to identify:
 * - Primary optimization goals (rewards, APR, float)
 * - Shopping patterns (merchants, categories)
 * - Engagement levels and preferences
 *
 * Algorithm:
 * 1. Aggregate intent_logs (last 30 days)
 * 2. Extract entities (merchants, categories, keywords)
 * 3. Calculate frequencies and confidence scores
 * 4. Generate compact summary (~100 tokens)
 *
 * @module services/userProfileAnalyzer
 */

import { supabase } from '../config/supabase.js';

// =============================================================================
// Constants
// =============================================================================

const LOOKBACK_DAYS = 30; // Analyze last 30 days of activity
const MIN_SAMPLE_SIZE = 3; // Minimum queries needed for profile
const CONFIDENCE_THRESHOLD = 0.6; // Minimum confidence to trust profile

// Optimization goal keywords
const GOAL_KEYWORDS = {
  maximize_rewards: [
    'reward', 'points', 'cashback', 'cash back', 'maximize', 'earn', 'bonus',
    'miles', 'best card', 'most points'
  ],
  minimize_apr: [
    'apr', 'interest', 'rate', 'minimize', 'lowest', 'cheap', 'avoid interest',
    'save money', 'reduce cost'
  ],
  maximize_float: [
    'float', 'grace period', 'payment timing', 'delay', 'cash flow',
    'due date', 'furthest out', 'longest grace'
  ]
};

// Common merchants (for pattern detection)
const KNOWN_MERCHANTS = new Set([
  'costco', 'target', 'walmart', 'whole foods', 'amazon', 'kroger',
  'safeway', 'trader joes', 'starbucks', 'chipotle', 'mcdonalds',
  'shell', 'chevron', 'bp', 'exxon'
]);

// Shopping categories
const KNOWN_CATEGORIES = new Set([
  'groceries', 'gas', 'dining', 'travel', 'entertainment',
  'online shopping', 'drugstore', 'home improvement'
]);

// =============================================================================
// Main Analysis Function
// =============================================================================

/**
 * Analyze user behavior from intent_logs
 *
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User profile summary
 *
 * @example
 * const profile = await analyzeUserBehavior(userId);
 * // {
 * //   optimization_goal: 'maximize_rewards',
 * //   frequent_merchants: ['costco', 'target'],
 * //   favorite_categories: ['groceries', 'gas'],
 * //   query_frequency: '3-5x per week',
 * //   confidence: 0.85,
 * //   sample_size: 47
 * // }
 */
export const analyzeUserBehavior = async (userId) => {
  const startTime = performance.now();

  try {
    console.log(`[UserProfileAnalyzer] Analyzing behavior for user ${userId}`);

    // Fetch recent intent logs (last 30 days)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - LOOKBACK_DAYS);

    const { data: logs, error } = await supabase
      .from('intent_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', cutoffDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[UserProfileAnalyzer] Error fetching logs:', error);
      return null;
    }

    if (!logs || logs.length < MIN_SAMPLE_SIZE) {
      console.log(`[UserProfileAnalyzer] Insufficient data: ${logs?.length || 0} queries (need ${MIN_SAMPLE_SIZE}+)`);
      return null;
    }

    // Analyze patterns
    const profile = {
      // Detected patterns
      optimization_goal: detectOptimizationGoal(logs),
      frequent_merchants: extractFrequentMerchants(logs),
      favorite_categories: extractFavoriteCategories(logs),
      query_frequency: calculateQueryFrequency(logs),

      // Conversation style
      prefers_detailed: detectDetailPreference(logs),
      asks_followups: detectFollowupPattern(logs),

      // Intent distribution
      top_intents: getTopIntents(logs),

      // Metadata
      confidence: calculateConfidence(logs),
      sample_size: logs.length,
      last_query_at: logs[0].created_at,
      analyzed_at: new Date().toISOString()
    };

    const latency = performance.now() - startTime;
    console.log(`[UserProfileAnalyzer] Analysis complete (${latency.toFixed(2)}ms, ${logs.length} queries, confidence: ${(profile.confidence * 100).toFixed(1)}%)`);

    return profile;

  } catch (error) {
    console.error('[UserProfileAnalyzer] Error analyzing behavior:', error);
    return null;
  }
};

// =============================================================================
// Pattern Detection Functions
// =============================================================================

/**
 * Detect user's primary optimization goal from query patterns
 * @private
 */
const detectOptimizationGoal = (logs) => {
  const goalScores = {
    maximize_rewards: 0,
    minimize_apr: 0,
    maximize_float: 0
  };

  // Score each log entry
  logs.forEach(log => {
    const query = (log.query || '').toLowerCase();

    // Check for goal keywords
    for (const [goal, keywords] of Object.entries(GOAL_KEYWORDS)) {
      keywords.forEach(keyword => {
        if (query.includes(keyword)) {
          goalScores[goal] += 1;
        }
      });
    }

    // Intent-based scoring
    if (log.matched_intent === 'card_recommendation') {
      // Recommendations usually indicate rewards optimization
      goalScores.maximize_rewards += 0.5;
    }
  });

  // Find highest scoring goal
  const [topGoal, topScore] = Object.entries(goalScores)
    .sort((a, b) => b[1] - a[1])[0];

  // Default to rewards if no clear signal
  return topScore > 0 ? topGoal : 'maximize_rewards';
};

/**
 * Extract frequently mentioned merchants
 * @private
 */
const extractFrequentMerchants = (logs) => {
  const merchantCounts = new Map();

  logs.forEach(log => {
    const query = (log.query || '').toLowerCase();

    // Check for known merchants
    KNOWN_MERCHANTS.forEach(merchant => {
      if (query.includes(merchant)) {
        merchantCounts.set(merchant, (merchantCounts.get(merchant) || 0) + 1);
      }
    });
  });

  // Return top 3 merchants
  return Array.from(merchantCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([merchant]) => merchant);
};

/**
 * Extract favorite shopping categories
 * @private
 */
const extractFavoriteCategories = (logs) => {
  const categoryCounts = new Map();

  logs.forEach(log => {
    const query = (log.query || '').toLowerCase();

    // Check for known categories
    KNOWN_CATEGORIES.forEach(category => {
      if (query.includes(category)) {
        categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
      }
    });
  });

  // Return top 2 categories
  return Array.from(categoryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([category]) => category);
};

/**
 * Calculate query frequency pattern
 * @private
 */
const calculateQueryFrequency = (logs) => {
  if (logs.length === 0) return 'inactive';

  const daysActive = LOOKBACK_DAYS;
  const avgQueriesPerDay = logs.length / daysActive;
  const avgQueriesPerWeek = avgQueriesPerDay * 7;

  if (avgQueriesPerWeek < 1) return 'occasionally';
  if (avgQueriesPerWeek < 3) return '1-2x per week';
  if (avgQueriesPerWeek < 7) return '3-5x per week';
  return 'daily';
};

/**
 * Detect if user prefers detailed responses
 * Based on query complexity and follow-up patterns
 * @private
 */
const detectDetailPreference = (logs) => {
  let detailScore = 0;

  logs.forEach(log => {
    const query = (log.query || '').toLowerCase();

    // Long queries suggest detail preference
    if (query.length > 50) detailScore += 1;

    // Comparison queries suggest analytical mindset
    if (query.includes('compare') || query.includes('vs') || query.includes('versus')) {
      detailScore += 2;
    }

    // "Why" questions suggest desire for explanation
    if (query.includes('why') || query.includes('explain') || query.includes('how')) {
      detailScore += 1;
    }
  });

  return detailScore > logs.length * 0.3; // 30% threshold
};

/**
 * Detect follow-up pattern (engagement level)
 * @private
 */
const detectFollowupPattern = (logs) => {
  if (logs.length < 2) return false;

  let followupCount = 0;

  // Check if queries are related to previous ones (within 5 minutes)
  for (let i = 1; i < logs.length && i < 20; i++) {
    const current = logs[i];
    const previous = logs[i - 1];

    const timeDiff = new Date(previous.created_at) - new Date(current.created_at);
    const minutesDiff = timeDiff / (1000 * 60);

    // Same intent within 5 minutes = likely follow-up
    if (minutesDiff < 5 && current.matched_intent === previous.matched_intent) {
      followupCount += 1;
    }
  }

  return followupCount > logs.length * 0.15; // 15% threshold
};

/**
 * Get top intents by frequency
 * @private
 */
const getTopIntents = (logs) => {
  const intentCounts = new Map();

  logs.forEach(log => {
    if (log.matched_intent && log.matched_intent !== 'gpt_fallback') {
      intentCounts.set(
        log.matched_intent,
        (intentCounts.get(log.matched_intent) || 0) + 1
      );
    }
  });

  return Array.from(intentCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([intent, count]) => ({ intent, count }));
};

/**
 * Calculate confidence score for profile
 * Based on sample size, data quality, and pattern consistency
 * @private
 */
const calculateConfidence = (logs) => {
  let confidence = 0;

  // Sample size confidence (0-0.4)
  // 3-10 queries: 0.1-0.2
  // 10-30 queries: 0.2-0.3
  // 30+ queries: 0.3-0.4
  const sampleSize = logs.length;
  if (sampleSize >= 30) {
    confidence += 0.4;
  } else if (sampleSize >= 10) {
    confidence += 0.2 + (sampleSize - 10) / 200; // Gradual increase
  } else {
    confidence += sampleSize / 50;
  }

  // Data quality confidence (0-0.3)
  const validLogs = logs.filter(log =>
    log.matched_intent &&
    log.matched_intent !== 'gpt_fallback' &&
    log.query && log.query.length > 5
  );
  confidence += (validLogs.length / logs.length) * 0.3;

  // Recency confidence (0-0.2)
  const daysSinceLastQuery = (Date.now() - new Date(logs[0].created_at)) / (1000 * 60 * 60 * 24);
  if (daysSinceLastQuery < 1) {
    confidence += 0.2;
  } else if (daysSinceLastQuery < 7) {
    confidence += 0.15;
  } else if (daysSinceLastQuery < 14) {
    confidence += 0.1;
  }

  // Pattern consistency confidence (0-0.1)
  const uniqueIntents = new Set(logs.map(log => log.matched_intent)).size;
  const intentDiversity = uniqueIntents / Math.min(logs.length, 10);
  // Higher diversity = more engagement, slight confidence boost
  confidence += Math.min(intentDiversity * 0.1, 0.1);

  return Math.min(confidence, 1.0); // Cap at 1.0
};

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get aggregate statistics for all user profiles
 * Useful for monitoring and analytics
 *
 * @returns {Promise<Object>} Aggregate statistics
 */
export const getProfileStatistics = async () => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('summary, query_count, created_at');

    if (error) {
      console.error('[UserProfileAnalyzer] Error fetching statistics:', error);
      return null;
    }

    const stats = {
      total_profiles: data.length,
      avg_confidence: 0,
      avg_sample_size: 0,
      goal_distribution: {
        maximize_rewards: 0,
        minimize_apr: 0,
        maximize_float: 0
      },
      profiles_by_age: {
        fresh: 0,      // < 1 day
        recent: 0,     // 1-7 days
        stale: 0       // > 7 days
      }
    };

    data.forEach(profile => {
      const summary = profile.summary;

      // Average confidence
      stats.avg_confidence += (summary.confidence || 0);

      // Average sample size
      stats.avg_sample_size += (profile.query_count || 0);

      // Goal distribution
      if (summary.optimization_goal) {
        stats.goal_distribution[summary.optimization_goal]++;
      }

      // Profile age
      const age = Date.now() - new Date(profile.created_at);
      const ageInDays = age / (1000 * 60 * 60 * 24);
      if (ageInDays < 1) stats.profiles_by_age.fresh++;
      else if (ageInDays < 7) stats.profiles_by_age.recent++;
      else stats.profiles_by_age.stale++;
    });

    // Calculate averages
    if (data.length > 0) {
      stats.avg_confidence /= data.length;
      stats.avg_sample_size /= data.length;
    }

    return stats;

  } catch (error) {
    console.error('[UserProfileAnalyzer] Error getting statistics:', error);
    return null;
  }
};

// =============================================================================
// Exports
// =============================================================================

export default {
  analyzeUserBehavior,
  getProfileStatistics
};
