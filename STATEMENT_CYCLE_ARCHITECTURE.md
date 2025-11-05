# Statement Cycle Architecture - Complete Implementation Guide

## Problem Statement

**OLD (BROKEN) APPROACH**:
```javascript
// Stored absolute dates
due_date: '2025-01-15'  // ❌ Becomes stale after one month!
statement_cycle_end: '2025-01-10'  // ❌ Never updates
```

**Issue**: Credit card statements recur monthly, but storing absolute dates means they become stale and don't reflect the recurring nature.

## NEW (CORRECT) APPROACH

**Solution**: Store day-of-month (1-31) and calculate actual dates dynamically.

```javascript
// Store recurring schedule
statement_close_day: 15  // ✅ 15th of EVERY month
payment_due_day: 10      // ✅ 10th of EVERY month
grace_period_days: 25    // ✅ CALCULATED: (30-15)+10 = 25 days
```

---

## Architecture Components

### 1. Database Schema ([supabase/schema.sql](supabase/schema.sql))

```sql
CREATE TABLE user_credit_cards (
  -- NEW: Recurring payment schedule (day-of-month, 1-31)
  statement_close_day INTEGER,  -- Day of month statement closes
  payment_due_day INTEGER,      -- Day of month payment is due
  grace_period_days INTEGER,    -- CALCULATED from above

  -- DEPRECATED: Legacy absolute date fields (backward compat)
  due_date DATE,               -- DO NOT USE
  statement_cycle_start DATE,  -- DO NOT USE
  statement_cycle_end DATE,    -- DO NOT USE

  CONSTRAINT check_statement_close_day
    CHECK (statement_close_day IS NULL OR (statement_close_day >= 1 AND statement_close_day <= 31)),
  CONSTRAINT check_payment_due_day
    CHECK (payment_due_day IS NULL OR (payment_due_day >= 1 AND payment_due_day <= 31))
);
```

**Migration**: [supabase/STATEMENT_CYCLE_FIX.sql](supabase/STATEMENT_CYCLE_FIX.sql)

###2. Date Calculation Utilities ([utils/statementCycleUtils.js](utils/statementCycleUtils.js))

#### **Key Functions**:

```javascript
// Calculate grace period from day-of-month values
calculateGracePeriod(statementCloseDay, paymentDueDay)
// Example: calculateGracePeriod(15, 20) → 5 days
// Example: calculateGracePeriod(25, 10) → 15 days (crosses month)

// Get actual dates for current month
getStatementCloseDate(statementCloseDay, referenceDate)
getPaymentDueDate(statementCloseDay, paymentDueDay, referenceDate)

// Calculate float time (critical for cash flow strategy)
calculateFloatTime(card, purchaseDate)
// Returns: Days from purchase until payment required

// Get days until next payment
getDaysUntilPaymentDue(statementCloseDay, paymentDueDay, referenceDate)

// Human-readable descriptions
formatDayOfMonth(day) // → "15th", "1st", "22nd"
getPaymentCycleDescription(card) // → "Statement closes 15th, payment due 10th (25 days grace)"
```

#### **Grace Period Calculation Logic**:

```javascript
// CASE 1: Same month (payment_due_day >= statement_close_day)
statement_close_day = 15
payment_due_day = 20
grace_period = 20 - 15 = 5 days

// CASE 2: Crosses month boundary (payment_due_day < statement_close_day)
statement_close_day = 25
payment_due_day = 10
grace_period = (30 - 25) + 10 = 15 days
// Conservative: assumes 30 days in month
```

### 3. UI Form ([components/CardDetailsForm.js](components/CardDetailsForm.js))

**User Experience**:
1. User enters "statement_close_day" (1-31)
2. User enters "payment_due_day" (1-31)
3. Form automatically calculates and displays grace period
4. Grace period is saved to database

**Form State**:
```javascript
const [formData, setFormData] = useState({
  statement_close_day: '', // Day of month (1-31)
  payment_due_day: '',     // Day of month (1-31)
  // ... other fields
});

const [calculatedGracePeriod, setCalculatedGracePeriod] = useState(null);

// Auto-calculate grace period as user types
useEffect(() => {
  const closeDay = parseInt(formData.statement_close_day);
  const dueDay = parseInt(formData.payment_due_day);

  if (closeDay && dueDay) {
    const gracePeriod = calculateGracePeriod(closeDay, dueDay);
    setCalculatedGracePeriod(gracePeriod);
  }
}, [formData.statement_close_day, formData.payment_due_day]);
```

**Submission Data**:
```javascript
const userDetails = {
  statement_close_day: parseInt(formData.statement_close_day) || null,
  payment_due_day: parseInt(formData.payment_due_day) || null,
  grace_period_days: calculatedGracePeriod || null,
  // ... other fields
};
```

### 4. Card Service Updates ([services/cardService.js](services/cardService.js))

**addCardFromCatalog** should pass through the new fields:

```javascript
export const addCardFromCatalog = async (userId, catalogId, userDetails) => {
  const cardData = {
    user_id: userId,
    catalog_id: catalogId,
    // ... existing fields ...

    // NEW: Payment schedule
    statement_close_day: userDetails.statement_close_day || null,
    payment_due_day: userDetails.payment_due_day || null,
    grace_period_days: userDetails.grace_period_days || null,
  };

  return await addCard(cardData);
};
```

### 5. Recommendation Engine Updates ([services/recommendations/recommendationEngine.js](services/recommendations/recommendationEngine.js))

**Critical Change**: Update `scoreForCashflow` to use dynamic date calculation

```javascript
import { getDaysUntilPaymentDue, calculateFloatTime } from '../../utils/statementCycleUtils';

const scoreForCashflow = (card, context) => {
  let score = 0;
  const purchaseDate = new Date(context.date || Date.now());
  const amount = context.amount || 0;

  // ⚠️ CRITICAL: Check grace period
  if (!hasGracePeriod(card)) {
    score -= 200;
    card._noGracePeriod = true;
    return Math.max(0, score);
  }

  // NEW: Use dynamic date calculation
  if (card.statement_close_day && card.payment_due_day) {
    // Calculate days until payment due from purchase date
    const daysUntilDue = getDaysUntilPaymentDue(
      card.statement_close_day,
      card.payment_due_day,
      purchaseDate
    );

    // Calculate total float time (purchase → payment)
    const floatDays = calculateFloatTime(card, purchaseDate);

    // Score based on float time (more time = higher score)
    score += floatDays * 3;

    // Bonus for longer float periods
    if (floatDays > 40) {
      score += 50;
    } else if (floatDays > 30) {
      score += 30;
    }

    console.log('[CashflowScore]', {
      cardName: card.card_name,
      statementCloses: card.statement_close_day,
      paymentDue: card.payment_due_day,
      daysUntilDue,
      floatDays,
      score
    });
  } else {
    // Fallback: use stored grace_period_days
    const gracePeriod = card.grace_period_days || 25;
    score += gracePeriod;
  }

  // Check available credit
  const availableCredit = card.credit_limit - card.current_balance;
  if (availableCredit >= amount) {
    score += 20;
  } else {
    score -= 50;
  }

  // Small bonus for lower APR
  score += (30 - (card.apr || 20)) * 0.5;

  return Math.max(0, score);
};
```

**Update reasoning function**:

```javascript
import { getNextPaymentDue, getPaymentCycleDescription } from '../../utils/statementCycleUtils';

const generateReasoning = (card, context, strategy) => {
  // ... existing code ...

  case STRATEGY_TYPES.CASHFLOW_OPTIMIZER:
    if (card.statement_close_day && card.payment_due_day) {
      // Use dynamic date calculation
      const nextDue = getNextPaymentDue(card);
      const daysUntilDue = Math.ceil((nextDue - new Date()) / (1000 * 60 * 60 * 24));

      reasons.push(`${daysUntilDue} days until payment due (${nextDue.toLocaleDateString()})`);

      const cycleDesc = getPaymentCycleDescription(card);
      reasons.push(cycleDesc);
    } else if (card.grace_period_days) {
      // Fallback
      reasons.push(`${card.grace_period_days}-day grace period`);
    }
    break;
```

### 6. Chat Response Updates ([services/cardAnalyzer.js](services/cardAnalyzer.js))

Update `findUpcomingPayments` to use dynamic dates:

```javascript
import { getNextPaymentDue, getDaysUntilPaymentDue } from '../utils/statementCycleUtils';

export const findUpcomingPayments = (cards, daysAhead = 7) => {
  if (!cards || cards.length === 0) return [];

  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + daysAhead);

  return cards
    .filter(card => card.statement_close_day && card.payment_due_day)
    .map(card => {
      const dueDate = getNextPaymentDue(card);
      const daysUntilDue = getDaysUntilPaymentDue(
        card.statement_close_day,
        card.payment_due_day,
        today
      );

      return {
        ...card,
        dueDate,
        daysUntilDue
      };
    })
    .filter(card => card.dueDate >= today && card.dueDate <= futureDate)
    .sort((a, b) => a.dueDate - b.dueDate);
};
```

---

## User Flow Examples

### Example 1: Add Card with Payment Schedule

**User Input**:
- Statement closes: 15th
- Payment due: 10th

**What Happens**:
1. Form calculates: `grace_period_days = (30 - 15) + 10 = 25 days`
2. Shows confirmation: "You have 25 days between statement close and payment due"
3. Saves to DB:
   ```javascript
   {
     statement_close_day: 15,
     payment_due_day: 10,
     grace_period_days: 25
   }
   ```

### Example 2: Chat Query - "When is my payment due?"

**User**: "When is my Chase card payment due?"

**System Logic**:
1. Fetch card: `{ statement_close_day: 15, payment_due_day: 10 }`
2. Calculate actual date: `getNextPaymentDue(card)` → Feb 10, 2025
3. Calculate days: `getDaysUntilPaymentDue(...)` → 21 days
4. Response: "Your Chase Sapphire payment is due on February 10th (21 days from now)"

### Example 3: Cash Flow Recommendation

**User**: Makes $500 purchase on Jan 5, 2025

**System Logic**:
```
Card A: statement_close_day=15, payment_due_day=10
  - Purchase: Jan 5
  - Statement closes: Jan 15 (10 days away)
  - Payment due: Feb 10 (36 days away)
  - Float time: 36 days
  - Score: 36 × 3 = 108 + 30 (bonus) = 138

Card B: statement_close_day=25, payment_due_day=20
  - Purchase: Jan 5
  - Statement closes: Jan 25 (20 days away)
  - Payment due: Feb 20 (46 days away)
  - Float time: 46 days
  - Score: 46 × 3 = 138 + 50 (bonus) = 188

Recommendation: Card B (46 days float vs 36 days)
```

---

## Testing Checklist

### Database Tests
- [ ] Migration runs successfully
- [ ] Constraints work (values must be 1-31)
- [ ] Grace period calculated correctly for same-month cases
- [ ] Grace period calculated correctly for cross-month cases
- [ ] Old DATE columns preserved for backward compatibility

### Form Tests
- [ ] Grace period auto-calculates as user types
- [ ] Validation prevents values outside 1-31
- [ ] Validation requires both fields or neither
- [ ] Grace period display shows correct wording
- [ ] Form submission includes all new fields

### Recommendation Engine Tests
- [ ] Float calculation correct for same-month cycles
- [ ] Float calculation correct for cross-month cycles
- [ ] Purchases after statement close go to next cycle
- [ ] Cash flow strategy scores cards correctly
- [ ] Grace period warnings still work

### Chat Tests
- [ ] "When is payment due?" returns correct month date
- [ ] "Upcoming payments" shows correct dates for all cards
- [ ] Payment reminders show correct days remaining
- [ ] Date formatting is user-friendly

---

## Migration Path

### Phase 1: Deploy Schema Changes ✅
```bash
# Run in Supabase SQL Editor
cat supabase/STATEMENT_CYCLE_FIX.sql
```

### Phase 2: Deploy Code Changes
1. ✅ [utils/statementCycleUtils.js](utils/statementCycleUtils.js) - New utility functions
2. ✅ [components/CardDetailsForm.js](components/CardDetailsForm.js) - Updated form
3. ⏳ [services/cardService.js](services/cardService.js) - Pass through new fields
4. ⏳ [services/recommendations/recommendationEngine.js](services/recommendations/recommendationEngine.js) - Use dynamic dates
5. ⏳ [services/cardAnalyzer.js](services/cardAnalyzer.js) - Update chat responses

### Phase 3: Data Migration
- Existing cards with old DATE fields will be migrated automatically
- Users can update their cards to add payment schedule

### Phase 4: Deprecation
- Old DATE fields kept for 6 months for backward compatibility
- After 6 months, can be removed entirely

---

## Benefits

### ✅ Correctness
- Dates automatically update each month
- No manual updates needed
- Always shows accurate payment due dates

### ✅ Cash Flow Optimization
- Accurate float calculations
- Considers purchase date and statement cycle
- Recommends cards with maximum payment delay

### ✅ User Experience
- Clear explanations ("Statement closes 15th, payment due 10th")
- Real-time grace period calculation
- Accurate payment reminders

### ✅ Maintainability
- Single source of truth (day-of-month)
- Centralized date calculation logic
- Easy to test and validate

---

## Common Pitfalls Avoided

### ❌ DON'T: Store absolute dates for recurring events
```javascript
// WRONG
due_date: '2025-01-15'  // Becomes stale!
```

### ✅ DO: Store recurring pattern
```javascript
// CORRECT
payment_due_day: 15  // Recurs every month
```

### ❌ DON'T: Hardcode grace period
```javascript
// WRONG - doesn't account for varying cycles
grace_period_days: 25  // Default assumption
```

### ✅ DO: Calculate from actual dates
```javascript
// CORRECT - based on user's actual statement cycle
grace_period_days = calculateGracePeriod(statement_close_day, payment_due_day)
```

### ❌ DON'T: Forget month boundaries
```javascript
// WRONG - doesn't handle Feb having 28 days
if (day > 28) { /* error */ }
```

### ✅ DO: Use JavaScript Date API
```javascript
// CORRECT - handles all month variations
const date = new Date(year, month, day);  // Automatically adjusts
```

---

## Status

- ✅ Database schema updated
- ✅ Migration script created
- ✅ Utility functions implemented
- ✅ Form UI updated
- ⏳ Card service updates needed
- ⏳ Recommendation engine updates needed
- ⏳ Chat responses updates needed

**Next Steps**: Complete remaining code updates and test end-to-end flow.
