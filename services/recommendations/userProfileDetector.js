/**
 * User Profile Detector - ML-Based Behavior Analysis
 * 
 * Detects user payment behavior to provide personalized recommendations:
 * - REWARDS_MAXIMIZER: Pays balances in full, optimize for cashback/points
 * - APR_MINIMIZER: Carries balances, optimize for low interest rates
 * - BALANCED: Mixed behavior
 */

/**
 * Detect user profile based on card usage patterns
 * @param {Array} cards - User's credit cards
 * @returns {Object} User profile with priority order
 */
export function detectUserProfile(cards) {
  console.log('\n[UserProfile] ============ DETECTING USER PROFILE ============');
  console.log('[UserProfile] Total cards:', cards?.length || 0);
  
  if (!cards || cards.length === 0) {
    console.log('[UserProfile] No cards found\n');
    return {
      profile: 'UNKNOWN',
      priority: ['rewards', 'apr', 'grace_period'],
      description: 'Add cards to get personalized recommendations',
      confidence: 0
    };
  }

  // Calculate behavioral metrics
  const metrics = calculateBehaviorMetrics(cards);

  console.log('[UserProfile] Cards with balance:', metrics.cardsWithBalance);
  console.log('[UserProfile] Cards without balance:', metrics.cardsWithoutBalance);
  console.log('[UserProfile] Total debt: $' + metrics.totalDebt.toLocaleString());
  console.log('[UserProfile] Avg utilization:', metrics.avgUtilization.toFixed(1) + '%');
  console.log('[UserProfile] High utilization cards (>50%):', metrics.highUtilizationCards);

  let result;

  // Classification logic
  if (metrics.cardsWithBalance === 0) {
    // No balances = pays in full consistently
    console.log('[UserProfile] ✅ Profile: REWARDS_MAXIMIZER (Confidence: 1.0)');
    console.log('[UserProfile] Reason: No balances - pays in full consistently');
    result = {
      profile: 'REWARDS_MAXIMIZER',
      priority: ['rewards', 'grace_period', 'apr'],
      description: 'You pay balances in full - maximize rewards!',
      confidence: 1.0,
      metrics
    };
  }
  else if (metrics.avgUtilization < 10 && metrics.cardsWithBalance <= 1) {
    // Low utilization, maybe one card with small balance
    console.log('[UserProfile] ✅ Profile: REWARDS_MAXIMIZER (Confidence: 0.85)');
    console.log('[UserProfile] Reason: Low utilization (<10%) with ≤1 card having balance');
    result = {
      profile: 'REWARDS_MAXIMIZER',
      priority: ['rewards', 'grace_period', 'apr'],
      description: 'You typically pay balances in full',
      confidence: 0.85,
      metrics
    };
  }
  else if (metrics.highUtilizationCards > 0 || metrics.avgUtilization > 30) {
    // High utilization = carries balances regularly
    console.log('[UserProfile] ⚠️ Profile: APR_MINIMIZER (Confidence: 0.9)');
    console.log('[UserProfile] Reason: High utilization (>30%) or high-util cards present');
    result = {
      profile: 'APR_MINIMIZER',
      priority: ['apr', 'rewards', 'grace_period'],
      description: 'You carry balances - minimizing interest saves money',
      confidence: 0.9,
      metrics
    };
  }
  else if (metrics.avgUtilization > 10) {
    // Moderate utilization = sometimes carries balance
    console.log('[UserProfile] 📊 Profile: BALANCED (Confidence: 0.7)');
    console.log('[UserProfile] Reason: Moderate utilization (10-30%)');
    result = {
      profile: 'BALANCED',
      priority: ['rewards', 'apr', 'grace_period'],
      description: 'You occasionally carry balances',
      confidence: 0.7,
      metrics
    };
  }
  else {
    // Default fallback
    console.log('[UserProfile] 📊 Profile: BALANCED (Confidence: 0.5) - Default');
    result = {
      profile: 'BALANCED',
      priority: ['rewards', 'apr', 'grace_period'],
      description: 'Mixed payment behavior',
      confidence: 0.5,
      metrics
    };
  }

  console.log('[UserProfile] Strategy priority order:', result.priority.join(' > '));
  console.log('[UserProfile] =================================================\n');

  return result;
}

/**
 * Calculate behavior metrics from card data
 * @param {Array} cards - User's credit cards
 * @returns {Object} Behavioral metrics
 */
function calculateBehaviorMetrics(cards) {
  const cardsWithBalance = cards.filter(c => (c.current_balance || 0) > 0);
  const totalCards = cards.length;

  // Calculate average utilization
  let totalUtilization = 0;
  let validCards = 0;

  cards.forEach(card => {
    const balance = Number(card.current_balance) || 0;
    const limit = Number(card.credit_limit) || 0;
    
    if (limit > 0) {
      const util = (balance / limit) * 100;
      totalUtilization += util;
      validCards++;
    }
  });

  const avgUtilization = validCards > 0 ? totalUtilization / validCards : 0;

  // Count high utilization cards (>50%)
  const highUtilizationCards = cards.filter(c => {
    const balance = Number(c.current_balance) || 0;
    const limit = Number(c.credit_limit) || 0;
    return limit > 0 && (balance / limit) > 0.5;
  }).length;

  // Calculate total debt
  const totalDebt = cards.reduce((sum, c) => sum + (Number(c.current_balance) || 0), 0);

  return {
    totalCards,
    cardsWithBalance: cardsWithBalance.length,
    cardsWithoutBalance: totalCards - cardsWithBalance.length,
    avgUtilization: Math.round(avgUtilization * 10) / 10,
    highUtilizationCards,
    totalDebt,
    balanceRatio: totalCards > 0 ? (cardsWithBalance.length / totalCards) : 0
  };
}

/**
 * Get profile-specific advice
 * @param {string} profile - User profile type
 * @param {Object} metrics - Behavior metrics
 * @returns {string} Personalized advice
 */
export function getProfileAdvice(profile, metrics) {
  switch (profile) {
    case 'REWARDS_MAXIMIZER':
      return `💡 **Your Strategy**: Keep paying balances in full to maximize rewards without interest charges. You're doing great!`;
    
    case 'APR_MINIMIZER':
      return `💡 **Your Strategy**: Focus on cards with lowest APR to minimize interest costs. Consider balance transfer cards or pay down high-APR cards first (avalanche method).`;
    
    case 'BALANCED':
      return `💡 **Your Strategy**: Try to pay balances in full when possible to unlock grace periods and earn rewards without interest.`;
    
    default:
      return `💡 **Tip**: Understanding your spending habits helps us give better recommendations!`;
  }
}

/**
 * Get emoji for profile
 * @param {string} profile - Profile type
 * @returns {string} Emoji
 */
export function getProfileEmoji(profile) {
  switch (profile) {
    case 'REWARDS_MAXIMIZER':
      return '🎯';
    case 'APR_MINIMIZER':
      return '💳';
    case 'BALANCED':
      return '⚖️';
    default:
      return '📊';
  }
}

