# SMS Integration Design Document (Part 2)
**Continuation of SMS_INTEGRATION_DESIGN.md**

---

## Database Schema

### Entity Relationship Diagram

```
users (existing)
  ↓ 1:N
user_phone_numbers
  ↓ 1:N
sms_conversations
  ↓ 1:N
pending_sms_transfers ← beneficiaries (existing)
  ↓ 1:1
sms_transfer_tokens
  ↓
wise_transfers (existing)
```

### Table Specifications

#### 1. `user_phone_numbers`

**Purpose:** Link phone numbers to user accounts for SMS authentication

```sql
CREATE TABLE user_phone_numbers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  phone_number VARCHAR(20) NOT NULL UNIQUE,

  -- Verification (for initial setup)
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  verification_code VARCHAR(6),
  verification_code_expires_at TIMESTAMPTZ,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Indexes
  CONSTRAINT phone_e164_format CHECK (phone_number ~ '^\+[1-9]\d{1,14}$')
);

CREATE UNIQUE INDEX idx_user_phones_number ON user_phone_numbers(phone_number)
  WHERE is_active = TRUE;
CREATE INDEX idx_user_phones_user ON user_phone_numbers(user_id);
```

**Sample Data:**
```sql
INSERT INTO user_phone_numbers (user_id, phone_number, is_verified, verified_at, is_active)
VALUES
  ('user123', '+12345678901', TRUE, NOW(), TRUE);
```

---

#### 2. `sms_conversations`

**Purpose:** Track multi-turn SMS conversations and state

```sql
CREATE TABLE sms_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,

  -- AgentPhone conversation ID
  agentphone_conversation_id VARCHAR(255),

  -- State machine
  state VARCHAR(50) NOT NULL DEFAULT 'idle',
  -- Values: 'idle', 'awaiting_disambiguation', 'awaiting_amount',
  --         'awaiting_recipient', 'ready_for_confirmation'

  -- Context for multi-turn conversations
  context JSONB DEFAULT '{}'::jsonb,
  -- Example: {
  --   "last_intent": "transfer_money",
  --   "partial_data": { "amount": 500 },
  --   "disambiguation_options": [...]
  -- }

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '10 minutes'),

  -- Constraints
  CONSTRAINT valid_state CHECK (
    state IN ('idle', 'awaiting_disambiguation', 'awaiting_amount',
              'awaiting_recipient', 'ready_for_confirmation')
  ),

  -- Only one active conversation per phone number
  UNIQUE(phone_number) WHERE state != 'idle'
);

CREATE INDEX idx_sms_conv_phone ON sms_conversations(phone_number);
CREATE INDEX idx_sms_conv_user ON sms_conversations(user_id);
CREATE INDEX idx_sms_conv_state ON sms_conversations(state);
CREATE INDEX idx_sms_conv_expires ON sms_conversations(expires_at)
  WHERE state != 'idle';
```

**Sample Data:**
```sql
INSERT INTO sms_conversations (user_id, phone_number, state, context)
VALUES (
  'user123',
  '+12345678901',
  'awaiting_disambiguation',
  '{"last_intent": "transfer_money", "partial_data": {"amount": 500, "recipient": "John"}, "disambiguation_options": [{"id": "ben1", "name": "John Smith"}, {"id": "ben2", "name": "John Doe"}]}'::jsonb
);
```

---

#### 3. `pending_sms_transfers`

**Purpose:** Store transfer details before user confirmation

```sql
CREATE TABLE pending_sms_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  conversation_id UUID REFERENCES sms_conversations(id),

  -- Transfer Details
  beneficiary_id UUID REFERENCES beneficiaries(id) NOT NULL,
  source_amount DECIMAL(12, 2) NOT NULL,
  source_currency VARCHAR(3) DEFAULT 'USD',
  target_amount DECIMAL(12, 2),
  target_currency VARCHAR(3),
  exchange_rate DECIMAL(12, 6),

  -- WISE Quote Reference
  wise_quote_id UUID REFERENCES wise_quotes(id),
  quote_expires_at TIMESTAMPTZ,

  -- Original SMS Data
  raw_message TEXT NOT NULL,
  parsed_intent JSONB,
  -- Example: {
  --   "intent": "transfer_money",
  --   "confidence": 0.95,
  --   "entities": {
  --     "amount": {"value": 500, "currency": "USD"},
  --     "recipient": {"value": "mom", "matched_id": "ben123"}
  --   }
  -- }

  -- Status Tracking
  status VARCHAR(50) DEFAULT 'pending',
  -- Values: 'pending', 'confirmed', 'expired', 'cancelled', 'failed'

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '15 minutes'),
  confirmed_at TIMESTAMPTZ,

  -- Completed Transfer Reference
  completed_transfer_id UUID REFERENCES wise_transfers(id),

  -- Constraints
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
CREATE INDEX idx_pending_sms_expires ON pending_sms_transfers(expires_at)
  WHERE status = 'pending';
CREATE INDEX idx_pending_sms_beneficiary ON pending_sms_transfers(beneficiary_id);
```

**Sample Data:**
```sql
INSERT INTO pending_sms_transfers (
  user_id, phone_number, beneficiary_id, source_amount,
  target_amount, target_currency, exchange_rate,
  wise_quote_id, raw_message, status
)
VALUES (
  'user123',
  '+12345678901',
  'ben123',
  500.00,
  41250.00,
  'INR',
  82.50,
  'quote789',
  'Send $500 to mom',
  'pending'
);
```

---

#### 4. `sms_transfer_tokens`

**Purpose:** Secure one-time tokens for web confirmation

```sql
CREATE TABLE sms_transfer_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  pending_transfer_id UUID REFERENCES pending_sms_transfers(id) NOT NULL,

  -- Token Data
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  short_token VARCHAR(10) NOT NULL UNIQUE,

  phone_number VARCHAR(20) NOT NULL,

  -- Security Tracking
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  used_ip INET,
  used_user_agent TEXT,

  -- Expiration
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT token_valid_expiry CHECK (expires_at > created_at),
  CONSTRAINT token_used_timestamp CHECK (
    (is_used = TRUE AND used_at IS NOT NULL) OR
    (is_used = FALSE AND used_at IS NULL)
  )
);

CREATE UNIQUE INDEX idx_sms_tokens_short ON sms_transfer_tokens(short_token)
  WHERE is_used = FALSE;
CREATE INDEX idx_sms_tokens_pending ON sms_transfer_tokens(pending_transfer_id);
CREATE INDEX idx_sms_tokens_expires ON sms_transfer_tokens(expires_at)
  WHERE is_used = FALSE;
CREATE INDEX idx_sms_tokens_user ON sms_transfer_tokens(user_id);
```

**Sample Data:**
```sql
INSERT INTO sms_transfer_tokens (
  user_id, pending_transfer_id, token_hash, short_token,
  phone_number, expires_at
)
VALUES (
  'user123',
  'pending456',
  'a1b2c3d4e5f6...', -- SHA-256 hash
  'xYz9K',
  '+12345678901',
  NOW() + INTERVAL '15 minutes'
);
```

---

#### 5. `beneficiary_nicknames`

**Purpose:** Map friendly nicknames to beneficiaries for SMS

```sql
CREATE TABLE beneficiary_nicknames (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  beneficiary_id UUID REFERENCES beneficiaries(id) NOT NULL,
  nickname VARCHAR(100) NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT nickname_not_empty CHECK (LENGTH(TRIM(nickname)) > 0),
  UNIQUE(user_id, nickname),
  UNIQUE(user_id, beneficiary_id, nickname)
);

CREATE INDEX idx_beneficiary_nicknames_user ON beneficiary_nicknames(user_id);
CREATE INDEX idx_beneficiary_nicknames_beneficiary ON beneficiary_nicknames(beneficiary_id);
CREATE INDEX idx_beneficiary_nicknames_search ON beneficiary_nicknames
  USING gin(to_tsvector('english', nickname));
```

**Sample Data:**
```sql
INSERT INTO beneficiary_nicknames (user_id, beneficiary_id, nickname)
VALUES
  ('user123', 'ben123', 'mom'),
  ('user123', 'ben123', 'mother'),
  ('user123', 'ben456', 'dad'),
  ('user123', 'ben789', 'brother'),
  ('user123', 'ben789', 'bro');
```

---

#### 6. `sms_messages_log`

**Purpose:** Audit trail of all SMS messages for debugging

```sql
CREATE TABLE sms_messages_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES sms_conversations(id),
  user_id UUID REFERENCES users(id),

  -- Message Details
  direction VARCHAR(10) NOT NULL, -- 'inbound' or 'outbound'
  phone_number VARCHAR(20) NOT NULL,
  message_body TEXT NOT NULL,

  -- AgentPhone Metadata
  agentphone_message_id VARCHAR(255),
  agentphone_conversation_id VARCHAR(255),
  channel VARCHAR(20), -- 'sms' or 'mms'

  -- Status (for outbound messages)
  status VARCHAR(50), -- 'sent', 'delivered', 'failed'
  error_message TEXT,

  -- Webhook Data (for inbound)
  webhook_signature VARCHAR(255),
  webhook_timestamp BIGINT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_direction CHECK (direction IN ('inbound', 'outbound')),
  CONSTRAINT valid_channel CHECK (channel IN ('sms', 'mms'))
);

CREATE INDEX idx_sms_log_conv ON sms_messages_log(conversation_id);
CREATE INDEX idx_sms_log_user ON sms_messages_log(user_id);
CREATE INDEX idx_sms_log_phone ON sms_messages_log(phone_number);
CREATE INDEX idx_sms_log_time ON sms_messages_log(created_at DESC);
CREATE INDEX idx_sms_log_direction ON sms_messages_log(direction, created_at DESC);
```

---

### Database Migration File

**File:** `supabase/migrations/003_sms_integration.sql`

```sql
-- Migration: SMS Integration for AgentPhone
-- Version: 1.0
-- Date: 2026-05-16

BEGIN;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- For fuzzy text matching
CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; -- For UUID generation

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
CREATE INDEX idx_sms_conv_expires ON sms_conversations(expires_at)
  WHERE state != 'idle';

-- 3. Pending SMS Transfers
CREATE TABLE pending_sms_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  conversation_id UUID REFERENCES sms_conversations(id),
  beneficiary_id UUID REFERENCES beneficiaries(id) NOT NULL,
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

CREATE INDEX idx_pending_sms_phone ON pending_sms_transfers(phone_number);
CREATE INDEX idx_pending_sms_user ON pending_sms_transfers(user_id);
CREATE INDEX idx_pending_sms_status ON pending_sms_transfers(status)
  WHERE status = 'pending';
CREATE INDEX idx_pending_sms_expires ON pending_sms_transfers(expires_at)
  WHERE status = 'pending';
CREATE INDEX idx_pending_sms_beneficiary ON pending_sms_transfers(beneficiary_id);

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
  CONSTRAINT token_valid_expiry CHECK (expires_at > created_at),
  CONSTRAINT token_used_timestamp CHECK (
    (is_used = TRUE AND used_at IS NOT NULL) OR
    (is_used = FALSE AND used_at IS NULL)
  )
);

CREATE UNIQUE INDEX idx_sms_tokens_short ON sms_transfer_tokens(short_token)
  WHERE is_used = FALSE;
CREATE INDEX idx_sms_tokens_pending ON sms_transfer_tokens(pending_transfer_id);
CREATE INDEX idx_sms_tokens_expires ON sms_transfer_tokens(expires_at)
  WHERE is_used = FALSE;
CREATE INDEX idx_sms_tokens_user ON sms_transfer_tokens(user_id);

-- 5. Beneficiary Nicknames
CREATE TABLE beneficiary_nicknames (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  beneficiary_id UUID REFERENCES beneficiaries(id) NOT NULL,
  nickname VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT nickname_not_empty CHECK (LENGTH(TRIM(nickname)) > 0),
  UNIQUE(user_id, nickname),
  UNIQUE(user_id, beneficiary_id, nickname)
);

CREATE INDEX idx_beneficiary_nicknames_user ON beneficiary_nicknames(user_id);
CREATE INDEX idx_beneficiary_nicknames_beneficiary ON beneficiary_nicknames(beneficiary_id);
CREATE INDEX idx_beneficiary_nicknames_search ON beneficiary_nicknames
  USING gin(to_tsvector('english', nickname));

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

CREATE INDEX idx_sms_log_conv ON sms_messages_log(conversation_id);
CREATE INDEX idx_sms_log_user ON sms_messages_log(user_id);
CREATE INDEX idx_sms_log_phone ON sms_messages_log(phone_number);
CREATE INDEX idx_sms_log_time ON sms_messages_log(created_at DESC);
CREATE INDEX idx_sms_log_direction ON sms_messages_log(direction, created_at DESC);

-- Auto-cleanup function for expired records
CREATE OR REPLACE FUNCTION cleanup_expired_sms_data()
RETURNS void AS $$
BEGIN
  -- Mark expired pending transfers
  UPDATE pending_sms_transfers
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'pending' AND expires_at < NOW();

  -- Clean up old conversation states
  UPDATE sms_conversations
  SET state = 'idle', context = '{}'::jsonb, updated_at = NOW()
  WHERE state != 'idle' AND expires_at < NOW();

  -- Optionally delete old logs (keep 30 days)
  DELETE FROM sms_messages_log
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Create scheduled job (if pg_cron is available)
-- SELECT cron.schedule('cleanup-sms-data', '*/30 * * * *', 'SELECT cleanup_expired_sms_data()');

COMMIT;
```

---

## API Specifications

### API Endpoints Overview

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/sms/webhook` | POST | Receive AgentPhone webhooks | Signature |
| `/api/sms/transfer/verify` | GET | Validate token & get transfer details | Token |
| `/api/sms/transfer/execute` | POST | Execute confirmed transfer | Token |
| `/api/sms/link-phone` | POST | Link phone to user account | User Session |
| `/api/sms/verify-phone` | POST | Verify phone with OTP | Public |
| `/api/sms/send` | POST | Send SMS (internal use) | API Key |

---

### 1. Webhook Handler

**Endpoint:** `POST /api/sms/webhook`

**Purpose:** Receive incoming SMS events from AgentPhone

**Authentication:** HMAC-SHA256 signature verification

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
  },
  "conversationState": {},
  "recentHistory": []
}
```

**Response:**
```json
{
  "received": true
}
```
**Status:** 200 OK (always return success)

**Error Codes:**
- 401: Invalid signature
- 400: Invalid timestamp

---

### 2. Transfer Verification

**Endpoint:** `GET /api/sms/transfer/verify?token={short_token}`

**Purpose:** Validate token and retrieve transfer details for web confirmation

**Authentication:** Token-based (in query param)

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
    "beneficiary": {
      "id": "ben_123",
      "name": "Maria Garcia",
      "account_type": "UPI",
      "last4": "1234",
      "avatar_url": null
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
  "error": "Token expired" | "Token not found" | "Token already used"
}
```

**Status Codes:**
- 200: Valid token
- 400: Invalid/expired/used token
- 404: Token not found

---

### 3. Transfer Execution

**Endpoint:** `POST /api/sms/transfer/execute`

**Purpose:** Execute the transfer after user web confirmation

**Authentication:** Token-based (in request body)

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
  "status": "processing",
  "details": {
    "amount": 500.00,
    "currency": "USD",
    "recipient": "Maria Garcia",
    "completed_at": "2025-01-15T12:05:30Z"
  },
  "receipt_url": "https://vitta.app/receipt/wise_transfer_789"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Token expired",
  "error_code": "TOKEN_EXPIRED"
}
```

**Error Codes:**
- `TOKEN_EXPIRED`: Token past expiration
- `TOKEN_USED`: Token already used
- `TOKEN_INVALID`: Token not found or invalid
- `QUOTE_EXPIRED`: WISE quote expired (should auto-refresh)
- `INSUFFICIENT_BALANCE`: Not enough funds in WISE account
- `TRANSFER_FAILED`: WISE API error

**Status Codes:**
- 200: Transfer successful
- 400: Invalid request (bad token, expired, etc.)
- 500: Server error (WISE API failure)

---

### 4. Phone Linking

**Endpoint:** `POST /api/sms/link-phone`

**Purpose:** Link a phone number to user account (initial setup)

**Authentication:** User session (authenticated)

**Request Body:**
```json
{
  "phone_number": "+12345678901"
}
```

**Response:**
```json
{
  "success": true,
  "verification_required": true,
  "message": "Verification code sent to +1 (234) 567-8901"
}
```

**Status Codes:**
- 200: Phone link initiated
- 400: Invalid phone format
- 409: Phone already linked to another account

---

## Security Model

### Authentication Layers

```
Layer 1: Webhook Authentication (AgentPhone → Vitta)
  ↓ HMAC-SHA256 signature
  ↓ Timestamp validation (< 5 min)
  ↓

Layer 2: Phone → User Mapping
  ↓ Query user_phone_numbers table
  ↓ Verify phone is verified & active
  ↓

Layer 3: Transfer Token (Web Confirmation)
  ↓ JWT validation
  ↓ One-time use check
  ↓ Expiration check (15 min)
  ↓

Layer 4: WISE API Authentication
  ↓ API key (server-side only)
  ↓ Per-transfer authorization
```

### Webhook Signature Verification

**Implementation:** `services/agentphone/webhookVerifier.js`

```javascript
import crypto from 'crypto';

export function verifyWebhookSignature(req) {
  const signature = req.headers['x-webhook-signature'];
  const timestamp = req.headers['x-webhook-timestamp'];
  const rawBody = JSON.stringify(req.body);

  // Step 1: Check timestamp (reject old requests)
  const now = Math.floor(Date.now() / 1000);
  const requestAge = now - parseInt(timestamp);

  if (requestAge > 300) { // 5 minutes
    throw new Error('Webhook timestamp too old');
  }

  // Step 2: Compute expected signature
  const payload = `${timestamp}.${rawBody}`;
  const secret = process.env.AGENTPHONE_WEBHOOK_SECRET;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  const expected = `sha256=${expectedSignature}`;

  // Step 3: Constant-time comparison
  if (!crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  )) {
    throw new Error('Invalid webhook signature');
  }

  return true;
}
```

### Token Security

**Token Generation:**
```javascript
// 1. Create JWT with claims
const payload = {
  transferId: 'pending_123',
  userId: 'user_789',
  amount: 500,
  beneficiaryId: 'ben_456',
  iat: 1705320000,
  exp: 1705320900 // +15 min
};

// 2. Sign with secret
const jwt = sign(payload, SECRET, { algorithm: 'HS256' });

// 3. Create short URL-safe version (8 chars)
const shortToken = crypto
  .createHash('sha256')
  .update(jwt)
  .digest('base64url')
  .substring(0, 8);

// 4. Store hash in database (not plain JWT)
const tokenHash = crypto
  .createHash('sha256')
  .update(jwt)
  .digest('hex');
```

**Security Properties:**
- ✅ Signed (prevents tampering)
- ✅ Expiring (15 min window)
- ✅ One-time use (marked in DB)
- ✅ Hashed storage (no plain tokens in DB)
- ✅ Short & URL-safe (user-friendly)

### Rate Limiting

**Per Phone Number:**
- Max 5 transfer requests per hour
- Max 10 SMS messages per hour
- Max 3 pending transfers at once

**Implementation:**
```javascript
// Check rate limit before processing
async function checkRateLimit(phoneNumber, action) {
  const recentCount = await supabase
    .from('sms_messages_log')
    .select('id', { count: 'exact' })
    .eq('phone_number', phoneNumber)
    .eq('direction', 'inbound')
    .gte('created_at', new Date(Date.now() - 3600000)) // 1 hour
    .limit(11);

  if (recentCount.count >= 10) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }
}
```

### Fraud Detection

**Red Flags:**
- First transfer > $1000
- New beneficiary + large amount
- Multiple failed attempts
- Rapid succession of transfers

**Mitigation:**
- Require additional verification for flagged transfers
- Lower initial limits for new users
- Email notification for all transfers
- 24-hour cooling period for new beneficiaries

---

## Message Templates

### Template System

**File:** `services/sms/messageTemplates.js`

```javascript
const EMOJI = {
  money: '💰',
  success: '✅',
  error: '❌',
  warning: '⚠️',
  clock: '⏰',
  arrow: '👉'
};

export function buildTransferReadyMessage(transferData, confirmURL) {
  return `${EMOJI.money} Transfer Ready

Amount: $${transferData.source_amount.toFixed(2)} USD
To: ${transferData.beneficiary.name}
Account: ${transferData.beneficiary.account_type} ****${transferData.beneficiary.last4}
Fee: $0.01

Tap to review & confirm:
${EMOJI.arrow} ${confirmURL}

Link expires in 15 minutes`;
}

export function buildTransferCompleteMessage(transferData) {
  return `${EMOJI.success} Transfer Complete!

$${transferData.source_amount.toFixed(2)} sent to ${transferData.beneficiary.name}
Reference: ${transferData.reference}
Time: ${formatTime(transferData.completed_at)}

View receipt: ${transferData.receipt_url}`;
}

export function buildDisambiguationMessage(matches) {
  const options = matches
    .map((m, i) => `${i + 1}️⃣ ${m.name} (${m.account_type})`)
    .join('\n');

  return `I found ${matches.length} contacts:

${options}

Reply with the number (1-${matches.length})`;
}

export function buildErrorMessage(errorType, context = {}) {
  const templates = {
    beneficiary_not_found: `${EMOJI.error} Couldn't find '${context.name}'

Add ${context.name} in the Vitta app:
${EMOJI.arrow} ${context.addBeneficiaryURL}

Or try the full name.`,

    invalid_amount: `${EMOJI.error} Invalid amount

Try: "Send $50 to mom"`,

    rate_limit: `${EMOJI.warning} Too many requests

Please wait a few minutes and try again.`,

    insufficient_balance: `${EMOJI.error} Insufficient balance

Need: $${context.required}
Have: $${context.available}

Add funds: ${context.fundingURL}`
  };

  return templates[errorType] || `${EMOJI.error} Something went wrong. Please try again.`;
}
```

### Message Length Optimization

**SMS Limits:**
- Standard SMS: 160 characters
- Unicode SMS: 70 characters
- Long SMS: 153 chars per segment (concatenated)

**Strategy:**
- Keep core messages under 160 chars when possible
- Use shortened URLs (vitta.app/c/xYz9K instead of full path)
- Minimal emoji usage
- Abbreviate where clear (e.g., "acct" instead of "account")

---

## Implementation Plan

### Phase 1: Foundation (2-3 hours)

**Tasks:**
1. Create database migration (`003_sms_integration.sql`)
2. Run migration on local Supabase
3. Create AgentPhone client service
4. Implement webhook signature verification
5. Set up webhook endpoint skeleton

**Deliverables:**
- ✅ Database tables created
- ✅ Webhook endpoint receiving events
- ✅ Signature verification working

**Testing:**
```bash
# Test webhook signature
curl -X POST http://localhost:3000/api/sms/webhook \
  -H "X-Webhook-Signature: sha256=..." \
  -H "X-Webhook-Timestamp: $(date +%s)" \
  -d '{"event":"agent.message","data":{}}'
```

---

### Phase 2: Intent Parsing (1-2 hours)

**Tasks:**
1. Build SMS intent parser with regex patterns
2. Implement entity extractor (amount, recipient)
3. Create beneficiary matcher service
4. Add conversation state manager

**Deliverables:**
- ✅ Parse "Send $X to Y" correctly
- ✅ Handle disambiguation
- ✅ Match nicknames to beneficiaries

**Testing:**
```javascript
// Unit tests
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
3. Create WISE quote integration
4. Build message templates

**Deliverables:**
- ✅ Create pending transfers with quotes
- ✅ Generate secure tokens
- ✅ Build confirmation URLs

---

### Phase 4: Web Confirmation Screen (2 hours)

**Tasks:**
1. Create `/transfer/confirm/[token]` page
2. Build transfer details UI component
3. Implement transfer execution API
4. Add loading states and error handling

**Deliverables:**
- ✅ Beautiful confirmation screen
- ✅ Execute transfers on confirm
- ✅ Handle errors gracefully

---

### Phase 5: Integration & Testing (1.5 hours)

**Tasks:**
1. Connect webhook → parser → pending transfer → SMS response
2. Test end-to-end flow
3. Add error handling throughout
4. Test with AgentPhone sandbox

**Deliverables:**
- ✅ Complete SMS-to-web flow working
- ✅ All error cases handled
- ✅ Logs for debugging

---

### Total Time Estimate: 8-10 hours

---

## Testing Strategy

### Unit Tests

```javascript
// services/sms/__tests__/smsIntentParser.test.js
describe('SMS Intent Parser', () => {
  test('parses transfer intent with dollar sign', () => {
    const result = parseIntent('Send $500 to mom');
    expect(result.intent).toBe('transfer_money');
    expect(result.entities.amount.value).toBe(500);
  });

  test('parses transfer intent without dollar sign', () => {
    const result = parseIntent('transfer 250 dollars to John');
    expect(result.entities.amount.value).toBe(250);
  });

  test('handles disambiguation response', () => {
    const result = parseIntent('1', { state: 'awaiting_disambiguation' });
    expect(result.intent).toBe('disambiguation_response');
    expect(result.entities.selection).toBe(1);
  });
});
```

### Integration Tests

```javascript
// __tests__/integration/sms-transfer-flow.test.js
describe('SMS Transfer Flow', () => {
  test('complete transfer flow', async () => {
    // 1. Simulate incoming SMS
    const webhookResponse = await POST('/api/sms/webhook', {
      data: { body: 'Send $100 to mom', from: '+1234567890' }
    });
    expect(webhookResponse.status).toBe(200);

    // 2. Check SMS sent with link
    const sentMessages = await getSentMessages('+1234567890');
    expect(sentMessages[0].body).toContain('vitta.app/confirm/');

    // 3. Extract token and validate
    const token = extractToken(sentMessages[0].body);
    const verifyResponse = await GET(`/api/sms/transfer/verify?token=${token}`);
    expect(verifyResponse.data.valid).toBe(true);

    // 4. Execute transfer
    const executeResponse = await POST('/api/sms/transfer/execute', { token });
    expect(executeResponse.data.success).toBe(true);

    // 5. Verify completion SMS sent
    const confirmMessages = await getSentMessages('+1234567890');
    expect(confirmMessages[1].body).toContain('Transfer Complete');
  });
});
```

### Manual Testing Checklist

**Happy Path:**
- [ ] Send "Send $500 to mom" → Receive confirmation link
- [ ] Tap link → See beautiful confirmation screen
- [ ] Click Confirm → Transfer executes
- [ ] Receive completion SMS

**Disambiguation:**
- [ ] Send "Send $200 to John" (multiple Johns exist)
- [ ] Receive options "1️⃣ John Smith 2️⃣ John Doe"
- [ ] Reply "1" → Continue with John Smith

**Error Cases:**
- [ ] Send "Send $100 to unknown" → Receive error message
- [ ] Send invalid message → Receive help message
- [ ] Wait 16 minutes → Link expired error

---

## Hackathon Demo Plan

### Pre-Demo Setup (15 minutes before)

**1. Environment:**
```bash
# Verify all services running
npm run dev  # Vitta app on localhost:3000
# AgentPhone webhook pointing to ngrok tunnel
```

**2. Test Data:**
```sql
-- Insert demo user with phone linked
INSERT INTO user_phone_numbers (user_id, phone_number, is_verified)
VALUES ('demo_user', '+15551234567', TRUE);

-- Insert beneficiary "Mom" with nickname
INSERT INTO beneficiary_nicknames (user_id, beneficiary_id, nickname)
VALUES ('demo_user', 'mom_beneficiary', 'mom');
```

**3. Phone Setup:**
- iPhone connected to projector via AirPlay
- Messages app open
- AgentPhone number saved as contact

---

### Demo Script (5 minutes)

**SLIDE 1: Problem Statement** (30 seconds)
```
"Sending money internationally is complicated:
 - Download an app
 - Create account
 - Add payment method
 - Navigate complex UI
 - Takes 10+ minutes for first transfer"
```

**SLIDE 2: Solution** (30 seconds)
```
"What if you could just... text?"

[Show Messages app on phone]
```

**DEMO PART 1: The Magic** (2 minutes)
```
[Type on phone, visible on screen]
YOU: "Send $500 to mom"

[Wait 2-3 seconds]

VITTA: "💰 Transfer Ready
       $500 → Mom (Maria Garcia)
       👉 vitta.app/confirm/xYz9K"

[Tap the link - phone screen now showing web app]
[Show beautiful confirmation screen with all details]
[Click "Confirm Transfer" button]
[Show success screen]

VITTA: "✅ Transfer Complete!
       $500 sent to Maria Garcia"

AUDIENCE: [Applause]
```

**DEMO PART 2: Behind the Scenes** (1 minute)
```
[Switch to laptop]
[Show webhook logs in terminal]
[Show database - pending transfer created]
[Show token generation]
[Show WISE API call]

"All in 3 seconds. Real money. Real transfer."
```

**SLIDE 3: Technical Innovation** (1 minute)
```
Architecture Highlights:
✅ SMS→ Web handoff (security + UX)
✅ JWT token with 15-min expiry
✅ WISE API integration (real transfers)
✅ Natural language parsing
✅ Zero app download required

Built in 10 hours for this hackathon.
```

**CLOSING** (30 seconds)
```
"International transfers should be as easy as texting a friend.

No app. No account setup. Just text.

Thank you!"
```

---

### Backup Plans

**If SMS delays:**
- Have pre-recorded video ready
- Show webhook logs proving message received

**If WISE API fails:**
- Demo mode flag to bypass actual transfer
- Show mocked success response

**If phone/projector fails:**
- Screen recording ready to play
- Slides with screenshots of each step

---

## Appendix

### A. Environment Variables

```bash
# .env.local

# AgentPhone
AGENTPHONE_API_KEY=your_api_key_here
AGENTPHONE_WEBHOOK_SECRET=your_webhook_secret_here
AGENTPHONE_PROJECT_ID=your_project_id
AGENTPHONE_AGENT_ID=your_agent_id

# Transfer Tokens
TRANSFER_TOKEN_SECRET=your_random_secure_string_min_32_chars

# App Configuration
NEXT_PUBLIC_APP_URL=https://vitta.app
# or http://localhost:3000 for development

# Existing Vitta environment variables
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
OPENAI_API_KEY=your_openai_key
WISE_API_KEY=your_wise_api_key
# ... (other existing vars)
```

---

### B. File Structure

```
Vitta/
├── docs/
│   ├── SMS_INTEGRATION_DESIGN.md          (this document)
│   └── SMS_INTEGRATION_DESIGN_PART2.md    (continuation)
│
├── pages/
│   ├── api/
│   │   └── sms/
│   │       ├── webhook.js                  # AgentPhone webhook handler
│   │       ├── send.js                     # Internal SMS send API
│   │       ├── link-phone.js               # Link phone to account
│   │       ├── verify-phone.js             # Verify phone with OTP
│   │       └── transfer/
│   │           ├── verify.js               # Validate token & get details
│   │           └── execute.js              # Execute confirmed transfer
│   │
│   └── transfer/
│       └── confirm/
│           └── [token].js                  # Web confirmation screen
│
├── components/
│   └── sms/
│       ├── SMSTransferConfirm.js          # Transfer confirmation UI
│       ├── SMSTransferReceipt.js          # Receipt display
│       ├── SMSLinkPhone.js                # Phone linking UI
│       └── SMSErrorScreen.js              # Error states
│
├── services/
│   ├── sms/
│   │   ├── smsIntentParser.js             # Intent classification
│   │   ├── smsConversationManager.js      # Conversation state
│   │   ├── pendingTransferService.js      # Pending transfer CRUD
│   │   ├── transferTokenService.js        # Token gen & validation
│   │   ├── beneficiaryMatcher.js          # Name/nickname matching
│   │   └── messageTemplates.js            # SMS templates
│   │
│   └── agentphone/
│       ├── agentphoneClient.js            # API client
│       └── webhookVerifier.js             # Signature verification
│
├── supabase/
│   └── migrations/
│       └── 003_sms_integration.sql        # Database schema
│
└── __tests__/
    └── sms/
        ├── webhook.test.js
        ├── intentParser.test.js
        ├── beneficiaryMatcher.test.js
        ├── tokenService.test.js
        └── e2e-sms-flow.test.js
```

---

### C. AgentPhone API Reference

**Base URL:** `https://api.agentphone.ai`

**Authentication:** `Authorization: Bearer {API_KEY}`

**Send Message:**
```http
POST /v1/messages
Content-Type: application/json

{
  "agentId": "agt_abc123",
  "to": "+12345678901",
  "body": "Your message here",
  "channel": "sms"
}
```

**Get Conversation:**
```http
GET /v1/conversations/{conversation_id}
```

**Webhook Configuration:**
```http
POST /v1/webhooks
Content-Type: application/json

{
  "url": "https://your-domain.com/api/sms/webhook",
  "contextLimit": 10,
  "timeout": 30
}
```

---

### D. WISE API Integration Points

**Services Used:**
- `wiseQuoteService.createQuote()` - Get exchange rate
- `wiseOrchestrator.executeTransfer()` - Complete transfer
- `wiseRecipientService.get()` - Get beneficiary details

**No Changes Required** - Existing WISE integration works as-is.

---

### E. Glossary

| Term | Definition |
|------|------------|
| **AgentPhone** | SMS platform providing phone numbers and webhook delivery |
| **Pending Transfer** | Transfer awaiting user confirmation via web |
| **Short Token** | 8-character URL-safe token for confirmation links |
| **Disambiguation** | Clarifying which beneficiary when multiple matches |
| **10DLC** | 10-Digit Long Code (US phone number format for A2P messaging) |
| **E.164** | International phone number format (+1234567890) |
| **HMAC** | Hash-based Message Authentication Code |

---

### F. Success Criteria

**Technical:**
- [ ] < 3 sec SMS response time
- [ ] 100% webhook signature validation
- [ ] 0 plain-text tokens in database
- [ ] Token expiry enforced
- [ ] All transfers logged

**User Experience:**
- [ ] Single confirmation step
- [ ] Clear error messages
- [ ] Mobile-responsive web UI
- [ ] Graceful timeout handling

**Demo:**
- [ ] 3+ successful live transfers
- [ ] No manual intervention required
- [ ] Audience can understand flow
- [ ] "Wow" factor achieved

---

### G. Future Enhancements

**Post-Hackathon:**
1. Multi-currency support in SMS ("Send 100 EUR to John")
2. Recurring transfers ("Send $500 to mom monthly")
3. Voice commands via AgentPhone voice API
4. Group splits ("Split $200 between mom and dad")
5. Transaction history via SMS ("What did I send this month?")
6. Balance inquiries ("What's my WISE balance?")
7. 2FA for high-value transfers
8. Biometric confirmation on web

---

## Document Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-05-16 | Initial design document | Claude Code |

---

**End of Design Document**

For implementation questions, refer to individual component specifications above.
For API testing, see Testing Strategy section.
For demo preparation, see Hackathon Demo Plan.
