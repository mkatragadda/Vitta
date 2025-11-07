/**
 * Conversation Engine
 * Main orchestrator that coordinates intent classification, entity extraction,
 * and response generation. Falls back to GPT-3.5 when local NLP isn't confident.
 */

import { classifyIntent } from './intentClassifier';
import { extractEntities } from './entityExtractor';
import { generateResponse } from './responseGenerator';
import { OPENAI_API_KEY, OPENAI_CONFIG } from '../../config/openai';

/**
 * Process user query through the conversation pipeline
 * @param {string} query - User's query
 * @param {Object} userData - User's cards and wallet data
 * @param {Object} context - Conversation context
 * @returns {Promise<string>} - Generated response
 */
export const processQuery = async (query, userData = {}, context = {}) => {
  console.log('[ConversationEngine] Processing query:', query);
  console.log('[ConversationEngine] User data:', Object.keys(userData));
  console.log('[ConversationEngine] Context:', context);

  try {
    // Step 1: Classify intent using compromise.js
    const classification = classifyIntent(query, context);

    // Step 2: Extract entities
    const entities = extractEntities(query);

    // Step 3: Check if we need GPT fallback
    if (classification.requiresGPT) {
      console.log('[ConversationEngine] Using GPT-3.5 fallback');
      return await processWithGPT(query, userData, context, classification, entities);
    }

    // Step 4: Generate response locally
    console.log('[ConversationEngine] Generating local response');
    const response = generateResponse(classification, entities, userData, context);

    // Step 5: Save to conversation history
    saveToHistory(query, response, classification.intent, context);

    return response;

  } catch (error) {
    console.error('[ConversationEngine] Error processing query:', error);
    return "I'm having trouble understanding that. Could you rephrase your question?";
  }
};

/**
 * Process query using GPT-3.5 when local NLP isn't confident
 */
const processWithGPT = async (query, userData, context, classification, entities) => {
  // Check if API key is available
  if (!OPENAI_API_KEY) {
    console.warn('[ConversationEngine] OpenAI API key not configured, using fallback');
    return generateFallbackResponse(query, classification, entities, userData);
  }

  try {
    // Prepare context for GPT
    const messages = [
      {
        role: 'system',
        content: OPENAI_CONFIG.systemPrompt
      }
    ];

    // Add conversation history for context
    if (context.history && context.history.length > 0) {
      const recentHistory = context.history.slice(-3); // Last 3 exchanges
      recentHistory.forEach(item => {
        messages.push({ role: 'user', content: item.query });
        messages.push({ role: 'assistant', content: item.response });
      });
    }

    // Add current query with user data context
    const userDataSummary = summarizeUserData(userData);
    const contextualQuery = `${query}\n\n[User's wallet data: ${userDataSummary}]`;

    messages.push({
      role: 'user',
      content: contextualQuery
    });

    console.log('[ConversationEngine] Calling OpenAI API...');
    console.log('[ConversationEngine] Sending to GPT:', {
      query,
      userDataSummary,
      historyCount: context.history?.length || 0
    });

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_CONFIG.model,
        messages: messages,
        temperature: OPENAI_CONFIG.temperature,
        max_tokens: OPENAI_CONFIG.max_tokens
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const gptResponse = data.choices[0].message.content;

    console.log('[ConversationEngine] GPT response received');

    // Save to history
    saveToHistory(query, gptResponse, 'gpt_fallback', context);

    return gptResponse;

  } catch (error) {
    console.error('[ConversationEngine] GPT error:', error);
    return generateFallbackResponse(query, classification, entities, userData);
  }
};

/**
 * Generate a fallback response when GPT is unavailable
 */
const generateFallbackResponse = (query, classification, entities, userData) => {
  const { cards = [] } = userData;

  // If we have some confidence in intent, try to respond
  if (classification.topCandidates && classification.topCandidates.length > 0) {
    const topCandidate = classification.topCandidates[0];

    // Try to give a helpful response based on top candidate
    if (topCandidate.id === 'list_cards' && cards.length > 0) {
      return `You have ${cards.length} card${cards.length > 1 ? 's' : ''} in your wallet. View details in [My Wallet](vitta://navigate/cards).`;
    }

    if (topCandidate.id === 'recommend_card') {
      return "I can help you find the best card! Which merchant or category are you asking about? (e.g., 'Which card for Costco?' or 'Best card for groceries?')";
    }

    if (topCandidate.id === 'upcoming_payments') {
      return "Check your upcoming payments in the [Payment Optimizer](vitta://navigate/optimizer) or [My Wallet](vitta://navigate/cards).";
    }
  }

  // Generic helpful response
  return `I'm not sure I understand. I can help you with:

- **Card recommendations**: "Which card should I use at Costco?"
- **Card balances**: "What are my card balances?"
- **Payments**: "When are my payments due?"
- **Navigation**: "Take me to my wallet"
- **Optimization**: "Optimize my payments"

What would you like to know?`;
};

/**
 * Summarize user data for GPT context
 */
const summarizeUserData = (userData) => {
  const { cards = [] } = userData;

  if (cards.length === 0) {
    return "User has no cards in wallet yet.";
  }

  const summary = cards.map(card => {
    const util = Math.round((card.current_balance / card.credit_limit) * 100);
    return `${card.nickname || card.card_name}: $${card.current_balance}/${card.credit_limit} (${util}% util), APR ${card.apr}%`;
  }).join('; ');

  return `${cards.length} cards - ${summary}`;
};

/**
 * Save conversation to history (stored in context/localStorage)
 */
const saveToHistory = (query, response, intent, context) => {
  if (typeof window !== 'undefined') {
    try {
      // Get existing history from localStorage
      const historyKey = 'vitta_conversation_history';
      const existingHistory = JSON.parse(localStorage.getItem(historyKey) || '[]');

      // Add new exchange
      const newEntry = {
        query,
        response,
        intent,
        timestamp: new Date().toISOString()
      };

      existingHistory.push(newEntry);

      // Keep only last 50 exchanges
      const trimmedHistory = existingHistory.slice(-50);

      // Save back to localStorage
      localStorage.setItem(historyKey, JSON.stringify(trimmedHistory));

      console.log('[ConversationEngine] Saved to history');
    } catch (error) {
      console.error('[ConversationEngine] Error saving to history:', error);
    }
  }
};

/**
 * Load conversation history from localStorage
 */
export const loadConversationHistory = () => {
  if (typeof window !== 'undefined') {
    try {
      const historyKey = 'vitta_conversation_history';
      const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
      console.log('[ConversationEngine] Loaded history:', history.length, 'entries');
      return history;
    } catch (error) {
      console.error('[ConversationEngine] Error loading history:', error);
      return [];
    }
  }
  return [];
};

/**
 * Clear conversation history
 */
export const clearConversationHistory = () => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('vitta_conversation_history');
      console.log('[ConversationEngine] History cleared');
    } catch (error) {
      console.error('[ConversationEngine] Error clearing history:', error);
    }
  }
};
