/**
 * User Behavior Analyzer
 * Analyzes user payment patterns to determine optimal recommendation strategy
 */

import { supabase, isSupabaseConfigured } from '../../config/supabase';
import { getUserCards } from '../cardService';
import { createLogger } from '../../utils/logger';

const logger = createLogger('BehaviorAnalyzer');

// Strategy types
export const STRATEGY_TYPES = {
  REWARDS_MAXIMIZER: 'REWARDS_MAXIMIZER',
  APR_MINIMIZER: 'APR_MINIMIZER',
  CASHFLOW_OPTIMIZER: 'CASHFLOW_OPTIMIZER'
};

/**
 * Analyze user behavior and determine profile
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User behavior profile
 */
export const analyzeUserBehavior = async (userId) => {
  if (!isSupabaseConfigured()) {
    logger.info('Supabase not configured - returning default profile');
    return getDefaultProfile(userId);
  }

  try {
    // Get user's cards
    const cards = await getUserCards(userId);

    if (!cards || cards.length === 0) {
      logger.info('No cards found for user, using default profile', { userId });
      return getDefaultProfile(userId);
    }

    // Get payment history if available
    const paymentHistory = await getPaymentHistory(userId);

    // Calculate payment statistics
    const paymentStats = calculatePaymentStats(cards, paymentHistory);

    // Determine profile type based on stats
    const profileType = determineProfileType(paymentStats, cards);

    // Calculate confidence score
    const confidenceScore = calculateConfidence(paymentStats, paymentHistory);

    const profile = {
      userId,
      profileType,
      confidenceScore,
      paymentStats,
      lastCalculated: new Date().toISOString()
    };

    // Save to database
    await saveUserProfile(profile);

    logger.info('Profile analyzed', { profileType, confidenceScore, userId });
    return profile;

  } catch (error) {
    logger.error('Error analyzing behavior', error);
    return getDefaultProfile(userId);
  }
};

/**
 * Get payment history for user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Payment history records
 */
const getPaymentHistory = async (userId) => {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('user_payment_history')
      .select('*')
      .eq('user_id', userId)
      .order('payment_date', { ascending: false })
      .limit(50); // Last 50 payments

    if (error) {
      logger.error('Error fetching payment history', error);
      return [];
    }

    return data || [];

  } catch (error) {
    logger.error('Error in getPaymentHistory', error);
    return [];
  }
};

/**
 * Calculate payment statistics from cards and history
 * @param {Array} cards - User's credit cards
 * @param {Array} paymentHistory - Payment history
 * @returns {Object} Payment statistics
 */
const calculatePaymentStats = (cards, paymentHistory) => {
  const stats = {
    totalCards: cards.length,
    totalPayments: paymentHistory.length,
    paysInFullRate: 0,
    carriesBalanceRate: 0,
    avgUtilization: 0,
    avgDaysBeforeDue: 0,
    hasHighAPRCards: false,
    avgAPR: 0
  };

  // Calculate from payment history if available
  if (paymentHistory.length > 0) {
    const fullPayments = paymentHistory.filter(p => p.was_full_payment).length;
    stats.paysInFullRate = fullPayments / paymentHistory.length;
    stats.carriesBalanceRate = 1 - stats.paysInFullRate;

    const daysBeforeDue = paymentHistory
      .filter(p => p.days_before_due !== null)
      .map(p => p.days_before_due);

    if (daysBeforeDue.length > 0) {
      stats.avgDaysBeforeDue = daysBeforeDue.reduce((a, b) => a + b, 0) / daysBeforeDue.length;
    }
  }

  // Calculate current utilization and APR stats
  const cardsWithBalance = cards.filter(c => c.current_balance > 0);
  stats.carriesBalanceRate = cardsWithBalance.length / cards.length;

  const totalBalance = cards.reduce((sum, card) => sum + card.current_balance, 0);
  const totalLimit = cards.reduce((sum, card) => sum + card.credit_limit, 0);
  stats.avgUtilization = totalLimit > 0 ? (totalBalance / totalLimit) * 100 : 0;

  const totalAPR = cards.reduce((sum, card) => sum + (card.apr || 0), 0);
  stats.avgAPR = cards.length > 0 ? totalAPR / cards.length : 0;
  stats.hasHighAPRCards = cards.some(card => card.apr > 20);

  return stats;
};

/**
 * Determine profile type based on payment statistics
 * @param {Object} stats - Payment statistics
 * @param {Array} cards - User's cards
 * @returns {string} Profile type
 */
const determineProfileType = (stats, cards) => {
  // CRITICAL: Check if user is carrying balances
  // If carrying balance, grace period is lost and cash flow optimization doesn't work
  const carryingBalance = stats.carriesBalanceRate > 0.3;

  // Priority 1: If carrying significant balance and high APR, focus on APR
  // This is the most important factor - minimize interest costs
  if (stats.carriesBalanceRate > 0.5 && (stats.avgAPR > 18 || stats.hasHighAPRCards)) {
    logger.debug('Profile: APR_MINIMIZER (high balance + high APR)', { carriesBalanceRate: stats.carriesBalanceRate, avgAPR: stats.avgAPR });
    return STRATEGY_TYPES.APR_MINIMIZER;
  }

  // Priority 2: If carrying ANY balance on high APR cards, prioritize APR
  // Even 30% carrying rate with high APR means significant interest costs
  if (carryingBalance && stats.hasHighAPRCards) {
    logger.debug('Profile: APR_MINIMIZER (carrying balance + high APR)', { carryingBalance, hasHighAPRCards: stats.hasHighAPRCards });
    return STRATEGY_TYPES.APR_MINIMIZER;
  }

  // Priority 3: If paying in full most of the time, can focus on rewards
  // Cash flow optimization also works since grace period is available
  if (stats.paysInFullRate > 0.75 || stats.avgUtilization < 30) {
    logger.debug('Profile: REWARDS_MAXIMIZER (pays in full)', { paysInFullRate: stats.paysInFullRate, avgUtilization: stats.avgUtilization });
    return STRATEGY_TYPES.REWARDS_MAXIMIZER;
  }

  // Priority 4: If moderate balance but low APR, could optimize cashflow
  // BUT: Carrying balance means no grace period, so skip cashflow strategy
  if (stats.carriesBalanceRate > 0.3 && stats.avgDaysBeforeDue < 7 && !carryingBalance) {
    logger.debug('Profile: CASHFLOW_OPTIMIZER (strategic timing, no balance)', { avgDaysBeforeDue: stats.avgDaysBeforeDue });
    return STRATEGY_TYPES.CASHFLOW_OPTIMIZER;
  }

  // If carrying balance but low APR, rewards is better than cashflow
  // (no grace period makes cashflow useless)
  if (carryingBalance) {
    logger.debug('Profile: REWARDS_MAXIMIZER (default for balance carriers)', { carryingBalance });
    return STRATEGY_TYPES.REWARDS_MAXIMIZER;
  }

  // Default: Rewards maximizer (most common use case)
  logger.debug('Profile: REWARDS_MAXIMIZER (default)');
  return STRATEGY_TYPES.REWARDS_MAXIMIZER;
};

/**
 * Calculate confidence score (0-1)
 * @param {Object} stats - Payment statistics
 * @param {Array} paymentHistory - Payment history
 * @returns {number} Confidence score
 */
const calculateConfidence = (stats, paymentHistory) => {
  let confidence = 0.5; // Start at 50%

  // More payment history = higher confidence
  if (paymentHistory.length >= 12) {
    confidence += 0.3;
  } else if (paymentHistory.length >= 6) {
    confidence += 0.2;
  } else if (paymentHistory.length >= 3) {
    confidence += 0.1;
  }

  // More cards = more data points
  if (stats.totalCards >= 3) {
    confidence += 0.1;
  }

  // Clear patterns increase confidence
  if (stats.paysInFullRate > 0.9 || stats.paysInFullRate < 0.1) {
    confidence += 0.1; // Very consistent behavior
  }

  return Math.min(confidence, 1.0);
};

/**
 * Get default profile for new users
 * @param {string} userId - User ID
 * @returns {Object} Default profile
 */
const getDefaultProfile = (userId) => {
  return {
    userId,
    profileType: STRATEGY_TYPES.REWARDS_MAXIMIZER,
    confidenceScore: 0.5,
    paymentStats: {
      totalCards: 0,
      totalPayments: 0,
      paysInFullRate: 0,
      carriesBalanceRate: 0,
      avgUtilization: 0,
      avgDaysBeforeDue: 0,
      hasHighAPRCards: false,
      avgAPR: 0
    },
    lastCalculated: new Date().toISOString()
  };
};

/**
 * Save user profile to database
 * @param {Object} profile - User profile
 * @returns {Promise<Object>} Saved profile
 */
const saveUserProfile = async (profile) => {
  if (!isSupabaseConfigured()) {
    return profile;
  }

  try {
    const { data, error } = await supabase
      .from('user_behavior_profile')
      .upsert({
        user_id: profile.userId,
        profile_type: profile.profileType,
        confidence_score: profile.confidenceScore,
        payment_stats: profile.paymentStats,
        last_calculated: profile.lastCalculated
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) {
      logger.error('Error saving profile', error);
      return profile;
    }

    logger.debug('Profile saved for user', { userId: profile.userId, profileType: profile.profileType });
    return data;

  } catch (error) {
    logger.error('Error in saveUserProfile', error);
    return profile;
  }
};

/**
 * Get user behavior profile from database
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} User profile or null
 */
export const getUserProfile = async (userId) => {
  if (!isSupabaseConfigured()) {
    return getDefaultProfile(userId);
  }

  try {
    const { data, error } = await supabase
      .from('user_behavior_profile')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No profile found, analyze and create one
        logger.info('No profile found, analyzing...', { userId });
        return await analyzeUserBehavior(userId);
      }
      logger.error('Error fetching profile', error);
      return getDefaultProfile(userId);
    }

    // Check if profile is stale (older than 7 days)
    const lastCalculated = new Date(data.last_calculated);
    const daysSinceCalculation = (Date.now() - lastCalculated) / (1000 * 60 * 60 * 24);

    if (daysSinceCalculation > 7) {
      logger.info('Profile is stale, re-analyzing...', { userId, daysSinceCalculation: daysSinceCalculation.toFixed(1) });
      return await analyzeUserBehavior(userId);
    }

    return {
      userId: data.user_id,
      profileType: data.profile_type,
      confidenceScore: data.confidence_score,
      paymentStats: data.payment_stats,
      lastCalculated: data.last_calculated
    };

  } catch (error) {
    logger.error('Error in getUserProfile', error);
    return getDefaultProfile(userId);
  }
};

/**
 * Record a payment in history
 * @param {Object} paymentData - Payment information
 * @returns {Promise<Object>} Saved payment record
 */
export const recordPayment = async (paymentData) => {
  if (!isSupabaseConfigured()) {
    return paymentData;
  }

  try {
    const { data, error } = await supabase
      .from('user_payment_history')
      .insert([{
        user_id: paymentData.userId,
        card_id: paymentData.cardId,
        payment_date: paymentData.paymentDate,
        amount_paid: paymentData.amountPaid,
        balance_before: paymentData.balanceBefore,
        balance_after: paymentData.balanceAfter,
        was_full_payment: paymentData.balanceBefore === paymentData.amountPaid,
        days_before_due: paymentData.daysBeforeDue,
        due_date: paymentData.dueDate
      }])
      .select()
      .single();

    if (error) {
      logger.error('Error recording payment', error);
      throw error;
    }

    logger.info('Payment recorded', { userId: paymentData.userId, cardId: paymentData.cardId, amount: paymentData.amountPaid });

    // Trigger profile re-analysis after new payment
    setTimeout(() => {
      analyzeUserBehavior(paymentData.userId).catch(err => {
        logger.error('Failed to re-analyze behavior after payment', err);
      });
    }, 1000);

    return data;

  } catch (error) {
    logger.error('Error in recordPayment', error);
    throw error;
  }
};

/**
 * Get strategy explanation for user
 * @param {string} profileType - Profile type
 * @returns {string} Human-readable explanation
 */
export const getStrategyExplanation = (profileType) => {
  const explanations = {
    [STRATEGY_TYPES.REWARDS_MAXIMIZER]: 'You typically pay in full and have low utilization. Focus on maximizing rewards!',
    [STRATEGY_TYPES.APR_MINIMIZER]: 'You carry balances on high-APR cards. Focus on minimizing interest charges!',
    [STRATEGY_TYPES.CASHFLOW_OPTIMIZER]: 'You manage payments strategically. Focus on maximizing time until payment!'
  };

  return explanations[profileType] || 'Analyzing your payment patterns...';
};
