# MVP Implementation Plan: Perfect Card Recommendations

## MVP Goal
User asks: **"What's the best card to book a flight ticket?"**
System responds: **Accurate, confident card recommendation with clear reasoning**

---

## Current State Analysis

### ✅ What We Have (Phase 1 Complete)
1. **categoryDefinitions.js** - All 14 categories defined
2. **mccCodeMapper.js** - MCC code → category mapping
3. **recommendationEngine.js** - Existing recommendation logic
4. **cardDataQueryHandler.js** - Chat query handling
5. **147 tests passing** - Fully tested foundation

### ❌ What's Missing for MVP
1. **merchantClassifier.js** - Not created (CRITICAL for MVP)
2. **categoryMatcher.js** - Not created (CRITICAL for MVP)
3. Integration between chat and Phase 1 services

---

## MVP Critical Path: "Best card for flight ticket"

```
User Input
"What's the best card to book a flight ticket?"
    ↓
[1] Entity Extraction (EXISTING - cardDataQueryHandler.js)
    Extract: merchant="flight ticket", category="travel", queryType="recommendation"
    ↓
[2] Merchant Classification (NEED TO CREATE - merchantClassifier.js)
    Input: "flight ticket"
    Output: category="travel", confidence=95%
    ↓
[3] Card Reward Matching (NEED TO CREATE - categoryMatcher.js)
    For each user card: Find reward multiplier for "travel" category
    ↓
[4] Scoring & Ranking (EXISTING - recommendationStrategies.js)
    Score: multiplier × amount = cashback value
    ↓
[5] User Response (EXISTING - cardDataQueryHandler.js)
    "Use your [Card Name]! Offers 3x on travel purchases"
```

---

## MVP Sprint: 1 Week (5 Business Days)

### Day 1: Create merchantClassifier.js (4 hours)
**Critical for MVP** - Classifies any merchant name to category

**What it does:**
```javascript
classifyMerchant("United Airlines")
→ { category: "travel", confidence: 0.99, source: "keyword" }

classifyMerchant("flight ticket")
→ { category: "travel", confidence: 0.95, source: "keyword" }

classifyMerchant("Delta")
→ { category: "travel", confidence: 0.98, source: "keyword" }
```

**Implementation:**
- Use categoryDefinitions.js keywords
- Use mccCodeMapper.js for MCC codes
- Return confidence score
- Handle edge cases (null, invalid input)

**Acceptance Criteria:**
- ✅ Classifies all 5 MVP categories (travel, dining, groceries, gas, rewards)
- ✅ Confidence score 0-100%
- ✅ <10ms execution time
- ✅ No external dependencies

---

### Day 2: Create categoryMatcher.js (3 hours)
**Critical for MVP** - Match category to card rewards

**What it does:**
```javascript
const card = {
  reward_structure: {
    dining: 4,
    travel: 3,
    groceries: 2,
    default: 1
  }
};

const matcher = new CategoryMatcher(card);
matcher.findRewardMultiplier("travel")
→ 3

matcher.findRewardMultiplier("unknown")
→ 1 (default)
```

**Implementation:**
- Exact category match
- Default fallback
- Handle simple numbers and complex objects
- Return multiplier value only

**Acceptance Criteria:**
- ✅ Finds correct multiplier for all categories
- ✅ Falls back to default for unknown
- ✅ Handles both number and object formats
- ✅ <5ms execution time

---

### Day 3: Integration & Testing (4 hours)

**Connect the Pipeline:**
```javascript
// In cardDataQueryHandler.js - add this flow:

1. Extract entities from user query
   merchant="flight ticket", queryType="recommendation"

2. Classify merchant
   classification = classifyMerchant("flight ticket")
   → category = "travel"

3. For each card, find reward multiplier
   cards.forEach(card => {
     multiplier = categoryMatcher.findRewardMultiplier(card, "travel")
   })

4. Score cards (existing logic)
5. Return best card with reason
```

**Write MVP Tests:**
- Test "flight ticket" → "travel" classification
- Test category matching for travel rewards
- Test full flow end-to-end
- Test with 3 demo cards

**Acceptance Criteria:**
- ✅ "Flight ticket" → "travel" with 95%+ confidence
- ✅ Best card identified correctly
- ✅ Confidence score shown
- ✅ Reason generated (e.g., "Offers 3x travel rewards")

---

### Day 4: Demo Card Updates (2 hours)

**Update /services/cardService.js demo cards:**

```javascript
// Current demo cards with travel rewards:
const DEMO_CARDS = [
  {
    id: "chase-sapphire",
    card_name: "Chase Sapphire Preferred",
    reward_structure: {
      dining: 3,
      travel: 3,        // ← Travel multiplier
      groceries: 1,
      default: 1
    }
  },
  {
    id: "amex-gold",
    card_name: "American Express Gold",
    reward_structure: {
      dining: 4,
      travel: 1,        // ← Lower travel multiplier
      groceries: 1,
      default: 1
    }
  },
  {
    id: "citi-custom",
    card_name: "Citi Custom Cash",
    reward_structure: {
      dining: 1,
      travel: 1,
      groceries: 1,
      default: 1
    }
  }
];
```

**Acceptance Criteria:**
- ✅ At least one card has 3x travel rewards
- ✅ At least one card has lower travel rewards
- ✅ Demo shows clear difference

---

### Day 5: Manual Testing & Refinement (3 hours)

**Test Scenarios:**

1. **Perfect Match**: "What's the best card for United Airlines?"
   - Expected: Chase Sapphire (3x travel)

2. **Fuzzy Match**: "Best card for booking flights?"
   - Expected: Chase Sapphire (3x travel)

3. **Category Match**: "Which card for travel?"
   - Expected: Chase Sapphire (3x travel)

4. **No Multiplier**: "What about bus tickets?"
   - Expected: Fallback to default (1x)
   - Message: "No special rewards, use any card"

5. **Multiple Words**: "Best card to book a flight ticket online?"
   - Expected: Chase Sapphire (3x travel)

**Acceptance Criteria:**
- ✅ 80%+ of queries return correct card
- ✅ Confidence shown with recommendation
- ✅ Reasoning is clear
- ✅ No errors in console
- ✅ <500ms response time

---

## Files to Create/Modify

### CREATE (New Files)
```
services/merchantClassification/merchantClassifier.js
├── classifyMerchant(merchantName, context)
├── getConfidence()
└── Multi-source: keyword → keyword → default

__tests__/unit/merchantClassifier.test.js
├── 30+ test cases
├── Test 5 MVP categories
└── Test edge cases
```

### CREATE (New Files)
```
services/recommendations/categoryMatcher.js
├── class CategoryMatcher
├── findRewardMultiplier(category)
├── handleDefault()
└── Support simple & complex structures

__tests__/unit/categoryMatcher.test.js
├── 20+ test cases
├── Test all reward structures
└── Test fallbacks
```

### MODIFY (Existing Files)
```
services/chat/cardDataQueryHandler.js
├── Add merchantClassifier integration
├── Add categoryMatcher integration
└── Improve response messages

services/cardService.js
├── Update demo cards with travel rewards
└── Ensure 3 different multiplier levels
```

### USE (Already Complete)
```
services/categories/categoryDefinitions.js ✅
services/merchantClassification/mccCodeMapper.js ✅
services/recommendations/recommendationStrategies.js ✅
services/recommendations/recommendationEngine.js ✅
```

---

## Minimal Code for MVP

### merchantClassifier.js - Minimal Version
```javascript
import { findCategory } from '../categories/categoryDefinitions';
import { classifyByMCCCode } from './mccCodeMapper';

export class MerchantClassifier {
  classify(merchantName, mccCode) {
    // Try MCC first (if provided)
    if (mccCode) {
      const mccResult = classifyByMCCCode(mccCode);
      if (mccResult.categoryId) {
        return {
          category: mccResult.categoryId,
          confidence: mccResult.confidence,
          source: 'mcc'
        };
      }
    }

    // Try keyword matching
    const category = findCategory(merchantName);
    if (category) {
      return {
        category: category.id,
        confidence: 0.85,  // Default keyword confidence
        source: 'keyword'
      };
    }

    // Default fallback
    return {
      category: null,
      confidence: 0,
      source: 'none'
    };
  }
}
```

### categoryMatcher.js - Minimal Version
```javascript
export class CategoryMatcher {
  constructor(card) {
    this.card = card;
    this.rewards = card.reward_structure || {};
  }

  findRewardMultiplier(category) {
    // Exact match
    if (this.rewards[category]) {
      const value = this.rewards[category];
      return typeof value === 'object' ? value.value : value;
    }

    // Default fallback
    const defaultValue = this.rewards.default || 1;
    return typeof defaultValue === 'object' ? defaultValue.value : defaultValue;
  }
}
```

### Integration in cardDataQueryHandler.js
```javascript
import { MerchantClassifier } from '../merchantClassification/merchantClassifier';
import { CategoryMatcher } from '../recommendations/categoryMatcher';

// In handleCardDataQuery function:
if (merchant) {
  const classifier = new MerchantClassifier();
  const classification = classifier.classify(merchant);

  if (!classification.category) {
    return `I couldn't identify "${merchant}". Try:\n• Store name: "United Airlines"\n• Category: "travel"`;
  }

  // Match rewards for each card
  const recommendations = cards.map(card => {
    const matcher = new CategoryMatcher(card);
    const multiplier = matcher.findRewardMultiplier(classification.category);
    return { card, multiplier, confidence: classification.confidence };
  });

  // Sort by multiplier and return best
  const best = recommendations.sort((a, b) => b.multiplier - a.multiplier)[0];

  return `For **${merchant}**, use your **${best.card.nickname}**!\n\nWhy? Offers **${best.multiplier}x** rewards on ${classification.category} purchases. (${Math.round(best.confidence)}% confident)`;
}
```

---

## MVP Success Criteria

### Code Quality ✅
- [x] Phase 1: 147 tests passing
- [ ] merchantClassifier.js: 30+ tests
- [ ] categoryMatcher.js: 20+ tests
- [ ] Total: 200+ tests
- Target: 95%+ pass rate, zero breaking changes

### Functionality ✅
- [ ] User asks about flight booking
- [ ] System classifies as "travel"
- [ ] Returns best travel card (3x rewards)
- [ ] Shows confidence score
- [ ] Explains reasoning clearly

### Performance ✅
- [ ] Classification: <10ms
- [ ] Matching: <5ms
- [ ] Total response: <500ms
- [ ] No network delays (all local)

### User Experience ✅
- [ ] Clear card recommendation
- [ ] Reasoning shown
- [ ] Confidence indicated
- [ ] Follow-up suggestions offered
- [ ] No errors or crashes

---

## Testing Schedule

### Day 1-2: Unit Tests (As you build)
```bash
npm test -- merchantClassifier.test.js --watch
npm test -- categoryMatcher.test.js --watch
```

### Day 3: Integration Tests
```bash
npm test -- recommendationFlow.test.js
```

### Day 4: Manual Testing
- Test in browser
- Ask 10 different queries
- Verify correct cards returned

### Day 5: Performance Testing
```bash
npm run test:performance
# Should show <500ms response time
```

---

## Risk Mitigation

### Risk 1: Merchant Name Variations
**"United Airlines" vs "United" vs "UA"**
- Solution: Add multiple keywords in categoryDefinitions
- Fallback: MCC code if available

### Risk 2: Category Not Found
**User: "Best card for a hot air balloon ride?"**
- Solution: Return helpful message with suggestions
- Don't crash, suggest adding cards

### Risk 3: No Cards Added
**User: "Best card for travel?" (no cards)**
- Solution: Existing code handles this
- Message: "Add cards to get recommendations"

### Risk 4: Multiple Categories Match
**"Travel restaurant" - both dining and travel?**
- Solution: Classify with highest confidence
- Support future multi-category queries

---

## MVP Phase Timeline

```
Week 1 (Nov 18-22):
  Mon (4h):  Create merchantClassifier.js
  Tue (3h):  Create categoryMatcher.js
  Wed (4h):  Integration & testing
  Thu (2h):  Update demo cards
  Fri (3h):  Manual testing & refinement

Total: 16 hours
Outcome: MVP Ready for Production
```

---

## After MVP: Expansion

### Week 2: Remaining Categories
- Add support for: streaming, drugstores, home_improvement, etc.
- Update demo cards with more variety
- More comprehensive testing

### Week 3: Advanced Features
- Confidence explanations ("95% sure because...")
- Multiple card suggestions ranked by value
- Category rotation support (e.g., rotating 5x categories)

### Week 4: Production Hardening
- Performance optimization
- Monitoring and logging
- A/B testing support

---

## Acceptance: MVP Complete

When these 3 things work perfectly:

```
✅ User: "What's the best card for United Airlines?"
   System: "Use Chase Sapphire Preferred! Offers 3x on travel."

✅ User: "Best card to book flights?"
   System: "Use Chase Sapphire Preferred! Offers 3x on travel."

✅ User: "Which card for Delta?"
   System: "Use Chase Sapphire Preferred! Offers 3x on travel."
```

**MVP = DONE** ✅

When all 3 work → Production Ready
