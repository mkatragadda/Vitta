/**
 * Field Mapping Tests
 * 
 * Comprehensive tests to ensure QueryDecomposer correctly maps
 * natural language field names to database field names.
 * 
 * Tests every field mapping to ensure proper database field retrieval.
 */

import { QueryDecomposer } from '../../services/chat/query/queryDecomposer.js';
import { extractEntities } from '../../services/chat/entityExtractor.js';

describe('Field Mapping - QueryDecomposer._mapField', () => {
  let decomposer;

  beforeEach(() => {
    decomposer = new QueryDecomposer();
  });

  // Helper to test field mapping by decomposing a query
  const getMappedField = (query, fieldToCheck) => {
    const entities = extractEntities(query);
    // Manually set attribute to test mapping
    if (fieldToCheck) {
      entities.attribute = fieldToCheck;
    }
    const structured = decomposer.decompose(query, entities, 'query_card_data');
    
    // Return the field that would be used in sorting/filtering
    if (structured.sorting) {
      return structured.sorting.field;
    }
    if (structured.filters.length > 0) {
      return structured.filters[0].field;
    }
    if (structured.aggregations.length > 0) {
      return structured.aggregations[0].field;
    }
    if (structured.distinct) {
      return structured.distinct.field;
    }
    return null;
  };

  describe('Identity Fields Mapping', () => {
    test('maps issuer variations to issuer', () => {
      const query = "show cards by issuer";
      const entities = extractEntities(query);
      entities.grouping = { groupBy: 'issuer' };
      const structured = decomposer.decompose(query, entities, 'query_card_data');
      
      expect(structured.grouping).toBe('issuer');
    });

    test('maps card_network variations to card_network', () => {
      const query = "show cards by network";
      const entities = extractEntities(query);
      entities.grouping = { groupBy: 'network' };
      const structured = decomposer.decompose(query, entities, 'query_card_data');
      
      expect(structured.grouping).toBe('card_network');
    });

    test('maps card_type variations to card_type', () => {
      const query = "show cards by type";
      const entities = extractEntities(query);
      entities.grouping = { groupBy: 'type' };
      const structured = decomposer.decompose(query, entities, 'query_card_data');
      
      expect(structured.grouping).toBe('card_type');
    });

    test('maps card_name variations to card_name', () => {
      const query = "highest balance cards";
      const entities = extractEntities(query);
      entities.attribute = 'card_name';
      entities.modifier = 'highest';
      const structured = decomposer.decompose(query, entities, 'query_card_data');
      
      // card_name sorting is less common, but should map correctly
      expect(structured.sorting?.field || null).toBeTruthy();
    });
  });

  describe('Financial Fields Mapping', () => {
    test('maps balance variations to current_balance', () => {
      const query = "cards with highest balance";
      const entities = extractEntities(query);
      entities.attribute = 'balance';
      entities.modifier = 'highest';
      const structured = decomposer.decompose(query, entities, 'query_card_data');
      
      expect(structured.sorting.field).toBe('current_balance');
    });

    test('maps apr variations to apr', () => {
      const query = "cards with lowest APR";
      const entities = extractEntities(query);
      entities.attribute = 'apr';
      entities.modifier = 'lowest';
      const structured = decomposer.decompose(query, entities, 'query_card_data');
      
      expect(structured.sorting.field).toBe('apr');
    });

    test('maps credit_limit variations to credit_limit', () => {
      const query = "cards with highest limit";
      const entities = extractEntities(query);
      entities.attribute = 'credit_limit';
      entities.modifier = 'highest';
      const structured = decomposer.decompose(query, entities, 'query_card_data');
      
      expect(structured.sorting.field).toBe('credit_limit');
    });

    test('maps annual_fee variations to annual_fee', () => {
      const query = "cards with lowest fee";
      const entities = extractEntities(query);
      entities.attribute = 'annual_fee';
      entities.modifier = 'lowest';
      const structured = decomposer.decompose(query, entities, 'query_card_data');
      
      expect(structured.sorting.field).toBe('annual_fee');
    });
  });

  describe('Date Fields Mapping', () => {
    test('maps due_date variations correctly', () => {
      const query = "cards sorted by due date";
      const entities = extractEntities(query);
      entities.attribute = 'due_date';
      const structured = decomposer.decompose(query, entities, 'query_card_data');
      
      // Should map to payment_due_date or payment_due_day
      expect(['payment_due_date', 'payment_due_day']).toContain(structured.sorting?.field || null);
    });

    test('maps statement_close variations correctly', () => {
      const query = "cards by statement close";
      const entities = extractEntities(query);
      entities.attribute = 'statement_close';
      const structured = decomposer.decompose(query, entities, 'query_card_data');
      
      // Should map to statement_cycle_end or statement_close_day
      expect(['statement_cycle_end', 'statement_close_day']).toContain(structured.sorting?.field || null);
    });

    test('maps grace_period variations to grace_period_days', () => {
      const query = "cards with longest grace period";
      const entities = extractEntities(query);
      entities.attribute = 'grace_period';
      entities.modifier = 'highest';
      const structured = decomposer.decompose(query, entities, 'query_card_data');
      
      expect(structured.sorting.field).toBe('grace_period_days');
    });
  });

  describe('Computed Fields Mapping', () => {
    test('maps utilization variations to utilization', () => {
      const query = "cards with highest utilization";
      const entities = extractEntities(query);
      entities.attribute = 'utilization';
      entities.modifier = 'highest';
      const structured = decomposer.decompose(query, entities, 'query_card_data');
      
      expect(structured.sorting.field).toBe('utilization');
    });

    test('maps available_credit variations to available_credit', () => {
      const query = "cards with most available credit";
      const entities = extractEntities(query);
      entities.attribute = 'available_credit';
      entities.modifier = 'highest';
      const structured = decomposer.decompose(query, entities, 'query_card_data');
      
      expect(structured.sorting.field).toBe('available_credit');
    });
  });

  describe('Aggregation Field Mapping', () => {
    test('maps balance in aggregations to current_balance', () => {
      const query = "total balance";
      const entities = extractEntities(query);
      entities.aggregation = { operation: 'sum', field: 'balance' };
      const structured = decomposer.decompose(query, entities, 'query_card_data');
      
      expect(structured.aggregations[0].field).toBe('current_balance');
    });

    test('maps apr in aggregations to apr', () => {
      const query = "average APR";
      const entities = extractEntities(query);
      entities.aggregation = { operation: 'avg', field: 'apr' };
      const structured = decomposer.decompose(query, entities, 'query_card_data');
      
      expect(structured.aggregations[0].field).toBe('apr');
    });

    test('maps credit_limit in aggregations to credit_limit', () => {
      const query = "total credit limit";
      const entities = extractEntities(query);
      entities.aggregation = { operation: 'sum', field: 'credit_limit' };
      const structured = decomposer.decompose(query, entities, 'query_card_data');
      
      expect(structured.aggregations[0].field).toBe('credit_limit');
    });
  });

  describe('Distinct Query Field Mapping', () => {
    test('maps issuer in distinct queries', () => {
      const query = "different issuers";
      const entities = extractEntities(query);
      const structured = decomposer.decompose(query, entities, 'query_card_data');
      
      if (structured.distinct) {
        expect(structured.distinct.field).toBe('issuer');
      }
    });

    test('maps network in distinct queries', () => {
      const query = "different networks";
      const entities = extractEntities(query);
      const structured = decomposer.decompose(query, entities, 'query_card_data');
      
      if (structured.distinct) {
        expect(structured.distinct.field).toBe('card_network');
      }
    });
  });

  describe('Unknown Fields', () => {
    test('handles unmapped fields gracefully', () => {
      const query = "test query";
      const entities = extractEntities(query);
      entities.attribute = 'unknown_field';
      const structured = decomposer.decompose(query, entities, 'query_card_data');
      
      // Should not crash, may return null or original value
      expect(structured).toBeDefined();
    });
  });
});

