# Enhanced Card Recommendation Engine - Architectural Design

## Executive Summary

This document outlines the design for enhancing Vitta's card recommendation engine to support **14 expanded merchant categories** and provide intelligent, user-friendly card recommendations across all spending scenarios.

**Current State:** Limited categories (groceries, dining, gas, travel) with basic keyword matching
**Target State:** Comprehensive 14-category system with intelligent merchant classification and multi-strategy recommendations

---

## 1. Problem Statement

### Current Limitations
1. **Limited Categories:** Only 5 categories supported (grocery, dining, gas, travel, default)
2. **Shallow Merchant Mapping:** Hardcoded keywords in `MERCHANT_REWARDS` with limited pattern matching
3. **No Category Hierarchy:** Missing relationships between categories (e.g., takeout ⊂ dining)
4. **Flat Reward Structure:** No support for rotating categories or category pools
5. **No Sub-categories:** Can't distinguish between "drugstore pharmacy" vs "drugstore general retail"
6. **Limited Context:** Doesn't use merchant name, MCC codes, or transaction data patterns

### Requested Categories

| # | Category | Subcategories |
|---|----------|---|
| 1 | **Dining** | Restaurants, Takeout/Delivery, Coffee Shops, Fast Food |
| 2 | **Groceries** | Supermarkets, Wholesale Clubs, Natural/Organic Stores |
| 3 | **Gas/Fuel** | Gas Stations, EV Charging Stations |
| 4 | **Travel** | Airfare, Hotels, Car Rentals, Public Transportation |
| 5 | **Entertainment** | Movie Theaters, Live Events, Amusement Parks |
| 6 | **Streaming** | Digital Subscriptions (Netflix, Hulu, Spotify, etc.) |
| 7 | **Drugstores** | Pharmacy, OTC Medications, Health Products |
| 8 | **Home Improvement** | Hardware Stores, Home Depot, Lowe's, etc. |
| 9 | **Department Stores** | General Retail, Amazon, Nordstrom, Macy's, etc. |
| 10 | **Transit** | Buses, Subways, Rideshare (Uber, Lyft) |
| 11 | **Utilities** | Phone, Cable, Internet Subscriptions |
| 12 | **Warehouse** | Costco, Sam's Club, Amazon Prime, BJ's |
| 13 | **Office Supplies** | Staples, Office Depot, Amazon Business |
| 14 | **Insurance** | Health, Auto, Home Insurance Payments |

---

## 2. Architecture Design

### 2.1 Recommendation Engine Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  USER QUERY / CONTEXT                        │
│              (e.g., "Best card for Whole Foods?")            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         MERCHANT CLASSIFIER (Enhanced)                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 1. Extract merchant name & MCC code                 │   │
│  │ 2. ML-based classification → 14 categories           │   │
│  │ 3. Calculate confidence score (0-100%)               │   │
│  │ 4. Return category + subcategory + confidence        │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼ (merchant_name, category, confidence, subcategory)
┌─────────────────────────────────────────────────────────────┐
│        CATEGORY MATCHER (Card Rewards Lookup)               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ For each user card:                                  │   │
│  │ 1. Check if reward_structure has category            │   │
│  │ 2. Look up by: exact match, parent category, alias   │   │
│  │ 3. Return: reward_multiplier or null                 │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼ (cards with reward_multipliers)
┌─────────────────────────────────────────────────────────────┐
│      CARD SCORER (Multi-Strategy Scoring)                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ For each card, calculate:                            │   │
│  │ • Rewards Score: multiplier × amount                 │   │
│  │ • APR Score: interest cost if balancing              │   │
│  │ • Cashflow Score: statement cycle + grace period     │   │
│  │ • Available Credit: ensure sufficient limit          │   │
│  │ • Utilization: prefer lower utilized cards           │   │
│  │ • Weighted Score: strategy_weights × individual      │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼ (scored cards ranked 1-N)
┌─────────────────────────────────────────────────────────────┐
│      RECOMMENDATION RANKER                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 1. Sort by weighted score                            │   │
│  │ 2. Select top 3 alternatives                         │   │
│  │ 3. Generate human-readable explanations              │   │
│  │ 4. Add confidence indicators                         │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   RECOMMENDATION OUTPUT                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ primary: {                                           │   │
│  │   card_name, score, rewards_value,                   │   │
│  │   reason: "4x rewards on dining + low APR"           │   │
│  │   confidence: 95%                                    │   │
│  │ }                                                    │   │
│  │ alternatives: [...],                                │   │
│  │ strategy: "rewards_maximizer"                        │   │
│  │ category_detected: "dining" (w/ 92% confidence)      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Category System Design

#### 2.2.1 Category Definition Structure

```javascript
// Single source of truth for all categories
const ENHANCED_CATEGORIES = {
  'dining': {
    id: 'dining',
    name: 'Dining & Restaurants',
    icon: '🍽️',
    description: 'Restaurants, takeout, delivery, coffee shops',
    keywords: ['restaurant', 'dining', 'cafe', 'coffee', 'doordash', 'grubhub', 'delivery'],
    mcc_codes: [5812, 5813, 5814], // Merchant Category Codes
    subcategories: ['fine_dining', 'casual_dining', 'fast_food', 'delivery', 'coffee'],
    reward_aliases: ['dining', 'restaurants', 'food', 'eat'],
    parent_category: null
  },
  'groceries': {
    id: 'groceries',
    name: 'Groceries & Supermarkets',
    icon: '🛒',
    description: 'Supermarkets, grocery stores, wholesale clubs',
    keywords: ['grocery', 'supermarket', 'whole foods', 'trader joes', 'kroger', 'safeway', 'costco'],
    mcc_codes: [5411, 5412, 5422],
    subcategories: ['supermarket', 'warehouse', 'natural_organic'],
    reward_aliases: ['grocery', 'groceries', 'supermarket'],
    parent_category: null
  },
  // ... 12 more categories
};
```

#### 2.2.2 Card Reward Structure Enhancement

```javascript
// Before (current)
card.reward_structure = {
  dining: 4,
  groceries: 3,
  gas: 3,
  travel: 1,
  default: 1.5
};

// After (enhanced)
card.reward_structure = {
  // Traditional categories
  dining: { value: 4, subcategories: ['casual_dining', 'fast_food'] },
  groceries: { value: 3, subcategories: ['supermarket', 'warehouse'] },

  // New categories
  streaming: 2,
  entertainment: { value: 2, note: "Excludes sporting events" },
  drugstores: 1,
  home_improvement: 2,
  department_stores: 1,
  transit: { value: 1, note: "Public transit only, not rideshare" },
  utilities: 1,
  office_supplies: { value: 1.5, note: "Office Depot, Staples" },
  insurance: 1,

  // Category pools / rotating
  rotating: {
    active_categories: ['entertainment', 'office_supplies'],
    value: 5,
    max_per_quarter: 1500,
    switches_each_quarter: true
  },

  // Default for unmatched
  default: 1,

  // Bonus structure
  sign_up_bonus: {
    amount: 750,
    required_spend: 6000,
    months: 3
  }
};
```

---

## 3. Implementation Strategy

### 3.1 Files to Create

| File | Purpose |
|------|---------|
| `/services/merchantClassification/merchantClassifier.js` | ML-based merchant → category mapping |
| `/services/merchantClassification/merchantDatabase.js` | Merchant name → category lookup (PostgreSQL) |
| `/services/merchantClassification/mccCodeMapper.js` | MCC code → category mapping |
| `/services/categories/categoryDefinitions.js` | Central category system definition |
| `/services/categories/categoryAliasResolver.js` | Resolve reward aliases to canonical categories |
| `/services/recommendations/enhancedRecommendationEngine.js` | Improved scoring with 14 categories |
| `/services/recommendations/categoryMatcher.js` | Match card rewards to detected categories |
| `/__tests__/unit/merchantClassifier.test.js` | Unit tests for classification |
| `/__tests__/unit/categoryMatcher.test.js` | Unit tests for category matching |
| `/__tests__/unit/enhancedRecommendationEngine.test.js` | Integration tests |
| `/docs/ENHANCED_RECOMMENDATIONS.md` | User documentation |
| `/supabase/merchantClassificationSchema.sql` | Database tables for merchant classification |

### 3.2 Files to Modify

| File | Changes |
|------|---------|
| `/services/cardAnalyzer.js` | Update `MERCHANT_REWARDS` → use new category system |
| `/services/cardService.js` | Update demo cards with 14 categories in reward_structure |
| `/services/recommendations/recommendationEngine.js` | Integrate enhanced classifier before scoring |
| `/services/recommendations/recommendationStrategies.js` | Update scoring to handle all 14 categories |
| `/config/intentDefinitions.js` | Add category detection intents |
| `/services/chat/cardDataQueryHandler.js` | Enhance category queries |
| `/supabase/schema.sql` | Add merchant_classification table |

### 3.3 Migration Strategy

**Phase 1: Deploy New System (Backward Compatible)**
- New classifier and category system run in parallel
- Existing recommendations still work
- No breaking changes to card_reward_structure schema

**Phase 2: Migrate Card Data**
- Update demo cards with new category structures
- Migrate user-added cards to new format
- Fallback to old system for cards without new format

**Phase 3: Switch Primary**
- New system becomes default for recommendations
- Old system used only as fallback

---

## 4. Detailed Component Design

### 4.1 Merchant Classifier Service

```javascript
/**
 * Merchant Classification Service
 * Classifies merchants into 14 categories with confidence scoring
 */

export class MerchantClassifier {
  constructor() {
    this.categories = categoryDefinitions;
    this.mccMapper = new MCCCodeMapper();
    this.merchantDB = new MerchantDatabase(); // Cache of known merchants
    this.cache = new LRUCache(1000); // Remember recent classifications
  }

  /**
   * Classify a merchant into a category
   * @param {string} merchantName - Merchant name from transaction
   * @param {string} mccCode - Merchant Category Code (if available)
   * @param {Object} context - Additional context (amount, date, location)
   * @returns {Promise<ClassificationResult>}
   * {
   *   category: 'dining',
   *   subcategory: 'fine_dining',
   *   confidence: 0.95,
   *   reasoning: 'Matched by keyword "restaurant"',
   *   mcc_matched: false
   * }
   */
  async classifyMerchant(merchantName, mccCode = null, context = {}) {
    // 1. Check cache
    const cacheKey = `${merchantName}:${mccCode}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // 2. Try MCC code lookup (most reliable)
    if (mccCode) {
      const mccResult = this.mccMapper.getMerchantCategory(mccCode);
      if (mccResult && mccResult.confidence > 0.9) {
        return this.cache.set(cacheKey, { ...mccResult, mcc_matched: true });
      }
    }

    // 3. Check merchant database (learned from transactions)
    const dbResult = await this.merchantDB.getMerchantCategory(merchantName);
    if (dbResult && dbResult.confidence > 0.85) {
      return this.cache.set(cacheKey, { ...dbResult, learned: true });
    }

    // 4. Keyword matching (fallback)
    const keywordResult = this.classifyByKeywords(merchantName);
    if (keywordResult.confidence > 0.7) {
      return this.cache.set(cacheKey, keywordResult);
    }

    // 5. Default to category with lowest confidence
    return this.cache.set(cacheKey, {
      category: 'default',
      subcategory: null,
      confidence: 0.0,
      reasoning: 'No match found, defaulting to general category'
    });
  }

  classifyByKeywords(merchantName) {
    const lowerName = merchantName.toLowerCase();

    // Build scoring dictionary
    const scores = {};
    for (const [catId, catDef] of Object.entries(this.categories)) {
      scores[catId] = 0;

      // Exact match (100 points)
      if (lowerName.includes(catDef.name.toLowerCase())) {
        scores[catId] += 100;
      }

      // Keyword match (10 points each)
      for (const keyword of catDef.keywords) {
        if (lowerName.includes(keyword)) {
          scores[catId] += 10;
        }
      }
    }

    // Find best match
    const bestCat = Object.entries(scores)
      .sort(([, a], [, b]) => b - a)[0];

    if (!bestCat || bestCat[1] === 0) {
      return {
        category: 'default',
        confidence: 0.0,
        reasoning: 'No keyword match'
      };
    }

    const categoryId = bestCat[0];
    const categoryDef = this.categories[categoryId];

    return {
      category: categoryId,
      confidence: Math.min(bestCat[1] / 100, 1.0), // Normalize to 0-1
      reasoning: `Matched by keywords in "${categoryDef.name}"`
    };
  }
}
```

### 4.2 Category Matcher Service

```javascript
/**
 * Category Matcher Service
 * Matches detected merchant categories to card reward multipliers
 */

export class CategoryMatcher {
  constructor() {
    this.categoryDefs = categoryDefinitions;
  }

  /**
   * Find reward multiplier for a category on a specific card
   * @param {Object} card - User's credit card
   * @param {string} detectedCategory - Category detected from merchant (e.g., 'dining')
   * @param {string} subcategory - Optional subcategory (e.g., 'fine_dining')
   * @returns {Object} { multiplier, confidence, explanation }
   */
  findRewardMultiplier(card, detectedCategory, subcategory = null) {
    const rewardStructure = card.reward_structure || {};

    // 1. Exact category match
    if (rewardStructure[detectedCategory]) {
      return {
        multiplier: this.normalizeMultiplier(rewardStructure[detectedCategory]),
        source: 'exact_match',
        confidence: 1.0,
        explanation: `${card.card_name} offers ${this.getRewardText(rewardStructure[detectedCategory])} on ${detectedCategory}`
      };
    }

    // 2. Try category aliases (dining = restaurant = food)
    const categoryDef = this.categoryDefs[detectedCategory];
    if (categoryDef && categoryDef.reward_aliases) {
      for (const alias of categoryDef.reward_aliases) {
        if (rewardStructure[alias]) {
          return {
            multiplier: this.normalizeMultiplier(rewardStructure[alias]),
            source: 'alias_match',
            confidence: 0.9,
            explanation: `${card.card_name} offers ${this.getRewardText(rewardStructure[alias])} on ${alias} (matching your ${detectedCategory} purchase)`
          };
        }
      }
    }

    // 3. Try parent category (e.g., 'fine_dining' → 'dining')
    if (subcategory && categoryDef && categoryDef.subcategories.includes(subcategory)) {
      if (rewardStructure[detectedCategory]) {
        return {
          multiplier: this.normalizeMultiplier(rewardStructure[detectedCategory]),
          source: 'parent_category',
          confidence: 0.85,
          explanation: `${card.card_name} offers ${this.getRewardText(rewardStructure[detectedCategory])} on ${detectedCategory}`
        };
      }
    }

    // 4. Check rotating categories
    if (rewardStructure.rotating && Array.isArray(rewardStructure.rotating.active_categories)) {
      if (rewardStructure.rotating.active_categories.includes(detectedCategory)) {
        return {
          multiplier: rewardStructure.rotating.value,
          source: 'rotating_category',
          confidence: 0.8,
          explanation: `${card.card_name} currently offers ${rewardStructure.rotating.value}x on rotating categories (including ${detectedCategory} this quarter)`
        };
      }
    }

    // 5. Default multiplier
    const defaultMultiplier = rewardStructure.default || 1;
    return {
      multiplier: defaultMultiplier,
      source: 'default',
      confidence: 0.1,
      explanation: `${card.card_name} doesn't have special rewards for ${detectedCategory}; using default rate`
    };
  }

  normalizeMultiplier(value) {
    // Handle both simple numbers and complex objects
    if (typeof value === 'number') return value;
    if (typeof value === 'object' && value.value) return value.value;
    return 1;
  }

  getRewardText(value) {
    if (typeof value === 'number') return `${value}x rewards`;
    if (typeof value === 'object' && value.value) {
      return `${value.value}x rewards${value.note ? ` (${value.note})` : ''}`;
    }
    return 'standard rewards';
  }
}
```

### 4.3 Enhanced Recommendation Engine

```javascript
/**
 * Enhanced Recommendation Engine
 * Integrates merchant classification, category matching, and multi-strategy scoring
 */

export class EnhancedRecommendationEngine {
  constructor() {
    this.merchantClassifier = new MerchantClassifier();
    this.categoryMatcher = new CategoryMatcher();
    this.strategies = {
      'rewards_maximizer': new RewardsMaximizerStrategy(),
      'apr_minimizer': new APRMinimizerStrategy(),
      'cashflow_optimizer': new CashflowOptimizerStrategy()
    };
  }

  /**
   * Get enhanced recommendation with 14 categories
   * @param {string} userId - User ID
   * @param {Object} context - Purchase context
   * @param {string} context.merchant - Merchant name
   * @param {string} context.mccCode - MCC code (optional)
   * @param {number} context.amount - Purchase amount
   * @param {string} context.strategy - Override strategy
   * @returns {Promise<RecommendationResult>}
   */
  async getRecommendation(userId, context = {}) {
    // 1. Get user's cards
    const userCards = await getUserCards(userId);
    if (!userCards?.length) {
      return this.noCardsResponse();
    }

    // 2. Classify merchant
    const classification = await this.merchantClassifier.classifyMerchant(
      context.merchant,
      context.mccCode,
      context
    );

    // 3. Score cards with enhanced categories
    const scoredCards = this.scoreCards(userCards, classification, context);

    // 4. Generate recommendation
    return {
      primary: scoredCards[0],
      alternatives: scoredCards.slice(1, 3),
      category_detected: classification,
      strategy: context.strategy || 'rewards_maximizer',
      explanation: this.generateExplanation(scoredCards[0], classification),
      confidence: scoredCards[0].confidence
    };
  }

  scoreCards(cards, classification, context) {
    return cards
      .map(card => {
        // Find reward multiplier
        const rewardMatch = this.categoryMatcher.findRewardMultiplier(
          card,
          classification.category,
          classification.subcategory
        );

        // Calculate potential earnings
        const rewardValue = (rewardMatch.multiplier - 1) * (context.amount || 100);

        // Score the card
        const baseScore = rewardMatch.multiplier * 10;
        const aprPenalty = card.apr > 20 ? -2 : 0;
        const availableCredit = card.credit_limit - card.current_balance;
        const creditPenalty = availableCredit < context.amount ? -5 : 0;
        const utilPenalty = (card.current_balance / card.credit_limit) > 0.8 ? -1 : 0;

        return {
          ...card,
          detected_multiplier: rewardMatch.multiplier,
          reward_match_source: rewardMatch.source,
          potential_reward_value: rewardValue,
          score: baseScore + aprPenalty + creditPenalty + utilPenalty,
          explanation: rewardMatch.explanation,
          confidence: rewardMatch.confidence
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  generateExplanation(topCard, classification) {
    return `${topCard.card_name} offers ${topCard.detected_multiplier}x rewards on ${classification.category} ` +
           `(matched with ${(classification.confidence * 100).toFixed(0)}% confidence)`;
  }
}
```

---

## 5. Testing Strategy

### 5.1 Unit Tests Structure

```javascript
// /__tests__/unit/merchantClassifier.test.js
describe('MerchantClassifier', () => {
  test('classifies Whole Foods as groceries', async () => {
    const result = await classifier.classifyMerchant('Whole Foods Market');
    expect(result.category).toBe('groceries');
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  test('classifies DoorDash as dining', async () => {
    const result = await classifier.classifyMerchant('DoorDash - Restaurant', null);
    expect(result.category).toBe('dining');
  });

  test('uses MCC code for high confidence', async () => {
    const result = await classifier.classifyMerchant('Unknown', '5812'); // Restaurant MCC
    expect(result.category).toBe('dining');
    expect(result.mcc_matched).toBe(true);
  });

  test('all 14 categories are supported', () => {
    const categories = Object.keys(categoryDefinitions);
    expect(categories).toHaveLength(14);
  });

  test('returns default for unmatched merchants', async () => {
    const result = await classifier.classifyMerchant('xyzABC123Unknown');
    expect(result.category).toBe('default');
    expect(result.confidence).toBeLessThan(0.2);
  });
});

// /__tests__/unit/categoryMatcher.test.js
describe('CategoryMatcher', () => {
  test('matches exact category', () => {
    const card = {
      card_name: 'Amex Gold',
      reward_structure: { dining: 4, groceries: 4, default: 1 }
    };
    const result = matcher.findRewardMultiplier(card, 'dining');
    expect(result.multiplier).toBe(4);
    expect(result.source).toBe('exact_match');
  });

  test('matches category aliases', () => {
    const card = {
      card_name: 'Chase Sapphire',
      reward_structure: { restaurants: 3, default: 1 } // using 'restaurants' instead of 'dining'
    };
    const result = matcher.findRewardMultiplier(card, 'dining');
    expect(result.multiplier).toBe(3);
    expect(result.source).toBe('alias_match');
  });

  test('handles rotating categories', () => {
    const card = {
      card_name: 'Chase Freedom',
      reward_structure: {
        rotating: {
          value: 5,
          active_categories: ['entertainment', 'dining']
        }
      }
    };
    const result = matcher.findRewardMultiplier(card, 'entertainment');
    expect(result.multiplier).toBe(5);
    expect(result.source).toBe('rotating_category');
  });

  test('returns default multiplier for unmatched category', () => {
    const card = {
      card_name: 'Generic Card',
      reward_structure: { default: 1 }
    };
    const result = matcher.findRewardMultiplier(card, 'unknown_category');
    expect(result.multiplier).toBe(1);
    expect(result.source).toBe('default');
  });

  test('handles complex reward structures with notes', () => {
    const card = {
      card_name: 'Card with Notes',
      reward_structure: {
        transit: { value: 3, note: 'Public transit only, excludes rideshare' }
      }
    };
    const result = matcher.findRewardMultiplier(card, 'transit');
    expect(result.multiplier).toBe(3);
    expect(result.explanation).toContain('Public transit');
  });
});

// /__tests__/unit/enhancedRecommendationEngine.test.js
describe('EnhancedRecommendationEngine', () => {
  test('recommends best card for dining', async () => {
    const userCards = [
      { id: '1', card_name: 'Amex Gold', reward_structure: { dining: 4, default: 1 }, apr: 20, credit_limit: 10000, current_balance: 2000 },
      { id: '2', card_name: 'Generic Card', reward_structure: { default: 1 }, apr: 25, credit_limit: 5000, current_balance: 3000 }
    ];

    const result = await engine.getRecommendation(userId, {
      merchant: 'Olive Garden',
      amount: 150
    });

    expect(result.primary.id).toBe('1');
    expect(result.category_detected.category).toBe('dining');
    expect(result.primary.detected_multiplier).toBe(4);
  });

  test('provides alternatives when tied on rewards', async () => {
    const result = await engine.getRecommendation(userId, {
      merchant: 'Supermarket',
      amount: 100
    });

    expect(result.alternatives.length).toBeGreaterThan(0);
    expect(result.alternatives[0].score).toBeLessThanOrEqual(result.primary.score);
  });

  test('avoids low credit cards', async () => {
    const userCards = [
      {
        card_name: 'Card A',
        reward_structure: { dining: 4, default: 1 },
        apr: 20,
        credit_limit: 500,
        current_balance: 400 // Only $100 available
      },
      {
        card_name: 'Card B',
        reward_structure: { dining: 3, default: 1 },
        apr: 20,
        credit_limit: 10000,
        current_balance: 2000 // $8000 available
      }
    ];

    const result = await engine.getRecommendation(userId, {
      merchant: 'Restaurant',
      amount: 200
    });

    expect(result.primary.card_name).toBe('Card B');
  });

  test('works with all 14 categories', async () => {
    const testCases = [
      { merchant: 'Netflix', expectedCategory: 'streaming' },
      { merchant: 'Cinemark Movie Tickets', expectedCategory: 'entertainment' },
      { merchant: 'CVS Pharmacy', expectedCategory: 'drugstores' },
      { merchant: 'Home Depot', expectedCategory: 'home_improvement' },
      { merchant: 'Costco', expectedCategory: 'warehouse' },
      // ... test all 14
    ];

    for (const testCase of testCases) {
      const result = await engine.getRecommendation(userId, {
        merchant: testCase.merchant
      });
      expect(result.category_detected.category).toBe(testCase.expectedCategory);
    }
  });
});

// /__tests__/integration/recommendationFlow.test.js
describe('Full Recommendation Flow', () => {
  test('e2e: user asks for best card for category', async () => {
    // Simulate: User asks "Best card for Amazon?"
    const query = 'Which card should I use at Amazon?';

    const analysis = analyzeQuery(query); // Natural language processing
    const recommendation = await getRecommendation(userId, {
      merchant: 'Amazon.com',
      mccCode: '5411', // Potentially from transaction data
      amount: 150
    });

    expect(recommendation.primary).toBeDefined();
    expect(recommendation.category_detected.category).toBe('department_stores');
    expect(recommendation.primary.detected_multiplier).toBeGreaterThan(1);
  });

  test('handles confidence thresholds correctly', async () => {
    // For high-confidence matches, should have high confidence score
    const highConfidence = await engine.getRecommendation(userId, {
      merchant: 'Delta Airlines' // Very clear category: travel
    });
    expect(highConfidence.confidence).toBeGreaterThan(0.9);

    // For low-confidence matches, should fall back to default
    const lowConfidence = await engine.getRecommendation(userId, {
      merchant: 'XYZXYZ Corp' // Unclear
    });
    expect(lowConfidence.primary.detected_multiplier).toBeLessThanOrEqual(2);
  });
});
```

### 5.2 Test Coverage Goals

| Module | Target Coverage |
|--------|-----------------|
| MerchantClassifier | 95% (critical path) |
| CategoryMatcher | 98% (deterministic) |
| EnhancedRecommendationEngine | 90% |
| CategoryDefinitions | 100% (data integrity) |
| Integration Tests | 85% |

---

## 6. Implementation Roadmap

### Phase 1: Foundation (Week 1)
- [x] Create `categoryDefinitions.js` with all 14 categories
- [x] Create `MerchantClassifier` service
- [x] Create `CategoryMatcher` service
- [x] Write unit tests for both services
- [ ] Code review & refinement

### Phase 2: Integration (Week 2)
- [ ] Create `EnhancedRecommendationEngine`
- [ ] Update `recommendationEngine.js` to use new system
- [ ] Migrate demo cards to new reward_structure format
- [ ] Integration tests
- [ ] Update documentation

### Phase 3: Deployment (Week 3)
- [ ] Feature flag for new system
- [ ] Canary deployment (10% users)
- [ ] Monitor performance and accuracy
- [ ] Full rollout
- [ ] Deprecate old system

---

## 7. Data Migration

### 7.1 Demo Card Migration

```javascript
// Before
const DEMO_CARDS = [{
  reward_structure: {
    groceries: 3,
    dining: 3,
    gas: 3,
    travel: 1,
    default: 1.5
  }
}];

// After
const DEMO_CARDS = [{
  reward_structure: {
    groceries: 3,
    dining: 3,
    gas: 3,
    travel: 1,
    streaming: 2,
    entertainment: 2,
    drugstores: 1,
    home_improvement: 2,
    department_stores: 1,
    transit: 1,
    utilities: 1,
    warehouse: 3,
    office_supplies: 1.5,
    insurance: 1,
    default: 1.5
  }
}];
```

### 7.2 User Card Backward Compatibility

```javascript
// All existing user cards continue to work
// New system falls back to default if category not found
// Optional: Run migration job to add new categories to user cards

async function migrateUserCardToNewFormat(card) {
  // Preserve existing rewards
  const preserved = card.reward_structure;

  // Add missing categories with intelligent defaults
  const enhanced = {
    ...preserved,
    streaming: preserved.default || 1,
    entertainment: preserved.default || 1,
    drugstores: preserved.default || 1,
    home_improvement: preserved.default || 1,
    department_stores: preserved.default || 1,
    transit: preserved.default || 1,
    utilities: preserved.default || 1,
    warehouse: preserved.groceries || preserved.default || 1,
    office_supplies: preserved.default || 1,
    insurance: preserved.default || 1
  };

  return { ...card, reward_structure: enhanced };
}
```

---

## 8. Success Metrics

### 8.1 Accuracy Metrics
- **Category Classification Accuracy:** >90% match with real merchant categories
- **Confidence Scores:** >85% of recommendations have >80% confidence
- **False Positive Rate:** <5% (wrong category assignment)

### 8.2 User Experience Metrics
- **Recommendation Relevance:** Track user selection of recommended cards (conversion rate)
- **Coverage:** 14 categories supported vs current 5
- **Explanation Quality:** User feedback on recommendation explanations

### 8.3 Performance Metrics
- **Classification Latency:** <100ms per merchant
- **Cache Hit Rate:** >80% (repeated merchants)
- **API Response Time:** <500ms for full recommendation

---

## 9. Risk Mitigation

### 9.1 Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Inaccurate classification | User gets wrong card | Use MCC codes + ML + user feedback loop |
| Performance degradation | Slow recommendations | Aggressive caching + async classification |
| Schema mismatch | Broken recommendations | Backward compatibility + versioning |
| Missing categories | No reward matching | Comprehensive category design + testing |

### 9.2 Rollback Plan

If issues arise:
1. Feature flag disabled → reverts to old system
2. Revert database migrations → uses old schema
3. Clear cache → forces fresh classification
4. Manual investigation of problem merchants

---

## 10. Dependencies & Prerequisites

### Technology Stack
- Node.js 18+
- PostgreSQL 14+ (for merchant DB)
- LRU-Cache library (npm)
- Jest (testing)

### Database Requirements
- New tables: `merchant_classifications`, `category_definitions`
- Indexes on: merchant name, MCC code, category
- Replication for high-availability

### Third-Party Integrations
- Optional: MCC code database (external API)
- Optional: ML classification service (future)

---

## 11. Questions for Stakeholders

1. **MCC Code Availability:** Do we have access to merchant MCC codes in transaction data?
2. **Priority Categories:** Which of the 14 categories are most important for initial launch?
3. **Card Database Update:** How frequently can we update the card catalog reward structures?
4. **User Feedback:** Is there a mechanism to track recommendation accuracy (did user accept recommendation)?
5. **Performance Requirements:** What's the maximum acceptable latency for recommendations?

---

## 12. Conclusion

This design provides a **scalable, maintainable, and extensible** recommendation engine that:
✅ Supports all 14 merchant categories
✅ Maintains backward compatibility
✅ Provides high accuracy with confidence scoring
✅ Enables future ML enhancements
✅ Includes comprehensive testing

**Next Step:** Proceed to implementation with Phase 1 (Foundation).
