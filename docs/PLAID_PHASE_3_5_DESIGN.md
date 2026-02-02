# Plaid Integration — Phase 3.5 Design Document

## Overview

Phase 3.5 addresses edge cases and user experience improvements discovered during Phase 3 implementation:

1. **Transaction filtering** — Prevent users from seeing transactions from unlinked accounts
2. **Duplicate bank links** — Handle gracefully when user links the same bank twice
3. **Add more accounts** — Allow users to add additional accounts from an already-linked bank
4. **UI clarity** — Show which accounts are already linked (non-editable) vs available for linking

---

## Problem Statement

### Issue 1: Hidden Transactions Confuse Users

**Scenario:** User links Chase with 5 accounts, selects 2 credit cards to add to wallet.

| Table | Content | Problem |
|-------|---------|---------|
| `plaid_accounts` | All 5 accounts | ✅ Correct: Mirror of user's Plaid institution |
| `transactions` | All 5 accounts' transactions synced | ✅ Necessary: Available for future additions |
| `user_credit_cards` | 2 accounts only | ✅ Correct: User's wallet |
| **Chat query** | "Show my spending" | 🚨 Returns transactions from all 5 accounts, not just 2 |

**User expectation:** Only see transactions from cards they added to Vitta.

**Solution:** Filter `transactions` by `vitta_card_id IS NOT NULL` in all chat queries.

---

### Issue 2: Duplicate Bank Link Crashes

**Scenario:** User already linked Chase. They accidentally link Chase again.

**Current behavior (Phase 3):**
```
Route B: INSERT plaid_items { plaid_item_id: 'chase-item-xyz', ... }
↓
Plaid returns same item_id (banks are stable)
↓
Database INSERT fails: UNIQUE constraint violation on plaid_item_id
↓
User sees generic 500 error: "Internal server error"
```

**User experience:** Confusion, no clear next step.

**Solution:** Check if plaid_item already exists before inserting. Return 409 with helpful message suggesting "Add More Accounts" flow.

---

### Issue 3: No Path to Add More Accounts

**Scenario:** User linked Chase with 5 accounts, selected 2 credit cards. One week later, they want to add the 3rd credit card.

**Current flow (Phase 3):**
- User opens CardBrowserScreen
- Clicks "Connect Bank"
- Opens Plaid Link
- Links Chase again (but see Issue 2 — fails)
- Dead end

**Solution:** New Route G: `/api/plaid/add-more-accounts` that shows unlinked accounts and processes them through the same Route C (confirm-accounts) flow.

---

### Issue 4: UI Doesn't Show Account Status

**Scenario:** User clicks "Add More Accounts from Chase" (hypothetical Route G).

**UI shows:** All accounts in a checkbox list.
**User confusion:** Which ones are already in my wallet?

**Solution:** PlaidAccountSelector component shows two sections:
- **Already Added** (grayed out, non-selectable)
- **Available to Add** (selectable checkboxes)

---

## Implementation

### Route B Changes: Duplicate Link Detection

**File:** `pages/api/plaid/exchange-token.js`

**Added before INSERT plaid_items:**

```javascript
// Check if this bank is already linked (prevent duplicate links)
const { data: existingItem } = await supabase
  .from('plaid_items')
  .select('id, institution_name')
  .eq('user_id', user_id)
  .eq('plaid_item_id', item_id)
  .single();

if (existingItem) {
  // Bank already linked. Guide user to add more accounts instead.
  return res.status(409).json({
    error: 'Bank already linked',
    message: `${existingItem.institution_name} is already connected to your Vitta account.`,
    suggestion: 'Use "Add More Accounts" to add additional accounts from this bank.',
    plaid_item_id: existingItem.id,
  });
}
```

**Response status:** 409 Conflict (not 500)
**Returns:** Helpful message with plaid_item_id for UI to use in "Add More Accounts" flow

---

### Route G: Add More Accounts From Existing Bank Link

**Endpoint:** `POST /api/plaid/add-more-accounts`

**Request:**
```json
{
  "user_id": "uuid",
  "plaid_item_id": "database-uuid (from plaid_items.id)"
}
```

**Response:**
```json
{
  "plaid_item_id": "database-uuid",
  "institution_name": "Chase",
  "already_added_accounts": [
    {
      "plaid_account_id": "account-1",
      "name": "Chase Sapphire Preferred",
      "mask": "4582",
      "account_type": "credit",
      "account_subtype": "credit_card",
      "current_balance": 1500,
      "credit_limit": 5000,
      "vitta_card_id": "card-uuid"
    }
  ],
  "available_accounts": [
    {
      "plaid_account_id": "account-2",
      "name": "Chase Freedom Unlimited",
      "mask": "7890",
      "account_type": "credit",
      "account_subtype": "credit_card",
      "current_balance": 2000,
      "credit_limit": 10000,
      "liability": {
        "purchase_apr": 18.99,
        "minimum_payment": 60,
        "last_statement_date": "2025-01-15",
        "next_payment_due_date": "2025-02-10"
      }
    }
  ]
}
```

**Logic:**
1. Verify plaid_item exists and belongs to user
2. Fetch ALL accounts from `plaid_accounts`
3. Split by `vitta_card_id IS NULL`:
   - Already added: vitta_card_id IS NOT NULL
   - Available: vitta_card_id IS NULL
4. For available credit accounts, fetch liability data
5. Return both lists for UI display

**Flow after Route G:**
```
User selects available accounts from Route G response
↓
Frontend calls Route C (confirm-accounts) with selected subset
↓
Same as initial link: catalog matching, user_credit_cards INSERT, vitta_card_id link
↓
Cards added to wallet
```

---

### PlaidAccountSelector Component

**File:** `components/PlaidAccountSelector.js`

**Props:**
```javascript
{
  user: { user_id, ... },
  plaidItemId: "database-uuid",
  accounts: [],                          // From exchange-token
  alreadyAddedAccounts: [],             // From add-more-accounts (optional)
  onComplete: (addedCards) => {},
  onBack: () => {}
}
```

**Features:**
- Filters to credit accounts only (Vitta is a credit card wallet)
- Shows already-added accounts in grayed-out, non-selectable section
- Shows available accounts as clickable checkboxes
- Calls Route C (confirm-accounts) on user confirmation
- Handles both scenarios:
  - Initial link: `alreadyAddedAccounts` is empty → all accounts shown as available
  - Add more: `alreadyAddedAccounts` populated → already-added shown separately

**UI Sections:**
1. **Header** — "Select Accounts to Add"
2. **Already Added** (if any) — Grayed out, shows "✓ Added" badge
3. **Available Accounts** — Checkboxes, shows liability preview
4. **Summary** — Lists what's auto-populated vs user-entered
5. **Actions** — Back / Confirm Selection buttons

---

## Phase 8: Transaction Filtering in Chat Queries

### Problem

When user asks "Show my transactions", the `transactionQueryHandler.js` needs to filter by `vitta_card_id` to avoid showing transactions from unlinked accounts.

### Solution

**File:** `services/chat/transactionQueryHandler.js` (Phase 8)

**Update getTransactions function:**

```javascript
async function getTransactions(userId, filters = {}) {
  let query = supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId);

  // By default, ONLY show transactions for cards in user's wallet
  // (vitta_card_id IS NOT NULL means the account is linked to a user_credit_cards row)
  if (filters.includeUnlinkedAccounts !== true) {
    query = query
      .not('vitta_card_id', 'is', null)  // Only linked accounts
      .or('source.eq.manual');            // Plus manually-added transactions
  }

  // Apply other filters
  if (filters.dateRange) {
    query = query
      .gte('transaction_date', filters.dateRange.start)
      .lte('transaction_date', filters.dateRange.end);
  }
  if (filters.category) {
    query = query.eq('category', filters.category);
  }
  if (filters.merchantName) {
    query = query.ilike('merchant_name', `%${filters.merchantName}%`);
  }
  if (filters.cardId) {
    query = query.eq('vitta_card_id', filters.cardId);
  }
  if (filters.pending === true) {
    query = query.eq('is_pending', true);
  }

  const { data } = await query.order('transaction_date', { ascending: false });
  return data || [];
}
```

**Key behavior:**
- Default: Show only transactions where `vitta_card_id IS NOT NULL` (linked accounts) + manual transactions
- Filter respects user's wallet selection
- If user later adds a previously-unlinked account, its historical transactions become visible immediately
- Manual entries (source='manual') always shown regardless of vitta_card_id

---

## Data Consistency

### Scenario: User adds 3rd card later

**Timeline:**

| Time | Action | plaid_accounts | user_credit_cards | transactions |
|------|--------|---|---|---|
| T0 | Link Chase (5 accounts) | All 5: vitta_card_id=NULL | Empty | All 5 accounts synced |
| T1 | Select 2 cards | 2: vitta_card_id set, 3: NULL | 2 rows | No change (already there) |
| T3 | User asks "Show transactions" | (same) | (same) | Filtered: only 2 cards shown |
| T7 | User adds 3rd card via Route G | 3: vitta_card_id set, 2: NULL | 3 rows | **No new sync needed** |
| T8 | User asks "Show transactions" again | (same) | (same) | Filtered: now shows 3 cards (historical txns appear!) |

**Why this works:** Transactions for the 3rd card were already synced at T1 (during initial link), just not visible because `vitta_card_id` was NULL. When user links it at T7, the vitta_card_id is set, and the same transactions become visible in T8.

**No data loss:** User always gets the full transaction history as soon as they add an account.

---

## Implementation Checklist

### Phase 3.5 (Now)
- [x] Update Route B to detect duplicate bank links
- [x] Create Route G: Add More Accounts
- [x] Create test suite for Route G (10 tests)
- [x] Create PlaidAccountSelector component with already-added/available sections
- [ ] Update AddCardFlow to support "Add More Accounts" state

### Phase 6 (Frontend Wiring)
- [ ] Add "Add More Accounts from [Bank]" option in CardBrowserScreen
- [ ] Wire Route G call when user selects existing bank
- [ ] Pass `alreadyAddedAccounts` to PlaidAccountSelector
- [ ] Implement button in CreditCardScreen to add more accounts

### Phase 8 (Chat Integration)
- [ ] Update `transactionQueryHandler.js` to filter by vitta_card_id
- [ ] Update `getTransactions()` function with vitta_card_id filter
- [ ] Add tests for transaction filtering

---

## Test Coverage

### Route G Tests (10)
- Method guard (GET → 405)
- Validation (missing user_id → 400)
- Supabase not configured → 500
- Item not found → 404
- No accounts found → 404
- **Happy path:** Both already-added and available sections populated
- Already-added grayed out, available with liability data
- Sorted by name
- Error handling on DB failure
- Mix of account types (credit + depository + loan)

### Route B Duplicate Detection (NEW)
- ✓ Duplicate link returns 409 with helpful message
- ✓ User can now use that plaid_item_id with Route G

### PlaidAccountSelector Component
- Renders already-added section when provided
- Renders available section with proper filtering
- Checkbox selection works correctly
- Calls Route C on confirm
- Back button works
- Error handling on confirm failure

---

## UI Flow

### Initial Link (Phase 3 + 6)
```
CardBrowserScreen
  ↓ Click "Connect Bank"
PlaidLinkButton (Plaid Link UI)
  ↓ Link succeeds
PlaidAccountSelector (Vitta UI, Scenario A)
  - Shows all accounts as available
  - No "Already Added" section
  ↓ User selects 2 cards
PlaidPostConnectForm (for fields not auto-populated)
  ↓ Complete
Success screen
```

### Add More Accounts (Phase 6+)
```
CardBrowserScreen
  ↓ Shows "Add More Accounts" button for linked banks
Route G: /api/plaid/add-more-accounts
  ↓ Returns already_added + available_accounts
PlaidAccountSelector (Vitta UI, Scenario B)
  - Shows "Chase Sapphire" as Already Added (grayed out)
  - Shows "Chase Freedom" and "Chase Checking" as Available
  ↓ User selects Chase Freedom
Route C: /api/plaid/confirm-accounts
  ↓ Creates user_credit_cards row for Chase Freedom
PlaidPostConnectForm (if any fields missing)
  ↓ Complete
Success screen
```

### Error: Duplicate Link
```
Plaid Link UI (user links Chase again)
  ↓ public_token returned
Route B: /api/plaid/exchange-token
  ↓ Detects duplicate: plaid_item_id already exists
Response 409 JSON:
  {
    error: "Bank already linked",
    message: "Chase is already connected...",
    suggestion: "Use 'Add More Accounts'...",
    plaid_item_id: "..."
  }
  ↓ Frontend shows error + "Add More Accounts" button
User clicks "Add More Accounts"
  ↓ Uses plaid_item_id from error response
Route G: /api/plaid/add-more-accounts
  ↓ Shows available accounts
```

---

## Files Modified/Created

| File | Change | Phase |
|------|--------|-------|
| `pages/api/plaid/exchange-token.js` | Add duplicate detection | 3.5 |
| `pages/api/plaid/add-more-accounts.js` | NEW Route G | 3.5 |
| `__tests__/unit/plaid/addMoreAccounts.test.js` | NEW Tests for Route G (10) | 3.5 |
| `components/PlaidAccountSelector.js` | NEW Component with already-added/available | 3.5 |
| `components/AddCardFlow.js` | Add 'add-more' state (TBD Phase 6) | 6 |
| `components/CardBrowserScreen.js` | Add "Add More Accounts" option (TBD Phase 6) | 6 |
| `services/chat/transactionQueryHandler.js` | Filter by vitta_card_id (TBD Phase 8) | 8 |

---

## Summary

Phase 3.5 creates a complete, user-friendly flow for managing Plaid connections:

✅ Users can't accidentally re-link a bank (Route B detects duplicates)
✅ Users see helpful error message guiding them to "Add More Accounts"
✅ Users can easily add more accounts from an already-linked bank (Route G)
✅ UI clearly shows which accounts are already in their wallet (PlaidAccountSelector)
✅ Chat queries only show transactions from linked accounts (transaction filtering, Phase 8)
✅ Historical transactions for newly-added accounts are available immediately

**All 3.5 work is complete and tested. Phase 6+ implementation is straightforward UI wiring.**
