-- ============================================================================
-- MIGRATION: Add Missing Columns to user_credit_cards
-- ============================================================================
-- This migration adds columns that are in schema.sql but missing from the database
--
-- HOW TO APPLY:
-- 1. Go to https://app.supabase.com/project/YOUR_PROJECT/sql/new
-- 2. Copy and paste this entire file
-- 3. Click "Run" to execute
-- ============================================================================

-- Add annual_fee if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_credit_cards' AND column_name = 'annual_fee'
    ) THEN
        ALTER TABLE user_credit_cards ADD COLUMN annual_fee NUMERIC DEFAULT 0;
        RAISE NOTICE 'Added annual_fee column to user_credit_cards';
    ELSE
        RAISE NOTICE 'annual_fee column already exists in user_credit_cards';
    END IF;
END $$;

-- Add card_network if it doesn't exist (should be network, but keeping for compatibility)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_credit_cards' AND column_name = 'card_network'
    ) THEN
        ALTER TABLE user_credit_cards ADD COLUMN card_network TEXT;
        RAISE NOTICE 'Added card_network column to user_credit_cards';
    ELSE
        RAISE NOTICE 'card_network column already exists in user_credit_cards';
    END IF;
END $$;

-- Add reward_structure if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_credit_cards' AND column_name = 'reward_structure'
    ) THEN
        ALTER TABLE user_credit_cards ADD COLUMN reward_structure JSONB;
        RAISE NOTICE 'Added reward_structure column to user_credit_cards';
    ELSE
        RAISE NOTICE 'reward_structure column already exists in user_credit_cards';
    END IF;
END $$;

-- Add grace_period_days if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_credit_cards' AND column_name = 'grace_period_days'
    ) THEN
        ALTER TABLE user_credit_cards ADD COLUMN grace_period_days INTEGER DEFAULT 25;
        RAISE NOTICE 'Added grace_period_days column to user_credit_cards';
    ELSE
        RAISE NOTICE 'grace_period_days column already exists in user_credit_cards';
    END IF;
END $$;

-- Add is_manual_entry if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_credit_cards' AND column_name = 'is_manual_entry'
    ) THEN
        ALTER TABLE user_credit_cards ADD COLUMN is_manual_entry BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_manual_entry column to user_credit_cards';
    ELSE
        RAISE NOTICE 'is_manual_entry column already exists in user_credit_cards';
    END IF;
END $$;

-- Add catalog_id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_credit_cards' AND column_name = 'catalog_id'
    ) THEN
        ALTER TABLE user_credit_cards ADD COLUMN catalog_id UUID REFERENCES card_catalog(id);
        RAISE NOTICE 'Added catalog_id column to user_credit_cards';
    ELSE
        RAISE NOTICE 'catalog_id column already exists in user_credit_cards';
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_user_cards_catalog_id ON user_credit_cards(catalog_id);

-- Done!
DO $$
BEGIN
    RAISE NOTICE '✓ Migration complete! All missing columns have been added.';
END $$;
