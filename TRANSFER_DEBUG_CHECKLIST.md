# Transfer Flow Debug Checklist & Fixed Issues

## ✅ CRITICAL BUG FIXED

### Issue: Plaid Account Search Using Wrong Column
**Location**: `pages/api/transfers/execute.js` line 193

**The Bug**:
```javascript
// WRONG - searching by database id instead of Plaid ID
.eq('id', transfer.plaid_transfer_account_id)
```

**The Fix**:
```javascript
// CORRECT - search by plaid_account_id (the actual Plaid account ID)
.eq('plaid_account_id', transfer.plaid_transfer_account_id)
```

**Why This Matters**:
- `transfer.plaid_transfer_account_id` contains a Plaid ID like "acct_ABC123XYZ"
- The database `id` column is a UUID like "550e8400-e29b-41d4..."
- These will never match, causing "account not found" errors

### Issue: Missing Logging for Debugging
**Added to**: `pages/api/transfers/initiate.js` and `pages/api/transfers/execute.js`

**New Logging Includes**:
- Request body inspection
- Table structure validation
- User account enumeration
- Target account search results
- Database account listing (if not found)
- Plaid account lookup results
- Access token encryption/decryption validation

## 📋 Step-by-Step Debugging Guide

### Step 1: Verify Plaid Account is Linked
```
1. Open your app
2. Go to Dashboard
3. Look for "Linked Accounts" section
4. Verify your bank account shows up
5. Check that it says "Active" or similar
```

**If accounts don't show**:
- Click "Link More Accounts"
- Go through Plaid flow
- Confirm account was added

### Step 2: Open Browser Developer Console
```
1. Press F12 (Windows/Linux) or Cmd+Option+I (Mac)
2. Click "Console" tab
3. Filter by typing: [transfers/initiate]
4. Clear console (Ctrl+L or Cmd+K)
```

### Step 3: Initiate a Transfer
```
1. In the app, go to Chat
2. Type: "Send money to India" (or similar)
3. Follow the prompts:
   - Select amount (e.g., 500)
   - Click "Get Exchange Rate"
   - Select a beneficiary
   - Review details
   - Click "Confirm Transfer"
```

### Step 4: Read the Logs

When you hit the error, you should see logs like:

```
[transfers/initiate] ===== REQUEST DETAILS =====
[transfers/initiate] Request Body: {
  beneficiary_id: "bene_...",
  plaid_transfer_account_id: "acct_ABC123",
  source_amount: 500,
  exchange_rate: 83.25
}
[transfers/initiate] User ID from header: "user_..."

[transfers/initiate] ===== TABLE STRUCTURE CHECK =====
[transfers/initiate] Table structure check: {
  hasData: true,
  columns: ["id", "user_id", "plaid_account_id", "plaid_item_id", ...],
  sampleRow: { id: "...", plaid_account_id: "acct_...", ... }
}

[transfers/initiate] ===== FETCHING USER ACCOUNTS =====
[transfers/initiate] User accounts query result: {
  count: 1,
  accounts: [{
    id: "550e...",
    plaid_account_id: "acct_ABC123",
    plaid_item_id: "item_...",
    is_active: true
  }]
}

[transfers/initiate] ===== SEARCHING FOR TARGET ACCOUNT =====
[transfers/initiate] Query result (without .single()): {
  searchingFor: "acct_ABC123",
  count: 1,
  data: [{ id: "550e...", plaid_account_id: "acct_ABC123", ... }]
}
```

### Step 5: Analyze the Logs

**✅ Good Signs**:
- `count: 1` or more in "User accounts query result"
- `count: 1` in "Searching for target account"
- `is_active: true`
- `plaid_account_id` matches what you're searching for

**❌ Bad Signs**:
- `count: 0` in "User accounts query result" → No accounts linked
- `count: 0` in "Searching for target account" → Account not found
- `is_active: false` → Account is inactive
- `plaid_account_id` is null or empty

## 🔧 If Execute Phase Fails

If you get past initiate but fail at execute, look for:

```
[execute] Looking up Plaid account {
  searching_by_plaid_account_id: "acct_ABC123"
}

[execute] Plaid account lookup result {
  found: true,
  error: null,
  account_data: { id: "550e...", plaid_item_id: "item_..." }
}

[execute] Fetching Plaid item for access token {
  plaid_item_id: "item_..."
}

[execute] Plaid item lookup result {
  found: true,
  error: null,
  has_access_token_enc: true
}

[execute] Decrypting Plaid access token {
  token_length: 512
}

[execute] Successfully decrypted Plaid access token {
  decrypted_token_preview: "access-sandbox-..."
}
```

**If any of these show `found: false`**:
- Plaid account not in database
- Plaid item not in database
- Access token not encrypted in database

## 🚀 Expected Flow After Fix

```
1. User clicks "Get Exchange Rate"
   ✅ Returns current USD/INR rate

2. User selects beneficiary
   ✅ Shows beneficiary details

3. User clicks "Confirm Transfer"
   ✅ Initiates transfer (shows in logs as REQUEST DETAILS)
   ✅ Finds plaid account (shows USER ACCOUNTS count > 0)
   ✅ Finds target account (shows SEARCHING FOR TARGET count > 0)
   ✅ Creates pending transfer record

4. Transfer executes
   ✅ Looks up plaid account (now using plaid_account_id)
   ✅ Gets plaid_item
   ✅ Decrypts access token
   ✅ Calls Plaid /auth/get
   ✅ Calls Chimoney API
   ✅ Returns success

5. User sees receipt
   ✅ Shows transaction ID
   ✅ Shows settlement timeline
```

## 📊 Common Error Scenarios & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "Plaid account not found" | Account not linked | Link account via Plaid flow |
| count: 0 in all account queries | No accounts in DB | Verify Plaid link was saved |
| "is_active: false" | Account disabled | Check Supabase: set `is_active = true` |
| Decrypt error | Invalid encryption key | Check ENCRYPTION_KEY env var |
| "RATE_EXPIRED" | Exchange rate >30s old | Fetch new rate in UI |
| "Cannot coerce to single" | Multiple accounts found | Check DB for duplicates |

## 🔍 Additional Resources

- See `DEBUG_TRANSFER_FLOW.md` for detailed log descriptions
- Check Supabase Dashboard for raw table data
- Review `services/payment/idempotencyService.js` for retry logic
- Check `pages/api/transfers/execute.js` for Chimoney integration

## ✅ Build Status

```
✓ Build successful
✓ New logging added
✓ Plaid account bug fixed (query now uses plaid_account_id)
✓ All tests passing
```
