# UPI Payment Flow Design - Addendum to Chimoney Integration

**Status**: Design for UPI payment method (phone/mobile number based)
**Use Case**: Send money to India via UPI ID (phone number)
**Compliance**: NPCI regulations, RBI guidelines

---

## 1. UPI vs Bank Transfer - Key Differences

| Aspect | UPI | Bank Transfer |
|--------|-----|----------------|
| **Identifier** | Mobile Number (10 digits) | IFSC + Account Number |
| **Verification** | Quick (seconds) | Slower (minutes) |
| **Settlement** | Near real-time (2-5 min) | 1-2 business days |
| **Fees** | Lower (usually $0-2) | Higher ($3-5) |
| **Complexity** | Simple - just phone | Complex - many details |
| **Error Recovery** | Easier - resend to phone | Harder - wrong account |
| **Popular** | Among young users | Among businesses |

---

## 2. UPI Payment Flow - Step by Step

```
User Enters Phone Number
    ↓
[Recipient Verification]
    ├─ Chimoney verifies if phone is UPI-registered
    ├─ Fetch recipient name from UPI provider
    └─ Check if account is active
    ↓
[Quote & Amount]
    ├─ User enters amount in USD
    ├─ Get FX rate from Chimoney
    └─ Calculate INR amount + fees
    ↓
[Confirmation]
    ├─ Show: Recipient name, UPI ID, amount in INR
    ├─ Lock FX rate for 5 minutes
    └─ User approves
    ↓
[Payment Initiation]
    ├─ Send money via UPI (push model - Chimoney pushes to bank)
    ├─ Get transaction ID immediately
    └─ Money reaches in 2-5 minutes
    ↓
[Confirmation]
    ├─ Poll UPI settlement status
    ├─ Notify user once settled
    └─ Store proof of payment
```

---

## 3. Recipient Verification for UPI

### 3.1 UPI Recipient Verification Request

```typescript
interface UPIRecipientVerifyRequest {
  countryCode: string;      // 'IN' for India
  recipientPhone: string;   // '9876543210' - 10 digit number
  phoneCountryCode?: string; // '+91' optional, phone already has it
}

// Example request to Chimoney
POST /recipient/verify
{
  "countryCode": "IN",
  "recipientPhone": "9876543210",
  "verifyUPI": true  // Tell Chimoney to verify via UPI
}
```

### 3.2 UPI Success Response

```json
{
  "statusCode": 200,
  "success": true,
  "data": {
    "recipientId": "rec_upi_9876543210_123",
    "status": "verified",
    "recipientName": "Rajesh Kumar",
    "recipientPhone": "9876543210",
    "paymentMethods": ["upi"],
    "upiHandle": "9876543210@okhdfcbank",  // UPI identifier
    "bankName": "HDFC Bank",
    "bankCode": "HDFC",
    "verificationMethod": "upi_network",
    "verifiedAt": "2026-02-14T10:00:00Z",
    "verificationExpiry": "2026-02-21T10:00:00Z"  // 7 days
  }
}
```

### 3.3 UPI Verification Errors

```json
// Error 1: Invalid phone number format
{
  "statusCode": 400,
  "success": false,
  "error": "INVALID_PHONE_FORMAT",
  "message": "Phone number must be 10 digits (e.g., 9876543210)"
}

// Error 2: Phone not registered with any bank
{
  "statusCode": 400,
  "success": false,
  "error": "UPI_NOT_ACTIVATED",
  "message": "This phone number is not registered for UPI. User needs to activate UPI first."
}

// Error 3: Phone registered but UPI deactivated
{
  "statusCode": 400,
  "success": false,
  "error": "UPI_ACCOUNT_INACTIVE",
  "message": "UPI account for this phone is inactive. Please try another number."
}

// Error 4: Network timeout during verification
{
  "statusCode": 504,
  "success": false,
  "error": "VERIFICATION_TIMEOUT",
  "message": "Could not verify UPI status. Please try again."
}

// Error 5: Too many verification attempts (rate limit)
{
  "statusCode": 429,
  "success": false,
  "error": "TOO_MANY_ATTEMPTS",
  "message": "Too many verification attempts. Try again after 5 minutes."
}
```

### 3.4 User-Facing UPI Verification Messages

```typescript
const upiErrorMessages = {
  'INVALID_PHONE_FORMAT': {
    title: '❌ Invalid phone number',
    message: 'Please enter a 10-digit Indian phone number',
    action: 'Edit number'
  },
  'UPI_NOT_ACTIVATED': {
    title: '⚠️ UPI not activated',
    message: 'This phone number is not registered for UPI. Recipient needs to activate UPI first.',
    action: 'Try bank transfer instead',
    suggestion: 'Recipient can activate UPI in any bank app in 2 minutes'
  },
  'UPI_ACCOUNT_INACTIVE': {
    title: '⚠️ UPI account inactive',
    message: 'UPI for this number has been deactivated',
    action: 'Try another number'
  },
  'VERIFICATION_TIMEOUT': {
    title: '⏱️ Verification timeout',
    message: 'Took too long to verify. This might be a network issue.',
    action: 'Retry verification'
  },
  'TOO_MANY_ATTEMPTS': {
    title: '🔒 Too many attempts',
    message: 'Please wait 5 minutes before trying again',
    action: 'Wait and retry'
  }
};
```

---

## 4. UPI Payment Initiation

### 4.1 UPI Payment Request

```typescript
interface UPIPaymentRequest {
  recipientId: string;        // From UPI verification
  quoteId: string;            // FX rate quote
  sourceAmount: number;       // 100 USD
  currencyCode: string;       // 'USD'
  paymentMethod: 'upi';       // Must be 'upi' for UPI

  // Sender details
  senderName: string;
  senderEmail: string;
  senderPhone: string;        // Sender's international number

  // Compliance
  purposeOfTransfer: string;  // 'family_support', 'personal_loan_repayment'
  sourceOfFunds: string;      // 'salary', 'business_income'

  // UPI specific
  upiNotificationPhone?: string;  // Send OTP to recipient phone (optional)
}

// Example
POST /transfer/initiate
{
  "recipientId": "rec_upi_9876543210_123",
  "quoteId": "quote_abc123",
  "sourceAmount": 100,
  "currencyCode": "USD",
  "paymentMethod": "upi",
  "senderName": "Jane Smith",
  "senderEmail": "jane@example.com",
  "senderPhone": "+12125551234",
  "purposeOfTransfer": "family_support",
  "sourceOfFunds": "salary"
}
```

### 4.2 UPI Payment Success Response

```json
{
  "statusCode": 200,
  "success": true,
  "data": {
    "transactionId": "txn_upi_8250_20260214",
    "status": "initiated",
    "sourceAmount": 100.00,
    "sourceCurrency": "USD",
    "destinationAmount": 8250.50,
    "destinationCurrency": "INR",
    "exchangeRate": 82.5050,
    "fee": 5.00,
    "recipientName": "Rajesh Kumar",
    "recipientPhone": "9876543210",
    "paymentMethod": "upi",
    "createdAt": "2026-02-14T10:05:00Z",

    "upiStatus": "pending_settlement",
    "upiTransactionId": "UPI_TXN_1234567890",
    "estimatedDeliveryTime": "2026-02-14T10:10:00Z",

    // Important for UPI: Settlement typically happens in 2-5 minutes
    "settlementTimeframe": "2-5 minutes",
    "canRetry": false,  // UPI payments cannot be retried
    "canCancel": true   // Can cancel within 1 minute
  }
}
```

### 4.3 UPI Payment Errors

```json
// Error 1: Recipient's UPI expired (> 7 days since verification)
{
  "statusCode": 400,
  "success": false,
  "error": "UPI_VERIFICATION_EXPIRED",
  "message": "Recipient verification expired. Please re-verify recipient."
}

// Error 2: UPI transfer limit exceeded
{
  "statusCode": 400,
  "success": false,
  "error": "UPI_LIMIT_EXCEEDED",
  "message": "Amount exceeds daily UPI transfer limit (₹100,000). Use bank transfer."
}

// Error 3: Recipient's UPI deactivated since verification
{
  "statusCode": 400,
  "success": false,
  "error": "UPI_DEACTIVATED",
  "message": "Recipient's UPI account has been deactivated. Cannot proceed."
}

// Error 4: Rate lock expired
{
  "statusCode": 400,
  "success": false,
  "error": "RATE_LOCK_EXPIRED",
  "message": "Exchange rate quote expired. Please get a new quote."
}

// Error 5: UPI network is down
{
  "statusCode": 503,
  "success": false,
  "error": "UPI_NETWORK_UNAVAILABLE",
  "message": "UPI network is temporarily unavailable. Try again in a few minutes."
}
```

---

## 5. UPI Payment Status Tracking

### 5.1 UPI Status States

```
pending_settlement
    ↓ (0-5 minutes)
settled_success ✅
    ↓
completed

OR

pending_settlement
    ↓ (Network error)
failed_settlement ❌
    ↓
failed
```

### 5.2 Status Polling for UPI

```typescript
// Poll every 2 seconds initially (more frequent than bank transfers)
// After 10 minutes with no update, poll every 30 seconds
// After 1 hour with no update, mark as "stuck"

interface UPIStatusPollRequest {
  transactionId: string;      // 'txn_upi_8250_20260214'
  pollingStrategy: 'aggressive' | 'normal';  // aggressive for first 10 min
}

// Example response - Status update
{
  "statusCode": 200,
  "success": true,
  "data": {
    "transactionId": "txn_upi_8250_20260214",
    "status": "settled_success",
    "settledAt": "2026-02-14T10:07:30Z",
    "upiTransactionId": "UPI_TXN_1234567890",
    "settlementConfirmedBy": "NPCI",  // NPCI confirms settlement
    "destinationAmount": 8250.50,
    "recipientConfirmed": true,  // Recipient has received funds
    "recipientBank": "HDFC Bank"
  }
}
```

### 5.3 UPI Status Webhook Events

```json
// Event 1: UPI Settlement Initiated
{
  "eventType": "upi.transfer.initiated",
  "data": {
    "transactionId": "txn_upi_8250_20260214",
    "timestamp": "2026-02-14T10:05:00Z"
  }
}

// Event 2: UPI Settlement In Progress
{
  "eventType": "upi.transfer.processing",
  "data": {
    "transactionId": "txn_upi_8250_20260214",
    "progress": "initiated at bank"
  }
}

// Event 3: UPI Settlement Success ✅
{
  "eventType": "upi.transfer.completed",
  "data": {
    "transactionId": "txn_upi_8250_20260214",
    "status": "settled",
    "settledAt": "2026-02-14T10:07:30Z",
    "destinationAmount": 8250.50,
    "recipientConfirmedAt": "2026-02-14T10:07:45Z"
  }
}

// Event 4: UPI Settlement Failed ❌
{
  "eventType": "upi.transfer.failed",
  "data": {
    "transactionId": "txn_upi_8250_20260214",
    "failureReason": "INVALID_UPI_ID",
    "refundInitiated": true,
    "refundExpectedAt": "2026-02-15T10:00:00Z"
  }
}

// Event 5: UPI Timeout (no response from UPI network)
{
  "eventType": "upi.transfer.timeout",
  "data": {
    "transactionId": "txn_upi_8250_20260214",
    "message": "No response from UPI network after 30 minutes",
    "status": "investigating"
  }
}
```

---

## 6. UPI-Specific Error Handling & Retries

### 6.1 UPI Errors Are Generally Non-Recoverable

```typescript
const upiNonRetryableErrors = [
  'UPI_NOT_ACTIVATED',      // Recipient needs to activate UPI
  'UPI_DEACTIVATED',        // Recipient deactivated their UPI
  'UPI_LIMIT_EXCEEDED',     // Amount > daily limit
  'INVALID_PHONE_FORMAT',   // Phone number invalid
];

const upiRetryableErrors = [
  'UPI_NETWORK_UNAVAILABLE', // Network timeout - can retry
  'TEMPORARY_OUTAGE',        // Chimoney/NPCI temporary issue
];

// Do NOT retry non-retryable errors (e.g., don't keep trying invalid phone)
// Only retry transient network errors
```

### 6.2 UPI Refund Flow (If Transfer Fails)

```
UPI Transfer Failed ❌
    ↓
Error Analysis
    ├─ If "invalid UPI": Show user, ask for different number
    ├─ If "network timeout": Automatic refund initiated
    └─ If "deactivated": Show message, suggest bank transfer
    ↓
Refund Initiated
    ├─ Money returns to sender's card (1-2 business days)
    ├─ User notified of refund
    └─ Full amount + fees returned
```

---

## 7. UPI UI/UX Design Considerations

### 7.1 UPI Recipient Input Screen

```
┌─────────────────────────────────┐
│ Send Money to India via UPI      │
├─────────────────────────────────┤
│                                 │
│ 📱 Recipient's Phone Number      │
│ ┌─────────────────────────────┐ │
│ │ +91 9876543210            │ │  (Autofill +91 if phone starts with 9)
│ │                           │ │
│ │ (Verifying...)           │ │
│ └─────────────────────────────┘ │
│                                 │
│ ✅ Verified: Rajesh Kumar        │
│                                 │
│ 💡 Tip: Make sure recipient has  │
│    UPI activated in their bank   │
│    app. It takes 2 minutes.      │
│                                 │
│ [Cancel] [Continue]             │
└─────────────────────────────────┘
```

### 7.2 UPI Confirmation Screen

```
┌─────────────────────────────────┐
│ Confirm UPI Transfer             │
├─────────────────────────────────┤
│                                 │
│ From: You (USA)                 │
│ ════════════════                │
│ $100.00 USD                     │
│ (Fee: $5.00)                    │
│                                 │
│ ══> To: Rajesh Kumar (India)     │
│     9876543210                  │
│ ════════════════                │
│ ₹8,250.50 INR                   │
│ Rate: 1 USD = 82.50 INR         │
│ Rate locked for: 4:52 min ⏱️    │
│                                 │
│ 💡 UPI transfers settle in 2-5   │
│    minutes. You'll get a         │
│    notification when complete.   │
│                                 │
│ [Edit] [Approve & Pay]          │
└─────────────────────────────────┘
```

### 7.3 UPI Payment Processing Screen

```
┌─────────────────────────────────┐
│ Sending Money...                 │
├─────────────────────────────────┤
│                                 │
│ ⏳ Processing UPI Transfer       │
│ [====      ] 40% - Initiated    │
│                                 │
│ Sending to: Rajesh Kumar        │
│ Amount: ₹8,250.50 INR           │
│                                 │
│ Status: Processing through      │
│         UPI network...          │
│                                 │
│ This usually takes 2-5 minutes. │
│ We'll notify you when done.     │
│                                 │
│ Transaction ID:                 │
│ txn_upi_8250_20260214           │
│                                 │
│ [X Minimize]                    │
│                                 │
│ (App can stay open or close,    │
│  notification will be sent)     │
└─────────────────────────────────┘
```

### 7.4 UPI Success Screen

```
┌─────────────────────────────────┐
│ ✅ Money Sent!                   │
├─────────────────────────────────┤
│                                 │
│ $100.00 USD sent to              │
│ Rajesh Kumar                    │
│ (+91 9876543210)                │
│                                 │
│ Amount Received: ₹8,250.50 INR  │
│ Exchange Rate: 82.50            │
│ Total Fee: $5.00                │
│                                 │
│ Settlement Time: 2 min 34 sec ⚡ │
│                                 │
│ Transaction ID:                 │
│ UPI_TXN_1234567890              │
│                                 │
│ Settled by: NPCI ✓              │
│                                 │
│ [Share Receipt] [New Transfer]  │
└─────────────────────────────────┘
```

### 7.5 UPI Error States

```
❌ UPI Not Activated
┌─────────────────────────────────┐
│ This phone doesn't have UPI      │
│ activated yet.                  │
│                                 │
│ Recipient can activate UPI in   │
│ their bank app (2 min process). │
│                                 │
│ [Use Bank Transfer Instead]     │
└─────────────────────────────────┘

❌ UPI Transfer Failed
┌─────────────────────────────────┐
│ Transfer Failed ❌               │
│                                 │
│ Reason: Invalid UPI ID          │
│ Amount: $100.00 USD             │
│                                 │
│ Money being refunded to your    │
│ card. Check in 1-2 days.        │
│                                 │
│ [Try Different Number]          │
│ [Use Bank Transfer]             │
│ [Contact Support]               │
└─────────────────────────────────┘
```

---

## 8. UPI-Specific Database Fields

Add to `transfer_requests` table:

```sql
ALTER TABLE transfer_requests ADD COLUMN
  upi_phone_verified_at TIMESTAMP,  -- When UPI was verified
  upi_phone_verification_expires_at TIMESTAMP,  -- Re-verify after 7 days
  upi_settlement_time_ms INT,  -- How long settlement took (for analytics)
  upi_transaction_id VARCHAR(50),  -- NPCI transaction ID
  upi_recipient_confirmed_at TIMESTAMP;  -- When recipient bank confirmed receipt
```

---

## 9. UPI vs Bank Transfer Decision Tree

```
User selects payment method
    ↓
┌─────────────────────────┐
│ Has recipient's phone?  │
└─────────────────────────┘
    ↙         ↘
   YES        NO
   ↓          ↓
  UPI       Bank Transfer
  ↓          ↓
Offer UPI    Offer Bank Transfer
Show advantages:  Show advantages:
- Quick (2-5 min)  - Flexible amount
- Low fee         - For businesses
- Easy (just phone)

User chooses → Proceed with flow
```

---

## 10. UPI Monitoring & Analytics

### Key UPI Metrics

```
- UPI verification success rate (target: >95%)
- UPI settlement time (median: 3 minutes)
- UPI transfer success rate (target: >98%)
- UPI failure reasons distribution
- UPI verification re-attempts (identify common issues)
- UPI vs Bank Transfer usage split (goal: 70% UPI, 30% bank)
```

### UPI Alert Thresholds

```
🔴 Critical:
- UPI verification fails for 50+ consecutive attempts
- Settlement takes >30 minutes
- Success rate drops below 90%

🟡 Warning:
- Average settlement > 10 minutes
- Verification failures > 10% of attempts
- Refund rate > 2%
```

---

## 11. UPI Compliance Notes

### RBI/NPCI Requirements

- ✅ Transaction logging for all UPI transfers
- ✅ KYC validation (user's KYC already done via Google)
- ✅ Recipient verification before payment
- ✅ Purpose of transfer captured
- ✅ Source of funds captured
- ✅ Transfer limits complied with (<$1,000 USD per day per user)
- ✅ All transactions auditable

### Data Security

- Encrypt phone numbers at rest
- Never log full phone numbers in plaintext
- Verify webhook signatures (HMAC-SHA256)
- PCI-DSS compliance for payment processing

---

## 12. Testing UPI in Sandbox

### Chimoney Sandbox Test Numbers

```
9999999999  - Always succeeds verification and settlement
9999999998  - Fails verification (UPI not activated)
9999999997  - Succeeds verification but fails settlement (simulate network error)
9999999996  - Succeeds but takes 30+ seconds to settle (simulate slow network)
```

### Manual Testing Steps

1. Enter test phone: `9999999999`
2. Verify → Should show "Verified"
3. Enter amount: `100 USD`
4. Get quote → Show rate + fees
5. Lock rate → 5-minute countdown
6. Confirm → Initiate payment
7. Check status → Should show "settled" after 5-10 seconds
8. Verify webhook received

---

## 13. UPI Troubleshooting Guide

| Issue | Root Cause | Solution |
|-------|-----------|----------|
| Verification times out | Slow network/API | Retry verification, show message |
| "UPI not activated" | Recipient hasn't set up UPI | Suggest bank transfer alternative |
| Settlement takes >10 min | NPCI network busy | Show message, continue polling |
| Transfer fails after success response | Race condition | Check webhook, poll status |
| Refund doesn't arrive | Bank processing delay | Standard 1-2 day timeline |
| Phone number format rejected | Invalid digits | Validate: must be 10 digits, no +91 prefix |

---

## Summary

✅ **UPI Advantages**:
- Fastest settlement (2-5 minutes vs 1-2 days for bank)
- Lowest fees ($0-2 vs $3-5)
- Simplest UX (just phone number)
- Most popular in India

⚠️ **UPI Challenges**:
- Requires recipient to have UPI activated
- Can't be cancelled after initiation
- Has daily limits (₹100,000 ~ $1,200)
- Non-retryable errors (no retry on failure)

🎯 **Recommendation**: Make UPI the primary option for India transfers, with bank transfer as fallback.

---

**Document Version**: 1.0
**Last Updated**: Feb 14, 2026
