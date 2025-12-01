/**
 * Validators Tests
 * 
 * Comprehensive test suite for query validators
 */

import { validateQuery, KNOWN_CARD_FIELDS, LOGICAL_OPERATORS } from '../../../utils/query/validators.js';

describe('Query Validators', () => {
  describe('validateField', () => {
    test('validates known fields without error', () => {
      expect(() => {
        validateQuery.validateField('current_balance');
        validateQuery.validateField('card_network');
        validateQuery.validateField('issuer');
      }).not.toThrow();
    });

    test('throws error for empty string', () => {
      expect(() => {
        validateQuery.validateField('');
      }).toThrow('Field must be a non-empty string');
    });

    test('throws error for null', () => {
      expect(() => {
        validateQuery.validateField(null);
      }).toThrow('Field must be a non-empty string');
    });

    test('throws error for undefined', () => {
      expect(() => {
        validateQuery.validateField(undefined);
      }).toThrow('Field must be a non-empty string');
    });

    test('throws error for non-string', () => {
      expect(() => {
        validateQuery.validateField(123);
      }).toThrow('Field must be a non-empty string');
    });

    test('warns for unknown fields but allows them', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      expect(() => {
        validateQuery.validateField('unknown_field');
      }).not.toThrow();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown field')
      );
      
      consoleSpy.mockRestore();
    });

    test('strict mode only allows known fields', () => {
      expect(() => {
        validateQuery.validateField('unknown_field', true);
      }).toThrow('Unknown field');
      
      expect(() => {
        validateQuery.validateField('current_balance', true);
      }).not.toThrow();
    });
  });

  describe('validateOperator', () => {
    test('validates valid operators', () => {
      expect(() => {
        validateQuery.validateOperator('==', 'value');
        validateQuery.validateOperator('>', 1000);
        validateQuery.validateOperator('contains', 'text');
      }).not.toThrow();
    });

    test('validates "in" operator with array', () => {
      expect(() => {
        validateQuery.validateOperator('in', ['Chase', 'Citi']);
      }).not.toThrow();
    });

    test('throws error for "in" operator with non-array', () => {
      expect(() => {
        validateQuery.validateOperator('in', 'not-array');
      }).toThrow('Operator "in" requires an array value');
    });

    test('throws error for "in" operator with empty array', () => {
      expect(() => {
        validateQuery.validateOperator('in', []);
      }).toThrow('Operator "in" requires a non-empty array');
    });

    test('validates "between" operator with 2-element array', () => {
      expect(() => {
        validateQuery.validateOperator('between', [1000, 5000]);
      }).not.toThrow();
    });

    test('throws error for "between" operator with wrong array length', () => {
      expect(() => {
        validateQuery.validateOperator('between', [1000]);
      }).toThrow('Operator "between" requires an array with exactly 2 elements');
      
      expect(() => {
        validateQuery.validateOperator('between', [1000, 2000, 3000]);
      }).toThrow('Operator "between" requires an array with exactly 2 elements');
    });

    test('throws error for "between" operator with min > max', () => {
      expect(() => {
        validateQuery.validateOperator('between', [5000, 1000]);
      }).toThrow('Operator "between" requires min <= max');
    });

    test('throws error for null operator', () => {
      expect(() => {
        validateQuery.validateOperator(null, 'value');
      }).toThrow('Operator must be a non-empty string');
    });
  });

  describe('validateLogicalOperator', () => {
    test('validates AND operator', () => {
      expect(() => {
        validateQuery.validateLogicalOperator('AND');
      }).not.toThrow();
    });

    test('validates OR operator', () => {
      expect(() => {
        validateQuery.validateLogicalOperator('OR');
      }).not.toThrow();
    });

    test('throws error for invalid logical operator', () => {
      expect(() => {
        validateQuery.validateLogicalOperator('XOR');
      }).toThrow('Invalid logical operator');
    });

    test('throws error for null', () => {
      expect(() => {
        validateQuery.validateLogicalOperator(null);
      }).toThrow('Invalid logical operator');
    });
  });

  describe('validateAggregation', () => {
    test('validates valid aggregation operations', () => {
      expect(() => {
        validateQuery.validateAggregation('sum', 'current_balance');
        validateQuery.validateAggregation('avg', 'apr');
        validateQuery.validateAggregation('count', null);
        validateQuery.validateAggregation('min', 'current_balance');
        validateQuery.validateAggregation('max', 'apr');
        validateQuery.validateAggregation('countDistinct', 'issuer');
      }).not.toThrow();
    });

    test('throws error for invalid operation', () => {
      expect(() => {
        validateQuery.validateAggregation('invalid', 'field');
      }).toThrow('Invalid aggregation operation');
    });

    test('throws error when operation requires field but field is null', () => {
      expect(() => {
        validateQuery.validateAggregation('sum', null);
      }).toThrow('Aggregation operation "sum" requires a field name');
    });

    test('allows count without field', () => {
      expect(() => {
        validateQuery.validateAggregation('count', null);
      }).not.toThrow();
    });
  });

  describe('validateSortDirection', () => {
    test('validates asc direction', () => {
      expect(() => {
        validateQuery.validateSortDirection('asc');
        validateQuery.validateSortDirection('ASC');
      }).not.toThrow();
    });

    test('validates desc direction', () => {
      expect(() => {
        validateQuery.validateSortDirection('desc');
        validateQuery.validateSortDirection('DESC');
      }).not.toThrow();
    });

    test('throws error for invalid direction', () => {
      expect(() => {
        validateQuery.validateSortDirection('invalid');
      }).toThrow('Invalid sort direction');
    });

    test('throws error for null', () => {
      expect(() => {
        validateQuery.validateSortDirection(null);
      }).toThrow('Invalid sort direction');
    });
  });

  describe('validateLimit', () => {
    test('validates positive integer limit', () => {
      expect(() => {
        validateQuery.validateLimit(10);
        validateQuery.validateLimit(0);
        validateQuery.validateLimit(100);
      }).not.toThrow();
    });

    test('throws error for negative number', () => {
      expect(() => {
        validateQuery.validateLimit(-1);
      }).toThrow('Limit must be non-negative');
    });

    test('throws error for non-integer', () => {
      expect(() => {
        validateQuery.validateLimit(10.5);
      }).toThrow('Limit must be an integer');
    });

    test('throws error for non-number', () => {
      expect(() => {
        validateQuery.validateLimit('10');
      }).toThrow('Limit must be a number');
    });
  });

  describe('validateCards', () => {
    test('validates array of cards', () => {
      expect(() => {
        validateQuery.validateCards([]);
        validateQuery.validateCards([{ id: 1 }]);
      }).not.toThrow();
    });

    test('throws error for non-array', () => {
      expect(() => {
        validateQuery.validateCards('not-array');
      }).toThrow('expected array');
      
      expect(() => {
        validateQuery.validateCards(null);
      }).toThrow('expected array');
    });
  });

  describe('Constants', () => {
    test('KNOWN_CARD_FIELDS contains expected fields', () => {
      expect(KNOWN_CARD_FIELDS).toContain('current_balance');
      expect(KNOWN_CARD_FIELDS).toContain('card_network');
      expect(KNOWN_CARD_FIELDS).toContain('issuer');
      expect(KNOWN_CARD_FIELDS).toContain('apr');
    });

    test('LOGICAL_OPERATORS contains AND and OR', () => {
      expect(LOGICAL_OPERATORS).toContain('AND');
      expect(LOGICAL_OPERATORS).toContain('OR');
    });
  });
});

