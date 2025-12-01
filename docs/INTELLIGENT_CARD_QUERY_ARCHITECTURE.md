# Intelligent Card Query System - Complete Architectural Design

## Executive Summary

This document outlines a scalable, AI-driven architecture for answering **ANY natural language question** about user credit cards. The system uses semantic understanding, query decomposition, dynamic execution, and continuous learning to handle natural language queries without hardcoded patterns.

### Key Capabilities

✅ **Universal Query Understanding**: Handles questions, statements, commands, and casual queries  
✅ **Semantic Understanding**: Uses embeddings to understand meaning, not just patterns  
✅ **Compositional Building**: Combines simple operations (filter, aggregate, sort) to handle complex queries  
✅ **Context Awareness**: Understands pronouns, follow-ups, and conversation history  
✅ **Ambiguity Resolution**: Handles ambiguous queries with confidence scoring and clarification  
✅ **Learning & Adaptation**: Learns from new query patterns and improves over time  
✅ **Graceful Degradation**: Falls back gracefully when exact match isn't found  
✅ **Progressive Enhancement**: Starts simple, refines based on feedback  

### Design Philosophy

**"If a human can understand the question, the system should too."**

The design is built on three core principles:

1. **Semantic Over Syntactic**: Understand meaning, not just word patterns
2. **Compositional Over Enumerated**: Build complex queries from simple operations
3. **Learning Over Hardcoding**: Adapt to new patterns automatically

This means the system can handle:
- ✅ Infinite query variations
- ✅ Compound conditions
- ✅ Follow-up questions
- ✅ Contextual references
- ✅ Unseen query types
- ✅ Natural language ambiguity

---

## 1. Problem Statement

### Current Limitations
- **Pattern-based matching**: Relies on regex and hardcoded patterns
- **Limited query types**: Only handles predefined question formats
- **No compound queries**: Cannot combine multiple filters (e.g., "balance > 5000 AND APR < 20%")
- **Brittle**: Breaks with query variations or new question types
- **No learning**: Cannot adapt to new query patterns
- **Poor scalability**: Adding new query types requires code changes
- **Limited to direct queries**: Cannot handle natural language variations, follow-ups, or contextual questions

### Requirements
- ✅ Answer **ANY** natural language question about user cards
- ✅ Handle compound filters and conditions
- ✅ Support aggregations, comparisons, rankings
- ✅ Learn from new query patterns
- ✅ Scale without code changes
- ✅ Natural language understanding with variations
- ✅ Context-aware responses
- ✅ Handle questions, statements, commands
- ✅ Support follow-up questions and clarifications
- ✅ Understand relationships between cards
- ✅ Handle temporal queries (past, present, future)
- ✅ Support analytical and predictive questions

---

## 2. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    User Query Input                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│           Natural Language Understanding Layer               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Intent     │  │   Entity     │  │   Query      │      │
│  │ Classification│  │  Extraction  │  │ Decomposition│      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Query Planning & Execution Layer                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Query      │  │   Query      │  │   Result     │      │
│  │   Builder    │  │  Executor    │  │  Formatter   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Response Generation Layer                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Template   │  │   Insight    │  │   Context    │      │
│  │   Engine     │  │   Generator  │  │   Enricher   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Response Output                           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              Learning & Adaptation Layer (Background)        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Pattern    │  │   Query     │  │   Feedback   │      │
│  │   Learner    │  │   Analytics │  │   Loop       │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Core Components Design

### 3.1 Natural Language Understanding Layer

#### 3.1.1 Intent Classification Hierarchy

**Multi-Level Intent Structure:**
```
Level 1: Primary Intent
├── query_card_data (information queries)
├── card_recommendation (suggestion queries)
├── payment_optimization (action-oriented queries)
└── wallet_management (CRUD operations)

Level 2: Sub-Intent (Operation Type)
├── filter (filtering cards)
├── aggregate (calculating totals, averages)
├── compare (comparing cards)
├── rank (ordering cards)
├── find (finding specific cards)
└── calculate (computing values)

Level 3: Action Type
├── list (show multiple items)
├── show (display information)
├── find (locate specific item)
├── calculate (compute value)
└── recommend (suggest action)
```

**Intent Detection Strategy:**
- Use existing embedding-based classification for primary intent
- Add rule-based sub-intent detection for operation type
- Combine with keyword patterns for action type
- Confidence scoring for ambiguous queries

#### 3.1.2 Enhanced Entity Extraction

**Entity Types:**
1. **Fields**: What card attribute is being queried?
   - **Numeric Fields**: `balance`, `apr`, `credit_limit`, `utilization`, `amount_to_pay`, etc.
   - **Text Fields**: `card_network`, `issuer`, `card_type`, `nickname`, `card_name`, etc.
   - **Date Fields**: `due_date`, `statement_close_date`, `payment_due_day`, etc.
   - **Boolean Fields**: `is_overdue`, `paid_in_full_last_month`, etc.
   - Support synonyms and natural language variations
   
   **Field Synonym Mapping:**
   ```javascript
   const FIELD_SYNONYMS = {
     // Numeric fields
     'balance': ['balance', 'debt', 'owed', 'amount due', 'current balance'],
     'apr': ['apr', 'interest rate', 'rate', 'percentage', 'annual rate'],
     'credit_limit': ['limit', 'credit limit', 'max credit', 'available credit'],
     'utilization': ['utilization', 'usage', 'used', 'percentage used'],
     
     // Text fields (for filtering AND distinct queries)
     'card_network': ['network', 'card type', 'visa', 'mastercard', 'amex', 'discover', 
                      'card networks', 'networks', 'payment network', 'credit card network'],
     'issuer': ['issuer', 'bank', 'credit union', 'chase', 'citi', 'amex', 'capital one',
                'issuers', 'banks', 'card issuer', 'financial institution'],
     'card_name': ['card name', 'nickname', 'card'],
     'card_type': ['type', 'card type', 'premium', 'basic', 'cashback', 'travel',
                   'card types', 'types of cards', 'kinds of cards'],
     
     // Date fields
     'due_date': ['due date', 'payment due', 'when due', 'pay by'],
     'days_until_due': ['days until due', 'days left', 'days remaining'],
     
     // Boolean/status fields
     'is_overdue': ['overdue', 'late', 'past due'],
     'paid_in_full_last_month': ['paid off', 'paid in full']
   };
   
   // Distinct query patterns - detect when user wants unique values
   const DISTINCT_QUERY_PATTERNS = {
     'different': ['different', 'various', 'varied', 'diverse', 'various types of'],
     'what are': ['what are', 'what', 'show me', 'list', 'tell me'],
     'how many different': ['how many different', 'how many types of', 'number of different'],
     'all the': ['all the', 'all of the', 'every'],
     'breakdown': ['breakdown', 'distribution', 'categorization', 'grouped by']
   };
   ```

2. **Operators**: What comparison is being made?
   - Comparison: `>`, `<`, `>=`, `<=`, `==`, `!=`
   - Range: `between`, `in_range`
   - Membership: `in`, `not_in`
   - Text: `contains`, `starts_with`, `ends_with`

3. **Values**: What are the comparison values?
   - Numbers: `5000`, `25%`, `$1000`
   - Dates: `today`, `next week`, `in 5 days`
   - Text: `Chase`, `Visa`, `travel`
   - Boolean: `true`, `false`, `yes`, `no`

4. **Filters**: Predefined filter conditions
   - `with_balance`, `zero_balance`, `high_utilization`, `overdue`, `paid_off`

5. **Aggregations**: What calculation is needed?
   - `sum`, `average`, `count`, `min`, `max`, `total`

6. **Grouping**: How to group results?
   - `by_issuer`, `by_card_type`, `by_reward_category`

7. **Sorting**: How to order results?
   - Field to sort by
   - Direction: `asc`, `desc`
   - Limit: number of results

**Entity Extraction Approach:**
- Use NLP library (compromise.js) for basic extraction
- Add semantic field mapping (synonyms → field names)
- Pattern matching for operators in natural language
- Value extraction using existing amount/date extractors
- Context-aware extraction (understand "it" refers to previous card)

#### 3.1.3 Query Decomposition Engine

**Purpose**: Convert natural language query into structured query plan

**Input**: Natural language query + extracted entities
**Output**: Structured query object

**Query Structure:**
```javascript
{
  intent: 'query_card_data',
  subIntent: 'filter',
  action: 'list',
  
  // Filter conditions (can be multiple)
  filters: [
    {
      field: 'current_balance',
      operator: '>',
      value: 5000,
      logicalOperator: 'AND' // AND, OR
    },
    {
      field: 'apr',
      operator: '<',
      value: 25,
      logicalOperator: 'AND'
    }
  ],
  
  // Aggregation (optional)
  aggregation: {
    operation: 'sum', // sum, avg, count, min, max, countDistinct
    field: 'current_balance',
    groupBy: null // optional grouping field
  },
  
  // Distinct/Unique Values (optional) - for queries like "what are the different issuers"
  distinct: {
    field: null, // 'issuer', 'card_network', 'card_type', 'issuer', etc.
    includeCount: false, // include count of cards per unique value
    includeDetails: false, // include sample cards for each value
    withAggregation: null // optional: aggregate per distinct value (e.g., sum balance by issuer)
  },
  
  // Sorting (optional)
  sorting: {
    field: 'current_balance',
    direction: 'desc',
    limit: 10
  },
  
  // Output format
  outputFormat: 'table', // table, summary, list, comparison
  
  // Context
  context: {
    previousQuery: null,
    userProfile: null,
    timeContext: 'now'
  }
}
```

**Decomposition Rules:**
1. **Field Detection**: Map natural language to card fields
   - Numeric: "balance" → `current_balance`, "interest rate" → `apr`, "credit limit" → `credit_limit`
   - Text: "visa cards" → `card_network: 'Visa'`, "chase cards" → `issuer: 'Chase'`
   - Date: "due date" → `due_date`, "payment due" → `payment_due_day`
   - Boolean: "overdue" → `is_overdue: true`, "paid off" → `paid_in_full_last_month: true`

2. **Operator Detection**: Extract comparison operators
   - Numeric: "over 5000" → `> 5000`, "less than 25%" → `< 25`, "between 1000 and 5000" → `between`
   - Text: "visa cards" → `== 'Visa'`, "chase or citi" → `in ['Chase', 'Citi']`
   - Membership: "all visa cards" → `card_network == 'Visa'`, "any mastercard" → `card_network == 'Mastercard'`

3. **Value Extraction**: Extract numeric, date, text values
   - Numeric: Use existing amount extractors (currency, percentages)
   - Text: Detect card networks, issuers, card names
   - Date: Use existing date extractors (dates, relative dates)
   - Boolean: Detect status words (overdue, paid off, etc.)

4. **Logical Operators**: Detect AND/OR in compound queries
   - "cards with balance > 5000 AND APR < 25%" → two filters with AND
   - "chase or citi cards" → `issuer in ['Chase', 'Citi']` (OR)
   - "visa cards with balance over 5000" → `card_network == 'Visa' AND current_balance > 5000`

5. **Aggregation Detection**: Identify calculation requests
   - "total balance" → `sum(current_balance)`
   - "average APR" → `avg(apr)`
   - "how many cards" → `count(*)`
   - "how many visa cards" → `count(*) WHERE card_network == 'Visa'`

6. **Distinct/Unique Value Detection**: Identify requests for unique categories
   - **Pattern Detection**: Look for keywords like "different", "various", "all the", "what are"
   - **Field Detection**: Identify which field to get distinct values for
   - **Query Type**: Determine if list or count is requested
   
   **Detection Patterns:**
   - "what are the **different** issuers" → `distinct(issuer)` with includeCount
   - "**different** networks in my wallet" → `distinct(card_network)`
   - "how many **different** issuers" → `countDistinct(issuer)`
   - "**all the** networks I have" → `distinct(card_network)` with details
   - "breakdown by issuer" → `distinct(issuer)` with grouping
   - "distribution of cards by network" → `distinct(card_network)` with percentage
   
   **Natural Language Patterns:**
   - "what are the [different/various/all the] [issuers/networks/types]"
   - "show me [all the/all] [issuers/networks]"
   - "how many [different/various] [issuers/networks]"
   - "list [all] [issuers/networks]"
   - "breakdown of [cards] by [issuer/network/type]"
   - "distribution of [cards] by [issuer/network/type]"

6. **Distinct/Unique Value Detection**: Identify requests for unique categories
   - "what are the different issuers" → `distinct(issuer)` → list unique issuers
   - "what networks do I have" → `distinct(card_network)` → list unique networks
   - "how many different issuers" → `count(distinct(issuer))` → count unique issuers
   - "show me all the issuers" → `distinct(issuer)` → list with card counts
   - "what types of cards" → `distinct(card_type)` → list unique card types

**Card Network & Issuer Detection:**

**For Filtering (specific network/issuer):**
- **Card Networks**: "visa", "mastercard", "amex", "american express", "discover"
- **Issuers**: "chase", "citi", "american express", "capital one", "wells fargo", "bank of america", "us bank"
- **Natural Language Patterns**:
  - "list all visa cards" → `{field: 'card_network', operator: '==', value: 'Visa'}` (filter)
  - "show me mastercard cards" → `{field: 'card_network', operator: '==', value: 'Mastercard'}` (filter)
  - "chase or citi cards" → `{field: 'issuer', operator: 'in', value: ['Chase', 'Citi']}` (filter)
  - "all amex cards with balance" → `{field: 'issuer', operator: '==', value: 'American Express'} AND {field: 'current_balance', operator: '>', value: 0}` (compound filter)

**For Distinct/Unique Values (card parameters):**
- **Keywords**: "different", "various", "all the", "what are", "how many different"
- **Natural Language Patterns**:
  - "what are the different issuers" → `{distinct: {field: 'issuer', includeCount: true}}` (distinct)
  - "what networks do I have" → `{distinct: {field: 'card_network', includeCount: true}}` (distinct)
  - "how many different issuers" → `{aggregation: {operation: 'countDistinct', field: 'issuer'}}` (aggregation)
  - "list all the networks" → `{distinct: {field: 'card_network'}}` (distinct)
  - "breakdown by issuer" → `{distinct: {field: 'issuer', includeCount: true, includeDetails: true}}` (distinct with details)

---

### 3.2 Query Planning & Execution Layer

#### 3.2.1 Query Builder Pattern

**Purpose**: Build executable query pipeline from structured query

**Design Pattern**: Builder pattern with fluent interface

**Core Operations:**
1. **Filter**: Apply conditions to card set
2. **Aggregate**: Calculate sums, averages, counts
3. **Sort**: Order results by field
4. **Group**: Group by field (issuer, type, etc.)
5. **Distinct**: Get unique values for a field
6. **Select**: Choose which fields to display
7. **Limit**: Restrict number of results
8. **Transform**: Calculate derived fields (utilization, etc.)

**Query Builder Interface:**
```javascript
class QueryBuilder {
  constructor(cards)
  
  // Filtering
  filter(condition) → QueryBuilder
  filterAnd(condition) → QueryBuilder
  filterOr(condition) → QueryBuilder
  
  // Aggregation
  aggregate(operation, field, groupBy?) → QueryBuilder
  
  // Distinct/Unique Values
  distinct(field, includeCount?, includeDetails?) → QueryBuilder
  countDistinct(field) → QueryBuilder
  distinctWithAggregation(field, aggregationOperation, aggregationField) → QueryBuilder
  
  // Sorting
  sort(field, direction) → QueryBuilder
  limit(count) → QueryBuilder
  
  // Selection
  select(fields) → QueryBuilder
  
  // Grouping
  groupBy(field) → QueryBuilder
  
  // Execution
  execute() → QueryResult
}
```

**Filter Condition Structure:**
```javascript
{
  field: 'current_balance',
  operator: '>',
  value: 5000,
  // Optional: custom function for complex filters
  customFilter?: (card) => boolean
}
```

**Supported Operators:**

**Numeric Operators:**
- `>`, `<`, `>=`, `<=`, `==`, `!=`, `between`
- Examples: `balance > 5000`, `apr < 25`, `balance between 1000 and 5000`

**Text Operators:**
- `==` (exact match), `!=` (not equal), `contains`, `starts_with`, `ends_with`, `in` (membership)
- Examples: 
  - `card_network == 'Visa'` → "visa cards", "all visa cards"
  - `issuer in ['Chase', 'Citi']` → "chase or citi cards"
  - `card_name contains 'Sapphire'` → "cards with sapphire in name"

**Distinct/Unique Operators:**
- `distinct(field)` → Get unique values for a field
- `countDistinct(field)` → Count unique values
- Examples:
  - `distinct(issuer)` → ["Chase", "Citi", "American Express"]
  - `distinct(card_network)` → ["Visa", "Mastercard", "Discover"]
  - `countDistinct(issuer)` → 5 (number of unique issuers)

**Date Operators:**
- `before`, `after`, `between`, `in_days`, `==`
- Examples: `due_date in_days <= 7`, `due_date before '2024-12-31'`

**Boolean Operators:**
- `==`, `!=`
- Examples: `is_overdue == true`, `paid_in_full_last_month == false`

**Special Text Matching for Card Networks/Issuers:**
- Case-insensitive matching: "Visa" matches "visa", "VISA", "Visa"
- Synonym mapping: "amex" → "American Express", "capital one" → "Capital One"
- Partial matching: "chase" matches "Chase", "Chase Sapphire", "Chase Freedom"

#### 3.2.2 Query Executor

**Purpose**: Execute query plan and return results

**Execution Flow:**
1. Start with full card set
2. Apply filters in sequence (respecting AND/OR logic)
3. Apply grouping if specified
4. Apply aggregations if specified
5. Apply sorting if specified
6. Apply limit if specified
7. Format results

**Performance Considerations:**
- Lazy evaluation: Only process cards that pass filters
- Early termination: Stop if limit reached
- Caching: Cache common query results
- Indexing: Index cards by common filter fields

#### 3.2.3 Result Formatter

**Purpose**: Format query results for display

**Output Formats:**
1. **Table**: Markdown table with columns
2. **Summary**: Single value or statistic
3. **List**: Bulleted or numbered list
4. **Comparison**: Side-by-side comparison
5. **Chart**: Data visualization (future)

**Formatting Rules:**
- Auto-detect best format based on result size
- Format numbers with currency/percentage
- Add emojis for status indicators
- Include metadata (count, totals, etc.)

---

### 3.3 Response Generation Layer

#### 3.3.1 Response Template System

**Purpose**: Generate natural language responses from query results

**Template Types:**

1. **Filtered List Template**
   - Header: "Found X cards matching your criteria"
   - Table: Formatted card data
   - Summary: Key statistics
   - Insights: Warnings, recommendations

2. **Aggregation Template**
   - Header: "Total/Average/Count of [field]"
   - Value: Formatted result
   - Context: Comparison to previous period, benchmarks

3. **Comparison Template**
   - Header: "Comparison of [cards/fields]"
   - Table: Side-by-side comparison
   - Insights: Differences, recommendations

4. **Ranking Template**
   - Header: "Top X cards by [field]"
   - List: Ranked cards
   - Insights: Why these cards, recommendations

5. **Distinct/Unique Values Template**
   - Header: "You have [X] different [field]s:"
   - List: Unique values with counts (if requested)
   - Summary: Total count or distribution percentage
   - Optional: Sample cards for each unique value
   - Examples:
     - "You have cards from 5 different issuers:"
     - "Your cards are distributed across 3 networks:"

**Template Selection:**
- Based on query type (filter, aggregate, compare, rank)
- Based on result size (small → list, large → table)
- Based on user preference (if available)

#### 3.3.2 Insight Generator

**Purpose**: Automatically add helpful insights to responses

**Insight Types:**

1. **Warning Insights**
   - High utilization cards (>70%)
   - High APR cards (>25%)
   - Overdue payments
   - Cards near credit limit

2. **Opportunity Insights**
   - Cards with low utilization (good for credit score)
   - Cards with 0% APR promotions
   - Cards with high rewards potential

3. **Actionable Insights**
   - "Pay down Card X first to save on interest"
   - "Use Card Y for groceries to maximize rewards"
   - "Card Z is due in 3 days"

4. **Comparative Insights**
   - "Your total balance increased by $500 this month"
   - "Average APR is 2% higher than last month"
   - "You're using 45% of total available credit"

**Insight Generation Rules:**
- Only show relevant insights (don't overwhelm)
- Prioritize urgent items (overdue, high utilization)
- Provide actionable recommendations
- Use appropriate emojis/icons for visual scanning

#### 3.3.3 Context Enricher

**Purpose**: Add contextual information to responses

**Context Types:**

1. **Temporal Context**
   - "As of today"
   - "Last 30 days"
   - "This month vs last month"

2. **Comparative Context**
   - "Compared to last month"
   - "vs. industry average"
   - "vs. your other cards"

3. **User Context**
   - User profile (REWARDS_MAXIMIZER, APR_MINIMIZER)
   - Previous queries
   - User preferences

4. **Financial Context**
   - Total across all cards
   - Percentage of total
   - Trend indicators

---

### 3.4 Learning & Adaptation Layer

#### 3.4.1 Query Pattern Learner

**Purpose**: Learn from successful queries to improve future responses

**Learning Approach:**

1. **Pattern Storage**
   - Store successful query → decomposition mappings
   - Store user feedback (implicit/explicit)
   - Track query frequency

2. **Pattern Matching**
   - When new query arrives, find similar patterns
   - Use embeddings for semantic similarity
   - Adapt existing pattern to new query

3. **Pattern Evolution**
   - Update patterns based on user corrections
   - Merge similar patterns
   - Remove unused patterns

**Pattern Structure:**
```javascript
{
  naturalQuery: "show cards with balance over 5000",
  decomposedQuery: {...},
  successRate: 0.95,
  usageCount: 150,
  lastUsed: Date,
  variations: ["cards with balance > 5000", "show me cards over 5000"]
}
```

#### 3.4.2 Query Analytics

**Purpose**: Track query patterns for system improvement

**Metrics to Track:**
- Query frequency by type
- Success rate by query pattern
- User corrections/follow-ups
- Response time
- User satisfaction (if available)

**Use Cases:**
- Identify common query patterns
- Find failing query types
- Optimize frequent queries
- Discover new query types to support

#### 3.4.3 Feedback Loop

**Purpose**: Learn from user interactions

**Feedback Sources:**

1. **Implicit Feedback**
   - User asks follow-up question (query was unclear)
   - User navigates to different screen (query didn't help)
   - User reformulates query (query failed)

2. **Explicit Feedback**
   - User says "that's not what I meant"
   - User corrects the response
   - User provides clarification

**Feedback Processing:**
- Store failed queries with corrections
- Update query patterns
- Improve entity extraction
- Refine response templates

---

## 4. Data Model & Schema

### 4.1 Card Data Structure

**Core Fields:**
```javascript
{
  // Identity
  id: string,
  nickname: string,
  card_name: string,
  issuer: string,
  
  // Financial
  current_balance: number,
  credit_limit: number,
  apr: number,
  amount_to_pay: number,
  
  // Calculated (derived)
  utilization: number, // current_balance / credit_limit
  available_credit: number, // credit_limit - current_balance
  
  // Dates
  due_date: Date,
  statement_close_date: Date,
  payment_due_day: number,
  statement_close_day: number,
  
  // Rewards
  reward_structure: object,
  
  // Network & Issuer (for filtering)
  card_network: string, // 'Visa', 'Mastercard', 'American Express', 'Discover'
  issuer: string, // 'Chase', 'Citi', 'American Express', 'Capital One', etc.
  
  // Status
  is_overdue: boolean,
  days_until_due: number,
  grace_period_days: number,
  paid_in_full_last_month: boolean
}
```

### 4.2 Query Result Structure

```javascript
{
  // Results
  cards: Card[],
  aggregatedValue: number | null,
  
  // Metadata
  totalCards: number,
  filteredCount: number,
  executionTime: number,
  
  // Formatting
  format: 'table' | 'summary' | 'list' | 'comparison',
  
  // Insights
  insights: Insight[],
  
  // Context
  context: {
    query: string,
    timestamp: Date,
    userProfile: string
  }
}
```

---

## 5. Natural Language Query Taxonomy

### 5.1 Question Types

The system must handle ALL question formats:

#### 5.1.1 Direct Questions (What, Which, How, When, Where, Why, Who)
- **What**: "What cards do I have?", "What's my total balance?"
- **Which**: "Which card has the lowest APR?", "Which cards are due soon?"
- **How**: "How many cards do I have?", "How much interest am I paying?"
- **When**: "When are my payments due?", "When did I last pay this card?"
- **Where**: "Where can I see all my cards?" (navigation query)
- **Why**: "Why is this card recommended?" (requires reasoning)
- **Who**: "Who issued this card?" (issuer questions)

#### 5.1.2 Statement-to-Question Conversion
Users often phrase requests as statements:
- "Show me my cards" → Listing query
- "I want to see cards with balance" → Filter query
- "Tell me about my Chase cards" → Information query
- "List all visa cards" → Filter query

#### 5.1.3 Commands (Imperative Form)
- "List cards with balance"
- "Show me my highest APR card"
- "Calculate total balance"
- "Find cards due next week"

#### 5.1.4 Comparative Questions
- "Which card has better rewards?"
- "Compare my Chase and Citi cards"
- "What's the difference between these cards?"
- "Which is better for travel, card A or card B?"

#### 5.1.5 Analytical Questions
- "What's my credit utilization across all cards?"
- "How much interest am I paying per month?"
- "What percentage of my credit limit am I using?"
- "Which card costs me the most in interest?"

#### 5.1.6 Predictive Questions
- "If I pay $1000 to this card, how much interest will I save?"
- "What will my balance be in 6 months if I keep paying minimums?"
- "How long will it take to pay off all cards?"

#### 5.1.7 Relationship Questions
- "Which cards have similar rewards?"
- "Do I have duplicate cards?"
- "Which cards should I use together?"
- "What cards complement each other?"

#### 5.1.8 Temporal Questions
- **Past**: "How much did I pay last month?", "What was my balance 3 months ago?"
- **Present**: "What's my current balance?", "Which cards are due today?"
- **Future**: "What will I owe next month?", "When should I pay this card?"

#### 5.1.9 Conditional Questions (What-If)
- "What if I pay extra to this card?"
- "If I use this card for groceries, how much cashback will I get?"
- "What happens if I miss a payment?"

#### 5.1.10 Preference-Based Questions
- "What's the best card for me?" (requires user profile)
- "Which card should I use for this purchase?"
- "What card maximizes my rewards?"
- "Which card saves me the most interest?"

### 5.2 Natural Language Variations

The system must handle infinite variations:

**Same Intent, Different Phrasing:**
- "list cards with balance" = "show cards that have balances" = "cards that aren't paid off" = "which cards have debt"
- "total balance" = "what's my total debt" = "sum of all balances" = "add up all my card balances"
- "highest APR card" = "card with worst interest rate" = "most expensive card" = "which card charges most interest"

**Query Formats:**
- Question: "What cards do I have?"
- Statement: "I want to see my cards"
- Command: "Show my cards"
- Incomplete: "my cards" (needs context to understand intent)
- Casual: "whatcha got for cards?" = "show me cards"

### 5.3 Contextual Understanding

**Pronoun Resolution:**
- "What's its APR?" (refers to previously mentioned card)
- "How much do I owe on this one?" (points to specific card)
- "Tell me more about it" (context from previous query)

**Ellipsis Handling:**
- User: "Show me Chase cards"
- User: "Which ones have balance?" (implicitly means "which Chase cards have balance")

**Follow-up Questions:**
- User: "What's my total balance?"
- User: "How about just my Chase cards?" (follow-up filter)

**Comparative Context:**
- "Which one is better?" (requires knowledge of what was compared)
- "How does this compare?" (needs previous comparison context)

### 5.4 Ambiguity Resolution

**Strategy for Ambiguous Queries:**
1. **Confidence Scoring**: Calculate confidence for each interpretation
2. **Clarification**: Ask clarifying question if confidence is low
3. **Context Use**: Use conversation history to disambiguate
4. **Default Behavior**: Provide most likely answer with alternative suggestions
5. **Progressive Disclosure**: Show results with option to refine

**Examples of Ambiguity:**
- "my cards" → Could mean: list all, show details, count, etc.
- "balance" → Could mean: current balance, total balance, remaining balance
- "best card" → Could mean: best rewards, lowest APR, best for specific purchase

---

## 6. Query Examples & Use Cases

### 5.1 Simple Queries

**Query**: "list cards with balance"
- **Intent**: `query_card_data` / `filter` / `list`
- **Filters**: `{field: 'current_balance', operator: '>', value: 0}`
- **Output**: Table of cards with non-zero balance

**Query**: "what's my total balance?"
- **Intent**: `query_card_data` / `aggregate` / `calculate`
- **Aggregation**: `{operation: 'sum', field: 'current_balance'}`
- **Output**: "$45,230.00 total balance"

### 5.2 Compound Queries

**Query**: "show me cards with balance over 5000 that have APR less than 25%"
- **Intent**: `query_card_data` / `filter` / `list`
- **Filters**: 
  - `{field: 'current_balance', operator: '>', value: 5000, logic: 'AND'}`
  - `{field: 'apr', operator: '<', value: 25, logic: 'AND'}`
- **Output**: Filtered table + insights

**Query**: "cards due in the next 7 days with balance over 1000"
- **Intent**: `query_card_data` / `filter` / `list`
- **Filters**:
  - `{field: 'days_until_due', operator: '<=', value: 7, logic: 'AND'}`
  - `{field: 'current_balance', operator: '>', value: 1000, logic: 'AND'}`
- **Output**: Urgent payments table + warnings

### 5.3 Aggregation Queries

**Query**: "average APR of my cards"
- **Intent**: `query_card_data` / `aggregate` / `calculate`
- **Aggregation**: `{operation: 'avg', field: 'apr'}`
- **Output**: "22.5% average APR across 15 cards"

**Query**: "total available credit"
- **Intent**: `query_card_data` / `aggregate` / `calculate`
- **Aggregation**: `{operation: 'sum', field: 'available_credit'}`
- **Output**: "$125,000 total available credit"

### 5.4 Ranking Queries

**Query**: "my 3 highest balance cards"
- **Intent**: `query_card_data` / `rank` / `list`
- **Sorting**: `{field: 'current_balance', direction: 'desc', limit: 3}`
- **Output**: Top 3 cards + recommendations

**Query**: "lowest APR card"
- **Intent**: `query_card_data` / `rank` / `find`
- **Sorting**: `{field: 'apr', direction: 'asc', limit: 1}`
- **Output**: Single card + details

### 5.5 Comparison Queries

**Query**: "compare my Chase cards"
- **Intent**: `query_card_data` / `compare` / `list`
- **Filters**: `{field: 'issuer', operator: '==', value: 'Chase'}`
- **Output**: Comparison table of Chase cards

### 5.6 Text-Based Filtering Queries

**Query**: "list all visa cards"
- **Intent**: `query_card_data` / `filter` / `list`
- **Filters**: `{field: 'card_network', operator: '==', value: 'Visa'}`
- **Output**: Table of all Visa cards

**Query**: "show me mastercard cards"
- **Intent**: `query_card_data` / `filter` / `list`
- **Filters**: `{field: 'card_network', operator: '==', value: 'Mastercard'}`
- **Output**: Table of all Mastercard cards

**Query**: "list all chase cards with balance"
- **Intent**: `query_card_data` / `filter` / `list`
- **Filters**:
  - `{field: 'issuer', operator: '==', value: 'Chase', logic: 'AND'}`
  - `{field: 'current_balance', operator: '>', value: 0, logic: 'AND'}`
- **Output**: Table of Chase cards with non-zero balance

**Query**: "how many amex cards do I have?"
- **Intent**: `query_card_data` / `aggregate` / `calculate`
- **Filters**: `{field: 'issuer', operator: '==', value: 'American Express'}`
- **Aggregation**: `{operation: 'count', field: '*'}`
- **Output**: "You have 3 American Express cards"

**Query**: "total balance of all visa cards"
- **Intent**: `query_card_data` / `aggregate` / `calculate`
- **Filters**: `{field: 'card_network', operator: '==', value: 'Visa'}`
- **Aggregation**: `{operation: 'sum', field: 'current_balance'}`
- **Output**: "$15,230.00 total balance across 8 Visa cards"

### 6.7 Complex Multi-Condition Queries

**Query**: "cards with high utilization that are due soon"
- **Intent**: `query_card_data` / `filter` / `list`
- **Filters**:
  - `{field: 'utilization', operator: '>', value: 70, logic: 'AND'}`
  - `{field: 'days_until_due', operator: '<=', value: 7, logic: 'AND'}`
- **Output**: Urgent high-utilization cards + warnings

**Query**: "visa cards with balance over 5000 and APR less than 25%"
- **Intent**: `query_card_data` / `filter` / `list`
- **Filters**:
  - `{field: 'card_network', operator: '==', value: 'Visa', logic: 'AND'}`
  - `{field: 'current_balance', operator: '>', value: 5000, logic: 'AND'}`
  - `{field: 'apr', operator: '<', value: 25, logic: 'AND'}`
- **Output**: Filtered table of Visa cards matching all criteria

### 6.8 Natural Language Variations (Same Intent, Different Phrasing)

**Intent: List cards with balance**
- "list cards with balance" ✅
- "show me cards that have balances" ✅
- "which cards aren't paid off" ✅
- "cards that have debt" ✅
- "show cards with money owed" ✅
- "I want to see cards with balances" ✅

**Intent: Total balance**
- "what's my total balance" ✅
- "sum of all balances" ✅
- "add up all my card balances" ✅
- "total debt across all cards" ✅
- "how much do I owe in total" ✅

**Intent: Highest APR card**
- "which card has the highest APR" ✅
- "card with worst interest rate" ✅
- "most expensive card interest-wise" ✅
- "which card charges most interest" ✅
- "worst APR card" ✅

### 6.9 Question Format Variations

**Statement → Query:**
- "I want to see my cards" → List query
- "Show me cards with balance" → Filter query
- "Tell me about my Chase cards" → Information query

**Command → Query:**
- "List all cards" → List query
- "Calculate total balance" → Aggregation query
- "Find cards due soon" → Filter query

**Casual → Query:**
- "whatcha got for cards?" → List query
- "gimme my balance" → Aggregation query
- "which cards do I have again?" → List query

### 6.10 Analytical & Calculation Queries

**Query**: "how much interest am I paying per month?"
- **Intent**: `query_card_data` / `aggregate` / `calculate`
- **Calculation**: Sum of (balance × APR / 12) for all cards
- **Output**: "$245.67 monthly interest across all cards"

**Query**: "what's my credit utilization percentage?"
- **Intent**: `query_card_data` / `aggregate` / `calculate`
- **Calculation**: (Total balance / Total credit limit) × 100
- **Output**: "45.2% overall credit utilization"

**Query**: "which card costs me the most in interest?"
- **Intent**: `query_card_data` / `rank` / `find`
- **Calculation**: For each card, calculate monthly interest = balance × APR / 12
- **Sort**: By calculated monthly interest, descending
- **Output**: Card with highest monthly interest + details

### 6.11 Comparative Queries

**Query**: "compare my Chase and Citi cards"
- **Intent**: `query_card_data` / `compare` / `list`
- **Filters**: `{field: 'issuer', operator: 'in', value: ['Chase', 'Citi']}`
- **Grouping**: By issuer
- **Output**: Side-by-side comparison table + insights

**Query**: "which card has better rewards, my Sapphire or Gold card?"
- **Intent**: `card_recommendation` / `compare` / `find`
- **Filters**: Match specific cards by name
- **Output**: Detailed comparison with recommendation

### 6.12 Distinct/Unique Value Queries (Card Parameters)

**Query**: "what are the different issuers in my wallet"
- **Intent**: `query_card_data` / `distinct` / `list`
- **Distinct**: `{field: 'issuer', includeCount: true, includeDetails: false}`
- **Output**: "You have cards from 5 different issuers:\n\n• Chase (8 cards)\n• Citi (6 cards)\n• American Express (5 cards)\n• Capital One (4 cards)\n• Discover (3 cards)"

**Query**: "what networks do I have"
- **Intent**: `query_card_data` / `distinct` / `list`
- **Distinct**: `{field: 'card_network', includeCount: true}`
- **Output**: "You have cards from 3 networks:\n\n• Visa (15 cards)\n• Mastercard (12 cards)\n• American Express (5 cards)"

**Query**: "how many different issuers do I have"
- **Intent**: `query_card_data` / `aggregate` / `calculate`
- **Aggregation**: `{operation: 'countDistinct', field: 'issuer'}`
- **Output**: "You have 5 different issuers in your wallet"

**Query**: "list all the different card networks"
- **Intent**: `query_card_data` / `distinct` / `list`
- **Distinct**: `{field: 'card_network', includeCount: true, includeDetails: true}`
- **Output**: Table showing each network with card count and sample cards

**Query**: "what types of cards do I have"
- **Intent**: `query_card_data` / `distinct` / `list`
- **Distinct**: `{field: 'card_type', includeCount: true}`
- **Output**: "You have:\n\n• Cashback cards (10)\n• Travel cards (8)\n• Rewards cards (6)\n• ..."

**Query**: "show me all my issuers with card count"
- **Intent**: `query_card_data` / `distinct` / `list`
- **Distinct**: `{field: 'issuer', includeCount: true, includeDetails: false}`
- **Grouping**: By issuer with card count
- **Output**: Table or list with issuer and count

**Query**: "what are the different reward categories in my cards"
- **Intent**: `query_card_data` / `distinct` / `list`
- **Distinct**: Extract from `reward_structure` → get unique reward categories
- **Output**: "Your cards offer rewards in:\n\n• Travel (8 cards)\n• Groceries (12 cards)\n• Dining (10 cards)\n• Gas (7 cards)\n• ..."

**Query**: "how many visa cards vs mastercard cards do I have"
- **Intent**: `query_card_data` / `aggregate` / `compare`
- **Grouping**: By `card_network` with count
- **Output**: Comparison table showing count by network

**Query**: "breakdown of cards by issuer"
- **Intent**: `query_card_data` / `distinct` / `list`
- **Distinct**: `{field: 'issuer', includeCount: true, includeDetails: true}`
- **Output**: Detailed breakdown with cards per issuer

### 6.13 Temporal Queries

**Query**: "when are my payments due?"
- **Intent**: `query_card_data` / `filter` / `list`
- **Sort**: By `due_date` ascending
- **Output**: Table of cards sorted by due date

**Query**: "which cards are due in the next week?"
- **Intent**: `query_card_data` / `filter` / `list`
- **Filters**: `{field: 'days_until_due', operator: '<=', value: 7}`
- **Output**: Urgent payments table

**Query**: "what will I owe next month?"
- **Intent**: `query_card_data` / `aggregate` / `calculate`
- **Calculation**: Project balances with interest and payments
- **Output**: Projected total balance next month

**Query**: "which issuers have I used the most"
- **Intent**: `query_card_data` / `distinct` / `rank`
- **Distinct**: `{field: 'issuer', includeCount: true}`
- **Sorting**: By card count, descending
- **Output**: Issuers ranked by number of cards

**Query**: "what's the distribution of my cards by network"
- **Intent**: `query_card_data` / `distinct` / `list`
- **Distinct**: `{field: 'card_network', includeCount: true}`
- **Calculation**: Add percentage of total
- **Output**: "Your cards are distributed as:\n\n• Visa: 15 cards (47%)\n• Mastercard: 12 cards (37%)\n• American Express: 5 cards (16%)"

### 6.14 Conditional & What-If Queries

**Query**: "if I pay $1000 to my Chase card, how much interest will I save?"
- **Intent**: `payment_optimization` / `calculate` / `compare`
- **Calculation**: Compare interest with/without extra payment
- **Output**: Interest savings calculation + recommendation

**Query**: "what if I use this card for $500 groceries?"
- **Intent**: `card_recommendation` / `calculate` / `compare`
- **Calculation**: Calculate cashback/rewards for purchase
- **Output**: Rewards amount + card recommendation

**Query**: "different issuers with their total balances"
- **Intent**: `query_card_data` / `aggregate` / `list`
- **Grouping**: By `issuer`
- **Aggregation**: `{operation: 'sum', field: 'current_balance', groupBy: 'issuer'}`
- **Output**: Table showing issuer, card count, and total balance

**Query**: "show me issuers and average APR for each"
- **Intent**: `query_card_data` / `aggregate` / `compare`
- **Grouping**: By `issuer`
- **Aggregation**: `{operation: 'avg', field: 'apr', groupBy: 'issuer'}`
- **Output**: Comparison table: issuer vs average APR

### 6.15 Relationship Queries

**Query**: "do I have duplicate cards?"
- **Intent**: `query_card_data` / `filter` / `list`
- **Logic**: Find cards with same issuer + similar rewards
- **Output**: Potential duplicates + recommendation

**Query**: "which cards should I use together?"
- **Intent**: `card_recommendation` / `recommend` / `list`
- **Logic**: Find complementary reward structures
- **Output**: Card pairing recommendations

**Query**: "which networks do I have cards from"
- **Intent**: `query_card_data` / `distinct` / `list`
- **Distinct**: `{field: 'card_network'}`
- **Output**: List of unique networks

**Query**: "what issuers are in my wallet"
- **Intent**: `query_card_data` / `distinct` / `list`
- **Distinct**: `{field: 'issuer', includeCount: true}`
- **Output**: List of unique issuers with card counts

### 6.16 Contextual & Follow-up Queries

**Query Sequence:**
1. User: "show me my Chase cards"
2. User: "which ones have balance?" (follow-up)
   - **Context**: Previous filter (Chase cards) is maintained
   - **New Filter**: `current_balance > 0`
   - **Combined**: Chase cards with balance

**Query Sequence:**
1. User: "what's my total balance?"
2. User: "how about just visa cards?" (follow-up)
   - **Context**: Previous aggregation (total balance)
   - **New Filter**: `card_network == 'Visa'`
   - **Combined**: Total balance of Visa cards only

**Query Sequence:**
1. User: "compare these two cards" (with card selection)
2. User: "which one is better for travel?" (follow-up)
   - **Context**: Specific cards from previous comparison
   - **New Intent**: Travel recommendation for those cards
   - **Output**: Travel-specific comparison

**Query Sequence for Distinct Values:**
1. User: "what are the different issuers in my wallet?"
2. System: "You have cards from: Chase (8), Citi (6), Amex (5), Capital One (4), Discover (3)"
3. User: "show me my chase cards" (follow-up - filters by one of the issuers shown)
   - **Context**: User selected "Chase" from previous distinct query
   - **New Query**: Filter by issuer == 'Chase'

**Query Sequence:**
1. User: "what networks do I have?"
2. System: "You have cards from: Visa (15), Mastercard (12), Amex (5)"
3. User: "how many visa cards do I have?" (follow-up - count one of the networks)
   - **Context**: Previous query showed Visa cards
   - **New Query**: Count where card_network == 'Visa'

### 6.17 Ambiguous Query Handling

**Query**: "my cards"
- **Possible Intents**: List all, show details, count, etc.
- **Strategy**: Default to most common (list all) with options
- **Output**: "Here are your cards. Did you mean: show details, count cards, or filter by something specific?"

**Query**: "balance"
- **Possible Meanings**: Current balance, total balance, remaining balance
- **Strategy**: Use context or show most relevant (total balance) with alternatives
- **Output**: Total balance with option to see per-card balances

**Query**: "best card"
- **Possible Meanings**: Best rewards, lowest APR, best for specific purchase, best overall
- **Strategy**: Consider user profile, show multi-strategy comparison
- **Output**: "Here's the best card for each strategy: rewards, APR, cashflow" + recommendations

---

## 7. Natural Language Understanding Enhancements

### 7.1 Universal Query Pattern Recognition

**Semantic Query Mapping:**
Instead of hardcoding patterns, use semantic understanding:

1. **Intent Detection via Embeddings**
   - Generate embeddings for user query
   - Match against intent embeddings (not patterns)
   - Handles infinite variations automatically

2. **Entity Extraction via NLP + Rules**
   - Use NLP library for structure
   - Add semantic field mapping
   - Support synonyms and variations

3. **Query Decomposition via Pattern Learning**
   - Learn from successful queries
   - Adapt patterns to new variations
   - Handle compound queries compositionally

### 7.2 Context Management System

**Conversation Context:**
```javascript
{
  // Active filters/state
  activeFilters: [...],
  activeGrouping: null,
  activeSorting: null,
  
  // Previous queries
  lastQuery: string,
  lastIntent: string,
  lastResults: [...],
  
  // Selected entities
  selectedCards: [...],
  selectedFields: [...],
  
  // User preferences
  userProfile: 'REWARDS_MAXIMIZER' | 'APR_MINIMIZER' | 'BALANCED',
  preferences: {...}
}
```

**Context-Aware Query Processing:**
- Use context to resolve pronouns ("it", "this one", "those")
- Apply previous filters to new queries
- Maintain conversation state across turns
- Support undo/redo of filters

### 7.3 Ambiguity Resolution Strategy

**Multi-Intent Handling:**
When query is ambiguous:
1. **Generate Multiple Interpretations**
   - Each with confidence score
   - Rank by likelihood

2. **Context Disambiguation**
   - Use conversation history
   - Use user profile
   - Use common patterns

3. **Progressive Disclosure**
   - Show most likely result first
   - Offer alternatives if needed
   - Ask clarifying question if low confidence

4. **Learning from Corrections**
   - If user corrects, learn the pattern
   - Update interpretation rules
   - Improve future accuracy

### 7.4 Query Normalization

**Normalization Steps:**
1. **Text Normalization**
   - Lowercase (except proper nouns)
   - Expand contractions ("don't" → "do not")
   - Remove punctuation (keep meaning)

2. **Synonym Expansion**
   - "visa cards" = "visa credit cards" = "cards on visa network"
   - "balance" = "debt" = "amount owed" = "current balance"
   - "due soon" = "due in next week" = "payment approaching"

3. **Intent Normalization**
   - "show" = "list" = "display" = "see" = "get"
   - "how many" = "count" = "number of"
   - "what's the" = "tell me" = "show me" = "I want to know"

4. **Value Normalization**
   - "$5000" = "5000" = "five thousand"
   - "25%" = "25 percent" = "twenty-five percent"
   - "next week" = "in 7 days" = "within a week"

### 7.5 Query Expansion & Refinement

**Automatic Query Expansion:**
- Add implicit filters from context
- Expand abbreviations ("APR" = "annual percentage rate")
- Include related fields (show APR when showing interest cost)

**Query Refinement Suggestions:**
After showing results, suggest refinements:
- "Did you mean: cards with balance over $1000?"
- "You might also want to see: high APR cards"
- "Related: cards due this week"

---

## 8. Implementation Phases

### Phase 1: Foundation (MVP)
**Goal**: Handle basic filtered queries

**Components:**
1. Enhanced entity extraction (fields, operators, values)
2. Basic QueryBuilder (filter, sort, limit)
3. Simple response templates
4. Basic insight generation

**Queries Supported:**
- "cards with balance"
- "zero balance cards"
- "highest balance card"
- "total balance"
- "list all visa cards" ✅
- "show me mastercard cards" ✅
- "chase cards with balance" ✅

**Timeline**: 2-3 weeks

### Phase 2: Enhanced Queries
**Goal**: Support compound queries and aggregations

**Components:**
1. Query decomposition engine
2. Full QueryBuilder (all operations)
3. Aggregation support
4. Enhanced response templates

**Queries Supported:**
- All Phase 1 queries
- Compound filters (AND/OR)
- Aggregations (sum, avg, count)
- Rankings with limits

**Timeline**: 2-3 weeks

### Phase 3: Intelligence
**Goal**: Add insights and context

**Components:**
1. Insight generator
2. Context enricher
3. Comparative analysis
4. Actionable recommendations

**Features:**
- Automatic warnings
- Opportunity detection
- Trend analysis
- Personalized suggestions

**Timeline**: 2-3 weeks

### Phase 4: Learning
**Goal**: System learns and adapts

**Components:**
1. Query pattern learner
2. Query analytics
3. Feedback loop
4. Pattern optimization

**Features:**
- Learn from successful queries
- Adapt to new patterns
- Improve over time
- User preference learning

**Timeline**: 3-4 weeks

### Phase 5: Advanced (Future)
**Goal**: RAG and complex reasoning

**Components:**
1. Card knowledge embeddings
2. Semantic search
3. LLM integration for complex queries
4. Hybrid structured + semantic approach

**Timeline**: 4-6 weeks

---

## 9. Technical Considerations

### 7.1 Performance
- **Lazy Evaluation**: Only process cards that pass filters
- **Caching**: Cache frequent query results
- **Indexing**: Index cards by common filter fields
- **Early Termination**: Stop processing when limit reached

### 7.2 Scalability
- **Stateless Design**: Query execution is stateless
- **Horizontal Scaling**: Can scale query executors
- **Efficient Algorithms**: Use efficient filtering/sorting
- **Result Streaming**: Stream large result sets

### 7.3 Maintainability
- **Modular Design**: Clear separation of concerns
- **Extensible**: Easy to add new fields, operators, aggregations
- **Testable**: Each component independently testable
- **Documented**: Clear documentation and examples

### 7.4 Reliability
- **Error Handling**: Graceful degradation on errors
- **Validation**: Validate queries before execution
- **Fallbacks**: Fallback to simpler queries if complex query fails
- **Logging**: Comprehensive logging for debugging

---

## 10. Success Metrics

### 8.1 Functional Metrics
- **Query Success Rate**: % of queries answered correctly
- **Query Coverage**: % of query types supported
- **Response Accuracy**: % of responses that are correct
- **User Satisfaction**: User feedback scores

### 8.2 Performance Metrics
- **Response Time**: Average time to generate response
- **Query Throughput**: Queries processed per second
- **Cache Hit Rate**: % of queries served from cache
- **Resource Usage**: CPU, memory usage

### 8.3 Learning Metrics
- **Pattern Learning Rate**: New patterns learned per week
- **Improvement Rate**: Improvement in success rate over time
- **Adaptation Speed**: Time to adapt to new query types

---

## 11. Risk Mitigation

### 9.1 Technical Risks
- **Query Ambiguity**: Use confidence scoring and ask for clarification
- **Performance Degradation**: Implement caching and optimization
- **Complex Query Failures**: Fallback to simpler queries

### 9.2 User Experience Risks
- **Overwhelming Responses**: Limit insights, use progressive disclosure
- **Incorrect Responses**: Provide easy correction mechanism
- **Query Failures**: Clear error messages with suggestions

---

## 12. Universal Query Handling Strategy

### 12.1 Fallback Mechanism

**Hierarchy of Query Processing:**

1. **Primary Path**: Intent classification → Entity extraction → Query decomposition → Execution
2. **Secondary Path**: If primary fails → Semantic similarity search → Pattern matching
3. **Tertiary Path**: If secondary fails → LLM-assisted query understanding → Structured response
4. **Fallback**: If all fail → Ask clarifying question with suggestions

### 12.2 Query Understanding Pipeline

```
User Query
    ↓
[1] Preprocessing
    - Normalize text
    - Expand synonyms
    - Detect language
    ↓
[2] Intent Detection
    - Generate query embedding
    - Match against intent embeddings
    - Calculate confidence scores
    ↓
[3] Entity Extraction
    - Extract fields, operators, values
    - Extract card names, networks, issuers
    - Extract amounts, dates, percentages
    ↓
[4] Query Decomposition
    - Build structured query object
    - Handle compound conditions
    - Add context from conversation
    ↓
[5] Validation & Disambiguation
    - Validate query structure
    - Resolve ambiguities
    - Ask clarification if needed
    ↓
[6] Query Execution
    - Execute via QueryBuilder
    - Return results
    ↓
[7] Response Generation
    - Format results
    - Add insights
    - Enrich with context
    ↓
[8] Learning (Background)
    - Store successful query pattern
    - Update similarity weights
    - Improve future matching
```

### 12.3 Handling Any Natural Question

**Key Principles:**

1. **Semantic Understanding Over Pattern Matching**
   - Use embeddings to understand meaning
   - Not limited to specific word patterns
   - Handles variations automatically

2. **Compositional Query Building**
   - Combine simple operations to handle complex queries
   - Filters + Aggregations + Sorting + Grouping = Any query
   - No need to predefine every query type

3. **Progressive Enhancement**
   - Start with simple interpretation
   - Refine based on user feedback
   - Learn and improve continuously

4. **Graceful Degradation**
   - If exact match fails, try similar queries
   - If still fails, ask clarifying question
   - Never say "I don't understand" without suggestions

5. **Context is King**
   - Use conversation history
   - Remember user preferences
   - Maintain state across turns

### 12.4 Universal Query Coverage Matrix

**The design handles ANY question by breaking it into composable operations:**

| Question Type | Pattern | How It's Handled |
|--------------|---------|------------------|
| **Direct Questions** | "What/Which/How/When..." | Intent classification + Entity extraction |
| **Statements** | "Show me...", "I want..." | Converted to equivalent question |
| **Commands** | "List...", "Calculate..." | Treated as imperative query |
| **Comparisons** | "Compare X and Y" | Multi-card filter + comparison template |
| **Rankings** | "Best...", "Worst...", "Top N" | Sort + limit operation |
| **Aggregations** | "Total...", "Average...", "How many..." | Aggregation operation |
| **Filters** | "...with balance", "...due soon" | Filter conditions |
| **Temporal** | "Next week", "Last month", "In 5 days" | Date-based filtering |
| **Conditional** | "What if...", "If I pay..." | Simulation/calculation mode |
| **Relationships** | "Which cards...", "Do I have..." | Pattern matching + reasoning |

### 12.5 Examples of "Any Natural Question"

**Direct Questions (What/Which/How/When/Why):**
- ✅ "What cards do I have?"
- ✅ "Which card should I use for groceries?"
- ✅ "How much interest am I paying?"
- ✅ "When is my next payment due?"
- ✅ "Why is my utilization high?"
- ✅ "What's the difference between these two cards?"
- ✅ "Which cards are costing me the most?"
- ✅ "How many cards do I have with balance?"

**Natural Variations (Casual/Conversational):**
- ✅ "Whatcha got for cards?"
- ✅ "Gimme my total balance"
- ✅ "Tell me about my chase cards"
- ✅ "I wanna know which card has the best rewards"
- ✅ "Can you show me cards that are overdue?"
- ✅ "Dude, what's my debt situation?"
- ✅ "Help me figure out my cards"
- ✅ "I'm curious about my visa cards"

**Complex Multi-Part Questions:**
- ✅ "Which of my cards with balance over 5000 has the lowest APR?"
- ✅ "If I pay 1000 extra to my highest APR card, how much interest will I save?"
- ✅ "Compare my travel cards and tell me which one is better"
- ✅ "What's the total balance of my visa cards that are due next week?"
- ✅ "Show me chase cards with high utilization that are due soon"
- ✅ "Which cards have both high balance and high APR?"

**Analytical & Calculation Questions:**
- ✅ "What percentage of my total credit am I using?"
- ✅ "How does my current utilization compare to last month?"
- ✅ "Which card gives me the most value considering both rewards and fees?"
- ✅ "How much am I spending on interest each month?"
- ✅ "What's my average APR across all cards?"
- ✅ "How much would I save if I paid off my highest APR card?"

**Predictive & What-If Questions:**
- ✅ "If I only pay minimums, how long until I pay off all cards?"
- ✅ "What will my total balance be in 3 months if I keep spending at current rate?"
- ✅ "If I consolidate my debts, how much would I save?"
- ✅ "What happens if I miss a payment on this card?"

**Relationship & Comparison Questions:**
- ✅ "Do I have too many similar cards?"
- ✅ "Which cards complement each other for maximum rewards?"
- ✅ "Should I consolidate any of my cards?"
- ✅ "Are any of my cards redundant?"
- ✅ "Which cards work well together for different categories?"

**Network/Issuer Filtering Questions:**
- ✅ "List all visa cards"
- ✅ "Show me mastercard cards"
- ✅ "What chase cards do I have?"
- ✅ "How many amex cards do I own?"
- ✅ "Total balance of all discover cards"

**Distinct/Unique Value Questions (Card Parameters):**
- ✅ "What are the different issuers in my wallet?"
- ✅ "What networks do I have?"
- ✅ "How many different issuers do I have?"
- ✅ "List all the card networks I use"
- ✅ "What types of cards do I have?"
- ✅ "Show me all my issuers"
- ✅ "Breakdown of cards by issuer"
- ✅ "Distribution of my cards by network"
- ✅ "Which issuers have the most cards?"
- ✅ "What are the different reward categories in my cards?"
- ✅ "What issuers are in my wallet?"
- ✅ "Which networks do I have cards from?"
- ✅ "How many different card types?"
- ✅ "Show me all the different issuers"
- ✅ "What are all the networks represented in my cards?"

**Grouped Aggregations:**
- ✅ "Total balance by issuer"
- ✅ "Average APR by network"
- ✅ "How many cards per issuer?"
- ✅ "Total balance for each network"
- ✅ "Breakdown by issuer showing total balance"

**Status-Based Questions:**
- ✅ "Which cards are overdue?"
- ✅ "Show me cards that are paid off"
- ✅ "What cards have high utilization?"
- ✅ "Which cards are near their credit limit?"
- ✅ "Cards that are due this week"

**Reward & Category Questions:**
- ✅ "Which card is best for groceries?"
- ✅ "What card should I use for travel?"
- ✅ "Which card gives best gas rewards?"
- ✅ "Compare my dining rewards cards"
- ✅ "Which card maximizes rewards for my spending?"

### 12.6 Handling Unseen Query Types

**When a completely new query type appears:**

1. **Semantic Similarity Matching**
   - Generate embedding for new query
   - Find most similar known query patterns
   - Adapt existing pattern to new query
   - Execute and learn from result

2. **LLM-Assisted Understanding**
   - If no similar pattern found, use LLM to understand query
   - Extract structured components (filters, aggregations, etc.)
   - Build query dynamically
   - Store as new pattern for future use

3. **Progressive Learning**
   - Learn from successful executions
   - Build pattern library automatically
   - Improve matching over time
   - Reduce dependency on LLM as patterns accumulate

**Example:**
User asks completely new question: "How would my credit score change if I closed my oldest card?"
- System has never seen this exact query
- Uses LLM to understand: this is a "what-if" question about credit impact
- Extracts: action (close card), metric (credit score), condition (oldest card)
- Builds query dynamically to simulate scenario
- Learns this pattern for future similar queries

---

## 13. Future Enhancements

### 10.1 Advanced Features
- **Natural Language Generation**: Generate natural language explanations
- **Visualizations**: Charts and graphs for data
- **Predictive Insights**: Predict future balances, payments
- **Personalization**: Learn user preferences and adapt

### 10.2 Integration
- **Voice Queries**: Support voice input
- **Multi-language**: Support multiple languages
- **External Data**: Integrate with credit bureaus, banks
- **AI Assistant**: Conversational AI for complex queries

---

## Conclusion

This architecture provides a **universal, scalable, and intelligent** system for answering **ANY natural language question** about user credit cards. 

### Key Differentiators

**1. Universal Query Handling**
- Not limited to predefined patterns or hardcoded queries
- Handles infinite variations through semantic understanding
- Supports questions, statements, commands, and casual queries
- Learns new query patterns automatically

**2. Compositional Design**
- Builds complex queries from simple operations (filter, aggregate, sort, group)
- Any combination of operations = any possible query
- No need to predefine every query type

**3. Semantic Understanding**
- Uses embeddings to understand meaning, not just word patterns
- Handles synonyms, variations, and natural language nuances
- Context-aware to understand pronouns, follow-ups, and references

**4. Learning & Adaptation**
- Learns from successful queries
- Adapts to new patterns automatically
- Improves over time without code changes

**5. Graceful Degradation**
- Multiple fallback mechanisms
- Never fails without providing alternatives
- Asks clarifying questions when needed

### Query Coverage Matrix

The system can handle:

| Category | Examples | How It Works |
|---------|----------|--------------|
| **Direct Questions** | "What cards do I have?", "Which card is best?" | Intent classification + Entity extraction |
| **Network/Issuer** | "List all visa cards", "Show chase cards" | Text field filtering |
| **Distinct Values** | "What are different issuers?", "What networks do I have?" | Distinct/unique operations |
| **Grouped Aggregations** | "Total balance by issuer", "Average APR by network" | Group by + aggregation |
| **Balance Queries** | "Cards with balance", "Zero balance cards" | Numeric filtering |
| **Aggregations** | "Total balance", "Average APR", "How many cards" | Aggregation operations |
| **Rankings** | "Highest balance card", "Top 3 cards by APR" | Sort + limit operations |
| **Comparisons** | "Compare my cards", "Which is better?" | Multi-card filtering + comparison |
| **Temporal** | "Due next week", "Overdue cards" | Date-based filtering |
| **Compound** | "Visa cards with balance > 5000 AND APR < 25%" | Multiple filters with AND/OR |
| **Analytical** | "How much interest?", "What's my utilization?" | Calculations + aggregations |
| **Predictive** | "If I pay X, how much will I save?" | What-if simulations |
| **Relationships** | "Which cards complement each other?" | Pattern matching + reasoning |
| **Follow-ups** | "Which ones have balance?" (after previous query) | Context maintenance |
| **Casual** | "Whatcha got?", "Gimme my balance" | Query normalization |

### Implementation Philosophy

**"If a human can understand the question, the system should too."**

The design ensures:
- ✅ **No query is too complex** - Compositional operations handle any combination
- ✅ **No variation is too different** - Semantic understanding handles infinite variations
- ✅ **No question is too new** - Learning system adapts to unseen queries
- ✅ **No context is lost** - Conversation state maintained across turns

The phased implementation approach allows for incremental delivery of value while building toward a truly universal query system.

