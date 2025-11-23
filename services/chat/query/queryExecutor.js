/**
 * Query Executor
 * 
 * Executes structured queries using QueryBuilder. This is the execution engine
 * that takes decomposed queries and runs them against card data.
 * 
 * @module services/chat/query/queryExecutor
 * 
 * @example
 * const executor = new QueryExecutor(cards);
 * const structuredQuery = decomposer.decompose(query, entities, intent);
 * const results = executor.execute(structuredQuery);
 */

import { QueryBuilder } from './queryBuilder.js';

/**
 * QueryExecutor class for executing structured queries
 * 
 * Phase 6: Now integrates with QueryAnalytics for tracking
 */
export class QueryExecutor {
  /**
   * Create a new QueryExecutor instance
   * 
   * @param {Array<Object>} cards - Array of card objects to query
   * @param {Object} context - Execution context (optional)
   * @property {Object} context.queryAnalytics - QueryAnalytics instance (optional)
   * @property {boolean} context.enableTracking - Enable query tracking (default: true)
   * 
   * @example
   * const executor = new QueryExecutor(userCards, { userProfile: 'REWARDS_MAXIMIZER' });
   */
  constructor(cards, context = {}) {
    if (!Array.isArray(cards)) {
      throw new Error('QueryExecutor: cards must be an array');
    }
    this.cards = cards;
    this.context = {
      enableTracking: context.enableTracking !== false,
      ...context
    };

    // Phase 6: Initialize QueryAnalytics if not provided and tracking is enabled
    if (this.context.enableTracking && !this.context.queryAnalytics) {
      try {
        const { QueryAnalytics } = require('../learning/queryAnalytics.js');
        this.queryAnalytics = new QueryAnalytics();
      } catch (error) {
        console.warn('[QueryExecutor] QueryAnalytics not available, tracking disabled:', error.message);
        this.context.enableTracking = false;
      }
    } else if (this.context.queryAnalytics) {
      this.queryAnalytics = this.context.queryAnalytics;
    }

    // Store current query metadata for tracking
    this.currentQueryMetadata = null;
  }

  /**
   * Execute a structured query
   * 
   * @param {Object} structuredQuery - Structured query object from QueryDecomposer
   * @returns {Object} - Execution results with metadata
   * 
   * @example
   * const results = executor.execute(structuredQuery);
   */
  execute(structuredQuery, metadata = {}) {
    if (!structuredQuery || typeof structuredQuery !== 'object') {
      throw new Error('QueryExecutor: structuredQuery is required and must be an object');
    }

    // Phase 6: Store query metadata for tracking
    this.currentQueryMetadata = {
      query: metadata.query || this.context.query || null,
      entities: metadata.entities || this.context.entities || null,
      structuredQuery,
      startTime: performance.now()
    };

    const builder = new QueryBuilder(this.cards);

    // Apply filters
    if (structuredQuery.filters && structuredQuery.filters.length > 0) {
      structuredQuery.filters.forEach((filter, index) => {
        const logicalOp = index === 0 ? 'AND' : (filter.logicalOperator || 'AND');
        builder.filter(filter.field, filter.operator, filter.value, logicalOp);
      });
    }

    // Handle distinct query
    if (structuredQuery.distinct) {
      builder.distinct(structuredQuery.distinct.field, {
        includeCount: structuredQuery.distinct.includeCount || false,
        includeDetails: structuredQuery.distinct.includeDetails || false,
        withAggregation: structuredQuery.distinct.withAggregation || null
      });
    }

    // Handle aggregations
    if (structuredQuery.aggregations && structuredQuery.aggregations.length > 0) {
      if (structuredQuery.grouping) {
        builder.groupBy(structuredQuery.grouping);
      }
      
      structuredQuery.aggregations.forEach(agg => {
        builder.aggregate(agg.operation, agg.field, agg.groupBy || structuredQuery.grouping);
      });
    }

    // Apply sorting
    if (structuredQuery.sorting) {
      builder.sort(
        structuredQuery.sorting.field,
        structuredQuery.sorting.direction || 'asc',
        structuredQuery.sorting.limit
      );
    }

    // Apply limit if specified
    if (structuredQuery.limit) {
      builder.limit(structuredQuery.limit);
    }

    // Execute query
    let results;
    let error = null;
    
    try {
      results = builder.execute();
    } catch (err) {
      error = err;
      results = null;
    }

    // Calculate response time
    const responseTime = performance.now() - (this.currentQueryMetadata.startTime || performance.now());

    // Phase 6: Track query execution (async, don't block)
    if (this.context.enableTracking && this.queryAnalytics && this.currentQueryMetadata.query) {
      this.trackQuery(results, error, responseTime, structuredQuery).catch(err => {
        console.error('[QueryExecutor] Error tracking query:', err);
      });
    }

    if (error) {
      throw error;
    }

    // Add query metadata
    const enrichedResults = {
      ...results,
      queryMetadata: {
        intent: structuredQuery.intent,
        subIntent: structuredQuery.subIntent,
        action: structuredQuery.action,
        outputFormat: structuredQuery.outputFormat,
        decompositionMethod: structuredQuery.decompositionMethod || 'direct',
        patternId: structuredQuery.patternId || null,
        responseTime: Math.round(responseTime)
      }
    };

    return enrichedResults;
  }

  /**
   * Track query execution (Phase 6)
   * @private
   */
  async trackQuery(results, error, responseTime, structuredQuery) {
    if (!this.queryAnalytics || !this.currentQueryMetadata) {
      return;
    }

    const { query, entities } = this.currentQueryMetadata;
    
    await this.queryAnalytics.trackQuery(
      query,
      entities,
      structuredQuery,
      results,
      {
        userId: this.context.userId || null,
        responseTime: Math.round(responseTime),
        success: error === null,
        errorMessage: error ? error.message : null,
        patternId: structuredQuery.patternId || null,
        decompositionMethod: structuredQuery.decompositionMethod || 'direct',
        intent: structuredQuery.intent || null
      }
    );
  }

  /**
   * Execute multiple queries in parallel
   * 
   * @param {Array<Object>} structuredQueries - Array of structured queries
   * @returns {Array<Object>} - Array of execution results
   */
  executeBatch(structuredQueries) {
    if (!Array.isArray(structuredQueries)) {
      throw new Error('QueryExecutor: structuredQueries must be an array');
    }

    return structuredQueries.map(query => this.execute(query));
  }
}

