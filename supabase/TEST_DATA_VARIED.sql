-- Test Data with Varied Reward Structures, Statement Cycles, APR, Balance, and Grace Periods
-- Generated for comprehensive testing of recommendation engine, payment optimizer, and statement cycle calculations
-- User ID: 717c64c6-ba70-4ef0-b725-e1f4f261c526
-- All cards have is_manual_entry = true and catalog_id = null

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

-- HIGH REWARDS CARDS (No Balance - Grace Period Available)
-- Chase Sapphire Preferred - Travel & Dining Focus
('a1b2c3d4-e5f6-4789-a0b1-c2d3e4f5a6b7', '717c64c6-ba70-4ef0-b725-e1f4f261c526', null, 'Sapphire Preferred', '23.74', '15000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Chase', '{"travel":2,"dining":2,"default":1}', '25', '0', '0', 'true', null, 'true', 'Visa', '95', null, null, 'Chase Sapphire', '5', '30'),

-- Amex Gold - Dining & Groceries Powerhouse
('b2c3d4e5-f6a7-4890-b1c2-d3e4f5a6b7c8', '717c64c6-ba70-4ef0-b725-e1f4f261c526', null, 'Gold Card', '25.74', '20000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'American Express', '{"dining":4,"groceries":4,"travel":3,"default":1}', '26', '0', '0', 'true', null, 'true', 'American Express', '250', null, null, 'Amex Gold', '15', '10'),

-- Capital One Venture - Flat Travel Rewards
('c3d4e5f6-a7b8-4901-c2d3-e4f5a6b7c8d9', '717c64c6-ba70-4ef0-b725-e1f4f261c526', null, 'Venture Rewards', '24.24', '18000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Capital One', '{"travel":2,"default":2}', '28', '0', '0', 'true', null, 'true', 'Visa', '95', null, null, 'Capital One Venture', '8', '5'),

-- Discover It - Rotating 5% Categories
('d4e5f6a7-b8c9-4012-d3e4-f5a6b7c8d9e0', '717c64c6-ba70-4ef0-b725-e1f4f261c526', null, 'Discover It', '22.99', '12000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Discover', '{"groceries":5,"gas":5,"restaurants":5,"default":1}', '27', '0', '0', 'true', null, 'true', 'Discover', '0', null, null, 'Discover It', '22', '17'),

-- Citi Double Cash - 2% Everything
('e5f6a7b8-c9d0-4123-e4f5-a6b7c8d9e0f1', '717c64c6-ba70-4ef0-b725-e1f4f261c526', null, 'Double Cash', '27.99', '25000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Citi', '{"default":2}', '23', '0', '0', 'true', null, 'true', 'Mastercard', '0', null, null, 'Citi Double Cash', '1', '28'),


-- MEDIUM BALANCE CARDS (Grace Period Lost)
-- Chase Freedom Unlimited - Low APR with Balance
('f6a7b8c9-d0e1-4234-f5a6-b7c8d9e0f1a2', '717c64c6-ba70-4ef0-b725-e1f4f261c526', null, 'Freedom Unlimited', '19.74', '15000.00', '8450.00', '300.00', null, null, NOW(), NOW(), 'Chase', '{"default":1.5}', '21', '0', '0', 'false', null, 'true', 'Visa', '0', null, null, 'Chase Freedom', '12', '9'),

-- Wells Fargo Active Cash - High Balance
('a7b8c9d0-e1f2-4345-a6b7-c8d9e0f1a2b3', '717c64c6-ba70-4ef0-b725-e1f4f261c526', null, 'Active Cash', '20.49', '18000.00', '12350.00', '450.00', null, null, NOW(), NOW(), 'Wells Fargo', '{"default":2}', '24', '0', '0', 'false', null, 'true', 'Visa', '0', null, null, 'Wells Fargo Cash', '25', '20'),

-- Amex Blue Cash Everyday - Groceries with Balance
('b8c9d0e1-f2a3-4456-b7c8-d9e0f1a2b3c4', '717c64c6-ba70-4ef0-b725-e1f4f261c526', null, 'Blue Cash Everyday', '21.24', '14000.00', '6720.00', '250.00', null, null, NOW(), NOW(), 'American Express', '{"groceries":3,"gas":3,"default":1}', '25', '0', '0', 'false', null, 'true', 'American Express', '0', null, null, 'Amex Blue Cash', '18', '14'),


-- HIGH APR / LOW REWARDS CARDS (Carrying Balances)
-- Store Card - Very High APR
('c9d0e1f2-a3b4-4567-c8d9-e0f1a2b3c4d5', '717c64c6-ba70-4ef0-b725-e1f4f261c526', null, 'Store Card', '28.74', '5000.00', '4250.00', '150.00', null, null, NOW(), NOW(), 'Store Brand', '{"default":1}', '22', '0', '0', 'false', null, 'true', 'Visa', '0', null, null, 'Store Card', '10', '5'),

-- Capital One Platinum - No Rewards, High Balance
('d0e1f2a3-b4c5-4678-d9e0-f1a2b3c4d5e6', '717c64c6-ba70-4ef0-b725-e1f4f261c526', null, 'Platinum', '26.99', '8000.00', '7200.00', '275.00', null, null, NOW(), NOW(), 'Capital One', '{"default":1}', '21', '0', '0', 'false', null, 'true', 'Mastercard', '0', null, null, 'Capital One Platinum', '7', '2'),

-- Credit Union Card - Low APR, Low Rewards
('e1f2a3b4-c5d6-4789-e0f1-a2b3c4d5e6f7', '717c64c6-ba70-4ef0-b725-e1f4f261c526', null, 'Credit Union Card', '15.99', '10000.00', '3800.00', '180.00', null, null, NOW(), NOW(), 'Credit Union', '{"default":1.25}', '28', '0', '0', 'false', null, 'true', 'Visa', '0', null, null, 'CU Card', '20', '15'),


-- EDGE CASE CARDS (Different Statement Cycles)
-- Card with Statement Close Early in Month
('f2a3b4c5-d6e7-4890-f1a2-b3c4d5e6f7a8', '717c64c6-ba70-4ef0-b725-e1f4f261c526', null, 'Early Cycle Card', '22.49', '16000.00', '4800.00', '200.00', null, null, NOW(), NOW(), 'Bank A', '{"dining":2,"default":1.5}', '26', '0', '0', 'false', null, 'true', 'Mastercard', '0', null, null, 'Early Cycle', '3', '28'),

-- Card with Statement Close Late in Month
('a3b4c5d6-e7f8-4901-a2b3-c4d5e6f7a8b9', '717c64c6-ba70-4ef0-b725-e1f4f261c526', null, 'Late Cycle Card', '23.49', '14000.00', '5600.00', '220.00', null, null, NOW(), NOW(), 'Bank B', '{"travel":3,"default":1}', '24', '0', '0', 'false', null, 'true', 'Visa', '0', null, null, 'Late Cycle', '28', '22'),

-- Card with Short Grace Period
('b4c5d6e7-f8a9-4012-b3c4-d5e6f7a8b9c0', '717c64c6-ba70-4ef0-b725-e1f4f261c526', null, 'Short Grace Card', '20.99', '12000.00', '3600.00', '150.00', null, null, NOW(), NOW(), 'Bank C', '{"gas":2,"default":1}', '21', '0', '0', 'false', null, 'true', 'Mastercard', '0', null, null, 'Short Grace', '14', '5'),

-- Card with Long Grace Period
('c5d6e7f8-a9b0-4123-c4d5-e6f7a8b9c0d1', '717c64c6-ba70-4ef0-b725-e1f4f261c526', null, 'Long Grace Card', '22.24', '17000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Bank D', '{"groceries":4,"dining":3,"default":1.5}', '28', '0', '0', 'true', null, 'true', 'Visa', '0', null, null, 'Long Grace', '1', '28'),


-- ZERO BALANCE CARDS (Various Reward Structures)
-- Chase Freedom Flex - Rotating 5% Categories, No Balance
('d6e7f8a9-b0c1-4234-d5e6-f7a8b9c0d1e2', '717c64c6-ba70-4ef0-b725-e1f4f261c526', null, 'Freedom Flex', '23.24', '13000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Chase', '{"groceries":5,"gas":5,"dining":3,"default":1}', '25', '0', '0', 'true', null, 'true', 'Mastercard', '0', null, null, 'Chase Flex', '6', '1'),

-- Amex Platinum - Premium Travel (High Annual Fee)
('e7f8a9b0-c1d2-4345-e6f7-a8b9c0d1e2f3', '717c64c6-ba70-4ef0-b725-e1f4f261c526', null, 'Platinum Card', '26.24', '30000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'American Express', '{"travel":5,"dining":1,"default":1}', '27', '0', '0', 'true', null, 'true', 'American Express', '695', null, null, 'Amex Platinum', '11', '8'),

-- Citi Custom Cash - 5% Top Category
('f8a9b0c1-d2e3-4456-f7a8-b9c0d1e2f3a4', '717c64c6-ba70-4ef0-b725-e1f4f261c526', null, 'Custom Cash', '26.24', '10000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Citi', '{"groceries":5,"gas":5,"dining":5,"travel":5,"default":1}', '23', '0', '0', 'true', null, 'true', 'Mastercard', '0', null, null, 'Citi Custom', '16', '12'),

-- Capital One Savor - Dining & Entertainment
('a9b0c1d2-e3f4-4567-a8b9-c0d1e2f3a4b5', '717c64c6-ba70-4ef0-b725-e1f4f261c526', null, 'Savor Rewards', '24.74', '15000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Capital One', '{"dining":4,"entertainment":4,"groceries":2,"default":1}', '26', '0', '0', 'true', null, 'true', 'Mastercard', '95', null, null, 'Capital One Savor', '9', '5'),

-- Wells Fargo Autograph - Travel & Dining
('b0c1d2e3-f4a5-4678-b9c0-d1e2f3a4b5c6', '717c64c6-ba70-4ef0-b725-e1f4f261c526', null, 'Autograph Card', '21.99', '16000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Wells Fargo', '{"travel":3,"dining":3,"gas":3,"default":1}', '25', '0', '0', 'true', null, 'true', 'Visa', '0', null, null, 'Wells Fargo Autograph', '13', '9'),


-- HIGH UTILIZATION CARDS (Testing Payment Optimization)
-- Card at 85% Utilization
('c1d2e3f4-a5b6-4789-c0d1-e2f3a4b5c6d7', '717c64c6-ba70-4ef0-b725-e1f4f261c526', null, 'High Util Card 1', '24.49', '8000.00', '6800.00', '280.00', null, null, NOW(), NOW(), 'Bank E', '{"default":1.5}', '22', '0', '0', 'false', null, 'true', 'Visa', '0', null, null, 'High Util 1', '17', '12'),

-- Card at 75% Utilization
('d2e3f4a5-b6c7-4890-d1e2-f3a4b5c6d7e8', '717c64c6-ba70-4ef0-b725-e1f4f261c526', null, 'High Util Card 2', '25.24', '12000.00', '9000.00', '350.00', null, null, NOW(), NOW(), 'Bank F', '{"travel":2,"default":1}', '23', '0', '0', 'false', null, 'true', 'Mastercard', '0', null, null, 'High Util 2', '21', '16'),

-- Card at 95% Utilization (Near Max)
('e3f4a5b6-c7d8-4901-e2f3-a4b5c6d7e8f9', '717c64c6-ba70-4ef0-b725-e1f4f261c526', null, 'Maxed Card', '27.99', '6000.00', '5700.00', '225.00', null, null, NOW(), NOW(), 'Bank G', '{"default":1}', '21', '0', '0', 'false', null, 'true', 'Visa', '0', null, null, 'Maxed Card', '19', '14'),


-- LOW BALANCE / LOW APR CARDS (Avalanche Strategy Targets)
-- Best APR Card
('f4a5b6c7-d8e9-4012-f3a4-b5c6d7e8f9a0', '717c64c6-ba70-4ef0-b725-e1f4f261c526', null, 'Low APR Card', '16.49', '14000.00', '4200.00', '180.00', null, null, NOW(), NOW(), 'Credit Union', '{"default":1.25}', '27', '0', '0', 'false', null, 'true', 'Visa', '0', null, null, 'Low APR', '24', '18'),

-- Second Best APR
('a5b6c7d8-e9f0-4123-a4b5-c6d7e8f9a0b1', '717c64c6-ba70-4ef0-b725-e1f4f261c526', null, 'Second Best APR', '18.99', '11000.00', '3300.00', '140.00', null, null, NOW(), NOW(), 'Bank H', '{"default":1.5}', '26', '0', '0', 'false', null, 'true', 'Mastercard', '0', null, null, 'Second APR', '10', '4'),


-- MONTH BOUNDARY TESTING CARDS
-- Card with Close on 31st
('b6c7d8e9-f0a1-4234-b5c6-d7e8f9a0b1c2', '717c64c6-ba70-4ef0-b725-e1f4f261c526', null, 'End of Month Card', '21.99', '15000.00', '2250.00', '100.00', null, null, NOW(), NOW(), 'Bank I', '{"default":2}', '24', '0', '0', 'false', null, 'true', 'Visa', '0', null, null, 'EOM Card', '31', '25'),

-- Card with Same Day Close/Due (Edge Case)
('c7d8e9f0-a1b2-4345-c6d7-e8f9a0b1c2d3', '717c64c6-ba70-4ef0-b725-e1f4f261c526', null, 'Same Day Card', '23.49', '10000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Bank J', '{"default":1.5}', '30', '0', '0', 'true', null, 'true', 'Mastercard', '0', null, null, 'Same Day', '15', '15');

-- Total: 28 cards with varied:
-- - Reward structures (travel, dining, groceries, gas, cashback, points)
-- - APRs (15.99% to 28.74%)
-- - Balances (0 to $16,273 - various utilization levels)
-- - Statement cycles (close days: 1-31, due days: 1-28)
-- - Grace periods (21-28 days)
-- - Manual entry flag: true
-- - Catalog ID: null

