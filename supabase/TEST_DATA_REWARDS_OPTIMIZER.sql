-- Test Data for REWARDS_OPTIMIZER Profile
-- All cards have 0 balance (grace period available) for maximum rewards optimization
-- User ID: 2fc7f500-b6f0-450e-9033-062b638296d3
-- All cards have is_manual_entry = true and catalog_id = null
-- Focus: Testing reward maximization strategies with various category multipliers

INSERT INTO "public"."user_credit_cards" (
  "id", 
  "user_id", 
  "card_type", 
  "card_name", 
  "apr", 
  "credit_limit", 
  "current_balance", 
  "amount_to_pay", 
  "due_date", 
  "rewards_category", 
  "created_at", 
  "updated_at", 
  "issuer", 
  "reward_structure", 
  "grace_period_days", 
  "last_statement_balance", 
  "last_payment_amount", 
  "paid_in_full_last_month", 
  "catalog_id", 
  "is_manual_entry", 
  "card_network", 
  "annual_fee", 
  "statement_cycle_start", 
  "statement_cycle_end", 
  "nickname", 
  "statement_close_day", 
  "payment_due_day"
) VALUES

-- ============================================
-- PREMIUM TRAVEL REWARDS CARDS
-- ============================================

-- Chase Sapphire Preferred - Best for Travel & Dining
('f1a2b3c4-d5e6-4789-a0b1-c2d3e4f5a6b7', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Sapphire Preferred', '23.74', '20000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Chase', '{"travel":2,"dining":2,"default":1}', '25', '0', '0', 'true', null, 'true', 'Visa', '95', null, null, 'Chase Sapphire', '5', '30'),

-- Amex Gold - Ultimate Dining & Groceries Card
('a2b3c4d5-e6f7-4890-b1c2-d3e4f5a6b7c8', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Gold Card', '25.74', '25000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'American Express', '{"dining":4,"groceries":4,"travel":3,"default":1}', '26', '0', '0', 'true', null, 'true', 'American Express', '250', null, null, 'Amex Gold', '15', '10'),

-- Amex Platinum - Premium Travel (5x Flights)
('b3c4d5e6-f7a8-4901-c2d3-e4f5a6b7c8d9', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Platinum Card', '26.24', '35000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'American Express', '{"travel":5,"dining":1,"default":1}', '27', '0', '0', 'true', null, 'true', 'American Express', '695', null, null, 'Amex Platinum', '11', '8'),

-- Capital One Venture - Flat 2x Travel
('c4d5e6f7-a8b9-4012-d3e4-f5a6b7c8d9e0', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Venture Rewards', '24.24', '18000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Capital One', '{"travel":2,"default":2}', '28', '0', '0', 'true', null, 'true', 'Visa', '95', null, null, 'Capital One Venture', '8', '5'),

-- Chase Sapphire Reserve - Premium Travel (3x Travel & Dining)
('d5e6f7a8-b9c0-4123-e4f5-a6b7c8d9e0f1', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Sapphire Reserve', '24.74', '30000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Chase', '{"travel":3,"dining":3,"default":1}', '25', '0', '0', 'true', null, 'true', 'Visa', '550', null, null, 'Chase Reserve', '12', '9'),


-- ============================================
-- GROCERY OPTIMIZATION CARDS
-- ============================================

-- Amex Blue Cash Preferred - 6% Groceries
('e6f7a8b9-c0d1-4234-f5a6-b7c8d9e0f1a2', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Blue Cash Preferred', '22.24', '15000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'American Express', '{"groceries":6,"gas":3,"default":1}', '25', '0', '0', 'true', null, 'true', 'American Express', '95', null, null, 'Amex Blue Cash', '18', '14'),

-- Citi Custom Cash - 5% Top Category (Groceries)
('f7a8b9c0-d1e2-4345-a6b7-c8d9e0f1a2b3', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Custom Cash', '26.24', '12000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Citi', '{"groceries":5,"gas":5,"dining":5,"travel":5,"default":1}', '23', '0', '0', 'true', null, 'true', 'Mastercard', '0', null, null, 'Citi Custom', '16', '12'),

-- Discover It - Rotating 5% Groceries (Q1)
('a8b9c0d1-e2f3-4456-b7c8-d9e0f1a2b3c4', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Discover It', '22.99', '14000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Discover', '{"groceries":5,"gas":5,"restaurants":5,"default":1}', '27', '0', '0', 'true', null, 'true', 'Discover', '0', null, null, 'Discover It', '22', '17'),

-- Chase Freedom Flex - Rotating 5% Groceries
('b9c0d1e2-f3a4-4567-c8d9-e0f1a2b3c4d5', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Freedom Flex', '23.24', '13000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Chase', '{"groceries":5,"gas":5,"dining":3,"default":1}', '25', '0', '0', 'true', null, 'true', 'Mastercard', '0', null, null, 'Chase Flex', '6', '1'),


-- ============================================
-- DINING OPTIMIZATION CARDS
-- ============================================

-- Capital One Savor - 4x Dining & Entertainment
('c0d1e2f3-a4b5-4678-d9e0-f1a2b3c4d5e6', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Savor Rewards', '24.74', '16000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Capital One', '{"dining":4,"entertainment":4,"groceries":2,"default":1}', '26', '0', '0', 'true', null, 'true', 'Mastercard', '95', null, null, 'Capital One Savor', '9', '5'),

-- Wells Fargo Autograph - 3x Dining & Travel
('d1e2f3a4-b5c6-4789-e0f1-a2b3c4d5e6f7', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Autograph Card', '21.99', '17000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Wells Fargo', '{"travel":3,"dining":3,"gas":3,"default":1}', '25', '0', '0', 'true', null, 'true', 'Visa', '0', null, null, 'Wells Fargo Autograph', '13', '9'),

-- US Bank Altitude Go - 4x Dining
('e2f3a4b5-c6d7-4890-f1a2-b3c4d5e6f7a8', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Altitude Go', '23.99', '12000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'US Bank', '{"dining":4,"gas":2,"groceries":2,"default":1}', '24', '0', '0', 'true', null, 'true', 'Visa', '0', null, null, 'US Bank Go', '20', '15'),


-- ============================================
-- GAS OPTIMIZATION CARDS
-- ============================================

-- Citi Custom Cash - 5% Gas (Top Category)
('f3a4b5c6-d7e8-4901-a2b3-c4d5e6f7a8b9', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Custom Cash Gas', '26.24', '10000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Citi', '{"gas":5,"groceries":5,"dining":5,"travel":5,"default":1}', '23', '0', '0', 'true', null, 'true', 'Mastercard', '0', null, null, 'Citi Gas', '1', '28'),

-- Discover It - Rotating 5% Gas (Q2)
('a4b5c6d7-e8f9-4012-b3c4-d5e6f7a8b9c0', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Discover Gas', '22.99', '11000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Discover', '{"gas":5,"groceries":5,"restaurants":5,"default":1}', '27', '0', '0', 'true', null, 'true', 'Discover', '0', null, null, 'Discover Gas', '25', '20'),

-- Costco Anywhere - 4% Gas
('b5c6d7e8-f9a0-4123-c4d5-e6f7a8b9c0d1', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Costco Anywhere', '20.49', '15000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Citi', '{"gas":4,"travel":3,"restaurants":3,"default":1}', '22', '0', '0', 'true', null, 'true', 'Visa', '0', null, null, 'Costco Card', '17', '14'),


-- ============================================
-- FLAT RATE CASHBACK CARDS
-- ============================================

-- Citi Double Cash - 2% Everything
('c6d7e8f9-a0b1-4234-d5e6-f7a8b9c0d1e2', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Double Cash', '27.99', '20000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Citi', '{"default":2}', '23', '0', '0', 'true', null, 'true', 'Mastercard', '0', null, null, 'Citi Double Cash', '1', '28'),

-- Chase Freedom Unlimited - 1.5% Everything
('d7e8f9a0-b1c2-4345-e6f7-a8b9c0d1e2f3', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Freedom Unlimited', '19.74', '18000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Chase', '{"default":1.5}', '21', '0', '0', 'true', null, 'true', 'Visa', '0', null, null, 'Chase Freedom', '12', '9'),

-- Wells Fargo Active Cash - 2% Everything
('e8f9a0b1-c2d3-4456-f7a8-b9c0d1e2f3a4', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Active Cash', '20.49', '16000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Wells Fargo', '{"default":2}', '24', '0', '0', 'true', null, 'true', 'Visa', '0', null, null, 'Wells Fargo Cash', '25', '20'),

-- Fidelity Rewards - 2% Everything
('f9a0b1c2-d3e4-4567-a8b9-c0d1e2f3a4b5', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Fidelity Rewards', '18.99', '15000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Elan Financial', '{"default":2}', '26', '0', '0', 'true', null, 'true', 'Visa', '0', null, null, 'Fidelity Card', '7', '2'),


-- ============================================
-- SPECIALTY REWARDS CARDS
-- ============================================

-- Amazon Prime Card - 5% Amazon, 2% Gas/Restaurants
('a0b1c2d3-e4f5-4678-b9c0-d1e2f3a4b5c6', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Amazon Prime', '21.24', '14000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Chase', '{"amazon":5,"gas":2,"restaurants":2,"default":1}', '25', '0', '0', 'true', null, 'true', 'Visa', '0', null, null, 'Amazon Prime', '14', '10'),

-- Target RedCard - 5% Target
('b1c2d3e4-f5a6-4789-c0d1-e2f3a4b5c6d7', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Target RedCard', '24.65', '8000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'TD Bank', '{"target":5,"default":1}', '23', '0', '0', 'true', null, 'true', 'Mastercard', '0', null, null, 'Target Card', '3', '28'),

-- Apple Card - 3% Apple, 2% Apple Pay
('c2d3e4f5-a6b7-4890-d1e2-f3a4b5c6d7e8', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Apple Card', '23.24', '12000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Goldman Sachs', '{"apple":3,"applepay":2,"default":1}', '27', '0', '0', 'true', null, 'true', 'Mastercard', '0', null, null, 'Apple Card', '19', '14'),


-- ============================================
-- GRACE PERIOD OPTIMIZATION CARDS
-- (Different statement cycles for float strategy)
-- ============================================

-- Long Grace Period Card (28 days)
('d3e4f5a6-b7c8-4901-e2f3-a4b5c6d7e8f9', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Long Grace Card', '22.99', '16000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Bank A', '{"travel":2,"dining":2,"default":1.5}', '28', '0', '0', 'true', null, 'true', 'Visa', '0', null, null, 'Long Grace', '1', '28'),

-- Short Grace Period Card (21 days)
('e4f5a6b7-c8d9-4012-f3a4-b5c6d7e8f9a0', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Short Grace Card', '23.49', '14000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Bank B', '{"groceries":3,"default":1.5}', '21', '0', '0', 'true', null, 'true', 'Mastercard', '0', null, null, 'Short Grace', '14', '5'),

-- Mid-Month Statement Close
('f5a6b7c8-d9e0-4123-a4b5-c6d7e8f9a0b1', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Mid Month Card', '21.99', '15000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Bank C', '{"gas":3,"dining":2,"default":1.5}', '25', '0', '0', 'true', null, 'true', 'Visa', '0', null, null, 'Mid Month', '15', '10'),

-- End of Month Statement Close
('a6b7c8d9-e0f1-4234-b5c6-d7e8f9a0b1c2', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'End Month Card', '24.24', '13000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Bank D', '{"travel":2,"default":1.5}', '26', '0', '0', 'true', null, 'true', 'Mastercard', '0', null, null, 'End Month', '31', '25'),


-- ============================================
-- MIXED REWARD STRUCTURES
-- ============================================

-- Balanced Rewards Card
('b7c8d9e0-f1a2-4345-c6d7-e8f9a0b1c2d3', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Balanced Rewards', '22.49', '17000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Bank E', '{"dining":2,"groceries":2,"gas":2,"travel":2,"default":1.5}', '24', '0', '0', 'true', null, 'true', 'Visa', '0', null, null, 'Balanced Card', '10', '4'),

-- Premium Multi-Category Card
('c8d9e0f1-a2b3-4456-d7e8-f9a0b1c2d3e4', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Premium Multi', '25.24', '22000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Bank F', '{"travel":3,"dining":3,"groceries":2,"gas":2,"default":1.5}', '27', '0', '0', 'true', null, 'true', 'Mastercard', '195', null, null, 'Premium Multi', '8', '5'),

-- No Annual Fee Power Card
('d9e0f1a2-b3c4-4567-e8f9-a0b1c2d3e4f5', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'No Fee Power', '23.99', '15000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Bank G', '{"dining":3,"groceries":3,"gas":3,"default":1.5}', '25', '0', '0', 'true', null, 'true', 'Visa', '0', null, null, 'No Fee Power', '21', '16');

-- Total: 28 cards optimized for REWARDS_OPTIMIZER profile
-- All cards have:
-- - current_balance = 0.00 (grace period available)
-- - paid_in_full_last_month = true
-- - Varied reward structures (travel, dining, groceries, gas, cashback)
-- - Different statement cycles (close days: 1-31, due days: 1-28)
-- - Different grace periods (21-28 days)
-- - Different APRs (18.99% - 27.99%)
-- - Different credit limits ($8,000 - $35,000)
-- - is_manual_entry = true
-- - catalog_id = null
-- - User ID: 2fc7f500-b6f0-450e-9033-062b638296d3

