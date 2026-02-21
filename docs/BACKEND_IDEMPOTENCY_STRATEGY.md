# Backend Idempotency Strategy - Duplicate Click Prevention

**Critical Issue**: User clicks "Send Money" button twice → Must prevent duplicate transfers

---

## The Problem

```
User clicks "Confirm Payment"
    ↓
Network is slow (no immediate response)
    ↓
User impatient, clicks again
    ↓
DANGER: Two identical payments sent to Chimoney!
```

Even worse: Chimoney returns 409 Conflict (duplicate), but our backend might:
- Create two transfer records
- Charge twice (if we're not careful)
- Send two webhooks
- Create two activity logs

---

## Three-Layer Idempotency Strategy

### Layer 1: Frontend (Optimistic UI)
```typescript
// pages/transfers/TransferDialog.tsx

const [isProcessing, setIsProcessing] = useState(false);

const handleConfirmPayment = async () => {
  // Immediately disable button
  setIsProcessing(true);

  try {
    await initiatePayment(transferId);
    // Success - show confirmation
  } catch (error) {
    // Error - re-enable button
    setIsProcessing(false);
  }
  // Never re-enable button on success (prevents accidental double-click)
};

// Render
<button
  onClick={handleConfirmPayment}
  disabled={isProcessing}  // ← Prevents double-click immediately
  className="px-6 py-2 rounded-lg"
>
  {isProcessing ? 'Processing...' : 'Confirm & Send'}
</button>
```

**Result**: Button becomes unclickable immediately after first click
**Limitation**: Only works if page stays open. If user:
- Closes browser tab
- Navigates away
- Network disconnects
- Server crashes

We need Layer 2.

---

### Layer 2: Vitta Backend (Request Deduplication)

**Strategy**: Track which payment requests we've already processed

#### 2.1 Create Request Deduplication Table

```sql
CREATE TABLE payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  transfer_id UUID NOT NULL REFERENCES transfer_requests(id),

  -- Deduplication key
  idempotency_key VARCHAR(255) UNIQUE NOT NULL,

  -- Status
  status VARCHAR(50) DEFAULT 'pending',  -- pending, processing, completed, failed

  -- Response
  response JSONB,  -- Store response to return to duplicate requests
  error TEXT,

  -- Timing
  created_at TIMESTAMP DEFAULT now(),
  processing_started_at TIMESTAMP,
  completed_at TIMESTAMP,

  UNIQUE(transfer_id)  -- Prevent multiple payment requests for same transfer
);

CREATE INDEX idx_payment_requests_user ON payment_requests(user_id);
CREATE INDEX idx_payment_requests_idempotency_key ON payment_requests(idempotency_key);
```

#### 2.2 Generate Idempotency Keys on Frontend

```typescript
// Generate in frontend
const generateIdempotencyKey = (): string => {
  // Format: user-{userId}-transfer-{transferId}-{timestamp}
  return `user-${userId}-transfer-${transferId}-${Date.now()}`;
};

// Send with request
const response = await fetch('/api/transfers/immediate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Idempotency-Key': idempotencyKey,  // ← Critical header
  },
  body: JSON.stringify({ transferId, approvalData }),
});
```

#### 2.3 Implement Idempotent Payment Endpoint

```typescript
// pages/api/transfers/immediate.ts

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const idempotencyKey = req.headers['idempotency-key'] as string;
  const { transferId } = req.body;
  const userId = req.user.id;

  if (!idempotencyKey) {
    return res.status(400).json({
      error: 'MISSING_IDEMPOTENCY_KEY',
      message: 'Idempotency-Key header is required',
    });
  }

  try {
    // 1. Check if we've already processed this request
    const existingRequest = await db.payment_requests.findUnique({
      where: { idempotency_key: idempotencyKey },
    });

    if (existingRequest) {
      console.log('[API] Duplicate request detected, returning cached response');

      if (existingRequest.status === 'completed') {
        return res.status(200).json({
          success: true,
          isDuplicate: true,
          data: existingRequest.response,
        });
      } else if (existingRequest.status === 'failed') {
        return res.status(400).json({
          success: false,
          isDuplicate: true,
          error: existingRequest.error,
        });
      } else if (existingRequest.status === 'processing') {
        return res.status(409).json({
          success: false,
          error: 'REQUEST_ALREADY_PROCESSING',
          message: 'This payment is already being processed. Please wait.',
        });
      }
    }

    // 2. Create request record (marks as "processing")
    const paymentRequest = await db.payment_requests.create({
      user_id: userId,
      transfer_id: transferId,
      idempotency_key: idempotencyKey,
      status: 'processing',
      processing_started_at: new Date(),
    });

    // 3. Verify transfer exists and is in correct state
    const transfer = await db.transfer_requests.findUnique(transferId);
    if (transfer.status !== 'pending_approval') {
      await db.payment_requests.update(paymentRequest.id, {
        status: 'failed',
        error: `Cannot process from status: ${transfer.status}`,
      });

      return res.status(400).json({
        success: false,
        error: 'INVALID_TRANSFER_STATE',
        message: `Transfer is in ${transfer.status} state`,
      });
    }

    // 4. Call Chimoney API (with Chimoney-level idempotency key)
    const chimoneyIdempotencyKey = generateIdempotencyKey(
      transferId,
      'payment-initiation'
    );

    let paymentResponse;
    try {
      paymentResponse = await paymentService.initiatePayment(
        transferId,
        chimoneyIdempotencyKey  // Different from request idempotency key
      );
    } catch (error) {
      // Payment failed - save error
      await db.payment_requests.update(paymentRequest.id, {
        status: 'failed',
        error: error.message,
        completed_at: new Date(),
      });

      return res.status(400).json({
        success: false,
        error: error.code,
        message: error.message,
      });
    }

    // 5. Payment successful - save response
    await db.payment_requests.update(paymentRequest.id, {
      status: 'completed',
      response: paymentResponse,
      completed_at: new Date(),
    });

    console.log('[API] Payment initiated successfully', {
      transferId,
      transactionId: paymentResponse.transactionId,
    });

    return res.status(200).json({
      success: true,
      data: paymentResponse,
    });
  } catch (error) {
    console.error('[API] Unexpected error:', error);

    return res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    });
  }
}
```

**Key Points**:
- ✅ Check for existing request before processing
- ✅ If duplicate found: return cached response immediately
- ✅ If already processing: return 409 (wait for first one to complete)
- ✅ If already failed: return failure with same error
- ✅ Mark request status at each stage (pending → processing → completed/failed)

#### 2.4 Prevent Multiple Transfer Records

```typescript
// In transfer_requests table
// Add unique constraint to prevent duplicates
ALTER TABLE transfer_requests ADD CONSTRAINT
  unique_payment_attempt_per_transfer
  UNIQUE(transfer_id, payment_initiated_at);
  // Only one payment can be initiated per transfer
```

---

### Layer 3: Chimoney API (Chimoney-Level Idempotency)

**Chimoney guarantees**: If you send same request twice with same idempotency key
→ Returns 409 Conflict with original response

```typescript
// Chimoney API call
const response = await fetch(`${CHIMONEY_BASE_URL}/transfer/initiate`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${CHIMONEY_API_KEY}`,
    'X-Idempotency-Key': chimoneyIdempotencyKey,  // ← Chimoney's idempotency
  },
  body: JSON.stringify({
    recipientId: 'rec_xxx',
    sourceAmount: 100,
    // ...
  }),
});

// If response is 409 (duplicate)
if (response.status === 409) {
  const existingTransaction = await response.json();
  // Chimoney returns the original transaction details
  return existingTransaction.data;
}
```

---

## Scenario: User Clicks Twice

### Scenario 1: Rapid Double-Click (Both Within 1 Second)

```
T=0s: User clicks "Confirm"
      ├─ Frontend disables button
      ├─ Request 1 sent: POST /api/transfers/immediate
      │  Header: Idempotency-Key: user-123-transfer-xyz-1000
      └─ Button state: disabled

T=0.5s: User clicks again (button is disabled - no-op)
        └─ Frontend: Button click ignored (already disabled)

T=1s: Request 1 arrives at Vitta backend
      ├─ Check payment_requests table: NOT found
      ├─ Create entry: status = 'processing'
      ├─ Call Chimoney API with different idempotency key
      └─ Chimoney: First time seeing this payment → processes it

T=2s: Chimoney responds with transaction ID
      ├─ Save response in payment_requests table
      ├─ Update transfer_requests status = 'payment_initiated'
      └─ Return to frontend: 200 OK with transaction details

T=3s: Frontend receives 200 OK
      ├─ Show success screen
      └─ User can't go back (page redirects to status page)
```

**Result**: ✅ One transfer, one Chimoney charge, success

---

### Scenario 2: Double-Click After Network Delay (User Gets Impatient)

```
T=0s: User clicks "Confirm"
      ├─ Request 1 sent: POST /api/transfers/immediate
      ├─ Header: Idempotency-Key: user-123-transfer-xyz-1000
      └─ Button disabled

T=2s: Network slow, no response yet
      └─ User sees spinner

T=3s: User impatient, refreshes page
      ├─ Dialog closes
      └─ Backend still processing Request 1...

T=4s: Backend receives Request 1
      ├─ Create payment_requests entry: status = 'processing'
      ├─ Call Chimoney API
      ├─ Chimoney: Payment initiated
      └─ Save response, mark as 'completed'

T=5s: User clicks "Send Money" again (new page load)
      ├─ New idempotency key generated: user-123-transfer-xyz-5000
      ├─ Request 2 sent: POST /api/transfers/immediate
      ├─ Header: Idempotency-Key: user-123-transfer-xyz-5000
      └─ Button disabled again

T=6s: Backend receives Request 2
      ├─ Check payment_requests table:
      │  └─ Found existing request (idempotency_key: user-123-transfer-xyz-1000)
      ├─ BUT: Different idempotency key!
      ├─ Check transfer_requests table:
      │  └─ Found: transfer.status = 'payment_initiated'
      ├─ REJECT: "Payment already initiated for this transfer"
      └─ Return: 409 CONFLICT

T=7s: Frontend receives 409
      ├─ Show message: "Payment already being processed"
      ├─ Link to status page: "Check payment status"
      └─ Button re-enabled (optional - user likely navigates away)
```

**Result**: ✅ One transfer, one Chimoney charge, conflict prevented by transfer state check

---

### Scenario 3: Bug in Frontend (Idempotency Key NOT Sent)

```
T=0s: User clicks "Confirm"
      └─ Request 1: POST /api/transfers/immediate
         Headers: (NO Idempotency-Key)

T=1s: Backend receives Request 1
      ├─ Check: Idempotency-Key header missing!
      ├─ REJECT with 400 BAD REQUEST
      └─ Return: "Idempotency-Key header is required"

T=2s: Frontend receives 400
      ├─ Show error: "Please try again"
      └─ Button re-enabled for retry
```

**Result**: ✅ Prevented by validation (require idempotency key on all payment endpoints)

---

## Implementation Checklist

### Frontend
- [ ] Generate idempotency key before each request
- [ ] Send as `Idempotency-Key` header
- [ ] Disable button immediately on click
- [ ] Show loading spinner
- [ ] On error: Re-enable button
- [ ] On success: Redirect to status page (prevent going back)

### Backend
- [ ] Create `payment_requests` table
- [ ] Validate Idempotency-Key header (required)
- [ ] Check for existing request before processing
- [ ] If found & completed: Return cached response
- [ ] If found & processing: Return 409 (already in progress)
- [ ] If found & failed: Return error
- [ ] Mark transfer status to prevent duplicate payment initiations
- [ ] Use different idempotency key for Chimoney calls
- [ ] Store all responses for future deduplication

### Logging
- [ ] Log all duplicate attempts
- [ ] Log idempotency key mismatches
- [ ] Alert if payment_requests table gets out of sync with transfers

---

## Edge Cases Handled

| Case | Prevention |
|------|-----------|
| User double-clicks button | Frontend disables button (Layer 1) |
| User refreshes page during processing | Backend deduplicates via idempotency key (Layer 2) |
| User opens two tabs | Transfer state prevents duplicate payment init |
| Chimoney receives duplicate request | Chimoney returns 409 Conflict (Layer 3) |
| Network duplicates request packet | Idempotency key deduplicates (all layers) |
| Webhook doesn't arrive | Polling + payment_requests table prevent re-initiation |
| Idempotency key not sent | Backend returns 400 (validation) |

---

## Monitoring

```typescript
// Alert if duplicate attempts spike
SELECT
  COUNT(*) as duplicate_attempts,
  COUNT(DISTINCT transfer_id) as affected_transfers
FROM payment_requests
WHERE status = 'completed'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY DATE(created_at)
HAVING COUNT(*) > expected_baseline;

// Log duplicate requests
console.log('[Deduplication] Duplicate payment request detected', {
  idempotencyKey,
  transferId,
  previousStatus: existingRequest.status,
  timeSincePrevious: Date.now() - existingRequest.created_at.getTime(),
});
```

---

## Summary

**Three-layer approach ensures NO double-charges:**

1. 🖱️ **Frontend**: Disable button immediately
2. 🔄 **Vitta Backend**: Idempotency-Key deduplication + state checks
3. 🔐 **Chimoney**: Chimoney-level idempotency keys

**If user clicks button twice:**
- First click: Processed normally
- Second click: Blocked by frontend (button disabled) OR caught by backend deduplication OR prevented by transfer state check
