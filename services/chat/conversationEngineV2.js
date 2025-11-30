/**
 * Conversation Engine V2 - Embedding-Based Intent Detection
 * Uses OpenAI embeddings + vector similarity search for intent detection
 * Enhanced with user profile context for personalized responses
 * Supports offline message queuing via SyncManager
 */

import { getCachedEmbedding, findSimilarIntents, logIntentDetection } from '../embedding/embeddingService.js';
import { extractEntities } from './entityExtractor.js';
import { generateResponse } from './responseGenerator.js';
import { OPENAI_CONFIG } from '../../config/openai.js';
import { formatIntentsForGPT } from '../../config/intentDefinitions.js';
import { getUserProfile, shouldIncludeProfile, formatProfileForGPT } from '../userProfileService.js';
import { INTENT_CATEGORIES } from '../embedding/intentEmbeddings.js';
import { getConversationContext } from './conversationContext.js';
import { rewriteQueryWithContext, shouldDirectRoute } from './queryRewriter.js';
import { getSlotFillingState } from './slotFillingManager.js';
import { handleRememberMemory } from './memoryHandler.js';
import { formatMultiStrategyRecommendations } from '../recommendations/recommendationFormatter.js';
import { getAllStrategies } from '../recommendations/recommendationStrategies.js';

// Phase 3: Import sync manager for offline message queuing
let syncManager = null;
async function getSyncManager() {
  if (!syncManager && typeof window !== 'undefined') {
    try {
      const { getSyncManager: getSM } = await import('../sync/syncManager.js');
      syncManager = getSM();
    } catch (error) {
      console.warn('[ConversationEngineV2] Failed to load syncManager:', error.message);
    }
  }
  return syncManager;
}

// Phase 6: Initialize FeedbackLoop for feedback collection
let feedbackLoop = null;

// Similarity thresholds for intent matching
const THRESHOLDS = {
  HIGH_CONFIDENCE: 0.87,
  MEDIUM_CONFIDENCE: 0.72,
  LOW_CONFIDENCE: 0.60
};

// Intents that should use structured responses without GPT formatting
// Note: Reduced set to allow more natural, conversational responses
const CRITICAL_INTENTS = new Set([
  'query_card_data',  // Simple data queries can use templates
  'card_recommendation', // Preserve structured multi-strategy layout without GPT reformatting
  'remember_memory',
  'recall_memory',
  'split_payment' // Preserve complete payment split table with ALL cards - GPT truncates long tables
  // 'payment_optimizer' - removed to allow personalized responses
  // 'debt_guidance_plan' - removed to allow conversational advice
]);

const REMINDER_COMMAND_PATTERNS = [
  {
    action: 'mute',
    regex: /\b(mute|pause|silence|stop)\s+(all\s+)?reminders?\b/i,
    durationDays: 30,
    buildResponse: (days) =>
      `Okay, I'll stay quiet for the next ${days} days. You can say "resume reminders" whenever you want me to start again.`
  },
  {
    action: 'resume',
    regex: /\b(resume|unmute|turn\s+on|enable)\s+(all\s+)?reminders?\b/i,
    durationDays: null,
    buildResponse: () => 'Reminders are back on. I\'ll keep nudging you when payments are due.'
  }
];

async function handleReminderQuickCommand(query, userId) {
  if (!userId) return null;

  for (const command of REMINDER_COMMAND_PATTERNS) {
    if (command.regex.test(query)) {
      await muteReminders({
        userId,
        durationDays: command.durationDays
      });

      return command.buildResponse(command.durationDays ?? 0);
    }
  }

  return null;
}

/**
 * Apply deterministic heuristics when embeddings are ambiguous.
 * Ensures save/remember phrasing routes to remember_memory instead of recall_memory.
 */
function applyIntentHeuristics(query, topMatch) {
  if (!topMatch || !query) {
    return topMatch;
  }

  const lowerQuery = query.toLowerCase();
  const wantsToSaveNote = /\b(save|remember|log|note|track)\b/.test(lowerQuery);
  const retrievalLanguage =
    /\b(show|list|find|see|display|what|which|any)\b/.test(lowerQuery) ||
    lowerQuery.startsWith('show ');

  if (wantsToSaveNote && !retrievalLanguage && topMatch.intent_id !== 'remember_memory') {
    const adjusted = {
      ...topMatch,
      intent_id: 'remember_memory',
      similarity: Math.max(topMatch.similarity || 0, THRESHOLDS.MEDIUM_CONFIDENCE + 0.01),
      heuristic: 'memory_save_override'
    };

    console.log('[ConversationEngineV2] Heuristic override → remember_memory', {
      originalIntent: topMatch.intent_id,
      similarity: topMatch.similarity?.toFixed(3),
      adjustedSimilarity: adjusted.similarity.toFixed(3)
    });

    return adjusted;
  }

  // Override card_recommendation → query_card_data for data queries
  // Patterns: "lowest/highest balance/APR" with network/issuer filters
  if (topMatch.intent_id === 'card_recommendation') {
    const dataQueryPatterns = [
      /\b(lowest|highest|smallest|largest|maximum|minimum)\s+(balance|apr|interest|rate|limit|utilization)\b/i,
      /\b(balance|apr|interest|rate|limit|utilization).*(lowest|highest|smallest|largest|maximum|minimum)\b/i,
      /\b(show|list|find|give me|tell me|what is).*(balance|apr|interest|rate|limit|utilization)\b/i
    ];
    
    const networkIssuerPatterns = [
      /\b(visa|mastercard|amex|discover|american express)\s+card/i,
      /\b(chase|citi|capital one|american express|bank of america|wells fargo)\s+card/i,
      /\bmaster\s*card/i,
      /\bvisa\s+card/i
    ];
    
    const isDataQuery = dataQueryPatterns.some(pattern => pattern.test(lowerQuery));
    const hasNetworkIssuerFilter = networkIssuerPatterns.some(pattern => pattern.test(lowerQuery));
    
    // Override if it's clearly a data query, especially with network/issuer filters
    if (isDataQuery || hasNetworkIssuerFilter) {
      const adjusted = {
        ...topMatch,
        intent_id: 'query_card_data',
        similarity: Math.max(topMatch.similarity || 0, THRESHOLDS.HIGH_CONFIDENCE),
        heuristic: 'data_query_override'
      };

      console.log('[ConversationEngineV2] Heuristic override → query_card_data', {
        originalIntent: topMatch.intent_id,
        similarity: topMatch.similarity?.toFixed(3),
        adjustedSimilarity: adjusted.similarity.toFixed(3),
        reason: isDataQuery ? 'data_query_pattern' : 'network_issuer_filter'
      });

      return adjusted;
    }
  }

  return topMatch;
}

/**
 * Handle direct routing for high-confidence follow-ups
 * Bypasses normal classification pipeline
 * @param {Object} rewriteResult - Result from query rewriter
 * @param {Object} userData - User data
 * @param {Object} context - Request context
 * @param {Object} conversationContext - Conversation context manager
 * @returns {Promise<string>} - Response
 */
async function handleDirectRoute(rewriteResult, userData, context, conversationContext) {
  const { directRoute, rewritten } = rewriteResult;
  const { intent, action, entities } = directRoute;

  console.log('[ConversationEngineV2] Direct route handler:', { intent, action });

  try {
    let response;

    // Route based on intent + action
    if (intent === 'card_recommendation' && action === 'compare_strategies') {
      // Import recommendation engine
      const { getAllStrategyRecommendations } = await import('../recommendations/recommendationEngine.js');
      
      // Use entities from context (preserved from original query)
      // This ensures we have merchant/category from "which card for groceries"
      const purchaseContext = {
        merchant: entities.merchant,
        category: entities.category,
        amount: entities.amount,
        date: new Date()
      };

      console.log('[DirectRoute] Purchase context for comparison:', purchaseContext);

      // NEW ARCHITECTURE: Use separate strategies with user profile detection

      // Default to $1000 if no amount specified - crucial for showing dollar calculations
      const defaultAmount = purchaseContext.amount || 1000;
      
      const strategies = getAllStrategies(
        userData.cards || [],
        purchaseContext.category || purchaseContext.merchant || 'general',
        defaultAmount
      );
      
      const formattedResponse = formatMultiStrategyRecommendations(
        userData.cards || [],
        strategies,
        purchaseContext.category || purchaseContext.merchant || 'general',
        defaultAmount
      );
      
      response = formattedResponse;

      // Log intent
      await logIntentDetection(rewritten, intent, 0.95, 'direct_route', userData.user_id);
    } 
    else if (intent === 'card_recommendation' && action === 'show_alternatives') {
      // Show alternative cards (use normal handler with context)
      const { handleRecommendation } = await import('./recommendationChatHandler.js');
      const result = await handleRecommendation(
        userData.cards || [],
        entities,
        rewritten,
        userData.user_id
      );
      response = result.response || result;
    }
    else if (intent === 'split_payment' && action === 'debt_payoff_plan') {
      // Create detailed debt payoff plan
      const { generateResponse } = await import('./responseGenerator.js');
      const classification = { intent: 'split_payment' };
      
      // Extract budget from entities or prompt
      const budget = entities.amount || 1000; // Default budget
      const splitEntities = { amount: budget };
      
      // Phase 6: Now async due to pattern learning integration
      response = await generateResponse(classification, splitEntities, userData, context);
      
      await logIntentDetection(rewritten, intent, 0.85, 'direct_route', userData.user_id);
    }
    else if (intent === 'split_payment' && (action === 'avalanche' || action === 'calculate_payments')) {
      // Recalculate with specific strategy
      const { generateResponse } = await import('./responseGenerator.js');
      const classification = { intent: 'split_payment' };
      
      // Phase 6: Now async due to pattern learning integration
      response = await generateResponse(classification, entities, userData, context);
      
      await logIntentDetection(rewritten, intent, 0.85, 'direct_route', userData.user_id);
    }
    else if (intent === 'debt_guidance' && action === 'snowball_method') {
      // Show snowball method (let GPT handle with context)
      response = await processWithGPT(rewritten, userData, context, null, null, 'GUIDANCE');
    }
    else if (intent === 'money_coaching') {
      // Money coaching follow-ups (let GPT handle with context)
      response = await processWithGPT(rewritten, userData, context, null, null, 'GUIDANCE');
    }
    else if (intent === 'query_card_data') {
      // Card data follow-ups
      // Phase 6: Now async due to pattern matching
      const { handleCardDataQuery } = await import('./cardDataQueryHandler.js');
      response = await handleCardDataQuery(userData.cards || [], entities, rewritten);
      
      await logIntentDetection(rewritten, intent, 0.80, 'direct_route', userData.user_id);
    }
    else {
      // Fallback to normal processing
      console.warn('[ConversationEngineV2] Unknown direct route action:', action);
      return await processWithGPT(rewritten, userData, context, null, null, 'TASK');
    }

    // Update conversation context
    conversationContext.addTurn(rewritten, intent, entities, response);

    return response;

  } catch (error) {
    console.error('[ConversationEngineV2] Error in direct route handler:', error);
    // Fallback to normal processing
    return await processWithGPT(rewritten, userData, context, null, null, 'TASK');
  }
}

/**
 * Execute intent with filled slots
 * @param {Object} readyIntent - { intent, slots }
 * @param {Object} userData
 * @param {Object} context
 * @returns {Promise<string>}
 */
async function executeIntentWithSlots(readyIntent, userData, context, slotFillingState) {
  const { intent, slots } = readyIntent;
  
  console.log('[ConversationEngineV2] Executing intent with slots:', { intent, slots });

  try {
    switch (intent) {
      case 'split_payment': {
        const { generateResponse } = await import('./responseGenerator.js');
        const classification = { intent: 'split_payment' };
        const entities = { amount: slots.budget };
        
        // Phase 6: Now async due to pattern learning integration
        const response = await generateResponse(classification, entities, userData, context);
        
        await logIntentDetection(`split $${slots.budget} payment`, intent, 0.95, 'slot_filled', userData.user_id);
        return response;
      }

      case 'remember_memory': {
        const { memoryDraft, tags } = slots;
        if (!memoryDraft || !Array.isArray(tags) || tags.length === 0) {
          if (slotFillingState) {
            slotFillingState.clear();
          }
          return "I still need a short tag like 'tag travel' so I can store that note.";
        }

        const response = await handleRememberMemory({
          userId: memoryDraft.userId,
          query: memoryDraft.naturalText,
          entities: { tags },
          memoryDraftOverride: memoryDraft,
          overrideTags: tags
        });

        await logIntentDetection(memoryDraft.naturalText, intent, 0.95, 'slot_filled', userData.user_id);
        return response;
      }

      default:
        return "I've received your information. Let me process that...";
    }
    
  } catch (error) {
    console.error('[ConversationEngineV2] Error executing intent with slots:', error);
    return "I understood your answer, but I'm having trouble processing it. Could you try rephrasing?";
  }
}

/**
 * Ask the next question in slot-filling sequence
 * @param {SlotFillingState} slotFillingState
 * @param {Object} userData
 * @returns {Promise<string>}
 */
async function askNextQuestion(slotFillingState, userData) {
  // For now, just confirm what was received
  const filledSlots = Object.keys(slotFillingState.slots);
  return `Got it! I've recorded ${filledSlots.join(', ')}. What else would you like to know?`;
}

/**
 * Classify query into high-level category using zero-shot LLM
 * Stage 1 of hierarchical classification
 * @param {string} query - User query
 * @returns {Promise<string>} - Category: 'TASK' | 'GUIDANCE' | 'CHAT'
 */
async function classifyCategory(query) {
  try {
    console.log('[ConversationEngineV2] Stage 1: Classifying category...');

    const normalized = (query || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const quickTaskPatterns = [
      /payment due/,
      /due dates?/,
      /when.*payment/,
      /payment schedule/,
      /payment reminders?/,
      /bill due/,
      /next payment/,
      /statement close/,
      /statement dates?/
    ];

    if (quickTaskPatterns.some((pattern) => pattern.test(normalized))) {
      console.log('[ConversationEngineV2] Keyword heuristic matched TASK');
      return 'TASK';
    }

    const response = await fetch('/api/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{
          role: 'system',
          content: `You are a query classifier. Classify the user's query into exactly ONE category:

TASK - User wants to perform a specific action with their credit cards:
- Choose which card to use for a purchase
- Compare cards or compare strategies for a purchase
- View card information, balances, or payments
- Split payments across cards
- Add or remove cards
- Navigate to a specific screen
- Get card recommendations

GUIDANCE - User wants financial advice or education (NOT purchase-related):
- How to reduce debt or pay off balances
- Credit score improvement tips
- Understanding credit concepts (APR, utilization, grace periods)
- General financial coaching or best practices
- Debt payoff strategies

CHAT - Casual conversation:
- Greetings (hi, hello, hey)
- Thanks or affirmations
- Small talk

Respond with ONLY the category name: TASK, GUIDANCE, or CHAT`
        }, {
          role: 'user',
          content: query
        }],
        temperature: 0,
        max_tokens: 10
      })
    });

    if (!response.ok) {
      throw new Error(`Category classification API error: ${response.status}`);
    }

    const data = await response.json();
    const category = data.choices[0].message.content.trim().toUpperCase();

    // Validate category
    if (!['TASK', 'GUIDANCE', 'CHAT'].includes(category)) {
      console.warn('[ConversationEngineV2] Invalid category returned:', category, '- defaulting to TASK');
      return 'TASK';
    }

    console.log('[ConversationEngineV2] Category classified:', category);
    return category;

  } catch (error) {
    console.error('[ConversationEngineV2] Error classifying category:', error);
    // Default to TASK on error (most common category)
    return 'TASK';
  }
}

/**
 * Process user query using embedding-based intent detection
 * Now with hierarchical two-stage classification for better accuracy
 * Enhanced with conversation context for follow-up handling
 */
export const processQuery = async (query, userData = {}, context = {}) => {
  console.log('[ConversationEngineV2] Processing query:', query);

  // Phase 3: Check if offline and queue message if needed
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    console.log('[ConversationEngineV2] User is offline, queuing message');
    const sm = await getSyncManager();
    if (sm) {
      const operationId = sm.addToQueue({
        type: 'message',
        data: {
          message: query,
          timestamp: Date.now(),
          userId: userData.user_id
        }
      });

      return {
        queued: true,
        operationId,
        message: '📤 Message queued! I\'ll send this when you\'re back online.',
        intent: 'message_queued'
      };
    }
  }

  try {
    // STEP 0A: Check if user is answering a pending question (slot-filling)
    // THIS MUST HAPPEN FIRST - before any other processing
    const slotFillingState = getSlotFillingState();
    
    if (slotFillingState.hasPendingQuestion()) {
      console.log('[ConversationEngineV2] ⚠️ PENDING QUESTION DETECTED');
      console.log('[ConversationEngineV2] Question type:', slotFillingState.pendingQuestion);
      console.log('[ConversationEngineV2] Target intent:', slotFillingState.targetIntent);
      console.log('[ConversationEngineV2] User query:', query);
      
      const answer = slotFillingState.extractAnswer(query);
      
      if (answer && answer.confidence >= 0.80) {
        console.log('[ConversationEngineV2] ✅ ANSWER DETECTED!', answer);
        
        // Fill the slot
        slotFillingState.fillSlot(answer.slotName, answer.value);
        
        // Check if all slots are filled
        if (slotFillingState.allSlotsFilled()) {
          const readyIntent = slotFillingState.getReadyIntent();
          console.log('[ConversationEngineV2] ✅ ALL SLOTS FILLED, EXECUTING:', readyIntent);
          
          // Execute the target intent with filled slots
          const response = await executeIntentWithSlots(readyIntent, userData, { ...context, lastQuery: query }, slotFillingState);
          
          // Update conversation context
          const conversationContext = getConversationContext();
          conversationContext.addTurn(query, readyIntent.intent, readyIntent.slots, response);
          
          return response;
        } else {
          // More slots needed - ask next question
          console.log('[ConversationEngineV2] More slots needed, asking next question');
          return await askNextQuestion(slotFillingState, userData);
        }
      } else {
        // Answer extraction failed - but we have a pending question
        // This is likely a clarification or unrelated query
        console.log('[ConversationEngineV2] ⚠️ No clear answer detected (confidence too low or no match)');
        console.log('[ConversationEngineV2] Clearing slot-filling state and continuing with normal processing');
        
        // Clear the pending question state since user didn't answer
        slotFillingState.clear();
      }
    }

    // STEP 0B: Get conversation context (needed for both quick commands and follow-ups)
    const conversationContext = getConversationContext();

    // Quick reminder mute/unmute commands (pre-intent for snappy UX)
    const quickReminderResponse = await handleReminderQuickCommand(query, userData.user_id);
    if (quickReminderResponse) {
      conversationContext.addTurn(query, 'reminder_quick_command', {}, quickReminderResponse);
      return quickReminderResponse;
    }

    // STEP 0C: Check for follow-ups using conversation context
    const activeContext = conversationContext.getActiveContext();
    
    console.log('[ConversationEngineV2] Context:', {
      isFollowUp: activeContext.isFollowUp,
      lastIntent: activeContext.lastIntent,
      entitiesCount: Object.keys(activeContext.entities).length
    });

    // Rewrite query with context if it's a follow-up
  const rewriteResult = rewriteQueryWithContext(query, activeContext);
  const handlerContext = { ...context, lastQuery: query, slotFillingState };
    
    if (rewriteResult.confidence > 0) {
      console.log('[ConversationEngineV2] Query rewrite:', {
        original: query,
        rewritten: rewriteResult.rewritten,
        confidence: rewriteResult.confidence,
        reason: rewriteResult.reason
      });
    }

    // Check if we should directly route (high-confidence follow-up)
    if (shouldDirectRoute(rewriteResult)) {
      console.log('[ConversationEngineV2] Direct routing to:', rewriteResult.directRoute);
      return await handleDirectRoute(rewriteResult, userData, handlerContext, conversationContext);
    }

    // Use rewritten query for classification if confidence is high enough
    const queryToClassify = rewriteResult.confidence >= 0.70 ? rewriteResult.rewritten : query;

    // STEP 1: Classify into high-level category (TASK / GUIDANCE / CHAT)
  let category = await classifyCategory(queryToClassify);

  const memoryPattern = /\b(memory|memories|remember|tag|tags|note|log|save)\b/i;
  if (category === 'CHAT' && memoryPattern.test(queryToClassify)) {
    category = 'TASK';
  }
  if (!['TASK', 'GUIDANCE', 'CHAT'].includes(category)) {
    category = 'TASK';
  }
    const allowedIntents = INTENT_CATEGORIES[category] || [];
    console.log('[ConversationEngineV2] Category:', category, '- Allowed intents:', allowedIntents);

    // STEP 2: Generate query embedding
    console.log('[ConversationEngineV2] Step 2: Generating query embedding...');
    const queryEmbedding = await getCachedEmbedding(query);

    if (!queryEmbedding) {
      console.error('[ConversationEngineV2] Failed to generate embedding, using GPT fallback');
      return await processWithGPT(query, userData, context, null, category);
    }

    // STEP 3: Find similar intents via vector search (filtered by category)
    console.log('[ConversationEngineV2] Step 3: Searching for similar intents within category...');
    const matches = await findSimilarIntents(
      queryEmbedding,
      THRESHOLDS.LOW_CONFIDENCE,
      3,
      { filterIntents: allowedIntents }
    );

    if (!matches || matches.length === 0) {
      console.log('[ConversationEngineV2] No matches found, using GPT fallback');
      return await processWithGPT(query, userData, context, null, category);
    }

    const topMatch = matches[0];
    console.log('[ConversationEngineV2] Top match:', {
      intent: topMatch.intent_id,
      similarity: topMatch.similarity.toFixed(3),
      example: topMatch.example_query,
      category
    });

    const selectedMatch = applyIntentHeuristics(query, topMatch);

    // Log intent detection
    await logIntentDetection(
      query,
      selectedMatch.intent_id,
      selectedMatch.similarity,
      'vector',
      userData.user_id
    );

    // STEP 3: Handle based on confidence level
    if (selectedMatch.similarity >= THRESHOLDS.HIGH_CONFIDENCE) {
      // High confidence - get local data, then use GPT for conversational formatting
      console.log('[ConversationEngineV2] High confidence match, using GPT with local data');
      console.log('[ConversationEngineV2] Similarity:', selectedMatch.similarity, 'Intent:', selectedMatch.intent_id);

      // Get structured data from local intent handler
      const entities = extractEntities(query);
      const classification = { intent: selectedMatch.intent_id };
      // Phase 6: Now async due to pattern learning integration
      let localResponse = await generateResponse(classification, entities, userData, handlerContext);

      // Handle recommendation handler response format
      if (localResponse && typeof localResponse === 'object' && localResponse.response) {
        localResponse = localResponse.response;
      }

      if (CRITICAL_INTENTS.has(selectedMatch.intent_id)) {
        console.log('[ConversationEngineV2] Critical intent detected, returning structured response without GPT');
        const response = typeof localResponse === 'string' ? localResponse : JSON.stringify(localResponse);
        
        // Phase 6: Track query execution for analytics (async, don't block)
        trackQueryExecution(query, selectedMatch.intent_id, entities, localResponse, userData.user_id).catch(err => {
          console.error('[ConversationEngineV2] Error tracking query:', err);
        });
        
        conversationContext.addTurn(query, selectedMatch.intent_id, entities, response);
        return response;
      }

      // Pass to GPT for conversational formatting
      const response = await processWithGPT(query, userData, context, selectedMatch, localResponse, category);
      
      // Update conversation context
      conversationContext.addTurn(query, selectedMatch.intent_id, entities, response);
      
      return response;

    } else if (selectedMatch.similarity >= THRESHOLDS.MEDIUM_CONFIDENCE) {
      // Medium confidence - get local data, then use GPT for conversational formatting
      console.log('[ConversationEngineV2] Medium confidence match, using GPT with local data');
      console.log('[ConversationEngineV2] Similarity:', selectedMatch.similarity, 'Intent:', selectedMatch.intent_id);

      // Get structured data from local intent handler
      const entities = extractEntities(query);
      const classification = { intent: selectedMatch.intent_id };
      // Phase 6: Now async due to pattern learning integration
      let localResponse = await generateResponse(classification, entities, userData, handlerContext);

      // Handle recommendation handler response format
      if (localResponse && typeof localResponse === 'object' && localResponse.response) {
        localResponse = localResponse.response;
      }

      if (CRITICAL_INTENTS.has(selectedMatch.intent_id)) {
        console.log('[ConversationEngineV2] Critical intent detected (medium confidence), returning structured response without GPT');
        const response = typeof localResponse === 'string' ? localResponse : JSON.stringify(localResponse);
        
        // Phase 6: Track query execution for analytics (async, don't block)
        trackQueryExecution(query, selectedMatch.intent_id, entities, localResponse, userData.user_id).catch(err => {
          console.error('[ConversationEngineV2] Error tracking query:', err);
        });
        
        conversationContext.addTurn(query, selectedMatch.intent_id, entities, response);
        return response;
      }

      // Pass to GPT for conversational formatting
      const response = await processWithGPT(query, userData, context, selectedMatch, localResponse, category);
      
      // Phase 6: Track query execution for analytics (async, don't block)
      trackQueryExecution(query, selectedMatch.intent_id, entities, response, userData.user_id).catch(err => {
        console.error('[ConversationEngineV2] Error tracking query:', err);
      });
      
      // Update conversation context
      conversationContext.addTurn(query, selectedMatch.intent_id, entities, response);
      
      return response;

    } else {
      // Low confidence - use GPT fallback
      console.log('[ConversationEngineV2] Low confidence, using GPT fallback');
      console.log('[ConversationEngineV2] Similarity:', selectedMatch.similarity, 'Threshold:', THRESHOLDS.MEDIUM_CONFIDENCE);
      
      const response = await processWithGPT(query, userData, context, selectedMatch, null, category);
      
      // Update conversation context (with fallback intent)
      const entities = extractEntities(query);
      conversationContext.addTurn(query, 'gpt_fallback', entities, response);
      
      return response;
    }

  } catch (error) {
    console.error('[ConversationEngineV2] Error processing query:', error);
    return "I'm having trouble understanding that. Could you rephrase your question?";
  }
};

/**
 * Process with GPT - uses local intent data when available for conversational formatting
 * @param {string} localResponse - Optional: structured data from local intent handler to format conversationally
 * @param {string} category - Query category (TASK/GUIDANCE/CHAT) for context-aware prompting
 */
async function processWithGPT(query, userData, context, topMatch = null, localResponse = null, category = 'TASK') {
  console.log('[ConversationEngineV2] Using GPT fallback');
  if (localResponse) {
    console.log('[ConversationEngineV2] Including local response data for conversational formatting');
  }

  try {
    // Build enhanced system prompt with intent definitions
    const intentContext = formatIntentsForGPT();
    
    // Category-specific guidance
    const categoryGuidance = {
      GUIDANCE: `
GUIDANCE MODE: The user is seeking financial advice or strategy.
- Focus on education, best practices, and actionable steps
- Be empathetic and supportive (debt can be stressful)
- Provide concrete numbers and examples using their card data
- Keep responses concise (max 5-6 bullets)
- Don't recommend specific cards unless they ask
- Prioritize: strategy > tactics > specific actions`,
      
      CHAT: `
CHAT MODE: The user is making casual conversation.
- Be friendly, warm, and brief
- Acknowledge their message naturally
- Offer to help if appropriate
- Keep it short (1-2 sentences)`,
      
      TASK: `
TASK MODE: The user wants to perform a specific action.
- Be direct and action-oriented
- Provide clear next steps
- Use their card data for personalized recommendations`
    };

    const enhancedSystemPrompt = `${OPENAI_CONFIG.systemPrompt}

---

${intentContext}

---

${categoryGuidance[category] || categoryGuidance.TASK}

IMPORTANT:
- If the user's query clearly matches one of the intents above, help them with that specific task
- If the query is conversational or unclear, respond naturally and ask clarifying questions
- Always be helpful, friendly, and conversational
- Use the user's card data to provide personalized responses`;

    const messages = [
      {
        role: 'system',
        content: enhancedSystemPrompt
      }
    ];

    // Add conversation history (last 5 exchanges for better context)
    if (context.history && context.history.length > 0) {
      const recentHistory = context.history.slice(-5);
      recentHistory.forEach(item => {
        messages.push({ role: 'user', content: item.query });
        messages.push({ role: 'assistant', content: item.response });
      });
    }

    // Add current query with user data context
    const userDataSummary = summarizeUserData(userData);
    let contextualQuery = query;

    if (localResponse) {
      // Include structured data from local handler for conversational formatting
      contextualQuery += `\n\n[System: The system has this data to answer the user's query. Please use this EXACT response, preserving all markdown tables and formatting. You may add a brief conversational intro (1 sentence max) before the data:\n${localResponse}\n]`;
    } else if (topMatch) {
      // No local data, but we have an intent hint
      contextualQuery += `\n\n[System note: This might be related to "${topMatch.intent_id}" (${(topMatch.similarity * 100).toFixed(0)}% confidence)]`;
    }

    contextualQuery += `\n\n[User's wallet data: ${userDataSummary}]`;

    // Add user profile for personalized context (if available and relevant)
    if (topMatch && userData.user_id) {
      const userProfile = await getUserProfile(userData.user_id);
      if (shouldIncludeProfile(topMatch.intent_id, userProfile)) {
        const profileContext = formatProfileForGPT(userProfile);
        contextualQuery += `\n\n[User profile: ${profileContext}]`;
        console.log('[ConversationEngineV2] Including user profile context');
      }
    }

    messages.push({ role: 'user', content: contextualQuery });

    console.log('[ConversationEngineV2] Calling OpenAI API via server route...');

    // Call our API route instead of OpenAI directly
    const response = await fetch('/api/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: OPENAI_CONFIG.model,
        messages,
        temperature: OPENAI_CONFIG.temperature,
        max_tokens: OPENAI_CONFIG.max_tokens
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
    }

    const data = await response.json();
    const gptResponse = data.choices[0].message.content;

    console.log('[ConversationEngineV2] GPT response received');

    // Log as GPT fallback
    await logIntentDetection(
      query,
      'gpt_fallback',
      topMatch?.similarity || 0,
      'gpt',
      userData.user_id
    );

    // Save to history
    saveToHistory(query, gptResponse, 'gpt_fallback', context);

    return gptResponse;

  } catch (error) {
    console.error('[ConversationEngineV2] GPT error:', error);
    return generateFallbackResponse(query, topMatch, userData);
  }
}

/**
 * Generate fallback response when GPT is unavailable
 */
function generateFallbackResponse(query, topMatch, userData) {
  const { cards = [] } = userData;

  if (topMatch && topMatch.similarity > 0.60) {
    // We have a decent guess
    return `I think you're asking about ${topMatch.intent_id.replace('_', ' ')}. However, I need more information to help you properly. Could you rephrase your question?\n\nFor now, try:\n• "What cards do I have?"\n• "Which card for groceries?"\n• "When are my payments due?"`;
  }

  // Generic helpful response
  return `I'm not sure I understand. I can help you with:

- **Card information**: "What cards do I have?", "Show my balances"
- **Recommendations**: "Which card for Costco?", "Best card for gas"
- **Payments**: "When are my payments due?", "Split $1500 between cards"
- **Navigation**: "Take me to my wallet"

What would you like to know?`;
}

/**
 * Summarize user data for GPT context
 */
function summarizeUserData(userData) {
  const { cards = [] } = userData;

  if (cards.length === 0) {
    return "User has no cards in wallet yet.";
  }

  const summary = cards.map(card => {
    const util = Math.round((card.current_balance / card.credit_limit) * 100);
    return `${card.nickname || card.card_name}: $${card.current_balance}/${card.credit_limit} (${util}% util), APR ${card.apr}%`;
  }).join('; ');

  return `${cards.length} cards - ${summary}`;
}

/**
 * Save conversation to history
 */
function saveToHistory(query, response, intent, context) {
  if (typeof window !== 'undefined') {
    try {
      const historyKey = 'vitta_conversation_history';
      const existingHistory = JSON.parse(localStorage.getItem(historyKey) || '[]');

      existingHistory.push({
        query,
        response,
        intent,
        timestamp: new Date().toISOString()
      });

      // Keep only last 50 exchanges
      const trimmedHistory = existingHistory.slice(-50);
      localStorage.setItem(historyKey, JSON.stringify(trimmedHistory));

      console.log('[ConversationEngineV2] Saved to history');
    } catch (error) {
      console.error('[ConversationEngineV2] Error saving to history:', error);
    }
  }
}

/**
 * Load conversation history
 */
export const loadConversationHistory = () => {
  if (typeof window !== 'undefined') {
    try {
      const historyKey = 'vitta_conversation_history';
      const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
      return history;
    } catch (error) {
      console.error('[ConversationEngineV2] Error loading history:', error);
      return [];
    }
  }
  return [];
};

/**
 * Phase 6: Track query execution for analytics and feedback collection
 * This function is called after successful query execution
 * 
 * @param {string} query - User query
 * @param {string} intent - Detected intent
 * @param {Object} entities - Extracted entities
 * @param {string} response - Generated response
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
async function trackQueryExecution(query, intent, entities, response, userId) {
  try {
    // Initialize FeedbackLoop if not already done
    if (!feedbackLoop) {
      try {
        const { FeedbackLoop } = await import('./learning/feedbackLoop.js');
        feedbackLoop = new FeedbackLoop({ enableProcessing: true, autoUpdatePatterns: true });
      } catch (error) {
        console.warn('[ConversationEngineV2] FeedbackLoop not available, feedback collection disabled:', error.message);
        feedbackLoop = null;
        return;
      }
    }

    // Note: QueryAnalytics tracking is handled in QueryExecutor automatically
    // This function is primarily for FeedbackLoop integration points
    
    // Future: Could track response quality metrics here
    // For now, QueryAnalytics handles query tracking in QueryExecutor
    
  } catch (error) {
    console.error('[ConversationEngineV2] Error in trackQueryExecution:', error);
    // Don't throw - tracking shouldn't break query execution
  }
}
