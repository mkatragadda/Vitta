# Vitta Travel Pay - Technical Design Document

**Version:** 1.0
**Date:** April 9, 2026
**Author:** Engineering Team
**Status:** Design Review

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Problem Statement](#problem-statement)
3. [Solution Overview](#solution-overview)
4. [System Architecture](#system-architecture)
5. [Database Design](#database-design)
6. [API Design](#api-design)
7. [Service Layer Architecture](#service-layer-architecture)
8. [Wise API Integration](#wise-api-integration)
9. [QR Code Scanner](#qr-code-scanner)
10. [Security & Compliance](#security--compliance)
11. [Error Handling](#error-handling)
12. [Performance Considerations](#performance-considerations)
13. [Future Enhancements](#future-enhancements)

---

## Executive Summary

### Project Overview

**Vitta Travel Pay** is a payment bridge solution that enables US travelers to pay at Indian merchants using UPI without requiring an Indian bank account.

### Key Objectives

- Enable instant UPI payments from US bank accounts
- Provide competitive USD → INR exchange rates via Wise
- Deliver seamless mobile-first UX with QR code scanning
- Ensure transaction security and regulatory compliance

### Technical Scope

**Phase 1 (Demo - 2.5 hours):**
- Wise API integration (personal token)
- QR code scanner implementation
- Manual transfer approval workflow
- Basic transaction history

**Phase 2 (Production):**
- Plaid balance verification
- Razorpay UPI settlement
- VittaPool management
- Automated batch processing

---

## Problem Statement

### Current Pain Points

300M+ tourists and NRIs visit India annually but face significant payment challenges:

1. **UPI Barrier:** Cannot use UPI (90%+ of digital transactions) without Indian bank account
2. **Cash Dependency:** Forced to carry large amounts of cash (safety risk)
3. **Poor Forex Options:** Expensive forex cards with 3-5% fees and poor exchange rates
4. **Merchant Friction:** Many merchants only accept UPI, declining foreign cards
5. **Dependency:** Must rely on relatives/friends to make payments

### Market Opportunity

- **TAM:** 300M annual visitors to India
- **Transaction Volume:** Estimated $50B annually in tourist spending
- **Fee Revenue:** 0.5-1% per transaction ($250M-$500M opportunity)

---

## Solution Overview

### User Journey

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER JOURNEY                              │
└─────────────────────────────────────────────────────────────────┘

PRE-TRIP:
1. Download Vitta app
2. Sign in with Google
3. Link US bank account via Plaid
4. Add USD to wallet (optional for Phase 1)

IN INDIA:
1. Open Vitta app
2. Tap "Scan to Pay"
3. Scan merchant's UPI QR code
4. Review: ₹500 = $5.99 USD
5. Confirm payment (biometric)
6. Merchant receives ₹500 instantly

POST-PAYMENT:
1. Transaction recorded in history
2. Receipt sent via email/SMS
3. Real-time notification
```

### Value Proposition

| **Stakeholder** | **Value Delivered** |
|-----------------|---------------------|
| **Travelers** | Pay anywhere in India without cash or Indian bank |
| **Merchants** | Receive instant UPI payments in INR |
| **Vitta** | Fee revenue + FX margin |
| **Wise** | Transaction volume + fee revenue |

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        VITTA TRAVEL PAY                          │
│                     (Next.js 14 - React SPA)                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │
        ┌─────────────────────┴────────────────────┐
        │                                          │
        ▼                                          ▼
┌──────────────────┐                    ┌──────────────────┐
│  FRONTEND LAYER  │                    │   BACKEND LAYER  │
│                  │                    │  (API Routes)    │
│ • QR Scanner     │                    │                  │
│ • Travel Dashboard│◄──────────────────┤ • /api/wise/*    │
│ • Transaction UI │    REST/JSON       │ • /api/upi/*     │
│ • Camera Access  │                    │ • Plaid Proxy    │
└──────────────────┘                    └──────────────────┘
                                                 │
                    ┌────────────────────────────┼────────────────┐
                    │                            │                │
                    ▼                            ▼                ▼
        ┌────────────────────┐     ┌──────────────────┐  ┌──────────────┐
        │  WISE API (3rd)    │     │   SUPABASE DB    │  │  PLAID API   │
        │                    │     │                  │  │              │
        │ • Exchange Rates   │     │ • Users          │  │ • Bank Auth  │
        │ • Quotes           │     │ • Transactions   │  │ • Balance    │
        │ • Transfers        │     │ • UPI Scans      │  │              │
        │ • Recipient Mgmt   │     │ • Audit Logs     │  │              │
        └────────────────────┘     └──────────────────┘  └──────────────┘
                                            │
                                            ▼
                                   ┌──────────────────┐
                                   │  RAZORPAY (TBD)  │
                                   │  • UPI Payments  │
                                   │  • VittaPool     │
                                   └──────────────────┘
```

### Component Interaction Flow

```
USER ACTION                 VITTA APP                 WISE API              SUPABASE
────────────                ─────────                 ────────              ────────

1. Scan QR Code ──────────> Parse UPI ID/Amount
                            Extract: vpa@bank, ₹500
                                      │
                                      ▼
                            Check USD/INR rate ────> GET /rates
                                      │               (USD→INR)
                                      ▼                   │
                            Display Confirmation        Rate: 83.45
                            "₹500 = $5.99 USD"          ◄───┘
                                      │
2. User Confirms ──────────> Create Transfer Quote ──> POST /quotes
   "Pay $5.99"                        │                 source: USD
                                      │                 target: INR
                                      ▼                 amount: 5.99
                            Quote ID + Fee                   │
                            Quote: abc-123              ◄────┘
                            Fee: $0.15
                            Total: $6.14
                                      │
3. Authorize ──────────────> Verify Plaid Balance ──> Plaid API
   (Biometric/PIN)                    │                Check: ≥$6.14
                                      ▼                     │
                            Balance OK               ◄─────┘
                                      │
                                      ▼
                            Execute Transfer ───────> POST /transfers
                                      │                quote_id: abc-123
                                      │                     │
                                      ▼                     │
                            Transfer Initiated        Transfer ID: xyz-789
                            Status: processing        Status: processing
                                      │               ◄────┘
                                      ▼
                            Save to DB ─────────────> INSERT transfers
                                      │                (user_id, amount,
                                      │                 status, wise_id)
                                      ▼                     │
                            Show Success           ◄────────┘
                            "Payment Sent!"
                                      │
                                      ▼
4. Poll Status ────────────> Check Wise Status ────> GET /transfers/{id}
   (Background)                      │                     │
                                      ▼                     │
                            Update DB Status        Status: completed
                            Status: completed       ◄────┘
                                      │
                                      ▼
                            Push Notification ────> User Notified
                            "₹500 sent to merchant"
```

### Technology Stack

| **Layer** | **Technology** | **Purpose** |
|-----------|----------------|-------------|
| **Frontend** | Next.js 14, React 18 | SPA framework |
| **Styling** | Tailwind CSS | Mobile-first UI |
| **QR Scanner** | html5-qrcode | Camera-based scanning |
| **Backend** | Next.js API Routes | Serverless functions |
| **Database** | Supabase (PostgreSQL) | User data, transactions |
| **Authentication** | Google OAuth | User login |
| **Bank Linking** | Plaid API | US bank accounts |
| **Money Transfer** | Wise API | USD → INR transfers |
| **Payment Settlement** | Razorpay (Phase 2) | UPI payments in India |

---

## Database Design

### Schema Overview

```
users (existing)
├── id (UUID, PK)
├── email (TEXT, UNIQUE)
├── name (TEXT)
├── picture_url (TEXT)
├── provider (TEXT)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

upi_scans (new)
├── id (UUID, PK)
├── user_id (UUID, FK → users.id)
├── raw_qr_data (TEXT)
├── upi_id (VARCHAR)
├── payee_name (VARCHAR)
├── amount (NUMERIC)
├── transaction_note (TEXT)
├── merchant_code (VARCHAR)
├── scan_location (JSONB)
├── device_info (JSONB)
├── scan_timestamp (TIMESTAMP)
├── status (VARCHAR) -- scanned, quoted, paid, failed
├── transfer_id (UUID, FK → transfers.id)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

wise_quotes (new)
├── id (UUID, PK)
├── user_id (UUID, FK → users.id)
├── upi_scan_id (UUID, FK → upi_scans.id)
├── wise_quote_id (VARCHAR, UNIQUE)
├── source_amount (NUMERIC)
├── target_amount (NUMERIC)
├── exchange_rate (NUMERIC)
├── fee_amount (NUMERIC)
├── total_debit (NUMERIC)
├── rate_type (VARCHAR)
├── expires_at (TIMESTAMP)
├── is_expired (BOOLEAN, COMPUTED)
├── status (VARCHAR) -- active, used, expired, cancelled
├── used_for_transfer_id (UUID, FK → transfers.id)
├── wise_response (JSONB)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

wise_transfers (new)
├── id (UUID, PK)
├── transfer_id (UUID, FK → transfers.id)
├── user_id (UUID, FK → users.id)
├── wise_transfer_id (VARCHAR, UNIQUE)
├── wise_quote_id (VARCHAR)
├── source_amount (NUMERIC)
├── target_amount (NUMERIC)
├── exchange_rate (NUMERIC)
├── recipient_type (VARCHAR)
├── recipient_upi_id (VARCHAR)
├── recipient_name (VARCHAR)
├── wise_status (VARCHAR)
├── status_updates (JSONB[])
├── expected_delivery_date (DATE)
├── actual_delivery_date (DATE)
├── wise_response (JSONB)
├── wise_error (JSONB)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

travel_pay_settings (new)
├── user_id (UUID, PK, FK → users.id)
├── notify_on_scan (BOOLEAN)
├── notify_on_quote_expiry (BOOLEAN)
├── notify_on_transfer_complete (BOOLEAN)
├── auto_approve_under_amount (NUMERIC)
├── require_biometric (BOOLEAN)
├── default_plaid_account_id (VARCHAR)
├── daily_limit_usd (NUMERIC)
├── per_transaction_limit_usd (NUMERIC)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

transfers (modified - existing table)
├── ... (existing columns)
├── payment_provider (VARCHAR) -- NEW: 'chimoney' or 'wise'
├── provider_transfer_id (VARCHAR) -- NEW: External transfer ID
└── payment_method (VARCHAR) -- NEW: 'bank_transfer', 'upi', 'card'
```

### Entity Relationships

```
users (1) ──────────── (N) upi_scans
users (1) ──────────── (N) wise_quotes
users (1) ──────────── (N) wise_transfers
users (1) ──────────── (1) travel_pay_settings

upi_scans (1) ─────── (1) wise_quotes (via upi_scan_id)
upi_scans (1) ─────── (1) transfers (via transfer_id)

wise_quotes (1) ────── (1) transfers (via used_for_transfer_id)
wise_quotes (1) ────── (N) wise_transfers (via wise_quote_id)

transfers (1) ─────── (1) wise_transfers (via transfer_id)
```

### Indexes for Performance

```sql
-- upi_scans
CREATE INDEX idx_upi_scans_user_id ON upi_scans(user_id);
CREATE INDEX idx_upi_scans_status ON upi_scans(status);
CREATE INDEX idx_upi_scans_created_at ON upi_scans(created_at DESC);
CREATE INDEX idx_upi_scans_transfer_id ON upi_scans(transfer_id);

-- wise_quotes
CREATE INDEX idx_wise_quotes_user_id ON wise_quotes(user_id);
CREATE INDEX idx_wise_quotes_wise_id ON wise_quotes(wise_quote_id);
CREATE INDEX idx_wise_quotes_expires_at ON wise_quotes(expires_at);
CREATE INDEX idx_wise_quotes_status ON wise_quotes(status);

-- wise_transfers
CREATE INDEX idx_wise_transfers_transfer_id ON wise_transfers(transfer_id);
CREATE INDEX idx_wise_transfers_user_id ON wise_transfers(user_id);
CREATE INDEX idx_wise_transfers_wise_id ON wise_transfers(wise_transfer_id);
CREATE INDEX idx_wise_transfers_wise_status ON wise_transfers(wise_status);

-- transfers (new indexes)
CREATE INDEX idx_transfers_provider ON transfers(payment_provider);
CREATE INDEX idx_transfers_provider_id ON transfers(provider_transfer_id);
```

---

## API Design

### API Endpoint Structure

```
/api/
├── wise/
│   ├── rates.js              # GET - Exchange rates
│   ├── quote.js              # POST - Create quote
│   ├── transfer.js           # POST - Execute transfer
│   ├── status/[id].js        # GET - Transfer status
│   └── recipients.js         # GET/POST - Manage recipients
│
├── upi/
│   ├── parse-qr.js           # POST - Parse QR code
│   ├── scan-history.js       # GET - User's scan history
│   └── validate-vpa.js       # POST - Validate UPI ID
│
└── travelpay/
    ├── transaction-history.js # GET - Transaction list
    └── settings.js            # GET/PUT - User settings
```

### API Specifications

#### 1. Get Exchange Rate

```
GET /api/wise/rates?from=USD&to=INR

Response 200:
{
  "success": true,
  "data": {
    "rate": 83.45,
    "source": "USD",
    "target": "INR",
    "rateType": "LIVE",
    "timestamp": "2026-04-09T12:00:00Z",
    "validUntil": "2026-04-09T12:05:00Z"
  }
}

Error 500:
{
  "success": false,
  "error": "Failed to fetch exchange rate"
}
```

**Rate Limiting:** 10 requests/minute per user
**Cache:** 60 seconds
**Fallback:** Return last cached rate if API fails

---

#### 2. Create Transfer Quote

```
POST /api/wise/quote

Headers:
  Content-Type: application/json
  x-user-id: {userId}

Request Body:
{
  "sourceAmount": 10.00,
  "sourceCurrency": "USD",
  "targetCurrency": "INR",
  "upiScanId": "uuid-optional"
}

Response 200:
{
  "success": true,
  "data": {
    "quoteId": "abc-123-def-456",
    "sourceAmount": 10.00,
    "targetAmount": 834.50,
    "rate": 83.45,
    "fee": 0.25,
    "totalDebit": 10.25,
    "expiresAt": "2026-04-09T12:05:00Z",
    "expiresIn": 300
  }
}

Error 400:
{
  "success": false,
  "error": "Invalid amount"
}

Error 401:
{
  "success": false,
  "error": "Unauthorized"
}
```

**Validation Rules:**
- `sourceAmount` >= $1 and <= $10,000
- `sourceCurrency` must be 'USD'
- `targetCurrency` must be 'INR'
- User must be authenticated

**Business Logic:**
1. Validate input parameters
2. Call Wise API to create quote
3. Save quote to database
4. Return quote with expiry countdown

---

#### 3. Execute Transfer

```
POST /api/wise/transfer

Headers:
  Content-Type: application/json
  x-user-id: {userId}

Request Body:
{
  "quoteId": "abc-123-def-456",
  "recipientUpiId": "merchant@paytm",
  "recipientName": "Taj Hotel",
  "plaidAccountId": "plaid-account-123",
  "userConfirmation": true
}

Response 200:
{
  "success": true,
  "data": {
    "transferId": "xyz-789",
    "wiseTransferId": "wise-12345",
    "status": "processing",
    "sourceAmount": 10.00,
    "targetAmount": 834.50,
    "estimatedDelivery": "2026-04-10",
    "message": "Transfer initiated successfully"
  }
}

Error 400 (Quote Expired):
{
  "success": false,
  "error": "Quote has expired, please refresh"
}

Error 400 (Insufficient Funds):
{
  "success": false,
  "error": "Insufficient balance in account"
}

Error 500 (Transfer Failed):
{
  "success": false,
  "error": "Transfer failed, no charge made"
}
```

**Validation Rules:**
- Quote must exist and be valid (not expired)
- Quote status must be 'active'
- Plaid account must have sufficient balance
- Recipient UPI ID must be valid format

**Workflow:**
1. Validate quote exists and not expired
2. Verify Plaid account balance >= totalDebit
3. Create/retrieve Wise recipient for UPI ID
4. Execute Wise transfer
5. Save to transfers + wise_transfers tables
6. Update upi_scans status → 'paid'
7. Mark quote as 'used'
8. Return transfer details

---

#### 4. Parse UPI QR Code

```
POST /api/upi/parse-qr

Headers:
  Content-Type: application/json
  x-user-id: {userId}

Request Body:
{
  "qrData": "upi://pay?pa=merchant@paytm&pn=Taj+Hotel&am=500&cu=INR"
}

Response 200:
{
  "success": true,
  "data": {
    "upiId": "merchant@paytm",
    "payeeName": "Taj Hotel",
    "amount": 500,
    "currency": "INR",
    "note": "",
    "merchantCode": "",
    "scanId": "scan-uuid-123",
    "usdEquivalent": 5.99,
    "rate": 83.45
  }
}

Error 400:
{
  "success": false,
  "error": "Invalid UPI QR code"
}
```

**UPI QR Format:**
```
upi://pay?pa={vpa}&pn={name}&am={amount}&cu={currency}&tn={note}&mc={code}

Parameters:
- pa: Payee Address (VPA) - merchant@bank
- pn: Payee Name - URL encoded
- am: Amount - Optional, in paise or rupees
- cu: Currency - INR
- tn: Transaction Note - Optional
- mc: Merchant Code - Optional
```

**Validation:**
- UPI ID regex: `^[\w.-]+@[\w]+$`
- Amount must be positive number
- Currency must be 'INR'

**Workflow:**
1. Parse UPI string using URL parser
2. Extract all parameters
3. Validate UPI ID format
4. Fetch current USD/INR rate from Wise
5. Calculate USD equivalent
6. Save scan to upi_scans table
7. Return parsed data with USD conversion

---

#### 5. Get Transaction History

```
GET /api/travelpay/transaction-history?limit=20&offset=0

Headers:
  x-user-id: {userId}

Response 200:
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "transfer-uuid",
        "date": "2026-04-09T10:30:00Z",
        "merchantName": "Taj Hotel",
        "upiId": "merchant@paytm",
        "amountINR": 500,
        "amountUSD": 5.99,
        "rate": 83.45,
        "fee": 0.15,
        "status": "completed",
        "wiseTransferId": "wise-12345"
      }
    ],
    "total": 45,
    "limit": 20,
    "offset": 0
  }
}
```

---

### API Security

#### Authentication

```javascript
// Middleware: requireAuth
export const requireAuth = async (req, res, next) => {
  const userId = req.headers['x-user-id'];

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Validate user exists
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .single();

  if (!user) {
    return res.status(401).json({ error: 'Invalid user' });
  }

  req.userId = userId;
  next();
};
```

#### Rate Limiting

```javascript
// Rate limits by endpoint
const RATE_LIMITS = {
  'wise/rates': { maxRequests: 10, windowMs: 60000 },
  'wise/quote': { maxRequests: 5, windowMs: 60000 },
  'wise/transfer': { maxRequests: 3, windowMs: 60000 },
  'upi/parse-qr': { maxRequests: 20, windowMs: 60000 },
};
```

#### Input Validation

```javascript
// Validate all inputs
const validateQuoteRequest = (body) => {
  const { sourceAmount, sourceCurrency, targetCurrency } = body;

  if (!sourceAmount || sourceAmount < 1 || sourceAmount > 10000) {
    throw new Error('Invalid source amount');
  }

  if (sourceCurrency !== 'USD') {
    throw new Error('Only USD supported');
  }

  if (targetCurrency !== 'INR') {
    throw new Error('Only INR supported');
  }
};
```

---

## Service Layer Architecture

### Service Structure

```
services/
├── wise/
│   ├── wiseClient.js          # HTTP client with retry logic
│   ├── wiseRateService.js     # Exchange rate operations
│   ├── wiseQuoteService.js    # Quote management
│   ├── wiseTransferService.js # Transfer execution
│   ├── wiseRecipientService.js# Recipient management
│   └── wiseWebhookHandler.js  # Webhook processing
│
├── upi/
│   ├── qrParser.js            # Parse UPI QR codes
│   ├── vpaValidator.js        # Validate UPI IDs
│   └── upiScanService.js      # Scan history management
│
├── travelpay/
│   ├── travelPayOrchestrator.js # Main workflow orchestrator
│   ├── quotePipeline.js       # Quote → Transfer pipeline
│   └── transactionHistory.js  # Transaction queries
│
└── cache/
    └── wiseCacheService.js    # Rate & quote caching
```

### Core Service: WiseClient

**Responsibilities:**
- Low-level HTTP communication with Wise API
- Authentication (Bearer token)
- Retry logic with exponential backoff
- Error mapping and normalization
- Request/response logging

**Key Methods:**
```javascript
class WiseClient {
  async get(path, params)
  async post(path, data)
  async put(path, data)
  async delete(path)

  // Private
  _retryHandler(error)
  _mapError(error)
}
```

**Retry Strategy:**
- Max retries: 3
- Backoff: Exponential (1s, 2s, 4s)
- Retry on: Network errors, 5xx responses
- No retry on: 4xx errors (client errors)

---

### Core Service: WiseRateService

**Responsibilities:**
- Fetch current exchange rates
- Cache rates for 60 seconds
- Fallback to stale cache if API fails
- Rate freshness validation

**Key Methods:**
```javascript
class WiseRateService {
  async getRate(source, target)
  async _fetchRateFromWise(source, target)
  _isStale(cached)
}
```

**Caching Strategy:**
- TTL: 60 seconds
- Cache key: `wise:rate:{source}:{target}`
- Fallback: Use stale cache if API fails
- Invalidation: Auto-expire after TTL

---

### Core Service: WiseQuoteService

**Responsibilities:**
- Create transfer quotes
- Validate quote expiry
- Mark quotes as used
- Handle quote lifecycle

**Key Methods:**
```javascript
class WiseQuoteService {
  async createQuote({ userId, sourceAmount, ... })
  async getQuote(quoteId)
  async markQuoteUsed(quoteId, transferId)
  async expireOldQuotes()
}
```

**Quote Lifecycle:**
```
active → used (after transfer)
active → expired (timeout)
active → cancelled (user action)
```

---

### Core Service: WiseTransferService

**Responsibilities:**
- Execute transfers via Wise API
- Create transfer records in DB
- Fund transfers (debit user account)
- Status polling and updates
- Error handling and rollback

**Key Methods:**
```javascript
class WiseTransferService {
  async executeTransfer({ userId, quoteId, ... })
  async _createTransferRecord(...)
  async _fundTransfer(wiseTransferId)
  async _saveWiseTransferData(...)
  async _updateTransferStatus(transferId, status, error)
  async pollTransferStatus(transferId)
}
```

**Transfer States:**
```
pending → processing → completed
pending → processing → failed
pending → cancelled
```

---

## Wise API Integration

### Authentication

**Demo (Personal Token):**
```bash
# .env.local
WISE_API_TOKEN_SANDBOX=your-sandbox-token
WISE_PROFILE_ID_SANDBOX=your-profile-id
```

**Production (Business API):**
```bash
# .env.local
WISE_API_TOKEN_LIVE=your-live-token
WISE_PROFILE_ID_LIVE=your-live-profile-id
```

### Key Wise Endpoints

| **Operation** | **Endpoint** | **Method** | **Purpose** |
|---------------|-------------|------------|-------------|
| Get Rate | `/v1/rates` | GET | Live exchange rate |
| Create Quote | `/v3/quotes` | POST | Lock rate for transfer |
| List Recipients | `/v1/accounts` | GET | Saved recipients |
| Create Recipient | `/v1/accounts` | POST | Add UPI recipient |
| Create Transfer | `/v1/transfers` | POST | Initiate transfer |
| Fund Transfer | `/v3/profiles/{id}/transfers/{id}/payments` | POST | Execute payment |
| Get Transfer | `/v1/transfers/{id}` | GET | Check status |

### Example: Create Quote

```javascript
POST https://api.sandbox.transferwise.tech/v3/quotes

Headers:
  Authorization: Bearer {apiToken}
  Content-Type: application/json

Body:
{
  "sourceCurrency": "USD",
  "targetCurrency": "INR",
  "sourceAmount": 10.00,
  "targetAmount": null,
  "paymentType": "bank_transfer"
}

Response:
{
  "id": "abc-123",
  "sourceCurrency": "USD",
  "targetCurrency": "INR",
  "sourceAmount": 10.00,
  "targetAmount": 834.50,
  "rate": 83.45,
  "rateType": "FIXED",
  "fee": {
    "total": 0.25,
    "transferwise": 0.25
  },
  "guaranteedTargetAmountUntil": "2026-04-09T12:05:00Z",
  "paymentType": "bank_transfer"
}
```

### Error Handling

**Wise Error Response:**
```json
{
  "error": {
    "code": "INSUFFICIENT_FUNDS",
    "message": "Your balance is insufficient",
    "path": "/v1/transfers"
  }
}
```

**Error Mapping:**
```javascript
const WISE_ERROR_MAP = {
  'INSUFFICIENT_FUNDS': 'Your Wise balance is too low',
  'INVALID_QUOTE': 'Quote has expired, please refresh',
  'DUPLICATE_TRANSFER': 'This transfer was already processed',
  'RECIPIENT_NOT_FOUND': 'Recipient not configured',
  'RATE_LIMIT_EXCEEDED': 'Too many requests, please wait',
};
```

---

## QR Code Scanner

### Technology Choice

**Selected:** `html5-qrcode`

**Alternatives Considered:**
- `react-qr-reader` - Simpler but less customizable
- Browser MediaDevices API - No dependencies but more code

**Why html5-qrcode:**
- Reliable UPI QR code detection
- Mobile browser compatibility
- Customizable UI (qrbox, fps)
- Active maintenance

### Implementation

```javascript
import { Html5Qrcode } from 'html5-qrcode';

const scanner = new Html5Qrcode("qr-reader");

await scanner.start(
  { facingMode: "environment" },  // Use back camera
  {
    fps: 10,                       // 10 frames/sec
    qrbox: { width: 250, height: 250 },
  },
  onScanSuccess,
  onScanError
);
```

### UPI QR Code Format

**Standard Format:**
```
upi://pay?pa={vpa}&pn={name}&am={amount}&cu={currency}

Example:
upi://pay?pa=merchant@paytm&pn=Taj+Hotel&am=500&cu=INR
```

**Parsing Logic:**
```javascript
function parseUPIQR(qrText) {
  const url = new URL(qrText);
  if (url.protocol !== 'upi:') return null;

  const params = new URLSearchParams(url.search);

  return {
    upiId: params.get('pa'),              // merchant@paytm
    payeeName: params.get('pn'),          // Taj Hotel
    amount: parseFloat(params.get('am')), // 500
    currency: params.get('cu'),           // INR
    note: params.get('tn') || '',
    merchantCode: params.get('mc') || '',
  };
}
```

---

## Security & Compliance

### Data Security

**Sensitive Data Protection:**
- Wise API token: Server-side only (never exposed to client)
- Plaid tokens: Encrypted in database
- UPI IDs: Stored but not displayed in full
- Transaction data: Encrypted at rest

**Encryption:**
```javascript
// AES-256-GCM encryption for sensitive fields
import crypto from 'crypto';

const encrypt = (text, key) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
};
```

### API Security

**Authentication:**
- User ID validation on every request
- Session-based authentication
- Token expiry: 24 hours

**Rate Limiting:**
- Per-user limits (IP + user ID)
- Endpoint-specific limits
- DDoS protection via Vercel Edge

**Input Validation:**
- Sanitize all user inputs
- Validate UPI ID format
- Amount bounds checking
- SQL injection prevention (parameterized queries)

### Compliance

**Financial Regulations:**
- FinCEN (US): Money Services Business registration required
- RBI (India): Cross-border transaction reporting
- KYC/AML: Identity verification (Phase 2)

**Data Privacy:**
- GDPR compliance (for EU travelers)
- Data retention: 7 years (regulatory requirement)
- Right to erasure: Anonymize, don't delete (audit trail)

**Transaction Limits:**
- Per transaction: $500 (Phase 1)
- Daily: $1,000 per user
- Monthly: $10,000 per user

---

## Error Handling

### Error Categories

**1. User Errors (4xx)**
- Invalid QR code
- Quote expired
- Insufficient funds
- Daily limit exceeded

**2. System Errors (5xx)**
- Wise API timeout
- Database connection failure
- Network error

**3. Business Logic Errors**
- Duplicate transfer
- Invalid recipient
- Transfer already processed

### Error Response Format

```javascript
{
  "success": false,
  "error": {
    "code": "QUOTE_EXPIRED",
    "message": "Quote has expired, please create a new one",
    "details": {
      "quoteId": "abc-123",
      "expiredAt": "2026-04-09T12:05:00Z"
    },
    "userMessage": "The exchange rate lock expired. Please scan again.",
    "retryable": true
  }
}
```

### Retry Strategy

**Retryable Errors:**
- Network timeouts
- 5xx server errors
- Rate limit errors (429)

**Non-Retryable:**
- 4xx client errors
- Invalid authentication
- Business rule violations

**Exponential Backoff:**
```javascript
const retry = async (fn, maxAttempts = 3) => {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch (error) {
      if (!isRetryable(error) || i === maxAttempts - 1) {
        throw error;
      }
      await sleep(Math.pow(2, i) * 1000); // 1s, 2s, 4s
    }
  }
};
```

---

## Performance Considerations

### Frontend Optimization

**Code Splitting:**
```javascript
// Lazy load QR scanner
const QRScanner = dynamic(() => import('./QRScanner'), {
  loading: () => <LoadingSpinner />,
  ssr: false, // Camera access requires client-side only
});
```

**Image Optimization:**
- Use Next.js Image component
- WebP format with fallback
- Responsive sizes

**Bundle Size:**
- html5-qrcode: ~50KB gzipped
- Target total bundle: <500KB

### Backend Optimization

**Database:**
- Index on frequently queried columns
- Connection pooling (Supabase handles)
- Query optimization (avoid N+1)

**Caching:**
- Exchange rates: 60s TTL
- User settings: 5min TTL
- Transaction history: 30s TTL

**API Response Time Targets:**
- GET /rates: <200ms
- POST /quote: <500ms
- POST /transfer: <2s
- GET /history: <300ms

---

## Future Enhancements

### Phase 2: Production Features

1. **Plaid Balance Verification**
   - Real-time balance check before transfer
   - Overdraft prevention
   - Multiple account support

2. **Razorpay Integration**
   - VittaPool management in India
   - Instant UPI settlement
   - Batch processing (EOD)

3. **Push Notifications**
   - Transfer status updates
   - Quote expiry warnings
   - Daily transaction summary

4. **KYC/AML Compliance**
   - Identity verification (Onfido/Jumio)
   - Address verification
   - Source of funds declaration

5. **Multi-currency Support**
   - EUR → INR
   - GBP → INR
   - CAD → INR

6. **Advanced Features**
   - Bill splitting (group payments)
   - Recurring transfers
   - Payment schedules
   - Merchant directory

---

## Appendix

### Glossary

- **VPA:** Virtual Payment Address (UPI ID like merchant@paytm)
- **UPI:** Unified Payments Interface (India's payment system)
- **Quote:** Rate-locked transfer proposal with expiry
- **VittaPool:** INR balance maintained in India for settlements
- **Plaid:** Bank account linking and verification service
- **Wise:** International money transfer service (formerly TransferWise)

### References

- [Wise API Documentation](https://api-docs.wise.com/)
- [UPI Specification](https://www.npci.org.in/what-we-do/upi/product-overview)
- [Plaid API Docs](https://plaid.com/docs/)
- [Razorpay UPI Docs](https://razorpay.com/docs/payments/upi/)

---

**Document Version:** 1.0
**Last Updated:** April 9, 2026
**Review Status:** Pending Approval
**Next Review:** After Phase 1 Demo
