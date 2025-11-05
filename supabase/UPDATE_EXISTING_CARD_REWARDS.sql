-- Update existing card with reward structure, network, and issuer
-- This is for cards that were added manually without catalog data

-- Update the "Travel Rewards" card with example data
-- Replace the card_name condition with your actual card name if different
UPDATE user_credit_cards
SET
  card_network = 'Visa',
  issuer = 'Bank of America',
  reward_structure = '{
    "travel": 1.5,
    "all purchases": 1.5
  }'::jsonb
WHERE card_name = 'Travel Rewards'
  AND (card_network IS NULL OR reward_structure IS NULL);

-- To update with different reward structures, use this template:
-- For a card with category bonuses:
/*
UPDATE user_credit_cards
SET
  card_network = 'Mastercard',
  issuer = 'Chase',
  reward_structure = '{
    "dining": 3,
    "groceries": 2,
    "gas": 2,
    "travel": 2,
    "all purchases": 1
  }'::jsonb
WHERE card_name = 'Your Card Name Here';
*/

-- Verify the update
SELECT
  card_name,
  nickname,
  card_network,
  issuer,
  reward_structure
FROM user_credit_cards
WHERE card_name = 'Travel Rewards';
