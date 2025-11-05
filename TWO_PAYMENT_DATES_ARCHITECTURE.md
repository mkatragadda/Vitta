# Two Payment Dates Architecture - CRITICAL INSIGHT

## The Problem

**Previous Understanding (WRONG):**
- Track ONE payment due date per card
- Show that date when user asks "when is payment due?"

**What's Missing:**
Users have **TWO active payment obligations** at any given time!

## Real-World Example

**Today: January 20, 2025**
**Card: Statement closes 15th, Grace period 26 days**

```
Timeline:
─────────────────────────────────────────────────────────────
         Dec 15          Jan 10       Jan 15          Feb 10
           │              │             │               │
      Statement      PAYMENT DUE    Statement      PAYMENT DUE
      closes #1      (Previous)     closes #2      (Current)
           │              │             │               │
           └──26 days─────┘             └───26 days────┘
                ↑                              ↑
           IMMEDIATE!                     FUTURE
           (Pay NOW)                  (Float strategy)
```

### Previous Statement (December)
- **Closed**: Dec 15, 2024
- **Charges**: Nov 16 - Dec 15
- **Payment DUE**: Jan 10, 2025
- **Status**: 10 days OVERDUE! ← **URGENT!**

### Current Statement (January)
- **Closed**: Jan 15, 2025 (5 days ago)
- **Charges**: Dec 16 - Jan 15
- **Payment DUE**: Feb 10, 2025
- **Status**: 21 days away ← **Use for float strategy**

## Architecture Solution

### Key Functions ([utils/paymentCycleUtils.js](utils/paymentCycleUtils.js))

#### 1. `getActivePayments(card, today)`

Returns **BOTH** payments:

```javascript
const { previousPayment, currentPayment } = getActivePayments(card);

// previousPayment:
{
  statementCloseDate: Dec 15, 2024,
  paymentDueDate: Jan 10, 2025,
  daysUntilDue: -10,          // Negative = overdue
  isOverdue: true,
  isUrgent: false,
  amount: 1500,               // From card.current_balance
  status: 'OVERDUE'
}

// currentPayment:
{
  statementCloseDate: Jan 15, 2025,
  paymentDueDate: Feb 10, 2025,
  daysUntilDue: 21,
  isOverdue: false,
  isUrgent: false,
  amount: 0,                  // Unknown until statement finalizes
  status: 'FUTURE'
}
```

#### 2. `getNextDuePayment(card)`

Returns the **most urgent** payment (for "upcoming payments" widget):

```javascript
const nextPayment = getNextDuePayment(card);

// Returns previousPayment if it's within last 30 days
// Otherwise returns currentPayment
```

#### 3. `getPaymentDueDateForFloat(card, purchaseDate)`

Returns payment due date for **float strategy** (always FUTURE payment):

```javascript
// Making purchase today (Jan 20)
const floatPaymentDue = getPaymentDueDateForFloat(card, new Date());

// Returns: Feb 10, 2025 (current statement payment)
// NOT Jan 10 (that's already past/overdue!)
```

## Use Cases

### Use Case 1: User Asks "When is my payment due?"

**Query**: "When is my Chase card payment due?"

**System Response**:

```javascript
const { previousPayment, currentPayment } = getActivePayments(card);

if (previousPayment && previousPayment.daysUntilDue > -30) {
  // Show immediate payment
  return `🔴 URGENT: Payment of $${previousPayment.amount} is OVERDUE by ${Math.abs(previousPayment.daysUntilDue)} days! Due date was ${previousPayment.paymentDueDate.toLocaleDateString()}`;
}

// Also mention future payment
return `Next payment of $${currentPayment.amount} due ${currentPayment.paymentDueDate.toLocaleDateString()} (${currentPayment.daysUntilDue} days from now)`;
```

**Response**:
> 🔴 URGENT: Payment of $1,500 is OVERDUE by 10 days! Due date was January 10, 2025.
> Your next statement payment of $0 (pending) is due February 10, 2025 (21 days from now).

### Use Case 2: Upcoming Payments Dashboard

**Widget**: Show all upcoming payments across cards

```javascript
const upcomingPayments = getUpcomingPayments(cards, 30); // Next 30 days

upcomingPayments.forEach(payment => {
  const emoji = getPaymentUrgencyEmoji(payment);
  const message = getPaymentStatusMessage(payment);

  console.log(`${emoji} ${payment.card.card_name}: ${message}`);
});
```

**Output**:
```
🔴 Chase Sapphire: OVERDUE by 10 days!
🟡 Amex Gold: Due in 3 days
🟢 Citi Double Cash: Due February 25, 2025
```

### Use Case 3: Float Strategy Recommendation

**Query**: "Which card should I use for $500 purchase today?"

**System**:

```javascript
cards.map(card => {
  const floatDays = calculateFloatDays(card, new Date());

  return {
    card,
    floatDays,
    paymentDue: getPaymentDueDateForFloat(card, new Date())
  };
}).sort((a, b) => b.floatDays - a.floatDays);
```

**Response**:
> For a $500 purchase today, use your **Amex Gold**:
> - Payment not due until March 5, 2025 (44 days float)
> - Earn 4x points on dining
> - $8,500 available credit

**Why this works:**
- Uses `getPaymentDueDateForFloat()` which returns the FUTURE payment (not overdue one)
- Calculates float correctly based on which statement the purchase will appear on

## Implementation Examples

### Example 1: Chat Response

```javascript
// services/cardAnalyzer.js

export const generatePaymentDueResponse = (cards) => {
  const payments = getUpcomingPayments(cards, 30);

  if (payments.length === 0) {
    return "You don't have any payments due in the next 30 days. 🎉";
  }

  let response = `You have ${payments.length} payment${payments.length > 1 ? 's' : ''}:\n\n`;

  payments.forEach(payment => {
    const emoji = getPaymentUrgencyEmoji(payment);
    const cardName = payment.card.nickname || payment.card.card_name;
    const message = getPaymentStatusMessage(payment);

    response += `${emoji} **${cardName}**\n`;
    response += `   Amount: $${payment.amount.toLocaleString()}\n`;
    response += `   ${message}\n\n`;
  });

  return response.trim();
};
```

### Example 2: Recommendation Engine

```javascript
// services/recommendations/recommendationEngine.js

const scoreForCashflow = (card, context) => {
  const purchaseDate = new Date(context.date || Date.now());

  // Use FUTURE payment for float calculation
  const floatDays = calculateFloatDays(card, purchaseDate);

  // Score based on float time
  let score = floatDays * 3;

  if (floatDays > 40) {
    score += 50; // Bonus for very long float
  }

  console.log('[CashflowScore]', {
    cardName: card.card_name,
    floatDays,
    paymentDue: getPaymentDueDateForFloat(card, purchaseDate).toLocaleDateString(),
    score
  });

  return score;
};
```

### Example 3: Dashboard Widget

```javascript
// components/DashboardWithTabs.js

const UpcomingPaymentsWidget = ({ cards }) => {
  const payments = getUpcomingPayments(cards, 7); // Next 7 days

  return (
    <div className="bg-white rounded-xl p-6">
      <h3 className="text-xl font-bold mb-4">Upcoming Payments</h3>

      {payments.length === 0 ? (
        <p className="text-gray-600">No payments due in the next 7 days</p>
      ) : (
        <div className="space-y-4">
          {payments.map(payment => {
            const emoji = getPaymentUrgencyEmoji(payment);
            const cardName = payment.card.nickname || payment.card.card_name;
            const message = getPaymentStatusMessage(payment);

            return (
              <div key={payment.card.id} className={`p-4 rounded-lg ${
                payment.isOverdue ? 'bg-red-50 border-2 border-red-200' :
                payment.isUrgent ? 'bg-yellow-50 border-2 border-yellow-200' :
                'bg-gray-50'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{emoji} {cardName}</p>
                    <p className="text-sm text-gray-600">{message}</p>
                  </div>
                  <p className="text-lg font-bold">
                    ${payment.amount.toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
```

## Database Considerations

### Current Schema (Correct)

```sql
CREATE TABLE user_credit_cards (
  statement_close_day INTEGER,  -- Day of month (1-31)
  payment_due_day INTEGER,      -- Day of month (1-31) [DEPRECATED - use grace_period_days]
  grace_period_days INTEGER,    -- Days between statement close and payment due

  -- Current balance is for PREVIOUS statement (already billed)
  current_balance NUMERIC,      -- Amount owed from previous statement

  -- Future tracking (optional enhancement)
  current_statement_balance NUMERIC,  -- Charges on current statement (pending)
  last_payment_date DATE,               -- When user last paid
  last_payment_amount NUMERIC           -- How much they paid
);
```

### Why We Don't Store Both Dates

**Option 1: Store both payment_due_dates ❌**
```sql
previous_payment_due DATE,  -- Changes every month
current_payment_due DATE    -- Changes every month
```
**Problem**: Requires monthly updates, gets stale

**Option 2: Calculate dynamically from pattern ✅**
```sql
statement_close_day INTEGER,  -- 15 (pattern)
grace_period_days INTEGER      -- 26 (fixed)
```
**Benefit**: Calculate any payment date on the fly

## Testing Scenarios

### Scenario 1: Payment Overdue

**Setup**:
- Today: Jan 20, 2025
- Statement closes: 15th
- Grace period: 26 days
- Current balance: $1,500

**Test**:
```javascript
const { previousPayment } = getActivePayments(card);

assert(previousPayment.isOverdue === true);
assert(previousPayment.daysUntilDue === -10);
assert(previousPayment.status === 'OVERDUE');
```

### Scenario 2: Payment Due Soon

**Setup**:
- Today: Jan 7, 2025
- Statement closes: 15th (last month: Dec 15)
- Grace period: 26 days
- Payment due: Jan 10 (3 days away)

**Test**:
```javascript
const { previousPayment } = getActivePayments(card);

assert(previousPayment.isUrgent === true);
assert(previousPayment.daysUntilDue === 3);
assert(previousPayment.status === 'DUE_SOON');
```

### Scenario 3: Float Calculation

**Setup**:
- Today: Jan 20, 2025
- Purchase date: Jan 20, 2025
- Statement closes: 15th (just closed on Jan 15)
- Next statement closes: Feb 15
- Payment due for Feb statement: Mar 13 (Feb 15 + 26 days)

**Test**:
```javascript
const floatDays = calculateFloatDays(card, new Date('2025-01-20'));
const paymentDue = getPaymentDueDateForFloat(card, new Date('2025-01-20'));

assert(floatDays === 52); // Jan 20 → Mar 13
assert(paymentDue.toLocaleDateString() === '3/13/2025');
```

## Key Takeaways

1. **Two Payments, Two Purposes**:
   - Previous payment: URGENT, show in reminders, user must pay NOW
   - Current payment: FUTURE, use for float strategy

2. **Separate Functions**:
   - `getNextDuePayment()` - For reminders and "what's due?" queries
   - `getPaymentDueDateForFloat()` - For cash flow optimization

3. **Urgency Indicators**:
   - 🔴 Overdue (negative days)
   - 🟡 Due soon (0-7 days)
   - 🟢 Upcoming (8+ days)

4. **Float Strategy Always Uses Future Payment**:
   - Never recommend card based on overdue payment
   - Always calculate float for the NEXT statement the purchase will appear on

5. **Current Balance = Previous Statement**:
   - `card.current_balance` is what user owes from previous (closed) statement
   - This is the amount for `previousPayment.amount`

---

**Status**: ✅ **COMPLETE ARCHITECTURE**
**Date**: 2025-11-05
**Priority**: **CRITICAL** - Must implement before launch
