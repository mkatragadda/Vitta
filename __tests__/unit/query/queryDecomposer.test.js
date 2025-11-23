/**
 * QueryDecomposer Tests
 * 
 * Comprehensive test suite for QueryDecomposer class
 */

import { QueryDecomposer } from '../../../services/chat/query/queryDecomposer.js';
import { extractEntities } from '../../../services/chat/entityExtractor.js';

describe('QueryDecomposer', () => {
  let decomposer;

  beforeEach(() => {
    // Disable pattern learning for tests (requires HTTP server for embeddings)
    decomposer = new QueryDecomposer({ enablePatternLearning: false });
  });

  describe('Constructor', () => {
    test('creates instance with default context', () => {
      expect(decomposer).toBeInstanceOf(QueryDecomposer);
      expect(decomposer.context).toBeDefined();
      expect(decomposer.context.activeFilters).toEqual([]);
    });

    test('creates instance with custom context', () => {
      const context = {
        userProfile: 'REWARDS_MAXIMIZER',
        activeFilters: [{ field: 'issuer', operator: '==', value: 'Chase' }]
      };
      const customDecomposer = new QueryDecomposer(context);
      expect(customDecomposer.context.userProfile).toBe('REWARDS_MAXIMIZER');
      expect(customDecomposer.context.activeFilters).toHaveLength(1);
    });
  });

  describe('Distinct Query Decomposition', () => {
    test('decomposes distinct issuers query', async () => {
      const query = "what are the different issuers in my wallet";
      const entities = extractEntities(query);
      const structured = await decomposer.decompose(query, entities, 'query_card_data');

      expect(structured.intent).toBe('query_card_data');
      expect(structured.subIntent).toBe('distinct');
      expect(structured.distinct).toBeDefined();
      expect(structured.distinct.field).toBe('issuer');
      // includeCount defaults to true for distinct queries
      expect(structured.distinct.includeCount).toBe(true);
      expect(structured.outputFormat).toBe('list');
    });

    test('decomposes distinct networks query', async () => {
      const query = "what networks do I have";
      const entities = extractEntities(query);
      const structured = await decomposer.decompose(query, entities, 'query_card_data');

      expect(structured.subIntent).toBe('distinct');
      expect(structured.distinct.field).toBe('card_network');
    });

    test('decomposes distinct query with count', async () => {
      const query = "how many different issuers do I have";
      const entities = extractEntities(query);
      const structured = await decomposer.decompose(query, entities, 'query_card_data');

      expect(structured.distinct.includeCount).toBe(true);
    });

    test('decomposes distinct query with balance filter', async () => {
      const query = "different issuers with balance";
      const entities = extractEntities(query);
      const structured = await decomposer.decompose(query, entities, 'query_card_data');

      expect(structured.distinct).toBeDefined();
      expect(structured.filters.length).toBeGreaterThan(0);
      expect(structured.filters[0].field).toBe('current_balance');
      expect(structured.filters[0].operator).toBe('>');
    });

    test('decomposes distinct query with breakdown', async () => {
      const query = "breakdown by issuer";
      const entities = extractEntities(query);
      const structured = await decomposer.decompose(query, entities, 'query_card_data');

      expect(structured.distinct).toBeDefined();
      expect(structured.distinct.includeDetails).toBe(true);
    });
  });

  describe('Aggregation Query Decomposition', () => {
    test('decomposes sum aggregation query', async () => {
      const query = "what's my total balance";
      const entities = extractEntities(query);
      const structured = await decomposer.decompose(query, entities, 'query_card_data');

      expect(structured.subIntent).toBe('aggregation');
      expect(structured.aggregations).toHaveLength(1);
      expect(structured.aggregations[0].operation).toBe('sum');
      expect(structured.aggregations[0].field).toBe('current_balance');
      expect(structured.outputFormat).toBe('summary');
    });

    test('decomposes average aggregation query', async () => {
      const query = "what's my average APR";
      const entities = extractEntities(query);
      const structured = await decomposer.decompose(query, entities, 'query_card_data');

      expect(structured.aggregations[0].operation).toBe('avg');
      expect(structured.aggregations[0].field).toBe('apr');
    });

    test('decomposes count aggregation query', async () => {
      const query = "how many cards do I have";
      const entities = extractEntities(query);
      const structured = await decomposer.decompose(query, entities, 'query_card_data');

      expect(structured.aggregations[0].operation).toBe('count');
      expect(structured.aggregations[0].field).toBeNull(); // Count doesn't need field
    });

    test('decomposes grouped aggregation query', async () => {
      const query = "total balance by issuer";
      const entities = extractEntities(query);
      const structured = await decomposer.decompose(query, entities, 'query_card_data');

      expect(structured.subIntent).toBe('grouped_aggregation');
      expect(structured.grouping).toBe('issuer');
      expect(structured.aggregations[0].operation).toBe('sum');
    });

    test('decomposes aggregation with sorting (highest)', async () => {
      const query = "what's my highest balance";
      const entities = extractEntities(query);
      entities.modifier = 'highest';
      entities.attribute = 'balance';
      const structured = await decomposer.decompose(query, entities, 'query_card_data');

      expect(structured.sorting).toBeDefined();
      expect(structured.sorting.direction).toBe('desc');
      expect(structured.sorting.limit).toBe(1);
    });

    test('decomposes aggregation with sorting (lowest)', async () => {
      const query = "what's my lowest APR";
      const entities = extractEntities(query);
      entities.modifier = 'lowest';
      entities.attribute = 'apr';
      const structured = await decomposer.decompose(query, entities, 'query_card_data');

      expect(structured.sorting).toBeDefined();
      expect(structured.sorting.direction).toBe('asc');
    });
  });

  describe('Compound Filter Decomposition', () => {
    test('decomposes compound filter with AND', async () => {
      const query = "visa cards with balance over 5000 and APR less than 25";
      const entities = extractEntities(query);
      const structured = await decomposer.decompose(query, entities, 'query_card_data');

      expect(structured.subIntent).toBe('filter');
      expect(structured.filters.length).toBeGreaterThan(0);
    });

    test('decomposes compound filter with OR', async () => {
      const query = "chase or citi cards";
      const entities = extractEntities(query);
      const structured = await decomposer.decompose(query, entities, 'query_card_data');

      expect(structured.filters.length).toBeGreaterThan(0);
    });

    test('decomposes compound filter with network and balance', async () => {
      const query = "visa cards with balance over 5000";
      const entities = extractEntities(query);
      const structured = await decomposer.decompose(query, entities, 'query_card_data');

      expect(structured.filters.some(f => f.field === 'card_network')).toBe(true);
    });
  });

  describe('Simple Query Decomposition', () => {
    test('decomposes simple listing query', async () => {
      const query = "show me my cards";
      const entities = extractEntities(query);
      const structured = await decomposer.decompose(query, entities, 'query_card_data');

      expect(structured.subIntent).toBe('listing');
      expect(structured.outputFormat).toBe('table');
    });

    test('decomposes query with balance filter', async () => {
      const query = "list cards with balance";
      const entities = extractEntities(query);
      const structured = await decomposer.decompose(query, entities, 'query_card_data');

      expect(structured.filters.length).toBeGreaterThan(0);
      expect(structured.filters[0].field).toBe('current_balance');
    });

    test('decomposes query with sorting', async () => {
      const query = "show me cards with highest balance";
      const entities = extractEntities(query);
      entities.modifier = 'highest';
      entities.attribute = 'balance';
      const structured = await decomposer.decompose(query, entities, 'query_card_data');

      expect(structured.sorting).toBeDefined();
      expect(structured.sorting.field).toBe('current_balance');
      expect(structured.sorting.direction).toBe('desc');
    });
  });

  describe('Context Management', () => {
    test('updates context after query execution', async () => {
      const query = "show me my cards";
      const entities = extractEntities(query);
      const structured = await decomposer.decompose(query, entities, 'query_card_data');
      const results = { results: [], metadata: {} };

      decomposer.updateContext(structured, results);

      expect(decomposer.context.previousQuery).toEqual(structured);
      expect(decomposer.context.activeFilters).toEqual(structured.filters);
      expect(decomposer.context.lastResults).toEqual(results);
    });

    test('preserves user profile in context', () => {
      const context = { userProfile: 'REWARDS_MAXIMIZER' };
      const customDecomposer = new QueryDecomposer(context);
      customDecomposer.context.activeFilters = [{ field: 'issuer', operator: '==', value: 'Chase' }];
      customDecomposer.context.previousQuery = { intent: 'query_card_data' };

      // Context is managed via updateContext, userProfile is preserved
      expect(customDecomposer.context.userProfile).toBe('REWARDS_MAXIMIZER');
      expect(customDecomposer.context.activeFilters).toHaveLength(1);
    });
  });

  describe('Field Mapping', () => {
    test('maps natural language fields to database fields', async () => {
      const query = "what are the different issuers";
      const entities = extractEntities(query);
      entities.distinctQuery.field = 'issuer';
      const structured = await decomposer.decompose(query, entities, 'query_card_data');

      expect(structured.distinct.field).toBe('issuer');
    });

    test('maps "balance" to "current_balance"', async () => {
      const query = "total balance";
      const entities = extractEntities(query);
      entities.aggregation = { operation: 'sum', field: 'balance' };
      const structured = await decomposer.decompose(query, entities, 'query_card_data');

      expect(structured.aggregations[0].field).toBe('current_balance');
    });
  });

  describe('Error Handling', () => {
    test('throws error for missing query', async () => {
      await expect(
        decomposer.decompose(null, {}, 'query_card_data')
      ).rejects.toThrow('query and entities are required');
    });

    test('throws error for missing entities', async () => {
      await expect(
        decomposer.decompose("test query", null, 'query_card_data')
      ).rejects.toThrow('query and entities are required');
    });
  });

  describe('Edge Cases', () => {
    test('handles empty entities', async () => {
      const query = "test query";
      const entities = {};
      const structured = await decomposer.decompose(query, entities, 'query_card_data');

      expect(structured).toBeDefined();
      expect(structured.intent).toBe('query_card_data');
      expect(structured.subIntent).toBe('listing');
    });

    test('handles query with no detectable patterns', async () => {
      const query = "hello";
      const entities = extractEntities(query);
      const structured = await decomposer.decompose(query, entities, 'query_card_data');

      expect(structured).toBeDefined();
      expect(structured.subIntent).toBe('listing'); // Defaults to listing
    });
  });
});

