/**
 * Check current database schema
 * Run with: node scripts/checkDatabaseSchema.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function main() {
  console.log('\n=== Checking Database Schema ===\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Supabase not configured');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Try to get one row to see the schema
  const { data, error } = await supabase
    .from('card_catalog')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log('⚠ Table is empty, cannot determine schema');
    return;
  }

  console.log('Current card_catalog columns:');
  console.log(Object.keys(data[0]).join(', '));
  console.log('\nSample row:');
  console.log(JSON.stringify(data[0], null, 2));
}

main().catch(console.error);
