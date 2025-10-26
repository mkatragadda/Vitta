/**
 * Intent Embeddings Generator
 * Generates and stores embeddings for all intent examples
 */

import { getEmbedding } from './embeddingService.js';
import { supabase } from '../../config/supabase.js';

// Example queries for each intent (diverse phrasing to improve matching)
export const INTENT_EXAMPLES = {
  query_card_data: [
    "what cards do I have",
    "show my cards",
    "list cards",
    "list my cards",
    "list all my credit cards",
    "show my balance",
    "what's my total balance",
    "which card has the lowest APR",
    "show me my highest interest card",
    "when is my payment due",
    "when do I need to pay",
    "what's my credit utilization",
    "how much credit am I using",
    "best card for groceries",
    "which card should I use at Costco",
    "recommend a card for Target",
    "show available credit",
    "how much can I spend",
    "what's my credit limit",
    "show payment amounts",
    "how much do I owe"
  ],
  add_card: [
    "add new card",
    "I want to add a credit card",
    "create new card",
    "add a card to my wallet",
    "register a new credit card",
    "I got a new card"
  ],
  remove_card: [
    "delete this card",
    "remove my Chase card",
    "get rid of this card",
    "remove card from wallet",
    "delete my credit card",
    "I want to remove a card"
  ],
  split_payment: [
    "split $1500 between cards",
    "distribute my budget",
    "allocate 2000 across all cards",
    "divide payment between cards",
    "how should I split 1000",
    "optimize payment of $800"
  ],
  navigate_screen: [
    "take me to my wallet",
    "open payment optimizer",
    "show dashboard",
    "go to cards",
    "navigate to expense feed",
    "open my wallet",
    "show payment screen"
  ],
  help: [
    "what can you do",
    "help me",
    "show features",
    "what are your capabilities",
    "how can you help",
    "what commands do you know"
  ]
};

/**
 * Generate embeddings for all intent examples and store in database
 * This should be run once during setup or when intents change
 */
export async function generateAllIntentEmbeddings() {
  console.log('[IntentEmbeddings] Starting to generate embeddings for all intents...');

  const allEmbeddings = [];
  let totalGenerated = 0;

  for (const [intentId, examples] of Object.entries(INTENT_EXAMPLES)) {
    console.log(`[IntentEmbeddings] Processing intent: ${intentId} (${examples.length} examples)`);

    for (const example of examples) {
      try {
        // Generate embedding
        const embedding = await getEmbedding(example);

        // Prepare data for insertion
        allEmbeddings.push({
          intent_id: intentId,
          intent_name: formatIntentName(intentId),
          example_query: example,
          embedding: embedding
        });

        totalGenerated++;
        console.log(`[IntentEmbeddings] Generated ${totalGenerated}/${getTotalExamples()}`);

        // Delay to avoid rate limiting (500ms between requests)
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`[IntentEmbeddings] Error generating embedding for "${example}":`, error);
      }
    }
  }

  // Store all embeddings in database
  if (allEmbeddings.length > 0) {
    console.log(`[IntentEmbeddings] Storing ${allEmbeddings.length} embeddings in database...`);

    // Clear existing embeddings first
    const { error: deleteError } = await supabase
      .from('intent_embeddings')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteError) {
      console.error('[IntentEmbeddings] Error clearing old embeddings:', deleteError);
    }

    // Insert new embeddings in batches of 100
    const batchSize = 100;
    for (let i = 0; i < allEmbeddings.length; i += batchSize) {
      const batch = allEmbeddings.slice(i, i + batchSize);
      const { error } = await supabase
        .from('intent_embeddings')
        .insert(batch);

      if (error) {
        console.error('[IntentEmbeddings] Error inserting batch:', error);
      } else {
        console.log(`[IntentEmbeddings] Inserted batch ${Math.floor(i / batchSize) + 1}`);
      }
    }

    console.log('[IntentEmbeddings] ✅ Successfully generated and stored all embeddings!');
    return {
      success: true,
      total: allEmbeddings.length,
      intents: Object.keys(INTENT_EXAMPLES).length
    };
  }

  return {
    success: false,
    total: 0,
    error: 'No embeddings generated'
  };
}

/**
 * Format intent ID to human-readable name
 */
function formatIntentName(intentId) {
  return intentId
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get total number of examples across all intents
 */
function getTotalExamples() {
  return Object.values(INTENT_EXAMPLES).reduce((sum, examples) => sum + examples.length, 0);
}

/**
 * Verify embeddings are stored correctly
 */
export async function verifyIntentEmbeddings() {
  const { data, error, count } = await supabase
    .from('intent_embeddings')
    .select('*', { count: 'exact' });

  if (error) {
    console.error('[IntentEmbeddings] Error verifying embeddings:', error);
    return { success: false, error };
  }

  console.log('[IntentEmbeddings] Verification results:');
  console.log(`- Total embeddings: ${count}`);
  console.log(`- Unique intents: ${new Set(data.map(d => d.intent_id)).size}`);

  // Group by intent
  const byIntent = {};
  data.forEach(row => {
    if (!byIntent[row.intent_id]) byIntent[row.intent_id] = 0;
    byIntent[row.intent_id]++;
  });

  console.log('- Breakdown by intent:');
  Object.entries(byIntent).forEach(([intent, count]) => {
    console.log(`  ${intent}: ${count} examples`);
  });

  return {
    success: true,
    total: count,
    byIntent
  };
}
