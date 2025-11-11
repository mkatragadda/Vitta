/**
 * Slot-Filling Dialog Manager
 * Tracks pending questions and manages multi-turn conversations
 * where the bot asks questions and user provides answers
 * 
 * Example:
 * Bot: "Tell me your monthly budget"
 * User: "my budget is 2000" ← This should fill the budget slot
 */

import { extractAmount } from '../../utils/textExtraction';
import { analyzeTags } from '../memory/tagIntelligence';

/**
 * Pending question types
 */
export const QUESTION_TYPES = {
  BUDGET_AMOUNT: 'budget_amount',
  PAYMENT_AMOUNT: 'payment_amount',
  CARD_SELECTION: 'card_selection',
  STRATEGY_PREFERENCE: 'strategy_preference',
  CONFIRMATION: 'confirmation',
  MEMORY_TAG: 'memory_tag'
};

/**
 * Slot-filling state for a conversation
 */
export class SlotFillingState {
  constructor() {
    this.pendingQuestion = null;        // What question was asked
    this.targetIntent = null;            // What intent to execute when slots filled
    this.slots = {};                     // Collected slot values
    this.requiredSlots = [];             // What slots are needed
    this.askedAt = null;                 // When question was asked
    this.maxWaitTime = 120000;           // 2 minutes timeout
  }

  /**
   * Ask a question and set up slot-filling expectation
   * @param {string} questionType - Type of question (from QUESTION_TYPES)
   * @param {string} targetIntent - Intent to execute when answered
   * @param {Array<string>} requiredSlots - Slots needed to execute intent
   * @param {Object} existingSlots - Already collected slots
   */
  askQuestion(questionType, targetIntent, requiredSlots = [], existingSlots = {}) {
    this.pendingQuestion = questionType;
    this.targetIntent = targetIntent;
    this.requiredSlots = requiredSlots;
    this.slots = { ...existingSlots };
    this.askedAt = Date.now();
    
    console.log('[SlotFilling] Question asked:', {
      questionType,
      targetIntent,
      requiredSlots
    });
  }

  /**
   * Check if there's a pending question waiting for answer
   * @returns {boolean}
   */
  hasPendingQuestion() {
    if (!this.pendingQuestion) return false;
    
    // Check timeout
    if (Date.now() - this.askedAt > this.maxWaitTime) {
      console.log('[SlotFilling] Question timed out');
      this.clear();
      return false;
    }
    
    return true;
  }

  /**
   * Try to extract answer from user query
   * @param {string} query - User's query
   * @returns {Object|null} - { slotName, value, confidence } or null
   */
  extractAnswer(query) {
    if (!this.hasPendingQuestion()) return null;

    const lowerQuery = query.toLowerCase().trim();
    
    console.log('[SlotFilling] Attempting to extract answer for:', this.pendingQuestion);

    switch (this.pendingQuestion) {
      case QUESTION_TYPES.BUDGET_AMOUNT:
        return this.extractBudgetAmount(lowerQuery);
      
      case QUESTION_TYPES.PAYMENT_AMOUNT:
        return this.extractPaymentAmount(lowerQuery);
      
      case QUESTION_TYPES.CARD_SELECTION:
        return this.extractCardSelection(lowerQuery);
      
      case QUESTION_TYPES.STRATEGY_PREFERENCE:
        return this.extractStrategyPreference(lowerQuery);
      
      case QUESTION_TYPES.CONFIRMATION:
        return this.extractConfirmation(lowerQuery);

      case QUESTION_TYPES.MEMORY_TAG:
        return this.extractMemoryTag(query);
      
      default:
        return null;
    }
  }

  /**
   * Extract budget amount from query using common utility
   * Patterns: "2000", "my budget is 2000", "$2000", "I have 2000"
   */
  extractBudgetAmount(query) {
    console.log('[SlotFilling] Extracting budget from:', query);
    
    // Use common extraction utility with flexible minDigits for budget context
    const amount = extractAmount(query, { minDigits: 1, allowK: true });
    
    if (amount) {
      // Determine confidence based on query structure
      let confidence = 0.90; // default
      
      // Higher confidence for simple number inputs
      if (/^\$?[\d,]+$/.test(query.trim())) {
        confidence = 0.98;
      } else if (/^(?:it'?s |about |around )?[\$]?[\d,]+$/i.test(query.trim())) {
        confidence = 0.95;
      }
      
      console.log('[SlotFilling] ✅ Budget amount detected:', amount, 'confidence:', confidence);
      return {
        slotName: 'budget',
        value: amount,
        confidence
      };
    }

    console.log('[SlotFilling] ❌ No budget amount found');
    return null;
  }

  /**
   * Extract payment amount from query using common utility
   */
  extractPaymentAmount(query) {
    console.log('[SlotFilling] Extracting payment amount from:', query);
    
    // Use common extraction utility
    const amount = extractAmount(query, { minDigits: 1, allowK: true });
    
    if (amount) {
      console.log('[SlotFilling] ✅ Payment amount detected:', amount);
      return {
        slotName: 'amount',
        value: amount,
        confidence: 0.85
      };
    }
    
    console.log('[SlotFilling] ❌ No payment amount found');
    return null;
  }

  /**
   * Extract card selection from query
   */
  extractCardSelection(query) {
    // Look for card names or numbers
    const cardMatch = query.match(/(?:card )?\#?(\d+)|([a-z\s]+(?:card|rewards|cash))/i);
    if (cardMatch) {
      return {
        slotName: 'cardName',
        value: cardMatch[1] || cardMatch[2],
        confidence: 0.80
      };
    }
    return null;
  }

  /**
   * Extract strategy preference
   */
  extractStrategyPreference(query) {
    const strategies = {
      'avalanche': ['avalanche', 'highest apr', 'highest interest', 'minimize interest'],
      'snowball': ['snowball', 'smallest balance', 'smallest first', 'quick wins'],
      'balanced': ['balanced', 'mix', 'combination', 'both']
    };

    for (const [strategy, patterns] of Object.entries(strategies)) {
      if (patterns.some(p => query.includes(p))) {
        return {
          slotName: 'strategy',
          value: strategy,
          confidence: 0.90
        };
      }
    }

    return null;
  }

  /**
   * Extract yes/no confirmation
   */
  extractConfirmation(query) {
    const yes = /^(yes|yeah|yep|sure|ok|okay|do it|go ahead|sounds good|let'?s do it)$/i;
    const no = /^(no|nope|nah|cancel|never mind|not now)$/i;

    if (yes.test(query)) {
      return {
        slotName: 'confirmed',
        value: true,
        confidence: 0.95
      };
    }

    if (no.test(query)) {
      return {
        slotName: 'confirmed',
        value: false,
        confidence: 0.95
      };
    }

    return null;
  }

  extractMemoryTag(rawQuery) {
    console.log('[SlotFilling] Extracting memory tag from:', rawQuery);

    const cleaned = rawQuery
      .replace(/^tag(?:ged)?(?:\s+it)?(?:\s+(?:as|with))?\s+/i, '')
      .replace(/^it's\s+/i, '')
      .trim();

    const { normalizedTags } = analyzeTags([cleaned || rawQuery], { allowEmpty: false });

    if (normalizedTags.length > 0) {
      return {
        slotName: 'tags',
        value: normalizedTags,
        confidence: 0.9
      };
    }

    return null;
  }

  /**
   * Fill a slot with extracted value
   * @param {string} slotName
   * @param {any} value
   */
  fillSlot(slotName, value) {
    this.slots[slotName] = value;
    console.log('[SlotFilling] Slot filled:', { slotName, value });
  }

  /**
   * Check if all required slots are filled
   * @returns {boolean}
   */
  allSlotsFilled() {
    return this.requiredSlots.every(slot => this.slots[slot] !== undefined);
  }

  /**
   * Get the intent to execute with filled slots
   * @returns {Object|null} - { intent, slots } or null
   */
  getReadyIntent() {
    if (!this.allSlotsFilled()) return null;

    const result = {
      intent: this.targetIntent,
      slots: { ...this.slots }
    };

    // Clear state after returning
    this.clear();

    return result;
  }

  /**
   * Clear slot-filling state
   */
  clear() {
    this.pendingQuestion = null;
    this.targetIntent = null;
    this.slots = {};
    this.requiredSlots = [];
    this.askedAt = null;
    console.log('[SlotFilling] State cleared');
  }

  /**
   * Get current state summary
   */
  getSummary() {
    return {
      hasPending: this.hasPendingQuestion(),
      questionType: this.pendingQuestion,
      targetIntent: this.targetIntent,
      filledSlots: Object.keys(this.slots),
      requiredSlots: this.requiredSlots,
      allFilled: this.allSlotsFilled()
    };
  }
}

/**
 * Global slot-filling manager (singleton per session)
 */
let globalSlotFillingState = null;

/**
 * Get or create slot-filling state
 * @returns {SlotFillingState}
 */
export function getSlotFillingState() {
  if (!globalSlotFillingState) {
    globalSlotFillingState = new SlotFillingState();
    console.log('[SlotFilling] New state created');
  }
  return globalSlotFillingState;
}

/**
 * Reset global slot-filling state
 */
export function resetSlotFillingState() {
  if (globalSlotFillingState) {
    globalSlotFillingState.clear();
  }
  globalSlotFillingState = null;
  console.log('[SlotFilling] Global state reset');
}

