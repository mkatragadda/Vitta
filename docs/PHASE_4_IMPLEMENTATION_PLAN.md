# Phase 4: Plaid Webhook Handler — Detailed Implementation Plan

## Overview

**Phase 4** implements the webhook receiver endpoint that processes real-time updates from Plaid. When users make transactions or their account changes, Plaid sends webhooks to sync data automatically.

**Current Status:** Phases 1-3.5 complete
**Dependencies:** Phase 3 (all API routes), Phase 3.5 (Route G, syncService.js)
**Next:** Phase 5 (Category mapper)

---

## Scope: What Phase 4 Does

| Component | Purpose | Files |
|-----------|---------|-------|
| Webhook Handler | Receive & verify Plaid webhooks | `pages/api/plaid/webhooks.js` |
| Webhook Verification | HMAC-SHA256 signature validation | Built into handler |
| Event Logging | Store all webhook events for audit | Uses `plaid_webhook_events` table |
| Async Processing | Handle TRANSACTIONS_UPDATE + LIABILITY updates | Uses `syncService.js` |
| Tests | Comprehensive webhook scenarios | `__tests__/unit/plaid/webhooks.test.js` |

**What NOT in Phase 4:**
- Transaction categorization (Phase 5)
- Frontend webhook status UI (Phase 6+)
- Webhook retry logic (Backlog - future)

---

## Pre-Implementation Checklist

Before starting Phase 4, verify:

- [ ] Phase 3 complete: Routes A, B, C, E, F all implemented ✓
- [ ] Phase 3.5 complete: Route G, duplicate detection ✓
- [ ] `syncService.js` exists and tested ✓
- [ ] `plaidApi.js` wrapper exists ✓
- [ ] `encryption.js` utilities working ✓
- [ ] All environment variables set:
  - `PLAID_WEBHOOK_SECRET` (from Plaid dashboard)
  - `PLAID_ENCRYPTION_KEY` (for decrypting tokens)
  - `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV`
- [ ] `plaid_webhook_events` table exists in database (should be from schema)
- [ ] Dev server running on `http://localhost:3002`

---

## Detailed Implementation Steps

### Step 1: Understanding Webhook Signature Verification

**What is it?**
Plaid sends a cryptographic signature with each webhook to prove it came from Plaid, not a malicious actor.

**How it works:**
```
1. Plaid creates HMAC-SHA256 hash of the raw request body using PLAID_WEBHOOK_SECRET
2. Plaid sends this hash in the X-Plaid-Webhook-Signature header
3. Our server computes the same hash using the same secret
4. We compare: if they match, the webhook is authentic
```

**Why this matters:**
- Prevents fake webhooks from being processed
- Confirms data came from Plaid's servers
- Critical security control

**Example:**
```javascript
// Plaid's side (sends this)
const body = '{"webhook_type":"TRANSACTIONS","webhook_code":"TRANSACTIONS_UPDATE",...}';
const signature = HMAC-SHA256(body, PLAID_WEBHOOK_SECRET);
// Signature header: "signature1,signature2,signature3" (can send multiple)

// Our side (we verify)
const computedSig = HMAC-SHA256(body, PLAID_WEBHOOK_SECRET);
if (computedSig === incomingSignature) {
  console.log('✓ Valid webhook from Plaid');
} else {
  console.log('✗ Invalid webhook, could be fake');
}
```

### Step 2: Webhook Event Types

**What webhooks Plaid sends:**

```
TRANSACTIONS_UPDATE
  - New transactions detected
  - User made a purchase or payment
  - Plaid noticed new transaction data available
  - Action: Sync transactions using /transactions/sync

TRANSACTIONS_READY
  - Initial transaction sync completed
  - After user links account
  - Action: Sync transactions

ITEM_LOGIN_REQUIRED
  - User's bank credentials invalid
  - User changed password at bank
  - Action: Notify user to re-authenticate (not Phase 4)

ITEM_WEBHOOK_UPDATE_REQUIRED
  - User needs to re-authenticate
  - Consent expired
  - Action: Mark item as 'needs_update' in DB

ERROR
  - Something went wrong with the connection
  - Action: Log error, notify user

(Plus others we just log but don't process)
```

**For Phase 4, we handle:**
1. `TRANSACTIONS_UPDATE` / `TRANSACTIONS_READY` → Sync transactions + liabilities
2. `ITEM_WEBHOOK_UPDATE_REQUIRED` → Mark item as needs_update
3. All others → Log and mark completed (no action)

### Step 3: Webhook Request Structure

**What Plaid sends to our endpoint:**

```json
POST /api/plaid/webhooks

Headers:
  X-Plaid-Webhook-Signature: signature1,signature2

Body:
{
  "webhook_type": "TRANSACTIONS",
  "webhook_code": "TRANSACTIONS_UPDATE",
  "item_id": "item_123abc",           // Plaid's item ID (find in DB as plaid_item_id)
  "user_id": "user_456def",           // Plaid's user ID (we use our own user_id)
  "error": null,
  "new_transactions": 3,              // Number of new transactions
  "timestamp": "2026-02-01T10:30:00Z"
}
```

**Key fields:**
- `webhook_type`: The category (TRANSACTIONS, ITEM, etc.)
- `webhook_code`: Specific event (TRANSACTIONS_UPDATE, TRANSACTIONS_READY, etc.)
- `item_id`: Plaid's stable item ID → look up in `plaid_items` table
- `new_transactions`: How many new txns were added

### Step 4: Raw Body Reading (Important!)

**Why this matters:**
The signature verification MUST use the raw HTTP body, not parsed JSON.

```javascript
// WRONG ❌
app.post('/webhooks', (req, res) => {
  const { signature } = req.headers;
  const body = JSON.stringify(req.body);  // Re-serialized, might have different whitespace
  // Signature won't match!
});

// RIGHT ✓
app.use(express.raw({ type: 'application/json' }));  // Get raw buffer
app.post('/webhooks', (req, res) => {
  const { signature } = req.headers;
  const body = req.body;  // Raw buffer, identical to what Plaid sent
  const computedSig = crypto.createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  // Signature will match!
});
```

**Next.js API routes quirk:**
```javascript
// In pages/api/plaid/webhooks.js
export const config = {
  api: {
    bodyParser: false,  // Disable Next.js body parsing so we get raw body
  },
};

export default async function handler(req, res) {
  // Read raw body manually
  const body = await getRawBody(req);
  // body is Buffer, not JSON
  // ...signature verification...
}
```

---

## Phase 4 Implementation Steps (Detailed)

### Step 1: Create Raw Body Reader Utility

**File:** `utils/rawBody.js`

```javascript
/**
 * Read raw HTTP request body as Buffer
 * Needed for webhook signature verification
 */

export async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
```

**Why separate file:**
- Reusable if other endpoints need raw bodies
- Easy to test
- Keeps handler clean

### Step 2: Create Signature Verification Utility

**File:** `utils/webhookVerification.js`

```javascript
/**
 * Verify Plaid webhook signature
 * Uses HMAC-SHA256 with PLAID_WEBHOOK_SECRET
 */

const crypto = require('crypto');

function verifyWebhookSignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader) {
    return {
      valid: false,
      reason: 'No signature header provided'
    };
  }

  // Compute our own signature
  const computed = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  // Plaid sends multiple signatures separated by commas (for key rotation)
  const incomingSignatures = signatureHeader.split(',').map(s => s.trim());

  // Check if any match
  const matches = incomingSignatures.some(sig => sig === computed);

  return {
    valid: matches,
    reason: matches ? 'Valid' : 'Signature mismatch',
    computed,
    incoming: incomingSignatures
  };
}

module.exports = { verifyWebhookSignature };
```

**Why this approach:**
- Separated from handler for testing
- Can test signature logic in isolation
- Plaid can send multiple signatures (key rotation)

### Step 3: Create Webhook Handler

**File:** `pages/api/plaid/webhooks.js`

**Part A: Setup & Verification**

```javascript
/**
 * Plaid API Webhook Endpoint
 * POST /api/plaid/webhooks
 *
 * Receives webhooks from Plaid when:
 * - User makes a transaction
 * - Account data changes
 * - User needs to re-authenticate
 *
 * CRITICAL: Returns 200 immediately to acknowledge receipt.
 *           Processing happens asynchronously to avoid timeout.
 */

import { getSupabase, isSupabaseConfigured } from '../../../config/supabase';
import { getRawBody } from '../../../utils/rawBody';
import { verifyWebhookSignature } from '../../../utils/webhookVerification';
import { decryptToken } from '../../../utils/encryption';
import { plaidPost } from '../../../services/plaid/plaidApi';
import { syncTransactions } from '../../../services/plaid/syncService';

export const config = {
  api: {
    bodyParser: false,  // Read raw body for signature verification
  },
};

export default async function handler(req, res) {
  try {
    // 1. Read raw body (needed for signature verification)
    const rawBody = await getRawBody(req);
    const body = JSON.parse(rawBody);

    // 2. Verify signature
    const signatureHeader = req.headers['x-plaid-webhook-signature'];
    const secret = process.env.PLAID_WEBHOOK_SECRET;

    const verification = verifyWebhookSignature(rawBody, signatureHeader, secret);

    if (!verification.valid) {
      // Log invalid signature but still return 200 (Plaid retry is ok)
      console.warn('[plaid/webhooks] Invalid signature:', verification.reason);
    }

    // 3. Log webhook event (immediately, before async processing)
    const supabase = getSupabase();
    const { data: loggedEvent, error: logError } = await supabase
      .from('plaid_webhook_events')
      .insert([
        {
          plaid_item_id: body.item_id || null,
          event_type: body.webhook_code || null,
          webhook_type: body.webhook_type || null,
          error: body.error || null,
          payload: body,  // Full raw payload for debug
          signature_valid: verification.valid,
          verification_state: verification.valid ? 'verified' : 'failed',
          processing_status: 'pending',
          received_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (logError) {
      console.error('[plaid/webhooks] Failed to log event:', logError);
      // Don't fail the request if logging fails
    }

    // 4. Return 200 immediately
    // Plaid requires response within 10s or it retries
    res.status(200).json({});

    // 5. [Async] Process webhook if valid
    // Fire-and-forget pattern: don't await
    if (verification.valid && body.webhook_code) {
      setImmediate(async () => {
        await processWebhookAsync(body, loggedEvent?.id, supabase);
      });
    }

  } catch (error) {
    console.error('[plaid/webhooks] Error:', error);
    // Return 200 even on error (Plaid expects this)
    res.status(200).json({});
  }
}
```

**Part B: Async Processing Handler**

```javascript
async function processWebhookAsync(body, eventId, supabase) {
  try {
    const { webhook_code, item_id } = body;

    // Mark as processing
    await supabase
      .from('plaid_webhook_events')
      .update({ processing_status: 'processing' })
      .eq('id', eventId);

    // Route based on webhook type
    if (webhook_code === 'TRANSACTIONS_UPDATE' || webhook_code === 'TRANSACTIONS_READY') {
      await processTransactionsUpdate(item_id, supabase);
    } else if (webhook_code === 'ITEM_WEBHOOK_UPDATE_REQUIRED') {
      await processItemUpdateRequired(item_id, supabase);
    } else {
      // Log other webhook types but don't process
      console.log(`[plaid/webhooks] Unhandled webhook type: ${webhook_code}`);
    }

    // Mark as completed
    await supabase
      .from('plaid_webhook_events')
      .update({
        processing_status: 'completed',
        processed_at: new Date().toISOString(),
      })
      .eq('id', eventId);

    console.log(`[plaid/webhooks] Completed processing ${webhook_code}`);

  } catch (error) {
    console.error('[plaid/webhooks] Async processing failed:', error);

    // Mark as failed
    if (eventId) {
      await supabase
        .from('plaid_webhook_events')
        .update({
          processing_status: 'failed',
          processing_error: error.message,
        })
        .eq('id', eventId);
    }
  }
}
```

**Part C: Transaction Update Handler**

```javascript
async function processTransactionsUpdate(plaidItemId, supabase) {
  // 1. Look up plaid_items by plaid_item_id
  const { data: item, error: itemError } = await supabase
    .from('plaid_items')
    .select('id, user_id, access_token_enc, transactions_cursor')
    .eq('plaid_item_id', plaidItemId)
    .single();

  if (itemError || !item) {
    throw new Error(`Item not found: ${plaidItemId}`);
  }

  // 2. Decrypt access token
  const accessToken = decryptToken(item.access_token_enc);

  // 3. Sync transactions using syncService (handles cursor + pagination)
  await syncTransactions({
    accessToken,
    itemId: item.id,  // DB UUID, not Plaid item ID
    cursor: item.transactions_cursor || '',
    supabase,
  });

  // 4. Refresh liabilities
  const liabilitiesResult = await plaidPost(
    '/liabilities/get',
    { access_token: accessToken }
  );

  const creditLiabilities = liabilitiesResult.liabilities?.credit || [];

  // Upsert plaid_liabilities
  for (const liability of creditLiabilities) {
    const aprList = liability.aprs || [];

    await supabase
      .from('plaid_liabilities')
      .upsert(
        {
          plaid_item_id: item.id,
          plaid_account_id: liability.account_id,
          purchase_apr: aprList.find(a => a.apr_type === 'purchase')?.apr_percentage || null,
          cash_advance_apr: aprList.find(a => a.apr_type === 'cash_advance')?.apr_percentage || null,
          balance_transfer_apr: aprList.find(a => a.apr_type === 'balance_transfer')?.apr_percentage || null,
          minimum_payment_amount: liability.minimum_payment_amount || null,
          last_payment_amount: liability.last_payment_amount || null,
          last_payment_date: liability.last_payment_date || null,
          last_statement_balance: liability.last_statement_balance || null,
          last_statement_date: liability.last_statement_date || null,
          next_payment_due_date: liability.next_payment_due_date || null,
          apr_list: aprList,
          raw_liability: liability,
        },
        { onConflict: 'plaid_item_id,plaid_account_id' }
      );
  }

  // 5. Update user_credit_cards with new liability data
  const { data: creditCards } = await supabase
    .from('user_credit_cards')
    .select('id, plaid_account_id')
    .eq('user_id', item.user_id);

  for (const card of creditCards || []) {
    const liability = creditLiabilities.find(
      l => l.account_id === card.plaid_account_id
    );

    if (liability) {
      await supabase
        .from('user_credit_cards')
        .update({
          apr: liability.aprs?.find(a => a.apr_type === 'purchase')?.apr_percentage || 0,
          amount_to_pay: liability.minimum_payment_amount || 0,
        })
        .eq('id', card.id);
    }
  }

  console.log(`[plaid/webhooks] Synced transactions for item ${item.id}`);
}
```

**Part D: Item Update Required Handler**

```javascript
async function processItemUpdateRequired(plaidItemId, supabase) {
  // Mark item as needing re-authentication
  const { error } = await supabase
    .from('plaid_items')
    .update({ status: 'needs_update' })
    .eq('plaid_item_id', plaidItemId);

  if (error) {
    throw new Error(`Failed to update item status: ${error.message}`);
  }

  console.log(`[plaid/webhooks] Marked item as needs_update: ${plaidItemId}`);
}
```

### Step 4: Create Test Suite

**File:** `__tests__/unit/plaid/webhooks.test.js`

```javascript
/**
 * Tests for Webhook Handler (Route D)
 * POST /api/plaid/webhooks
 */

import handler from '../../../pages/api/plaid/webhooks';
import crypto from 'crypto';

jest.mock('../../../config/supabase');
jest.mock('../../../utils/encryption');
jest.mock('../../../services/plaid/plaidApi');
jest.mock('../../../services/plaid/syncService');

describe('POST /api/plaid/webhooks', () => {
  // See detailed test plan below
});
```

### Step 5: Environment & Configuration

**Required env variables (add to `.env.local`):**

```bash
# Get PLAID_WEBHOOK_SECRET from Plaid dashboard
# Dashboard → Webhooks section → Copy secret
PLAID_WEBHOOK_SECRET=whsec_test_abc123def456...

# These should already be set
PLAID_CLIENT_ID=client_abc123
PLAID_SECRET=secret_abc123
PLAID_ENV=sandbox
```

**Update webhook URL in Plaid dashboard:**
- Go to Plaid Dashboard → Your App → Settings
- Webhooks section → Add webhook
- URL: `https://your-app.com/api/plaid/webhooks`
- For local testing: Use ngrok or Plaid's webhook simulator

### Step 6: Testing Webhook Receipt

**Option A: Plaid Dashboard Simulator**
```
1. Go to Plaid Dashboard
2. Select your app
3. Webhooks section → Test webhook
4. Choose event type: TRANSACTIONS_UPDATE
5. Select test item
6. Click Send
7. Check server logs: should see "[plaid/webhooks] Completed processing TRANSACTIONS_UPDATE"
```

**Option B: Local Testing with ngrok**
```bash
# In terminal 1: Start ngrok
ngrok http 3002

# Copy ngrok URL: https://xxxx-xx-xxx-xxx.ngrok.io

# In Plaid Dashboard:
# Webhooks URL: https://xxxx-xx-xxx-xxx.ngrok.io/api/plaid/webhooks

# In terminal 2: Watch logs
tail -f logs/plaid.log

# In terminal 3: Send test webhook
curl -X POST http://localhost:3002/api/plaid/webhooks \
  -H "Content-Type: application/json" \
  -H "X-Plaid-Webhook-Signature: test-signature" \
  -d '{
    "webhook_type": "TRANSACTIONS",
    "webhook_code": "TRANSACTIONS_UPDATE",
    "item_id": "item_123",
    "user_id": "user_123",
    "new_transactions": 5
  }'
```

**Option C: Programmatic Testing (Recommended)**
```javascript
// Test script to generate valid webhook signature
const crypto = require('crypto');

const secret = process.env.PLAID_WEBHOOK_SECRET;
const payload = {
  webhook_type: 'TRANSACTIONS',
  webhook_code: 'TRANSACTIONS_UPDATE',
  item_id: 'item_test_123',
  user_id: 'user_test_123',
};

const body = JSON.stringify(payload);
const signature = crypto
  .createHmac('sha256', secret)
  .update(body)
  .digest('hex');

console.log(`Signature: ${signature}`);
console.log(`Curl command:`);
console.log(`curl -X POST http://localhost:3002/api/plaid/webhooks \\
  -H "Content-Type: application/json" \\
  -H "X-Plaid-Webhook-Signature: ${signature}" \\
  -d '${body}'`);
```

---

## Test Plan Details

### Test Categories

**1. Signature Verification (5 tests)**
- Valid signature → accepted
- Invalid signature → logged but processed (important: still return 200)
- Missing signature → invalid
- Multiple signatures (Plaid sends comma-separated) → match any one
- Signature mismatch → marked as failed

**2. Webhook Event Logging (4 tests)**
- Event logged immediately with payload
- Signature_valid flag set correctly
- Processing_status starts as 'pending'
- Timestamp recorded

**3. Response Handling (2 tests)**
- Always returns 200 (even on errors)
- Response returned before async processing starts

**4. TRANSACTIONS_UPDATE Processing (6 tests)**
- Item lookup by plaid_item_id
- Access token decryption
- syncTransactions called with correct params
- Liabilities fetched and upserted
- user_credit_cards updated with new APR/min payment
- Processing marked as 'completed'

**5. ITEM_WEBHOOK_UPDATE_REQUIRED Processing (2 tests)**
- Item status updated to 'needs_update'
- Event marked as 'completed'

**6. Unhandled Webhook Types (1 test)**
- Logged but no action taken
- Marked as 'completed'

**7. Error Handling (3 tests)**
- If item not found → error logged, event marked 'failed'
- If sync fails → error logged, event marked 'failed'
- If signature verification fails → event marked 'failed', still return 200

**8. Integration Scenarios (4 tests)**
- Full flow: Valid signature → Process transactions → Upsert liabilities → Update cards
- Webhook with no new transactions
- Webhook for item with no linked credit cards
- Multiple webhooks in rapid succession (concurrency)

**Total: 27 test cases**

---

## Implementation Order

```
1. [ ] Create utils/rawBody.js
2. [ ] Create utils/webhookVerification.js
3. [ ] Create pages/api/plaid/webhooks.js (4 parts: handler + 3 processing functions)
4. [ ] Create __tests__/unit/plaid/webhooks.test.js (27 tests)
5. [ ] Update .env.local with PLAID_WEBHOOK_SECRET
6. [ ] Run tests: npm test -- __tests__/unit/plaid/webhooks.test.js
7. [ ] Manual testing: Plaid sandbox simulator or ngrok
8. [ ] Verify no regressions: npm test (full suite)
9. [ ] Build verification: npm run build
```

---

## Verification Checklist

Before marking Phase 4 complete:

- [ ] All 27 webhook tests passing
- [ ] No test regressions from earlier phases (all 159 Plaid tests still passing)
- [ ] Build succeeds: `npm run build`
- [ ] Manual webhook received and processed successfully
- [ ] Transactions appear in database after webhook
- [ ] Liabilities updated after webhook
- [ ] User credit cards APR updated after webhook
- [ ] Error handling tested (webhook with invalid item_id, etc.)
- [ ] Webhook events logged in `plaid_webhook_events` table
- [ ] Both signature verification and processing async patterns working

---

## Dependencies & Reusability

**Phase 4 Uses:**
- ✅ `syncService.js` (Phase 3) — for transaction syncing
- ✅ `plaidApi.js` (Phase 3) — for /liabilities/get call
- ✅ `encryption.js` (Phase 2) — for decrypting tokens
- ✅ `plaid_webhook_events` table (Phase 1) — for event logging

**Imported by:**
- Phase 5: Category mapper can filter transactions by source='plaid'
- Phase 6: Frontend can show webhook status/health
- Phase 8: Chat can mention when last sync occurred

---

## Key Design Decisions

1. **Return 200 immediately** — Plaid times out after 10s, so we ack and process async
2. **Log all webhooks** — Even failed ones, for audit trail and debugging
3. **Graceful degradation** — If sync fails, log error but don't crash
4. **Reuse syncService** — Same sync logic as Route F, DRY principle
5. **Decrypt on-demand** — Only decrypt token when needed, not on webhook receipt
6. **Update liabilities too** — Webhook is chance to update APR, min payment, dates

---

## File Manifest

| File | Type | Lines | Purpose |
|------|------|-------|---------|
| `utils/rawBody.js` | Utility | ~25 | Read raw HTTP body |
| `utils/webhookVerification.js` | Utility | ~35 | HMAC signature verification |
| `pages/api/plaid/webhooks.js` | API Route | ~200 | Main webhook handler + processors |
| `__tests__/unit/plaid/webhooks.test.js` | Tests | ~400 | 27 test cases |

**Total new code: ~660 lines (including tests)**

---

## What Happens After Phase 4

**Phase 5 (Category Mapper):**
- Add categorization to synced transactions
- Fill in `category` and `category_confidence` fields

**Phase 6 (Frontend Wiring):**
- Add refresh button to UI
- Show webhook status/sync time
- Wire up all Plaid screens

**Phase 8 (Chat Integration):**
- "Show my recent transactions" queries use synced data
- Mention when account was last updated

---

## Estimated Effort

- **Implementation:** 2-3 hours (handler + utilities)
- **Testing:** 2 hours (27 test cases)
- **Manual testing:** 30 minutes (simulator + ngrok)
- **Documentation:** 1 hour
- **Total: 5.5-7 hours**

---

Ready to implement Phase 4? Confirm and I'll start with Step 1! 🚀
