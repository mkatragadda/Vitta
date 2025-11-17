/**
 * Category Matcher Service
 *
 * Matches detected merchant categories to card reward structures
 * Handles simple and complex reward formats
 *
 * PURPOSE: Given category "travel" and card, return multiplier (e.g., 3x)
 *
 * PERFORMANCE TARGET: <5ms per match
 */

/**
 * Category Matcher Class
 * Matches categories to card reward multipliers
 */
export class CategoryMatcher {
  /**
   * Constructor
   * @param {object} card - Credit card object
   * @param {object} card.reward_structure - Card's reward structure
   */
  constructor(card) {
    if (!card) {
      throw new Error('Card is required for CategoryMatcher');
    }

    this.card = card;
    this.rewards = card.reward_structure || {};
  }

  /**
   * Find reward multiplier for a category
   *
   * MVP CRITICAL: Given "travel" category, return 3 (for Chase Sapphire)
   *
   * Handles:
   * - Simple format: { dining: 4, travel: 3 }
   * - Complex format: { dining: { value: 4, note: "..." } }
   * - Rotating categories: { rotating: { value: 5, active_categories: [...] } }
   *
   * @param {string} category - Category ID (e.g., "travel", "dining")
   * @param {string} subcategory - Optional subcategory (e.g., "airfare")
   *
   * @returns {number} Reward multiplier (e.g., 3, 1.5, 4)
   */
  findRewardMultiplier(category, subcategory = null) {
    // Input validation
    if (!category || typeof category !== 'string') {
      return this.getDefaultMultiplier();
    }

    const lowerCategory = category.toLowerCase().trim();

    // Step 1: Try exact category match
    const exactMatch = this.extractMultiplier(this.rewards[lowerCategory]);
    if (exactMatch !== null) {
      return exactMatch;
    }

    // Step 2: Try subcategory match (if provided and available)
    if (subcategory) {
      const subcatKey = `${lowerCategory}_${subcategory}`;
      const subcatMatch = this.extractMultiplier(this.rewards[subcatKey]);
      if (subcatMatch !== null) {
        return subcatMatch;
      }
    }

    // Step 3: Try rotating categories
    const rotatingMultiplier = this.findInRotatingCategories(lowerCategory);
    if (rotatingMultiplier !== null) {
      return rotatingMultiplier;
    }

    // Step 4: Try parent category fallback
    // (e.g., "casual_dining" → "dining")
    const parentMultiplier = this.findParentCategoryMultiplier(lowerCategory);
    if (parentMultiplier !== null) {
      return parentMultiplier;
    }

    // Step 5: Fall back to default
    return this.getDefaultMultiplier();
  }

  /**
   * Extract multiplier value from reward entry
   *
   * Handles both formats:
   * - Simple: 4 (number)
   * - Complex: { value: 4, note: "...", subcategories: [...] } (object)
   *
   * @private
   * @param {*} rewardEntry - Value from reward_structure
   * @returns {number|null} Multiplier value or null
   */
  extractMultiplier(rewardEntry) {
    if (rewardEntry === undefined || rewardEntry === null) {
      return null;
    }

    // Simple format: direct number
    if (typeof rewardEntry === 'number') {
      return rewardEntry;
    }

    // Complex format: object with 'value' property
    if (typeof rewardEntry === 'object' && 'value' in rewardEntry) {
      const value = rewardEntry.value;
      if (typeof value === 'number') {
        return value;
      }
    }

    return null;
  }

  /**
   * Find multiplier in rotating categories
   *
   * Some cards offer 5x in rotating categories (e.g., 5x on Q1 entertainment)
   *
   * @private
   * @param {string} category - Category to check
   * @returns {number|null} Multiplier if in rotating, null otherwise
   */
  findInRotatingCategories(category) {
    const rotating = this.rewards.rotating;

    if (!rotating || typeof rotating !== 'object') {
      return null;
    }

    const { active_categories, value } = rotating;

    if (
      Array.isArray(active_categories) &&
      active_categories.includes(category) &&
      typeof value === 'number'
    ) {
      return value;
    }

    return null;
  }

  /**
   * Try to find parent category multiplier
   *
   * E.g., if looking for "casual_dining" and not found,
   * try "dining" (the parent category)
   *
   * @private
   * @param {string} category - Category to check
   * @returns {number|null} Parent category multiplier or null
   */
  findParentCategoryMultiplier(category) {
    // For MVP, we keep it simple - no parent category logic yet
    // This is prepared for future expansion
    return null;
  }

  /**
   * Get default multiplier (no special rewards)
   *
   * @private
   * @returns {number} Default multiplier (1 or specified in rewards.default)
   */
  getDefaultMultiplier() {
    const defaultEntry = this.rewards.default;

    if (defaultEntry === undefined || defaultEntry === null) {
      return 1; // Hardcoded default if not specified
    }

    // Try to extract if it's an object
    const defaultValue = this.extractMultiplier(defaultEntry);
    if (defaultValue !== null) {
      return defaultValue;
    }

    return 1;
  }

  /**
   * Get all categories with rewards for this card
   *
   * @returns {array} Array of category IDs that have rewards
   */
  getRewardCategories() {
    const categories = [];

    for (const key in this.rewards) {
      if (key !== 'default' && key !== 'rotating') {
        const value = this.extractMultiplier(this.rewards[key]);
        if (value !== null && value > 1) {
          categories.push({ category: key, multiplier: value });
        }
      }
    }

    return categories;
  }

  /**
   * Get card's best category (highest multiplier)
   *
   * @returns {object} Best category with multiplier
   */
  getBestCategory() {
    const categories = this.getRewardCategories();

    if (categories.length === 0) {
      return null;
    }

    return categories.reduce((best, current) =>
      current.multiplier > best.multiplier ? current : best
    );
  }

  /**
   * Check if card offers rewards for a category
   *
   * @param {string} category - Category to check
   * @param {number} minMultiplier - Minimum multiplier to consider "offering rewards"
   * @returns {boolean} True if card offers rewards for this category
   */
  hasRewardFor(category, minMultiplier = 2) {
    const multiplier = this.findRewardMultiplier(category);
    return multiplier >= minMultiplier;
  }

  /**
   * Get explanation for why this multiplier applies
   *
   * @param {string} category - Category
   * @returns {string} Human-readable explanation
   */
  getExplanation(category) {
    const multiplier = this.findRewardMultiplier(category);

    if (multiplier === 1) {
      return `No special rewards (${multiplier}x default)`;
    }

    return `Offers ${multiplier}x rewards on ${category}`;
  }
}

/**
 * Convenience function for MVP integration
 *
 * Given a card and category, return the multiplier
 *
 * MVP CRITICAL: Used in cardDataQueryHandler to get travel multiplier
 *
 * @param {object} card - Card object
 * @param {string} category - Category (e.g., "travel")
 * @returns {number} Reward multiplier
 */
export function findRewardMultiplier(card, category) {
  try {
    const matcher = new CategoryMatcher(card);
    return matcher.findRewardMultiplier(category);
  } catch (error) {
    console.error('[CategoryMatcher] Error finding multiplier:', error);
    return 1; // Safe fallback
  }
}

/**
 * Get explanation for card's rewards in a category
 *
 * @param {object} card - Card object
 * @param {string} category - Category
 * @returns {string} Explanation
 */
export function getRewardExplanation(card, category) {
  try {
    const matcher = new CategoryMatcher(card);
    return matcher.getExplanation(category);
  } catch (error) {
    console.error('[CategoryMatcher] Error getting explanation:', error);
    return 'Standard rewards apply';
  }
}

/**
 * Score cards by multiplier for a category
 * Used for ranking recommendations
 *
 * @param {array} cards - Array of card objects
 * @param {string} category - Category to score on
 * @returns {array} Cards sorted by multiplier (highest first)
 */
export function scoreCardsByCategory(cards, category) {
  if (!Array.isArray(cards)) {
    return [];
  }

  const scored = cards.map(card => {
    const multiplier = findRewardMultiplier(card, category);
    return {
      card,
      multiplier,
      explanation: getRewardExplanation(card, category)
    };
  });

  return scored.sort((a, b) => b.multiplier - a.multiplier);
}

/**
 * Export default for module usage
 */
export default {
  CategoryMatcher,
  findRewardMultiplier,
  getRewardExplanation,
  scoreCardsByCategory
};
