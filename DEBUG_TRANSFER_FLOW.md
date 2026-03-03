# Debug Guide: Transfer Initiation Flow

## Enhanced Logging Added

The `/api/transfers/initiate` endpoint now has comprehensive logging to help diagnose Plaid account issues.

### What to Check

When you try to initiate a transfer and get "Plaid account not found", **check your browser console** for these log outputs:

#### 1. **REQUEST DETAILS**
```
[transfers/initiate] ===== REQUEST DETAILS =====
[transfers/initiate] Request Body: {
  beneficiary_id: "...",
  plaid_transfer_account_id: "...",
  source_amount: 500,
  exchange_rate: 83.25
}
[transfers/initiate] User ID from header: "..."
```

**What to verify**:
- ✅ `beneficiary_id` is not empty
- ✅ `plaid_transfer_account_id` is not empty
- ✅ User ID is populated from header

#### 2. **TABLE STRUCTURE CHECK**
```
[transfers/initiate] ===== TABLE STRUCTURE CHECK =====
[transfers/initiate] Table structure check: {
  hasData: true/false,
  columns: ["id", "user_id", "plaid_account_id", "plaid_item_id", ...],
  sampleRow: { ... }
}
```

**What to verify**:
- ✅ Table has `plaid_account_id` column
- ✅ Table has `user_id` column
- ✅ At least one row exists in the table

#### 3. **USER ACCOUNTS**
```
[transfers/initiate] ===== FETCHING USER ACCOUNTS =====
[transfers/initiate] User accounts query result: {
  count: X,
  accounts: [
    {
      id: "...",
      plaid_account_id: "...",
      plaid_item_id: "...",
      is_active: true/false
    }
  ]
}
```

**What to verify**:
- ✅ `count > 0` (you have at least one account linked)
- ✅ `is_active: true` (account is marked active)
- ✅ The `plaid_account_id` matches what you're searching for

#### 4. **TARGET ACCOUNT SEARCH**
```
[transfers/initiate] ===== SEARCHING FOR TARGET ACCOUNT =====
[transfers/initiate] Query result (without .single()): {
  searchingFor: "acct_...",
  count: X,
  data: [...]
}
```

**What to verify**:
- ✅ `count > 0` (account was found)
- ✅ The `plaid_account_id` in the search matches the one in the database

#### 5. **ALL ACCOUNTS (If Not Found)**
```
[transfers/initiate] ALL accounts in database (no filter): {
  count: X,
  accounts: [
    {
      id: "...",
      user_id: "...",
      plaid_account_id: "...",
      is_active: true/false
    }
  ]
}
```

**What to verify**:
- ✅ `count > 0` (accounts exist in the database)
- ✅ Compare `user_id` in the database with the header `user_id`
- ✅ Check if there's a mismatch in account IDs

## Common Issues & Solutions

### Issue 1: count: 0 in "User accounts query result"
**Problem**: No Plaid accounts linked for this user

**Solution**:
1. Go to Plaid link flow
2. Actually link a Plaid account through the UI
3. Verify it shows up in your card list

### Issue 2: count: 0 in "ALL accounts in database"
**Problem**: No Plaid accounts exist in the database at all

**Solution**:
1. Link accounts through the UI first
2. Check Supabase dashboard directly: `plaid_accounts` table
3. Verify the table exists and has data

### Issue 3: Account found but still fails
**Problem**: Account exists but validation fails

**Check these fields**:
- ✅ `is_active: true`
- ✅ Account verification status
- ✅ Account doesn't have transfer restrictions

### Issue 4: user_id mismatch
**Problem**: user_id in request doesn't match user_id in database

**Solution**:
1. Verify you're logged in with the correct user
2. Check that localStorage has the correct `user_id`
3. Verify Supabase session is valid

## How to View Logs

### In Browser
1. Open DevTools (F12 / Cmd+Option+I)
2. Go to **Console** tab
3. Filter by `[transfers/initiate]`
4. Make the API call (try to initiate transfer)
5. All logs will appear in the console

### In Network Tab
1. Open DevTools → **Network** tab
2. Look for POST request to `/api/transfers/initiate`
3. Click on the request
4. Check **Response** tab (won't show console logs)
5. Check **Console** tab in DevTools for server-side logs

## Step-by-Step Debugging

1. **Verify Plaid Link Status**
   - Go to Dashboard
   - Check if "Linked Accounts" section shows your accounts
   - If not, use "Link More Accounts" button

2. **Check Database Directly** (if you have Supabase access)
   - Go to Supabase Dashboard
   - Navigate to `plaid_accounts` table
   - Verify:
     - `user_id` matches your user
     - `is_active` is true
     - `plaid_account_id` has a value

3. **Check Request Headers**
   - Open DevTools → Network
   - Look at POST to `/api/transfers/initiate`
   - Headers tab → search for `x-user-id`
   - Verify it's populated

4. **Run the Transfer Flow**
   - Go to Chat interface
   - Type: "Send money to India"
   - Follow the flow until you hit the error
   - Check console logs from steps 1-5 above

## Still Stuck?

Check these things:
- [ ] Plaid account is actually linked (shows in Dashboard)
- [ ] User is logged in (check localStorage: `user_id`)
- [ ] Beneficiary is verified (check beneficiaries list)
- [ ] Exchange rate fetch succeeded (before hitting initiate)
- [ ] All console logs from REQUEST DETAILS through TARGET ACCOUNT SEARCH
