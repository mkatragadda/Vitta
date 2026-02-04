# Vitta Plaid APIs - Complete Reference

This document describes all 7 Plaid API endpoints implemented in Vitta, organized by user flow.

---

## Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    PLAID API FLOW                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  A. Create Link Token                                       │
│     ↓                                                        │
│  [User opens Plaid Link UI]                                 │
│     ↓                                                        │
│  B. Exchange Token (gets accounts & liabilities)            │
│     ↓                                                        │
│  C. Confirm Accounts (user selects which cards to add)     │
│     ↓                                                        │
│  [Cards added to wallet] ←→ E. Get Accounts (query)        │
│     ↓                                                        │
│  F. Refresh (manual refresh)                                │
│  G. Add More Accounts (add more cards from same bank)       │
│  H. Webhooks (automatic updates)                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## API Routes

### **Route A: Create Link Token**

**Endpoint**: `POST /api/plaid/create-link-token`

**Purpose**: Generate a short-lived token (4-hour expiry) to initialize Plaid Link UI.

**Request**:
```json
{
  "user_id": "uuid"
}
```

**Response** (200):
```json
{
  "link_token": "link_prod_xxxxx"
}
```

**Error Responses**:
- 405: Method not allowed (non-POST)
- 400: Missing user_id
- 500: Plaid not configured or API error
- 504: Request timeout (30s)

**What It Does**:
1. Validates user_id provided
2. Checks Plaid environment variables (PLAID_CLIENT_ID, PLAID_SECRET, etc.)
3. Calls Plaid `/link/token/create` endpoint
4. Requests **both** `transactions` and `liabilities` products
5. Sets webhook URL for real-time updates
6. Returns link token for frontend

**Key Details**:
- Token is **short-lived** (4 hours)
- Requests both products to unlock full Vitta features
- Webhook configured for real-time sync
- 30-second timeout on Plaid API call

**Frontend Usage**:
```javascript
// 1. Get link token from backend
const { link_token } = await fetch('/api/plaid/create-link-token', {
  method: 'POST',
  body: JSON.stringify({ user_id: user.user_id })
}).then(r => r.json());

// 2. Initialize Plaid Link UI with token
const config = {
  token: link_token,
  onSuccess: (publicToken) => {
    // Exchange public token for access token (Route B)
  }
};
window.Plaid.create(config).open();
```

---

### **Route B: Exchange Token**

**Endpoint**: `POST /api/plaid/exchange-token`

**Purpose**: Exchange temporary public_token for permanent access_token, fetch accounts & liabilities, persist to database, trigger transaction sync.

**Request**:
```json
{
  "public_token": "public_xxx",
  "user_id": "uuid"
}
```

**Response** (200 - Success):
```json
{
  "plaid_item_id": "database-uuid",
  "accounts": [
    {
      "plaid_account_id": "account_xxx",
      "name": "Chase Sapphire Preferred",
      "mask": "4582",
      "account_type": "credit",
      "account_subtype": "credit_card",
      "current_balance": 1500.00,
      "credit_limit": 5000.00,
      "liability": {
        "purchase_apr": 18.99,
        "minimum_payment_amount": 60.00,
        "last_statement_date": "2025-01-15",
        "next_payment_due_date": "2025-02-10"
      }
    }
  ]
}
```

**Response** (409 - Duplicate Link):
```json
{
  "error": "Bank already linked",
  "message": "Chase is already connected to your Vitta account.",
  "suggestion": "Use 'Add More Accounts' to add additional cards from this bank.",
  "plaid_item_id": "existing-uuid"
}
```

**Error Responses**:
- 405: Method not allowed
- 400: Missing public_token or user_id
- 409: **Duplicate bank link** (not an error — guides user to "Add More Accounts")
- 500: Supabase not configured, encryption failure, DB insert failure
- 504: Request timeout

**What It Does**:

1. **Exchange Token**
   - Calls Plaid `/item/public_token/exchange`
   - Gets access_token and item_id

2. **Encrypt Token**
   - Encrypts access_token immediately (never returned to frontend)
   - Stored in `plaid_items.access_token_enc`

3. **Fetch Accounts & Liabilities** (in parallel)
   - Calls Plaid `/accounts/get`
   - Calls Plaid `/liabilities/get`
   - Gets accounts, balances, APR, payment dates, etc.

4. **Check for Duplicates**
   - Queries `plaid_items` for existing item
   - If found: Returns 409 with helpful message + existing plaid_item_id
   - If not found: Proceeds to insert

5. **Persist to Database**
   - **plaid_items**: Stores bank link (item_id, encrypted token, institution name)
   - **plaid_accounts**: Stores all accounts (name, balance, credit limit, account type)
   - **plaid_liabilities**: Stores APR, payment dates, statement dates for credit cards

6. **Async Transaction Sync** (fire and forget)
   - Triggers background `syncTransactions()` with initial cursor
   - Downloads all historical transactions for all accounts
   - Returns immediately without waiting for sync

**Key Details**:
- **Never returns access_token** to frontend (security!)
- **409 Duplicate Detection**: Shows helpful error message with "Add More Accounts" option
- **Parallel Requests**: Accounts + Liabilities fetched simultaneously
- **Async Sync**: Transaction download happens in background
- **Encryption**: Token encrypted before storage

---

### **Route C: Confirm Accounts**

**Endpoint**: `POST /api/plaid/confirm-accounts`

**Purpose**: User selects which accounts to add to wallet. Auto-populate fields from Plaid data and catalog matching.

**Request**:
```json
{
  "user_id": "uuid",
  "plaid_item_id": "database-uuid",
  "selected_accounts": [
    {
      "plaid_account_id": "account_xxx",
      "nickname": "My Chase Card"  // optional
    }
  ]
}
```

**Response** (200):
```json
{
  "added_cards": [
    {
      "vitta_card_id": "card-uuid",
      "plaid_account_id": "account_xxx",
      "card_name": "Chase Sapphire Preferred",
      "needs_user_input": false,
      "missing_fields": []
    },
    {
      "vitta_card_id": "card-uuid-2",
      "plaid_account_id": "account_yyy",
      "card_name": "Chase Freedom Unlimited",
      "needs_user_input": true,
      "missing_fields": ["reward_structure", "annual_fee"]
    }
  ]
}
```

**Error Responses**:
- 405: Method not allowed
- 400: Missing fields
- 500: Database error, catalog error

**What It Does**:

1. **Validate Request**
   - Checks user_id, plaid_item_id, selected_accounts array

2. **Fetch Catalog Cards**
   - Gets all active cards from `card_catalog` table
   - Sorted by popularity for determinism

3. **For Each Selected Account**:
   a. **Fetch Account Data**
      - Get account details from `plaid_accounts`
      - Get liability data from `plaid_liabilities`
      - Extract APR, minimum payment, statement/payment dates

   b. **Compute Dates**
      - Statement close day (from last_statement_date)
      - Payment due day (from next_payment_due_date)
      - Grace period (days between statement and payment)

   c. **Fuzzy Catalog Matching**
      - Compares account name (e.g., "Chase Sapphire") against catalog
      - Returns match confidence: HIGH, MEDIUM, or NONE
      - If matched: Auto-populate issuer, network, rewards, annual fee
      - If not matched: Mark fields as missing

   d. **Create user_credit_cards**
      - Inserts card with auto-populated Plaid data
      - Auto-populated fields:
        - Card name, current balance
        - APR, credit limit, minimum payment
        - Statement/payment dates
      - Optionally matched from catalog:
        - Issuer, card network, rewards, annual fee

   e. **Link Back**
      - Updates `plaid_accounts.vitta_card_id` with new card ID
      - This marks account as "linked to wallet"

4. **Build Response**
   - Returns added_cards array
   - Flags which cards need additional user input
   - Lists missing fields for UI to prompt for

**Key Details**:
- **Auto-Population**: Plaid data + catalog matching fill in most fields
- **Fuzzy Matching**: Handles card name variations (e.g., "Sapphire Preferred" → Chase Sapphire)
- **Missing Fields Flagged**: UI knows what fields user must complete
- **Grace Period Computed**: Useful for payment optimization
- **vitta_card_id Link**: Links plaid_accounts to user_credit_cards

---

### **Route E: Get Accounts**

**Endpoint**: `GET /api/plaid/accounts?user_id=<uuid>`

**Purpose**: Query user's linked banks, accounts, and current data. Used for UI to display "Manage Banks" view.

**Request**:
```
GET /api/plaid/accounts?user_id=user-uuid
```

**Response** (200):
```json
{
  "items": [
    {
      "plaid_item_id": "item-uuid",
      "institution_name": "Chase Bank",
      "status": "active",
      "accounts": [
        {
          "plaid_account_id": "account_xxx",
          "name": "Chase Sapphire Preferred",
          "mask": "4582",
          "account_type": "credit",
          "account_subtype": "credit_card",
          "vitta_card_id": "card-uuid",  // null if not in wallet
          "current_balance": 1500.00,
          "credit_limit": 5000.00,
          "liability": {
            "purchase_apr": 18.99,
            "minimum_payment": 60.00,
            "last_statement_date": "2025-01-15",
            "next_payment_due_date": "2025-02-10"
          }
        }
      ]
    }
  ]
}
```

**Error Responses**:
- 405: Method not allowed (non-GET)
- 400: Missing user_id query param
- 500: Database error

**What It Does**:

1. **Fetch All Plaid Items**
   - Queries `plaid_items` where user_id matches
   - Sorted by creation date (newest first)

2. **For Each Item, Fetch Accounts**
   - Queries `plaid_accounts` for all accounts in item
   - Includes balance, credit limit, account type
   - Sorted by name

3. **For Each Credit Account, Fetch Liability**
   - Queries `plaid_liabilities` for APR, payment info
   - Includes purchase APR, minimum payment, statement/payment dates

4. **Return Full Structure**
   - All banks with all accounts and latest liability data
   - Includes vitta_card_id (null if account not in wallet yet)

**Frontend Usage**:
```javascript
// Query user's banks and accounts
const response = await fetch(`/api/plaid/accounts?user_id=${userId}`);
const { items } = await response.json();

// items[0] = Chase { plaid_item_id, institution_name, accounts[] }
// items[0].accounts[0] = specific card with balance, APR, liability
```

---

### **Route F: Refresh**

**Endpoint**: `POST /api/plaid/refresh`

**Purpose**: Manually trigger transaction sync for all of user's linked banks. Called when user clicks "Refresh Now" button.

**Request**:
```json
{
  "user_id": "uuid"
}
```

**Response** (200 - Immediate):
```json
{
  "refreshing": true,
  "item_count": 3
}
```

**Error Responses**:
- 405: Method not allowed
- 400: Missing user_id
- 500: Database error, decryption failure

**What It Does**:

1. **Fetch Active Items**
   - Queries `plaid_items` where user_id matches AND status='active'
   - Gets encrypted access tokens for each item

2. **Return Immediately**
   - Responds with 200 + item count
   - Client receives confirmation that refresh started

3. **Async Background Sync** (fire and forget)
   - For each item:
     a. Decrypt access token
     b. Call `syncTransactions()` with stored cursor
     c. Download new/updated transactions
     d. Update cursor for next sync
   - Continues even if one item fails
   - Logs errors but doesn't crash

**Key Details**:
- **Immediate Response**: Doesn't wait for actual sync (improves UX)
- **Background Processing**: Sync happens asynchronously
- **Per-Item Cursor**: Each bank has its own sync cursor for efficiency
- **Error Resilience**: One item failure doesn't stop others
- **Rate Limiting**: (Phase 6+) Can add cooldown/limits

**Frontend Usage**:
```javascript
// User clicks "Refresh" button
const response = await fetch('/api/plaid/refresh', {
  method: 'POST',
  body: JSON.stringify({ user_id })
});

const { refreshing, item_count } = await response.json();
// Show spinner: "Syncing 3 banks..."
// Poll transaction endpoint to see updated data
```

---

### **Route G: Add More Accounts**

**Endpoint**: `POST /api/plaid/add-more-accounts`

**Purpose**: User already linked a bank and added some cards. Now they want to add more cards from the same bank. Shows already-added (grayed out) vs available accounts.

**Request**:
```json
{
  "user_id": "uuid",
  "plaid_item_id": "database-uuid (from plaid_items)"
}
```

**Response** (200):
```json
{
  "plaid_item_id": "item-uuid",
  "institution_name": "Chase Bank",
  "already_added_accounts": [
    {
      "plaid_account_id": "account_xxx",
      "name": "Chase Sapphire Preferred",
      "mask": "4582",
      "account_type": "credit",
      "account_subtype": "credit_card",
      "current_balance": 1500.00,
      "credit_limit": 5000.00,
      "vitta_card_id": "card-uuid"
    }
  ],
  "available_accounts": [
    {
      "plaid_account_id": "account_yyy",
      "name": "Chase Freedom Unlimited",
      "mask": "7890",
      "account_type": "credit",
      "account_subtype": "credit_card",
      "current_balance": 2000.00,
      "credit_limit": 10000.00,
      "liability": {
        "purchase_apr": 18.99,
        "minimum_payment": 60.00,
        "last_statement_date": "2025-01-15",
        "next_payment_due_date": "2025-02-10"
      }
    }
  ]
}
```

**Error Responses**:
- 405: Method not allowed
- 400: Missing user_id or plaid_item_id
- 404: Plaid item not found, or no accounts found
- 500: Database error

**What It Does**:

1. **Verify Ownership**
   - Checks that plaid_item belongs to user
   - Ensures user can't access other users' accounts

2. **Fetch All Accounts**
   - Queries `plaid_accounts` for given item
   - Sorts by name

3. **Separate Already-Added vs Available**
   - Already-added: vitta_card_id IS NOT NULL (linked to wallet)
   - Available: vitta_card_id IS NULL (not yet in wallet)

4. **Fetch Liability Data for Available**
   - Gets APR, payment info for credit accounts
   - Helps user see payment obligations before adding

5. **Return Both Lists**
   - UI shows already-added grayed out
   - UI shows available as selectable checkboxes

**Frontend Usage**:
```javascript
// User clicks "Add More Accounts" for Chase
const response = await fetch('/api/plaid/add-more-accounts', {
  method: 'POST',
  body: JSON.stringify({ user_id, plaid_item_id })
});

const { already_added_accounts, available_accounts } = await response.json();

// PlaidAccountSelector component shows both:
// - Chase Sapphire (✓ Added) — grayed out
// - Chase Freedom Unlimited — checkbox
// - Chase Checking — checkbox (if user includes checking)
```

---

### **Route H: Webhooks**

**Endpoint**: `POST /api/plaid/webhooks`

**Purpose**: Plaid sends real-time notifications when:
- User's account is updated (balance, pending transactions)
- New transactions synced
- Account or item needs attention (auth required, item locked)

**Webhook Payload** (sent by Plaid):
```json
{
  "webhook_code": "TRANSACTIONS_UPDATED",
  "webhook_type": "TRANSACTIONS",
  "item_id": "item_xxx",
  "user_id": "user_uuid",
  "new_transactions": 5,
  "removed_transactions": []
}
```

**Possible Webhook Codes**:

| Code | Meaning |
|------|---------|
| `TRANSACTIONS_UPDATED` | New or updated transactions available |
| `SYNC_UPDATES_AVAILABLE` | New transaction data available for sync |
| `DEFAULT_UPDATE` | Item needs re-authentication |
| `LOGIN_REPAIRED` | User fixed authentication issue |
| `ITEM_ERROR` | Item encountered an error (needs investigation) |

**What It Does**:

1. **Validate Webhook**
   - Verifies webhook signature (prevents spoofing)
   - Checks webhook code

2. **Handle Based on Code**
   - **TRANSACTIONS_UPDATED**: Trigger `syncTransactions()`
   - **DEFAULT_UPDATE**: Mark item as needing re-auth
   - **LOGIN_REPAIRED**: Mark item as active again
   - **ITEM_ERROR**: Log error, alert user

3. **Async Processing**
   - Downloads transactions in background
   - Updates balances from latest liability data
   - No blocking response

**Response** (202 - Accepted):
```json
{
  "received": true
}
```

---

## Data Flow Diagram

```
Frontend                    Backend APIs                Database
─────────────────────────────────────────────────────────────────

[User clicks Link Bank]
        │
        └──→ A. Create Link Token ──→ [get link_token]
            │
[Plaid Link Opens]
(user logs in, selects accounts)
            │
        ←── public_token
            │
        B. Exchange Token ──→ Fetch accounts + liabilities
            │                Encrypt token
            │                Store in plaid_items, plaid_accounts, plaid_liabilities
            │                Trigger async transaction sync
        ←── plaid_item_id, accounts[]
            │
        C. Confirm Accounts ──→ Fuzzy catalog match
            │                    Create user_credit_cards
            │                    Link vitta_card_id to plaid_accounts
        ←── added_cards[]
            │
    [Cards in wallet!]
            │
        ↙ E. Get Accounts     ↙ F. Refresh
        ↙ G. Add More         ↙ H. Webhooks
```

---

## Error Handling Summary

| HTTP Code | Meaning | Recovery |
|-----------|---------|----------|
| 200 | Success | None needed |
| 400 | Bad request (validation) | Check request body, retry with valid data |
| 405 | Wrong HTTP method | Use POST/GET as specified |
| 409 | Duplicate bank link | Use Route G "Add More Accounts" instead |
| 500 | Server/DB error | Retry after delay, check error message |
| 504 | Timeout | Retry, may be temporary network issue |

---

## Security Notes

✅ **access_token**:
- Encrypted before storage
- Never returned to frontend
- Decrypted only server-side for Plaid API calls

✅ **Webhook Verification**:
- Signatures validated to prevent spoofing
- Only Plaid can trigger webhooks

✅ **User Isolation**:
- All queries verify user_id ownership
- Can't access other users' accounts

⚠️ **Future Improvements** (Phase 7+):
- Add rate limiting to refresh endpoint
- Add account deletion/unlink logic
- Add webhook reliability monitoring

---

## Implementation Status

| Route | Phase | Status |
|-------|-------|--------|
| A. Create Link Token | 1 | ✅ Complete |
| B. Exchange Token | 1 | ✅ Complete |
| C. Confirm Accounts | 1 | ✅ Complete |
| E. Get Accounts | 3 | ✅ Complete |
| F. Refresh | 3 | ✅ Complete |
| G. Add More Accounts | 3.5 | ✅ Complete |
| H. Webhooks | 4 | ✅ Complete |

All APIs **ready for frontend wiring in Phase 6**.

---

## Testing Each API

### Manual Testing with cURL

```bash
# A. Create Link Token
curl -X POST http://localhost:3000/api/plaid/create-link-token \
  -H "Content-Type: application/json" \
  -d '{"user_id": "test-user-uuid"}'

# B. Exchange Token (need public_token from Plaid Link)
curl -X POST http://localhost:3000/api/plaid/exchange-token \
  -H "Content-Type: application/json" \
  -d '{"public_token": "public_...", "user_id": "test-user-uuid"}'

# C. Confirm Accounts
curl -X POST http://localhost:3000/api/plaid/confirm-accounts \
  -H "Content-Type: application/json" \
  -d '{"user_id": "test-user-uuid", "plaid_item_id": "item-uuid", "selected_accounts": [{"plaid_account_id": "account_xxx", "nickname": "My Card"}]}'

# E. Get Accounts
curl http://localhost:3000/api/plaid/accounts?user_id=test-user-uuid

# F. Refresh
curl -X POST http://localhost:3000/api/plaid/refresh \
  -H "Content-Type: application/json" \
  -d '{"user_id": "test-user-uuid"}'

# G. Add More Accounts
curl -X POST http://localhost:3000/api/plaid/add-more-accounts \
  -H "Content-Type: application/json" \
  -d '{"user_id": "test-user-uuid", "plaid_item_id": "item-uuid"}'
```

---

## Summary

**Phase 6 focuses on wiring these 7 APIs to the frontend**:

1. **Route A** — Initialize Plaid Link UI
2. **Route B** — Exchange token, store encrypted, sync transactions
3. **Route C** — User confirms which accounts to add
4. **Route E** — Query banks/accounts (used in CardBrowserScreen)
5. **Route F** — Manual refresh (Refresh button)
6. **Route G** — Add more accounts from linked bank
7. **Route H** — Webhooks (automatic sync)

All are **tested and ready**. Phase 6 = connect them to React components.
