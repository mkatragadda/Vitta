-- Phase 6: Learning System - Database Schema
-- Purpose: Store query patterns, analytics, and feedback for continuous improvement
-- Created: 2025-12-07

-- =============================================================================
-- Table: query_patterns
-- =============================================================================
-- Stores learned patterns from successful query decompositions
-- Enables pattern matching for faster, more accurate responses

CREATE TABLE IF NOT EXISTS query_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Pattern identification
  natural_query text NOT NULL,
        decomposed_query jsonb NOT NULL,
        entities jsonb NOT NULL DEFAULT '{}'::jsonb,
  
  -- Success metrics
  success_rate decimal(5,4) DEFAULT 1.0 CHECK (success_rate >= 0 AND success_rate <= 1),
  usage_count integer DEFAULT 0,
  last_used_at timestamp with time zone,
  
  -- Variations (similar queries that map to same pattern)
  variations text[] DEFAULT '{}',
  
  -- Metadata
  confidence decimal(5,4) DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  average_response_time_ms integer,
  user_satisfaction decimal(5,4) CHECK (user_satisfaction IS NULL OR (user_satisfaction >= 0 AND user_satisfaction <= 1)),
  
  -- Context
  common_contexts text[] DEFAULT '{}',
  intent text, -- Intent this pattern belongs to
  query_hash text, -- Hash for deduplication
  
  -- Lifecycle
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  version integer DEFAULT 1,
  
  -- Pattern status
  is_active boolean DEFAULT true,
  last_improved_at timestamp with time zone
);

-- Indexes for pattern lookup
CREATE INDEX IF NOT EXISTS query_patterns_natural_query_idx 
  ON query_patterns USING gin(to_tsvector('english', natural_query));

CREATE INDEX IF NOT EXISTS query_patterns_usage_count_idx 
  ON query_patterns(usage_count DESC) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS query_patterns_confidence_idx 
  ON query_patterns(confidence DESC) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS query_patterns_intent_idx 
  ON query_patterns(intent) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS query_patterns_last_used_idx 
  ON query_patterns(last_used_at DESC);

CREATE INDEX IF NOT EXISTS query_patterns_query_hash_idx 
  ON query_patterns(query_hash) WHERE query_hash IS NOT NULL;

-- Embedding for semantic similarity (using pgvector)
ALTER TABLE query_patterns
ADD COLUMN IF NOT EXISTS query_embedding vector(1536);

CREATE INDEX IF NOT EXISTS query_patterns_embedding_idx
  ON query_patterns
  USING ivfflat (query_embedding vector_cosine_ops)
  WITH (lists = 100)
WHERE is_active = true;

-- Comments
COMMENT ON TABLE query_patterns IS 'Stores learned query patterns for faster, more accurate decomposition';
COMMENT ON COLUMN query_patterns.natural_query IS 'Original natural language query';
COMMENT ON COLUMN query_patterns.decomposed_query IS 'Structured query object from decomposition';
COMMENT ON COLUMN query_patterns.entities IS 'Extracted entities from natural query';
COMMENT ON COLUMN query_patterns.success_rate IS 'Percentage of times this pattern worked correctly (0-1)';
COMMENT ON COLUMN query_patterns.usage_count IS 'Number of times this pattern has been used';
COMMENT ON COLUMN query_patterns.variations IS 'Similar queries that map to this pattern';
COMMENT ON COLUMN query_patterns.confidence IS 'Pattern confidence score (0-1)';
COMMENT ON COLUMN query_patterns.query_embedding IS 'Vector embedding for semantic similarity search';

-- =============================================================================
-- Extend intent_logs table
-- =============================================================================
-- Add columns for Phase 6 learning system tracking

ALTER TABLE intent_logs
ADD COLUMN IF NOT EXISTS entities jsonb,
ADD COLUMN IF NOT EXISTS structured_query jsonb,
ADD COLUMN IF NOT EXISTS decomposition_method text, -- 'pattern_match', 'direct', 'gpt_fallback'
ADD COLUMN IF NOT EXISTS pattern_id uuid REFERENCES query_patterns(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS response_time_ms integer,
ADD COLUMN IF NOT EXISTS success boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS error_message text,
ADD COLUMN IF NOT EXISTS result_count integer,
ADD COLUMN IF NOT EXISTS user_feedback jsonb, -- { rating: 5, helpful: true, correction: "..." }
ADD COLUMN IF NOT EXISTS query_hash text; -- Hash for deduplication

-- Indexes for analytics
CREATE INDEX IF NOT EXISTS intent_logs_pattern_id_idx 
  ON intent_logs(pattern_id) WHERE pattern_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS intent_logs_success_idx 
  ON intent_logs(success) WHERE success = false;

CREATE INDEX IF NOT EXISTS intent_logs_decomposition_method_idx 
  ON intent_logs(decomposition_method);

CREATE INDEX IF NOT EXISTS intent_logs_query_hash_idx 
  ON intent_logs(query_hash);

-- Comments
COMMENT ON COLUMN intent_logs.entities IS 'Extracted entities from query';
COMMENT ON COLUMN intent_logs.structured_query IS 'Structured query object from decomposition';
COMMENT ON COLUMN intent_logs.decomposition_method IS 'Method used: pattern_match, direct, or gpt_fallback';
COMMENT ON COLUMN intent_logs.pattern_id IS 'Reference to query_patterns if pattern was used';
COMMENT ON COLUMN intent_logs.response_time_ms IS 'Query execution time in milliseconds';
COMMENT ON COLUMN intent_logs.success IS 'Whether query executed successfully';
COMMENT ON COLUMN intent_logs.result_count IS 'Number of results returned';

-- =============================================================================
-- Table: query_feedback
-- =============================================================================
-- Stores explicit and implicit feedback from users

CREATE TABLE IF NOT EXISTS query_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query_log_id uuid REFERENCES intent_logs(id) ON DELETE CASCADE,
  pattern_id uuid REFERENCES query_patterns(id) ON DELETE SET NULL,
  
  -- Feedback type
  feedback_type text NOT NULL CHECK (feedback_type IN ('implicit', 'explicit')),
  feedback_subtype text, -- 'abandonment', 'correction', 'rating', 'thumbs_up', 'thumbs_down', 'helpful', 'not_helpful'
  
  -- Feedback data
  rating integer CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  helpful boolean,
  correction_text text, -- User's correction or clarification
  
  -- Metadata
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text, -- For tracking conversation sessions
  created_at timestamp with time zone DEFAULT now(),
  
  -- Additional data
  feedback_data jsonb DEFAULT '{}'::jsonb -- Flexible field for additional feedback data
);

-- Indexes
CREATE INDEX IF NOT EXISTS query_feedback_query_log_id_idx 
  ON query_feedback(query_log_id);

CREATE INDEX IF NOT EXISTS query_feedback_pattern_id_idx 
  ON query_feedback(pattern_id) WHERE pattern_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS query_feedback_user_id_idx 
  ON query_feedback(user_id) WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS query_feedback_created_at_idx 
  ON query_feedback(created_at DESC);

CREATE INDEX IF NOT EXISTS query_feedback_type_idx 
  ON query_feedback(feedback_type, feedback_subtype);

-- Comments
COMMENT ON TABLE query_feedback IS 'Stores user feedback (implicit and explicit) for query patterns';
COMMENT ON COLUMN query_feedback.feedback_type IS 'Type: implicit (behavior-based) or explicit (user-provided)';
COMMENT ON COLUMN query_feedback.feedback_subtype IS 'Specific feedback type: abandonment, correction, rating, etc.';

-- =============================================================================
-- Functions for pattern management
-- =============================================================================

-- Function to update pattern usage statistics
CREATE OR REPLACE FUNCTION update_pattern_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.pattern_id IS NOT NULL AND NEW.success IS NOT NULL THEN
    UPDATE query_patterns
    SET 
      usage_count = usage_count + 1,
      last_used_at = NEW.created_at,
      success_rate = CASE 
        WHEN usage_count > 0 THEN 
          (success_rate * usage_count + CASE WHEN NEW.success THEN 1 ELSE 0 END) / (usage_count + 1)
        ELSE 
          CASE WHEN NEW.success THEN 1.0 ELSE 0.0 END
      END,
      average_response_time_ms = CASE
        WHEN NEW.response_time_ms IS NOT NULL THEN
          CASE 
            WHEN average_response_time_ms IS NULL THEN NEW.response_time_ms
            ELSE (average_response_time_ms * usage_count + NEW.response_time_ms) / (usage_count + 1)
          END
        ELSE average_response_time_ms
      END,
      updated_at = now()
    WHERE id = NEW.pattern_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update pattern stats
CREATE TRIGGER update_pattern_stats_trigger
AFTER INSERT OR UPDATE ON intent_logs
FOR EACH ROW
WHEN (NEW.pattern_id IS NOT NULL)
EXECUTE FUNCTION update_pattern_stats();

-- Function to clean up old inactive patterns
CREATE OR REPLACE FUNCTION cleanup_inactive_patterns(days_old integer DEFAULT 90)
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  UPDATE query_patterns
  SET is_active = false
  WHERE 
    is_active = true
    AND (last_used_at IS NULL OR last_used_at < now() - (days_old || ' days')::interval)
    AND usage_count < 5
    AND confidence < 0.6;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Functions for pattern matching
-- =============================================================================

-- Function to find similar patterns using vector similarity
CREATE OR REPLACE FUNCTION match_patterns (
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.85,
  match_count int DEFAULT 5,
  pattern_intent text DEFAULT NULL,
  min_confidence float DEFAULT 0.8
)
RETURNS TABLE (
  id uuid,
  natural_query text,
  decomposed_query jsonb,
  entities jsonb,
  intent text,
  success_rate decimal,
  usage_count integer,
  confidence decimal,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    p.id,
    p.natural_query,
    p.decomposed_query,
    p.entities,
    p.intent,
    p.success_rate,
    p.usage_count,
    p.confidence,
    1 - (p.query_embedding <=> query_embedding) as similarity
  FROM query_patterns p
  WHERE 
    p.is_active = true
    AND p.query_embedding IS NOT NULL
    AND 1 - (p.query_embedding <=> query_embedding) > match_threshold
    AND p.confidence >= min_confidence
    AND (pattern_intent IS NULL OR p.intent = pattern_intent)
  ORDER BY similarity DESC
  LIMIT match_count;
$$;

COMMENT ON FUNCTION match_patterns IS 'Find similar query patterns using vector similarity search';

-- =============================================================================
-- Views for analytics
-- =============================================================================

-- View: pattern_performance
CREATE OR REPLACE VIEW pattern_performance AS
SELECT 
  p.id,
  p.natural_query,
  p.intent,
  p.success_rate,
  p.usage_count,
  p.confidence,
  p.average_response_time_ms,
  p.user_satisfaction,
  p.last_used_at,
  COUNT(DISTINCT l.id) as total_queries,
  COUNT(DISTINCT CASE WHEN l.success = false THEN l.id END) as failed_queries,
  AVG(l.response_time_ms) as avg_response_time,
  COUNT(DISTINCT f.id) as feedback_count,
  AVG(f.rating) as avg_rating
FROM query_patterns p
LEFT JOIN intent_logs l ON l.pattern_id = p.id
LEFT JOIN query_feedback f ON f.pattern_id = p.id
WHERE p.is_active = true
GROUP BY p.id, p.natural_query, p.intent, p.success_rate, p.usage_count, 
         p.confidence, p.average_response_time_ms, p.user_satisfaction, p.last_used_at;

-- View: query_analytics_summary
CREATE OR REPLACE VIEW query_analytics_summary AS
SELECT 
  DATE(created_at) as date,
  matched_intent as intent,
  COALESCE(decomposition_method, detection_method) as decomposition_method,
  COUNT(*) as total_queries,
  COUNT(CASE WHEN COALESCE(success, true) = true THEN 1 END) as successful_queries,
  COUNT(CASE WHEN COALESCE(success, false) = false THEN 1 END) as failed_queries,
  AVG(response_time_ms) as avg_response_time_ms,
  AVG(result_count) as avg_result_count,
  COUNT(DISTINCT user_id) as unique_users
FROM intent_logs
WHERE created_at >= now() - interval '30 days'
GROUP BY DATE(created_at), matched_intent, COALESCE(decomposition_method, detection_method);

COMMENT ON VIEW pattern_performance IS 'Performance metrics for active query patterns';
COMMENT ON VIEW query_analytics_summary IS 'Daily query analytics summary for last 30 days';

