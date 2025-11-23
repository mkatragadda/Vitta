/**
 * Query Decomposer
 * 
 * Converts natural language queries + extracted entities into structured query objects
 * that can be executed by QueryBuilder. This is the bridge between NLU and query execution.
 * 
 * @module services/chat/query/queryDecomposer
 * 
 * @example
 * const decomposer = new QueryDecomposer(context);
 * const entities = extractEntities("what are the different issuers in my wallet");
 * const structuredQuery = decomposer.decompose(query, entities, 'query_card_data');
 * 
 * // Result:
 * // {
 * //   intent: 'query_card_data',
 * //   subIntent: 'distinct',
 * //   distinct: { field: 'issuer', includeCount: true },
 * //   outputFormat: 'list'
 * // }
 */

/**
 * Field mappings from natural language to card database fields
 * @type {Object<string, string>}
 */
const FIELD_MAP = {
  // Identity Fields
  'issuer': 'issuer',
  'issuers': 'issuer',
  'bank': 'issuer',
  'banks': 'issuer',
  'card_network': 'card_network',
  'network': 'card_network',
  'networks': 'card_network',
  'card_type': 'card_type',
  'type': 'card_type',
  'types': 'card_type',
  'card_name': 'card_name',
  'name': 'card_name',
  'nickname': 'nickname',
  'nick': 'nickname',
  'alias': 'nickname',
  
  // Financial Fields
  'balance': 'current_balance',
  'balances': 'current_balance',
  'debt': 'current_balance',
  'owed': 'current_balance',
  'outstanding': 'current_balance',
  'apr': 'apr',
  'interest_rate': 'apr',
  'rate': 'apr',
  'annual_percentage_rate': 'apr',
  'credit_limit': 'credit_limit',
  'limit': 'credit_limit',
  'max': 'credit_limit',
  'annual_fee': 'annual_fee',
  'fee': 'annual_fee',
  'yearly_fee': 'annual_fee',
  'amount_to_pay': 'amount_to_pay',
  'payment_amount': 'amount_to_pay',
  
  // Computed Fields (calculated, not stored in DB)
  'utilization': 'utilization',
  'usage': 'utilization',
  'available_credit': 'available_credit',
  'available': 'available_credit',
  'remaining_credit': 'available_credit',
  
  // Date/Time Fields
  'due_date': 'payment_due_date', // Maps to payment_due_date for actual date queries
  'payment_due': 'payment_due_date',
  'due': 'payment_due_date',
  'payment_due_day': 'payment_due_day', // Day of month (1-31)
  'statement_close': 'statement_cycle_end',
  'statement_end': 'statement_cycle_end',
  'statement_cycle_end': 'statement_cycle_end',
  'statement_close_day': 'statement_close_day', // Day of month (1-31)
  'statement_start': 'statement_cycle_start',
  'statement_cycle_start': 'statement_cycle_start',
  'grace_period': 'grace_period_days',
  'grace': 'grace_period_days',
  'grace_period_days': 'grace_period_days',
  
  // Rewards (JSONB field - requires special handling)
  'rewards': 'reward_structure',
  'reward_structure': 'reward_structure',
  'points': 'reward_structure',
  'cashback': 'reward_structure',
  'miles': 'reward_structure',
  
  // Metadata (rarely queried directly, but supported)
  'is_manual_entry': 'is_manual_entry',
  'manual_entry': 'is_manual_entry',
  'created_at': 'created_at',
  'updated_at': 'updated_at'
};

/**
 * Operator mappings from natural language to query operators
 * @type {Object<string, string>}
 */
const OPERATOR_MAP = {
  'over': '>',
  'above': '>',
  'greater than': '>',
  'more than': '>',
  'less than': '<',
  'below': '<',
  'under': '<',
  'equal to': '==',
  'equals': '==',
  'is': '==',
  'contains': 'contains'
};

/**
 * QueryDecomposer class for converting NL queries to structured queries
 * 
 * Phase 6: Now integrates with PatternLearner for pattern-based decomposition
 */
export class QueryDecomposer {
  /**
   * Create a new QueryDecomposer instance
   * 
   * @param {Object} context - Conversation context (optional)
   * @property {Object} context.previousQuery - Previous query for context
   * @property {Object} context.activeFilters - Active filters from previous query
   * @property {string} context.userProfile - User profile (REWARDS_MAXIMIZER, etc.)
   * @property {Object} context.patternLearner - PatternLearner instance (optional, will be created if not provided)
   * @property {boolean} context.enablePatternLearning - Enable pattern learning (default: true)
   * 
   * @example
   * const decomposer = new QueryDecomposer({ userProfile: 'REWARDS_MAXIMIZER' });
   */
  constructor(context = {}) {
    this.context = {
      previousQuery: context.previousQuery || null,
      activeFilters: context.activeFilters || [],
      userProfile: context.userProfile || null,
      selectedCards: context.selectedCards || [],
      enablePatternLearning: context.enablePatternLearning !== false,
      ...context
    };

    // Phase 6: Initialize PatternLearner if not provided and pattern learning is enabled
    if (this.context.enablePatternLearning && !this.context.patternLearner) {
      try {
        const { PatternLearner } = require('../learning/patternLearner.js');
        this.patternLearner = new PatternLearner();
      } catch (error) {
        console.warn('[QueryDecomposer] PatternLearner not available, pattern learning disabled:', error.message);
        this.context.enablePatternLearning = false;
      }
    } else if (this.context.patternLearner) {
      this.patternLearner = this.context.patternLearner;
    }

    // Store last decomposition for learning
    this.lastDecomposition = null;
  }

  /**
   * Decompose natural language query + entities into structured query object
   * 
   * @param {string} query - Original user query
   * @param {Object} entities - Extracted entities from entityExtractor
   * @param {string} intent - Detected intent (e.g., 'query_card_data')
   * @returns {Object} - Structured query object for QueryBuilder
   * 
   * @example
   * const entities = extractEntities("what are the different issuers");
   * const structured = decomposer.decompose("what are the different issuers", entities, 'query_card_data');
   */
  async decompose(query, entities, intent) {
    if (!entities || !query) {
      throw new Error('QueryDecomposer: query and entities are required');
    }

    // Phase 6: Try pattern matching first if pattern learning is enabled
    if (this.context.enablePatternLearning && this.patternLearner) {
      try {
        const matchingPattern = await this.patternLearner.findMatchingPattern(query, entities, intent);
        
        if (matchingPattern && matchingPattern.confidence >= 0.8 && matchingPattern.similarity >= 0.85) {
          console.log(`[QueryDecomposer] Using learned pattern: ${matchingPattern.id} (confidence: ${matchingPattern.confidence})`);
          
          // Use pattern's decomposed query as base
          const structuredQuery = {
            ...matchingPattern.decomposedQuery,
            patternId: matchingPattern.id, // Store pattern ID for tracking
            decompositionMethod: 'pattern_match',
            context: this.context
          };

          // Store for learning later (will be called after successful execution)
          this.lastDecomposition = {
            query,
            entities,
            structuredQuery,
            patternId: matchingPattern.id,
            intent
          };

          return structuredQuery;
        }
      } catch (error) {
        console.warn('[QueryDecomposer] Pattern matching failed, falling back to normal decomposition:', error);
        // Fall through to normal decomposition
      }
    }

    // Normal decomposition (no pattern match or pattern learning disabled)
    const structuredQuery = this._decomposeNormally(query, entities, intent);
    
    // Store for learning later
    this.lastDecomposition = {
      query,
      entities,
      structuredQuery,
      patternId: null,
      intent
    };

    return structuredQuery;
  }

  /**
   * Normal decomposition (without pattern matching)
   * @private
   */
  _decomposeNormally(query, entities, intent) {
    // Start with base structure
    const structuredQuery = {
      intent: intent || 'query_card_data',
      subIntent: null,
      action: entities.action || 'list',
      filters: [],
      aggregations: [],
      distinct: null,
      sorting: null,
      grouping: null,
      outputFormat: 'table',
      decompositionMethod: 'direct',
      context: this.context
    };

    // Detect distinct query first (highest priority)
    if (entities.distinctQuery?.isDistinct) {
      return this._decomposeDistinct(query, entities, structuredQuery);
    }

    // Detect aggregations
    if (entities.aggregation) {
      return this._decomposeAggregation(query, entities, structuredQuery);
    }

    // Detect compound filters
    if (entities.compoundOperators?.logicalOperators?.length > 0) {
      return this._decomposeCompoundFilters(query, entities, structuredQuery);
    }

    // Detect simple filters
    if (entities.attribute || entities.modifier || entities.balanceFilter) {
      return this._decomposeSimpleQuery(query, entities, structuredQuery);
    }

    // Default: listing query
    structuredQuery.subIntent = 'listing';
    structuredQuery.outputFormat = 'table';
    return structuredQuery;
  }

  /**
   * Learn from successful decomposition (called after successful execution)
   * Phase 6: Stores pattern for future use
   * 
   * @param {Object} result - Query execution result
   * @returns {Promise<void>}
   */
  async learnFromSuccess(result) {
    if (!this.context.enablePatternLearning || !this.patternLearner || !this.lastDecomposition) {
      return; // Pattern learning disabled or no decomposition to learn from
    }

    try {
      const { query, entities, structuredQuery, patternId, intent } = this.lastDecomposition;

      // If pattern was used, just record usage (don't create duplicate)
      if (patternId) {
        const responseTime = result.queryMetadata?.responseTime || null;
        await this.patternLearner.recordPatternUsage(patternId, responseTime);
        return;
      }

      // Otherwise, learn new pattern (only if result is successful)
      if (result && result.total !== 0 && (result.values || result.results)) {
        await this.patternLearner.learnPattern(
          query,
          entities,
          structuredQuery,
          result,
          intent
        );
        
        console.log(`[QueryDecomposer] Learned new pattern from query: "${query.substring(0, 50)}"`);
      }
    } catch (error) {
      console.error('[QueryDecomposer] Error learning from success:', error);
      // Don't throw - learning shouldn't break query execution
    }
  }

  /**
   * Update context for follow-up queries
   * 
   * @param {Object} structuredQuery - Last structured query
   * @param {Object} result - Query execution result
   */
  updateContext(structuredQuery, result) {
    // Update context with last query and active filters
    this.context.previousQuery = structuredQuery;
    this.context.lastResult = result;
    
    // Store active filters for context
    if (structuredQuery.filters && structuredQuery.filters.length > 0) {
      this.context.activeFilters = structuredQuery.filters;
    }
  }

  /**
   * Decompose distinct query
   * 
   * @param {string} query - User query
   * @param {Object} entities - Extracted entities
   * @param {Object} structuredQuery - Base structured query
   * @returns {Object} - Structured query with distinct configuration
   * @private
   */
  _decomposeDistinct(query, entities, structuredQuery) {
    const distinctConfig = entities.distinctQuery;
    const field = this._mapField(distinctConfig.field || 'issuer');

    // Determine if we should include count/details
    const lowerQuery = query.toLowerCase();
    
    // Include count if query asks "how many" or explicitly mentions count/number
    const includeCount = /(?:how many|count|number)/i.test(lowerQuery) || 
                         /(?:with|showing).*(?:count|number)/i.test(lowerQuery) ||
                         // Default to true for most distinct queries (they usually want to know counts)
                         true; // Default to including count for distinct queries
    
    // Include details (sample cards) if breakdown/distribution is mentioned
    const includeDetails = /(?:show|with|including).*(?:details|cards|examples)/i.test(lowerQuery) ||
                           /(?:breakdown|distribution)/i.test(lowerQuery);

    // Apply filters if present
    if (entities.balanceFilter) {
      if (entities.balanceFilter === 'with_balance') {
        structuredQuery.filters.push({
          field: 'current_balance',
          operator: '>',
          value: 0,
          logicalOperator: 'AND'
        });
      } else if (entities.balanceFilter === 'zero_balance') {
        structuredQuery.filters.push({
          field: 'current_balance',
          operator: '==',
          value: 0,
          logicalOperator: 'AND'
        });
      }
    }

    structuredQuery.subIntent = 'distinct';
    structuredQuery.distinct = {
      field: field,
      includeCount: includeCount,
      includeDetails: includeDetails,
      withAggregation: null
    };
    structuredQuery.outputFormat = 'list';

    return structuredQuery;
  }

  /**
   * Decompose aggregation query
   * 
   * @param {string} query - User query
   * @param {Object} entities - Extracted entities
   * @param {Object} structuredQuery - Base structured query
   * @returns {Object} - Structured query with aggregation configuration
   * @private
   */
  _decomposeAggregation(query, entities, structuredQuery) {
    const aggregation = entities.aggregation;
    const field = aggregation.field ? this._mapField(aggregation.field) : null;

    // Check if this is a grouped aggregation
    if (entities.grouping) {
      structuredQuery.grouping = this._mapField(entities.grouping.groupBy);
      structuredQuery.subIntent = 'grouped_aggregation';
    } else {
      structuredQuery.subIntent = 'aggregation';
    }

    // Add aggregation operation
    structuredQuery.aggregations.push({
      operation: aggregation.operation,
      field: field,
      groupBy: structuredQuery.grouping || null
    });

    // Apply filters if present
    this._applyFilters(entities, structuredQuery, query);

    // Apply sorting if needed (e.g., "highest balance", "lowest APR")
    if (entities.modifier === 'highest' || entities.modifier === 'lowest') {
      if (field) {
        structuredQuery.sorting = {
          field: field,
          direction: entities.modifier === 'highest' ? 'desc' : 'asc',
          limit: 1 // Get top 1
        };
      }
    }

    structuredQuery.outputFormat = 'summary';

    return structuredQuery;
  }

  /**
   * Decompose compound filter query
   * 
   * @param {string} query - User query
   * @param {Object} entities - Extracted entities
   * @param {Object} structuredQuery - Base structured query
   * @returns {Object} - Structured query with compound filters
   * @private
   */
  _decomposeCompoundFilters(query, entities, structuredQuery) {
    structuredQuery.subIntent = 'filter';
    
    // Extract multiple filter conditions from query
    // This is a simplified version - full implementation would parse conditions more carefully
    const logicalOperators = entities.compoundOperators.logicalOperators;
    
    // Apply balance filter if present
    if (entities.balanceFilter) {
      if (entities.balanceFilter === 'with_balance') {
        structuredQuery.filters.push({
          field: 'current_balance',
          operator: '>',
          value: 0,
          logicalOperator: logicalOperators[0] || 'AND'
        });
      }
    }

    // Extract numeric comparisons (e.g., "balance over 5000", "APR less than 25")
    const numericPatterns = [
      { pattern: /(?:balance|debt|owed).*?(?:over|above|greater than|more than)\s+(\d+)/i, field: 'current_balance', op: '>' },
      { pattern: /(?:balance|debt|owed).*?(?:under|below|less than)\s+(\d+)/i, field: 'current_balance', op: '<' },
      { pattern: /(?:apr|interest rate|rate).*?(?:over|above|greater than|more than)\s+(\d+)/i, field: 'apr', op: '>' },
      { pattern: /(?:apr|interest rate|rate).*?(?:under|below|less than)\s+(\d+)/i, field: 'apr', op: '<' }
    ];

    for (const { pattern, field, op } of numericPatterns) {
      const match = query.match(pattern);
      if (match && match[1]) {
        structuredQuery.filters.push({
          field: field,
          operator: op,
          value: parseFloat(match[1]),
          logicalOperator: logicalOperators[0] || 'AND'
        });
      }
    }

    // Apply other entity-based filters (including network/issuer)
    this._applyFilters(entities, structuredQuery, query);

    structuredQuery.outputFormat = 'table';
    return structuredQuery;
  }

  /**
   * Decompose simple query (single filter, listing, etc.)
   * 
   * @param {string} query - User query
   * @param {Object} entities - Extracted entities
   * @param {Object} structuredQuery - Base structured query
   * @returns {Object} - Structured query
   * @private
   */
  _decomposeSimpleQuery(query, entities, structuredQuery) {
    // Apply filters
    this._applyFilters(entities, structuredQuery);

    // Apply sorting based on modifier
    if (entities.modifier) {
      if (entities.attribute && entities.modifier) {
        const field = this._mapField(entities.attribute);
        structuredQuery.sorting = {
          field: field,
          direction: ['highest', 'best', 'worst', 'max'].includes(entities.modifier) ? 'desc' : 'asc',
          limit: entities.modifier === 'total' ? null : 1 // Get top 1 for highest/lowest
        };
      }
    }

    structuredQuery.subIntent = entities.queryType || 'filter';
    structuredQuery.outputFormat = 'table';

    return structuredQuery;
  }

  /**
   * Apply filters from entities to structured query
   * 
   * @param {Object} entities - Extracted entities
   * @param {Object} structuredQuery - Structured query to modify
   * @param {string} query - Original query for text parsing (optional)
   * @private
   */
  _applyFilters(entities, structuredQuery, query = '') {
    // Balance filter
    if (entities.balanceFilter) {
      if (entities.balanceFilter === 'with_balance') {
        structuredQuery.filters.push({
          field: 'current_balance',
          operator: '>',
          value: 0,
          logicalOperator: 'AND'
        });
      } else if (entities.balanceFilter === 'zero_balance') {
        structuredQuery.filters.push({
          field: 'current_balance',
          operator: '==',
          value: 0,
          logicalOperator: 'AND'
        });
      }
    }

    // Network filter (from query text parsing - simplified)
    // Full implementation would extract from entities
    if (entities.card_network) {
      structuredQuery.filters.push({
        field: 'card_network',
        operator: '==',
        value: entities.card_network,
        logicalOperator: 'AND'
      });
    }

    // Extract network/issuer from query text if not in entities
    const lowerQuery = query.toLowerCase();
    
    // Network filters
    if (lowerQuery.includes('visa') && !structuredQuery.filters.some(f => f.field === 'card_network')) {
      structuredQuery.filters.push({
        field: 'card_network',
        operator: '==',
        value: 'Visa',
        logicalOperator: 'AND'
      });
    }
    if (lowerQuery.includes('mastercard') && !structuredQuery.filters.some(f => f.field === 'card_network')) {
      structuredQuery.filters.push({
        field: 'card_network',
        operator: '==',
        value: 'Mastercard',
        logicalOperator: 'AND'
      });
    }

    // Issuer filters
    const issuerMap = {
      'chase': 'Chase',
      'citi': 'Citi',
      'amex': 'American Express',
      'american express': 'American Express',
      'capital one': 'Capital One',
      'discover': 'Discover'
    };

    for (const [key, value] of Object.entries(issuerMap)) {
      if (lowerQuery.includes(key) && !structuredQuery.filters.some(f => f.field === 'issuer' && f.value === value)) {
        structuredQuery.filters.push({
          field: 'issuer',
          operator: '==',
          value: value,
          logicalOperator: 'AND'
        });
        break; // Only add first matching issuer
      }
    }
  }

  /**
   * Map natural language field name to database field
   * 
   * @param {string} fieldName - Natural language field name
   * @returns {string} - Database field name
   * @private
   */
  _mapField(fieldName) {
    if (!fieldName) return null;
    
    const normalized = fieldName.toLowerCase().trim();
    return FIELD_MAP[normalized] || normalized; // Return mapped field or original if not found
  }

  /**
   * Map natural language operator to query operator
   * 
   * @param {string} operator - Natural language operator
   * @returns {string} - Query operator
   * @private
   */
  _mapOperator(operator) {
    if (!operator) return '==';
    
    const normalized = operator.toLowerCase().trim();
    return OPERATOR_MAP[normalized] || operator; // Return mapped operator or original
  }

  /**
   * Update context after query execution
   * 
   * @param {Object} structuredQuery - Structured query that was executed
   * @param {Object} results - Query results
   */
  updateContext(structuredQuery, results) {
    this.context.previousQuery = structuredQuery;
    this.context.activeFilters = structuredQuery.filters || [];
    this.context.lastResults = results;
  }

  /**
   * Clear context
   */
  clearContext() {
    this.context = {
      previousQuery: null,
      activeFilters: [],
      userProfile: this.context.userProfile, // Preserve user profile
      selectedCards: []
    };
  }
}

