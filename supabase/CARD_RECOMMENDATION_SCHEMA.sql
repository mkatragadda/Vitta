-- Card Recommendation System Database Schema
-- Run this in Supabase SQL Editor to create the necessary tables

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Card Catalog Table
-- Stores comprehensive information about available credit cards
CREATE TABLE IF NOT EXISTS card_catalog (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_name TEXT NOT NULL,
  issuer TEXT NOT NULL,
  network TEXT, -- Visa, Mastercard, Amex, Discover
  category TEXT[] DEFAULT '{}', -- ['travel', 'dining', 'cashback', 'business', 'student']

  -- Fees and APR
  annual_fee NUMERIC DEFAULT 0,
  apr_min NUMERIC,
  apr_max NUMERIC,

  -- Sign-up bonus
  sign_up_bonus JSONB, -- {points: 60000, spend: 4000, months: 3, value_estimate: 600}

  -- Rewards structure
  reward_structure JSONB, -- {dining: 4, travel: 3, groceries: 2, default: 1}

  -- Terms
  grace_period_days INTEGER DEFAULT 25,
  statement_cycle_days INTEGER DEFAULT 30,

  -- Benefits
  benefits TEXT[], -- ['Travel insurance', 'Purchase protection', 'Airport lounge access']

  -- Marketing
  image_url TEXT,
  application_url TEXT,
  description TEXT,

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  popularity_score INTEGER DEFAULT 0, -- For ranking in search
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for search performance
CREATE INDEX IF NOT EXISTS idx_card_catalog_card_name ON card_catalog USING gin(to_tsvector('english', card_name));
CREATE INDEX IF NOT EXISTS idx_card_catalog_issuer ON card_catalog(issuer);
CREATE INDEX IF NOT EXISTS idx_card_catalog_category ON card_catalog USING gin(category);
CREATE INDEX IF NOT EXISTS idx_card_catalog_active ON card_catalog(is_active) WHERE is_active = true;

-- User Behavior Profile Table
-- Tracks user payment patterns to determine optimization strategy
CREATE TABLE IF NOT EXISTS user_behavior_profile (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  -- Profile classification
  profile_type TEXT NOT NULL, -- 'REWARDS_MAXIMIZER' | 'APR_MINIMIZER' | 'CASHFLOW_OPTIMIZER'
  confidence_score NUMERIC CHECK (confidence_score >= 0 AND confidence_score <= 1), -- 0.0 to 1.0

  -- Payment statistics
  payment_stats JSONB, -- {
    -- pays_in_full_rate: 0.85,
    -- avg_utilization: 18,
    -- avg_days_before_due: 5,
    -- total_payments: 24,
    -- carries_balance_rate: 0.15
  -- }

  -- Metadata
  last_calculated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Payment History Table
-- Tracks individual payment events for behavior analysis
CREATE TABLE IF NOT EXISTS user_payment_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES user_credit_cards(id) ON DELETE CASCADE,

  -- Payment details
  payment_date DATE NOT NULL,
  amount_paid NUMERIC NOT NULL,
  balance_before NUMERIC NOT NULL,
  balance_after NUMERIC NOT NULL,
  was_full_payment BOOLEAN DEFAULT false,

  -- Context
  days_before_due INTEGER, -- How many days before due date was payment made
  due_date DATE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_history_user ON user_payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_card ON user_payment_history(card_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_date ON user_payment_history(payment_date DESC);

-- Update user_credit_cards table to include new fields for recommendations
-- Run this as a separate statement if the table already exists
-- Note: statement_cycle_end already exists, so we don't add statement_close_date
ALTER TABLE user_credit_cards
  ADD COLUMN IF NOT EXISTS issuer TEXT,
  ADD COLUMN IF NOT EXISTS network TEXT,
  ADD COLUMN IF NOT EXISTS reward_structure JSONB,
  ADD COLUMN IF NOT EXISTS grace_period_days INTEGER DEFAULT 25,
  ADD COLUMN IF NOT EXISTS last_statement_balance NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_payment_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_in_full_last_month BOOLEAN DEFAULT true;

-- Create a view for easy card recommendations
CREATE OR REPLACE VIEW user_cards_with_behavior AS
SELECT
  ucc.*,
  ubp.profile_type,
  ubp.confidence_score,
  ubp.payment_stats
FROM user_credit_cards ucc
LEFT JOIN user_behavior_profile ubp ON ucc.user_id = ubp.user_id;

-- Seed some popular cards (run after table creation)
-- You can expand this with more cards from the YAML API
INSERT INTO card_catalog (card_name, issuer, network, category, annual_fee, apr_min, apr_max, reward_structure, sign_up_bonus, benefits, popularity_score)
VALUES
  -- Chase Cards
  ('Chase Sapphire Preferred', 'Chase', 'Visa', ARRAY['travel', 'dining'], 95, 19.74, 26.74,
   '{"travel": 2, "dining": 2, "default": 1}'::jsonb,
   '{"points": 60000, "spend": 4000, "months": 3, "value_estimate": 750}'::jsonb,
   ARRAY['Trip cancellation insurance', 'Purchase protection', 'Auto rental coverage'],
   95),

  ('Chase Sapphire Reserve', 'Chase', 'Visa', ARRAY['travel', 'dining'], 550, 19.74, 26.74,
   '{"travel": 3, "dining": 3, "default": 1}'::jsonb,
   '{"points": 75000, "spend": 4000, "months": 3, "value_estimate": 1125}'::jsonb,
   ARRAY['Priority Pass lounge access', 'Global Entry credit', 'Travel insurance'],
   90),

  ('Chase Freedom Unlimited', 'Chase', 'Visa', ARRAY['cashback'], 0, 17.74, 26.49,
   '{"default": 1.5}'::jsonb,
   '{"cashback": 200, "spend": 500, "months": 3, "value_estimate": 200}'::jsonb,
   ARRAY['Purchase protection', '0% intro APR for 15 months'],
   100),

  -- American Express Cards
  ('American Express Gold Card', 'American Express', 'Amex', ARRAY['dining', 'groceries'], 250, 19.74, 26.74,
   '{"dining": 4, "groceries": 4, "flights": 3, "default": 1}'::jsonb,
   '{"points": 60000, "spend": 4000, "months": 6, "value_estimate": 600}'::jsonb,
   ARRAY['Dining credits', 'Purchase protection'],
   88),

  ('American Express Platinum', 'American Express', 'Amex', ARRAY['travel'], 695, 19.74, 26.74,
   '{"flights": 5, "hotels": 5, "default": 1}'::jsonb,
   '{"points": 80000, "spend": 6000, "months": 6, "value_estimate": 1000}'::jsonb,
   ARRAY['Airport lounge access', '$200 hotel credit', 'Global Entry credit'],
   85),

  -- Citi Cards
  ('Citi Double Cash', 'Citi', 'Mastercard', ARRAY['cashback'], 0, 15.49, 25.49,
   '{"default": 2}'::jsonb,
   '{"cashback": 200, "spend": 1500, "months": 6, "value_estimate": 200}'::jsonb,
   ARRAY['Purchase protection', 'Extended warranty'],
   92),

  ('Citi Custom Cash', 'Citi', 'Mastercard', ARRAY['cashback'], 0, 15.74, 25.74,
   '{"top_category": 5, "default": 1}'::jsonb,
   '{"cashback": 200, "spend": 750, "months": 3, "value_estimate": 200}'::jsonb,
   ARRAY['5% on top category up to $500/month', 'Purchase protection'],
   87),

  -- Capital One Cards
  ('Capital One Venture', 'Capital One', 'Visa', ARRAY['travel'], 95, 19.74, 29.24,
   '{"default": 2}'::jsonb,
   '{"points": 75000, "spend": 4000, "months": 3, "value_estimate": 750}'::jsonb,
   ARRAY['Travel insurance', 'Purchase protection'],
   89),

  ('Capital One Venture X', 'Capital One', 'Visa', ARRAY['travel'], 395, 19.74, 29.24,
   '{"hotels": 10, "rental_cars": 10, "default": 2}'::jsonb,
   '{"points": 75000, "spend": 4000, "months": 3, "value_estimate": 750}'::jsonb,
   ARRAY['Priority Pass lounge access', '$300 travel credit', 'TSA PreCheck credit'],
   84),

  -- Discover Cards
  ('Discover it Cash Back', 'Discover', 'Discover', ARRAY['cashback'], 0, 15.49, 26.49,
   '{"rotating": 5, "default": 1}'::jsonb,
   '{"cashback_match": true, "value_estimate": 100}'::jsonb,
   ARRAY['Rotating 5% categories', 'Cashback match first year', '0% intro APR for 15 months'],
   93),

  -- Bank of America Cards
  ('Bank of America Premium Rewards', 'Bank of America', 'Visa', ARRAY['travel', 'dining'], 95, 17.24, 27.24,
   '{"travel": 2, "dining": 2, "default": 1.5}'::jsonb,
   '{"points": 60000, "spend": 4000, "months": 3, "value_estimate": 600}'::jsonb,
   ARRAY['$100 airline credit', 'Travel insurance'],
   82)

ON CONFLICT DO NOTHING;

-- Function to update card catalog timestamp
CREATE OR REPLACE FUNCTION update_card_catalog_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update timestamp
DROP TRIGGER IF EXISTS card_catalog_timestamp_trigger ON card_catalog;
CREATE TRIGGER card_catalog_timestamp_trigger
  BEFORE UPDATE ON card_catalog
  FOR EACH ROW
  EXECUTE FUNCTION update_card_catalog_timestamp();

-- Grant necessary permissions (adjust based on your Supabase setup)
-- GRANT SELECT ON card_catalog TO anon, authenticated;
-- GRANT ALL ON user_behavior_profile TO authenticated;
-- GRANT ALL ON user_payment_history TO authenticated;
