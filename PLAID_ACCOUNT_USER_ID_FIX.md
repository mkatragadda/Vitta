# 🔧 Critical Fix: Plaid Account Missing user_id

## The Problem

When you tried to initiate a transfer, the plaid account search failed with:
```
PGRST116: Cannot coerce the result to a single JSON object
```

Looking at your database, the account had:
```
{
  id: '038d3dd0-06d0-41ee-885e-b96b4a44e0a5',
  user_id: undefined,  ← THE PROBLEM
  plaid_account_id: 'zy6aB9B9gZsENRq3MAaJCy9l4weGpDF33MLkP',
  is_active: true
}
```

**The `user_id` column was NULL/undefined!**

## Root Cause

In `pages/api/plaid/exchange-token.js` (lines 126-142), when inserting plaid_accounts into the database, the code was **not including the user_id**:

```javascript
// WRONG - no user_id in the insert!
.insert([{
  plaid_item_id: dbItemId,
  plaid_account_id: account.account_id,
  mask: account.mask || null,
  name: account.name,
  // ... other fields ...
  is_active: true,
}])
```

## The Fix

Added `user_id` to the insert:

```javascript
// CORRECT - now includes user_id
.insert([{
  user_id,  // ← ADDED THIS
  plaid_item_id: dbItemId,
  plaid_account_id: account.account_id,
  mask: account.mask || null,
  name: account.name,
  // ... other fields ...
  is_active: true,
}])
```

## Impact

### Going Forward ✅
- **All new Plaid account links will have the correct user_id**
- Transfer initiation will work properly for new accounts
- Database will be properly scoped to users

### Existing Account ⚠️
- The existing account in your database still has `user_id: undefined`
- **Solution**: Re-link your Plaid account through the UI:
  1. Go to Dashboard
  2. Click "Link More Accounts" (or similar button)
  3. Go through Plaid link flow again
  4. This will create a NEW plaid_accounts record with the correct user_id
  5. The transfer flow will then work

## What to Do Now

### Option 1: Re-Link Account (Recommended)
1. Open the app
2. Go to Dashboard → Linked Accounts
3. Click "Link More Accounts"
4. Go through the Plaid flow again
5. Try the transfer again - it should work!

### Option 2: Manual Database Fix (If you have Supabase access)
Update the existing record:
```sql
UPDATE plaid_accounts 
SET user_id = 'your-user-id-here'
WHERE plaid_account_id = 'zy6aB9B9gZsENRq3MAaJCy9l4weGpDF33MLkP'
```

But **Option 1 is safer and recommended**.

## Test After Fix

Once you re-link your account:
1. Chat → "Send money to India"
2. Enter amount
3. Click "Get Exchange Rate" ✅ Should work
4. Select beneficiary
5. Confirm transfer ✅ Should work

---

## Summary

The critical bug was that `user_id` wasn't being saved when Plaid accounts were created. This caused the transfer initiation to fail because it couldn't find the account (it was searching for the account scoped to your user, but the account had no user_id).

The fix is simple: always include `user_id` when saving plaid_accounts. Going forward, this is fixed!
