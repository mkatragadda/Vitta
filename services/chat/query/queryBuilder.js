/**
 * Query Builder
 * 
 * A fluent, chainable query builder for filtering, aggregating, and transforming card data.
 * Provides a clean API for building complex queries with method chaining.
 * 
 * @module services/chat/query/queryBuilder
 * 
 * @example
 * const builder = new QueryBuilder(cards);
 * 
 * // Filter and sort
 * const results = builder
 *   .filter('card_network', '==', 'Visa')
 *   .filter('current_balance', '>', 5000)
 *   .sort('current_balance', 'desc')
 *   .limit(10)
 *   .execute();
 * 
 * // Distinct values
 * const issuers = builder
 *   .reset()
 *   .distinct('issuer', { includeCount: true })
 *   .execute();
 * 
 * // Aggregations
 * const total = builder
 *   .reset()
 *   .aggregate('sum', 'current_balance')
 *   .execute();
 */

import { OPERATORS, VALID_OPERATORS } from '../../../utils/query/operators.js';
import { validateQuery } from '../../../utils/query/validators.js';

/**
 * QueryBuilder class for building and executing queries on card data
 */
export class QueryBuilder {
  /**
   * Create a new QueryBuilder instance
   * 
   * @param {Array<Object>} cards - Array of card objects to query
   * @throws {Error} - If cards is not an array
   * 
   * @example
   * const builder = new QueryBuilder(userCards);
   */
  constructor(cards = []) {
    validateQuery.validateCards(cards);
    
    // Deep clone cards array to avoid mutation
    this.cards = cards.map(card => ({ ...card }));
    
    // Query state
    this.filters = [];
    this.aggregations = [];
    this.distinctConfig = null;
    this.sorting = null;
    this.grouping = null;
    this.limitCount = null;
    this.selectFields = null;
    
    // Cache for results (invalidated on state change)
    this._resultCache = null;
  }

  /**
   * Add a filter condition
   * 
   * @param {string} field - Card field to filter on
   * @param {string} operator - Comparison operator (==, !=, >, <, >=, <=, contains, in, between)
   * @param {*} value - Value to compare against
   * @param {string} logicalOperator - AND or OR (default: AND)
   * @returns {QueryBuilder} - Returns self for method chaining
   * @throws {Error} - If field, operator, or value is invalid
   * 
   * @example
   * builder.filter('card_network', '==', 'Visa')
   * builder.filter('current_balance', '>', 5000)
   * builder.filter('issuer', 'in', ['Chase', 'Citi'])
   * builder.filter('apr', 'between', [10, 25])
   */
  filter(field, operator, value, logicalOperator = 'AND') {
    validateQuery.validateField(field);
    // Validate operator exists in VALID_OPERATORS
    if (!VALID_OPERATORS.includes(operator)) {
      throw new Error(`Invalid operator: ${operator}. Valid operators: ${VALID_OPERATORS.join(', ')}`);
    }
    validateQuery.validateOperator(operator, value);
    validateQuery.validateLogicalOperator(logicalOperator);
    
    this.filters.push({
      field,
      operator,
      value,
      logicalOperator
    });
    
    this._invalidateCache();
    return this;
  }

  /**
   * Add a custom filter function
   * 
   * @param {Function} conditionFn - Function that takes a card and returns boolean
   * @returns {QueryBuilder} - Returns self for method chaining
   * @throws {Error} - If conditionFn is not a function
   * 
   * @example
   * builder.filterWhere(card => card.current_balance > card.credit_limit * 0.8)
   */
  filterWhere(conditionFn) {
    if (typeof conditionFn !== 'function') {
      throw new Error('filterWhere requires a function that takes a card and returns a boolean');
    }
    
    this.filters.push({
      type: 'custom',
      fn: conditionFn
    });
    
    this._invalidateCache();
    return this;
  }

  /**
   * Add an aggregation operation
   * 
   * @param {string} operation - Aggregation operation (sum, avg, count, min, max, countDistinct)
   * @param {string|null} field - Field to aggregate (null for count)
   * @param {string|null} groupBy - Optional field to group by
   * @returns {QueryBuilder} - Returns self for method chaining
   * @throws {Error} - If operation or field is invalid
   * 
   * @example
   * builder.aggregate('sum', 'current_balance')
   * builder.aggregate('avg', 'apr')
   * builder.aggregate('count', null)
   * builder.groupBy('issuer').aggregate('sum', 'current_balance')
   */
  aggregate(operation, field = null, groupBy = null) {
    validateQuery.validateAggregation(operation, field);
    
    if (groupBy) {
      validateQuery.validateField(groupBy);
      this.grouping = groupBy;
    }
    
    this.aggregations.push({
      operation,
      field,
      groupBy: groupBy || this.grouping
    });
    
    this._invalidateCache();
    return this;
  }

  /**
   * Get distinct values for a field
   * 
   * @param {string} field - Field to get distinct values for
   * @param {Object} options - Options object
   * @param {boolean} options.includeCount - Include count per unique value (default: false)
   * @param {boolean} options.includeDetails - Include sample cards for each value (default: false)
   * @param {Object|null} options.withAggregation - Optional aggregation per distinct value
   * @returns {QueryBuilder} - Returns self for method chaining
   * @throws {Error} - If field is invalid
   * 
   * @example
   * builder.distinct('issuer', { includeCount: true })
   * builder.distinct('card_network', { includeCount: true, includeDetails: true })
   */
  distinct(field, options = {}) {
    validateQuery.validateField(field);
    
    this.distinctConfig = {
      field,
      includeCount: options.includeCount || false,
      includeDetails: options.includeDetails || false,
      withAggregation: options.withAggregation || null
    };
    
    this._invalidateCache();
    return this;
  }

  /**
   * Count distinct values for a field
   * 
   * @param {string} field - Field to count distinct values for
   * @returns {QueryBuilder} - Returns self for method chaining
   * 
   * @example
   * builder.countDistinct('issuer')
   */
  countDistinct(field) {
    return this.aggregate('countDistinct', field);
  }

  /**
   * Sort results by field
   * 
   * @param {string} field - Field to sort by
   * @param {string} direction - Sort direction: 'asc' or 'desc' (default: 'asc')
   * @param {number|null} limit - Optional limit on sorted results
   * @returns {QueryBuilder} - Returns self for method chaining
   * @throws {Error} - If field or direction is invalid
   * 
   * @example
   * builder.sort('current_balance', 'desc')
   * builder.sort('apr', 'asc', 10) // Top 10 by APR
   */
  sort(field, direction = 'asc', limit = null) {
    validateQuery.validateField(field);
    validateQuery.validateSortDirection(direction);
    
    if (limit !== null) {
      validateQuery.validateLimit(limit);
    }
    
    this.sorting = {
      field,
      direction: direction.toLowerCase(),
      limit
    };
    
    this._invalidateCache();
    return this;
  }

  /**
   * Group results by field
   * 
   * @param {string} field - Field to group by
   * @returns {QueryBuilder} - Returns self for method chaining
   * @throws {Error} - If field is invalid
   * 
   * @example
   * builder.groupBy('issuer').aggregate('sum', 'current_balance')
   */
  groupBy(field) {
    validateQuery.validateField(field);
    this.grouping = field;
    this._invalidateCache();
    return this;
  }

  /**
   * Select specific fields to return
   * 
   * @param {string[]} fields - Array of field names to include in results
   * @returns {QueryBuilder} - Returns self for method chaining
   * @throws {Error} - If fields is not an array
   * 
   * @example
   * builder.select(['card_name', 'current_balance', 'apr'])
   */
  select(fields) {
    if (!Array.isArray(fields)) {
      throw new Error('select requires an array of field names');
    }
    
    if (fields.length === 0) {
      throw new Error('select requires at least one field name');
    }
    
    // Validate all fields
    fields.forEach(field => validateQuery.validateField(field));
    
    this.selectFields = [...fields];
    return this;
  }

  /**
   * Limit number of results
   * 
   * @param {number} count - Maximum number of results to return
   * @returns {QueryBuilder} - Returns self for method chaining
   * @throws {Error} - If count is invalid
   * 
   * @example
   * builder.limit(10) // Top 10 results
   */
  limit(count) {
    validateQuery.validateLimit(count);
    this.limitCount = count;
    this._invalidateCache();
    return this;
  }

  /**
   * Execute the query and return results
   * 
   * @returns {Object} - Query results with metadata
   * @property {Array|Object} results - Query results (array for lists, object for aggregations)
   * @property {Object} metadata - Execution metadata (count, executionTime, etc.)
   * 
   * @example
   * const { results, metadata } = builder.execute();
   */
  execute() {
    const startTime = Date.now();
    
    // Apply filters first
    let filteredCards = this._applyFilters(this.cards);
    
    // Handle distinct query (mutually exclusive with aggregations)
    if (this.distinctConfig) {
      return this._executeDistinct(filteredCards, startTime);
    }
    
    // Handle aggregations
    if (this.aggregations.length > 0) {
      return this._executeAggregations(filteredCards, startTime);
    }
    
    // Apply sorting
    if (this.sorting) {
      filteredCards = this._applySorting(filteredCards);
    }
    
    // Apply limit
    if (this.limitCount !== null) {
      filteredCards = filteredCards.slice(0, this.limitCount);
    }
    
    // Apply field selection
    if (this.selectFields) {
      filteredCards = this._applySelection(filteredCards);
    }
    
    const executionTime = Date.now() - startTime;
    
    return {
      results: filteredCards,
      metadata: {
        count: filteredCards.length,
        totalCards: this.cards.length,
        filtersApplied: this.filters.length,
        executionTime,
        sorting: this.sorting,
        limit: this.limitCount
      }
    };
  }

  /**
   * Apply all filters to cards array
   * 
   * @param {Array} cards - Cards to filter
   * @returns {Array} - Filtered cards
   * @private
   */
  _applyFilters(cards) {
    if (this.filters.length === 0) {
      return cards;
    }
    
    return cards.filter(card => {
      let result = true;
      
      for (let i = 0; i < this.filters.length; i++) {
        const filter = this.filters[i];
        let matches;
        
        if (filter.type === 'custom') {
          matches = filter.fn(card);
        } else {
          const fieldValue = card[filter.field];
          matches = OPERATORS.evaluate(fieldValue, filter.operator, filter.value);
        }
        
        // Apply logical operator (AND/OR)
        if (i === 0) {
          result = matches;
        } else {
          const prevFilter = this.filters[i - 1];
          if (prevFilter.logicalOperator === 'AND') {
            result = result && matches;
          } else if (prevFilter.logicalOperator === 'OR') {
            result = result || matches;
          }
        }
      }
      
      return result;
    });
  }

  /**
   * Execute distinct query
   * 
   * @param {Array} cards - Filtered cards
   * @param {number} startTime - Execution start time
   * @returns {Object} - Distinct query results
   * @private
   */
  _executeDistinct(cards, startTime) {
    const field = this.distinctConfig.field;
    const valueMap = new Map();
    
    cards.forEach(card => {
      const value = card[field];
      
      // Skip null/undefined values
      if (value === null || value === undefined) {
        return;
      }
      
      // Use normalized key for case-insensitive string comparison
      const key = typeof value === 'string' ? value.toLowerCase() : value;
      
      if (!valueMap.has(key)) {
        valueMap.set(key, {
          value: value, // Store original value
          count: 0,
          cards: []
        });
      }
      
      const entry = valueMap.get(key);
      entry.count++;
      
      // Store sample cards if requested
      if (this.distinctConfig.includeDetails && entry.cards.length < 3) {
        entry.cards.push(card);
      }
    });
    
    const distinctValues = Array.from(valueMap.values());
    
    // Sort by count descending if count is included
    if (this.distinctConfig.includeCount) {
      distinctValues.sort((a, b) => b.count - a.count);
    }
    
    // Apply limit if specified
    let finalValues = distinctValues;
    if (this.limitCount !== null) {
      finalValues = distinctValues.slice(0, this.limitCount);
    }
    
    const executionTime = Date.now() - startTime;
    
    return {
      values: finalValues.map(item => ({
        value: item.value,
        count: this.distinctConfig.includeCount ? item.count : undefined,
        cards: this.distinctConfig.includeDetails ? item.cards : undefined
      })),
      total: distinctValues.length,
      metadata: {
        field,
        executionTime,
        totalCards: cards.length,
        filtersApplied: this.filters.length
      }
    };
  }

  /**
   * Execute aggregation operations
   * 
   * @param {Array} cards - Filtered cards
   * @param {number} startTime - Execution start time
   * @returns {Object} - Aggregation results
   * @private
   */
  _executeAggregations(cards, startTime) {
    const results = [];
    
    if (this.grouping) {
      // Grouped aggregation
      const groups = new Map();
      
      cards.forEach(card => {
        const groupKey = card[this.grouping];
        
        // Handle null/undefined group keys
        const normalizedKey = groupKey === null || groupKey === undefined 
          ? '__null__' 
          : String(groupKey);
        
        if (!groups.has(normalizedKey)) {
          groups.set(normalizedKey, []);
        }
        groups.get(normalizedKey).push(card);
      });
      
      groups.forEach((groupCards, groupKey) => {
        const result = {
          [this.grouping]: groupKey === '__null__' ? null : groupKey
        };
        
        this.aggregations.forEach(agg => {
          const value = this._calculateAggregation(groupCards, agg);
          const key = agg.field 
            ? `${agg.operation}_${agg.field}` 
            : `${agg.operation}_*`;
          result[key] = value;
        });
        
        results.push(result);
      });
      
      // Sort results by first aggregation value (descending)
      if (results.length > 0 && this.aggregations.length > 0) {
        const firstAggKey = Object.keys(results[0]).find(k => k !== this.grouping);
        if (firstAggKey) {
          results.sort((a, b) => {
            const aVal = Number(a[firstAggKey]) || 0;
            const bVal = Number(b[firstAggKey]) || 0;
            return bVal - aVal; // Descending
          });
        }
      }
    } else {
      // Simple aggregation (no grouping)
      const result = {};
      
      this.aggregations.forEach(agg => {
        const value = this._calculateAggregation(cards, agg);
        const key = agg.field 
          ? `${agg.operation}_${agg.field}` 
          : `${agg.operation}_*`;
        result[key] = value;
      });
      
      results.push(result);
    }
    
    const executionTime = Date.now() - startTime;
    
    return {
      results: results.length === 1 && !this.grouping ? results[0] : results,
      metadata: {
        aggregations: this.aggregations.length,
        grouping: this.grouping,
        executionTime,
        totalCards: cards.length,
        filtersApplied: this.filters.length
      }
    };
  }

  /**
   * Calculate aggregation value for a set of cards
   * 
   * @param {Array} cards - Cards to aggregate
   * @param {Object} aggregation - Aggregation configuration
   * @returns {number} - Aggregated value
   * @private
   */
  _calculateAggregation(cards, aggregation) {
    const { operation, field } = aggregation;
    
    if (operation === 'count') {
      return cards.length;
    }
    
    if (operation === 'countDistinct') {
      const distinctValues = new Set(
        cards
          .map(c => c[field])
          .filter(v => v !== null && v !== undefined)
      );
      return distinctValues.size;
    }
    
    // Extract numeric values for numeric aggregations
    const values = cards
      .map(c => c[field])
      .filter(v => v !== null && v !== undefined)
      .map(v => Number(v))
      .filter(v => !isNaN(v) && isFinite(v));
    
    if (values.length === 0) {
      return 0;
    }
    
    switch (operation) {
      case 'sum':
        return values.reduce((sum, v) => sum + v, 0);
      
      case 'avg':
        return values.reduce((sum, v) => sum + v, 0) / values.length;
      
      case 'min':
        return Math.min(...values);
      
      case 'max':
        return Math.max(...values);
      
      default:
        return 0;
    }
  }

  /**
   * Apply sorting to cards array
   * 
   * @param {Array} cards - Cards to sort
   * @returns {Array} - Sorted cards
   * @private
   */
  _applySorting(cards) {
    const { field, direction } = this.sorting;
    const sorted = [...cards].sort((a, b) => {
      const aVal = a[field];
      const bVal = b[field];
      
      // Handle null/undefined values (sort to end)
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return direction === 'asc' ? 1 : -1;
      if (bVal == null) return direction === 'asc' ? -1 : 1;
      
      // Numeric comparison
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      // String comparison (case-insensitive)
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      
      if (direction === 'asc') {
        return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
      } else {
        return aStr > bStr ? -1 : aStr < bStr ? 1 : 0;
      }
    });
    
    // Apply limit from sorting if specified
    if (this.sorting.limit) {
      return sorted.slice(0, this.sorting.limit);
    }
    
    return sorted;
  }

  /**
   * Apply field selection to cards
   * 
   * @param {Array} cards - Cards to select fields from
   * @returns {Array} - Cards with selected fields only
   * @private
   */
  _applySelection(cards) {
    return cards.map(card => {
      const selected = {};
      this.selectFields.forEach(field => {
        if (card.hasOwnProperty(field)) {
          selected[field] = card[field];
        }
      });
      return selected;
    });
  }

  /**
   * Invalidate result cache
   * 
   * @private
   */
  _invalidateCache() {
    this._resultCache = null;
  }

  /**
   * Clone builder for parallel queries
   * 
   * @returns {QueryBuilder} - New QueryBuilder instance with same state
   * 
   * @example
   * const builder1 = new QueryBuilder(cards).filter('issuer', '==', 'Chase');
   * const builder2 = builder1.clone().filter('balance', '>', 1000);
   * // builder1 still has only the issuer filter
   * // builder2 has both filters
   */
  clone() {
    const cloned = new QueryBuilder(this.cards);
    cloned.filters = [...this.filters];
    cloned.aggregations = [...this.aggregations];
    cloned.distinctConfig = this.distinctConfig ? { ...this.distinctConfig } : null;
    cloned.sorting = this.sorting ? { ...this.sorting } : null;
    cloned.grouping = this.grouping;
    cloned.limitCount = this.limitCount;
    cloned.selectFields = this.selectFields ? [...this.selectFields] : null;
    return cloned;
  }

  /**
   * Reset builder to initial state
   * 
   * @returns {QueryBuilder} - Returns self for method chaining
   * 
   * @example
   * builder.filter('issuer', '==', 'Chase').execute();
   * builder.reset().filter('network', '==', 'Visa').execute();
   */
  reset() {
    this.filters = [];
    this.aggregations = [];
    this.distinctConfig = null;
    this.sorting = null;
    this.grouping = null;
    this.limitCount = null;
    this.selectFields = null;
    this._invalidateCache();
    return this;
  }
}

