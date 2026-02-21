# Backend APIs - Complete Inventory

**Total APIs**: **10 Core Transfer APIs** + **3 Support APIs** = **13 Total**

---

## Summary Table

| Group | Count | Endpoints |
|-------|-------|-----------|
| **Transfer Operations** | 6 | Quote, Lock Rate, Immediate, Rate-Triggered, Approve, Deny |
| **Recipient Management** | 3 | Verify, List, Delete |
| **Status & Analytics** | 2 | Get Status, Get Activity |
| **Webhooks** | 1 | Chimoney Webhook Handler |
| **Cron Jobs** | 1 | Payment Status Polling |
| **TOTAL** | **13** | - |

---

## Group 1: Transfer Operations (6 APIs)

### 1️⃣ POST /api/transfers/quote

**Purpose**: Get FX rate quote for a transfer

**Request**:
```typescript
{
  recipientId: string;      // From recipient list
  sourceAmount: number;     // 100 USD
  corridor: string;         // 'USD_INR'
}
```

**Response (Success 200)**:
```json
{
  "success": true,
  "data": {
    "quoteId": "quote_abc123",
    "rate": 82.5050,
    "midRate": 82.4500,
    "buyRate": 82.5050,
    "sourceAmount": 100,
    "destinationAmount": 8250.50,
    "fees": {
      "chargesToRemitter": { "amount": 5, "currency": "USD" },
      "chargesToBeneficiary": { "amount": 0, "currency": "INR" }
    },
    "totalSent": 100,
    "totalReceived": 8250.50,
    "validitySeconds": 300,
    "expiresAt": "2026-02-18T10:10:00Z"
  }
}
```

**Response (Error 400)**:
```json
{
  "success": false,
  "error": "INVALID_AMOUNT",
  "message": "Amount must be between $10 and $5000"
}
```

**Headers Required**:
- `Content-Type: application/json`
- `Authorization: Bearer <token>` (user must be logged in)

**Authentication**: ✅ Required (user must own recipient)

---

### 2️⃣ POST /api/transfers/lock-rate

**Purpose**: Lock the FX rate for 5 minutes before payment

**Request**:
```typescript
{
  quoteId: string;  // From quote response
}
```

**Response (Success 200)**:
```json
{
  "success": true,
  "data": {
    "lockId": "lock_def456",
    "rate": 82.5050,
    "lockedUntil": "2026-02-18T10:10:00Z",
    "expiresIn": 300  // seconds
  }
}
```

**Response (Error 400)**:
```json
{
  "success": false,
  "error": "QUOTE_EXPIRED",
  "message": "Quote expired. Please get a new quote."
}
```

**Error Cases**:
- `QUOTE_NOT_FOUND` - Quote doesn't exist
- `QUOTE_EXPIRED` - Quote older than 5 minutes
- `RATE_UNAVAILABLE` - Rate no longer available (market movement)

---

### 3️⃣ POST /api/transfers/immediate

**Purpose**: Initiate immediate transfer (send money right away)

**Request**:
```typescript
{
  quoteId: string;           // From lock-rate
  recipientId: string;       // Verified recipient
  complianceData: {
    purposeOfTransfer: string;        // 'family_support', 'education', etc.
    sourceOfFunds: string;            // 'salary', 'business_income'
    relationshipToRecipient: string;  // 'family', 'friend', 'business'
  }
}
```

**Headers**:
- `Idempotency-Key: <unique-key>` ← **CRITICAL FOR IDEMPOTENCY**

**Response (Success 200)**:
```json
{
  "success": true,
  "data": {
    "transferId": "transfer_xyz789",
    "transactionId": "txn_123456",
    "status": "payment_initiated",
    "sourceAmount": 100,
    "destinationAmount": 8250.50,
    "recipientName": "Rajesh Kumar",
    "estimatedDelivery": "2026-02-18T10:05:00Z"
  }
}
```

**Response (Error - Duplicate 200)**:
```json
{
  "success": true,
  "isDuplicate": true,
  "data": { /* same as first successful response */ }
}
```

**Response (Error - Already Processing 409)**:
```json
{
  "success": false,
  "error": "REQUEST_ALREADY_PROCESSING",
  "message": "This payment is already being processed. Please wait."
}
```

**Error Cases**:
- `MISSING_IDEMPOTENCY_KEY` (400) - Must provide Idempotency-Key header
- `RATE_LOCK_EXPIRED` (400) - Rate lock > 5 minutes old
- `INVALID_COMPLIANCE_DATA` (400) - Missing required fields
- `KYC_EXPIRED` (400) - User's KYC expired

**Idempotency**: ✅ **YES** - Uses Idempotency-Key header

---

### 4️⃣ POST /api/transfers/rate-triggered

**Purpose**: Set up rate monitoring (send when target rate is reached)

**Request**:
```typescript
{
  quoteId: string;           // From lock-rate
  recipientId: string;
  targetRate: number;        // 83.50 (higher than current 82.50)
  complianceData: {
    purposeOfTransfer: string;
    sourceOfFunds: string;
    relationshipToRecipient: string;
  }
}
```

**Response (Success 200)**:
```json
{
  "success": true,
  "data": {
    "transferId": "transfer_mon123",
    "status": "monitoring",
    "sourceAmount": 100,
    "targetRate": 83.50,
    "currentRate": 82.50,
    "monitoringStarted": "2026-02-18T10:00:00Z",
    "willExpireAfter": 7,  // days
    "message": "We'll send money when rate reaches 83.50 INR per USD"
  }
}
```

**Error Cases**:
- `INVALID_TARGET_RATE` (400) - Target rate too low (must be higher than current)
- `TARGET_RATE_OUT_OF_RANGE` (400) - Rate unrealistic
- `RATE_ALREADY_MET` (400) - Target rate already reached at current rate

---

### 5️⃣ POST /api/transfers/:id/approve

**Purpose**: Approve a pending transfer (manual payment trigger)

**Request**:
```typescript
{
  transferId: string;  // From transfer response
}
```

**Response (Success 200)**:
```json
{
  "success": true,
  "data": {
    "transferId": "transfer_mon123",
    "status": "payment_initiated",
    "transactionId": "txn_456789",
    "estimatedDelivery": "2026-02-18T10:05:00Z"
  }
}
```

**Error Cases**:
- `TRANSFER_NOT_FOUND` (404)
- `INVALID_STATUS` (400) - Transfer not in 'rate_met' or 'pending_approval' state
- `RATE_LOCK_EXPIRED` (400)

---

### 6️⃣ POST /api/transfers/:id/deny

**Purpose**: Cancel a pending or monitoring transfer

**Request**:
```typescript
{
  transferId: string;
}
```

**Response (Success 200)**:
```json
{
  "success": true,
  "data": {
    "transferId": "transfer_xyz789",
    "status": "cancelled",
    "cancelledAt": "2026-02-18T10:02:00Z"
  }
}
```

**Error Cases**:
- `TRANSFER_NOT_FOUND` (404)
- `CANNOT_CANCEL` (400) - Transfer already completed or failed

---

## Group 2: Recipient Management (3 APIs)

### 7️⃣ POST /api/transfers/recipients/verify

**Purpose**: Verify a new recipient (phone for UPI or bank details for transfer)

**Request**:
```typescript
{
  name: string;
  paymentMethod: 'upi' | 'bank_account';

  // For UPI
  phone?: string;          // 10 digit number: 9876543210

  // For Bank Transfer
  bankCode?: string;       // IFSC: HDFC0000001
  accountNumber?: string;  // Will be encrypted
  accountType?: 'savings' | 'current';

  corridor: string;        // 'USD_INR'
}
```

**Response (Success 200)**:
```json
{
  "success": true,
  "data": {
    "recipientId": "rec_upi_9876543210",
    "verificationStatus": "verified",
    "recipientName": "Rajesh Kumar",
    "paymentMethods": ["upi"],
    "verifiedAt": "2026-02-18T10:00:00Z",
    "verificationExpires": "2026-02-25T10:00:00Z"
  }
}
```

**Response (Error 400)**:
```json
{
  "success": false,
  "error": "UPI_NOT_ACTIVATED",
  "message": "This phone number is not registered for UPI."
}
```

**Error Cases**:
- `INVALID_PHONE_FORMAT` (400) - Must be 10 digits
- `UPI_NOT_ACTIVATED` (400) - Recipient hasn't set up UPI
- `INVALID_BANK_ACCOUNT` (400) - Account doesn't exist
- `VERIFICATION_TIMEOUT` (504) - Chimoney took too long

**Headers Required**: Idempotency-Key (optional but recommended)

---

### 8️⃣ GET /api/transfers/recipients

**Purpose**: List all verified recipients for logged-in user

**Query Parameters**: None (returns all user's recipients)

**Response (Success 200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "rec_upi_9876543210",
      "name": "Rajesh Kumar",
      "paymentMethod": "upi",
      "phone": "9876543210",
      "verificationStatus": "verified",
      "lastUsed": "2026-02-18T09:00:00Z",
      "verificationExpires": "2026-02-25T10:00:00Z"
    },
    {
      "id": "rec_bank_hdfc",
      "name": "Priya Sharma",
      "paymentMethod": "bank_account",
      "bankName": "HDFC Bank",
      "accountLastFour": "7890",
      "verificationStatus": "verified",
      "lastUsed": "2026-02-17T14:30:00Z",
      "verificationExpires": "2026-02-24T14:30:00Z"
    }
  ]
}
```

**Caching**: Yes - Cache header: `Cache-Control: max-age=300` (5 minutes)

---

### 9️⃣ DELETE /api/transfers/recipients/:id

**Purpose**: Delete a recipient

**Request**: No body needed

**Response (Success 200)**:
```json
{
  "success": true,
  "message": "Recipient deleted successfully"
}
```

**Error Cases**:
- `RECIPIENT_NOT_FOUND` (404)
- `UNAUTHORIZED` (403) - Recipient belongs to another user

---

## Group 3: Status & Analytics (2 APIs)

### 🔟 GET /api/transfers/:id/status

**Purpose**: Check status of a specific transfer

**Query Parameters**:
- `includeDetails` (optional): `true` to include rate history and attempt logs

**Response (Success 200)**:
```json
{
  "success": true,
  "data": {
    "transferId": "transfer_xyz789",
    "status": "completed",
    "paymentStatus": "settled",
    "sourceAmount": 100,
    "destinationAmount": 8250.50,
    "recipientName": "Rajesh Kumar",
    "createdAt": "2026-02-18T09:00:00Z",
    "completedAt": "2026-02-18T09:03:30Z",
    "settlementTime": 210,  // seconds
    "transactionId": "UPI_TXN_123456"
  }
}
```

**Polling Strategy**:
- For `payment_initiated` status: Poll every 2-5 seconds (up to 10 min)
- After 10 min: Poll every 30 seconds
- After 1 hour: Mark as "stuck", stop polling

---

### 1️⃣1️⃣ GET /api/transfers/activity

**Purpose**: Get activity timeline for user's transfers

**Query Parameters**:
- `limit`: 20 (default), up to 100
- `offset`: 0 (pagination)
- `filter`: 'all', 'pending', 'completed', 'failed'
- `days`: 30 (default) - Show transfers from last N days

**Response (Success 200)**:
```json
{
  "success": true,
  "data": [
    {
      "transferId": "transfer_xyz789",
      "activityType": "payment_completed",
      "timestamp": "2026-02-18T09:03:30Z",
      "recipient": "Rajesh Kumar",
      "amount": "$100 USD → ₹8,250.50 INR",
      "status": "completed",
      "transactionId": "UPI_TXN_123456"
    },
    {
      "transferId": "transfer_mon123",
      "activityType": "rate_met_notification_sent",
      "timestamp": "2026-02-18T08:45:00Z",
      "recipient": "Priya Sharma",
      "amount": "$100 USD",
      "status": "monitoring",
      "message": "Target rate 83.50 was reached!"
    }
  ],
  "pagination": {
    "total": 47,
    "limit": 20,
    "offset": 0
  }
}
```

**Caching**: Yes - Cache header: `Cache-Control: max-age=60` (1 minute, as status changes frequently)

---

## Group 4: Webhooks (1 API)

### 1️⃣2️⃣ POST /api/webhooks/chimoney

**Purpose**: Receive real-time payment status updates from Chimoney

**Authentication**: Webhook signature verification (HMAC-SHA256)

**Request Headers**:
- `X-Chimoney-Signature`: HMAC signature for verification
- `Content-Type: application/json`

**Request Body** (example):
```json
{
  "eventType": "transfer.completed",
  "data": {
    "transactionId": "txn_123456",
    "status": "settled",
    "settlementTime": "2026-02-18T09:03:30Z"
  }
}
```

**Response (Always 200 OK)**:
```json
{
  "success": true,
  "received": true
}
```

**Processing**:
- Verify signature
- Log webhook for audit trail
- Async process (return 200 immediately)
- Update transfer status
- Send user notification
- Mark webhook as processed

**Webhook Events Handled**:
- `transfer.completed` - Money settled
- `transfer.failed` - Payment failed
- `transfer.pending` - Payment in progress
- `transfer.timeout` - No status after 30+ minutes

---

## Group 5: Cron Jobs (1 API)

### 1️⃣3️⃣ GET /api/cron/poll-payment-status

**Purpose**: Automatically check payment status for pending transfers (runs every 2 minutes)

**Authentication**: CRON_SECRET bearer token in Authorization header

**Request**:
```bash
curl -H "Authorization: Bearer ${CRON_SECRET}" \
     https://yourapp.com/api/cron/poll-payment-status
```

**Response (Success 200)**:
```json
{
  "success": true,
  "checked": 12,
  "completed": 3,
  "still_pending": 9
}
```

**Triggers**:
- Supabase pg_cron: `SELECT cron.schedule('poll-payments', '*/2 * * * *', ...);`
- OR External service: GitHub Actions, Vercel Crons, AWS Lambda
- OR Manual cron job

---

## Summary of Request/Response Patterns

### All Requests Include
```
Method: GET or POST (PUT/DELETE minimal)
URL: https://api.vitta.com/api/transfers/...
Headers: {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer <token>'  (for authenticated endpoints)
}
```

### All Responses Follow This Pattern
```json
{
  "success": true | false,
  "data": { /* response data */ },
  "error": "ERROR_CODE",
  "message": "User-friendly error message"
}
```

### Status Codes Used
- `200 OK` - Success
- `201 Created` - New resource created (rarely used)
- `204 No Content` - Success with no response body
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Not logged in
- `403 Forbidden` - Logged in but not authorized
- `404 Not Found` - Resource doesn't exist
- `409 Conflict` - Duplicate request (idempotency) or state conflict
- `500 Internal Server Error` - Server error
- `503 Service Unavailable` - Chimoney API down

---

## Rate Limiting

Applied to all endpoints:
- **100 requests per minute** per authenticated user
- **10 requests per minute** per IP (unauthenticated)
- Return `429 Too Many Requests` when exceeded

---

## Authentication

All endpoints (except webhooks) require:
- User to be logged in (Google OAuth or demo user)
- Valid JWT token in `Authorization: Bearer <token>` header
- User ID must match owner of transfer/recipient

---

## Testing Checklist

```
[ ] Quote endpoint with valid & invalid amounts
[ ] Lock rate after quote expires
[ ] Immediate transfer with & without compliance data
[ ] Rate-triggered transfer with different target rates
[ ] Recipient verification for UPI
[ ] Recipient verification for bank accounts
[ ] List recipients with pagination
[ ] Delete recipient
[ ] Check transfer status at each stage
[ ] Activity feed with filters
[ ] Webhook signature verification
[ ] Webhook duplicate handling
[ ] Cron job polling
[ ] Idempotency-Key deduplication
[ ] Error responses for each error code
[ ] Rate limiting
```

---

## Dependencies Between APIs

```
Quote ──────┐
            ├──→ Lock Rate ──────┐
            │                    ├──→ Immediate Transfer ──→ Check Status
            └────────────────────┤
                                 └──→ Rate-Triggered ──→ Check Status

Verify Recipient ──┐
                   ├──→ Immediate / Rate-Triggered
List Recipients ───┘

All ──→ Activity / Status checks ──→ Webhooks trigger notifications
All ──→ Cron job polls status continuously
```

---

## Implementation Order

1. **Phase 1**: Quote, Lock Rate (MVP for rates)
2. **Phase 2**: Immediate Transfer, Approve/Deny
3. **Phase 3**: Recipient management (Verify, List, Delete)
4. **Phase 4**: Rate-triggered, Activity
5. **Phase 5**: Status polling cron, webhooks

---

## File Structure

```
pages/api/transfers/
├── quote.ts                    # POST /api/transfers/quote
├── lock-rate.ts                # POST /api/transfers/lock-rate
├── immediate.ts                # POST /api/transfers/immediate
├── rate-triggered.ts           # POST /api/transfers/rate-triggered
├── [id]/
│   ├── approve.ts              # POST /api/transfers/:id/approve
│   ├── deny.ts                 # POST /api/transfers/:id/deny
│   └── status.ts               # GET /api/transfers/:id/status
├── recipients/
│   ├── verify.ts               # POST /api/transfers/recipients/verify
│   ├── index.ts                # GET /api/transfers/recipients
│   └── [id].ts                 # DELETE /api/transfers/recipients/:id
├── activity.ts                 # GET /api/transfers/activity
└── ../
    ├── webhooks/
    │   └── chimoney.ts         # POST /api/webhooks/chimoney
    └── cron/
        └── poll-payment-status.ts # GET /api/cron/poll-payment-status
```
