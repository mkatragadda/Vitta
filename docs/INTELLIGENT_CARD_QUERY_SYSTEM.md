# Intelligent Card Query System - Architectural Design

## Overview
A scalable, AI-driven system for answering ANY question about user credit cards using semantic understanding, query decomposition, and dynamic response generation.

## Current Limitations
- ❌ Pattern-based matching (regex, hardcoded patterns)
- ❌ Limited to predefined query types
- ❌ Cannot handle compound queries (e.g., "cards with balance > 5000 AND APR < 20%")
- ❌ No learning from new query patterns
- ❌ Brittle - breaks with query variations

## Proposed Architecture

### 1. **Semantic Query Understanding Layer**

```
User Query → Intent Classification → Query Decomposition → Entity Extraction → Query Planning
```

#### 1.1 Enhanced Intent Classification
- **Current**: Vector search + heuristics
- **Proposed**: Multi-level intent hierarchy
  - Primary Intent: `query_card_data`, `card_recommendation`, `payment_optimization`
  - Sub-intent: `filter`, `aggregate`, `compare`, `rank`, `calculate`
  - Action Type: `list`, `show`, `find`, `calculate`, `recommend`

#### 1.2 Query Decomposition Engine
Parse complex queries into structured components:
```javascript
Query: "show me cards with balance over 5000 that have APR less than 25%"
↓
Decomposed:
{
  intent: 'filter',
  filters: [
    { field: 'current_balance', operator: '>', value: 5000 },
    { field: 'apr', operator: '<', value: 25 }
  ],
  aggregation: null,
  sorting: null,
  outputFormat: 'table'
}
```

#### 1.3 Semantic Entity Extraction with Relationships
- **Fields**: `balance`, `apr`, `credit_limit`, `utilization`, `due_date`, `rewards`
- **Operators**: `>`, `<`, `>=`, `<=`, `==`, `!=`, `between`, `in`, `contains`
- **Filters**: `with_balance`, `zero_balance`, `high_utilization`, `overdue`
- **Aggregations**: `sum`, `average`, `count`, `min`, `max`, `total`
- **Grouping**: `by_card`, `by_issuer`, `by_category`

### 2. **Query Planning & Execution Layer**

#### 2.1 Dynamic Query Builder
Build SQL-like operations on card data:

```javascript
class QueryBuilder {
  constructor(cards) {
    this.cards = cards;
    this.pipeline = [];
  }

  filter(condition) {
    // Apply filter conditions
    // Supports: balance > 5000, APR < 20%, utilization > 70%, etc.
  }

  aggregate(operation, field) {
    // SUM, AVG, COUNT, MIN, MAX
    // Examples: total balance, average APR, count of cards
  }

  sort(field, direction) {
    // Sort by any field, ascending or descending
  }

  groupBy(field) {
    // Group results by issuer, card type, etc.
  }

  select(fields) {
    // Select specific fields to display
  }

  limit(count) {
    // Limit number of results
  }

  execute() {
    // Execute pipeline and return results
  }
}
```

#### 2.2 Query Executor
Processes decomposed queries:
```javascript
function executeCardQuery(decomposedQuery, cards) {
  const builder = new QueryBuilder(cards);
  
  // Apply filters
  decomposedQuery.filters.forEach(filter => {
    builder.filter({
      field: filter.field,
      operator: filter.operator,
      value: filter.value
    });
  });
  
  // Apply aggregations
  if (decomposedQuery.aggregation) {
    builder.aggregate(
      decomposedQuery.aggregation.operation,
      decomposedQuery.aggregation.field
    );
  }
  
  // Apply sorting
  if (decomposedQuery.sorting) {
    builder.sort(decomposedQuery.sorting.field, decomposedQuery.sorting.direction);
  }
  
  return builder.execute();
}
```

### 3. **Natural Language to Structured Query (NL2SQL-like)**

#### 3.1 Query Pattern Library
Common query patterns mapped to operations:

| Natural Language Pattern | Structured Query |
|-------------------------|------------------|
| "cards with balance > X" | `filter: {current_balance > X}` |
| "total balance" | `aggregate: {sum: current_balance}` |
| "average APR" | `aggregate: {avg: apr}` |
| "highest balance card" | `sort: {current_balance: desc}, limit: 1` |
| "cards due soon" | `filter: {days_until_due < 7}` |
| "high utilization cards" | `filter: {utilization > 70}` |
| "show me my 3 best cards" | `sort: {rewards_score: desc}, limit: 3` |

#### 3.2 Semantic Field Mapping
Map natural language to card fields:
```javascript
const FIELD_SYNONYMS = {
  'balance': ['balance', 'debt', 'owed', 'amount due', 'current balance'],
  'apr': ['apr', 'interest rate', 'rate', 'percentage', 'annual rate'],
  'credit_limit': ['limit', 'credit limit', 'max credit', 'available'],
  'utilization': ['utilization', 'usage', 'used', 'percentage used'],
  'due_date': ['due date', 'payment due', 'when due', 'pay by'],
  'minimum_payment': ['minimum', 'min payment', 'minimum due', 'pay this'],
  'rewards': ['rewards', 'cashback', 'points', 'benefits', 'perks']
};
```

#### 3.3 Operator Detection
Detect comparison operators in natural language:
```javascript
const OPERATOR_PATTERNS = {
  '>': ['over', 'above', 'more than', 'greater than', 'exceeds'],
  '<': ['under', 'below', 'less than', 'fewer than', 'below'],
  '>=': ['at least', 'minimum', 'or more'],
  '<=': ['at most', 'maximum', 'or less', 'up to'],
  '==': ['exactly', 'equal to', 'is', 'equals'],
  '!=': ['not', 'excluding', 'except', 'other than'],
  'between': ['between', 'from ... to', 'in the range'],
  'in': ['in', 'among', 'within']
};
```

### 4. **Intelligent Response Generation**

#### 4.1 Response Template System
Dynamic templates based on query type:

```javascript
const RESPONSE_TEMPLATES = {
  filtered_list: (results, query) => {
    return {
      header: `Found ${results.length} card(s) matching your criteria:`,
      table: formatAsTable(results),
      summary: generateSummary(results)
    };
  },
  
  aggregated: (result, query) => {
    return {
      header: `${query.aggregation.operation} ${query.aggregation.field}:`,
      value: formatValue(result),
      context: generateContext(result)
    };
  },
  
  comparison: (results, query) => {
    return {
      header: `Comparison:`,
      table: formatComparisonTable(results),
      insights: generateInsights(results)
    };
  }
};
```

#### 4.2 Context-Aware Insights
Automatically add helpful insights:
```javascript
function generateInsights(filteredCards, allCards) {
  const insights = [];
  
  // Utilization insights
  const highUtil = filteredCards.filter(c => getUtilization(c) > 70);
  if (highUtil.length > 0) {
    insights.push(`⚠️ ${highUtil.length} card(s) have high utilization (>70%)`);
  }
  
  // APR insights
  const highAPR = filteredCards.filter(c => c.apr > 25);
  if (highAPR.length > 0) {
    insights.push(`🔴 ${highAPR.length} card(s) have high APR (>25%)`);
  }
  
  // Payment insights
  const overdue = filteredCards.filter(c => isOverdue(c));
  if (overdue.length > 0) {
    insights.push(`🚨 ${overdue.length} card(s) are overdue`);
  }
  
  return insights;
}
```

### 5. **Learning & Adaptation Layer**

#### 5.1 Query Pattern Learning
Store successful query patterns for future matching:

```javascript
class QueryPatternLearner {
  constructor() {
    this.learnedPatterns = new Map();
  }
  
  learnQuery(naturalQuery, decomposedQuery, success) {
    // Store successful query patterns
    // Use for few-shot learning of new patterns
  }
  
  findSimilarQuery(query) {
    // Find similar queries using embeddings
    // Return decomposed query structure
  }
}
```

#### 5.2 Few-Shot Learning
When a new query pattern is encountered:
1. Extract entities and intent
2. Check if similar patterns exist
3. Adapt existing pattern to new query
4. Validate and learn from result

### 6. **RAG (Retrieval-Augmented Generation) for Complex Queries**

#### 6.1 Card Knowledge Base
Embed card data in vector database:
```javascript
// For each card, create rich embeddings:
{
  card: {...},
  embedding: generateEmbedding({
    name: card.nickname,
    balance: card.current_balance,
    apr: card.apr,
    utilization: calculateUtilization(card),
    rewards: card.reward_structure,
    status: determineStatus(card),
    // ... all attributes
  })
}
```

#### 6.2 Semantic Search for Queries
```javascript
async function answerComplexQuery(query, cards) {
  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query);
  
  // Find semantically similar cards
  const similarCards = await semanticSearch(queryEmbedding, cardEmbeddings);
  
  // Generate natural language response
  return generateResponse(query, similarCards);
}
```

### 7. **Implementation Strategy**

#### Phase 1: Query Decomposition Engine
1. Enhance entity extractor to detect filters, aggregations, comparisons
2. Build QueryBuilder class
3. Create query executor
4. Test with common query patterns

#### Phase 2: Natural Language Understanding
1. Implement semantic field mapping
2. Add operator detection
3. Build query pattern library
4. Handle compound queries

#### Phase 3: Dynamic Response Generation
1. Create response template system
2. Add context-aware insights
3. Implement smart formatting
4. Add helpful suggestions

#### Phase 4: Learning & Optimization
1. Build query pattern learner
2. Implement few-shot learning
3. Add query analytics
4. Continuous improvement

#### Phase 5: RAG Integration (Advanced)
1. Create card knowledge embeddings
2. Build semantic search
3. Integrate with LLM for complex reasoning
4. Hybrid approach: structured + semantic

### 8. **Example Query Flows**

#### Example 1: Complex Filter
```
Query: "show me cards with balance over 5000 that have APR less than 25%"
↓
Decomposed:
{
  intent: 'filter',
  filters: [
    {field: 'current_balance', operator: '>', value: 5000},
    {field: 'apr', operator: '<', value: 25}
  ]
}
↓
QueryBuilder.filter({current_balance > 5000}).filter({apr < 25}).execute()
↓
Response: Table with filtered cards + insights
```

#### Example 2: Aggregation
```
Query: "what's my total balance across all cards?"
↓
Decomposed:
{
  intent: 'aggregate',
  aggregation: {operation: 'sum', field: 'current_balance'}
}
↓
QueryBuilder.aggregate('sum', 'current_balance').execute()
↓
Response: "$45,230.00 total balance across 15 cards with balances"
```

#### Example 3: Ranking
```
Query: "show me my 3 highest balance cards"
↓
Decomposed:
{
  intent: 'rank',
  sort: {field: 'current_balance', direction: 'desc'},
  limit: 3
}
↓
QueryBuilder.sort('current_balance', 'desc').limit(3).execute()
↓
Response: Top 3 cards table + recommendations
```

### 9. **Benefits of This Architecture**

✅ **Scalable**: Handles any query type without code changes  
✅ **Extensible**: Easy to add new fields, operators, aggregations  
✅ **Intelligent**: Learns from user queries  
✅ **Flexible**: Combines filters, aggregations, sorting  
✅ **User-friendly**: Natural language understanding  
✅ **Maintainable**: Clear separation of concerns  
✅ **Performant**: Efficient query execution  

### 10. **Next Steps**

1. **Immediate**: Implement QueryBuilder and basic query decomposition
2. **Short-term**: Add semantic field mapping and operator detection
3. **Medium-term**: Build response templates and insights engine
4. **Long-term**: Integrate RAG for truly complex queries

---

## Implementation Priority

### MVP (Minimum Viable Product)
- QueryBuilder with basic filters
- Field synonym mapping
- Operator detection
- Simple response templates

### Enhanced Version
- Query decomposition engine
- Aggregation support
- Sorting and ranking
- Context-aware insights

### Advanced Version
- Query pattern learning
- RAG integration
- Complex reasoning
- Personalized suggestions

