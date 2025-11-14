# Enhanced Recommendation Engine - Architecture Diagrams

## 1. System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  USER INTERACTION                                                           │
│                                                                             │
│  Chat: "What's the best card for Netflix?"                                 │
│  UI:   "Which card should I use at Amazon?"                                │
│                                                                             │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ NATURAL LANGUAGE PROCESSING (Existing)                                     │
│                                                                             │
│  Extract intent: "recommendation"                                           │
│  Extract entity: merchant="Netflix" or merchant="Amazon"                    │
│                                                                             │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ENHANCED SYSTEM (NEW)                              │
│                                                                             │
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │ 1. MERCHANT CLASSIFIER                                               │ │
│ │    Input:  merchant="Netflix" (optionally: mcc_code=4899)            │ │
│ │    Process:                                                           │ │
│ │      1. Check LRU Cache (1000 items, <100ms)                        │ │
│ │      2. Try MCC Code → category mapping                             │ │
│ │      3. Try Database lookup (known merchants)                       │ │
│ │      4. Try Keyword matching against 14 categories                  │ │
│ │      5. Return confidence score (0-100%)                            │ │
│ │    Output: { category: "streaming", confidence: 95, source: "mcc" } │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                               │                                             │
│                               ▼                                             │
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │ 2. CATEGORY MATCHER (For each user card)                             │ │
│ │    Input:  card={...}, category="streaming"                          │ │
│ │    Process:                                                           │ │
│ │      1. Try exact match: reward_structure["streaming"]               │ │
│ │      2. Try aliases: ["streaming", "subscriptions", "digital"]       │ │
│ │      3. Try parent category fallback                                 │ │
│ │      4. Try rotating categories                                      │ │
│ │      5. Fall back to default (1x)                                    │ │
│ │    Output: { multiplier: 2, source: "exact_match", confidence: 1.0 } │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                               │                                             │
│                               ▼                                             │
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │ 3. CARD SCORER (For each card + category combo)                      │ │
│ │    Input:  card={...}, multiplier=2, amount=9.99                     │ │
│ │    Calculate:                                                         │ │
│ │      • Reward Value: (multiplier - 1) × amount = $9.99               │ │
│ │      • APR Penalty: low APR = bonus points                           │ │
│ │      • Available Credit: ensure can charge this amount               │ │
│ │      • Utilization Penalty: prefer lower utilization                 │ │
│ │      • Total Score: (multiplier × 10) + bonuses + penalties          │ │
│ │    Output: { card: "Card A", score: 23.5, reason: "2x streaming" }   │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                               │                                             │
│                               ▼                                             │
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │ 4. RECOMMENDATION RANKER                                             │ │
│ │    Input:  [ {card A, score 23.5},                                   │ │
│ │             {card B, score 21.2},                                    │ │
│ │             {card C, score 18.9} ]                                   │ │
│ │    Process:                                                           │ │
│ │      1. Sort by score descending                                     │ │
│ │      2. Take top 3 as alternatives                                   │ │
│ │      3. Generate human-readable explanations                         │ │
│ │      4. Add confidence indicators                                    │ │
│ │    Output: { primary: CardA, alternatives: [B, C], confidence: 95% } │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ OUTPUT & RESPONSE FORMATTING (Existing)                                    │
│                                                                             │
│ "Use Chase Sapphire for Netflix!                                           │
│  💰 Earn 2x on streaming subscriptions                                     │
│  💳 Plenty of available credit ($8,000)                                    │
│  ✅ 95% confidence match"                                                  │
│                                                                             │
│ Alternatives:                                                              │
│ • Capital One Venture (2x travel, 1x on streaming)                         │
│ • American Express Gold (1x streaming, 4x dining)                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Dependency Graph

```
┌─────────────────────────────────┐
│  VittaApp.js (Existing)         │
│  - Main component               │
│  - Routes user input            │
└──────────────┬──────────────────┘
               │
               ├─────────────────────────────────────────────────────┐
               │                                                     │
               ▼                                                     ▼
    ┌──────────────────────┐                    ┌─────────────────────┐
    │ Chat Handlers        │                    │ Recommendation      │
    │ (Existing)           │                    │ Engine v1 (Existing)│
    │                      │                    │                     │
    │ • Extract intent     │                    │ • Score cards       │
    │ • Extract entity     │                    │ • Rank by strategy  │
    │ • Call rec engine    │                    │ • Format output     │
    └──────────┬───────────┘                    └────────┬────────────┘
               │                                         │
               └────────────────┬──────────────────────┬─┘
                                │
                                ▼
            ┌───────────────────────────────────────────┐
            │ Enhanced Recommendation Engine (NEW)       │
            │                                           │
            │  getRecommendation(userId, context)      │
            │  {                                        │
            │    merchant: "Netflix"                    │
            │    mccCode: "4899"                        │
            │    amount: 9.99                           │
            │  }                                        │
            └───────────┬──────────┬──────────┬─────────┘
                        │          │          │
        ┌───────────────▼─┐  ┌─────▼──────┐  │
        │ Merchant         │  │ Category    │  │
        │ Classifier       │  │ Matcher     │  │
        │                 │  │             │  │
        │ classifyMerchant│  │ findReward  │  │
        │ (merchant, mcc) │  │ Multiplier  │  │
        │                 │  │ (card, cat) │  │
        └────────┬────────┘  └─────┬───────┘  │
                 │                 │          │
        ┌────────▼──────┐   ┌─────▼──────┐   │
        │ MCC Code      │   │ Category   │   │
        │ Mapper        │   │ Definitions│   │
        │ (4899→stream) │   │ (14 cats)  │   │
        └───────────────┘   └────────────┘   │
                                             │
                                    ┌────────▼──────────┐
                                    │ Card Service      │
                                    │ (Existing)        │
                                    │ getUserCards()    │
                                    └───────────────────┘
```

---

## 3. Category Classification Decision Tree

```
Input: merchant="Whole Foods Market", mcc=5411

                            ┌─────────────┐
                            │   CLASSIFY  │
                            │   MERCHANT  │
                            └──────┬──────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
                    ▼                             ▼
        ┌────────────────────┐      ┌─────────────────────┐
        │ Check LRU Cache    │      │ MCC Code Available? │
        │ (1000 items)       │      └──────┬──────┬───────┘
        │                    │             │      │
        │ "Whole Foods" →    │            YES    NO
        │ Hit? 80% chance    │             │      │
        └─────────┬──────────┘             │      │
                  │                        ▼      │
                Hit:                   ┌─────────────────────┐
                Return                 │ MCC: 5411 →         │
                "groceries"            │ Grocery Store       │
                Confidence: 100%       │ Confidence: 95%     │
                                       └──────────┬──────────┘
        Miss:                                     │
        Continue ──────────────────────┬──────────┘
                                       │
                                       ▼
                    ┌──────────────────────────────────┐
                    │ Try Database Lookup              │
                    │ "Whole Foods Market" Known?      │
                    └──────┬──────────────┬────────────┘
                           │              │
                          YES             NO
                           │              │
                           ▼              ▼
                    ┌─────────────┐  ┌──────────────────┐
                    │ Return DB   │  │ Keyword Matching │
                    │ Result      │  │ Against 14 Cats  │
                    │ Category:   │  └────────┬─────────┘
                    │ groceries   │           │
                    │ Conf: 92%   │  ┌────────▼────────────┐
                    └─────────────┘  │ "whole" → grocery   │
                                     │ "market" → grocery   │
                                     │ "foods" → grocery    │
                                     │ Score: 30 points     │
                                     │ Category: groceries  │
                                     │ Confidence: 85%      │
                                     └─────────────────────┘

FINAL RESULT:
┌─────────────────────────────────────────┐
│ {                                       │
│   category: "groceries",                │
│   confidence: 0.95,                     │
│   source: "mcc_code",                   │
│   reasoning: "MCC 5411 = Grocery Store" │
│ }                                       │
└─────────────────────────────────────────┘
```

---

## 4. Reward Matching Logic

```
Card: "Amex Gold" with reward_structure:
{
  dining: 4,
  groceries: 4,
  travel: 3,
  streaming: 2,
  entertainment: 2,
  default: 1
}

Input: category="streaming"

                        ┌─────────────────────────┐
                        │ FIND REWARD MULTIPLIER  │
                        └────────────┬────────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    │                                 │
                    ▼                                 ▼
        ┌────────────────────────┐    ┌─────────────────────┐
        │ 1. Exact Match?        │    │ 2. Alias Match?     │
        │                        │    │                     │
        │ reward_structure[      │    │ Aliases for         │
        │ "streaming"] exists?   │    │ "streaming":        │
        │ YES ✓                  │    │ • streaming         │
        │                        │    │ • subscriptions     │
        │ Return: {              │    │ • digital           │
        │   multiplier: 2,       │    │ • online_services   │
        │   source: "exact",     │    │                     │
        │   confidence: 1.0      │    │ Check each alias    │
        │ }                      │    │ in reward_structure │
        └────────────────────────┘    │                     │
                                      │ (Not found, skip)   │
                                      └──────────┬──────────┘
                                                 │
                                                 ▼
                                      ┌──────────────────────┐
                                      │ 3. Parent Category?  │
                                      │                      │
                                      │ Is "streaming" a     │
                                      │ subcategory of       │
                                      │ another category?    │
                                      │                      │
                                      │ No parent category   │
                                      │ (skip)               │
                                      └──────────┬───────────┘
                                                 │
                                                 ▼
                                      ┌──────────────────────┐
                                      │ 4. Rotating Cats?    │
                                      │                      │
                                      │ Check rotating:      │
                                      │ active_categories    │
                                      │                      │
                                      │ No rotating (skip)   │
                                      └──────────┬───────────┘
                                                 │
                                                 ▼
                                      ┌──────────────────────┐
                                      │ 5. Default Fallback  │
                                      │                      │
                                      │ Return default: 1x   │
                                      │                      │
                                      │ Return: {            │
                                      │   multiplier: 1,     │
                                      │   source: "default", │
                                      │   confidence: 0.1    │
                                      │ }                    │
                                      └──────────────────────┘

ACTUAL RESULT (Step 1 matches):
┌────────────────────────────────────────────┐
│ {                                          │
│   multiplier: 2,                           │
│   source: "exact_match",                   │
│   confidence: 1.0,                         │
│   explanation: "Amex Gold offers 2x on    │
│                streaming subscriptions"    │
│ }                                          │
└────────────────────────────────────────────┘
```

---

## 5. Card Scoring & Ranking

```
User cards for "Netflix" (streaming, 2x multiplier):

Card A: "Amex Gold"
- Reward: 2x on streaming
- APR: 20%
- Available Credit: $8,000
- Utilization: 25%

Card B: "Chase Sapphire"
- Reward: 2x on streaming
- APR: 18%
- Available Credit: $500
- Utilization: 95%

Card C: "Generic Card"
- Reward: 1x (default)
- APR: 25%
- Available Credit: $3,000
- Utilization: 50%

─────────────────────────────────────────────────

SCORING CALCULATION:

Card A:
  Base Score = multiplier × 10 = 2 × 10 = 20
  + APR Bonus (20% is low) = +2
  + Available Credit Bonus (can charge) = +1
  - Utilization Penalty (25% is good) = 0
  ─────────────────────────────
  TOTAL SCORE = 23

Card B:
  Base Score = multiplier × 10 = 2 × 10 = 20
  + APR Bonus (18% is very low) = +3
  - Low Available Credit Penalty = -5
  - High Utilization Penalty (95%) = -2
  ─────────────────────────────
  TOTAL SCORE = 16

Card C:
  Base Score = multiplier × 10 = 1 × 10 = 10
  + APR Bonus (25% is high) = 0
  + Available Credit Bonus = +2
  - Utilization Penalty (50%) = -1
  ─────────────────────────────
  TOTAL SCORE = 11

─────────────────────────────────────────────────

RANKING:

  1. Card A: 23.0 ⭐ PRIMARY RECOMMENDATION
     "Amex Gold - 2x on streaming, low APR,
      and $8,000 available credit"

  2. Card B: 16.0 ⭐ ALTERNATIVE
     "Chase Sapphire - Also 2x on streaming
      with very low APR (but limited credit)"

  3. Card C: 11.0
     "Generic Card - Earns standard 1x
      (not optimized for streaming)"

─────────────────────────────────────────────────

FINAL RECOMMENDATION:

{
  primary: {
    card_name: "Amex Gold",
    detected_multiplier: 2,
    score: 23.0,
    explanation: "Amex Gold offers 2x rewards
                 on streaming subscriptions"
  },
  alternatives: [Card B, Card C],
  category_detected: {
    category: "streaming",
    confidence: 0.95
  },
  confidence: 0.95
}
```

---

## 6. Data Flow: Recommendation Request

```
REQUEST FLOW:
═════════════════════════════════════════════════════════════════

1. USER INPUT
   └─→ Chat: "What's best for Netflix?"
   └─→ UI Form: Select merchant "Netflix"

2. NATURAL LANGUAGE PROCESSING
   └─→ Extract: merchant="Netflix"
   └─→ Extract: user_id="user123"
   └─→ Pass to recommendation engine

3. ENHANCED RECOMMENDATION ENGINE
   ├─→ getRecommendation(userId, context)
   │
   ├─→ [Step 1] Get User Cards
   │   └─→ getUserCards("user123")
   │   └─→ Return: [{card A}, {card B}, {card C}]
   │
   ├─→ [Step 2] Classify Merchant
   │   └─→ merchantClassifier.classify("Netflix", mcc=4899)
   │   └─→ Return: {category: "streaming", confidence: 95%}
   │
   ├─→ [Step 3] Score All Cards
   │   ├─→ For each card:
   │   │   ├─→ categoryMatcher.findRewardMultiplier(card, "streaming")
   │   │   ├─→ Calculate score based on multiplier + APR + credit
   │   │   └─→ Return scored card
   │   │
   │   └─→ Return: [{scoreA: 23}, {scoreB: 16}, {scoreC: 11}]
   │
   ├─→ [Step 4] Rank & Generate Recommendations
   │   ├─→ Sort by score (descending)
   │   ├─→ Generate human-readable explanations
   │   └─→ Return: {primary: A, alternatives: [B, C]}
   │
   └─→ Return Full Recommendation Object

4. RESPONSE FORMATTING
   └─→ Format for chat/UI
   └─→ Add confidence scores
   └─→ Add explanations

5. USER SEES RESULT
   └─→ "Use Amex Gold! 2x on streaming with
        excellent APR and plenty of credit."
   └─→ Alternatives: Chase Sapphire, Generic Card
   └─→ Confidence: 95% match

RESPONSE TIME BREAKDOWN:
─────────────────────────────────────────
Get User Cards:           50ms
Classify Merchant:        20ms (cache hit)
Score All Cards:          30ms
Rank & Format:            10ms
─────────────────────────────────────────
TOTAL:                    110ms

(Well under 500ms target)
```

---

## 7. Database Schema Diagram

```
EXISTING TABLES (shown for context)
═══════════════════════════════════════════════════════════════

user_credit_cards (user's portfolio)
├─ id (PK)
├─ user_id (FK)
├─ card_name: "Amex Gold"
├─ issuer: "American Express"
├─ reward_structure: {
│    dining: 4,
│    groceries: 4,
│    streaming: 2,    ← NEW in design
│    ...
│  }
├─ apr: 20.0
├─ credit_limit: 10000
├─ current_balance: 2500
└─ created_at, updated_at

card_catalog (available cards to add)
├─ id (PK)
├─ card_name: "Amex Gold"
├─ issuer: "American Express"
├─ reward_structure: { same as above }
├─ annual_fee: 0
└─ created_at

NEW TABLES (for merchant classification)
═══════════════════════════════════════════════════════════════

merchant_classifications (cache for known merchants)
├─ id (PK)
├─ merchant_name: "Netflix Inc" (UNIQUE, INDEXED)
├─ category_detected: "streaming"
├─ confidence: 0.95
├─ source: "database_lookup"  # mcc_code | keyword | learned
├─ mcc_code: 4899 (INDEXED)
├─ created_at
└─ updated_at

category_definitions (metadata for all 14 categories)
├─ id (PK)
├─ category_id: "streaming" (UNIQUE)
├─ category_name: "Streaming Services"
├─ keywords: ["netflix", "hulu", "spotify", ...] (JSON)
├─ mcc_codes: [4899, ...] (JSON array, INDEXED)
├─ reward_aliases: ["streaming", "subscriptions", ...] (JSON)
├─ subcategories: ["video", "music", "gaming"] (JSON)
└─ created_at

─────────────────────────────────────────────────────────────

KEY INDEXES FOR PERFORMANCE:
┌─────────────────────────────────────────────────────────────┐
│ CREATE INDEX idx_merchant_name                             │
│   ON merchant_classifications(merchant_name)               │
│                                                             │
│ CREATE INDEX idx_mcc_code                                  │
│   ON merchant_classifications(mcc_code)                    │
│                                                             │
│ CREATE INDEX idx_category_mcc_codes                        │
│   ON category_definitions(mcc_codes) USING GIN              │
│                                                             │
│ CREATE INDEX idx_user_cards_user_id                        │
│   ON user_credit_cards(user_id) (EXISTING)                │
│                                                             │
│ Expected cache hit rate: >80%                              │
│ Expected query time: <10ms per lookup                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Testing Architecture

```
TEST HIERARCHY:
═══════════════════════════════════════════════════════════════

Level 1: Unit Tests (Fast, Isolated)
┌───────────────────────────────────────────────────────┐
│ MERCHANT CLASSIFIER TESTS                             │
├───────────────────────────────────────────────────────┤
│ ✓ Test MCC Code Classification                        │
│   Input: mcc=5411 → Output: groceries (95%+)         │
│                                                       │
│ ✓ Test Keyword Matching                              │
│   Input: "Whole Foods" → Output: groceries            │
│                                                       │
│ ✓ Test All 14 Categories                             │
│   One test case per category                         │
│                                                       │
│ ✓ Test Confidence Scoring                            │
│   Verify 0-100 range, proper weighting               │
│                                                       │
│ ✓ Test Cache Behavior                                │
│   Cache hit on repeat, TTL expiry                    │
│                                                       │
│ ✓ Test Edge Cases                                    │
│   Null input, empty strings, special chars           │
│                                                       │
│ Coverage Target: 95%                                 │
└───────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────┐
│ CATEGORY MATCHER TESTS                               │
├───────────────────────────────────────────────────────┤
│ ✓ Test Exact Match                                   │
│   Card has exact category → returns multiplier       │
│                                                       │
│ ✓ Test Alias Resolution                             │
│   "dining" ≈ "restaurants" ≈ "food"                 │
│                                                       │
│ ✓ Test Parent Category Fallback                      │
│   Subcategory → parent category                      │
│                                                       │
│ ✓ Test Rotating Categories                          │
│   Active categories match, inactive don't            │
│                                                       │
│ ✓ Test Complex Structures                           │
│   Objects with notes, conditions, limits             │
│                                                       │
│ ✓ Test Default Fallback                             │
│   Unmatched category → default multiplier            │
│                                                       │
│ Coverage Target: 98%                                 │
└───────────────────────────────────────────────────────┘

Level 2: Integration Tests (Medium Speed, Combined Logic)
┌───────────────────────────────────────────────────────┐
│ ENHANCED RECOMMENDATION ENGINE TESTS                 │
├───────────────────────────────────────────────────────┤
│ ✓ Test Full Flow                                    │
│   Input: merchant → classification → matching →      │
│   scoring → ranking → recommendation                 │
│                                                       │
│ ✓ Test All 14 Categories (End-to-End)              │
│   Netflix → streaming, Amazon → dept stores, etc     │
│                                                       │
│ ✓ Test Card Selection Logic                         │
│   Best card chosen for each category                 │
│                                                       │
│ ✓ Test Backward Compatibility                       │
│   Old cards (5 categories) still work                │
│                                                       │
│ ✓ Test Performance                                  │
│   <100ms classification, <500ms total                │
│                                                       │
│ Coverage Target: 85-90%                              │
└───────────────────────────────────────────────────────┘

Level 3: E2E Tests (Slow, Real World)
┌───────────────────────────────────────────────────────┐
│ USER INTERACTION TESTS                               │
├───────────────────────────────────────────────────────┤
│ ✓ Chat Query: "Best card for Netflix?"              │
│   → Extract merchant → Recommend card → Format       │
│                                                       │
│ ✓ UI Selection: User picks "Netflix" from menu      │
│   → Classify → Recommend → Show in UI                │
│                                                       │
│ ✓ Edge Cases                                        │
│   Unknown merchant, ambiguous name, etc              │
│                                                       │
│ Coverage Target: 80%                                 │
└───────────────────────────────────────────────────────┘

TEST DATA:
───────────────────────────────────────────────────────
• 100+ merchant test cases (all 14 categories)
• 20+ card reward structures (simple & complex)
• MCC code mappings for common merchants
• Edge cases: nulls, empty strings, special characters

OVERALL COVERAGE TARGET: >92%
═════════════════════════════════════════════════════════════
```

---

## 9. Deployment Flow

```
DEVELOPMENT → STAGING → CANARY → PRODUCTION

1. DEVELOPMENT (Weeks 1-4)
   ┌──────────────────────────────────────┐
   │ Feature Branch: feature/enhanced-recom │
   │                                       │
   │ • Write code                         │
   │ • Pass unit tests (local)            │
   │ • Code review                        │
   │ • Merge to staging                   │
   └──────────────────────────────────────┘
                    │
                    ▼
2. STAGING (Week 4-5)
   ┌──────────────────────────────────────┐
   │ Staging Branch: staging              │
   │ Feature Flag: OFF (0%)               │
   │                                       │
   │ • Run full test suite                │
   │ • Integration tests (100% coverage)  │
   │ • Performance tests                  │
   │ • Smoke tests                        │
   │ • QA testing                         │
   │ • Team sign-off                      │
   └──────────────────────────────────────┘
                    │
                    ▼
3. PRODUCTION (Week 5-6)

   A. Prepare for Canary
      ┌──────────────────────────────────┐
      │ Tag Release: v1.0.0-enhanced     │
      │ Feature Flag Setup (OFF)          │
      │ Monitoring & Alerts Ready         │
      └──────────────────────────────────┘
                    │
                    ▼

   B. Canary Phase 1: Fire & Forget (1%)
      ┌──────────────────────────────────┐
      │ Enable: 1% of users               │
      │ Duration: 1 hour                  │
      │ Metrics: Accuracy, Latency, Errors│
      │ Decision: Continue or Rollback    │
      │ Result: ✅ All metrics OK         │
      └──────────────────────────────────┘
                    │
                    ▼

   C. Canary Phase 2: Controlled (10%)
      ┌──────────────────────────────────┐
      │ Enable: 10% of users              │
      │ Duration: 4 hours                 │
      │ Metrics: Detailed monitoring      │
      │ Decision: Continue or Rollback    │
      │ Result: ✅ All metrics excellent  │
      └──────────────────────────────────┘
                    │
                    ▼

   D. Gradual Rollout (50% → 100%)
      ┌──────────────────────────────────┐
      │ Enable: 50% of users              │
      │ Duration: 4 hours                 │
      │ Decision: Continue to 100%        │
      │ Enable: 100% of users             │
      │ Duration: 24+ hours (continued)   │
      │ Result: ✅ Stable production      │
      └──────────────────────────────────┘
                    │
                    ▼

   E. Steady State & Optimization (Week 6+)
      ┌──────────────────────────────────┐
      │ 100% users on new system          │
      │ Continuous monitoring             │
      │ Performance tuning                │
      │ Deprecate old system (after 2 wks)│
      │ Archive old code                  │
      └──────────────────────────────────┘

ROLLBACK PROCEDURE:
───────────────────────────────────────
If issues at any stage:
  1. Immediately disable feature flag
  2. Revert to previous version
  3. Investigate root cause
  4. Fix and test
  5. Re-deploy from staging

Rollback time: <2 minutes (feature flag)
User impact: <1% before canary gates catch issues
```

---

## 10. Metric Dashboard Layout

```
REAL-TIME MONITORING DASHBOARD
═══════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────┐
│  ENHANCED RECOMMENDATION ENGINE - Live Dashboard           │
│                                                             │
│  Status: 🟢 HEALTHY       Deployment: 100% of users       │
│  Uptime: 99.97%            Since: Nov 14, 2024 10:35 AM    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  ACCURACY METRICS                                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Classification Accuracy: 94.2% ✅                         │
│  ████████████████████░ Target: >90%                        │
│                                                             │
│  Confidence Calibration: 91.5% ✅                          │
│  ██████████████████░░ Target: >85%                         │
│                                                             │
│  False Positive Rate: 2.1% ✅                              │
│  ░░████░░░░░░░░░░░░░░ Target: <5%                         │
│                                                             │
│  Recommendation Accept Rate: 87.3% ✅                      │
│  ███████████████████░░ Target: >85%                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  PERFORMANCE METRICS                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Classification Latency (p95): 42ms ✅                     │
│  ███░░░░░░░░░░░░░░░░░ Target: <100ms                      │
│                                                             │
│  Total Recommendation (p95): 185ms ✅                      │
│  ████░░░░░░░░░░░░░░░░ Target: <500ms                      │
│                                                             │
│  Cache Hit Rate: 84.1% ✅                                  │
│  ████████████████░░░░ Target: >80%                         │
│                                                             │
│  API Response Time (p95): 210ms ✅                         │
│  █████░░░░░░░░░░░░░░░ Target: <300ms                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  CATEGORY PERFORMANCE                                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Dining:          95.2% accuracy │ 2,341 classifications    │
│  Groceries:       96.8% accuracy │ 1,987 classifications    │
│  Gas/Fuel:        92.3% accuracy │  847  classifications    │
│  Travel:          93.5% accuracy │ 1,123 classifications    │
│  Entertainment:   89.1% accuracy │  542  classifications    │
│  Streaming:       98.1% accuracy │ 3,214 classifications    │
│  Drugstores:      87.6% accuracy │  421  classifications    │
│  Home Improvement:91.2% accuracy │  634  classifications    │
│  Department Store:94.7% accuracy │ 2,856 classifications    │
│  Transit:         85.3% accuracy │  289  classifications    │
│  Utilities:       96.4% accuracy │  156  classifications    │
│  Warehouse:       97.3% accuracy │  723  classifications    │
│  Office Supplies: 88.9% accuracy │  412  classifications    │
│  Insurance:       91.8% accuracy │  187  classifications    │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  ERROR TRACKING                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Error Rate: 0.32% ✅                                      │
│  ░░░░░░░░░░░░░░░░░░░ Target: <1%                          │
│                                                             │
│  Recent Errors (24h):                                      │
│  • Database timeout: 12 (automatically retried)            │
│  • MCC lookup failure: 3 (fallback to keywords)            │
│  • Cache overflow: 0 (not triggered)                       │
│                                                             │
│  Average Error Recovery Time: 2.1 seconds                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  USER ENGAGEMENT                                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Daily Active Users: 2,347                                 │
│  Recommendations Generated (24h): 8,734                    │
│  Avg Recommendations per User: 3.7                         │
│  Conversion Rate: 87.3%                                    │
│                                                             │
│  Top Categories (by usage):                                │
│  1. Streaming (23.4%)  ⭐ Most popular                     │
│  2. Dining (18.2%)                                         │
│  3. Department Stores (17.1%)                              │
│  4. Groceries (15.6%)                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Refreshing... 🔄  |  Last Updated: 2024-11-14 14:23:15 UTC
```

---

This comprehensive visual documentation complements the detailed design specifications and provides multiple perspectives on the system architecture.
