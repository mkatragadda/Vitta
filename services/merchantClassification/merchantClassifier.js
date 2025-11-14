/**
 * Merchant Classifier Service
 *
 * Classifies merchants into categories using a multi-source pipeline:
 * 1. MCC Code (if provided) - Most reliable
 * 2. Keyword Matching - Fast fallback
 * 3. Default - Graceful degradation
 *
 * PURPOSE: Detect "United Airlines" → "travel" category for card recommendations
 *
 * PERFORMANCE TARGET: <10ms per classification
 */

import {
  findCategory,
  findCategoryByKeyword,
  getCategoryById
} from '../categories/categoryDefinitions';
import {
  classifyByMCCCode,
  getMCCConfidence
} from './mccCodeMapper';

/**
 * Merchant Classifier Class
 * Handles intelligent merchant-to-category classification
 */
export class MerchantClassifier {
  constructor(options = {}) {
    this.cache = options.cache || true;
    this.cacheMap = new Map();
    this.confidenceThreshold = options.confidenceThreshold || 0.70;
  }

  /**
   * Classify a merchant into a category
   *
   * CRITICAL FOR MVP: "United Airlines" → "travel" (95% confidence)
   *
   * @param {string} merchantName - The merchant name (e.g., "United Airlines", "flight ticket")
   * @param {string|number} mccCode - Optional MCC code from payment processor
   * @param {object} context - Optional context (location, amount, etc.)
   *
   * @returns {object} Classification result with:
   *   - categoryId: The detected category ID (e.g., "travel")
   *   - categoryName: Human-readable name (e.g., "Travel")
   *   - confidence: 0-100 confidence score
   *   - source: How it was detected ("mcc", "keyword", "default")
   *   - explanation: Why this classification was chosen
   */
  classify(merchantName, mccCode, context = {}) {
    // Input validation
    if (!merchantName || typeof merchantName !== 'string') {
      return this.getDefaultClassification('Invalid merchant name');
    }

    const trimmedName = merchantName.trim().toLowerCase();

    // Check cache first
    if (this.cache && this.cacheMap.has(trimmedName)) {
      return this.cacheMap.get(trimmedName);
    }

    let result;

    // PIPELINE: Try MCC → Keywords → Default
    // MVP focuses on these 5 critical categories:
    // travel, dining, groceries, gas, rewards (default)

    // Step 1: Try MCC Code (Most Reliable - 95%+ confidence)
    if (mccCode) {
      const mccResult = classifyByMCCCode(mccCode);
      if (mccResult.categoryId) {
        result = {
          categoryId: mccResult.categoryId,
          categoryName: mccResult.categoryName,
          confidence: mccResult.confidence,
          source: 'mcc_code',
          explanation: `Classified using merchant code ${mccCode}`
        };

        if (this.cache) {
          this.cacheMap.set(trimmedName, result);
        }
        return result;
      }
    }

    // Step 2: Try Keyword Matching (Fast, reliable for known merchants)
    // MVP Examples:
    // "United Airlines" → "travel" (95% from keywords)
    // "Delta" → "travel" (95% from keywords)
    // "Whole Foods" → "groceries" (95% from keywords)
    // "Shell Gas" → "gas" (95% from keywords)
    // "Chipotle" → "dining" (95% from keywords)

    const keywordResult = this.classifyByKeyword(trimmedName);
    if (keywordResult) {
      result = {
        categoryId: keywordResult.id,
        categoryName: keywordResult.name,
        confidence: 0.95,  // High confidence for keyword match
        source: 'keyword',
        explanation: `Matched merchant "${merchantName}" to "${keywordResult.name}" category`
      };

      if (this.cache) {
        this.cacheMap.set(trimmedName, result);
      }
      return result;
    }

    // Step 3: Default Fallback (Always succeeds, low confidence)
    result = this.getDefaultClassification(`Could not classify "${merchantName}"`);

    if (this.cache) {
      this.cacheMap.set(trimmedName, result);
    }
    return result;
  }

  /**
   * Classify by keyword matching
   * Searches all categories for keyword match
   *
   * MVP: "United" matches "airline" keyword under travel category
   *
   * @private
   * @param {string} merchantName - Lowercase merchant name
   * @returns {object|null} Category object if found, null otherwise
   */
  classifyByKeyword(merchantName) {
    // Try exact keyword match
    const category = findCategoryByKeyword(merchantName);
    if (category) {
      return category;
    }

    // Try partial word matching
    // e.g., "United Airlines" → search for "united" or "airlines"
    const words = merchantName.split(/\s+/);

    for (const word of words) {
      if (word.length > 3) {  // Only match words > 3 chars to avoid false positives
        const partialCategory = findCategoryByKeyword(word);
        if (partialCategory) {
          return partialCategory;
        }
      }
    }

    return null;
  }

  /**
   * Get default/fallback classification
   * Used when merchant cannot be classified
   *
   * @private
   * @param {string} reason - Why default was used
   * @returns {object} Default classification (no category)
   */
  getDefaultClassification(reason) {
    return {
      categoryId: null,
      categoryName: null,
      confidence: 0,
      source: 'default',
      explanation: reason
    };
  }

  /**
   * Classify multiple merchants (batch operation)
   *
   * @param {array} merchants - Array of merchant names
   * @returns {array} Array of classification results
   */
  classifyMany(merchants) {
    if (!Array.isArray(merchants)) {
      return [];
    }

    return merchants.map(merchant => this.classify(merchant));
  }

  /**
   * Get all supported categories
   *
   * @returns {array} Array of category objects
   */
  getSupportedCategories() {
    return [
      'travel',
      'dining',
      'groceries',
      'gas',
      'entertainment',
      'streaming',
      'drugstores',
      'home_improvement',
      'department_stores',
      'transit',
      'utilities',
      'warehouse',
      'office_supplies',
      'insurance'
    ].map(id => getCategoryById(id)).filter(Boolean);
  }

  /**
   * Clear the cache
   * Useful for testing or when category definitions change
   */
  clearCache() {
    this.cacheMap.clear();
  }

  /**
   * Get cache statistics
   *
   * @returns {object} Cache stats
   */
  getCacheStats() {
    return {
      size: this.cacheMap.size,
      enabled: this.cache,
      hits: 0  // Would track in production
    };
  }
}

/**
 * Default singleton instance
 * Use this for most cases
 */
export const defaultClassifier = new MerchantClassifier({
  cache: true,
  confidenceThreshold: 0.70
});

/**
 * Convenience functions (for backward compatibility)
 */

/**
 * Classify a single merchant (using default instance)
 *
 * MVP CRITICAL: This function is called from cardDataQueryHandler
 *
 * @param {string} merchantName - Merchant name
 * @param {string|number} mccCode - Optional MCC code
 * @returns {object} Classification result
 */
export function classifyMerchant(merchantName, mccCode) {
  return defaultClassifier.classify(merchantName, mccCode);
}

/**
 * Check if a merchant can be classified
 *
 * @param {string} merchantName - Merchant name
 * @returns {boolean} True if merchant can be classified
 */
export function canClassifyMerchant(merchantName) {
  const result = classifyMerchant(merchantName);
  return result.categoryId !== null;
}

/**
 * Get category suggestions for a partial merchant name
 * Useful for autocomplete
 *
 * @param {string} partialName - Partial merchant name
 * @returns {array} Suggested categories
 */
export function suggestCategories(partialName) {
  if (!partialName || partialName.length < 2) {
    return [];
  }

  const classifier = defaultClassifier;
  const result = classifier.classify(partialName);

  if (result.categoryId) {
    return [result];
  }

  return [];
}

/**
 * Export default for module usage
 */
export default {
  MerchantClassifier,
  classifyMerchant,
  canClassifyMerchant,
  suggestCategories,
  defaultClassifier
};
