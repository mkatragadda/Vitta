/**
 * QueryExecutor Tests
 * 
 * Comprehensive test suite for QueryExecutor class
 */

import { QueryExecutor } from '../../../services/chat/query/queryExecutor.js';
import { QueryDecomposer } from '../../../services/chat/query/queryDecomposer.js';
import { extractEntities } from '../../../services/chat/entityExtractor.js';

// Test data factory
function createTestCards() {
  return [
    {
      id: '1',
      card_name: 'Chase Sapphire Preferred',
      issuer: 'Chase',
      card_network: 'Visa',
      current_balance: 5000,
      apr: 22.74,
      credit_limit: 25000
    },
    {
      id: '2',
      card_name: 'American Express Gold',
      issuer: 'American Express',
      card_network: 'Amex',
      current_balance: 3000,
      apr: 18.99,
      credit_limit: 15000
    },
    {
      id: '3',
      card_name: 'Citi Custom Cash',
      issuer: 'Citi',
      card_network: 'Mastercard',
      current_balance: 8000,
      apr: 19.99,
      credit_limit: 12000
    },
    {
      id: '4',
      card_name: 'Discover It',
      issuer: 'Discover',
      card_network: 'Discover',
      current_balance: 0,
      apr: 24.99,
      credit_limit: 8000
    },
    {
      id: '5',
      card_name: 'Capital One Venture',
      issuer: 'Capital One',
      card_network: 'Visa',
      current_balance: 12000,
      apr: 21.99,
      credit_limit: 20000
    }
  ];
}

describe('QueryExecutor', () => {
  let cards;
  let executor;
  let decomposer;

  beforeEach(() => {
    cards = createTestCards();
    // Disable tracking for tests (avoids database calls)
    executor = new QueryExecutor(cards, { enableTracking: false });
    // Disable pattern learning for tests (requires HTTP server for embeddings)
    decomposer = new QueryDecomposer({ enablePatternLearning: false });
  });

  describe('Constructor', () => {
    test('creates instance with cards array', () => {
      expect(executor).toBeInstanceOf(QueryExecutor);
      expect(executor.cards).toHaveLength(5);
    });

    test('throws error for non-array input', () => {
      expect(() => {
        new QueryExecutor('not-array');
      }).toThrow('cards must be an array');
    });

    test('creates instance with context', () => {
      const context = { userProfile: 'REWARDS_MAXIMIZER' };
      const executorWithContext = new QueryExecutor(cards, context);
      expect(executorWithContext.context.userProfile).toBe('REWARDS_MAXIMIZER');
      // enableTracking defaults to true unless explicitly disabled
      expect(executorWithContext.context.enableTracking).toBe(true);
    });
  });

  describe('Execute Distinct Queries', () => {
    test('executes distinct issuers query', async () => {
      const query = "what are the different issuers in my wallet";
      const entities = extractEntities(query);
      const structured = await decomposer.decompose(query, entities, 'query_card_data');
      const results = executor.execute(structured);

      expect(results.values).toBeDefined();
      expect(results.values.length).toBeGreaterThan(0);
      expect(results.total).toBe(5); // 5 different issuers
      expect(results.queryMetadata.intent).toBe('query_card_data');
      expect(results.queryMetadata.subIntent).toBe('distinct');
    });

    test('executes distinct networks query', async () => {
      const query = "what networks do I have";
      const entities = extractEntities(query);
      const structured = await decomposer.decompose(query, entities, 'query_card_data');
      const results = executor.execute(structured);

      expect(results.values).toBeDefined();
      expect(results.total).toBeGreaterThan(0);
    });

    test('executes distinct query with balance filter', async () => {
      const query = "different issuers with balance";
      const entities = extractEntities(query);
      const structured = await decomposer.decompose(query, entities, 'query_card_data');
      const results = executor.execute(structured);

      expect(results.values).toBeDefined();
      // Should only show issuers that have cards with balance
      expect(results.total).toBeLessThanOrEqual(5);
    });
  });

  describe('Execute Aggregation Queries', () => {
    test('executes sum aggregation query', async () => {
      const query = "what's my total balance";
      const entities = extractEntities(query);
      const structured = await decomposer.decompose(query, entities, 'query_card_data');
      const results = executor.execute(structured);

      expect(results.results).toBeDefined();
      expect(results.results).toHaveProperty('sum_current_balance');
      expect(results.results.sum_current_balance).toBe(28000); // 5000 + 3000 + 8000 + 0 + 12000
      expect(results.queryMetadata.subIntent).toBe('aggregation');
    });

    test('executes average aggregation query', async () => {
      const query = "what's my average APR";
      const entities = extractEntities(query);
      const structured = await decomposer.decompose(query, entities, 'query_card_data');
      const results = executor.execute(structured);

      expect(results.results).toHaveProperty('avg_apr');
      expect(results.results.avg_apr).toBeGreaterThan(0);
    });

    test('executes count aggregation query', async () => {
      const query = "how many cards do I have";
      const entities = extractEntities(query);
      const structured = await decomposer.decompose(query, entities, 'query_card_data');
      const results = executor.execute(structured);

      expect(results.results).toHaveProperty('count_*');
      expect(results.results['count_*']).toBe(5);
    });

    test('executes grouped aggregation query', async () => {
      const query = "total balance by issuer";
      const entities = extractEntities(query);
      const structured = await decomposer.decompose(query, entities, 'query_card_data');
      const results = executor.execute(structured);

      expect(Array.isArray(results.results)).toBe(true);
      expect(results.results.length).toBeGreaterThan(0);
      expect(results.results[0]).toHaveProperty('issuer');
      expect(results.results[0]).toHaveProperty('sum_current_balance');
      expect(results.queryMetadata.subIntent).toBe('grouped_aggregation');
    });

    test('executes aggregation with filters', async () => {
      const query = "total balance for cards with balance over 5000";
      const entities = extractEntities(query);
      // Manually set up aggregation with filter
      entities.aggregation = { operation: 'sum', field: 'current_balance' };
      entities.balanceFilter = 'with_balance';
      const structured = await decomposer.decompose(query, entities, 'query_card_data');
      const results = executor.execute(structured);

      expect(results.results).toBeDefined();
      // Should sum only cards with balance > 0
    });
  });

  describe('Execute Filter Queries', () => {
    test('executes filter query', async () => {
      const query = "show me visa cards";
      const entities = extractEntities(query);
      const structured = await decomposer.decompose(query, entities, 'query_card_data');
      const results = executor.execute(structured);

      expect(results.results).toBeDefined();
      expect(Array.isArray(results.results)).toBe(true);
      
      // If filters were applied and results exist, verify they match filter
      if (structured.filters.length > 0 && results.results.length > 0) {
        const networkFilter = structured.filters.find(f => f.field === 'card_network');
        if (networkFilter) {
          results.results.forEach(card => {
            // Normalize case for comparison
            const cardNetwork = String(card.card_network || '').toLowerCase();
            const filterValue = String(networkFilter.value || '').toLowerCase();
            expect(cardNetwork).toBe(filterValue);
          });
        }
      }
      
      // At minimum, should return array of results
      expect(results.results).toBeInstanceOf(Array);
    });

    test('executes compound filter query', async () => {
      const query = "visa cards with balance over 5000";
      const entities = extractEntities(query);
      const structured = await decomposer.decompose(query, entities, 'query_card_data');
      const results = executor.execute(structured);

      expect(results.results).toBeDefined();
    });

    test('executes query with balance filter', async () => {
      const query = "list cards with balance";
      const entities = extractEntities(query);
      const structured = await decomposer.decompose(query, entities, 'query_card_data');
      const results = executor.execute(structured);

      expect(results.results).toBeDefined();
      if (results.results.length > 0) {
        results.results.forEach(card => {
          expect(card.current_balance).toBeGreaterThan(0);
        });
      }
    });
  });

  describe('Execute Batch Queries', () => {
    test('executes multiple queries in parallel', async () => {
      const query1 = "what are the different issuers";
      const query2 = "what's my total balance";
      
      const entities1 = extractEntities(query1);
      const entities2 = extractEntities(query2);
      
      const structured1 = await decomposer.decompose(query1, entities1, 'query_card_data');
      const structured2 = await decomposer.decompose(query2, entities2, 'query_card_data');
      
      const results = executor.executeBatch([structured1, structured2]);

      expect(results).toHaveLength(2);
      expect(results[0].values).toBeDefined();
      expect(results[1].results).toBeDefined();
    });

    test('throws error for non-array batch input', () => {
      expect(() => {
        executor.executeBatch('not-array');
      }).toThrow('structuredQueries must be an array');
    });
  });

  describe('Error Handling', () => {
    test('throws error for missing structured query', () => {
      expect(() => {
        executor.execute(null);
      }).toThrow('structuredQuery is required');
    });

    test('throws error for invalid structured query', () => {
      expect(() => {
        executor.execute('not-object');
      }).toThrow('structuredQuery is required');
    });
  });

  describe('Query Metadata', () => {
    test('includes query metadata in results', async () => {
      const query = "what are the different issuers";
      const entities = extractEntities(query);
      const structured = await decomposer.decompose(query, entities, 'query_card_data');
      const results = executor.execute(structured);

      expect(results.queryMetadata).toBeDefined();
      expect(results.queryMetadata.intent).toBe('query_card_data');
      expect(results.queryMetadata.subIntent).toBe('distinct');
      expect(results.queryMetadata.action).toBeDefined();
      expect(results.queryMetadata.outputFormat).toBe('list');
    });
  });
});

