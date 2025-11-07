/**
 * Conversation Context Manager
 * Tracks conversation state across turns for context-aware intent classification
 * 
 * Architecture: Session-based (in-memory)
 * - Lightweight and fast
 * - No database overhead
 * - Context resets on page refresh (acceptable for chat UX)
 */

/**
 * ConversationContext class
 * Maintains sliding window of conversation history and active entities
 */
export class ConversationContext {
  constructor(maxHistorySize = 5) {
    this.history = [];              // Last N turns
    this.activeEntities = {};       // Current entities in focus (merchant, category, amount, etc.)
    this.pendingActions = [];       // CTAs mentioned in responses
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * Add a conversation turn to history
   * @param {string} query - User query
   * @param {string} intent - Detected intent
   * @param {Object} entities - Extracted entities
   * @param {string} response - Bot response
   */
  addTurn(query, intent, entities = {}, response = '') {
    const turn = {
      query,
      intent,
      entities,
      response,
      timestamp: Date.now()
    };

    this.history.push(turn);

    // Maintain sliding window
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }

    // Update active entities (merge with previous, new values override)
    this.activeEntities = {
      ...this.activeEntities,
      ...entities
    };

    // Extract pending actions from response
    this.extractPendingActions(response);

    console.log('[ConversationContext] Turn added:', {
      intent,
      entitiesCount: Object.keys(entities).length,
      historySize: this.history.length
    });
  }

  /**
   * Extract actionable CTAs from bot response
   * @param {string} response - Bot response text
   */
  extractPendingActions(response) {
    if (!response) return;

    const ctaPatterns = [
      { pattern: /compare all strategies/i, action: 'compare_strategies' },
      { pattern: /show.*alternatives/i, action: 'show_alternatives' },
      { pattern: /why not use/i, action: 'explain_rejection' },
      { pattern: /see full analysis/i, action: 'full_analysis' },
      { pattern: /detailed plan/i, action: 'detailed_plan' }
    ];

    ctaPatterns.forEach(({ pattern, action }) => {
      if (pattern.test(response)) {
        if (!this.pendingActions.includes(action)) {
          this.pendingActions.push(action);
        }
      }
    });
  }

  /**
   * Check if query is likely a follow-up to previous turn
   * @param {string} query - Current query
   * @returns {boolean}
   */
  isFollowUp(query) {
    if (this.history.length === 0) return false;

    const lowerQuery = query.toLowerCase().trim();

    // Pattern 1: Starts with follow-up keywords
    const followUpStarters = /^(compare|show|explain|why|what about|how about|tell me|yes|ok|sure|do it|go ahead)/i;
    if (followUpStarters.test(lowerQuery)) return true;

    // Pattern 2: Contains references to previous context
    const contextReferences = /(that|this|it|the same|those|these|all strategies|alternatives)/i;
    if (contextReferences.test(lowerQuery)) return true;

    // Pattern 3: Very short query (likely continuation)
    if (lowerQuery.split(' ').length <= 3 && !/^(hi|hello|hey|thanks|bye)/.test(lowerQuery)) {
      return true;
    }

    return false;
  }

  /**
   * Get the last intent from history
   * @returns {string|null}
   */
  getLastIntent() {
    return this.history.length > 0 
      ? this.history[this.history.length - 1].intent 
      : null;
  }

  /**
   * Get the last N intents
   * @param {number} n - Number of intents to retrieve
   * @returns {string[]}
   */
  getLastNIntents(n = 3) {
    return this.history
      .slice(-n)
      .map(turn => turn.intent)
      .filter(Boolean);
  }

  /**
   * Get active conversation context
   * @returns {Object}
   */
  getActiveContext() {
    return {
      lastIntent: this.getLastIntent(),
      lastQuery: this.history.length > 0 ? this.history[this.history.length - 1].query : null,
      entities: { ...this.activeEntities },
      pendingActions: [...this.pendingActions],
      isFollowUp: this.history.length > 0,
      historySize: this.history.length
    };
  }

  /**
   * Check if a specific action is pending
   * @param {string} action - Action to check
   * @returns {boolean}
   */
  hasPendingAction(action) {
    return this.pendingActions.includes(action);
  }

  /**
   * Clear a pending action (after it's been executed)
   * @param {string} action - Action to clear
   */
  clearPendingAction(action) {
    this.pendingActions = this.pendingActions.filter(a => a !== action);
  }

  /**
   * Clear all active entities (start fresh context)
   */
  clearEntities() {
    this.activeEntities = {};
    console.log('[ConversationContext] Entities cleared');
  }

  /**
   * Reset entire context (new conversation)
   */
  reset() {
    this.history = [];
    this.activeEntities = {};
    this.pendingActions = [];
    console.log('[ConversationContext] Context reset');
  }

  /**
   * Get summary for debugging
   * @returns {Object}
   */
  getSummary() {
    return {
      historySize: this.history.length,
      lastIntent: this.getLastIntent(),
      activeEntities: Object.keys(this.activeEntities),
      pendingActions: this.pendingActions
    };
  }
}

/**
 * Global context instance (singleton per session)
 * In a real app, this would be per-user session
 */
let globalContext = null;

/**
 * Get or create conversation context
 * @returns {ConversationContext}
 */
export function getConversationContext() {
  if (!globalContext) {
    globalContext = new ConversationContext();
    console.log('[ConversationContext] New context created');
  }
  return globalContext;
}

/**
 * Reset global context (for testing or new session)
 */
export function resetConversationContext() {
  if (globalContext) {
    globalContext.reset();
  }
  globalContext = null;
  console.log('[ConversationContext] Global context reset');
}


