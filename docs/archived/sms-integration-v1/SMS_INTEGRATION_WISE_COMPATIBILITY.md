# SMS Integration - WISE Compatibility Analysis

**Date:** 2026-05-17
**Status:** Updated Design

---

## Executive Summary

The SMS integration has been updated to use the existing `wise_recipients` table instead of `beneficiaries`. This ensures **zero changes** to the existing WISE integration and maintains consistency with the current QR code transfer flow.

---

## Key Changes from Original Design

### ❌ Original Design (INCORRECT)
- Used `beneficiaries` table (Chimoney-specific)
- Would have created parallel recipient management
- Potential data inconsistency between SMS and QR transfers

### ✅ Updated Design (CORRECT)
- Uses `wise_recipients` table (existing WISE infrastructure)
- Reuses existing recipient lookup logic
- Consistent with QR code transfer flow
- **Zero changes to existing WISE services**

---

## Table Comparison

### `beneficiaries` (Chimoney - NOT USED FOR SMS)

```sql
CREATE TABLE beneficiaries (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  name VARCHAR(255),
  phone VARCHAR(20),
  email VARCHAR(255),
  payment_method VARCHAR(50), -- 'upi' or 'bank_account'

  -- Encrypted fields
  upi_encrypted VARCHAR(500),
  account_encrypted VARCHAR(500),

  -- Chimoney-specific
  verification_status VARCHAR(50),
  relationship VARCHAR(100)
);
```

**Purpose:** Used for Chimoney international transfers (different payment provider)

---

### `wise_recipients` (WISE - USED FOR SMS) ✅

```sql
CREATE TABLE wise_recipients (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),

  -- WISE API IDs
  wise_account_id BIGINT UNIQUE NOT NULL,
  wise_profile_id BIGINT NOT NULL,

  -- Recipient Info
  account_holder_name VARCHAR(255) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  type VARCHAR(50) NOT NULL, -- 'indian_upi'

  -- UPI Details
  legal_type VARCHAR(50), -- 'PRIVATE' or 'BUSINESS'
  upi_id VARCHAR(255) NOT NULL,

  -- Business (optional)
  business_type VARCHAR(100),
  business_name VARCHAR(255),

  -- Status & Usage
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  total_transfers INT DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  -- API Response
  wise_api_response JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (user_id, upi_id, wise_profile_id)
);
```

**Purpose:** Stores WISE recipient accounts created via WISE API. Reusable across all WISE transfers (QR code, SMS, future integrations).

---

## Architecture: How SMS Uses Existing WISE Infrastructure

```
┌────────────────────────────────────────────────────────────┐
│                    SMS TRANSFER FLOW                        │
└────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌────────────────────────────────────────────────────────────┐
│  1. SMS Intent Parser                                      │
│     "Send $500 to mom"                                     │
│     → Extract: amount=$500, recipient="mom"                │
└────────────────┬───────────────────────────────────────────┘
                 │
                 ↓
┌────────────────────────────────────────────────────────────┐
│  2. Nickname → wise_recipients Lookup                      │
│     Query: wise_recipient_nicknames                        │
│     WHERE nickname = 'mom'                                 │
│     → Returns: wise_recipient_id                           │
└────────────────┬───────────────────────────────────────────┘
                 │
                 ↓
┌────────────────────────────────────────────────────────────┐
│  3. Get WISE Recipient Details                             │
│     Query: wise_recipients                                 │
│     WHERE id = wise_recipient_id                           │
│     → Returns: wise_account_id, upi_id, name              │
└────────────────┬───────────────────────────────────────────┘
                 │
                 ↓
┌────────────────────────────────────────────────────────────┐
│  4. Create WISE Quote (EXISTING SERVICE)                   │
│     wiseQuoteService.createQuote({                         │
│       sourceAmount: 500,                                   │
│       targetCurrency: 'INR',                               │
│       recipientId: wise_recipient.id                       │
│     })                                                     │
│     → NO CHANGES NEEDED                                    │
└────────────────┬───────────────────────────────────────────┘
                 │
                 ↓
┌────────────────────────────────────────────────────────────┐
│  5. Create Pending SMS Transfer                            │
│     pending_sms_transfers {                                │
│       wise_recipient_id: UUID,                             │
│       wise_quote_id: UUID,                                 │
│       ...                                                  │
│     }                                                      │
└────────────────┬───────────────────────────────────────────┘
                 │
                 ↓
┌────────────────────────────────────────────────────────────┐
│  6. Generate Token & Send SMS Link                         │
│     "👉 vitta.app/confirm/xYz9K"                           │
└────────────────┬───────────────────────────────────────────┘
                 │
                 ↓
┌────────────────────────────────────────────────────────────┐
│  7. Execute Transfer (EXISTING SERVICE)                    │
│     wiseOrchestrator.executeTransfer({                     │
│       quoteId: quote.id,                                   │
│       recipientId: wise_recipient.id,                      │
│       ...                                                  │
│     })                                                     │
│     → NO CHANGES NEEDED                                    │
└────────────────────────────────────────────────────────────┘
```

---

## Changes to SMS Database Schema

### UPDATED: `wise_recipient_nicknames` (NEW TABLE)

**Purpose:** Map friendly nicknames to wise_recipients for SMS

```sql
CREATE TABLE wise_recipient_nicknames (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  wise_recipient_id UUID REFERENCES wise_recipients(id) ON DELETE CASCADE NOT NULL,
  nickname VARCHAR(100) NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT nickname_not_empty CHECK (LENGTH(TRIM(nickname)) > 0),
  UNIQUE(user_id, nickname),
  UNIQUE(user_id, wise_recipient_id, nickname)
);

CREATE INDEX idx_wise_recipient_nicknames_user ON wise_recipient_nicknames(user_id);
CREATE INDEX idx_wise_recipient_nicknames_recipient ON wise_recipient_nicknames(wise_recipient_id);
```

**Renamed from:** `beneficiary_nicknames` (in original design)

---

### UPDATED: `pending_sms_transfers`

**Changed Field:**
```sql
-- ❌ OLD (original design):
beneficiary_id UUID REFERENCES beneficiaries(id)

-- ✅ NEW (corrected):
wise_recipient_id UUID REFERENCES wise_recipients(id) NOT NULL
```

**Full Table:**
```sql
CREATE TABLE pending_sms_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  conversation_id UUID REFERENCES sms_conversations(id),

  -- ✅ CHANGED: Use wise_recipients instead of beneficiaries
  wise_recipient_id UUID REFERENCES wise_recipients(id) NOT NULL,

  -- Transfer details
  source_amount DECIMAL(12, 2) NOT NULL,
  source_currency VARCHAR(3) DEFAULT 'USD',
  target_amount DECIMAL(12, 2),
  target_currency VARCHAR(3),
  exchange_rate DECIMAL(12, 6),

  -- ✅ UNCHANGED: Already using wise_quotes
  wise_quote_id UUID REFERENCES wise_quotes(id),
  quote_expires_at TIMESTAMPTZ,

  raw_message TEXT NOT NULL,
  parsed_intent JSONB,
  status VARCHAR(50) DEFAULT 'pending',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '15 minutes'),
  confirmed_at TIMESTAMPTZ,

  -- ✅ UNCHANGED: Already using wise_transfers
  completed_transfer_id UUID REFERENCES wise_transfers(id),

  CONSTRAINT valid_status CHECK (
    status IN ('pending', 'confirmed', 'expired', 'cancelled', 'failed')
  ),
  CONSTRAINT valid_amount CHECK (source_amount > 0),
  CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);
```

---

## NO CHANGES Required to Existing WISE Services ✅

### 1. `wiseQuoteService.js` - **NO CHANGES**

```javascript
// Already accepts recipientId parameter
async createQuote({ sourceAmount, recipientId, userId }) {
  // Works with both:
  // - QR code flow (wise_recipient from upi_scans)
  // - SMS flow (wise_recipient from nickname lookup)
  // NO CHANGES NEEDED
}
```

---

### 2. `wiseRecipientService.js` - **NO CHANGES**

```javascript
// Already handles recipient lookup and creation
async getOrCreateRecipient({ userId, upiId, accountHolderName }) {
  // 1. Check if recipient exists
  const existing = await this.findByUpiId(userId, upiId);
  if (existing) return existing;

  // 2. Create new recipient via WISE API
  const wiseRecipient = await this.createWiseRecipient({
    upiId,
    accountHolderName
  });

  // 3. Save to wise_recipients table
  return this.saveRecipient(wiseRecipient);

  // NO CHANGES NEEDED - works for both QR and SMS
}
```

---

### 3. `wiseTransferService.js` - **NO CHANGES**

```javascript
// Already accepts recipientId from wise_recipients table
async createTransfer({ quoteId, recipientId, userId }) {
  // Expects recipientId from wise_recipients table
  // Works with SMS flow automatically
  // NO CHANGES NEEDED
}
```

---

### 4. `wiseOrchestrator.js` - **NO CHANGES**

```javascript
// Orchestrates the full transfer flow
async executeTransfer({ quoteId, recipientId, userId }) {
  // 1. Get quote
  const quote = await wiseQuoteService.getQuote(quoteId);

  // 2. Get recipient (from wise_recipients)
  const recipient = await wiseRecipientService.getRecipient(recipientId);

  // 3. Create transfer
  const transfer = await wiseTransferService.createTransfer({
    quoteId,
    recipientId,
    userId
  });

  // 4. Fund transfer
  const payment = await wisePaymentService.fundTransfer(transfer.id);

  return transfer;

  // NO CHANGES NEEDED - works for SMS automatically
}
```

---

## SMS-Specific Services (NEW)

### 1. `sms/recipientMatcher.js` (NEW)

```javascript
/**
 * Match SMS recipient string to wise_recipients via nicknames
 */
class RecipientMatcher {
  async matchRecipient(recipientStr, userId) {
    // 1. Try exact nickname match
    const byNickname = await supabase
      .from('wise_recipient_nicknames')
      .select('wise_recipient_id, wise_recipients(*)')
      .eq('user_id', userId)
      .ilike('nickname', recipientStr)
      .single();

    if (byNickname.data) {
      return {
        status: 'matched',
        recipient: byNickname.data.wise_recipients
      };
    }

    // 2. Try fuzzy name match on wise_recipients
    const byName = await supabase
      .from('wise_recipients')
      .select('*')
      .eq('user_id', userId)
      .ilike('account_holder_name', `%${recipientStr}%`);

    if (byName.data.length === 1) {
      return {
        status: 'matched',
        recipient: byName.data[0]
      };
    } else if (byName.data.length > 1) {
      return {
        status: 'multiple',
        matches: byName.data
      };
    }

    // 3. Not found
    return {
      status: 'not_found',
      suggestion: 'Add recipient in Vitta app first'
    };
  }
}
```

**Key Point:** Uses `wise_recipients` table, same as QR code flow

---

### 2. `sms/pendingTransferService.js` (UPDATED)

```javascript
class PendingTransferService {
  async createPendingTransfer({
    userId,
    phoneNumber,
    wiseRecipientId, // ✅ CHANGED: was beneficiaryId
    sourceAmount,
    rawMessage
  }) {
    // Get wise_recipient details
    const { data: wiseRecipient } = await supabase
      .from('wise_recipients')
      .select('*')
      .eq('id', wiseRecipientId)
      .single();

    // Create WISE quote using EXISTING service
    const quote = await wiseQuoteService.createQuote({
      userId,
      sourceAmount,
      sourceCurrency: 'USD',
      targetCurrency: wiseRecipient.currency,
      recipientId: wiseRecipient.id // ✅ Uses wise_recipients.id
    });

    // Save pending transfer
    const pendingTransfer = await supabase
      .from('pending_sms_transfers')
      .insert({
        user_id: userId,
        phone_number: phoneNumber,
        wise_recipient_id: wiseRecipientId, // ✅ CHANGED field name
        source_amount: sourceAmount,
        target_amount: quote.target_amount,
        target_currency: quote.target_currency,
        exchange_rate: quote.rate,
        wise_quote_id: quote.id,
        quote_expires_at: quote.expiresAt,
        raw_message: rawMessage,
        status: 'pending'
      })
      .select()
      .single();

    return pendingTransfer;
  }

  async executeTransfer(pendingTransferId) {
    const transfer = await this.getPendingTransfer(pendingTransferId);

    // Execute via EXISTING WISE orchestrator (NO CHANGES)
    const wiseTransfer = await wiseOrchestrator.executeTransfer({
      userId: transfer.user_id,
      quoteId: transfer.wise_quote_id,
      recipientId: transfer.wise_recipient_id, // ✅ CHANGED: was beneficiary_id
      reference: `SMS Transfer ${new Date().toISOString()}`
    });

    return wiseTransfer;
  }
}
```

---

## Recipient Nickname Management

### Add Nickname (One-Time Setup)

**Scenario:** User adds "mom" nickname for an existing WISE recipient

**API:** `POST /api/sms/recipients/add-nickname`

```javascript
// pages/api/sms/recipients/add-nickname.js
export default async function handler(req, res) {
  const { wiseRecipientId, nickname } = req.body;
  const userId = getUserFromSession(req);

  // Verify wise_recipient belongs to user
  const { data: recipient } = await supabase
    .from('wise_recipients')
    .select('id')
    .eq('id', wiseRecipientId)
    .eq('user_id', userId)
    .single();

  if (!recipient) {
    return res.status(404).json({ error: 'Recipient not found' });
  }

  // Add nickname
  const { data, error } = await supabase
    .from('wise_recipient_nicknames')
    .insert({
      user_id: userId,
      wise_recipient_id: wiseRecipientId,
      nickname: nickname.toLowerCase().trim()
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({
        error: 'Nickname already exists'
      });
    }
    throw error;
  }

  res.json({ success: true, data });
}
```

---

### List Recipients with Nicknames

**API:** `GET /api/sms/recipients`

```javascript
export default async function handler(req, res) {
  const userId = getUserFromSession(req);

  // Get all wise_recipients with their nicknames
  const { data } = await supabase
    .from('wise_recipients')
    .select(`
      *,
      nicknames:wise_recipient_nicknames(nickname)
    `)
    .eq('user_id', userId)
    .eq('is_active', true);

  res.json({ recipients: data });
}
```

**Response:**
```json
{
  "recipients": [
    {
      "id": "abc-123",
      "account_holder_name": "Maria Garcia",
      "upi_id": "maria@paytm",
      "currency": "INR",
      "total_transfers": 5,
      "nicknames": [
        { "nickname": "mom" },
        { "nickname": "mother" }
      ]
    },
    {
      "id": "def-456",
      "account_holder_name": "John Smith",
      "upi_id": "john@gpay",
      "currency": "INR",
      "total_transfers": 2,
      "nicknames": [
        { "nickname": "brother" },
        { "nickname": "bro" }
      ]
    }
  ]
}
```

---

## Complete Database Migration (UPDATED)

```sql
-- ============================================================================
-- SMS INTEGRATION MIGRATION - WISE COMPATIBLE
-- Version: 2.0 (Updated to use wise_recipients)
-- Date: 2026-05-17
-- ============================================================================

BEGIN;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- For fuzzy text matching
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. USER PHONE NUMBERS (UNCHANGED)
-- ============================================================================
CREATE TABLE user_phone_numbers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  phone_number VARCHAR(20) NOT NULL UNIQUE,
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  verification_code VARCHAR(6),
  verification_code_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT phone_e164_format CHECK (phone_number ~ '^\+[1-9]\d{1,14}$')
);

CREATE UNIQUE INDEX idx_user_phones_number ON user_phone_numbers(phone_number)
  WHERE is_active = TRUE;
CREATE INDEX idx_user_phones_user ON user_phone_numbers(user_id);

-- ============================================================================
-- 2. SMS CONVERSATIONS (UNCHANGED)
-- ============================================================================
CREATE TABLE sms_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  agentphone_conversation_id VARCHAR(255),
  state VARCHAR(50) NOT NULL DEFAULT 'idle',
  context JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '10 minutes'),
  CONSTRAINT valid_state CHECK (
    state IN ('idle', 'awaiting_disambiguation', 'awaiting_amount',
              'awaiting_recipient', 'ready_for_confirmation')
  ),
  UNIQUE(phone_number) WHERE state != 'idle'
);

CREATE INDEX idx_sms_conv_phone ON sms_conversations(phone_number);
CREATE INDEX idx_sms_conv_user ON sms_conversations(user_id);
CREATE INDEX idx_sms_conv_state ON sms_conversations(state);

-- ============================================================================
-- 3. PENDING SMS TRANSFERS (UPDATED - uses wise_recipients)
-- ============================================================================
CREATE TABLE pending_sms_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  conversation_id UUID REFERENCES sms_conversations(id),

  -- ✅ CHANGED: Use wise_recipients instead of beneficiaries
  wise_recipient_id UUID REFERENCES wise_recipients(id) NOT NULL,

  -- Transfer details
  source_amount DECIMAL(12, 2) NOT NULL,
  source_currency VARCHAR(3) DEFAULT 'USD',
  target_amount DECIMAL(12, 2),
  target_currency VARCHAR(3),
  exchange_rate DECIMAL(12, 6),

  -- WISE Quote (existing table)
  wise_quote_id UUID REFERENCES wise_quotes(id),
  quote_expires_at TIMESTAMPTZ,

  raw_message TEXT NOT NULL,
  parsed_intent JSONB,
  status VARCHAR(50) DEFAULT 'pending',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '15 minutes'),
  confirmed_at TIMESTAMPTZ,

  -- Links to wise_transfers (existing table)
  completed_transfer_id UUID REFERENCES wise_transfers(id),

  CONSTRAINT valid_status CHECK (
    status IN ('pending', 'confirmed', 'expired', 'cancelled', 'failed')
  ),
  CONSTRAINT valid_amount CHECK (source_amount > 0),
  CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

CREATE INDEX idx_pending_sms_phone ON pending_sms_transfers(phone_number);
CREATE INDEX idx_pending_sms_user ON pending_sms_transfers(user_id);
CREATE INDEX idx_pending_sms_status ON pending_sms_transfers(status)
  WHERE status = 'pending';
CREATE INDEX idx_pending_sms_wise_recipient ON pending_sms_transfers(wise_recipient_id);

-- ============================================================================
-- 4. SMS TRANSFER TOKENS (UNCHANGED)
-- ============================================================================
CREATE TABLE sms_transfer_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  pending_transfer_id UUID REFERENCES pending_sms_transfers(id) NOT NULL,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  short_token VARCHAR(10) NOT NULL UNIQUE,
  phone_number VARCHAR(20) NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  used_ip INET,
  used_user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT token_valid_expiry CHECK (expires_at > created_at)
);

CREATE UNIQUE INDEX idx_sms_tokens_short ON sms_transfer_tokens(short_token)
  WHERE is_used = FALSE;
CREATE INDEX idx_sms_tokens_pending ON sms_transfer_tokens(pending_transfer_id);

-- ============================================================================
-- 5. WISE RECIPIENT NICKNAMES (RENAMED from beneficiary_nicknames)
-- ============================================================================
CREATE TABLE wise_recipient_nicknames (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  wise_recipient_id UUID REFERENCES wise_recipients(id) ON DELETE CASCADE NOT NULL,
  nickname VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT nickname_not_empty CHECK (LENGTH(TRIM(nickname)) > 0),
  UNIQUE(user_id, nickname),
  UNIQUE(user_id, wise_recipient_id, nickname)
);

CREATE INDEX idx_wise_recipient_nicknames_user ON wise_recipient_nicknames(user_id);
CREATE INDEX idx_wise_recipient_nicknames_recipient ON wise_recipient_nicknames(wise_recipient_id);

-- ============================================================================
-- 6. SMS MESSAGES LOG (UNCHANGED)
-- ============================================================================
CREATE TABLE sms_messages_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES sms_conversations(id),
  user_id UUID REFERENCES users(id),
  direction VARCHAR(10) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  message_body TEXT NOT NULL,
  agentphone_message_id VARCHAR(255),
  agentphone_conversation_id VARCHAR(255),
  channel VARCHAR(20),
  status VARCHAR(50),
  error_message TEXT,
  webhook_signature VARCHAR(255),
  webhook_timestamp BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_direction CHECK (direction IN ('inbound', 'outbound')),
  CONSTRAINT valid_channel CHECK (channel IN ('sms', 'mms'))
);

CREATE INDEX idx_sms_log_conv ON sms_messages_log(conversation_id);
CREATE INDEX idx_sms_log_user ON sms_messages_log(user_id);
CREATE INDEX idx_sms_log_phone ON sms_messages_log(phone_number);
CREATE INDEX idx_sms_log_time ON sms_messages_log(created_at DESC);

-- ============================================================================
-- AUTO-CLEANUP FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION cleanup_expired_sms_data()
RETURNS void AS $$
BEGIN
  UPDATE pending_sms_transfers
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'pending' AND expires_at < NOW();

  UPDATE sms_conversations
  SET state = 'idle', context = '{}'::jsonb, updated_at = NOW()
  WHERE state != 'idle' AND expires_at < NOW();

  DELETE FROM sms_messages_log
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

COMMIT;
```

---

## Summary of Changes

### ✅ What Changed

1. **Table Name:** `beneficiary_nicknames` → `wise_recipient_nicknames`
2. **Foreign Key:** `pending_sms_transfers.beneficiary_id` → `pending_sms_transfers.wise_recipient_id`
3. **References:** Now points to `wise_recipients` table (existing)

### ✅ What Stayed the Same

1. **All WISE services** - Zero changes required
2. **Database migration** for WISE tables - Already exists, no modifications
3. **API flow** - Still uses wiseQuoteService, wiseOrchestrator, etc.
4. **Token system** - No changes
5. **Webhook handling** - No changes
6. **Message templates** - No changes

### ✅ Benefits

1. **Consistency:** SMS and QR transfers use same recipient database
2. **Reusability:** Recipients created via QR can be used in SMS (and vice versa)
3. **Zero Breaking Changes:** Existing WISE integration untouched
4. **Simpler Codebase:** No parallel beneficiary management systems

---

## Migration Path for Existing Data

**Note:** If `beneficiaries` table has existing data that should be accessible via SMS, a one-time migration is needed:

```sql
-- Optional: Migrate beneficiaries to wise_recipients
-- (Only if you want existing Chimoney beneficiaries accessible via SMS)

-- This would require calling WISE API to create recipient accounts
-- for each beneficiary, which should be done via application code,
-- not SQL migration.

-- Pseudocode:
-- FOR EACH beneficiary WITH payment_method = 'upi':
--   1. Decrypt upi_encrypted
--   2. Call WISE API to create recipient
--   3. Insert into wise_recipients
--   4. Copy nickname to wise_recipient_nicknames
```

**Recommendation:** Don't migrate. Instead, let users naturally add recipients via:
- QR code scan (creates wise_recipient automatically)
- Manual add in app (creates wise_recipient + nickname)
- First SMS attempt prompts to add recipient

---

## Final Checklist

- [x] Updated schema to use `wise_recipients`
- [x] Verified no changes needed to WISE services
- [x] Updated SMS service specs to use correct tables
- [x] Created `wise_recipient_nicknames` table
- [x] Updated migration file
- [x] Documented compatibility approach
- [x] Identified zero breaking changes

**Status:** Design updated and compatible with existing WISE infrastructure ✅
