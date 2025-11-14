/**
 * Enhanced Recommendation Engine
 *
 * Orchestrates the complete recommendation pipeline:
 * 1. Classify merchant into category
 * 2. Find reward multipliers for all user cards
 * 3. Score cards using recommendation strategies
 * 4. Rank and generate explanations
 *
 * Architecture:
 * - Pure orchestration logic (no side effects)
 * - Dependency injection for testability
 * - Clear separation of concerns
 * - Comprehensive error handling
 *
 * Performance Target: <500ms end-to-end
 * - Classification: <10ms
 * - Matching: <5ms per card
 * - Scoring: <100ms for 10 cards
 * - Explanation: <50ms
 *
 * @example
 * const engine = new EnhancedRecommendationEngine(
 *   merchantClassifier,
 *   categoryMatcher,
 *   recommendationStrategies
 * );
 *
 * const recommendation = await engine.getRecommendation(
 *   'user-123',
 *   {
 *     merchant: 'United Airlines',
 *     mccCode: '4511',
 *     amount: 500,
 *     cards: userCards,
 *     strategy: 'rewards'
 *   }
 * );
 *
 * // Returns:
 * // {
 * //   primary: { card, multiplier, value, explanation },
 * //   alternatives: [ { card, multiplier, ... } ],
 * //   confidence: 0.95,
 * //   classification: { category, confidence, source },
 * //   processingTimeMs: 125
 * // }
 */

import {
  classifyMerchant,
  defaultClassifier as merchantClassifier
} from '../merchantClassification/merchantClassifier';

import {
  findRewardMultiplier,
  scoreCardsByCategory
} from '../recommendations/categoryMatcher';

/**
 * Enhanced Recommendation Engine Class
 *
 * Provides intelligent card recommendations based on:
 * - Merchant classification (AI-powered)
 * - Reward multiplier matching
 * - Multi-strategy scoring (rewards, APR, grace period)
 * - Confidence-based explanations
 */
export class EnhancedRecommendationEngine {
  /**
   * Constructor
   *
   * @param {Object} deps - Dependencies (for testability)
   * @param {Object} deps.merchantClassifier - Merchant classification service
   * @param {Object} deps.categoryMatcher - Category/reward matching service
   * @param {Object} deps.recommendationStrategies - Scoring strategies
   * @param {Object} options - Configuration options
   * @param {number} options.performanceTimeout - Max milliseconds for operation (default: 5000)
   * @param {boolean} options.enableCaching - Enable response caching (default: true)
   * @param {boolean} options.debugMode - Enable debug logging (default: false)
   */
  constructor(deps = {}, options = {}) {
    // Inject dependencies with fallbacks
    this.merchantClassifier = deps.merchantClassifier || merchantClassifier;
    this.categoryMatcher = deps.categoryMatcher;
    this.recommendationStrategies = deps.recommendationStrategies;

    // Configuration
    this.performanceTimeout = options.performanceTimeout || 5000;
    this.enableCaching = options.enableCaching !== false;
    this.debugMode = options.debugMode || false;

    // Metrics
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageLatency: 0,
      cacheHits: 0,
      cacheMisses: 0
    };

    // Simple LRU cache
    this.responseCache = new Map();
    this.MAX_CACHE_SIZE = 100;

    this._log('Enhanced Recommendation Engine initialized', {
      cachingEnabled: this.enableCaching,
      performanceTimeout: this.performanceTimeout
    });
  }

  /**
   * Main entry point: Get card recommendation for a merchant
   *
   * @param {string} userId - User ID (for logging/debugging)
   * @param {Object} context - Recommendation context
   * @param {string} context.merchant - Merchant name (e.g., "United Airlines")
   * @param {string} [context.mccCode] - Merchant category code (optional)
   * @param {number} [context.amount] - Purchase amount (for score calculations)
   * @param {Array} context.cards - User's cards to score
   * @param {string} [context.strategy] - Recommendation strategy (rewards/apr/graceperiod)
   * @param {string} [context.excludeCardId] - Card ID to exclude from recommendations
   *
   * @returns {Promise<Object>} Recommendation with primary + alternatives + confidence
   *
   * @throws {Error} If merchant classification fails or invalid inputs provided
   */
  async getRecommendation(userId, context) {
    const startTime = performance.now();

    try {
      // Input validation
      this._validateContext(context);

      // Check cache
      const cacheKey = this._generateCacheKey(context);
      const cached = this._getFromCache(cacheKey);
      if (cached) {
        this.metrics.cacheHits++;
        this._log('Cache hit', { merchant: context.merchant, userId });
        return {
          ...cached,
          fromCache: true,
          processingTimeMs: Math.round(performance.now() - startTime)
        };
      }
      this.metrics.cacheMisses++;

      // Step 1: Classify merchant into category
      const classification = await this._classifyMerchant(
        context.merchant,
        context.mccCode
      );

      // Step 2: Find reward multipliers for all cards
      const multipliers = this._findRewardMultipliers(
        context.cards,
        classification.categoryId
      );

      // Step 3: Score cards using strategy
      const scored = this._scoreCards(
        context.cards,
        multipliers,
        context.strategy || 'rewards',
        context.amount
      );

      // Step 4: Rank and generate recommendations
      const recommendations = this._rankAndExplain(
        scored,
        classification,
        context.excludeCardId
      );

      // Step 5: Assemble response
      const response = {
        primary: recommendations.primary,
        alternatives: recommendations.alternatives,
        classification: {
          categoryId: classification.categoryId,
          categoryName: classification.categoryName,
          confidence: classification.confidence,
          source: classification.source,
          explanation: classification.explanation
        },
        strategy: context.strategy || 'rewards',
        confidence: recommendations.confidence,
        timestamp: new Date().toISOString(),
        processingTimeMs: Math.round(performance.now() - startTime),
        fromCache: false
      };

      // Cache response
      if (this.enableCaching) {
        this._setInCache(cacheKey, response);
      }

      // Update metrics
      this.metrics.totalRequests++;
      this.metrics.successfulRequests++;
      this._updateAverageLatency(response.processingTimeMs);

      this._log('Recommendation generated successfully', {
        userId,
        merchant: context.merchant,
        category: classification.categoryId,
        primaryCard: response.primary?.card?.name,
        latencyMs: response.processingTimeMs
      });

      return response;
    } catch (error) {
      this.metrics.totalRequests++;
      this.metrics.failedRequests++;

      this._log('Error generating recommendation', {
        userId,
        merchant: context.merchant,
        error: error.message,
        stack: error.stack
      }, 'ERROR');

      throw new Error(
        `Failed to generate recommendation: ${error.message}`
      );
    }
  }

  /**
   * Step 1: Classify merchant into a category
   *
   * Uses multi-source pipeline:
   * - MCC code (if provided) - most reliable
   * - Keyword matching - fast fallback
   * - Default - graceful degradation
   *
   * @private
   * @param {string} merchant - Merchant name
   * @param {string} [mccCode] - Optional MCC code
   * @returns {Promise<Object>} Classification result
   */
  async _classifyMerchant(merchant, mccCode) {
    const startTime = performance.now();

    try {
      const classification = this.merchantClassifier.classify(merchant, mccCode);

      const duration = performance.now() - startTime;
      if (duration > 10) {
        this._log('Classification took longer than target', {
          merchant,
          durationMs: Math.round(duration)
        }, 'WARN');
      }

      return classification;
    } catch (error) {
      this._log('Merchant classification failed', {
        merchant,
        error: error.message
      }, 'ERROR');

      // Graceful fallback: return default classification
      return {
        categoryId: null,
        categoryName: null,
        confidence: 0,
        source: 'default',
        explanation: `Could not classify "${merchant}" - using default recommendations`
      };
    }
  }

  /**
   * Step 2: Find reward multipliers for all cards in a category
   *
   * @private
   * @param {Array} cards - User's cards
   * @param {string} categoryId - Category ID (e.g., "travel")
   * @returns {Map} Map of card IDs to multipliers
   */
  _findRewardMultipliers(cards, categoryId) {
    const multipliers = new Map();

    if (!categoryId) {
      // No category found - use default multiplier for all cards
      cards.forEach(card => {
        multipliers.set(card.id, 1);
      });
      return multipliers;
    }

    cards.forEach(card => {
      try {
        const multiplier = findRewardMultiplier(card, categoryId);
        multipliers.set(card.id, multiplier);
      } catch (error) {
        this._log('Error finding multiplier', {
          cardId: card.id,
          categoryId,
          error: error.message
        }, 'WARN');

        // Fallback to 1x
        multipliers.set(card.id, 1);
      }
    });

    return multipliers;
  }

  /**
   * Step 3: Score cards using recommendation strategy
   *
   * Strategies:
   * - 'rewards': Maximize reward multiplier (default)
   * - 'apr': Prioritize lowest APR
   * - 'graceperiod': Prioritize longest grace period
   *
   * @private
   * @param {Array} cards - User's cards
   * @param {Map} multipliers - Card multipliers
   * @param {string} strategy - Strategy ('rewards', 'apr', 'graceperiod')
   * @param {number} amount - Purchase amount (for reward calculation)
   * @returns {Array} Scored cards
   */
  _scoreCards(cards, multipliers, strategy, amount = 100) {
    const scored = cards.map(card => {
      const multiplier = multipliers.get(card.id) || 1;

      // Calculate base score components
      const rewardValue = (multiplier - 1) * amount;
      const aprScore = card.apr ? 100 - card.apr : 0;
      const graceScore = card.gracePeriodDays ? card.gracePeriodDays : 0;

      // Weight based on strategy
      let score = 0;
      let breakdown = {};

      switch (strategy) {
        case 'apr':
          score = aprScore * 10; // Weighted heavily
          breakdown = { aprScore };
          break;

        case 'graceperiod':
          score = graceScore;
          breakdown = { graceScore };
          break;

        case 'rewards':
        default:
          score = rewardValue + (aprScore * 0.1); // Bonus for lower APR
          breakdown = { multiplier, rewardValue, aprScore };
          break;
      }

      return {
        card,
        multiplier,
        score,
        scoreBreakdown: breakdown,
        rewardValue
      };
    });

    return scored;
  }

  /**
   * Step 4: Rank cards and generate explanations
   *
   * @private
   * @param {Array} scored - Scored cards
   * @param {Object} classification - Classification result
   * @param {string} [excludeCardId] - Card ID to exclude
   * @returns {Object} Primary recommendation + alternatives
   */
  _rankAndExplain(scored, classification, excludeCardId) {
    // Filter out excluded card
    const available = excludeCardId
      ? scored.filter(s => s.card.id !== excludeCardId)
      : scored;

    // Sort by score (highest first)
    const ranked = available.sort((a, b) => b.score - a.score);

    if (ranked.length === 0) {
      return {
        primary: null,
        alternatives: [],
        confidence: 0
      };
    }

    // Generate explanations
    const primary = ranked[0];
    const alternatives = ranked.slice(1, 3); // Top 2 alternatives

    // Calculate confidence based on multiplier difference
    const confidence = this._calculateConfidence(
      primary,
      alternatives.length > 0 ? alternatives[0] : null,
      classification
    );

    return {
      primary: {
        card: primary.card,
        multiplier: primary.multiplier,
        rewardValue: primary.rewardValue,
        explanation: this._generateExplanation(primary, classification),
        score: primary.score
      },
      alternatives: alternatives.map(alt => ({
        card: alt.card,
        multiplier: alt.multiplier,
        rewardValue: alt.rewardValue,
        explanation: this._generateExplanation(alt, classification),
        score: alt.score
      })),
      confidence
    };
  }

  /**
   * Generate human-readable explanation for recommendation
   *
   * @private
   * @param {Object} recommendation - Scored recommendation
   * @param {Object} classification - Classification result
   * @returns {string} Explanation
   */
  _generateExplanation(recommendation, classification) {
    const { card, multiplier } = recommendation;
    const { categoryName } = classification;

    if (!categoryName) {
      return `${card.name} is a good option for this purchase.`;
    }

    if (multiplier > 1) {
      return `${card.name} offers ${multiplier}x rewards on ${categoryName} purchases.`;
    }

    return `${card.name} provides standard rewards on ${categoryName} purchases.`;
  }

  /**
   * Calculate confidence score for recommendation
   *
   * Higher confidence if:
   * - Classification is confident (>90%)
   * - Card has significantly higher multiplier than alternatives
   * - Merchant is well-known
   *
   * @private
   * @param {Object} primary - Primary recommendation
   * @param {Object} [alternative] - Top alternative
   * @param {Object} classification - Classification result
   * @returns {number} Confidence score (0-1)
   */
  _calculateConfidence(primary, alternative, classification) {
    let confidence = classification.confidence || 0.5;

    // Boost if clear winner
    if (alternative) {
      const multiplierDiff = primary.multiplier - alternative.multiplier;
      if (multiplierDiff >= 2) {
        confidence = Math.min(1, confidence + 0.1);
      } else if (multiplierDiff < 0.5) {
        confidence = Math.max(0.5, confidence - 0.1);
      }
    }

    return Math.round(confidence * 100) / 100;
  }

  /**
   * Input validation
   *
   * @private
   * @param {Object} context - Recommendation context
   * @throws {Error} If context is invalid
   */
  _validateContext(context) {
    if (!context) {
      throw new Error('Context is required');
    }

    if (!context.merchant || typeof context.merchant !== 'string') {
      throw new Error('Merchant name (string) is required');
    }

    if (!context.cards || !Array.isArray(context.cards)) {
      throw new Error('Cards array is required');
    }

    if (context.cards.length === 0) {
      throw new Error('At least one card is required');
    }

    // Validate each card has required fields
    context.cards.forEach((card, index) => {
      if (!card.id) {
        throw new Error(`Card at index ${index} is missing 'id' field`);
      }
      if (!card.name) {
        throw new Error(`Card at index ${index} is missing 'name' field`);
      }
    });
  }

  /**
   * Cache management - generate cache key
   *
   * @private
   * @param {Object} context - Recommendation context
   * @returns {string} Cache key
   */
  _generateCacheKey(context) {
    // Cache key includes merchant and cards, not strategy (different strategies = different results)
    const cardIds = context.cards
      .map(c => c.id)
      .sort()
      .join(',');

    return `${context.merchant}|${cardIds}`;
  }

  /**
   * Cache management - get from cache
   *
   * @private
   * @param {string} key - Cache key
   * @returns {Object|null} Cached response or null
   */
  _getFromCache(key) {
    if (!this.enableCaching) return null;
    return this.responseCache.get(key);
  }

  /**
   * Cache management - set in cache (with LRU eviction)
   *
   * @private
   * @param {string} key - Cache key
   * @param {Object} value - Response to cache
   */
  _setInCache(key, value) {
    if (!this.enableCaching) return;

    // Simple LRU: delete oldest entry if cache full
    if (this.responseCache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.responseCache.keys().next().value;
      this.responseCache.delete(firstKey);
    }

    this.responseCache.set(key, value);
  }

  /**
   * Metrics - update average latency
   *
   * @private
   * @param {number} latencyMs - Latency in milliseconds
   */
  _updateAverageLatency(latencyMs) {
    const total = this.metrics.successfulRequests;
    const current = this.metrics.averageLatency;
    this.metrics.averageLatency = (current * (total - 1) + latencyMs) / total;
  }

  /**
   * Logging utility
   *
   * @private
   * @param {string} message - Log message
   * @param {Object} context - Log context
   * @param {string} level - Log level (INFO, WARN, ERROR)
   */
  _log(message, context = {}, level = 'INFO') {
    if (!this.debugMode && level === 'INFO') {
      return; // Skip INFO logs unless debug mode
    }

    console.log(
      `[EnhancedRecommendationEngine] ${level}: ${message}`,
      context
    );
  }

  /**
   * Get engine metrics
   *
   * @returns {Object} Engine metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      cacheSize: this.responseCache.size,
      cacheHitRate: this.metrics.totalRequests > 0
        ? Math.round((this.metrics.cacheHits / this.metrics.totalRequests) * 100)
        : 0
    };
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache() {
    this.responseCache.clear();
    this._log('Cache cleared');
  }

  /**
   * Reset metrics (useful for testing)
   */
  resetMetrics() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageLatency: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  }
}

/**
 * Default singleton instance
 *
 * Can be customized for specific use cases
 */
export const defaultEngine = new EnhancedRecommendationEngine({
  merchantClassifier,
  // categoryMatcher and recommendationStrategies injected at usage time
}, {
  enableCaching: true,
  performanceTimeout: 5000,
  debugMode: process.env.DEBUG_RECOMMENDATIONS === 'true'
});

/**
 * Export default for module usage
 */
export default {
  EnhancedRecommendationEngine,
  defaultEngine
};
