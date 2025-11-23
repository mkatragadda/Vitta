/**
 * Response Generator
 * 
 * Generates natural language responses from query execution results.
 * Formats tables, lists, summaries, and insights based on query metadata.
 * 
 * @module services/chat/query/responseGenerator
 * 
 * @example
 * const generator = new ResponseGenerator();
 * const response = generator.generateResponse(queryResults, structuredQuery);
 */

/**
 * ResponseGenerator class for formatting query results into natural language
 */
export class ResponseGenerator {
  /**
   * Create a new ResponseGenerator instance
   * 
   * @param {Object} options - Generator options
   * @property {boolean} options.includeInsights - Include insights in responses (default: true)
   * @property {boolean} options.includeTips - Include tips in responses (default: true)
   * @property {number} options.maxTableRows - Maximum rows in tables before truncation (default: 20)
   * 
   * @example
   * const generator = new ResponseGenerator({ includeInsights: true });
   */
  constructor(options = {}) {
    this.options = {
      includeInsights: options.includeInsights !== false,
      includeTips: options.includeTips !== false,
      maxTableRows: options.maxTableRows || 20,
      ...options
    };
  }

  /**
   * Generate natural language response from query results
   * 
   * @param {Object} queryResults - Results from QueryExecutor.execute()
   * @param {Object} structuredQuery - Structured query from QueryDecomposer
   * @param {string} originalQuery - Original user query (optional)
   * @returns {string} - Formatted markdown response
   * 
   * @example
   * const response = generator.generateResponse(results, structuredQuery, "what are the different issuers");
   */
  generateResponse(queryResults, structuredQuery, originalQuery = '') {
    if (!queryResults || !structuredQuery) {
      throw new Error('ResponseGenerator: queryResults and structuredQuery are required');
    }

    const { queryMetadata } = queryResults;
    const subIntent = queryMetadata?.subIntent || structuredQuery.subIntent;
    const outputFormat = queryMetadata?.outputFormat || structuredQuery.outputFormat || 'table';

    // Route to appropriate formatter based on subIntent and outputFormat
    switch (subIntent) {
      case 'distinct':
        return this._formatDistinctResponse(queryResults, structuredQuery, originalQuery);
      
      case 'aggregation':
        return this._formatAggregationResponse(queryResults, structuredQuery, originalQuery);
      
      case 'grouped_aggregation':
        return this._formatGroupedAggregationResponse(queryResults, structuredQuery, originalQuery);
      
      case 'filter':
      case 'listing':
      default:
        return this._formatTableResponse(queryResults, structuredQuery, originalQuery);
    }
  }

  /**
   * Format distinct query response
   * 
   * @param {Object} queryResults - Query results
   * @param {Object} structuredQuery - Structured query
   * @param {string} originalQuery - Original query
   * @returns {string} - Formatted response
   * @private
   */
  _formatDistinctResponse(queryResults, structuredQuery, originalQuery) {
    const { values, total } = queryResults;
    const { distinct } = structuredQuery;
    
    if (!values || values.length === 0) {
      return this._formatEmptyResponse(structuredQuery, originalQuery);
    }

    const field = distinct.field;
    const fieldLabel = this._getFieldLabel(field);
    
    let response = `You have **${total} different ${fieldLabel}${total > 1 ? 's' : ''}** in your wallet:\n\n`;

    // Format as list or table
    if (distinct.includeDetails && queryResults.results) {
      // Show details with sample cards
      response += this._formatDistinctTable(values, queryResults.results, field);
    } else {
      // Simple list
      values.forEach((item, index) => {
        const count = item.count !== undefined ? ` (${item.count} card${item.count !== 1 ? 's' : ''})` : '';
        response += `${index + 1}. **${item.value}**${count}\n`;
      });
    }

    // Add insights
    if (this.options.includeInsights && values.length > 0) {
      const insights = this._generateDistinctInsights(values, field);
      if (insights) {
        response += `\n${insights}`;
      }
    }

    return response.trim();
  }

  /**
   * Format aggregation query response
   * 
   * @param {Object} queryResults - Query results
   * @param {Object} structuredQuery - Structured query
   * @param {string} originalQuery - Original query
   * @returns {string} - Formatted response
   * @private
   */
  _formatAggregationResponse(queryResults, structuredQuery, originalQuery) {
    const { results } = queryResults;
    
    if (!results || Object.keys(results).length === 0) {
      return this._formatEmptyResponse(structuredQuery, originalQuery);
    }

    const aggregation = structuredQuery.aggregations[0];
    const operation = aggregation.operation;
    const field = aggregation.field;
    const fieldLabel = this._getFieldLabel(field);
    
    let response = '';
    const operationLabel = this._getOperationLabel(operation);

    // Format based on operation
    switch (operation) {
      case 'sum':
        const sumKey = `sum_${field}`;
        const sumValue = results[sumKey] || results.sum || results.total;
        if (sumValue !== undefined) {
          response = `**${operationLabel} ${fieldLabel}:** ${this._formatValue(sumValue, field)}\n`;
        }
        break;
      
      case 'avg':
        const avgKey = `avg_${field}`;
        const avgValue = results[avgKey] || results.average || results.avg;
        if (avgValue !== undefined) {
          response = `**${operationLabel} ${fieldLabel}:** ${this._formatValue(avgValue, field)}\n`;
        }
        break;
      
      case 'count':
        const countKey = `count_*` || Object.keys(results).find(k => k.startsWith('count'));
        const countValue = results[countKey] || results.count || results.total;
        if (countValue !== undefined) {
          response = `**Total ${fieldLabel || 'items'}:** ${countValue}\n`;
        }
        break;
      
      case 'min':
        const minKey = `min_${field}`;
        const minValue = results[minKey] || results.min || results.lowest;
        if (minValue !== undefined) {
          response = `**${operationLabel} ${fieldLabel}:** ${this._formatValue(minValue, field)}\n`;
        }
        break;
      
      case 'max':
        const maxKey = `max_${field}`;
        const maxValue = results[maxKey] || results.max || results.highest;
        if (maxValue !== undefined) {
          response = `**${operationLabel} ${fieldLabel}:** ${this._formatValue(maxValue, field)}\n`;
        }
        break;
    }

    // Add insights
    if (this.options.includeInsights) {
      const insights = this._generateAggregationInsights(results, aggregation, field);
      if (insights) {
        response += `\n${insights}`;
      }
    }

    return response.trim();
  }

  /**
   * Format grouped aggregation response
   * 
   * @param {Object} queryResults - Query results
   * @param {Object} structuredQuery - Structured query
   * @param {string} originalQuery - Original query
   * @returns {string} - Formatted response
   * @private
   */
  _formatGroupedAggregationResponse(queryResults, structuredQuery, originalQuery) {
    const { results } = queryResults;
    
    if (!results || !Array.isArray(results) || results.length === 0) {
      return this._formatEmptyResponse(structuredQuery, originalQuery);
    }

    const aggregation = structuredQuery.aggregations[0];
    const operation = aggregation.operation;
    const field = aggregation.field;
    const groupBy = structuredQuery.grouping;
    
    const fieldLabel = this._getFieldLabel(field);
    const groupLabel = this._getFieldLabel(groupBy);
    const operationLabel = this._getOperationLabel(operation);

    let response = `**${operationLabel} ${fieldLabel} by ${groupLabel}:**\n\n`;
    
    // Create table
    const headers = [groupLabel, `${operationLabel} ${fieldLabel}`];
    response += this._createTable(headers, results.map(item => {
      const groupValue = item[groupBy] || item.group || 'Unknown';
      const aggKey = `${operation}_${field}`;
      const aggValue = item[aggKey] || item.value || item[operation];
      return [groupValue, this._formatValue(aggValue, field)];
    }));

    // Add insights
    if (this.options.includeInsights && results.length > 0) {
      const insights = this._generateGroupedInsights(results, aggregation, groupBy);
      if (insights) {
        response += `\n${insights}`;
      }
    }

    return response.trim();
  }

  /**
   * Format table response (filter/listing queries)
   * 
   * @param {Object} queryResults - Query results
   * @param {Object} structuredQuery - Structured query
   * @param {string} originalQuery - Original query
   * @returns {string} - Formatted response
   * @private
   */
  _formatTableResponse(queryResults, structuredQuery, originalQuery) {
    const { results, total } = queryResults;
    
    if (!results || (Array.isArray(results) && results.length === 0)) {
      return this._formatEmptyResponse(structuredQuery, originalQuery);
    }

    // Determine which fields to display
    const cards = Array.isArray(results) ? results : [results];
    const fieldsToDisplay = this._determineFieldsToDisplay(cards, structuredQuery);

    // Limit rows if too many
    const displayCards = cards.slice(0, this.options.maxTableRows);
    const truncated = cards.length > this.options.maxTableRows;

    let response = '';
    
    // Add header based on query type
    if (structuredQuery.filters && structuredQuery.filters.length > 0) {
      response += `**Filtered Results** (${total || displayCards.length} card${(total || displayCards.length) !== 1 ? 's' : ''}):\n\n`;
    } else {
      response += `**Your Cards** (${total || displayCards.length} card${(total || displayCards.length) !== 1 ? 's' : ''}):\n\n`;
    }

    // Create table
    if (fieldsToDisplay.length > 0 && displayCards.length > 0) {
      const headers = fieldsToDisplay.map(f => this._getFieldLabel(f));
      const rows = displayCards.map(card => 
        fieldsToDisplay.map(field => {
          try {
            return this._formatCardField(card, field);
          } catch (error) {
            console.error(`[ResponseGenerator] Error formatting field ${field}:`, error);
            return 'N/A';
          }
        })
      );
      
      response += this._createTable(headers, rows);
    } else {
      response += '*No data to display*\n';
    }

    // Add truncation notice
    if (truncated) {
      response += `\n*Showing first ${this.options.maxTableRows} of ${cards.length} results.*\n`;
    }

    // Add summary if applicable
    if (cards.length > 1 && this._shouldAddSummary(structuredQuery)) {
      const summary = this._generateSummary(cards, structuredQuery);
      if (summary) {
        response += `\n${summary}`;
      }
    }

    // Add insights
    if (this.options.includeInsights) {
      const insights = this._generateTableInsights(cards, structuredQuery);
      if (insights) {
        response += `\n${insights}`;
      }
    }

    return response.trim();
  }

  /**
   * Format empty response
   * 
   * @param {Object} structuredQuery - Structured query
   * @param {string} originalQuery - Original query
   * @returns {string} - Empty response message
   * @private
   */
  _formatEmptyResponse(structuredQuery, originalQuery) {
    if (structuredQuery.filters && structuredQuery.filters.length > 0) {
      return "No cards match your filter criteria. Try adjusting your search or view all cards in [My Wallet](vitta://navigate/cards).";
    }
    return "No results found. Add cards in [My Wallet](vitta://navigate/cards) to get started!";
  }

  /**
   * Create markdown table
   * 
   * @param {Array<string>} headers - Column headers
   * @param {Array<Array<string>>} rows - Table rows
   * @returns {string} - Markdown table
   * @private
   */
  _createTable(headers, rows) {
    if (!headers || headers.length === 0) {
      return '';
    }

    let table = `| ${headers.join(' | ')} |\n`;
    table += `| ${headers.map(() => '---').join(' | ')} |\n`;
    
    rows.forEach(row => {
      // Ensure row has same number of columns as headers
      const paddedRow = [...row];
      while (paddedRow.length < headers.length) {
        paddedRow.push('');
      }
      table += `| ${paddedRow.slice(0, headers.length).join(' | ')} |\n`;
    });

    return table;
  }

  /**
   * Determine which fields to display in table
   * 
   * @param {Array<Object>} cards - Card objects
   * @param {Object} structuredQuery - Structured query
   * @returns {Array<string>} - Fields to display
   * @private
   */
  _determineFieldsToDisplay(cards, structuredQuery) {
    // If no cards, return default fields
    if (!cards || cards.length === 0) {
      return ['card_name', 'balance', 'credit_limit', 'apr'];
    }

    // Default fields based on query type
    if (structuredQuery.sorting) {
      // Include sorted field prominently
      const sortField = structuredQuery.sorting.field;
      const defaultFields = ['card_name', 'balance', 'credit_limit', 'apr'];
      if (sortField && !defaultFields.includes(sortField)) {
        defaultFields.unshift(sortField);
      }
      return defaultFields;
    }

    // Standard fields - limit to avoid too wide tables
    return ['card_name', 'balance', 'credit_limit', 'apr'];
  }

  /**
   * Format card field value
   * 
   * @param {Object} card - Card object
   * @param {string} field - Field name
   * @returns {string} - Formatted value
   * @private
   */
  _formatCardField(card, field) {
    if (!card) return 'N/A';
    if (!field) return 'N/A';
    
    try {
      switch (field) {
        case 'card_name':
          return card.nickname || card.card_name || 'Unknown Card';
        
        case 'balance':
        case 'current_balance':
          const balance = card.current_balance || 0;
          return `$${Number(balance).toLocaleString()}`;
        
        case 'credit_limit':
          const limit = card.credit_limit || 0;
          return `$${Number(limit).toLocaleString()}`;
        
        case 'apr':
          const apr = card.apr || 0;
          return `${Number(apr).toFixed(2)}%`;
        
        case 'utilization':
          const creditLimit = card.credit_limit || 1; // Avoid division by zero
          const currentBalance = card.current_balance || 0;
          const util = creditLimit > 0 
            ? Math.round((currentBalance / creditLimit) * 100)
            : 0;
          const emoji = util < 30 ? '✅' : util < 50 ? '⚠️' : '🔴';
          return `${util}% ${emoji}`;
        
        case 'issuer':
          return card.issuer || 'Unknown';
        
        case 'card_network':
          return card.card_network || 'Unknown';
        
        case 'due_date':
        case 'payment_due_date':
          if (card.payment_due_date) {
            try {
              return new Date(card.payment_due_date).toLocaleDateString();
            } catch (e) {
              return String(card.payment_due_date);
            }
          }
          return 'N/A';
        
        default:
          // Try direct field access
          const value = card[field];
          if (value !== undefined && value !== null) {
            return String(value);
          }
          return 'N/A';
      }
    } catch (error) {
      console.error(`[ResponseGenerator] Error formatting field ${field}:`, error);
      return 'N/A';
    }
  }

  /**
   * Format value based on field type
   * 
   * @param {*} value - Value to format
   * @param {string} field - Field name (optional)
   * @returns {string} - Formatted value
   * @private
   */
  _formatValue(value, field = null) {
    if (value === null || value === undefined) {
      return 'N/A';
    }

    // Format based on field type
    if (field === 'current_balance' || field === 'balance' || field === 'credit_limit') {
      return `$${Number(value).toLocaleString()}`;
    }
    
    if (field === 'apr') {
      return `${Number(value).toFixed(2)}%`;
    }

    // Format as number with commas
    if (typeof value === 'number') {
      return value.toLocaleString();
    }

    return String(value);
  }

  /**
   * Get human-readable field label
   * 
   * @param {string} field - Field name
   * @returns {string} - Field label
   * @private
   */
  _getFieldLabel(field) {
    if (!field) return 'Unknown';
    
    const labels = {
      'card_name': 'Card',
      'nickname': 'Nickname',
      'issuer': 'Issuer',
      'card_network': 'Network',
      'card_type': 'Type',
      'current_balance': 'Balance',
      'balance': 'Balance',
      'credit_limit': 'Credit Limit',
      'apr': 'APR',
      'annual_fee': 'Annual Fee',
      'payment_due_date': 'Due Date',
      'due_date': 'Due Date',
      'statement_close': 'Statement Close',
      'grace_period': 'Grace Period',
      'utilization': 'Utilization',
      'available_credit': 'Available Credit'
    };

    if (labels[field]) {
      return labels[field];
    }

    // Fallback: format field name
    if (typeof field === 'string') {
      return field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    return 'Unknown';
  }

  /**
   * Get human-readable operation label
   * 
   * @param {string} operation - Operation name
   * @returns {string} - Operation label
   * @private
   */
  _getOperationLabel(operation) {
    const labels = {
      'sum': 'Total',
      'avg': 'Average',
      'count': 'Count',
      'min': 'Minimum',
      'max': 'Maximum'
    };

    return labels[operation] || operation.charAt(0).toUpperCase() + operation.slice(1);
  }

  /**
   * Generate insights for distinct queries
   * 
   * @param {Array} values - Distinct values
   * @param {string} field - Field name
   * @returns {string|null} - Insight message
   * @private
   */
  _generateDistinctInsights(values, field) {
    if (field === 'issuer') {
      if (values.length > 3) {
        return `💡 **Tip:** You have cards from ${values.length} different issuers. Consider consolidating to simplify management.`;
      }
    }
    return null;
  }

  /**
   * Generate insights for aggregation queries
   * 
   * @param {Object} results - Aggregation results
   * @param {Object} aggregation - Aggregation config
   * @param {string} field - Field name
   * @returns {string|null} - Insight message
   * @private
   */
  _generateAggregationInsights(results, aggregation, field) {
    if (field === 'current_balance' && aggregation.operation === 'sum') {
      const total = results.sum_current_balance || results.sum || 0;
      if (total > 10000) {
        return `💡 **Tip:** Your total balance is high. Consider prioritizing high-APR cards for faster payoff.`;
      }
    }
    
    if (field === 'apr' && aggregation.operation === 'avg') {
      const avg = results.avg_apr || results.average || 0;
      if (avg > 20) {
        return `⚠️ **Note:** Your average APR is ${avg.toFixed(1)}%. Look for balance transfer opportunities.`;
      }
    }

    return null;
  }

  /**
   * Generate insights for grouped aggregation queries
   * 
   * @param {Array} results - Grouped results
   * @param {Object} aggregation - Aggregation config
   * @param {string} groupBy - Grouping field
   * @returns {string|null} - Insight message
   * @private
   */
  _generateGroupedInsights(results, aggregation, groupBy) {
    // Find largest group
    const largest = results.reduce((max, item) => {
      const value = item[`${aggregation.operation}_${aggregation.field}`] || 0;
      const maxValue = max[`${aggregation.operation}_${aggregation.field}`] || 0;
      return value > maxValue ? item : max;
    }, results[0]);

    if (largest) {
      const groupValue = largest[groupBy];
      return `💡 **Insight:** ${this._getFieldLabel(groupBy)} "${groupValue}" has the highest ${this._getOperationLabel(aggregation.operation).toLowerCase()}.`;
    }

    return null;
  }

  /**
   * Generate insights for table responses
   * 
   * @param {Array<Object>} cards - Card objects
   * @param {Object} structuredQuery - Structured query
   * @returns {string|null} - Insight message
   * @private
   */
  _generateTableInsights(cards, structuredQuery) {
    if (structuredQuery.sorting && structuredQuery.sorting.field === 'apr') {
      const highestAPR = cards[0];
      if (highestAPR && highestAPR.apr > 20) {
        return `💡 **Tip:** ${highestAPR.nickname || highestAPR.card_name} has the highest APR (${highestAPR.apr}%). Consider paying this down first.`;
      }
    }

    return null;
  }

  /**
   * Check if summary should be added
   * 
   * @param {Object} structuredQuery - Structured query
   * @returns {boolean} - Should add summary
   * @private
   */
  _shouldAddSummary(structuredQuery) {
    // Add summary for listing queries without specific aggregation
    return structuredQuery.subIntent === 'listing' && 
           (!structuredQuery.aggregations || structuredQuery.aggregations.length === 0);
  }

  /**
   * Generate summary for card list
   * 
   * @param {Array<Object>} cards - Card objects
   * @param {Object} structuredQuery - Structured query
   * @returns {string|null} - Summary text
   * @private
   */
  _generateSummary(cards, structuredQuery) {
    const totalBalance = cards.reduce((sum, c) => sum + (c.current_balance || 0), 0);
    const totalLimit = cards.reduce((sum, c) => sum + (c.credit_limit || 0), 0);
    const overallUtil = totalLimit > 0 ? Math.round((totalBalance / totalLimit) * 100) : 0;

    let summary = `**Summary:**\n`;
    summary += `• Total balance: $${totalBalance.toLocaleString()}\n`;
    summary += `• Total credit limit: $${totalLimit.toLocaleString()}\n`;
    summary += `• Overall utilization: ${overallUtil}% ${overallUtil < 30 ? '✅' : overallUtil < 50 ? '⚠️' : '🔴'}\n`;

    return summary;
  }

  /**
   * Format distinct table with details
   * 
   * @param {Array} values - Distinct values
   * @param {Array} results - Detailed results
   * @param {string} field - Field name
   * @returns {string} - Formatted table
   * @private
   */
  _formatDistinctTable(values, results, field) {
    // Group results by distinct value
    const grouped = {};
    results.forEach(card => {
      const value = card[field];
      if (!grouped[value]) {
        grouped[value] = [];
      }
      grouped[value].push(card);
    });

    let table = `| ${this._getFieldLabel(field)} | Count | Sample Cards |\n`;
    table += `| ${['---', '---', '---'].join(' | ')} |\n`;

    values.forEach(item => {
      const cards = grouped[item.value] || [];
      const sampleNames = cards.slice(0, 3).map(c => c.nickname || c.card_name).join(', ');
      const count = item.count || cards.length;
      table += `| ${item.value} | ${count} | ${sampleNames || 'N/A'} |\n`;
    });

    return table;
  }
}

