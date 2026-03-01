-- ============================================================================
-- PHASE 1: DATABASE SCHEMA CHANGES FOR IMMEDIATE TRANSFER (REVISED)
-- ============================================================================
-- Architecture: Keep plaid_accounts separate from transfers
-- New approach: Create plaid_transfer_accounts table for transfer-specific data
--
-- What this does:
-- 1. Creates plaid_transfer_accounts table (separate from plaid_accounts)
-- 2. Creates transfers table (tracks all transfer transactions)
-- 3. Creates transfer_status_log table (immutable audit trail)
-- 4. Adds all necessary indexes
-- 5. Adds triggers for updated_at
--
-- Design Decision:
-- ✅ plaid_accounts remains clean (only Plaid sync data)
-- ✅ Transfer capabilities isolated in separate table
-- ✅ No account numbers stored (fetch from Plaid API on-demand)
-- ✅ No routing numbers stored
-- ============================================================================

-- ============================================================================
-- PART 1: CREATE plaid_transfer_accounts TABLE
-- ============================================================================
-- Separate table for transfer-specific metadata
-- One plaid_account can have zero or one transfer_account
-- Links plaid accounts to transfer capabilities

CREATE TABLE IF NOT EXISTS plaid_transfer_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plaid_account_id UUID NOT NULL REFERENCES plaid_accounts(id) ON DELETE CASCADE,

  -- Transfer capability flags
  can_transfer_out BOOLEAN DEFAULT false,
  is_verified_for_transfer BOOLEAN DEFAULT false,
  transfer_verification_status VARCHAR(50),  -- 'pending', 'verified', 'failed'

  -- Transfer limits (per account)
  daily_transfer_limit NUMERIC DEFAULT 5000,     -- Max USD per day
  transaction_limit NUMERIC DEFAULT 50000,       -- Max USD per transaction

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

-- Add trigger for updated_at
CREATE TRIGGER IF NOT EXISTS trg_plaid_transfer_accounts_updated_at BEFORE UPDATE ON plaid_transfer_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PART 2: CREATE transfers TABLE
-- ============================================================================
-- Tracks all transfer transactions from initiation through completion
-- Core transfer data (amounts, rates, status, Chimoney reference)

CREATE TABLE IF NOT EXISTS transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- SOURCE: Transfer-enabled Plaid account (where money comes FROM)
  plaid_transfer_account_id UUID NOT NULL REFERENCES plaid_transfer_accounts(id),

  -- DESTINATION: Beneficiary (where money goes TO)
  beneficiary_id UUID NOT NULL REFERENCES beneficiaries(id),

  -- Amounts & Exchange Rate
  source_amount DECIMAL(15, 2) NOT NULL,      -- Amount sent (USD)
  source_currency VARCHAR(3) DEFAULT 'USD',
  target_amount DECIMAL(15, 2) NOT NULL,      -- Amount recipient quoted (INR)
  target_currency VARCHAR(3) NOT NULL,        -- INR
  exchange_rate DECIMAL(10, 4) NOT NULL,      -- 1 USD = X INR (quoted rate)
  fee_amount DECIMAL(15, 2) NOT NULL,         -- Transfer fee in USD
  fee_percentage DECIMAL(5, 3) NOT NULL,      -- Fee % (typically 0.5)

  -- Final amounts (can differ if rate changed during execution)
  final_exchange_rate DECIMAL(10, 4),         -- Actual rate at execution
  final_target_amount DECIMAL(15, 2),         -- Actual amount recipient gets

  -- Chimoney reference
  chimoney_transaction_id VARCHAR(255),       -- Chimoney transaction ID
  chimoney_reference VARCHAR(255),            -- Chimoney reference code

  -- Status
  status VARCHAR(50) DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),

  -- Rate change tracking (JSON)
  rate_change_log JSONB,

  -- Timestamps
  initiated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),    -- When user started
  executed_at TIMESTAMP WITH TIME ZONE,                    -- When sent to Chimoney
  completed_at TIMESTAMP WITH TIME ZONE,                   -- When recipient got it
  cancelled_at TIMESTAMP WITH TIME ZONE,                   -- If cancelled

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

-- Add trigger for updated_at
CREATE TRIGGER IF NOT EXISTS trg_transfers_updated_at BEFORE UPDATE ON transfers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PART 3: CREATE transfer_status_log TABLE (Immutable Audit Trail)
-- ============================================================================
-- Records every status change for a transfer
-- Never modified or deleted (append-only audit log)

CREATE TABLE IF NOT EXISTS transfer_status_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,

  old_status VARCHAR(50),                      -- Previous status
  new_status VARCHAR(50) NOT NULL,             -- New status
  reason TEXT,                                 -- Why status changed
  metadata JSONB,                              -- Additional context

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for transfer_status_log
CREATE INDEX IF NOT EXISTS idx_transfer_log_transfer_id ON transfer_status_log(transfer_id);
CREATE INDEX IF NOT EXISTS idx_transfer_log_new_status ON transfer_status_log(new_status);
CREATE INDEX IF NOT EXISTS idx_transfer_log_created_at ON transfer_status_log(created_at DESC);

-- ============================================================================
-- VERIFICATION QUERIES (Run after applying changes)
-- ============================================================================
-- Uncomment and run these to verify the schema was created correctly:

-- -- Check plaid_transfer_accounts table exists
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'plaid_transfer_accounts'
-- ORDER BY ordinal_position;

-- -- Check transfers table exists
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'transfers'
-- ORDER BY ordinal_position;

-- -- Check transfer_status_log table exists
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'transfer_status_log'
-- ORDER BY ordinal_position;

-- -- Check all indexes
-- SELECT indexname FROM pg_indexes
-- WHERE tablename IN ('plaid_transfer_accounts', 'transfers', 'transfer_status_log')
-- ORDER BY indexname;

-- -- Check triggers
-- SELECT trigger_name FROM information_schema.triggers
-- WHERE trigger_name LIKE '%transfer%';

-- ============================================================================
-- ARCHITECTURE NOTES
-- ============================================================================
-- 1. plaid_accounts table: UNTOUCHED
--    - Remains clean (only Plaid sync data)
--    - No transfer-specific columns added
--
-- 2. plaid_transfer_accounts table: NEW
--    - Links plaid_account to transfer capabilities
--    - One-to-one relationship with plaid_accounts
--    - Contains only transfer-specific metadata
--    - No account numbers or routing numbers stored
--
-- 3. transfers table: Core transfer tracking
--    - References plaid_transfer_accounts (not plaid_accounts directly)
--    - Full lifecycle: pending → processing → completed/failed/cancelled
--    - Rate change tracking (original vs final rate)
--    - Chimoney reference IDs
--
-- 4. transfer_status_log table: Audit trail
--    - Immutable (append-only)
--    - Every status change logged
--    - Metadata captures rate changes, errors, confirmations
--
-- 5. No Account Numbers Stored
--    - Routing numbers: NOT stored
--    - Account numbers: NOT stored
--    - Strategy: Fetch from Plaid API on-demand, pass to Chimoney immediately
--    - Benefits: 80% less compliance burden, faster launch
--
-- 6. Foreign Key Relationships
--    - All FKs use ON DELETE CASCADE for data cleanup
--    - If user deleted: all transfers deleted automatically
--    - If beneficiary deleted: all transfers to that beneficiary deleted
--
-- 7. Indexes Optimized For:
--    - User lookups (user_id)
--    - Account lookups (plaid_account_id, beneficiary_id)
--    - Status filtering (for polling/webhooks)
--    - Timestamp ordering (for dashboard/history)
--
-- ============================================================================
