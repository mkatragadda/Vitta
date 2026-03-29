-- ============================================================================
-- MIGRATION: Fix transfers.plaid_transfer_account_id column
-- Issue: Column was UUID type with foreign key to non-existent table
-- Solution: Change to VARCHAR(255) to store Plaid account ID string
-- ============================================================================

-- Step 1: Drop the incorrect foreign key constraint
ALTER TABLE transfers
DROP CONSTRAINT IF EXISTS transfers_plaid_transfer_account_id_fkey;

-- Step 2: Change column type from UUID to VARCHAR(255)
-- This will store the Plaid account ID string (e.g., 'zy6aB9B9gZsENRq3MAaJCy9l4weGpDF33MLkP')
ALTER TABLE transfers
ALTER COLUMN plaid_transfer_account_id TYPE VARCHAR(255);

-- Step 3: Verify the migration
-- Run this query to confirm the column type changed:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'transfers' AND column_name = 'plaid_transfer_account_id';
