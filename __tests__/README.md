# Vitta Testing Suite

## Overview

Comprehensive test suite protecting **mission-critical financial calculations**:
- Payment due date calculations
- Card recommendation engine
- Grace period enforcement
- Interest/cashback calculations

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Tests
```bash
# Run all tests
npm test

# Run only critical tests (payment + recommendations)
npm run test:critical

# Run with coverage
npm run test:coverage

# Watch mode (re-runs on file changes)
npm run test:watch

# Run specific test suites
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:regression    # Regression tests only
```

## Test Structure

```
__tests__/
├── unit/
│   ├── statementCycleUtils.test.js      ✅ CREATED
│   ├── paymentCycleUtils.test.js        🔲 TODO
│   ├── recommendationStrategies.test.js ✅ CREATED
│   ├── userProfileDetector.test.js      🔲 TODO
│   └── recommendationFormatter.test.js  🔲 TODO
├── integration/
│   ├── recommendationFlow.test.js       🔲 TODO
│   └── paymentCalculationFlow.test.js   🔲 TODO
├── regression/
│   └── (Bug-specific tests)             🔲 TODO
└── fixtures/
    ├── testCards.js                     🔲 TODO
    └── testDates.js                     🔲 TODO
```

## Current Test Coverage

### ✅ Implemented Tests (55 tests)

#### `statementCycleUtils.test.js` (28 tests)
- Month boundary handling (25th → 10th)
- Same month handling (5th → 20th)
- End of year crossing (Dec → Jan)
- End of month dates (31st, Feb handling)
- Leap year support
- Statement close date calculation
- Days until payment calculation
- Grace period calculation
- **REGRESSION**: Payment due date recalculation bug

#### `recommendationStrategies.test.js` (27 tests)
- **CRITICAL**: Grace period rule enforcement
- Cashback calculations with actual $$
- Interest calculations (monthly/annual)
- Float time calculations
- Card sorting by strategy
- Mixed card scenarios
- **REGRESSION**: Citi Costco high balance bug

## Critical Test Cases

### 1. Grace Period Rule 🚨 HIGHEST PRIORITY
```javascript
// Cards with balance > $0 have NO grace period
test('Card with $0.01 balance has NO grace period', () => {
  expect(result.hasGracePeriod).toBe(false);
  expect(result.canRecommend).toBe(false);
  expect(result.score).toBe(-1000);
});
```

### 2. Payment Due Date Accuracy 🚨 CRITICAL
```javascript
// Must handle month boundaries correctly
test('handles month boundary (25th → 10th)', () => {
  const statementClose = new Date(2025, 9, 25); // Oct 25
  const result = getPaymentDueDate(25, 10, statementClose);
  expect(result.getMonth()).toBe(10); // November
});
```

### 3. Actual Dollar Calculations 🚨 IMPORTANT
```javascript
// Must show real $$, not percentages
test('calculates correct cashback', () => {
  expect(result.cashback).toBe(15.00);
  expect(result.annualValue).toBe(180);
});
```

## Running Specific Tests

### Test a single file
```bash
npm test statementCycleUtils.test.js
```

### Test specific pattern
```bash
npm test -- --testNamePattern="grace period"
```

### Run with verbose output
```bash
npm test -- --verbose
```

## Coverage Requirements

**Minimum thresholds for critical files:**
- `statementCycleUtils.js`: 90% line coverage, 85% branch coverage
- `paymentCycleUtils.js`: 90% line coverage, 85% branch coverage
- `recommendationStrategies.js`: 90% line coverage, 85% branch coverage

**Check coverage:**
```bash
npm run test:coverage
```

Coverage report will be in `coverage/lcov-report/index.html`

## Writing New Tests

### 1. Create test file
```bash
touch __tests__/unit/myFeature.test.js
```

### 2. Use fixtures for test data
```javascript
import { CARD_NO_BALANCE, CARD_WITH_BALANCE } from '../fixtures/testCards';

test('my test', () => {
  const result = myFunction(CARD_NO_BALANCE);
  expect(result).toBeDefined();
});
```

### 3. Follow naming convention
```javascript
describe('FunctionName - Category', () => {
  test('CRITICAL: handles important case', () => {
    // Test critical functionality
  });
  
  test('handles edge case', () => {
    // Test edge cases
  });
});
```

## Regression Tests

When a bug is fixed:
1. Add a regression test in `__tests__/regression/`
2. Name it after the bug: `bugName.test.js`
3. Reference the fix date in description
4. Ensure it would have caught the original bug

Example:
```javascript
describe('REGRESSION: Payment Due Date Bug (Fixed 2025-11-06)', () => {
  test('does not recalculate statement close date', () => {
    // Test that would have failed before fix
  });
});
```

## CI/CD Integration

### Pre-commit Hook (Future)
```bash
# Run critical tests before commit
npm run test:critical
```

### GitHub Actions (Future)
```yaml
# Runs on every push to main/develop
# Fails if:
# - Any test fails
# - Coverage drops below threshold
```

## Debugging Failed Tests

### 1. Run in watch mode
```bash
npm run test:watch
```

### 2. Add console.log (temporarily)
```javascript
test('my test', () => {
  const result = myFunction(input);
  console.log('Result:', result); // Debug output
  expect(result).toBe(expected);
});
```

### 3. Use debugger
```javascript
test('my test', () => {
  debugger; // Breakpoint here
  const result = myFunction(input);
});
```

Then run with:
```bash
node --inspect-brk ./node_modules/.bin/jest --runInBand
```

## Best Practices

1. ✅ **Test behavior, not implementation**
   - Test what the function does, not how it does it
   
2. ✅ **Use descriptive test names**
   - Good: `"calculates correct cashback for 1.5x rewards on $1000"`
   - Bad: `"test1"`

3. ✅ **One assertion per test (when possible)**
   - Easier to identify failures
   
4. ✅ **Mark critical tests**
   - Prefix with `CRITICAL:` or `REGRESSION:`
   
5. ✅ **Test edge cases**
   - Null, undefined, $0, negative numbers, etc.

6. ✅ **Keep tests fast**
   - Unit tests should run in milliseconds
   - Mock external dependencies

## TODO: Future Test Files

```bash
# Priority 1: Complete unit coverage
- [ ] __tests__/unit/paymentCycleUtils.test.js
- [ ] __tests__/unit/userProfileDetector.test.js
- [ ] __tests__/unit/recommendationFormatter.test.js

# Priority 2: Integration tests
- [ ] __tests__/integration/recommendationFlow.test.js
- [ ] __tests__/integration/paymentCalculationFlow.test.js

# Priority 3: Test fixtures
- [ ] __tests__/fixtures/testCards.js
- [ ] __tests__/fixtures/testDates.js
- [ ] __tests__/fixtures/testUsers.js

# Priority 4: CI/CD
- [ ] .github/workflows/test.yml
- [ ] Pre-commit hooks
```

## Getting Help

- Read Jest docs: https://jestjs.io/docs/getting-started
- Check existing tests for patterns
- Ask questions in team chat

---

**Remember**: These tests protect users' financial decisions. Every test matters! 🛡️

