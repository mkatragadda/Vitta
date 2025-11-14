/**
 * Recommendation Engine
 * Core logic for recommending credit cards based on different optimization strategies
 *
 * Features:
 * - Feature flag support for enhanced recommendation engine (14 categories)
 * - Graceful fallback to legacy engine
 * - Support for multiple strategies (Rewards, APR, Cashflow)
 * - Backward compatibility with existing code
 */

import { getUserCards } from '../cardService';
import { getUserProfile, STRATEGY_TYPES } from '../userBehavior/behaviorAnalyzer';
import { createLogger } from '../../utils/logger';
import { EnhancedRecommendationEngine } from './enhancedRecommendationEngine';

const logger = createLogger('RecommendationEngine');

/**
 * Feature Flag: Use enhanced recommendation engine
 * Supports all 14 merchant categories with multi-source classification
 *
 * Environment variable: USE_ENHANCED_CLASSIFICATION
 * - true: Use enhanced engine (14 categories, merchant classification, confidence scoring)
 * - false: Use legacy engine (simple category matching)
 *
 * Default: false (use legacy engine for backward compatibility)
 */
const USE_ENHANCED_CLASSIFICATION = process.env.USE_ENHANCED_CLASSIFICATION === 'true';

/**
 * Enhanced engine singleton instance
 * Lazy-loaded on first use
 */
let enhancedEngine = null;

/**
 * Get or create enhanced engine instance
 * @private
 * @returns {EnhancedRecommendationEngine} Singleton instance
 */
const getEnhancedEngine = () => {
  if (!enhancedEngine) {
    enhancedEngine = new EnhancedRecommendationEngine(
      {}, // Use default dependencies
      {
        enableCaching: true,
        debugMode: process.env.DEBUG_RECOMMENDATIONS === 'true'
      }
    );
    logger.info('Enhanced Recommendation Engine initialized');
  }
  return enhancedEngine;
};

/**
 * Get card recommendation for a purchase
 * Routes to enhanced or legacy engine based on feature flag
 *
 * @param {string} userId - User ID
 * @param {Object} context - Purchase context
 * @param {string} context.category - Purchase category (dining, groceries, travel, etc.)
 * @param {string} context.merchant - Specific merchant name
 * @param {number} context.amount - Purchase amount
 * @param {Date} context.date - Purchase date
 * @param {string} context.strategy - Override strategy (optional)
 * @returns {Promise<Object>} Recommendation result
 *
 * @example
 * // Basic usage - category specified
 * const rec = await getRecommendationForPurchase('user-123', {
 *   category: 'dining',
 *   merchant: 'Chipotle',
 *   amount: 50
 * });
 *
 * @example
 * // With merchant (uses enhanced engine if enabled)
 * const rec = await getRecommendationForPurchase('user-123', {
 *   merchant: 'United Airlines',  // Enhanced engine classifies this
 *   amount: 500
 * });
 */
export const getRecommendationForPurchase = async (userId, context = {}) => {
  // Input validation
  if (!userId || typeof userId !== 'string') {
    const error = new Error('Invalid userId provided to getRecommendationForPurchase');
    logger.error('Invalid userId', { userId, type: typeof userId });
    throw error;
  }

  // Only validate amount if it's provided and not null
  if (context.amount !== undefined && context.amount !== null && (typeof context.amount !== 'number' || context.amount < 0)) {
    const error = new Error('Invalid amount in purchase context');
    logger.error('Invalid amount', { amount: context.amount });
    throw error;
  }

  try {
    logger.debug('Getting recommendation', {
      userId,
      strategy: context.strategy,
      useEnhanced: USE_ENHANCED_CLASSIFICATION,
      hasMerchant: !!context.merchant
    });

    // Get user's cards
    const userCards = await getUserCards(userId);

    if (!userCards || userCards.length === 0) {
      logger.info('No cards found for user', { userId });
      return {
        primary: null,
        alternatives: [],
        strategy: STRATEGY_TYPES.REWARDS_MAXIMIZER,
        reasoning: "Add cards to your wallet to get personalized recommendations!",
        noCards: true,
        engine: USE_ENHANCED_CLASSIFICATION ? 'enhanced' : 'legacy'
      };
    }

    // Route to enhanced engine if flag enabled AND merchant is specified
    if (USE_ENHANCED_CLASSIFICATION && context.merchant) {
      return await getEnhancedRecommendation(userId, userCards, context);
    }

    // Fall back to legacy engine
    return await getLegacyRecommendation(userId, userCards, context);

  } catch (error) {
    logger.error('Error getting recommendation', error);

    // Graceful fallback instead of throwing
    return {
      primary: null,
      alternatives: [],
      strategy: context.strategy || STRATEGY_TYPES.REWARDS_MAXIMIZER,
      reasoning: "We're having trouble generating recommendations right now. Please try again in a moment.",
      error: true,
      errorMessage: error.message,
      engine: USE_ENHANCED_CLASSIFICATION ? 'enhanced' : 'legacy'
    };
  }
};

/**
 * Get recommendation using enhanced engine (14 categories + merchant classification)
 * @private
 * @param {string} userId - User ID
 * @param {Array} userCards - User's credit cards
 * @param {Object} context - Purchase context with merchant
 * @returns {Promise<Object>} Enhanced recommendation
 */
const getEnhancedRecommendation = async (userId, userCards, context) => {
  try {
    logger.debug('Using enhanced recommendation engine', {
      userId,
      merchant: context.merchant
    });

    const engine = getEnhancedEngine();

    // Call enhanced engine
    const recommendation = await engine.getRecommendation(userId, {
      merchant: context.merchant,
      mccCode: context.mccCode,
      amount: context.amount,
      cards: userCards,
      strategy: context.strategy || 'rewards'
    });

    logger.debug('Enhanced recommendation generated', {
      userId,
      merchant: context.merchant,
      primaryCard: recommendation.primary?.card?.name,
      confidence: recommendation.confidence,
      processingTimeMs: recommendation.processingTimeMs
    });

    // Convert to legacy format for backward compatibility
    return {
      primary: recommendation.primary?.card || null,
      alternatives: recommendation.alternatives?.map(alt => alt.card) || [],
      strategy: context.strategy || 'rewards',
      reasoning: recommendation.primary?.explanation || '',
      confidence: recommendation.confidence,
      classification: recommendation.classification,
      processingTimeMs: recommendation.processingTimeMs,
      engine: 'enhanced',
      fromCache: recommendation.fromCache
    };

  } catch (error) {
    logger.warn('Enhanced engine failed, falling back to legacy engine', {
      userId,
      error: error.message
    });

    // Fall back to legacy engine on error
    const userProfile = await getUserProfile(userId);
    return await getLegacyRecommendation(userId, userCards, context);
  }
};

/**
 * Get recommendation using legacy engine (category-based)
 * @private
 * @param {string} userId - User ID
 * @param {Array} userCards - User's credit cards
 * @param {Object} context - Purchase context
 * @returns {Promise<Object>} Legacy recommendation
 */
const getLegacyRecommendation = async (userId, userCards, context) => {
  try {
    logger.debug('Using legacy recommendation engine', {
      userId,
      category: context.category
    });

    // Get user behavior profile
    const userProfile = await getUserProfile(userId);

    // Determine strategy (user override or profile-based)
    const strategy = context.strategy || userProfile.profileType;

    logger.debug('Using strategy', { strategy, profileType: userProfile.profileType });

    // Score all cards using selected strategy
    const scoredCards = scoreCards(userCards, context, strategy);

    // Generate reasoning for top recommendation
    const reasoning = generateReasoning(scoredCards[0], context, strategy);

    return {
      primary: scoredCards[0],
      alternatives: scoredCards.slice(1, 3),
      strategy,
      reasoning,
      userProfile,
      engine: 'legacy'
    };
  } catch (error) {
    logger.error('Legacy engine error', error);
    throw error;
  }
};

/**
 * Score all cards based on strategy
 * @param {Array} cards - User's credit cards
 * @param {Object} context - Purchase context
 * @param {string} strategy - Strategy to use
 * @returns {Array} Sorted array of cards with scores
 */
const scoreCards = (cards, context, strategy) => {
  const scoredCards = cards.map(card => {
    let score = 0;

    switch (strategy) {
      case STRATEGY_TYPES.REWARDS_MAXIMIZER:
        score = scoreForRewards(card, context);
        break;
      case STRATEGY_TYPES.APR_MINIMIZER:
        score = scoreForAPR(card, context);
        break;
      case STRATEGY_TYPES.CASHFLOW_OPTIMIZER:
        score = scoreForCashflow(card, context);
        break;
      default:
        score = scoreForRewards(card, context);
    }

    return { ...card, score };
  });

  // Sort by score descending
  return scoredCards.sort((a, b) => b.score - a.score);
};

/**
 * Rank cards for a given strategy and include reasoning
 * @param {Array} cards - User's credit cards
 * @param {string} strategy - Strategy to evaluate
 * @param {Object} context - Optional context for scoring
 * @returns {Array} Array of { card, score, reasoning }
 */
export const rankCardsByStrategy = (cards, strategy, context = {}) => {
  if (!Array.isArray(cards) || cards.length === 0) {
    return [];
  }

  const evaluatedCards = scoreCards(cards, context, strategy);

  return evaluatedCards.map(cardWithScore => ({
    card: cardWithScore, // includes computed score
    score: cardWithScore.score,
    reasoning: generateReasoning(cardWithScore, context, strategy)
  }));
};

/**
 * Strategy 1: Maximize Rewards
 * Scores cards based on reward potential
 */
const scoreForRewards = (card, context) => {
  let score = 0;

  const category = context.category || 'default';
  const amount = context.amount || 0;

  // Get reward multiplier for category
  const rewardStructure = card.reward_structure || {};
  const rewardMultiplier = rewardStructure[category] || rewardStructure.default || 1;

  // Base score from rewards (4x = 400 points)
  score += rewardMultiplier * 100;

  // Calculate potential value
  const potentialValue = (amount * (rewardMultiplier / 100));

  // Bonus for high value purchases
  if (potentialValue > 10) {
    score += 20;
  }

  // Check available credit
  const availableCredit = card.credit_limit - card.current_balance;
  if (availableCredit >= amount) {
    score += 30;
  } else {
    score -= 50; // Heavy penalty for insufficient credit
  }

  // Penalty for high utilization (want to keep it low)
  const utilization = (card.current_balance / card.credit_limit) * 100;
  if (utilization > 50) {
    score -= 30;
  } else if (utilization > 30) {
    score -= 15;
  }

  // Small bonus for low balance (spreading spend)
  if (card.current_balance < card.credit_limit * 0.1) {
    score += 10;
  }

  logger.debug('Rewards score calculated', { cardName: card.card_name, score });
  return Math.max(0, score);
};

/**
 * Strategy 2: Minimize APR
 * Scores cards based on interest rate
 */
const scoreForAPR = (card, context) => {
  let score = 0;

  const amount = context.amount || 0;

  // Primary factor: Lower APR = higher score
  const maxAPR = 30; // Normalize against this
  const aprScore = ((maxAPR - (card.apr || 0)) / maxAPR) * 100;
  score += aprScore * 2; // Weight APR heavily

  // Huge bonus for 0% intro APR
  if (card.apr === 0) {
    score += 100;
  }

  // Check available credit
  const availableCredit = card.credit_limit - card.current_balance;
  if (availableCredit >= amount) {
    score += 20;
  } else {
    score -= 50;
  }

  // Slight bonus for lower existing balance (less total interest)
  const balanceRatio = card.current_balance / card.credit_limit;
  score += (1 - balanceRatio) * 20;

  logger.debug('APR score calculated', { cardName: card.card_name, score });
  return Math.max(0, score);
};

/**
 * Check if card has grace period available
 * Grace period is lost if carrying balance from previous statement
 */
const hasGracePeriod = (card) => {
  // If we have explicit payment tracking, use it
  if (card.paid_in_full_last_month !== undefined) {
    return card.paid_in_full_last_month;
  }

  // Otherwise, assume grace period is lost if carrying any balance
  // This is conservative but safe - cards with balance likely have no grace period
  return card.current_balance === 0;
};

/**
 * Strategy 3: Optimize Cash Flow
 * Scores cards based on time until payment due
 * CRITICAL: Only works if card has grace period (no carried balance)
 * NOW USES: Correct float calculation with paymentCycleUtils
 */
const scoreForCashflow = (card, context) => {
  let score = 0;

  const purchaseDate = new Date(context.date || Date.now());
  const amount = context.amount || 0;

  const cardName = card.nickname || card.card_name || card.card_type;
  const hasBalance = card.current_balance > 0;

  logger.debug('Cashflow scoring start', {
    cardName,
    balance: card.current_balance,
    hasBalance,
    gracePeriodCheck: hasGracePeriod(card)
  });

  // ⚠️ CRITICAL CHECK: Does this card have a grace period?
  // Cards lose grace period if they carried a balance from previous statement
  if (!hasGracePeriod(card)) {
    logger.warn('No grace period available for cashflow optimization', {
      cardName,
      balance: card.current_balance,
      reason: 'carrying balance'
    });

    // Heavy penalty - cash flow optimization doesn't work without grace period
    // Interest accrues IMMEDIATELY on new purchases
    // Return 0 immediately - card is NOT eligible for cashflow
    card._noGracePeriod = true;
    
    logger.debug('Cashflow score (no grace period)', { cardName, score: 0 });
    return 0;  // Changed from Math.max(0, score - 200) to just 0
  }

  // Grace period exists - proceed with normal cash flow scoring
  logger.debug('Grace period available', { cardName: card.card_name });

  // NEW: Use payment cycle utilities for accurate float calculation
  if (card.statement_close_day && card.grace_period_days) {
    const { calculateFloatDays, getPaymentDueDateForFloat } = require('../../utils/paymentCycleUtils');

    // Calculate float days (purchase → payment due)
    const floatDays = calculateFloatDays(card, purchaseDate);
    const paymentDue = getPaymentDueDateForFloat(card, purchaseDate);

    // Score based on float time (more days = higher score)
    score += floatDays * 3;

    // Bonus for very long float periods
    if (floatDays > 45) {
      score += 50;
    } else if (floatDays > 35) {
      score += 30;
    }

    logger.debug('Cashflow score calculated', {
      cardName: card.card_name,
      floatDays,
      paymentDue: paymentDue?.toLocaleDateString(),
      score
    });
  } else {
    // Fallback: Use old logic if payment schedule not configured
    logger.warn('Payment schedule not configured, using fallback', { cardName: card.card_name });

    const gracePeriod = card.grace_period_days || 25;
    score += gracePeriod * 2; // Conservative scoring
  }

  // Check available credit
  const availableCredit = card.credit_limit - card.current_balance;
  if (availableCredit >= amount) {
    score += 20;
  } else {
    score -= 50;
  }

  // Small bonus for lower APR (still matters if carrying balance)
  score += (30 - (card.apr || 20)) * 0.5;

  const finalScore = Math.max(0, score);
  logger.debug('Cashflow score (final)', { cardName, score: finalScore });

  return finalScore;
};

/**
 * Generate human-readable reasoning for recommendation
 * @param {Object} card - Recommended card
 * @param {Object} context - Purchase context
 * @param {string} strategy - Strategy used
 * @returns {string} Reasoning explanation
 */
const generateReasoning = (card, context, strategy) => {
  if (!card) return '';

  const reasons = [];
  const category = context.category || 'default';
  const amount = context.amount || 0;

  // ⚠️ CRITICAL: Check for grace period issues with cashflow strategy
  if (strategy === STRATEGY_TYPES.CASHFLOW_OPTIMIZER && card._noGracePeriod) {
    reasons.push(`⚠️ No grace period (carrying balance)`);
    reasons.push(`Interest accrues immediately on new purchases`);
    return reasons.join(' • ');
  }

  switch (strategy) {
    case STRATEGY_TYPES.REWARDS_MAXIMIZER:
      const rewardMultiplier = card.reward_structure?.[category] || card.reward_structure?.default || 1;

      if (rewardMultiplier > 1) {
        const potentialValue = (amount * (rewardMultiplier / 100)).toFixed(2);
        reasons.push(`Earn ${rewardMultiplier}x rewards (~$${potentialValue} value)`);
      } else {
        reasons.push(`Earn ${rewardMultiplier}x rewards on this purchase`);
      }

      const utilization = ((card.current_balance / card.credit_limit) * 100).toFixed(0);
      if (utilization < 30) {
        reasons.push(`Low utilization (${utilization}%)`);
      }
      break;

    case STRATEGY_TYPES.APR_MINIMIZER:
      if (card.apr === 0) {
        reasons.push(`0% APR - No interest charges!`);
      } else {
        reasons.push(`Lowest APR at ${card.apr}%`);
      }

      if (amount > 0) {
        const monthlyInterest = (amount * (card.apr / 100) / 12).toFixed(2);
        reasons.push(`Save ~$${monthlyInterest}/month on interest`);
      }

      // Warn if carrying balance
      if (card.current_balance > 0) {
        reasons.push(`⚠️ Carrying balance - no grace period on new purchases`);
      }
      break;

    case STRATEGY_TYPES.CASHFLOW_OPTIMIZER:
      if (card.due_date) {
        const daysUntilDue = Math.ceil((new Date(card.due_date) - new Date()) / (1000 * 60 * 60 * 24));
        reasons.push(`${daysUntilDue} days until payment due`);
      }

      const gracePeriod = card.grace_period_days || 25;
      reasons.push(`${gracePeriod}-day grace period available`);
      break;
  }

  // Always include available credit
  const available = card.credit_limit - card.current_balance;
  reasons.push(`$${available.toLocaleString()} available credit`);

  return reasons.join(' • ');
};

/**
 * Get all recommendations across strategies for comparison
 * @param {string} userId - User ID
 * @param {Object} context - Purchase context
 * @returns {Promise<Object>} Recommendations for all strategies
 */
export const getAllStrategyRecommendations = async (userId, context = {}) => {
  const strategies = [
    STRATEGY_TYPES.REWARDS_MAXIMIZER,
    STRATEGY_TYPES.APR_MINIMIZER,
    STRATEGY_TYPES.CASHFLOW_OPTIMIZER
  ];

  const recommendations = {};

  for (const strategy of strategies) {
    recommendations[strategy] = await getRecommendationForPurchase(userId, {
      ...context,
      strategy
    });
  }

  return recommendations;
};

/**
 * Calculate potential reward value for a card
 * @param {Object} card - Credit card
 * @param {Object} context - Purchase context
 * @returns {number} Estimated reward value in dollars
 */
export const calculateRewardValue = (card, context) => {
  const category = context.category || 'default';
  const amount = context.amount || 0;

  const rewardMultiplier = card.reward_structure?.[category] || card.reward_structure?.default || 1;

  // Assume 1 point = $0.01 value (can be adjusted by card type)
  const pointValue = 0.01;

  return (amount * (rewardMultiplier / 100)) / pointValue * pointValue;
};

/**
 * Calculate interest savings for a card
 * @param {Object} card - Credit card
 * @param {number} amount - Amount to charge
 * @param {number} months - Months to carry balance
 * @returns {number} Interest amount
 */
export const calculateInterestCost = (card, amount, months = 1) => {
  const monthlyRate = (card.apr || 0) / 100 / 12;
  return amount * monthlyRate * months;
};

/**
 * Get explanation for strategy
 * @param {string} strategy - Strategy type
 * @returns {Object} Strategy info
 */
export const getStrategyInfo = (strategy) => {
  const info = {
    [STRATEGY_TYPES.REWARDS_MAXIMIZER]: {
      title: 'Maximize Rewards',
      description: 'Best for users who pay in full each month. Focuses on earning maximum points, cashback, and perks.',
      icon: '✨',
      color: 'purple'
    },
    [STRATEGY_TYPES.APR_MINIMIZER]: {
      title: 'Minimize Interest',
      description: 'Best for users carrying balances. Focuses on lowest APR cards to reduce interest charges.',
      icon: '📉',
      color: 'green'
    },
    [STRATEGY_TYPES.CASHFLOW_OPTIMIZER]: {
      title: 'Optimize Cash Flow',
      description: 'Best for strategic spenders. Focuses on maximizing time until payment is due.',
      icon: '📅',
      color: 'blue'
    }
  };

  return info[strategy] || info[STRATEGY_TYPES.REWARDS_MAXIMIZER];
};

/**
 * Feature flag utilities and status information
 * For monitoring and debugging enhanced classification
 */

/**
 * Check if enhanced recommendation engine is enabled
 * @returns {boolean} True if USE_ENHANCED_CLASSIFICATION is true
 */
export const isEnhancedClassificationEnabled = () => {
  return USE_ENHANCED_CLASSIFICATION;
};

/**
 * Get engine status information for monitoring/debugging
 * @returns {Object} Status information
 */
export const getEngineStatus = () => {
  const engine = enhancedEngine ? getEnhancedEngine() : null;
  return {
    enhancedEnabled: USE_ENHANCED_CLASSIFICATION,
    engineInitialized: enhancedEngine !== null,
    engineMetrics: engine ? engine.getMetrics() : null,
    debugMode: process.env.DEBUG_RECOMMENDATIONS === 'true'
  };
};

/**
 * Reset enhanced engine (useful for testing or cache clearing)
 * @private
 */
export const resetEnhancedEngine = () => {
  if (enhancedEngine) {
    enhancedEngine.clearCache();
    enhancedEngine.resetMetrics();
    logger.info('Enhanced engine reset');
  }
};
