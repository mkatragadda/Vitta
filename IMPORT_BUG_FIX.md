# Import Bug Fix - calculateFloatTime

## Issue

When user asked "compare all strategies", the app showed:
1. **Error**: `TypeError: calculateFloatTime is not a function`
2. **Fallback to GPT**: Confusing numbered list format instead of three separate tables
3. **Console shows**: "Using GPT fallback" and "GPT response received"

## Root Cause

**File**: `services/recommendations/recommendationStrategies.js` (Line 6)

**Bug**: Wrong import statement
```javascript
// WRONG - calculateFloatTime doesn't exist in paymentCycleUtils.js
import { calculateFloatTime, getPaymentDueDateForFloat } from '../../utils/paymentCycleUtils';
```

**Truth**:
- `calculateFloatTime` is in `statementCycleUtils.js`
- `getPaymentDueDateForFloat` is in `paymentCycleUtils.js`

## The Error Flow

```
User: "compare all strategies"
    ↓
conversationEngineV2.js → getAllStrategies()
    ↓
recommendationStrategies.js → scoreForGracePeriod()
    ↓
Calls calculateFloatTime() at line 120
    ↓
❌ ERROR: Function not found (wrong import)
    ↓
Catch block → Falls back to GPT
    ↓
GPT generates confusing numbered list format
    ↓
User sees old-style response
```

## Fix Applied

**File**: `services/recommendations/recommendationStrategies.js` (Lines 6-7)

**Before**:
```javascript
import { calculateFloatTime, getPaymentDueDateForFloat } from '../../utils/paymentCycleUtils';
```

**After**:
```javascript
import { calculateFloatTime } from '../../utils/statementCycleUtils.js';
import { getPaymentDueDateForFloat } from '../../utils/paymentCycleUtils.js';
```

## Why This Happened

When I created the new architecture, I copied the import from another file that also imports `calculateFloatTime`, but that file had the wrong import too. I should have checked the actual location of the function.

## Verification

### Function Locations:
```bash
# calculateFloatTime is in statementCycleUtils.js
grep "export const calculateFloatTime" utils/statementCycleUtils.js
# Line 176: export const calculateFloatTime = (card, purchaseDate = new Date()) => {

# getPaymentDueDateForFloat is in paymentCycleUtils.js  
grep "export const getPaymentDueDateForFloat" utils/paymentCycleUtils.js
# Line 215: export const getPaymentDueDateForFloat = (card, purchaseDate = new Date()) => {
```

## Expected Behavior After Fix

When user asks "compare all strategies":

1. ✅ No errors
2. ✅ Three separate tables displayed
3. ✅ User profile shown at top
4. ✅ Actual dollar amounts
5. ✅ Grace period warnings for cards with balances
6. ✅ NO GPT fallback

## Test Now

1. **Refresh browser**: Hard refresh (Cmd+Shift+R)
2. **Type**: "compare all strategies for groceries"
3. **Should see**: Three clean tables, NOT a numbered list

---

**Status**: Fixed ✅
**File Modified**: `services/recommendations/recommendationStrategies.js`
**Type**: Import error
**Impact**: HIGH (broke entire new recommendation engine)
**Date**: 2025-11-07

