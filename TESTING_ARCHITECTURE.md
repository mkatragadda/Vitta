# Testing Architecture - Critical Financial Functions

## Philosophy

**Financial calculations are mission-critical and must be protected with comprehensive tests.**

Breaking payment due dates or recommendation logic could:
- ❌ Cause users to miss payments (credit score damage)
- ❌ Recommend wrong cards (financial loss)
- ❌ Calculate wrong interest (bad advice)
- ❌ Break grace period logic (unexpected charges)

## Critical Functions to Protect

### 1. Payment Due Date Calculations
**Files**: `utils/statementCycleUtils.js`, `utils/paymentCycleUtils.js`

**Critical Functions**:
- `getPaymentDueDate()` - Must handle month boundaries correctly
- `getMostRecentStatementClose()` - Must return correct statement date
- `getActivePayments()` - Must return correct previous/current payments
- `calculateFloatTime()` - Must calculate days correctly

**Test Coverage Needed**:
- ✅ Month boundary crossing (statement 25th, payment 10th)
- ✅ End of month dates (statement 31st in 30-day month)
- ✅ Leap year handling (Feb 29)
- ✅ Today is before/after statement close
- ✅ Edge case: Today IS statement close day
- ✅ Multiple month scenarios (Jan, Feb, Dec)

### 2. Recommendation Engine V2
**Files**: `services/recommendations/*.js`

**Critical Functions**:
- `detectUserProfile()` - Must classify users correctly
- `scoreForRewards()` - Must NEVER recommend cards with balance
- `scoreForAPR()` - Must calculate interest correctly
- `scoreForGracePeriod()` - Must enforce grace period rule
- `getAllStrategies()` - Must return all three strategies

**Test Coverage Needed**:
- ✅ Grace period rule: Cards with balance get -1000 score
- ✅ Rewards calculation: Correct cashback amounts
- ✅ APR calculation: Correct monthly/annual interest
- ✅ Float calculation: Correct days to pay
- ✅ Profile detection: Correct classification
- ✅ Edge cases: $0 balance, $0.01 balance, maxed out card

### 3. Grace Period Logic
**Files**: `utils/statementCycleUtils.js`, `services/recommendations/recommendationStrategies.js`

**Critical Rule**: 
```javascript
// Cards with balance > $0 have NO grace period
if (balance > 0) {
  hasGracePeriod = false;
  canRecommend = false; // For rewards/cashflow
}
```

**Test Coverage Needed**:
- ✅ $0.00 balance → grace period available
- ✅ $0.01 balance → NO grace period
- ✅ $10,000 balance → NO grace period
- ✅ Negative balance (credit) → grace period available

## Testing Strategy

### Level 1: Unit Tests (Isolated Functions)
**Purpose**: Test each function in isolation with known inputs/outputs

**Framework**: Jest (already in project based on Next.js)

**Location**: `__tests__/unit/`

**Example**:
```javascript
// __tests__/unit/statementCycleUtils.test.js
describe('getPaymentDueDate', () => {
  it('handles month boundary correctly', () => {
    const statementClose = new Date(2025, 9, 25); // Oct 25
    const result = getPaymentDueDate(25, 10, statementClose);
    expect(result).toEqual(new Date(2025, 10, 10)); // Nov 10
  });
  
  it('handles same month correctly', () => {
    const statementClose = new Date(2025, 9, 5); // Oct 5
    const result = getPaymentDueDate(5, 20, statementClose);
    expect(result).toEqual(new Date(2025, 9, 20)); // Oct 20
  });
});
```

### Level 2: Integration Tests (End-to-End Flows)
**Purpose**: Test complete user scenarios with real data

**Location**: `__tests__/integration/`

**Example**:
```javascript
// __tests__/integration/recommendationFlow.test.js
describe('Card Recommendation Flow', () => {
  it('rewards maximizer gets correct recommendations', () => {
    const cards = [
      { id: 1, balance: 0, apr: 18.99, rewards: 1.5 },
      { id: 2, balance: 1000, apr: 17.99, rewards: 2.0 }
    ];
    
    const strategies = getAllStrategies(cards, 'groceries', 1000);
    const rewardsRecs = strategies.rewards;
    
    // Card with balance should NOT be recommended
    expect(rewardsRecs[0].card.id).toBe(1);
    expect(rewardsRecs[0].canRecommend).toBe(true);
    expect(rewardsRecs[1].card.id).toBe(2);
    expect(rewardsRecs[1].canRecommend).toBe(false);
  });
});
```

### Level 3: Regression Tests (Known Bug Scenarios)
**Purpose**: Ensure fixed bugs never return

**Location**: `__tests__/regression/`

**Example**:
```javascript
// __tests__/regression/paymentDueDateBug.test.js
describe('Payment Due Date Bug (Fixed 2025-11-06)', () => {
  it('does not recalculate statement close date', () => {
    // Bug: getPaymentDueDate was recalculating statement date
    // This caused dates to shift by 1 month
    
    const cards = [
      { statement_close_day: 25, payment_due_day: 10 },
      { statement_close_day: 8, payment_due_day: 28 },
      { statement_close_day: 12, payment_due_day: 9 }
    ];
    
    const today = new Date(2025, 10, 7); // Nov 7, 2025
    
    cards.forEach(card => {
      const payment = getNextDuePayment(card, today);
      // Verify dates are correct (not shifted by 1 month)
      expect(payment.paymentDueDate).toBeDefined();
      expect(payment.daysUntilDue).toBeGreaterThan(-30);
    });
  });
});
```

### Level 4: Property-Based Tests (Edge Cases)
**Purpose**: Generate random test cases to find edge cases

**Framework**: fast-check (optional)

**Example**:
```javascript
// Test with 1000 random dates
fc.assert(
  fc.property(
    fc.integer(1, 31), // statement day
    fc.integer(1, 31), // payment day
    fc.date(),         // random date
    (stmtDay, payDay, today) => {
      const result = getPaymentDueDate(stmtDay, payDay, today);
      // Payment date should always be after statement date
      return result > today || result === null;
    }
  )
);
```

## Test File Structure

```
vitta-document-chat/
├── __tests__/
│   ├── unit/
│   │   ├── statementCycleUtils.test.js
│   │   ├── paymentCycleUtils.test.js
│   │   ├── userProfileDetector.test.js
│   │   ├── recommendationStrategies.test.js
│   │   └── recommendationFormatter.test.js
│   ├── integration/
│   │   ├── recommendationFlow.test.js
│   │   ├── paymentCalculationFlow.test.js
│   │   └── gracePeriodFlow.test.js
│   ├── regression/
│   │   ├── paymentDueDateBug.test.js
│   │   └── gracePeriodViolation.test.js
│   ├── fixtures/
│   │   ├── testCards.js
│   │   ├── testDates.js
│   │   └── testUsers.js
│   └── helpers/
│       ├── dateHelpers.js
│       └── cardHelpers.js
├── jest.config.js
└── package.json
```

## Test Fixtures (Reusable Test Data)

### `__tests__/fixtures/testCards.js`
```javascript
export const CARDS_NO_BALANCE = [
  {
    id: 'card-1',
    nickname: 'Test Rewards Card',
    current_balance: 0,
    credit_limit: 10000,
    apr: 18.99,
    statement_close_day: 15,
    payment_due_day: 10,
    grace_period_days: 25,
    reward_structure: { default: 1.0, groceries: 1.5 }
  },
  // ... more cards
];

export const CARDS_WITH_BALANCE = [
  {
    id: 'card-2',
    nickname: 'Test Card With Balance',
    current_balance: 5000,
    credit_limit: 10000,
    apr: 19.24,
    statement_close_day: 25,
    payment_due_day: 10,
    grace_period_days: 21,
    reward_structure: { default: 2.0 }
  },
  // ... more cards
];

export const CARD_HIGH_BALANCE = {
  id: 'card-citi-costco',
  nickname: 'Citi Costco',
  current_balance: 20999.96,
  credit_limit: 25000,
  apr: 19.24,
  statement_close_day: 1,
  payment_due_day: 28,
  grace_period_days: 27
};
```

### `__tests__/fixtures/testDates.js`
```javascript
export const TEST_DATES = {
  // Month boundary scenarios
  OCT_25_2025: new Date(2025, 9, 25),
  NOV_7_2025: new Date(2025, 10, 7),
  DEC_31_2025: new Date(2025, 11, 31),
  
  // Edge cases
  FEB_28_2025: new Date(2025, 1, 28),
  FEB_29_2024: new Date(2024, 1, 29), // Leap year
  
  // Statement/payment scenarios
  BEFORE_STATEMENT: new Date(2025, 10, 5),
  ON_STATEMENT_DAY: new Date(2025, 10, 15),
  AFTER_STATEMENT: new Date(2025, 10, 20)
};
```

## Critical Test Cases to Implement

### Priority 1: Grace Period Rule (HIGHEST PRIORITY)
```javascript
describe('Grace Period Rule Enforcement', () => {
  test('Card with $0 balance HAS grace period', () => {
    const card = { ...TEST_CARD, current_balance: 0 };
    const result = scoreForRewards([card], 'groceries', 1000);
    expect(result[0].hasGracePeriod).toBe(true);
    expect(result[0].canRecommend).toBe(true);
  });
  
  test('Card with $0.01 balance has NO grace period', () => {
    const card = { ...TEST_CARD, current_balance: 0.01 };
    const result = scoreForRewards([card], 'groceries', 1000);
    expect(result[0].hasGracePeriod).toBe(false);
    expect(result[0].canRecommend).toBe(false);
    expect(result[0].score).toBe(-1000);
  });
  
  test('Card with $20,999 balance has NO grace period', () => {
    const card = { ...TEST_CARD, current_balance: 20999.96 };
    const result = scoreForGracePeriod([card]);
    expect(result[0].hasGracePeriod).toBe(false);
    expect(result[0].warning).toContain('NO grace period');
  });
});
```

### Priority 2: Payment Due Date Calculation
```javascript
describe('Payment Due Date Calculation', () => {
  test('handles month boundary (25th → 10th)', () => {
    const statementClose = new Date(2025, 9, 25); // Oct 25
    const result = getPaymentDueDate(25, 10, statementClose);
    expect(result.getMonth()).toBe(10); // November
    expect(result.getDate()).toBe(10);
  });
  
  test('handles same month (5th → 20th)', () => {
    const statementClose = new Date(2025, 9, 5);
    const result = getPaymentDueDate(5, 20, statementClose);
    expect(result.getMonth()).toBe(9); // October
    expect(result.getDate()).toBe(20);
  });
  
  test('handles end of month correctly', () => {
    const statementClose = new Date(2025, 0, 31); // Jan 31
    const result = getPaymentDueDate(31, 28, statementClose);
    expect(result.getMonth()).toBe(1); // February
  });
});
```

### Priority 3: User Profile Detection
```javascript
describe('User Profile Detection', () => {
  test('detects REWARDS_MAXIMIZER (no balances)', () => {
    const cards = CARDS_NO_BALANCE;
    const profile = detectUserProfile(cards);
    expect(profile.profile).toBe('REWARDS_MAXIMIZER');
    expect(profile.priority[0]).toBe('rewards');
  });
  
  test('detects APR_MINIMIZER (high utilization)', () => {
    const cards = [
      { current_balance: 8000, credit_limit: 10000, apr: 18.99 },
      { current_balance: 7000, credit_limit: 10000, apr: 19.24 }
    ];
    const profile = detectUserProfile(cards);
    expect(profile.profile).toBe('APR_MINIMIZER');
    expect(profile.priority[0]).toBe('apr');
  });
});
```

### Priority 4: Actual Dollar Calculations
```javascript
describe('Dollar Amount Calculations', () => {
  test('calculates correct cashback amount', () => {
    const card = { reward_structure: { groceries: 1.5 } };
    const result = scoreForRewards([card], 'groceries', 1000);
    expect(result[0].cashback).toBe(15.00);
    expect(result[0].annualValue).toBe(180);
  });
  
  test('calculates correct interest cost', () => {
    const card = { apr: 18.99 };
    const result = scoreForAPR([card], 1000);
    expect(result[0].monthlyInterest).toBeCloseTo(15.83, 2);
    expect(result[0].annualInterest).toBeCloseTo(189.90, 2);
  });
});
```

## CI/CD Integration

### GitHub Actions Workflow (`.github/workflows/test.yml`)
```yaml
name: Test Critical Functions

on:
  push:
    branches: [main, develop]
  pull_request:
    paths:
      - 'utils/**'
      - 'services/recommendations/**'
      - 'services/chat/**'

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run critical function tests
        run: npm run test:critical
      
      - name: Generate coverage report
        run: npm run test:coverage
      
      - name: Fail if coverage < 90% for critical files
        run: |
          # Check coverage for critical files
          npm run test:coverage -- --coverage-threshold='{"./utils/statementCycleUtils.js":{"branches":90,"functions":90,"lines":90}}'
```

## NPM Scripts (Add to `package.json`)

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:critical": "jest --testPathPattern='(statementCycle|paymentCycle|recommendation)'",
    "test:coverage": "jest --coverage",
    "test:unit": "jest __tests__/unit",
    "test:integration": "jest __tests__/integration",
    "test:regression": "jest __tests__/regression"
  }
}
```

## Coverage Requirements

**Minimum Coverage for Critical Files**:
- `statementCycleUtils.js`: 95% line coverage, 90% branch coverage
- `paymentCycleUtils.js`: 95% line coverage, 90% branch coverage
- `recommendationStrategies.js`: 95% line coverage, 90% branch coverage
- `userProfileDetector.js`: 90% line coverage, 85% branch coverage

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Set up Jest configuration
- [ ] Create test file structure
- [ ] Create test fixtures
- [ ] Write 10 critical test cases

### Phase 2: Core Coverage (Week 2)
- [ ] Unit tests for payment calculations (30 tests)
- [ ] Unit tests for recommendation strategies (25 tests)
- [ ] Unit tests for profile detection (10 tests)

### Phase 3: Integration (Week 3)
- [ ] End-to-end recommendation flows (10 tests)
- [ ] Payment calculation flows (10 tests)
- [ ] Grace period enforcement flows (5 tests)

### Phase 4: Regression & CI/CD (Week 4)
- [ ] Regression tests for all known bugs
- [ ] GitHub Actions integration
- [ ] Coverage reporting
- [ ] Pre-commit hooks

## Benefits

✅ **Confidence**: Change any code knowing tests will catch breaks
✅ **Documentation**: Tests serve as living documentation
✅ **Regression Prevention**: Known bugs can never return
✅ **Refactoring Safety**: Refactor fearlessly with test coverage
✅ **Onboarding**: New developers understand critical logic from tests
✅ **Compliance**: Prove financial calculations are correct

---

**Status**: Design Complete - Ready for Implementation
**Priority**: CRITICAL (Financial calculations must be protected)
**Estimated Effort**: 2-3 weeks for full coverage
**Quick Start**: Can implement Phase 1 (10 critical tests) in 1 day

