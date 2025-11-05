/**
 * Test script to verify card catalog database connection
 * Run with: node scripts/testCardCatalog.js
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

async function testCardCatalog() {
  console.log('\n=== Testing Card Catalog Connection ===\n');

  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log('Supabase URL:', supabaseUrl ? '✓ Configured' : '✗ Missing');
  console.log('Supabase Key:', supabaseAnonKey ? '✓ Configured' : '✗ Missing');

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('\n❌ Supabase not configured. Check .env.local file.');
    return;
  }

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    // Test 1: Count total cards
    console.log('\nTest 1: Counting cards in catalog...');
    const { data: countData, error: countError, count } = await supabase
      .from('card_catalog')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error counting cards:', countError.message);
    } else {
      console.log(`✓ Found ${count} cards in catalog`);
    }

    // Test 2: Fetch top 5 cards
    console.log('\nTest 2: Fetching top 5 cards...');
    const { data: cards, error: fetchError } = await supabase
      .from('card_catalog')
      .select('id, card_name, issuer, image_url, annual_fee, is_active')
      .eq('is_active', true)
      .order('popularity_score', { ascending: false })
      .limit(5);

    if (fetchError) {
      console.error('❌ Error fetching cards:', fetchError.message);
    } else if (!cards || cards.length === 0) {
      console.log('⚠ No cards found in catalog. Database may be empty.');
      console.log('\nTo populate the database, run:');
      console.log('psql -h [your-supabase-host] -U postgres -d postgres -f supabase/schema.sql');
    } else {
      console.log(`✓ Successfully fetched ${cards.length} cards:\n`);
      cards.forEach((card, idx) => {
        console.log(`${idx + 1}. ${card.card_name} (${card.issuer})`);
        console.log(`   - ID: ${card.id}`);
        console.log(`   - Annual Fee: $${card.annual_fee || 0}`);
        console.log(`   - Image URL: ${card.image_url || 'Not set'}`);
        console.log(`   - Active: ${card.is_active ? 'Yes' : 'No'}`);
        console.log('');
      });
    }

    // Test 3: Check for cards with images
    console.log('\nTest 3: Checking cards with images...');
    const { data: cardsWithImages, error: imageError } = await supabase
      .from('card_catalog')
      .select('card_name, image_url')
      .not('image_url', 'is', null)
      .neq('image_url', '')
      .limit(5);

    if (imageError) {
      console.error('❌ Error checking images:', imageError.message);
    } else if (!cardsWithImages || cardsWithImages.length === 0) {
      console.log('⚠ No cards have image URLs set');
      console.log('  Add image URLs to card_catalog.image_url for better display');
    } else {
      console.log(`✓ Found ${cardsWithImages.length} cards with images:`);
      cardsWithImages.forEach(card => {
        console.log(`   - ${card.card_name}: ${card.image_url}`);
      });
    }

    console.log('\n=== Test Complete ===\n');

  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
    console.error(error);
  }
}

// Run the test
testCardCatalog().catch(console.error);
