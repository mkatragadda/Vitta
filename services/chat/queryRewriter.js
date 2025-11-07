/**
 * Query Rewriter
 * Resolves references and binds entities from conversation context
 * Transforms ambiguous follow-ups into explicit queries
 * 
 * Example:
 * - Context: Last query was "which card for groceries"
 * - Input: "compare all strategies"
 * - Output: "compare all card strategies for groceries"
 */

/**
 * Rewrite query with conversation context
 * @param {string} query - Original user query
 * @param {Object} context - Conversation context from ConversationContext
 * @returns {Object} - { rewritten, confidence, reason, directRoute }
 */
export function rewriteQueryWithContext(query, context = {}) {
  const lowerQuery = query.toLowerCase().trim();
  const { lastIntent, entities = {}, pendingActions = [] } = context;

  console.log('[QueryRewriter] Analyzing query:', query);
  console.log('[QueryRewriter] Context:', { lastIntent, entities: Object.keys(entities), pendingActions });

  // No context available - return original
  if (!lastIntent) {
    return {
      rewritten: query,
      confidence: 0,
      reason: 'No conversation context',
      directRoute: null
    };
  }

  // ============================================
  // PATTERN 1: "compare all strategies" follow-up
  // ============================================
  if (lastIntent === 'card_recommendation' && /compare.*(all|different)?.*(strateg|option|approach)/i.test(query)) {
    const { merchant, category, amount } = entities;
    
    console.log('[QueryRewriter] Compare strategies pattern matched!', { merchant, category, amount });
    
    // Build explicit query with context
    let rewritten = 'compare all card strategies';
    
    if (merchant) {
      rewritten += ` for ${merchant}`;
    } else if (category) {
      rewritten += ` for ${category}`;
    }
    
    if (amount) {
      rewritten += ` ($${amount})`;
    }

    return {
      rewritten,
      confidence: 0.98, // Increased from 0.95 to ensure direct routing
      reason: 'Follow-up: compare strategies after recommendation',
      directRoute: {
        intent: 'card_recommendation',
        action: 'compare_strategies',
        entities: { merchant, category, amount }
      }
    };
  }

  // ============================================
  // PATTERN 2: "show alternatives" / "other options"
  // ============================================
  if (lastIntent === 'card_recommendation' && /show.*(alternative|other|more)|other.*(card|option)|what.*else/i.test(query)) {
    const { merchant, category, amount } = entities;
    
    let rewritten = 'show alternative cards';
    
    if (merchant) {
      rewritten += ` for ${merchant}`;
    } else if (category) {
      rewritten += ` for ${category}`;
    }

    return {
      rewritten,
      confidence: 0.90,
      reason: 'Follow-up: requesting alternatives',
      directRoute: {
        intent: 'card_recommendation',
        action: 'show_alternatives',
        entities: { merchant, category, amount }
      }
    };
  }

  // ============================================
  // PATTERN 3: "why not use [card]"
  // ============================================
  const whyNotMatch = query.match(/why not (use )?([a-z\s]+)/i);
  if (lastIntent === 'card_recommendation' && whyNotMatch) {
    const cardName = whyNotMatch[2].trim();
    const { merchant, category } = entities;
    
    let rewritten = `explain why ${cardName} is not recommended`;
    
    if (merchant) {
      rewritten += ` for ${merchant}`;
    } else if (category) {
      rewritten += ` for ${category}`;
    }

    return {
      rewritten,
      confidence: 0.85,
      reason: 'Follow-up: questioning recommendation',
      directRoute: {
        intent: 'card_recommendation',
        action: 'explain_rejection',
        entities: { merchant, category, rejectedCard: cardName }
      }
    };
  }

  // ============================================
  // PATTERN 4: Pronoun resolution ("explain it", "show me that")
  // ============================================
  if (/^(explain|show|tell me about|what is|what are) (it|that|this|those|these)$/i.test(query)) {
    if (lastIntent === 'card_recommendation') {
      return {
        rewritten: 'explain the card recommendation strategy',
        confidence: 0.80,
        reason: 'Pronoun resolution: referring to recommendation',
        directRoute: {
          intent: 'card_recommendation',
          action: 'explain_strategy',
          entities
        }
      };
    }
    
    if (lastIntent === 'debt_guidance') {
      return {
        rewritten: 'explain the debt payoff strategy',
        confidence: 0.80,
        reason: 'Pronoun resolution: referring to debt strategy',
        directRoute: null
      };
    }
  }

  // ============================================
  // PATTERN 5: Affirmative follow-up ("yes", "ok", "do it")
  // ============================================
  if (/^(yes|yeah|yep|ok|okay|sure|do it|go ahead|sounds good|let's do it)$/i.test(query)) {
    // Check if there's a pending action
    if (pendingActions.includes('compare_strategies')) {
      return {
        rewritten: 'compare all strategies',
        confidence: 0.75,
        reason: 'Affirmative response to pending action',
        directRoute: {
          intent: 'card_recommendation',
          action: 'compare_strategies',
          entities
        }
      };
    }
    
    if (pendingActions.includes('detailed_plan')) {
      return {
        rewritten: 'show detailed payment plan',
        confidence: 0.75,
        reason: 'Affirmative response to detailed plan offer',
        directRoute: {
          intent: 'split_payment',
          entities
        }
      };
    }
  }

  // ============================================
  // PATTERN 6: "the same" / "same thing"
  // ============================================
  if (/the same|same (thing|one)|repeat|again/i.test(query) && lastIntent) {
    return {
      rewritten: context.lastQuery || query,
      confidence: 0.70,
      reason: 'Repeat last query',
      directRoute: {
        intent: lastIntent,
        entities
      }
    };
  }

  // ============================================
  // PATTERN 7: Implicit follow-up with entity binding
  // ============================================
  // Example: After "which card for groceries", user asks "what about dining"
  if (lastIntent === 'card_recommendation' && /what about|how about/i.test(query)) {
    // Extract new entity from query
    const newEntityMatch = query.match(/what about|how about ([a-z\s]+)/i);
    if (newEntityMatch) {
      const newEntity = newEntityMatch[1].trim();
      return {
        rewritten: `which card for ${newEntity}`,
        confidence: 0.75,
        reason: 'Implicit follow-up with new entity',
        directRoute: {
          intent: 'card_recommendation',
          entities: { merchant: newEntity }
        }
      };
    }
  }

  // ============================================
  // PATTERN 8: debt_guidance follow-ups
  // ============================================
  if (lastIntent === 'debt_guidance') {
    // "show me the plan" / "create a plan"
    if (/show.*(plan|strategy)|create.*plan|give me.*plan|detailed.*plan/i.test(query)) {
      return {
        rewritten: 'create detailed debt payoff plan',
        confidence: 0.85,
        reason: 'Follow-up: requesting detailed debt plan',
        directRoute: {
          intent: 'split_payment',
          action: 'debt_payoff_plan',
          entities
        }
      };
    }

    // "how much should I pay" / "what should I pay"
    if (/how much.*(pay|should)|what.*(pay|amount)/i.test(query)) {
      return {
        rewritten: 'calculate optimal payment amounts',
        confidence: 0.80,
        reason: 'Follow-up: requesting payment amounts',
        directRoute: {
          intent: 'split_payment',
          action: 'calculate_payments',
          entities
        }
      };
    }

    // "what about snowball" / "use snowball instead"
    if (/snowball|smallest.*balance.*first/i.test(query)) {
      return {
        rewritten: 'show snowball method for debt payoff',
        confidence: 0.85,
        reason: 'Follow-up: requesting snowball strategy',
        directRoute: {
          intent: 'debt_guidance',
          action: 'snowball_method',
          entities
        }
      };
    }
  }

  // ============================================
  // PATTERN 9: money_coaching follow-ups
  // ============================================
  if (lastIntent === 'money_coaching') {
    // "explain more" / "tell me more"
    if (/explain more|tell me more|more detail|elaborate/i.test(query)) {
      return {
        rewritten: 'provide more details about ' + (context.lastQuery || 'credit card management'),
        confidence: 0.75,
        reason: 'Follow-up: requesting more details',
        directRoute: null // Let GPT handle with context
      };
    }

    // "what about X" (specific topic)
    const topicMatch = query.match(/what about|how about (balance transfer|grace period|apr|utilization|credit score)/i);
    if (topicMatch) {
      const topic = topicMatch[1];
      return {
        rewritten: `explain ${topic} in credit cards`,
        confidence: 0.80,
        reason: 'Follow-up: asking about specific topic',
        directRoute: {
          intent: 'money_coaching',
          entities: { topic }
        }
      };
    }
  }

  // ============================================
  // PATTERN 10: split_payment follow-ups
  // ============================================
  if (lastIntent === 'split_payment') {
    // "use avalanche" / "prioritize highest APR"
    if (/avalanche|highest.*apr.*first|minimize.*interest/i.test(query)) {
      return {
        rewritten: 'split payment using avalanche method',
        confidence: 0.85,
        reason: 'Follow-up: requesting avalanche strategy',
        directRoute: {
          intent: 'split_payment',
          action: 'avalanche',
          entities
        }
      };
    }

    // "what if I pay more" / "what if I have $X"
    const whatIfMatch = query.match(/what if.*\$?(\d+)|if.*pay.*\$?(\d+)/i);
    if (whatIfMatch) {
      const amount = whatIfMatch[1] || whatIfMatch[2];
      return {
        rewritten: `split $${amount} between cards`,
        confidence: 0.85,
        reason: 'Follow-up: what-if scenario',
        directRoute: {
          intent: 'split_payment',
          entities: { ...entities, amount: parseFloat(amount) }
        }
      };
    }

    // "recalculate" / "try again"
    if (/recalculate|try again|redo|different.*amount/i.test(query)) {
      return {
        rewritten: 'recalculate payment split',
        confidence: 0.75,
        reason: 'Follow-up: recalculation request',
        directRoute: {
          intent: 'split_payment',
          entities
        }
      };
    }
  }

  // ============================================
  // PATTERN 11: query_card_data follow-ups
  // ============================================
  if (lastIntent === 'query_card_data') {
    // "what about [card name]"
    const cardMatch = query.match(/what about|tell me about|show me ([a-z\s]+card|chase|amex|discover|capital one)/i);
    if (cardMatch) {
      const cardName = cardMatch[1];
      return {
        rewritten: `show details for ${cardName}`,
        confidence: 0.80,
        reason: 'Follow-up: asking about specific card',
        directRoute: {
          intent: 'query_card_data',
          entities: { cardName }
        }
      };
    }

    // "show details" / "more info"
    if (/show.*detail|more.*info|full.*info|complete.*info/i.test(query)) {
      return {
        rewritten: 'show detailed card information',
        confidence: 0.75,
        reason: 'Follow-up: requesting more details',
        directRoute: {
          intent: 'query_card_data',
          entities
        }
      };
    }
  }

  // ============================================
  // PATTERN 12: Generic follow-up (low confidence)
  // ============================================
  if (context.isFollowUp && /^(and|also|plus|additionally)/i.test(query)) {
    // Prepend context for better classification
    const contextPrefix = entities.merchant ? `for ${entities.merchant}, ` : '';
    return {
      rewritten: contextPrefix + query,
      confidence: 0.50,
      reason: 'Generic follow-up - added context prefix',
      directRoute: null
    };
  }

  // ============================================
  // No rewrite needed
  // ============================================
  return {
    rewritten: query,
    confidence: 0,
    reason: 'No context match - using original query',
    directRoute: null
  };
}

/**
 * Check if query should bypass normal classification and route directly
 * @param {Object} rewriteResult - Result from rewriteQueryWithContext
 * @returns {boolean}
 */
export function shouldDirectRoute(rewriteResult) {
  return rewriteResult.confidence >= 0.85 && rewriteResult.directRoute !== null;
}

/**
 * Format entities for logging
 * @param {Object} entities
 * @returns {string}
 */
export function formatEntitiesForLog(entities) {
  return Object.entries(entities)
    .filter(([_, value]) => value !== null && value !== undefined)
    .map(([key, value]) => `${key}=${value}`)
    .join(', ');
}

