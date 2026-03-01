# Immediate Transfer Implementation Guide

**Complete step-by-step guide for implementing immediate FX transfers**

---

## 📊 Transfer Flow Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   IMMEDIATE TRANSFER FLOW                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  USER SIDE                  BACKEND SIDE       CHIMONEY      │
│  ──────────                 ────────────       ────────      │
│                                                               │
│  1. Select beneficiary  →   List beneficiaries             │
│  2. Enter amount        →   Validate amount               │
│  3. Get exchange rate   →   GET /rates from Chimoney ←   │
│  4. Review details      →   Show breakdown               │
│  5. Confirm & Send      →   Create transfer record       │
│  6. Execute transfer    →   POST /payouts to Chimoney ←  │
│  7. Show receipt        ←   Return transaction ID        │
│  8. Wait for completion ←   Chimoney processes (2-5 min) │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Detailed Step Breakdown

### **PHASE 1: TRANSFER INITIATION (Steps 1-3)**

#### Step 1: Load Beneficiaries
```javascript
// Frontend calls:
GET /api/beneficiaries/list
Headers: {
  Authorization: Bearer token,
  X-User-Id: user_uuid
}

// API does:
SELECT * FROM beneficiaries
WHERE user_id = ?
ORDER BY created_at DESC

// Frontend displays:
- List of saved beneficiaries
- Each showing: name, payment method, account/UPI (masked)
- User selects one
```

**Files involved**:
- `components/transfer/TransferInitiation.js` (Frontend)
- `pages/api/beneficiaries/list.js` (Existing API)
- `BeneficiariesList component` (Display)

---

#### Step 2: Validate Amount Input
```javascript
// Frontend validates (client-side):
- Amount must be number
- Amount >= $10 (minimum)
- Amount <= $50,000 (maximum)
- Trim whitespace

// Validation rules:
MIN_AMOUNT = 10
MAX_AMOUNT = 50000

// Error messages:
- "Amount must be between $10 and $50,000"
- "Please enter a valid amount"
```

**Files involved**:
- `components/transfer/TransferInitiation.js` (Validation logic)
- Input field with error state

---

#### Step 3: Get Exchange Rate & Fee Breakdown
```javascript
// Frontend calls:
GET /api/transfers/exchange-rate?amount=500&source=USD&target=INR

// Backend does:
1. Validate amount (same rules as above)
2. Call Chimoney API:
   GET /v0.2.4/payouts/rates?countryTo=IN

3. Extract rate from response:
   response.data.INR.rates.USD.rate = 83.25

4. Calculate:
   target_amount = source_amount * exchange_rate
   = 500 * 83.25 = 41,625 INR

   fee_amount = source_amount * FEE_PERCENTAGE
   = 500 * 0.005 = $2.50

   total_to_pay = source_amount + fee_amount
   = 500 + 2.50 = $502.50

5. Return response:
{
  "success": true,
  "source_amount": 500,
  "source_currency": "USD",
  "exchange_rate": 83.25,
  "target_amount": 41625,
  "target_currency": "INR",
  "fee_amount": 2.50,
  "fee_percentage": 0.5,
  "total_to_pay": 502.50,
  "timestamp": "2026-02-28T12:45:00Z"
}

// Frontend displays:
═══════════════════════════════════
  You Send (USD):        $502.50
  Exchange Rate:    1 USD = ₹83.25
  Recipient Gets (INR):  ₹41,625
  Transfer Fee:              $2.50
═══════════════════════════════════
```

**Files to create**:
- `services/chimoney/rateService.js` (Chimoney API wrapper)
- `pages/api/transfers/exchange-rate.js` (Backend route)
- Rate calculation logic

---

### **PHASE 2: CONFIRMATION (Step 4)**

#### Step 4: Review Transfer Details
```javascript
// User reviews on confirmation screen:
┌─────────────────────────────────┐
│ From: You (USD Account)          │
│ To: Amit Kumar                   │
│     UPI: amit@**** (masked)      │
│                                  │
│ Amount to Send: $502.50          │
│ Amount Recipient Gets: ₹41,625   │
│ Exchange Rate: 1 USD = ₹83.25    │
│ Transfer Fee: $2.50              │
│                                  │
│ Settlement Time: 2-5 minutes     │
│                                  │
│ ⚠️  Cannot be reversed!           │
└─────────────────────────────────┘
```

**Files involved**:
- `components/transfer/TransferReview.js` (Display component)
- Shows masked beneficiary details
- Settlement time info
- Warning messages

---

### **PHASE 3: TRANSFER EXECUTION (Steps 5-6)**

#### Step 5: Create Transfer Record
```javascript
// Frontend calls:
POST /api/transfers/initiate
Headers: {
  Authorization: Bearer token,
  X-User-Id: user_uuid,
  Content-Type: application/json
}

Body: {
  "beneficiary_id": "uuid-of-beneficiary",
  "source_amount": 502.50,
  "source_currency": "USD",
  "target_currency": "INR",
  "exchange_rate": 83.25,
  "fee_amount": 2.50,
  "fee_percentage": 0.5
}

// Backend does:
1. Validate authorization (user_id from header)
2. Validate amount (same rules)
3. Verify beneficiary exists and belongs to user:
   SELECT id FROM beneficiaries
   WHERE id = ? AND user_id = ?

4. Insert into transfers table:
   INSERT INTO transfers (
     user_id, beneficiary_id,
     source_amount, target_amount,
     source_currency, target_currency,
     exchange_rate, fee_amount, fee_percentage,
     status, initiated_at, ip_address, user_agent
   ) VALUES (...)
   RETURNING id

5. Log status change:
   INSERT INTO transfer_status_log (
     transfer_id, new_status: 'pending'
   )

6. Return:
{
  "success": true,
  "transfer_id": "txn-xyz-789",
  "status": "pending",
  "initiated_at": "2026-02-28T12:45:00Z"
}
```

**Files to create**:
- `pages/api/transfers/initiate.js` (Backend route)
- Transfer validation logic
- Database insert with audit logging

---

#### Step 6: Execute Transfer (Call Chimoney)
```javascript
// Frontend calls:
POST /api/transfers/execute
Headers: {
  Authorization: Bearer token,
  X-User-Id: user_uuid
}

Body: {
  "transfer_id": "txn-xyz-789"
}

// Backend does:

// 6.1: Start transaction
BEGIN TRANSACTION;

// 6.2: Update transfer status to 'processing'
UPDATE transfers SET status = 'processing'
WHERE id = ?;

// 6.3: Log status change
INSERT INTO transfer_status_log (
  transfer_id, old_status: 'pending', new_status: 'processing'
);

// 6.4: Get beneficiary details
SELECT
  b.name,
  b.recipient_upi_encrypted,
  b.recipient_bank_account_encrypted,
  b.recipient_ifsc,
  b.recipient_bank_name,
  b.payment_method
FROM beneficiaries b
WHERE b.id = ? AND b.user_id = ?;

// 6.5: Decrypt sensitive fields (AES-256-CBC)
decrypted_upi = decrypt(recipient_upi_encrypted, ENCRYPTION_KEY)
decrypted_account = decrypt(recipient_bank_account_encrypted, ENCRYPTION_KEY)

// 6.6: Call Chimoney API
POST https://api.chimoney.io/v0.2.4/payouts/bank
Headers: X-API-Key: ${CHIMONEY_API_KEY}

Body: {
  "amount": 500,                    // source_amount
  "currency": "USD",
  "account_number": "1234567890",   // decrypted_account
  "bank_code": "HDFC0000123",       // ifsc
  "fullname": "Amit Kumar",         // name
  "country": "NG",                  // India
  "narration": "Payment from Vitta",
  "reference": "TXN_USD_INR_2026_028",
  "subAccount": ${CHIMONEY_SUB_ACCOUNT}
}

// 6.7: Handle Chimoney response
if (chimoney_response.success) {
  chimoney_id = chimoney_response.data.id
  chimoney_ref = chimoney_response.data.reference
  status = "processing"  // Chimoney is processing

  // Update transfer with Chimoney reference
  UPDATE transfers SET
    status = 'processing',
    chimoney_transaction_id = chimoney_id,
    chimoney_reference = chimoney_ref,
    executed_at = NOW()
  WHERE id = ?;

  // Log the Chimoney submission
  INSERT INTO transfer_status_log (
    transfer_id, old_status: 'pending', new_status: 'processing',
    metadata: { chimoney_id, chimoney_ref }
  );

  COMMIT TRANSACTION;

  Return: {
    "success": true,
    "transfer_id": "txn-xyz-789",
    "status": "processing",
    "chimoney_transaction_id": "chi_9876543210",
    "executed_at": "2026-02-28T12:46:00Z",
    "expected_delivery": "2026-02-28T12:51:00Z"
  }

} else {
  // Chimoney rejected the transfer
  ROLLBACK TRANSACTION;

  error_code = chimoney_response.error.code

  // Map error codes:
  // INVALID_ACCOUNT → "Recipient account not found"
  // INSUFFICIENT_BALANCE → "Insufficient balance"
  // etc.

  Return: {
    "success": false,
    "error_code": "CHIMONEY_ERROR",
    "error_message": "Transfer could not be processed",
    "suggestion": "Please verify beneficiary details"
  }
}
```

**Files to create**:
- `services/chimoney/payoutService.js` (Chimoney payout API wrapper)
- `pages/api/transfers/execute.js` (Backend route)
- Error handling & mapping
- Transaction management

---

### **PHASE 4: CONFIRMATION & RECEIPT (Step 7)**

#### Step 7: Show Confirmation Screen
```javascript
// Frontend receives:
{
  "transfer_id": "txn-xyz-789",
  "status": "processing",
  "chimoney_transaction_id": "chi_9876543210",
  "executed_at": "2026-02-28T12:46:00Z"
}

// Display confirmation:
┌─────────────────────────────────┐
│   ✓ Transfer Sent Successfully!  │
│                                  │
│ Transaction ID:                  │
│   TXN_USD_INR_2026_028_K7X9M     │
│                                  │
│ From: You → Amit Kumar (UPI)     │
│ Amount: $502.50 USD              │
│ Recipient Gets: ₹41,625 INR      │
│ Status: Processing (2-5 min)     │
│ Time: Feb 28, 2026 12:46 PM      │
│                                  │
│ What happens next?               │
│ 1. Money reaches in 2-5 minutes  │
│ 2. You'll get SMS confirmation   │
│ 3. Amit gets bank notification   │
│                                  │
│ [Share] [Back] [History]         │
└─────────────────────────────────┘
```

**Files to create**:
- `components/transfer/TransferReceipt.js` (Display component)
- Success message display
- Transaction details
- Navigation options

---

### **PHASE 5: FUTURE - Webhook Status Updates**

```javascript
// [Future Enhancement - Not in MVP]

// Chimoney sends webhook when transfer completes:
POST /api/webhooks/chimoney
{
  "event": "payout.completed",
  "data": {
    "id": "chi_9876543210",
    "status": "completed",
    "amount": 500,
    "received_amount": 41625,
    "reference": "TXN_USD_INR_2026_028"
  }
}

// Backend does:
1. Verify webhook signature (HMAC)
2. Find transfer by chimoney_transaction_id:
   SELECT id FROM transfers
   WHERE chimoney_transaction_id = ?

3. Update transfer status:
   UPDATE transfers
   SET status = 'completed', completed_at = NOW()
   WHERE id = ?

4. Log status change:
   INSERT INTO transfer_status_log (
     transfer_id, old_status: 'processing', new_status: 'completed'
   )

5. [Optional] Send user notification:
   - Email: "Money received by Amit Kumar"
   - Push notification
   - SMS

// Frontend (if polling):
GET /api/transfers/{transfer_id}
Response: { status: "completed" }
```

---

## 🗂️ Files to Create Summary

### **Backend Services** (in `services/`)
```
services/chimoney/
├── chimoney.js              # Main Chimoney client (init + config)
├── rateService.js           # GET /rates wrapper
└── payoutService.js         # POST /payouts/bank wrapper
```

### **Backend Routes** (in `pages/api/`)
```
pages/api/transfers/
├── exchange-rate.js         # GET exchange rate
├── initiate.js              # POST create transfer record
├── execute.js               # POST execute transfer
├── history.js               # GET transfer history (future)
└── [transfer-id].js         # GET single transfer status (future)
```

### **Frontend Components** (in `components/transfer/`)
```
components/transfer/
├── TransferInitiation.js    # Select beneficiary + amount
├── TransferReview.js        # Confirm details
├── TransferReceipt.js       # Success confirmation
└── TransferHistory.js       # View past transfers (future)
```

### **Database Updates**
```
supabase/schema.sql
├── transfers table
├── transfer_status_log table
└── Indexes for queries
```

---

## 🔐 Error Handling

### **Client-Side Validations** (TransferInitiation)
```javascript
// Validation errors
- "Please select a beneficiary" (empty selection)
- "Please enter an amount" (empty input)
- "Amount must be between $10 and $50,000" (range error)
- "Please enter a valid number" (format error)
```

### **Server-Side Validations** (API routes)
```javascript
// Authorization errors
- 401 UNAUTHORIZED: No X-User-Id header
- 401 UNAUTHORIZED: Invalid/expired token

// Validation errors
- 400 BAD_REQUEST: Amount out of range
- 400 BAD_REQUEST: Invalid beneficiary_id
- 400 BAD_REQUEST: Beneficiary doesn't belong to user

// Resource not found
- 404 NOT_FOUND: Beneficiary not found
- 404 NOT_FOUND: Transfer not found

// Chimoney errors
- 400 CHIMONEY_ERROR: Beneficiary verification failed
- 400 CHIMONEY_ERROR: Invalid account number
- 400 CHIMONEY_ERROR: Transfer limit exceeded
```

### **Response Format** (All errors)
```javascript
{
  "success": false,
  "error_code": "ERROR_CODE",
  "error_message": "User-friendly message",
  "suggestion": "What user should do"
}
```

---

## 🧪 Testing Checklist

### **Unit Tests**
- [ ] Rate calculation (source × rate = target)
- [ ] Fee calculation (source × 0.5% = fee)
- [ ] Amount validation (min/max)
- [ ] Beneficiary authorization (user_id check)

### **Integration Tests**
- [ ] End-to-end transfer flow
- [ ] Chimoney API integration
- [ ] Database transaction rollback on error
- [ ] Error handling & error codes

### **Manual Tests**
- [ ] Add beneficiary (UPI)
- [ ] Add beneficiary (Bank Account)
- [ ] Enter transfer amount
- [ ] Get live exchange rate
- [ ] Confirm transfer
- [ ] Execute transfer
- [ ] View receipt
- [ ] Check database for transfer record
- [ ] Verify Chimoney API was called

---

## 📝 Implementation Priority

```
PHASE 1 (Week 1): Backend APIs
├── [1] Chimoney rate service
├── [2] GET /api/transfers/exchange-rate
├── [3] POST /api/transfers/initiate
├── [4] POST /api/transfers/execute
└── [5] Database schema (transfers tables)

PHASE 2 (Week 2): Frontend Components
├── [6] TransferInitiation component
├── [7] TransferReview component
├── [8] TransferReceipt component
└── [9] Integration with VittaApp

PHASE 3 (Week 3): Polish & Testing
├── [10] Error handling improvements
├── [11] Loading states & animations
├── [12] End-to-end testing
└── [13] Chat integration (detect transfer intent)
```

---

## 🚀 Launch Readiness

Before marking as "complete":
- [ ] All 4 API endpoints working
- [ ] All 3 frontend components rendering
- [ ] Database schema applied
- [ ] Chimoney API credentials configured
- [ ] Error messages user-friendly
- [ ] Mobile responsive design
- [ ] End-to-end transfer tested
- [ ] Receipt generation working
- [ ] Transfer history displayable

---

## 📞 Questions & Decisions

1. **Fee structure**: 0.5% flat fee? (Currently hardcoded)
2. **Fee bearer**: User pays fee? (Currently yes)
3. **Settlement time**: 2-5 min for UPI, 1-2 days for bank? (Per Chimoney)
4. **Minimum amount**: $10? (Can adjust)
5. **Maximum amount**: $50,000? (Can adjust)
6. **Polling vs Webhook**: Poll for status or wait for Chimoney webhook? (Use polling for MVP)

