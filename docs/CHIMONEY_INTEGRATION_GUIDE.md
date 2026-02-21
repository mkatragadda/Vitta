# Chimoney API Integration Guide

**Documentation Version**: 1.0
**Chimoney API Version**: v0.2
**Status**: For India transfers (USD/INR)

---

## 1. Overview

Chimoney provides REST APIs for international money transfers. Key endpoints we'll use:

1. **Verification API** - Verify recipient account exists
2. **Quote API** - Get FX rate & fee quote
3. **Payment API** - Initiate money transfer
4. **Status API** - Check payment status
5. **Webhooks** - Real-time payment notifications

---

## 2. Authentication & Setup

### 2.1 API Credentials

Get credentials from Chimoney dashboard:

```bash
# .env.local
CHIMONEY_API_KEY=live_xxx  # For production
CHIMONEY_API_SECRET=yyy     # For signing webhooks
CHIMONEY_BASE_URL=https://api.chimoney.io/v0.2
```

### 2.2 Authentication Header

All requests require:

```typescript
const headers = {
  'Authorization': `Bearer ${process.env.CHIMONEY_API_KEY}`,
  'Content-Type': 'application/json',
  'X-Idempotency-Key': generateIdempotencyKey(), // Prevent double-payment
};
```

### 2.3 Idempotency Keys

**Critical for preventing double-payment**

```typescript
export const generateIdempotencyKey = (transferId: string, action: string) => {
  // Format: transfer-{transferId}-{action}-{timestamp}
  return `transfer-${transferId}-${action}-${Date.now()}`;
};

// Usage
const idempotencyKey = generateIdempotencyKey(transferId, 'payment-initiation');
headers['X-Idempotency-Key'] = idempotencyKey;
```

---

## 3. API Endpoints & Implementation

### 3.1 Recipient Verification API

**Purpose**: Verify recipient account exists and is valid

**Endpoint**: `POST /recipient/verify`

**Request**:
```typescript
interface VerifyRecipientRequest {
  countryCode: string;      // 'IN' for India
  recipientPhone?: string;  // For UPI: mobile number
  bankCode?: string;        // For bank transfer: IFSC code
  accountNumber?: string;   // For bank transfer
  accountType?: 'savings' | 'current';
}

const response = await fetch(`${CHIMONEY_BASE_URL}/recipient/verify`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.CHIMONEY_API_KEY}`,
    'Content-Type': 'application/json',
    'X-Idempotency-Key': generateIdempotencyKey(transferId, 'verify-recipient'),
  },
  body: JSON.stringify({
    countryCode: 'IN',
    recipientPhone: '9876543210', // Example: UPI
    // OR for bank transfer:
    // bankCode: 'HDFC0000001',
    // accountNumber: '1234567890',
    // accountType: 'savings'
  }),
});

const result = await response.json();
```

**Success Response (UPI)**:
```json
{
  "statusCode": 200,
  "success": true,
  "data": {
    "recipientId": "rec_1234567890abc",
    "status": "verified",
    "recipientName": "John Doe",
    "recipientPhone": "9876543210",
    "paymentMethods": ["upi"]
  }
}
```

**Success Response (Bank Account)**:
```json
{
  "statusCode": 200,
  "success": true,
  "data": {
    "recipientId": "rec_0987654321def",
    "status": "verified",
    "recipientName": "John Doe",
    "bankName": "HDFC Bank",
    "accountLastFour": "7890",
    "paymentMethods": ["bank_transfer"]
  }
}
```

**Error Response**:
```json
{
  "statusCode": 400,
  "success": false,
  "error": "INVALID_ACCOUNT",
  "message": "Account number is invalid for the given bank code"
}
```

**Implementation**:
```typescript
// services/transfers/providers/chimoney.ts
import crypto from 'crypto';

class ChimoneyProvider {
  private baseUrl = process.env.CHIMONEY_BASE_URL;
  private apiKey = process.env.CHIMONEY_API_KEY;

  async verifyRecipient(data: VerifyRecipientRequest) {
    const idempotencyKey = generateIdempotencyKey(data.recipientId, 'verify');

    const response = await fetch(`${this.baseUrl}/recipient/verify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[Chimoney] Verification failed:', error);
      throw new ChimoneyError(error.error, error.message);
    }

    const result = await response.json();
    if (!result.success) {
      throw new ChimoneyError(result.error, result.message);
    }

    return result.data;
  }
}
```

---

### 3.2 FX Quote API

**Purpose**: Get current FX rate and calculate fees

**Endpoint**: `POST /rates/quote`

**Request**:
```typescript
interface QuoteRequest {
  corridorId?: string;        // Pre-defined corridor
  sourceCountry: string;      // 'US'
  destinationCountry: string; // 'IN'
  sourceAmount: number;       // 100.00 USD
  currencyCode: string;       // 'USD'
}

const response = await fetch(`${CHIMONEY_BASE_URL}/rates/quote`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.CHIMONEY_API_KEY}`,
    'Content-Type': 'application/json',
    'X-Idempotency-Key': generateIdempotencyKey(transferId, 'rate-quote'),
  },
  body: JSON.stringify({
    sourceCountry: 'US',
    destinationCountry: 'IN',
    sourceAmount: 100,
    currencyCode: 'USD',
  }),
});

const result = await response.json();
```

**Success Response**:
```json
{
  "statusCode": 200,
  "success": true,
  "data": {
    "quoteId": "quote_1234567890abc",
    "sourceAmount": 100.00,
    "sourceCurrency": "USD",
    "destinationAmount": 8250.50,
    "destinationCurrency": "INR",
    "exchangeRate": 82.5050,
    "midMarketRate": 82.4500,
    "fees": {
      "chargesToRemitter": {
        "amount": 5.00,
        "currency": "USD"
      },
      "chargesToBeneficiary": {
        "amount": 0,
        "currency": "INR"
      }
    },
    "totalSent": 100.00,
    "totalReceived": 8250.50,
    "quoteValiditySeconds": 300,
    "quoteExpiresAt": "2026-02-14T10:10:00Z"
  }
}
```

**Implementation**:
```typescript
async getQuote(
  sourceAmount: number,
  corridorId: string,
): Promise<FXQuote> {
  const idempotencyKey = generateIdempotencyKey(corridorId, 'rate-quote');

  const response = await fetch(`${this.baseUrl}/rates/quote`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({
      sourceCountry: 'US',
      destinationCountry: 'IN',
      sourceAmount,
      currencyCode: 'USD',
    }),
  });

  const result = await response.json();
  if (!result.success) {
    throw new ChimoneyError(result.error, result.message);
  }

  // Store quote in database with expiry
  await db.fx_rates.create({
    quoteId: result.data.quoteId,
    buy_rate: result.data.exchangeRate,
    mid_rate: result.data.midMarketRate,
    source_amount: sourceAmount,
    destination_amount: result.data.destinationAmount,
    fee_amount: result.data.fees.chargesToRemitter.amount,
    rate_validity_seconds: result.data.quoteValiditySeconds,
    expires_at: new Date(result.data.quoteExpiresAt),
  });

  return {
    quoteId: result.data.quoteId,
    rate: result.data.exchangeRate,
    destinationAmount: result.data.destinationAmount,
    fees: result.data.fees,
    expiresAt: result.data.quoteExpiresAt,
  };
}
```

---

### 3.3 Payment Initiation API

**Purpose**: Send money to recipient

**Endpoint**: `POST /transfer/initiate`

**Request**:
```typescript
interface PaymentRequest {
  recipientId: string;        // From verification API
  quoteId: string;            // From quote API
  sourceAmount: number;       // Amount sender pays
  currencyCode: string;       // 'USD'
  paymentMethod: string;      // 'upi' or 'bank_transfer'
  senderName: string;
  senderEmail: string;
  senderPhone: string;
  purposeOfTransfer: string;  // For compliance
  sourceOfFunds: string;      // For compliance
}

const response = await fetch(`${CHIMONEY_BASE_URL}/transfer/initiate`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.CHIMONEY_API_KEY}`,
    'Content-Type': 'application/json',
    'X-Idempotency-Key': generateIdempotencyKey(transferId, 'payment-initiation'),
  },
  body: JSON.stringify({
    recipientId: 'rec_1234567890abc',
    quoteId: 'quote_1234567890abc',
    sourceAmount: 100,
    currencyCode: 'USD',
    paymentMethod: 'upi',
    senderName: 'Jane Smith',
    senderEmail: 'jane@example.com',
    senderPhone: '+12125551234',
    purposeOfTransfer: 'family_support',
    sourceOfFunds: 'salary',
  }),
});

const result = await response.json();
```

**Success Response**:
```json
{
  "statusCode": 200,
  "success": true,
  "data": {
    "transactionId": "txn_1234567890abc",
    "status": "initiated",
    "sourceAmount": 100.00,
    "destinationAmount": 8250.50,
    "fee": 5.00,
    "recipientName": "John Doe",
    "createdAt": "2026-02-14T10:05:00Z",
    "estimatedDeliveryTime": "2026-02-14T12:05:00Z"
  }
}
```

**Implementation** (with idempotency & retry):
```typescript
async initiatePayment(
  transferData: PaymentInitiationData,
): Promise<PaymentInitiationResponse> {
  const transferId = transferData.transferId;
  const idempotencyKey = generateIdempotencyKey(transferId, 'payment-initiation');

  let retries = 0;
  const MAX_RETRIES = 3;

  while (retries < MAX_RETRIES) {
    try {
      const response = await fetch(
        `${this.baseUrl}/transfer/initiate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'X-Idempotency-Key': idempotencyKey, // Same key for all retries
          },
          body: JSON.stringify(transferData),
          timeout: 30000, // 30 second timeout
        }
      );

      if (response.status === 409) {
        // Conflict: Transfer already initiated with same idempotency key
        // This is good - means we successfully initiated before
        const data = await response.json();
        console.log('[Chimoney] Transfer already initiated:', data);
        return data.data;
      }

      if (response.status >= 500) {
        // Transient error - retry
        retries++;
        await sleep(Math.pow(2, retries) * 1000);
        continue;
      }

      const result = await response.json();
      if (!result.success) {
        throw new ChimoneyError(result.error, result.message);
      }

      // Success - save transaction ID
      await db.transfer_requests.update(transferId, {
        status: 'payment_initiated',
        chimoney_transaction_id: result.data.transactionId,
        payment_status: 'pending',
      });

      return result.data;
    } catch (error) {
      if (retries < MAX_RETRIES) {
        retries++;
        const delay = Math.pow(2, retries) * 1000;
        console.log(`[Chimoney] Retry ${retries}/${MAX_RETRIES} after ${delay}ms`);
        await sleep(delay);
      } else {
        throw error;
      }
    }
  }
}
```

---

### 3.4 Payment Status API

**Purpose**: Check status of initiated payment

**Endpoint**: `GET /transfer/:transactionId/status`

**Implementation**:
```typescript
async getPaymentStatus(transactionId: string): Promise<PaymentStatus> {
  const response = await fetch(
    `${this.baseUrl}/transfer/${transactionId}/status`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const result = await response.json();
  if (!result.success) {
    throw new ChimoneyError(result.error, result.message);
  }

  // Map Chimoney status to our status
  const statusMap = {
    'pending': 'payment_pending',
    'processing': 'payment_processing',
    'completed': 'payment_completed',
    'failed': 'payment_failed',
    'cancelled': 'payment_cancelled',
  };

  return {
    transactionId,
    status: statusMap[result.data.status],
    completedAt: result.data.completedAt,
    errorMessage: result.data.errorMessage,
  };
}
```

**Called by polling job** (every 30 seconds after payment_initiated):
```typescript
// pages/api/cron/poll-payment-status.js
export default async function handler(req, res) {
  const pendingTransfers = await db.transfer_requests.findMany({
    where: { payment_status: 'pending' },
  });

  for (const transfer of pendingTransfers) {
    try {
      const status = await chimoney.getPaymentStatus(
        transfer.chimoney_transaction_id
      );

      if (status.status === 'payment_completed') {
        await db.transfer_requests.update(transfer.id, {
          status: 'completed',
          payment_status: 'completed',
          completed_at: new Date(),
        });

        // Send completion notification
        await notificationService.sendPaymentCompleted(
          transfer.user_id,
          transfer
        );
      } else if (status.status === 'payment_failed') {
        await db.transfer_requests.update(transfer.id, {
          status: 'failed',
          payment_status: 'failed',
          error_message: status.errorMessage,
        });

        // Send failure notification
        await notificationService.sendPaymentFailed(
          transfer.user_id,
          transfer
        );
      }
    } catch (error) {
      console.error(`Failed to poll status for transfer ${transfer.id}:`, error);
    }
  }

  res.status(200).json({ success: true });
}
```

---

## 4. Webhooks

### 4.1 Webhook Configuration

In Chimoney dashboard, set webhook URL:

```
https://yourapp.com/api/webhooks/chimoney
```

Chimoney will POST events to this URL.

### 4.2 Webhook Signature Verification

**Critical for security** - Always verify signature before processing

```typescript
import crypto from 'crypto';

export const verifyChimoneyWebhook = (
  payload: string,
  signature: string,
): boolean => {
  const secret = process.env.CHIMONEY_API_SECRET;

  const hash = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64');

  return crypto.timingSafeEqual(
    Buffer.from(hash),
    Buffer.from(signature)
  );
};
```

**Webhook Handler**:
```typescript
// pages/api/webhooks/chimoney.ts
import { verifyChimoneyWebhook } from '@/services/transfers/webhookSecurity';

export default async function handler(req, res) {
  // Get raw body for signature verification
  const rawBody = req.rawBody || JSON.stringify(req.body);
  const signature = req.headers['x-chimoney-signature'];

  // Verify signature
  if (!verifyChimoneyWebhook(rawBody, signature)) {
    console.error('[Chimoney Webhook] Invalid signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const { eventType, data } = req.body;

  // Log webhook for audit trail
  await db.chimoney_webhook_logs.create({
    webhook_id: data.transactionId,
    event_type: eventType,
    payload: data,
    received_at: new Date(),
  });

  try {
    switch (eventType) {
      case 'transfer.completed':
        await handleTransferCompleted(data);
        break;
      case 'transfer.failed':
        await handleTransferFailed(data);
        break;
      case 'transfer.pending':
        await handleTransferPending(data);
        break;
      default:
        console.warn(`[Chimoney] Unknown event type: ${eventType}`);
    }

    // Always return 200 to acknowledge receipt
    // Chimoney will retry if we don't
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('[Chimoney Webhook] Processing failed:', error);
    // Still return 200, log error for manual investigation
    res.status(200).json({ success: false, error: error.message });
  }
}

async function handleTransferCompleted(data) {
  const transfer = await db.transfer_requests.findUnique({
    where: { chimoney_transaction_id: data.transactionId }
  });

  if (!transfer) {
    console.warn(`Transfer not found for transaction ${data.transactionId}`);
    return;
  }

  // Update transfer status
  await db.transfer_requests.update(transfer.id, {
    status: 'completed',
    payment_status: 'completed',
    completed_at: new Date(),
  });

  // Create activity log
  await db.transfer_activity_log.create({
    transfer_id: transfer.id,
    activity_type: 'payment_webhook_received',
    details: { event: 'transfer.completed', transactionId: data.transactionId },
    triggered_by: 'webhook',
  });

  // Send user notification
  await notificationService.sendPaymentCompleted(transfer.user_id, transfer);
}

async function handleTransferFailed(data) {
  const transfer = await db.transfer_requests.findUnique({
    where: { chimoney_transaction_id: data.transactionId }
  });

  await db.transfer_requests.update(transfer.id, {
    status: 'failed',
    payment_status: 'failed',
    error_message: data.failureReason,
  });

  await notificationService.sendPaymentFailed(transfer.user_id, transfer);
}
```

---

## 5. Error Handling

### 5.1 Chimoney Error Codes

```typescript
enum ChimoneyErrorCode {
  // Recipient errors
  RECIPIENT_NOT_FOUND = 'RECIPIENT_NOT_FOUND',
  INVALID_ACCOUNT = 'INVALID_ACCOUNT',
  ACCOUNT_INACTIVE = 'ACCOUNT_INACTIVE',

  // Rate/Quote errors
  RATE_EXPIRED = 'RATE_EXPIRED',
  RATE_UNAVAILABLE = 'RATE_UNAVAILABLE',

  // Payment errors
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  DAILY_LIMIT_EXCEEDED = 'DAILY_LIMIT_EXCEEDED',
  RECIPIENT_LIMIT_EXCEEDED = 'RECIPIENT_LIMIT_EXCEEDED',
  DUPLICATE_TRANSACTION = 'DUPLICATE_TRANSACTION',

  // Compliance errors
  AML_CHECK_FAILED = 'AML_CHECK_FAILED',
  SANCTIONS_CHECK_FAILED = 'SANCTIONS_CHECK_FAILED',
  KYC_REQUIRED = 'KYC_REQUIRED',

  // Server errors
  TEMPORARY_OUTAGE = 'TEMPORARY_OUTAGE',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}
```

### 5.2 User-Facing Error Messages

```typescript
const errorMessagesMap = {
  'RECIPIENT_NOT_FOUND': 'Recipient account could not be found. Please verify the details.',
  'INVALID_ACCOUNT': 'The account number or UPI ID is invalid.',
  'RATE_EXPIRED': 'The exchange rate quote has expired. Please get a new quote.',
  'INSUFFICIENT_BALANCE': 'Your account has insufficient balance for this transfer.',
  'DAILY_LIMIT_EXCEEDED': 'You have exceeded your daily transfer limit. Try again tomorrow.',
  'AML_CHECK_FAILED': 'Transfer could not be completed due to compliance checks. Contact support.',
  'TEMPORARY_OUTAGE': 'Transfers are temporarily unavailable. Please try again in a few minutes.',
};

const getUserFriendlyError = (code: string): string => {
  return errorMessagesMap[code] || 'Transfer failed. Please contact support.';
};
```

---

## 6. Testing with Chimoney Sandbox

### 6.1 Sandbox Setup

```bash
# Use sandbox credentials in .env.local
CHIMONEY_API_KEY=sandbox_xxx
CHIMONEY_BASE_URL=https://api.sandbox.chimoney.io/v0.2
```

### 6.2 Sandbox Test Data

```typescript
// Test recipient (always succeeds verification)
{
  countryCode: 'IN',
  recipientPhone: '9999999999',  // Magic number for sandbox
  // Returns: recipientId = 'rec_sandbox_success'
}

// Test quote (always succeeds)
{
  sourceCountry: 'US',
  destinationCountry: 'IN',
  sourceAmount: 100,
  // Returns: Fixed rate of 82.50
}

// Test payment (always succeeds after 5 seconds)
{
  recipientId: 'rec_sandbox_success',
  sourceAmount: 100,
  // Returns: transactionId, webhook fired after 5 seconds
}
```

### 6.3 Webhook Testing

Use webhook tunneling to test webhooks locally:

```bash
# Install ngrok
brew install ngrok

# Start ngrok tunnel
ngrok http 3000

# Copy ngrok URL: https://xxx.ngrok.io
# In Chimoney dashboard, set webhook URL to:
# https://xxx.ngrok.io/api/webhooks/chimoney
```

---

## 7. Security Checklist

- [ ] Always verify webhook signatures
- [ ] Use idempotency keys for all payments
- [ ] Never log sensitive data (bank accounts, UPI, amounts)
- [ ] Encrypt recipient data at rest
- [ ] Implement rate limiting on transfer API (5/day max)
- [ ] Verify API response signatures
- [ ] Implement timeout on all Chimoney API calls (30 seconds)
- [ ] Monitor error rates and alert on >1% failures
- [ ] Have manual refund procedure for failed transfers
- [ ] Annual security audit of transfer system

---

## 8. Monitoring & Debugging

### 8.1 Key Metrics to Track

```typescript
// Track in Datadog/New Relic
- chimoney_api_calls{endpoint, status}
- chimoney_verification_success_rate
- chimoney_quote_requests
- chimoney_payment_initiated
- chimoney_payment_completed
- chimoney_webhook_received
- chimoney_webhook_processed_latency_ms
```

### 8.2 Debug Logging

```typescript
logger.info('[Chimoney] Verification started', {
  recipientId,
  corridor,
  paymentMethod,
  timestamp: new Date(),
});

logger.info('[Chimoney] Quote received', {
  quoteId,
  rate: 82.50,
  validity: 300,
  timestamp: new Date(),
});

logger.info('[Chimoney] Payment initiated', {
  transactionId,
  transferId,
  sourceAmount,
  idempotencyKey,
  timestamp: new Date(),
});
```

---

## 9. Resources

- **Chimoney API Docs**: https://docs.chimoney.io
- **Sandbox Dashboard**: https://sandbox.chimoney.io
- **Support Email**: support@chimoney.io
- **Rate Limits**: 100 req/min per API key
