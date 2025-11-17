/**
 * Three Separate Recommendation Strategies
 * Each strategy scores cards independently and shows actual $$ impact
 */

import { calculateFloatTime } from '../../utils/statementCycleUtils.js';
import { getPaymentDueDateForFloat } from '../../utils/paymentCycleUtils.js';

/**
 * Strategy 1: Rewards Optimizer
 * Best for users who pay balances in full monthly
 * 
 * CRITICAL: Only recommends cards with NO balance (grace period available)
 * 
 * @param {Array} cards - User's cards
 * @param {string} category - Purchase category
 * @param {number} amount - Purchase amount
 * @returns {Array} Scored recommendations with cashback calculations
 */
export function scoreForRewards(cards, category, amount = 0) {
  console.log('[RewardsStrategy] ============ SCORING FOR REWARDS ============');
  console.log('[RewardsStrategy] Category:', category, '| Amount:', amount);
  
  if (!cards || cards.length === 0) {
    console.log('[RewardsStrategy] No cards to score');
    return [];
  }

  const recommendations = [];

  cards.forEach(card => {
    const cardName = card.nickname || card.card_name;
    const balance = Number(card.current_balance) || 0;

    console.log(`\n[RewardsStrategy] Card: ${cardName}`);
    console.log(`[RewardsStrategy]   Balance: $${balance.toLocaleString()}`);

    // CRITICAL: Only cards with $0 balance have grace period
    if (balance > 0) {
      console.log(`[RewardsStrategy]   ❌ REJECTED - Has balance (no grace period)`);
      console.log(`[RewardsStrategy]   Score: -1000 (penalty)`);
      
      recommendations.push({
        card,
        strategy: 'REWARDS',
        cashback: 0,
        annualValue: 0,
        score: -1000, // Penalty score
        hasGracePeriod: false,
        warning: `⚠️ Has $${balance.toLocaleString()} balance - no grace period`,
        explanation: 'Interest charges immediately on new purchases',
        canRecommend: false
      });
      return;
    }

    // Get reward multiplier for category
    const multiplier = getRewardMultiplier(card, category);
    const cashback = amount > 0 ? (amount * multiplier) / 100 : 0;
    const annualValue = cashback * 12; // If spending monthly

    console.log(`[RewardsStrategy]   📊 SCORING PARAMETERS:`);
    console.log(`[RewardsStrategy]      • Category Multiplier: ${multiplier.toFixed(1)}x (from reward_structure)`);
    console.log(`[RewardsStrategy]      • Purchase Amount: $${amount.toLocaleString()}`);
    console.log(`[RewardsStrategy]      • Formula: ($${amount} × ${multiplier.toFixed(1)}%) = $${cashback.toFixed(2)}`);
    console.log(`[RewardsStrategy]      • Annual Value: $${cashback.toFixed(2)} × 12 = $${annualValue.toFixed(2)}`);
    console.log(`[RewardsStrategy]   🎯 WEIGHTS:`);
    console.log(`[RewardsStrategy]      • Cashback (100%): ${cashback.toFixed(2)} points`);
    console.log(`[RewardsStrategy]   ✅ ELIGIBLE - Final Score: ${cashback.toFixed(2)}`);

    recommendations.push({
      card,
      strategy: 'REWARDS',
      multiplier,
      cashback,
      annualValue,
      score: cashback, // Higher cashback = higher score
      hasGracePeriod: true,
      explanation: amount > 0 
        ? `Earn $${cashback.toFixed(2)} cashback on $${amount.toLocaleString()} purchase`
        : `${multiplier}x rewards on ${category}`,
      canRecommend: true
    });
  });

  // Sort by score (highest cashback first)
  const sorted = recommendations.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;

    if (a.canRecommend !== b.canRecommend) {
      return (b.canRecommend ? 1 : 0) - (a.canRecommend ? 1 : 0);
    }

    const aAvailable = getAvailableCredit(a.card);
    const bAvailable = getAvailableCredit(b.card);
    if (bAvailable !== aAvailable) return bAvailable - aAvailable;

    const aUtil = getUtilization(a.card);
    const bUtil = getUtilization(b.card);
    if (aUtil !== bUtil) return aUtil - bUtil; // Lower utilization preferred

    const aGrace = getGracePeriodDays(a.card);
    const bGrace = getGracePeriodDays(b.card);
    if (bGrace !== aGrace) return bGrace - aGrace; // Longer grace period preferred

    const aApr = getCardAPR(a.card);
    const bApr = getCardAPR(b.card);
    if (aApr !== bApr) return aApr - bApr; // Lower APR preferred

    return compareAlphabetical(a.card, b.card);
  });
  
  console.log('\n[RewardsStrategy] FINAL RANKING:');
  sorted.forEach((rec, idx) => {
    const cardName = rec.card.nickname || rec.card.card_name;
    console.log(`[RewardsStrategy]   ${idx + 1}. ${cardName} - Score: ${rec.score.toFixed(2)} ${rec.canRecommend ? '✅' : '❌'}`);
  });
  console.log('[RewardsStrategy] ==========================================\n');
  
  return sorted;
}

/**
 * Strategy 2: APR Optimizer
 * Best for users who carry balances
 * Shows actual interest cost per month and per year
 * 
 * @param {Array} cards - User's cards
 * @param {number} amount - Balance amount to calculate interest on
 * @returns {Array} Scored recommendations with interest cost calculations
 */
export function scoreForAPR(cards, amount = 1000) {
  console.log('[APRStrategy] ============ SCORING FOR APR ============');
  console.log('[APRStrategy] Amount to calculate interest on: $' + amount);
  
  if (!cards || cards.length === 0) {
    console.log('[APRStrategy] No cards to score');
    return [];
  }

  const recommendations = [];

  cards.forEach(card => {
    const cardName = card.nickname || card.card_name;
    const apr = Number(card.apr) || 0;
    const monthlyRate = (apr / 12) / 100;
    const monthlyInterest = amount * monthlyRate;
    const annualInterest = amount * (apr / 100);

    console.log(`\n[APRStrategy] Card: ${cardName}`);
    console.log(`[APRStrategy]   📊 SCORING PARAMETERS:`);
    console.log(`[APRStrategy]      • Card APR: ${apr.toFixed(2)}%`);
    console.log(`[APRStrategy]      • Monthly Rate: ${apr.toFixed(2)}% ÷ 12 = ${(monthlyRate * 100).toFixed(4)}%`);
    console.log(`[APRStrategy]      • Balance Amount: $${amount.toLocaleString()}`);
    console.log(`[APRStrategy]      • Formula: $${amount} × ${(monthlyRate * 100).toFixed(4)}% = $${monthlyInterest.toFixed(2)}/month`);
    console.log(`[APRStrategy]      • Annual Interest: $${amount} × ${apr.toFixed(2)}% = $${annualInterest.toFixed(2)}/year`);
    console.log(`[APRStrategy]   🎯 WEIGHTS:`);
    console.log(`[APRStrategy]      • Monthly Interest (100%): -$${monthlyInterest.toFixed(2)} (negated)`);
    console.log(`[APRStrategy]      • Lower interest = Higher score`);
    console.log(`[APRStrategy]   ✅ Final Score: ${(-monthlyInterest).toFixed(2)}`);

    recommendations.push({
      card,
      strategy: 'LOW_APR',
      apr,
      monthlyInterest,
      annualInterest,
      score: -monthlyInterest, // Lower interest = higher score (negative so lower is better)
      explanation: amount > 0
        ? `If you carry $${amount.toLocaleString()} balance: $${monthlyInterest.toFixed(2)}/month interest`
        : `${apr.toFixed(2)}% APR`,
      canRecommend: true
    });
  });

  // Sort by score (lowest interest first)
  const sorted = recommendations.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;

    if (a.apr !== b.apr) return a.apr - b.apr; // Lower APR preferred

    const aAvailable = getAvailableCredit(a.card);
    const bAvailable = getAvailableCredit(b.card);
    if (bAvailable !== aAvailable) return bAvailable - aAvailable; // More headroom preferred

    const aUtil = getUtilization(a.card);
    const bUtil = getUtilization(b.card);
    if (aUtil !== bUtil) return aUtil - bUtil; // Lower utilization preferred

    const aGrace = getGracePeriodDays(a.card);
    const bGrace = getGracePeriodDays(b.card);
    if (bGrace !== aGrace) return bGrace - aGrace; // Longer grace period preferred

    const aRewards = getDefaultRewardMultiplier(a.card);
    const bRewards = getDefaultRewardMultiplier(b.card);
    if (bRewards !== aRewards) return bRewards - aRewards; // Higher rewards preferred

    return compareAlphabetical(a.card, b.card);
  });
  
  console.log('\n[APRStrategy] FINAL RANKING (lowest APR first):');
  sorted.forEach((rec, idx) => {
    const cardName = rec.card.nickname || rec.card.card_name;
    console.log(`[APRStrategy]   ${idx + 1}. ${cardName} - APR: ${rec.apr.toFixed(2)}% - Monthly Interest: $${rec.monthlyInterest.toFixed(2)}`);
  });
  console.log('[APRStrategy] ======================================\n');
  
  return sorted;
}

/**
 * Strategy 3: Grace Period Optimizer
 * Best for cash flow management
 * 
 * CRITICAL: Only cards with $0 balance have grace period
 * 
 * @param {Array} cards - User's cards
 * @param {Date} purchaseDate - When purchase will be made
 * @returns {Array} Scored recommendations with float time calculations
 */
export function scoreForGracePeriod(cards, purchaseDate = new Date()) {
  console.log('[GracePeriodStrategy] ============ SCORING FOR GRACE PERIOD ============');
  console.log('[GracePeriodStrategy] Purchase Date:', purchaseDate.toLocaleDateString());
  
  if (!cards || cards.length === 0) {
    console.log('[GracePeriodStrategy] No cards to score');
    return [];
  }

  const recommendations = [];

  cards.forEach(card => {
    const cardName = card.nickname || card.card_name;
    const balance = Number(card.current_balance) || 0;

    console.log(`\n[GracePeriodStrategy] Card: ${cardName}`);
    console.log(`[GracePeriodStrategy]   Balance: $${balance.toLocaleString()}`);

    // CRITICAL: Only cards with $0 balance have grace period
    if (balance > 0) {
      console.log(`[GracePeriodStrategy]   ❌ REJECTED - Has balance (no grace period)`);
      console.log(`[GracePeriodStrategy]   Score: -1000 (penalty)`);
      
      recommendations.push({
        card,
        strategy: 'GRACE_PERIOD',
        floatDays: 0,
        paymentDue: null,
        hasGracePeriod: false,
        score: -1000, // Penalty score
        warning: `⚠️ Has $${balance.toLocaleString()} balance - NO grace period`,
        explanation: 'Interest charges immediately - no float time available',
        canRecommend: false
      });
      return;
    }

    // Calculate float time (days until payment due)
    const floatDays = calculateFloatTime(card, purchaseDate);
    const paymentDue = getPaymentDueDateForFloat(card, purchaseDate);

    console.log(`[GracePeriodStrategy]   📊 SCORING PARAMETERS:`);
    console.log(`[GracePeriodStrategy]      • Statement Close Day: ${card.statement_close_day || 'N/A'}`);
    console.log(`[GracePeriodStrategy]      • Payment Due Day: ${card.payment_due_day || 'N/A'}`);
    console.log(`[GracePeriodStrategy]      • Grace Period Days: ${card.grace_period_days || 'N/A'}`);
    console.log(`[GracePeriodStrategy]      • Purchase Date: ${purchaseDate.toLocaleDateString()}`);
    console.log(`[GracePeriodStrategy]      • Payment Due Date: ${paymentDue ? paymentDue.toLocaleDateString() : 'N/A'}`);
    console.log(`[GracePeriodStrategy]      • Formula: Days from purchase to payment due`);
    console.log(`[GracePeriodStrategy]   🎯 WEIGHTS:`);
    console.log(`[GracePeriodStrategy]      • Float Days (100%): ${floatDays} days`);
    console.log(`[GracePeriodStrategy]      • More days = Higher score = Better cash flow`);
    console.log(`[GracePeriodStrategy]   ✅ ELIGIBLE - Final Score: ${floatDays}`);

    recommendations.push({
      card,
      strategy: 'GRACE_PERIOD',
      floatDays,
      paymentDue,
      hasGracePeriod: true,
      score: floatDays, // More days = higher score
      explanation: `${floatDays} days to pay - maximize cash float`,
      canRecommend: true
    });
  });

  // Sort by score (longest float first)
  const sorted = recommendations.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;

    if (a.canRecommend !== b.canRecommend) {
      return (b.canRecommend ? 1 : 0) - (a.canRecommend ? 1 : 0);
    }

    const aDue = a.paymentDue ? a.paymentDue.getTime() : 0;
    const bDue = b.paymentDue ? b.paymentDue.getTime() : 0;
    if (aDue !== bDue) return bDue - aDue; // Later due date preferred

    const aAvailable = getAvailableCredit(a.card);
    const bAvailable = getAvailableCredit(b.card);
    if (bAvailable !== aAvailable) return bAvailable - aAvailable;

    const aUtil = getUtilization(a.card);
    const bUtil = getUtilization(b.card);
    if (aUtil !== bUtil) return aUtil - bUtil;

    const aRewards = getDefaultRewardMultiplier(a.card);
    const bRewards = getDefaultRewardMultiplier(b.card);
    if (bRewards !== aRewards) return bRewards - aRewards; // Higher rewards preferred when float equal

    const aApr = getCardAPR(a.card);
    const bApr = getCardAPR(b.card);
    if (aApr !== bApr) return aApr - bApr; // Lower APR preferred

    return compareAlphabetical(a.card, b.card);
  });
  
  console.log('\n[GracePeriodStrategy] FINAL RANKING (longest float first):');
  sorted.forEach((rec, idx) => {
    const cardName = rec.card.nickname || rec.card.card_name;
    console.log(`[GracePeriodStrategy]   ${idx + 1}. ${cardName} - Float Days: ${rec.floatDays} ${rec.canRecommend ? '✅' : '❌'}`);
  });
  console.log('[GracePeriodStrategy] ================================================\n');
  
  return sorted;
}

/**
 * Get reward multiplier for a card and category
 * Supports all 14 merchant categories with fallback logic
 *
 * Categories:
 * 1. dining
 * 2. groceries
 * 3. gas
 * 4. travel
 * 5. entertainment
 * 6. streaming
 * 7. drugstores
 * 8. home_improvement
 * 9. department_stores
 * 10. transit
 * 11. utilities
 * 12. warehouse
 * 13. office_supplies
 * 14. insurance
 *
 * @param {Object} card - Credit card
 * @param {string} category - Purchase category (any of the 14 categories)
 * @returns {number} Reward multiplier (e.g., 1.5 for 1.5x, 4 for 4x)
 */
function getRewardMultiplier(card, category) {
  if (!card.reward_structure) return 1.0;

  const rewardStructure = card.reward_structure;
  // Normalize category: convert spaces to underscores for consistent matching
  // This handles "home improvement" -> "home_improvement"
  const categoryNormalized = (category || '').toLowerCase().trim().replace(/\s+/g, '_');
  const categoryLower = categoryNormalized;

  // Try exact match first (14-category system)
  if (rewardStructure[categoryLower]) {
    return Number(rewardStructure[categoryLower]) || 1.0;
  }

  // Try common aliases and subcategories
  const aliases = {
    // Dining aliases
    'dining': ['restaurants', 'restaurant', 'eating', 'food_dining', 'dining_out'],
    'restaurants': ['dining', 'restaurant', 'eating', 'food_dining', 'dining_out'],
    'restaurant': ['dining', 'restaurants', 'eating'],

    // Groceries aliases
    'groceries': ['grocery', 'supermarkets', 'supermarket', 'food', 'grocery_stores', 'food_grocery'],
    'grocery': ['groceries', 'supermarkets', 'supermarket', 'food'],
    'supermarket': ['groceries', 'grocery', 'supermarkets'],
    'supermarkets': ['groceries', 'grocery', 'supermarket'],

    // Gas aliases
    'gas': ['fuel', 'gasoline', 'petrol', 'gas_fuel', 'ev_charging'],
    'fuel': ['gas', 'gasoline', 'petrol'],
    'gasoline': ['gas', 'fuel', 'petrol'],

    // Travel aliases
    'travel': ['flights', 'hotels', 'airline', 'airlines', 'travel_airfare', 'travel_hotel', 'travel_lodging'],
    'flights': ['travel', 'airline', 'airlines'],
    'hotels': ['travel', 'lodging', 'accommodation'],
    'airline': ['travel', 'flights', 'airlines'],
    'airlines': ['travel', 'flights', 'airline'],

    // Entertainment aliases
    'entertainment': ['movies', 'theater', 'events', 'concert', 'entertainment_events'],
    'movies': ['entertainment', 'theater'],
    'theater': ['entertainment', 'movies'],

    // Streaming aliases
    'streaming': ['streaming_services', 'subscriptions', 'digital_entertainment'],
    'streaming_services': ['streaming', 'subscriptions'],

    // Drugstores aliases
    'drugstores': ['pharmacy', 'pharmacies', 'drug_store', 'health_pharmacy'],
    'pharmacy': ['drugstores', 'pharmacies'],
    'pharmacies': ['drugstores', 'pharmacy'],

    // Home Improvement aliases
    'home_improvement': ['home_improvement_retail', 'hardware', 'home_depot'],
    'hardware': ['home_improvement'],

    // Department Stores aliases
    'department_stores': ['department_store', 'retail_stores', 'shopping'],
    'department_store': ['department_stores'],

    // Transit aliases
    'transit': ['public_transit', 'taxi', 'uber', 'ride_share', 'transportation'],
    'taxi': ['transit', 'ride_share', 'uber'],
    'uber': ['transit', 'taxi', 'ride_share'],

    // Utilities aliases
    'utilities': ['electricity', 'water', 'gas_utilities', 'internet_utilities'],

    // Warehouse aliases
    'warehouse': ['warehouse_clubs', 'costco', 'sams_club'],
    'warehouse_clubs': ['warehouse'],
    'costco': ['warehouse'],
    'sams_club': ['warehouse'],

    // Office Supplies aliases
    'office_supplies': ['office_supply', 'office_depot', 'stationery'],
    'office_supply': ['office_supplies'],

    // Insurance aliases
    'insurance': ['insurance_services', 'auto_insurance', 'health_insurance'],

    // Legacy aliases (for backward compatibility)
    'grocery': ['groceries', 'supermarkets'],
    'groceries': ['grocery', 'supermarkets'],
    'online': ['ecommerce', 'internet', 'amazon', 'online_shopping'],
    'ecommerce': ['online', 'internet', 'amazon']
  };

  // Use normalized category for alias lookup
  const possibleKeys = aliases[categoryLower] || [categoryLower];
  for (const key of possibleKeys) {
    if (rewardStructure[key]) {
      return Number(rewardStructure[key]) || 1.0;
    }
  }
  
  // Also try with original category (with spaces) if different from normalized
  // This handles cases where reward structure might have spaces instead of underscores
  if (category && category.toLowerCase().trim() !== categoryLower) {
    const originalCategory = category.toLowerCase().trim();
    if (rewardStructure[originalCategory]) {
      return Number(rewardStructure[originalCategory]) || 1.0;
    }
  }

  // Try parent category (e.g., "dining_* " → "dining")
  const parentMatch = categoryLower.match(/^([a-z_]+?)_/);
  if (parentMatch) {
    const parentCategory = parentMatch[1];
    if (rewardStructure[parentCategory]) {
      return Number(rewardStructure[parentCategory]) || 1.0;
    }
  }

  // Return default/catch-all rate
  return Number(rewardStructure.default) || 1.0;
}

function getAvailableCredit(card) {
  const limit = Number(card.credit_limit) || 0;
  const balance = Number(card.current_balance) || 0;
  return Math.max(limit - balance, 0);
}

function getUtilization(card) {
  const limit = Number(card.credit_limit) || 0;
  const balance = Number(card.current_balance) || 0;
  if (limit <= 0) return Infinity;
  return (balance / limit) * 100;
}

function getGracePeriodDays(card) {
  return Number(card.grace_period_days) || 0;
}

function getCardAPR(card) {
  const apr = Number(card.apr);
  return Number.isFinite(apr) ? apr : Infinity;
}

function getDefaultRewardMultiplier(card) {
  return Number(getRewardMultiplier(card, 'default')) || 0;
}

function compareAlphabetical(aCard, bCard) {
  const nameA = (aCard.nickname || aCard.card_name || '').toLowerCase();
  const nameB = (bCard.nickname || bCard.card_name || '').toLowerCase();
  return nameA.localeCompare(nameB);
}

function formatNumber(value, decimals = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'N/A';
  }
  return Number(value).toFixed(decimals);
}

function formatInteger(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'N/A';
  }
  return Math.round(Number(value)).toString();
}

/**
 * Get all three strategies for a purchase
 * Returns separate scored lists for each strategy
 * 
 * @param {Array} cards - User's cards
 * @param {string} category - Purchase category
 * @param {number} amount - Purchase amount
 * @returns {Object} Three separate recommendation lists
 */
export function getAllStrategies(cards, category = 'general', amount = 0) {
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  🎯 RECOMMENDATION ENGINE - ALL STRATEGIES');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Input Parameters:');
  console.log('  • Cards Count:', cards?.length || 0);
  console.log('  • Category:', category);
  console.log('  • Amount: $' + amount.toLocaleString());
  console.log('');
  console.log('📊 SCORING METHODOLOGY:');
  console.log('');
  console.log('Strategy 1: REWARDS OPTIMIZER');
  console.log('  • Weightage: Cashback amount (100%)');
  console.log('  • Formula: Amount × Category Multiplier%');
  console.log('  • Filters: ONLY cards with $0 balance (grace period)');
  console.log('  • Ranking: Highest cashback first');
  console.log('');
  console.log('Strategy 2: APR MINIMIZER');
  console.log('  • Weightage: Monthly interest cost (100%)');
  console.log('  • Formula: Amount × (APR ÷ 12) ÷ 100');
  console.log('  • Filters: All cards included');
  console.log('  • Ranking: Lowest interest cost first');
  console.log('');
  console.log('Strategy 3: GRACE PERIOD OPTIMIZER');
  console.log('  • Weightage: Float days (100%)');
  console.log('  • Formula: Days from purchase to payment due');
  console.log('  • Filters: ONLY cards with $0 balance (grace period)');
  console.log('  • Ranking: Longest float time first');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  const results = {
    rewards: scoreForRewards(cards, category, amount),
    apr: scoreForAPR(cards, amount),
    gracePeriod: scoreForGracePeriod(cards, new Date())
  };
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  ✅ ALL STRATEGIES COMPLETE - FINAL SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('\n📊 SCORE COMPARISON ACROSS ALL CARDS:\n');
  
  // Create a comparison matrix
  cards.forEach((card, idx) => {
    const cardName = card.nickname || card.card_name;
    const rewardsRec = results.rewards.find(r => r.card.id === card.id);
    const aprRec = results.apr.find(r => r.card.id === card.id);
    const graceRec = results.gracePeriod.find(r => r.card.id === card.id);
    const rewardsScoreStr = formatNumber(rewardsRec?.score).padStart(8);
    const rewardsCashbackStr = formatNumber(rewardsRec?.cashback);
    const aprScoreStr = formatNumber(aprRec?.score).padStart(8);
    const aprMonthlyStr = formatNumber(aprRec?.monthlyInterest);
    const graceScoreStr = formatInteger(graceRec?.score).padStart(8);
    const graceFloatStr = formatInteger(graceRec?.floatDays);
    const rewardsFlag = rewardsRec?.canRecommend ? '✅' : '❌';
    const graceFlag = graceRec?.canRecommend ? '✅' : '❌';
 
    console.log(`${idx + 1}. ${cardName}:`);
    console.log(`   Rewards Score:      ${rewardsScoreStr} ${rewardsFlag} (Cashback: $${rewardsCashbackStr})`);
    console.log(`   APR Score:          ${aprScoreStr} ✅  (Interest: $${aprMonthlyStr}/mo)`);
    console.log(`   Grace Period Score: ${graceScoreStr} ${graceFlag} (Float: ${graceFloatStr} days)`);
    console.log('');
  });
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🏆 WINNERS:');
  console.log(`   Best Rewards:      ${results.rewards.find(r => r.canRecommend)?.card.nickname || results.rewards[0]?.card.nickname || 'None'}`);
  console.log(`   Best APR:          ${results.apr[0]?.card.nickname || 'None'}`);
  console.log(`   Best Grace Period: ${results.gracePeriod.find(r => r.canRecommend)?.card.nickname || 'None'}`);
  console.log('═══════════════════════════════════════════════════════════\n');
  
  return results;
}

/**
 * Get calculation summary for display
 * @param {Object} recommendations - All three strategy results
 * @returns {Object} Summary statistics
 */
export function getRecommendationSummary(recommendations) {
  const { rewards, apr, gracePeriod } = recommendations;

  return {
    bestRewardCard: rewards.find(r => r.canRecommend),
    bestAPRCard: apr[0], // Lowest APR is always first
    bestGracePeriodCard: gracePeriod.find(r => r.canRecommend),
    totalCardsWithBalance: rewards.filter(r => !r.hasGracePeriod).length,
    totalCardsWithGracePeriod: rewards.filter(r => r.hasGracePeriod).length
  };
}

// Export getRewardMultiplier for use in other services (e.g., cardAnalyzer)
export { getRewardMultiplier };

