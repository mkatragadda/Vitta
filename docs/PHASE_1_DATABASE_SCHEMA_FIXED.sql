-- ============================================================================
-- PHASE 1: DATABASE SCHEMA CHANGES FOR IMMEDIATE TRANSFER (FIXED)
-- ============================================================================
-- Fixed trigger syntax for PostgreSQL compatibility
--
-- What this does:
-- 1. Creates plaid_transfer_accounts table (separate from plaid_accounts)
-- 2. Creates transfers table (tracks all transfer transactions)
-- 3. Creates transfer_status_log table (immutable audit trail)
-- 4. Adds all necessary indexes
-- 5. Adds triggers for updated_at (FIXED SYNTAX)
--
-- Note: Trigger creation assumes update_updated_at_column() function exists
-- If function doesn't exist, see note at bottom of file
-- ============================================================================

-- ============================================================================
-- PART 1: CREATE plaid_transfer_accounts TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS plaid_transfer_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plaid_account_id UUID NOT NULL REFERENCES plaid_accounts(id) ON DELETE CASCADE,

  -- Transfer capability flags
  can_transfer_out BOOLEAN DEFAULT false,
  is_verified_for_transfer BOOLEAN DEFAULT false,
  transfer_verification_status VARCHAR(50),

  -- Transfer limits (per account)
  daily_transfer_limit NUMERIC DEFAULT 5000,
  transaction_limit NUMERIC DEFAULT 50000,

  -- Audit trail for this account
  last_transfer_at TIMESTAMP WITH TIME ZONE,
  transfer_count INT DEFAULT 0,

  -- Flexible metadata
  transfer_metadata JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraint: Only one transfer account per plaid account
  UNIQUE (plaid_account_id)
);

-- Create indexes for transfer account queries
CREATE INDEX IF NOT EXISTS idx_plaid_transfer_accounts_user_id
  ON plaid_transfer_accounts(user_id);

CREATE INDEX IF NOT EXISTS idx_plaid_transfer_accounts_plaid_account_id
  ON plaid_transfer_accounts(plaid_account_id);

CREATE INDEX IF NOT EXISTS idx_plaid_transfer_accounts_can_transfer
  ON plaid_transfer_accounts(user_id, can_transfer_out)
  WHERE can_transfer_out = true;

CREATE INDEX IF NOT EXISTS idx_plaid_transfer_accounts_verified
  ON plaid_transfer_accounts(is_verified_for_transfer)
  WHERE is_verified_for_transfer = true;

-- ============================================================================
-- PART 2: CREATE transfers TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- SOURCE: Transfer-enabled Plaid account (where money comes FROM)
  plaid_transfer_account_id UUID NOT NULL REFERENCES plaid_transfer_accounts(id),

  -- DESTINATION: Beneficiary (where money goes TO)
  beneficiary_id UUID NOT NULL REFERENCES beneficiaries(id),

  -- Amounts & Exchange Rate
  source_amount DECIMAL(15, 2) NOT NULL,
  source_currency VARCHAR(3) DEFAULT 'USD',
  target_amount DECIMAL(15, 2) NOT NULL,
  target_currency VARCHAR(3) NOT NULL,
  exchange_rate DECIMAL(10, 4) NOT NULL,
  fee_amount DECIMAL(15, 2) NOT NULL,
  fee_percentage DECIMAL(5, 3) NOT NULL,

  -- Final amounts (can differ if rate changed during execution)
  final_exchange_rate DECIMAL(10, 4),
  final_target_amount DECIMAL(15, 2),

  -- Chimoney reference
  chimoney_transaction_id VARCHAR(255),
  chimoney_reference VARCHAR(255),

  -- Status
  status VARCHAR(50) DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),

  -- Rate change tracking (JSON)
  rate_change_log JSONB,

  -- Timestamps
  initiated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  executed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,

  -- Audit trail
  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for transfers table
CREATE INDEX IF NOT EXISTS idx_transfers_user_id ON transfers(user_id);
CREATE INDEX IF NOT EXISTS idx_transfers_plaid_transfer_account ON transfers(plaid_transfer_account_id);
CREATE INDEX IF NOT EXISTS idx_transfers_beneficiary ON transfers(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON transfers(status);
CREATE INDEX IF NOT EXISTS idx_transfers_chimoney_id ON transfers(chimoney_transaction_id);
CREATE INDEX IF NOT EXISTS idx_transfers_created_at ON transfers(created_at DESC);

-- ============================================================================
-- PART 3: CREATE transfer_status_log TABLE (Immutable Audit Trail)
-- ============================================================================

CREATE TABLE IF NOT EXISTS transfer_status_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,

  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  reason TEXT,
  metadata JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for transfer_status_log
CREATE INDEX IF NOT EXISTS idx_transfer_log_transfer_id ON transfer_status_log(transfer_id);
CREATE INDEX IF NOT EXISTS idx_transfer_log_new_status ON transfer_status_log(new_status);
CREATE INDEX IF NOT EXISTS idx_transfer_log_created_at ON transfer_status_log(created_at DESC);

-- ============================================================================
-- PART 4: CREATE TRIGGERS (FIXED SYNTAX)
-- ============================================================================
-- Note: These triggers automatically update the updated_at column
-- They require the update_updated_at_column() function to exist
--
-- The function should look like:
-- CREATE OR REPLACE FUNCTION update_updated_at_column()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   NEW.updated_at = NOW();
--   RETURN NEW;
-- END;
-- $$ language 'plpgsql';
--
-- This function should already exist in your schema.sql
-- If it doesn't, run the CREATE FUNCTION statement above first

-- Drop triggers if they exist (to avoid conflicts)
DROP TRIGGER IF EXISTS trg_plaid_transfer_accounts_updated_at ON plaid_transfer_accounts;
DROP TRIGGER IF EXISTS trg_transfers_updated_at ON transfers;

-- Create triggers with correct syntax
CREATE TRIGGER trg_plaid_transfer_accounts_updated_at
BEFORE UPDATE ON plaid_transfer_accounts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_transfers_updated_at
BEFORE UPDATE ON transfers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VERIFICATION QUERIES (Run after applying changes)
-- ============================================================================

-- Check plaid_transfer_accounts table
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'plaid_transfer_accounts'
-- ORDER BY ordinal_position;

-- Check transfers table
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'transfers'
-- ORDER BY ordinal_position;

-- Check transfer_status_log table
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'transfer_status_log'
-- ORDER BY ordinal_position;

-- Check all indexes
-- SELECT indexname FROM pg_indexes
-- WHERE tablename IN ('plaid_transfer_accounts', 'transfers', 'transfer_status_log')
-- ORDER BY indexname;

-- Check triggers
-- SELECT trigger_name FROM information_schema.triggers
-- WHERE trigger_name LIKE '%transfer%';

-- ============================================================================
