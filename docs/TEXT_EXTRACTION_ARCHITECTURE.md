# Text Extraction Architecture

## Overview

This document describes the centralized text extraction architecture implemented to ensure consistent parsing of user input across the Vitta application.

## Problem Statement

Previously, amount extraction logic was duplicated across multiple files:
- `services/chat/entityExtractor.js` - For general entity extraction
- `services/chat/slotFillingManager.js` - For slot filling in conversations

This led to:
1. **Inconsistent behavior**: The same query could be parsed differently in different contexts
2. **Bug duplication**: A bug in one place (e.g., `$5000` being parsed as `$500`) would require fixes in multiple locations
3. **Maintenance overhead**: Changes to extraction logic required updating multiple files
4. **Testing complexity**: Each implementation needed its own test suite

## Solution: Common Utility Module

Created a centralized text extraction utility at `utils/textExtraction.js` that serves as the **single source of truth** for all text parsing operations.

### Architecture Benefits

```
┌─────────────────────────────────────┐
│   utils/textExtraction.js          │
│   (Single Source of Truth)          │
└─────────────────┬───────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
┌──────────────┐    ┌──────────────────┐
│ Entity       │    │ Slot Filling     │
│ Extractor    │    │ Manager          │
└──────────────┘    └──────────────────┘
```

### Key Principles

1. **DRY (Don't Repeat Yourself)**: Single implementation used everywhere
2. **Testability**: One comprehensive test suite covers all use cases
3. **Consistency**: Same input always produces same output
4. **Maintainability**: Bugs fixed once, improvements benefit all consumers

## API Reference

### `extractAmount(text, options)`

Extracts a monetary amount from text.

**Supported formats:**
- Dollar signs: `$5000`, `$5,000`, `$5,000.00`
- Word format: `5000 dollars`, `5,000 USD`, `500 bucks`
- K notation: `5k`, `2.5k` (thousands)
- Plain numbers: `5000`, `5,000`

**Options:**
- `allowK` (boolean): Allow "k" notation. Default: `true`
- `minDigits` (number): Minimum digits to match. Default: `1`

**Returns:** `number | null`

**Examples:**
```javascript
extractAmount("I have $5000") // 5000
extractAmount("budget is $5,000") // 5000
extractAmount("need 2.5k") // 2500
extractAmount("I have 5 cards", { minDigits: 3 }) // null (ignores "5")
```

### `extractAllAmounts(text, options)`

Extracts all monetary amounts from text.

**Returns:** `number[]`

**Example:**
```javascript
extractAllAmounts("Split $1000 on card A and $500 on card B")
// [1000, 500]
```

### `extractPercentage(text)`

Extracts a percentage from text and returns as decimal.

**Supported formats:**
- Percentage sign: `25%`, `18.5%`
- Word format: `25 percent`
- Decimal: `0.25`

**Returns:** `number | null` (as decimal, e.g., 0.25 for 25%)

**Example:**
```javascript
extractPercentage("APR is 25%") // 0.25
```

### `formatAmount(amount, options)`

Formats a number as a currency string.

**Options:**
- `includeSymbol` (boolean): Include $ symbol. Default: `true`
- `decimals` (number): Decimal places. Default: `2`

**Returns:** `string`

**Example:**
```javascript
formatAmount(5000) // "$5,000.00"
formatAmount(5000, { decimals: 0 }) // "$5,000"
```

### Additional Utilities

- `extractCardReference(text)`: Extract card name/identifier
- `normalizeText(text)`: Normalize text for comparison

## Implementation Details

### Refactored Files

1. **`services/chat/entityExtractor.js`**
   - Removed local `extractAmount` implementation
   - Now imports and uses `extractAmount` from common utility
   - Maintains backward compatibility with wrapper function

2. **`services/chat/slotFillingManager.js`**
   - Removed duplicate amount extraction in `extractBudgetAmount()`
   - Removed duplicate amount extraction in `extractPaymentAmount()`
   - Both now use common utility with appropriate options

### Migration Pattern

```javascript
// Before (duplicated logic)
const amount = query.match(/\$(\d{1,3}(?:,\d{3})*)/);

// After (common utility)
import { extractAmount } from '../../utils/textExtraction';
const amount = extractAmount(query, { minDigits: 3 });
```

## Testing

Comprehensive test suite at `__tests__/unit/textExtraction.test.js` covers:

- ✅ 34 unit tests
- ✅ Dollar sign formats (with/without commas, decimals)
- ✅ Word formats (dollars, USD, bucks)
- ✅ K notation (5k = 5000)
- ✅ Plain numbers
- ✅ Complex natural language sentences
- ✅ Edge cases (zero, invalid input, minDigits)
- ✅ Real-world scenarios including the reported bug

### Critical Test Case

The bug that prompted this refactoring:

```javascript
test('handles the reported bug case', () => {
  expect(extractAmount(
    'Ive budget of $5000 for credit card payments and need to split between my cards in optimum way'
  )).toBe(5000); // Previously returned 500
});
```

## Bug Fix

### Original Issue

User reported: "I asked to split $5000 between all my cards and it is considering 500"

### Root Cause

The regex pattern `/\$\s*(\d{1,3}(?:,\d{3})*)/` was designed for comma-separated numbers but only captured up to 3 digits before requiring a comma:
- ❌ `$5000` → matched only `$500` (first 3 digits)
- ✅ `$5,000` → matched correctly

### Fix

Changed to `/\$\s*([\d,]+)/`:
- ✅ `$5000` → matches all digits
- ✅ `$5,000` → matches with comma
- ✅ `$5` → matches small amounts
- ✅ Consistent across all formats

## Usage Guidelines

### When to Use

Use the common utility whenever you need to:
- Extract dollar amounts from user input
- Parse budget or payment values
- Extract percentages (APR, utilization, etc.)
- Format amounts for display

### When NOT to Use

Don't use for:
- Simple string formatting (use template literals)
- Already-numeric values (no parsing needed)
- Non-financial numbers (use standard parsing)

### Best Practices

1. **Always use the common utility** - Never duplicate extraction logic
2. **Set appropriate options** - Use `minDigits` to avoid false matches
3. **Test edge cases** - Add tests for new use cases to shared test suite
4. **Log extraction results** - Help debug unexpected behavior

```javascript
// Good
const amount = extractAmount(query, { minDigits: 3 });
console.log('[MyService] Extracted amount:', amount);

// Bad - duplicating logic
const match = query.match(/\$(\d+)/);
const amount = match ? parseFloat(match[1]) : null;
```

## Future Enhancements

Potential improvements to consider:

1. **Multi-currency support**: EUR, GBP, etc.
2. **Range extraction**: "between $1000 and $2000"
3. **Relative amounts**: "half my budget", "25% more"
4. **Time-based amounts**: "$500/month", "$6k annually"
5. **Confidence scoring**: Return confidence level with extraction

## Maintenance

### Adding New Patterns

When adding support for new formats:

1. Update the extraction function in `utils/textExtraction.js`
2. Add comprehensive tests in `__tests__/unit/textExtraction.test.js`
3. Run full test suite: `npm test`
4. Update this documentation

### Breaking Changes

If making breaking changes to the API:

1. Update all consumers (use IDE "Find References")
2. Update tests
3. Bump version in package.json
4. Document migration path in this file

## Related Documentation

- [Intelligent Chat System](./INTELLIGENT_CHAT_SYSTEM.md)
- [Testing Architecture](../TESTING_ARCHITECTURE.md)
- [Project Structure](../PROJECT_STRUCTURE.md)

## Conclusion

This architectural improvement ensures consistent, reliable text extraction across the Vitta application. By centralizing the logic, we've eliminated bugs, improved testability, and made the codebase easier to maintain.

**Key Takeaway**: Always think like an architect - identify duplication, create abstractions, and establish single sources of truth.

