-- ============================================================================
-- VITTA DATABASE SCHEMA - SINGLE SOURCE OF TRUTH
-- ============================================================================
-- This is the master schema file for the Vitta application.
-- All database tables, columns, indexes, and constraints are defined here.
--
-- IMPORTANT: This file is the authoritative source for the database schema.
-- Any changes to the database structure should be reflected here first.
-- Migration scripts (like QUICK_FIX.sql) should align the actual database
-- to match this schema definition.
--
-- Last Updated: 2025-01-04
-- Recent Changes:
-- - Added 'nickname' field to user_credit_cards for personalized card names
-- - Made 'card_type' nullable (legacy field for backward compatibility)
-- - Converted statement cycle columns (start/end) from INTEGER to DATE type
-- - Added all catalog-related columns (annual_fee, card_network, etc.)
-- ============================================================================

-- ============================================================================
-- 1. USERS TABLE
-- ============================================================================
-- Stores user account information from Google OAuth or demo accounts
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  picture_url TEXT,
  provider TEXT DEFAULT 'google', -- 'google' or 'demo'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- ============================================================================
-- 2. CARD CATALOG TABLE
-- ============================================================================
-- Master catalog of all available credit cards (read-only for users)
CREATE TABLE IF NOT EXISTS card_catalog (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_name TEXT NOT NULL,
  issuer TEXT NOT NULL,
  card_network TEXT, -- 'Visa', 'Mastercard', 'Amex', 'Discover'
  reward_structure JSONB, -- { "dining": 4, "travel": 2, "groceries": 4, "default": 1 }
  annual_fee NUMERIC DEFAULT 0,
  apr_min NUMERIC,
  apr_max NUMERIC,
  sign_up_bonus JSONB, -- { "value_estimate": 750, "requirement": "Spend $4,000 in 3 months" }
  benefits TEXT[],
  category TEXT[], -- ['travel', 'dining', 'cashback']
  image_url TEXT, -- URL to card image
  application_url TEXT, -- Affiliate link
  grace_period_days INTEGER DEFAULT 25,
  is_active BOOLEAN DEFAULT true,
  popularity_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_card_catalog_issuer ON card_catalog(issuer);
CREATE INDEX idx_card_catalog_category ON card_catalog USING GIN(category);
CREATE INDEX idx_card_catalog_active ON card_catalog(is_active);
CREATE INDEX idx_card_catalog_popularity ON card_catalog(popularity_score DESC);

-- ============================================================================
-- 3. USER CREDIT CARDS TABLE
-- ============================================================================
-- User's personal credit card wallet
-- Each row represents one credit card owned by a user, either from the catalog
-- or manually entered. Cards from catalog inherit properties but can be customized.
CREATE TABLE IF NOT EXISTS user_credit_cards (
  -- Primary Key & Relationships
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  catalog_id UUID REFERENCES card_catalog(id), -- NULL if manually entered card

  -- Card Identification
  card_name TEXT NOT NULL, -- Official card name (e.g., "Chase Sapphire Preferred")
  nickname TEXT, -- Optional user-friendly name (e.g., "My Travel Card", "Grocery Rewards")
  card_type TEXT, -- Legacy field for backward compatibility (nullable, typically stores card_network)
  issuer TEXT, -- Card issuer (e.g., "Chase", "American Express")

  -- Card Properties (copied from catalog or manually entered)
  card_network TEXT, -- Network type: "Visa", "Mastercard", "Amex", "Discover"
  reward_structure JSONB, -- Reward multipliers by category: { "dining": 4, "travel": 2, "default": 1 }
  annual_fee NUMERIC DEFAULT 0, -- Annual fee in dollars
  grace_period_days INTEGER, -- CALCULATED grace period: (due_date_day - statement_close_day) - handles month boundaries
  is_manual_entry BOOLEAN DEFAULT false, -- TRUE if manually entered, FALSE if from catalog

  -- User-Specific Account Details (required)
  apr NUMERIC NOT NULL, -- Annual Percentage Rate (interest rate)
  credit_limit NUMERIC NOT NULL, -- Total credit limit in dollars

  -- User-Specific Account Details (optional with defaults)
  current_balance NUMERIC DEFAULT 0, -- Current outstanding balance
  amount_to_pay NUMERIC DEFAULT 0, -- Planned payment amount

  -- Recurring Payment Schedule (day-of-month, 1-31)
  -- These recur monthly - code calculates actual dates dynamically
  statement_close_day INTEGER, -- Day of month statement closes (e.g., 15 = 15th of each month)
  payment_due_day INTEGER, -- Day of month payment is due (e.g., 10 = 10th of each month)

  -- DEPRECATED: Legacy absolute date fields (kept for backward compatibility)
  -- DO NOT USE THESE - they become stale after one month
  due_date DATE, -- DEPRECATED: Use payment_due_day instead
  statement_cycle_start DATE, -- DEPRECATED: Use statement_close_day instead
  statement_cycle_end DATE -- DEPRECATED: Use statement_close_day instead

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_cards_user_id ON user_credit_cards(user_id);
CREATE INDEX idx_user_cards_catalog_id ON user_credit_cards(catalog_id);

-- ============================================================================
-- 4. INTENT EMBEDDINGS TABLE
-- ============================================================================
-- Pre-computed embeddings for NLP intent classification
CREATE TABLE IF NOT EXISTS intent_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  intent TEXT NOT NULL,
  example_query TEXT NOT NULL,
  embedding vector(1536), -- OpenAI text-embedding-ada-002 dimension
  confidence_threshold NUMERIC DEFAULT 0.7,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_intent_embeddings_intent ON intent_embeddings(intent);
-- For vector similarity search, use pgvector extension
-- CREATE INDEX ON intent_embeddings USING ivfflat (embedding vector_cosine_ops);

-- ============================================================================
-- 5. SCREEN DEEPLINKS TABLE (Optional)
-- ============================================================================
-- Stores navigation deep links for the app
CREATE TABLE IF NOT EXISTS screen_deeplinks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  screen_name TEXT UNIQUE NOT NULL,
  deep_link TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 6. USER BEHAVIOR TABLE (Future Enhancement)
-- ============================================================================
-- Tracks user behavior for personalized recommendations
CREATE TABLE IF NOT EXISTS user_behavior (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  behavior_type TEXT NOT NULL, -- 'rewards_maximizer', 'apr_minimizer', 'cashflow_optimizer'
  confidence_score NUMERIC,
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_behavior_user_id ON user_behavior(user_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_card_catalog_updated_at BEFORE UPDATE ON card_catalog
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_credit_cards_updated_at BEFORE UPDATE ON user_credit_cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DATA (Optional - for development)
-- ============================================================================

-- Example popular credit cards
INSERT INTO card_catalog (card_name, issuer, card_network, reward_structure, annual_fee, apr_min, apr_max, sign_up_bonus, benefits, category, popularity_score) VALUES
('Chase Sapphire Preferred', 'Chase', 'Visa', '{"travel": 2, "dining": 2, "default": 1}', 95, 21.49, 28.49, '{"value_estimate": 750, "requirement": "Spend $4,000 in 3 months"}', ARRAY['2x travel insurance', 'No foreign transaction fees'], ARRAY['travel', 'dining'], 95),
('American Express Gold Card', 'American Express', 'Amex', '{"dining": 4, "groceries": 4, "default": 1}', 250, 19.49, 26.49, '{"value_estimate": 600, "requirement": "Spend $4,000 in 6 months"}', ARRAY['$120 Uber Cash', '$120 dining credit'], ARRAY['dining', 'groceries'], 92),
('Citi Double Cash Card', 'Citi', 'Mastercard', '{"default": 2}', 0, 18.74, 28.74, NULL, ARRAY['2% cashback on all purchases'], ARRAY['cashback'], 88)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- NOTES FOR DEVELOPERS
-- ============================================================================
--
-- 1. REWARD STRUCTURE FORMAT:
--    { "dining": 4, "travel": 2, "groceries": 4, "gas": 3, "default": 1 }
--    Keys: category names
--    Values: multiplier (4x points, 2x miles, 1.5% cashback)
--
-- 2. CATALOG_ID vs IS_MANUAL_ENTRY:
--    - catalog_id NOT NULL → Card added from catalog
--    - catalog_id IS NULL + is_manual_entry = true → Manual entry
--
-- 3. APR FIELD:
--    - User table: single APR value (user's actual APR)
--    - Catalog table: apr_min and apr_max (range)
--
-- 4. DUE_DATE:
--    - Stored as day of month (1-31)
--    - Frontend converts to actual date
--
-- 5. VECTOR SEARCH:
--    - Requires pgvector extension: CREATE EXTENSION vector;
--    - For production, create ivfflat index for performance
--
-- ============================================================================
