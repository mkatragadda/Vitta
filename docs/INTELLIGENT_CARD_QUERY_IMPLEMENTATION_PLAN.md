# Intelligent Card Query System - Implementation Plan

## Executive Summary

This document provides a detailed, phased implementation plan for building the Intelligent Card Query System. It includes file structure, code specifications, integration points, and testing strategy.

**Goal**: Transform the current pattern-based query system into a universal, AI-driven system that can handle ANY natural language question about user cards.

**Timeline**: 8-10 weeks (phased approach)

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Implementation Phases](#implementation-phases)
3. [File Structure & Changes](#file-structure--changes)
4. [Detailed Component Design](#detailed-component-design)
5. [Integration Points](#integration-points)
6. [Testing Strategy](#testing-strategy)
7. [Migration Plan](#migration-plan)

---

## Architecture Overview

### Current System
```
User Query → Entity Extractor → Intent Detection → Hardcoded Handlers → Response
```

### Target System
```
User Query → NLU Layer → Query Decomposition → Query Builder → Execution → Response Generator → Learning
```

### Key Components

1. **NLU Layer** (Natural Language Understanding)
   - Intent Classification (embedding-based)
   - Entity Extraction (enhanced)
   - Query Decomposition

2. **Query Builder**
   - Filter operations
   - Aggregations
   - Distinct operations
   - Sorting/grouping

3. **Execution Engine**
   - Query execution
   - Result formatting

4. **Response Generator**
   - Template system
   - Insight generation

5. **Learning System**
   - Pattern learning
   - Analytics

---

## Implementation Phases

### Phase 1: Foundation - Query Builder & Core Operations (Week 1-2)

**Goal**: Build the foundational query builder that can execute structured queries.

**Deliverables**:
- QueryBuilder class
- Filter, aggregation, distinct operations
- Basic query execution
- Unit tests

### Phase 2: Enhanced Entity Extraction (Week 2-3)

**Goal**: Enhance entity extraction to detect distinct queries, compound filters, aggregations.

**Deliverables**:
- Enhanced entity extractor
- Distinct query detection
- Compound filter detection
- Grouped aggregation detection

### Phase 3: Query Decomposition (Week 3-4)

**Goal**: Build query decomposition engine that converts natural language to structured queries.

**Deliverables**:
- Query decomposition engine
- Intent classification integration
- Context management

### Phase 4: Response Generation (Week 4-5)

**Goal**: Build intelligent response generation with templates and insights.

**Deliverables**:
- Response template system
- Insight generation
- Formatting utilities

### Phase 5: Integration & Migration (Week 5-6)

**Goal**: Integrate new system with existing chat handlers and migrate queries.

**Deliverables**:
- Integration with conversation engine
- Migration of existing handlers
- Backward compatibility

### Phase 6: Learning System (Week 6-7)

**Goal**: Implement pattern learning and analytics.

**Deliverables**:
- Query pattern learner
- Analytics dashboard
- Feedback loop

### Phase 7: Testing & Refinement (Week 7-8)

**Goal**: Comprehensive testing and refinement.

**Deliverables**:
- Integration tests
- Performance testing
- Bug fixes

### Phase 8: Advanced Features (Week 8-10)

**Goal**: Advanced features like context management, follow-up queries.

**Deliverables**:
- Context management
- Follow-up query handling
- Advanced templates

---

## File Structure & Changes

### New Files to Create

```
services/chat/
├── query/
│   ├── queryBuilder.js          # Core query builder class
│   ├── queryDecomposer.js       # Query decomposition engine
│   ├── queryExecutor.js         # Query execution engine
│   └── queryContext.js          # Context management
├── response/
│   ├── responseTemplates.js     # Response template system
│   ├── insightGenerator.js      # Insight generation
│   └── formatters.js            # Formatting utilities
└── learning/
    ├── patternLearner.js        # Query pattern learning
    ├── queryAnalytics.js        # Query analytics
    └── feedbackLoop.js          # Feedback loop

utils/
└── query/
    ├── operators.js             # Query operators (>, <, ==, etc.)
    └── validators.js            # Query validation

__tests__/
├── unit/
│   ├── queryBuilder.test.js
│   ├── queryDecomposer.test.js
│   ├── queryExecutor.test.js
│   └── distinctQueries.test.js
└── integration/
    ├── queryFlow.test.js
    └── naturalLanguageQueries.test.js
```

### Files to Modify

```
services/chat/
├── entityExtractor.js           # Add distinct query detection, compound filters
├── conversationEngineV2.js      # Integrate query decomposition
├── cardDataQueryHandler.js      # Migrate to use QueryBuilder
└── responseGenerator.js         # Integrate template system

services/cardService.js          # May need query methods for filtering
```

### Files to Create (Supporting)

```
docs/
├── QUERY_BUILDER_API.md         # API documentation
├── QUERY_PATTERNS.md            # Common query patterns
└── MIGRATION_GUIDE.md           # Migration guide

config/
└── queryConfig.js               # Query system configuration
```

---

## Detailed Component Design

### 1. Query Builder (`services/chat/query/queryBuilder.js`)

**Purpose**: Build and execute structured queries on card data.

**Class Structure**:
```javascript
class QueryBuilder {
  constructor(cards) {
    this.cards = cards;
    this.filters = [];
    this.aggregations = [];
    this.distinct = null;
    this.sorting = null;
    this.grouping = null;
    this.limit = null;
    this.selectFields = null;
  }

  // Filter operations
  filter(field, operator, value, logicalOperator = 'AND') {
    // Add filter condition
    return this;
  }

  filterWhere(conditionFn) {
    // Custom filter function
    return this;
  }

  // Aggregation operations
  aggregate(operation, field, groupBy = null) {
    // operation: 'sum', 'avg', 'count', 'min', 'max', 'countDistinct'
    return this;
  }

  // Distinct operations
  distinct(field, options = {}) {
    // Get unique values for a field
    // options: {includeCount, includeDetails, withAggregation}
    return this;
  }

  // Sorting
  sort(field, direction = 'asc', limit = null) {
    return this;
  }

  // Grouping
  groupBy(field) {
    return this;
  }

  // Selection
  select(fields) {
    return this;
  }

  // Limit
  limit(count) {
    return this;
  }

  // Execution
  execute() {
    // Execute query and return results
    return {
      results: [...],
      metadata: {
        count: number,
        executionTime: number,
        appliedFilters: [...],
        ...
      }
    };
  }

  // Utilities
  clone() {
    // Clone builder for parallel queries
  }

  reset() {
    // Reset to initial state
  }
}
```

**Example Usage**:
```javascript
const builder = new QueryBuilder(userCards);

// Distinct issuers with counts
const issuers = builder
  .distinct('issuer', { includeCount: true })
  .execute();

// Visa cards with balance > 5000
const visaCards = builder
  .reset()
  .filter('card_network', '==', 'Visa')
  .filter('current_balance', '>', 5000)
  .execute();

// Total balance by issuer
const balanceByIssuer = builder
  .reset()
  .groupBy('issuer')
  .aggregate('sum', 'current_balance')
  .execute();
```

**Key Methods Detail**:

1. **`filter(field, operator, value, logicalOperator)`**
   ```javascript
   // Operators: '==', '!=', '>', '<', '>=', '<=', 'contains', 'in', 'between'
   // Examples:
   builder.filter('card_network', '==', 'Visa')
   builder.filter('current_balance', '>', 5000)
   builder.filter('issuer', 'in', ['Chase', 'Citi'])
   builder.filter('apr', 'between', [10, 25])
   ```

2. **`distinct(field, options)`**
   ```javascript
   // Get unique values
   const result = builder.distinct('issuer', {
     includeCount: true,      // Include count per issuer
     includeDetails: false,   // Include sample cards
     withAggregation: null    // Optional: aggregate per distinct value
   }).execute();
   
   // Result structure:
   {
     values: [
       { value: 'Chase', count: 8, cards: [...] },
       { value: 'Citi', count: 6, cards: [...] }
     ],
     total: 5  // Total unique issuers
   }
   ```

3. **`aggregate(operation, field, groupBy)`**
   ```javascript
   // Simple aggregation
   builder.aggregate('sum', 'current_balance').execute();
   // Result: { value: 25000, operation: 'sum', field: 'current_balance' }
   
   // Grouped aggregation
   builder.groupBy('issuer').aggregate('sum', 'current_balance').execute();
   // Result: [
   //   { issuer: 'Chase', sum: 12000 },
   //   { issuer: 'Citi', sum: 8000 }
   // ]
   ```

**Implementation Notes**:
- Use lazy evaluation (only process cards that pass filters)
- Support method chaining
- Immutable operations (return new builder instance)
- Efficient filtering using array methods

---

### 2. Query Decomposer (`services/chat/query/queryDecomposer.js`)

**Purpose**: Convert natural language query + extracted entities into structured query object.

**Class Structure**:
```javascript
class QueryDecomposer {
  constructor(context = {}) {
    this.context = context;  // Conversation context
  }

  decompose(query, entities, intent) {
    // Convert NL query + entities to structured query
    return {
      intent: 'query_card_data',
      subIntent: 'filter' | 'aggregate' | 'distinct' | 'compare',
      action: 'list' | 'calculate' | 'find',
      filters: [...],
      aggregations: [...],
      distinct: {...},
      sorting: {...},
      grouping: {...},
      outputFormat: 'table' | 'summary' | 'list',
      context: {...}
    };
  }

  // Helper methods
  detectDistinctQuery(entities, query) {
    // Detect if user wants distinct values
  }

  detectCompoundFilters(entities, query) {
    // Detect AND/OR combinations
  }

  detectAggregation(entities, query) {
    // Detect aggregation operations
  }

  inferFieldFromEntity(entity) {
    // Map entity to card field
  }
}
```

**Example Usage**:
```javascript
const decomposer = new QueryDecomposer(context);

const entities = extractEntities("what are the different issuers in my wallet");
const intent = detectIntent(query);

const structuredQuery = decomposer.decompose(query, entities, intent);
// Result:
{
  intent: 'query_card_data',
  subIntent: 'distinct',
  distinct: {
    field: 'issuer',
    includeCount: true
  },
  outputFormat: 'list'
}

// Then execute:
const queryBuilder = new QueryBuilder(cards);
const results = queryBuilder
  .distinct(structuredQuery.distinct.field, structuredQuery.distinct)
  .execute();
```

**Key Methods Detail**:

1. **`decompose(query, entities, intent)`**
   - Takes user query, extracted entities, and detected intent
   - Returns structured query object
   - Uses context to resolve ambiguities

2. **`detectDistinctQuery(entities, query)`**
   - Looks for keywords: "different", "various", "all the", "what are"
   - Checks for field mentions: "issuers", "networks", "types"
   - Returns distinct configuration or null

3. **`detectCompoundFilters(entities, query)`**
   - Detects AND/OR logical operators
   - Combines multiple filter conditions
   - Returns filter array with logical operators

**Field Mapping**:
```javascript
const FIELD_MAP = {
  // Entity → Card Field
  'issuer': 'issuer',
  'network': 'card_network',
  'balance': 'current_balance',
  'apr': 'apr',
  'due_date': 'due_date',
  'utilization': 'utilization',
  // ... more mappings
};
```

---

### 3. Enhanced Entity Extractor (`services/chat/entityExtractor.js`)

**Purpose**: Extract entities including distinct query indicators, compound filters.

**New Functions to Add**:

```javascript
// Existing: extractEntities(query)
// Add new extraction functions:

function extractDistinctIndicator(query, doc) {
  // Detect keywords: "different", "various", "all the"
  // Returns: { isDistinct: boolean, field: string | null }
}

function extractCompoundOperators(query, doc) {
  // Detect AND/OR in compound queries
  // Returns: { logicalOperators: ['AND', 'OR', ...] }
}

function extractGrouping(query, doc) {
  // Detect "by issuer", "by network", "group by"
  // Returns: { groupBy: string | null }
}

function extractAggregationOperation(query, doc) {
  // Detect "total", "average", "sum", "count"
  // Returns: { operation: string, field: string | null }
}
```

**Modifications**:

1. **Update `extractEntities`**:
   ```javascript
   export function extractEntities(query, doc = null) {
     const entities = {
       // Existing entities
       attribute: null,
       modifier: null,
       queryType: null,
       merchant: null,
       category: null,
       amount: null,
       cardName: null,
       tags: null,
       balanceFilter: null,
       
       // NEW entities
       distinctQuery: extractDistinctIndicator(query, doc),
       compoundOperators: extractCompoundOperators(query, doc),
       grouping: extractGrouping(query, doc),
       aggregation: extractAggregationOperation(query, doc),
       filters: [],  // Array of filter conditions
     };
     
     return entities;
   }
   ```

2. **Add distinct query patterns**:
   ```javascript
   const DISTINCT_PATTERNS = {
     'different': ['different', 'various', 'varied', 'diverse'],
     'all': ['all the', 'all of the', 'every'],
     'what are': ['what are', 'what', 'show me', 'list', 'tell me'],
     'how many different': ['how many different', 'how many types of'],
     'breakdown': ['breakdown', 'distribution', 'categorization']
   };
   ```

---

### 4. Query Executor (`services/chat/query/queryExecutor.js`)

**Purpose**: Execute structured queries using QueryBuilder.

**Class Structure**:
```javascript
class QueryExecutor {
  constructor(cards, context = {}) {
    this.cards = cards;
    this.context = context;
  }

  execute(structuredQuery) {
    // Takes structured query object
    // Returns execution results
    const builder = new QueryBuilder(this.cards);
    
    // Apply filters
    structuredQuery.filters?.forEach(filter => {
      builder.filter(filter.field, filter.operator, filter.value, filter.logicalOperator);
    });
    
    // Apply distinct
    if (structuredQuery.distinct) {
      builder.distinct(structuredQuery.distinct.field, structuredQuery.distinct);
    }
    
    // Apply aggregations
    if (structuredQuery.aggregations) {
      structuredQuery.aggregations.forEach(agg => {
        if (agg.groupBy) {
          builder.groupBy(agg.groupBy);
        }
        builder.aggregate(agg.operation, agg.field);
      });
    }
    
    // Apply sorting
    if (structuredQuery.sorting) {
      builder.sort(structuredQuery.sorting.field, structuredQuery.sorting.direction, structuredQuery.sorting.limit);
    }
    
    return builder.execute();
  }
}
```

---

### 5. Response Templates (`services/chat/response/responseTemplates.js`)

**Purpose**: Generate natural language responses from query results.

**Structure**:
```javascript
class ResponseTemplates {
  static generateResponse(structuredQuery, results, cards) {
    const template = this.selectTemplate(structuredQuery);
    return template(structuredQuery, results, cards);
  }

  static selectTemplate(structuredQuery) {
    if (structuredQuery.distinct) {
      return this.distinctTemplate;
    }
    if (structuredQuery.aggregations) {
      return this.aggregationTemplate;
    }
    if (structuredQuery.filters.length > 0) {
      return this.filteredListTemplate;
    }
    return this.defaultTemplate;
  }

  static distinctTemplate(structuredQuery, results, cards) {
    const { distinct } = structuredQuery;
    const { values, total } = results;
    
    let response = `You have cards from **${total} different ${distinct.field}${total !== 1 ? 's' : ''}**:\n\n`;
    
    values.forEach(({ value, count }) => {
      response += `• **${value}**: ${count} card${count !== 1 ? 's' : ''}\n`;
    });
    
    return response;
  }

  static aggregationTemplate(structuredQuery, results, cards) {
    // Generate aggregation response
  }

  static filteredListTemplate(structuredQuery, results, cards) {
    // Generate filtered list response
  }

  static comparisonTemplate(structuredQuery, results, cards) {
    // Generate comparison response
  }
}
```

---

### 6. Query Context (`services/chat/query/queryContext.js`)

**Purpose**: Manage conversation context for follow-up queries.

**Class Structure**:
```javascript
class QueryContext {
  constructor() {
    this.activeFilters = [];
    this.activeGrouping = null;
    this.previousQuery = null;
    this.previousResults = null;
    this.selectedCards = [];
    this.userProfile = null;
  }

  // Apply context to new query
  applyContext(structuredQuery) {
    // Merge previous filters with new ones
    // Resolve pronouns
    // Maintain conversation state
  }

  // Update context after query
  updateContext(structuredQuery, results) {
    this.previousQuery = structuredQuery;
    this.previousResults = results;
    this.activeFilters = structuredQuery.filters || [];
  }

  // Clear context
  clear() {
    this.activeFilters = [];
    this.previousQuery = null;
    this.previousResults = null;
  }
}
```

---

## Integration Points

### 1. Integration with Conversation Engine

**File**: `services/chat/conversationEngineV2.js`

**Changes**:

```javascript
// Add imports
import { QueryDecomposer } from './query/queryDecomposer.js';
import { QueryExecutor } from './query/queryExecutor.js';
import { ResponseTemplates } from './response/responseTemplates.js';
import { QueryContext } from './query/queryContext.js';

// Add context manager (per user)
const queryContexts = new Map(); // userId → QueryContext

// Modify handleQueryCardData or create new handler
async function handleQueryCardData(query, userId, cards, entities) {
  // Get or create context
  if (!queryContexts.has(userId)) {
    queryContexts.set(userId, new QueryContext());
  }
  const context = queryContexts.get(userId);
  
  // Decompose query
  const decomposer = new QueryDecomposer(context);
  const structuredQuery = decomposer.decompose(query, entities, 'query_card_data');
  
  // Execute query
  const executor = new QueryExecutor(cards, context);
  const results = executor.execute(structuredQuery);
  
  // Generate response
  const response = ResponseTemplates.generateResponse(structuredQuery, results, cards);
  
  // Update context
  context.updateContext(structuredQuery, results);
  
  return response;
}
```

### 2. Integration with Card Data Query Handler

**File**: `services/chat/cardDataQueryHandler.js`

**Changes**:

```javascript
// Migrate existing handlers to use QueryBuilder
export function handleCardDataQuery(cards, entities, query) {
  // Check if this is a distinct query
  if (entities.distinctQuery?.isDistinct) {
    return handleDistinctQuery(cards, entities, query);
  }
  
  // Check if this is a compound filter query
  if (entities.compoundOperators?.logicalOperators?.length > 0) {
    return handleCompoundQuery(cards, entities, query);
  }
  
  // Otherwise, use existing handlers (backward compatibility)
  // ... existing code ...
}

function handleDistinctQuery(cards, entities, query) {
  const builder = new QueryBuilder(cards);
  const field = entities.distinctQuery.field || 'issuer';
  
  const results = builder
    .distinct(field, { includeCount: true })
    .execute();
  
  return ResponseTemplates.generateDistinctResponse(results, field);
}

function handleCompoundQuery(cards, entities, query) {
  const builder = new QueryBuilder(cards);
  
  // Apply all filters with logical operators
  entities.filters.forEach((filter, index) => {
    const logicalOp = index > 0 ? entities.compoundOperators.logicalOperators[index - 1] : 'AND';
    builder.filter(filter.field, filter.operator, filter.value, logicalOp);
  });
  
  const results = builder.execute();
  return ResponseTemplates.generateFilteredListResponse(results);
}
```

### 3. Migration Strategy

**Phase 1**: Parallel Implementation
- Keep existing handlers working
- Add new QueryBuilder-based handlers alongside
- Route simple queries to new system

**Phase 2**: Gradual Migration
- Migrate one handler at a time
- Test thoroughly
- Keep old handlers as fallback

**Phase 3**: Full Migration
- Remove old handlers
- All queries use new system
- Remove backward compatibility code

---

## Testing Strategy

### Unit Tests

**File**: `__tests__/unit/queryBuilder.test.js`

```javascript
describe('QueryBuilder', () => {
  let cards;
  let builder;

  beforeEach(() => {
    cards = generateTestCards(); // 20 test cards
    builder = new QueryBuilder(cards);
  });

  describe('Filtering', () => {
    test('filter by card network', () => {
      const results = builder.filter('card_network', '==', 'Visa').execute();
      expect(results.results).toHaveLength(10); // 10 Visa cards
    });

    test('filter by balance with comparison', () => {
      const results = builder.filter('current_balance', '>', 5000).execute();
      expect(results.results.length).toBeGreaterThan(0);
      results.results.forEach(card => {
        expect(card.current_balance).toBeGreaterThan(5000);
      });
    });

    test('compound filters with AND', () => {
      const results = builder
        .filter('card_network', '==', 'Visa')
        .filter('current_balance', '>', 5000)
        .execute();
      // All results should be Visa AND balance > 5000
    });
  });

  describe('Distinct Operations', () => {
    test('get distinct issuers', () => {
      const results = builder.distinct('issuer').execute();
      expect(results.values).toContainEqual(expect.objectContaining({
        value: expect.any(String)
      }));
    });

    test('distinct issuers with count', () => {
      const results = builder.distinct('issuer', { includeCount: true }).execute();
      results.values.forEach(item => {
        expect(item).toHaveProperty('value');
        expect(item).toHaveProperty('count');
        expect(item.count).toBeGreaterThan(0);
      });
    });
  });

  describe('Aggregations', () => {
    test('sum total balance', () => {
      const results = builder.aggregate('sum', 'current_balance').execute();
      expect(results.value).toBeGreaterThan(0);
    });

    test('grouped aggregation', () => {
      const results = builder
        .groupBy('issuer')
        .aggregate('sum', 'current_balance')
        .execute();
      expect(Array.isArray(results)).toBe(true);
    });
  });
});
```

**File**: `__tests__/unit/queryDecomposer.test.js`

```javascript
describe('QueryDecomposer', () => {
  let decomposer;

  beforeEach(() => {
    decomposer = new QueryDecomposer();
  });

  test('decompose distinct query', () => {
    const query = "what are the different issuers in my wallet";
    const entities = extractEntities(query);
    const intent = detectIntent(query);
    
    const structured = decomposer.decompose(query, entities, intent);
    
    expect(structured.distinct).toBeDefined();
    expect(structured.distinct.field).toBe('issuer');
    expect(structured.distinct.includeCount).toBe(true);
  });

  test('decompose compound filter query', () => {
    const query = "visa cards with balance over 5000 and APR less than 25";
    const entities = extractEntities(query);
    const intent = detectIntent(query);
    
    const structured = decomposer.decompose(query, entities, intent);
    
    expect(structured.filters).toHaveLength(3); // network, balance, APR
    expect(structured.filters[1].logicalOperator).toBe('AND');
  });
});
```

**File**: `__tests__/integration/naturalLanguageQueries.test.js`

```javascript
describe('Natural Language Query Integration', () => {
  test('end-to-end: distinct issuers query', async () => {
    const query = "what are the different issuers in my wallet";
    const cards = await getUserCards(userId);
    
    // Extract entities
    const entities = extractEntities(query);
    
    // Detect intent
    const intent = detectIntent(query);
    
    // Decompose
    const decomposer = new QueryDecomposer();
    const structuredQuery = decomposer.decompose(query, entities, intent);
    
    // Execute
    const executor = new QueryExecutor(cards);
    const results = executor.execute(structuredQuery);
    
    // Generate response
    const response = ResponseTemplates.generateResponse(structuredQuery, results, cards);
    
    // Assertions
    expect(response).toContain('issuer');
    expect(results.values.length).toBeGreaterThan(0);
  });
});
```

---

## Migration Plan

### Step 1: Create New Files (Week 1)
- ✅ Create `services/chat/query/` directory
- ✅ Implement `QueryBuilder` class
- ✅ Write unit tests
- ✅ Verify with simple queries

### Step 2: Enhance Entity Extraction (Week 2)
- ✅ Add distinct query detection
- ✅ Add compound filter detection
- ✅ Update `extractEntities` function
- ✅ Test with sample queries

### Step 3: Build Query Decomposition (Week 3)
- ✅ Implement `QueryDecomposer` class
- ✅ Integrate with entity extraction
- ✅ Test decomposition accuracy

### Step 4: Build Response Templates (Week 4)
- ✅ Implement template system
- ✅ Create distinct query templates
- ✅ Create aggregation templates
- ✅ Test response quality

### Step 5: Integrate with Conversation Engine (Week 5)
- ✅ Add imports to `conversationEngineV2.js`
- ✅ Create routing logic
- ✅ Test with real queries
- ✅ Compare with old system

### Step 6: Migrate Handlers (Week 6)
- ✅ Migrate `cardDataQueryHandler.js`
- ✅ Add backward compatibility
- ✅ Test thoroughly

### Step 7: Add Learning (Week 7)
- ✅ Implement pattern learner
- ✅ Add analytics
- ✅ Test learning accuracy

### Step 8: Testing & Refinement (Week 8)
- ✅ Integration testing
- ✅ Performance testing
- ✅ Bug fixes
- ✅ Documentation

---

## Configuration

**File**: `config/queryConfig.js`

```javascript
export const QUERY_CONFIG = {
  // Distinct query patterns
  distinctPatterns: {
    keywords: ['different', 'various', 'all the', 'what are', 'how many different'],
    fields: ['issuer', 'card_network', 'card_type', 'issuer']
  },
  
  // Field mappings
  fieldMappings: {
    'issuer': 'issuer',
    'network': 'card_network',
    'balance': 'current_balance',
    'apr': 'apr',
    // ... more mappings
  },
  
  // Operator mappings
  operatorMappings: {
    'over': '>',
    'greater than': '>',
    'less than': '<',
    'equal to': '==',
    'not equal to': '!=',
    // ... more mappings
  },
  
  // Response templates
  templates: {
    distinct: {
      header: "You have cards from **{total} different {field}**:",
      item: "• **{value}**: {count} card{plural}"
    }
  }
};
```

---

## Performance Considerations

### Optimization Strategies

1. **Lazy Evaluation**: Only process cards that pass filters
2. **Caching**: Cache frequent query results
3. **Indexing**: Index cards by common filter fields
4. **Early Termination**: Stop when limit reached

### Performance Targets

- Simple filter query: < 50ms
- Distinct query: < 100ms
- Aggregation query: < 100ms
- Compound query: < 200ms

---

## Success Metrics

### Functional Metrics
- ✅ Handles all query types (distinct, filter, aggregate, compound)
- ✅ 95%+ accuracy on query decomposition
- ✅ Natural language variations handled correctly

### Performance Metrics
- ✅ Query execution time < 200ms (95th percentile)
- ✅ Response generation time < 100ms
- ✅ Memory usage < 50MB per query

### Quality Metrics
- ✅ Response relevance: 90%+ user satisfaction
- ✅ Query understanding: 95%+ accuracy
- ✅ Template quality: Natural, informative responses

---

## Next Steps

1. **Review this plan** with team
2. **Set up development environment**
3. **Create initial file structure**
4. **Start with Phase 1: Query Builder**
5. **Iterate and refine**

---

## Questions & Answers

**Q: How do we handle backward compatibility?**
A: Keep existing handlers working alongside new system, route queries based on complexity.

**Q: What about existing queries that work?**
A: They continue to work through existing handlers. New system handles new query types.

**Q: How do we test the new system?**
A: Unit tests for each component, integration tests for full flow, user acceptance testing.

**Q: What if query decomposition fails?**
A: Fallback to existing handlers or ask clarifying question.

---

## Detailed Code Specifications

### QueryBuilder Implementation Details

**File**: `services/chat/query/queryBuilder.js`

#### Complete Implementation:

```javascript
import { OPERATORS } from '../../../utils/query/operators.js';
import { validateQuery } from '../../../utils/query/validators.js';

export class QueryBuilder {
  constructor(cards = []) {
    if (!Array.isArray(cards)) {
      throw new Error('QueryBuilder: cards must be an array');
    }
    this.cards = [...cards]; // Clone to avoid mutation
    this.filters = [];
    this.aggregations = [];
    this.distinct = null;
    this.sorting = null;
    this.grouping = null;
    this.limit = null;
    this.selectFields = null;
    this._resultCache = null;
  }

  /**
   * Add a filter condition
   * @param {string} field - Card field to filter on
   * @param {string} operator - Comparison operator (==, !=, >, <, >=, <=, contains, in, between)
   * @param {*} value - Value to compare against
   * @param {string} logicalOperator - AND or OR (default: AND)
   * @returns {QueryBuilder} - Returns self for chaining
   */
  filter(field, operator, value, logicalOperator = 'AND') {
    validateQuery.validateField(field);
    validateQuery.validateOperator(operator, value);
    
    this.filters.push({
      field,
      operator,
      value,
      logicalOperator
    });
    this._resultCache = null; // Invalidate cache
    return this;
  }

  /**
   * Add a custom filter function
   * @param {Function} conditionFn - Function that takes a card and returns boolean
   * @returns {QueryBuilder} - Returns self for chaining
   */
  filterWhere(conditionFn) {
    if (typeof conditionFn !== 'function') {
      throw new Error('filterWhere requires a function');
    }
    this.filters.push({
      type: 'custom',
      fn: conditionFn
    });
    this._resultCache = null;
    return this;
  }

  /**
   * Add an aggregation operation
   * @param {string} operation - sum, avg, count, min, max, countDistinct
   * @param {string} field - Field to aggregate (null for count)
   * @param {string|null} groupBy - Optional field to group by
   * @returns {QueryBuilder} - Returns self for chaining
   */
  aggregate(operation, field = null, groupBy = null) {
    const validOperations = ['sum', 'avg', 'count', 'min', 'max', 'countDistinct'];
    if (!validOperations.includes(operation)) {
      throw new Error(`Invalid aggregation operation: ${operation}`);
    }
    
    this.aggregations.push({
      operation,
      field,
      groupBy
    });
    this._resultCache = null;
    return this;
  }

  /**
   * Get distinct values for a field
   * @param {string} field - Field to get distinct values for
   * @param {Object} options - Options object
   * @param {boolean} options.includeCount - Include count per unique value
   * @param {boolean} options.includeDetails - Include sample cards for each value
   * @param {Object|null} options.withAggregation - Optional aggregation per distinct value
   * @returns {QueryBuilder} - Returns self for chaining
   */
  distinct(field, options = {}) {
    validateQuery.validateField(field);
    
    this.distinct = {
      field,
      includeCount: options.includeCount || false,
      includeDetails: options.includeDetails || false,
      withAggregation: options.withAggregation || null
    };
    this._resultCache = null;
    return this;
  }

  /**
   * Count distinct values for a field
   * @param {string} field - Field to count distinct values for
   * @returns {QueryBuilder} - Returns self for chaining
   */
  countDistinct(field) {
    return this.aggregate('countDistinct', field);
  }

  /**
   * Sort results by field
   * @param {string} field - Field to sort by
   * @param {string} direction - 'asc' or 'desc' (default: 'asc')
   * @param {number|null} limit - Optional limit on results
   * @returns {QueryBuilder} - Returns self for chaining
   */
  sort(field, direction = 'asc', limit = null) {
    validateQuery.validateField(field);
    if (!['asc', 'desc'].includes(direction.toLowerCase())) {
      throw new Error('Sort direction must be "asc" or "desc"');
    }
    
    this.sorting = {
      field,
      direction: direction.toLowerCase(),
      limit
    };
    this._resultCache = null;
    return this;
  }

  /**
   * Group results by field
   * @param {string} field - Field to group by
   * @returns {QueryBuilder} - Returns self for chaining
   */
  groupBy(field) {
    validateQuery.validateField(field);
    this.grouping = field;
    this._resultCache = null;
    return this;
  }

  /**
   * Select specific fields to return
   * @param {string[]} fields - Array of field names
   * @returns {QueryBuilder} - Returns self for chaining
   */
  select(fields) {
    if (!Array.isArray(fields)) {
      throw new Error('select requires an array of field names');
    }
    this.selectFields = fields;
    return this;
  }

  /**
   * Limit number of results
   * @param {number} count - Maximum number of results
   * @returns {QueryBuilder} - Returns self for chaining
   */
  limit(count) {
    if (typeof count !== 'number' || count < 0) {
      throw new Error('limit requires a non-negative number');
    }
    this.limit = count;
    this._resultCache = null;
    return this;
  }

  /**
   * Execute the query and return results
   * @returns {Object} - Query results with metadata
   */
  execute() {
    const startTime = Date.now();
    
    // Apply filters
    let filteredCards = this._applyFilters(this.cards);
    
    // Handle distinct query
    if (this.distinct) {
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
    if (this.limit !== null) {
      filteredCards = filteredCards.slice(0, this.limit);
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
        limit: this.limit
      }
    };
  }

  /**
   * Apply all filters to cards
   * @private
   */
  _applyFilters(cards) {
    if (this.filters.length === 0) {
      return cards;
    }
    
    return cards.filter(card => {
      let matches = true;
      let lastMatch = true;
      
      for (let i = 0; i < this.filters.length; i++) {
        const filter = this.filters[i];
        
        if (filter.type === 'custom') {
          matches = filter.fn(card);
        } else {
          matches = OPERATORS.evaluate(card[filter.field], filter.operator, filter.value);
        }
        
        if (i > 0) {
          const prevFilter = this.filters[i - 1];
          if (prevFilter.logicalOperator === 'AND') {
            lastMatch = lastMatch && matches;
          } else if (prevFilter.logicalOperator === 'OR') {
            lastMatch = lastMatch || matches;
          }
        } else {
          lastMatch = matches;
        }
      }
      
      return lastMatch;
    });
  }

  /**
   * Execute distinct query
   * @private
   */
  _executeDistinct(cards, startTime) {
    const field = this.distinct.field;
    const values = new Map();
    
    cards.forEach(card => {
      const value = card[field];
      if (value !== null && value !== undefined) {
        if (!values.has(value)) {
          values.set(value, {
            value,
            count: 0,
            cards: []
          });
        }
        const entry = values.get(value);
        entry.count++;
        if (this.distinct.includeDetails && entry.cards.length < 3) {
          entry.cards.push(card);
        }
      }
    });
    
    const distinctValues = Array.from(values.values());
    
    // Sort by count descending if count is included
    if (this.distinct.includeCount) {
      distinctValues.sort((a, b) => b.count - a.count);
    }
    
    const executionTime = Date.now() - startTime;
    
    return {
      values: distinctValues.map(item => ({
        value: item.value,
        count: this.distinct.includeCount ? item.count : undefined,
        cards: this.distinct.includeDetails ? item.cards : undefined
      })),
      total: distinctValues.length,
      metadata: {
        field,
        executionTime,
        totalCards: cards.length
      }
    };
  }

  /**
   * Execute aggregation operations
   * @private
   */
  _executeAggregations(cards, startTime) {
    const results = [];
    
    if (this.grouping) {
      // Grouped aggregation
      const groups = new Map();
      
      cards.forEach(card => {
        const groupKey = card[this.grouping];
        if (!groups.has(groupKey)) {
          groups.set(groupKey, []);
        }
        groups.get(groupKey).push(card);
      });
      
      groups.forEach((groupCards, groupKey) => {
        const result = { [this.grouping]: groupKey };
        
        this.aggregations.forEach(agg => {
          const value = this._calculateAggregation(groupCards, agg);
          result[`${agg.operation}_${agg.field || '*'}`] = value;
        });
        
        results.push(result);
      });
    } else {
      // Simple aggregation
      const result = {};
      
      this.aggregations.forEach(agg => {
        const value = this._calculateAggregation(cards, agg);
        result[`${agg.operation}_${agg.field || '*'}`] = value;
      });
      
      results.push(result);
    }
    
    const executionTime = Date.now() - startTime;
    
    return {
      results: results.length === 1 ? results[0] : results,
      metadata: {
        aggregations: this.aggregations.length,
        grouping: this.grouping,
        executionTime,
        totalCards: cards.length
      }
    };
  }

  /**
   * Calculate aggregation value
   * @private
   */
  _calculateAggregation(cards, aggregation) {
    const { operation, field } = aggregation;
    
    if (operation === 'count') {
      return cards.length;
    }
    
    if (operation === 'countDistinct') {
      const distinctValues = new Set(cards.map(c => c[field]));
      return distinctValues.size;
    }
    
    const values = cards.map(c => c[field]).filter(v => v != null);
    
    if (values.length === 0) {
      return 0;
    }
    
    switch (operation) {
      case 'sum':
        return values.reduce((sum, v) => sum + Number(v), 0);
      case 'avg':
        return values.reduce((sum, v) => sum + Number(v), 0) / values.length;
      case 'min':
        return Math.min(...values.map(v => Number(v)));
      case 'max':
        return Math.max(...values.map(v => Number(v)));
      default:
        return 0;
    }
  }

  /**
   * Apply sorting to cards
   * @private
   */
  _applySorting(cards) {
    const { field, direction } = this.sorting;
    const sorted = [...cards].sort((a, b) => {
      const aVal = a[field];
      const bVal = b[field];
      
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return direction === 'asc' ? 1 : -1;
      if (bVal == null) return direction === 'asc' ? -1 : 1;
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      
      if (direction === 'asc') {
        return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
      } else {
        return aStr > bStr ? -1 : aStr < bStr ? 1 : 0;
      }
    });
    
    if (this.sorting.limit) {
      return sorted.slice(0, this.sorting.limit);
    }
    
    return sorted;
  }

  /**
   * Apply field selection
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
   * Clone builder for parallel queries
   * @returns {QueryBuilder} - New QueryBuilder instance
   */
  clone() {
    const cloned = new QueryBuilder(this.cards);
    cloned.filters = [...this.filters];
    cloned.aggregations = [...this.aggregations];
    cloned.distinct = this.distinct ? { ...this.distinct } : null;
    cloned.sorting = this.sorting ? { ...this.sorting } : null;
    cloned.grouping = this.grouping;
    cloned.limit = this.limit;
    cloned.selectFields = this.selectFields ? [...this.selectFields] : null;
    return cloned;
  }

  /**
   * Reset builder to initial state
   * @returns {QueryBuilder} - Returns self for chaining
   */
  reset() {
    this.filters = [];
    this.aggregations = [];
    this.distinct = null;
    this.sorting = null;
    this.grouping = null;
    this.limit = null;
    this.selectFields = null;
    this._resultCache = null;
    return this;
  }
}
```

#### Supporting Files:

**File**: `utils/query/operators.js`

```javascript
export const OPERATORS = {
  /**
   * Evaluate a comparison operation
   * @param {*} left - Left operand (card field value)
   * @param {string} operator - Operator (==, !=, >, <, etc.)
   * @param {*} right - Right operand (comparison value)
   * @returns {boolean} - Result of comparison
   */
  evaluate(left, operator, right) {
    switch (operator) {
      case '==':
        return this.equals(left, right);
      case '!=':
        return !this.equals(left, right);
      case '>':
        return Number(left) > Number(right);
      case '>=':
        return Number(left) >= Number(right);
      case '<':
        return Number(left) < Number(right);
      case '<=':
        return Number(left) <= Number(right);
      case 'contains':
        return String(left).toLowerCase().includes(String(right).toLowerCase());
      case 'in':
        if (!Array.isArray(right)) {
          return false;
        }
        return right.some(r => this.equals(left, r));
      case 'between':
        if (!Array.isArray(right) || right.length !== 2) {
          return false;
        }
        const num = Number(left);
        return num >= Number(right[0]) && num <= Number(right[1]);
      default:
        return false;
    }
  },

  equals(left, right) {
    // Case-insensitive string comparison
    if (typeof left === 'string' && typeof right === 'string') {
      return left.toLowerCase() === right.toLowerCase();
    }
    return left === right;
  }
};
```

**File**: `utils/query/validators.js`

```javascript
const VALID_FIELDS = [
  'id', 'user_id', 'card_name', 'nickname', 'card_network', 'issuer',
  'current_balance', 'credit_limit', 'apr', 'due_date', 'utilization',
  'card_type', 'reward_structure', 'statement_close_day', 'payment_due_day'
];

const VALID_OPERATORS = ['==', '!=', '>', '<', '>=', '<=', 'contains', 'in', 'between'];

export const validateQuery = {
  validateField(field) {
    if (!field || typeof field !== 'string') {
      throw new Error(`Invalid field: ${field}`);
    }
    // Note: Allow dynamic fields, but log warning for unknown fields
    if (!VALID_FIELDS.includes(field)) {
      console.warn(`Warning: Unknown field "${field}" used in query`);
    }
  },

  validateOperator(operator, value) {
    if (!VALID_OPERATORS.includes(operator)) {
      throw new Error(`Invalid operator: ${operator}. Valid operators: ${VALID_OPERATORS.join(', ')}`);
    }
    
    // Validate value based on operator
    if (operator === 'in' && !Array.isArray(value)) {
      throw new Error('Operator "in" requires an array value');
    }
    if (operator === 'between' && (!Array.isArray(value) || value.length !== 2)) {
      throw new Error('Operator "between" requires an array with 2 elements');
    }
  }
};
```

---

## Conclusion

This implementation plan provides a detailed roadmap for building the Intelligent Card Query System. The phased approach ensures incremental delivery while maintaining system stability.

**Ready to start implementation? Let's begin with Phase 1: Query Builder!**


