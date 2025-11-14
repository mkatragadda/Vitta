/**
 * Category Definitions - Single Source of Truth for Merchant Categories
 *
 * Defines all 14 merchant categories with metadata including:
 * - Keywords for merchant name matching
 * - MCC (Merchant Category Code) codes
 * - Aliases for card reward structure matching
 * - Subcategories for detailed classification
 * - Parent category for fallback matching
 *
 * PURPOSE: Enable intelligent merchant classification and reward matching across all recommendation strategies
 *
 * BACKWARD COMPATIBILITY: Supports both old (simple number) and new (complex object) reward_structure formats
 */

/**
 * All 14 Merchant Categories with Complete Metadata
 *
 * Each category object contains:
 * - id: Unique identifier for category (lowercase, no spaces)
 * - name: Display name for users
 * - icon: Emoji for visual representation
 * - description: What this category covers
 * - keywords: Array of keywords to match merchant names
 * - mcc_codes: Array of Merchant Category Codes for this category
 * - reward_aliases: Alternative names used in card reward structures
 * - subcategories: More specific category breakdowns
 * - parent_category: Parent category for fallback matching (if applicable)
 */
const MERCHANT_CATEGORIES = {
  // Category 1: DINING & RESTAURANTS
  dining: {
    id: 'dining',
    name: 'Dining & Restaurants',
    icon: '🍽️',
    description: 'Restaurants, cafes, delivery services, and food establishments',
    keywords: [
      'restaurant', 'cafe', 'coffee', 'bar', 'grill', 'diner', 'bistro', 'pizzeria',
      'doordash', 'grubhub', 'ubereats', 'deliveroo', 'postmates',
      'chipotle', 'mcdonalds', 'burger king', 'taco bell', 'wendy\'s',
      'starbucks', 'dunkin', 'panera', 'chick-fil-a', 'popeyes',
      'olive garden', 'cheesecake factory', 'applebee\'s', 'chili\'s',
      'outback steakhouse', 'texas roadhouse', 'ruth\'s chris',
      'dining', 'food', 'eat', 'meal', 'lunch', 'dinner', 'breakfast',
      'takeout', 'delivery', 'food delivery'
    ],
    mcc_codes: [5812, 5813, 5814], // Eating places and drinking establishments
    reward_aliases: ['dining', 'restaurants', 'food', 'eating', 'cafe', 'coffee'],
    subcategories: [
      'fine_dining', 'casual_dining', 'fast_casual', 'fast_food', 'cafe', 'coffee', 'delivery'
    ],
    parent_category: null
  },

  // Category 2: GROCERIES & SUPERMARKETS
  groceries: {
    id: 'groceries',
    name: 'Groceries & Supermarkets',
    icon: '🛒',
    description: 'Grocery stores, supermarkets, farmers markets, and food retailers',
    keywords: [
      'grocery', 'groceries', 'supermarket', 'market', 'whole foods', 'trader joe\'s',
      'safeway', 'kroger', 'albertsons', 'ralphs', 'sprouts', 'harris teeter',
      'publix', 'wegmans', 'aldi', 'lidl', 'instacart', 'amazon fresh',
      'grocery delivery', 'food market', 'farmers market', 'butcher', 'produce'
    ],
    mcc_codes: [5411, 5412], // Grocery stores, supermarkets
    reward_aliases: ['groceries', 'grocery', 'supermarket', 'food', 'market', 'fresh'],
    subcategories: [
      'supermarket', 'natural_organic', 'warehouse_grocery', 'farmers_market', 'specialty_food'
    ],
    parent_category: null
  },

  // Category 3: GAS & FUEL
  gas: {
    id: 'gas',
    name: 'Gas & Fuel',
    icon: '⛽',
    description: 'Gas stations, fuel pumps, EV charging, and fuel retailers',
    keywords: [
      'gas', 'fuel', 'gas station', 'petrol', 'chevron', 'shell', 'exxon', 'mobil',
      'bp', 'speedway', 'pilot', 'loves', 'citgo', 'sinclair',
      'ev charging', 'electric vehicle charging', 'tesla supercharger', 'electrify america',
      'chargepoint', 'evgo', 'charging station', 'fuel pump'
    ],
    mcc_codes: [5542, 5541], // Gas stations, automotive fuel dispensers
    reward_aliases: ['gas', 'fuel', 'energy', 'petrol'],
    subcategories: [
      'gas_station', 'ev_charging', 'alternative_fuel'
    ],
    parent_category: null
  },

  // Category 4: TRAVEL
  travel: {
    id: 'travel',
    name: 'Travel',
    icon: '✈️',
    description: 'Airlines, hotels, car rentals, travel agencies, and transportation',
    keywords: [
      'airline', 'flight', 'airfare', 'hotel', 'motel', 'resort', 'hostel',
      'airbnb', 'vrbo', 'booking.com', 'expedia', 'kayak', 'travelocity',
      'car rental', 'hertz', 'avis', 'enterprise', 'budget', 'national',
      'amtrak', 'train', 'cruise', 'delta', 'united', 'american airlines',
      'southwest', 'jetblue', 'spirit', 'frontier', 'alaska air',
      'hyatt', 'marriott', 'hilton', 'wyndham', 'ihg', 'accor',
      'travel agency', 'tour', 'vacation'
    ],
    mcc_codes: [4511, 4512, 4722, 7011, 7012], // Airfare, auto rental, hotel/lodging
    reward_aliases: ['travel', 'airline', 'hotel', 'flight', 'airfare', 'car rental'],
    subcategories: [
      'airfare', 'hotel', 'car_rental', 'cruises', 'tours', 'luggage'
    ],
    parent_category: null
  },

  // Category 5: ENTERTAINMENT
  entertainment: {
    id: 'entertainment',
    name: 'Entertainment',
    icon: '🎬',
    description: 'Movies, theaters, live events, concerts, and entertainment venues',
    keywords: [
      'movie', 'cinema', 'theater', 'theatre', 'amc', 'regal', 'cinemark',
      'concert', 'music', 'festival', 'event', 'ticket', 'ticketmaster',
      'live nation', 'eventbrite', 'vivid seats', 'stubhub', 'tickpick',
      'comedy', 'stand-up', 'broadway', 'play', 'performance',
      'amusement park', 'theme park', 'disneyland', 'disney world',
      'sports', 'game', 'sports ticket', 'sporting event',
      'entertainment', 'show', 'performance venue'
    ],
    mcc_codes: [7832, 7922, 7929], // Cinema, theaters, amusement parks
    reward_aliases: ['entertainment', 'movies', 'theater', 'events', 'sports'],
    subcategories: [
      'movies', 'live_music', 'theater', 'comedy', 'sports', 'amusement_parks', 'events'
    ],
    parent_category: null
  },

  // Category 6: STREAMING & SUBSCRIPTIONS
  streaming: {
    id: 'streaming',
    name: 'Streaming & Subscriptions',
    icon: '🎥',
    description: 'Digital streaming services, subscriptions, and online media platforms',
    keywords: [
      'netflix', 'hulu', 'disney+', 'disney plus', 'disneyplus',
      'apple tv', 'appletv', 'amazon prime', 'prime video', 'hbo max', 'hbomax',
      'paramount+', 'peacock', 'apple music', 'spotify', 'youtube music',
      'youtube premium', 'youtube tv', 'audible', 'scribd', 'skillshare',
      'subscription', 'streaming', 'digital service', 'online subscription',
      'music streaming', 'video streaming', 'podcast', 'app subscription'
    ],
    mcc_codes: [4899], // Business services not elsewhere classified (includes digital subscriptions)
    reward_aliases: ['streaming', 'subscriptions', 'digital', 'media', 'entertainment subscriptions'],
    subcategories: [
      'video_streaming', 'music_streaming', 'podcast', 'digital_subscriptions', 'app_subscriptions'
    ],
    parent_category: 'entertainment'
  },

  // Category 7: DRUGSTORES & PHARMACY
  drugstores: {
    id: 'drugstores',
    name: 'Drugstores & Pharmacy',
    icon: '💊',
    description: 'Drugstores, pharmacies, and health/beauty retailers',
    keywords: [
      'cvs', 'walgreens', 'rite aid', 'duane reade', 'pharmacy', 'drugstore',
      'health', 'beauty', 'makeup', 'skincare', 'wellness',
      'supplements', 'vitamins', 'medicine', 'pharmaceutical',
      'health and beauty', 'personal care', 'nutrition'
    ],
    mcc_codes: [5912], // Drug stores and pharmacies
    reward_aliases: ['drugstores', 'pharmacy', 'health', 'beauty', 'wellness'],
    subcategories: [
      'pharmacy', 'health_products', 'beauty', 'wellness', 'personal_care'
    ],
    parent_category: null
  },

  // Category 8: HOME IMPROVEMENT
  home_improvement: {
    id: 'home_improvement',
    name: 'Home Improvement',
    icon: '🏠',
    description: 'Hardware stores, home improvement retailers, and building materials',
    keywords: [
      'home depot', 'lowes', 'home improvement', 'hardware', 'hardware store',
      'lowe\'s', 'home depot', 'ace hardware', 'menards', 'lumber yard',
      'paint', 'flooring', 'tiles', 'tools', 'building materials',
      'construction', 'diy', 'renovation', 'repair'
    ],
    mcc_codes: [5211], // Lumber and building materials stores
    reward_aliases: ['home_improvement', 'home improvement', 'hardware', 'diy'],
    subcategories: [
      'hardware', 'paint', 'tools', 'flooring', 'lumber', 'building_materials'
    ],
    parent_category: null
  },

  // Category 9: DEPARTMENT STORES
  department_stores: {
    id: 'department_stores',
    name: 'Department Stores',
    icon: '🏬',
    description: 'Department stores, clothing retailers, and general merchandise',
    keywords: [
      'amazon', 'amazon.com', 'target', 'macy\'s', 'macys', 'nordstrom',
      'kohl\'s', 'kohls', 'jcpenney', 'sears', 'walmart', 'costco',
      'department store', 'clothing', 'apparel', 'fashion', 'retail',
      'general merchandise', 'shopping', 'store'
    ],
    mcc_codes: [5311], // Department stores
    reward_aliases: ['department_stores', 'shopping', 'retail', 'stores', 'general merchandise'],
    subcategories: [
      'online_shopping', 'clothing', 'general_retail', 'department_stores', 'fast_fashion'
    ],
    parent_category: null
  },

  // Category 10: TRANSIT & RIDESHARE
  transit: {
    id: 'transit',
    name: 'Transit & Rideshare',
    icon: '🚌',
    description: 'Public transportation, rideshare services, and commuting',
    keywords: [
      'uber', 'lyft', 'metro', 'transit', 'bus', 'subway', 'train',
      'mta', 'bart', 'caltrain', 'amtrak', 'greyhound',
      'taxi', 'cab', 'tram', 'light rail', 'commute',
      'public transportation', 'commute', 'rideshare', 'carpool'
    ],
    mcc_codes: [4111, 4112], // Passenger railways, buses
    reward_aliases: ['transit', 'rideshare', 'transportation', 'commute'],
    subcategories: [
      'public_transit', 'rideshare', 'taxi', 'train', 'bus', 'commute'
    ],
    parent_category: null
  },

  // Category 11: UTILITIES
  utilities: {
    id: 'utilities',
    name: 'Utilities',
    icon: '📡',
    description: 'Phone, internet, cable, electric, water, and utility bills',
    keywords: [
      'verizon', 'at&t', 'at and t', 'comcast', 'xfinity', 'spectrum',
      'phone', 'internet', 'cable', 'cell phone', 'mobile',
      'electric', 'electricity', 'water', 'gas', 'utility',
      'phone bill', 'internet bill', 'cable bill', 'telecom'
    ],
    mcc_codes: [4814], // Telecommunications services
    reward_aliases: ['utilities', 'phone', 'internet', 'cable', 'telecom'],
    subcategories: [
      'phone', 'internet', 'cable', 'electricity', 'water', 'gas', 'telecom'
    ],
    parent_category: null
  },

  // Category 12: WAREHOUSE CLUBS
  warehouse: {
    id: 'warehouse',
    name: 'Warehouse Clubs',
    icon: '📦',
    description: 'Warehouse membership clubs and bulk retailers',
    keywords: [
      'costco', 'sam\'s club', 'sams club', 'bj\'s', 'bjs', 'amazon prime',
      'warehouse', 'warehouse club', 'membership club', 'bulk',
      'wholesale', 'club store', 'bulk buying'
    ],
    mcc_codes: [5411], // Can overlap with groceries, but warehouse-specific
    reward_aliases: ['warehouse', 'warehouse clubs', 'costco', 'wholesale'],
    subcategories: [
      'warehouse_clubs', 'bulk_shopping', 'membership_clubs'
    ],
    parent_category: null
  },

  // Category 13: OFFICE SUPPLIES
  office_supplies: {
    id: 'office_supplies',
    name: 'Office Supplies',
    icon: '🖊️',
    description: 'Office supply stores and business supplies retailers',
    keywords: [
      'staples', 'office depot', 'office max', 'officemax',
      'office supplies', 'office supply', 'business supplies',
      'printing', 'printer', 'paper', 'desk supplies', 'stationery'
    ],
    mcc_codes: [5200], // Home supply warehouse stores
    reward_aliases: ['office_supplies', 'office supplies', 'business supplies', 'supplies'],
    subcategories: [
      'office_supplies', 'printing', 'business_equipment', 'stationery'
    ],
    parent_category: null
  },

  // Category 14: INSURANCE
  insurance: {
    id: 'insurance',
    name: 'Insurance',
    icon: '🛡️',
    description: 'Insurance premiums and services (auto, home, health, life)',
    keywords: [
      'insurance', 'policy', 'premium', 'claim', 'underwriting',
      'auto insurance', 'car insurance', 'home insurance', 'health insurance',
      'life insurance', 'disability', 'umbrella', 'geico', 'state farm',
      'progressive', 'allstate', 'liberty mutual', 'aarp', 'insurance company'
    ],
    mcc_codes: [6211], // Securities brokers, dealers
    reward_aliases: ['insurance', 'protection', 'coverage'],
    subcategories: [
      'auto_insurance', 'home_insurance', 'health_insurance', 'life_insurance', 'other_insurance'
    ],
    parent_category: null
  }
};

/**
 * Helper Functions for Category Operations
 */

/**
 * Get category by ID
 * @param {string} categoryId - The category ID (e.g., 'dining', 'groceries')
 * @returns {object|null} The category object or null if not found
 */
export function getCategoryById(categoryId) {
  return MERCHANT_CATEGORIES[categoryId] || null;
}

/**
 * Get all categories
 * @returns {object} Object with all categories keyed by ID
 */
export function getAllCategories() {
  return MERCHANT_CATEGORIES;
}

/**
 * Get category list (array of category objects)
 * @returns {array} Array of all category objects
 */
export function getCategoryList() {
  return Object.values(MERCHANT_CATEGORIES);
}

/**
 * Find category by keyword
 * Searches through keywords in all categories for a match
 *
 * @param {string} keyword - The keyword to search for
 * @returns {object|null} The matching category object or null
 */
export function findCategoryByKeyword(keyword) {
  if (!keyword) return null;

  const lowerKeyword = keyword.toLowerCase().trim();

  // Search through all categories
  for (const [categoryId, category] of Object.entries(MERCHANT_CATEGORIES)) {
    if (category.keywords.some(kw => kw.toLowerCase() === lowerKeyword)) {
      return category;
    }
  }

  return null;
}

/**
 * Find category by MCC code
 * @param {string|number} mccCode - The MCC code to search for
 * @returns {object|null} The matching category object or null
 */
export function findCategoryByMCCCode(mccCode) {
  if (!mccCode) return null;

  const codeStr = String(mccCode);

  for (const [categoryId, category] of Object.entries(MERCHANT_CATEGORIES)) {
    if (category.mcc_codes.some(code => String(code) === codeStr)) {
      return category;
    }
  }

  return null;
}

/**
 * Find matching category based on reward structure alias
 * Used when matching card rewards to detected merchant category
 *
 * @param {string} rewardAlias - The alias name from card reward structure
 * @returns {object|null} The matching category object or null
 */
export function findCategoryByRewardAlias(rewardAlias) {
  if (!rewardAlias) return null;

  const lowerAlias = rewardAlias.toLowerCase().trim();

  for (const [categoryId, category] of Object.entries(MERCHANT_CATEGORIES)) {
    if (category.reward_aliases.some(alias => alias.toLowerCase() === lowerAlias)) {
      return category;
    }
  }

  return null;
}

/**
 * Get category by any name variant
 * Searches by ID, keyword, MCC code, and reward alias
 *
 * @param {string|number} query - The search query
 * @returns {object|null} The matching category object or null
 */
export function findCategory(query) {
  if (!query) return null;

  const queryStr = String(query).toLowerCase().trim();

  // 1. Try exact ID match
  if (MERCHANT_CATEGORIES[queryStr]) {
    return MERCHANT_CATEGORIES[queryStr];
  }

  // 2. Try keyword match
  const keywordMatch = findCategoryByKeyword(queryStr);
  if (keywordMatch) return keywordMatch;

  // 3. Try reward alias match
  const aliasMatch = findCategoryByRewardAlias(queryStr);
  if (aliasMatch) return aliasMatch;

  // 4. Try MCC code match (if numeric)
  if (!isNaN(queryStr)) {
    const mccMatch = findCategoryByMCCCode(queryStr);
    if (mccMatch) return mccMatch;
  }

  return null;
}

/**
 * Get category name with icon
 * @param {string} categoryId - The category ID
 * @returns {string} The category name with icon (e.g., "🍽️ Dining & Restaurants")
 */
export function getCategoryDisplayName(categoryId) {
  const category = getCategoryById(categoryId);
  if (!category) return 'Unknown Category';
  return `${category.icon} ${category.name}`;
}

/**
 * Check if two categories are compatible (for parent/child relationships)
 * @param {string} categoryId1 - First category ID
 * @param {string} categoryId2 - Second category ID
 * @returns {boolean} True if categories are compatible
 */
export function areCategoriesCompatible(categoryId1, categoryId2) {
  const cat1 = getCategoryById(categoryId1);
  const cat2 = getCategoryById(categoryId2);

  if (!cat1 || !cat2) return false;

  // Same category
  if (categoryId1 === categoryId2) return true;

  // One is parent of the other
  if (cat1.parent_category === categoryId2) return true;
  if (cat2.parent_category === categoryId1) return true;

  return false;
}

/**
 * Export the base category definitions object for backward compatibility
 */
export { MERCHANT_CATEGORIES };

/**
 * Export default as all functions and data
 */
export default {
  MERCHANT_CATEGORIES,
  getCategoryById,
  getAllCategories,
  getCategoryList,
  findCategoryByKeyword,
  findCategoryByMCCCode,
  findCategoryByRewardAlias,
  findCategory,
  getCategoryDisplayName,
  areCategoriesCompatible
};
