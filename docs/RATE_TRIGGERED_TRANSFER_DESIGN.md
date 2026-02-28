# Rate-Triggered Transfer Design - REVISED

**Updated**: Feb 21, 2026
**Status**: Design Approved
**Key Change**: User-controlled approval required; agent monitors but never executes autonomously

---

## 1. Core Principle

**The agent monitors and notifies, but NEVER executes autonomously.**

- Agent acts as an intelligent assistant, not an autonomous executor
- User always has explicit control over transfer execution
- All transfers require user approval via notification

### Transfer Type Clarification

**Immediate Transfer**:
- User: "Send $500 now"
- Rate used: Current market rate (e.g., 83.72)
- Execution: Immediate (after user confirms)

**Rate-Triggered Transfer** (Maximization Strategy):
- User: "Send $500 when rate hits 84.50"
- Target rate ALWAYS > current rate (waits for BETTER/HIGHER rate)
- Example: Current 83.72 → Target 84.50 → More rupees received
- Execution: Delayed until (1) rate condition met AND (2) user approves notification

---

## 2. Rate Logic: Target Rate Understanding

### Exchange Rate Context
```
Current FX Rate (USD → INR): 83.72
User's Target Rate: 84.50

BETTER RATE = HIGHER RATE = MORE DESTINATION CURRENCY RECEIVED
- Current: $500 × 83.72 = ₹41,860
- Target: $500 × 84.50 = ₹42,250  ✅ TARGET MET (₹390 MORE!)

The agent monitors for rates that are ≥ target_rate (HIGHER is better)
```

### Target Rate Validation
- **Always**: `target_rate > current_rate` (user waits for HIGHER/BETTER rate)
- **Not allowed**: Setting target_rate lower than current rate (user should use immediate transfer instead)
- **Storage**: `target_rate` stored in `transfer_requests` table
- **Transfer Types**:
  - **Immediate**: Send NOW at current rate
  - **Rate-Triggered**: Wait for HIGHER rate to maximize destination amount

---

## 3. State Machine: User-Controlled Flow

```
SETUP PHASE:
  draft
    ↓ (User provides amount, recipient, target rate)
  rate_quoted
    ↓ (System shows current rate vs target)
  rate_locked (5-min validity window)
    ↓ (User confirms they want to monitor)

MONITORING PHASE:
  monitoring
    ↓ (Every 15 min: check if rate ≤ target_rate)
    ├─ NOT MET: Continue monitoring
    └─ MET: Proceed to notification

APPROVAL PHASE:
  rate_met
    ↓ (Send notification: "Rate available. Approve or Deny?")

    Option A: User Approves
      ↓
    pending_approval
      ↓ (User choice confirmed)

    Option B: User Denies
      ↓
    cancelled (Transfer cancelled, monitoring stops)

EXECUTION PHASE:
  pending_approval
    ↓ (Only NOW: Call Chimoney to initiate payment)
  payment_initiated
    ↓ (Webhook from Chimoney)
  completed ✅ or failed ❌
```

---

## 4. Step-by-Step User Flow

### **Phase 1: Setup - User Specifies Target Rate**
```
User: "Send $500 to Amit when rate is 84.5"
    ↓
System actions:
  1. Validate: target_rate (84.5) > current_rate (83.72) ✅
  2. Get live FX quote: current_rate = 83.72
  3. Recipient lookup: Find Amit in recipients table
  4. Create transfer_requests:
     - status = 'rate_quoted'
     - source_amount = 500
     - target_rate = 84.50
     - quoted_rate = 83.72 (for reference)
  5. UI shows:
     - "Current rate: 83.72"
     - "Your target: 84.50"
     - "You'll wait for the rate to improve"
     - [Lock Rate] button

Activity Log:
  - type: 'rate_setup'
  - details: { currentRate: 83.72, targetRate: 84.50, amount: 500 }
```

### **Phase 2: Rate Lock - User Confirms Monitoring**
```
User clicks [Lock Rate & Start Monitoring]
    ↓
System actions:
  1. Update transfer_requests:
     - status = 'rate_locked'
     - rate_locked_at = now
     - rate_lock_expires_at = now + 5 minutes
  2. Display: "Monitoring started. We'll notify you when rate hits 83.50"
  3. Change status → 'monitoring' immediately after confirmation
  4. Add to monitoring queue

Activity Log:
  - type: 'rate_locked'
  - details: { lockExpiresAt: timestamp }
```

### **Phase 3: Background Monitoring - Agent Checks Every 15 Minutes**
```
Cron job: /api/cron/check-fx-rates (Every 15 minutes)
    ↓
For each transfer with status = 'monitoring':

Check 1 (Time 14:00):
  Current rate: 83.98
  Target rate: 84.50
  Result: 83.98 < 84.50 ❌ NOT MET
  Action: Log rate check, continue monitoring
  Activity Log: { type: 'rate_check_completed', rate: 83.98, met: false }

Check 2 (Time 14:15):
  Current rate: 84.15
  Target rate: 84.50
  Result: 84.15 < 84.50 ❌ NOT MET
  Action: Log rate check, continue monitoring
  Activity Log: { type: 'rate_check_completed', rate: 84.15, met: false }

Check 3 (Time 14:30):
  Current rate: 84.55
  Target rate: 84.50
  Result: 84.55 ≥ 84.50 ✅ TARGET MET!
  Action:
    - Update transfer_requests:
      * status = 'rate_met'
      * triggered_rate = 84.55
      * rate_met_at = now
    - PROCEED TO PHASE 4
  Activity Log: { type: 'rate_met', rate: 84.55, triggeredAt: timestamp }
```

### **Phase 4: Notification Sent - User Must Approve or Deny**
```
✅ RATE MET - Agent sends notification
    ↓
Notification Content:
  Title: "Your target rate is now available!"
  Details:
    - Amount: $500
    - Current rate: 84.55 (Better than your target of 84.50!)
    - Destination: ₹42,275
    - Recipient: Amit (UPI: 9876543210@upi)
    - Fee: $5

  [✅ APPROVE]  [❌ DENY]

System updates:
  - status = 'rate_met' (waiting for user choice)
  - Activity Log: { type: 'rate_met_notification_sent', rate: 84.55 }
  - Notification sent via:
    * In-app modal in chat
    * Activity sidebar highlight
    * Push notification (if enabled)
    * Email/SMS (optional)

⏱️ CRITICAL: Notification remains for user action
    (No auto-execution, no timeout)
```

### **Phase 5A: User Approves**
```
User clicks: [✅ APPROVE]
    ↓
System actions:
  1. Update transfer_requests:
     - status = 'pending_approval'
     - user_approved_at = now
  2. Activity Log: { type: 'user_approved' }
  3. UI feedback: "Processing your transfer..."
  4. IMMEDIATELY: Call Chimoney API to initiate payment (PHASE 6)

⚠️ IMPORTANT:
  - Payment initiated ONLY after explicit user approval
  - No autonomous execution happens
  - User always has final say
```

### **Phase 5B: User Denies**
```
User clicks: [❌ DENY]
    ↓
System actions:
  1. Update transfer_requests:
     - status = 'cancelled'
     - user_denied_at = now
     - cancellation_reason = 'user_rejected'
  2. Activity Log: { type: 'user_denied' }
  3. UI feedback: "Transfer cancelled. You can set up a new one anytime."
  4. Monitoring stops
  5. Rate lock released

⚠️ IMPORTANT:
  - No payment initiated
  - Transfer marked as cancelled in history
  - User can create new transfer with different target rate
```

### **Phase 6: Payment Initiated - After Approval**
```
User has approved (status = 'pending_approval')
    ↓
Backend immediately initiates payment:

  1. Verify transfer still in 'pending_approval' state
  2. Final checks:
     - Recipient verification still valid
     - Rate is close to triggered_rate (within 2% tolerance)
     - User KYC still valid
  3. Call Chimoney API:
     POST /transfers/initiate
     {
       recipient_id: UUID,
       amount: 500,
       rate: 84.55,
       idempotency_key: UUID,
       payment_method: 'upi'
     }

  4. Handle response:
     - Success: Get chimoney_transaction_id
     - Update status → 'payment_initiated'
     - Store chimoney_transaction_id in DB
     - Activity Log: { type: 'payment_initiated', txnId: xxx }

  5. UI updates:
     - "Transfer initiated. Processing..."
     - Show transaction ID for reference
     - Activity sidebar updates

  ⚠️ IDEMPOTENCY:
    - idempotency_key prevents duplicate payments if API called twice
    - If same key sent, Chimoney returns same transaction_id
```

### **Phase 7: Real-Time Settlement - Webhook Updates**
```
Chimoney sends webhook when payment settles
    ↓
Webhook received at: /api/webhooks/chimoney

  Payload:
  {
    event: 'payment.completed',
    transaction_id: 'txn_xyz',
    status: 'completed',
    amount: 500,
    destination_amount: 42275,
    timestamp: '2026-02-21T14:35:00Z'
  }

System processes:
  1. Find transfer_requests by chimoney_transaction_id
  2. Verify webhook signature (HMAC-SHA256)
  3. Update transfer_requests:
     - status = 'completed'
     - payment_status = 'completed'
     - completed_at = now
  4. Activity Log: { type: 'payment_completed', details: {...} }
  5. Send user notification:
     "✅ Transfer Complete!
      $500 sent to Amit via UPI
      Recipient received: ₹42,275
      Rate: 84.55
      Reference: txn_xyz"
  6. Activity sidebar updates with final status

If payment fails:
  1. Update status = 'failed'
  2. Store error message
  3. Activity Log: { type: 'payment_failed', error: 'Insufficient funds' }
  4. Notify user: "Transfer failed. Reason: [error]"
  5. Option to retry or cancel
```

---

## 5. Complete State Machine Diagram

```
┌─────────────┐
│   draft     │  ← Initial state when user specifies target rate
└──────┬──────┘
       │
       ↓
┌─────────────┐
│rate_quoted  │  ← Current FX rate fetched & displayed
└──────┬──────┘
       │
       ↓
┌─────────────┐
│rate_locked  │  ← User confirmed, rate locked for 5 minutes
└──────┬──────┘
       │
       ↓
┌──────────────────┐
│   monitoring     │  ← Agent polls every 15 minutes
└──┬───────────────┘
   │                (Rate not met)
   ├─────────────────────┐ (repeats until rate met)
   │                     │
   ↓                     │
┌─────────────┐          │
│  rate_met   │←─────────┘
└──────┬──────┘

   ┌──────────────────────────────────┐
   │   NOTIFICATION SENT TO USER      │
   │  "Rate available. Approve?"      │
   └──────────────────────────────────┘
          │                │
          │                │
    User Approves    User Denies
          │                │
          ↓                ↓
    ┌──────────────┐  ┌─────────────┐
    │pending_      │  │ cancelled   │ ✅ ENDS
    │approval      │  └─────────────┘
    └──────┬───────┘
           │
    [Payment initiated NOW]
           │
           ↓
    ┌─────────────────────┐
    │ payment_initiated   │  ← Waiting for Chimoney webhook
    └──────┬──────────────┘
           │
    [Webhook received]
           │
           ├─────────────────┬──────────────┐
           │                 │              │
           ↓                 ↓              ↓
      ┌─────────┐      ┌────────┐    ┌──────────┐
      │completed│      │ failed │    │cancelled │
      └─────────┘      └────────┘    └──────────┘
           ✅               ❌              ❌
```

---

## 6. Key Design Points

### ✅ Agent Never Executes Autonomously
- Agent monitors rates and sends notifications
- Payment only initiated AFTER user clicks "Approve"
- No scheduled/automatic execution
- User always has explicit control

### ✅ User Approval Flow
1. Rate met → Notification sent
2. User sees: "Rate 84.55 available. Approve or Deny?"
3. If Approve → Payment initiated immediately
4. If Deny → Transfer cancelled, user can create new one

### ✅ Notification Contains All Details
- Target rate vs actual rate
- Amount in both currencies
- Recipient information
- Fee breakdown
- Approve/Deny buttons

### ✅ Idempotency for Safety
- All Chimoney API calls include `idempotency_key`
- Double-click protection: idempotency prevents duplicate payments
- 3-layer idempotency:
  1. Client-side: Disable button after click
  2. Server: Check if request already processed
  3. Chimoney: Returns same transaction_id for same idempotency_key

### ✅ Rate Tolerance
- When user approves, rate might have shifted slightly
- Allow ±2% tolerance from triggered_rate
- Example:
  - User approved at: 84.55
  - Actual rate when paying: 84.60 (within 2%)
  - ✅ Acceptable
  - Actual rate when paying: 84.30 (outside 2%)
  - ❌ Error: "Rate changed, please try again"

### ✅ Monitoring Timeout
- No automatic timeout for pending approval
- User can approve anytime after rate met
- If rate lock expires (5 min from lock):
  - Monitoring continues
  - Only affects rate guarantee, not monitoring
  - User approval still requires fresh rate check

---

## 7. Database Updates

### transfer_requests Table Changes

```sql
-- NO CHANGES NEEDED to the status field
status 'draft'|'rate_quoted'|'rate_locked'|'monitoring'|'rate_met'|
       'pending_approval'|'approved'|'payment_initiated'|'completed'|'failed'|'cancelled'

-- NEW FIELDS to add (optional):
user_approved_at TIMESTAMP,      -- When user clicked Approve
user_denied_at TIMESTAMP,        -- When user clicked Deny
rate_tolerance_percent DECIMAL(5,2) DEFAULT 2.0,  -- Allow ±2% variance
```

### Activity Log Entries

```sql
INSERT INTO transfer_activity_log VALUES (
  activity_type = 'rate_met',           -- Rate target reached
  details = { rate: 84.55, targetRate: 84.50 }
);

INSERT INTO transfer_activity_log VALUES (
  activity_type = 'rate_met_notification_sent',
  details = { rate: 84.55, notificationTime: '...' }
);

INSERT INTO transfer_activity_log VALUES (
  activity_type = 'user_approved',
  details = { approvedAt: '...', rate: 84.55 }
);

INSERT INTO transfer_activity_log VALUES (
  activity_type = 'payment_initiated',
  details = { transactionId: 'txn_xyz', rate: 84.55 }
);
```

---

## 8. Frontend Notification Component

### Notification Modal Example

```
┌─────────────────────────────────────────┐
│  ✅ Your Target Rate is Available!     │
├─────────────────────────────────────────┤
│                                         │
│  Amount:      $500 USD                  │
│  Current Rate: 84.55 INR/USD            │
│  Your Target: 84.50 INR/USD             │
│  ✅ Better rate found! (+₹ more!)      │
│                                         │
│  Destination:  ₹42,275 INR              │
│  Fee:          $5 USD                   │
│  Recipient:    Amit (9876543210@upi)   │
│  Payment:      UPI Transfer (2-5 min)   │
│                                         │
│  ┌─────────────────┐  ┌──────────────┐  │
│  │  ✅ APPROVE     │  │  ❌ DENY     │  │
│  └─────────────────┘  └──────────────┘  │
│                                         │
│  [This rate is valid for the next       │
│   5 minutes. Act now to lock it in.]    │
└─────────────────────────────────────────┘
```

---

## 9. Activity Sidebar Display

```
Transfer: Send $500 to Amit (USD → INR)

14:00 - Rate Setup
  Target: 84.50 | Current: 83.72
  Status: Locked

14:15 - Rate Check
  Current: 83.98 | Status: Monitoring

14:30 - Rate Check
  Current: 84.15 | Status: Monitoring

14:45 - ✅ TARGET MET
  Rate: 84.55 (Better than target 84.50!)
  Status: 🔔 Notification Sent
  [Approve] [Deny]

14:46 - ✅ USER APPROVED
  Rate: 84.55
  Status: Processing

14:47 - ✅ PAYMENT INITIATED
  Transaction: txn_xyz
  Status: Pending Settlement

14:50 - ✅ COMPLETED
  Recipient Received: ₹42,275
  Reference: txn_xyz
```

---

## 10. Error Scenarios

### Scenario 1: Rate Changed Before Payment
```
User approves at rate 84.55
System fetches live rate: 84.30 (rate dropped - less favorable)
Tolerance check: |84.55 - 84.30| = 0.25 (> 2%)
Action: Reject payment, notify user
Message: "Rate changed. Current: 84.30. Would you like to continue?"

Note: If rate improved further (e.g., 84.60), still within 2%, proceed with better rate
```

### Scenario 2: User Denies Transfer
```
User clicks [Deny]
Status: cancelled
Activity log: user_denied
Notification: "Transfer cancelled. Create a new one anytime."
User can set new target rate and try again
```

### Scenario 3: Recipient Verification Expired
```
During Phase 6, recipient verification might expire
Check: verification_status, verified_at
If expired: Request new verification
Action: Notify user, pause payment
```

---

## 10. Immediate vs Rate-Triggered: Clear Comparison

### Key Differences

| Aspect | **Immediate Transfer** | **Rate-Triggered Transfer** |
|--------|------------------------|---------------------------|
| **User says** | "Send $500 now to India" | "Send $500 when rate is 84.5" |
| **Rate used** | Current market rate (e.g., 83.72) | User's target rate (e.g., 84.50) |
| **Rate requirement** | N/A | target_rate > current_rate (wait for better rate) |
| **Execution timing** | Immediate after confirmation | Delayed - only when rate condition met AND user approves |
| **Agent role** | Initiates immediately | Monitors continuously, sends notification when rate met |
| **User approval** | Single "Confirm" button | Two-step: Approve/Deny on rate notification |
| **Amount user receives** | Lower (sent at current rate) | Higher (sent at better/higher rate) |
| **Example outcome** | $500 × 83.72 = ₹41,860 | $500 × 84.55 = ₹42,275 |
| **Flow** | Immediate → payment_initiated → completed | monitoring → rate_met → pending_approval → payment_initiated → completed |
| **Notification** | Confirmation prompt | "Rate available! Approve or Deny?" |

### Why Rate-Triggered Exists

Users want to **maximize** the amount they receive in the destination country. Instead of sending $500 now and getting ₹41,860, they wait for the rate to improve and get ₹42,275—that's ₹415 more for the same $500!

---

## 11. Implementation Checklist

- [ ] Update `transfer_requests` status labels (add `pending_approval`)
- [ ] Create notification modal component
- [ ] Implement rate tolerance check (±2%)
- [ ] Update `/api/cron/check-fx-rates` to send notification instead of auto-executing
- [ ] Create `/api/transfers/:id/approve` endpoint
- [ ] Create `/api/transfers/:id/deny` endpoint
- [ ] Update activity sidebar with new flow
- [ ] Add activity log entries for: rate_met, user_approved, user_denied
- [ ] Webhook handler verifies notification was sent before payment
- [ ] Test: Rate met → Deny → Cancel flow
- [ ] Test: Rate met → Approve → Payment initiated flow
- [ ] Test: Rate tolerance validation

---

## 12. Summary: What Changed

| Aspect | Before | After |
|--------|--------|-------|
| **Execution** | Autonomous (agent decides) | Manual (user approves) |
| **Notification** | After rate met | With Approve/Deny buttons |
| **Payment Timing** | Automatic when rate met | Only after user approval |
| **User Control** | Limited | Full control via approval |
| **State Machine** | No pending_approval state | Added pending_approval |
| **Flow** | monitoring → payment_initiated | monitoring → rate_met → pending_approval → payment_initiated |

---

**Document Version**: 2.0
**Updated**: Feb 21, 2026
**Status**: Ready for Implementation
