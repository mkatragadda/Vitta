/**
 * Query Validators
 * 
 * Provides validation functions for query fields, operators, and values.
 * Ensures data quality and prevents invalid queries.
 * 
 * @module utils/query/validators
 */

/**
 * Known card fields that are commonly used in queries
 * This list is for validation warnings, not strict enforcement
 * to allow for dynamic fields and future extensibility
 * 
 * @type {string[]}
 */
export const KNOWN_CARD_FIELDS = [
  // Identity fields
  'id',
  'user_id',
  'catalog_id',
  
  // Card information
  'card_name',
  'nickname',
  'card_network',
  'issuer',
  'card_type',
  
  // Financial fields
  'current_balance',
  'credit_limit',
  'available_credit',
  'apr',
  'amount_to_pay',
  'minimum_payment',
  
  // Date fields
  'due_date',
  'payment_due_day',
  'statement_close_day',
  'statement_close_date',
  'payment_due_date',
  
  // Status fields
  'utilization',
  'is_overdue',
  'paid_in_full_last_month',
  'is_manual_entry',
  
  // Reward fields
  'reward_structure',
  'annual_fee',
  'grace_period_days'
];

/**
 * Valid logical operators for combining filters
 * @type {string[]}
 */
export const LOGICAL_OPERATORS = ['AND', 'OR'];

/**
 * Query validation utilities
 */
export const validateQuery = {
  /**
   * Validate a field name
   * 
   * @param {string} field - Field name to validate
   * @param {boolean} strict - If true, only allow known fields (default: false)
   * @throws {Error} - If field is invalid
   * 
   * @example
   * validateQuery.validateField('current_balance') // OK
   * validateQuery.validateField('') // Error
   */
  validateField(field, strict = false) {
    if (!field || typeof field !== 'string') {
      throw new Error(`Invalid field: ${field}. Field must be a non-empty string.`);
    }
    
    if (field.trim().length === 0) {
      throw new Error('Field name cannot be empty or whitespace only.');
    }
    
    // Warn about unknown fields but allow them for extensibility
    if (!KNOWN_CARD_FIELDS.includes(field)) {
      console.warn(
        `[QueryValidator] Unknown field "${field}" used in query. ` +
        `Known fields: ${KNOWN_CARD_FIELDS.slice(0, 5).join(', ')}...`
      );
    }
    
    // Strict mode: only allow known fields
    if (strict && !KNOWN_CARD_FIELDS.includes(field)) {
      throw new Error(
        `Unknown field: ${field}. Valid fields: ${KNOWN_CARD_FIELDS.join(', ')}`
      );
    }
  },

  /**
   * Validate an operator
   * 
   * @param {string} operator - Operator to validate
   * @param {*} value - Value that will be used with this operator
   * @throws {Error} - If operator is invalid or incompatible with value
   * 
   * @example
   * validateQuery.validateOperator('>', 1000) // OK
   * validateQuery.validateOperator('in', ['a', 'b']) // OK
   * validateQuery.validateOperator('in', 'not-array') // Error
   */
  validateOperator(operator, value) {
    if (!operator || typeof operator !== 'string') {
      throw new Error(`Invalid operator: ${operator}. Operator must be a non-empty string.`);
    }

    // Validate operator-specific value requirements
    if (operator === 'in') {
      if (!Array.isArray(value)) {
        throw new Error(
          `Operator "in" requires an array value. Received: ${typeof value}`
        );
      }
      if (value.length === 0) {
        throw new Error('Operator "in" requires a non-empty array.');
      }
    }

    if (operator === 'between') {
      if (!Array.isArray(value)) {
        throw new Error(
          `Operator "between" requires an array value. Received: ${typeof value}`
        );
      }
      if (value.length !== 2) {
        throw new Error(
          `Operator "between" requires an array with exactly 2 elements. Received: ${value.length}`
        );
      }
      const [min, max] = value;
      if (Number(min) > Number(max)) {
        throw new Error(
          `Operator "between" requires min <= max. Received: [${min}, ${max}]`
        );
      }
    }
  },

  /**
   * Validate a logical operator (AND/OR)
   * 
   * @param {string} logicalOperator - Logical operator to validate
   * @throws {Error} - If logical operator is invalid
   * 
   * @example
   * validateQuery.validateLogicalOperator('AND') // OK
   * validateQuery.validateLogicalOperator('XOR') // Error
   */
  validateLogicalOperator(logicalOperator) {
    if (!LOGICAL_OPERATORS.includes(logicalOperator)) {
      throw new Error(
        `Invalid logical operator: ${logicalOperator}. ` +
        `Valid operators: ${LOGICAL_OPERATORS.join(', ')}`
      );
    }
  },

  /**
   * Validate aggregation operation
   * 
   * @param {string} operation - Aggregation operation
   * @param {string|null} field - Field to aggregate (null for count)
   * @throws {Error} - If operation or field is invalid
   * 
   * @example
   * validateQuery.validateAggregation('sum', 'current_balance') // OK
   * validateQuery.validateAggregation('count', null) // OK
   * validateQuery.validateAggregation('invalid', 'field') // Error
   */
  validateAggregation(operation, field = null) {
    const validOperations = ['sum', 'avg', 'count', 'min', 'max', 'countDistinct'];
    
    if (!validOperations.includes(operation)) {
      throw new Error(
        `Invalid aggregation operation: ${operation}. ` +
        `Valid operations: ${validOperations.join(', ')}`
      );
    }

    // Count doesn't require a field
    if (operation === 'count') {
      return;
    }

    // Other operations require a field
    if (!field || typeof field !== 'string') {
      throw new Error(
        `Aggregation operation "${operation}" requires a field name.`
      );
    }

    this.validateField(field);
  },

  /**
   * Validate sort direction
   * 
   * @param {string} direction - Sort direction ('asc' or 'desc')
   * @throws {Error} - If direction is invalid
   * 
   * @example
   * validateQuery.validateSortDirection('asc') // OK
   * validateQuery.validateSortDirection('invalid') // Error
   */
  validateSortDirection(direction) {
    const validDirections = ['asc', 'desc'];
    const normalized = direction?.toLowerCase();
    
    if (!validDirections.includes(normalized)) {
      throw new Error(
        `Invalid sort direction: ${direction}. Valid directions: ${validDirections.join(', ')}`
      );
    }
  },

  /**
   * Validate limit value
   * 
   * @param {number} limit - Limit value
   * @throws {Error} - If limit is invalid
   * 
   * @example
   * validateQuery.validateLimit(10) // OK
   * validateQuery.validateLimit(-1) // Error
   */
  validateLimit(limit) {
    if (typeof limit !== 'number') {
      throw new Error(`Invalid limit: ${limit}. Limit must be a number.`);
    }
    
    if (limit < 0) {
      throw new Error(`Invalid limit: ${limit}. Limit must be non-negative.`);
    }
    
    if (!Number.isInteger(limit)) {
      throw new Error(`Invalid limit: ${limit}. Limit must be an integer.`);
    }
  },

  /**
   * Validate cards array
   * 
   * @param {Array} cards - Cards array to validate
   * @throws {Error} - If cards is invalid
   * 
   * @example
   * validateQuery.validateCards([{id: 1}]) // OK
   * validateQuery.validateCards('not-array') // Error
   */
  validateCards(cards) {
    if (!Array.isArray(cards)) {
      throw new Error(
        `Invalid cards: expected array, received ${typeof cards}`
      );
    }
  }
};

