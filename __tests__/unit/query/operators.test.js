/**
 * Operators Tests
 * 
 * Comprehensive test suite for query operators
 */

import { OPERATORS, OPERATOR_TYPES, VALID_OPERATORS } from '../../../utils/query/operators.js';

describe('Operators', () => {
  describe('evaluate', () => {
    describe('Equality operators', () => {
      test('== operator with matching strings (case-insensitive)', () => {
        expect(OPERATORS.evaluate('Visa', OPERATOR_TYPES.EQUALS, 'visa')).toBe(true);
        expect(OPERATORS.evaluate('Chase', OPERATOR_TYPES.EQUALS, 'CHASE')).toBe(true);
        expect(OPERATORS.evaluate('American Express', OPERATOR_TYPES.EQUALS, 'american express')).toBe(true);
      });

      test('== operator with non-matching strings', () => {
        expect(OPERATORS.evaluate('Visa', OPERATOR_TYPES.EQUALS, 'Mastercard')).toBe(false);
        expect(OPERATORS.evaluate('Chase', OPERATOR_TYPES.EQUALS, 'Citi')).toBe(false);
      });

      test('== operator with numbers', () => {
        expect(OPERATORS.evaluate(1000, OPERATOR_TYPES.EQUALS, 1000)).toBe(true);
        expect(OPERATORS.evaluate(1000, OPERATOR_TYPES.EQUALS, 2000)).toBe(false);
        expect(OPERATORS.evaluate('1000', OPERATOR_TYPES.EQUALS, 1000)).toBe(true);
      });

      test('!= operator', () => {
        expect(OPERATORS.evaluate('Visa', OPERATOR_TYPES.NOT_EQUALS, 'Mastercard')).toBe(true);
        expect(OPERATORS.evaluate('Visa', OPERATOR_TYPES.NOT_EQUALS, 'visa')).toBe(false);
        expect(OPERATORS.evaluate(1000, OPERATOR_TYPES.NOT_EQUALS, 2000)).toBe(true);
      });

      test('== operator with null/undefined', () => {
        expect(OPERATORS.evaluate(null, OPERATOR_TYPES.EQUALS, null)).toBe(true);
        expect(OPERATORS.evaluate(null, OPERATOR_TYPES.EQUALS, undefined)).toBe(true);
        expect(OPERATORS.evaluate(null, OPERATOR_TYPES.EQUALS, 'value')).toBe(false);
      });
    });

    describe('Comparison operators', () => {
      test('> operator', () => {
        expect(OPERATORS.evaluate(5000, OPERATOR_TYPES.GREATER_THAN, 1000)).toBe(true);
        expect(OPERATORS.evaluate(1000, OPERATOR_TYPES.GREATER_THAN, 5000)).toBe(false);
        expect(OPERATORS.evaluate(1000, OPERATOR_TYPES.GREATER_THAN, 1000)).toBe(false);
        expect(OPERATORS.evaluate('5000', OPERATOR_TYPES.GREATER_THAN, '1000')).toBe(true);
      });

      test('>= operator', () => {
        expect(OPERATORS.evaluate(5000, OPERATOR_TYPES.GREATER_THAN_OR_EQUAL, 1000)).toBe(true);
        expect(OPERATORS.evaluate(1000, OPERATOR_TYPES.GREATER_THAN_OR_EQUAL, 1000)).toBe(true);
        expect(OPERATORS.evaluate(1000, OPERATOR_TYPES.GREATER_THAN_OR_EQUAL, 5000)).toBe(false);
      });

      test('< operator', () => {
        expect(OPERATORS.evaluate(1000, OPERATOR_TYPES.LESS_THAN, 5000)).toBe(true);
        expect(OPERATORS.evaluate(5000, OPERATOR_TYPES.LESS_THAN, 1000)).toBe(false);
        expect(OPERATORS.evaluate(1000, OPERATOR_TYPES.LESS_THAN, 1000)).toBe(false);
      });

      test('<= operator', () => {
        expect(OPERATORS.evaluate(1000, OPERATOR_TYPES.LESS_THAN_OR_EQUAL, 5000)).toBe(true);
        expect(OPERATORS.evaluate(1000, OPERATOR_TYPES.LESS_THAN_OR_EQUAL, 1000)).toBe(true);
        expect(OPERATORS.evaluate(5000, OPERATOR_TYPES.LESS_THAN_OR_EQUAL, 1000)).toBe(false);
      });

      test('Comparison operators with non-numeric values return false', () => {
        expect(OPERATORS.evaluate('abc', OPERATOR_TYPES.GREATER_THAN, 1000)).toBe(false);
        expect(OPERATORS.evaluate(null, OPERATOR_TYPES.GREATER_THAN, 1000)).toBe(false);
      });
    });

    describe('String operators', () => {
      test('contains operator (case-insensitive)', () => {
        expect(OPERATORS.evaluate('Chase Sapphire', OPERATOR_TYPES.CONTAINS, 'sapphire')).toBe(true);
        expect(OPERATORS.evaluate('American Express Gold', OPERATOR_TYPES.CONTAINS, 'GOLD')).toBe(true);
        expect(OPERATORS.evaluate('Visa', OPERATOR_TYPES.CONTAINS, 'Mastercard')).toBe(false);
      });

      test('starts_with operator', () => {
        expect(OPERATORS.evaluate('Chase Sapphire', OPERATOR_TYPES.STARTS_WITH, 'chase')).toBe(true);
        expect(OPERATORS.evaluate('American Express', OPERATOR_TYPES.STARTS_WITH, 'AMERICAN')).toBe(true);
        expect(OPERATORS.evaluate('Chase', OPERATOR_TYPES.STARTS_WITH, 'Sapphire')).toBe(false);
      });

      test('ends_with operator', () => {
        expect(OPERATORS.evaluate('Chase Sapphire', OPERATOR_TYPES.ENDS_WITH, 'sapphire')).toBe(true);
        expect(OPERATORS.evaluate('Gold Card', OPERATOR_TYPES.ENDS_WITH, 'CARD')).toBe(true);
        expect(OPERATORS.evaluate('Chase', OPERATOR_TYPES.ENDS_WITH, 'Sapphire')).toBe(false);
      });
    });

    describe('Array operators', () => {
      test('in operator', () => {
        expect(OPERATORS.evaluate('Chase', OPERATOR_TYPES.IN, ['Chase', 'Citi', 'Amex'])).toBe(true);
        expect(OPERATORS.evaluate('Visa', OPERATOR_TYPES.IN, ['Visa', 'Mastercard'])).toBe(true);
        expect(OPERATORS.evaluate('Discover', OPERATOR_TYPES.IN, ['Chase', 'Citi'])).toBe(false);
      });

      test('in operator with case-insensitive string matching', () => {
        expect(OPERATORS.evaluate('chase', OPERATOR_TYPES.IN, ['Chase', 'Citi'])).toBe(true);
        expect(OPERATORS.evaluate('CHASE', OPERATOR_TYPES.IN, ['Chase', 'Citi'])).toBe(true);
      });

      test('in operator with non-array returns false', () => {
        expect(OPERATORS.evaluate('Chase', OPERATOR_TYPES.IN, 'not-array')).toBe(false);
        expect(OPERATORS.evaluate('Chase', OPERATOR_TYPES.IN, null)).toBe(false);
      });

      test('between operator', () => {
        expect(OPERATORS.evaluate(5000, OPERATOR_TYPES.BETWEEN, [1000, 10000])).toBe(true);
        expect(OPERATORS.evaluate(1000, OPERATOR_TYPES.BETWEEN, [1000, 10000])).toBe(true);
        expect(OPERATORS.evaluate(10000, OPERATOR_TYPES.BETWEEN, [1000, 10000])).toBe(true);
        expect(OPERATORS.evaluate(500, OPERATOR_TYPES.BETWEEN, [1000, 10000])).toBe(false);
        expect(OPERATORS.evaluate(15000, OPERATOR_TYPES.BETWEEN, [1000, 10000])).toBe(false);
      });

      test('between operator with invalid array returns false', () => {
        expect(OPERATORS.evaluate(5000, OPERATOR_TYPES.BETWEEN, [1000])).toBe(false);
        expect(OPERATORS.evaluate(5000, OPERATOR_TYPES.BETWEEN, [1000, 2000, 3000])).toBe(false);
        expect(OPERATORS.evaluate(5000, OPERATOR_TYPES.BETWEEN, 'not-array')).toBe(false);
      });

      test('between operator with non-numeric values returns false', () => {
        expect(OPERATORS.evaluate('abc', OPERATOR_TYPES.BETWEEN, [1000, 10000])).toBe(false);
        expect(OPERATORS.evaluate(5000, OPERATOR_TYPES.BETWEEN, ['abc', 'def'])).toBe(false);
      });
    });

    describe('Error handling', () => {
      test('throws error for invalid operator', () => {
        expect(() => {
          OPERATORS.evaluate(1000, 'invalid_operator', 2000);
        }).toThrow('Invalid operator');
      });
    });
  });

  describe('VALID_OPERATORS', () => {
    test('contains all operator types', () => {
      expect(VALID_OPERATORS).toContain(OPERATOR_TYPES.EQUALS);
      expect(VALID_OPERATORS).toContain(OPERATOR_TYPES.GREATER_THAN);
      expect(VALID_OPERATORS).toContain(OPERATOR_TYPES.CONTAINS);
      expect(VALID_OPERATORS).toContain(OPERATOR_TYPES.IN);
      expect(VALID_OPERATORS).toContain(OPERATOR_TYPES.BETWEEN);
    });
  });
});

