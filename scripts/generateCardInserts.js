/**
 * Generate SQL INSERT statements from credit card CSV data
 * Run with: node scripts/generateCardInserts.js
 */

const fs = require('fs');
const path = require('path');

// Parse CSV line (handles quoted fields with commas)
function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}

// Map issuer names
function normalizeIssuer(issuer) {
  const mapping = {
    'AMERICAN_EXPRESS': 'American Express',
    'CHASE': 'Chase',
    'BANK_OF_AMERICA': 'Bank of America',
    'BARCLAYS': 'Barclays',
    'CAPITAL_ONE': 'Capital One',
    'CITI': 'Citi',
    'DISCOVER': 'Discover',
    'US_BANK': 'US Bank',
    'WELLS_FARGO': 'Wells Fargo'
  };
  return mapping[issuer] || issuer;
}

// Map network names
function normalizeNetwork(network) {
  const mapping = {
    'AMERICAN_EXPRESS': 'Amex',
    'VISA': 'Visa',
    'MASTERCARD': 'Mastercard',
    'DISCOVER': 'Discover'
  };
  return mapping[network] || network;
}

// Determine categories based on card name and currency
function determineCategories(name, currency, isBusiness) {
  const categories = [];
  const lowerName = name.toLowerCase();

  if (isBusiness === 'true') categories.push('business');
  if (lowerName.includes('travel') || lowerName.includes('venture')) categories.push('travel');
  if (lowerName.includes('sapphire') || lowerName.includes('preferred')) categories.push('travel');
  if (lowerName.includes('cash') || lowerName.includes('cashback')) categories.push('cashback');
  if (lowerName.includes('dining') || lowerName.includes('savor')) categories.push('dining');
  if (currency === 'DELTA' || currency === 'UNITED' || lowerName.includes('airline')) categories.push('travel');
  if (lowerName.includes('hotel') || lowerName.includes('marriott') || lowerName.includes('hilton')) categories.push('travel');

  return categories.length > 0 ? categories : ['general'];
}

// Parse credits into benefits array
function parseCredits(credits) {
  if (!credits) return [];
  return credits.split(';').map(c => c.trim()).filter(c => c);
}

// Escape single quotes for SQL
function sqlEscape(str) {
  if (!str) return null;
  return str.replace(/'/g, "''");
}

// Generate SQL INSERT statement
function generateInsert(card, index) {
  const cardName = sqlEscape(card.name);
  const issuer = sqlEscape(normalizeIssuer(card.issuer));
  const network = normalizeNetwork(card.network);
  const annualFee = card.annualFee || 0;
  const categories = determineCategories(card.name, card.currency, card.isBusiness);
  const benefits = parseCredits(card.credits);
  const imageUrl = sqlEscape(card.imageUrl);
  const applicationUrl = sqlEscape(card.url);

  // Parse sign-up bonus
  const hasBonus = card.offerAmount && parseInt(card.offerAmount) > 0;
  const signUpBonus = hasBonus ? {
    value_estimate: Math.round(parseInt(card.offerAmount) * 0.01), // Rough conversion: points to dollars
    requirement: card.offerSpend ? `Spend $${card.offerSpend} in ${card.offerDays || 90} days` : null
  } : null;

  // Determine basic reward structure based on card type
  const rewardStructure = determineRewardStructure(card.name, card.universalCashbackPercent);

  // Calculate popularity score (higher for lower fees, higher bonuses)
  let popularityScore = 50;
  if (annualFee === 0) popularityScore += 30;
  else if (annualFee < 100) popularityScore += 20;
  if (hasBonus && parseInt(card.offerAmount) > 50000) popularityScore += 20;
  if (benefits.length > 0) popularityScore += 10;

  return `
-- ${card.name}
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
  '${cardName}',
  '${issuer}',
  '${network}',
  '${JSON.stringify(rewardStructure)}'::jsonb,
  ${annualFee},
  ${signUpBonus ? `'${JSON.stringify(signUpBonus)}'::jsonb` : 'NULL'},
  ${benefits.length > 0 ? `ARRAY[${benefits.map(b => `'${sqlEscape(b)}'`).join(', ')}]` : 'NULL'},
  ARRAY[${categories.map(c => `'${c}'`).join(', ')}],
  ${imageUrl ? `'${imageUrl}'` : 'NULL'},
  ${applicationUrl ? `'${applicationUrl}'` : 'NULL'},
  ${card.discontinued === 'true' ? 'false' : 'true'},
  ${popularityScore}
);`;
}

// Determine reward structure based on card name
function determineRewardStructure(name, universalCashback) {
  const lowerName = name.toLowerCase();
  const baseRate = parseFloat(universalCashback) || 1;

  // Travel cards
  if (lowerName.includes('sapphire')) {
    return { travel: 2, dining: 2, default: 1 };
  }
  if (lowerName.includes('venture')) {
    return { travel: 2, default: 1 };
  }
  if (lowerName.includes('delta') || lowerName.includes('united') || lowerName.includes('southwest')) {
    return { travel: 2, default: 1 };
  }

  // Dining cards
  if (lowerName.includes('savor')) {
    return { dining: 4, entertainment: 4, default: 1 };
  }
  if (lowerName.includes('gold')) {
    return { dining: 4, groceries: 4, default: 1 };
  }

  // Cashback cards
  if (lowerName.includes('double cash')) {
    return { default: 2 };
  }
  if (lowerName.includes('blue cash preferred')) {
    return { groceries: 6, streaming: 6, gas: 3, default: 1 };
  }
  if (lowerName.includes('blue cash')) {
    return { groceries: 3, gas: 2, default: 1 };
  }
  if (lowerName.includes('freedom unlimited')) {
    return { dining: 3, drugstore: 3, default: 1.5 };
  }
  if (lowerName.includes('quicksilver')) {
    return { default: 1.5 };
  }

  // Default based on universal cashback
  return { default: baseRate };
}

async function main() {
  console.log('Reading CSV file...');
  const csvPath = '/tmp/cards.csv';

  if (!fs.existsSync(csvPath)) {
    console.error('CSV file not found. Please download it first:');
    console.error('curl -s "https://raw.githubusercontent.com/andenacitelli/credit-card-bonuses-api/main/exports/data.csv" -o /tmp/cards.csv');
    process.exit(1);
  }

  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  // Parse header
  const headers = parseCSVLine(lines[0]);
  console.log(`Found ${headers.length} columns`);

  // Parse cards (skip duplicates by cardId)
  const cardsMap = new Map();
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    if (fields.length !== headers.length) continue;

    const card = {};
    headers.forEach((header, idx) => {
      card[header] = fields[idx];
    });

    // Skip if we already have this card (based on cardId)
    if (!cardsMap.has(card.cardId)) {
      cardsMap.set(card.cardId, card);
    }
  }

  const uniqueCards = Array.from(cardsMap.values());
  console.log(`Found ${uniqueCards.length} unique cards`);

  // Filter out discontinued cards and business cards for personal wallet
  const activePersonalCards = uniqueCards.filter(card =>
    card.discontinued !== 'true' && card.isBusiness === 'false'
  );
  console.log(`Filtered to ${activePersonalCards.length} active personal cards`);

  // Generate SQL
  const sql = activePersonalCards.map((card, idx) => generateInsert(card, idx)).join('\n');

  // Write to file
  const outputPath = path.join(__dirname, '..', 'supabase', 'seed_cards.sql');
  const header = `-- ============================================================================
-- SEED DATA: Credit Card Catalog
-- ============================================================================
-- Generated from: https://github.com/andenacitelli/credit-card-bonuses-api
-- Total cards: ${activePersonalCards.length}
-- Generated: ${new Date().toISOString()}
--
-- To apply: psql -d your_database -f supabase/seed_cards.sql
-- ============================================================================

-- Clear existing data (optional - comment out if you want to keep existing cards)
-- DELETE FROM card_catalog;

`;

  fs.writeFileSync(outputPath, header + sql);
  console.log(`\n✓ Generated SQL file: ${outputPath}`);
  console.log(`✓ Total cards: ${activePersonalCards.length}`);
  console.log('\nTo apply to your database:');
  console.log('psql -h your-supabase-host -U postgres -d postgres -f supabase/seed_cards.sql');
}

main().catch(console.error);
