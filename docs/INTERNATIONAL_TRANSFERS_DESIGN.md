# International Money Transfers Design - Chimoney Integration

**Status:** Design Phase
**Scope:** India transfers (Phase 1) → Extensible to other corridors
**Compliance Focus:** AML/KYC, PCI-DSS, Regulatory reporting

---

## 1. Architecture Overview

### High-Level Flow

```
User Input (Chat/Dialog)
    ↓
[Transfer Service Layer] - Validates & coordinates
    ├── [KYC/Verification] - Chimoney account verification
    ├── [FX Rate Service] - Real-time rate management
    ├── [Payment Processor] - Chimoney payment initiation
    └── [Activity Logger] - Track all actions
    ↓
Supabase (Transactional records)
    ↓
User Notifications (Real-time status updates)
```

### Key Design Principles

1. **Separation of Concerns** - Each service handles one responsibility
2. **Idempotency** - All API calls must be safely retryable
3. **Audit Trail** - Every action logged for compliance
4. **State Machine** - Transfers progress through defined states
5. **Rate Lock** - Quote rates valid for specific time window
6. **Graceful Degradation** - Fallback for Chimoney API failures

---

## 2. Database Schema

### Core Tables

#### `transfer_corridors`
```sql
CREATE TABLE transfer_corridors (
  id UUID PRIMARY KEY,
  source_country VARCHAR(3),          -- 'US', 'UK', etc.
  destination_country VARCHAR(3),     -- 'IN', 'PK', etc.
  currency_pair VARCHAR(7),           -- 'USD-INR', 'GBP-INR'
  provider VARCHAR(50),               -- 'chimoney', 'wise', etc.
  min_amount DECIMAL(10,2),
  max_amount DECIMAL(10,2),
  fee_structure JSONB,                -- { "fixed": 5.00, "percentage": 0.5 }
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE INDEX idx_corridors_pair ON transfer_corridors(source_country, destination_country);
```

#### `fx_rates`
```sql
CREATE TABLE fx_rates (
  id UUID PRIMARY KEY,
  corridor_id UUID NOT NULL REFERENCES transfer_corridors(id),
  rate DECIMAL(15,6),                 -- Exchange rate
  mid_rate DECIMAL(15,6),             -- Mid-market rate
  buy_rate DECIMAL(15,6),             -- Rate user gets
  source_amount DECIMAL(15,2),        -- Example: 1000 USD
  destination_amount DECIMAL(15,2),   -- Resulting INR
  fee_amount DECIMAL(10,2),
  rate_validity_seconds INT DEFAULT 300, -- 5-minute quote validity
  source 'chimoney'|'market_data',
  recorded_at TIMESTAMP,
  INDEX idx_corridor_time ON corridor_id, recorded_at DESC
);

-- Materialized hourly/daily rates for analytics
CREATE TABLE fx_rates_hourly AS
SELECT
  corridor_id,
  DATE_TRUNC('hour', recorded_at) as hour,
  MIN(buy_rate) as min_rate,
  MAX(buy_rate) as max_rate,
  AVG(buy_rate) as avg_rate,
  COUNT(*) as samples
FROM fx_rates
GROUP BY corridor_id, DATE_TRUNC('hour', recorded_at);
```

#### `recipients`
```sql
CREATE TABLE recipients (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  corridor_id UUID NOT NULL REFERENCES transfer_corridors(id),
  recipient_name VARCHAR(255) NOT NULL,
  recipient_phone VARCHAR(20),
  recipient_email VARCHAR(255),
  -- Payment method: 'upi' or 'bank_account'
  payment_method VARCHAR(50) NOT NULL,
  -- Encrypted sensitive data - never stored plaintext
  recipient_upi_encrypted VARCHAR(500),
  recipient_bank_account_encrypted VARCHAR(500),
  recipient_bank_code VARCHAR(20),
  recipient_country_code VARCHAR(3),
  -- Verification status
  verification_status 'pending'|'verified'|'failed',
  chimoney_recipient_id VARCHAR(255),  -- External ID for idempotency
  verified_at TIMESTAMP,
  verified_by_system VARCHAR(50),      -- 'chimoney_api', 'manual_review'
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(user_id, chimoney_recipient_id)
);

CREATE INDEX idx_recipients_user ON recipients(user_id);
CREATE INDEX idx_recipients_verified ON recipients(verification_status);
```

#### `transfer_requests`
```sql
CREATE TABLE transfer_requests (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  recipient_id UUID NOT NULL REFERENCES recipients(id),
  corridor_id UUID NOT NULL REFERENCES transfer_corridors(id),

  -- Transfer type: 'immediate' | 'rate_triggered'
  transfer_type VARCHAR(50) NOT NULL,

  -- Amounts
  source_amount DECIMAL(15,2) NOT NULL,
  destination_amount DECIMAL(15,2),   -- Calculated at initiation
  fee_amount DECIMAL(10,2),

  -- Rate information
  quoted_rate DECIMAL(15,6),          -- Rate user locked in
  quoted_rate_id UUID REFERENCES fx_rates(id),
  target_rate DECIMAL(15,6),          -- For rate_triggered transfers
  triggered_rate DECIMAL(15,6),       -- Rate when condition met

  -- State machine
  status 'draft'|'rate_quoted'|'rate_locked'|'monitoring'|'rate_met'|
         'pending_approval'|'approved'|'payment_initiated'|'completed'|'failed'|'cancelled',

  -- Compliance fields
  purpose_of_transfer VARCHAR(255),   -- 'family_support', 'education', etc.
  source_of_funds VARCHAR(255),       -- 'salary', 'business', etc.
  relationship_to_recipient VARCHAR(100),

  -- Timestamps
  created_at TIMESTAMP,
  rate_locked_at TIMESTAMP,           -- When rate became valid
  rate_lock_expires_at TIMESTAMP,     -- When rate quote expires
  monitoring_started_at TIMESTAMP,    -- For rate_triggered
  rate_met_at TIMESTAMP,
  completed_at TIMESTAMP,

  -- Payment reference
  chimoney_transaction_id VARCHAR(255),
  payment_status VARCHAR(50),
  payment_method_used VARCHAR(50),    -- 'upi' or 'bank_transfer'

  -- Audit
  last_status_check TIMESTAMP,
  retry_count INT DEFAULT 0,
  error_message TEXT
);

CREATE INDEX idx_transfers_user ON transfer_requests(user_id);
CREATE INDEX idx_transfers_status ON transfer_requests(status);
CREATE INDEX idx_transfers_monitoring ON transfer_requests(status, monitoring_started_at)
  WHERE status = 'monitoring';
```

#### `transfer_activity_log` (Immutable audit log)
```sql
CREATE TABLE transfer_activity_log (
  id UUID PRIMARY KEY,
  transfer_id UUID NOT NULL REFERENCES transfer_requests(id),
  user_id UUID NOT NULL,
  activity_type 'recipient_verification_started'|
                 'recipient_verification_success'|
                 'recipient_verification_failed'|
                 'rate_quoted'|
                 'rate_locked'|
                 'monitoring_started'|
                 'rate_check_completed'|
                 'rate_met_notification_sent'|
                 'user_approved'|
                 'user_denied'|
                 'payment_initiated'|
                 'payment_success'|
                 'payment_failed'|
                 'payment_webhook_received',

  details JSONB,  -- Contextual data: rates, errors, API responses
  created_at TIMESTAMP NOT NULL,

  -- For compliance auditing
  ip_address INET,
  user_agent VARCHAR(500),
  triggered_by 'user_action'|'system_cron'|'webhook'|'admin'
);

CREATE INDEX idx_activity_transfer ON transfer_activity_log(transfer_id);
CREATE INDEX idx_activity_type ON transfer_activity_log(activity_type);
```

#### `chimoney_webhook_logs` (Debug/compliance)
```sql
CREATE TABLE chimoney_webhook_logs (
  id UUID PRIMARY KEY,
  webhook_id VARCHAR(255),
  transfer_id UUID REFERENCES transfer_requests(id),
  event_type VARCHAR(100),
  payload JSONB,
  processed BOOLEAN DEFAULT false,
  error TEXT,
  received_at TIMESTAMP,
  processed_at TIMESTAMP
);
```

---

## 3. Service Layer Architecture

### 3.1 Transfer Service (`services/transfers/transferService.js`)

**Responsibilities:**
- Orchestrate transfer workflow
- Manage state transitions
- Coordinate between KYC, rates, and payment services

```javascript
// Core public methods
export const initiateTransfer = async (userId, transferData) => {
  // 1. Validate user KYC status
  // 2. Verify recipient account (Chimoney)
  // 3. Get live FX rate quote
  // 4. Create transfer_requests record (status: 'draft')
  // 5. Return quote to user
}

export const lockRate = async (transferId) => {
  // 1. Verify transfer exists and is in 'rate_quoted' state
  // 2. Reserve the rate (mark as locked)
  // 3. Update rate_lock_expires_at (5-minute window)
  // 4. Log activity
  // Returns: locked rate details
}

export const approveTransfer = async (transferId) => {
  // 1. Verify rate lock is still valid
  // 2. Final compliance check
  // 3. Initiate payment via Chimoney
  // 4. Update status to 'payment_initiated'
  // 5. Log activity
}

export const startRateMonitoring = async (transferId) => {
  // 1. Verify transfer is in 'rate_locked' state
  // 2. Set status to 'monitoring'
  // 3. Add to monitoring queue (checked every 15 min)
  // Returns: monitoring started confirmation
}

export const checkRateAndTrigger = async (transferId) => {
  // Called by cron job every 15 minutes
  // 1. Get current live rate
  // 2. Compare against target_rate
  // 3. If met: send notification, update status to 'rate_met'
  // 4. Log each check in activity log
}

// Helper methods
const validateTransferCompliance = async (transfer, user) => {
  // 1. Check AML blacklists
  // 2. Verify daily/monthly limits not exceeded
  // 3. Check recipient sanctions
  // 4. Log compliance check
}

const createAuditLog = async (transferId, activityType, details) => {
  // Immutable log entry for compliance
}
```

### 3.2 KYC & Recipient Verification (`services/transfers/kycService.js`)

```javascript
export const verifyRecipient = async (userId, recipientData, corridor) => {
  // 1. Encrypt sensitive data (UPI/Bank account)
  // 2. Call Chimoney recipient verification API
  // 3. Handle response:
  //    - Success: Save recipient, set verification_status = 'verified'
  //    - Failure: Log error, set verification_status = 'failed'
  // 4. Return verification result
  // Idempotent: Use recipientData hash as dedup key
}

export const validateUserKYC = async (userId) => {
  // 1. Check if user has complete KYC from Google OAuth
  // 2. Verify KYC status in Supabase users table
  // 3. Check any transfer restrictions
}

export const encryptSensitiveData = (data) => {
  // Use AWS KMS or Vault for encryption
  // Never store plaintext payment details
}
```

### 3.3 FX Rate Service (`services/transfers/fxRateService.js`)

```javascript
export const getQuoteRate = async (corridor, sourceAmount) => {
  // 1. Call Chimoney FX API
  // 2. Parse response: mid_rate, buy_rate, validity_seconds
  // 3. Store in fx_rates table
  // 4. Return: rate details with 5-min expiry
}

export const checkRateToday = async (corridor) => {
  // 1. Query fx_rates_hourly for today
  // 2. Return: min_rate, max_rate, current_rate
  // Used for UI display
}

export const checkHistoricalRates = async (corridor, days = 30) => {
  // Return: min/max rates for last N days
  // For user to understand rate trends
}

// Cron-triggered
export const checkAndUpdateAllMonitoringRates = async () => {
  // 1. Query all transfers with status = 'monitoring'
  // 2. For each:
  //    a. Get live rate from Chimoney
  //    b. Compare with target_rate
  //    c. If triggered: notify user
  // 3. Log each rate check (for compliance audit)
}
```

### 3.4 Payment Service (`services/transfers/paymentService.js`)

```javascript
export const initiatePayment = async (transferId, approvalData) => {
  // 1. Verify transfer status is 'approved'
  // 2. Verify rate lock is still valid
  // 3. Final fraud check
  // 4. Call Chimoney payment API:
  //    - endpoint: /transfers/initiate
  //    - Includes: recipient_id, amount, rate, payment_method
  // 5. Get transaction_id from response
  // 6. Update transfer_requests:
  //    - status = 'payment_initiated'
  //    - chimoney_transaction_id = transaction_id
  //    - payment_status = 'pending'
  // 7. Log activity with transaction_id
  // 8. Return: payment initiated confirmation
  // IDEMPOTENT: Use transfer_id as dedup key
}

export const pollPaymentStatus = async (transferId) => {
  // Called periodically after payment_initiated
  // 1. Get chimoney_transaction_id from transfer
  // 2. Call Chimoney status API
  // 3. Update payment_status field
  // 4. If completed: set status = 'completed'
}

export const handleChimoneyWebhook = async (payload) => {
  // 1. Verify webhook signature (security)
  // 2. Log webhook in chimoney_webhook_logs
  // 3. Extract transaction_id
  // 4. Find transfer_requests record
  // 5. Update based on webhook event:
  //    - 'payment.completed': status = 'completed'
  //    - 'payment.failed': status = 'failed', capture error
  // 6. Send user notification
  // 7. Return: 200 OK (idempotent)
}
```

---

## 4. Frontend Component Structure

### Dialog Component Hierarchy

```
TransferDialog (Main orchestrator)
├── RecipientSelector
│   ├── RecipientList (Pre-populated from recipients table)
│   ├── AddNewRecipient (Form for new recipient - triggers KYC verification)
│   └── RecipientDetailsSummary
├── TransferMethodSelector
│   ├── ImmediateTransfer
│   │   ├── AmountInput
│   │   ├── FXRateDisplay (Live rate from fxRateService)
│   │   ├── FeeBreakdown
│   │   └── ConfirmButton (Locks rate, initiates payment)
│   └── RateTriggeredTransfer
│       ├── AmountInput
│       ├── TargetRateInput (Visual: show today's min/max)
│       ├── RateChart (24hr historical min/max)
│       └── SetMonitoringButton
├── ComplianceDisclosure (Purpose, source of funds, etc.)
└── TransactionSummary
```

### Activity Sidebar Component

```
TransferActivityPanel
├── ActivityTimeline
│   ├── ActivityItem (for each transfer)
│   │   ├── Status badge (color-coded)
│   │   ├── Timestamp
│   │   ├── Amount & recipient
│   │   └── Action buttons (Approve/Deny/Cancel)
│   └── FilterButtons (All, Monitoring, Pending, Completed)
└── NotificationCenter
    ├── Toast notifications (rate met, payment completed)
    └── In-app bell icon with badge count
```

---

## 5. API Routes

### Backend API Endpoints

```javascript
// pages/api/transfers/...

// 1. Quote & Initiate
POST /api/transfers/quote
  body: { recipientId, sourceAmount, corridor }
  returns: { quoteId, rate, destinationAmount, fee, rateExpiresAt }

POST /api/transfers/lock-rate
  body: { quoteId }
  returns: { lockId, rate, expiresAt }

// 2. Recipient Management
POST /api/transfers/recipients/verify
  body: { name, phone, email, paymentMethod, upiOrBankAccount, corridor }
  returns: { recipientId, verificationStatus, errors }

GET /api/transfers/recipients
  returns: [{ id, name, status, corridor, lastUsed }]

// 3. Transfer Actions
POST /api/transfers/immediate
  body: { quoteId, complianceData, upiSelection }
  returns: { transferId, status, transactionId }

POST /api/transfers/rate-triggered
  body: { quoteId, targetRate, complianceData }
  returns: { transferId, status, monitoringStartedAt }

POST /api/transfers/:id/approve
  returns: { transferId, paymentStatus }

POST /api/transfers/:id/deny
  returns: { transferId, status: 'cancelled' }

// 4. FX Rates & Analytics
GET /api/transfers/rates/today/:corridor
  returns: { current, min24h, max24h, bid, ask }

GET /api/transfers/rates/history/:corridor
  query: { days: 30 }
  returns: [{ hour, minRate, maxRate, avgRate }]

// 5. Activity & Status
GET /api/transfers/activity
  returns: [{ id, type, timestamp, recipient, amount, status }]

GET /api/transfers/:id/status
  returns: { status, paymentStatus, lastUpdate }

// 6. Webhooks (Chimoney)
POST /api/webhooks/chimoney
  header: { 'x-chimoney-signature': signature }
  body: webhook payload
  returns: { success: true }
```

---

## 6. Security & Compliance Architecture

### 6.1 Data Encryption

```javascript
// At rest: Supabase transparent encryption
// In transit: TLS 1.2+
// Sensitive fields: Encrypt using AWS KMS or HashiCorp Vault

// recipient_upi_encrypted, recipient_bank_account_encrypted never logged
// Only chimoney_recipient_id used in transactional logs

const encryptionKey = process.env.CHIMONEY_ENCRYPTION_KEY;
export const encryptRecipientData = (data) => {
  return crypto.encryptSymmetric(data, encryptionKey);
}
```

### 6.2 Compliance & Audit

```
Every action creates immutable audit log:
- User action: initiateTransfer, approveTransfer, denyTransfer
- System action: rateCheck, paymentInitiation, webhookProcessed
- Includes: timestamp, user_id, IP, user_agent, details

Annual KYC refresh
- Check user KYC status from Google OAuth
- Request re-verification if older than 365 days
- Block transfers if KYC expired
```

### 6.3 Fraud Prevention

```javascript
// 1. Rate limit transfers
- Max 5 transfers per day per user
- Max transfer amount: $5000 (configurable by corridor)
- Daily aggregate limit: $10,000

// 2. Recipient validation
- First-time recipients require extended verification
- Recipient can only receive from one user account

// 3. Idempotency keys
- All Chimoney API calls include idempotency-key
- Prevents double-payment if request retried

// 4. Webhook signature verification
- Verify x-chimoney-signature header
- Use HMAC-SHA256 with API secret
```

### 6.4 PCI-DSS Compliance

```
Never store full bank account numbers or UPI
- Store only last 4 digits for UI display
- Keep encrypted version in DB
- Decrypt only during Chimoney API calls
- Implement request timeout & error handling
```

---

## 7. Extensibility Design

### 7.1 Adding New Currency Corridors

**Step 1: Add corridor configuration**
```javascript
// config/transferCorridors.js
export const corridors = {
  'USD_INR': {
    sourceCountry: 'US',
    destCountry: 'IN',
    provider: 'chimoney',
    minAmount: 100,
    maxAmount: 5000,
    feeStructure: { fixed: 5, percentage: 0.5 },
    paymentMethods: ['upi', 'bank_account'],
    complianceFields: ['purpose', 'source_of_funds']
  },
  'GBP_INR': { /* similar */ },
  'USD_PK': { /* Pakistan corridor */ }
};
```

**Step 2: Create corridor in database**
```sql
INSERT INTO transfer_corridors VALUES (
  uuid_generate_v4(), 'US', 'IN', 'USD-INR', 'chimoney',
  100, 5000, '{"fixed": 5, "percentage": 0.5}', true, now(), now()
);
```

**Step 3: No code changes needed** - System automatically:
- Enables FX rate monitoring for new corridor
- Makes it available in recipient selector
- Applies configured fee structure
- Applies configured compliance requirements

### 7.2 Adding New Payment Providers

```javascript
// services/transfers/providers/chimoney.js
export class ChimoneyProvider {
  async verifyRecipient(data) { /* implementation */ }
  async getQuote(amount) { /* implementation */ }
  async initiatePayment(transferData) { /* implementation */ }
  async getTransactionStatus(txnId) { /* implementation */ }
}

// services/transfers/providers/wise.js (future)
export class WiseProvider {
  async verifyRecipient(data) { /* implementation */ }
  // ...
}

// Transfer service dynamically selects provider
export const getProvider = (corridor) => {
  const config = corridors[corridor];
  if (config.provider === 'chimoney') return new ChimoneyProvider();
  if (config.provider === 'wise') return new WiseProvider();
}
```

---

## 8. Cron Job Architecture

### 8.1 Rate Monitoring Cron (Every 15 minutes)

```javascript
// pages/api/cron/check-fx-rates.js
export default async function handler(req, res) {
  // Security: Verify cron request is from trusted source
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const transfers = await db.transfer_requests.findMany({
    where: { status: 'monitoring' }
  });

  for (const transfer of transfers) {
    try {
      await checkRateAndTrigger(transfer.id);
    } catch (error) {
      logger.error(`Rate check failed for transfer ${transfer.id}`, error);
      // Continue processing other transfers, don't throw
    }
  }

  res.status(200).json({ success: true, checked: transfers.length });
}

// Deploy to: Supabase edge function or external cron service
// - pg_cron (PostgreSQL built-in): SELECT cron.schedule('check-fx-rates', '*/15 * * * *', ...);
// - Supabase Functions: Deploy as edge function, trigger via external cron
// - External: Vercel Cron, GitHub Actions, AWS Lambda
```

### 8.2 KYC Refresh Cron (Daily)

```javascript
// pages/api/cron/refresh-kyc-status.js
// Check if users' KYC is older than 365 days
// Send notification: "Your KYC expired, re-verify before next transfer"
```

### 8.3 Webhook Retry Cron (Every hour)

```javascript
// pages/api/cron/retry-failed-webhooks.js
// Find chimney_webhook_logs with processed = false
// Retry failed webhooks up to 3 times
```

---

## 9. Error Handling & Retry Logic

### 9.1 Chimoney API Failures

```javascript
// Transient errors: retry with exponential backoff
const MAX_RETRIES = 3;
const retryWithBackoff = async (fn, context) => {
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.statusCode >= 500 || error.statusCode === 429) {
        const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
        await sleep(delay);
      } else {
        throw error; // Non-retryable error
      }
    }
  }
};

// Permanent errors: notify user
if (error.code === 'RECIPIENT_NOT_FOUND') {
  return {
    status: 'failed',
    userMessage: 'Recipient account could not be verified. Please check details.',
    errorCode: 'VERIFICATION_FAILED'
  };
}
```

### 9.2 Rate Lock Expiry

```javascript
// If user tries to approve after rate_lock_expires_at:
if (new Date() > transfer.rate_lock_expires_at) {
  throw new Error('Rate lock expired. Please re-quote and lock again.');
  // Suggest re-quoting at current market rate
}
```

---

## 10. Notifications & User Experience

### 10.1 Notification Types

```javascript
// Real-time (WebSocket/Server-Sent Events)
- Rate lock expiring in 2 minutes
- Target rate met - confirm transfer?
- Payment initiated - check status

// Async (Email/SMS)
- Transfer completed
- Recipient verification failed (take action)
- Monthly activity summary

// In-app
- Activity sidebar updates
- Toast notifications
- Dialog prompts for actions
```

### 10.2 Activity Sidebar Implementation

```javascript
// Real-time updates using Supabase realtime subscriptions
supabase
  .from('transfer_activity_log')
  .on('INSERT', payload => {
    // New activity: update sidebar
    updateActivitySidebar(payload);
  })
  .subscribe();
```

---

## 11. Monitoring & Observability

### 11.1 Key Metrics

```
- Transfers per day (by corridor, by user)
- Success rate by transfer type (immediate vs rate-triggered)
- Average FX rate offered vs mid-market
- Webhook delivery success rate
- Chimoney API latency & error rates
- Rate check frequency (identify stuck transfers)
```

### 11.2 Logging Strategy

```javascript
// Structured logging with context
logger.info('transfer.initiated', {
  transferId,
  userId,
  corridor,
  amount,
  transferType
});

logger.info('chimoney.api.called', {
  endpoint,
  method,
  latency_ms,
  statusCode,
  transferId
});

// Never log: recipient details, amounts after initiation, API keys
```

---

## 12. Deployment & Rollout Strategy

### Phase 1: India (USD/INR)
- Implement core service layer
- Build immediate transfer flow
- Manual rate monitoring (no cron yet)
- Limited to 10 beta users

### Phase 2: Rate Monitoring
- Deploy rate check cron
- Implement rate-triggered transfers
- Expand to 100 users
- Gather feedback on UX

### Phase 3: Multi-Currency
- Add GBP/INR corridor
- Generalize provider abstraction
- Expand to 1000+ users

### Phase 4: Additional Providers
- Integrate Wise or other providers
- User can choose preferred provider
- Provider comparison UI

---

## 13. Configuration & Environment Variables

```bash
# Chimoney API
CHIMONEY_API_KEY=xxx
CHIMONEY_API_SECRET=xxx
CHIMONEY_WEBHOOK_SECRET=xxx
CHIMONEY_BASE_URL=https://api.chimoney.io

# Encryption
CHIMONEY_ENCRYPTION_KEY=xxx (32-byte key)

# Transfer limits (configurable by corridor)
TRANSFER_MAX_DAILY_PER_USER=5
TRANSFER_MAX_AMOUNT=5000
TRANSFER_MAX_DAILY_AGGREGATE=10000

# Rate lock duration
RATE_LOCK_DURATION_SECONDS=300

# Cron scheduling
CRON_SECRET=xxx
```

---

## 14. Testing Strategy

### Unit Tests
- Transfer state machine transitions
- FX rate calculations with fees
- Encryption/decryption
- Idempotency key generation

### Integration Tests
- Chimoney API mocking
- End-to-end transfer flow
- Webhook processing
- Rate monitoring trigger

### E2E Tests (Staging)
- Sandbox Chimoney API
- Real rate quote → lock → approve flow
- Actual payment initiation (small amounts)

---

## 15. Rollback Strategy

```
If critical bug discovered:
1. Pause new transfers (disable dialog)
2. Mark affected transfers as 'investigating'
3. Freeze all Chimoney API calls
4. Notify support team
5. Deploy fix
6. Resume transfers
7. Send affected users status update
```

---

## Next Steps

1. **Week 1-2**: Implement database schema + core services (transferService, kycService, fxRateService)
2. **Week 2-3**: Build backend APIs + Chimoney integration
3. **Week 3-4**: Frontend dialogs + activity sidebar
4. **Week 4-5**: Testing + bug fixes
5. **Week 5+**: Deployment & monitoring

---

**Document Version**: 1.0
**Last Updated**: Feb 14, 2026
**Next Review**: After Phase 1 launch
