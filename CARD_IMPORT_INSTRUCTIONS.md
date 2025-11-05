# Credit Card Import Instructions

## Overview

We've successfully generated SQL INSERT statements for **114 active personal credit cards** from a public credit card database.

## Files Generated

1. **`supabase/seed_cards.sql`** - Complete SQL file with all 114 cards
2. **`scripts/generateCardInserts.js`** - Script that generates SQL from CSV
3. **`scripts/loadCardsToDatabase.js`** - Script to load cards directly via Supabase client (requires schema update first)

## Card Data Source

- **Source**: https://github.com/andenacitelli/credit-card-bonuses-api
- **CSV URL**: https://raw.githubusercontent.com/andenacitelli/credit-card-bonuses-api/main/exports/data.csv
- **Total Cards**: 200+ (filtered to 114 active personal cards)

## Cards Included

The dataset includes cards from major issuers:
- **American Express**: Platinum, Gold, Blue Cash, Delta cards, Hilton cards, etc.
- **Chase**: Sapphire, Freedom, Ink, United, Southwest, Marriott, etc.
- **Bank of America**: Travel Rewards, Customized Cash, etc.
- **Barclays**: Aviator, Wyndham, JetBlue, etc.
- **Capital One**: Venture, Quicksilver, Savor, etc.
- **Citi**: Double Cash, Premier, Prestige, Custom Cash, etc.
- **Discover**: it Cash Back, it Miles, etc.
- **US Bank**: Altitude, Flexperks, etc.
- **Wells Fargo**: Autograph, Active Cash, Propel, etc.

## Card Fields Populated

Each card includes:
- ✅ **card_name** - Full card name
- ✅ **issuer** - Bank/issuer (normalized)
- ✅ **card_network** - Visa, Mastercard, Amex, Discover
- ✅ **reward_structure** - JSONB with reward multipliers by category
- ✅ **annual_fee** - Annual fee amount
- ✅ **sign_up_bonus** - JSONB with bonus value estimate and spending requirement
- ✅ **benefits** - Array of card benefits/credits
- ✅ **category** - Array of categories (travel, cashback, dining, etc.)
- ✅ **image_url** - URL to card image from offeroptimist.com
- ✅ **application_url** - Official application link
- ✅ **is_active** - Boolean (all true, discontinued cards filtered out)
- ✅ **popularity_score** - Calculated score for sorting (50-100)

## How to Import Cards to Supabase

### Option 1: Using Supabase SQL Editor (RECOMMENDED)

1. Go to your Supabase project: https://app.supabase.com/project/YOUR_PROJECT/sql/new

2. First, ensure your schema is up-to-date. Run this to add any missing columns:

```sql
-- Add missing columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'card_catalog' AND column_name = 'card_network') THEN
        ALTER TABLE card_catalog ADD COLUMN card_network TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'card_catalog' AND column_name = 'reward_structure') THEN
        ALTER TABLE card_catalog ADD COLUMN reward_structure JSONB;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'card_catalog' AND column_name = 'sign_up_bonus') THEN
        ALTER TABLE card_catalog ADD COLUMN sign_up_bonus JSONB;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'card_catalog' AND column_name = 'benefits') THEN
        ALTER TABLE card_catalog ADD COLUMN benefits TEXT[];
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'card_catalog' AND column_name = 'category') THEN
        ALTER TABLE card_catalog ADD COLUMN category TEXT[];
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'card_catalog' AND column_name = 'grace_period_days') THEN
        ALTER TABLE card_catalog ADD COLUMN grace_period_days INTEGER DEFAULT 25;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'card_catalog' AND column_name = 'popularity_score') THEN
        ALTER TABLE card_catalog ADD COLUMN popularity_score INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'card_catalog' AND column_name = 'application_url') THEN
        ALTER TABLE card_catalog ADD COLUMN application_url TEXT;
    END IF;
END $$;
```

3. Then, copy the contents of `supabase/seed_cards.sql` and paste into the SQL editor

4. Click "Run" to execute the INSERT statements

5. Verify with: `SELECT COUNT(*) FROM card_catalog;` (should show 114)

### Option 2: Using psql CLI

If you have direct database access:

```bash
psql -h your-supabase-host -U postgres -d postgres -f supabase/seed_cards.sql
```

### Option 3: Using Node.js Script (After Schema Update)

After ensuring the schema is correct (Option 1), you can use:

```bash
# Download CSV
curl -s "https://raw.githubusercontent.com/andenacitelli/credit-card-bonuses-api/main/exports/data.csv" -o /tmp/cards.csv

# Load to database
node scripts/loadCardsToDatabase.js
```

## Reward Structure Examples

The `reward_structure` JSONB field contains category-based multipliers:

```jsonb
-- Chase Sapphire Preferred
{"travel": 2, "dining": 2, "default": 1}

-- Amex Gold
{"dining": 4, "groceries": 4, "default": 1}

-- Blue Cash Preferred
{"groceries": 6, "streaming": 6, "gas": 3, "default": 1}

-- Citi Double Cash
{"default": 2}

-- Chase Freedom Unlimited
{"dining": 3, "drugstore": 3, "default": 1.5}
```

## Sign-Up Bonus Examples

The `sign_up_bonus` JSONB field contains bonus value and requirements:

```jsonb
{
  "value_estimate": 750,
  "requirement": "Spend $4000 in 90 days"
}
```

Note: Value estimates are approximate (points converted to dollars at 1 cent per point).

## Popularity Score Calculation

Cards are assigned a popularity score (50-100) based on:
- **+30 points**: No annual fee
- **+20 points**: Annual fee < $100
- **+20 points**: Sign-up bonus > 50,000 points
- **+10 points**: Has benefits/credits

This score is used for sorting cards in the "Popular" category.

## Categories

Cards are auto-categorized based on name and features:
- `travel` - Travel cards, airline cards, hotel cards
- `cashback` - Cash back cards
- `dining` - Dining-focused cards
- `business` - Business cards (filtered out for personal import)
- `general` - General purpose cards

## Card Images

All cards include `image_url` from offeroptimist.com:
- Format: `https://offeroptimist.com/images/{issuer}/{card-slug}.{jpg|webp|png}`
- Example: `https://offeroptimist.com/images/amex/platinum.webp`
- The Card Browser will display these images automatically
- Gradient fallback if image fails to load

## Verification

After importing, verify the import:

```bash
node scripts/testCardCatalog.js
```

Expected output:
```
✓ Found 114 cards in catalog
✓ Successfully fetched 5 cards
✓ Found X cards with images
```

## Updating Card Data

To update cards in the future:

1. Download latest CSV:
```bash
curl -s "https://raw.githubusercontent.com/andenacitelli/credit-card-bonuses-api/main/exports/data.csv" -o /tmp/cards.csv
```

2. Regenerate SQL:
```bash
node scripts/generateCardInserts.js
```

3. Apply to database using Option 1 or 2 above

## Notes

- **Business cards excluded**: The import filters out business cards (isBusiness=true)
- **Discontinued cards excluded**: Cards marked as discontinued are filtered out
- **Duplicate handling**: If multiple offers exist for same card, only one is kept
- **APR data**: Not included in source CSV, leaving apr_min/apr_max as NULL
- **Grace period**: Defaults to 25 days for all cards

## Next Steps

1. Import the cards using Option 1 (recommended)
2. Test the Card Browser in the app
3. Users can now browse and search 114 real credit cards
4. Cards display with actual images from offeroptimist.com
5. Reward structures and bonuses are shown in card details

## Support

If you encounter issues:
1. Check that all schema columns exist (run the ALTER TABLE script)
2. Verify Supabase credentials in `.env.local`
3. Check for SQL syntax errors in the Supabase SQL editor
4. Run `node scripts/testCardCatalog.js` to diagnose connection issues
