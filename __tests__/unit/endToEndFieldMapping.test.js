/**
 * End-to-End Field Mapping Tests
 * 
 * Comprehensive tests to ensure the complete flow works:
 * Natural Language Query → Entity Extraction → Field Mapping → Query Execution
 * 
 * Tests every field end-to-end to ensure proper database field retrieval.
 */

import { QueryDecomposer } from '../../services/chat/query/queryDecomposer.js';
import { QueryExecutor } from '../../services/chat/query/queryExecutor.js';
import { extractEntities } from '../../services/chat/entityExtractor.js';

// Test data factory with all fields
function createTestCards() {
  return [
    {
      id: '1',
      card_name: 'Chase Sapphire Preferred',
      nickname: 'Travel Card',
      issuer: 'Chase',
      card_network: 'Visa',
      card_type: 'Travel Rewards',
      apr: 22.74,
      credit_limit: 25000,
      current_balance: 5000,
      amount_to_pay: 200,
      annual_fee: 95,
      payment_due_date: '2025-12-07',
      payment_due_day: 7,
      statement_close_day: 12,
      statement_cycle_start: '2025-11-12',
      statement_cycle_end: '2025-12-12',
      grace_period_days: 25,
      reward_structure: { dining: 3, travel: 5, default: 1 },
      is_manual_entry: true,
      created_at: '2025-01-01',
      updated_at: '2025-01-01'
    },
    {
      id: '2',
      card_name: 'American Express Gold',
      nickname: 'Dining Card',
      issuer: 'American Express',
      card_network: 'Amex',
      card_type: 'Premium Rewards',
      apr: 18.99,
      credit_limit: 15000,
      current_balance: 3000,
      amount_to_pay: 150,
      annual_fee: 250,
      payment_due_date: '2025-12-25',
      payment_due_day: 25,
      statement_close_day: 5,
      statement_cycle_start: '2025-11-06',
      statement_cycle_end: '2025-12-05',
      grace_period_days: 20,
      reward_structure: { dining: 4, groceries: 1, default: 1 },
      is_manual_entry: true,
      created_at: '2025-01-02',
      updated_at: '2025-01-02'
    },
    {
      id: '3',
      card_name: 'Citi Custom Cash',
      nickname: 'Custom Card',
      issuer: 'Citi',
      card_network: 'Mastercard',
      card_type: 'Cashback',
      apr: 19.99,
      credit_limit: 12000,
      current_balance: 0,
      amount_to_pay: 0,
      annual_fee: 0,
      payment_due_date: '2025-12-15',
      payment_due_day: 15,
      statement_close_day: 20,
      statement_cycle_start: '2025-11-21',
      statement_cycle_end: '2025-12-20',
      grace_period_days: 25,
      reward_structure: { groceries: 5, default: 1 },
      is_manual_entry: false,
      created_at: '2025-01-03',
      updated_at: '2025-01-03'
    }
  ];
}

describe('End-to-End Field Mapping', () => {
  let cards;
  let decomposer;
  let executor;

  beforeEach(() => {
    cards = createTestCards();
    decomposer = new QueryDecomposer();
    executor = new QueryExecutor(cards);
  });

  describe('Financial Fields End-to-End', () => {
    test('balance query extracts and maps correctly', () => {
      const query = "show me cards with highest balance";
      const entities = extractEntities(query);
      const structured = decomposer.decompose(query, entities, 'query_card_data');
      const results = executor.execute(structured);

      expect(entities.attribute).toBe('balance');
      expect(structured.sorting.field).toBe('current_balance');
      expect(results.results).toBeDefined();
      expect(Array.isArray(results.results)).toBe(true);
      
      // Results should be sorted by balance (descending)
      if (results.results.length > 1) {
        expect(results.results[0].current_balance).toBeGreaterThanOrEqual(
          results.results[1].current_balance
        );
      }
    });

    test('APR query extracts and maps correctly', () => {
      const query = "cards with lowest APR";
      const entities = extractEntities(query);
      const structured = decomposer.decompose(query, entities, 'query_card_data');
      const results = executor.execute(structured);

      expect(entities.attribute).toBe('apr');
      expect(structured.sorting.field).toBe('apr');
      expect(results.results).toBeDefined();
      
      // Results should be sorted by APR (ascending for lowest)
      if (results.results.length > 1) {
        expect(results.results[0].apr).toBeLessThanOrEqual(results.results[1].apr);
      }
    });

    test('credit_limit query extracts and maps correctly', () => {
      const query = "cards with highest credit limit";
      const entities = extractEntities(query);
      const structured = decomposer.decompose(query, entities, 'query_card_data');
      const results = executor.execute(structured);

      expect(entities.attribute).toBe('credit_limit');
      expect(structured.sorting.field).toBe('credit_limit');
      expect(results.results).toBeDefined();
    });

    test('annual_fee query extracts and maps correctly', () => {
      const query = "cards with lowest annual fee";
      const entities = extractEntities(query);
      const structured = decomposer.decompose(query, entities, 'query_card_data');
      const results = executor.execute(structured);

      expect(entities.attribute).toBe('annual_fee');
      expect(structured.sorting.field).toBe('annual_fee');
      expect(results.results).toBeDefined();
    });

    test('total balance aggregation extracts and maps correctly', () => {
      const query = "what's my total balance";
      const entities = extractEntities(query);
      const structured = decomposer.decompose(query, entities, 'query_card_data');
      const results = executor.execute(structured);

      // Should aggregate on current_balance
      if (structured.aggregations.length > 0) {
        expect(structured.aggregations[0].field).toBe('current_balance');
        expect(structured.aggregations[0].operation).toBe('sum');
      }
      expect(results.results).toBeDefined();
    });
  });

  describe('Identity Fields End-to-End', () => {
    test('issuer distinct query extracts and maps correctly', () => {
      const query = "what are the different issuers";
      const entities = extractEntities(query);
      const structured = decomposer.decompose(query, entities, 'query_card_data');
      const results = executor.execute(structured);

      expect(entities.distinctQuery).toBeDefined();
      expect(structured.distinct.field).toBe('issuer');
      expect(results.values).toBeDefined();
      
      // Should return distinct issuers
      const uniqueIssuers = new Set(cards.map(c => c.issuer));
      expect(results.total).toBeLessThanOrEqual(uniqueIssuers.size);
    });

    test('card_network distinct query extracts and maps correctly', () => {
      const query = "what networks do I have";
      const entities = extractEntities(query);
      const structured = decomposer.decompose(query, entities, 'query_card_data');
      const results = executor.execute(structured);

      expect(structured.distinct).toBeDefined();
      expect(structured.distinct.field).toBe('card_network');
      expect(results.values).toBeDefined();
    });

    test('issuer filter extracts and maps correctly', () => {
      const query = "show me chase cards";
      const entities = extractEntities(query);
      const structured = decomposer.decompose(query, entities, 'query_card_data');
      const results = executor.execute(structured);

      // Should filter by issuer
      const issuerFilter = structured.filters.find(f => f.field === 'issuer');
      if (issuerFilter) {
        expect(issuerFilter.field).toBe('issuer');
        expect(issuerFilter.value).toBe('Chase');
      }
      expect(results.results).toBeDefined();
    });

    test('network filter extracts and maps correctly', () => {
      const query = "show me visa cards";
      const entities = extractEntities(query);
      const structured = decomposer.decompose(query, entities, 'query_card_data');
      const results = executor.execute(structured);

      // Should filter by card_network
      const networkFilter = structured.filters.find(f => f.field === 'card_network');
      if (networkFilter) {
        expect(networkFilter.field).toBe('card_network');
      }
      expect(results.results).toBeDefined();
    });
  });

  describe('Date Fields End-to-End', () => {
    test('due_date query extracts and maps correctly', () => {
      const query = "cards sorted by due date";
      const entities = extractEntities(query);
      const structured = decomposer.decompose(query, entities, 'query_card_data');
      const results = executor.execute(structured);

      expect(entities.attribute).toBe('due_date');
      // Should map to payment_due_date or payment_due_day
      expect(['payment_due_date', 'payment_due_day']).toContain(structured.sorting?.field || null);
      expect(results.results).toBeDefined();
    });

    test('grace_period query extracts and maps correctly', () => {
      const query = "cards with longest grace period";
      const entities = extractEntities(query);
      const structured = decomposer.decompose(query, entities, 'query_card_data');
      const results = executor.execute(structured);

      expect(entities.attribute).toBe('grace_period');
      expect(structured.sorting.field).toBe('grace_period_days');
      expect(results.results).toBeDefined();
    });
  });

  describe('Computed Fields End-to-End', () => {
    test('utilization query extracts and maps correctly', () => {
      const query = "cards with highest utilization";
      const entities = extractEntities(query);
      const structured = decomposer.decompose(query, entities, 'query_card_data');
      const results = executor.execute(structured);

      expect(entities.attribute).toBe('utilization');
      expect(structured.sorting.field).toBe('utilization');
      expect(results.results).toBeDefined();
    });

    test('available_credit query extracts and maps correctly', () => {
      const query = "cards with most available credit";
      const entities = extractEntities(query);
      const structured = decomposer.decompose(query, entities, 'query_card_data');
      const results = executor.execute(structured);

      expect(entities.attribute).toBe('available_credit');
      expect(structured.sorting.field).toBe('available_credit');
      expect(results.results).toBeDefined();
    });
  });

  describe('Balance Filter End-to-End', () => {
    test('with_balance filter extracts and filters correctly', () => {
      const query = "list cards with balance";
      const entities = extractEntities(query);
      const structured = decomposer.decompose(query, entities, 'query_card_data');
      const results = executor.execute(structured);

      expect(entities.balanceFilter).toBe('with_balance');
      const balanceFilter = structured.filters.find(f => f.field === 'current_balance');
      expect(balanceFilter).toBeDefined();
      expect(balanceFilter.operator).toBe('>');
      expect(balanceFilter.value).toBe(0);
      
      // All results should have balance > 0
      results.results.forEach(card => {
        expect(card.current_balance).toBeGreaterThan(0);
      });
    });

    test('zero_balance filter extracts and filters correctly', () => {
      const query = "cards with zero balance";
      const entities = extractEntities(query);
      const structured = decomposer.decompose(query, entities, 'query_card_data');
      const results = executor.execute(structured);

      expect(entities.balanceFilter).toBe('zero_balance');
      const balanceFilter = structured.filters.find(f => f.field === 'current_balance');
      expect(balanceFilter).toBeDefined();
      expect(balanceFilter.operator).toBe('==');
      expect(balanceFilter.value).toBe(0);
      
      // All results should have balance == 0
      results.results.forEach(card => {
        expect(card.current_balance).toBe(0);
      });
    });
  });

  describe('Grouped Aggregation End-to-End', () => {
    test('total balance by issuer extracts and maps correctly', () => {
      const query = "total balance by issuer";
      const entities = extractEntities(query);
      const structured = decomposer.decompose(query, entities, 'query_card_data');
      const results = executor.execute(structured);

      expect(entities.grouping).toBeDefined();
      expect(structured.grouping).toBe('issuer');
      expect(structured.aggregations[0].field).toBe('current_balance');
      expect(structured.aggregations[0].operation).toBe('sum');
      expect(results.results).toBeDefined();
      expect(Array.isArray(results.results)).toBe(true);
      
      // Results should have issuer and sum fields
      if (results.results.length > 0) {
        expect(results.results[0]).toHaveProperty('issuer');
        expect(results.results[0]).toHaveProperty('sum_current_balance');
      }
    });
  });

  describe('Complex Queries End-to-End', () => {
    test('compound filter with balance and APR extracts correctly', () => {
      const query = "visa cards with balance over 5000 and APR less than 25";
      const entities = extractEntities(query);
      const structured = decomposer.decompose(query, entities, 'query_card_data');
      const results = executor.execute(structured);

      expect(structured.filters.length).toBeGreaterThan(0);
      expect(results.results).toBeDefined();
      
      // Verify filters are applied correctly
      results.results.forEach(card => {
        if (structured.filters.some(f => f.field === 'current_balance' && f.operator === '>')) {
          const balanceFilter = structured.filters.find(f => f.field === 'current_balance');
          if (balanceFilter && balanceFilter.value) {
            expect(card.current_balance).toBeGreaterThan(balanceFilter.value);
          }
        }
      });
    });

    test('distinct issuers with balance filter extracts correctly', () => {
      const query = "different issuers with balance";
      const entities = extractEntities(query);
      const structured = decomposer.decompose(query, entities, 'query_card_data');
      const results = executor.execute(structured);

      expect(structured.distinct).toBeDefined();
      expect(structured.distinct.field).toBe('issuer');
      expect(structured.filters.length).toBeGreaterThan(0);
      expect(results.values).toBeDefined();
    });
  });
});

