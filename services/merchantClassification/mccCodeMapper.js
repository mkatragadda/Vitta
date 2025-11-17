/**
 * MCC Code Mapper Service
 *
 * Maps Merchant Category Codes (MCC) to our internal category system.
 * MCC codes are standard codes assigned by payment processors (Visa, Mastercard, etc.)
 * to classify merchant types.
 *
 * Reference: https://en.wikipedia.org/wiki/Merchant_category_code
 * MCC ranges: 0000-9999 (4-digit codes)
 *
 * PURPOSE: Provide fast, reliable merchant classification using official MCC codes
 * This is the MOST RELIABLE classification source (used first in pipeline)
 */

import {
  getCategoryById,
  findCategoryByMCCCode
} from '../categories/categoryDefinitions.js';

/**
 * MCC Code to Category Mapping
 *
 * Maps MCC codes to our 14 internal categories.
 * This is the single source of truth for MCC code classification.
 *
 * STRUCTURE:
 * - Key: MCC code (number)
 * - Value: Category ID (string)
 */
const MCC_TO_CATEGORY_MAP = {
  // DINING & RESTAURANTS (5812-5814)
  5812: 'dining', // Eating places and drinking establishments
  5813: 'dining',
  5814: 'dining',
  5542: 'gas', // But sometimes used for other services
  5811: 'dining', // Caterers

  // GROCERIES (5411-5412)
  // Note: 5411 can be both grocery and warehouse - will be disambiguated by merchant name
  5412: 'groceries', // Convenience stores

  // GAS STATIONS (5542-5541)
  5542: 'gas', // Automated fuel dispensers
  5541: 'gas', // Gas stations

  // TRAVEL (4511-4722, 7011-7012)
  // Airlines
  4511: 'travel', // Airlines (scheduled air transportation)
  4512: 'travel', // Airlines (non-scheduled charter air transportation)

  // Car Rental
  4722: 'travel', // Automobile rental agency

  // Hotels/Lodging
  7011: 'travel', // Lodging, hotels, motels, resorts
  7012: 'travel', // Timeshare properties

  // Travel Agencies & Tour Operators
  4722: 'travel', // Car rental agencies
  7333: 'travel', // Tour operators
  4721: 'travel', // Taxicabs and limousines

  // ENTERTAINMENT (7832, 7922, 7929)
  7832: 'entertainment', // Motion picture theaters
  7922: 'entertainment', // Theatrical ticket agencies
  7929: 'entertainment', // Entertainment/amusement
  5945: 'entertainment', // Toy and hobby shops
  7911: 'entertainment', // Dance halls, studios, schools
  7996: 'entertainment', // Amusement parks, carnivals, circuses
  7998: 'entertainment', // Aquariums
  7999: 'entertainment', // Recreation services not elsewhere classified
  7994: 'entertainment', // Video tape rental stores
  7921: 'entertainment', // Dance halls and studios
  7832: 'entertainment', // Movie theaters

  // STREAMING & SUBSCRIPTIONS (4899 - Digital services)
  4899: 'streaming', // Business services not elsewhere classified (includes digital subscriptions)
  4900: 'streaming', // Cyberscafes

  // DRUGSTORES & PHARMACY (5912)
  5912: 'drugstores', // Drug stores and pharmacies
  5411: 'drugstores', // Sometimes used for pharmacies

  // HOME IMPROVEMENT (5211)
  5211: 'home_improvement', // Lumber and building materials stores
  5231: 'home_improvement', // Glass, paint, and wallpaper stores
  5251: 'home_improvement', // Hardware stores
  5261: 'home_improvement', // Nurseries and lawn and garden supply stores

  // DEPARTMENT STORES (5311)
  5311: 'department_stores', // Department stores
  5331: 'department_stores', // Variety stores
  5399: 'department_stores', // General merchandise stores not elsewhere classified
  5719: 'department_stores', // Miscellaneous apparel and accessories shops

  // TRANSIT & RIDESHARE (4111-4112)
  4111: 'transit', // Passenger railways
  4112: 'transit', // Passenger ferries
  4121: 'transit', // Taxicabs and limousines
  4131: 'transit', // Bus lines
  4214: 'transit', // Motor freight carriers and trucking
  4511: 'transit', // Airlines
  5411: 'transit', // Sometimes used for transit passes

  // UTILITIES (4814)
  4814: 'utilities', // Telecommunications services (phone, internet, cable)
  4821: 'utilities', // Telegraph and other message utilities
  7523: 'utilities', // Automobile parking lots and garages
  7510: 'utilities', // Laundry, cleaning services

  // WAREHOUSE CLUBS (5411 with special handling)
  // Note: Warehouse clubs like Costco, Sam's Club use code 5411 (same as groceries)
  // We handle differentiation via keyword matching in MerchantClassifier
  5411: 'warehouse', // Can be warehouse or grocery - handled by merchant name

  // OFFICE SUPPLIES (5200)
  5200: 'office_supplies', // Home supply warehouse stores
  5943: 'office_supplies', // Stationery stores
  5200: 'office_supplies', // Office and school supply stores

  // INSURANCE (6211)
  6211: 'insurance', // Securities brokers, dealers
  6051: 'insurance', // Crypto currency exchanges and dealers
  // Note: Insurance companies often use different codes, but 6211 is common
  6300: 'insurance', // Insurance services
};

/**
 * MCC Code Classification Confidence Levels
 * How confident we should be when classifying based on MCC codes alone
 *
 * RULES:
 * - High confidence (95-100%): Unique codes that clearly indicate category
 * - Medium confidence (80-94%): Codes shared with other categories
 * - Low confidence (60-79%): Ambiguous codes needing keyword verification
 */
const MCC_CONFIDENCE_LEVELS = {
  // High Confidence (95-100%)
  5812: 95, // Dining - very specific
  5813: 95, // Dining
  5814: 95, // Dining
  4899: 95, // Streaming - very specific
  5912: 95, // Drugstores - very specific
  7832: 95, // Movie theaters - very specific
  5211: 95, // Home improvement - very specific
  6211: 90, // Insurance
  4814: 90, // Utilities - fairly specific
  5311: 88, // Department stores

  // Medium Confidence (80-94%)
  7011: 85, // Hotels/lodging
  7012: 85, // Timeshare
  4511: 85, // Airlines
  4722: 85, // Car rental
  5411: 80, // Grocery/Warehouse (ambiguous - needs keyword verification)
  5412: 85, // Convenience stores
  5542: 80, // Gas stations (can overlap with other services)
  4111: 85, // Transit
  7922: 85, // Entertainment agencies
  7999: 80, // Entertainment services (generic)

  // Low Confidence (60-79%)
  5399: 70, // General merchandise
  5999: 65, // Miscellaneous retail
};

/**
 * Classify merchant by MCC code
 *
 * @param {string|number} mccCode - The merchant category code (e.g., 5812)
 * @returns {object} Classification result with:
 *   - categoryId: The detected category ID
 *   - categoryName: Human-readable category name
 *   - mccCode: The MCC code used for classification
 *   - confidence: Confidence score (0-100)
 *   - source: "mcc_code"
 *   - explanation: Why this classification was chosen
 */
export function classifyByMCCCode(mccCode) {
  if (!mccCode) {
    return {
      categoryId: null,
      categoryName: null,
      mccCode: null,
      confidence: 0,
      source: 'mcc_code',
      explanation: 'No MCC code provided'
    };
  }

  const code = String(mccCode).padStart(4, '0');

  // Look up the category for this MCC code
  const categoryId = MCC_TO_CATEGORY_MAP[parseInt(code)];

  if (!categoryId) {
    return {
      categoryId: null,
      categoryName: null,
      mccCode: code,
      confidence: 0,
      source: 'mcc_code',
      explanation: `MCC code ${code} not found in mapping table`
    };
  }

  const category = getCategoryById(categoryId);
  const confidence = MCC_CONFIDENCE_LEVELS[parseInt(code)] || 70;

  return {
    categoryId,
    categoryName: category.name,
    mccCode: code,
    confidence,
    source: 'mcc_code',
    explanation: `Classified as ${category.name} based on MCC code ${code} (${confidence}% confidence)`
  };
}

/**
 * Get all MCC codes for a category
 *
 * @param {string} categoryId - The category ID
 * @returns {array} Array of MCC codes for this category
 */
export function getMCCCodesForCategory(categoryId) {
  const codes = [];

  Object.entries(MCC_TO_CATEGORY_MAP).forEach(([code, catId]) => {
    if (catId === categoryId) {
      codes.push(parseInt(code));
    }
  });

  return [...new Set(codes)]; // Remove duplicates and return
}

/**
 * Get all MCC codes with their category mappings
 *
 * @returns {object} Object mapping MCC codes to category IDs
 */
export function getAllMCCMappings() {
  return { ...MCC_TO_CATEGORY_MAP };
}

/**
 * Get confidence score for an MCC code
 *
 * @param {string|number} mccCode - The MCC code
 * @returns {number} Confidence score (0-100)
 */
export function getMCCConfidence(mccCode) {
  const code = parseInt(String(mccCode));
  return MCC_CONFIDENCE_LEVELS[code] || 50; // Default to 50% if not mapped
}

/**
 * Validate if an MCC code is valid/recognized
 *
 * @param {string|number} mccCode - The MCC code to validate
 * @returns {boolean} True if the MCC code is recognized
 */
export function isValidMCCCode(mccCode) {
  if (!mccCode) return false;

  const code = parseInt(String(mccCode));
  return !!MCC_TO_CATEGORY_MAP[code];
}

/**
 * Get MCC code description
 *
 * @param {string|number} mccCode - The MCC code
 * @returns {string} Description of what the MCC code represents
 */
export function getMCCDescription(mccCode) {
  const codeNum = parseInt(String(mccCode));
  const categoryId = MCC_TO_CATEGORY_MAP[codeNum];

  if (!categoryId) {
    return `Unknown MCC code ${codeNum}`;
  }

  const category = getCategoryById(categoryId);
  return `${codeNum}: ${category.name}`;
}

/**
 * Batch classify multiple MCC codes
 *
 * @param {array} mccCodes - Array of MCC codes
 * @returns {array} Array of classification results
 */
export function classifyManyByMCCCode(mccCodes) {
  if (!Array.isArray(mccCodes)) {
    return [];
  }

  return mccCodes.map(code => classifyByMCCCode(code));
}

/**
 * Find the most confident MCC code for a category
 * (useful for reverse lookup)
 *
 * @param {string} categoryId - The category ID
 * @returns {number|null} The MCC code with highest confidence, or null
 */
export function getMostConfidentMCCCode(categoryId) {
  const codes = getMCCCodesForCategory(categoryId);

  if (codes.length === 0) return null;

  // Find the code with highest confidence
  return codes.reduce((bestCode, code) => {
    const bestConfidence = MCC_CONFIDENCE_LEVELS[bestCode] || 0;
    const currentConfidence = MCC_CONFIDENCE_LEVELS[code] || 0;
    return currentConfidence > bestConfidence ? code : bestCode;
  });
}

/**
 * Named exports for constants
 */
export {
  MCC_TO_CATEGORY_MAP,
  MCC_CONFIDENCE_LEVELS
};

/**
 * Export default object with all functions
 */
export default {
  classifyByMCCCode,
  getMCCCodesForCategory,
  getAllMCCMappings,
  getMCCConfidence,
  isValidMCCCode,
  getMCCDescription,
  classifyManyByMCCCode,
  getMostConfidentMCCCode,
  MCC_TO_CATEGORY_MAP,
  MCC_CONFIDENCE_LEVELS
};
