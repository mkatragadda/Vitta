# ⚠️ ARCHIVED - Wise API Database Schema Design

**ARCHIVED ON:** April 11, 2026
**REASON:** Consolidated into main implementation document
**REFER TO:** `docs/VITTA_TRAVEL_PAY_IMPLEMENTATION.md` (Phase 2 section)

---

**This file has been archived.** All information has been merged into the single source of truth:
- **Main Document:** `docs/VITTA_TRAVEL_PAY_IMPLEMENTATION.md`
- **Database Schema:** `supabase/migrations/001-travel-pay-wise-api.sql`

---

## Original Content (For Reference Only)

**Date:** April 10, 2026
**Version:** 2.0 (Revised)

---

## Wise API Transfer Flow

Based on official Wise API documentation, the complete transfer flow is:

```
1. CREATE QUOTE          → POST /v3/quotes
2. CREATE/GET RECIPIENT  → POST /v1/accounts (or GET if exists)
3. CREATE TRANSFER       → POST /v1/transfers
4. FUND TRANSFER         → POST /v3/profiles/{profileId}/transfers/{transferId}/payments
5. POLL STATUS           → GET /v1/transfers/{transferId}
```

---

## Database Tables Architecture

### Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         WISE API MAPPING                             │
└─────────────────────────────────────────────────────────────────────┘

USER FLOW                  WISE API CALL              DATABASE TABLE
─────────────────────────────────────────────────────────────────────

1. Scan QR Code      →                          →  upi_scans
   (Extract UPI ID)

2. Get Exchange Rate → GET /v1/rates            →  (cached, not stored)

3. Create Quote      → POST /v3/quotes          →  wise_quotes
   Lock rate                                        - quote_id
                                                    - rate
                                                    - expires_at

4. Create Recipient  → POST /v1/accounts        →  wise_recipients
   (if new UPI ID)      OR GET /v1/accounts         - recipient_id
                                                    - upi_id
                                                    - account_id (Wise)

5. Create Transfer   → POST /v1/transfers       →  wise_transfers
   Link quote +                                     - transfer_id (Wise)
   recipient                                        - quote_id (FK)
                                                    - recipient_id (FK)
                                                    - status

6. Fund Transfer     → POST .../payments        →  wise_payments
   Execute payment                                  - payment_id
                                                    - transfer_id (FK)
                                                    - funding_status

7. Poll Status       → GET /v1/transfers/{id}   →  wise_transfer_events
   Track updates                                    - event log
                                                    - status changes
```

---

## Table Definitions

### 1. UPI_SCANS (unchanged - QR scan records)

**Purpose:** Store QR code scans and extracted UPI payment details

**Wise API Mapping:** None (pre-Wise step)

```sql
CREATE TABLE IF NOT EXISTS upi_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- QR Code Data
  raw_qr_data TEXT NOT NULL,
  upi_id VARCHAR(255) NOT NULL,                    -- merchant@paytm
  payee_name VARCHAR(255),
  amount NUMERIC(12,2),
  currency VARCHAR(3) DEFAULT 'INR',
  transaction_note TEXT,
  merchant_code VARCHAR(100),

  -- Scan Metadata
  scan_location JSONB,
  device_info JSONB,
  scan_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Processing Status
  status VARCHAR(50) DEFAULT 'scanned',             -- scanned, quoted, recipient_created, transfer_initiated, paid, failed

  -- Foreign Keys (populated as flow progresses)
  wise_quote_id UUID REFERENCES wise_quotes(id),
  wise_recipient_id UUID REFERENCES wise_recipients(id),
  wise_transfer_id UUID REFERENCES wise_transfers(id),

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT check_scan_status CHECK (status IN ('scanned', 'quoted', 'recipient_created', 'transfer_initiated', 'paid', 'failed', 'cancelled'))
);

CREATE INDEX idx_upi_scans_user_id ON upi_scans(user_id);
CREATE INDEX idx_upi_scans_status ON upi_scans(status);
CREATE INDEX idx_upi_scans_upi_id ON upi_scans(upi_id);
CREATE INDEX idx_upi_scans_created_at ON upi_scans(created_at DESC);
```

---

### 2. WISE_QUOTES (Step 1: Quote Creation)

**Purpose:** Store quotes from Wise Quote API
**Wise API:** `POST /v3/quotes`
**Wise Response Fields:** id, rate, sourceAmount, targetAmount, fee, expirationTime, rateType

```sql
CREATE TABLE IF NOT EXISTS wise_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  upi_scan_id UUID REFERENCES upi_scans(id),

  -- Wise Quote API Response
  wise_quote_id VARCHAR(255) UNIQUE NOT NULL,       -- Wise's quote.id
  source_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  target_currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  source_amount NUMERIC(10,2) NOT NULL,
  target_amount NUMERIC(12,2) NOT NULL,
  exchange_rate NUMERIC(10,4) NOT NULL,             -- quote.rate

  -- Fee Structure (from quote.paymentOptions[0].fee)
  fee_total NUMERIC(10,2) DEFAULT 0,
  fee_transferwise NUMERIC(10,2) DEFAULT 0,
  fee_partner NUMERIC(10,2) DEFAULT 0,
  total_debit NUMERIC(10,2) NOT NULL,               -- source_amount + fee_total

  -- Quote Type & Validity
  rate_type VARCHAR(50) DEFAULT 'FIXED',            -- quote.rateType (FIXED or FLOATING)
  payment_type VARCHAR(50) DEFAULT 'BALANCE',       -- quote.paymentType
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,     -- quote.expirationTime
  rate_expiry_time TIMESTAMP WITH TIME ZONE,        -- quote.rateExpiryTime (for FLOATING)

  -- Status Tracking
  status VARCHAR(50) DEFAULT 'active',              -- active, used, expired, cancelled
  used_for_transfer_id UUID REFERENCES wise_transfers(id),

  -- Full API Response (for debugging/audit)
  wise_api_response JSONB,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT check_quote_status CHECK (status IN ('active', 'used', 'expired', 'cancelled'))
);

CREATE INDEX idx_wise_quotes_user_id ON wise_quotes(user_id);
CREATE INDEX idx_wise_quotes_wise_id ON wise_quotes(wise_quote_id);
CREATE INDEX idx_wise_quotes_expires_at ON wise_quotes(expires_at);
CREATE INDEX idx_wise_quotes_status ON wise_quotes(status);
CREATE INDEX idx_wise_quotes_upi_scan_id ON wise_quotes(upi_scan_id);
```

---

### 3. WISE_RECIPIENTS (Step 2: Recipient Creation) - **NEW TABLE**

**Purpose:** Store Wise recipient accounts (reusable UPI accounts)
**Wise API:** `POST /v1/accounts` (create) or `GET /v1/accounts` (retrieve)
**Wise Response Fields:** id, currency, type, details

**Why This Table?**
- Recipients can be reused across multiple transfers
- Avoids recreating the same recipient for repeated payments
- Maps UPI ID → Wise Account ID

```sql
CREATE TABLE IF NOT EXISTS wise_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Wise Recipient API Response
  wise_account_id BIGINT UNIQUE NOT NULL,           -- Wise's account.id (numeric)
  wise_profile_id BIGINT NOT NULL,                  -- Profile that owns this recipient

  -- Recipient Type & Currency
  account_holder_name VARCHAR(255) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  type VARCHAR(50) NOT NULL,                        -- 'indian_upi' for UPI

  -- UPI-Specific Details (details.legalType, details.vpa)
  legal_type VARCHAR(50),                           -- 'PRIVATE' or 'BUSINESS'
  upi_id VARCHAR(255) NOT NULL,                     -- details.vpa (e.g., merchant@paytm)

  -- Business/Merchant Details (optional)
  business_type VARCHAR(100),
  business_name VARCHAR(255),

  -- Recipient Status
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,                -- Set after first successful transfer

  -- Usage Tracking
  total_transfers INT DEFAULT 0,                    -- Number of times used
  last_used_at TIMESTAMP WITH TIME ZONE,

  -- Full API Response
  wise_api_response JSONB,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique constraint: One UPI ID per user per profile
  CONSTRAINT unique_user_upi UNIQUE (user_id, upi_id, wise_profile_id)
);

CREATE INDEX idx_wise_recipients_user_id ON wise_recipients(user_id);
CREATE INDEX idx_wise_recipients_wise_account_id ON wise_recipients(wise_account_id);
CREATE INDEX idx_wise_recipients_upi_id ON wise_recipients(upi_id);
CREATE INDEX idx_wise_recipients_is_active ON wise_recipients(is_active);
```

---

### 4. WISE_TRANSFERS (Step 3: Transfer Creation)

**Purpose:** Store transfer records from Wise Transfer API
**Wise API:** `POST /v1/transfers`
**Wise Response Fields:** id, status, sourceAmount, targetAmount, rate, reference

```sql
CREATE TABLE IF NOT EXISTS wise_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  upi_scan_id UUID REFERENCES upi_scans(id),

  -- Wise Transfer API Response
  wise_transfer_id BIGINT UNIQUE NOT NULL,          -- Wise's transfer.id (numeric)

  -- Foreign Keys to Quote & Recipient
  wise_quote_id UUID NOT NULL REFERENCES wise_quotes(id),
  wise_recipient_id UUID NOT NULL REFERENCES wise_recipients(id),

  -- Transfer Amounts (from Transfer API response)
  source_amount NUMERIC(10,2) NOT NULL,
  source_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  target_amount NUMERIC(12,2) NOT NULL,
  target_currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  exchange_rate NUMERIC(10,4) NOT NULL,

  -- Transfer Details
  reference VARCHAR(255),                           -- transfer.reference (user-visible)
  customer_transaction_id UUID,                     -- Our idempotency key

  -- Transfer Status (from Wise API)
  wise_status VARCHAR(100) NOT NULL,                -- incoming_payment_waiting, processing, outgoing_payment_sent, funds_converted, etc.
  status VARCHAR(50) NOT NULL DEFAULT 'pending',    -- Our simplified status

  -- Delivery Estimates
  estimated_delivery_at TIMESTAMP WITH TIME ZONE,
  actual_delivery_at TIMESTAMP WITH TIME ZONE,

  -- Payment Information (populated after funding)
  is_funded BOOLEAN DEFAULT false,
  funded_at TIMESTAMP WITH TIME ZONE,
  wise_payment_id UUID REFERENCES wise_payments(id),

  -- Error Handling
  error_code VARCHAR(100),
  error_message TEXT,

  -- Full API Response
  wise_api_response JSONB,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT check_transfer_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled'))
);

CREATE INDEX idx_wise_transfers_user_id ON wise_transfers(user_id);
CREATE INDEX idx_wise_transfers_wise_id ON wise_transfers(wise_transfer_id);
CREATE INDEX idx_wise_transfers_quote_id ON wise_transfers(wise_quote_id);
CREATE INDEX idx_wise_transfers_recipient_id ON wise_transfers(wise_recipient_id);
CREATE INDEX idx_wise_transfers_status ON wise_transfers(status);
CREATE INDEX idx_wise_transfers_wise_status ON wise_transfers(wise_status);
CREATE INDEX idx_wise_transfers_created_at ON wise_transfers(created_at DESC);
```

---

### 5. WISE_PAYMENTS (Step 4: Payment/Funding) - **NEW TABLE**

**Purpose:** Store payment/funding records
**Wise API:** `POST /v3/profiles/{profileId}/transfers/{transferId}/payments`
**Wise Response Fields:** status, type, balanceTransactionId

```sql
CREATE TABLE IF NOT EXISTS wise_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Link to Transfer
  wise_transfer_id UUID NOT NULL REFERENCES wise_transfers(id) ON DELETE CASCADE,

  -- Payment Method
  payment_type VARCHAR(50) NOT NULL,                -- 'BALANCE', 'BANK_TRANSFER', 'CARD', etc.
  funding_source VARCHAR(255),                      -- e.g., 'Plaid Account: *1234'

  -- Payment Status (from Wise Payment API)
  wise_payment_status VARCHAR(100),                 -- 'COMPLETED', 'PENDING', 'FAILED'
  balance_transaction_id BIGINT,                    -- Wise's internal transaction ID

  -- Amount Details
  amount NUMERIC(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',

  -- Timing
  payment_initiated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  payment_completed_at TIMESTAMP WITH TIME ZONE,

  -- Error Handling
  error_code VARCHAR(100),
  error_message TEXT,

  -- Full API Response
  wise_api_response JSONB,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_wise_payments_user_id ON wise_payments(user_id);
CREATE INDEX idx_wise_payments_transfer_id ON wise_payments(wise_transfer_id);
CREATE INDEX idx_wise_payments_status ON wise_payments(wise_payment_status);
CREATE INDEX idx_wise_payments_created_at ON wise_payments(created_at DESC);
```

---

### 6. WISE_TRANSFER_EVENTS (Status Updates) - **NEW TABLE**

**Purpose:** Track status changes and events for transfers
**Wise API:** `GET /v1/transfers/{id}` (polling) or Webhooks
**Why?** Audit trail of all status transitions

```sql
CREATE TABLE IF NOT EXISTS wise_transfer_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wise_transfer_id UUID NOT NULL REFERENCES wise_transfers(id) ON DELETE CASCADE,

  -- Event Details
  event_type VARCHAR(100) NOT NULL,                 -- 'status_change', 'webhook', 'poll_update', 'error'
  old_status VARCHAR(100),
  new_status VARCHAR(100) NOT NULL,

  -- Wise API Data
  wise_event_data JSONB,

  -- Source of Event
  source VARCHAR(50) NOT NULL,                      -- 'api_poll', 'webhook', 'manual'

  -- Timestamp
  event_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_wise_transfer_events_transfer_id ON wise_transfer_events(wise_transfer_id);
CREATE INDEX idx_wise_transfer_events_event_type ON wise_transfer_events(event_type);
CREATE INDEX idx_wise_transfer_events_created_at ON wise_transfer_events(created_at DESC);
```

---

### 7. TRAVEL_PAY_SETTINGS (User Preferences)

**Purpose:** User settings for Travel Pay features
**Wise API Mapping:** None (app-specific)

```sql
CREATE TABLE IF NOT EXISTS travel_pay_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  -- Notification Preferences
  notify_on_scan BOOLEAN DEFAULT true,
  notify_on_quote_expiry BOOLEAN DEFAULT true,
  notify_on_transfer_complete BOOLEAN DEFAULT true,

  -- Auto-behavior
  auto_approve_under_amount NUMERIC(10,2),          -- Auto-approve if amount < $X
  require_biometric BOOLEAN DEFAULT true,

  -- Default Settings
  default_wise_profile_id BIGINT,                   -- User's Wise profile
  preferred_funding_source VARCHAR(50) DEFAULT 'BALANCE',

  -- Limits
  daily_limit_usd NUMERIC(10,2) DEFAULT 1000,
  per_transaction_limit_usd NUMERIC(10,2) DEFAULT 500,
  monthly_limit_usd NUMERIC(12,2) DEFAULT 5000,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## Entity Relationship Diagram

```
┌─────────┐
│  users  │
└────┬────┘
     │
     ├─────────────────────────────────────────────┐
     │                                             │
     │                                             │
┌────▼────────┐         ┌────────────────┐   ┌───▼──────────┐
│  upi_scans  ├────────►│ wise_quotes    │   │  wise_      │
│             │         │                │   │  recipients │
│  - upi_id   │         │  - quote_id    │   │             │
│  - amount   │         │  - rate        │   │  - upi_id   │
│  - status   │         │  - expires_at  │   │  - account_id│
└─────┬───────┘         └────────┬───────┘   └──────┬───────┘
      │                          │                   │
      │                          │                   │
      │         ┌────────────────▼───────────────────▼────┐
      │         │          wise_transfers                 │
      │         │                                          │
      │         │  - transfer_id                           │
      └────────►│  - quote_id (FK)                         │
                │  - recipient_id (FK)                     │
                │  - status                                │
                └───────┬──────────────────────────────────┘
                        │
                        │
        ┌───────────────┼───────────────┐
        │               │               │
  ┌─────▼──────┐  ┌────▼─────────┐  ┌──▼──────────────┐
  │   wise_    │  │    wise_     │  │  wise_transfer_ │
  │  payments  │  │  transfer_   │  │     events      │
  │            │  │   events     │  │                 │
  │ - funding  │  │              │  │  - status       │
  │   status   │  │  - old/new   │  │    changes      │
  └────────────┘  │    status    │  │                 │
                  └──────────────┘  └─────────────────┘
```

---

## Complete Wise API Flow with Database Mapping

### Flow Diagram

```
USER ACTION              WISE API CALL                  DATABASE OPERATION
───────────────────────────────────────────────────────────────────────────

1. Scan QR Code      →  (none)                    →  INSERT upi_scans
   Extract UPI ID                                     SET status='scanned'

2. Get Rate          →  GET /v1/rates             →  (cached, not stored)

3. Create Quote      →  POST /v3/quotes           →  INSERT wise_quotes
                        body: {                        SET wise_quote_id
                          source: "USD",               SET rate, expires_at
                          target: "INR",               SET status='active'
                          sourceAmount: 10
                        }                          →  UPDATE upi_scans
                        response: {                    SET wise_quote_id
                          id: "abc123",                SET status='quoted'
                          rate: 83.45,
                          expirationTime: "..."
                        }

4a. Check Recipient  →  GET /v1/accounts          →  SELECT wise_recipients
    (if exists)         ?profile={id}                 WHERE upi_id='x@y'
                        &currency=INR                 AND user_id={user}

4b. Create Recipient →  POST /v1/accounts         →  INSERT wise_recipients
    (if new)            body: {                        SET wise_account_id
                          profile: {id},               SET upi_id
                          currency: "INR",             SET account_holder_name
                          type: "indian_upi",          SET is_active=true
                          details: {
                            legalType: "PRIVATE",  →  UPDATE upi_scans
                            vpa: "merchant@paytm"      SET wise_recipient_id
                          }                            SET status='recipient_created'
                        }
                        response: {
                          id: 789,
                          currency: "INR",
                          ...
                        }

5. Create Transfer   →  POST /v1/transfers        →  INSERT wise_transfers
                        body: {                        SET wise_transfer_id
                          targetAccount: 789,          SET wise_quote_id (FK)
                          quoteUuid: "abc123",         SET wise_recipient_id (FK)
                          customerTransaction          SET status='pending'
                            Id: "uuid",                SET wise_status
                          details: {
                            reference: "Vitta..."  →  UPDATE upi_scans
                          }                            SET wise_transfer_id
                        }                              SET status='transfer_initiated'
                        response: {
                          id: 456,                 →  INSERT wise_transfer_events
                          status: "incoming_           event_type='status_change'
                            payment_waiting",          new_status='incoming_payment_waiting'
                          ...
                        }

6. Fund Transfer     →  POST /v3/profiles/{id}/  →  INSERT wise_payments
                        transfers/456/payments         SET wise_transfer_id
                        body: {                        SET payment_type='BALANCE'
                          type: "BALANCE"              SET wise_payment_status
                        }
                        response: {                →  UPDATE wise_transfers
                          status: "COMPLETED",         SET is_funded=true
                          balanceTransaction           SET funded_at=NOW()
                            Id: 999                    SET wise_payment_id
                        }                              SET status='processing'
                                                       SET wise_status='processing'

                                                   →  UPDATE upi_scans
                                                       SET status='paid'

                                                   →  INSERT wise_transfer_events
                                                       event_type='status_change'
                                                       new_status='processing'

7. Poll Status       →  GET /v1/transfers/456    →  UPDATE wise_transfers
   (every 30s)          response: {                   SET wise_status
                          status: "outgoing_           SET status (if changed)
                            payment_sent"
                        }                          →  INSERT wise_transfer_events
                                                       (if status changed)

8. Final Status      →  GET /v1/transfers/456    →  UPDATE wise_transfers
                        response: {                   SET status='completed'
                          status: "funds_              SET actual_delivery_at
                            converted"
                        }                          →  INSERT wise_transfer_events
                                                       event_type='status_change'
                                                       new_status='completed'
```

---

## Key Schema Improvements

### What Changed from Original Design?

1. **Added `wise_recipients` table** ✅ **CRITICAL**
   - Maps UPI IDs to Wise account IDs
   - Enables recipient reuse (massive efficiency gain)
   - Tracks verified recipients

2. **Added `wise_payments` table** ✅
   - Separates funding step from transfer creation
   - Tracks payment method and status
   - Enables payment retry logic

3. **Added `wise_transfer_events` table** ✅
   - Complete audit trail
   - Tracks all status transitions
   - Enables webhook integration

4. **Enhanced `wise_quotes` table**
   - Added detailed fee breakdown
   - Added rate type (FIXED vs FLOATING)
   - Added payment type

5. **Enhanced `wise_transfers` table**
   - Added foreign keys to quote and recipient
   - Added funding status fields
   - Added error handling fields

6. **Enhanced `upi_scans` table**
   - Added foreign keys to quote, recipient, transfer
   - Status tracks entire flow progression

---

## Summary

This revised schema **properly maps to the Wise API flow** and includes:

- ✅ **7 tables** (vs 4 in original design)
- ✅ **Recipient reusability** (key efficiency)
- ✅ **Complete audit trail** (all status changes)
- ✅ **Payment tracking** (separate from transfer)
- ✅ **Foreign key relationships** (proper data integrity)

**Next:** Generate migration SQL with this improved schema.
