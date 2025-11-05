-- ============================================================================
-- SEED DATA: Credit Card Catalog
-- ============================================================================
-- Generated from: https://github.com/andenacitelli/credit-card-bonuses-api
-- Total cards: 114
-- Generated: 2025-11-04T14:56:24.849Z
--
-- To apply: psql -d your_database -f supabase/seed_cards.sql
-- ============================================================================

-- Clear existing data (optional - comment out if you want to keep existing cards)
-- DELETE FROM card_catalog;


-- Delta SkyMiles Blue
INSERT INTO card_catalog (
  card_name,
  issuer,
  network,
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
  true,
  90
);

-- Hilton Honors Aspire
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
  'Hilton Honors Aspire',
  'American Express',
  'Amex',
  '{"default":1}'::jsonb,
  550,
  '{"value_estimate":1750,"requirement":"Spend $6000 in 180 days"}'::jsonb,
  ARRAY['250 Hilton Resort Credit'],
  ARRAY['travel'],
  'https://offeroptimist.com/images/amex/hilton-honors-aspire.png',
  'https://www.hilton.com/en/hilton-honors/credit-cards/',
  true,
  80
);

-- Hilton Honors Surpass
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
  'Hilton Honors Surpass',
  'American Express',
  'Amex',
  '{"default":1}'::jsonb,
  95,
  '{"value_estimate":1550,"requirement":"Spend $3000 in 180 days"}'::jsonb,
  NULL,
  ARRAY['travel'],
  'https://offeroptimist.com/images/amex/hilton-honors-surpass.jpg',
  'https://www.hilton.com/en/hilton-honors/credit-cards/',
  true,
  90
);

-- Marriott Bonvoy Brilliant
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
  'Marriott Bonvoy Brilliant',
  'American Express',
  'Amex',
  '{"default":1}'::jsonb,
  650,
  '{"value_estimate":1000,"requirement":"Spend $6000 in 180 days"}'::jsonb,
  ARRAY['300 $25/mo Dining Credit'],
  ARRAY['travel'],
  'https://offeroptimist.com/images/amex/marriott-bonvoy-brilliant.webp',
  'https://www.americanexpress.com/us/credit-cards/card/marriott-bonvoy-brilliant/',
  true,
  80
);

-- Platinum
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
  'Platinum',
  'American Express',
  'Amex',
  '{"default":1}'::jsonb,
  895,
  '{"value_estimate":1000,"requirement":"Spend $8000 in 180 days"}'::jsonb,
  ARRAY['100 PreCheck Credit', '850 Lounge Access', '600 Hotel Credit (2x/yr $300)', '250 Misc. Hotel Perks', '200 Marriott/Hilton Gold Status', '100 Avis/Hertz/National Gold Status', '200 $15/mo Uber Cash', '120 Uber One Membership', '200 Airline Fee Credit', '400 Resy Credit ($100/qtr)', '300 Digital Entertainment Credit ($25/mo)', '300 Lululemon Credit', '155 Walmart+ Credit', '100 Saks Credit', '200 Oura Ring Credit', '300 Equinox Credit'],
  ARRAY['general'],
  'https://offeroptimist.com/images/amex/platinum.webp',
  'https://www.americanexpress.com/us/credit-cards/card/platinum/',
  true,
  80
);

-- Platinum (Schwab)
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
  'Platinum (Schwab)',
  'American Express',
  'Amex',
  '{"default":1}'::jsonb,
  895,
  '{"value_estimate":1250,"requirement":"Spend $8000 in 180 days"}'::jsonb,
  ARRAY['100 PreCheck Credit', '850 Lounge Access', '600 Hotel Credit (2x/yr $300)', '250 Misc. Hotel Perks', '200 Marriott/Hilton Gold Status', '100 Avis/Hertz/National Gold Status', '200 $15/mo Uber Cash', '120 Uber One Membership', '200 Airline Fee Credit', '400 Resy Credit ($100/qtr)', '300 Digital Entertainment Credit ($25/mo)', '300 Lululemon Credit', '155 Walmart+ Credit', '100 Saks Credit', '200 Oura Ring Credit', '300 Equinox Credit'],
  ARRAY['general'],
  'https://offeroptimist.com/images/amex/platinum-schwab.webp',
  'https://www.schwab.com/credit-cards#panel--50-media-right-117911',
  true,
  80
);

-- Platinum (Morgan Stanley)
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
  'Platinum (Morgan Stanley)',
  'American Express',
  'Amex',
  '{"default":1}'::jsonb,
  895,
  '{"value_estimate":1250,"requirement":"Spend $8000 in 180 days"}'::jsonb,
  ARRAY['100 PreCheck Credit', '850 Lounge Access', '600 Hotel Credit (2x/yr $300)', '250 Misc. Hotel Perks', '200 Marriott/Hilton Gold Status', '100 Avis/Hertz/National Gold Status', '200 $15/mo Uber Cash', '120 Uber One Membership', '200 Airline Fee Credit', '400 Resy Credit ($100/qtr)', '300 Digital Entertainment Credit ($25/mo)', '300 Lululemon Credit', '155 Walmart+ Credit', '100 Saks Credit', '200 Oura Ring Credit', '300 Equinox Credit'],
  ARRAY['general'],
  'https://offeroptimist.com/images/amex/platinum-morgan-stanley.webp',
  'https://apply.americanexpress.com/amex-morgan-stanley-credit-cards',
  true,
  80
);

-- Marriott Bonvoy Bevy
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
  'Marriott Bonvoy Bevy',
  'American Express',
  'Amex',
  '{"default":1}'::jsonb,
  250,
  '{"value_estimate":850,"requirement":"Spend $7000 in 180 days"}'::jsonb,
  NULL,
  ARRAY['travel'],
  'https://offeroptimist.com/images/amex/marriott-bonvoy-bevy.png',
  'https://www.americanexpress.com/us/credit-cards/card/marriott-bonvoy-bevy/',
  true,
  70
);

-- Schwab Investor
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
  'Schwab Investor',
  'American Express',
  'Amex',
  '{"default":1}'::jsonb,
  0,
  '{"value_estimate":3,"requirement":"Spend $1000 in 90 days"}'::jsonb,
  NULL,
  ARRAY['general'],
  'https://offeroptimist.com/images/amex/schwab-investor.webp',
  'https://www.schwab.com/public/schwab/investing/accounts_products/credit_cards',
  true,
  70
);

-- Air France KLM
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
  'Air France KLM',
  'Bank of America',
  'Mastercard',
  '{"default":1}'::jsonb,
  89,
  '{"value_estimate":500,"requirement":"Spend $2000 in 90 days"}'::jsonb,
  NULL,
  ARRAY['general'],
  'https://offeroptimist.com/images/bankofamerica/air-france-klm.webp',
  'https://wwws.airfrance.us/information/flyingblue/carte-bancaire-partenaire',
  true,
  70
);

-- Customized Cash Rewards
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
  'Customized Cash Rewards',
  'Bank of America',
  'Visa',
  '{"default":1}'::jsonb,
  0,
  '{"value_estimate":2,"requirement":"Spend $1000 in 90 days"}'::jsonb,
  NULL,
  ARRAY['cashback'],
  'https://offeroptimist.com/images/bankofamerica/customized-cash-rewards.jpg',
  'https://www.bankofamerica.com/credit-cards/products/cash-back-credit-card/',
  true,
  70
);

-- Premium Rewards
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
  'Premium Rewards',
  'Bank of America',
  'Visa',
  '{"default":1}'::jsonb,
  95,
  '{"value_estimate":600,"requirement":"Spend $4000 in 90 days"}'::jsonb,
  NULL,
  ARRAY['general'],
  'https://offeroptimist.com/images/bankofamerica/premium-rewards.png',
  'https://www.bankofamerica.com/credit-cards/products/premium-rewards-credit-card/',
  true,
  90
);

-- Premium Rewards Elite
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
  'Premium Rewards Elite',
  'Bank of America',
  'Visa',
  '{"default":1}'::jsonb,
  550,
  '{"value_estimate":750,"requirement":"Spend $5000 in 90 days"}'::jsonb,
  ARRAY['100 PreCheck Credit', '300 Incidental Airline Statement Credits', '150 Annaul $150 streaming, delivery, fitness, and transit credit'],
  ARRAY['general'],
  'https://offeroptimist.com/images/bankofamerica/premium-rewards-elite.png',
  'https://www.bankofamerica.com/credit-cards/products/premium-rewards-elite-credit-card/',
  true,
  80
);

-- Travel Rewards
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
  'Travel Rewards',
  'Bank of America',
  'Visa',
  '{"default":1.5}'::jsonb,
  0,
  '{"value_estimate":250,"requirement":"Spend $1000 in 90 days"}'::jsonb,
  NULL,
  ARRAY['travel'],
  'https://offeroptimist.com/images/bankofamerica/travel-rewards.png',
  'https://www.bankofamerica.com/credit-cards/products/travel-rewards-credit-card/',
  true,
  70
);

-- Unlimited Cash Rewards
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
  'Unlimited Cash Rewards',
  'Bank of America',
  'Visa',
  '{"default":1.5}'::jsonb,
  0,
  '{"value_estimate":2,"requirement":"Spend $1000 in 90 days"}'::jsonb,
  NULL,
  ARRAY['cashback'],
  'https://offeroptimist.com/images/bankofamerica/unlimited-cash-rewards.png',
  'https://www.bankofamerica.com/credit-cards/products/unlimited-cash-back-credit-card/',
  true,
  70
);

-- Free Spirit
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
  'Free Spirit',
  'Bank of America',
  'Mastercard',
  '{"default":1.5}'::jsonb,
  79,
  '{"value_estimate":500,"requirement":"Spend $1000 in 90 days"}'::jsonb,
  ARRAY['100 Companion Flight Voucher'],
  ARRAY['general'],
  'https://offeroptimist.com/images/bankofamerica/free-spirit.webp',
  'https://www.bankofamerica.com/credit-cards/products/spirit-airlines-credit-card/',
  true,
  80
);

-- Atmos Rewards Ascent
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
  'Atmos Rewards Ascent',
  'Bank of America',
  'Visa',
  '{"default":1}'::jsonb,
  95,
  '{"value_estimate":800,"requirement":"Spend $4000 in 120 days"}'::jsonb,
  ARRAY['120 Multiple Checked Bags'],
  ARRAY['general'],
  'https://offeroptimist.com/images/bankofamerica/atmos-rewards-ascent.webp',
  'https://www.alaskaair.com/atmosrewards/content/credit-cards',
  true,
  100
);

-- Atmos Rewards Summit
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
  'Atmos Rewards Summit',
  'Bank of America',
  'Visa',
  '{"default":1}'::jsonb,
  395,
  '{"value_estimate":1000,"requirement":"Spend $6000 in 90 days"}'::jsonb,
  ARRAY['120 Multiple Checked Bags', '100 PreCheck Credit', '300 Lounge Access', '60 Wifi Passes'],
  ARRAY['general'],
  'https://offeroptimist.com/images/bankofamerica/atmos-rewards-summit.webp',
  'https://www.alaskaair.com/atmosrewards/content/credit-cards',
  true,
  80
);

-- AAdvantage Aviator Red World Elite
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
  'AAdvantage Aviator Red World Elite',
  'Barclays',
  'Mastercard',
  '{"default":1}'::jsonb,
  99,
  '{"value_estimate":500,"requirement":"Spend $99 in 90 days"}'::jsonb,
  NULL,
  ARRAY['general'],
  'https://offeroptimist.com/images/barclays/aadvantage-aviator-red-world-elite.png',
  'https://cards.barclaycardus.com/banking/cards/aadvantage-aviator-red-world-elite-mastercard/',
  true,
  70
);

-- AARP Essential Rewards
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
  'AARP Essential Rewards',
  'Barclays',
  'Mastercard',
  '{"default":1}'::jsonb,
  0,
  '{"value_estimate":1,"requirement":"Spend $500 in 90 days"}'::jsonb,
  NULL,
  ARRAY['general'],
  'https://offeroptimist.com/images/barclays/aarp-essential-rewards.png',
  'https://www.aarp.org/membership/benefits/finance/aarp-essential-rewards-mastercard-from-barclays/',
  true,
  70
);

-- AARP Travel Rewards
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
  'AARP Travel Rewards',
  'Barclays',
  'Mastercard',
  '{"default":1}'::jsonb,
  0,
  '{"value_estimate":1,"requirement":"Spend $500 in 90 days"}'::jsonb,
  NULL,
  ARRAY['travel'],
  'https://offeroptimist.com/images/barclays/aarp-travel-rewards.png',
  'https://www.aarp.org/membership/benefits/finance/aarp-travel-rewards-mastercard-from-barclays/',
  true,
  70
);

-- Carnival World Mastercard
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
  'Carnival World Mastercard',
  'Barclays',
  'Mastercard',
  '{"default":1}'::jsonb,
  0,
  '{"value_estimate":200,"requirement":"Spend $1000 in 90 days"}'::jsonb,
  NULL,
  ARRAY['general'],
  'https://offeroptimist.com/images/barclays/carnival-world-mastercard.png',
  'https://cards.barclaycardus.com/banking/cards/carnival-world-mastercard/',
  true,
  70
);

-- Emirates Skywards Premium World Elite
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
  'Emirates Skywards Premium World Elite',
  'Barclays',
  'Mastercard',
  '{"default":1}'::jsonb,
  499,
  '{"value_estimate":700,"requirement":"Spend $3000 in 90 days"}'::jsonb,
  NULL,
  ARRAY['general'],
  'https://offeroptimist.com/images/barclays/emirates-skywards-premium-world-elite.png',
  'https://cards.barclaycardus.com/banking/cards/emirates-skywards-premium-world-elite-mastercard/',
  true,
  70
);

-- Emirates Skywards Rewards World Elite
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
  'Emirates Skywards Rewards World Elite',
  'Barclays',
  'Mastercard',
  '{"default":1}'::jsonb,
  99,
  '{"value_estimate":400,"requirement":"Spend $3000 in 90 days"}'::jsonb,
  NULL,
  ARRAY['general'],
  'https://offeroptimist.com/images/barclays/emirates-skywards-rewards-world-elite.png',
  'https://cards.barclaycardus.com/banking/cards/emirates-skywards-rewards-world-elite-mastercard/',
  true,
  70
);

-- Frontier Airlines World
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
  'Frontier Airlines World',
  'Barclays',
  'Mastercard',
  '{"default":1}'::jsonb,
  89,
  '{"value_estimate":500,"requirement":"Spend $500 in 90 days"}'::jsonb,
  NULL,
  ARRAY['travel'],
  'https://offeroptimist.com/images/barclays/frontier-airlines-world.png',
  'https://cards.barclaycardus.com/banking/cards/frontier-airlines-world-mastercard/',
  true,
  70
);

-- Hawaiian Airlines World Elite
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
  'Hawaiian Airlines World Elite',
  'Barclays',
  'Mastercard',
  '{"default":1}'::jsonb,
  99,
  '{"value_estimate":800,"requirement":"Spend $5000 in 90 days"}'::jsonb,
  NULL,
  ARRAY['travel'],
  'https://offeroptimist.com/images/barclays/hawaiian-airlines-world-elite.png',
  'https://cards.barclaycardus.com/banking/cards/hawaiian-airlines-world-elite-mastercard/',
  true,
  90
);

-- JetBlue
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
  'JetBlue',
  'Barclays',
  'Mastercard',
  '{"default":1}'::jsonb,
  0,
  '{"value_estimate":100,"requirement":"Spend $1000 in 90 days"}'::jsonb,
  NULL,
  ARRAY['general'],
  'https://offeroptimist.com/images/barclays/jetblue.png',
  'https://cards.barclaycardus.com/banking/cards/jetblue-card/',
  true,
  70
);

-- JetBlue Plus
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
  'JetBlue Plus',
  'Barclays',
  'Mastercard',
  '{"default":1}'::jsonb,
  99,
  '{"value_estimate":600,"requirement":"Spend $6000 in 365 days"}'::jsonb,
  NULL,
  ARRAY['general'],
  'https://offeroptimist.com/images/barclays/jetblue-plus.png',
  'https://cards.barclaycardus.com/banking/cards/jetblue-plus-card/',
  true,
  90
);

-- JetBlue Premier
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
  'JetBlue Premier',
  'Barclays',
  'Mastercard',
  '{"default":1}'::jsonb,
  499,
  '{"value_estimate":800,"requirement":"Spend $5000 in 90 days"}'::jsonb,
  ARRAY['100 PreCheck Credit', '300 $300 credit for Paisly, JetBlue''s portal.', '5000 5k yearly anniversary credit'],
  ARRAY['general'],
  'https://offeroptimist.com/images/barclays/jetblue-premier.png',
  'https://cards.barclaycardus.com/banking/cards/jetblue-premier-card/',
  true,
  80
);

-- Lufthansa Miles & More
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
  'Lufthansa Miles & More',
  'Barclays',
  'Mastercard',
  '{"default":1}'::jsonb,
  89,
  '{"value_estimate":500,"requirement":"Spend $3000 in 90 days"}'::jsonb,
  NULL,
  ARRAY['general'],
  'https://offeroptimist.com/images/barclays/lufthansa-miles-and-more.png',
  'https://cards.barclaycardus.com/banking/cards/lufthansa-miles-more-world-elite-mastercard',
  true,
  70
);

-- Upromise
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
  'Upromise',
  'Barclays',
  'Mastercard',
  '{"default":1}'::jsonb,
  0,
  '{"value_estimate":1,"requirement":"Spend $500 in 90 days"}'::jsonb,
  NULL,
  ARRAY['general'],
  'https://offeroptimist.com/images/barclays/upromise.png',
  'https://cards.barclaycardus.com/banking/cards/upromise-world-mastercard/',
  true,
  70
);

-- Wyndham Rewards Earner
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
  'Wyndham Rewards Earner',
  'Barclays',
  'Visa',
  '{"default":1}'::jsonb,
  0,
  '{"value_estimate":300,"requirement":"Spend $1000 in 90 days"}'::jsonb,
  NULL,
  ARRAY['general'],
  'https://offeroptimist.com/images/barclays/wyndham-rewards-earner.svg',
  'https://www.wyndhamrewardscreditcard.com/#earner',
  true,
  70
);

-- Wyndham Rewards Earner Plus
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
  'Wyndham Rewards Earner Plus',
  'Barclays',
  'Visa',
  '{"default":1}'::jsonb,
  75,
  '{"value_estimate":450,"requirement":"Spend $1000 in 90 days"}'::jsonb,
  ARRAY['7500 Anniversary bonus points'],
  ARRAY['general'],
  'https://offeroptimist.com/images/barclays/wyndham-rewards-earner-plus.png',
  'https://www.wyndhamrewardscreditcard.com/#earnerplus',
  true,
  80
);

-- Breeze
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
  'Breeze',
  'Barclays',
  'Visa',
  '{"default":1}'::jsonb,
  89,
  '{"value_estimate":300,"requirement":"Spend $1000 in 90 days"}'::jsonb,
  NULL,
  ARRAY['general'],
  'https://offeroptimist.com/images/barclays/breeze.png',
  'https://cards.barclaycardus.com/banking/cards/breeze-airways/',
  true,
  70
);

-- Xbox
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
  'Xbox',
  'Barclays',
  'Mastercard',
  '{"default":1}'::jsonb,
  0,
  '{"value_estimate":50,"requirement":"Spend $0.01 in 180 days"}'::jsonb,
  NULL,
  ARRAY['general'],
  'https://offeroptimist.com/images/barclays/xbox.png',
  'https://cards.barclaycardus.com/banking/cards/xbox-mastercard/',
  true,
  70
);

-- Marriott Bonvoy Bountiful
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
  'Marriott Bonvoy Bountiful',
  'Chase',
  'Visa',
  '{"default":1}'::jsonb,
  250,
  '{"value_estimate":850,"requirement":"Spend $4000 in 90 days"}'::jsonb,
  NULL,
  ARRAY['travel'],
  'https://offeroptimist.com/images/chase/marriott-bonvoy-bountiful.png',
  'https://creditcards.chase.com/travel-credit-cards/marriott-bonvoy/bountiful',
  true,
  70
);

-- Marriott Bonvoy Bold
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
  'Marriott Bonvoy Bold',
  'Chase',
  'Visa',
  '{"default":1}'::jsonb,
  0,
  '{"value_estimate":600,"requirement":"Spend $1000 in 90 days"}'::jsonb,
  NULL,
  ARRAY['travel'],
  'https://offeroptimist.com/images/chase/marriott-bonvoy-bold.jpeg',
  'https://creditcards.chase.com/travel-credit-cards/marriott-bonvoy/bold',
  true,
  90
);

-- Marriott Bonvoy Boundless
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
  'Marriott Bonvoy Boundless',
  'Chase',
  'Visa',
  '{"default":1}'::jsonb,
  95,
  '{"value_estimate":1250,"requirement":"Spend $3000 in 90 days"}'::jsonb,
  NULL,
  ARRAY['travel'],
  'https://offeroptimist.com/images/chase/marriott-bonvoy-boundless.jpeg',
  'https://creditcards.chase.com/travel-credit-cards/marriott-bonvoy/boundless',
  true,
  90
);

-- Southwest Plus
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
  'Southwest Plus',
  'Chase',
  'Visa',
  '{"travel":2,"default":1}'::jsonb,
  99,
  '{"value_estimate":850,"requirement":"Spend $4000 in 150 days"}'::jsonb,
  ARRAY['100 Free Checked Bag', '3000 Anniversary Points'],
  ARRAY['general'],
  'https://offeroptimist.com/images/chase/southwest-rapid-rewards-plus.png',
  'https://creditcards.chase.com/travel-credit-cards/southwest/plus',
  true,
  100
);

-- Southwest Premier
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
  'Southwest Premier',
  'Chase',
  'Visa',
  '{"travel":2,"default":1}'::jsonb,
  149,
  '{"value_estimate":850,"requirement":"Spend $4000 in 150 days"}'::jsonb,
  ARRAY['100 Free Checked Bag', '6000 Anniversary Points'],
  ARRAY['general'],
  'https://offeroptimist.com/images/chase/southwest-rapid-rewards-premier.png',
  'https://creditcards.chase.com/travel-credit-cards/southwest/premier',
  true,
  80
);

-- Southwest Priority
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
  'Southwest Priority',
  'Chase',
  'Visa',
  '{"travel":2,"default":1}'::jsonb,
  229,
  '{"value_estimate":850,"requirement":"Spend $3000 in 150 days"}'::jsonb,
  ARRAY['100 Free Checked Bag', '7500 Anniversary Points'],
  ARRAY['general'],
  'https://offeroptimist.com/images/chase/southwest-rapid-rewards-priority.png',
  'https://creditcards.chase.com/travel-credit-cards/southwest/priority',
  true,
  80
);

-- United Club
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
  'United Club',
  'Chase',
  'Visa',
  '{"travel":2,"default":1}'::jsonb,
  695,
  '{"value_estimate":800,"requirement":"Spend $5000 in 90 days"}'::jsonb,
  ARRAY['100 PreCheck Credit', '150 2x Checked Bags', '750 United Lounge', '200 United Hotels', '150 Rideshare', '240 Instacart', '100 Avis/Budget'],
  ARRAY['travel'],
  'https://offeroptimist.com/images/chase/united-club-infinite.png',
  'https://www.theexplorercard.com/rewards-cards/club-card',
  true,
  80
);

-- United Explorer
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
  'United Explorer',
  'Chase',
  'Visa',
  '{"travel":2,"default":1}'::jsonb,
  150,
  '{"value_estimate":600,"requirement":"Spend $3000 in 90 days"}'::jsonb,
  ARRAY['100 PreCheck Credit', '100 Free Checked Bag', '100 2x Lounge Pass', '60 Rideshare Credits', '10000 10k award flight discount', '100 United Travel', '100 United Hotels', '50 Avis/Budget', '120 Instacart+'],
  ARRAY['travel'],
  'https://offeroptimist.com/images/chase/united-explorer.png',
  'https://www.theexplorercard.com/rewards-cards/explorer-card',
  true,
  80
);

-- United Gateway
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
  'United Gateway',
  'Chase',
  'Visa',
  '{"travel":2,"default":1}'::jsonb,
  0,
  '{"value_estimate":300,"requirement":"Spend $1000 in 90 days"}'::jsonb,
  NULL,
  ARRAY['travel'],
  'https://offeroptimist.com/images/chase/united-gateway.png',
  'https://www.theexplorercard.com/rewards-cards/gateway-card',
  true,
  70
);

-- United Quest
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
  'United Quest',
  'Chase',
  'Visa',
  '{"travel":2,"default":1}'::jsonb,
  350,
  '{"value_estimate":700,"requirement":"Spend $4000 in 90 days"}'::jsonb,
  ARRAY['200 United Credit', '150 United Hotels', '100 Rideshare', '180 Instacart+', '80 Avis/Budget', '10000 10k award flight discount', '150 2x Checked Bags'],
  ARRAY['travel'],
  'https://offeroptimist.com/images/chase/united-quest.png',
  'https://www.theexplorercard.com/rewards-cards/quest-card',
  true,
  80
);

-- IHG Premier
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
  'IHG Premier',
  'Chase',
  'Mastercard',
  '{"default":1}'::jsonb,
  99,
  '{"value_estimate":1400,"requirement":"Spend $3000 in 90 days"}'::jsonb,
  NULL,
  ARRAY['general'],
  'https://offeroptimist.com/images/chase/ihg-rewards-premier.jpg',
  'https://creditcards.chase.com/travel-credit-cards/ihg-rewards-club/premier',
  true,
  90
);

-- IHG Traveler
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
  'IHG Traveler',
  'Chase',
  'Mastercard',
  '{"default":1}'::jsonb,
  0,
  '{"value_estimate":800,"requirement":"Spend $2000 in 90 days"}'::jsonb,
  NULL,
  ARRAY['travel'],
  'https://offeroptimist.com/images/chase/ihg-rewards-traveler.jpeg',
  'https://creditcards.chase.com/travel-credit-cards/ihg-rewards-club/traveler',
  true,
  90
);

-- Sapphire Preferred
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
  'Sapphire Preferred',
  'Chase',
  'Visa',
  '{"travel":2,"dining":2,"default":1}'::jsonb,
  95,
  '{"value_estimate":750,"requirement":"Spend $5000 in 90 days"}'::jsonb,
  ARRAY['50 Hotel Credit'],
  ARRAY['travel'],
  'https://offeroptimist.com/images/chase/sapphire-preferred.png',
  'https://creditcards.chase.com/rewards-credit-cards/sapphire/preferred',
  true,
  100
);

-- Sapphire Reserve
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
  'Sapphire Reserve',
  'Chase',
  'Visa',
  '{"travel":2,"dining":2,"default":1}'::jsonb,
  795,
  '{"value_estimate":1250,"requirement":"Spend $5000 in 90 days"}'::jsonb,
  ARRAY['100 PreCheck Credit', '300 Travel Credit', '500 Travel Credit (The Edit)', '469 Lounge Access', '300 Dining Credit', '250 Apple TV / Apple Music', '120 Dashpass'],
  ARRAY['travel'],
  'https://offeroptimist.com/images/chase/sapphire-reserve.png',
  'https://creditcards.chase.com/rewards-credit-cards/sapphire/reserve',
  true,
  80
);

-- Aer Lingus Signature
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
  'Aer Lingus Signature',
  'Chase',
  'Visa',
  '{"default":1}'::jsonb,
  95,
  '{"value_estimate":750,"requirement":"Spend $5000 in 90 days"}'::jsonb,
  NULL,
  ARRAY['general'],
  'https://offeroptimist.com/images/chase/aer-lingus-signature.png',
  'https://creditcards.chase.com/travel-credit-cards/avios/aer-lingus',
  true,
  90
);

-- Aeroplan
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
  'Aeroplan',
  'Chase',
  'Mastercard',
  '{"default":1}'::jsonb,
  95,
  '{"value_estimate":750,"requirement":"Spend $4000 in 90 days"}'::jsonb,
  NULL,
  ARRAY['general'],
  'https://offeroptimist.com/images/chase/aeroplan.jpg',
  'https://creditcards.chase.com/travel-credit-cards/aircanada/aeroplan',
  true,
  90
);

-- British Airways Signature
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
  'British Airways Signature',
  'Chase',
  'Visa',
  '{"default":1}'::jsonb,
  95,
  '{"value_estimate":750,"requirement":"Spend $5000 in 90 days"}'::jsonb,
  NULL,
  ARRAY['general'],
  'https://offeroptimist.com/images/chase/british-airways.png',
  'https://creditcards.chase.com/travel-credit-cards/avios/british-airways',
  true,
  90
);

-- Disney Premier
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
  'Disney Premier',
  'Chase',
  'Visa',
  '{"default":1}'::jsonb,
  49,
  '{"value_estimate":3,"requirement":"Spend $1000 in 90 days"}'::jsonb,
  NULL,
  ARRAY['general'],
  'https://offeroptimist.com/images/chase/disney.png',
  'https://creditcards.chase.com/rewards-credit-cards/disney/premier',
  true,
  70
);

-- Disney
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
  'Disney',
  'Chase',
  'Visa',
  '{"default":1}'::jsonb,
  0,
  '{"value_estimate":2,"requirement":"Spend $500 in 90 days"}'::jsonb,
  NULL,
  ARRAY['general'],
  'https://offeroptimist.com/images/chase/disney.png',
  'https://creditcards.chase.com/rewards-credit-cards/disney/rewards',
  true,
  70
);

-- Freedom Flex
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
  'Freedom Flex',
  'Chase',
  'Mastercard',
  '{"default":1}'::jsonb,
  0,
  '{"value_estimate":200,"requirement":"Spend $500 in 90 days"}'::jsonb,
  NULL,
  ARRAY['general'],
  'https://offeroptimist.com/images/chase/freedom-flex.png',
  'https://creditcards.chase.com/cash-back-credit-cards/freedom/flex',
  true,
  70
);

-- Freedom Unlimited
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
  'Freedom Unlimited',
  'Chase',
  'Visa',
  '{"dining":3,"drugstore":3,"default":1.5}'::jsonb,
  0,
  '{"value_estimate":200,"requirement":"Spend $500 in 90 days"}'::jsonb,
  NULL,
  ARRAY['general'],
  'https://offeroptimist.com/images/chase/freedom-unlimited.png',
  'https://creditcards.chase.com/cash-back-credit-cards/freedom/unlimited',
  true,
  70
);

-- Iberia Signature
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
  'Iberia Signature',
  'Chase',
  'Visa',
  '{"default":1}'::jsonb,
  95,
  '{"value_estimate":750,"requirement":"Spend $5000 in 90 days"}'::jsonb,
  NULL,
  ARRAY['general'],
  'https://offeroptimist.com/images/chase/iberia-signature.png',
  'https://creditcards.chase.com/travel-credit-cards/avios/iberia',
  true,
  90
);

-- World of Hyatt
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
  'World of Hyatt',
  'Chase',
  'Visa',
  '{"default":1}'::jsonb,
  95,
  '{"value_estimate":300,"requirement":"Spend $3000 in 90 days"}'::jsonb,
  NULL,
  ARRAY['general'],
  'https://offeroptimist.com/images/chase/world-of-hyatt.png',
  'https://creditcards.chase.com/travel-credit-cards/world-of-hyatt-credit-card',
  true,
  70
);

-- World of Hyatt Business
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
  'World of Hyatt Business',
  'Chase',
  'Visa',
  '{"default":1}'::jsonb,
  199,
  '{"value_estimate":600,"requirement":"Spend $5000 in 90 days"}'::jsonb,
  NULL,
  ARRAY['general'],
  'https://offeroptimist.com/images/chase/world-of-hyatt.png',
  'https://creditcards.chase.com/business-credit-cards/world-of-hyatt/hyatt-business-card',
  true,
  70
);

-- Amazon Prime
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
  'Amazon Prime',
  'Chase',
  'Visa',
  '{"default":1}'::jsonb,
  0,
  '{"value_estimate":2,"requirement":"Spend $0.01 in 365 days"}'::jsonb,
  NULL,
  ARRAY['general'],
  'https://offeroptimist.com/images/chase/amazon-prime.png',
  'https://www.amazon.com/dp/BT00LN946S',
  true,
  70
);

-- Quicksilver
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
  'Quicksilver',
  'Capital One',
  'Visa',
  '{"default":1.5}'::jsonb,
  0,
  '{"value_estimate":2,"requirement":"Spend $500 in 90 days"}'::jsonb,
  NULL,
  ARRAY['general'],
  'https://offeroptimist.com/images/capitalone/quicksilver.webp',
  'https://www.capitalone.com/credit-cards/quicksilver/',
  true,
  70
);

-- Savor
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
  'Savor',
  'Capital One',
  'Visa',
  '{"dining":4,"entertainment":4,"default":1}'::jsonb,
  0,
  '{"value_estimate":2,"requirement":"Spend $500 in 90 days"}'::jsonb,
  NULL,
  ARRAY['dining'],
  'https://offeroptimist.com/images/capitalone/savor.webp',
  'https://www.capitalone.com/credit-cards/savor/',
  true,
  70
);

-- Venture Rewards
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
  'Venture Rewards',
  'Capital One',
  'Visa',
  '{"travel":2,"default":1}'::jsonb,
  95,
  '{"value_estimate":750,"requirement":"Spend $4000 in 90 days"}'::jsonb,
  ARRAY['100 PreCheck Credit', '100 2x Capital One Lounge Visits'],
  ARRAY['travel'],
  'https://offeroptimist.com/images/capitalone/venture-rewards.webp',
  'https://www.capitalone.com/credit-cards/venture/',
  true,
  100
);

-- Venture X
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
  'Venture X',
  'Capital One',
  'Visa',
  '{"travel":2,"default":1}'::jsonb,
  395,
  '{"value_estimate":750,"requirement":"Spend $4000 in 90 days"}'::jsonb,
  ARRAY['100 PreCheck Credit', '300 Travel Credit', '300 Capital One Lounge Access'],
  ARRAY['travel'],
  'https://offeroptimist.com/images/capitalone/venture-x.webp',
  'https://www.capitalone.com/credit-cards/venture-x/',
  true,
  80
);

-- VentureOne
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
  'VentureOne',
  'Capital One',
  'Visa',
  '{"travel":2,"default":1}'::jsonb,
  0,
  '{"value_estimate":200,"requirement":"Spend $500 in 90 days"}'::jsonb,
  NULL,
  ARRAY['travel'],
  'https://offeroptimist.com/images/capitalone/venture-one.webp',
  'https://www.capitalone.com/credit-cards/ventureone/',
  true,
  70
);

-- AAdvantage Executive
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
  'AAdvantage Executive',
  'Citi',
  'Mastercard',
  '{"default":1}'::jsonb,
  595,
  '{"value_estimate":700,"requirement":"Spend $7000 in 90 days"}'::jsonb,
  NULL,
  ARRAY['general'],
  'https://offeroptimist.com/images/citi/aadvantage-executive.webp',
  'https://creditcards.aa.com/citi-executive-card-american-airlines-direct/',
  true,
  70
);

-- AAdvantage MileUp
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
  'AAdvantage MileUp',
  'Citi',
  'Mastercard',
  '{"default":1}'::jsonb,
  0,
  '{"value_estimate":150,"requirement":"Spend $500 in 90 days"}'::jsonb,
  NULL,
  ARRAY['general'],
  'https://offeroptimist.com/images/citi/aadvantage-mileup.webp',
  'https://creditcards.aa.com/citi-mileup-card-american-airlines-direct/',
  true,
  70
);

-- AAdvantage Platinum Select World Elite
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
  'AAdvantage Platinum Select World Elite',
  'Citi',
  'Mastercard',
  '{"default":1}'::jsonb,
  99,
  '{"value_estimate":500,"requirement":"Spend $2500 in 120 days"}'::jsonb,
  NULL,
  ARRAY['general'],
  'https://offeroptimist.com/images/citi/aadvantage-platinum-select.webp',
  'https://creditcards.aa.com/credit-cards/citi-platinum-card-american-airlines-direct/',
  true,
  70
);

-- Double Cash
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
  'Double Cash',
  'Citi',
  'Mastercard',
  '{"default":2}'::jsonb,
  0,
  '{"value_estimate":2,"requirement":"Spend $1500 in 180 days"}'::jsonb,
  NULL,
  ARRAY['cashback'],
  'https://offeroptimist.com/images/citi/double-cash.png',
  'https://www.citi.com/credit-cards/citi-double-cash-credit-card',
  true,
  70
);

-- Custom Cash
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
  'Custom Cash',
  'Citi',
  'Mastercard',
  '{"default":2}'::jsonb,
  0,
  '{"value_estimate":2,"requirement":"Spend $1500 in 180 days"}'::jsonb,
  NULL,
  ARRAY['cashback'],
  'https://offeroptimist.com/images/citi/custom-cash.png',
  'https://www.citi.com/credit-cards/citi-custom-cash-credit-card',
  true,
  70
);

-- Strata Elite
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
  'Strata Elite',
  'Citi',
  'Mastercard',
  '{"default":1.5}'::jsonb,
  595,
  '{"value_estimate":1000,"requirement":"Spend $4000 in 90 days"}'::jsonb,
  ARRAY['100 PreCheck Credit', '469 Lounge Access', '150 American Airlines Lounge Access', '300 Hotel Credit', '200 Splurge Credit (1stDibs, American Airlines, Best Buy, Future Personal Training, Live Nation)', '200 Blacklane Credit'],
  ARRAY['general'],
  'https://offeroptimist.com/images/citi/strata-elite.webp',
  'https://www.citi.com/credit-cards/citi-strata-elite-credit-card',
  true,
  80
);

-- Strata Premier
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
  'Strata Premier',
  'Citi',
  'Mastercard',
  '{"default":2}'::jsonb,
  95,
  '{"value_estimate":600,"requirement":"Spend $4000 in 90 days"}'::jsonb,
  ARRAY['100 Hotel Credit ($500 min purchase)'],
  ARRAY['general'],
  'https://offeroptimist.com/images/citi/strata-premier.png',
  'https://www.citi.com/credit-cards/citi-strata-premier-credit-card',
  true,
  100
);

-- Strata
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
  'Strata',
  'Citi',
  'Mastercard',
  '{"default":2}'::jsonb,
  0,
  '{"value_estimate":300,"requirement":"Spend $1000 in 90 days"}'::jsonb,
  NULL,
  ARRAY['general'],
  'https://offeroptimist.com/images/citi/strata.webp',
  'https://www.citi.com/credit-cards/citi-strata-credit-card',
  true,
  70
);

-- AT&T Points Plus
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
  'AT&T Points Plus',
  'Citi',
  'Mastercard',
  '{"default":1}'::jsonb,
  0,
  '{"value_estimate":2,"requirement":"Spend $1000 in 90 days"}'::jsonb,
  NULL,
  ARRAY['general'],
  'https://offeroptimist.com/images/citi/att-points-plus.jpg',
  'https://www.att.com/deals/att-points-plus-citi/',
  true,
  70
);

-- Discover It
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
  'Discover It',
  'Discover',
  'Discover',
  '{"default":1}'::jsonb,
  0,
  '{"value_estimate":1,"requirement":"Spend $0.01 in 90 days"}'::jsonb,
  NULL,
  ARRAY['general'],
  'https://offeroptimist.com/images/discover/it.webp',
  'https://www.discover.com/credit-cards/',
  true,
  70
);

-- LATAM Airlines
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
  'LATAM Airlines',
  'FIRST',
  'Mastercard',
  '{"default":1}'::jsonb,
  0,
  '{"value_estimate":150,"requirement":"Spend $1000 in 90 days"}'::jsonb,
  NULL,
  ARRAY['travel'],
  'https://offeroptimist.com/images/first/latam-airlines.svg',
  'https://latampass.latam.com/en_us/earn-miles/latam-airlines-credit-cards',
  true,
  70
);

-- LATAM Airlines World Elite
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
  'LATAM Airlines World Elite',
  'FIRST',
  'Mastercard',
  '{"default":1}'::jsonb,
  99,
  '{"value_estimate":400,"requirement":"Spend $3500 in 90 days"}'::jsonb,
  NULL,
  ARRAY['travel'],
  'https://offeroptimist.com/images/first/latam-airlines-world-elite.webp',
  'https://latampass.latam.com/en_us/earn-miles/latam-airlines-credit-cards',
  true,
  70
);

-- Cardless Qatar Signature
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
  'Cardless Qatar Signature',
  'FIRST',
  'Visa',
  '{"default":1}'::jsonb,
  99,
  '{"value_estimate":400,"requirement":"Spend $3000 in 90 days"}'::jsonb,
  NULL,
  ARRAY['general'],
  'https://offeroptimist.com/images/first/cardless-qatar-signature.jpg',
  'https://qatarairways.cardless.com/compare',
  true,
  70
);

-- Cardless Qatar Infinite
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
  'Cardless Qatar Infinite',
  'FIRST',
  'Visa',
  '{"default":1}'::jsonb,
  499,
  '{"value_estimate":500,"requirement":"Spend $5000 in 90 days"}'::jsonb,
  NULL,
  ARRAY['general'],
  'https://offeroptimist.com/images/first/cardless-qatar-infinite.jpg',
  'https://qatarairways.cardless.com/compare',
  true,
  50
);

-- Avianca LifeMiles
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
  'Avianca LifeMiles',
  'FIRST',
  'Amex',
  '{"default":1}'::jsonb,
  99,
  '{"value_estimate":400,"requirement":"Spend $4500 in 90 days"}'::jsonb,
  NULL,
  ARRAY['general'],
  'https://offeroptimist.com/images/first/avianca-lifemiles.webp',
  'https://www.lifemiles.com/discover/landing-page/avianca-lifemiles-creditcard',
  true,
  70
);

-- Avianca LifeMiles Elite
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
  'Avianca LifeMiles Elite',
  'FIRST',
  'Amex',
  '{"default":1}'::jsonb,
  250,
  '{"value_estimate":600,"requirement":"Spend $4500 in 90 days"}'::jsonb,
  NULL,
  ARRAY['general'],
  'https://offeroptimist.com/images/first/avianca-lifemiles-elite.webp',
  'https://www.lifemiles.com/discover/landing-page/avianca-lifemiles-creditcard',
  true,
  70
);

-- Amtrak Guest Rewards
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
  'Amtrak Guest Rewards',
  'FNBO',
  'Mastercard',
  '{"default":1}'::jsonb,
  0,
  '{"value_estimate":120,"requirement":"Spend $1000 in 90 days"}'::jsonb,
  NULL,
  ARRAY['general'],
  'https://offeroptimist.com/images/fnbo/amtrak-guest-rewards.png',
  'https://www.amtrak.com/Apply',
  true,
  70
);

-- Amtrak Guest Rewards Preferred
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
  'Amtrak Guest Rewards Preferred',
  'FNBO',
  'Mastercard',
  '{"default":1}'::jsonb,
  99,
  '{"value_estimate":200,"requirement":"Spend $2000 in 90 days"}'::jsonb,
  NULL,
  ARRAY['travel'],
  'https://offeroptimist.com/images/fnbo/amtrak-guest-rewards-preferred.jpg',
  'https://www.amtrak.com/Apply',
  true,
  70
);

-- Best Western Rewards
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
  'Best Western Rewards',
  'FNBO',
  'Mastercard',
  '{"default":1}'::jsonb,
  0,
  '{"value_estimate":400,"requirement":"Spend $1000 in 90 days"}'::jsonb,
  NULL,
  ARRAY['general'],
  'https://offeroptimist.com/images/fnbo/best-western-rewards.jpg',
  'https://www.bestwestern.com/en_US/offers/hotel-discounts/best-western-rewards-visa.html',
  true,
  70
);

-- Best Western Rewards Premium
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
  'Best Western Rewards Premium',
  'FNBO',
  'Mastercard',
  '{"default":1}'::jsonb,
  89,
  '{"value_estimate":800,"requirement":"Spend $3000 in 90 days"}'::jsonb,
  NULL,
  ARRAY['general'],
  'https://offeroptimist.com/images/fnbo/best-western-rewards-premium.jpg',
  'https://www.bestwestern.com/en_US/offers/hotel-discounts/best-western-rewards-visa.html',
  true,
  90
);

-- Power Cash Rewards
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
  'Power Cash Rewards',
  'PENFED',
  'Visa',
  '{"default":1.5}'::jsonb,
  0,
  '{"value_estimate":1,"requirement":"Spend $1500 in 90 days"}'::jsonb,
  NULL,
  ARRAY['cashback'],
  'https://offeroptimist.com/images/penfed/power-cash-rewards.png',
  'https://www.penfed.org/credit-cards/power-cash-rewards-visa',
  true,
  70
);

-- Platinum Rewards
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
  'Platinum Rewards',
  'PENFED',
  'Visa',
  '{"default":1}'::jsonb,
  0,
  '{"value_estimate":150,"requirement":"Spend $1500 in 90 days"}'::jsonb,
  NULL,
  ARRAY['general'],
  'https://offeroptimist.com/images/penfed/platinum-rewards.webp',
  'https://www.penfed.org/credit-cards/platinum-rewards-visa',
  true,
  70
);

-- Pathfinder
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
  'Pathfinder',
  'PENFED',
  'Visa',
  '{"default":1}'::jsonb,
  95,
  '{"value_estimate":500,"requirement":"Spend $3000 in 90 days"}'::jsonb,
  ARRAY['100 Incidental travel credit (yearly)'],
  ARRAY['general'],
  'https://offeroptimist.com/images/penfed/pathfinder.webp',
  'https://www.penfed.org/credit-cards/pathfinder-rewards',
  true,
  80
);

-- Cathay Pacific
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
  'Cathay Pacific',
  'SYNCHRONY',
  'Visa',
  '{"default":1}'::jsonb,
  99,
  '{"value_estimate":380,"requirement":"Spend $3000 in 90 days"}'::jsonb,
  NULL,
  ARRAY['general'],
  'https://offeroptimist.com/images/synchrony/cathay-pacific.jpg',
  'https://pay.cathaypacific.com/en_US/offers/uscreditcard.html',
  true,
  70
);

-- Virgin Red Rewards
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
  'Virgin Red Rewards',
  'SYNCHRONY',
  'Mastercard',
  '{"default":1}'::jsonb,
  99,
  '{"value_estimate":600,"requirement":"Spend $3000 in 90 days"}'::jsonb,
  NULL,
  ARRAY['general'],
  'https://offeroptimist.com/images/synchrony/virgin-red-rewards.webp',
  'https://www.virgin.com/en-us/virgin-red/rewards-credit-card',
  true,
  90
);

-- Altitude Connect
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
  'Altitude Connect',
  'US Bank',
  'Visa',
  '{"default":2}'::jsonb,
  0,
  '{"value_estimate":200,"requirement":"Spend $1000 in 90 days"}'::jsonb,
  NULL,
  ARRAY['general'],
  'https://offeroptimist.com/images/usbank/altitude-connect.png',
  'https://www.usbank.com/credit-cards/altitude-connect-visa-signature-credit-card.html',
  true,
  70
);

-- Altitude Go
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
  'Altitude Go',
  'US Bank',
  'Visa',
  '{"default":2}'::jsonb,
  0,
  '{"value_estimate":200,"requirement":"Spend $1000 in 90 days"}'::jsonb,
  NULL,
  ARRAY['general'],
  'https://offeroptimist.com/images/usbank/altitude-go.jpg',
  'https://www.usbank.com/credit-cards/altitude-go-visa-signature-credit-card.html',
  true,
  70
);

-- Cash+
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
  'Cash+',
  'US Bank',
  'Visa',
  '{"default":2}'::jsonb,
  0,
  '{"value_estimate":2,"requirement":"Spend $1000 in 90 days"}'::jsonb,
  NULL,
  ARRAY['cashback'],
  'https://offeroptimist.com/images/usbank/cash-plus.jpg',
  'https://www.usbank.com/credit-cards/cash-plus-visa-signature-credit-card.html',
  true,
  70
);

-- Skypass Blue
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
  'Skypass Blue',
  'US Bank',
  'Visa',
  '{"default":1}'::jsonb,
  95,
  '{"value_estimate":100,"requirement":"Spend $1000 in 90 days"}'::jsonb,
  NULL,
  ARRAY['general'],
  'https://offeroptimist.com/images/usbank/skypass.png',
  'https://www.skypassvisa.com/credit/visaSkyBlueCard.do',
  true,
  70
);

-- Skypass
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
  'Skypass',
  'US Bank',
  'Visa',
  '{"default":1}'::jsonb,
  95,
  '{"value_estimate":400,"requirement":"Spend $4000 in 90 days"}'::jsonb,
  ARRAY['50 $50 Korean Air credit'],
  ARRAY['general'],
  'https://offeroptimist.com/images/usbank/skypass.png',
  'https://www.skypassvisa.com/credit/visaSignatureCard.do',
  true,
  80
);

-- Skypass Select
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
  'Skypass Select',
  'US Bank',
  'Visa',
  '{"default":1}'::jsonb,
  450,
  '{"value_estimate":600,"requirement":"Spend $5000 in 90 days"}'::jsonb,
  ARRAY['100 PreCheck Credit', '200 $200 travel credit', '50 Korean Air credit'],
  ARRAY['general'],
  'https://offeroptimist.com/images/usbank/skypass-select.png',
  'https://www.skypassvisa.com/credit/visaSelectCard.do',
  true,
  80
);

-- Shopper Cash Rewards
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
  'Shopper Cash Rewards',
  'US Bank',
  'Visa',
  '{"default":1.5}'::jsonb,
  95,
  '{"value_estimate":3,"requirement":"Spend $2000 in 120 days"}'::jsonb,
  NULL,
  ARRAY['cashback'],
  'https://offeroptimist.com/images/usbank/shopper-cash-rewards.webp',
  'https://www.usbank.com/credit-cards/shopper-cash-rewards-visa-signature-credit-card.html',
  true,
  70
);

-- Active Cash
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
  'Active Cash',
  'Wells Fargo',
  'Visa',
  '{"default":2}'::jsonb,
  0,
  '{"value_estimate":2,"requirement":"Spend $500 in 90 days"}'::jsonb,
  NULL,
  ARRAY['cashback'],
  'https://offeroptimist.com/images/wellsfargo/active-cash.png',
  'https://creditcards.wellsfargo.com/active-cash-credit-card/',
  true,
  70
);

-- Autograph
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
  'Autograph',
  'Wells Fargo',
  'Visa',
  '{"default":2}'::jsonb,
  0,
  '{"value_estimate":200,"requirement":"Spend $1000 in 90 days"}'::jsonb,
  NULL,
  ARRAY['general'],
  'https://offeroptimist.com/images/wellsfargo/autograph.png',
  'https://creditcards.wellsfargo.com/autograph-visa-credit-card',
  true,
  70
);

-- Autograph Journey
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
  'Autograph Journey',
  'Wells Fargo',
  'Visa',
  '{"default":1}'::jsonb,
  95,
  '{"value_estimate":600,"requirement":"Spend $4000 in 90 days"}'::jsonb,
  ARRAY['50 $50 Credit for $50+ Airline Purchase'],
  ARRAY['general'],
  'https://offeroptimist.com/images/wellsfargo/autograph.png',
  'https://creditcards.wellsfargo.com/autograph-journey-visa-credit-card',
  true,
  100
);

-- Choice Privileges
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
  'Choice Privileges',
  'Wells Fargo',
  'Visa',
  '{"default":1}'::jsonb,
  0,
  '{"value_estimate":600,"requirement":"Spend $1000 in 90 days"}'::jsonb,
  NULL,
  ARRAY['general'],
  'https://offeroptimist.com/images/wellsfargo/choice-privileges.png',
  'https://creditcards.wellsfargo.com/wells-fargo-choice-privileges-credit-cards',
  true,
  90
);

-- Choice Privileges Select
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
  'Choice Privileges Select',
  'Wells Fargo',
  'Visa',
  '{"default":1}'::jsonb,
  95,
  '{"value_estimate":600,"requirement":"Spend $3000 in 90 days"}'::jsonb,
  NULL,
  ARRAY['general'],
  'https://offeroptimist.com/images/wellsfargo/choice-privileges-select.png',
  'https://creditcards.wellsfargo.com/wells-fargo-choice-privileges-credit-cards',
  true,
  90
);

-- Expedia One Key
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
  'Expedia One Key',
  'Wells Fargo',
  'Mastercard',
  '{"default":1.5}'::jsonb,
  0,
  '{"value_estimate":4,"requirement":"Spend $1000 in 90 days"}'::jsonb,
  NULL,
  ARRAY['general'],
  'https://offeroptimist.com/images/wellsfargo/one-key.png',
  'https://www.expedia.com/one-key-cards',
  true,
  70
);

-- Expedia One Key+
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
  'Expedia One Key+',
  'Wells Fargo',
  'Mastercard',
  '{"default":2}'::jsonb,
  99,
  '{"value_estimate":6,"requirement":"Spend $3000 in 90 days"}'::jsonb,
  ARRAY['100 PreCheck Credit', '100 $100 anniversary bonus'],
  ARRAY['general'],
  'https://offeroptimist.com/images/wellsfargo/one-key.png',
  'https://www.expedia.com/one-key-cards',
  true,
  80
);

-- Gemini
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
  'Gemini',
  'WEB_BANK',
  'Mastercard',
  '{"default":1}'::jsonb,
  0,
  '{"value_estimate":2,"requirement":"Spend $3000 in 90 days"}'::jsonb,
  NULL,
  ARRAY['general'],
  'https://offeroptimist.com/images/web-bank/gemini.webp',
  'https://www.gemini.com/credit-card',
  true,
  70
);