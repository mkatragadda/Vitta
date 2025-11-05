# Fix: Missing Columns in user_credit_cards Table

## Error

When trying to add a card from the catalog, you're seeing:
```
Could not find the 'annual_fee' column of 'user_credit_cards' in the schema cache
```

## Root Cause

The `user_credit_cards` table in your Supabase database is missing several columns that are defined in `supabase/schema.sql`. This happens when the database schema hasn't been updated to match the code requirements.

## Quick Fix (2 minutes)

### Step 1: Open Supabase SQL Editor

Go to: **https://app.supabase.com/project/YOUR_PROJECT/sql/new**

### Step 2: Run the Fix

Copy and paste the contents of **`supabase/QUICK_FIX.sql`** into the SQL editor and click **"Run"**.

Or copy this directly:

```sql
-- Add missing columns to user_credit_cards table
ALTER TABLE user_credit_cards ADD COLUMN IF NOT EXISTS annual_fee NUMERIC DEFAULT 0;
ALTER TABLE user_credit_cards ADD COLUMN IF NOT EXISTS card_network TEXT;
ALTER TABLE user_credit_cards ADD COLUMN IF NOT EXISTS reward_structure JSONB;
ALTER TABLE user_credit_cards ADD COLUMN IF NOT EXISTS grace_period_days INTEGER DEFAULT 25;
ALTER TABLE user_credit_cards ADD COLUMN IF NOT EXISTS is_manual_entry BOOLEAN DEFAULT false;

-- Add catalog_id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_credit_cards' AND column_name = 'catalog_id'
    ) THEN
        ALTER TABLE user_credit_cards ADD COLUMN catalog_id UUID REFERENCES card_catalog(id);
    END IF;
END $$;

-- Create index
CREATE INDEX IF NOT EXISTS idx_user_cards_catalog_id ON user_credit_cards(catalog_id);
```

### Step 3: Verify

After running the SQL, you should see a table showing all columns in `user_credit_cards`, including the newly added ones.

### Step 4: Test

Try adding a card from the catalog again. The error should be gone!

## What These Columns Do

- **`annual_fee`**: Stores the card's annual fee (copied from catalog)
- **`card_network`**: Stores the card network (Visa, Mastercard, Amex, Discover)
- **`reward_structure`**: Stores the reward multipliers by category (JSONB)
- **`grace_period_days`**: Stores the grace period (default 25 days)
- **`is_manual_entry`**: Indicates if card was manually entered (vs. from catalog)
- **`catalog_id`**: Links to the card_catalog table (NULL if manual entry)

## Why This Happened

The `supabase/schema.sql` file defines the complete schema, but the actual database wasn't updated. This fix synchronizes your database with the schema definition.

## Files Created

1. **`supabase/QUICK_FIX.sql`** - Quick fix SQL (run this!)
2. **`supabase/migrations/add_missing_columns.sql`** - Full migration with notices
3. **`scripts/applyMigration.js`** - Node script (requires admin access)
4. **`FIX_MISSING_COLUMNS.md`** - This file

## After Applying Fix

Once you've applied the fix:
- ✅ Cards from catalog can be added to user's wallet
- ✅ Annual fees are stored
- ✅ Reward structures are preserved
- ✅ Card network information is tracked
- ✅ Catalog linkage is maintained

## Technical Details

The `addCardFromCatalog` function in `services/cardService.js` expects these columns to exist in `user_credit_cards`:

```javascript
const cardData = {
  user_id: userId,
  catalog_id: catalogId,           // ← Needs this column
  card_name: catalogCard.card_name,
  issuer: catalogCard.issuer,
  card_network: catalogCard.card_network, // ← Needs this column
  reward_structure: catalogCard.reward_structure, // ← Needs this column
  annual_fee: catalogCard.annual_fee,    // ← Needs this column
  grace_period_days: catalogCard.grace_period_days, // ← Needs this column
  is_manual_entry: false,          // ← Needs this column
  // ... other fields
};
```

## Need Help?

If you encounter any issues:

1. Check that you have the correct Supabase project selected
2. Ensure you have permission to modify the database schema
3. Try running the SQL commands one at a time
4. Check the error messages in the SQL editor

## Success Criteria

After applying the fix, you should be able to:
1. Browse cards in the Card Browser
2. Click on a card
3. Fill in your personal details (credit limit, balance, etc.)
4. Click "Add to My Wallet"
5. Card is successfully added without errors!
