-- ============================================================================
-- QUICK FIX: Add Missing Columns to user_credit_cards
-- ============================================================================
-- This fixes the "Could not find the 'annual_fee' column" error
--
-- HOW TO APPLY:
-- 1. Go to: https://app.supabase.com/project/YOUR_PROJECT/sql/new
-- 2. Copy and paste this ENTIRE file
-- 3. Click "Run"
-- ============================================================================

-- Step 1: Drop dependent view if it exists
DROP VIEW IF EXISTS user_cards_with_behavior CASCADE;

-- Step 2: Fix statement_cycle_start column type (change from INTEGER to DATE if needed)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_credit_cards'
        AND column_name = 'statement_cycle_start'
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE user_credit_cards DROP COLUMN statement_cycle_start;
        ALTER TABLE user_credit_cards ADD COLUMN statement_cycle_start DATE;
        RAISE NOTICE 'Fixed statement_cycle_start column type (INTEGER → DATE)';
    END IF;
END $$;

-- Step 3: Fix statement_cycle_end column type (change from INTEGER to DATE if needed)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_credit_cards'
        AND column_name = 'statement_cycle_end'
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE user_credit_cards DROP COLUMN statement_cycle_end;
        ALTER TABLE user_credit_cards ADD COLUMN statement_cycle_end DATE;
        RAISE NOTICE 'Fixed statement_cycle_end column type (INTEGER → DATE)';
    END IF;
END $$;

-- Add annual_fee column
ALTER TABLE user_credit_cards ADD COLUMN IF NOT EXISTS annual_fee NUMERIC DEFAULT 0;

-- Add card_network column
ALTER TABLE user_credit_cards ADD COLUMN IF NOT EXISTS card_network TEXT;

-- Add reward_structure column
ALTER TABLE user_credit_cards ADD COLUMN IF NOT EXISTS reward_structure JSONB;

-- Add grace_period_days column
ALTER TABLE user_credit_cards ADD COLUMN IF NOT EXISTS grace_period_days INTEGER DEFAULT 25;

-- Add is_manual_entry column
ALTER TABLE user_credit_cards ADD COLUMN IF NOT EXISTS is_manual_entry BOOLEAN DEFAULT false;

-- Add catalog_id column (if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_credit_cards' AND column_name = 'catalog_id'
    ) THEN
        ALTER TABLE user_credit_cards ADD COLUMN catalog_id UUID REFERENCES card_catalog(id);
    END IF;
END $$;

-- Create index on catalog_id
CREATE INDEX IF NOT EXISTS idx_user_cards_catalog_id ON user_credit_cards(catalog_id);

-- Add nickname column for user-friendly card identification
ALTER TABLE user_credit_cards ADD COLUMN IF NOT EXISTS nickname TEXT;

-- Make card_type nullable (it's a legacy field)
DO $$
BEGIN
    -- Check if card_type has NOT NULL constraint and remove it
    ALTER TABLE user_credit_cards ALTER COLUMN card_type DROP NOT NULL;
    RAISE NOTICE 'Made card_type nullable (legacy field)';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'card_type is already nullable or does not exist';
END $$;

-- Verify columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'user_credit_cards'
ORDER BY ordinal_position;

-- ============================================================================
-- IMPORTANT NOTE: View Dependency Handled
-- ============================================================================
-- This migration dropped the 'user_cards_with_behavior' view because it
-- depended on the statement_cycle_start and statement_cycle_end columns
-- that needed to be converted from INTEGER to DATE.
--
-- If you need to recreate this view, you'll need to update its definition
-- to work with the new DATE column types instead of INTEGER.
--
-- The view was dropped using CASCADE to ensure a clean migration.
-- ============================================================================
