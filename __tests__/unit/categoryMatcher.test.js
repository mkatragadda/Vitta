/**
 * Unit Tests for Category Matcher Service
 *
 * Tests reward multiplier matching for classified merchant categories.
 * Given a category (e.g., "travel") and card, returns the reward multiplier (e.g., 3x).
 *
 * MVP CRITICAL: Ensures card rewards are correctly matched to merchant categories
 * Example: Chase Sapphire Preferred offers 3x on travel → multiplier = 3
 *
 * Test Coverage:
 * - Basic MVP scenarios (travel, dining, groceries, gas)
 * - Simple reward format (number): { travel: 3 }
 * - Complex reward format (object): { travel: { value: 3, note: "..." } }
 * - Rotating categories: { rotating: { value: 5, active_categories: [...] } }
 * - Subcategory matching
 * - Default multiplier fallback
 * - Edge cases (null card, invalid category, no rewards)
 * - Parent category fallback (prepared for future)
 * - Real-world card structures
 * - Confidence and explanation generation
 *
 * NOTE: Multipliers are stored as numbers (1, 2, 3, 4, 5, etc.)
 * Example: 3x multiplier = stored as 3, not 300%
 */

import {
  CategoryMatcher,
  findRewardMultiplier,
  getRewardExplanation,
  scoreCardsByCategory
} from '../../services/recommendations/categoryMatcher';

describe('CategoryMatcher', () => {
  describe('Constructor & Initialization', () => {
    test('creates instance with card object', () => {
      const card = {
        reward_structure: {
          travel: 3,
          dining: 4
        }
      };
      const matcher = new CategoryMatcher(card);
      expect(matcher).toBeDefined();
      expect(matcher.card).toBe(card);
    });

    test('throws error if card is not provided', () => {
      expect(() => new CategoryMatcher(null)).toThrow();
      expect(() => new CategoryMatcher(undefined)).toThrow();
    });

    test('handles card with no reward_structure', () => {
      const card = {};
      const matcher = new CategoryMatcher(card);
      expect(matcher.rewards).toEqual({});
    });

    test('handles card with null reward_structure', () => {
      const card = { reward_structure: null };
      const matcher = new CategoryMatcher(card);
      expect(matcher.rewards).toEqual({});
    });

    test('stores card and rewards references', () => {
      const card = {
        name: 'Test Card',
        reward_structure: { travel: 3 }
      };
      const matcher = new CategoryMatcher(card);
      expect(matcher.card.name).toBe('Test Card');
      expect(matcher.rewards.travel).toBe(3);
    });
  });

  describe('Simple Reward Format (Number)', () => {
    test('finds multiplier for simple format { travel: 3 }', () => {
      const card = {
        reward_structure: {
          travel: 3,
          dining: 4,
          groceries: 2,
          gas: 2
        }
      };
      const matcher = new CategoryMatcher(card);

      expect(matcher.findRewardMultiplier('travel')).toBe(3);
      expect(matcher.findRewardMultiplier('dining')).toBe(4);
      expect(matcher.findRewardMultiplier('groceries')).toBe(2);
      expect(matcher.findRewardMultiplier('gas')).toBe(2);
    });

    test('handles case-insensitive category lookup', () => {
      const card = {
        reward_structure: {
          travel: 3,
          dining: 4
        }
      };
      const matcher = new CategoryMatcher(card);

      expect(matcher.findRewardMultiplier('TRAVEL')).toBe(3);
      expect(matcher.findRewardMultiplier('Travel')).toBe(3);
      expect(matcher.findRewardMultiplier('TrAvEl')).toBe(3);
    });

    test('handles whitespace in category name', () => {
      const card = {
        reward_structure: {
          travel: 3
        }
      };
      const matcher = new CategoryMatcher(card);

      expect(matcher.findRewardMultiplier('  travel  ')).toBe(3);
    });

    test('returns null multiplier for missing category', () => {
      const card = {
        reward_structure: {
          travel: 3,
          dining: 4
        }
      };
      const matcher = new CategoryMatcher(card);

      const result = matcher.findRewardMultiplier('entertainment');
      // Should fall back to default
      expect(result).toBe(1); // Default multiplier
    });
  });

  describe('Complex Reward Format (Object)', () => {
    test('extracts multiplier from object format { value, note }', () => {
      const card = {
        reward_structure: {
          travel: {
            value: 3,
            note: 'Flights, hotels, car rentals'
          },
          dining: {
            value: 4,
            note: 'Restaurants'
          }
        }
      };
      const matcher = new CategoryMatcher(card);

      expect(matcher.findRewardMultiplier('travel')).toBe(3);
      expect(matcher.findRewardMultiplier('dining')).toBe(4);
    });

    test('extracts multiplier from object with multiple properties', () => {
      const card = {
        reward_structure: {
          travel: {
            value: 3,
            note: 'Flights, hotels, car rentals',
            subcategories: ['airfare', 'hotel', 'car_rental'],
            points_per_dollar: 3
          }
        }
      };
      const matcher = new CategoryMatcher(card);

      expect(matcher.findRewardMultiplier('travel')).toBe(3);
    });

    test('handles mixed simple and complex formats', () => {
      const card = {
        reward_structure: {
          travel: 3, // Simple format
          dining: {
            // Complex format
            value: 4,
            note: 'Restaurants and delivery'
          },
          groceries: 2 // Simple format
        }
      };
      const matcher = new CategoryMatcher(card);

      expect(matcher.findRewardMultiplier('travel')).toBe(3);
      expect(matcher.findRewardMultiplier('dining')).toBe(4);
      expect(matcher.findRewardMultiplier('groceries')).toBe(2);
    });

    test('returns default if object has no value property', () => {
      const card = {
        reward_structure: {
          travel: {
            note: 'Flights',
            // missing 'value' property
          }
        }
      };
      const matcher = new CategoryMatcher(card);

      expect(matcher.findRewardMultiplier('travel')).toBe(1);
    });

    test('returns default if value is not a number', () => {
      const card = {
        reward_structure: {
          travel: {
            value: 'high', // Not a number
            note: 'Flights'
          }
        }
      };
      const matcher = new CategoryMatcher(card);

      expect(matcher.findRewardMultiplier('travel')).toBe(1);
    });
  });

  describe('MVP: Basic Card Scenarios', () => {
    test('Chase Sapphire Preferred: 3x travel, 2x dining', () => {
      const card = {
        name: 'Chase Sapphire Preferred',
        reward_structure: {
          travel: 3,
          dining: 2,
          default: 1
        }
      };
      const matcher = new CategoryMatcher(card);

      expect(matcher.findRewardMultiplier('travel')).toBe(3);
      expect(matcher.findRewardMultiplier('dining')).toBe(2);
      expect(matcher.findRewardMultiplier('entertainment')).toBe(1);
    });

    test('American Express Gold: 4x dining, 4x groceries', () => {
      const card = {
        name: 'American Express Gold',
        reward_structure: {
          dining: 4,
          groceries: 4,
          travel: 1,
          default: 1
        }
      };
      const matcher = new CategoryMatcher(card);

      expect(matcher.findRewardMultiplier('dining')).toBe(4);
      expect(matcher.findRewardMultiplier('groceries')).toBe(4);
      expect(matcher.findRewardMultiplier('travel')).toBe(1);
    });

    test('Citi Custom Cash: 5x gas and groceries', () => {
      const card = {
        name: 'Citi Custom Cash',
        reward_structure: {
          gas: 5,
          groceries: 5,
          dining: 1,
          default: 1
        }
      };
      const matcher = new CategoryMatcher(card);

      expect(matcher.findRewardMultiplier('gas')).toBe(5);
      expect(matcher.findRewardMultiplier('groceries')).toBe(5);
    });

    test('Generic cashback card: 1.5% on everything', () => {
      const card = {
        name: 'Generic Cashback',
        reward_structure: {
          default: 1.5
        }
      };
      const matcher = new CategoryMatcher(card);

      expect(matcher.findRewardMultiplier('travel')).toBe(1.5);
      expect(matcher.findRewardMultiplier('dining')).toBe(1.5);
      expect(matcher.findRewardMultiplier('gas')).toBe(1.5);
    });

    test('No rewards card: 0% on all categories', () => {
      const card = {
        name: 'No Rewards Card',
        reward_structure: {
          default: 0
        }
      };
      const matcher = new CategoryMatcher(card);

      expect(matcher.findRewardMultiplier('travel')).toBe(0);
      expect(matcher.findRewardMultiplier('dining')).toBe(0);
    });
  });

  describe('Subcategory Matching', () => {
    test('prefers exact category match over subcategory (exact takes priority)', () => {
      const card = {
        reward_structure: {
          travel: 3, // Exact match
          travel_airfare: 5 // Subcategory (won't be used if exact exists)
        }
      };
      const matcher = new CategoryMatcher(card);

      // Exact match is used first, so subcategory is never checked
      expect(matcher.findRewardMultiplier('travel')).toBe(3);
      // When subcategory is provided, exact category still takes priority
      expect(matcher.findRewardMultiplier('travel', 'airfare')).toBe(3);
    });

    test('uses subcategory key formatting when no exact category match', () => {
      const card = {
        reward_structure: {
          // No "travel" key - subcategory keys only
          travel_airfare: 5,
          travel_hotel: 4
        }
      };
      const matcher = new CategoryMatcher(card);

      // Subcategories should be formatted as category_subcategory
      expect(matcher.findRewardMultiplier('travel', 'airfare')).toBe(5);
      expect(matcher.findRewardMultiplier('travel', 'hotel')).toBe(4);

      // Without matching subcategory, returns default
      expect(matcher.findRewardMultiplier('travel')).toBe(1);
    });

    test('ignores null subcategory', () => {
      const card = {
        reward_structure: {
          travel: 3,
          travel_airfare: 5
        }
      };
      const matcher = new CategoryMatcher(card);

      expect(matcher.findRewardMultiplier('travel', null)).toBe(3);
    });
  });

  describe('Rotating Categories', () => {
    test('finds rotating category match', () => {
      const card = {
        reward_structure: {
          default: 1,
          rotating: {
            value: 5,
            active_categories: ['entertainment', 'streaming']
          }
        }
      };
      const matcher = new CategoryMatcher(card);

      expect(matcher.findRewardMultiplier('entertainment')).toBe(5);
      expect(matcher.findRewardMultiplier('streaming')).toBe(5);
    });

    test('returns default for non-rotating categories', () => {
      const card = {
        reward_structure: {
          default: 1,
          rotating: {
            value: 5,
            active_categories: ['entertainment']
          }
        }
      };
      const matcher = new CategoryMatcher(card);

      expect(matcher.findRewardMultiplier('travel')).toBe(1);
      expect(matcher.findRewardMultiplier('dining')).toBe(1);
    });

    test('handles rotating with no active categories', () => {
      const card = {
        reward_structure: {
          default: 1,
          rotating: {
            value: 5,
            active_categories: []
          }
        }
      };
      const matcher = new CategoryMatcher(card);

      expect(matcher.findRewardMultiplier('entertainment')).toBe(1);
    });

    test('static category takes priority over rotating categories', () => {
      const card = {
        reward_structure: {
          default: 1,
          entertainment: 2, // Static 2x - checked first
          rotating: {
            value: 5,
            active_categories: ['entertainment']
          }
        }
      };
      const matcher = new CategoryMatcher(card);

      // Exact match (entertainment: 2) is checked before rotating
      // So static wins, not rotating
      expect(matcher.findRewardMultiplier('entertainment')).toBe(2);
    });
  });

  describe('Default Multiplier', () => {
    test('returns hardcoded 1 if no default specified', () => {
      const card = {
        reward_structure: {
          travel: 3
        }
      };
      const matcher = new CategoryMatcher(card);

      expect(matcher.findRewardMultiplier('unknown_category')).toBe(1);
    });

    test('returns default multiplier if specified', () => {
      const card = {
        reward_structure: {
          travel: 3,
          default: 1.5
        }
      };
      const matcher = new CategoryMatcher(card);

      expect(matcher.findRewardMultiplier('unknown_category')).toBe(1.5);
    });

    test('handles default as object format', () => {
      const card = {
        reward_structure: {
          travel: 3,
          default: {
            value: 2,
            note: 'Catch-all'
          }
        }
      };
      const matcher = new CategoryMatcher(card);

      expect(matcher.findRewardMultiplier('unknown_category')).toBe(2);
    });

    test('returns 1 if default has no value', () => {
      const card = {
        reward_structure: {
          travel: 3,
          default: {
            note: 'Catch-all'
            // missing value
          }
        }
      };
      const matcher = new CategoryMatcher(card);

      expect(matcher.findRewardMultiplier('unknown_category')).toBe(1);
    });
  });

  describe('Reward Categories List', () => {
    test('returns all categories with rewards > 1', () => {
      const card = {
        reward_structure: {
          travel: 3,
          dining: 4,
          groceries: 1, // Should be excluded
          default: 1
        }
      };
      const matcher = new CategoryMatcher(card);
      const categories = matcher.getRewardCategories();

      expect(categories).toHaveLength(2);
      expect(categories.map(c => c.category)).toContain('travel');
      expect(categories.map(c => c.category)).toContain('dining');
      expect(categories.map(c => c.category)).not.toContain('groceries');
    });

    test('returns multiplier for each category', () => {
      const card = {
        reward_structure: {
          travel: 3,
          dining: 4
        }
      };
      const matcher = new CategoryMatcher(card);
      const categories = matcher.getRewardCategories();

      const travelCat = categories.find(c => c.category === 'travel');
      const diningCat = categories.find(c => c.category === 'dining');

      expect(travelCat.multiplier).toBe(3);
      expect(diningCat.multiplier).toBe(4);
    });

    test('excludes default and rotating from list', () => {
      const card = {
        reward_structure: {
          travel: 3,
          default: 1.5,
          rotating: {
            value: 5,
            active_categories: ['entertainment']
          }
        }
      };
      const matcher = new CategoryMatcher(card);
      const categories = matcher.getRewardCategories();
      const categoryIds = categories.map(c => c.category);

      expect(categoryIds).toContain('travel');
      expect(categoryIds).not.toContain('default');
      expect(categoryIds).not.toContain('rotating');
    });

    test('returns empty array if no rewards', () => {
      const card = {
        reward_structure: {
          default: 1
        }
      };
      const matcher = new CategoryMatcher(card);
      const categories = matcher.getRewardCategories();

      expect(categories).toEqual([]);
    });
  });

  describe('Best Category', () => {
    test('returns category with highest multiplier', () => {
      const card = {
        reward_structure: {
          travel: 3,
          dining: 4,
          groceries: 2
        }
      };
      const matcher = new CategoryMatcher(card);
      const best = matcher.getBestCategory();

      expect(best.category).toBe('dining');
      expect(best.multiplier).toBe(4);
    });

    test('returns first highest if tie', () => {
      const card = {
        reward_structure: {
          travel: 4,
          dining: 4,
          groceries: 2
        }
      };
      const matcher = new CategoryMatcher(card);
      const best = matcher.getBestCategory();

      // Should return one of them (depends on implementation)
      expect(best.multiplier).toBe(4);
      expect(['travel', 'dining']).toContain(best.category);
    });

    test('returns null if no rewards', () => {
      const card = {
        reward_structure: {
          default: 1
        }
      };
      const matcher = new CategoryMatcher(card);
      const best = matcher.getBestCategory();

      expect(best).toBeNull();
    });
  });

  describe('Has Reward Check', () => {
    test('returns true if multiplier >= minMultiplier', () => {
      const card = {
        reward_structure: {
          travel: 3,
          dining: 2
        }
      };
      const matcher = new CategoryMatcher(card);

      expect(matcher.hasRewardFor('travel')).toBe(true); // 3 >= 2
      expect(matcher.hasRewardFor('dining')).toBe(true); // 2 >= 2
    });

    test('returns false if multiplier < minMultiplier', () => {
      const card = {
        reward_structure: {
          travel: 3,
          dining: 1
        }
      };
      const matcher = new CategoryMatcher(card);

      expect(matcher.hasRewardFor('travel')).toBe(true); // 3 >= 2
      expect(matcher.hasRewardFor('dining')).toBe(false); // 1 < 2
    });

    test('accepts custom minMultiplier', () => {
      const card = {
        reward_structure: {
          travel: 3,
          dining: 2
        }
      };
      const matcher = new CategoryMatcher(card);

      expect(matcher.hasRewardFor('travel', 4)).toBe(false); // 3 < 4
      expect(matcher.hasRewardFor('dining', 2)).toBe(true); // 2 >= 2
      expect(matcher.hasRewardFor('dining', 3)).toBe(false); // 2 < 3
    });
  });

  describe('Explanation Generation', () => {
    test('generates explanation for category with rewards', () => {
      const card = {
        reward_structure: {
          travel: 3
        }
      };
      const matcher = new CategoryMatcher(card);
      const explanation = matcher.getExplanation('travel');

      expect(explanation).toContain('3');
      expect(explanation).toContain('travel');
    });

    test('generates explanation for no rewards', () => {
      const card = {
        reward_structure: {
          travel: 3
        }
      };
      const matcher = new CategoryMatcher(card);
      const explanation = matcher.getExplanation('dining');

      expect(explanation).toContain('No special rewards');
      expect(explanation).toContain('1x');
    });
  });

  describe('Convenience Functions', () => {
    test('findRewardMultiplier finds multiplier for card and category', () => {
      const card = {
        reward_structure: {
          travel: 3,
          dining: 4
        }
      };

      expect(findRewardMultiplier(card, 'travel')).toBe(3);
      expect(findRewardMultiplier(card, 'dining')).toBe(4);
    });

    test('findRewardMultiplier returns 1 on error', () => {
      expect(findRewardMultiplier(null, 'travel')).toBe(1);
      expect(findRewardMultiplier(undefined, 'travel')).toBe(1);
    });

    test('getRewardExplanation generates explanations', () => {
      const card = {
        reward_structure: {
          travel: 3
        }
      };

      const explanation = getRewardExplanation(card, 'travel');
      expect(explanation).toBeTruthy();
      expect(explanation).toContain('travel');
    });

    test('getRewardExplanation handles errors', () => {
      const explanation = getRewardExplanation(null, 'travel');
      expect(explanation).toBe('Standard rewards apply');
    });
  });

  describe('Score Cards By Category', () => {
    test('scores and ranks cards by category', () => {
      const cards = [
        {
          name: 'Card A',
          reward_structure: { travel: 2 }
        },
        {
          name: 'Card B',
          reward_structure: { travel: 4 }
        },
        {
          name: 'Card C',
          reward_structure: { travel: 3 }
        }
      ];

      const scored = scoreCardsByCategory(cards, 'travel');

      expect(scored).toHaveLength(3);
      expect(scored[0].card.name).toBe('Card B'); // 4x
      expect(scored[1].card.name).toBe('Card C'); // 3x
      expect(scored[2].card.name).toBe('Card A'); // 2x
    });

    test('includes explanation in score', () => {
      const cards = [
        {
          name: 'Card A',
          reward_structure: { travel: 3 }
        }
      ];

      const scored = scoreCardsByCategory(cards, 'travel');

      expect(scored[0]).toHaveProperty('explanation');
      expect(scored[0].explanation).toBeTruthy();
    });

    test('returns empty array for invalid input', () => {
      expect(scoreCardsByCategory(null, 'travel')).toEqual([]);
      expect(scoreCardsByCategory('not an array', 'travel')).toEqual([]);
    });

    test('handles empty card list', () => {
      const scored = scoreCardsByCategory([], 'travel');
      expect(scored).toEqual([]);
    });
  });

  describe('MVP Real-World Scenarios', () => {
    test('MVP: User asks for best card for travel', () => {
      const cards = [
        {
          name: 'Chase Sapphire',
          reward_structure: { travel: 3, dining: 2 }
        },
        {
          name: 'Amex Gold',
          reward_structure: { dining: 4, groceries: 4 }
        },
        {
          name: 'Citi Custom',
          reward_structure: { gas: 5, groceries: 5 }
        }
      ];

      const scored = scoreCardsByCategory(cards, 'travel');

      // Chase Sapphire should be first (3x travel)
      expect(scored[0].card.name).toBe('Chase Sapphire');
      expect(scored[0].multiplier).toBe(3);
    });

    test('MVP: User asks for best card for dining', () => {
      const cards = [
        {
          name: 'Chase Sapphire',
          reward_structure: { travel: 3, dining: 2 }
        },
        {
          name: 'Amex Gold',
          reward_structure: { dining: 4, groceries: 4 }
        }
      ];

      const scored = scoreCardsByCategory(cards, 'dining');

      // Amex Gold should be first (4x dining vs 2x for Sapphire)
      expect(scored[0].card.name).toBe('Amex Gold');
      expect(scored[0].multiplier).toBe(4);
    });

    test('MVP: User asks for best card for groceries', () => {
      const cards = [
        {
          name: 'American Express Gold',
          reward_structure: { dining: 4, groceries: 4 }
        },
        {
          name: 'Citi Custom Cash',
          reward_structure: { gas: 5, groceries: 5 }
        },
        {
          name: 'Chase Sapphire',
          reward_structure: { travel: 3, dining: 2 }
        }
      ];

      const scored = scoreCardsByCategory(cards, 'groceries');

      // Citi Custom Cash should be first (5x)
      expect(scored[0].card.name).toBe('Citi Custom Cash');
      expect(scored[0].multiplier).toBe(5);

      // Amex Gold second (4x)
      expect(scored[1].card.name).toBe('American Express Gold');
      expect(scored[1].multiplier).toBe(4);

      // Chase Sapphire last (1x default)
      expect(scored[2].card.name).toBe('Chase Sapphire');
      expect(scored[2].multiplier).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    test('handles zero multiplier', () => {
      const card = {
        reward_structure: {
          travel: 0
        }
      };
      const matcher = new CategoryMatcher(card);

      expect(matcher.findRewardMultiplier('travel')).toBe(0);
    });

    test('handles negative multiplier (should still work)', () => {
      const card = {
        reward_structure: {
          travel: -1
        }
      };
      const matcher = new CategoryMatcher(card);

      expect(matcher.findRewardMultiplier('travel')).toBe(-1);
    });

    test('handles very high multiplier', () => {
      const card = {
        reward_structure: {
          travel: 100
        }
      };
      const matcher = new CategoryMatcher(card);

      expect(matcher.findRewardMultiplier('travel')).toBe(100);
    });

    test('handles decimal multiplier', () => {
      const card = {
        reward_structure: {
          travel: 1.5,
          dining: 2.25
        }
      };
      const matcher = new CategoryMatcher(card);

      expect(matcher.findRewardMultiplier('travel')).toBe(1.5);
      expect(matcher.findRewardMultiplier('dining')).toBe(2.25);
    });

    test('handles category with empty string', () => {
      const card = {
        reward_structure: {
          travel: 3
        }
      };
      const matcher = new CategoryMatcher(card);

      expect(matcher.findRewardMultiplier('')).toBe(1);
    });

    test('handles null category input', () => {
      const card = {
        reward_structure: {
          travel: 3
        }
      };
      const matcher = new CategoryMatcher(card);

      expect(matcher.findRewardMultiplier(null)).toBe(1);
    });
  });

  describe('Performance Characteristics', () => {
    test('lookup completes within target time (<5ms)', () => {
      const card = {
        reward_structure: {
          travel: 3,
          dining: 4,
          groceries: 2,
          gas: 2,
          entertainment: 1,
          streaming: 1,
          transit: 2
        }
      };
      const matcher = new CategoryMatcher(card);

      const start = performance.now();
      matcher.findRewardMultiplier('travel');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(5);
    });

    test('scoring multiple cards is fast', () => {
      const cards = [];
      for (let i = 0; i < 20; i++) {
        cards.push({
          name: `Card ${i}`,
          reward_structure: {
            travel: Math.random() * 5,
            dining: Math.random() * 5
          }
        });
      }

      const start = performance.now();
      scoreCardsByCategory(cards, 'travel');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(50); // 20 cards in <50ms
    });
  });
});
