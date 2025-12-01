/**
 * ResponseGenerator Tests
 * 
 * Comprehensive test suite for ResponseGenerator class
 */

import { ResponseGenerator } from '../../../services/chat/query/responseGenerator.js';

// Test data factory
function createTestCards() {
  return [
    {
      id: '1',
      card_name: 'Chase Sapphire Preferred',
      nickname: 'Travel Card',
      issuer: 'Chase',
      card_network: 'Visa',
      apr: 22.74,
      credit_limit: 25000,
      current_balance: 5000,
      amount_to_pay: 200,
      annual_fee: 95
    },
    {
      id: '2',
      card_name: 'American Express Gold',
      nickname: 'Dining Card',
      issuer: 'American Express',
      card_network: 'Amex',
      apr: 18.99,
      credit_limit: 15000,
      current_balance: 3000,
      amount_to_pay: 150,
      annual_fee: 250
    },
    {
      id: '3',
      card_name: 'Citi Custom Cash',
      nickname: 'Custom Card',
      issuer: 'Citi',
      card_network: 'Mastercard',
      apr: 19.99,
      credit_limit: 12000,
      current_balance: 0,
      amount_to_pay: 0,
      annual_fee: 0
    }
  ];
}

describe('ResponseGenerator', () => {
  let generator;

  beforeEach(() => {
    generator = new ResponseGenerator({ includeInsights: true, includeTips: true });
  });

  describe('Constructor', () => {
    test('creates instance with default options', () => {
      const gen = new ResponseGenerator();
      expect(gen.options.includeInsights).toBe(true);
      expect(gen.options.includeTips).toBe(true);
      expect(gen.options.maxTableRows).toBe(20);
    });

    test('creates instance with custom options', () => {
      const gen = new ResponseGenerator({
        includeInsights: false,
        includeTips: false,
        maxTableRows: 10
      });
      expect(gen.options.includeInsights).toBe(false);
      expect(gen.options.includeTips).toBe(false);
      expect(gen.options.maxTableRows).toBe(10);
    });
  });

  describe('Distinct Query Responses', () => {
    test('formats distinct issuers response', () => {
      const queryResults = {
        values: [
          { value: 'Chase', count: 8 },
          { value: 'Citi', count: 6 },
          { value: 'American Express', count: 5 }
        ],
        total: 3,
        queryMetadata: {
          intent: 'query_card_data',
          subIntent: 'distinct',
          outputFormat: 'list'
        }
      };

      const structuredQuery = {
        intent: 'query_card_data',
        subIntent: 'distinct',
        distinct: {
          field: 'issuer',
          includeCount: true,
          includeDetails: false
        },
        outputFormat: 'list'
      };

      const response = generator.generateResponse(queryResults, structuredQuery);

      expect(response).toContain('3 different Issuer');
      expect(response).toContain('Chase');
      expect(response).toContain('Citi');
      expect(response).toContain('American Express');
    });

    test('formats distinct networks response', () => {
      const queryResults = {
        values: [
          { value: 'Visa', count: 10 },
          { value: 'Mastercard', count: 5 }
        ],
        total: 2,
        queryMetadata: {
          subIntent: 'distinct',
          outputFormat: 'list'
        }
      };

      const structuredQuery = {
        subIntent: 'distinct',
        distinct: {
          field: 'card_network',
          includeCount: true
        }
      };

      const response = generator.generateResponse(queryResults, structuredQuery);

      expect(response).toContain('2 different Network');
      expect(response).toContain('Visa');
      expect(response).toContain('Mastercard');
    });

    test('handles empty distinct results', () => {
      const queryResults = {
        values: [],
        total: 0,
        queryMetadata: { subIntent: 'distinct' }
      };

      const structuredQuery = {
        subIntent: 'distinct',
        distinct: { field: 'issuer' }
      };

      const response = generator.generateResponse(queryResults, structuredQuery);

      expect(response).toContain('No results found');
    });
  });

  describe('Aggregation Query Responses', () => {
    test('formats sum aggregation response', () => {
      const queryResults = {
        results: {
          sum_current_balance: 28000
        },
        queryMetadata: {
          subIntent: 'aggregation',
          outputFormat: 'summary'
        }
      };

      const structuredQuery = {
        subIntent: 'aggregation',
        aggregations: [{
          operation: 'sum',
          field: 'current_balance'
        }],
        outputFormat: 'summary'
      };

      const response = generator.generateResponse(queryResults, structuredQuery);

      expect(response).toContain('Total');
      expect(response).toContain('Balance');
      expect(response).toContain('$28,000');
    });

    test('formats average aggregation response', () => {
      const queryResults = {
        results: {
          avg_apr: 20.57
        },
        queryMetadata: {
          subIntent: 'aggregation',
          outputFormat: 'summary'
        }
      };

      const structuredQuery = {
        subIntent: 'aggregation',
        aggregations: [{
          operation: 'avg',
          field: 'apr'
        }]
      };

      const response = generator.generateResponse(queryResults, structuredQuery);

      expect(response).toContain('Average');
      expect(response).toContain('APR');
      expect(response).toContain('20.57%');
    });

    test('formats count aggregation response', () => {
      const queryResults = {
        results: {
          'count_*': 5
        },
        queryMetadata: {
          subIntent: 'aggregation',
          outputFormat: 'summary'
        }
      };

      const structuredQuery = {
        subIntent: 'aggregation',
        aggregations: [{
          operation: 'count',
          field: null
        }]
      };

      const response = generator.generateResponse(queryResults, structuredQuery);

      expect(response).toContain('Total');
      expect(response).toContain('5');
    });
  });

  describe('Grouped Aggregation Responses', () => {
    test('formats grouped aggregation response', () => {
      const queryResults = {
        results: [
          {
            issuer: 'Chase',
            sum_current_balance: 15000
          },
          {
            issuer: 'Citi',
            sum_current_balance: 8000
          },
          {
            issuer: 'American Express',
            sum_current_balance: 5000
          }
        ],
        queryMetadata: {
          subIntent: 'grouped_aggregation',
          outputFormat: 'summary'
        }
      };

      const structuredQuery = {
        subIntent: 'grouped_aggregation',
        grouping: 'issuer',
        aggregations: [{
          operation: 'sum',
          field: 'current_balance'
        }]
      };

      const response = generator.generateResponse(queryResults, structuredQuery);

      expect(response).toContain('Total Balance by Issuer');
      expect(response).toContain('Chase');
      expect(response).toContain('$15,000');
      expect(response).toContain('| Issuer |');
    });
  });

  describe('Table Responses', () => {
    test('formats table response for listing query', () => {
      const cards = createTestCards();
      const queryResults = {
        results: cards,
        total: 3,
        queryMetadata: {
          subIntent: 'listing',
          outputFormat: 'table'
        }
      };

      const structuredQuery = {
        subIntent: 'listing',
        outputFormat: 'table'
      };

      const response = generator.generateResponse(queryResults, structuredQuery);

      expect(response).toContain('Your Cards');
      expect(response).toContain('3 card');
      expect(response).toContain('Travel Card');
      expect(response).toContain('Dining Card');
      expect(response).toContain('| Card |');
    });

    test('formats table response with filters', () => {
      const cards = createTestCards();
      const filteredCards = cards.filter(c => c.current_balance > 0);
      
      const queryResults = {
        results: filteredCards,
        total: 2,
        queryMetadata: {
          subIntent: 'filter',
          outputFormat: 'table'
        }
      };

      const structuredQuery = {
        subIntent: 'filter',
        filters: [{
          field: 'current_balance',
          operator: '>',
          value: 0
        }],
        outputFormat: 'table'
      };

      const response = generator.generateResponse(queryResults, structuredQuery);

      expect(response).toContain('Filtered Results');
      expect(response).toContain('2 card');
    });

    test('truncates large tables', () => {
      const cards = Array.from({ length: 25 }, (_, i) => ({
        id: `${i}`,
        card_name: `Card ${i}`,
        current_balance: 1000,
        credit_limit: 10000,
        apr: 20
      }));

      const generator = new ResponseGenerator({ maxTableRows: 20 });
      
      const queryResults = {
        results: cards,
        total: 25,
        queryMetadata: { subIntent: 'listing', outputFormat: 'table' }
      };

      const structuredQuery = {
        subIntent: 'listing',
        outputFormat: 'table'
      };

      const response = generator.generateResponse(queryResults, structuredQuery);

      expect(response).toContain('Showing first 20 of 25 results');
    });

    test('handles empty table results', () => {
      const queryResults = {
        results: [],
        total: 0,
        queryMetadata: { subIntent: 'listing' }
      };

      const structuredQuery = {
        subIntent: 'listing',
        filters: [{ field: 'issuer', operator: '==', value: 'Unknown' }]
      };

      const response = generator.generateResponse(queryResults, structuredQuery);

      expect(response).toContain('No cards match your filter criteria');
    });
  });

  describe('Field Formatting', () => {
    test('formats currency fields correctly', () => {
      const card = createTestCards()[0];
      
      expect(generator._formatCardField(card, 'current_balance')).toBe('$5,000');
      expect(generator._formatCardField(card, 'credit_limit')).toBe('$25,000');
    });

    test('formats percentage fields correctly', () => {
      const card = createTestCards()[0];
      
      expect(generator._formatCardField(card, 'apr')).toBe('22.74%');
    });

    test('formats utilization with emoji', () => {
      const card = {
        current_balance: 2500,
        credit_limit: 10000
      };
      
      const util = generator._formatCardField(card, 'utilization');
      expect(util).toContain('25%');
      expect(util).toContain('✅'); // < 30%
    });

    test('uses nickname over card_name', () => {
      const card = createTestCards()[0];
      
      expect(generator._formatCardField(card, 'card_name')).toBe('Travel Card');
    });
  });

  describe('Insights Generation', () => {
    test('generates insights for high total balance', () => {
      const queryResults = {
        results: {
          sum_current_balance: 50000
        },
        queryMetadata: { subIntent: 'aggregation' }
      };

      const structuredQuery = {
        subIntent: 'aggregation',
        aggregations: [{ operation: 'sum', field: 'current_balance' }]
      };

      const response = generator.generateResponse(queryResults, structuredQuery);

      expect(response).toContain('💡');
      expect(response).toContain('Tip');
    });

    test('generates insights for high average APR', () => {
      const queryResults = {
        results: {
          avg_apr: 25.5
        },
        queryMetadata: { subIntent: 'aggregation' }
      };

      const structuredQuery = {
        subIntent: 'aggregation',
        aggregations: [{ operation: 'avg', field: 'apr' }]
      };

      const response = generator.generateResponse(queryResults, structuredQuery);

      expect(response).toContain('⚠️');
    });
  });

  describe('Error Handling', () => {
    test('throws error for missing queryResults', () => {
      expect(() => {
        generator.generateResponse(null, {});
      }).toThrow('queryResults and structuredQuery are required');
    });

    test('throws error for missing structuredQuery', () => {
      expect(() => {
        generator.generateResponse({}, null);
      }).toThrow('queryResults and structuredQuery are required');
    });
  });

  describe('Summary Generation', () => {
    test('includes summary for listing queries', () => {
      const cards = createTestCards();
      const queryResults = {
        results: cards,
        total: 3,
        queryMetadata: { subIntent: 'listing' }
      };

      const structuredQuery = {
        subIntent: 'listing'
      };

      const response = generator.generateResponse(queryResults, structuredQuery);

      expect(response).toContain('Summary');
      expect(response).toContain('Total balance');
      expect(response).toContain('Overall utilization');
    });
  });
});

