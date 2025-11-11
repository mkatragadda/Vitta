/**
 * Intent Embeddings Generator
 * Generates and stores embeddings for all intent examples
 */

import { getEmbedding } from './embeddingService.js';
import { supabase } from '../../config/supabase.js';

/**
 * Intent Category Mapping
 * Maps high-level categories to specific intents for hierarchical classification
 */
export const INTENT_CATEGORIES = {
  TASK: [
    'card_recommendation',
    'query_card_data',
    'split_payment',
    'add_card',
    'remove_card',
    'navigate_screen',
    'remember_memory',
    'recall_memory',
    'reminder_settings'
  ],
  GUIDANCE: [
    'debt_guidance',
    'money_coaching',
    'help'
  ],
  CHAT: [
    'chit_chat'
  ]
};

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
    "show available credit",
    "how much can I spend",
    "what's my credit limit",
    "show payment amounts",
    "how much do I owe",
    "what's my balance on Chase",
    "show me all card balances",
    "list my payment due dates"
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
  ],
  card_recommendation: [
    // Merchant-specific
    "which card should I use at Costco",
    "best card for Target",
    "what card for Whole Foods",
    "recommend card for Amazon",
    "which card at Starbucks",

    // Category-based
    "best card for groceries",
    "which card for dining",
    "best card for gas",
    "card for travel",
    "which card for online shopping",

    // Rewards optimization
    "maximize rewards for this purchase",
    "which card earns most points at Walmart",
    "best cashback card for gas",
    "maximize cashback at restaurants",
    "earn most rewards on this transaction",
    "get most points for this purchase",

    // APR/Interest minimization (purchase-specific)
    "which card has lowest interest for this purchase",
    "avoid interest on this transaction",
    "cheapest card to use at Target",
    "lowest interest rate card for shopping",

    // Cash flow optimization (purchase-specific)
    "which card has longest grace period for this purchase",
    "maximize float for this transaction",
    "delay payment the longest for this purchase",
    "which card payment is furthest out for this",
    "best card for payment timing on this purchase",

    // Purchase-specific with amounts
    "best card for $500 purchase",
    "which card for $200 at Target",
    "recommend card for $1000 expense",

    // Comparison requests
    "compare all strategies for this purchase",
    "show all options for this purchase",
    "which card is best for this transaction",
    "compare rewards vs interest for this purchase",

    // General recommendation (purchase-focused)
    "which card should I use for this",
    "recommend a card for this purchase",
    "help me choose a card for shopping",
    "what card to use at the store",
    "best card to use right now for this"
  ],
  reminder_settings: [
    "mute all reminders",
    "pause payment notifications",
    "stop reminding me about payments",
    "silence payment reminders",
    "pause reminders for a week",
    "resume reminders",
    "turn payment reminders back on",
    "show my reminder schedule",
    "list my upcoming reminders",
    "unmute payment notifications"
  ],
  remember_memory: [
    "remember $80 for danny's birthday gift tag gifts",
    "save a note about paying $45 cash for lunch tag dining",
    "remember to check travel deals on friday tag travel",
    "remember i paid $120 cash to bob for supplies tag expenses",
    "save that my goal is to keep balances under 500 tag goals",
    "remember i paid daycare 400 tag childcare",
    "tag my purchase of 200 dollars for groceries",
    "tag my walmart expense as household supplies"
  ],
  recall_memory: [
    "show memories tagged gifts",
    "what did i tag as dining this month",
    "recall notes tagged travel",
    "list expenses tagged childcare",
    "what memories are tagged goals",
    "tell me what i tagged supplies last week"
  ],

  debt_guidance: [
    // General debt reduction
    "how to reduce my debt",
    "how can I pay off my credit card debt",
    "best way to eliminate debt",
    "strategies to pay down balances",
    "help me get out of debt",
    "how to become debt free",
    "reduce my credit card balances",

    // Payment strategies
    "should I use avalanche or snowball method",
    "what's the best debt payoff strategy",
    "how to prioritize debt payments",
    "which balance should I pay first",
    "how to pay off debt faster",
    "accelerate debt payoff",

    // Interest reduction
    "how to minimize interest charges",
    "reduce interest on my balances",
    "save money on interest",
    "lower my interest payments",
    "stop paying so much interest",

    // Budget allocation
    "how should I allocate my payment budget",
    "distribute payments across cards",
    "optimize my monthly payments",
    "best way to split payment budget",

    // Debt consolidation
    "should I consolidate my debt",
    "debt consolidation options",
    "combine credit card balances",

    // General financial stress
    "overwhelmed by credit card debt",
    "too much debt what should I do",
    "drowning in credit card payments",
    "can't keep up with payments",

    // Payoff timeline
    "how long to pay off my debt",
    "when will I be debt free",
    "calculate debt payoff timeline",
    "how many months to clear balances"
  ],

  money_coaching: [
    // Credit score
    "how to improve my credit score",
    "what affects credit score",
    "boost my credit rating",
    "credit score tips",
    "why is my credit score low",
    "increase credit score fast",

    // Utilization
    "what is credit utilization",
    "how does utilization affect credit",
    "keep utilization low",
    "utilization ratio explained",
    "why is high utilization bad",

    // Financial habits
    "how to build good credit habits",
    "financial best practices",
    "credit card management tips",
    "responsible credit card use",
    "avoid credit card mistakes",

    // General advice
    "how to manage multiple credit cards",
    "credit card dos and don'ts",
    "smart credit card strategies",
    "financial wellness tips",
    "improve financial health",

    // Grace periods
    "what is a grace period",
    "how does grace period work",
    "when do I pay interest",
    "avoid interest charges",

    // APR education
    "what is APR",
    "how is interest calculated",
    "understand credit card interest",
    "why is my APR so high",

    // Balance transfers
    "should I do a balance transfer",
    "balance transfer pros and cons",
    "0% APR offers worth it",

    // Rewards optimization (general)
    "how to maximize credit card rewards",
    "best practices for earning points",
    "cashback strategies",
    "rewards program tips"
  ],

  chit_chat: [
    // Greetings
    "hello",
    "hi",
    "hey",
    "good morning",
    "good afternoon",
    "good evening",
    "hi there",
    "hey vitta",

    // Thanks
    "thank you",
    "thanks",
    "thanks a lot",
    "appreciate it",
    "that helps",
    "perfect",
    "great",
    "awesome",

    // Casual
    "how are you",
    "what's up",
    "how's it going",
    "nice to meet you",

    // Goodbye
    "bye",
    "goodbye",
    "see you",
    "talk to you later",
    "have a good day",

    // Affirmations
    "yes",
    "ok",
    "sure",
    "got it",
    "understood",
    "makes sense",

    // Small talk
    "you're helpful",
    "you're great",
    "nice job",
    "good work"
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
