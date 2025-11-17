-- Comprehensive Test Data for REWARDS_OPTIMIZER Profile
-- All cards have 0 balance (grace period available) for maximum rewards optimization
-- User ID: 2fc7f500-b6f0-450e-9033-062b638296d3
-- All cards have is_manual_entry = true and catalog_id = null
-- Focus: Testing ALL 14 reward categories with various multipliers
-- Categories: dining, groceries, gas, travel, entertainment, streaming, drugstores,
--             home_improvement, department_stores, transit, utilities, warehouse,
--             office_supplies, insurance

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
-- 1. DINING OPTIMIZATION CARDS
-- ============================================

-- Amex Gold - 4x Dining (Premium)
('d1a2b3c4-e5f6-4789-a0b1-c2d3e4f5a6b7', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Gold Card', '25.74', '25000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'American Express', '{"dining":4,"groceries":4,"travel":3,"default":1}', '26', '0', '0', 'true', null, 'true', 'American Express', '250', null, null, 'Amex Gold', '15', '10'),

-- Capital One Savor - 4x Dining & Entertainment
('d2a3b4c5-e6f7-4890-b1c2-d3e4f5a6b7c8', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Savor Rewards', '24.74', '16000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Capital One', '{"dining":4,"entertainment":4,"groceries":2,"default":1}', '26', '0', '0', 'true', null, 'true', 'Mastercard', '95', null, null, 'Capital One Savor', '9', '5'),

-- US Bank Altitude Go - 4x Dining (No Fee)
('d3a4b5c6-e7f8-4901-b2c3-d4e5f6a7b8c9', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Altitude Go', '23.99', '12000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'US Bank', '{"dining":4,"gas":2,"groceries":2,"default":1}', '24', '0', '0', 'true', null, 'true', 'Visa', '0', null, null, 'US Bank Go', '20', '15'),

-- Citi Custom Cash - 5x Dining (Top Category)
('d4a5b6c7-e8f9-4012-b3c4-d5e6f7a8b9c0', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Custom Cash Dining', '26.24', '12000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Citi', '{"dining":5,"groceries":5,"gas":5,"travel":5,"default":1}', '23', '0', '0', 'true', null, 'true', 'Mastercard', '0', null, null, 'Citi Custom Dining', '16', '12'),

-- Discover It - 5x Restaurants (Rotating)
('d5a6b7c8-e9f0-4123-b4c5-d6e7f8a9b0c1', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Discover It', '22.99', '14000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Discover', '{"restaurants":5,"groceries":5,"gas":5,"default":1}', '27', '0', '0', 'true', null, 'true', 'Discover', '0', null, null, 'Discover It', '22', '17'),


-- ============================================
-- 2. GROCERIES OPTIMIZATION CARDS
-- ============================================

-- Amex Blue Cash Preferred - 6% Groceries (Best for Groceries)
('a1a2b3c4-e5f6-4789-a0b1-c2d3e4f5a6b7', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Blue Cash Preferred', '22.24', '15000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'American Express', '{"groceries":6,"gas":3,"streaming":6,"default":1}', '25', '0', '0', 'true', null, 'true', 'American Express', '95', null, null, 'Amex Blue Cash', '18', '14'),

-- Citi Custom Cash - 5% Groceries
('a2a3b4c5-e6f7-4890-b1c2-d3e4f5a6b7c8', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Custom Cash Groceries', '26.24', '12000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Citi', '{"groceries":5,"gas":5,"dining":5,"travel":5,"default":1}', '23', '0', '0', 'true', null, 'true', 'Mastercard', '0', null, null, 'Citi Custom Groceries', '16', '12'),

-- Chase Freedom Flex - 5% Groceries (Rotating)
('a3a4b5c6-e7f8-4901-b2c3-d4e5f6a7b8c9', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Freedom Flex', '23.24', '13000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Chase', '{"groceries":5,"gas":5,"dining":3,"default":1}', '25', '0', '0', 'true', null, 'true', 'Mastercard', '0', null, null, 'Chase Flex', '6', '1'),


-- ============================================
-- 3. GAS OPTIMIZATION CARDS
-- ============================================

-- Citi Custom Cash - 5% Gas
('a4a5b6c7-e8f9-4012-b3c4-d5e6f7a8b9c0', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Custom Cash Gas', '26.24', '10000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Citi', '{"gas":5,"groceries":5,"dining":5,"travel":5,"default":1}', '23', '0', '0', 'true', null, 'true', 'Mastercard', '0', null, null, 'Citi Gas', '1', '28'),

-- Costco Anywhere - 4% Gas
('a5a6b7c8-e9f0-4123-b4c5-d6e7f8a9b0c1', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Costco Anywhere', '20.49', '15000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Citi', '{"gas":4,"warehouse":2,"travel":3,"default":1}', '22', '0', '0', 'true', null, 'true', 'Visa', '0', null, null, 'Costco Card', '17', '14'),

-- Sam's Club - 5% Gas
('a6a7b8c9-e0f1-4234-b5c6-d7e8f9a0b1c2', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Sam''s Club Mastercard', '21.49', '12000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Synchrony', '{"gas":5,"warehouse":3,"default":1}', '23', '0', '0', 'true', null, 'true', 'Mastercard', '0', null, null, 'Sams Club', '25', '20'),


-- ============================================
-- 4. TRAVEL OPTIMIZATION CARDS
-- ============================================

-- Amex Platinum - 5x Travel (Flights)
('b1a2b3c4-e5f6-4789-a0b1-c2d3e4f5a6b7', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Platinum Card', '26.24', '35000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'American Express', '{"travel":5,"dining":1,"default":1}', '27', '0', '0', 'true', null, 'true', 'American Express', '695', null, null, 'Amex Platinum', '11', '8'),

-- Chase Sapphire Reserve - 3x Travel & Dining
('b2a3b4c5-e6f7-4890-b1c2-d3e4f5a6b7c8', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Sapphire Reserve', '24.74', '30000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Chase', '{"travel":3,"dining":3,"transit":3,"default":1}', '25', '0', '0', 'true', null, 'true', 'Visa', '550', null, null, 'Chase Reserve', '12', '9'),

-- Chase Sapphire Preferred - 2x Travel & Dining
('b3a4b5c6-e7f8-4901-b2c3-d4e5f6a7b8c9', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Sapphire Preferred', '23.74', '20000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Chase', '{"travel":2,"dining":2,"default":1}', '25', '0', '0', 'true', null, 'true', 'Visa', '95', null, null, 'Chase Sapphire', '5', '30'),


-- ============================================
-- 5. ENTERTAINMENT OPTIMIZATION CARDS
-- ============================================

-- Capital One Savor - 4x Entertainment
('e1a2b3c4-e5f6-4789-a0b1-c2d3e4f5a6b7', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Savor Entertainment', '24.74', '16000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Capital One', '{"entertainment":4,"dining":4,"groceries":2,"default":1}', '26', '0', '0', 'true', null, 'true', 'Mastercard', '95', null, null, 'Capital One Savor', '9', '5'),

-- Amex Gold - 4x Entertainment (via categories)
('e2a3b4c5-e6f7-4890-b1c2-d3e4f5a6b7c8', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Gold Entertainment', '25.74', '25000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'American Express', '{"entertainment":3,"dining":4,"groceries":4,"travel":3,"default":1}', '26', '0', '0', 'true', null, 'true', 'American Express', '250', null, null, 'Amex Gold Ent', '15', '10'),


-- ============================================
-- 6. STREAMING OPTIMIZATION CARDS
-- ============================================

-- Amex Blue Cash Preferred - 6% Streaming
('f1a2b3c4-e5f6-4789-a0b1-c2d3e4f5a6b7', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Blue Cash Streaming', '22.24', '15000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'American Express', '{"streaming":6,"groceries":6,"gas":3,"default":1}', '25', '0', '0', 'true', null, 'true', 'American Express', '95', null, null, 'Amex Streaming', '18', '14'),

-- US Bank Cash+ - 5% Streaming (Selectable)
('f2a3b4c5-e6f7-4890-b1c2-d3e4f5a6b7c8', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Cash Plus Streaming', '25.99', '10000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'US Bank', '{"streaming":5,"utilities":5,"home_improvement":5,"default":1}', '24', '0', '0', 'true', null, 'true', 'Visa', '0', null, null, 'US Bank Cash+', '10', '5'),


-- ============================================
-- 7. DRUGSTORES OPTIMIZATION CARDS
-- ============================================

-- CVS Pharmacy - 5% CVS
('c1a2b3c4-e5f6-4789-a0b1-c2d3e4f5a6b7', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'CVS Pharmacy Card', '26.74', '8000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Synchrony', '{"drugstores":5,"default":1}', '23', '0', '0', 'true', null, 'true', 'Visa', '0', null, null, 'CVS Card', '20', '15'),

-- US Bank Cash+ - 5% Drugstores (Selectable)
('c2a3b4c5-e6f7-4890-b1c2-d3e4f5a6b7c8', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Cash Plus Drugstores', '25.99', '10000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'US Bank', '{"drugstores":5,"utilities":5,"streaming":5,"default":1}', '24', '0', '0', 'true', null, 'true', 'Visa', '0', null, null, 'US Bank Drugstores', '10', '5'),

-- Walgreens - 5% Walgreens
('c3a4b5c6-e7f8-4901-b2c3-d4e5f6a7b8c9', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Walgreens Card', '27.24', '7500.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Synchrony', '{"drugstores":5,"default":1}', '22', '0', '0', 'true', null, 'true', 'Mastercard', '0', null, null, 'Walgreens Card', '15', '10'),


-- ============================================
-- 8. HOME IMPROVEMENT OPTIMIZATION CARDS
-- ============================================

-- US Bank Cash+ - 5% Home Improvement
('19a1b2c3-d4e5-4678-f9a0-b1c2d3e4f5a6', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Cash Plus Home Improvement', '25.99', '15000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'US Bank', '{"home_improvement":5,"utilities":5,"streaming":5,"default":1}', '24', '0', '0', 'true', null, 'true', 'Visa', '0', null, null, 'US Bank Home', '10', '5'),

-- Home Depot - 5% Home Depot
('1aa2b3c4-d5e6-4789-f0a1-b2c3d4e5f6a7', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Home Depot Card', '26.99', '12000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Citi', '{"home_improvement":5,"default":1}', '23', '0', '0', 'true', null, 'true', 'Mastercard', '0', null, null, 'Home Depot', '8', '3'),

-- Lowe's - 5% Lowe's
('1ba3b4c5-d6e7-4890-f1a2-b3c4d5e6f7a8', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Lowes Card', '25.99', '11000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Synchrony', '{"home_improvement":5,"default":1}', '22', '0', '0', 'true', null, 'true', 'Visa', '0', null, null, 'Lowes Card', '18', '13'),


-- ============================================
-- 9. DEPARTMENT STORES OPTIMIZATION CARDS
-- ============================================

-- Target RedCard - 5% Target
('0d1a2b3c-e5f6-4789-a0b1-c2d3e4f5a6b7', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Target RedCard', '24.65', '8000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'TD Bank', '{"department_stores":5,"default":1}', '23', '0', '0', 'true', null, 'true', 'Mastercard', '0', null, null, 'Target Card', '3', '28'),

-- Amazon Prime - 5% Amazon (Department Store)
('0d2a3b4c-e6f7-4890-b1c2-d3e4f5a6b7c8', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Amazon Prime Card', '21.24', '14000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Chase', '{"department_stores":5,"gas":2,"restaurants":2,"default":1}', '25', '0', '0', 'true', null, 'true', 'Visa', '0', null, null, 'Amazon Prime', '14', '10'),

-- Macy's - 5% Macy's
('0d3a4b5c-e7f8-4901-b2c3-d4e5f6a7b8c9', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Macys Card', '27.99', '6000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Citi', '{"department_stores":5,"default":1}', '23', '0', '0', 'true', null, 'true', 'American Express', '0', null, null, 'Macys Card', '12', '7'),


-- ============================================
-- 10. TRANSIT OPTIMIZATION CARDS
-- ============================================

-- Chase Sapphire Reserve - 3x Transit
('0e1a2b3c-e5f6-4789-a0b1-c2d3e4f5a6b7', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Sapphire Reserve Transit', '24.74', '30000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Chase', '{"transit":3,"travel":3,"dining":3,"default":1}', '25', '0', '0', 'true', null, 'true', 'Visa', '550', null, null, 'Chase Reserve Transit', '12', '9'),

-- Wells Fargo Autograph - 3x Transit
('0e2a3b4c-e6f7-4890-b1c2-d3e4f5a6b7c8', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Autograph Transit', '21.99', '17000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Wells Fargo', '{"transit":3,"travel":3,"dining":3,"gas":3,"default":1}', '25', '0', '0', 'true', null, 'true', 'Visa', '0', null, null, 'Wells Fargo Transit', '13', '9'),

-- US Bank Altitude Go - 2x Transit
('0e3a4b5c-e7f8-4901-b2c3-d4e5f6a7b8c9', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Altitude Go Transit', '23.99', '12000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'US Bank', '{"transit":2,"dining":4,"gas":2,"groceries":2,"default":1}', '24', '0', '0', 'true', null, 'true', 'Visa', '0', null, null, 'US Bank Transit', '20', '15'),


-- ============================================
-- 11. UTILITIES OPTIMIZATION CARDS
-- ============================================

-- US Bank Cash+ - 5% Utilities
('0f1a2b3c-e5f6-4789-a0b1-c2d3e4f5a6b7', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Cash Plus Utilities', '25.99', '10000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'US Bank', '{"utilities":5,"streaming":5,"home_improvement":5,"default":1}', '24', '0', '0', 'true', null, 'true', 'Visa', '0', null, null, 'US Bank Utilities', '10', '5'),

-- Elan Max Cash Preferred - 5% Utilities
('0f2a3b4c-e6f7-4890-b1c2-d3e4f5a6b7c8', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Elan Max Cash Utilities', '24.99', '12000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Elan Financial', '{"utilities":5,"streaming":5,"entertainment":5,"default":1}', '25', '0', '0', 'true', null, 'true', 'Visa', '0', null, null, 'Elan Utilities', '15', '10'),


-- ============================================
-- 12. WAREHOUSE OPTIMIZATION CARDS
-- ============================================

-- Costco Anywhere - 4% Costco, 2% Warehouse
('10a1b2c3-d4e5-4678-f9a0-b1c2d3e4f5a6', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Costco Anywhere', '20.49', '15000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Citi', '{"warehouse":4,"gas":4,"travel":3,"default":1}', '22', '0', '0', 'true', null, 'true', 'Visa', '0', null, null, 'Costco Card', '17', '14'),

-- Sam's Club - 5% Sam's Club
('11a2b3c4-d5e6-4789-f0a1-b2c3d4e5f6a7', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Sams Club Mastercard', '21.49', '12000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Synchrony', '{"warehouse":5,"gas":5,"default":1}', '23', '0', '0', 'true', null, 'true', 'Mastercard', '0', null, null, 'Sams Club', '25', '20'),

-- BJ's Wholesale - 5% BJ's
('12a3b4c5-d6e7-4890-f1a2-b3c4d5e6f7a8', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'BJs Wholesale Card', '22.49', '10000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Capital One', '{"warehouse":5,"gas":3,"default":1}', '24', '0', '0', 'true', null, 'true', 'Mastercard', '0', null, null, 'BJs Card', '22', '17'),


-- ============================================
-- 13. OFFICE SUPPLIES OPTIMIZATION CARDS
-- ============================================

-- US Bank Cash+ - 5% Office Supplies
('13a4b5c6-d7e8-4901-f2a3-b4c5d6e7f8a9', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Cash Plus Office Supplies', '25.99', '10000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'US Bank', '{"office_supplies":5,"utilities":5,"streaming":5,"default":1}', '24', '0', '0', 'true', null, 'true', 'Visa', '0', null, null, 'US Bank Office', '10', '5'),

-- Staples - 5% Staples
('14a5b6c7-d8e9-4012-f3a4-b5c6d7e8f9a0', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Staples Card', '26.99', '8000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Comenity', '{"office_supplies":5,"default":1}', '23', '0', '0', 'true', null, 'true', 'Mastercard', '0', null, null, 'Staples Card', '15', '10'),

-- Office Depot - 5% Office Depot
('15a6b7c8-d9e0-4123-f4a5-b6c7d8e9f0a1', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Office Depot Card', '27.24', '7500.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Citi', '{"office_supplies":5,"default":1}', '22', '0', '0', 'true', null, 'true', 'Visa', '0', null, null, 'Office Depot', '18', '13'),


-- ============================================
-- 14. INSURANCE OPTIMIZATION CARDS
-- ============================================

-- Chase Freedom Unlimited - 1.5% Insurance (via Default)
('16a7b8c9-d0e1-4234-f5a6-b7c8d9e0f1a2', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Freedom Unlimited Insurance', '19.74', '18000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Chase', '{"insurance":2,"default":1.5}', '21', '0', '0', 'true', null, 'true', 'Visa', '0', null, null, 'Chase Freedom Ins', '12', '9'),

-- Citi Double Cash - 2% Insurance (via Default)
('17a8b9c0-d1e2-4345-f6a7-b8c9d0e1f2a3', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Double Cash Insurance', '27.99', '20000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Citi', '{"insurance":2,"default":2}', '23', '0', '0', 'true', null, 'true', 'Mastercard', '0', null, null, 'Citi Double Ins', '1', '28'),

-- Wells Fargo Active Cash - 2% Insurance
('18a9b0c1-d2e3-4456-f7a8-b9c0d1e2f3a4', '2fc7f500-b6f0-450e-9033-062b638296d3', null, 'Active Cash Insurance', '20.49', '16000.00', '0.00', '0.00', null, null, NOW(), NOW(), 'Wells Fargo', '{"insurance":2,"default":2}', '24', '0', '0', 'true', null, 'true', 'Visa', '0', null, null, 'Wells Fargo Ins', '25', '20');


-- ============================================
-- SUMMARY
-- ============================================
-- Total Cards: 46 cards covering all 14 categories
-- All cards have:
--   - current_balance = 0.00 (grace period available)
--   - paid_in_full_last_month = true
--   - is_manual_entry = true
--   - catalog_id = null
--   - user_id = '2fc7f500-b6f0-450e-9033-062b638296d3'
--
-- Category Coverage:
--   1. Dining: 5 cards (4x-5x multipliers)
--   2. Groceries: 3 cards (5x-6x multipliers)
--   3. Gas: 3 cards (4x-5x multipliers)
--   4. Travel: 3 cards (2x-5x multipliers)
--   5. Entertainment: 2 cards (3x-4x multipliers)
--   6. Streaming: 2 cards (5x-6x multipliers)
--   7. Drugstores: 3 cards (5x multipliers)
--   8. Home Improvement: 3 cards (5x multipliers)
--   9. Department Stores: 3 cards (5x multipliers)
--   10. Transit: 3 cards (2x-3x multipliers)
--   11. Utilities: 2 cards (5x multipliers)
--   12. Warehouse: 3 cards (4x-5x multipliers)
--   13. Office Supplies: 3 cards (5x multipliers)
--   14. Insurance: 3 cards (1.5x-2x multipliers)

