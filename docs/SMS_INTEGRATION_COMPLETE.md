# SMS Integration - Complete Design Document

**Vitta x AgentPhone - SMS-Based Money Transfers**

**Version:** 2.0 Final
**Date:** 2026-05-17
**Status:** Production-Ready Design
**Target:** Hackathon Demo

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Quick Start](#quick-start)
3. [System Architecture](#system-architecture)
4. [User Experience](#user-experience)
5. [Database Schema](#database-schema)
6. [API Specifications](#api-specifications)
7. [Component Implementation](#component-implementation)
8. [Security Model](#security-model)
9. [WISE Integration](#wise-integration)
10. [Implementation Plan](#implementation-plan)
11. [Testing Strategy](#testing-strategy)
12. [Hackathon Demo](#hackathon-demo)
13. [Environment Setup](#environment-setup)

---

## Executive Summary

### What We're Building

An SMS-to-web money transfer system where users can initiate international transfers via simple text messages, with final confirmation completed securely through a web interface.

**User Flow:**
```
User texts: "Send $500 to mom"
  ↓
Vitta parses intent and creates pending transfer
  ↓
User receives SMS: "👉 vitta.app/confirm/xYz9K"
  ↓
User taps link → Beautiful web confirmation screen
  ↓
User clicks "Confirm Transfer"
  ↓
Money transferred via WISE API ✅
```

### Key Features

- ✅ Natural language SMS ("Send $500 to mom")
- ✅ Secure web confirmation (JWT tokens, 15-min expiry)
- ✅ Nickname support (mom, dad, brother, etc.)
- ✅ Real-time WISE transfers
- ✅ No app download required
- ✅ **Zero changes to existing WISE integration**

### Tech Stack

| Component | Technology |
|-----------|-----------|
| SMS Platform | AgentPhone |
| Backend | Next.js API routes |
| Database | Supabase (PostgreSQL) |
| Transfer API | WISE (existing integration) |
| Security | HMAC webhooks + JWT tokens |
| Frontend | React + Tailwind CSS |

### Success Metrics

- **Response Time:** < 3 sec SMS response
- **Security:** 100% webhook signature validation
- **UX:** Single confirmation step
- **Demo:** 3+ successful live transfers
- **Wow Factor:** "No app needed!"

---

## Quick Start

### Prerequisites

1. AgentPhone account with SMS number
2. Existing Vitta app with WISE integration
3. Supabase database
4. Node.js environment

### 5-Minute Setup

```bash
# 1. Environment variables
cp .env.example .env.local
# Add: AGENTPHONE_API_KEY, AGENTPHONE_WEBHOOK_SECRET, TRANSFER_TOKEN_SECRET

# 2. Run database migration
psql -f supabase/migrations/003_sms_integration.sql

# 3. Start dev server
npm run dev

# 4. Configure AgentPhone webhook
# Point to: https://your-domain.com/api/sms/webhook
```

### Implementation Time

- **Phase 1-3 (MVP):** 6-8 hours
- **Phase 4-5 (Polish):** 2-3 hours
- **Total:** ~10 hours (perfect for hackathon)

---

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────┐
│                      USER ECOSYSTEM                      │
│  Phone (SMS) ←→ Vitta Web App ←→ Vitta Account         │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────┐
│                  AGENTPHONE PLATFORM                     │
│  • SMS Gateway (10DLC)                                  │
│  • Webhook Delivery                                     │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────┐
│              VITTA SMS LAYER (NEW)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ Webhook  │→→│  Intent  │→→│ Pending  │             │
│  │ Handler  │  │  Parser  │  │ Transfer │             │
│  └──────────┘  └──────────┘  └──────────┘             │
│         ↓            ↓            ↓                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │Signature │  │Recipient │  │  Token   │             │
│  │ Verifier │  │ Matcher  │  │Generator │             │
│  └──────────┘  └──────────┘  └──────────┘             │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────┐
│         EXISTING WISE INTEGRATION (NO CHANGES)          │
│  • wiseQuoteService        ✅ Reused                    │
│  • wiseRecipientService    ✅ Reused                    │
│  • wiseTransferService     ✅ Reused                    │
│  • wiseOrchestrator        ✅ Reused                    │
│  • wise_recipients table   ✅ Reused                    │
│  • wise_quotes table       ✅ Reused                    │
│  • wise_transfers table    ✅ Reused                    │
└─────────────────────────────────────────────────────────┘
```

### Data Flow Sequence

```
1. SMS RECEIVED
   User: "Send $500 to mom"
   AgentPhone → POST /api/sms/webhook

2. WEBHOOK PROCESSING
   Verify HMAC signature
   Extract: phone, message, conversationId
   Return 200 OK (< 2 sec)

3. ASYNC INTENT PARSING
   Parse: "send $500 to mom"
   Extract: amount=500, recipient="mom"
   Confidence: 0.95

4. RECIPIENT LOOKUP
   Query: wise_recipient_nicknames
   WHERE user_id = X AND nickname = 'mom'
   → Returns: wise_recipient_id

5. GET WISE RECIPIENT
   Query: wise_recipients
   WHERE id = wise_recipient_id
   → Returns: wise_account_id, upi_id, name

6. CREATE QUOTE (EXISTING SERVICE)
   wiseQuoteService.createQuote({
     sourceAmount: 500,
     targetCurrency: 'INR',
     recipientId: wise_recipient.id
   })
   → Returns: quote with exchange rate

7. CREATE PENDING TRANSFER
   INSERT INTO pending_sms_transfers {
     wise_recipient_id,
     wise_quote_id,
     amount, rate, etc.
   }

8. GENERATE TOKEN
   JWT payload: { transferId, userId, amount }
   Short token: "xYz9K" (8 chars, URL-safe)
   Store hash in sms_transfer_tokens

9. SEND SMS RESPONSE
   AgentPhone API: POST /v1/messages
   "💰 Transfer Ready
    $500 → Mom (Maria Garcia)
    👉 vitta.app/confirm/xYz9K
    Link expires in 15 min"

10. USER TAPS LINK
    Browser → /transfer/confirm/xYz9K
    Load transfer details
    Show confirmation screen

11. USER CONFIRMS
    Click "Confirm Transfer"
    POST /api/sms/transfer/execute
    Validate token

12. EXECUTE TRANSFER (EXISTING SERVICE)
    wiseOrchestrator.executeTransfer({
      quoteId: quote.id,
      recipientId: wise_recipient.id
    })
    → WISE API transfer

13. SEND CONFIRMATION
    SMS: "✅ Transfer Complete!"
    Web: Success screen with receipt
```

### Component Architecture

```
pages/
├── api/sms/
│   ├── webhook.js               # Entry point (AgentPhone)
│   ├── transfer/
│   │   ├── verify.js            # Validate token
│   │   └── execute.js           # Execute transfer
│   └── recipients/
│       └── add-nickname.js      # Manage nicknames
│
├── transfer/confirm/
│   └── [token].js               # Web confirmation screen
│
services/
├── sms/
│   ├── smsIntentParser.js       # Parse SMS intents
│   ├── recipientMatcher.js      # Match nicknames
│   ├── pendingTransferService.js # Manage pending transfers
│   ├── transferTokenService.js  # Token generation
│   └── messageTemplates.js      # SMS templates
│
├── agentphone/
│   ├── agentphoneClient.js      # API client
│   └── webhookVerifier.js       # HMAC verification
│
└── wise/ (EXISTING - NO CHANGES)
    ├── wiseQuoteService.js      ✅
    ├── wiseRecipientService.js  ✅
    ├── wiseTransferService.js   ✅
    └── wiseOrchestrator.js      ✅
```

---

## User Experience

### Primary Flow: Successful Transfer

**Step 1: Initiate via SMS**
```
USER → "Send $500 to mom"

SYSTEM PROCESSING (2-3 seconds):
• Parse intent: transfer_money
• Extract: amount=$500, recipient="mom"
• Lookup: wise_recipient_nicknames → wise_recipient_id
• Get WISE recipient details
• Create quote via wiseQuoteService
• Generate secure token
• Build confirmation SMS
```

**Step 2: Review Prompt (SMS)**
```
VITTA → "💰 Transfer Ready

        Amount: $500.00 USD
        To: Mom (Maria Garcia)
        Account: UPI ****1234
        Fee: $0.01
        Total: $500.01

        Tap to review & confirm:
        👉 vitta.app/confirm/xYz9K

        Link expires in 15 minutes"
```

**Step 3: Web Confirmation**
```
USER taps link → Opens beautiful web confirmation screen

SCREEN DISPLAYS:
┌─────────────────────────────────────┐
│      Review Your Transfer           │
│      Initiated via SMS              │
├─────────────────────────────────────┤
│                                     │
│         $500.00 USD                 │
│                                     │
├─────────────────────────────────────┤
│  To: Mom (Maria Garcia)             │
│  Account: UPI ****1234              │
│                                     │
│  Exchange Rate: 1 USD = 82.50 INR   │
│  Recipient Gets: 41,250.00 INR      │
│  Transfer Fee: $0.01                │
│  ─────────────────────              │
│  Total Cost: $500.01                │
│                                     │
│  ⏱ Typically arrives in minutes     │
│                                     │
│  ┌─────────────────────────────┐   │
│  │   Confirm Transfer          │   │
│  └─────────────────────────────┘   │
│                                     │
│  [ Cancel ]                         │
│                                     │
│  🔒 Secure • Link expires in 14 min │
└─────────────────────────────────────┘
```

**Step 4: Execute Transfer**
```
USER clicks "Confirm Transfer"

SYSTEM PROCESSING (2-3 seconds):
• Validate token (not expired, not used)
• Call wiseOrchestrator.executeTransfer()
• Mark token as used
• Update pending transfer status
• Send confirmation SMS
```

**Step 5: Confirmation**
```
WEB → Success screen with checkmark animation

SMS → "✅ Transfer Complete!

       $500.00 sent to Maria Garcia
       Reference: WTF123456789
       Time: 2:34 PM EST

       View receipt: vitta.app/receipt/abc"
```

### Alternative Flow: Disambiguation

```
USER → "Send $200 to John"

SYSTEM finds 2 recipients named "John"

VITTA → "I found 2 contacts named John:

        1️⃣ John Smith (UPI India)
        2️⃣ John Doe (UK Bank)

        Reply with the number (1 or 2)"

USER → "1"

SYSTEM continues with John Smith...

VITTA → "💰 Transfer Ready

        Amount: $200.00 USD
        To: John Smith
        ..."
```

### Error Flows

**Recipient Not Found:**
```
USER → "Send $100 to Sarah"

VITTA → "❌ I couldn't find 'Sarah' in your contacts.

        Add Sarah in the Vitta app first:
        👉 vitta.app/recipients/add

        Or try texting the full name."
```

**Link Expired:**
```
USER taps link after 16 minutes

WEB → "⏰ This transfer link has expired

       Transfer links are valid for 15 minutes

       Text 'Send $X to [name]' to create a new transfer

       [ Open Vitta App ]"
```

**Invalid Amount:**
```
USER → "Send money to mom"

VITTA → "❌ Invalid amount

        Try: 'Send $50 to mom'"
```

---

## Database Schema

### Overview

**New Tables (SMS-Specific):**
1. `user_phone_numbers` - Link phones to accounts
2. `sms_conversations` - Track multi-turn conversations
3. `pending_sms_transfers` - Store pending transfers
4. `sms_transfer_tokens` - Secure confirmation tokens
5. `wise_recipient_nicknames` - SMS shortcuts
6. `sms_messages_log` - Audit trail

**Existing Tables (Reused):**
- `wise_recipients` ✅ Recipient data
- `wise_quotes` ✅ Exchange rates
- `wise_transfers` ✅ Completed transfers
- `users` ✅ User accounts

### Schema Diagrams

```
users
  ↓ 1:N
user_phone_numbers
  ↓ 1:N
sms_conversations
  ↓ 1:N
pending_sms_transfers ← wise_recipient_nicknames → wise_recipients
  ↓ 1:1                                              (EXISTING)
sms_transfer_tokens
  ↓
wise_transfers (EXISTING)
```

### Table Specifications

#### 1. user_phone_numbers

**Purpose:** Link phone numbers to user accounts for SMS authentication

```sql
CREATE TABLE user_phone_numbers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  phone_number VARCHAR(20) NOT NULL UNIQUE,

  -- Verification
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  verification_code VARCHAR(6),
  verification_code_expires_at TIMESTAMPTZ,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT phone_e164_format CHECK (phone_number ~ '^\+[1-9]\d{1,14}$')
);

CREATE UNIQUE INDEX idx_user_phones_number ON user_phone_numbers(phone_number)
  WHERE is_active = TRUE;
CREATE INDEX idx_user_phones_user ON user_phone_numbers(user_id);
```

**Sample Data:**
```sql
INSERT INTO user_phone_numbers (user_id, phone_number, is_verified, is_active)
VALUES ('user-123', '+12345678901', TRUE, TRUE);
```

---

#### 2. sms_conversations

**Purpose:** Track multi-turn SMS conversations and state

```sql
CREATE TABLE sms_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,

  agentphone_conversation_id VARCHAR(255),

  -- State machine
  state VARCHAR(50) NOT NULL DEFAULT 'idle',
  -- Values: 'idle', 'awaiting_disambiguation', 'awaiting_amount',
  --         'awaiting_recipient', 'ready_for_confirmation'

  -- Context for multi-turn conversations
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
```

---

#### 3. pending_sms_transfers

**Purpose:** Store transfer details before user confirmation

```sql
CREATE TABLE pending_sms_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  conversation_id UUID REFERENCES sms_conversations(id),

  -- ✅ Uses WISE recipients (not beneficiaries)
  wise_recipient_id UUID REFERENCES wise_recipients(id) NOT NULL,

  -- Transfer details
  source_amount DECIMAL(12, 2) NOT NULL,
  source_currency VARCHAR(3) DEFAULT 'USD',
  target_amount DECIMAL(12, 2),
  target_currency VARCHAR(3),
  exchange_rate DECIMAL(12, 6),

  -- WISE Quote
  wise_quote_id UUID REFERENCES wise_quotes(id),
  quote_expires_at TIMESTAMPTZ,

  -- Original SMS data
  raw_message TEXT NOT NULL,
  parsed_intent JSONB,

  -- Status
  status VARCHAR(50) DEFAULT 'pending',
  -- Values: 'pending', 'confirmed', 'expired', 'cancelled', 'failed'

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '15 minutes'),
  confirmed_at TIMESTAMPTZ,

  -- Completed transfer reference
  completed_transfer_id UUID REFERENCES wise_transfers(id),

  CONSTRAINT valid_status CHECK (
    status IN ('pending', 'confirmed', 'expired', 'cancelled', 'failed')
  ),
  CONSTRAINT valid_amount CHECK (source_amount > 0),
  CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

CREATE INDEX idx_pending_sms_user ON pending_sms_transfers(user_id);
CREATE INDEX idx_pending_sms_status ON pending_sms_transfers(status);
CREATE INDEX idx_pending_sms_wise_recipient ON pending_sms_transfers(wise_recipient_id);
```

---

#### 4. sms_transfer_tokens

**Purpose:** Secure one-time tokens for web confirmation

```sql
CREATE TABLE sms_transfer_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  pending_transfer_id UUID REFERENCES pending_sms_transfers(id) NOT NULL,

  -- Token data
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  short_token VARCHAR(10) NOT NULL UNIQUE,
  phone_number VARCHAR(20) NOT NULL,

  -- Security tracking
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
```

---

#### 5. wise_recipient_nicknames

**Purpose:** Map friendly nicknames to WISE recipients for SMS

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

**Sample Data:**
```sql
INSERT INTO wise_recipient_nicknames (user_id, wise_recipient_id, nickname)
VALUES
  ('user-123', 'recipient-456', 'mom'),
  ('user-123', 'recipient-456', 'mother'),
  ('user-123', 'recipient-789', 'dad');
```

---

#### 6. sms_messages_log

**Purpose:** Audit trail of all SMS messages

```sql
CREATE TABLE sms_messages_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES sms_conversations(id),
  user_id UUID REFERENCES users(id),

  direction VARCHAR(10) NOT NULL, -- 'inbound' or 'outbound'
  phone_number VARCHAR(20) NOT NULL,
  message_body TEXT NOT NULL,

  agentphone_message_id VARCHAR(255),
  agentphone_conversation_id VARCHAR(255),
  channel VARCHAR(20), -- 'sms' or 'mms'

  status VARCHAR(50), -- 'sent', 'delivered', 'failed'
  error_message TEXT,

  webhook_signature VARCHAR(255),
  webhook_timestamp BIGINT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_direction CHECK (direction IN ('inbound', 'outbound')),
  CONSTRAINT valid_channel CHECK (channel IN ('sms', 'mms'))
);

CREATE INDEX idx_sms_log_user ON sms_messages_log(user_id);
CREATE INDEX idx_sms_log_phone ON sms_messages_log(phone_number);
CREATE INDEX idx_sms_log_time ON sms_messages_log(created_at DESC);
```

---

### Complete Migration File

**File:** `supabase/migrations/003_sms_integration.sql`

```sql
-- ============================================================================
-- SMS INTEGRATION MIGRATION
-- Version: 2.0 (WISE Compatible)
-- Date: 2026-05-17
-- ============================================================================

BEGIN;

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. User Phone Numbers
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

-- 2. SMS Conversations
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

-- 3. Pending SMS Transfers
CREATE TABLE pending_sms_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  conversation_id UUID REFERENCES sms_conversations(id),
  wise_recipient_id UUID REFERENCES wise_recipients(id) NOT NULL,
  source_amount DECIMAL(12, 2) NOT NULL,
  source_currency VARCHAR(3) DEFAULT 'USD',
  target_amount DECIMAL(12, 2),
  target_currency VARCHAR(3),
  exchange_rate DECIMAL(12, 6),
  wise_quote_id UUID REFERENCES wise_quotes(id),
  quote_expires_at TIMESTAMPTZ,
  raw_message TEXT NOT NULL,
  parsed_intent JSONB,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '15 minutes'),
  confirmed_at TIMESTAMPTZ,
  completed_transfer_id UUID REFERENCES wise_transfers(id),
  CONSTRAINT valid_status CHECK (
    status IN ('pending', 'confirmed', 'expired', 'cancelled', 'failed')
  ),
  CONSTRAINT valid_amount CHECK (source_amount > 0),
  CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

CREATE INDEX idx_pending_sms_user ON pending_sms_transfers(user_id);
CREATE INDEX idx_pending_sms_status ON pending_sms_transfers(status);
CREATE INDEX idx_pending_sms_wise_recipient ON pending_sms_transfers(wise_recipient_id);

-- 4. SMS Transfer Tokens
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

-- 5. WISE Recipient Nicknames
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

-- 6. SMS Messages Log
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

CREATE INDEX idx_sms_log_user ON sms_messages_log(user_id);
CREATE INDEX idx_sms_log_phone ON sms_messages_log(phone_number);
CREATE INDEX idx_sms_log_time ON sms_messages_log(created_at DESC);

-- Auto-cleanup function
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

## API Specifications

### Endpoint Overview

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/sms/webhook` | POST | Receive AgentPhone webhooks | HMAC Signature |
| `/api/sms/transfer/verify` | GET | Validate token & get details | Token in URL |
| `/api/sms/transfer/execute` | POST | Execute confirmed transfer | Token in body |
| `/api/sms/recipients/add-nickname` | POST | Add nickname to recipient | User session |
| `/api/sms/send` | POST | Send SMS (internal) | API key |

### 1. Webhook Handler

**Endpoint:** `POST /api/sms/webhook`

**Purpose:** Receive incoming SMS events from AgentPhone

**Request Headers:**
```
X-Webhook-Signature: sha256=<hmac_hex>
X-Webhook-Timestamp: <unix_timestamp>
X-Webhook-ID: <unique_id>
Content-Type: application/json
```

**Request Body:**
```json
{
  "event": "agent.message",
  "channel": "sms",
  "timestamp": "2025-01-15T12:00:00Z",
  "agentId": "agt_abc123",
  "data": {
    "messageId": "msg_xyz789",
    "body": "Send $500 to mom",
    "from": "+12345678901",
    "to": "+15551234567",
    "direction": "inbound"
  }
}
```

**Response:**
```json
{ "received": true }
```
**Status:** 200 OK (always)

**Implementation:** `pages/api/sms/webhook.js`

```javascript
import { verifyWebhookSignature } from '../../services/agentphone/webhookVerifier';
import { processSMSMessage } from '../../services/sms/smsProcessor';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Verify signature
    verifyWebhookSignature(req);

    // 2. Extract message data
    const { data: { body, from, messageId } } = req.body;

    // 3. Return 200 immediately (webhook requirement)
    res.status(200).json({ received: true });

    // 4. Process asynchronously (don't await)
    processSMSMessage({ body, phoneNumber: from, messageId })
      .catch(err => console.error('[Webhook] Processing error:', err));

  } catch (error) {
    console.error('[Webhook] Verification failed:', error);
    return res.status(401).json({ error: 'Invalid signature' });
  }
}
```

---

### 2. Transfer Verification

**Endpoint:** `GET /api/sms/transfer/verify?token={short_token}`

**Purpose:** Validate token and retrieve transfer details

**Response (Success):**
```json
{
  "valid": true,
  "transfer": {
    "id": "pending_123",
    "source_amount": 500.00,
    "source_currency": "USD",
    "target_amount": 41250.00,
    "target_currency": "INR",
    "exchange_rate": 82.50,
    "fee": 0.01,
    "total_cost": 500.01,
    "wise_recipient": {
      "id": "rec_123",
      "account_holder_name": "Maria Garcia",
      "upi_id": "maria@paytm",
      "last4": "1234"
    },
    "expiresIn": "14 minutes",
    "expires_at": "2025-01-15T12:15:00Z"
  }
}
```

**Response (Error):**
```json
{
  "valid": false,
  "error": "Token expired"
}
```

**Implementation:** `pages/api/sms/transfer/verify.js`

```javascript
import { validateTransferToken } from '../../services/sms/transferTokenService';

export default async function handler(req, res) {
  const { token } = req.query;

  const validation = await validateTransferToken(token);

  if (!validation.valid) {
    return res.status(400).json({
      valid: false,
      error: validation.error
    });
  }

  res.json({
    valid: true,
    transfer: validation.transfer
  });
}
```

---

### 3. Transfer Execution

**Endpoint:** `POST /api/sms/transfer/execute`

**Request Body:**
```json
{
  "token": "xYz9K"
}
```

**Response (Success):**
```json
{
  "success": true,
  "transferId": "wise_transfer_789",
  "reference": "WTF123456789",
  "status": "processing"
}
```

**Implementation:** `pages/api/sms/transfer/execute.js`

```javascript
import { validateTransferToken, markTokenUsed } from '../../services/sms/transferTokenService';
import { wiseOrchestrator } from '../../services/wise/wiseOrchestrator';
import { sendSMSConfirmation } from '../../services/sms/messageTemplates';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.body;

  try {
    // 1. Validate token
    const validation = await validateTransferToken(token);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.error });
    }

    // 2. Check if already used
    if (await isTokenUsed(token)) {
      return res.status(400).json({ success: false, error: 'Token already used' });
    }

    const { transfer } = validation;

    // 3. Execute transfer via EXISTING WISE service (NO CHANGES)
    const wiseTransfer = await wiseOrchestrator.executeTransfer({
      userId: transfer.user_id,
      quoteId: transfer.wise_quote_id,
      recipientId: transfer.wise_recipient_id, // ✅ uses wise_recipients
      reference: `SMS Transfer ${new Date().toISOString()}`
    });

    // 4. Mark token as used
    await markTokenUsed(token, req.socket.remoteAddress, req.headers['user-agent']);

    // 5. Update pending transfer
    await supabase
      .from('pending_sms_transfers')
      .update({
        status: 'confirmed',
        confirmed_at: new Date(),
        completed_transfer_id: wiseTransfer.id
      })
      .eq('id', transfer.id);

    // 6. Send SMS confirmation
    await sendSMSConfirmation(transfer.phone_number, wiseTransfer);

    res.json({
      success: true,
      transferId: wiseTransfer.id,
      reference: wiseTransfer.reference,
      status: wiseTransfer.status
    });

  } catch (error) {
    console.error('[Transfer Execute] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
```

---

## Component Implementation

### Service Specifications

#### 1. SMS Intent Parser

**File:** `services/sms/smsIntentParser.js`

```javascript
const PATTERNS = {
  transfer_money: [
    /send\s+\$?(\d+(?:\.\d{2})?)\s+to\s+(.+)/i,
    /pay\s+(.+?)\s+\$?(\d+(?:\.\d{2})?)/i,
    /transfer\s+\$?(\d+(?:\.\d{2})?)\s+(?:to\s+)?(.+)/i
  ],
  number_selection: /^([1-9])\s*$/,
  confirmation: /^(yes|yeah|yep|ok|confirm|proceed)$/i,
  cancellation: /^(no|cancel|stop|nevermind)$/i
};

export async function parseIntent(message, conversationState = {}) {
  const msg = message.trim();

  // Check for transfer intent
  for (const pattern of PATTERNS.transfer_money) {
    const match = msg.match(pattern);
    if (match) {
      const amount = parseFloat(match[1]);
      const recipient = (match[2] || match[1]).trim();

      return {
        intent: 'transfer_money',
        confidence: 0.95,
        entities: {
          amount: { value: amount, currency: 'USD', raw: match[1] },
          recipient: { value: recipient.toLowerCase(), raw: match[2] }
        }
      };
    }
  }

  // Check for disambiguation response
  if (conversationState.state === 'awaiting_disambiguation') {
    const match = msg.match(PATTERNS.number_selection);
    if (match) {
      return {
        intent: 'disambiguation_response',
        confidence: 1.0,
        entities: {
          selection: parseInt(match[1])
        }
      };
    }
  }

  // Check for confirmation/cancellation
  if (PATTERNS.confirmation.test(msg)) {
    return { intent: 'confirmation', confidence: 1.0 };
  }

  if (PATTERNS.cancellation.test(msg)) {
    return { intent: 'cancellation', confidence: 1.0 };
  }

  // Unknown intent
  return { intent: 'unknown', confidence: 0.0 };
}
```

---

#### 2. Recipient Matcher

**File:** `services/sms/recipientMatcher.js`

```javascript
import { supabase } from '../../config/supabase';

export async function matchRecipient(recipientStr, userId) {
  const normalized = recipientStr.toLowerCase().trim();

  // 1. Try exact nickname match
  const { data: byNickname } = await supabase
    .from('wise_recipient_nicknames')
    .select(`
      wise_recipient_id,
      wise_recipients (*)
    `)
    .eq('user_id', userId)
    .ilike('nickname', normalized)
    .single();

  if (byNickname?.wise_recipients) {
    return {
      status: 'matched',
      recipient: byNickname.wise_recipients,
      matchType: 'nickname'
    };
  }

  // 2. Try fuzzy name match on wise_recipients
  const { data: byName } = await supabase
    .from('wise_recipients')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .ilike('account_holder_name', `%${normalized}%`);

  if (byName.length === 1) {
    return {
      status: 'matched',
      recipient: byName[0],
      matchType: 'name'
    };
  } else if (byName.length > 1) {
    return {
      status: 'multiple',
      matches: byName,
      matchType: 'name'
    };
  }

  // 3. Not found
  return {
    status: 'not_found',
    suggestion: 'Add recipient in Vitta app first'
  };
}
```

---

#### 3. Pending Transfer Service

**File:** `services/sms/pendingTransferService.js`

```javascript
import { supabase } from '../../config/supabase';
import { wiseQuoteService } from '../wise/wiseQuoteService';

export class PendingTransferService {
  async createPendingTransfer({
    userId,
    phoneNumber,
    wiseRecipientId,
    sourceAmount,
    rawMessage
  }) {
    // Get wise_recipient details
    const { data: wiseRecipient } = await supabase
      .from('wise_recipients')
      .select('*')
      .eq('id', wiseRecipientId)
      .single();

    if (!wiseRecipient) {
      throw new Error('WISE recipient not found');
    }

    // Create quote using EXISTING WISE service (NO CHANGES)
    const quote = await wiseQuoteService.createQuote({
      userId,
      sourceAmount,
      sourceCurrency: 'USD',
      targetCurrency: wiseRecipient.currency,
      recipientId: wiseRecipient.id
    });

    // Save pending transfer
    const { data: pendingTransfer, error } = await supabase
      .from('pending_sms_transfers')
      .insert({
        user_id: userId,
        phone_number: phoneNumber,
        wise_recipient_id: wiseRecipientId,
        source_amount: sourceAmount,
        source_currency: 'USD',
        target_amount: quote.target_amount,
        target_currency: quote.target_currency,
        exchange_rate: quote.rate,
        wise_quote_id: quote.id,
        quote_expires_at: quote.expiresAt,
        raw_message: rawMessage,
        status: 'pending',
        expires_at: new Date(Date.now() + 15 * 60 * 1000)
      })
      .select()
      .single();

    if (error) throw error;

    return { ...pendingTransfer, wise_recipient: wiseRecipient };
  }

  async getPendingTransfer(transferId) {
    const { data, error } = await supabase
      .from('pending_sms_transfers')
      .select(`
        *,
        wise_recipient:wise_recipients(*)
      `)
      .eq('id', transferId)
      .single();

    if (error) throw error;
    return data;
  }
}

export const pendingTransferService = new PendingTransferService();
```

---

#### 4. Transfer Token Service

**File:** `services/sms/transferTokenService.js`

```javascript
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { supabase } from '../../config/supabase';

const TOKEN_SECRET = process.env.TRANSFER_TOKEN_SECRET;
const TOKEN_EXPIRY = 15 * 60 * 1000; // 15 minutes

export class TransferTokenService {
  generateToken(pendingTransfer) {
    const payload = {
      transferId: pendingTransfer.id,
      userId: pendingTransfer.user_id,
      amount: pendingTransfer.source_amount,
      wiseRecipientId: pendingTransfer.wise_recipient_id,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor((Date.now() + TOKEN_EXPIRY) / 1000)
    };

    const token = jwt.sign(payload, TOKEN_SECRET, { algorithm: 'HS256' });

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const shortToken = crypto.createHash('sha256').update(token).digest('base64url').substring(0, 8);

    return {
      fullToken: token,
      shortToken,
      tokenHash,
      expiresAt: new Date(Date.now() + TOKEN_EXPIRY)
    };
  }

  async storeToken(tokenData, pendingTransferId, phoneNumber, userId) {
    await supabase.from('sms_transfer_tokens').insert({
      user_id: userId,
      pending_transfer_id: pendingTransferId,
      token_hash: tokenData.tokenHash,
      short_token: tokenData.shortToken,
      phone_number: phoneNumber,
      expires_at: tokenData.expiresAt,
      is_used: false
    });

    return tokenData.shortToken;
  }

  async validateToken(shortToken) {
    const { data: tokenRecord } = await supabase
      .from('sms_transfer_tokens')
      .select('*')
      .eq('short_token', shortToken)
      .single();

    if (!tokenRecord) {
      return { valid: false, error: 'Token not found' };
    }

    if (tokenRecord.is_used) {
      return { valid: false, error: 'Token already used' };
    }

    if (new Date() > new Date(tokenRecord.expires_at)) {
      return { valid: false, error: 'Token expired' };
    }

    const { data: transfer } = await supabase
      .from('pending_sms_transfers')
      .select('*, wise_recipient:wise_recipients(*)')
      .eq('id', tokenRecord.pending_transfer_id)
      .single();

    return { valid: true, tokenRecord, transfer };
  }

  async markTokenUsed(shortToken, ipAddress, userAgent) {
    await supabase
      .from('sms_transfer_tokens')
      .update({
        is_used: true,
        used_at: new Date(),
        used_ip: ipAddress,
        used_user_agent: userAgent
      })
      .eq('short_token', shortToken);
  }

  buildConfirmationURL(shortToken) {
    const baseURL = process.env.NEXT_PUBLIC_APP_URL || 'https://vitta.app';
    return `${baseURL}/transfer/confirm/${shortToken}`;
  }
}

export const transferTokenService = new TransferTokenService();
```

---

#### 5. Message Templates

**File:** `services/sms/messageTemplates.js`

```javascript
export function buildTransferReadyMessage(transfer, confirmURL) {
  return `💰 Transfer Ready

Amount: $${transfer.source_amount.toFixed(2)} USD
To: ${transfer.wise_recipient.account_holder_name}
Account: ${transfer.wise_recipient.type} ****${transfer.wise_recipient.upi_id.slice(-4)}
Fee: $0.01

Tap to review & confirm:
👉 ${confirmURL}

Link expires in 15 minutes`;
}

export function buildTransferCompleteMessage(transfer) {
  return `✅ Transfer Complete!

$${transfer.source_amount.toFixed(2)} sent to ${transfer.wise_recipient.account_holder_name}
Reference: ${transfer.reference}
Time: ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}

View receipt: ${process.env.NEXT_PUBLIC_APP_URL}/receipt/${transfer.id}`;
}

export function buildDisambiguationMessage(matches) {
  const options = matches
    .map((m, i) => `${i + 1}️⃣ ${m.account_holder_name} (${m.type})`)
    .join('\n');

  return `I found ${matches.length} contacts:

${options}

Reply with the number (1-${matches.length})`;
}

export function buildErrorMessage(errorType, context = {}) {
  const templates = {
    recipient_not_found: `❌ Couldn't find '${context.name}'

Add ${context.name} in the Vitta app:
👉 ${context.addRecipientURL}

Or try the full name.`,

    invalid_amount: `❌ Invalid amount

Try: "Send $50 to mom"`,

    rate_limit: `⚠️ Too many requests

Please wait a few minutes and try again.`
  };

  return templates[errorType] || `❌ Something went wrong. Please try again.`;
}
```

---

#### 6. AgentPhone Client

**File:** `services/agentphone/agentphoneClient.js`

```javascript
export class AgentPhoneClient {
  constructor() {
    this.apiKey = process.env.AGENTPHONE_API_KEY;
    this.agentId = process.env.AGENTPHONE_AGENT_ID;
    this.baseURL = 'https://api.agentphone.ai';
  }

  async sendSMS({ to, body, conversationId = null }) {
    try {
      const response = await fetch(`${this.baseURL}/v1/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agentId: this.agentId,
          to,
          body,
          channel: 'sms',
          conversationId
        })
      });

      if (!response.ok) {
        throw new Error(`AgentPhone API error: ${response.status}`);
      }

      const data = await response.json();

      // Log message
      await this.logOutboundMessage({
        phoneNumber: to,
        body,
        messageId: data.messageId,
        conversationId: data.conversationId
      });

      return data;

    } catch (error) {
      console.error('[AgentPhoneClient] Send SMS failed:', error);
      throw error;
    }
  }

  async logOutboundMessage({ phoneNumber, body, messageId, conversationId }) {
    await supabase.from('sms_messages_log').insert({
      direction: 'outbound',
      phone_number: phoneNumber,
      message_body: body,
      agentphone_message_id: messageId,
      agentphone_conversation_id: conversationId,
      channel: 'sms',
      status: 'sent'
    });
  }
}

export const agentphoneClient = new AgentPhoneClient();
```

---

#### 7. Webhook Verifier

**File:** `services/agentphone/webhookVerifier.js`

```javascript
import crypto from 'crypto';

export function verifyWebhookSignature(req) {
  const signature = req.headers['x-webhook-signature'];
  const timestamp = req.headers['x-webhook-timestamp'];
  const body = JSON.stringify(req.body);

  // Check timestamp (reject old requests - replay attack prevention)
  const now = Math.floor(Date.now() / 1000);
  const requestAge = now - parseInt(timestamp);

  if (requestAge > 300) { // 5 minutes
    throw new Error('Webhook timestamp too old');
  }

  // Compute expected signature
  const payload = `${timestamp}.${body}`;
  const secret = process.env.AGENTPHONE_WEBHOOK_SECRET;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  const expected = `sha256=${expectedSignature}`;

  // Constant-time comparison
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    throw new Error('Invalid webhook signature');
  }

  return true;
}
```

---

## Security Model

### Authentication Layers

```
Layer 1: Webhook Authentication
  ↓ HMAC-SHA256 signature
  ↓ Timestamp validation (< 5 min)

Layer 2: Phone → User Mapping
  ↓ Query user_phone_numbers
  ↓ Verify is_verified = TRUE

Layer 3: Transfer Token
  ↓ JWT validation
  ↓ One-time use check
  ↓ Expiration check (15 min)

Layer 4: WISE API
  ↓ API key (server-side only)
  ↓ Per-transfer authorization
```

### Token Security

**Properties:**
- ✅ **Signed:** JWT with HS256 prevents tampering
- ✅ **Expiring:** 15-minute window
- ✅ **One-time:** Marked as used in database
- ✅ **Hashed:** Only SHA-256 hash stored in DB
- ✅ **Short:** 8-character URL-safe representation

**Generation:**
```javascript
const payload = { transferId, userId, amount, iat, exp };
const jwt = sign(payload, SECRET, { algorithm: 'HS256' });
const shortToken = crypto.createHash('sha256')
  .update(jwt)
  .digest('base64url')
  .substring(0, 8);
```

### Rate Limiting

**Per Phone Number:**
- Max 5 transfer requests per hour
- Max 10 SMS messages per hour
- Max 3 pending transfers at once

**Implementation:**
```javascript
async function checkRateLimit(phoneNumber) {
  const { count } = await supabase
    .from('sms_messages_log')
    .select('id', { count: 'exact' })
    .eq('phone_number', phoneNumber)
    .eq('direction', 'inbound')
    .gte('created_at', new Date(Date.now() - 3600000))
    .limit(11);

  if (count >= 10) {
    throw new Error('Rate limit exceeded');
  }
}
```

---

## WISE Integration

### ✅ Zero Changes Required

The SMS integration reuses all existing WISE services without any modifications:

**Existing Services (Unchanged):**
- `wiseQuoteService.js` ✅
- `wiseRecipientService.js` ✅
- `wiseTransferService.js` ✅
- `wiseOrchestrator.js` ✅

**Existing Tables (Reused):**
- `wise_recipients` ✅
- `wise_quotes` ✅
- `wise_transfers` ✅
- `wise_payments` ✅

### How SMS Uses WISE

```javascript
// SMS creates pending transfer
const pendingTransfer = await pendingTransferService.createPendingTransfer({
  wiseRecipientId: 'rec_123', // From wise_recipients table
  sourceAmount: 500
});
// ↓ Internally calls wiseQuoteService.createQuote()

// User confirms on web
const wiseTransfer = await wiseOrchestrator.executeTransfer({
  quoteId: pendingTransfer.wise_quote_id,
  recipientId: pendingTransfer.wise_recipient_id
});
// ↓ Uses existing WISE orchestrator (NO CHANGES)
```

### wise_recipients Table (EXISTING)

```sql
-- This table already exists from QR code integration
CREATE TABLE wise_recipients (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  wise_account_id BIGINT UNIQUE NOT NULL,
  account_holder_name VARCHAR(255),
  upi_id VARCHAR(255),
  currency VARCHAR(3) DEFAULT 'INR',
  type VARCHAR(50), -- 'indian_upi'
  is_active BOOLEAN DEFAULT TRUE,
  total_transfers INT DEFAULT 0,
  last_used_at TIMESTAMPTZ
);
```

**SMS adds nicknames to existing recipients:**
```sql
-- New table for SMS shortcuts
CREATE TABLE wise_recipient_nicknames (
  wise_recipient_id UUID REFERENCES wise_recipients(id),
  nickname VARCHAR(100) -- "mom", "dad", etc.
);
```

---

## Implementation Plan

### Phase 1: Foundation (2-3 hours)

**Tasks:**
1. Run database migration
2. Create AgentPhone client service
3. Implement webhook signature verification
4. Set up webhook endpoint skeleton
5. Test webhook receiving

**Deliverables:**
- ✅ All tables created
- ✅ Webhook endpoint live
- ✅ Signature verification working

**Testing:**
```bash
curl -X POST http://localhost:3000/api/sms/webhook \
  -H "X-Webhook-Signature: sha256=..." \
  -H "X-Webhook-Timestamp: $(date +%s)" \
  -d '{"event":"agent.message","data":{"body":"test"}}'
```

---

### Phase 2: Intent Parsing (1-2 hours)

**Tasks:**
1. Build SMS intent parser with regex
2. Implement entity extraction (amount, recipient)
3. Create recipient matcher service
4. Add conversation state manager

**Deliverables:**
- ✅ Parse "Send $X to Y" correctly
- ✅ Handle disambiguation
- ✅ Match nicknames to wise_recipients

**Testing:**
```javascript
test('parse transfer intent', () => {
  const result = parseIntent("Send $500 to mom");
  expect(result.intent).toBe('transfer_money');
  expect(result.entities.amount.value).toBe(500);
  expect(result.entities.recipient.value).toBe('mom');
});
```

---

### Phase 3: Pending Transfers & Tokens (1.5 hours)

**Tasks:**
1. Implement pending transfer service
2. Build token generation & validation
3. Integrate with wiseQuoteService
4. Build message templates

**Deliverables:**
- ✅ Create pending transfers with quotes
- ✅ Generate secure tokens
- ✅ Build confirmation URLs

---

### Phase 4: Web Confirmation Screen (2 hours)

**Tasks:**
1. Create `/transfer/confirm/[token]` page
2. Build transfer details UI
3. Implement transfer execution API
4. Add loading states and error handling

**Deliverables:**
- ✅ Beautiful confirmation screen
- ✅ Execute transfers on confirm
- ✅ Handle errors gracefully

**Page Component:** `pages/transfer/confirm/[token].js`

```javascript
export default function SMSTransferConfirm() {
  const router = useRouter();
  const { token } = router.query;
  const [transferData, setTransferData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    if (token) loadTransferData();
  }, [token]);

  async function loadTransferData() {
    const res = await fetch(`/api/sms/transfer/verify?token=${token}`);
    const data = await res.json();
    if (data.valid) {
      setTransferData(data.transfer);
    }
    setLoading(false);
  }

  async function handleConfirm() {
    setExecuting(true);
    const res = await fetch('/api/sms/transfer/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    const result = await res.json();
    if (result.success) {
      router.push(`/transfer/receipt/${result.transferId}`);
    }
    setExecuting(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      {/* Transfer details UI */}
    </div>
  );
}
```

---

### Phase 5: Integration & Testing (1.5 hours)

**Tasks:**
1. Connect webhook → parser → pending transfer → SMS
2. Test end-to-end flow
3. Add error handling
4. Test with AgentPhone sandbox

**Deliverables:**
- ✅ Complete SMS-to-web flow working
- ✅ All error cases handled
- ✅ Comprehensive logs

---

## Testing Strategy

### Unit Tests

```javascript
// services/sms/__tests__/smsIntentParser.test.js
describe('SMS Intent Parser', () => {
  test('parses transfer with dollar sign', () => {
    const result = parseIntent('Send $500 to mom');
    expect(result.intent).toBe('transfer_money');
    expect(result.entities.amount.value).toBe(500);
  });

  test('parses transfer without dollar sign', () => {
    const result = parseIntent('transfer 250 dollars to John');
    expect(result.entities.amount.value).toBe(250);
  });
});

// services/sms/__tests__/recipientMatcher.test.js
describe('Recipient Matcher', () => {
  test('matches nickname exactly', async () => {
    const result = await matchRecipient('mom', 'user-123');
    expect(result.status).toBe('matched');
    expect(result.matchType).toBe('nickname');
  });

  test('handles multiple matches', async () => {
    const result = await matchRecipient('John', 'user-123');
    expect(result.status).toBe('multiple');
    expect(result.matches.length).toBeGreaterThan(1);
  });
});
```

### Integration Tests

```javascript
describe('SMS Transfer Flow', () => {
  test('complete end-to-end transfer', async () => {
    // 1. Simulate webhook
    const webhook = await POST('/api/sms/webhook', {
      data: { body: 'Send $100 to mom', from: '+1234567890' }
    });
    expect(webhook.status).toBe(200);

    // 2. Check SMS sent
    const messages = await getSentMessages('+1234567890');
    expect(messages[0].body).toContain('vitta.app/confirm/');

    // 3. Extract and validate token
    const token = extractToken(messages[0].body);
    const verify = await GET(`/api/sms/transfer/verify?token=${token}`);
    expect(verify.data.valid).toBe(true);

    // 4. Execute transfer
    const execute = await POST('/api/sms/transfer/execute', { token });
    expect(execute.data.success).toBe(true);

    // 5. Verify confirmation SMS
    const confirmMsg = await getSentMessages('+1234567890');
    expect(confirmMsg[1].body).toContain('Transfer Complete');
  });
});
```

---

## Hackathon Demo

### Pre-Demo Setup (15 min)

**1. Environment:**
```bash
npm run dev  # Port 3000
ngrok http 3000  # For webhook
```

**2. Test Data:**
```sql
-- User with linked phone
INSERT INTO user_phone_numbers (user_id, phone_number, is_verified)
VALUES ('demo-user', '+15551234567', TRUE);

-- WISE recipient with nickname
INSERT INTO wise_recipient_nicknames (user_id, wise_recipient_id, nickname)
VALUES ('demo-user', 'mom-recipient-id', 'mom');
```

**3. Phone:**
- iPhone with Messages app
- Projected on screen
- AgentPhone number saved

---

### Demo Script (5 minutes)

**SLIDE 1: Problem (30 sec)**
```
"Sending money internationally is complicated:
 - Download app
 - Create account
 - Navigate complex UI
 - Takes 10+ minutes

What if you could just... text?"
```

**LIVE DEMO: The Magic (2 min)**
```
[Type on phone, projected]

YOU:    "Send $500 to mom"

[Wait 2-3 seconds]

VITTA:  "💰 Transfer Ready
        $500 → Mom (Maria Garcia)
        👉 vitta.app/confirm/xYz9K"

[Tap link → Web confirmation screen appears]
[Click "Confirm Transfer"]
[Success screen + SMS confirmation]

AUDIENCE: [Applause] 🎉
```

**SLIDE 2: Behind the Scenes (1 min)**
```
[Switch to laptop]
- Show webhook logs
- Show database (pending transfer created)
- Show WISE API call
- "All in 3 seconds. Real money."
```

**SLIDE 3: Tech Highlights (1 min)**
```
✅ SMS→Web handoff (security + UX)
✅ JWT tokens (15-min expiry)
✅ WISE API (real transfers)
✅ Zero app download

Built in 10 hours for this hackathon.
```

**CLOSING (30 sec)**
```
"International transfers should be as easy as texting.

No app. No setup. Just text.

Thank you!"
```

---

## Environment Setup

### Required Variables

```bash
# .env.local

# AgentPhone
AGENTPHONE_API_KEY=your_api_key
AGENTPHONE_WEBHOOK_SECRET=your_webhook_secret
AGENTPHONE_AGENT_ID=your_agent_id

# Transfer Tokens
TRANSFER_TOKEN_SECRET=your_random_32_char_string

# App URL
NEXT_PUBLIC_APP_URL=https://vitta.app
# or http://localhost:3000 for dev

# Existing (already configured)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
OPENAI_API_KEY=your_openai_key
WISE_API_KEY=your_wise_key
```

### AgentPhone Setup

1. Create account at agentphone.ai
2. Provision SMS number
3. Configure webhook URL: `https://your-domain.com/api/sms/webhook`
4. Copy API key and webhook secret to `.env.local`

### Database Setup

```bash
# Run migration
psql -U postgres -d vitta -f supabase/migrations/003_sms_integration.sql

# Verify tables created
psql -U postgres -d vitta -c "\dt sms_*"
psql -U postgres -d vitta -c "\dt wise_recipient_nicknames"
```

---

## File Structure

```
Vitta/
├── pages/
│   ├── api/sms/
│   │   ├── webhook.js
│   │   ├── send.js
│   │   ├── transfer/
│   │   │   ├── verify.js
│   │   │   └── execute.js
│   │   └── recipients/
│   │       └── add-nickname.js
│   │
│   └── transfer/confirm/
│       └── [token].js
│
├── services/
│   ├── sms/
│   │   ├── smsIntentParser.js
│   │   ├── recipientMatcher.js
│   │   ├── pendingTransferService.js
│   │   ├── transferTokenService.js
│   │   └── messageTemplates.js
│   │
│   ├── agentphone/
│   │   ├── agentphoneClient.js
│   │   └── webhookVerifier.js
│   │
│   └── wise/ (EXISTING - NO CHANGES)
│       ├── wiseQuoteService.js
│       ├── wiseRecipientService.js
│       ├── wiseTransferService.js
│       └── wiseOrchestrator.js
│
├── supabase/migrations/
│   └── 003_sms_integration.sql
│
└── __tests__/sms/
    ├── webhook.test.js
    ├── intentParser.test.js
    ├── recipientMatcher.test.js
    └── e2e-flow.test.js
```

---

## Success Criteria

**Technical:**
- [ ] < 3 sec SMS response time
- [ ] 100% webhook signature validation
- [ ] Zero plaintext tokens in database
- [ ] All transfers logged

**User Experience:**
- [ ] Single confirmation step
- [ ] Clear error messages
- [ ] Mobile-responsive web UI
- [ ] Graceful timeout handling

**Demo:**
- [ ] 3+ successful live transfers
- [ ] No manual intervention
- [ ] Audience understands value
- [ ] "Wow" factor achieved

---

## Appendix

### Glossary

| Term | Definition |
|------|------------|
| **AgentPhone** | SMS platform with webhook delivery |
| **Pending Transfer** | Transfer awaiting web confirmation |
| **Short Token** | 8-char URL-safe confirmation token |
| **Disambiguation** | Clarifying which recipient when multiple matches |
| **10DLC** | 10-Digit Long Code (US SMS format) |
| **E.164** | International phone format (+1234567890) |
| **HMAC** | Hash-based Message Authentication Code |

### FAQ

**Q: Do existing WISE services need changes?**
A: No! Zero changes required.

**Q: Will QR transfers still work?**
A: Yes, no impact.

**Q: Can QR recipients be used in SMS?**
A: Yes, just add a nickname.

**Q: What about the beneficiaries table?**
A: That's for Chimoney. SMS uses wise_recipients.

---

**END OF DOCUMENT**

Version: 2.0 Final
Last Updated: 2026-05-17
Status: Production-Ready ✅
