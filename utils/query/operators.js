/**
 * Query Operators
 * 
 * Provides operators for evaluating filter conditions in queries.
 * Supports numeric, string, array, and date comparisons.
 * 
 * @module utils/query/operators
 */

/**
 * Supported operators for query filtering
 * @type {Object<string, string>}
 */
export const OPERATOR_TYPES = {
  EQUALS: '==',
  NOT_EQUALS: '!=',
  GREATER_THAN: '>',
  GREATER_THAN_OR_EQUAL: '>=',
  LESS_THAN: '<',
  LESS_THAN_OR_EQUAL: '<=',
  CONTAINS: 'contains',
  IN: 'in',
  BETWEEN: 'between',
  STARTS_WITH: 'starts_with',
  ENDS_WITH: 'ends_with'
};

/**
 * Valid operators list
 * @type {string[]}
 */
export const VALID_OPERATORS = Object.values(OPERATOR_TYPES);

/**
 * Operators utility for evaluating filter conditions
 */
export const OPERATORS = {
  /**
   * Evaluate a comparison operation between left and right operands
   * 
   * @param {*} left - Left operand (card field value)
   * @param {string} operator - Comparison operator
   * @param {*} right - Right operand (comparison value)
   * @returns {boolean} - Result of the comparison
   * @throws {Error} - If operator is invalid
   * 
   * @example
   * OPERATORS.evaluate(5000, '>', 1000) // true
   * OPERATORS.evaluate('Visa', '==', 'Visa') // true
   * OPERATORS.evaluate('Chase', 'in', ['Chase', 'Citi']) // true
   */
  evaluate(left, operator, right) {
    if (!VALID_OPERATORS.includes(operator)) {
      throw new Error(`Invalid operator: ${operator}. Valid operators: ${VALID_OPERATORS.join(', ')}`);
    }

    // Handle null/undefined values
    if (left === null || left === undefined) {
      return this._evaluateNull(left, operator, right);
    }

    switch (operator) {
      case OPERATOR_TYPES.EQUALS:
        return this.equals(left, right);
      
      case OPERATOR_TYPES.NOT_EQUALS:
        return !this.equals(left, right);
      
      case OPERATOR_TYPES.GREATER_THAN:
        return this.greaterThan(left, right);
      
      case OPERATOR_TYPES.GREATER_THAN_OR_EQUAL:
        return this.greaterThanOrEqual(left, right);
      
      case OPERATOR_TYPES.LESS_THAN:
        return this.lessThan(left, right);
      
      case OPERATOR_TYPES.LESS_THAN_OR_EQUAL:
        return this.lessThanOrEqual(left, right);
      
      case OPERATOR_TYPES.CONTAINS:
        return this.contains(left, right);
      
      case OPERATOR_TYPES.IN:
        return this.in(left, right);
      
      case OPERATOR_TYPES.BETWEEN:
        return this.between(left, right);
      
      case OPERATOR_TYPES.STARTS_WITH:
        return this.startsWith(left, right);
      
      case OPERATOR_TYPES.ENDS_WITH:
        return this.endsWith(left, right);
      
      default:
        throw new Error(`Unsupported operator: ${operator}`);
    }
  },

  /**
   * Check if two values are equal (case-insensitive for strings)
   * 
   * @param {*} left - Left value
   * @param {*} right - Right value
   * @returns {boolean} - True if values are equal
   * 
   * @private
   */
  equals(left, right) {
    // Case-insensitive string comparison
    if (typeof left === 'string' && typeof right === 'string') {
      return left.toLowerCase().trim() === right.toLowerCase().trim();
    }
    
    // Numeric comparison (handle string numbers)
    if (this._isNumeric(left) && this._isNumeric(right)) {
      return Number(left) === Number(right);
    }
    
    // Strict equality for other types
    return left === right;
  },

  /**
   * Check if left value is greater than right value
   * 
   * @param {*} left - Left value
   * @param {*} right - Right value
   * @returns {boolean} - True if left > right
   * 
   * @private
   */
  greaterThan(left, right) {
    const leftNum = Number(left);
    const rightNum = Number(right);
    
    if (isNaN(leftNum) || isNaN(rightNum)) {
      return false;
    }
    
    return leftNum > rightNum;
  },

  /**
   * Check if left value is greater than or equal to right value
   * 
   * @param {*} left - Left value
   * @param {*} right - Right value
   * @returns {boolean} - True if left >= right
   * 
   * @private
   */
  greaterThanOrEqual(left, right) {
    const leftNum = Number(left);
    const rightNum = Number(right);
    
    if (isNaN(leftNum) || isNaN(rightNum)) {
      return false;
    }
    
    return leftNum >= rightNum;
  },

  /**
   * Check if left value is less than right value
   * 
   * @param {*} left - Left value
   * @param {*} right - Right value
   * @returns {boolean} - True if left < right
   * 
   * @private
   */
  lessThan(left, right) {
    const leftNum = Number(left);
    const rightNum = Number(right);
    
    if (isNaN(leftNum) || isNaN(rightNum)) {
      return false;
    }
    
    return leftNum < rightNum;
  },

  /**
   * Check if left value is less than or equal to right value
   * 
   * @param {*} left - Left value
   * @param {*} right - Right value
   * @returns {boolean} - True if left <= right
   * 
   * @private
   */
  lessThanOrEqual(left, right) {
    const leftNum = Number(left);
    const rightNum = Number(right);
    
    if (isNaN(leftNum) || isNaN(rightNum)) {
      return false;
    }
    
    return leftNum <= rightNum;
  },

  /**
   * Check if left string contains right string (case-insensitive)
   * 
   * @param {*} left - Left value (will be converted to string)
   * @param {*} right - Right value (will be converted to string)
   * @returns {boolean} - True if left contains right
   * 
   * @private
   */
  contains(left, right) {
    const leftStr = String(left).toLowerCase();
    const rightStr = String(right).toLowerCase();
    return leftStr.includes(rightStr);
  },

  /**
   * Check if left value is in the right array
   * 
   * @param {*} left - Value to check
   * @param {Array} right - Array to check against
   * @returns {boolean} - True if left is in right array
   * 
   * @private
   */
  in(left, right) {
    if (!Array.isArray(right)) {
      return false;
    }
    
    // Case-insensitive comparison for strings
    if (typeof left === 'string') {
      return right.some(r => this.equals(left, r));
    }
    
    return right.includes(left);
  },

  /**
   * Check if left value is between right[0] and right[1] (inclusive)
   * 
   * @param {*} left - Value to check
   * @param {Array} right - Array with [min, max] values
   * @returns {boolean} - True if left is between min and max
   * 
   * @private
   */
  between(left, right) {
    if (!Array.isArray(right) || right.length !== 2) {
      return false;
    }
    
    const num = Number(left);
    const min = Number(right[0]);
    const max = Number(right[1]);
    
    if (isNaN(num) || isNaN(min) || isNaN(max)) {
      return false;
    }
    
    return num >= min && num <= max;
  },

  /**
   * Check if left string starts with right string (case-insensitive)
   * 
   * @param {*} left - Left value (will be converted to string)
   * @param {*} right - Right value (will be converted to string)
   * @returns {boolean} - True if left starts with right
   * 
   * @private
   */
  startsWith(left, right) {
    const leftStr = String(left).toLowerCase();
    const rightStr = String(right).toLowerCase();
    return leftStr.startsWith(rightStr);
  },

  /**
   * Check if left string ends with right string (case-insensitive)
   * 
   * @param {*} left - Left value (will be converted to string)
   * @param {*} right - Right value (will be converted to string)
   * @returns {boolean} - True if left ends with right
   * 
   * @private
   */
  endsWith(left, right) {
    const leftStr = String(left).toLowerCase();
    const rightStr = String(right).toLowerCase();
    return leftStr.endsWith(rightStr);
  },

  /**
   * Evaluate null/undefined values
   * 
   * @param {*} left - Left value (may be null/undefined)
   * @param {string} operator - Operator
   * @param {*} right - Right value
   * @returns {boolean} - Result of comparison
   * 
   * @private
   */
  _evaluateNull(left, operator, right) {
    switch (operator) {
      case OPERATOR_TYPES.EQUALS:
        return right === null || right === undefined;
      case OPERATOR_TYPES.NOT_EQUALS:
        return right !== null && right !== undefined;
      default:
        return false;
    }
  },

  /**
   * Check if value is numeric (including string numbers)
   * 
   * @param {*} value - Value to check
   * @returns {boolean} - True if value is numeric
   * 
   * @private
   */
  _isNumeric(value) {
    if (typeof value === 'number') {
      return !isNaN(value) && isFinite(value);
    }
    if (typeof value === 'string') {
      const num = Number(value);
      return !isNaN(num) && isFinite(num);
    }
    return false;
  }
};

