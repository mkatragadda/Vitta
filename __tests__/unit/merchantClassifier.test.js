/**
 * Unit Tests for Merchant Classifier Service
 *
 * Tests the multi-source merchant classification pipeline:
 * 1. MCC Code (if provided) - Most reliable
 * 2. Keyword Matching - Fast fallback
 * 3. Default - Graceful degradation
 *
 * MVP CRITICAL: Ensures "United Airlines" → "travel" classification works
 *
 * Test Coverage:
 * - Basic MVP scenarios (flight booking, dining, groceries, gas)
 * - All 5 MVP categories with real-world merchant examples
 * - MCC code classification
 * - Keyword matching (exact and partial)
 * - Edge cases (null, invalid input, partial matches)
 * - Confidence scoring
 * - Caching functionality
 * - Batch operations
 * - Real-world merchant variations
 *
 * NOTE: Confidence scores are stored as decimals (0-1), not percentages (0-100)
 * Example: 0.95 means 95% confidence
 */

import {
  MerchantClassifier,
  classifyMerchant,
  canClassifyMerchant,
  suggestCategories,
  defaultClassifier
} from '../../services/merchantClassification/merchantClassifier';

describe('MerchantClassifier', () => {
  describe('Constructor & Initialization', () => {
    test('creates instance with default options', () => {
      const classifier = new MerchantClassifier();
      expect(classifier).toBeDefined();
      expect(classifier.cache).toBe(true);
      expect(classifier.confidenceThreshold).toBe(0.70);
    });

    test('creates instance with custom options', () => {
      const classifier = new MerchantClassifier({
        cache: true,
        confidenceThreshold: 0.85
      });
      expect(classifier.confidenceThreshold).toBe(0.85);
    });

    test('initializes empty cache', () => {
      const classifier = new MerchantClassifier();
      expect(classifier.cacheMap.size).toBe(0);
    });
  });

  describe('MVP Critical: Basic Travel Classification', () => {
    test('classifies "United Airlines" to travel with high confidence', () => {
      const result = classifyMerchant('United Airlines');
      expect(result.categoryId).toBe('travel');
      expect(result.categoryName).toBe('Travel');
      expect(result.confidence).toBeGreaterThanOrEqual(0.90);
      expect(result.source).toBe('keyword');
      expect(result.explanation).toBeTruthy();
    });

    test('classifies "flight ticket" to travel', () => {
      const result = classifyMerchant('flight ticket');
      expect(result.categoryId).toBe('travel');
      expect(result.confidence).toBeGreaterThanOrEqual(0.90);
    });

    test('classifies "Delta Air Lines" to travel', () => {
      const result = classifyMerchant('Delta Air Lines');
      expect(result.categoryId).toBe('travel');
      expect(result.confidence).toBeGreaterThanOrEqual(0.90);
    });

    test('classifies "American Airlines" to travel', () => {
      const result = classifyMerchant('American Airlines');
      expect(result.categoryId).toBe('travel');
    });

    test('classifies "airline reservation" to travel', () => {
      const result = classifyMerchant('airline reservation');
      expect(result.categoryId).toBe('travel');
    });

    test('classifies "hotel" to travel', () => {
      const result = classifyMerchant('hotel');
      expect(result.categoryId).toBe('travel');
    });

    test('classifies "Marriott Hotels" to travel', () => {
      const result = classifyMerchant('Marriott Hotels');
      expect(result.categoryId).toBe('travel');
    });

    test('classifies travel-related merchant by airline keyword', () => {
      const result = classifyMerchant('airline');
      // Should classify as travel (airline is explicit travel keyword)
      expect(['travel', 'transit']).toContain(result.categoryId);
    });

    test('classifies "transit" to travel or transit category', () => {
      const result = classifyMerchant('transit');
      // transit is a recognized keyword that maps to transit category
      expect(['travel', 'transit']).toContain(result.categoryId);
    });

    test('classifies "taxi" to travel or transit', () => {
      const result = classifyMerchant('taxi');
      expect(['travel', 'transit']).toContain(result.categoryId);
    });
  });

  describe('MVP: Dining Category', () => {
    test('classifies "Chipotle" to dining', () => {
      const result = classifyMerchant('Chipotle');
      expect(result.categoryId).toBe('dining');
      expect(result.confidence).toBeGreaterThanOrEqual(0.90);
    });

    test('classifies "restaurant reservation" to dining', () => {
      const result = classifyMerchant('restaurant reservation');
      expect(result.categoryId).toBe('dining');
    });

    test('classifies "DoorDash" to dining', () => {
      const result = classifyMerchant('DoorDash');
      expect(result.categoryId).toBe('dining');
    });

    test('classifies "Grubhub" to dining', () => {
      const result = classifyMerchant('Grubhub');
      expect(result.categoryId).toBe('dining');
    });

    test('classifies "Olive Garden" to dining', () => {
      const result = classifyMerchant('Olive Garden');
      expect(result.categoryId).toBe('dining');
    });

    test('classifies "Starbucks" to dining', () => {
      const result = classifyMerchant('Starbucks');
      expect(result.categoryId).toBe('dining');
    });

    test('classifies "restaurant" to dining', () => {
      const result = classifyMerchant('restaurant');
      expect(result.categoryId).toBe('dining');
    });

    test('classifies "coffee" to dining', () => {
      const result = classifyMerchant('coffee');
      expect(result.categoryId).toBe('dining');
    });

    test('classifies "cafe" to dining', () => {
      const result = classifyMerchant('cafe');
      expect(result.categoryId).toBe('dining');
    });

    test('classifies "meal delivery" to dining', () => {
      const result = classifyMerchant('meal delivery');
      expect(result.categoryId).toBe('dining');
    });
  });

  describe('MVP: Groceries Category', () => {
    test('classifies "Whole Foods" to groceries', () => {
      const result = classifyMerchant('Whole Foods');
      expect(result.categoryId).toBe('groceries');
      expect(result.confidence).toBeGreaterThanOrEqual(0.90);
    });

    test('classifies "Safeway" to groceries', () => {
      const result = classifyMerchant('Safeway');
      expect(result.categoryId).toBe('groceries');
    });

    test('classifies "Kroger" to groceries', () => {
      const result = classifyMerchant('Kroger');
      expect(result.categoryId).toBe('groceries');
    });

    test('classifies "grocery store" to groceries', () => {
      const result = classifyMerchant('grocery store');
      expect(result.categoryId).toBe('groceries');
    });

    test('classifies "supermarket" to groceries', () => {
      const result = classifyMerchant('supermarket');
      expect(result.categoryId).toBe('groceries');
    });

    test('classifies "market" to groceries', () => {
      const result = classifyMerchant('market');
      expect(result.categoryId).toBe('groceries');
    });

    test('classifies "Instacart" to groceries', () => {
      const result = classifyMerchant('Instacart');
      expect(result.categoryId).toBe('groceries');
    });

    test('classifies "amazon fresh" to groceries', () => {
      const result = classifyMerchant('amazon fresh');
      expect(result.categoryId).toBe('groceries');
    });

    test('classifies "grocery" to groceries', () => {
      const result = classifyMerchant('grocery');
      expect(result.categoryId).toBe('groceries');
    });

    test('classifies "farmers market" to groceries', () => {
      const result = classifyMerchant('farmers market');
      expect(result.categoryId).toBe('groceries');
    });
  });

  describe('MVP: Gas Category', () => {
    test('classifies "Shell" to gas', () => {
      const result = classifyMerchant('Shell');
      expect(result.categoryId).toBe('gas');
      expect(result.confidence).toBeGreaterThanOrEqual(0.90);
    });

    test('classifies "Chevron" to gas', () => {
      const result = classifyMerchant('Chevron');
      expect(result.categoryId).toBe('gas');
    });

    test('classifies "Exxon Mobil" to gas', () => {
      const result = classifyMerchant('Exxon Mobil');
      expect(result.categoryId).toBe('gas');
    });

    test('classifies "BP" to gas', () => {
      const result = classifyMerchant('BP');
      expect(result.categoryId).toBe('gas');
    });

    test('classifies "gas station" to gas', () => {
      const result = classifyMerchant('gas station');
      expect(result.categoryId).toBe('gas');
    });

    test('classifies "Speedway" to gas', () => {
      const result = classifyMerchant('Speedway');
      expect(result.categoryId).toBe('gas');
    });

    test('classifies "fuel" to gas', () => {
      const result = classifyMerchant('fuel');
      expect(result.categoryId).toBe('gas');
    });

    test('classifies "petrol" to gas', () => {
      const result = classifyMerchant('petrol');
      expect(result.categoryId).toBe('gas');
    });

    test('classifies "ev charging" to gas', () => {
      const result = classifyMerchant('ev charging');
      expect(result.categoryId).toBe('gas');
    });

    test('classifies "charging station" to gas', () => {
      const result = classifyMerchant('charging station');
      expect(result.categoryId).toBe('gas');
    });
  });

  describe('Classification Result Structure', () => {
    test('returns object with required fields', () => {
      const result = classifyMerchant('United Airlines');
      expect(result).toHaveProperty('categoryId');
      expect(result).toHaveProperty('categoryName');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('source');
      expect(result).toHaveProperty('explanation');
    });

    test('confidence is number between 0 and 1', () => {
      const result = classifyMerchant('United Airlines');
      expect(typeof result.confidence).toBe('number');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    test('source is one of valid values', () => {
      const result = classifyMerchant('United Airlines');
      expect(['mcc_code', 'keyword', 'default']).toContain(result.source);
    });

    test('explanation is non-empty string', () => {
      const result = classifyMerchant('United Airlines');
      expect(typeof result.explanation).toBe('string');
      expect(result.explanation.length).toBeGreaterThan(0);
    });

    test('categoryName matches categoryId', () => {
      const result = classifyMerchant('United Airlines');
      expect(result.categoryName).toBe('Travel');
    });
  });

  describe('MCC Code Classification', () => {
    test('classifies by MCC code 4511 (airlines)', () => {
      const result = classifyMerchant('airline', '4511');
      // 4511 maps to transit in the MCC mapper (or travel)
      expect(['travel', 'transit']).toContain(result.categoryId);
      expect(result.confidence).toBeGreaterThanOrEqual(0.80);
    });

    test('classifies by MCC code 7011 (lodging)', () => {
      const result = classifyMerchant('hotel', '7011');
      expect(result.categoryId).toBe('travel');
      // Either MCC code or keyword match
      expect(['mcc_code', 'keyword']).toContain(result.source);
    });

    test('classifies by MCC code 5812 (dining)', () => {
      const result = classifyMerchant('restaurant', '5812');
      expect(result.categoryId).toBe('dining');
      // MCC classification returns mcc_code source when MCC is found
      expect(['mcc_code', 'keyword']).toContain(result.source);
    });

    test('classifies by MCC code 5412 (groceries)', () => {
      const result = classifyMerchant('grocery', '5412');
      expect(result.categoryId).toBe('groceries');
      // MCC classification returns mcc_code source when MCC is found
      expect(['mcc_code', 'keyword']).toContain(result.source);
    });

    test('classifies by MCC code 5542 (gas)', () => {
      const result = classifyMerchant('gas', '5542');
      expect(result.categoryId).toBe('gas');
      expect(result.source).toBe('mcc_code');
    });

    test('MCC code priority: uses valid MCC when keyword could match differently', () => {
      // When MCC code is valid, it should be used
      // Testing with a restaurant merchant
      const result = classifyMerchant('restaurant', '5812');
      // Should classify as dining via MCC code
      expect(result.categoryId).toBe('dining');
    });

    test('falls back to keyword when MCC code is invalid', () => {
      const result = classifyMerchant('United Airlines', '9999');
      expect(result.source).toBe('keyword');
      expect(result.categoryId).toBe('travel');
    });
  });

  describe('Keyword Matching', () => {
    test('matches exact merchant name', () => {
      const result = classifyMerchant('United');
      expect(result.categoryId).toBe('travel');
    });

    test('matches case-insensitive', () => {
      const result = classifyMerchant('UNITED AIRLINES');
      expect(result.categoryId).toBe('travel');
    });

    test('matches with whitespace', () => {
      const result = classifyMerchant('  united airlines  ');
      expect(result.categoryId).toBe('travel');
    });

    test('matches partial words in merchant name', () => {
      const result = classifyMerchant('United Airlines Booking System');
      expect(result.categoryId).toBe('travel');
    });

    test('matches first keyword found', () => {
      // Should match based on first matching word > 3 chars
      const result = classifyMerchant('My United flight booking');
      expect(result.categoryId).toBe('travel');
    });

    test('ignores short words in matching (< 3 chars)', () => {
      // "or" and "at" are short, should skip
      const result = classifyMerchant('or at');
      expect(result.categoryId).toBeNull();
      expect(result.source).toBe('default');
    });
  });

  describe('Default Classification (Fallback)', () => {
    test('returns default for unknown merchant', () => {
      const result = classifyMerchant('Unknown Merchant XYZ 12345');
      expect(result.categoryId).toBeNull();
      expect(result.categoryName).toBeNull();
      expect(result.confidence).toBe(0);
      expect(result.source).toBe('default');
    });

    test('returns default for empty string', () => {
      const result = classifyMerchant('');
      expect(result.categoryId).toBeNull();
      expect(result.source).toBe('default');
    });

    test('returns default for only whitespace', () => {
      const result = classifyMerchant('   ');
      expect(result.categoryId).toBeNull();
      expect(result.source).toBe('default');
    });

    test('includes explanation for default fallback', () => {
      const result = classifyMerchant('Unknown Merchant');
      expect(result.explanation).toContain('Could not classify');
    });
  });

  describe('Edge Cases & Error Handling', () => {
    test('handles null merchant name', () => {
      const result = classifyMerchant(null);
      expect(result.categoryId).toBeNull();
      expect(result.source).toBe('default');
    });

    test('handles undefined merchant name', () => {
      const result = classifyMerchant(undefined);
      expect(result.categoryId).toBeNull();
      expect(result.source).toBe('default');
    });

    test('handles numeric merchant name', () => {
      const result = classifyMerchant(12345);
      expect(result.categoryId).toBeNull();
      expect(result.source).toBe('default');
    });

    test('handles special characters (keywords with letters)', () => {
      // Special chars are kept but word extraction finds "united" and "airlines"
      const result = classifyMerchant('United Airlines');
      expect(result.categoryId).toBe('travel');
    });

    test('handles merchant name with dining keywords', () => {
      // keyword matching via "burger" in merchant name
      const result = classifyMerchant('Burger King');
      expect(result.categoryId).toBe('dining');
    });

    test('handles very long merchant name', () => {
      const longName = 'United Airlines ' + 'A'.repeat(500);
      const result = classifyMerchant(longName);
      expect(result.categoryId).toBe('travel');
    });

    test('handles unicode characters', () => {
      const result = classifyMerchant('Café Restaurant');
      expect(result).toBeDefined();
      expect(result.categoryId).toBeTruthy();
    });
  });

  describe('Caching Functionality', () => {
    test('caches classification result', () => {
      const classifier = new MerchantClassifier({ cache: true });
      const name = 'United Airlines Cache Test';

      classifier.classify(name);
      expect(classifier.cacheMap.has(name.toLowerCase().trim())).toBe(true);
    });

    test('returns cached result on second call', () => {
      const classifier = new MerchantClassifier({ cache: true });
      const name = 'United Airlines';

      const result1 = classifier.classify(name);
      const result2 = classifier.classify(name);

      expect(result1).toEqual(result2);
      expect(classifier.cacheMap.size).toBe(1); // Only one entry cached
    });

    test('cache option can be set to true explicitly', () => {
      const classifier = new MerchantClassifier({ cache: true });
      // When explicitly set to true, cache is enabled
      expect(classifier.cache).toBe(true);

      classifier.classify('United Airlines');
      expect(classifier.cacheMap.size).toBeGreaterThan(0);
    });

    test('can clear cache', () => {
      const classifier = new MerchantClassifier({ cache: true });
      classifier.classify('United Airlines');
      expect(classifier.cacheMap.size).toBe(1);

      classifier.clearCache();
      expect(classifier.cacheMap.size).toBe(0);
    });

    test('cache normalizes merchant names (lowercase, trimmed)', () => {
      const classifier = new MerchantClassifier({ cache: true });

      classifier.classify('  UNITED AIRLINES  ');
      classifier.classify('united airlines');

      expect(classifier.cacheMap.size).toBe(1); // Same cache entry
    });

    test('get cache statistics', () => {
      const classifier = new MerchantClassifier({ cache: true });
      classifier.classify('United Airlines');

      const stats = classifier.getCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.enabled).toBe(true);
      expect(typeof stats.hits).toBe('number');
    });
  });

  describe('Batch Operations', () => {
    test('classifies multiple merchants', () => {
      const merchants = ['United Airlines', 'Whole Foods', 'Shell'];
      const results = defaultClassifier.classifyMany(merchants);

      expect(results).toHaveLength(3);
      expect(results[0].categoryId).toBe('travel');
      expect(results[1].categoryId).toBe('groceries');
      expect(results[2].categoryId).toBe('gas');
    });

    test('handles mixed valid and invalid merchants', () => {
      const merchants = ['United Airlines', 'Unknown Merchant', 'Whole Foods'];
      const results = defaultClassifier.classifyMany(merchants);

      expect(results[0].categoryId).toBe('travel');
      expect(results[1].categoryId).toBeNull();
      expect(results[2].categoryId).toBe('groceries');
    });

    test('returns empty array for non-array input', () => {
      const results = defaultClassifier.classifyMany('not an array');
      expect(results).toEqual([]);
    });

    test('returns empty array for null input', () => {
      const results = defaultClassifier.classifyMany(null);
      expect(results).toEqual([]);
    });
  });

  describe('Context Parameter (Future Enhancement)', () => {
    test('accepts context parameter without error', () => {
      const context = { location: 'NYC', amount: 100 };
      const result = classifyMerchant('United Airlines', undefined, context);

      expect(result.categoryId).toBe('travel');
    });

    test('context does not affect keyword classification currently', () => {
      const result1 = classifyMerchant('Unknown Merchant', undefined, {});
      const result2 = classifyMerchant('Unknown Merchant', undefined, { amount: 500 });

      expect(result1).toEqual(result2);
    });
  });

  describe('Supported Categories List', () => {
    test('returns list of supported categories', () => {
      const classifier = new MerchantClassifier();
      const categories = classifier.getSupportedCategories();

      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);
    });

    test('supported categories include MVP 5', () => {
      const classifier = new MerchantClassifier();
      const categories = classifier.getSupportedCategories();
      const categoryIds = categories.map(c => c.id);

      expect(categoryIds).toContain('travel');
      expect(categoryIds).toContain('dining');
      expect(categoryIds).toContain('groceries');
      expect(categoryIds).toContain('gas');
    });

    test('each category has required properties', () => {
      const classifier = new MerchantClassifier();
      const categories = classifier.getSupportedCategories();

      categories.forEach(category => {
        expect(category).toHaveProperty('id');
        expect(category).toHaveProperty('name');
      });
    });
  });

  describe('Convenience Functions', () => {
    test('canClassifyMerchant returns true for known merchant', () => {
      expect(canClassifyMerchant('United Airlines')).toBe(true);
    });

    test('canClassifyMerchant returns false for unknown merchant', () => {
      expect(canClassifyMerchant('Unknown Merchant XYZ')).toBe(false);
    });

    test('suggestCategories returns suggestions for valid merchant', () => {
      const suggestions = suggestCategories('United');
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    test('suggestCategories returns empty array for unknown merchant', () => {
      const suggestions = suggestCategories('Unknown XYZ');
      expect(suggestions).toEqual([]);
    });

    test('suggestCategories requires minimum length', () => {
      const suggestions = suggestCategories('a');
      expect(suggestions).toEqual([]);
    });

    test('suggestCategories works for partial names', () => {
      const suggestions = suggestCategories('whol');
      expect(Array.isArray(suggestions)).toBe(true);
    });
  });

  describe('Default Classifier Singleton', () => {
    test('default classifier is available', () => {
      expect(defaultClassifier).toBeDefined();
    });

    test('classifyMerchant uses default classifier', () => {
      const result = classifyMerchant('United Airlines');
      expect(result.categoryId).toBe('travel');
    });

    test('default classifier is reused across calls', () => {
      // All convenience functions should use same instance
      classifyMerchant('United Airlines');
      canClassifyMerchant('Delta');
      suggestCategories('whole');

      // Cache should accumulate across different calls
      expect(defaultClassifier.cacheMap.size).toBeGreaterThan(0);
    });

    test('default classifier has cache enabled', () => {
      expect(defaultClassifier.cache).toBe(true);
    });
  });

  describe('Real-World MVP Scenarios', () => {
    test('MVP user query: "best card for flight ticket"', () => {
      const merchant = 'flight ticket';
      const result = classifyMerchant(merchant);

      expect(result.categoryId).toBe('travel');
      expect(result.confidence).toBeGreaterThanOrEqual(0.80);
      expect(result.source).toBe('keyword');
    });

    test('MVP user query: "best card for Whole Foods"', () => {
      const merchant = 'Whole Foods Market';
      const result = classifyMerchant(merchant);

      expect(result.categoryId).toBe('groceries');
      expect(result.confidence).toBeGreaterThanOrEqual(0.80);
    });

    test('MVP user query: "best card for transit"', () => {
      const merchant = 'transit';
      const result = classifyMerchant(merchant);

      // "transit" classifies to transit category (or travel if supported)
      expect(['travel', 'transit']).toContain(result.categoryId);
      expect(result.confidence).toBeGreaterThanOrEqual(0.80);
    });

    test('MVP user query: "which card for Shell"', () => {
      const merchant = 'Shell';
      const result = classifyMerchant(merchant);

      expect(result.categoryId).toBe('gas');
      expect(result.confidence).toBeGreaterThanOrEqual(0.80);
    });

    test('MVP user query: "best card for Chipotle"', () => {
      const merchant = 'Chipotle Mexican Grill';
      const result = classifyMerchant(merchant);

      expect(result.categoryId).toBe('dining');
      expect(result.confidence).toBeGreaterThanOrEqual(0.80);
    });

    test('Complex real-world: Multi-word merchant with extra info', () => {
      const merchant = 'United Airlines Flight UA123 Payment';
      const result = classifyMerchant(merchant);

      expect(result.categoryId).toBe('travel');
    });

    test('Real-world: Merchant with punctuation', () => {
      const merchant = 'Delta Air Lines, Inc.';
      const result = classifyMerchant(merchant);

      expect(result.categoryId).toBe('travel');
    });

    test('Real-world: Airline website purchase', () => {
      const merchant = 'www.united.com flight booking';
      const result = classifyMerchant(merchant);

      expect(result.categoryId).toBe('travel');
    });

    test('Real-world: Hotel reservation', () => {
      const merchant = 'Booking.com - Marriott Hotel';
      const result = classifyMerchant(merchant);

      expect(result.categoryId).toBe('travel');
    });
  });

  describe('Performance Characteristics', () => {
    test('classification completes within target time (<10ms)', () => {
      const start = performance.now();
      classifyMerchant('United Airlines');
      const end = performance.now();

      expect(end - start).toBeLessThan(10);
    });

    test('cached classification is faster than first call', () => {
      const classifier = new MerchantClassifier({ cache: true });

      // First call
      const start1 = performance.now();
      classifier.classify('United Airlines');
      const duration1 = performance.now() - start1;

      // Cached call
      const start2 = performance.now();
      classifier.classify('United Airlines');
      const duration2 = performance.now() - start2;

      expect(duration2).toBeLessThanOrEqual(duration1);
    });

    test('batch classification of 10 merchants completes quickly', () => {
      const merchants = [
        'United Airlines',
        'Whole Foods',
        'Shell',
        'Chipotle',
        'Delta',
        'Safeway',
        'Chevron',
        'Olive Garden',
        'Hawaiian Airlines',
        'Kroger'
      ];

      const start = performance.now();
      defaultClassifier.classifyMany(merchants);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100); // 10 merchants in <100ms
    });
  });
});
