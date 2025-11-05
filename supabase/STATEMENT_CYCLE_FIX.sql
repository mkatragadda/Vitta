-- ============================================================================
-- Statement Cycle Architecture Fix
-- ============================================================================
-- Problem: Storing absolute dates (e.g., "Jan 15, 2025") that become stale
-- Solution: Store day-of-month (1-31) for recurring monthly cycles
--
-- Key Changes:
-- 1. Add statement_close_day (INTEGER) - Day of month statement closes
-- 2. Add payment_due_day (INTEGER) - Day of month payment is due
-- 3. Calculate grace_period_days from these values
-- 4. Keep old DATE columns for backward compatibility (deprecated)
--
-- HOW TO APPLY:
-- 1. Go to: https://app.supabase.com/project/YOUR_PROJECT/sql/new
-- 2. Copy and paste this ENTIRE file
-- 3. Click "Run"
-- ============================================================================

-- Add new recurring date columns (day-of-month)
ALTER TABLE user_credit_cards ADD COLUMN IF NOT EXISTS statement_close_day INTEGER;
ALTER TABLE user_credit_cards ADD COLUMN IF NOT EXISTS payment_due_day INTEGER;

-- Add constraints to ensure valid day-of-month values
ALTER TABLE user_credit_cards ADD CONSTRAINT check_statement_close_day
  CHECK (statement_close_day IS NULL OR (statement_close_day >= 1 AND statement_close_day <= 31));

ALTER TABLE user_credit_cards ADD CONSTRAINT check_payment_due_day
  CHECK (payment_due_day IS NULL OR (payment_due_day >= 1 AND payment_due_day <= 31));

-- Migrate existing data from DATE columns to day-of-month
-- Extract day from statement_cycle_end if it exists
UPDATE user_credit_cards
SET statement_close_day = EXTRACT(DAY FROM statement_cycle_end)::INTEGER
WHERE statement_cycle_end IS NOT NULL AND statement_close_day IS NULL;

-- Extract day from due_date if it exists
UPDATE user_credit_cards
SET payment_due_day = EXTRACT(DAY FROM due_date)::INTEGER
WHERE due_date IS NOT NULL AND payment_due_day IS NULL;

-- Calculate grace period for cards that have both values
-- Handle month boundaries: if payment_due_day < statement_close_day, add days in month
UPDATE user_credit_cards
SET grace_period_days = CASE
  WHEN payment_due_day >= statement_close_day THEN
    payment_due_day - statement_close_day
  ELSE
    -- Crosses month boundary: assume 30 days in month (conservative)
    (30 - statement_close_day) + payment_due_day
  END
WHERE payment_due_day IS NOT NULL
  AND statement_close_day IS NOT NULL
  AND grace_period_days IS NULL;

-- For cards without statement data, set default grace period to 25 days
UPDATE user_credit_cards
SET grace_period_days = 25
WHERE grace_period_days IS NULL;

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_cards_statement_close ON user_credit_cards(statement_close_day);
CREATE INDEX IF NOT EXISTS idx_user_cards_payment_due ON user_credit_cards(payment_due_day);

-- Verify the migration
SELECT
  card_name,
  statement_close_day,
  payment_due_day,
  grace_period_days,
  -- Show old deprecated fields for comparison
  statement_cycle_end AS old_statement_date,
  due_date AS old_due_date
FROM user_credit_cards
ORDER BY card_name;

-- ============================================================================
-- USAGE NOTES
-- ============================================================================
--
-- OLD WAY (WRONG):
--   due_date = '2025-01-15'  -- Becomes stale next month!
--
-- NEW WAY (CORRECT):
--   statement_close_day = 15  -- 15th of EVERY month
--   payment_due_day = 10      -- 10th of EVERY month
--   grace_period_days = 25    -- Calculated: (30 - 15) + 10 = 25 days
--
-- GRACE PERIOD CALCULATION:
--   If payment_due_day >= statement_close_day:
--     grace_period = payment_due_day - statement_close_day
--   Example: due=20, close=15 → grace=5 days
--
--   If payment_due_day < statement_close_day (crosses month):
--     grace_period = (days_in_month - statement_close_day) + payment_due_day
--   Example: due=10, close=25 → grace=(30-25)+10 = 15 days
--
-- CODE USAGE:
--   To get actual dates for current month:
--     statement_close_date = new Date(year, month, card.statement_close_day)
--     payment_due_date = new Date(year, month, card.payment_due_day)
--
--   If payment_due_day < statement_close_day, add 1 month to payment_due_date
-- ============================================================================
