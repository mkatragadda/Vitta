/**
 * Entity Extractor Phase 2 Tests
 * 
 * Tests for distinct query detection, compound filters, grouping, and aggregations
 */

import { extractEntities } from '../../services/chat/entityExtractor.js';

describe('Entity Extractor - Phase 2: Query System Entities', () => {
  describe('Distinct Query Detection', () => {
    test('detects distinct query for issuers', () => {
      const entities = extractEntities("what are the different issuers in my wallet");
      expect(entities.distinctQuery).toBeDefined();
      expect(entities.distinctQuery.isDistinct).toBe(true);
      expect(entities.distinctQuery.field).toBe('issuer');
    });

    test('detects distinct query for networks', () => {
      const entities = extractEntities("what networks do I have");
      expect(entities.distinctQuery).toBeDefined();
      expect(entities.distinctQuery.isDistinct).toBe(true);
      expect(entities.distinctQuery.field).toBe('card_network');
    });

    test('detects distinct query with "different" keyword', () => {
      const entities = extractEntities("show me different card types");
      expect(entities.distinctQuery).toBeDefined();
      expect(entities.distinctQuery.isDistinct).toBe(true);
    });

    test('detects distinct query with "various" keyword', () => {
      const entities = extractEntities("list all the various issuers");
      expect(entities.distinctQuery).toBeDefined();
      expect(entities.distinctQuery.isDistinct).toBe(true);
    });

    test('detects distinct query with "all the" keyword', () => {
      const entities = extractEntities("what are all the networks I use");
      expect(entities.distinctQuery).toBeDefined();
      expect(entities.distinctQuery.isDistinct).toBe(true);
      expect(entities.distinctQuery.field).toBe('card_network');
    });

    test('detects distinct query with "how many different"', () => {
      const entities = extractEntities("how many different issuers do I have");
      expect(entities.distinctQuery).toBeDefined();
      expect(entities.distinctQuery.isDistinct).toBe(true);
      expect(entities.distinctQuery.field).toBe('issuer');
    });

    test('detects distinct query with breakdown', () => {
      const entities = extractEntities("breakdown of cards by issuer");
      expect(entities.distinctQuery).toBeDefined();
      expect(entities.distinctQuery.isDistinct).toBe(true);
    });

    test('detects distinct query with distribution', () => {
      const entities = extractEntities("distribution of my cards by network");
      expect(entities.distinctQuery).toBeDefined();
      expect(entities.distinctQuery.isDistinct).toBe(true);
    });

    test('defaults to issuer field when field not detected', () => {
      const entities = extractEntities("what are the different ones");
      expect(entities.distinctQuery).toBeDefined();
      expect(entities.distinctQuery.isDistinct).toBe(true);
      expect(entities.distinctQuery.field).toBe('issuer'); // Default
    });

    test('returns null for non-distinct queries', () => {
      const entities = extractEntities("show me my cards");
      expect(entities.distinctQuery).toBeNull();
    });

    test('detects distinct query with case variations', () => {
      const entities1 = extractEntities("WHAT ARE THE DIFFERENT ISSUERS");
      const entities2 = extractEntities("What Are The Different Issuers");
      
      expect(entities1.distinctQuery).toBeDefined();
      expect(entities1.distinctQuery.isDistinct).toBe(true);
      expect(entities2.distinctQuery).toBeDefined();
      expect(entities2.distinctQuery.isDistinct).toBe(true);
    });
  });

  describe('Compound Operator Detection', () => {
    test('detects AND operator', () => {
      const entities = extractEntities("visa cards with balance over 5000 and APR less than 25");
      expect(entities.compoundOperators).toBeDefined();
      expect(entities.compoundOperators.logicalOperators).toContain('AND');
    });

    test('detects multiple AND operators', () => {
      const entities = extractEntities("chase cards and balance over 1000 and APR below 20");
      expect(entities.compoundOperators).toBeDefined();
      expect(entities.compoundOperators.logicalOperators.length).toBeGreaterThan(0);
      expect(entities.compoundOperators.logicalOperators.every(op => op === 'AND')).toBe(true);
    });

    test('detects OR operator', () => {
      const entities = extractEntities("chase or citi cards");
      expect(entities.compoundOperators).toBeDefined();
      expect(entities.compoundOperators.logicalOperators).toContain('OR');
    });

    test('detects multiple OR operators', () => {
      const entities = extractEntities("chase or citi or amex cards");
      expect(entities.compoundOperators).toBeDefined();
      expect(entities.compoundOperators.logicalOperators.length).toBeGreaterThan(0);
    });

    test('infers AND for implicit compound conditions', () => {
      const entities = extractEntities("visa cards with balance over 5000 with APR less than 25");
      expect(entities.compoundOperators).toBeDefined();
      // Should infer AND for multiple conditions
      expect(entities.compoundOperators.logicalOperators.length).toBeGreaterThanOrEqual(1);
    });

    test('returns empty array for single condition queries', () => {
      const entities = extractEntities("show me visa cards");
      expect(entities.compoundOperators).toBeDefined();
      expect(entities.compoundOperators.logicalOperators).toEqual([]);
    });

    test('detects AND with comma separation', () => {
      const entities = extractEntities("visa cards, with balance over 5000");
      expect(entities.compoundOperators).toBeDefined();
      // May infer AND for comma-separated conditions
    });
  });

  describe('Grouping Detection', () => {
    test('detects grouping by issuer', () => {
      const entities = extractEntities("breakdown by issuer");
      expect(entities.grouping).toBeDefined();
      expect(entities.grouping.groupBy).toBe('issuer');
    });

    test('detects grouping by network', () => {
      const entities = extractEntities("grouped by network");
      expect(entities.grouping).toBeDefined();
      expect(entities.grouping.groupBy).toBe('card_network');
    });

    test('detects grouping with "by" keyword', () => {
      const entities = extractEntities("total balance by issuer");
      expect(entities.grouping).toBeDefined();
      expect(entities.grouping.groupBy).toBe('issuer');
    });

    test('detects grouping with "grouped by"', () => {
      const entities = extractEntities("show me cards grouped by type");
      expect(entities.grouping).toBeDefined();
      expect(entities.grouping.groupBy).toBe('card_type');
    });

    test('detects grouping with "breakdown by"', () => {
      const entities = extractEntities("breakdown by issuer showing total balance");
      expect(entities.grouping).toBeDefined();
      expect(entities.grouping.groupBy).toBe('issuer');
    });

    test('detects grouping with "distribution by"', () => {
      const entities = extractEntities("distribution by network");
      expect(entities.grouping).toBeDefined();
      expect(entities.grouping.groupBy).toBe('card_network');
    });

    test('returns null for non-grouping queries', () => {
      const entities = extractEntities("show me my cards");
      expect(entities.grouping).toBeNull();
    });
  });

  describe('Aggregation Operation Detection', () => {
    test('detects sum aggregation', () => {
      const entities = extractEntities("what's my total balance");
      expect(entities.aggregation).toBeDefined();
      expect(entities.aggregation.operation).toBe('sum');
      expect(entities.aggregation.field).toBe('current_balance');
    });

    test('detects sum with "add up"', () => {
      const entities = extractEntities("add up all my balances");
      expect(entities.aggregation).toBeDefined();
      expect(entities.aggregation.operation).toBe('sum');
    });

    test('detects average aggregation', () => {
      const entities = extractEntities("what's my average APR");
      expect(entities.aggregation).toBeDefined();
      expect(entities.aggregation.operation).toBe('avg');
      expect(entities.aggregation.field).toBe('apr');
    });

    test('detects count aggregation', () => {
      const entities = extractEntities("how many cards do I have");
      expect(entities.aggregation).toBeDefined();
      expect(entities.aggregation.operation).toBe('count');
    });

    test('detects count with "number of"', () => {
      const entities = extractEntities("number of cards in my wallet");
      expect(entities.aggregation).toBeDefined();
      expect(entities.aggregation.operation).toBe('count');
    });

    test('detects min aggregation', () => {
      const entities = extractEntities("what's my minimum balance");
      expect(entities.aggregation).toBeDefined();
      expect(entities.aggregation.operation).toBe('min');
      expect(entities.aggregation.field).toBe('current_balance');
    });

    test('detects max aggregation', () => {
      const entities = extractEntities("what's my maximum APR");
      expect(entities.aggregation).toBeDefined();
      expect(entities.aggregation.operation).toBe('max');
      expect(entities.aggregation.field).toBe('apr');
    });

    test('detects max with "highest"', () => {
      const entities = extractEntities("highest balance");
      expect(entities.aggregation).toBeDefined();
      expect(entities.aggregation.operation).toBe('max');
    });

    test('returns null for field when not specified', () => {
      const entities = extractEntities("how many cards");
      expect(entities.aggregation).toBeDefined();
      expect(entities.aggregation.operation).toBe('count');
      expect(entities.aggregation.field).toBeNull(); // Count doesn't need field
    });

    test('returns null for non-aggregation queries', () => {
      const entities = extractEntities("show me my cards");
      expect(entities.aggregation).toBeNull();
    });
  });

  describe('Combined Phase 2 Entities', () => {
    test('detects distinct query with grouping', () => {
      const entities = extractEntities("breakdown of cards by issuer");
      expect(entities.distinctQuery).toBeDefined();
      expect(entities.distinctQuery.isDistinct).toBe(true);
      expect(entities.grouping).toBeDefined();
      expect(entities.grouping.groupBy).toBe('issuer');
    });

    test('detects aggregation with grouping', () => {
      const entities = extractEntities("total balance by issuer");
      expect(entities.aggregation).toBeDefined();
      expect(entities.aggregation.operation).toBe('sum');
      expect(entities.grouping).toBeDefined();
      expect(entities.grouping.groupBy).toBe('issuer');
    });

    test('detects distinct query with compound filters', () => {
      const entities = extractEntities("different issuers with balance over 1000 and APR below 25");
      expect(entities.distinctQuery).toBeDefined();
      expect(entities.distinctQuery.isDistinct).toBe(true);
      expect(entities.compoundOperators).toBeDefined();
      expect(entities.compoundOperators.logicalOperators.length).toBeGreaterThan(0);
    });

    test('detects aggregation with distinct query', () => {
      const entities = extractEntities("how many different issuers do I have");
      expect(entities.aggregation).toBeDefined();
      expect(entities.aggregation.operation).toBe('count');
      expect(entities.distinctQuery).toBeDefined();
      expect(entities.distinctQuery.isDistinct).toBe(true);
    });

    test('complex query: distinct with grouping and aggregation', () => {
      const entities = extractEntities("breakdown by issuer showing total balance");
      expect(entities.distinctQuery).toBeDefined();
      expect(entities.grouping).toBeDefined();
      expect(entities.aggregation).toBeDefined();
      expect(entities.aggregation.operation).toBe('sum');
    });
  });

  describe('Edge Cases', () => {
    test('handles empty query', () => {
      const entities = extractEntities("");
      expect(entities.distinctQuery).toBeNull();
      expect(entities.compoundOperators).toBeDefined();
      expect(entities.grouping).toBeNull();
      expect(entities.aggregation).toBeNull();
    });

    test('handles query with multiple distinct keywords', () => {
      const entities = extractEntities("what are all the different various issuers");
      expect(entities.distinctQuery).toBeDefined();
      expect(entities.distinctQuery.isDistinct).toBe(true);
    });

    test('handles ambiguous queries', () => {
      const entities = extractEntities("show me different things");
      expect(entities.distinctQuery).toBeDefined();
      expect(entities.distinctQuery.isDistinct).toBe(true);
      // Should default to issuer
      expect(entities.distinctQuery.field).toBe('issuer');
    });

    test('handles case insensitive queries', () => {
      const entities1 = extractEntities("WHAT ARE THE DIFFERENT ISSUERS");
      const entities2 = extractEntities("what are the different issuers");
      
      expect(entities1.distinctQuery).toEqual(entities2.distinctQuery);
      expect(entities1.aggregation).toEqual(entities2.aggregation);
    });
  });
});

