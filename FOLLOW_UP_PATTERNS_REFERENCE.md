# Follow-Up Patterns Reference Guide

**Complete list of all supported follow-up patterns across ALL intents**

---

## Overview

The context-aware follow-up system now supports **12 distinct patterns** covering **5 major intents**:
- ✅ `card_recommendation` (3 patterns)
- ✅ `debt_guidance` (3 patterns)
- ✅ `money_coaching` (2 patterns)
- ✅ `split_payment` (3 patterns)
- ✅ `query_card_data` (2 patterns)
- ✅ Generic patterns (3 patterns)

---

## Pattern Reference

### 1. card_recommendation Follow-Ups

#### Pattern 1.1: Compare All Strategies
**Confidence:** 0.95 (Direct Route)

**Trigger Phrases:**
- "compare all strategies"
- "compare different strategies"
- "compare all options"
- "show all approaches"

**Example Flow:**
```
Turn 1: "which card for groceries"
  → Response: "Use Customized Cash Rewards (5% cashback)... Want to compare all strategies?"

Turn 2: "compare all strategies"
  → Rewritten: "compare all card strategies for groceries"
  → Direct Route: card_recommendation → compare_strategies
  → Response: Shows 3 strategies (Rewards, APR, Cashflow) with detailed comparison
```

**Context Preserved:**
- `merchant` (e.g., "groceries", "Target")
- `category` (e.g., "dining", "gas")
- `amount` (e.g., $150)

---

#### Pattern 1.2: Show Alternatives
**Confidence:** 0.90 (Direct Route)

**Trigger Phrases:**
- "show alternatives"
- "other options"
- "what else"
- "show other cards"
- "more options"

**Example Flow:**
```
Turn 1: "best card for Target"
  → Response: "Use Unlimited Cash Rewards..."

Turn 2: "show alternatives"
  → Rewritten: "show alternative cards for Target"
  → Direct Route: card_recommendation → show_alternatives
  → Response: Lists 2-3 alternative cards with scores
```

---

#### Pattern 1.3: Why Not Use X
**Confidence:** 0.85 (Direct Route)

**Trigger Phrases:**
- "why not use [card name]"
- "why not [card name]"

**Example Flow:**
```
Turn 1: "which card for dining"
  → Response: "Use Travel Rewards (3x points)..."

Turn 2: "why not use Customized Cash Rewards"
  → Rewritten: "explain why Customized Cash Rewards is not recommended for dining"
  → Direct Route: card_recommendation → explain_rejection
  → Response: "Travel Rewards scored 85 vs Customized Cash Rewards 72 because..."
```

**Context Preserved:**
- `merchant` or `category`
- `rejectedCard` (extracted from query)

---

### 2. debt_guidance Follow-Ups

#### Pattern 2.1: Show Detailed Plan
**Confidence:** 0.85 (Direct Route)

**Trigger Phrases:**
- "show me the plan"
- "create a plan"
- "give me a plan"
- "detailed plan"
- "show strategy"

**Example Flow:**
```
Turn 1: "how to reduce my debt"
  → Response: "Great question! You can use avalanche or snowball method..."

Turn 2: "show me the plan"
  → Rewritten: "create detailed debt payoff plan"
  → Direct Route: split_payment → debt_payoff_plan
  → Response: Shows month-by-month payment plan with interest savings
```

**Context Preserved:**
- All card balances and APRs
- User's payment budget

---

#### Pattern 2.2: How Much Should I Pay
**Confidence:** 0.80 (Direct Route)

**Trigger Phrases:**
- "how much should I pay"
- "what should I pay"
- "how much to pay"
- "what amount"

**Example Flow:**
```
Turn 1: "how to reduce my debt"
  → Response: "You should prioritize high APR cards..."

Turn 2: "how much should I pay"
  → Rewritten: "calculate optimal payment amounts"
  → Direct Route: split_payment → calculate_payments
  → Response: "Pay $450 to Chase Freedom (19.9% APR), $300 to Discover..."
```

---

#### Pattern 2.3: Snowball Method
**Confidence:** 0.85 (Direct Route)

**Trigger Phrases:**
- "snowball"
- "smallest balance first"
- "what about snowball"
- "use snowball instead"

**Example Flow:**
```
Turn 1: "how to reduce my debt"
  → Response: "Avalanche method saves most interest..."

Turn 2: "what about snowball"
  → Rewritten: "show snowball method for debt payoff"
  → Direct Route: debt_guidance → snowball_method
  → Response: "Snowball method: Pay off smallest balances first for quick wins..."
```

---

### 3. money_coaching Follow-Ups

#### Pattern 3.1: Explain More
**Confidence:** 0.75 (GPT with Context)

**Trigger Phrases:**
- "explain more"
- "tell me more"
- "more details"
- "elaborate"

**Example Flow:**
```
Turn 1: "how to improve my credit score"
  → Response: "Keep utilization under 30%, pay on time..."

Turn 2: "explain more"
  → Rewritten: "provide more details about how to improve my credit score"
  → Routed to: GPT with full context
  → Response: Detailed explanation with examples
```

---

#### Pattern 3.2: Specific Topic
**Confidence:** 0.80 (Direct Route)

**Trigger Phrases:**
- "what about [topic]"
- "how about [topic]"

**Supported Topics:**
- balance transfer
- grace period
- APR
- utilization
- credit score

**Example Flow:**
```
Turn 1: "how do credit cards work"
  → Response: "Credit cards let you borrow money..."

Turn 2: "what about grace periods"
  → Rewritten: "explain grace period in credit cards"
  → Direct Route: money_coaching
  → Response: "Grace period is 21-25 days where you don't pay interest..."
```

---

### 4. split_payment Follow-Ups

#### Pattern 4.1: Use Avalanche
**Confidence:** 0.85 (Direct Route)

**Trigger Phrases:**
- "avalanche"
- "highest APR first"
- "minimize interest"
- "use avalanche"

**Example Flow:**
```
Turn 1: "split $1000 between my cards"
  → Response: "Based on your goal (Rewards Max), here's the split..."

Turn 2: "use avalanche"
  → Rewritten: "split payment using avalanche method"
  → Direct Route: split_payment → avalanche
  → Response: Recalculates with avalanche strategy
```

---

#### Pattern 4.2: What-If Scenarios
**Confidence:** 0.85 (Direct Route)

**Trigger Phrases:**
- "what if I pay $[amount]"
- "what if I have $[amount]"
- "if I pay $[amount]"

**Example Flow:**
```
Turn 1: "split $1000 between my cards"
  → Response: Shows split for $1000

Turn 2: "what if I pay $1500"
  → Rewritten: "split $1500 between cards"
  → Direct Route: split_payment
  → Response: Shows new split for $1500
```

**Context Preserved:**
- All card balances
- User's strategy preference

---

#### Pattern 4.3: Recalculate
**Confidence:** 0.75 (Direct Route)

**Trigger Phrases:**
- "recalculate"
- "try again"
- "redo"
- "different amount"

**Example Flow:**
```
Turn 1: "split $1000 between my cards"
  → Response: Shows split

Turn 2: "recalculate"
  → Rewritten: "recalculate payment split"
  → Direct Route: split_payment
  → Response: Recalculates with current data
```

---

### 5. query_card_data Follow-Ups

#### Pattern 5.1: Specific Card
**Confidence:** 0.80 (Direct Route)

**Trigger Phrases:**
- "what about [card name]"
- "tell me about [card name]"
- "show me [card name]"

**Example Flow:**
```
Turn 1: "show my cards"
  → Response: Lists all cards

Turn 2: "what about Chase Freedom"
  → Rewritten: "show details for Chase Freedom"
  → Direct Route: query_card_data
  → Response: Shows detailed info for Chase Freedom
```

---

#### Pattern 5.2: Show Details
**Confidence:** 0.75 (Direct Route)

**Trigger Phrases:**
- "show details"
- "more info"
- "full info"
- "complete info"

**Example Flow:**
```
Turn 1: "what's my balance"
  → Response: "Total balance: $5,432"

Turn 2: "show details"
  → Rewritten: "show detailed card information"
  → Direct Route: query_card_data
  → Response: Shows per-card breakdown
```

---

### 6. Generic Follow-Up Patterns

#### Pattern 6.1: Pronoun Resolution
**Confidence:** 0.80 (Context-Aware)

**Trigger Phrases:**
- "explain it"
- "show me that"
- "tell me about it"
- "what is that"

**Example Flow:**
```
Turn 1: "which card for groceries"
  → Response: "Use Customized Cash Rewards..."

Turn 2: "explain it"
  → Rewritten: "explain the card recommendation strategy"
  → Response: Explains rewards maximization logic
```

---

#### Pattern 6.2: Affirmative Response
**Confidence:** 0.75 (Pending Action)

**Trigger Phrases:**
- "yes"
- "ok"
- "sure"
- "do it"
- "go ahead"
- "sounds good"

**Example Flow:**
```
Turn 1: "which card for groceries"
  → Response: "Use Customized Cash Rewards... Want to compare all strategies?"
  → Pending Action: compare_strategies

Turn 2: "yes"
  → Executes: compare_strategies
  → Response: Shows 3 strategies comparison
```

**Requires:** Pending action in context

---

#### Pattern 6.3: Repeat Last Query
**Confidence:** 0.70 (Context-Aware)

**Trigger Phrases:**
- "the same"
- "same thing"
- "repeat"
- "again"

**Example Flow:**
```
Turn 1: "which card for groceries"
  → Response: "Use Customized Cash Rewards..."

Turn 2: "the same"
  → Rewritten: "which card for groceries" (last query)
  → Response: Same recommendation
```

---

## Implementation Details

### Confidence Thresholds

| Confidence | Action | Example |
|------------|--------|---------|
| **≥ 0.85** | Direct Route (bypass classification) | "compare all strategies" |
| **0.70-0.84** | Use rewritten query for classification | "explain it" |
| **0.50-0.69** | Add context prefix only | "and also..." |
| **< 0.50** | Use original query | Normal processing |

### Context Storage

**Per Turn:**
```javascript
{
  query: "which card for groceries",
  intent: "card_recommendation",
  entities: { merchant: "groceries", category: null, amount: null },
  response: "Use Customized Cash Rewards...",
  timestamp: 1699300000000
}
```

**Active Context:**
```javascript
{
  lastIntent: "card_recommendation",
  lastQuery: "which card for groceries",
  entities: { merchant: "groceries" },
  pendingActions: ["compare_strategies"],
  isFollowUp: true,
  historySize: 3
}
```

### Memory Management

- **Sliding window:** Last 5 turns (configurable)
- **Memory per session:** ~5KB
- **Persistence:** In-memory (resets on refresh)
- **Cleanup:** Automatic (FIFO)

---

## Testing Checklist

### card_recommendation
- [ ] "which card for groceries" → "compare all strategies"
- [ ] "best card for Target" → "show alternatives"
- [ ] "which card for dining" → "why not use Chase Freedom"

### debt_guidance
- [ ] "how to reduce my debt" → "show me the plan"
- [ ] "how to reduce my debt" → "how much should I pay"
- [ ] "how to reduce my debt" → "what about snowball"

### money_coaching
- [ ] "how to improve credit score" → "explain more"
- [ ] "how do credit cards work" → "what about grace periods"

### split_payment
- [ ] "split $1000 between cards" → "use avalanche"
- [ ] "split $1000 between cards" → "what if I pay $1500"
- [ ] "split $1000 between cards" → "recalculate"

### query_card_data
- [ ] "show my cards" → "what about Chase Freedom"
- [ ] "what's my balance" → "show details"

### Generic
- [ ] Any intent → "explain it"
- [ ] Any intent with CTA → "yes"
- [ ] Any intent → "the same"

---

## Debugging

### Console Logs to Watch

```javascript
// Context tracking
[ConversationContext] Turn added: { intent: 'card_recommendation', entitiesCount: 1 }

// Query rewriting
[QueryRewriter] Analyzing query: compare all strategies
[QueryRewriter] Context: { lastIntent: 'card_recommendation', entities: ['merchant'] }

// Rewrite result
[ConversationEngineV2] Query rewrite: {
  original: 'compare all strategies',
  rewritten: 'compare all card strategies for groceries',
  confidence: 0.95,
  reason: 'Follow-up: compare strategies after recommendation'
}

// Direct routing
[ConversationEngineV2] Direct routing to: {
  intent: 'card_recommendation',
  action: 'compare_strategies'
}
```

### Manual Testing

```javascript
// In browser console
import { getConversationContext } from './services/chat/conversationContext.js';

const ctx = getConversationContext();

// Check state
console.log(ctx.getSummary());
// { historySize: 3, lastIntent: 'card_recommendation', activeEntities: ['merchant'], pendingActions: [] }

// Check if query is follow-up
console.log(ctx.isFollowUp('compare all strategies'));
// true

// Reset context
ctx.reset();
```

---

## Adding New Patterns

To add a new follow-up pattern:

1. **Add to `queryRewriter.js`:**
```javascript
if (lastIntent === 'your_intent' && /your pattern/i.test(query)) {
  return {
    rewritten: 'explicit query',
    confidence: 0.85,
    reason: 'Follow-up: description',
    directRoute: {
      intent: 'your_intent',
      action: 'your_action',
      entities: { ...entities }
    }
  };
}
```

2. **Add handler in `conversationEngineV2.js`:**
```javascript
else if (intent === 'your_intent' && action === 'your_action') {
  // Handle the action
  response = await yourHandler(entities, userData);
  await logIntentDetection(rewritten, intent, 0.85, 'direct_route', userData.user_id);
}
```

3. **Test the pattern:**
   - Trigger the parent intent
   - Send the follow-up query
   - Verify correct routing and response

---

## Summary

**Total Patterns:** 12  
**Intents Covered:** 5 (all major intents)  
**Confidence Range:** 0.50 - 0.95  
**Direct Routes:** 9 (high-confidence patterns)  
**Context-Aware Routes:** 3 (GPT with context)

**Coverage:**
- ✅ Task-oriented follow-ups (card selection, payments)
- ✅ Guidance follow-ups (debt, coaching)
- ✅ Data query follow-ups (card info)
- ✅ Generic conversational follow-ups (pronouns, affirmations)

**Backward Compatible:** All existing queries work unchanged.

Ready for comprehensive testing! 🚀


