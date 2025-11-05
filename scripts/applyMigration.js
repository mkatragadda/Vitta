/**
 * Apply database migration to add missing columns
 * Run with: node scripts/applyMigration.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function applyMigration() {
  console.log('\n=== Applying Database Migration ===\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Supabase not configured. Check .env.local file.');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const migrations = [
    {
      name: 'annual_fee',
      sql: `
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'user_credit_cards' AND column_name = 'annual_fee'
            ) THEN
                ALTER TABLE user_credit_cards ADD COLUMN annual_fee NUMERIC DEFAULT 0;
            END IF;
        END $$;
      `
    },
    {
      name: 'card_network',
      sql: `
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'user_credit_cards' AND column_name = 'card_network'
            ) THEN
                ALTER TABLE user_credit_cards ADD COLUMN card_network TEXT;
            END IF;
        END $$;
      `
    },
    {
      name: 'reward_structure',
      sql: `
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'user_credit_cards' AND column_name = 'reward_structure'
            ) THEN
                ALTER TABLE user_credit_cards ADD COLUMN reward_structure JSONB;
            END IF;
        END $$;
      `
    },
    {
      name: 'grace_period_days',
      sql: `
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'user_credit_cards' AND column_name = 'grace_period_days'
            ) THEN
                ALTER TABLE user_credit_cards ADD COLUMN grace_period_days INTEGER DEFAULT 25;
            END IF;
        END $$;
      `
    },
    {
      name: 'is_manual_entry',
      sql: `
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'user_credit_cards' AND column_name = 'is_manual_entry'
            ) THEN
                ALTER TABLE user_credit_cards ADD COLUMN is_manual_entry BOOLEAN DEFAULT false;
            END IF;
        END $$;
      `
    },
    {
      name: 'catalog_id',
      sql: `
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'user_credit_cards' AND column_name = 'catalog_id'
            ) THEN
                ALTER TABLE user_credit_cards ADD COLUMN catalog_id UUID REFERENCES card_catalog(id);
            END IF;
        END $$;
      `
    }
  ];

  console.log('Applying migrations...\n');

  for (const migration of migrations) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: migration.sql });

      if (error) {
        // RPC might not exist, try alternative method
        console.log(`⚠ Cannot apply ${migration.name} via RPC (requires Supabase admin access)`);
        console.log(`  Please apply manually via SQL editor`);
      } else {
        console.log(`✓ Applied migration: ${migration.name}`);
      }
    } catch (err) {
      console.log(`⚠ ${migration.name}: ${err.message}`);
    }
  }

  console.log('\n=== Migration Instructions ===\n');
  console.log('Due to Supabase security, migrations must be applied via SQL Editor:');
  console.log('');
  console.log('1. Go to: https://app.supabase.com/project/YOUR_PROJECT/sql/new');
  console.log('2. Copy and paste the contents of: supabase/migrations/add_missing_columns.sql');
  console.log('3. Click "Run" to execute');
  console.log('');
  console.log('Or run each ALTER TABLE command individually.');
  console.log('');
}

applyMigration().catch(console.error);
