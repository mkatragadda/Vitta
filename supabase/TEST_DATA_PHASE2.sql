-- ============================================================================
-- PHASE 2 TEST DATA - Diverse Reward Structures & Statement Cycles
-- ============================================================================
-- This script inserts test credit cards with:
-- - All 14 Phase 2 reward categories
-- - Varied statement cycle dates (different end dates)
-- - Different payment due dates (staggered throughout month)
-- - Varied balances and credit limits for realistic testing
-- - Different APRs and annual fees
--
-- Replace USER_ID with a real user UUID from the users table
-- ============================================================================

-- Example: Find a user first:
-- SELECT id, email FROM users LIMIT 1;
-- Then replace 'YOUR_USER_ID_HERE' below with that UUID

-- ============================================================================
-- CARD 1: Amex Gold - Dining Specialist (4x dining focus)
-- Statement Cycle: 5th-20th | Due Date: 25th
-- ============================================================================
INSERT INTO "public"."user_credit_cards" (
  "id", "user_id", "card_name", "nickname", "card_type", "issuer",
  "card_network", "reward_structure", "annual_fee", "grace_period_days",
  "is_manual_entry", "apr", "credit_limit", "current_balance", "amount_to_pay",
  "statement_close_day", "payment_due_day", "statement_cycle_start",
  "statement_cycle_end", "created_at", "updated_at"
) VALUES (
  'card-phase2-1', 'YOUR_USER_ID_HERE', 'American Express® Gold Card', 'Amex Gold',
  'Premium Rewards', 'American Express', 'Amex',
  '{
    "dining": 4,
    "groceries": 1,
    "gas": 1,
    "travel": 1,
    "entertainment": 1,
    "streaming": 1,
    "drugstores": 1,
    "home_improvement": 1,
    "department_stores": 1,
    "transit": 1,
    "utilities": 1,
    "warehouse": 1,
    "office_supplies": 1,
    "insurance": 1,
    "default": 1
  }',
  250, 20, false, 18.99, 15000, 0, 0,
  5, 25, '2025-11-05', '2025-11-20',
  NOW(), NOW()
);

-- ============================================================================
-- CARD 2: Chase Sapphire - Travel Specialist (5x travel focus)
-- Statement Cycle: 12th-27th | Due Date: 7th (earlier in month for comparison)
-- ============================================================================
INSERT INTO "public"."user_credit_cards" (
  "id", "user_id", "card_name", "nickname", "card_type", "issuer",
  "card_network", "reward_structure", "annual_fee", "grace_period_days",
  "is_manual_entry", "apr", "credit_limit", "current_balance", "amount_to_pay",
  "statement_close_day", "payment_due_day", "statement_cycle_start",
  "statement_cycle_end", "created_at", "updated_at"
) VALUES (
  'card-phase2-2', 'YOUR_USER_ID_HERE', 'Chase Sapphire Preferred®', 'Chase Sapphire',
  'Travel Rewards', 'Chase', 'Visa',
  '{
    "dining": 3,
    "groceries": 1,
    "gas": 1,
    "travel": 5,
    "entertainment": 2,
    "streaming": 1,
    "drugstores": 1,
    "home_improvement": 1,
    "department_stores": 1,
    "transit": 3,
    "utilities": 1,
    "warehouse": 1,
    "office_supplies": 1,
    "insurance": 1,
    "default": 1
  }',
  95, 25, false, 22.74, 25000, 3500, 1000,
  12, 7, '2025-11-12', '2025-11-27',
  NOW(), NOW()
);

-- ============================================================================
-- CARD 3: Citi Custom Cash - Grocery/Gas Specialist (5x/4x focus)
-- Statement Cycle: 20th-5th (crosses month boundary) | Due Date: 15th
-- ============================================================================
INSERT INTO "public"."user_credit_cards" (
  "id", "user_id", "card_name", "nickname", "card_type", "issuer",
  "card_network", "reward_structure", "annual_fee", "grace_period_days",
  "is_manual_entry", "apr", "credit_limit", "current_balance", "amount_to_pay",
  "statement_close_day", "payment_due_day", "statement_cycle_start",
  "statement_cycle_end", "created_at", "updated_at"
) VALUES (
  'card-phase2-3', 'YOUR_USER_ID_HERE', 'Citi Custom Cash Card®', 'Citi Custom Cash',
  'Cashback', 'Citi', 'Mastercard',
  '{
    "dining": 1,
    "groceries": 5,
    "gas": 4,
    "travel": 1,
    "entertainment": 1,
    "streaming": 1,
    "drugstores": 1,
    "home_improvement": 1,
    "department_stores": 1,
    "transit": 1,
    "utilities": 1,
    "warehouse": 1.5,
    "office_supplies": 1,
    "insurance": 1,
    "default": 1
  }',
  0, 25, false, 19.99, 12000, 2100.50, 500,
  20, 15, '2025-10-20', '2025-11-05',
  NOW(), NOW()
);

-- ============================================================================
-- CARD 4: Capital One Venture - Travel/Entertainment Mix (3x/2x focus)
-- Statement Cycle: 1st-15th (early month) | Due Date: 21st
-- Balance: High balance scenario for APR testing
-- ============================================================================
INSERT INTO "public"."user_credit_cards" (
  "id", "user_id", "card_name", "nickname", "card_type", "issuer",
  "card_network", "reward_structure", "annual_fee", "grace_period_days",
  "is_manual_entry", "apr", "credit_limit", "current_balance", "amount_to_pay",
  "statement_close_day", "payment_due_day", "statement_cycle_start",
  "statement_cycle_end", "created_at", "updated_at"
) VALUES (
  'card-phase2-4', 'YOUR_USER_ID_HERE', 'Capital One Venture X', 'Capital One Venture',
  'Travel Rewards', 'Capital One', 'Visa',
  '{
    "dining": 2,
    "groceries": 1,
    "gas": 1,
    "travel": 3,
    "entertainment": 2,
    "streaming": 1,
    "drugstores": 1,
    "home_improvement": 1,
    "department_stores": 2,
    "transit": 2,
    "utilities": 1,
    "warehouse": 1,
    "office_supplies": 1,
    "insurance": 1,
    "default": 1
  }',
  395, 21, false, 20.99, 30000, 8750.75, 1500,
  1, 21, '2025-10-01', '2025-11-15',
  NOW(), NOW()
);

-- ============================================================================
-- CARD 5: Bank of America Customized Cash - Category Rotation (balanced)
-- Statement Cycle: 17th-2nd (crosses month boundary) | Due Date: 10th
-- Different APR (lower) and mixed rewards
-- ============================================================================
INSERT INTO "public"."user_credit_cards" (
  "id", "user_id", "card_name", "nickname", "card_type", "issuer",
  "card_network", "reward_structure", "annual_fee", "grace_period_days",
  "is_manual_entry", "apr", "credit_limit", "current_balance", "amount_to_pay",
  "statement_close_day", "payment_due_day", "statement_cycle_start",
  "statement_cycle_end", "created_at", "updated_at"
) VALUES (
  'card-phase2-5', 'YOUR_USER_ID_HERE', 'Bank of America Customized Cash Rewards', 'BofA Cash',
  'Cashback', 'Bank of America', 'Mastercard',
  '{
    "dining": 1.5,
    "groceries": 1.5,
    "gas": 1.5,
    "travel": 1,
    "entertainment": 1,
    "streaming": 1,
    "drugstores": 1,
    "home_improvement": 1,
    "department_stores": 1,
    "transit": 1,
    "utilities": 1.5,
    "warehouse": 1,
    "office_supplies": 1,
    "insurance": 1,
    "default": 1.5
  }',
  0, 27, false, 18.49, 8000, 750.25, 300,
  17, 10, '2025-10-17', '2025-11-02',
  NOW(), NOW()
);

-- ============================================================================
-- CARD 6: Discover It - Rotating Categories (home improvement/utilities focus)
-- Statement Cycle: 8th-23rd | Due Date: 30th (end of month)
-- Zero balance for grace period testing
-- ============================================================================
INSERT INTO "public"."user_credit_cards" (
  "id", "user_id", "card_name", "nickname", "card_type", "issuer",
  "card_network", "reward_structure", "annual_fee", "grace_period_days",
  "is_manual_entry", "apr", "credit_limit", "current_balance", "amount_to_pay",
  "statement_close_day", "payment_due_day", "statement_cycle_start",
  "statement_cycle_end", "created_at", "updated_at"
) VALUES (
  'card-phase2-6', 'YOUR_USER_ID_HERE', 'Discover It® Cash Back', 'Discover It',
  'Cashback', 'Discover', 'Discover',
  '{
    "dining": 1,
    "groceries": 1,
    "gas": 5,
    "travel": 1,
    "entertainment": 1,
    "streaming": 1,
    "drugstores": 1,
    "home_improvement": 5,
    "department_stores": 1,
    "transit": 1,
    "utilities": 3,
    "warehouse": 1,
    "office_supplies": 1,
    "insurance": 1,
    "default": 1
  }',
  0, 25, false, 19.99, 6500, 0, 0,
  8, 30, '2025-11-08', '2025-11-23',
  NOW(), NOW()
);

-- ============================================================================
-- CARD 7: American Express Business Platinum - Premium Multi-category
-- Statement Cycle: 10th-25th | Due Date: 5th (early in next cycle)
-- High APR and annual fee for business card scenario
-- ============================================================================
INSERT INTO "public"."user_credit_cards" (
  "id", "user_id", "card_name", "nickname", "card_type", "issuer",
  "card_network", "reward_structure", "annual_fee", "grace_period_days",
  "is_manual_entry", "apr", "credit_limit", "current_balance", "amount_to_pay",
  "statement_close_day", "payment_due_day", "statement_cycle_start",
  "statement_cycle_end", "created_at", "updated_at"
) VALUES (
  'card-phase2-7', 'YOUR_USER_ID_HERE', 'American Express® Business Platinum Card',
  'Amex Business', 'Premium Business', 'American Express', 'Amex',
  '{
    "dining": 3,
    "groceries": 1,
    "gas": 1,
    "travel": 4,
    "entertainment": 1,
    "streaming": 1,
    "drugstores": 1,
    "home_improvement": 1,
    "department_stores": 1,
    "transit": 2,
    "utilities": 2,
    "warehouse": 1,
    "office_supplies": 3,
    "insurance": 1,
    "default": 1
  }',
  695, 20, false, 21.99, 50000, 5200, 2000,
  10, 5, '2025-10-10', '2025-11-25',
  NOW(), NOW()
);

-- ============================================================================
-- CARD 8: Wells Fargo Active Cash - Simple Flat Rate Card
-- Statement Cycle: 6th-21st | Due Date: 28th
-- All categories get same 2% multiplier (legacy style)
-- ============================================================================
INSERT INTO "public"."user_credit_cards" (
  "id", "user_id", "card_name", "nickname", "card_type", "issuer",
  "card_network", "reward_structure", "annual_fee", "grace_period_days",
  "is_manual_entry", "apr", "credit_limit", "current_balance", "amount_to_pay",
  "statement_close_day", "payment_due_day", "statement_cycle_start",
  "statement_cycle_end", "created_at", "updated_at"
) VALUES (
  'card-phase2-8', 'YOUR_USER_ID_HERE', 'Wells Fargo Active Cash℠ Card',
  'Wells Fargo Cash', 'Cashback', 'Wells Fargo', 'Visa',
  '{
    "dining": 2,
    "groceries": 2,
    "gas": 2,
    "travel": 2,
    "entertainment": 2,
    "streaming": 2,
    "drugstores": 2,
    "home_improvement": 2,
    "department_stores": 2,
    "transit": 2,
    "utilities": 2,
    "warehouse": 2,
    "office_supplies": 2,
    "insurance": 2,
    "default": 2
  }',
  0, 24, false, 20.99, 11000, 1450, 400,
  6, 28, '2025-11-06', '2025-11-21',
  NOW(), NOW()
);

-- ============================================================================
-- CARD 9: Amazon Visa - Marketplace/Streaming Focus
-- Statement Cycle: 3rd-18th | Due Date: 22nd
-- High rewards on streaming and department stores (Amazon)
-- ============================================================================
INSERT INTO "public"."user_credit_cards" (
  "id", "user_id", "card_name", "nickname", "card_type", "issuer",
  "card_network", "reward_structure", "annual_fee", "grace_period_days",
  "is_manual_entry", "apr", "credit_limit", "current_balance", "amount_to_pay",
  "statement_close_day", "payment_due_day", "statement_cycle_start",
  "statement_cycle_end", "created_at", "updated_at"
) VALUES (
  'card-phase2-9', 'YOUR_USER_ID_HERE', 'Amazon.com Rewards Visa Card', 'Amazon Visa',
  'Cashback', 'Amazon/Chase', 'Visa',
  '{
    "dining": 1,
    "groceries": 1,
    "gas": 1,
    "travel": 1,
    "entertainment": 1,
    "streaming": 5,
    "drugstores": 1,
    "home_improvement": 1,
    "department_stores": 5,
    "transit": 1,
    "utilities": 1,
    "warehouse": 1.5,
    "office_supplies": 1,
    "insurance": 1,
    "default": 1
  }',
  0, 25, false, 21.99, 7500, 450, 200,
  3, 22, '2025-11-03', '2025-11-18',
  NOW(), NOW()
);

-- ============================================================================
-- CARD 10: CVS/Pharmacy Card - Healthcare/Drugstore Focus
-- Statement Cycle: 11th-26th | Due Date: 3rd (very early)
-- Specialized for drugstore and pharmacy category rewards
-- ============================================================================
INSERT INTO "public"."user_credit_cards" (
  "id", "user_id", "card_name", "nickname", "card_type", "issuer",
  "card_network", "reward_structure", "annual_fee", "grace_period_days",
  "is_manual_entry", "apr", "credit_limit", "current_balance", "amount_to_pay",
  "statement_close_day", "payment_due_day", "statement_cycle_start",
  "statement_cycle_end", "created_at", "updated_at"
) VALUES (
  'card-phase2-10', 'YOUR_USER_ID_HERE', 'CVS® Rewards Mastercard', 'CVS Rewards',
  'Drugstore Rewards', 'CVS Health', 'Mastercard',
  '{
    "dining": 1,
    "groceries": 1.5,
    "gas": 1,
    "travel": 1,
    "entertainment": 1,
    "streaming": 1,
    "drugstores": 4,
    "home_improvement": 1,
    "department_stores": 1.5,
    "transit": 1,
    "utilities": 1,
    "warehouse": 1,
    "office_supplies": 1,
    "insurance": 1,
    "default": 1
  }',
  0, 25, false, 20.99, 5000, 320.75, 150,
  11, 3, '2025-11-11', '2025-11-26',
  NOW(), NOW()
);

-- ============================================================================
-- INSTRUCTIONS FOR USE:
-- ============================================================================
-- 1. Find your user ID:
--    SELECT id, email FROM users WHERE email = 'your-email@example.com';
--
-- 2. Replace 'YOUR_USER_ID_HERE' with the actual UUID in this file
--
-- 3. Run this script in your Supabase SQL editor
--
-- 4. Verify insertion:
--    SELECT card_name, statement_cycle_end, payment_due_day,
--           current_balance, reward_structure
--    FROM user_credit_cards
--    WHERE user_id = 'YOUR_USER_ID_HERE'
--    ORDER BY payment_due_day;
--
-- ============================================================================
-- TEST SCENARIOS NOW AVAILABLE:
-- ============================================================================
-- ✅ 10 diverse Phase 2 cards inserted
-- ✅ All 14 merchant categories represented
-- ✅ Statement cycles: 5th-20th, 12th-27th, 20th-5th, 1st-15th, etc.
-- ✅ Payment due dates: 3rd, 5th, 7th, 10th, 15th, 21st, 22nd, 25th, 28th, 30th
-- ✅ Balances: $0 to $8,750 (grace period + high balance scenarios)
-- ✅ APRs: 18.49% to 22.74%
-- ✅ Annual fees: $0 to $695
-- ✅ Reward specializations: dining, travel, groceries/gas, balanced, rotating, etc.
--
-- Use these cards to test:
-- - Grace period logic ($0 balance vs. carrying balance)
-- - APR comparison across different balance scenarios
-- - Statement cycle overlaps for complex payment planning
-- - Merchant category matching with varied reward structures
-- - Multi-card payment optimization
-- ============================================================================
