/**
 * Conversation Engine V2 - Embedding-Based Intent Detection
 * Uses OpenAI embeddings + vector similarity search for intent detection
 */

import { getCachedEmbedding, findSimilarIntents, logIntentDetection } from '../embedding/embeddingService.js';
import { extractEntities } from './entityExtractor.js';
import { generateResponse } from './responseGenerator.js';
import { OPENAI_CONFIG } from '../../config/openai.js';
import { formatIntentsForGPT } from '../../config/intentDefinitions.js';

// Similarity thresholds for intent matching
const THRESHOLDS = {
  HIGH_CONFIDENCE: 0.88,  // Very direct match, use intent immediately
  MEDIUM_CONFIDENCE: 0.75, // Decent match, use GPT for conversational handling
  LOW_CONFIDENCE: 0.50     // Below this, use GPT fallback
};

/**
 * Process user query using embedding-based intent detection
 */
export const processQuery = async (query, userData = {}, context = {}) => {
  console.log('[ConversationEngineV2] Processing query:', query);

  try {
    // STEP 1: Generate query embedding
    console.log('[ConversationEngineV2] Step 1: Generating query embedding...');
    const queryEmbedding = await getCachedEmbedding(query);

    if (!queryEmbedding) {
      console.error('[ConversationEngineV2] Failed to generate embedding, using GPT fallback');
      return await processWithGPT(query, userData, context, null);
    }

    // STEP 2: Find similar intents via vector search
    console.log('[ConversationEngineV2] Step 2: Searching for similar intents...');
    const matches = await findSimilarIntents(queryEmbedding, THRESHOLDS.LOW_CONFIDENCE, 3);

    if (!matches || matches.length === 0) {
      console.log('[ConversationEngineV2] No matches found, using GPT fallback');
      return await processWithGPT(query, userData, context, null);
    }

    const topMatch = matches[0];
    console.log('[ConversationEngineV2] Top match:', {
      intent: topMatch.intent_id,
      similarity: topMatch.similarity.toFixed(3),
      example: topMatch.example_query
    });

    // Log intent detection
    await logIntentDetection(
      query,
      topMatch.intent_id,
      topMatch.similarity,
      'vector',
      userData.user_id
    );

    // STEP 3: Handle based on confidence level
    if (topMatch.similarity >= THRESHOLDS.HIGH_CONFIDENCE) {
      // High confidence - get local data, then use GPT for conversational formatting
      console.log('[ConversationEngineV2] High confidence match, using GPT with local data');
      console.log('[ConversationEngineV2] Similarity:', topMatch.similarity, 'Intent:', topMatch.intent_id);

      // Get structured data from local intent handler
      const entities = extractEntities(query);
      const classification = { intent: topMatch.intent_id };
      const localResponse = generateResponse(classification, entities, userData, context);

      // Pass to GPT for conversational formatting
      return await processWithGPT(query, userData, context, topMatch, localResponse);

    } else if (topMatch.similarity >= THRESHOLDS.MEDIUM_CONFIDENCE) {
      // Medium confidence - get local data, then use GPT for conversational formatting
      console.log('[ConversationEngineV2] Medium confidence match, using GPT with local data');
      console.log('[ConversationEngineV2] Similarity:', topMatch.similarity, 'Intent:', topMatch.intent_id);

      // Get structured data from local intent handler
      const entities = extractEntities(query);
      const classification = { intent: topMatch.intent_id };
      const localResponse = generateResponse(classification, entities, userData, context);

      // Pass to GPT for conversational formatting
      return await processWithGPT(query, userData, context, topMatch, localResponse);

    } else {
      // Low confidence - use GPT fallback
      console.log('[ConversationEngineV2] Low confidence, using GPT fallback');
      console.log('[ConversationEngineV2] Similarity:', topMatch.similarity, 'Threshold:', THRESHOLDS.MEDIUM_CONFIDENCE);
      return await processWithGPT(query, userData, context, topMatch);
    }

  } catch (error) {
    console.error('[ConversationEngineV2] Error processing query:', error);
    return "I'm having trouble understanding that. Could you rephrase your question?";
  }
};

/**
 * Process with GPT - uses local intent data when available for conversational formatting
 * @param {string} localResponse - Optional: structured data from local intent handler to format conversationally
 */
async function processWithGPT(query, userData, context, topMatch = null, localResponse = null) {
  console.log('[ConversationEngineV2] Using GPT fallback');
  if (localResponse) {
    console.log('[ConversationEngineV2] Including local response data for conversational formatting');
  }

  try {
    // Build enhanced system prompt with intent definitions
    const intentContext = formatIntentsForGPT();
    const enhancedSystemPrompt = `${OPENAI_CONFIG.systemPrompt}

---

${intentContext}

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
    return `${card.card_name || card.card_type}: $${card.current_balance}/${card.credit_limit} (${util}% util), APR ${card.apr}%`;
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
