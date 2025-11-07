# Dynamic Option Numbering Fix

## Issue

User correctly identified that:
1. ✅ **Profile detection was CORRECT**: User has balances → APR_MINIMIZER profile
2. ❌ **But option numbering was WRONG**: APR showed as "Option 2" when it should be "Option 1"

### What User Saw (WRONG):
```
💳 Your Profile: APR MINIMIZER
You carry balances - minimizing interest saves money

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Option 1: Maximize Rewards

[rewards table]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💳 Option 2: Minimize Interest ⭐ BEST FOR YOU  ❌ WRONG!

[apr table]
```

### What User SHOULD See (CORRECT):
```
💳 Your Profile: APR MINIMIZER
You carry balances - minimizing interest saves money

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💳 Option 1: Minimize Interest ⭐ BEST FOR YOU  ✅ CORRECT!

[apr table]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Option 2: Maximize Rewards

[rewards table]
```

## Root Cause

**File**: `services/recommendations/recommendationFormatter.js`

**Problem**: Option numbers were HARDCODED in each format function:
- Line 66: Always said "Option 1: Maximize Rewards"
- Line 124: Always said "Option 2: Minimize Interest"
- Line 168: Always said "Option 3: Maximize Grace Period"

But the tables were REORDERED based on profile priority! So:
- APR_MINIMIZER profile: Tables shown in order [APR, Rewards, Grace]
- But APR still said "Option 2" instead of "Option 1"

## The Fix

### 1. Pass Dynamic Option Number (Lines 40-55)

**Before**:
```javascript
tableOrder.forEach((strategy, index) => {
  if (strategy === 'rewards') {
    response += formatRewardsTable(rewards, amount, profile.priority[0] === 'rewards');
  } else if (strategy === 'apr') {
    response += formatAPRTable(apr, amount, profile.priority[0] === 'apr');
  }
  // ...
});
```

**After**:
```javascript
tableOrder.forEach((strategy, index) => {
  const optionNumber = index + 1; // Dynamic: 1, 2, 3 based on order
  const isPriority = index === 0; // First table is always priority
  
  if (strategy === 'rewards') {
    response += formatRewardsTable(rewards, amount, isPriority, optionNumber);
  } else if (strategy === 'apr') {
    response += formatAPRTable(apr, amount, isPriority, optionNumber);
  }
  // ...
});
```

### 2. Update Function Signatures

**formatRewardsTable** (Line 68):
```javascript
// Before:
function formatRewardsTable(recommendations, amount, isPriority) {
  let response = `📊 **Option 1: Maximize Rewards** ...`;

// After:
function formatRewardsTable(recommendations, amount, isPriority, optionNumber = 1) {
  let response = `📊 **Option ${optionNumber}: Maximize Rewards** ...`;
```

**formatAPRTable** (Line 126):
```javascript
// Before:
function formatAPRTable(recommendations, amount, isPriority) {
  let response = `💳 **Option 2: Minimize Interest** ...`;

// After:
function formatAPRTable(recommendations, amount, isPriority, optionNumber = 2) {
  let response = `💳 **Option ${optionNumber}: Minimize Interest** ...`;
```

**formatGracePeriodTable** (Line 170):
```javascript
// Before:
function formatGracePeriodTable(recommendations, isPriority) {
  let response = `⏰ **Option 3: Maximize Grace Period** ...`;

// After:
function formatGracePeriodTable(recommendations, isPriority, optionNumber = 3) {
  let response = `⏰ **Option ${optionNumber}: Maximize Grace Period** ...`;
```

## Expected Behavior After Fix

### For APR_MINIMIZER Profile (has balances):
```
💳 Your Profile: APR MINIMIZER
You carry balances - minimizing interest saves money

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💳 Option 1: Minimize Interest ⭐ BEST FOR YOU

| Card | APR | Interest/Month | Interest/Year |
[... APR table ...]

💰 Winner: bofa unlimited rewards - Lowest APR at 22.95%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Option 2: Maximize Rewards

| Card | Rewards | You Earn | Annual Value* |
[... Rewards table with warnings for cards with balances ...]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⏰ Option 3: Maximize Grace Period

| Card | Days to Pay | Payment Due | Grace Period |
[... Grace period table with warnings ...]
```

### For REWARDS_MAXIMIZER Profile (no balances):
```
🎯 Your Profile: REWARDS MAXIMIZER
You pay balances in full - maximize rewards!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Option 1: Maximize Rewards ⭐ BEST FOR YOU

[... Rewards table first ...]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⏰ Option 2: Maximize Grace Period

[... Grace period table second ...]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💳 Option 3: Minimize Interest

[... APR table third ...]
```

## Key Logic

### Option Number = Position in Display Order
```javascript
// For APR_MINIMIZER:
priority: ['apr', 'rewards', 'grace_period']
         ↓
Tables shown: [APR, Rewards, Grace]
         ↓
Option numbers: [1, 2, 3]
         ↓
APR = Option 1 ⭐ BEST FOR YOU
Rewards = Option 2
Grace = Option 3
```

### ⭐ BEST FOR YOU = First Table Only
```javascript
const isPriority = index === 0; // Only first table gets the star
```

## Files Modified

1. ✅ `services/recommendations/recommendationFormatter.js`
   - Lines 40-55: Pass dynamic option number
   - Line 68: formatRewardsTable signature
   - Line 126: formatAPRTable signature
   - Line 170: formatGracePeriodTable signature

## Testing

### Test Query:
```
"compare all strategies for groceries"
```

### Expected for APR_MINIMIZER (with balances):
- ✅ Option 1: Minimize Interest ⭐ BEST FOR YOU
- ✅ Option 2: Maximize Rewards
- ✅ Option 3: Maximize Grace Period

### Expected for REWARDS_MAXIMIZER (no balances):
- ✅ Option 1: Maximize Rewards ⭐ BEST FOR YOU
- ✅ Option 2: Maximize Grace Period
- ✅ Option 3: Minimize Interest

---

**Status**: Fixed ✅
**Type**: Dynamic numbering based on priority
**Impact**: HIGH (user experience - correct option ordering)
**Date**: 2025-11-07

