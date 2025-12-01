# Phase 6: Learning System - Detailed Implementation Plan

## Overview

**Goal**: Implement pattern learning and analytics to continuously improve query understanding and response quality.

**Status**: Not started  
**Estimated Duration**: 1-2 weeks  
**Dependencies**: Phases 1-5 (completed)

## Architecture Overview

Phase 6 builds on existing infrastructure:
- ✅ `intent_logs` table (already exists)
- ✅ `user_profiles` table (already exists)
- ✅ `userProfileAnalyzer.js` (basic analytics)
- ✅ Query logging in conversation engine

Phase 6 extends this with:
- 🔄 Query pattern learning from successful decompositions
- 📊 Analytics dashboard for query insights
- 🔁 Feedback loop for continuous improvement

## Components

### 1. Query Pattern Learner (`services/chat/learning/patternLearner.js`)

**Purpose**: Learn from successful query decompositions to improve future accuracy.

**Learning Approach**:
1. **Store successful patterns**: When a query is successfully decomposed and executed
2. **Pattern matching**: Find similar patterns for new queries
3. **Pattern evolution**: Update patterns based on user feedback
4. **Pattern merging**: Combine similar patterns

**Pattern Structure**:
```javascript
{
  id: 'uuid',
  naturalQuery: "what are the different issuers in my wallet",
  decomposedQuery: {
    subIntent: 'distinct',
    distinct: { field: 'issuer', includeCount: true },
    ...
  },
  entities: { distinctQuery: { field: 'issuer' }, ... },
  
  // Success metrics
  successRate: 0.95,           // % of times this pattern worked correctly
  usageCount: 150,              // How many times used
  lastUsed: '2025-12-07T...',
  
  // Variations (similar queries that map to same pattern)
  variations: [
    "what issuers do I have",
    "list all issuers",
    "show different banks"
  ],
  
  // Metadata
  confidence: 0.92,             // Pattern confidence score
  averageResponseTime: 45,      // ms
  userSatisfaction: 0.88,       // From implicit feedback
  
  // Context
  commonContexts: ['query_card_data', 'wallet_overview'],
  
  // Evolution tracking
  createdAt: '2025-12-01T...',
  updatedAt: '2025-12-07T...',
  version: 3
}
```

**Key Methods**:

```javascript
class PatternLearner {
  /**
   * Store a successful query pattern
   */
  async learnPattern(query, entities, structuredQuery, result) {
    // 1. Check if similar pattern exists
    // 2. If exists, update usage count and success rate
    // 3. If new, create new pattern
    // 4. Store pattern in database
  }

  /**
   * Find matching pattern for a new query
   */
  async findMatchingPattern(query, entities) {
    // 1. Calculate query embedding
    // 2. Find similar patterns using vector similarity
    // 3. Rank by confidence and usage count
    // 4. Return best match if confidence > threshold
  }

  /**
   * Update pattern based on feedback
   */
  async updatePattern(patternId, feedback) {
    // 1. Update success rate
    // 2. Adjust confidence
    // 3. Add variation if new query similar
    // 4. Evolve pattern if needed
  }

  /**
   * Merge similar patterns
   */
  async mergePatterns(patternIds) {
    // Combine patterns with high similarity
  }
}
```

### 2. Query Analytics (`services/chat/learning/queryAnalytics.js`)

**Purpose**: Track query patterns for system improvement and insights.

**Analytics Metrics**:

1. **Query Performance**
   - Average response time by intent type
   - Success rate by query complexity
   - Error rate by pattern

2. **Query Patterns**
   - Most common queries
   - Query frequency trends
   - Popular field combinations
   - Common filter patterns

3. **User Behavior**
   - Query distribution by user profile
   - Peak query times
   - Follow-up query patterns
   - Query abandonment rate

4. **System Performance**
   - Intent detection accuracy
   - Entity extraction accuracy
   - Decomposition success rate
   - Response generation time

**Key Methods**:

```javascript
class QueryAnalytics {
  /**
   * Track query execution
   */
  async trackQuery(query, entities, structuredQuery, result, metadata) {
    // Log to intent_logs with extended metadata
  }

  /**
   * Get query statistics
   */
  async getQueryStats(timeRange = '7d', filters = {}) {
    // Aggregate query metrics
    return {
      totalQueries: 1250,
      avgResponseTime: 120,
      successRate: 0.94,
      topIntents: [...],
      topQueries: [...],
      errorRate: 0.06,
      trends: {...}
    };
  }

  /**
   * Get user-specific analytics
   */
  async getUserAnalytics(userId, timeRange = '30d') {
    // User query patterns, preferences, etc.
  }

  /**
   * Get pattern performance metrics
   */
  async getPatternMetrics(patternId) {
    // Performance stats for a specific pattern
  }
}
```

**Database Schema Extension**:

```sql
-- Extend intent_logs table
ALTER TABLE intent_logs
ADD COLUMN IF NOT EXISTS entities jsonb,
ADD COLUMN IF NOT EXISTS structured_query jsonb,
ADD COLUMN IF NOT EXISTS decomposition_method text, -- 'pattern_match', 'direct', 'gpt_fallback'
ADD COLUMN IF NOT EXISTS pattern_id uuid REFERENCES query_patterns(id),
ADD COLUMN IF NOT EXISTS response_time_ms integer,
ADD COLUMN IF NOT EXISTS success boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS error_message text,
ADD COLUMN IF NOT EXISTS user_feedback jsonb; -- { rating: 5, helpful: true }

-- New table: query_patterns
CREATE TABLE IF NOT EXISTS query_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Pattern identification
  natural_query text NOT NULL,
  decomposed_query jsonb NOT NULL,
  entities jsonb NOT NULL,
  
  -- Success metrics
  success_rate decimal(5,4) DEFAULT 1.0,
  usage_count integer DEFAULT 0,
  last_used_at timestamp with time zone,
  
  -- Variations (similar queries)
  variations text[] DEFAULT '{}',
  
  -- Metadata
  confidence decimal(5,4) DEFAULT 0.5,
  average_response_time_ms integer,
  user_satisfaction decimal(5,4),
  
  -- Context
  common_contexts text[],
  
  -- Lifecycle
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  version integer DEFAULT 1,
  
  -- Indexes
  CONSTRAINT query_patterns_confidence_check CHECK (confidence >= 0 AND confidence <= 1),
  CONSTRAINT query_patterns_success_rate_check CHECK (success_rate >= 0 AND success_rate <= 1)
);

-- Index for pattern lookup
CREATE INDEX IF NOT EXISTS query_patterns_natural_query_idx 
  ON query_patterns USING gin(to_tsvector('english', natural_query));

CREATE INDEX IF NOT EXISTS query_patterns_usage_count_idx 
  ON query_patterns(usage_count DESC);

-- Embedding for semantic similarity
ALTER TABLE query_patterns
ADD COLUMN IF NOT EXISTS query_embedding vector(1536);

CREATE INDEX IF NOT EXISTS query_patterns_embedding_idx
  ON query_patterns
  USING ivfflat (query_embedding vector_cosine_ops)
  WITH (lists = 100);
```

### 3. Feedback Loop (`services/chat/learning/feedbackLoop.js`)

**Purpose**: Collect and process user feedback to improve patterns.

**Feedback Types**:

1. **Implicit Feedback**
   - Query abandonment (user doesn't click response)
   - Time to next query (fast = satisfied, slow = confused)
   - Follow-up queries (success = good, correction = needs work)
   - No results returned (query didn't match intent)

2. **Explicit Feedback**
   - Thumbs up/down on responses
   - "Was this helpful?" prompts
   - User corrections ("I meant X, not Y")
   - Rating system (1-5 stars)

**Key Methods**:

```javascript
class FeedbackLoop {
  /**
   * Record implicit feedback
   */
  async recordImplicitFeedback(queryId, feedbackType, data) {
    // Track user behavior as feedback
  }

  /**
   * Record explicit feedback
   */
  async recordExplicitFeedback(queryId, rating, comments) {
    // User-provided feedback
  }

  /**
   * Process feedback and update patterns
   */
  async processFeedback(feedbackId) {
    // Analyze feedback and update relevant patterns
    // Lower confidence for negative feedback
    // Raise confidence for positive feedback
  }

  /**
   * Identify patterns needing improvement
   */
  async identifyProblemPatterns(threshold = 0.7) {
    // Find patterns with low success rate or satisfaction
  }
}
```

**Database Schema**:

```sql
-- Feedback table
CREATE TABLE IF NOT EXISTS query_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query_log_id uuid REFERENCES intent_logs(id),
  pattern_id uuid REFERENCES query_patterns(id),
  
  -- Feedback type
  feedback_type text NOT NULL, -- 'implicit', 'explicit'
  feedback_subtype text, -- 'abandonment', 'correction', 'rating', 'thumbs_up'
  
  -- Feedback data
  rating integer CHECK (rating >= 1 AND rating <= 5),
  helpful boolean,
  correction_text text, -- User's correction
  
  -- Metadata
  user_id uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  
  -- Indexes
  CONSTRAINT feedback_type_check CHECK (feedback_type IN ('implicit', 'explicit'))
);

CREATE INDEX IF NOT EXISTS query_feedback_pattern_id_idx 
  ON query_feedback(pattern_id);

CREATE INDEX IF NOT EXISTS query_feedback_created_at_idx 
  ON query_feedback(created_at DESC);
```

## Integration Points

### Integration with QueryDecomposer

```javascript
// In queryDecomposer.js
import { PatternLearner } from '../learning/patternLearner.js';

class QueryDecomposer {
  constructor(context = {}) {
    this.context = context;
    this.patternLearner = new PatternLearner();
  }

  async decompose(query, entities, intent) {
    // 1. Try to find matching pattern first
    const matchingPattern = await this.patternLearner.findMatchingPattern(query, entities);
    
    if (matchingPattern && matchingPattern.confidence > 0.8) {
      // Use pattern if high confidence
      console.log(`[QueryDecomposer] Using learned pattern: ${matchingPattern.id}`);
      
      // Update pattern usage
      await this.patternLearner.recordPatternUsage(matchingPattern.id);
      
      // Adapt pattern to current query
      return this._adaptPattern(matchingPattern, query, entities);
    }
    
    // 2. Otherwise, decompose normally
    const structuredQuery = this._decomposeNormally(query, entities, intent);
    
    // 3. Learn from successful decomposition
    // (will be called after successful execution)
    
    return structuredQuery;
  }

  async learnFromSuccess(query, entities, structuredQuery, result) {
    // Store successful pattern for future use
    await this.patternLearner.learnPattern(query, entities, structuredQuery, result);
  }
}
```

### Integration with QueryExecutor

```javascript
// In queryExecutor.js
import { QueryAnalytics } from '../learning/queryAnalytics.js';

class QueryExecutor {
  constructor(cards, context = {}) {
    this.cards = cards;
    this.context = context;
    this.analytics = new QueryAnalytics();
  }

  async execute(structuredQuery) {
    const startTime = performance.now();
    
    try {
      const results = this._executeQuery(structuredQuery);
      const responseTime = performance.now() - startTime;
      
      // Track successful execution
      await this.analytics.trackQuery(
        this.context.query,
        this.context.entities,
        structuredQuery,
        results,
        {
          responseTime,
          success: true,
          resultCount: results.total || results.values?.length || 0
        }
      );
      
      return results;
    } catch (error) {
      const responseTime = performance.now() - startTime;
      
      // Track failed execution
      await this.analytics.trackQuery(
        this.context.query,
        this.context.entities,
        structuredQuery,
        null,
        {
          responseTime,
          success: false,
          error: error.message
        }
      );
      
      throw error;
    }
  }
}
```

### Integration with Conversation Engine

```javascript
// In conversationEngineV2.js
import { PatternLearner } from './learning/patternLearner.js';
import { FeedbackLoop } from './learning/feedbackLoop.js';

// After successful query execution
async function handleQueryCardData(...) {
  // ... existing code ...
  
  // Learn from successful execution
  if (structuredQuery && queryResults) {
    await patternLearner.learnFromSuccess(
      query,
      entities,
      structuredQuery,
      queryResults
    );
  }
  
  return response;
}
```

## Analytics Dashboard (Admin Page)

**Location**: `pages/admin/query-analytics.js`

**Features**:
1. **Query Overview Dashboard**
   - Total queries (last 7/30 days)
   - Average response time
   - Success rate
   - Error rate trends

2. **Pattern Performance**
   - Top patterns by usage
   - Patterns with low success rates
   - Patterns needing attention

3. **Query Insights**
   - Most common queries
   - Query frequency trends
   - Peak usage times
   - User behavior patterns

4. **System Health**
   - Intent detection accuracy
   - Entity extraction accuracy
   - Decomposition success rate
   - Response generation performance

## Implementation Steps

### Step 1: Database Schema (2 hours)
- ✅ Create `query_patterns` table
- ✅ Extend `intent_logs` table
- ✅ Create `query_feedback` table
- ✅ Add indexes and constraints

### Step 2: Pattern Learner Core (4-6 hours)
- ✅ Implement `PatternLearner` class
- ✅ Pattern storage and retrieval
- ✅ Pattern matching using embeddings
- ✅ Pattern evolution logic
- ✅ Unit tests

### Step 3: Query Analytics (3-4 hours)
- ✅ Implement `QueryAnalytics` class
- ✅ Query tracking and logging
- ✅ Statistics aggregation
- ✅ Performance metrics
- ✅ Unit tests

### Step 4: Feedback Loop (3-4 hours)
- ✅ Implement `FeedbackLoop` class
- ✅ Implicit feedback collection
- ✅ Explicit feedback collection
- ✅ Feedback processing
- ✅ Pattern improvement logic
- ✅ Unit tests

### Step 5: Integration (4-6 hours)
- ✅ Integrate with QueryDecomposer
- ✅ Integrate with QueryExecutor
- ✅ Integrate with conversation engine
- ✅ Add feedback UI components
- ✅ Integration tests

### Step 6: Analytics Dashboard (6-8 hours)
- ✅ Create admin page
- ✅ Query overview charts
- ✅ Pattern performance tables
- ✅ Query insights visualization
- ✅ System health monitoring

### Step 7: Testing & Refinement (4-6 hours)
- ✅ End-to-end tests
- ✅ Performance testing
- ✅ Bug fixes
- ✅ Documentation

**Total Estimated Time**: 26-36 hours (3-5 days)

## Testing Strategy

### Unit Tests
- PatternLearner: pattern storage, matching, evolution
- QueryAnalytics: tracking, statistics, aggregation
- FeedbackLoop: feedback collection, processing

### Integration Tests
- Pattern learning from query execution
- Analytics tracking in real queries
- Feedback loop improving patterns

### Performance Tests
- Pattern lookup speed (< 50ms)
- Analytics aggregation performance
- Database query optimization

## Success Metrics

1. **Pattern Accuracy**
   - Pattern match accuracy > 85%
   - Success rate improvement > 10%

2. **System Performance**
   - Query response time improvement > 15%
   - Error rate reduction > 20%

3. **User Satisfaction**
   - User satisfaction score > 4.0/5.0
   - Query abandonment rate < 15%

4. **Learning Rate**
   - New patterns learned per week > 20
   - Pattern confidence increase over time

## Dependencies & Compatibility

### Dependencies
- ✅ Phases 1-5 (completed)
- ✅ Supabase database
- ✅ OpenAI embeddings (for pattern similarity)
- ✅ Existing intent_logs infrastructure

### Compatibility
- ✅ Works with existing query system
- ✅ Backward compatible with legacy handlers
- ✅ Optional feature (can be disabled)

## Phase 6 vs Phase 8 Independence

**Phase 6 (Learning System)** focuses on:
- Learning from past queries
- Pattern matching and improvement
- Analytics and insights
- Feedback collection

**Phase 8 (Advanced Features)** focuses on:
- Context management within conversations
- Follow-up query handling
- Advanced response templates
- Personalization

**Independence**: ✅ **YES - Phase 6 and Phase 8 are independent!**

- Phase 6 can be implemented without Phase 8
- Phase 8 can be implemented without Phase 6
- However, Phase 8 can benefit from Phase 6's patterns (optional enhancement)
- Phase 6 learns from all queries, Phase 8 focuses on conversation flow

**Recommended Order**:
- Implement Phase 6 first (improves all queries)
- Then Phase 8 (enhances conversation flow)
- Then combine Phase 6 + Phase 8 (learn from conversation patterns)

