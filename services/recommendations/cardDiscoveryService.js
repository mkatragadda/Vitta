/**
 * Card Discovery Service
 * Recommends new cards from the catalog that users don't have yet
 */

import { getCardCatalog } from '../cardDatabase/cardCatalogService';
import { getUserCards } from '../cardService';
import { STRATEGY_TYPES } from '../userBehavior/behaviorAnalyzer';
import { createLogger } from '../../utils/logger';

const logger = createLogger('CardDiscovery');

/**
 * Suggest new cards from catalog based on user's strategy
 * @param {string} userId - User ID
 * @param {string} strategy - Optimization strategy
 * @param {Object} options - Additional options
 * @returns {Promise<Array>} Suggested cards
 */
export const suggestNewCards = async (userId, strategy = STRATEGY_TYPES.REWARDS_MAXIMIZER, options = {}) => {
  try {
    logger.debug('Finding new cards for strategy', { strategy, userId });

    // Get user's current cards
    const userCards = await getUserCards(userId);
    const userCardNames = userCards.map(c =>
      (c.card_name || c.card_type).toLowerCase()
    );

    // Get full catalog
    const catalog = await getCardCatalog(options);

    if (!catalog || catalog.length === 0) {
      logger.info('No cards in catalog');
      return [];
    }

    // Filter out cards user already has
    const availableCards = catalog.filter(card =>
      !userCardNames.includes(card.card_name.toLowerCase())
    );

    logger.debug('Available cards filtered', { availableCount: availableCards.length, userCardCount: userCards.length });

    // Score cards based on strategy
    const scoredCards = availableCards.map(card => ({
      ...card,
      discoveryScore: scoreNewCard(card, strategy, userCards)
    }));

    // Sort by score
    const sortedCards = scoredCards.sort((a, b) => b.discoveryScore - a.discoveryScore);

    // Add recommendation reason
    const cardsWithReasons = sortedCards.map(card => ({
      ...card,
      recommendationReason: generateDiscoveryReason(card, strategy)
    }));

    logger.debug('Card discovery completed', { topSuggestion: cardsWithReasons[0]?.card_name, totalSuggestions: cardsWithReasons.length });
    return cardsWithReasons;

  } catch (error) {
    logger.error('Error suggesting cards', error);
    return [];
  }
};

/**
 * Score a new card based on strategy
 * @param {Object} card - Card from catalog
 * @param {string} strategy - Optimization strategy
 * @param {Array} userCards - User's existing cards
 * @returns {number} Score
 */
const scoreNewCard = (card, strategy, userCards) => {
  let score = 0;

  switch (strategy) {
    case STRATEGY_TYPES.REWARDS_MAXIMIZER:
      score = scoreForRewardsDiscovery(card, userCards);
      break;
    case STRATEGY_TYPES.APR_MINIMIZER:
      score = scoreForAPRDiscovery(card, userCards);
      break;
    case STRATEGY_TYPES.CASHFLOW_OPTIMIZER:
      score = scoreForCashflowDiscovery(card, userCards);
      break;
    default:
      score = scoreForRewardsDiscovery(card, userCards);
  }

  // Penalty for high annual fee (unless it's offset by benefits)
  const annualFeePenalty = (card.annual_fee || 0) / 20;
  score -= annualFeePenalty;

  // Bonus for popular cards
  score += (card.popularity_score || 0) / 10;

  return Math.max(0, score);
};

/**
 * Score for rewards maximizer
 */
const scoreForRewardsDiscovery = (card, userCards) => {
  let score = 0;

  // High sign-up bonus
  if (card.sign_up_bonus) {
    const bonusValue = card.sign_up_bonus.value_estimate || 0;
    score += bonusValue / 10; // $600 bonus = 60 points
  }

  // Reward structure (high multipliers)
  const rewardStructure = card.reward_structure || {};
  const multipliers = Object.values(rewardStructure);
  const maxMultiplier = Math.max(...multipliers, 0);
  score += maxMultiplier * 20; // 4x = 80 points

  // Check if card fills a gap in user's portfolio
  const hasGapBonus = checkForPortfolioGap(card, userCards, 'rewards');
  if (hasGapBonus) {
    score += 40;
  }

  // Benefits value
  score += (card.benefits?.length || 0) * 5;

  return score;
};

/**
 * Score for APR minimizer
 */
const scoreForAPRDiscovery = (card, userCards) => {
  let score = 0;

  // Low APR is key
  const apr = card.apr_min || 20;
  score += (30 - apr) * 5; // Lower APR = higher score

  // 0% intro APR is huge
  if (apr === 0) {
    score += 150;
  }

  // Check if lower than user's current cards
  const userAvgAPR = userCards.length > 0
    ? userCards.reduce((sum, c) => sum + (c.apr || 0), 0) / userCards.length
    : 25;

  if (apr < userAvgAPR) {
    score += 50; // Better than what they have
  }

  // No annual fee bonus for APR minimizers
  if ((card.annual_fee || 0) === 0) {
    score += 30;
  }

  return score;
};

/**
 * Score for cashflow optimizer
 */
const scoreForCashflowDiscovery = (card, userCards) => {
  let score = 0;

  // Long grace period
  const gracePeriod = card.grace_period_days || 25;
  score += gracePeriod * 2; // 30 days = 60 points

  // 0% intro APR helps cashflow
  const apr = card.apr_min || 20;
  if (apr === 0) {
    score += 100;
  }

  // No annual fee
  if ((card.annual_fee || 0) === 0) {
    score += 40;
  }

  // Bonus for balance transfer cards
  if (card.benefits?.some(b => b.toLowerCase().includes('balance transfer'))) {
    score += 50;
  }

  return score;
};

/**
 * Check if card fills a gap in user's portfolio
 */
const checkForPortfolioGap = (newCard, userCards, gapType) => {
  if (!userCards || userCards.length === 0) {
    return true; // First card always fills a gap
  }

  if (gapType === 'rewards') {
    // Check for category coverage
    const newCategories = Object.keys(newCard.reward_structure || {});

    for (const category of newCategories) {
      const newMultiplier = newCard.reward_structure[category];

      // Check if any user card has this category with comparable multiplier
      const hasCategory = userCards.some(userCard => {
        const userMultiplier = userCard.reward_structure?.[category] || 0;
        return userMultiplier >= newMultiplier * 0.8; // Within 80%
      });

      if (!hasCategory && newMultiplier > 2) {
        return true; // Fills a gap with good multiplier
      }
    }
  }

  return false;
};

/**
 * Generate recommendation reason for discovered card
 */
const generateDiscoveryReason = (card, strategy) => {
  const reasons = [];

  switch (strategy) {
    case STRATEGY_TYPES.REWARDS_MAXIMIZER:
      if (card.sign_up_bonus?.value_estimate) {
        reasons.push(`$${card.sign_up_bonus.value_estimate} sign-up bonus`);
      }

      const rewardStructure = card.reward_structure || {};
      const maxMultiplier = Math.max(...Object.values(rewardStructure), 0);
      if (maxMultiplier > 1) {
        const category = Object.keys(rewardStructure).find(
          k => rewardStructure[k] === maxMultiplier
        );
        reasons.push(`${maxMultiplier}x on ${category || 'purchases'}`);
      }
      break;

    case STRATEGY_TYPES.APR_MINIMIZER:
      const apr = card.apr_min || card.apr_max || 20;
      if (apr === 0) {
        reasons.push(`0% intro APR`);
      } else {
        reasons.push(`Low APR starting at ${apr}%`);
      }
      break;

    case STRATEGY_TYPES.CASHFLOW_OPTIMIZER:
      const gracePeriod = card.grace_period_days || 25;
      reasons.push(`${gracePeriod}-day grace period`);
      if ((card.apr_min || 20) === 0) {
        reasons.push(`0% intro APR`);
      }
      break;
  }

  if ((card.annual_fee || 0) === 0) {
    reasons.push(`No annual fee`);
  }

  return reasons.join(' • ');
};

/**
 * Get suggested cards by specific category
 * @param {string} userId - User ID
 * @param {string} category - Category (travel, dining, cashback, etc.)
 * @returns {Promise<Array>} Suggested cards for category
 */
export const suggestCardsByCategory = async (userId, category) => {
  try {
    const userCards = await getUserCards(userId);
    const userCardNames = userCards.map(c =>
      (c.card_name || c.card_type).toLowerCase()
    );

    // Get cards in category
    const catalog = await getCardCatalog({ category });

    // Filter out owned cards
    const availableCards = catalog.filter(card =>
      !userCardNames.includes(card.card_name.toLowerCase())
    );

    // Score based on category performance
    const scoredCards = availableCards.map(card => {
      let score = 0;

      // Reward multiplier for category
      const multiplier = card.reward_structure?.[category] || card.reward_structure?.default || 1;
      score += multiplier * 50;

      // Sign-up bonus
      if (card.sign_up_bonus?.value_estimate) {
        score += card.sign_up_bonus.value_estimate / 10;
      }

      // Annual fee penalty
      score -= (card.annual_fee || 0) / 20;

      // Popularity
      score += (card.popularity_score || 0) / 10;

      return {
        ...card,
        categoryScore: score,
        recommendationReason: `Best for ${category} with ${multiplier}x rewards`
      };
    });

    return scoredCards.sort((a, b) => b.categoryScore - a.categoryScore);

  } catch (error) {
    logger.error('Error suggesting cards by category', error);
    return [];
  }
};

/**
 * Compare a catalog card with user's best card in same category
 * @param {Object} catalogCard - Card from catalog
 * @param {Array} userCards - User's cards
 * @param {string} category - Category to compare
 * @returns {Object} Comparison result
 */
export const compareWithUserCards = (catalogCard, userCards, category = 'default') => {
  if (!userCards || userCards.length === 0) {
    return {
      isBetter: true,
      comparison: 'You don\'t have any cards yet',
      improvement: 'First card!'
    };
  }

  // Find user's best card for category
  const userBestCard = userCards.reduce((best, card) => {
    const cardMultiplier = card.reward_structure?.[category] || card.reward_structure?.default || 1;
    const bestMultiplier = best.reward_structure?.[category] || best.reward_structure?.default || 1;
    return cardMultiplier > bestMultiplier ? card : best;
  }, userCards[0]);

  const catalogMultiplier = catalogCard.reward_structure?.[category] || catalogCard.reward_structure?.default || 1;
  const userMultiplier = userBestCard.reward_structure?.[category] || userBestCard.reward_structure?.default || 1;

  const isBetter = catalogMultiplier > userMultiplier;
  const difference = catalogMultiplier - userMultiplier;

  return {
    isBetter,
    comparison: `vs your ${userBestCard.card_name || userBestCard.card_type}`,
    improvement: isBetter
      ? `+${difference}x more rewards`
      : difference === 0
        ? 'Same rewards'
        : `${Math.abs(difference)}x fewer rewards`,
    catalogMultiplier,
    userMultiplier
  };
};
