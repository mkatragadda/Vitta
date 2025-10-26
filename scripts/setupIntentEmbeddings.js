/**
 * Setup Script for Intent Embeddings
 * Run this once to generate and store all intent embeddings in Supabase
 *
 * Usage: node scripts/setupIntentEmbeddings.js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

import { generateAllIntentEmbeddings, verifyIntentEmbeddings } from '../services/embedding/intentEmbeddings.js';

async function main() {
  console.log('='.repeat(60));
  console.log('Intent Embeddings Setup');
  console.log('='.repeat(60));
  console.log('');

  console.log('This script will:');
  console.log('1. Generate embeddings for all intent examples using OpenAI');
  console.log('2. Store embeddings in Supabase (intent_embeddings table)');
  console.log('3. Verify the embeddings were stored correctly');
  console.log('');
  console.log('⚠️  This will make ~60 API calls to OpenAI');
  console.log('   Estimated cost: ~$0.01');
  console.log('   Estimated time: ~10 seconds');
  console.log('');

  // Check if API key is configured
  if (!process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
    console.error('❌ Error: NEXT_PUBLIC_OPENAI_API_KEY not found in environment');
    console.error('   Please add your OpenAI API key to .env.local');
    process.exit(1);
  }

  console.log('Starting in 3 seconds...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  console.log('');

  try {
    // Generate embeddings
    console.log('Step 1: Generating embeddings...');
    const result = await generateAllIntentEmbeddings();

    if (result.success) {
      console.log('');
      console.log('✅ Successfully generated embeddings!');
      console.log(`   Total: ${result.total} embeddings`);
      console.log(`   Intents: ${result.intents} intents`);
      console.log('');

      // Verify
      console.log('Step 2: Verifying embeddings in database...');
      const verification = await verifyIntentEmbeddings();

      if (verification.success) {
        console.log('');
        console.log('✅ Verification complete!');
        console.log('');
        console.log('='.repeat(60));
        console.log('Setup Complete! 🎉');
        console.log('='.repeat(60));
        console.log('');
        console.log('You can now use embedding-based intent detection in your app.');
        console.log('');
      } else {
        console.error('');
        console.error('❌ Verification failed:', verification.error);
        process.exit(1);
      }

    } else {
      console.error('');
      console.error('❌ Failed to generate embeddings:', result.error);
      process.exit(1);
    }

  } catch (error) {
    console.error('');
    console.error('❌ Error during setup:', error);
    console.error('');
    console.error('Troubleshooting:');
    console.error('1. Check your OpenAI API key is valid');
    console.error('2. Verify Supabase connection is working');
    console.error('3. Ensure the intent_embeddings table exists (run migration first)');
    console.error('');
    process.exit(1);
  }
}

main();
