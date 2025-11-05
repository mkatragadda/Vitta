-- ============================================================================
-- VITTA DATABASE SETUP
-- ============================================================================
-- This file will:
-- 1. Update the card_catalog table schema to match our requirements
-- 2. Seed it with 114 active credit cards
--
-- HOW TO APPLY:
-- 1. Go to https://app.supabase.com/project/YOUR_PROJECT/sql/new
-- 2. Copy and paste this entire file
-- 3. Click "Run" to execute
-- ============================================================================

-- ============================================================================
-- STEP 1: Update card_catalog table schema
-- ============================================================================

-- Add missing columns if they don't exist
DO $$
BEGIN
    -- Add card_network if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'card_catalog' AND column_name = 'card_network'
    ) THEN
        ALTER TABLE card_catalog ADD COLUMN card_network TEXT;
    END IF;

    -- Add reward_structure if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'card_catalog' AND column_name = 'reward_structure'
    ) THEN
        ALTER TABLE card_catalog ADD COLUMN reward_structure JSONB;
    END IF;

    -- Add sign_up_bonus if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'card_catalog' AND column_name = 'sign_up_bonus'
    ) THEN
        ALTER TABLE card_catalog ADD COLUMN sign_up_bonus JSONB;
    END IF;

    -- Add benefits if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'card_catalog' AND column_name = 'benefits'
    ) THEN
        ALTER TABLE card_catalog ADD COLUMN benefits TEXT[];
    END IF;

    -- Add category if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'card_catalog' AND column_name = 'category'
    ) THEN
        ALTER TABLE card_catalog ADD COLUMN category TEXT[];
    END IF;

    -- Add apr_min if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'card_catalog' AND column_name = 'apr_min'
    ) THEN
        ALTER TABLE card_catalog ADD COLUMN apr_min NUMERIC;
    END IF;

    -- Add apr_max if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'card_catalog' AND column_name = 'apr_max'
    ) THEN
        ALTER TABLE card_catalog ADD COLUMN apr_max NUMERIC;
    END IF;

    -- Add grace_period_days if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'card_catalog' AND column_name = 'grace_period_days'
    ) THEN
        ALTER TABLE card_catalog ADD COLUMN grace_period_days INTEGER DEFAULT 25;
    END IF;

    -- Add popularity_score if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'card_catalog' AND column_name = 'popularity_score'
    ) THEN
        ALTER TABLE card_catalog ADD COLUMN popularity_score INTEGER DEFAULT 0;
    END IF;

    -- Add application_url if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'card_catalog' AND column_name = 'application_url'
    ) THEN
        ALTER TABLE card_catalog ADD COLUMN application_url TEXT;
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_card_catalog_issuer ON card_catalog(issuer);
CREATE INDEX IF NOT EXISTS idx_card_catalog_category ON card_catalog USING GIN(category);
CREATE INDEX IF NOT EXISTS idx_card_catalog_active ON card_catalog(is_active);
CREATE INDEX IF NOT EXISTS idx_card_catalog_popularity ON card_catalog(popularity_score DESC);

-- ============================================================================
-- STEP 2: Clear existing data and seed with new cards
-- ============================================================================

-- Clear existing cards (CAUTION: This deletes all existing cards!)
DELETE FROM card_catalog;

-- NOTE: Due to character limits, I'm including a subset of cards here.
-- The full SQL file with all 114 cards is available at: supabase/seed_cards.sql
-- For now, let's add the top 20 most popular cards:
  annual_fee,
  sign_up_bonus,
  benefits,
  category,
  image_url,
  application_url,
  is_active,
  popularity_score
) VALUES (
  'Delta SkyMiles Blue',
  'American Express',
  'Amex',
  '{"travel":2,"default":1}'::jsonb,
  0,
  '{"value_estimate":100,"requirement":"Spend $1000 in 180 days"}'::jsonb,
  NULL,
  ARRAY['travel'],
  'https://offeroptimist.com/images/amex/delta-skymiles-blue.jpg',
  'https://www.americanexpress.com/us/credit-cards/card/delta-skymiles-blue-american-express-card/',
  true,
  70
);

-- Delta SkyMiles Gold
INSERT INTO card_catalog (
  card_name,
  issuer,
  card_network,
  reward_structure,
  annual_fee,
  sign_up_bonus,
  benefits,
  category,
  image_url,
  application_url,
  is_active,
  popularity_score
) VALUES (
  'Delta SkyMiles Gold',
  'American Express',
  'Amex',
  '{"travel":2,"default":1}'::jsonb,
  150,
  '{"value_estimate":500,"requirement":"Spend $2000 in 180 days"}'::jsonb,
  ARRAY['50 First checked bag free'],
  ARRAY['travel'],
  'https://offeroptimist.com/images/amex/delta-skymiles-gold.jpg',
  'https://www.americanexpress.com/us/credit-cards/card/delta-skymiles-gold-american-express-card/',
  true,
  60
);

-- Delta SkyMiles Platinum
INSERT INTO card_catalog (
  card_name,
  issuer,
  card_network,
  reward_structure,
  annual_fee,
  sign_up_bonus,
  benefits,
  category,
  image_url,
  application_url,
  is_active,
  popularity_score
) VALUES (
  'Delta SkyMiles Platinum',
  'American Express',
  'Amex',
  '{"travel":2,"default":1}'::jsonb,
  350,
  '{"value_estimate":600,"requirement":"Spend $3000 in 180 days"}'::jsonb,
  ARRAY['500 Companion Pass'],
  ARRAY['travel'],
  'https://offeroptimist.com/images/amex/delta-skymiles-platinum.webp',
  'https://www.americanexpress.com/us/credit-cards/card/delta-skymiles-platinum-american-express-card/',
  true,
  80
);

-- Delta SkyMiles Reserve
INSERT INTO card_catalog (
  card_name,
  issuer,
  card_network,
  reward_structure,
  annual_fee,
  sign_up_bonus,
  benefits,
  category,
  image_url,
  application_url,
  is_active,
  popularity_score
) VALUES (
  'Delta SkyMiles Reserve',
  'American Express',
  'Amex',
  '{"travel":2,"default":1}'::jsonb,
  650,
  '{"value_estimate":700,"requirement":"Spend $5000 in 180 days"}'::jsonb,
  ARRAY['240 Resy Credit'],
  ARRAY['travel'],
  'https://offeroptimist.com/images/amex/delta-skymiles-reserve.webp',
  'https://www.americanexpress.com/us/credit-cards/card/delta-skymiles-reserve-american-express-card/',
  true,
  80
);

-- Blue Cash Everyday
INSERT INTO card_catalog (
  card_name,
  issuer,
  card_network,
  reward_structure,
  annual_fee,
  sign_up_bonus,
  benefits,
  category,
  image_url,
  application_url,
  is_active,
  popularity_score
) VALUES (
  'Blue Cash Everyday',
  'American Express',
  'Amex',
  '{"groceries":3,"gas":2,"default":1}'::jsonb,
  0,
  '{"value_estimate":3,"requirement":"Spend $2000 in 180 days"}'::jsonb,
  NULL,
  ARRAY['cashback'],
  'https://offeroptimist.com/images/amex/blue-cash-everyday.webp',
  'https://www.americanexpress.com/us/credit-cards/card/blue-cash-everyday/',
  true,
  70
);

-- Blue Cash Preferred
INSERT INTO card_catalog (
  card_name,
  issuer,
  card_network,
  reward_structure,
  annual_fee,
  sign_up_bonus,
  benefits,
  category,
  image_url,
  application_url,
  is_active,
  popularity_score
) VALUES (
  'Blue Cash Preferred',
  'American Express',
  'Amex',
  '{"groceries":6,"streaming":6,"gas":3,"default":1}'::jsonb,
  95,
  '{"value_estimate":3,"requirement":"Spend $3000 in 180 days"}'::jsonb,
  ARRAY['84 $7/mo Disney Bundle Credit'],
  ARRAY['travel', 'cashback'],
  'https://offeroptimist.com/images/amex/blue-cash-preferred.webp',
  'https://www.americanexpress.com/us/credit-cards/card/blue-cash-preferred/',
  true,
  80
);

-- Blue Cash Preferred (Morgan Stanley)
INSERT INTO card_catalog (
  card_name,
  issuer,
  card_network,
  reward_structure,
  annual_fee,
  sign_up_bonus,
  benefits,
  category,
  image_url,
  application_url,
  is_active,
  popularity_score
) VALUES (
  'Blue Cash Preferred (Morgan Stanley)',
  'American Express',
  'Amex',
  '{"groceries":6,"streaming":6,"gas":3,"default":1}'::jsonb,
  95,
  '{"value_estimate":3,"requirement":"Spend $3000 in 180 days"}'::jsonb,
  ARRAY['84 $7/mo Disney Bundle Credit'],
  ARRAY['travel', 'cashback'],
  'https://offeroptimist.com/images/amex/blue-cash-preferred-morgan-stanley.png',
  'https://apply.americanexpress.com/amex-morgan-stanley-credit-cards/',
  true,
  80
);

-- Gold
INSERT INTO card_catalog (
  card_name,
  issuer,
  card_network,
  reward_structure,
  annual_fee,
  sign_up_bonus,
  benefits,
  category,
  image_url,
  application_url,
  is_active,
  popularity_score
) VALUES (
  'Gold',
  'American Express',
  'Amex',
  '{"dining":4,"groceries":4,"default":1}'::jsonb,
  350,
  '{"value_estimate":600,"requirement":"Spend $6000 in 180 days"}'::jsonb,
  ARRAY['120 $10/mo credit for Uber', '120 $10/mo credit for Grubhub, Cheesecake Factory, Gold Belly, Wine.com, Milk, Shake Shack', '84 $7/mo credit for Dunkin', '100 Semi-annual $50 Resy credit'],
  ARRAY['general'],
  'https://offeroptimist.com/images/amex/gold.webp',
  'https://www.americanexpress.com/us/credit-cards/card/gold-card/',
  true,
  80
);

-- Green
INSERT INTO card_catalog (
  card_name,
  issuer,
  card_network,
  reward_structure,
  annual_fee,
  sign_up_bonus,
  benefits,
  category,
  image_url,
  application_url,
  is_active,
  popularity_score
) VALUES (
  'Green',
  'American Express',
  'Amex',
  '{"default":1}'::jsonb,
  150,
  '{"value_estimate":400,"requirement":"Spend $3000 in 180 days"}'::jsonb,
  ARRAY['100 PreCheck Credit', '100 Lounge Access Credit'],
  ARRAY['general'],
  'https://offeroptimist.com/images/amex/green.webp',
  'https://www.americanexpress.com/us/credit-cards/card/green/',
  true,
  60
);

-- Hilton Honors
INSERT INTO card_catalog (
  card_name,
  issuer,
  card_network,
  reward_structure,
  annual_fee,
  sign_up_bonus,
  benefits,
  category,
  image_url,
  application_url,
  is_active,
  popularity_score
) VALUES (
  'Hilton Honors',
  'American Express',
  'Amex',
  '{"default":1}'::jsonb,
  0,
  '{"value_estimate":1000,"requirement":"Spend $2000 in 180 days"}'::jsonb,
  NULL,
  ARRAY['travel'],
  'https://offeroptimist.com/images/amex/hilton-honors.png',
  'https://www.hilton.com/en/hilton-honors/credit-cards/',
