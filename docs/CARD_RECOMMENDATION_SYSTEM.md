# Card Recommendation System Documentation

## Overview

The Card Recommendation System is Vitta's intelligent credit card recommendation engine that helps users choose the optimal credit card for every purchase based on three key strategies:

1. **Maximize Rewards** - Best for users who pay in full each month
2. **Minimize Interest (APR)** - Best for users carrying balances
3. **Optimize Cash Flow** - Best for strategic spenders maximizing time until payment

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────┐
│                  User Interface Layer                    │
├─────────────────────────────────────────────────────────┤
│  - RecommendationScreen.js (Main UI)                    │
│  - VittaChatInterface (Chat Integration)                │
│  - CreditCardScreen (Card Search & Add)                 │
└─────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────┐
│                    Business Logic Layer                  │
├─────────────────────────────────────────────────────────┤
│  - recommendationEngine.js (3 Scoring Strategies)       │
│  - cardDiscoveryService.js (New Card Suggestions)       │
│  - behaviorAnalyzer.js (User Pattern Detection)         │
└─────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────┐
│                      Data Layer                          │
├─────────────────────────────────────────────────────────┤
│  - cardCatalogService.js (Card Database)                │
│  - cardService.js (User Cards)                          │
│  - Supabase (PostgreSQL + pgvector)                     │
└─────────────────────────────────────────────────────────┘
```

## Database Setup

### Step 1: Run SQL Schema

Execute the schema in your Supabase SQL Editor:

```bash
# File location
supabase/CARD_RECOMMENDATION_SCHEMA.sql
```

This creates:
- `card_catalog` - Credit card master database
- `user_behavior_profile` - User payment pattern analysis
- `user_payment_history` - Individual payment tracking
- Updated `user_credit_cards` with new fields

### Step 2: Verify Tables

After running the schema, verify these tables exist:
1. `card_catalog` - Should have 10+ pre-seeded popular cards
2. `user_behavior_profile`
3. `user_payment_history`

## Services Layer

### 1. Card Catalog Service
**Location:** `services/cardDatabase/cardCatalogService.js`

**Key Functions:**
- `getCardCatalog(options)` - Fetch cards with filters
- `searchCards(query, filters)` - Fuzzy search by name/issuer
- `getCardsByCategory(category)` - Filter by category
- `getTopCards(limit)` - Get most popular cards

**Usage Example:**
```javascript
import { searchCards } from '../services/cardDatabase/cardCatalogService';

// Search for Chase cards
const results = await searchCards('chase');

// Get travel cards
const travelCards = await getCardsByCategory('travel');
```

### 2. Behavior Analyzer
**Location:** `services/userBehavior/behaviorAnalyzer.js`

**Key Functions:**
- `analyzeUserBehavior(userId)` - Analyze and classify user
- `getUserProfile(userId)` - Get existing profile
- `recordPayment(paymentData)` - Track payment events

**Profile Types:**
- `REWARDS_MAXIMIZER` - Pays in full >75% of time
- `APR_MINIMIZER` - Carries balance on high APR cards
- `CASHFLOW_OPTIMIZER` - Strategic payment timing

**Usage Example:**
```javascript
import { getUserProfile } from '../services/userBehavior/behaviorAnalyzer';

const profile = await getUserProfile(userId);
console.log(profile.profileType); // 'REWARDS_MAXIMIZER'
console.log(profile.confidenceScore); // 0.85 (85% confident)
```

### 3. Recommendation Engine
**Location:** `services/recommendations/recommendationEngine.js`

**Key Functions:**
- `getRecommendationForPurchase(userId, context)` - Main recommendation
- `getAllStrategyRecommendations(userId, context)` - Compare all strategies
- `calculateRewardValue(card, context)` - Estimate reward value
- `getStrategyInfo(strategy)` - Get strategy metadata

**Scoring Strategies:**

#### Strategy 1: Maximize Rewards
```javascript
// Scoring factors:
- Reward multiplier (4x dining = 400 points)
- Potential dollar value
- Available credit check
- Low utilization bonus
- Balance spreading
```

#### Strategy 2: Minimize APR
```javascript
// Scoring factors:
- Lower APR = higher score
- 0% intro APR bonus (+100 points)
- Available credit check
- Lower existing balance bonus
```

#### Strategy 3: Optimize Cash Flow
```javascript
// Scoring factors:
- Days until payment due (3 points/day)
- Grace period length
- 0% APR bonus
- Statement cycle timing
```

**Usage Example:**
```javascript
import { getRecommendationForPurchase } from '../services/recommendations/recommendationEngine';

const rec = await getRecommendationForPurchase(userId, {
  category: 'dining',
  amount: 200,
  strategy: 'REWARDS_MAXIMIZER' // Optional override
});

console.log(rec.primary.card_name); // 'American Express Gold Card'
console.log(rec.reasoning); // 'Earn 4x rewards (~$8.00 value) • Low utilization (18%)'
console.log(rec.alternatives); // [card2, card3]
```

### 4. Card Discovery Service
**Location:** `services/recommendations/cardDiscoveryService.js`

**Key Functions:**
- `suggestNewCards(userId, strategy)` - Suggest cards user doesn't have
- `suggestCardsByCategory(userId, category)` - Category-specific suggestions
- `compareWithUserCards(catalogCard, userCards, category)` - Compare new vs existing

**Usage Example:**
```javascript
import { suggestNewCards } from '../services/recommendations/cardDiscoveryService';

const suggestions = await suggestNewCards(userId, 'REWARDS_MAXIMIZER');
// Returns top 5-10 cards ranked by strategy
```

## UI Components

### Recommendation Screen
**Location:** `components/RecommendationScreen.js`

**Features:**
- Strategy selector (3 cards)
- Purchase context inputs (category, amount)
- Best card from wallet display
- Alternative options
- New card suggestions (6 cards)
- User behavior profile insights

**Navigation:**
```javascript
// From chat
[Card Recommendations](vitta://navigate/recommendations)

// From code
setCurrentScreen('recommendations');
```

**Props:**
- `onBack` - Function to return to main screen
- `user` - User object with ID
- `userCards` - Array of user's credit cards

### Integration Points

**VittaApp.js:**
```javascript
// Already integrated:
- Import: import RecommendationScreen from './RecommendationScreen';
- State: currentScreen === 'recommendations'
- Navigation: screenMapping['recommendations'] = 'recommendations'
```

## User Workflow

### 1. First-Time User Experience

```
User logs in
  → Has no cards
  → Recommendation screen shows "Add cards to get recommendations"
  → Clicks "Go to My Wallet"
  → Adds first card using search
  → Returns to recommendations
  → System analyzes (defaults to REWARDS_MAXIMIZER with 50% confidence)
  → Shows recommendations
```

### 2. Returning User Experience

```
User logs in
  → Has 3+ cards with payment history
  → System loads behavior profile (cached for 7 days)
  → Profile shows: REWARDS_MAXIMIZER (85% confidence)
  → User selects purchase context:
     - Category: Dining
     - Amount: $200
  → System recommends: Amex Gold (4x = $8 value)
  → User can:
     a) Switch strategy to compare
     b) View alternative cards
     c) Browse new card suggestions
```

### 3. Strategy Switching

```
User viewing recommendation
  → Currently: REWARDS_MAXIMIZER strategy
  → Clicks "Minimize Interest" strategy
  → System re-scores all cards for APR
  → New recommendation: Card with 0% APR
  → Reasoning updates: "0% APR - No interest charges! • Save ~$3.30/month"
```

## Chat Integration (Future Implementation)

### Chat Intent: `card_recommendation`
**Location:** `services/chat/recommendationChatHandler.js` (to be created)

**Example Queries:**
```
"Which card should I use for this $200 dinner?"
"Best card for groceries?"
"Recommend a card to minimize interest"
"Which card has the longest grace period?"
"Card recommendations for $5000 flight"
```

**Response Format:**
```
For your $200 dinner at **Del Frisco's**, I recommend:

**Amex Gold Card** 🏆

**Why?**
Earn 4x rewards (~$8.00 value) • Low utilization (18%) • $12,450 available credit

**Alternative:** Chase Sapphire (3x dining, $6 value)

📊 See all options in [Card Recommendations](vitta://navigate/recommendations)
```

## Advanced Features

### 1. Portfolio Gap Analysis

The system identifies if a new card fills a gap in your portfolio:

```javascript
// Example: User has cashback cards but no travel cards
const hasGap = checkForPortfolioGap(newCard, userCards, 'rewards');
// Returns true if new card offers >2x in a category user lacks
```

### 2. Sign-Up Bonus Optimization

Ranks new cards by sign-up bonus value:

```javascript
// Amex Gold: $600 bonus (60000 points × $0.01)
// Chase Sapphire: $750 bonus (75000 points × $0.01)
// Sorted by value after annual fee deduction
```

### 3. Behavior Confidence Scoring

```javascript
// Confidence factors:
- Payment history count (12+ months = +0.3)
- Number of cards (3+ cards = +0.1)
- Consistency (>90% full payment = +0.1)

// Final confidence: 0.5 - 1.0
// If < 0.7: Show strategy suggestion but allow override
// If >= 0.7: Auto-apply strategy with confidence badge
```

## Testing Guide

### Manual Testing Steps

1. **Setup Database:**
   ```sql
   -- Run in Supabase SQL Editor
   -- File: supabase/CARD_RECOMMENDATION_SCHEMA.sql
   ```

2. **Add Test Cards:**
   ```javascript
   // Use the Add Card UI with search
   // Search for: "Chase Sapphire"
   // Fill in: APR (19.99%), Credit Limit (15000), Balance (1000)
   ```

3. **Test Recommendations:**
   ```
   - Navigate to Recommendations screen
   - Select "Maximize Rewards"
   - Category: Dining, Amount: $100
   - Verify top recommendation makes sense
   - Switch to "Minimize Interest"
   - Verify different card recommended
   ```

4. **Test Behavior Analysis:**
   ```javascript
   // Add payment history (currently manual)
   import { recordPayment } from '../services/userBehavior/behaviorAnalyzer';

   await recordPayment({
     userId: user.id,
     cardId: card.id,
     paymentDate: '2025-01-15',
     amountPaid: 1000,
     balanceBefore: 1000,
     balanceAfter: 0,
     daysBeforeDue: 5,
     dueDate: '2025-01-20'
   });
   ```

### Expected Behaviors

**Scenario 1: User with high utilization**
- System detects: APR_MINIMIZER profile
- Auto-suggests: Lowest APR card or 0% balance transfer
- Reasoning includes: Interest savings calculation

**Scenario 2: User pays in full**
- System detects: REWARDS_MAXIMIZER profile
- Auto-suggests: Highest reward multiplier for category
- Reasoning includes: Point value estimation

**Scenario 3: No behavior data**
- System defaults: REWARDS_MAXIMIZER (50% confidence)
- Shows insight: "Add more cards and payment history for better recommendations"

## Common Issues & Solutions

### Issue 1: "No recommendations showing"
**Cause:** User has no cards in wallet
**Solution:** Add at least one card via "My Wallet" screen

### Issue 2: "All scores are 0"
**Cause:** All cards have insufficient available credit
**Solution:** Check card balances and limits

### Issue 3: "New card suggestions empty"
**Cause:** Card catalog not seeded
**Solution:** Verify card_catalog table has records:
```sql
SELECT COUNT(*) FROM card_catalog WHERE is_active = true;
-- Should return 10+
```

### Issue 4: "Strategy always defaults to REWARDS_MAXIMIZER"
**Cause:** No payment history recorded
**Solution:** Payment history tracking not yet automated. Will be added when payment features are implemented.

## Performance Considerations

### Caching Strategy
- User behavior profiles: Cached for 7 days
- Card catalog: Cached on first load
- Recommendations: Computed on-demand (fast, < 100ms)

### Database Indexes
```sql
-- Already created in schema:
- card_catalog: gin(to_tsvector('english', card_name))
- card_catalog: (issuer), (category using gin)
- user_payment_history: (user_id), (card_id), (payment_date DESC)
```

### Optimization Tips
1. Limit card catalog to active cards: `is_active = true`
2. Use pagination for large result sets (>50 cards)
3. Pre-compute popular recommendations for common categories

## Future Enhancements

### Phase 2: Chat Integration
- [x] Add `card_recommendation` intent
- [ ] Build `recommendationChatHandler.js`
- [ ] Entity extraction (amount, merchant, category)
- [ ] Conversational follow-ups

### Phase 3: Enhanced Card Search
- [ ] Update `AddCardModal` with autocomplete search
- [ ] Pre-fill reward structures from catalog
- [ ] Card images in search results

### Phase 4: Advanced Features
- [ ] Real-time merchant categorization
- [ ] Statement cycle tracking
- [ ] Automatic payment recording
- [ ] Multi-card purchase splitting
- [ ] Annual fee ROI calculator

### Phase 5: External Data Integration
- [ ] Fetch card data from GitHub YAML API
- [ ] Auto-update card catalog weekly
- [ ] Real-time APR changes
- [ ] Sign-up bonus expiration tracking

## API Reference

### Main Functions

```javascript
// Get recommendation
const rec = await getRecommendationForPurchase(userId, {
  category: 'dining' | 'groceries' | 'travel' | 'gas' | 'default',
  amount: number,
  date: Date,
  strategy: 'REWARDS_MAXIMIZER' | 'APR_MINIMIZER' | 'CASHFLOW_OPTIMIZER' // optional
});

// Suggest new cards
const suggestions = await suggestNewCards(
  userId,
  strategy,
  options?: { category, maxAnnualFee }
);

// Analyze user behavior
const profile = await analyzeUserBehavior(userId);

// Search cards
const results = await searchCards(query, {
  category?: string,
  issuer?: string,
  maxAnnualFee?: number
});
```

## Contributing

When adding new features to the recommendation system:

1. **Update scoring algorithms** in `recommendationEngine.js`
2. **Add tests** for new strategies
3. **Document** new strategies in this file
4. **Update UI** if adding new strategy types
5. **Maintain backwards compatibility** with existing data

## Support

For issues or questions:
1. Check this documentation
2. Review code comments in service files
3. Check Supabase table structures
4. Test with sample data in development

---

**Last Updated:** 2025-11-02
**Version:** 1.0.0
**Status:** ✅ Core System Implemented, Chat Integration Pending
