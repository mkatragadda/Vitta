-- =============================================================================
-- Migration: Plaid Integration
-- File: 20260201_plaid_integration.sql
-- Purpose: Add tables for Plaid bank account connection, transaction storage,
--          liability tracking, and webhook event audit.
-- Created: 2026-02-01
-- =============================================================================
-- Tables added:
--   plaid_items          — one row per bank connection (stores encrypted access_token)
--   plaid_accounts       — synced account metadata from Plaid
--   plaid_liabilities    — detailed credit card liability data (APR breakdown, etc.)
--   transactions         — unified transaction table (Plaid-synced + manual)
--   plaid_webhook_events — append-only audit log of all Plaid webhook events
-- =============================================================================

-- =============================================================================
-- Table: plaid_items
-- =============================================================================
-- One row per Plaid Link session (i.e., per bank the user connects).
-- access_token_enc stores the AES-256-GCM encrypted access token.
-- transactions_cursor tracks the /transactions/sync cursor position.
-- Neither access_token_enc nor transactions_cursor are ever returned to any client.

CREATE TABLE IF NOT EXISTS plaid_items (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plaid_item_id         text        NOT NULL UNIQUE,
  access_token_enc      text        NOT NULL,                   -- AES-256-GCM encrypted. Never returned to client.
  institution_id        text,                                   -- Plaid institution ID (e.g., "ins_116712")
  institution_name      text,                                   -- Human-readable bank name
  products              text[]      DEFAULT '{}',               -- Plaid products: ['transactions', 'liabilities']
  status                text        NOT NULL DEFAULT 'active'
                                      CHECK (status IN ('active', 'needs_update', 'revoked')),
  transactions_cursor   text        NOT NULL DEFAULT '',        -- Sync cursor. Empty = never synced (triggers full historical pull).
  consent_expires_at    timestamp with time zone,
  created_at            timestamp with time zone DEFAULT now(),
  updated_at            timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plaid_items_user
  ON plaid_items(user_id);

CREATE INDEX IF NOT EXISTS idx_plaid_items_item_id
  ON plaid_items(plaid_item_id);

CREATE INDEX IF NOT EXISTS idx_plaid_items_status
  ON plaid_items(status) WHERE status != 'revoked';

COMMENT ON TABLE plaid_items IS 'One row per Plaid Link session. access_token_enc is AES-256-GCM encrypted and never returned to any client.';
COMMENT ON COLUMN plaid_items.access_token_enc IS 'Encrypted access token. Decrypted only inside server-side API routes using PLAID_ENCRYPTION_KEY.';
COMMENT ON COLUMN plaid_items.transactions_cursor IS 'Cursor for /transactions/sync. Empty string triggers full historical sync. Updated after each sync loop.';

-- =============================================================================
-- Table: plaid_accounts
-- =============================================================================
-- One row per account returned by Plaid /accounts/get.
-- vitta_card_id is NULL until the user confirms the connection via confirm-accounts.
-- credit_limit is populated from Plaid balance.limit (credit cards only).

CREATE TABLE IF NOT EXISTS plaid_accounts (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  plaid_item_id         uuid        NOT NULL REFERENCES plaid_items(id) ON DELETE CASCADE,
  plaid_account_id      text        NOT NULL,
  mask                  text,                                   -- Last 4 digits (display only)
  name                  text        NOT NULL,                   -- Account name from institution
  official_name         text,
  account_type          text        NOT NULL,                   -- 'credit' | 'depository' | 'loan' | 'brokerage' | 'other'
  account_subtype       text,                                   -- 'credit_card' | 'checking' | 'savings' | etc.
  current_balance       numeric     DEFAULT 0,
  available_balance     numeric,
  credit_limit          numeric,                                -- balance.limit from Plaid (credit cards only)
  vitta_card_id         uuid        REFERENCES user_credit_cards(id) ON DELETE SET NULL,
  is_active             boolean     DEFAULT true,
  created_at            timestamp with time zone DEFAULT now(),
  updated_at            timestamp with time zone DEFAULT now(),

  UNIQUE (plaid_item_id, plaid_account_id)
);

CREATE INDEX IF NOT EXISTS idx_plaid_accts_item
  ON plaid_accounts(plaid_item_id);

CREATE INDEX IF NOT EXISTS idx_plaid_accts_vitta
  ON plaid_accounts(vitta_card_id) WHERE vitta_card_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_plaid_accts_active
  ON plaid_accounts(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_plaid_accts_type
  ON plaid_accounts(account_type, account_subtype);

COMMENT ON TABLE plaid_accounts IS 'Synced account metadata from Plaid. vitta_card_id is populated after user confirms the connection.';
COMMENT ON COLUMN plaid_accounts.vitta_card_id IS 'NULL until user confirms. Then links to the corresponding user_credit_cards row.';
COMMENT ON COLUMN plaid_accounts.credit_limit IS 'Plaid balance.limit. Only populated for credit-type accounts.';

-- =============================================================================
-- Table: plaid_liabilities
-- =============================================================================
-- Populated by /liabilities/get immediately after token exchange.
-- Stores extracted scalar fields for direct mapping to user_credit_cards,
-- plus the full apr_list as JSONB for richer analysis (e.g., payment optimizer).
-- raw_liability preserves the full Plaid response for audit and future use.

CREATE TABLE IF NOT EXISTS plaid_liabilities (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  plaid_item_id             uuid        NOT NULL REFERENCES plaid_items(id) ON DELETE CASCADE,
  plaid_account_id          text        NOT NULL,               -- Matches plaid_accounts.plaid_account_id

  -- Extracted scalar fields (mapped to user_credit_cards on confirm)
  purchase_apr              numeric,                            -- APR where apr_type = 'purchase'
  cash_advance_apr          numeric,                            -- APR where apr_type = 'cash_advance'
  balance_transfer_apr      numeric,                            -- APR where apr_type = 'balance_transfer'
  minimum_payment_amount    numeric,                            -- Current minimum payment due
  last_payment_amount       numeric,                            -- Most recent payment made by user
  last_payment_date         date,
  last_statement_balance    numeric,                            -- Balance at last statement close
  last_statement_date       date,                               -- Statement close date → maps to statement_close_day
  next_payment_due_date     date,                               -- Payment due date → maps to payment_due_day

  -- Full APR breakdown for payment optimizer and detailed queries
  apr_list                  jsonb,
  -- Example: [
  --   { "apr_percentage": 22.74, "apr_type": "purchase",
  --     "balance_subject_to_apr": 1234.56, "interest_charges_amount": 23.45 },
  --   { "apr_percentage": 29.99, "apr_type": "cash_advance",
  --     "balance_subject_to_apr": 0, "interest_charges_amount": null }
  -- ]

  -- Full raw Plaid response (audit trail and future extensibility)
  raw_liability             jsonb       NOT NULL,

  fetched_at                timestamp with time zone DEFAULT now(),
  created_at                timestamp with time zone DEFAULT now(),
  updated_at                timestamp with time zone DEFAULT now(),

  UNIQUE (plaid_item_id, plaid_account_id)                      -- One liability row per account
);

CREATE INDEX IF NOT EXISTS idx_liabilities_item
  ON plaid_liabilities(plaid_item_id);

CREATE INDEX IF NOT EXISTS idx_liabilities_account
  ON plaid_liabilities(plaid_account_id);

CREATE INDEX IF NOT EXISTS idx_liabilities_fetched
  ON plaid_liabilities(fetched_at DESC);

COMMENT ON TABLE plaid_liabilities IS 'Detailed credit card liability data from Plaid /liabilities/get. Provides APR breakdown, statement dates, and minimum payments.';
COMMENT ON COLUMN plaid_liabilities.apr_list IS 'Full APR array from Plaid. Each entry: apr_type, apr_percentage, balance_subject_to_apr, interest_charges_amount.';
COMMENT ON COLUMN plaid_liabilities.raw_liability IS 'Full raw Plaid liability object. Preserved for audit and future field extraction.';

-- =============================================================================
-- Table: transactions
-- =============================================================================
-- Unified transaction table supporting both Plaid-synced and manually entered
-- transactions. The source column discriminates between them.
--
-- Plaid-specific fields (plaid_transaction_id, plaid_account_id) are NULL for
-- manual transactions. Manual transactions have NULL in Plaid-specific columns.
--
-- plaid_transaction_id carries a UNIQUE constraint — this is the idempotency
-- anchor for /transactions/sync upserts. Manual transactions have NULL here
-- and are never subject to the constraint.

CREATE TABLE IF NOT EXISTS transactions (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Source discrimination
  source                  text        NOT NULL DEFAULT 'manual'
                            CHECK (source IN ('plaid', 'manual')),

  -- Link to Vitta wallet card
  vitta_card_id           uuid        REFERENCES user_credit_cards(id) ON DELETE SET NULL,

  -- Plaid-sourced fields (NULL when source = 'manual')
  plaid_transaction_id    text        UNIQUE,                   -- Idempotency key for /transactions/sync upserts
  plaid_account_id        text,                                 -- Denormalized for fast lookups

  -- Shared fields (populated regardless of source)
  amount                  numeric     NOT NULL,                 -- Always positive
  amount_sign             text        NOT NULL DEFAULT 'debit'
                            CHECK (amount_sign IN ('debit', 'credit')),
                                                                -- debit = money spent; credit = payment/refund
  merchant_name           text,                                 -- Cleaned merchant name
  category                text,                                 -- Normalized category (mapped via categoryMapper)
  category_confidence     numeric,                              -- 0–1 confidence score; NULL for manual entries
  transaction_date        date        NOT NULL,
  description             text,                                 -- Raw description from Plaid or user
  location_city           text,
  location_state          text,
  location_country        text        DEFAULT 'US',
  is_pending              boolean     DEFAULT false,
  notes                   text,                                 -- User-editable notes (both sources)

  created_at              timestamp with time zone DEFAULT now(),
  updated_at              timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_txns_user_date
  ON transactions(user_id, transaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_txns_source
  ON transactions(source, user_id);

CREATE INDEX IF NOT EXISTS idx_txns_vitta_card
  ON transactions(vitta_card_id) WHERE vitta_card_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_txns_plaid_txn_id
  ON transactions(plaid_transaction_id) WHERE plaid_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_txns_plaid_account
  ON transactions(plaid_account_id) WHERE plaid_account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_txns_category
  ON transactions(category, user_id);

CREATE INDEX IF NOT EXISTS idx_txns_pending
  ON transactions(is_pending, user_id) WHERE is_pending = true;

COMMENT ON TABLE transactions IS 'Unified transaction table. source discriminates Plaid vs manual. plaid_transaction_id UNIQUE enforces idempotent upsert from /transactions/sync.';
COMMENT ON COLUMN transactions.plaid_transaction_id IS 'Plaid stable transaction ID. UNIQUE enforces dedup on sync upserts. NULL for manual entries.';
COMMENT ON COLUMN transactions.amount IS 'Always stored as positive. Use amount_sign to determine direction (debit = spent, credit = payment/refund).';
COMMENT ON COLUMN transactions.category IS 'Normalized category from Plaid taxonomy via categoryMapper.js, or user-entered for manual transactions.';

-- =============================================================================
-- Table: plaid_webhook_events
-- =============================================================================
-- Append-only audit log of every webhook event received from Plaid.
-- Rows are NEVER deleted — this table is for audit, replay, and debugging.
-- signature_valid tracks HMAC-SHA256 verification result.
-- processing_status tracks whether the event was acted upon.

CREATE TABLE IF NOT EXISTS plaid_webhook_events (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  plaid_item_id       text,                                     -- Plaid Item ID from payload (denormalized; item may not exist locally)
  event_type          text        NOT NULL,                     -- e.g., 'TRANSACTIONS_UPDATE', 'TRANSACTIONS_READY'
  webhook_type        text        NOT NULL,                     -- e.g., 'Transactions', 'Item'
  error               jsonb,                                    -- Plaid error object if present in payload
  payload             jsonb       NOT NULL,                     -- Full raw webhook payload (preserved for replay)
  signature_valid     boolean     NOT NULL DEFAULT false,
  verification_state  text        NOT NULL DEFAULT 'pending'
                        CHECK (verification_state IN ('pending', 'verified', 'failed', 'skipped')),
  processing_status   text        NOT NULL DEFAULT 'pending'
                        CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  processing_error    text,                                     -- Error details if processing_status = 'failed'
  received_at         timestamp with time zone DEFAULT now(),
  processed_at        timestamp with time zone
  -- No updated_at column: this is an append-only audit log
);

CREATE INDEX IF NOT EXISTS idx_wh_item
  ON plaid_webhook_events(plaid_item_id) WHERE plaid_item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wh_type
  ON plaid_webhook_events(event_type, webhook_type);

CREATE INDEX IF NOT EXISTS idx_wh_processing
  ON plaid_webhook_events(processing_status) WHERE processing_status IN ('pending', 'processing');

CREATE INDEX IF NOT EXISTS idx_wh_received
  ON plaid_webhook_events(received_at DESC);

COMMENT ON TABLE plaid_webhook_events IS 'Append-only audit log of all Plaid webhook events. Never delete rows. Used for replay and debugging.';
COMMENT ON COLUMN plaid_webhook_events.signature_valid IS 'Result of HMAC-SHA256 verification against X-Plaid-Webhook-Signature header.';
COMMENT ON COLUMN plaid_webhook_events.payload IS 'Full raw webhook payload. Preserved for replay and debugging.';
COMMENT ON COLUMN plaid_webhook_events.processing_status IS 'Tracks whether the webhook was acted upon after verification.';

-- =============================================================================
-- Triggers: updated_at maintenance
-- =============================================================================
-- Reuses update_updated_at_column() function defined in the base schema.
-- Note: plaid_webhook_events intentionally excluded (append-only, no updates).

CREATE TRIGGER trg_plaid_items_updated_at
  BEFORE UPDATE ON plaid_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_plaid_accounts_updated_at
  BEFORE UPDATE ON plaid_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_plaid_liabilities_updated_at
  BEFORE UPDATE ON plaid_liabilities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
