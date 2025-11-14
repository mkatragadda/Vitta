# Enhanced Card Recommendation Engine - Quick Reference

## 📋 Summary

Enhance Vitta's card recommendation system to support **14 merchant categories** instead of current 5, with intelligent merchant classification and improved recommendation accuracy.

---

## 🎯 What's Changing

### Current System (5 Categories)
```
Groceries → Dining → Gas → Travel → Default
```

### Enhanced System (14 Categories)
```
1. Dining (🍽️)
2. Groceries (🛒)
3. Gas/Fuel (⛽)
4. Travel (✈️)
5. Entertainment (🎬)
6. Streaming (🎥)
7. Drugstores (💊)
8. Home Improvement (🏠)
9. Department Stores (🏬)
10. Transit (🚌)
11. Utilities (📡)
12. Warehouse (📦)
13. Office Supplies (🖊️)
14. Insurance (🛡️)
```

---

## 📁 Files to Create

### Core Services (3 new files)
1. **`/services/merchantClassification/merchantClassifier.js`**
   - Classifies merchant names → 14 categories
   - Uses keyword matching + MCC codes + database lookup
   - Returns confidence score (0-100%)

2. **`/services/categories/categoryDefinitions.js`**
   - Single source of truth for all 14 categories
   - Keywords, MCC codes, aliases, subcategories
   - Example:
   ```javascript
   { id: 'dining', name: 'Dining & Restaurants',
     keywords: ['restaurant', 'cafe', 'doordash'],
     mcc_codes: [5812, 5813],
     reward_aliases: ['dining', 'restaurants', 'food'] }
   ```

3. **`/services/recommendations/categoryMatcher.js`**
   - Matches detected category → card reward multiplier
   - Handles exact match, aliases, parent categories, rotating categories
   - Provides explanation & confidence

4. **`/services/recommendations/enhancedRecommendationEngine.js`**
   - Main orchestrator integrating all new services
   - Flows: merchant → classify → match rewards → score cards → recommend

### Test Files (3 new files)
5. **`/__tests__/unit/merchantClassifier.test.js`** - Unit tests for classification
6. **`/__tests__/unit/categoryMatcher.test.js`** - Unit tests for matching
7. **`/__tests__/unit/enhancedRecommendationEngine.test.js`** - Integration tests

### Utilities (2 new files)
8. **`/services/merchantClassification/merchantDatabase.js`** - Lookup known merchants
9. **`/services/merchantClassification/mccCodeMapper.js`** - MCC → category mapping

### Documentation (1 new file)
10. **`/docs/ENHANCED_RECOMMENDATIONS.md`** - User documentation

### Database (1 SQL file)
11. **`/supabase/merchantClassificationSchema.sql`** - New tables for caching

---

## 🔄 Files to Modify

| File | Change |
|------|--------|
| `/services/cardAnalyzer.js` | Update `MERCHANT_REWARDS` to use new 14-category system |
| `/services/cardService.js` | Update 3 demo cards with new `reward_structure` format |
| `/services/recommendations/recommendationEngine.js` | Integrate `EnhancedRecommendationEngine` before scoring |
| `/services/recommendations/recommendationStrategies.js` | Update scoring to handle all 14 categories |
| `/config/intentDefinitions.js` | Add intents for new categories |
| `/services/chat/cardDataQueryHandler.js` | Support queries about new categories |
| `/supabase/schema.sql` | Add merchant classification table |

---

## 🏗️ Architecture Diagram

```
User Query
   ↓
Merchant Classifier  ← Keyword matching + MCC codes + Database lookup
   ↓
Category Detected (dining, streaming, etc.)
   ↓
Category Matcher  ← For each user card
   ↓
Reward Multiplier for each card
   ↓
Card Scorer  ← Calculate score based on: rewards × amount, APR, available credit
   ↓
Ranked Recommendations
   ↓
Top 3 Cards with explanations
```

---

## 📊 Card Reward Structure Evolution

### Before
```javascript
card.reward_structure = {
  dining: 4,
  groceries: 3,
  gas: 3,
  travel: 1,
  default: 1.5
}
```

### After
```javascript
card.reward_structure = {
  // Existing categories
  dining: { value: 4, subcategories: ['casual_dining', 'fast_food'] },
  groceries: { value: 3, subcategories: ['supermarket', 'warehouse'] },

  // New categories
  streaming: 2,
  entertainment: { value: 2, note: "Excludes sporting events" },
  drugstores: 1,
  home_improvement: 2,
  department_stores: 1,
  transit: { value: 1, note: "Public transit only" },
  utilities: 1,
  warehouse: 3,
  office_supplies: 1.5,
  insurance: 1,

  // Rotating categories support
  rotating: {
    active_categories: ['entertainment', 'office_supplies'],
    value: 5,
    max_per_quarter: 1500
  },

  default: 1
}
```

---

## 🧪 Testing Strategy

### Unit Tests
- **MerchantClassifier:** 95% coverage
  - ✅ "Whole Foods" → groceries (90%+ confidence)
  - ✅ "DoorDash" → dining
  - ✅ MCC code 5812 → dining
  - ✅ Unknown merchant → default (low confidence)

- **CategoryMatcher:** 98% coverage
  - ✅ Exact category match
  - ✅ Alias resolution (dining ≈ restaurants)
  - ✅ Parent category fallback
  - ✅ Rotating category handling
  - ✅ Default fallback

- **EnhancedRecommendationEngine:** 90% coverage
  - ✅ Best card selection per category
  - ✅ All 14 categories work
  - ✅ Avoids cards with low credit
  - ✅ Provides alternatives

### Integration Tests
- ✅ E2E: User asks "Best card for Amazon?" → Gets department_stores recommendation
- ✅ Confidence thresholds correct
- ✅ Backward compatibility with old cards

### Test Coverage Target: **92%+ overall**

---

## 📈 Success Metrics

| Metric | Target | How to Measure |
|--------|--------|---|
| **Classification Accuracy** | >90% | Match with actual merchant categories |
| **Recommendation Relevance** | >85% | Users select recommended card |
| **Confidence Scores** | >85% accurate | Calibrate vs actual accuracy |
| **Latency** | <100ms | Profile merchant classification |
| **Cache Hit Rate** | >80% | Monitor LRU cache |

---

## 🚀 Implementation Phases

### Phase 1: Foundation (Weeks 1-2)
- [ ] Create category definitions
- [ ] Implement MerchantClassifier
- [ ] Implement CategoryMatcher
- [ ] Write & pass unit tests
- **Deliverable:** Two tested services

### Phase 2: Integration (Weeks 3-4)
- [ ] Create EnhancedRecommendationEngine
- [ ] Integrate with existing recommendation flow
- [ ] Migrate demo cards
- [ ] Write integration tests
- [ ] Update chat handlers
- **Deliverable:** Fully integrated system

### Phase 3: Deployment (Weeks 5-6)
- [ ] Add feature flag
- [ ] Canary deployment (10% users)
- [ ] Monitor accuracy & latency
- [ ] Full rollout
- [ ] Deprecate old system
- **Deliverable:** Production system with new 14 categories

---

## 💡 Key Design Decisions

### 1. **Backward Compatible**
- Existing cards continue to work
- Fall back to default multiplier if new category not found
- No breaking changes to schema

### 2. **Extensible**
- Easy to add more categories in future
- Pluggable merchant classifier (can swap in ML model later)
- Alias system for card variation handling

### 3. **High Confidence**
- Uses multiple sources: MCC codes → Database → Keywords
- Returns confidence scores (0-100%)
- Traces reasoning for transparency

### 4. **Cached & Fast**
- LRU cache of 1000 recent classifications
- <100ms latency target
- Database lookup for known merchants

### 5. **Well-Tested**
- 95%+ unit test coverage
- Integration tests for real-world scenarios
- Confidence calibration tests

---

## ⚠️ Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Wrong classification | Multi-source verification + user feedback loop |
| Performance impact | Aggressive caching + async processing |
| Schema incompatibility | Backward compatibility layer + versioning |
| Missing categories | Comprehensive design + user testing |

**Rollback Plan:** Feature flag → disable new system → revert to v1 (5 categories)

---

## 📝 Example Usage

### Before
```javascript
// Limited: only 5 categories understood
const rec = await getRecommendation(userId, {
  merchant: 'Netflix', // Falls to default 1x (doesn't understand streaming)
  amount: 15.99
});
// Result: Generic card (sad 😢)
```

### After
```javascript
// Enhanced: understands all 14 categories
const rec = await getRecommendation(userId, {
  merchant: 'Netflix',
  mccCode: '4899' // streaming MCC code
  amount: 15.99
});
// Result: {
//   primary: { card_name: 'Chase Sapphire',
//              detected_multiplier: 2,
//              explanation: "Offers 2x on streaming" },
//   confidence: 95%,
//   category_detected: 'streaming'
// }
// Result: Smart recommendation! (happy 😊)
```

---

## 🎓 Category Details

### 1. **Dining** 🍽️
- Keywords: restaurant, cafe, doordash, grubhub
- MCC: 5812-5814
- Subcategories: fine_dining, casual, fast_food, delivery

### 2. **Groceries** 🛒
- Keywords: grocery, supermarket, whole foods, kroger
- MCC: 5411, 5412
- Subcategories: supermarket, warehouse, natural_organic

### 3. **Gas/Fuel** ⛽
- Keywords: gas, fuel, shell, chevron, EV charging
- MCC: 5542
- Subcategories: gas_station, ev_charging

### 4. **Travel** ✈️
- Keywords: airline, hotel, airbnb, travel
- MCC: 4511-4722
- Subcategories: airfare, hotel, car_rental, public_transit

### 5. **Entertainment** 🎬
- Keywords: movie, cinema, theater, concert, amusement
- MCC: 7832, 7922
- Subcategories: movies, live_events, amusement_parks

### 6. **Streaming** 🎥
- Keywords: netflix, hulu, spotify, disney+, apple tv
- MCC: 4899
- Note: Digital subscriptions only

### 7. **Drugstores** 💊
- Keywords: cvs, walgreens, rite aid, pharmacy
- MCC: 5912
- Subcategories: pharmacy, health_products

### 8. **Home Improvement** 🏠
- Keywords: home depot, lowes, hardware store
- MCC: 5211
- Subcategories: hardware, paint, tools

### 9. **Department Stores** 🏬
- Keywords: amazon, amazon.com, target, macy's, nordstrom
- MCC: 5311
- Subcategories: general_retail, online_shopping

### 10. **Transit** 🚌
- Keywords: uber, lyft, metro, bus, subway, mta
- MCC: 4111
- Note: Excludes rideshare in some cards

### 11. **Utilities** 📡
- Keywords: comcast, verizon, at&t, phone bill, internet
- MCC: 4814
- Subcategories: phone, cable, internet

### 12. **Warehouse** 📦
- Keywords: costco, sams club, bj's, amazon prime
- MCC: 5411
- Subcategories: warehouse_clubs, bulk_shopping

### 13. **Office Supplies** 🖊️
- Keywords: staples, office depot, office max
- MCC: 5200
- Subcategories: business_supplies, office_equipment

### 14. **Insurance** 🛡️
- Keywords: insurance, policy, premium
- MCC: 6211
- Subcategories: auto, home, health, life

---

## 📞 Contact & Questions

**Design Document:** `ENHANCED_RECOMMENDATION_DESIGN.md`
**Implementation Status:** Ready for Phase 1
**Questions:** Consult design doc Section 11

---

**Created:** November 2024
**Status:** Design Complete - Ready for Implementation
