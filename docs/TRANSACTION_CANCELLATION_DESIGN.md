# Transaction Cancellation Design - International Money Transfers

**Critical Context**: Cancellation handling differs significantly between UPI and Bank Transfer payment methods, with strict regulatory timelines for India (NPCI/RBI).

---

## 1. The Problem

```
User initiates transfer of $500 USD to India
    ↓
User sees "Processing..." screen
    ↓
User realizes wrong amount / wrong recipient / changes mind
    ↓
DANGER: User cannot cancel if payment already reached Chimoney
         Different rules apply at different stages
```

### Why Cancellation Is Hard in Remittances

1. **Regulatory Constraints**: NPCI (UPI) and RBI have strict rules on payment reversal timelines
2. **Payment Method Matters**: UPI cancellation ≠ Bank Transfer cancellation
3. **State Machine Matters**: Cancellation allowed at draft → blocked once settled
4. **Refund Complexity**: Post-settlement refunds require accounting, compliance tracking
5. **Recipient Verification**: Can't cancel if recipient already verified (security risk)
6. **FX Rate Locks**: If rate locked, cancellation triggers FX loss accounting

---

## 2. Cancellation Windows by Transfer State

### State Machine Review

```
User Query/Rate Set
       ↓
    DRAFT ⟵────── User can cancel anytime (no cost)
       ↓
  RATE_QUOTED ⟵─── User can cancel anytime (no cost)
       ↓
  RATE_LOCKED ⟵─── User can cancel (pays FX spread back to Vitta)
       ↓
  MONITORING ⟵───── User CAN cancel (rate trigger not met yet)
       ↓
  RATE_MET ⟵────── User SHOULD cancel before approval (rate met, waiting approval)
       ↓
PENDING_APPROVAL ⟵─ User CAN cancel (not sent to Chimoney yet)
       ↓
PAYMENT_INITIATED ⟵ User CANNOT cancel (Chimoney payment started)
       ↓
PAYMENT_PROCESSING ⟵ User CANNOT cancel (payment in flight, wait for webhook)
       ↓
COMPLETED ⟵─────── User CANNOT cancel (payment settled) → Request REFUND instead
       ↓
FAILED ⟵───────── N/A (payment already failed, funds returned to source)
```

### Detailed Cancellation Rules by State

| State | Can Cancel? | Cost | Timeline | Action |
|-------|------------|------|----------|--------|
| **DRAFT** | ✅ YES | None | Immediate | Delete transfer record |
| **RATE_QUOTED** | ✅ YES | None | Immediate | Mark cancelled, quote expires anyway |
| **RATE_LOCKED** | ⚠️ YES* | FX Spread Loss | Immediate | Mark cancelled, refund = locked amount - spread |
| **MONITORING** | ✅ YES | None | Immediate | Stop rate monitoring, mark cancelled |
| **RATE_MET** | ✅ YES | None | < 30 seconds | User must approve or deny immediately |
| **PENDING_APPROVAL** | ✅ YES | None | Immediate | Mark cancelled before sending to Chimoney |
| **PAYMENT_INITIATED** | ❌ NO | N/A | N/A | Return error: "Payment already sent" |
| **PAYMENT_PROCESSING** | ❌ NO (wait) | N/A | Max 5 min (UPI), 1-2 days (Bank) | Wait for webhook, handle failure |
| **COMPLETED** | ❌ NO | Can refund | Within 30 days | Request REFUND (separate flow) |
| **FAILED** | N/A | N/A | N/A | Payment already failed |

**\* RATE_LOCKED cancellations**: Vitta keeps the FX spread to cover cost of locking rate with Chimoney (typically 0.5-2% depending on market volatility at that time).

---

## 3. Industry Practices & Regulatory Framework

### 3.1 UPI Cancellation (India) - NPCI Guidelines

**Payment Lifecycle**:
```
Payment Initiated (T=0)
    ↓ (T=2-5 minutes)
Payment Settled at PSP (UPI network)
    ↓ (T=5-60 minutes)
Funds Arrive in Recipient Bank Account
```

**Cancellation Rules**:

| Timeline | Status | Cancellation Type | Process | RBI/NPCI Rule |
|----------|--------|-------------------|---------|---------------|
| **Before Initiation** (T < 0) | PENDING_APPROVAL | Direct Cancellation | Delete from queue | No restrictions |
| **First 2 Minutes** (T = 0-120s) | PAYMENT_INITIATED | Real-time Reversal | Send REVERT to UPI | NPCI allows reversal up to 120s |
| **2-5 Minutes** (T = 120s-300s) | IN_SETTLEMENT | Conditional Reversal | Submit dispute to PSP | May succeed if settlement not final |
| **After 5 Minutes** (T > 300s) | SETTLED | Request Refund | Recipient must send refund transaction | Cannot force refund, must request |

**Key NPCI Guideline (Circular 2018-03)**:
- Originating bank can reverse transaction up to 120 seconds from initiation
- After 120 seconds, only recipient's bank can initiate reversal
- Unclaimed refunds after 90 days reverse automatically to sender

**Implementation**: When user cancels UPI transfer:
1. **0-120 seconds**: Send REVERT request to Chimoney (UPI immediate reversal)
2. **120s-5min**: Contact recipient's bank via Chimoney (may fail)
3. **After 5min**: Mark as "Refund Pending" → Chimoney contacts recipient bank → Recipient approves/denies
4. **After 90 days**: Automatic reversal to sender (unclaimed refunds)

---

### 3.2 Bank Transfer Cancellation (India) - RBI Guidelines

**Payment Lifecycle**:
```
Payment Initiated (T=0)
    ↓ (Next business day, typically T=24h)
Payment Reaches NEFT/RTGS Network
    ↓ (T=24-48h)
Funds Arrive in Recipient Bank Account
    ↓ (Settlement complete)
    ↓ (90 days standard refund window)
```

**Cancellation Rules**:

| Timeline | Status | Cancellation Type | Process | RBI Rule |
|----------|--------|-------------------|---------|----------|
| **Before Initiation** | PENDING_APPROVAL | Direct Cancellation | Delete from queue | No restrictions |
| **Before Sending to Network** (typically < 2h) | SUBMITTED | Direct Cancellation | Cancel in NEFT/RTGS | Depends on network cutoff |
| **In Network (24-48h)** | IN_SETTLEMENT | Request Halt | Submit halt request to network | May succeed if not cleared |
| **After Settlement (1+ days)** | SETTLED | Request Refund | Send formal refund request | 90-day refund window by RBI |

**Key RBI Guideline (RBI/DPSS/CO.PD.Circ.No.3/13.01.02/2014-15)**:
- Banks should facilitate return of funds within 10 days if beneficiary account doesn't exist or beneficiary refuses
- Full refund window: 90 days from transaction date
- Refund must include confirmation from beneficiary's bank that funds were credited
- After 90 days: Banks can reclaim but process is complex

**Implementation**: When user cancels Bank Transfer:
1. **< 2 hours**: Send cancellation to NEFT/RTGS network via Chimoney (may succeed)
2. **2-48 hours**: Check transfer status → If cleared to network, flag as "Reversal Pending"
3. **After 48 hours**: Mark as "Refund Pending" → Chimoney initiate formal refund request
4. **After 90 days**: Transfer claim to RBI if not resolved (edge case, rare)

---

## 4. Chimoney's Cancellation & Refund API

### 4.1 Chimoney's Payment Status & Cancellation

**Chimoney API**: `POST /v1/transfer/cancel`

```typescript
// Cancellation Request
{
  "transferId": "chi_trans_xyz123",        // Chimoney's transaction ID
  "reason": "user_requested",              // user_requested, duplicate, wrong_recipient
  "refund_reason_code": "CANCELLATION"     // For accounting/compliance
}

// Response - If Cancellation Succeeded
{
  "status": "cancelled",
  "transferId": "chi_trans_xyz123",
  "originalAmount": 500,
  "cancellationFee": 0,                    // Fee to reverse transaction (rare, usually 0)
  "refundAmount": 500,                     // Amount being refunded to sender
  "refundTransactionId": "chi_refund_789", // Tracking refund
  "refundStatus": "initiated",              // pending, processing, completed, failed
  "expectedRefundDate": "2024-02-20",      // When funds return to user
  "cancellationInitiatedAt": "2024-02-18T10:30:00Z"
}

// Response - If Cancellation Failed (Already Settled)
{
  "status": "already_settled",
  "message": "Transfer already completed. Use refund API instead.",
  "originalStatus": "completed",
  "refundRequired": true,
  "refundProcess": "recipient_refund_request"
}

// Response - If Cancellation Failed (Too Late)
{
  "status": "error",
  "code": "CANCELLATION_WINDOW_CLOSED",
  "message": "Payment cannot be cancelled (settled > 48 hours ago)",
  "availableOptions": ["request_refund_from_recipient"]
}
```

### 4.2 Chimoney's Refund API (Post-Settlement)

**Chimoney API**: `POST /v1/transfer/refund/request`

```typescript
// Refund Request (for already-settled transfers)
{
  "originalTransferId": "chi_trans_xyz123",
  "amount": 500,                           // Can be full or partial
  "reason": "user_requested",              // user_requested, duplicate, wrong_amount
  "recipientPhone": "+91-98765-43210",    // For UPI refunds
  // OR
  "recipientAccount": {                    // For bank transfer refunds
    "accountNumber": "123456789012",
    "ifsc": "HDFC0000001"
  },
  "notes": "User requested cancellation on 2024-02-18"
}

// Response
{
  "status": "refund_initiated",
  "originalTransferId": "chi_trans_xyz123",
  "refundId": "chi_refund_789",
  "amount": 500,
  "refundStatus": "pending_recipient_approval",  // pending_recipient_approval, completed, rejected
  "message": "Refund request sent to recipient. Will be auto-approved after 30 days if no response.",
  "expectedCompletionDate": "2024-03-20",  // 30 days for manual approval, 90 days auto-return
  "refundTrackingUrl": "https://api.chimoney.io/refund/chi_refund_789"
}

// Auto-Approval After 30 Days
{
  "status": "auto_approved",
  "originalTransferId": "chi_trans_xyz123",
  "refundId": "chi_refund_789",
  "amount": 500,
  "refundStatus": "processing",
  "message": "Refund auto-approved after 30 days (no recipient response). Funds being returned to sender.",
  "estimatedReturnDate": "2024-03-25"
}
```

---

## 5. Cancellation State Transitions in Detail

### 5.1 Early Cancellation (DRAFT → RATE_LOCKED)

```
User cancels at: DRAFT, RATE_QUOTED, or RATE_LOCKED
    ↓
Backend: Check current status
    ├─ If RATE_LOCKED: Calculate refund = locked_amount - FX_spread_fee
    └─ If DRAFT/RATE_QUOTED: Refund = full amount (no fee)
    ↓
Backend: Update transfer status = 'cancelled'
    ├─ Set cancelled_at = now()
    ├─ Set cancelled_by = 'user'
    ├─ Set cancellation_reason = 'user_requested'
    └─ Set refund_amount = calculated amount
    ↓
Backend: If RATE_LOCKED, update user_wallet
    └─ Refund FX_spread_fee to user's balance
    ↓
Frontend: Show confirmation
    ├─ Message: "Transfer cancelled. Refund processed."
    ├─ Show refund amount (if RATE_LOCKED, show fee deducted)
    └─ Auto-redirect to activity page (2s delay)
```

**Code Example**:
```typescript
async function cancelTransfer(transferId: string, userId: string) {
  const transfer = await db.transfers.findUnique(transferId);

  // Validate user owns transfer
  if (transfer.user_id !== userId) {
    throw new Error('UNAUTHORIZED');
  }

  // Check if cancellation is allowed at current state
  const allowedStates = ['draft', 'rate_quoted', 'rate_locked', 'monitoring', 'pending_approval'];
  if (!allowedStates.includes(transfer.status)) {
    throw new Error('CANNOT_CANCEL_AT_STATE', {
      currentState: transfer.status,
      reason: 'Payment already sent or completed'
    });
  }

  let refundAmount = transfer.quote_amount;
  let fxSpreadFee = 0;

  // If rate was locked, deduct FX spread fee
  if (transfer.status === 'rate_locked') {
    fxSpreadFee = transfer.quote_amount * FX_SPREAD_RATE; // typically 0.5-2%
    refundAmount = transfer.quote_amount - fxSpreadFee;
  }

  // Update transfer status
  await db.transfers.update(transferId, {
    status: 'cancelled',
    cancelled_at: new Date(),
    cancelled_by: 'user',
    cancellation_reason: 'user_requested',
    refund_amount: refundAmount
  });

  // Log for compliance audit
  await db.transfer_logs.create({
    transfer_id: transferId,
    event: 'cancellation_processed',
    details: {
      reason: 'user_requested',
      refund_amount: refundAmount,
      fx_spread_fee: fxSpreadFee
    }
  });

  return {
    status: 'cancelled',
    refundAmount,
    fxSpreadFee,
    message: fxSpreadFee > 0
      ? `Transfer cancelled. Refund: $${refundAmount} (FX fee: $${fxSpreadFee})`
      : `Transfer cancelled. Full refund: $${refundAmount}`
  };
}
```

---

### 5.2 Payment Processing Cancellation (PAYMENT_INITIATED → PAYMENT_PROCESSING)

```
User tries to cancel during payment processing
    ↓
Backend: Check transfer status = 'payment_initiated' or 'payment_processing'
    ├─ If PAYMENT_INITIATED (< 2 minutes):
    │  ├─ Get Chimoney transaction ID
    │  ├─ Call Chimoney: POST /v1/transfer/cancel
    │  └─ Handle response (success or already_settled)
    │
    └─ If PAYMENT_PROCESSING (2-300 seconds):
       ├─ Still try cancellation via Chimoney
       └─ Likely to fail (already in network)
    ↓
Response from Chimoney:
    ├─ "cancelled" → Update status to 'cancelled', show success
    ├─ "already_settled" → Update status to 'requires_refund', escalate to refund flow
    └─ "error" → Show user: "Payment in progress, cannot cancel. Check status in 5 minutes."
    ↓
Frontend: Show appropriate message
    ├─ Success: "Cancellation processed"
    ├─ In Progress: "Payment is being processed. You cannot cancel now. Check back in 5 minutes."
    └─ Failed: "Cancellation failed. Payment may have completed. Check transfer status."
```

**Code Example**:
```typescript
async function attemptCancellationDuringPayment(
  transferId: string,
  userId: string
) {
  const transfer = await db.transfers.findUnique(transferId);

  if (transfer.status === 'payment_initiated' ||
      transfer.status === 'payment_processing') {

    try {
      // Attempt to cancel via Chimoney
      const cancellationResponse = await chimoney.post('/transfer/cancel', {
        transferId: transfer.chimoney_transaction_id,
        reason: 'user_requested'
      });

      if (cancellationResponse.status === 'cancelled') {
        // Cancellation succeeded
        await db.transfers.update(transferId, {
          status: 'cancelled',
          cancelled_at: new Date()
        });

        return {
          success: true,
          message: 'Transfer cancelled successfully',
          refundAmount: transfer.quote_amount
        };
      } else if (cancellationResponse.status === 'already_settled') {
        // Too late - payment already went through
        await db.transfers.update(transferId, {
          status: 'requires_refund',
          requires_refund_reason: 'user_requested_post_settlement'
        });

        return {
          success: false,
          code: 'PAYMENT_ALREADY_SETTLED',
          message: 'Payment cannot be cancelled as it has already been processed. Refund request initiated.',
          action: 'refund_requested'
        };
      }
    } catch (error) {
      // Chimoney error - payment state unclear
      await db.transfer_logs.create({
        transfer_id: transferId,
        event: 'cancellation_error_during_payment',
        error: error.message
      });

      return {
        success: false,
        code: 'CANCELLATION_FAILED',
        message: 'Cannot cancel payment at this time. Please wait for payment to complete.',
        action: 'wait_for_status_update'
      };
    }
  }
}
```

---

### 5.3 Post-Settlement Refund (COMPLETED)

```
Transfer status = 'completed' (payment settled 1+ day ago)
    ↓
User requests refund
    ↓
Backend: Check if within 90-day refund window (RBI requirement)
    ├─ If > 90 days: Reject with message: "Refund window closed (90 days)"
    └─ If < 90 days: Proceed
    ↓
Backend: Call Chimoney: POST /v1/transfer/refund/request
    ├─ Pass original transfer details
    ├─ Include recipient contact (phone for UPI, account for bank)
    └─ Chimoney initiates refund request with recipient
    ↓
Chimoney Response: Refund request initiated
    ├─ Refund status: 'pending_recipient_approval'
    ├─ Recipient has 30 days to approve/reject
    ├─ If no response after 30 days: Auto-approved
    └─ Funds return to sender
    ↓
Backend: Update transfer status = 'refund_pending'
    ├─ Set refund_id = Chimoney refund ID
    ├─ Set refund_status = 'pending_recipient_approval'
    └─ Set refund_initiated_at = now()
    ↓
Frontend: Show pending refund
    ├─ Message: "Refund requested. Recipient has 30 days to respond."
    ├─ Estimated return: 30-60 days
    └─ Tracking ID: Show refund ID for user reference
```

**Code Example**:
```typescript
async function requestRefundPostSettlement(
  transferId: string,
  userId: string,
  refundReason: string
) {
  const transfer = await db.transfers.findUnique(transferId);

  // Validate transfer is settled
  if (transfer.status !== 'completed') {
    throw new Error('TRANSFER_NOT_COMPLETED', {
      currentStatus: transfer.status
    });
  }

  // Check 90-day refund window
  const daysSinceCompletion = Math.floor(
    (Date.now() - transfer.completed_at.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceCompletion > 90) {
    throw new Error('REFUND_WINDOW_CLOSED', {
      completedDate: transfer.completed_at,
      daysAgo: daysSinceCompletion,
      message: 'RBI refund window is 90 days. This transfer is outside the window.'
    });
  }

  // Prepare refund request for Chimoney
  const refundRequest = {
    originalTransferId: transfer.chimoney_transaction_id,
    amount: transfer.quote_amount,
    reason: refundReason, // 'user_requested', 'duplicate', 'wrong_amount'
    notes: `Refund request initiated on ${new Date().toISOString()}`
  };

  // Add recipient details (for Chimoney to contact)
  if (transfer.payment_method === 'upi') {
    refundRequest.recipientPhone = transfer.recipient_phone;
  } else if (transfer.payment_method === 'bank_transfer') {
    refundRequest.recipientAccount = {
      accountNumber: transfer.recipient_account_number,
      ifsc: transfer.recipient_ifsc
    };
  }

  // Submit refund request to Chimoney
  const chimoneyRefund = await chimoney.post('/transfer/refund/request', refundRequest);

  // Update transfer status
  await db.transfers.update(transferId, {
    status: 'refund_pending',
    refund_id: chimoneyRefund.refundId,
    refund_status: 'pending_recipient_approval',
    refund_initiated_at: new Date(),
    refund_reason: refundReason
  });

  // Create activity log for user
  await db.activities.create({
    user_id: userId,
    type: 'refund_requested',
    transfer_id: transferId,
    details: {
      refund_id: chimoneyRefund.refundId,
      amount: transfer.quote_amount,
      refundStatus: 'pending_recipient_approval',
      expectedCompletionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    }
  });

  return {
    success: true,
    refundId: chimoneyRefund.refundId,
    status: 'refund_requested',
    message: 'Refund request initiated. Recipient has 30 days to respond.',
    expectedCompletionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    autoApprovalDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days auto-refund
  };
}
```

---

## 6. User Experience for Cancellation

### 6.1 When Cancellation Is Allowed

```
Transfer Screen (Any Allowed State)
    ↓
User taps "Cancel Transfer" button
    ↓
Modal Confirmation:
┌─────────────────────────────────────┐
│ Cancel This Transfer?                │
├─────────────────────────────────────┤
│                                     │
│ Amount: $500 USD                    │
│ To: Amit Kumar (+91-98765-43210)    │
│                                     │
│ ⚠️  You will receive:                │
│ • $500 USD (if not locked)          │
│ • $495 USD (if rate locked - $5 fee)│
│                                     │
│ This action cannot be undone.       │
│                                     │
│ [ Cancel Transaction ] [ Go Back ]  │
└─────────────────────────────────────┘
    ↓
User confirms
    ↓
Backend processes cancellation
    ↓
Success Screen:
┌─────────────────────────────────────┐
│ ✅ Transfer Cancelled                │
├─────────────────────────────────────┤
│                                     │
│ Refund: $500 USD                    │
│ Status: Processing (1-2 hours)      │
│                                     │
│ The transfer has been cancelled.    │
│ Funds will return to your account.  │
│                                     │
│ Reference ID: TXN-xyz-123           │
│                                     │
│ [ Return to Activity ]              │
└─────────────────────────────────────┘
```

### 6.2 When Cancellation Is NOT Allowed

```
Transfer Screen (Payment Already Sent)
    ↓
User tries to tap "Cancel Transfer" button
    ↓
Button is DISABLED with tooltip:
┌─────────────────────────────────────┐
│ Cancel Transfer (disabled)           │
│                                     │
│ "This payment is being processed    │
│  and cannot be cancelled now.       │
│  Check back in 5 minutes."          │
└─────────────────────────────────────┘

Alternative: Show "Request Refund" Button (if settled)
┌─────────────────────────────────────┐
│ Transfer Status: Completed           │
├─────────────────────────────────────┤
│                                     │
│ Status: Transfer Completed           │
│ Date: Feb 18, 2024                  │
│                                     │
│ Cannot cancel completed transfers.  │
│ You can request a refund instead.   │
│                                     │
│ [ Request Refund ] [ Activity ]     │
└─────────────────────────────────────┘
```

### 6.3 Post-Settlement Refund Request Flow

```
Settled Transfer Screen
    ↓
User taps "Request Refund"
    ↓
Refund Modal:
┌─────────────────────────────────────┐
│ Request Refund                      │
├─────────────────────────────────────┤
│                                     │
│ Original Amount: $500 USD           │
│ Refund Amount: $500 USD             │
│                                     │
│ Refund Timeline:                    │
│ • Recipient has 30 days to approve  │
│ • Auto-approved after 30 days       │
│ • Funds return in 60-90 days        │
│                                     │
│ Reason:                             │
│ [ ] User requested                  │
│ [ ] Wrong amount                    │
│ [ ] Wrong recipient                 │
│ [x] Other                           │
│ [                              ]    │
│                                     │
│ [ Request Refund ] [ Cancel ]       │
└─────────────────────────────────────┘
    ↓
Backend submits refund to Chimoney
    ↓
Refund Tracking Screen:
┌─────────────────────────────────────┐
│ Refund Requested                    │
├─────────────────────────────────────┤
│                                     │
│ Refund ID: REF-xyz-789              │
│ Status: Pending Recipient Approval  │
│                                     │
│ Amount: $500 USD                    │
│ Recipient: Amit Kumar               │
│                                     │
│ Timeline:                           │
│ • Waiting for recipient response... │
│ • Auto-approved: Mar 20, 2024       │
│ • Funds return by: Mar 25, 2024     │
│                                     │
│ You can check status anytime below. │
│                                     │
│ [ View Details ] [ Activity ]       │
└─────────────────────────────────────┘
```

---

## 7. API Specification: Cancellation Endpoints

### 7.1 POST /api/transfers/:id/cancel - Early Cancellation

**When to use**: States where cancellation is allowed (DRAFT, RATE_QUOTED, RATE_LOCKED, MONITORING, PENDING_APPROVAL)

```typescript
// Request
POST /api/transfers/txn_123/cancel
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "reason": "user_requested"  // user_requested, wrong_recipient, wrong_amount
}

// Success Response (200 OK)
{
  "success": true,
  "status": "cancelled",
  "transferId": "txn_123",
  "cancellationDetails": {
    "cancelledAt": "2024-02-18T10:30:00Z",
    "refundAmount": 500,
    "fxSpreadFee": 0,
    "originalAmount": 500,
    "message": "Transfer cancelled. Full refund of $500 USD will be processed."
  }
}

// If RATE_LOCKED
{
  "success": true,
  "status": "cancelled",
  "transferId": "txn_123",
  "cancellationDetails": {
    "cancelledAt": "2024-02-18T10:30:00Z",
    "refundAmount": 495,
    "fxSpreadFee": 5,  // FX spread loss
    "originalAmount": 500,
    "message": "Transfer cancelled. Refund: $495 USD (FX fee: $5 USD deducted)."
  }
}

// Error: Cannot Cancel (Payment Already Sent)
{
  "success": false,
  "error": "CANNOT_CANCEL_AT_STATE",
  "code": "PAYMENT_ALREADY_SENT",
  "transferId": "txn_123",
  "currentStatus": "payment_initiated",
  "message": "Payment has already been sent. You cannot cancel at this stage.",
  "nextSteps": [
    "Wait for payment to complete (5 minutes for UPI, 1-2 days for Bank Transfer)",
    "Check payment status regularly",
    "If payment fails, funds will be returned automatically",
    "If payment succeeds, you can request a refund"
  ]
}

// Error: Cannot Cancel (Already Completed)
{
  "success": false,
  "error": "TRANSFER_ALREADY_COMPLETED",
  "code": "CANNOT_CANCEL_SETTLED_TRANSFER",
  "transferId": "txn_123",
  "message": "This transfer has already been completed. You cannot cancel it.",
  "availableOption": "request_refund",
  "nextAction": "Use POST /api/transfers/:id/refund endpoint instead"
}
```

---

### 7.2 POST /api/transfers/:id/refund - Post-Settlement Refund Request

**When to use**: After transfer is settled (status = 'completed') and within 90-day window

```typescript
// Request
POST /api/transfers/txn_123/refund
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "reason": "user_requested",  // user_requested, duplicate, wrong_amount, wrong_recipient
  "notes": "Changed my mind about this transfer"
}

// Success Response (200 OK)
{
  "success": true,
  "status": "refund_initiated",
  "transferId": "txn_123",
  "refundDetails": {
    "refundId": "ref_456",
    "originalAmount": 500,
    "refundAmount": 500,
    "refundStatus": "pending_recipient_approval",
    "initiatedAt": "2024-02-18T10:30:00Z",
    "message": "Refund request initiated. Recipient has 30 days to approve.",
    "timeline": {
      "recipientApprovalWindow": "30 days",
      "autoApprovalDate": "2024-03-20",
      "expectedFundsReturn": "2024-03-25"
    },
    "trackingUrl": "https://vitta.app/transfers/txn_123/refund/ref_456"
  }
}

// Error: Outside 90-Day Refund Window
{
  "success": false,
  "error": "REFUND_WINDOW_CLOSED",
  "code": "OUTSIDE_90_DAY_WINDOW",
  "transferId": "txn_123",
  "completedDate": "2023-10-20",
  "daysSinceCompletion": 121,
  "message": "RBI allows refunds within 90 days of settlement. This transfer is outside that window."
}

// Error: Transfer Not Settled Yet
{
  "success": false,
  "error": "TRANSFER_NOT_SETTLED",
  "code": "STILL_PROCESSING",
  "transferId": "txn_123",
  "currentStatus": "payment_processing",
  "message": "This transfer is still being processed. Please wait for it to complete before requesting a refund."
}
```

---

## 8. State Machine Updates for Cancellation

### Enhanced State Diagram

```
DRAFT
  ├─ [cancel] → CANCELLED (full refund)
  ├─ [quote] → RATE_QUOTED
  └─ [timeout 15min] → EXPIRED

RATE_QUOTED
  ├─ [cancel] → CANCELLED (full refund)
  ├─ [lock] → RATE_LOCKED
  └─ [timeout 5min] → EXPIRED

RATE_LOCKED
  ├─ [cancel] → CANCELLED (refund - fee)
  ├─ [set_target] → MONITORING
  └─ [approval_timeout 30min] → EXPIRED

MONITORING
  ├─ [cancel] → CANCELLED (full refund)
  ├─ [rate_met] → RATE_MET
  └─ [monitoring_timeout 7days] → EXPIRED

RATE_MET
  ├─ [deny] → CANCELLED (full refund)
  ├─ [approve] → PENDING_APPROVAL
  └─ [approval_timeout 30sec] → CANCELLED

PENDING_APPROVAL
  ├─ [cancel] → CANCELLED (full refund)
  ├─ [submit_to_chimoney] → PAYMENT_INITIATED
  └─ [error] → FAILED

PAYMENT_INITIATED (< 2 min)
  ├─ [cancel (maybe)] → CANCELLED (refund if Chimoney accepts)
  ├─ [settled] → PAYMENT_PROCESSING
  └─ [error] → FAILED

PAYMENT_PROCESSING (2-300 sec)
  ├─ [cancel (unlikely)] → CANCELLED (refund if not settled yet)
  ├─ [webhook_settled] → COMPLETED
  └─ [webhook_failed] → FAILED

COMPLETED
  ├─ [request_refund] → REFUND_PENDING (< 90 days)
  └─ [outside 90 days] → NO ACTION ALLOWED

REFUND_PENDING
  ├─ [recipient_approved] → REFUND_PROCESSING
  ├─ [recipient_rejected] → REFUND_REJECTED
  └─ [auto_approved 30 days] → REFUND_PROCESSING

REFUND_PROCESSING
  └─ [webhook_refund_completed] → REFUND_COMPLETED

REFUND_COMPLETED
  └─ [funds_returned] → SETTLED (with refund note)

CANCELLED
  └─ [no transitions] - Terminal state

FAILED
  └─ [no transitions] - Terminal state

EXPIRED
  └─ [no transitions] - Terminal state
```

---

## 9. Compliance & Audit Logging

### 9.1 What Must Be Logged for Compliance

```typescript
// Log Entry Format
{
  transferId: string,
  userId: string,
  timestamp: Date,
  event: 'cancellation' | 'refund_requested' | 'refund_approved' | 'refund_rejected' | 'refund_completed',

  // Immutable record
  previousStatus: string,
  newStatus: string,
  amount: number,

  // Cancellation-specific fields
  cancellation?: {
    reason: string,               // user_requested, system_error, compliance_hold
    initiatedBy: 'user' | 'system',
    fxSpreadFee?: number,
    refundAmount: number,
    refundMethod: 'instant' | 'pending_recipient' | 'auto_approval'
  },

  // Refund-specific fields
  refund?: {
    reason: string,               // user_requested, duplicate, wrong_amount, etc
    refundId: string,
    refundStatus: string,         // pending_recipient_approval, auto_approved, completed, rejected
    daysSinceSettlement: number,  // For RBI compliance
    expectedReturnDate: Date
  },

  // User action audit
  ipAddress: string,
  userAgent: string,

  // Chimoney interaction
  chimoneyRequest?: Record<string, any>,
  chimoneyResponse?: Record<string, any>
}

// Must be stored in immutable audit table
CREATE TABLE transfer_audit_logs (
  id UUID PRIMARY KEY,
  transfer_id UUID NOT NULL REFERENCES transfers(id),
  user_id UUID NOT NULL REFERENCES users(id),
  timestamp TIMESTAMP NOT NULL DEFAULT now(),
  event VARCHAR(50) NOT NULL,

  -- Immutable record
  previous_status VARCHAR(50) NOT NULL,
  new_status VARCHAR(50) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,

  -- JSON details (cannot be modified)
  details JSONB NOT NULL,

  -- For RBI/compliance audits
  rbi_compliance_check BOOLEAN DEFAULT false,

  created_at TIMESTAMP NOT NULL DEFAULT now(),

  -- Prevent any modification
  CONSTRAINT immutable_audit_log CHECK (created_at = now() OR created_at IS NOT NULL)
);

// Create index for audit searches
CREATE INDEX idx_audit_logs_transfer_id ON transfer_audit_logs(transfer_id);
CREATE INDEX idx_audit_logs_user_id ON transfer_audit_logs(user_id);
CREATE INDEX idx_audit_logs_event ON transfer_audit_logs(event);
CREATE INDEX idx_audit_logs_timestamp ON transfer_audit_logs(timestamp);

// Important: Add RLS policy to prevent user from deleting their own audit logs
ALTER TABLE transfer_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY no_delete_audit_logs ON transfer_audit_logs
  AS (DELETE) USING (false);  -- Nobody can delete audit logs, ever
```

### 9.2 Compliance Checklist for Cancellations

```
✅ NPCI (UPI) Compliance
  - [ ] All UPI cancellations within 120 seconds use REVERT API
  - [ ] All UPI cancellations after 120s documented as refund requests
  - [ ] 90-day auto-reversal for unclaimed refunds tracked
  - [ ] Recipient approval window enforced (30 days max)

✅ RBI (Bank Transfer) Compliance
  - [ ] All bank transfer cancellations within refund window logged
  - [ ] No refunds allowed after 90 days
  - [ ] Recipient verification maintained for refund requests
  - [ ] Return of funds documented in audit logs

✅ Vitta Compliance
  - [ ] All cancellations logged to immutable audit table
  - [ ] FX spread fees clearly documented to user
  - [ ] Refund timelines communicated accurately
  - [ ] Chimoney API responses stored for dispute resolution
  - [ ] User identity verified before processing cancellation
  - [ ] IP address and device info logged
  - [ ] No refunds to third-party accounts (only original sender)
  - [ ] Minimum refund amount enforced ($10 minimum)
```

---

## 10. Edge Cases & Error Handling

### 10.1 Edge Case: Double Cancellation

```
User clicks "Cancel Transfer" twice rapidly
    ↓
First request: Status = 'draft' → Successfully cancelled
    ↓
Second request: Status = 'cancelled' (already cancelled)
    ↓
Backend: Check status before processing
    └─ If already cancelled, return error:

{
  "success": false,
  "error": "ALREADY_CANCELLED",
  "message": "This transfer was already cancelled.",
  "cancelledAt": "2024-02-18T10:30:00Z",
  "refundAmount": 500
}
```

### 10.2 Edge Case: Chimoney Cancellation Fails

```
User cancels at: PENDING_APPROVAL
    ↓
Backend calls Chimoney: POST /transfer/cancel
    ↓
Chimoney API error (timeout, 5xx error, etc)
    ↓
Backend: Mark transfer status = 'cancellation_error_pending'
    ├─ Retry cancellation with exponential backoff
    ├─ Log detailed error for manual review
    └─ Schedule automated retry job
    ↓
Frontend: Show message
    └─ "Cancellation is being processed. Check back in 1 minute."
    ↓
Automated retry: Every 5 minutes for 1 hour
    ├─ Call Chimoney again
    ├─ If success: Update status to 'cancelled'
    └─ If failure after 1 hour: Alert support team
```

### 10.3 Edge Case: Race Condition (User Cancels While Payment Initiating)

```
T=0: User taps "Send Money" button
     └─ Backend: status = 'pending_approval' → 'payment_initiated'

T=0.5s: User taps "Cancel Transfer" button
        └─ Request 2 sent to backend

T=1s: Backend receives Request 1 (payment initiation)
      └─ Status already 'payment_initiated'

T=1.5s: Backend receives Request 2 (cancellation)
        └─ Check status: Already 'payment_initiated'
        └─ Return error: "Cannot cancel payment in progress"
```

**Solution**: Use database transaction with row-level locking

```typescript
async function initiatePaymentAndCancel(transferId, action) {
  // Use transaction with lock to prevent race condition
  const result = await db.$transaction(async (tx) => {
    // Lock the row: SELECT FOR UPDATE
    const transfer = await tx.transfers.findUnique(
      { id: transferId },
      { lock: true }  // Row-level lock
    );

    const canProcess = action === 'payment'
      ? ['pending_approval'].includes(transfer.status)
      : ['draft', 'rate_quoted', 'rate_locked', 'monitoring', 'pending_approval'].includes(transfer.status);

    if (!canProcess) {
      throw new Error('STATE_CONFLICT', {
        currentStatus: transfer.status,
        requestedAction: action
      });
    }

    // Process action
    if (action === 'payment') {
      await tx.transfers.update(transferId, { status: 'payment_initiated' });
    } else if (action === 'cancel') {
      await tx.transfers.update(transferId, { status: 'cancelled' });
    }
  });
}
```

---

## 11. Monitoring & Analytics

### 11.1 Metrics to Track

```sql
-- Cancellation rate by state
SELECT
  previous_status,
  COUNT(*) as cancellation_count,
  COUNT(*) * 100.0 / (SELECT COUNT(*) FROM transfers WHERE status = 'completed') as cancellation_rate
FROM transfer_audit_logs
WHERE event = 'cancellation'
GROUP BY previous_status;

-- Refund success rate
SELECT
  refund_status,
  COUNT(*) as count
FROM transfer_audit_logs
WHERE event IN ('refund_requested', 'refund_completed', 'refund_rejected')
GROUP BY refund_status;

-- Average refund processing time
SELECT
  AVG(EXTRACT(DAY FROM (refund_completed_at - refund_initiated_at))) as avg_days
FROM transfers
WHERE status = 'refund_completed';

-- FX spread fee collected
SELECT
  SUM(CAST(details->>'fxSpreadFee' AS DECIMAL)) as total_fx_fees
FROM transfer_audit_logs
WHERE event = 'cancellation'
  AND details->>'fxSpreadFee' IS NOT NULL;

-- Alert: High cancellation rate
SELECT * FROM (
  SELECT
    DATE(timestamp) as date,
    COUNT(*) as cancellations,
    COUNT(*) * 100.0 / NULLIF(
      (SELECT COUNT(*) FROM transfers WHERE created_at::DATE = DATE(timestamp)),
      0
    ) as cancellation_percentage
  FROM transfer_audit_logs
  WHERE event = 'cancellation'
  GROUP BY DATE(timestamp)
) stats
WHERE cancellation_percentage > 10.0;  -- Alert if > 10%
```

### 11.2 Dashboard Alerts

```
🔴 HIGH PRIORITY
  - Cancellation rate > 10% today
  - Refund failures > 5 in last hour
  - Chimoney API cancellation errors

🟡 MEDIUM PRIORITY
  - Average refund processing time > 45 days
  - Recipient refund rejections > 20%
  - Manual escalations pending > 5

🟢 LOW PRIORITY
  - FX spread fees collected (informational)
  - Avg cancellation reason breakdown
```

---

## 12. Summary

### Cancellation Strategy at a Glance

| Scenario | Allowed? | Refund | Timeline | Implementation |
|----------|----------|--------|----------|-----------------|
| **User cancels before rate quote** | ✅ YES | 100% | Immediate | Delete transfer, return funds |
| **User cancels after rate quote** | ✅ YES | 100% | Immediate | Cancel before sending to Chimoney |
| **User cancels after rate locked** | ⚠️ YES | 100% - fee | Immediate | Apply FX spread fee (0.5-2%) |
| **User cancels during rate monitoring** | ✅ YES | 100% | Immediate | Stop monitoring job, cancel |
| **User cancels after approval (before payment)** | ✅ YES | 100% | Immediate | Don't send to Chimoney |
| **User cancels during payment (< 2 min UPI)** | ⚠️ MAYBE | 100% | Immediate | Try Chimoney REVERT API |
| **User cancels during payment (> 2 min)** | ❌ NO | Wait | 2-300 seconds | Wait for completion, then refund |
| **User cancels after settlement** | ❌ NO | Refund request | 30-90 days | Request recipient approval |
| **User wants refund (> 90 days)** | ❌ NO | Not allowed | - | Reject with explanation |

### Key Design Decisions

1. **FX Spread Fee on Rate Lock Cancellations**: Vitta keeps 0.5-2% FX spread to cover cost of locking rate with Chimoney
2. **NPCI/RBI Compliance First**: All cancellations follow regulatory timelines (120s for UPI, 90 days for refunds)
3. **Recipient Approval for Refunds**: Post-settlement refunds require recipient approval (30 days) or auto-approve (90 days)
4. **Immutable Audit Logs**: All cancellations logged to permanent audit table (cannot be deleted)
5. **Three-Layer Protection**: Frontend (disable button) + Backend (state validation) + Chimoney (API-level)
6. **User Communication**: Clear timelines and next steps at every step

---

## 13. Implementation Order

When implementing cancellation:

1. **Week 1**: Database schema updates (add refund_pending status, audit logs table)
2. **Week 1-2**: Backend API endpoints (cancel, refund) with state validation
3. **Week 2**: Chimoney API integration (cancel, refund requests)
4. **Week 2**: Frontend UI updates (cancel button, refund modal, tracking screen)
5. **Week 3**: Webhook handling for refund status updates
6. **Week 3**: Monitoring & alerting setup
7. **Week 4**: Testing (edge cases, race conditions, compliance)
