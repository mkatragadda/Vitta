/**
 * Card Migration Helper - Phase 2
 *
 * Handles migration of cards from the old MVP reward structure (3-7 categories)
 * to the new Phase 2 reward structure (14 categories).
 *
 * PURPOSE:
 * - Provide seamless upgrade path for existing cards
 * - Map old category names to new 14-category system
 * - Preserve user-specific card configurations
 * - Enable intelligent category matching
 * - Support both automatic and manual migration paths
 *
 * BACKWARD COMPATIBILITY:
 * - Old MVP cards remain functional unchanged
 * - New cards automatically benefit from 14-category system
 * - Mixed portfolios work together seamlessly
 * - No loss of data during migration
 */

import { MERCHANT_CATEGORIES } from '../categories/categoryDefinitions.js';

/**
 * Category migration mappings from old MVP categories to new Phase 2 categories
 *
 * Maps old category names to new ones, preserving reward multipliers
 */
const CATEGORY_MIGRATION_MAP = {
  // Old 3-category system → New 14-category system
  groceries: {
    newCategory: 'groceries',
    aliases: ['grocery', 'supermarket', 'supermarkets', 'food', 'grocery_stores']
  },
  dining: {
    newCategory: 'dining',
    aliases: ['restaurants', 'restaurant', 'eating', 'food_dining', 'cafe', 'coffee']
  },
  gas: {
    newCategory: 'gas',
    aliases: ['fuel', 'petrol', 'energy']
  },
  travel: {
    newCategory: 'travel',
    aliases: ['flights', 'hotels', 'transportation', 'airlines', 'transit']
  },

  // Old 5-category system additions
  online: {
    newCategory: 'department_stores', // Map online shopping to department stores
    aliases: ['ecommerce', 'shopping', 'retail']
  },

  // Old 7-category system additions
  entertainment: {
    newCategory: 'entertainment',
    aliases: ['movies', 'shows', 'events']
  },
  categories: {
    newCategory: 'default',
    aliases: ['rotating', 'other']
  }
};

/**
 * Migration Strategy: Intelligent Default Expansion
 *
 * When expanding old cards to 14 categories, use this strategy to assign
 * reasonable multipliers to new categories based on the card's specialization.
 */
const MIGRATION_STRATEGY = {
  // Card specialized in dining/restaurants
  dining_specialist: {
    dining: 4,
    entertainment: 2,
    streaming: 1,
    drugstores: 1,
    home_improvement: 1,
    department_stores: 1,
    transit: 1,
    utilities: 1,
    warehouse: 1,
    office_supplies: 1,
    insurance: 1,
    groceries: 1,
    gas: 1,
    travel: 1,
    default: 1
  },

  // Card specialized in groceries
  grocery_specialist: {
    groceries: 5,
    drugstores: 2,
    warehouse: 1.5,
    dining: 1,
    entertainment: 1,
    streaming: 1,
    home_improvement: 1,
    department_stores: 1,
    transit: 1,
    utilities: 1,
    office_supplies: 1,
    insurance: 1,
    gas: 1,
    travel: 1,
    default: 1
  },

  // Card specialized in gas/fuel
  gas_specialist: {
    gas: 5,
    transit: 2,
    utilities: 1,
    dining: 1,
    entertainment: 1,
    streaming: 1,
    drugstores: 1,
    home_improvement: 1,
    department_stores: 1,
    warehouse: 1,
    office_supplies: 1,
    insurance: 1,
    groceries: 1,
    travel: 1,
    default: 1
  },

  // Card specialized in travel
  travel_specialist: {
    travel: 5,
    dining: 3,
    entertainment: 2,
    transit: 2,
    streaming: 1,
    drugstores: 1,
    home_improvement: 1,
    department_stores: 1,
    utilities: 1,
    warehouse: 1,
    office_supplies: 1,
    insurance: 1,
    groceries: 1,
    gas: 1,
    default: 1
  },

  // Generic cashback card
  cashback_general: {
    dining: 1.5,
    groceries: 1.5,
    gas: 1.5,
    travel: 1,
    entertainment: 1,
    streaming: 1,
    drugstores: 1,
    home_improvement: 1,
    department_stores: 1,
    transit: 1,
    utilities: 1,
    warehouse: 1,
    office_supplies: 1,
    insurance: 1,
    default: 1.5
  },

  // Premium rewards card
  premium_rewards: {
    dining: 4,
    travel: 3,
    entertainment: 2,
    department_stores: 2,
    transit: 1,
    streaming: 1,
    drugstores: 1,
    home_improvement: 1,
    utilities: 1,
    warehouse: 1,
    office_supplies: 1,
    insurance: 1,
    groceries: 1,
    gas: 1,
    default: 1
  },

  // Low APR / balance transfer card (minimal rewards)
  low_apr_card: {
    dining: 1,
    groceries: 1,
    gas: 1,
    travel: 1,
    entertainment: 1,
    streaming: 1,
    drugstores: 1,
    home_improvement: 1,
    department_stores: 1,
    transit: 1,
    utilities: 1,
    warehouse: 1,
    office_supplies: 1,
    insurance: 1,
    default: 1
  }
};

/**
 * Check if a card needs migration
 *
 * A card needs migration if:
 * 1. It only has old category names (dining, groceries, gas, travel, online, etc.)
 * 2. It has fewer than 7 categories in reward_structure
 * 3. It's missing entries for the new 14 categories
 *
 * @param {Object} card - Card object to check
 * @returns {boolean} True if card needs migration
 */
export function needsMigration(card) {
  if (!card || !card.reward_structure || typeof card.reward_structure !== 'object') {
    return false;
  }

  const categories = Object.keys(card.reward_structure);

  // Check if card has new Phase 2 categories
  const hasNewCategories = categories.some(cat => {
    return ['entertainment', 'streaming', 'drugstores', 'home_improvement',
            'department_stores', 'transit', 'utilities', 'warehouse',
            'office_supplies', 'insurance'].includes(cat);
  });

  // If it already has new categories, no migration needed
  if (hasNewCategories) {
    return false;
  }

  // If it's an old MVP card (3-7 categories), it needs migration
  return categories.length < 10; // Arbitrary threshold - old cards have fewer categories
}

/**
 * Migrate a single card from MVP to Phase 2 structure
 *
 * Intelligently expands the reward_structure to include all 14 categories
 * while preserving the original multipliers and inferring reasonable defaults.
 *
 * @param {Object} card - Card object to migrate
 * @returns {Object} Migrated card object
 */
export function migrateCard(card) {
  if (!card || !card.reward_structure) {
    return card;
  }

  // If card doesn't need migration, return as-is
  if (!needsMigration(card)) {
    return card;
  }

  const oldRewards = card.reward_structure;
  const newRewards = { ...oldRewards };

  // Determine card specialization based on highest multipliers
  const sortedCategories = Object.entries(oldRewards)
    .filter(([key]) => key !== 'default')
    .sort(([, a], [, b]) => b - a);

  // Map old categories to new ones
  for (const [oldCategory, multiplier] of sortedCategories) {
    const mapping = CATEGORY_MIGRATION_MAP[oldCategory];
    if (mapping) {
      newRewards[mapping.newCategory] = multiplier;
      delete newRewards[oldCategory];
    }
  }

  // Determine specialization for intelligent expansion
  let specialization = 'cashback_general';
  if (sortedCategories.length > 0) {
    const [topCategory] = sortedCategories[0];
    const mapping = CATEGORY_MIGRATION_MAP[topCategory];
    if (mapping) {
      const newTopCategory = mapping.newCategory;
      if (newTopCategory === 'dining') specialization = 'dining_specialist';
      else if (newTopCategory === 'groceries') specialization = 'grocery_specialist';
      else if (newTopCategory === 'gas') specialization = 'gas_specialist';
      else if (newTopCategory === 'travel') specialization = 'travel_specialist';
    }
  }

  // Fill in missing categories with strategy defaults
  const strategyDefaults = MIGRATION_STRATEGY[specialization];
  for (const [category] of Object.entries(MERCHANT_CATEGORIES)) {
    if (!newRewards.hasOwnProperty(category)) {
      newRewards[category] = strategyDefaults[category] || 1;
    }
  }

  // Preserve original default if it exists, otherwise use strategy default
  if (!newRewards.default) {
    newRewards.default = oldRewards.default || strategyDefaults.default || 1;
  }

  return {
    ...card,
    reward_structure: newRewards,
    _migration_metadata: {
      migrated_at: new Date().toISOString(),
      previous_structure: oldRewards,
      specialization,
      version: 'Phase2-v1'
    }
  };
}

/**
 * Migrate multiple cards at once
 *
 * @param {Array<Object>} cards - Array of card objects
 * @returns {Array<Object>} Array of migrated cards
 */
export function migrateCards(cards) {
  if (!Array.isArray(cards)) {
    console.warn('[CardMigration] Input is not an array, returning as-is');
    return cards;
  }

  return cards.map(card => migrateCard(card));
}

/**
 * Get migration report for a card portfolio
 *
 * Analyzes all cards and reports on migration status
 *
 * @param {Array<Object>} cards - Array of card objects
 * @returns {Object} Migration report
 */
export function getMigrationReport(cards) {
  if (!Array.isArray(cards)) {
    return {
      total_cards: 0,
      cards_needing_migration: 0,
      cards_already_migrated: 0,
      migration_rate: 0,
      details: []
    };
  }

  let cards_needing_migration = 0;
  let cards_already_migrated = 0;

  const details = cards.map(card => {
    const needsMig = needsMigration(card);
    if (needsMig) {
      cards_needing_migration++;
    } else {
      cards_already_migrated++;
    }

    return {
      card_id: card.id,
      card_name: card.card_name || card.nickname,
      needs_migration: needsMig,
      category_count: card.reward_structure ? Object.keys(card.reward_structure).length : 0,
      categories: card.reward_structure ? Object.keys(card.reward_structure) : []
    };
  });

  const migration_rate = cards.length > 0
    ? (cards_already_migrated / cards.length * 100).toFixed(1)
    : 0;

  return {
    total_cards: cards.length,
    cards_needing_migration,
    cards_already_migrated,
    migration_rate,
    details
  };
}

/**
 * Validate a migrated card structure
 *
 * Ensures the card has all required Phase 2 categories and valid multipliers
 *
 * @param {Object} card - Migrated card object
 * @returns {Object} Validation result
 */
export function validateMigratedCard(card) {
  const result = {
    isValid: true,
    errors: [],
    warnings: [],
    card_name: card.card_name || card.nickname || 'Unknown'
  };

  if (!card.reward_structure) {
    result.isValid = false;
    result.errors.push('Missing reward_structure');
    return result;
  }

  // Check for all required Phase 2 categories
  const requiredCategories = Object.keys(MERCHANT_CATEGORIES);
  const cardCategories = Object.keys(card.reward_structure);

  const missingCategories = requiredCategories.filter(cat => !cardCategories.includes(cat));
  if (missingCategories.length > 0) {
    result.warnings.push(`Missing categories: ${missingCategories.join(', ')}`);
  }

  // Validate multipliers
  for (const [category, multiplier] of Object.entries(card.reward_structure)) {
    if (typeof multiplier !== 'number' || multiplier < 0) {
      result.isValid = false;
      result.errors.push(`Invalid multiplier for ${category}: ${multiplier}`);
    }
    if (multiplier > 10) {
      result.warnings.push(`High multiplier for ${category}: ${multiplier}x (may be unusual)`);
    }
  }

  // Check for default category
  if (!card.reward_structure.default) {
    result.warnings.push('Missing default multiplier');
  }

  return result;
}

/**
 * Get a human-readable migration summary
 *
 * @param {Array<Object>} cards - Array of card objects
 * @returns {string} Formatted migration summary
 */
export function getMigrationSummary(cards) {
  const report = getMigrationReport(cards);

  const lines = [
    '═══════════════════════════════════════',
    'Card Migration Report - Phase 2',
    '═══════════════════════════════════════',
    `Total cards: ${report.total_cards}`,
    `Already migrated: ${report.cards_already_migrated} (${report.migration_rate}%)`,
    `Need migration: ${report.cards_needing_migration}`,
    ''
  ];

  for (const card of report.details) {
    const status = card.needs_migration ? '⚠️ NEEDS MIGRATION' : '✅ MIGRATED';
    lines.push(`  ${status} - ${card.card_name}`);
    lines.push(`     Categories: ${card.categories.join(', ')}`);
  }

  lines.push('═══════════════════════════════════════');

  return lines.join('\n');
}

// Export constants as named exports for tests and other modules
export {
  CATEGORY_MIGRATION_MAP,
  MIGRATION_STRATEGY
};

export default {
  needsMigration,
  migrateCard,
  migrateCards,
  getMigrationReport,
  validateMigratedCard,
  getMigrationSummary,
  CATEGORY_MIGRATION_MAP,
  MIGRATION_STRATEGY
};
