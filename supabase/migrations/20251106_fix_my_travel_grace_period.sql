-- Fix grace period for My Travel card
-- Issue: grace_period_days was 25 but should be 28
-- This caused payment due date to show Nov 6 instead of Nov 9
-- Calculation: Oct 12 (statement close) + 28 days = Nov 9 (correct due date)

UPDATE user_credit_cards
SET grace_period_days = 28
WHERE nickname = 'My Travel'
  AND statement_close_day = 12;

-- Verify the update
SELECT
  id,
  nickname,
  card_name,
  statement_close_day,
  grace_period_days,
  updated_at
FROM user_credit_cards
WHERE nickname = 'My Travel';
