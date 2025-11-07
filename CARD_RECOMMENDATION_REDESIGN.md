# Card Recommendation Engine - Complete Redesign

## Current Architecture (BROKEN)

### Problems:
1. Shows all 3 strategies in ONE table → confusing
2. Recommends cards with balances for cashflow → violates grace period
3. No user profile consideration
4. No actual $$ impact shown
5. Single scoring function trying to do everything

## New Architecture (PROPOSED)

### 1. User Profile Detection (ML-Based)

```javascript
function detectUserProfile(cards) {
  const metrics = {
    cardsWithBalance: cards.filter(c => c.current_balance > 0).length,
    totalCards: cards.length,
    avgUtilization: calculateAvgUtilization(cards),
    highUtilizationCards: cards.filter(c => (c.current_balance / c.credit_limit) > 0.5).length
  };
  
  // Profile: REWARDS_MAXIMIZER (pays in full monthly)
  if (metrics.cardsWithBalance === 0 || metrics.avgUtilization < 10) {
    return {
      profile: 'REWARDS_MAXIMIZER',
      priority: ['rewards', 'grace_period', 'apr'],
      description: 'You typically pay balances in full'
    };
  }
  
  // Profile: APR_MINIMIZER (carries balances)
  if (metrics.highUtilizationCards > 0 || metrics.avgUtilization > 30) {
    return {
      profile: 'APR_MINIMIZER',
      priority: ['apr', 'rewards', 'grace_period'],
      description: 'You carry balances - minimizing interest is key'
    };
  }
  
  // Profile: BALANCED (sometimes carries balance)
  return {
    profile: 'BALANCED',
    priority: ['rewards', 'apr', 'grace_period'],
    description: 'You occasionally carry balances'
  };
}
```

### 2. Three Separate Scoring Functions

#### A. Rewards Optimizer
```javascript
function scoreForRewards(card, category, amount) {
  // CRITICAL: Only cards with NO balance have grace period
  if (card.current_balance > 0) {
    return null; // Cannot recommend - no grace period
  }
  
  const multiplier = getRewardMultiplier(card, category);
  const cashback = amount * (multiplier / 100);
  
  return {
    card: card,
    strategy: 'REWARDS',
    cashback: cashback,
    annualValue: cashback * 12, // If spend monthly
    score: cashback,
    explanation: `Earn $${cashback.toFixed(2)} cashback on this purchase`
  };
}
```

#### B. APR Optimizer
```javascript
function scoreForAPR(card, amount) {
  const monthlyRate = (card.apr / 12) / 100;
  const monthlyInterest = amount * monthlyRate;
  const annualInterest = amount * (card.apr / 100);
  
  return {
    card: card,
    strategy: 'LOW_APR',
    apr: card.apr,
    monthlyInterest: monthlyInterest,
    annualInterest: annualInterest,
    score: -monthlyInterest, // Lower interest = higher score
    explanation: `If you carry $${amount} balance: $${monthlyInterest.toFixed(2)}/month interest`
  };
}
```

#### C. Grace Period Optimizer
```javascript
function scoreForGracePeriod(card, amount, purchaseDate) {
  // CRITICAL: Only cards with NO balance have grace period
  if (card.current_balance > 0) {
    return {
      card: card,
      strategy: 'GRACE_PERIOD',
      floatDays: 0,
      hasGracePeriod: false,
      score: -1000, // Penalty - no grace period
      warning: `⚠️ Card has $${card.current_balance} balance - NO grace period`,
      explanation: 'Interest charges immediately on new purchases'
    };
  }
  
  const floatDays = calculateFloatTime(card, purchaseDate);
  const paymentDue = getPaymentDueDateForFloat(card, purchaseDate);
  
  return {
    card: card,
    strategy: 'GRACE_PERIOD',
    floatDays: floatDays,
    paymentDue: paymentDue,
    hasGracePeriod: true,
    score: floatDays,
    explanation: `${floatDays} days to pay - maximize cash float`
  };
}
```

### 3. Response Format (Three Separate Tables)

#### Format A: For Rewards Maximizer Profile
```
🎯 **Card Recommendations for $1,000 grocery purchase**

Your Profile: REWARDS_MAXIMIZER (You typically pay balances in full)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 **Option 1: Maximize Rewards** ⭐ BEST FOR YOU

| Card | Rewards | You Earn | Annual Value* |
|------|---------|----------|---------------|
| Bofa Travel | 1.5x | **$15.00** | $180 |
| Customized Cash | 1.5x | **$15.00** | $180 |
| Bofa Cash | 1.0x | $10.00 | $120 |

💰 **Winner**: Bofa Travel or Customized Cash - Earn $15 on this purchase
📈 **Annual Impact**: If you spend $1,000/month, that's **$180/year** in rewards!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💳 **Option 2: Minimize Interest** (If you need to carry a balance)

| Card | APR | Interest/Month | Interest/Year |
|------|-----|----------------|---------------|
| Bofa Cash | 18.99% | $15.83 | $190 |
| Citi Master | 18.99% | $15.83 | $190 |
| Citi Costco | 19.24% | $16.03 | $192 |

💡 **Winner**: Bofa Cash or Citi Master - Lowest APR at 18.99%
⚠️ **Note**: Carrying a $1,000 balance costs ~$16/month in interest

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⏰ **Option 3: Maximize Grace Period** (Best for cash flow)

| Card | Days to Pay | Payment Due | Status |
|------|-------------|-------------|--------|
| Citi Costco | 52 days | 11/28/2025 | ⚠️ No grace* |
| Bofa Travel | 33 days | 11/9/2025 | ✅ Available |
| Customized Cash | 38 days | 11/14/2025 | ✅ Available |

💡 **Winner**: Customized Cash - 38 days to pay
⚠️ *Citi Costco has $20,999 balance - no grace period available

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 **MY RECOMMENDATION**: Use **Bofa Travel** or **Customized Cash**
- Earn $15 cashback (best rewards)
- 33-38 days to pay (good grace period)
- No interest if paid in full

💭 Want to compare? Ask: "Why not use Bofa Cash Rewards?"
```

#### Format B: For APR Minimizer Profile
```
🎯 **Card Recommendations for $1,000 grocery purchase**

Your Profile: APR_MINIMIZER (You carry balances - minimizing interest is key)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💳 **Option 1: Minimize Interest** ⭐ BEST FOR YOU

| Card | APR | Interest/Month | Interest/Year | Savings vs Highest |
|------|-----|----------------|---------------|-------------------|
| Bofa Cash | 18.99% | **$15.83** | $190 | **$2/year** |
| Citi Master | 18.99% | **$15.83** | $190 | **$2/year** |
| Citi Costco | 19.24% | $16.03 | $192 | $0 |

💰 **Winner**: Bofa Cash or Citi Master - Save $2/year on interest
📉 **Impact**: On $1,000 balance, you'll pay ~$16/month in interest

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 **Option 2: Maximize Rewards** (Bonus if you can pay in full)

| Card | Rewards | You Earn | But... |
|------|---------|----------|--------|
| Bofa Travel | 1.5x | $15.00 | ⚠️ Has $6,999 balance |
| Customized Cash | 1.5x | $15.00 | ✅ No balance |

⚠️ **Warning**: Cards with balances charge interest immediately!
💡 **Only if zero balance**: Customized Cash could earn $15

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⏰ **Option 3: Grace Period** (Only cards with $0 balance)

| Card | Grace Period | Status |
|------|--------------|--------|
| Customized Cash | 38 days | ✅ No balance - grace available |
| Bofa Travel | 33 days | ⚠️ Has balance - NO grace |
| Citi Costco | 52 days | ⚠️ Has balance - NO grace |

💡 **Winner**: Customized Cash (only card with grace period available)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 **MY RECOMMENDATION**: Use **Bofa Cash or Citi Master**
- Lowest APR (18.99%)
- Save $2/year on interest
- Pay off balance to unlock grace period benefits!

💡 **Tip**: If you pay off Customized Cash, you could earn $15 in rewards
   AND have 38 days grace period!
```

## Implementation Plan

### Phase 1: Core Refactor
1. Create `userProfileDetector.js` - detect user behavior
2. Refactor `recommendationEngine.js`:
   - Split into 3 separate functions
   - Each returns separate recommendations
3. Create `recommendationFormatter.js` - format 3 tables

### Phase 2: Enhanced Calculations
1. Add actual $$ calculations:
   - Cashback earned
   - Interest cost (monthly + annual)
   - Savings comparisons
2. Add annual value projections
3. Add warnings for cards with balances

### Phase 3: Smart Presentation
1. Detect user profile
2. Reorder tables based on profile
3. Mark "BEST FOR YOU" option
4. Show relevant warnings

### Phase 4: Interactive
1. Allow "compare all strategies"
2. Allow "why not use X card"
3. Allow "show me APR option" even for rewards users

## Key Architectural Principles

1. **Separation of Concerns**
   - Profile detection (ML layer)
   - Scoring (Strategy layer)
   - Presentation (UI layer)

2. **Grace Period Rule Enforcement**
   ```javascript
   if (card.current_balance > 0) {
     return null; // NO grace period, cannot recommend
   }
   ```

3. **Show Real Impact**
   - Not just "1.5x rewards"
   - Show "$15 earned on $1000 purchase"
   - Show "$16/month interest if carried"

4. **Profile-Based Recommendations**
   - Rewards users: Show rewards first
   - APR users: Show APR first
   - But always show all 3 options

## Benefits

✅ Clear separation of strategies
✅ No more confusing single table
✅ Actual $$ impact shown
✅ Profile-aware recommendations
✅ Grace period rule strictly enforced
✅ Educational (users learn trade-offs)
✅ Actionable (clear "winner" for each strategy)

---

**Status**: Design Complete - Ready for Implementation
**Priority**: HIGH (current system is broken)
**Estimated Effort**: 2-3 hours for complete refactor

