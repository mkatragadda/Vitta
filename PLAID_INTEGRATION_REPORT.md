# Plaid Integration Report
**Generated:** February 7, 2026
**Project:** Vitta - Agentic Wallet Platform
**Status:** Production Implementation

---

## Executive Summary

The Vitta application has implemented a comprehensive Plaid integration that enables:
- **Bank account linking** via Plaid Link UI
- **Real-time transaction synchronization** using cursor-based incremental sync
- **Liability tracking** for credit cards (APR, minimum payments, statement dates)
- **Transaction categorization** mapping Plaid categories to Vitta's standardized categories
- **Webhook support** for real-time transaction and liability updates

This integration bridges financial institution data with Vitta's agentic wallet platform, enabling autonomous payment optimization and intelligent transaction analytics.

---

## Architecture Overview

### Core Components

#### 1. **Frontend Components** (`/components/`)
- **PlaidLinkButton.js** - Initializes Plaid Link SDK, exchanges tokens, handles errors
- **PlaidAccountSelector.js** - Allows users to select which accounts to link
- **AddCardFlow.js** - Orchestrates the bank linking flow within card addition workflow

#### 2. **Backend Services** (`/services/plaid/`)
- **plaidApi.js** - HTTP wrapper for Plaid API calls (shared authentication layer)
- **plaidService.js** - High-level query layer for transactions, spending summaries, liabilities
- **syncService.js** - Cursor-based incremental transaction synchronization engine
- **categoryMapper.js** - Maps Plaid's 100+ categories to Vitta's 14 standardized categories
- **catalogMatcher.js** - Matches Plaid account metadata to Vitta card catalog

#### 3. **API Routes** (`/pages/api/plaid/`)
- **create-link-token.js** - Generates Plaid Link token for frontend
- **exchange-token.js** - Exchanges public token for access token, triggers initial sync
- **confirm-accounts.js** - User confirms which accounts to link as credit cards
- **accounts.js** - Fetches user's linked accounts from Plaid
- **add-more-accounts.js** - Allows adding more accounts after initial linking
- **refresh.js** - Manual transaction refresh endpoint
- **webhooks.js** - Handles Plaid webhooks (TRANSACTIONS_UPDATE, ITEM_LOGIN_REQUIRED, etc.)

#### 4. **Database Schema** (`/supabase/schema.sql`)
Key tables:
- `user_credit_cards` - User's Vitta card entries (linked to Plaid accounts)
- `plaid_items` - Plaid items (bank institutions) linked to user
- `plaid_accounts` - Individual accounts within Plaid items
- `plaid_liabilities` - Credit card liability data (APR, minimums)
- `transactions` - Transaction records (synced from Plaid or manual entry)
- `intent_embeddings` - Vector embeddings for chat intent detection

---

## Implementation Details

### User Flow: Linking a Bank Account

```
1. User clicks "Connect Bank Account" → PlaidLinkButton.js
2. Component fetches link token via /api/plaid/create-link-token
3. Plaid Link UI opens (browser-side Plaid SDK)
4. User authenticates with their bank
5. On success, public_token is exchanged at /api/plaid/exchange-token
6. Backend exchanges token for access_token (kept encrypted, server-side only)
7. Initial transaction sync starts automatically
8. User selects which accounts to link as credit cards
9. Cards are saved to user_credit_cards table with Plaid references
```

### Transaction Synchronization

**Approach:** Cursor-based incremental sync (recommended by Plaid over legacy /transactions/get)

**Process:**
```
1. Initial sync: cursor = '' (fetches full transaction history)
2. Plaid returns:
   - added[] - New transactions
   - modified[] - Updated transactions
   - removed[] - Deleted transaction IDs
   - has_more - More batches to fetch
   - next_cursor - Cursor for next batch
3. Upsert added/modified into transactions table
4. Delete removed transactions
5. Persist next_cursor in plaid_items.transactions_cursor
6. Repeat with next_cursor until has_more = false
```

**Integration Points:**
- Triggered by: Token exchange, webhook events, manual refresh
- Handled by: `services/plaid/syncService.js`
- Stored in: `transactions` table with Plaid metadata

### Category Mapping

**Mapping Strategy:** Plaid's detailed categories → Vitta's 14 core categories

**Vitta Categories:**
```
- groceries
- dining
- gas
- transit
- travel
- entertainment
- streaming
- drugstores
- home_improvement
- department_stores
- utilities
- insurance
- default (unmapped)
```

**Example Mappings:**
- Plaid: "Food and Drink > Groceries" → Vitta: "groceries"
- Plaid: "Food and Drink > Restaurants" → Vitta: "dining"
- Plaid: "Transportation > Gas Stations" → Vitta: "gas"
- Plaid: "Entertainment > Movies and DVDs" → Vitta: "entertainment"

### Liability Data

**Purpose:** Track credit card APR, minimum payments, statement cycles

**Data Retrieved:**
- `purchase_apr` - Interest rate on purchases
- `cash_advance_apr` - Interest rate on cash advances
- `minimum_payment` - Minimum monthly payment due
- `statement_dates` - Billing cycle information
- `last_payment_date` - When last payment was received

**Query Path:**
```
user_credit_cards (vitta_card_id)
  → plaid_accounts (vitta_card_id)
    → plaid_liabilities (plaid_item_id, plaid_account_id)
```

---

## API Routes Reference

### POST /api/plaid/create-link-token
**Purpose:** Generate a link token for Plaid Link UI initialization

**Request:**
```json
{
  "user_id": "uuid"
}
```

**Response:**
```json
{
  "link_token": "link-sandbox-xxx",
  "env": "sandbox|production"
}
```

**Implementation Details:**
- Fetches from `NEXT_PUBLIC_PLAID_CLIENT_ID`, `PLAID_SECRET` (env vars)
- Accepts redirected_from param for post-link flow
- Sets `user_id` as client_user_id in Plaid for correlation

### POST /api/plaid/exchange-token
**Purpose:** Exchange public token for access token, persist in DB, trigger initial sync

**Request:**
```json
{
  "public_token": "public-sandbox-xxx",
  "user_id": "uuid"
}
```

**Response:**
```json
{
  "plaid_item_id": "uuid",
  "accounts": [
    {
      "plaid_account_id": "xxx",
      "name": "Chase Checking",
      "type": "depository",
      "subtype": "checking",
      "balance": 5000
    }
  ]
}
```

**Key Steps:**
1. Exchange public token for access token via Plaid API
2. Encrypt and store access token in `plaid_items`
3. Create `plaid_item` record in database
4. Fetch accounts list from Plaid /accounts/get
5. Insert accounts into `plaid_accounts` table
6. Trigger async transaction sync

### POST /api/plaid/confirm-accounts
**Purpose:** User selects which accounts to link as credit cards

**Request:**
```json
{
  "user_id": "uuid",
  "plaid_item_id": "uuid",
  "selectedAccounts": [
    {
      "plaid_account_id": "xxx",
      "displayName": "Chase Sapphire Preferred"
    }
  ]
}
```

**Response:**
```json
{
  "createdCards": [
    {
      "vitta_card_id": "uuid",
      "cardName": "Chase Sapphire",
      "plaidAccountId": "xxx"
    }
  ]
}
```

### POST /api/plaid/add-more-accounts
**Purpose:** Add additional accounts after initial linking

**Request:**
```json
{
  "user_id": "uuid",
  "plaid_item_id": "uuid",
  "selectedAccounts": [...]
}
```

### GET /api/plaid/refresh
**Purpose:** Manual refresh of transactions for all user's Plaid items

**Query Params:**
- `user_id` - User UUID

**Response:**
```json
{
  "itemsSynced": 2,
  "transactionsAdded": 45,
  "transactionsModified": 8,
  "transactionsRemoved": 2
}
```

### POST /api/plaid/webhooks
**Purpose:** Handle Plaid webhook events

**Supported Events:**
- `TRANSACTIONS_UPDATE` - New/updated transactions available
- `ITEM_LOGIN_REQUIRED` - User needs to re-authenticate
- `WEBHOOK_VERIFICATION_FAILED` - Failed verification
- `RECURRING_TRANSACTIONS_UPDATE` - Recurring patterns detected

**Security:**
- Validates webhook signature using `PLAID_WEBHOOK_SECRET`
- Verifies webhook_verification_key from Plaid
- Only processes legitimate events

---

## Data Flow: Chat Integration

### Query Example: "What did I spend on groceries this month?"

```
1. User message → Chat UI
2. Intent detection (chat/conversationEngineV2.js)
   ├─ Classify intent: "query_spending_by_category"
   └─ Extract entities: { category: "groceries", period: "this_month" }
3. Route to handler (services/chat/cardDataQueryHandler.js)
4. Call plaidService.getTransactions(userId, {
     category: "groceries",
     dateRange: { start: "2025-02-01", end: "2025-02-28" }
   })
5. Return matching transactions
6. Format response with spending breakdown
7. Display to user with recommendations
```

### Query Example: "What's my best card for Amazon purchases?"

```
1. Intent: "best_card_for_merchant"
2. Extract: { merchantName: "Amazon", category: "shopping" }
3. Get user's cards → services/cardService.js
4. For each card, fetch liability → plaidService.getLiabilityByCardId()
5. Analyze:
   - Which card still in grace period
   - Reward rates for the merchant category
   - Current balance utilization
6. Recommend optimal card with APR/reward explanation
```

---

## Key Services & Functions

### plaidService.js - Query Layer

#### `getTransactions(userId, filters)`
```javascript
// Get spending by category, date range, merchant
// Returns: Array of transaction objects
// Key feature: Filters to user's linked cards by default
```

#### `getSpendingSummary(userId, period)`
```javascript
// Returns: {
//   total: number,
//   byCategory: { category: amount },
//   byCard: { cardName: amount },
//   transactionCount: number
// }
// Periods: 'today', 'this_week', 'this_month', 'last_month'
```

#### `getLiabilityByCardId(vittaCardId)`
```javascript
// Returns: {
//   purchase_apr: 22.5,
//   cash_advance_apr: 25.0,
//   minimum_payment: 150,
//   ...
// }
// Returns null if card has no Plaid data (manual entry)
```

### syncService.js - Transaction Sync

#### `syncTransactions({ accessToken, itemId, cursor, supabase, signal })`
```javascript
// Cursor-based incremental sync
// Handles added/modified/removed transactions
// Persists cursor for next sync
// Returns: { cursor: string, transactionCount: number }
```

### categoryMapper.js - Category Mapping

#### `mapPlaidCategory(plaidCategory)`
```javascript
// Maps Plaid's detailed category to Vitta's 14 categories
// Falls back to 'default' if no match
// Returns: string (vitta category name)
```

---

## Security Considerations

### Token Management
- **Plaid Access Tokens:** Encrypted at rest in database using `crypto.encrypt()`
- **Decryption:** Only at request time in API routes
- **No Client-Side:** Access tokens never exposed to frontend
- **Rotation:** Not currently implemented (consider for future)

### Data Access
- **User Isolation:** All queries filtered by user_id
- **Cross-User Access:** Prevented by Supabase RLS policies
- **Webhook Verification:** Signature validation on all webhook requests

### Environment Variables
```
NEXT_PUBLIC_PLAID_CLIENT_ID=xxx (public, safe)
PLAID_SECRET=sk-xxx (private, server-side only)
PLAID_WEBHOOK_SECRET=whsec-xxx (for webhook verification)
```

### Privacy
- Transactions limited to user's linked accounts by default
- No data sharing with third parties
- Minimal Plaid data exposure (only IDs and aggregated summaries)

---

## Testing Coverage

### Unit Tests (`/__tests__/unit/plaid/`)
- **plaidService.test.js** - Transaction queries and spending summaries
- **categoryMapper.test.js** - Category mapping logic
- **catalogMatcher.test.js** - Account type matching
- **plaidLinkButton.logic.test.js** - Token exchange flow
- **webhooks.test.js** - Webhook verification and processing
- **plaidSchemaValidation.test.js** - Database schema validation

### Integration Tests
- **AddCardFlow.plaid.test.js** - Full card linking flow
- **addMoreAccounts.test.js** - Additional account linking

### Test Coverage
- Transaction sync with cursor pagination
- Category mapping for all 100+ Plaid categories
- Webhook event processing
- Error handling and recovery
- User isolation and data filtering

---

## Known Limitations & Future Improvements

### Current Limitations
1. **No Token Rotation:** Plaid access tokens don't auto-rotate
2. **No Webhook Retry:** Failed webhook processing isn't retried
3. **Manual Refresh Only:** No automatic daily sync schedule (uses webhooks + manual)
4. **Category Mapping:** Some niche Plaid categories may map to 'default'
5. **No ACH/Wire Support:** Limited to consumer account types

### Planned Improvements
1. **Implement Token Rotation:** Auto-rotate access tokens quarterly
2. **Webhook Retry Logic:** Queue failed events for retry
3. **Scheduled Sync:** Daily background sync for webhook failures
4. **Extend Categories:** Add more Vitta-specific categories based on usage
5. **Account Type Support:** Add checking/savings account types for transfers

---

## Troubleshooting Guide

### Common Issues

**"Link token creation failed"**
- Verify `NEXT_PUBLIC_PLAID_CLIENT_ID` and `PLAID_SECRET` in `.env.local`
- Check Plaid dashboard for API status
- Ensure API key has correct permissions

**"Token exchange failed"**
- Public token may have expired (5 min timeout)
- Verify Plaid secret is correct
- Check Supabase connectivity

**"No transactions synced"**
- Verify webhook is receiving events (check Plaid dashboard)
- Check `transactions_cursor` in plaid_items table
- Manually trigger `/api/plaid/refresh` endpoint
- Review Plaid transaction history in test bank

**"Webhook signature verification failed"**
- Verify `PLAID_WEBHOOK_SECRET` matches Plaid dashboard
- Check webhook request body isn't modified in transit
- Ensure timestamp is within 5 minute window

---

## Development Workflow

### Adding a New Plaid Query

1. Add query function to `services/plaid/plaidService.js`
2. Document with JSDoc comments (example params)
3. Add unit test in `__tests__/unit/plaid/`
4. Export from module
5. Import in chat handler or component
6. Test in development environment

### Handling New Transaction Categories

1. Add mapping to `categoryMapper.js`
2. Update category list in CLAUDE.md
3. Run category mapper tests
4. Test with real bank data

### Deploying Webhook Handler

1. Deploy code to production
2. Update webhook URL in Plaid dashboard
3. Re-verify webhook endpoint
4. Monitor webhook logs in Plaid dashboard
5. Test with test event

---

## Performance Considerations

### Transaction Sync
- **Batch Size:** Plaid returns ~100 transactions per request
- **Cursor Persistence:** Enables efficient incremental syncs
- **Full History:** Initial sync can be slow for accounts with many transactions
- **Optimization:** Only sync linked accounts (filtered by vitta_card_id)

### Query Performance
- **Indexes:** Ensure indexes on user_id, transaction_date, category
- **Filtering:** Push date/category filters to database
- **Caching:** Consider caching spending summaries (24hr TTL)

### Database
- **Transactions Table:** Expect 100-500+ rows per user
- **Plaid Items:** Typically 1-3 per user
- **Plaid Accounts:** 2-5 per item

---

## Configuration Files

### Environment Variables
```bash
NEXT_PUBLIC_PLAID_CLIENT_ID=xxx
PLAID_SECRET=sk-xxx
PLAID_WEBHOOK_SECRET=whsec-xxx
PLAID_ENV=sandbox|production
```

### Database Schema
See `supabase/schema.sql` for:
- `plaid_items` - Linked bank institutions
- `plaid_accounts` - Individual accounts
- `plaid_liabilities` - Credit card details
- `transactions` - Synced transactions

### Package Dependencies
Currently uses standard Plaid HTTP API (no SDK). Can add:
- `plaid` - Official Plaid Node SDK (future upgrade)

---

## References

- **Plaid API Docs:** https://plaid.com/docs/api/
- **Plaid Link SDK:** https://plaid.com/docs/link/
- **Categories:** https://plaid.com/docs/api/transactions/#personal_finance_category
- **Webhooks:** https://plaid.com/docs/api/webhooks/
- **Project Docs:** `/docs/` folder in repository

---

## Related Codebase Files

### Core Files
- `services/plaid/plaidService.js` - Main query layer (277 lines)
- `services/plaid/syncService.js` - Transaction sync engine
- `components/PlaidLinkButton.js` - Frontend linking component (257 lines)
- `pages/api/plaid/exchange-token.js` - Token exchange endpoint (9.7 KB)

### Integration Files
- `services/chat/cardDataQueryHandler.js` - Chat query routing
- `services/cardService.js` - Card management
- `components/AddCardFlow.js` - Card addition workflow
- `config/supabase.js` - Database configuration

### Testing
- `__tests__/unit/plaid/` - 6 test files
- `__tests__/integration/` - Integration tests

---

## Summary Statistics

| Metric | Value |
|--------|-------|
| **Frontend Components** | 3 |
| **Backend Services** | 4 |
| **API Routes** | 7 |
| **Test Files** | 6+ |
| **Database Tables** | 6+ |
| **Lines of Code (Core)** | 2,000+ |
| **Support Categories** | 14 |
| **Webhook Events** | 4+ |

---

**Last Updated:** February 6, 2026
**Current Status:** Production Ready
**Version:** 1.0 (Initial Release)
