/**
 * Load credit cards directly to Supabase database
 * Run with: node scripts/loadCardsToDatabase.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

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

// Determine categories
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
  if (!credits) return null;
  return credits.split(';').map(c => c.trim()).filter(c => c);
}

// Determine reward structure
function determineRewardStructure(name, universalCashback) {
  const lowerName = name.toLowerCase();
  const baseRate = parseFloat(universalCashback) || 1;

  if (lowerName.includes('sapphire')) return { travel: 2, dining: 2, default: 1 };
  if (lowerName.includes('venture')) return { travel: 2, default: 1 };
  if (lowerName.includes('delta') || lowerName.includes('united') || lowerName.includes('southwest')) return { travel: 2, default: 1 };
  if (lowerName.includes('savor')) return { dining: 4, entertainment: 4, default: 1 };
  if (lowerName.includes('gold')) return { dining: 4, groceries: 4, default: 1 };
  if (lowerName.includes('double cash')) return { default: 2 };
  if (lowerName.includes('blue cash preferred')) return { groceries: 6, streaming: 6, gas: 3, default: 1 };
  if (lowerName.includes('blue cash')) return { groceries: 3, gas: 2, default: 1 };
  if (lowerName.includes('freedom unlimited')) return { dining: 3, drugstore: 3, default: 1.5 };
  if (lowerName.includes('quicksilver')) return { default: 1.5 };

  return { default: baseRate };
}

// Convert CSV row to card object
function csvToCardObject(csvCard) {
  const annualFee = parseFloat(csvCard.annualFee) || 0;
  const hasBonus = csvCard.offerAmount && parseInt(csvCard.offerAmount) > 0;
  const benefits = parseCredits(csvCard.credits);

  // Calculate popularity score
  let popularityScore = 50;
  if (annualFee === 0) popularityScore += 30;
  else if (annualFee < 100) popularityScore += 20;
  if (hasBonus && parseInt(csvCard.offerAmount) > 50000) popularityScore += 20;
  if (benefits && benefits.length > 0) popularityScore += 10;

  return {
    card_name: csvCard.name,
    issuer: normalizeIssuer(csvCard.issuer),
    network: normalizeNetwork(csvCard.network),
    reward_structure: determineRewardStructure(csvCard.name, csvCard.universalCashbackPercent),
    annual_fee: annualFee,
    sign_up_bonus: hasBonus ? {
      value_estimate: Math.round(parseInt(csvCard.offerAmount) * 0.01),
      requirement: csvCard.offerSpend ? `Spend $${csvCard.offerSpend} in ${csvCard.offerDays || 90} days` : null
    } : null,
    benefits: benefits,
    category: determineCategories(csvCard.name, csvCard.currency, csvCard.isBusiness),
    image_url: csvCard.imageUrl || null,
    application_url: csvCard.url || null,
    is_active: csvCard.discontinued !== 'true',
    popularity_score: popularityScore
  };
}

async function main() {
  console.log('\n=== Loading Cards to Supabase ===\n');

  // Check Supabase configuration
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Supabase not configured. Check .env.local file.');
    return;
  }

  console.log('✓ Supabase configured');

  // Create client
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Read CSV
  const csvPath = '/tmp/cards.csv';
  if (!fs.existsSync(csvPath)) {
    console.error('❌ CSV file not found at /tmp/cards.csv');
    console.error('Run: curl -s "https://raw.githubusercontent.com/andenacitelli/credit-card-bonuses-api/main/exports/data.csv" -o /tmp/cards.csv');
    return;
  }

  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  // Parse CSV
  const headers = parseCSVLine(lines[0]);
  const cardsMap = new Map();

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    if (fields.length !== headers.length) continue;

    const card = {};
    headers.forEach((header, idx) => {
      card[header] = fields[idx];
    });

    if (!cardsMap.has(card.cardId)) {
      cardsMap.set(card.cardId, card);
    }
  }

  const uniqueCards = Array.from(cardsMap.values());
  const activePersonalCards = uniqueCards.filter(card =>
    card.discontinued !== 'true' && card.isBusiness === 'false'
  );

  console.log(`✓ Parsed ${activePersonalCards.length} active personal cards\n`);

  // Convert to card objects
  const cardObjects = activePersonalCards.map(csvToCardObject);

  // Delete existing cards (optional)
  console.log('Clearing existing cards...');
  const { error: deleteError } = await supabase
    .from('card_catalog')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (deleteError) {
    console.log('⚠ Could not clear existing cards:', deleteError.message);
  } else {
    console.log('✓ Cleared existing cards\n');
  }

  // Insert in batches of 50
  const batchSize = 50;
  let inserted = 0;
  let failed = 0;

  console.log('Inserting cards...');
  for (let i = 0; i < cardObjects.length; i += batchSize) {
    const batch = cardObjects.slice(i, i + batchSize);

    const { data, error } = await supabase
      .from('card_catalog')
      .insert(batch)
      .select();

    if (error) {
      console.error(`❌ Batch ${Math.floor(i / batchSize) + 1} failed:`, error.message);
      failed += batch.length;
    } else {
      inserted += data.length;
      process.stdout.write(`\r✓ Inserted ${inserted}/${cardObjects.length} cards...`);
    }
  }

  console.log('\n\n=== Summary ===');
  console.log(`✓ Successfully inserted: ${inserted} cards`);
  if (failed > 0) {
    console.log(`❌ Failed: ${failed} cards`);
  }

  // Show sample cards
  console.log('\n=== Sample Cards Loaded ===');
  const { data: sampleCards } = await supabase
    .from('card_catalog')
    .select('card_name, issuer, annual_fee, image_url')
    .limit(5);

  if (sampleCards) {
    sampleCards.forEach((card, idx) => {
      console.log(`${idx + 1}. ${card.card_name} (${card.issuer}) - $${card.annual_fee}/yr`);
      console.log(`   Image: ${card.image_url ? '✓' : '✗'}`);
    });
  }

  console.log('\n✓ Complete!\n');
}

main().catch(console.error);
