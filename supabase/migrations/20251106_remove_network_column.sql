-- ============================================================================
-- MIGRATION: Remove redundant 'network' column from user_credit_cards ONLY
-- ============================================================================
-- Background:
-- - card_catalog table: KEEPS 'network' column (used for card catalog)
-- - user_credit_cards table: REMOVES 'network' column, uses 'card_network' instead
-- - Both columns existed in user_credit_cards, causing confusion
--
-- HOW TO APPLY:
-- 1. Go to: https://app.supabase.com/project/YOUR_PROJECT/sql/new
-- 2. Copy and paste this entire file
-- 3. Click "Run" to execute
-- ============================================================================

-- Remove 'network' column from user_credit_cards if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_credit_cards' AND column_name = 'network'
    ) THEN
        -- First, migrate any data from 'network' to 'card_network' if card_network is empty
        UPDATE user_credit_cards
        SET card_network = network
        WHERE card_network IS NULL AND network IS NOT NULL;
        
        -- Now drop the redundant 'network' column
        ALTER TABLE user_credit_cards DROP COLUMN network;
        
        RAISE NOTICE '✓ Removed redundant "network" column from user_credit_cards';
        RAISE NOTICE '  Data migrated to "card_network" column';
    ELSE
        RAISE NOTICE '✓ Column "network" does not exist in user_credit_cards (already clean)';
    END IF;
END $$;

-- SKIP card_catalog - keep 'network' column there (it's intentional)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'card_catalog' AND column_name = 'network'
    ) THEN
        RAISE NOTICE '✓ card_catalog "network" column exists and is preserved (intentional)';
    ELSE
        RAISE NOTICE '⚠ card_catalog missing "network" column (may need to add it)';
    END IF;
END $$;

-- Verify final state
DO $$
BEGIN
    -- Check user_credit_cards has card_network and NO network
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_credit_cards' AND column_name = 'card_network'
    ) THEN
        RAISE NOTICE '✓ user_credit_cards has "card_network" column (correct)';
    ELSE
        RAISE WARNING '⚠ user_credit_cards missing "card_network" column!';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_credit_cards' AND column_name = 'network'
    ) THEN
        RAISE NOTICE '✓ user_credit_cards does NOT have "network" column (correct)';
    ELSE
        RAISE WARNING '⚠ user_credit_cards still has "network" column (migration may have failed)';
    END IF;
    
    -- Check card_catalog has network (should keep it)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'card_catalog' AND column_name = 'network'
    ) THEN
        RAISE NOTICE '✓ card_catalog has "network" column (preserved as intended)';
    ELSE
        RAISE NOTICE '⚠ card_catalog missing "network" column';
    END IF;
END $$;

-- Done!
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==========================================================';
    RAISE NOTICE '✓ Migration complete!';
    RAISE NOTICE '  - user_credit_cards: "network" column REMOVED';
    RAISE NOTICE '  - user_credit_cards: "card_network" column RETAINED';
    RAISE NOTICE '  - card_catalog: "network" column PRESERVED (intentional)';
    RAISE NOTICE '  - All data preserved and migrated';
    RAISE NOTICE '==========================================================';
END $$;

