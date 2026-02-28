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
-- 7. PLAID ITEMS TABLE
-- ============================================================================
-- One row per bank connection established via Plaid Link.
-- access_token_enc is AES-256-GCM encrypted at the application layer.
-- transactions_cursor tracks /transactions/sync position per Item.
CREATE TABLE IF NOT EXISTS plaid_items (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plaid_item_id         text        NOT NULL UNIQUE,
  access_token_enc      text        NOT NULL,                   -- Encrypted. Never returned to client.
  institution_id        text,
  institution_name      text,
  products              text[]      DEFAULT '{}',
  status                text        NOT NULL DEFAULT 'active'
                                      CHECK (status IN ('active', 'needs_update', 'revoked')),
  transactions_cursor   text        NOT NULL DEFAULT '',        -- Empty = never synced.
  consent_expires_at    timestamp with time zone,
  created_at            timestamp with time zone DEFAULT NOW(),
  updated_at            timestamp with time zone DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plaid_items_user     ON plaid_items(user_id);
CREATE INDEX IF NOT EXISTS idx_plaid_items_item_id  ON plaid_items(plaid_item_id);
CREATE INDEX IF NOT EXISTS idx_plaid_items_status   ON plaid_items(status) WHERE status != 'revoked';

-- ============================================================================
-- 8. PLAID ACCOUNTS TABLE
-- ============================================================================
-- Synced account metadata from Plaid /accounts/get.
-- vitta_card_id is NULL until the user confirms the connection.
CREATE TABLE IF NOT EXISTS plaid_accounts (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  plaid_item_id         uuid        NOT NULL REFERENCES plaid_items(id) ON DELETE CASCADE,
  plaid_account_id      text        NOT NULL,
  mask                  text,                                   -- Last 4 digits
  name                  text        NOT NULL,
  official_name         text,
  account_type          text        NOT NULL,                   -- 'credit' | 'depository' | 'loan' | ...
  account_subtype       text,                                   -- 'credit_card' | 'checking' | ...
  current_balance       numeric     DEFAULT 0,
  available_balance     numeric,
  credit_limit          numeric,                                -- balance.limit (credit cards only)
  vitta_card_id         uuid        REFERENCES user_credit_cards(id) ON DELETE SET NULL,
  is_active             boolean     DEFAULT true,
  created_at            timestamp with time zone DEFAULT NOW(),
  updated_at            timestamp with time zone DEFAULT NOW(),

  UNIQUE (plaid_item_id, plaid_account_id)
);

CREATE INDEX IF NOT EXISTS idx_plaid_accts_item    ON plaid_accounts(plaid_item_id);
CREATE INDEX IF NOT EXISTS idx_plaid_accts_vitta   ON plaid_accounts(vitta_card_id) WHERE vitta_card_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_plaid_accts_active  ON plaid_accounts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_plaid_accts_type    ON plaid_accounts(account_type, account_subtype);

-- ============================================================================
-- 9. PLAID LIABILITIES TABLE
-- ============================================================================
-- Detailed credit card liability data from Plaid /liabilities/get.
-- Stores extracted scalars (for mapping to user_credit_cards) plus the full
-- apr_list JSONB (for payment optimizer analysis).
CREATE TABLE IF NOT EXISTS plaid_liabilities (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  plaid_item_id             uuid        NOT NULL REFERENCES plaid_items(id) ON DELETE CASCADE,
  plaid_account_id          text        NOT NULL,

  -- Extracted scalar fields → mapped to user_credit_cards on confirm
  purchase_apr              numeric,
  cash_advance_apr          numeric,
  balance_transfer_apr      numeric,
  minimum_payment_amount    numeric,
  last_payment_amount       numeric,
  last_payment_date         date,
  last_statement_balance    numeric,
  last_statement_date       date,                               -- → statement_close_day
  next_payment_due_date     date,                               -- → payment_due_day

  -- Full APR array: [{ apr_type, apr_percentage, balance_subject_to_apr, interest_charges_amount }]
  apr_list                  jsonb,
  raw_liability             jsonb       NOT NULL,               -- Full Plaid response (audit)

  fetched_at                timestamp with time zone DEFAULT NOW(),
  created_at                timestamp with time zone DEFAULT NOW(),
  updated_at                timestamp with time zone DEFAULT NOW(),

  UNIQUE (plaid_item_id, plaid_account_id)
);

CREATE INDEX IF NOT EXISTS idx_liabilities_item     ON plaid_liabilities(plaid_item_id);
CREATE INDEX IF NOT EXISTS idx_liabilities_account  ON plaid_liabilities(plaid_account_id);
CREATE INDEX IF NOT EXISTS idx_liabilities_fetched  ON plaid_liabilities(fetched_at DESC);

-- ============================================================================
-- 10. TRANSACTIONS TABLE
-- ============================================================================
-- Unified table for both Plaid-synced and manually entered transactions.
-- source column discriminates. plaid_transaction_id UNIQUE enforces idempotent
-- upsert from /transactions/sync. NULL for manual entries.
CREATE TABLE IF NOT EXISTS transactions (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source                  text        NOT NULL DEFAULT 'manual'
                            CHECK (source IN ('plaid', 'manual')),
  vitta_card_id           uuid        REFERENCES user_credit_cards(id) ON DELETE SET NULL,

  -- Plaid fields (NULL when source = 'manual')
  plaid_transaction_id    text        UNIQUE,                   -- Idempotency anchor
  plaid_account_id        text,

  -- Shared fields
  amount                  numeric     NOT NULL,                 -- Always positive
  amount_sign             text        NOT NULL DEFAULT 'debit'
                            CHECK (amount_sign IN ('debit', 'credit')),
  merchant_name           text,
  category                text,
  category_confidence     numeric,                              -- 0–1; NULL for manual
  transaction_date        date        NOT NULL,
  description             text,
  location_city           text,
  location_state          text,
  location_country        text        DEFAULT 'US',
  is_pending              boolean     DEFAULT false,
  notes                   text,                                 -- User-editable

  created_at              timestamp with time zone DEFAULT NOW(),
  updated_at              timestamp with time zone DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_txns_user_date      ON transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_txns_source         ON transactions(source, user_id);
CREATE INDEX IF NOT EXISTS idx_txns_vitta_card     ON transactions(vitta_card_id) WHERE vitta_card_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_txns_plaid_txn_id   ON transactions(plaid_transaction_id) WHERE plaid_transaction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_txns_plaid_account  ON transactions(plaid_account_id) WHERE plaid_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_txns_category       ON transactions(category, user_id);
CREATE INDEX IF NOT EXISTS idx_txns_pending        ON transactions(is_pending, user_id) WHERE is_pending = true;

-- ============================================================================
-- 11. PLAID WEBHOOK EVENTS TABLE
-- ============================================================================
-- Append-only audit log. Never delete rows. Tracks signature verification
-- and processing status for every webhook received from Plaid.
CREATE TABLE IF NOT EXISTS plaid_webhook_events (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  plaid_item_id       text,                                     -- Plaid Item ID from payload
  event_type          text        NOT NULL,                     -- TRANSACTIONS_UPDATE, etc.
  webhook_type        text        NOT NULL,                     -- Transactions, Item, etc.
  error               jsonb,
  payload             jsonb       NOT NULL,                     -- Full raw payload (replay/debug)
  signature_valid     boolean     NOT NULL DEFAULT false,
  verification_state  text        NOT NULL DEFAULT 'pending'
                        CHECK (verification_state IN ('pending', 'verified', 'failed', 'skipped')),
  processing_status   text        NOT NULL DEFAULT 'pending'
                        CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  processing_error    text,
  received_at         timestamp with time zone DEFAULT NOW(),
  processed_at        timestamp with time zone
  -- No updated_at: append-only
);

CREATE INDEX IF NOT EXISTS idx_wh_item        ON plaid_webhook_events(plaid_item_id) WHERE plaid_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wh_type        ON plaid_webhook_events(event_type, webhook_type);
CREATE INDEX IF NOT EXISTS idx_wh_processing  ON plaid_webhook_events(processing_status) WHERE processing_status IN ('pending', 'processing');
CREATE INDEX IF NOT EXISTS idx_wh_received    ON plaid_webhook_events(received_at DESC);

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

-- Plaid integration triggers (plaid_webhook_events excluded: append-only)
CREATE TRIGGER trg_plaid_items_updated_at BEFORE UPDATE ON plaid_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_plaid_accounts_updated_at BEFORE UPDATE ON plaid_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_plaid_liabilities_updated_at BEFORE UPDATE ON plaid_liabilities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_transactions_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 12. BENEFICIARIES TABLE (International Money Transfers)
-- ============================================================================
-- Stores beneficiary/recipient details for international money transfers
-- Recipients are verified locally (no external API call during addition)
-- Sensitive fields (UPI ID, account number) are encrypted with AES-256
CREATE TABLE IF NOT EXISTS beneficiaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Basic Info
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),

  -- Payment Method: 'upi' or 'bank_account'
  payment_method VARCHAR(50) NOT NULL,

  -- UPI Fields (Encrypted)
  upi_encrypted VARCHAR(500),

  -- Bank Account Fields
  account_encrypted VARCHAR(500),    -- Encrypted account number
  ifsc VARCHAR(20),                   -- IFSC code (not sensitive, plaintext)
  bank_name VARCHAR(255),             -- Bank name (plaintext)

  -- Verification Status
  verification_status VARCHAR(50) DEFAULT 'verified',  -- 'pending', 'verified', 'failed'
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by_system VARCHAR(50),     -- 'local_validation'
  verification_attempts INT DEFAULT 0,
  last_verification_attempt TIMESTAMP WITH TIME ZONE,

  -- Metadata
  relationship VARCHAR(100),          -- 'family', 'friend', 'business', 'other'
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT check_payment_method CHECK (payment_method IN ('upi', 'bank_account')),
  CONSTRAINT check_verification_status CHECK (verification_status IN ('pending', 'verified', 'failed')),
  CONSTRAINT check_relationship CHECK (relationship IN ('family', 'friend', 'business', 'other'))
);

CREATE INDEX idx_beneficiaries_user_id ON beneficiaries(user_id);
CREATE INDEX idx_beneficiaries_verification_status ON beneficiaries(verification_status);
CREATE INDEX idx_beneficiaries_is_active ON beneficiaries(is_active);
CREATE INDEX idx_beneficiaries_payment_method ON beneficiaries(payment_method);

CREATE TRIGGER trg_beneficiaries_updated_at BEFORE UPDATE ON beneficiaries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 13. BENEFICIARY VERIFICATION LOG TABLE
-- ============================================================================
-- Audit trail for all beneficiary verification attempts
-- Tracks successful verifications, failures, and retry attempts
-- Immutable: records never updated, only inserted
CREATE TABLE IF NOT EXISTS beneficiary_verification_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  beneficiary_id UUID REFERENCES beneficiaries(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Verification Status & Details
  verification_status VARCHAR(50) NOT NULL,
  attempt_number INT DEFAULT 1,

  -- Request Context
  ip_address VARCHAR(45),
  user_agent TEXT,

  -- Response Data (JSON)
  verification_response JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT check_log_status CHECK (verification_status IN ('pending', 'verified', 'failed'))
);

CREATE INDEX idx_beneficiary_verification_log_beneficiary_id ON beneficiary_verification_log(beneficiary_id);
CREATE INDEX idx_beneficiary_verification_log_user_id ON beneficiary_verification_log(user_id);
CREATE INDEX idx_beneficiary_verification_log_created_at ON beneficiary_verification_log(created_at DESC);

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
