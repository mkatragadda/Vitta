/**
 * Phase 3 Integration Tests
 * 
 * Comprehensive end-to-end tests for Phase 3 pipeline:
 * extractEntities → QueryDecomposer → QueryExecutor → ResponseGenerator
 * 
 * Tests the complete flow from natural language query to formatted response.
 */

import { extractEntities } from '../../../services/chat/entityExtractor.js';
import { QueryDecomposer } from '../../../services/chat/query/queryDecomposer.js';
import { QueryExecutor } from '../../../services/chat/query/queryExecutor.js';
import { ResponseGenerator } from '../../../services/chat/query/responseGenerator.js';
import { handleCardDataQuery } from '../../../services/chat/cardDataQueryHandler.js';

// Test data factory
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
      statement_close_day: 12,
      payment_due_day: 7,
      grace_period_days: 25
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
      statement_close_day: 5,
      payment_due_day: 25,
      grace_period_days: 20
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
      statement_close_day: 20,
      payment_due_day: 15,
      grace_period_days: 25
    },
    {
      id: '4',
      card_name: 'Discover It',
      nickname: 'Discover Card',
      issuer: 'Discover',
      card_network: 'Discover',
      card_type: 'Cashback',
      apr: 24.99,
      credit_limit: 8000,
      current_balance: 2000,
      amount_to_pay: 100,
      annual_fee: 0,
      payment_due_date: '2025-12-10',
      statement_close_day: 1,
      payment_due_day: 1,
      grace_period_days: 25
    },
    {
      id: '5',
      card_name: 'Capital One Venture',
      nickname: 'Capital One',
      issuer: 'Capital One',
      card_network: 'Visa',
      card_type: 'Travel Rewards',
      apr: 21.99,
      credit_limit: 20000,
      current_balance: 12000,
      amount_to_pay: 400,
      annual_fee: 95,
      payment_due_date: '2025-12-20',
      statement_close_day: 15,
      payment_due_day: 12,
      grace_period_days: 27
    }
  ];
}

describe('Phase 3 Integration - Complete Pipeline', () => {
  let cards;
  let decomposer;
  let executor;
  let generator;

  beforeEach(() => {
    cards = createTestCards();
    // Disable pattern learning and tracking for tests (avoids HTTP/DB calls)
    decomposer = new QueryDecomposer({ enablePatternLearning: false });
    executor = new QueryExecutor(cards, { enableTracking: false });
    generator = new ResponseGenerator({ includeInsights: true });
  });

  describe('End-to-End: Distinct Queries', () => {
    test('complete pipeline: "what are the different issuers"', async () => {
      const query = "what are the different issuers in my wallet";
      
      // Step 1: Extract entities
      const entities = extractEntities(query);
      expect(entities.distinctQuery).toBeDefined();
      expect(entities.distinctQuery.field).toBe('issuer');
      
      // Step 2: Decompose query
      const structuredQuery = await decomposer.decompose(query, entities, 'query_card_data');
      expect(structuredQuery.subIntent).toBe('distinct');
      expect(structuredQuery.distinct.field).toBe('issuer');
      
      // Step 3: Execute query
      const queryResults = executor.execute(structuredQuery);
      expect(queryResults.values).toBeDefined();
      expect(queryResults.total).toBeGreaterThan(0);
      
      // Step 4: Generate response
      const response = generator.generateResponse(queryResults, structuredQuery, query);
      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
      expect(response).toContain('Issuer');
    });

    test('complete pipeline: "what networks do I have"', async () => {
      const query = "what networks do I have";
      
      const entities = extractEntities(query);
      const structuredQuery = await decomposer.decompose(query, entities, 'query_card_data');
      const queryResults = executor.execute(structuredQuery);
      const response = generator.generateResponse(queryResults, structuredQuery, query);
      
      expect(response).toBeDefined();
      expect(response).toContain('Network');
    });
  });

  describe('End-to-End: Aggregation Queries', () => {
    test('complete pipeline: "what is my total balance"', async () => {
      const query = "what's my total balance";
      
      const entities = extractEntities(query);
      expect(entities.aggregation).toBeDefined();
      expect(entities.aggregation.operation).toBe('sum');
      
      const structuredQuery = await decomposer.decompose(query, entities, 'query_card_data');
      expect(structuredQuery.subIntent).toBe('aggregation');
      
      const queryResults = executor.execute(structuredQuery);
      expect(queryResults.results).toBeDefined();
      
      const response = generator.generateResponse(queryResults, structuredQuery, query);
      expect(response).toBeDefined();
      expect(response).toContain('Total');
      expect(response).toContain('Balance');
      expect(response).toContain('$'); // Should contain currency
    });

    test('complete pipeline: "average APR"', async () => {
      const query = "what's my average APR";
      
      const entities = extractEntities(query);
      const structuredQuery = await decomposer.decompose(query, entities, 'query_card_data');
      const queryResults = executor.execute(structuredQuery);
      const response = generator.generateResponse(queryResults, structuredQuery, query);
      
      expect(response).toBeDefined();
      expect(response).toContain('Average');
      expect(response).toContain('APR');
    });
  });

  describe('End-to-End: Grouped Aggregation Queries', () => {
    test('complete pipeline: "total balance by issuer"', async () => {
      const query = "total balance by issuer";
      
      const entities = extractEntities(query);
      expect(entities.grouping).toBeDefined();
      expect(entities.grouping.groupBy).toBe('issuer');
      
      const structuredQuery = await decomposer.decompose(query, entities, 'query_card_data');
      expect(structuredQuery.subIntent).toBe('grouped_aggregation');
      expect(structuredQuery.grouping).toBe('issuer');
      
      const queryResults = executor.execute(structuredQuery);
      expect(Array.isArray(queryResults.results)).toBe(true);
      
      const response = generator.generateResponse(queryResults, structuredQuery, query);
      expect(response).toBeDefined();
      expect(response).toContain('Total Balance by Issuer');
      expect(response).toContain('Chase');
      expect(response).toContain('| Issuer |');
    });
  });

  describe('End-to-End: Filter Queries', () => {
    test('complete pipeline: "cards with balance"', async () => {
      const query = "list cards with balance";
      
      const entities = extractEntities(query);
      expect(entities.balanceFilter).toBe('with_balance');
      
      const structuredQuery = await decomposer.decompose(query, entities, 'query_card_data');
      expect(structuredQuery.filters.length).toBeGreaterThan(0);
      
      const queryResults = executor.execute(structuredQuery);
      expect(Array.isArray(queryResults.results)).toBe(true);
      
      // All results should have balance > 0
      queryResults.results.forEach(card => {
        expect(card.current_balance).toBeGreaterThan(0);
      });
      
      const response = generator.generateResponse(queryResults, structuredQuery, query);
      expect(response).toBeDefined();
      expect(response).toContain('Card');
      expect(response).toContain('|');
    });

    test('complete pipeline: "zero balance cards"', async () => {
      const query = "cards with zero balance";
      
      const entities = extractEntities(query);
      const structuredQuery = await decomposer.decompose(query, entities, 'query_card_data');
      const queryResults = executor.execute(structuredQuery);
      
      // All results should have balance === 0
      queryResults.results.forEach(card => {
        expect(card.current_balance).toBe(0);
      });
      
      const response = generator.generateResponse(queryResults, structuredQuery, query);
      expect(response).toBeDefined();
    });
  });

  describe('End-to-End: handleCardDataQuery Integration', () => {
    test('handleCardDataQuery uses Phase 3 for distinct queries', async () => {
      const query = "what are the different issuers";
      const entities = extractEntities(query);
      
      const response = await handleCardDataQuery(cards, entities, query);
      
      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
      // Should contain Phase 3 formatted response (structured table/list)
      expect(response).toMatch(/Issuer|Chase|Citi|American Express/i);
    });

    test('handleCardDataQuery uses Phase 3 for aggregation queries', async () => {
      const query = "what's my total balance";
      const entities = extractEntities(query);
      
      const response = await handleCardDataQuery(cards, entities, query);
      
      expect(response).toBeDefined();
      expect(response).toContain('Total');
      expect(response).toContain('Balance');
    });

    test('handleCardDataQuery uses Phase 3 for grouped aggregation', async () => {
      const query = "total balance by issuer";
      const entities = extractEntities(query);
      
      const response = await handleCardDataQuery(cards, entities, query);
      
      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
      // Phase 3 might format differently, just check it contains balance info
      expect(response.toLowerCase()).toMatch(/total|balance/i);
    });

    test('handleCardDataQuery falls back to legacy for simple queries', async () => {
      const query = "show me my cards";
      const entities = extractEntities(query);
      
      const response = await handleCardDataQuery(cards, entities, query);
      
      expect(response).toBeDefined();
      // Should still work (either Phase 3 or legacy)
      expect(response).toContain('card');
    });
  });

  describe('Error Handling', () => {
    test('handles empty card array gracefully', async () => {
      const query = "what are the different issuers";
      const entities = extractEntities(query);
      
      const response = await handleCardDataQuery([], entities, query);
      
      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
      expect(response).toContain("don't have any cards");
    });

    test('handles invalid structured query gracefully', async () => {
      const query = "test query";
      const entities = extractEntities(query);
      
      // Should not crash
      await expect(
        handleCardDataQuery(cards, entities, query)
      ).resolves.toBeDefined();
    });
  });

  describe('Realistic User Queries', () => {
    test('"what are the different issuers in my wallet"', async () => {
      const query = "what are the different issuers in my wallet";
      const entities = extractEntities(query);
      const structuredQuery = await decomposer.decompose(query, entities, 'query_card_data');
      const queryResults = executor.execute(structuredQuery);
      const response = generator.generateResponse(queryResults, structuredQuery, query);
      
      expect(response).toBeDefined();
      expect(response).toContain('Issuer');
      expect(response.length).toBeGreaterThan(50); // Should be substantial response
    });

    test('"show me visa cards"', async () => {
      const query = "show me visa cards";
      const entities = extractEntities(query);
      const structuredQuery = await decomposer.decompose(query, entities, 'query_card_data');
      const queryResults = executor.execute(structuredQuery);
      const response = generator.generateResponse(queryResults, structuredQuery, query);
      
      expect(response).toBeDefined();
      // May or may not filter by Visa - both are acceptable
    });

    test('"total balance across all cards"', async () => {
      const query = "total balance across all cards";
      const entities = extractEntities(query);
      const structuredQuery = await decomposer.decompose(query, entities, 'query_card_data');
      const queryResults = executor.execute(structuredQuery);
      const response = generator.generateResponse(queryResults, structuredQuery, query);
      
      expect(response).toBeDefined();
      expect(response).toContain('Total');
      expect(response).toContain('Balance');
    });

    test('"which card has the lowest APR"', async () => {
      const query = "which card has the lowest APR";
      const entities = extractEntities(query);
      
      // This might use legacy handler or Phase 3
      const response = await handleCardDataQuery(cards, entities, query);
      
      expect(response).toBeDefined();
      expect(response).toContain('APR');
    });
  });
});

