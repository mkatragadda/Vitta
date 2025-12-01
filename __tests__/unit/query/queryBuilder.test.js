/**
 * QueryBuilder Tests
 * 
 * Comprehensive test suite for QueryBuilder class
 */

import { QueryBuilder } from '../../../services/chat/query/queryBuilder.js';

// Test data factory
function createTestCards() {
  return [
    {
      id: '1',
      card_name: 'Chase Sapphire Preferred',
      nickname: 'Chase Sapphire',
      issuer: 'Chase',
      card_network: 'Visa',
      card_type: 'Travel Rewards',
      apr: 22.74,
      credit_limit: 25000,
      current_balance: 5000,
      amount_to_pay: 100,
      annual_fee: 95
    },
    {
      id: '2',
      card_name: 'American Express Gold',
      nickname: 'Amex Gold',
      issuer: 'American Express',
      card_network: 'Amex',
      card_type: 'Premium Rewards',
      apr: 18.99,
      credit_limit: 15000,
      current_balance: 3000,
      amount_to_pay: 50,
      annual_fee: 250
    },
    {
      id: '3',
      card_name: 'Citi Custom Cash',
      nickname: 'Citi Custom Cash',
      issuer: 'Citi',
      card_network: 'Mastercard',
      card_type: 'Cashback',
      apr: 19.99,
      credit_limit: 12000,
      current_balance: 8000,
      amount_to_pay: 150,
      annual_fee: 0
    },
    {
      id: '4',
      card_name: 'Discover It',
      nickname: 'Discover It',
      issuer: 'Discover',
      card_network: 'Discover',
      card_type: 'Cashback',
      apr: 24.99,
      credit_limit: 8000,
      current_balance: 0,
      amount_to_pay: 0,
      annual_fee: 0
    },
    {
      id: '5',
      card_name: 'Capital One Venture',
      nickname: 'Capital One Venture',
      issuer: 'Capital One',
      card_network: 'Visa',
      card_type: 'Travel Rewards',
      apr: 21.99,
      credit_limit: 20000,
      current_balance: 12000,
      amount_to_pay: 200,
      annual_fee: 95
    }
  ];
}

describe('QueryBuilder', () => {
  let cards;
  let builder;

  beforeEach(() => {
    cards = createTestCards();
    builder = new QueryBuilder(cards);
  });

  describe('Constructor', () => {
    test('creates instance with cards array', () => {
      expect(builder).toBeInstanceOf(QueryBuilder);
      expect(builder.cards).toHaveLength(5);
    });

    test('clones cards array to avoid mutation', () => {
      const originalCards = createTestCards();
      const builder = new QueryBuilder(originalCards);
      
      originalCards[0].current_balance = 99999;
      
      // Builder's cards should not be affected
      expect(builder.cards[0].current_balance).not.toBe(99999);
    });

    test('throws error for non-array input', () => {
      expect(() => {
        new QueryBuilder('not-array');
      }).toThrow('expected array');
    });

    test('handles empty array', () => {
      const emptyBuilder = new QueryBuilder([]);
      expect(emptyBuilder.cards).toHaveLength(0);
    });
  });

  describe('Filtering', () => {
    test('filters by exact string match (case-insensitive)', () => {
      const result = builder
        .filter('card_network', '==', 'Visa')
        .execute();
      
      expect(result.results).toHaveLength(2);
      expect(result.results.every(c => c.card_network === 'Visa')).toBe(true);
    });

    test('filters by numeric comparison', () => {
      const result = builder
        .filter('current_balance', '>', 5000)
        .execute();
      
      expect(result.results).toHaveLength(2);
      expect(result.results.every(c => c.current_balance > 5000)).toBe(true);
    });

    test('filters with multiple AND conditions', () => {
      const result = builder
        .filter('card_network', '==', 'Visa')
        .filter('current_balance', '>', 5000)
        .execute();
      
      expect(result.results).toHaveLength(1);
      expect(result.results[0].card_network).toBe('Visa');
      expect(result.results[0].current_balance).toBeGreaterThan(5000);
    });

    test('filters with OR condition', () => {
      const result = builder
        .filter('issuer', '==', 'Chase', 'OR')
        .filter('issuer', '==', 'Citi', 'OR')
        .execute();
      
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.results.some(c => c.issuer === 'Chase' || c.issuer === 'Citi')).toBe(true);
    });

    test('filters with "in" operator', () => {
      const result = builder
        .filter('issuer', 'in', ['Chase', 'Citi', 'American Express'])
        .execute();
      
      expect(result.results).toHaveLength(3);
    });

    test('filters with "between" operator', () => {
      const result = builder
        .filter('apr', 'between', [19, 23])
        .execute();
      
      expect(result.results.length).toBeGreaterThan(0);
      result.results.forEach(card => {
        expect(card.apr).toBeGreaterThanOrEqual(19);
        expect(card.apr).toBeLessThanOrEqual(23);
      });
    });

    test('filters with "contains" operator', () => {
      const result = builder
        .filter('card_name', 'contains', 'Sapphire')
        .execute();
      
      expect(result.results).toHaveLength(1);
      expect(result.results[0].card_name).toContain('Sapphire');
    });

    test('filters with custom function', () => {
      const result = builder
        .filterWhere(card => card.current_balance > card.credit_limit * 0.5)
        .execute();
      
      expect(result.results.length).toBeGreaterThan(0);
      result.results.forEach(card => {
        expect(card.current_balance).toBeGreaterThan(card.credit_limit * 0.5);
      });
    });

    test('handles null/undefined field values', () => {
      const cardsWithNulls = [
        { id: '1', issuer: 'Chase', current_balance: 1000 },
        { id: '2', issuer: null, current_balance: 2000 },
        { id: '3', issuer: 'Citi', current_balance: null }
      ];
      
      const result = new QueryBuilder(cardsWithNulls)
        .filter('current_balance', '>', 500)
        .execute();
      
      expect(result.results).toHaveLength(2);
    });

    test('returns empty array when no filters match', () => {
      const result = builder
        .filter('issuer', '==', 'NonExistent')
        .execute();
      
      expect(result.results).toHaveLength(0);
    });
  });

  describe('Distinct Operations', () => {
    test('gets distinct issuers', () => {
      const result = builder
        .distinct('issuer')
        .execute();
      
      expect(result.values).toHaveLength(5);
      expect(result.total).toBe(5);
    });

    test('gets distinct issuers with count', () => {
      const result = builder
        .distinct('issuer', { includeCount: true })
        .execute();
      
      expect(result.values).toHaveLength(5);
      result.values.forEach(item => {
        expect(item).toHaveProperty('value');
        expect(item).toHaveProperty('count');
        expect(item.count).toBe(1); // Each issuer appears once
      });
    });

    test('gets distinct card networks', () => {
      const result = builder
        .distinct('card_network')
        .execute();
      
      expect(result.values.length).toBeGreaterThan(0);
      const networks = result.values.map(v => v.value);
      expect(networks).toContain('Visa');
      expect(networks).toContain('Amex');
    });

    test('distinct with limit', () => {
      const result = builder
        .distinct('issuer', { includeCount: true })
        .limit(3)
        .execute();
      
      expect(result.values.length).toBeLessThanOrEqual(3);
    });

    test('distinct ignores null/undefined values', () => {
      const cardsWithNulls = [
        { id: '1', issuer: 'Chase' },
        { id: '2', issuer: null },
        { id: '3', issuer: 'Citi' },
        { id: '4', issuer: undefined }
      ];
      
      const result = new QueryBuilder(cardsWithNulls)
        .distinct('issuer')
        .execute();
      
      expect(result.values).toHaveLength(2);
    });

    test('distinct with filters', () => {
      const result = builder
        .filter('current_balance', '>', 0)
        .distinct('issuer', { includeCount: true })
        .execute();
      
      expect(result.values.length).toBeGreaterThan(0);
      // All distinct issuers should have cards with balance > 0
    });
  });

  describe('Aggregations', () => {
    test('sums current balance', () => {
      const result = builder
        .aggregate('sum', 'current_balance')
        .execute();
      
      expect(result.results).toHaveProperty('sum_current_balance');
      expect(result.results.sum_current_balance).toBe(28000);
    });

    test('calculates average APR', () => {
      const result = builder
        .aggregate('avg', 'apr')
        .execute();
      
      expect(result.results).toHaveProperty('avg_apr');
      expect(result.results.avg_apr).toBeCloseTo(21.74, 2);
    });

    test('counts cards', () => {
      const result = builder
        .aggregate('count', null)
        .execute();
      
      expect(result.results).toHaveProperty('count_*');
      expect(result.results['count_*']).toBe(5);
    });

    test('finds minimum balance', () => {
      const result = builder
        .aggregate('min', 'current_balance')
        .execute();
      
      expect(result.results).toHaveProperty('min_current_balance');
      expect(result.results.min_current_balance).toBe(0);
    });

    test('finds maximum balance', () => {
      const result = builder
        .aggregate('max', 'current_balance')
        .execute();
      
      expect(result.results).toHaveProperty('max_current_balance');
      expect(result.results.max_current_balance).toBe(12000);
    });

    test('counts distinct issuers', () => {
      const result = builder
        .aggregate('countDistinct', 'issuer')
        .execute();
      
      expect(result.results).toHaveProperty('countDistinct_issuer');
      expect(result.results.countDistinct_issuer).toBe(5);
    });

    test('grouped aggregation by issuer', () => {
      const result = builder
        .groupBy('issuer')
        .aggregate('sum', 'current_balance')
        .execute();
      
      expect(Array.isArray(result.results)).toBe(true);
      expect(result.results.length).toBeGreaterThan(0);
      result.results.forEach(item => {
        expect(item).toHaveProperty('issuer');
        expect(item).toHaveProperty('sum_current_balance');
      });
    });

    test('multiple aggregations', () => {
      const result = builder
        .aggregate('sum', 'current_balance')
        .aggregate('avg', 'apr')
        .execute();
      
      expect(result.results).toHaveProperty('sum_current_balance');
      expect(result.results).toHaveProperty('avg_apr');
    });

    test('aggregation with filters', () => {
      const result = builder
        .filter('current_balance', '>', 5000)
        .aggregate('sum', 'current_balance')
        .execute();
      
      expect(result.results.sum_current_balance).toBe(20000); // 8000 + 12000
    });
  });

  describe('Sorting', () => {
    test('sorts ascending by balance', () => {
      const result = builder
        .sort('current_balance', 'asc')
        .execute();
      
      expect(result.results[0].current_balance).toBe(0);
      expect(result.results[result.results.length - 1].current_balance).toBe(12000);
    });

    test('sorts descending by balance', () => {
      const result = builder
        .sort('current_balance', 'desc')
        .execute();
      
      expect(result.results[0].current_balance).toBe(12000);
      expect(result.results[result.results.length - 1].current_balance).toBe(0);
    });

    test('sorts by string field', () => {
      const result = builder
        .sort('issuer', 'asc')
        .execute();
      
      const issuers = result.results.map(c => c.issuer);
      const sorted = [...issuers].sort();
      expect(issuers).toEqual(sorted);
    });

    test('sort with limit', () => {
      const result = builder
        .sort('current_balance', 'desc', 3)
        .execute();
      
      expect(result.results).toHaveLength(3);
      expect(result.results[0].current_balance).toBe(12000);
    });

    test('sort with filters', () => {
      const result = builder
        .filter('current_balance', '>', 0)
        .sort('current_balance', 'asc')
        .execute();
      
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.results[0].current_balance).toBeGreaterThan(0);
    });
  });

  describe('Limit', () => {
    test('limits results', () => {
      const result = builder
        .limit(3)
        .execute();
      
      expect(result.results).toHaveLength(3);
    });

    test('limit with sorting', () => {
      const result = builder
        .sort('current_balance', 'desc')
        .limit(2)
        .execute();
      
      expect(result.results).toHaveLength(2);
      expect(result.results[0].current_balance).toBe(12000);
    });
  });

  describe('Field Selection', () => {
    test('selects specific fields', () => {
      const result = builder
        .select(['card_name', 'current_balance'])
        .execute();
      
      expect(result.results).toHaveLength(5);
      result.results.forEach(card => {
        expect(Object.keys(card)).toEqual(['card_name', 'current_balance']);
      });
    });

    test('select with filters', () => {
      const result = builder
        .filter('current_balance', '>', 5000)
        .select(['card_name', 'current_balance'])
        .execute();
      
      expect(result.results.length).toBeGreaterThan(0);
      result.results.forEach(card => {
        expect(Object.keys(card)).toEqual(['card_name', 'current_balance']);
      });
    });
  });

  describe('Complex Queries', () => {
    test('filter + sort + limit', () => {
      const result = builder
        .filter('current_balance', '>', 0)
        .sort('current_balance', 'desc')
        .limit(2)
        .execute();
      
      expect(result.results).toHaveLength(2);
      expect(result.results[0].current_balance).toBeGreaterThan(result.results[1].current_balance);
    });

    test('filter + distinct + count', () => {
      const result = builder
        .filter('current_balance', '>', 0)
        .distinct('issuer', { includeCount: true })
        .execute();
      
      expect(result.values.length).toBeGreaterThan(0);
    });

    test('grouped aggregation with sorting', () => {
      const result = builder
        .groupBy('issuer')
        .aggregate('sum', 'current_balance')
        .execute();
      
      expect(Array.isArray(result.results)).toBe(true);
      // Results should be sorted by sum descending
      if (result.results.length > 1) {
        expect(result.results[0].sum_current_balance).toBeGreaterThanOrEqual(
          result.results[1].sum_current_balance
        );
      }
    });
  });

  describe('Metadata', () => {
    test('includes execution metadata', () => {
      const result = builder
        .filter('issuer', '==', 'Chase')
        .execute();
      
      expect(result.metadata).toHaveProperty('count');
      expect(result.metadata).toHaveProperty('totalCards');
      expect(result.metadata).toHaveProperty('filtersApplied');
      expect(result.metadata).toHaveProperty('executionTime');
      expect(result.metadata.filtersApplied).toBe(1);
      expect(result.metadata.totalCards).toBe(5);
    });
  });

  describe('Clone and Reset', () => {
    test('clone creates independent instance', () => {
      builder.filter('issuer', '==', 'Chase');
      const cloned = builder.clone();
      
      cloned.filter('current_balance', '>', 1000);
      
      const originalResult = builder.execute();
      const clonedResult = cloned.execute();
      
      expect(clonedResult.results.length).toBeLessThanOrEqual(originalResult.results.length);
    });

    test('reset clears all state', () => {
      builder
        .filter('issuer', '==', 'Chase')
        .sort('current_balance', 'desc')
        .limit(5);
      
      builder.reset();
      
      const result = builder.execute();
      expect(result.results).toHaveLength(5); // All cards
      expect(result.metadata.filtersApplied).toBe(0);
    });
  });

  describe('Error Handling', () => {
    test('throws error for invalid field in filter', () => {
      expect(() => {
        builder.filter('', '==', 'value');
      }).toThrow();
    });

    test('throws error for invalid operator', () => {
      expect(() => {
        builder.filter('issuer', 'invalid', 'Chase');
      }).toThrow();
    });

    test('throws error for invalid logical operator', () => {
      expect(() => {
        builder.filter('issuer', '==', 'Chase', 'XOR');
      }).toThrow();
    });

    test('throws error for invalid aggregation', () => {
      expect(() => {
        builder.aggregate('invalid', 'field');
      }).toThrow();
    });

    test('throws error for invalid sort direction', () => {
      expect(() => {
        builder.sort('current_balance', 'invalid');
      }).toThrow();
    });

    test('throws error for negative limit', () => {
      expect(() => {
        builder.limit(-1);
      }).toThrow();
    });
  });

  describe('Edge Cases', () => {
    test('handles empty cards array', () => {
      const emptyBuilder = new QueryBuilder([]);
      const result = emptyBuilder
        .filter('issuer', '==', 'Chase')
        .execute();
      
      expect(result.results).toHaveLength(0);
      expect(result.metadata.count).toBe(0);
    });

    test('handles cards with missing fields', () => {
      const incompleteCards = [
        { id: '1', issuer: 'Chase' },
        { id: '2' }, // Missing issuer
        { id: '3', issuer: 'Citi' }
      ];
      
      const result = new QueryBuilder(incompleteCards)
        .filter('issuer', '==', 'Chase')
        .execute();
      
      expect(result.results).toHaveLength(1);
    });

    test('handles very large result sets', () => {
      const largeCardSet = Array.from({ length: 1000 }, (_, i) => ({
        id: `card-${i}`,
        issuer: `Issuer${i % 10}`,
        current_balance: i * 100
      }));
      
      const result = new QueryBuilder(largeCardSet)
        .filter('current_balance', '>', 50000)
        .sort('current_balance', 'asc')
        .limit(10)
        .execute();
      
      expect(result.results).toHaveLength(10);
    });
  });
});

