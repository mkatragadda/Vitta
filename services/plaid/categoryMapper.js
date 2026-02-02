/**
 * Category Mapper
 *
 * Maps Plaid's `personal_finance_category` to Vitta's standardized categories.
 * This enables consistent categorization across all transaction sources.
 *
 * Plaid Categories Reference:
 * - personal_finance_category format: "CATEGORY > SUBCATEGORY"
 * - Example: "Food and Drink > Groceries"
 *
 * Vitta Categories (14 total):
 * groceries, dining, gas, transit, travel, entertainment, streaming,
 * drugstores, home_improvement, department_stores, utilities, insurance, default
 */

/**
 * Mapping of Plaid categories to Vitta categories
 * Priority: More specific matches first
 */
const CATEGORY_MAP = {
  // Food and Drink
  'Food and Drink > Groceries': 'groceries',
  'Food and Drink > Restaurants': 'dining',
  'Food and Drink > Coffee Shops': 'dining',
  'Food and Drink > Fast Food': 'dining',
  'Food and Drink > Bars': 'dining',
  'Food and Drink > Bakeries': 'dining',
  'Food and Drink': 'dining', // Fallback for unmapped food

  // Transportation
  'Transportation > Gas Stations': 'gas',
  'Transportation > Public Transit': 'transit',
  'Transportation > Taxis and Rideshare': 'transit',
  'Transportation > Parking': 'transit',
  'Transportation > Car Rental': 'transit',
  'Transportation > Tolls': 'transit',
  'Transportation > Auto Insurance': 'insurance',
  'Transportation': 'transit', // Fallback

  // Travel
  'Travel > Flights': 'travel',
  'Travel > Hotels': 'travel',
  'Travel > Rental Cars': 'travel',
  'Travel > Travel Agencies': 'travel',
  'Travel > Lodging': 'travel',
  'Travel': 'travel', // Fallback

  // Entertainment
  'Entertainment > Movies and DVDs': 'entertainment',
  'Entertainment > Music': 'entertainment',
  'Entertainment > Amusement Parks': 'entertainment',
  'Entertainment > Sporting Events': 'entertainment',
  'Entertainment > Concerts': 'entertainment',
  'Entertainment > Gaming': 'entertainment',
  'Entertainment': 'entertainment', // Fallback

  // Streaming Services
  'Streaming > Streaming Services': 'streaming',
  'Streaming': 'streaming', // Fallback

  // Shops
  'Shops > Department Stores': 'department_stores',
  'Shops > Home Improvement': 'home_improvement',
  'Shops > Drugstores': 'drugstores',
  'Shops > Supermarkets': 'groceries',
  'Shops': 'department_stores', // Fallback for unmapped shops

  // Health Care
  'Health Care > Drugstores': 'drugstores',
  'Health Care > Medical Services': 'drugstores',
  'Health Care': 'drugstores', // Fallback

  // Bills and Utilities
  'Bills and Utilities > Utilities': 'utilities',
  'Bills and Utilities > Phone Service': 'utilities',
  'Bills and Utilities > Internet Service': 'utilities',
  'Bills and Utilities': 'utilities', // Fallback

  // Auto
  'Auto > Insurance': 'insurance',
  'Auto > Gas Stations': 'gas',
  'Auto > Repairs': 'utilities',
  'Auto': 'gas', // Fallback

  // Home
  'Home > Home Improvement': 'home_improvement',
  'Home > Furniture': 'home_improvement',
  'Home': 'home_improvement', // Fallback

  // Personal
  'Personal > Personal Services': 'default',
  'Personal': 'default', // Fallback

  // Taxes
  'Taxes': 'utilities',

  // Education
  'Education': 'default',

  // Fees and Adjustments
  'Fees and Adjustments': 'utilities',

  // Financial
  'Financial > Bank Fees': 'utilities',
  'Financial': 'utilities', // Fallback
};

/**
 * Map a Plaid personal_finance_category to a Vitta category
 *
 * @param {string|null} plaidCategory - Plaid category string (e.g. "Food and Drink > Groceries")
 * @returns {string} Vitta category name
 *
 * @example
 * mapCategory("Food and Drink > Groceries") // returns "groceries"
 * mapCategory("Travel > Flights") // returns "travel"
 * mapCategory("Unknown > Something") // returns "default"
 * mapCategory(null) // returns "default"
 */
function mapCategory(plaidCategory) {
  if (!plaidCategory || typeof plaidCategory !== 'string') {
    return 'default';
  }

  // Exact match
  if (CATEGORY_MAP[plaidCategory]) {
    return CATEGORY_MAP[plaidCategory];
  }

  // Try parent category (e.g., "Food and Drink" from "Food and Drink > Groceries")
  const parentCategory = plaidCategory.split('>')[0]?.trim();
  if (parentCategory && CATEGORY_MAP[parentCategory]) {
    return CATEGORY_MAP[parentCategory];
  }

  // Fallback
  return 'default';
}

/**
 * Get the mapping table (for testing/debugging)
 * @returns {Object} The category mapping
 */
function getCategoryMap() {
  return { ...CATEGORY_MAP };
}

module.exports = {
  mapCategory,
  getCategoryMap,
};
