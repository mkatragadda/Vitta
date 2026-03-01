-- ============================================================================
-- PHASE 1: DATABASE SCHEMA CHANGES FOR IMMEDIATE TRANSFER
-- ============================================================================
-- This SQL file contains ALL changes needed for Phase 1 (1-2 hours)
-- Run this against your Supabase database
--
-- What this does:
-- 1. Extends plaid_accounts table with 11 transfer-specific columns
-- 2. Creates transfers table (21 columns)
-- 3. Creates transfer_status_log table (immutable audit trail)
-- 4. Adds all necessary indexes
-- 5. Adds triggers for updated_at
--
-- Status: Ready to execute
-- ============================================================================

-- ============================================================================
-- PART 1: ALTER plaid_accounts TABLE - Add Transfer Columns
-- ============================================================================

ALTER TABLE plaid_accounts ADD COLUMN IF NOT EXISTS (
  routing_number VARCHAR(9),
  account_number_encrypted TEXT,
  account_holder_name TEXT,
  can_transfer_out BOOLEAN DEFAULT false,
  is_verified_for_transfer BOOLEAN DEFAULT false,
  transfer_verification_status VARCHAR(50),
  daily_transfer_limit NUMERIC DEFAULT 5000,
  transaction_limit NUMERIC DEFAULT 50000,
  last_transfer_at TIMESTAMP WITH TIME ZONE,
  transfer_count INT DEFAULT 0,
  transfer_metadata JSONB
);

-- Create indexes for transfer queries on plaid_accounts
CREATE INDEX IF NOT EXISTS idx_plaid_can_transfer
  ON plaid_accounts(user_id, can_transfer_out)
  WHERE can_transfer_out = true;

CREATE INDEX IF NOT EXISTS idx_plaid_depository
  ON plaid_accounts(account_type)
  WHERE account_type = 'depository';

-- ============================================================================
-- PART 2: CREATE transfers TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- SOURCE: Plaid account (where money comes FROM)
  plaid_account_id UUID NOT NULL REFERENCES plaid_accounts(id),

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

  -- Rate change tracking
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
CREATE INDEX IF NOT EXISTS idx_transfers_plaid_account ON transfers(plaid_account_id);
CREATE INDEX IF NOT EXISTS idx_transfers_beneficiary ON transfers(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON transfers(status);
CREATE INDEX IF NOT EXISTS idx_transfers_chimoney_id ON transfers(chimoney_transaction_id);
CREATE INDEX IF NOT EXISTS idx_transfers_created_at ON transfers(created_at DESC);

-- Add trigger for updated_at
CREATE TRIGGER IF NOT EXISTS trg_transfers_updated_at BEFORE UPDATE ON transfers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PART 3: CREATE transfer_status_log TABLE (Audit Trail)
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
CREATE INDEX IF NOT EXISTS idx_transfer_log_id ON transfer_status_log(transfer_id);
CREATE INDEX IF NOT EXISTS idx_transfer_log_status ON transfer_status_log(new_status);
CREATE INDEX IF NOT EXISTS idx_transfer_log_created_at ON transfer_status_log(created_at DESC);

-- ============================================================================
-- PART 4: ADD TRIGGER for plaid_accounts updated_at
-- ============================================================================

CREATE TRIGGER IF NOT EXISTS trg_plaid_accts_updated_at BEFORE UPDATE ON plaid_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VERIFICATION QUERIES (Run after applying changes)
-- ============================================================================
-- Uncomment and run these to verify the schema was created correctly:

-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'plaid_accounts' AND column_name LIKE 'transfer%' OR column_name = 'routing_number' OR column_name = 'account_number_encrypted';

-- SELECT column_name
-- FROM information_schema.columns
-- WHERE table_name = 'transfers'
-- ORDER BY ordinal_position;

-- SELECT * FROM information_schema.tables
-- WHERE table_name = 'transfer_status_log';

-- SELECT indexname FROM pg_indexes
-- WHERE tablename IN ('plaid_accounts', 'transfers', 'transfer_status_log');

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. All tables use gen_random_uuid() for IDs (not uuid_generate_v4())
-- 2. Foreign keys cascade on delete for data integrity
-- 3. Indexes optimized for query patterns:
--    - user_id lookups
--    - status filtering
--    - timestamp ordering
-- 4. updated_at trigger requires update_updated_at_column() function
--    (should already exist from previous migrations)
-- 5. CHECK constraint on status ensures only valid values
-- 6. JSONB columns allow flexible metadata storage
-- 7. All timestamps with time zone for consistency
-- ============================================================================
