# Immediate Transfer Implementation Checklist

**One consolidated list of all implementation steps**
**Reference design docs**: IMPLEMENTATION_READY.md, SMART_RATE_LOGIC.md, TRANSFER_DATABASE_SCHEMA.md, etc.

---

## 📋 PHASE 1: DATABASE SCHEMA (1-2 hours)

### Step 1.1: Update `supabase/schema.sql` - Extend plaid_accounts table
- [ ] Add `routing_number VARCHAR(9)` - US routing number
- [ ] Add `account_number_encrypted TEXT` - AES-256 encrypted account number
- [ ] Add `account_holder_name TEXT` - Account holder name
- [ ] Add `can_transfer_out BOOLEAN DEFAULT false` - Transfer capability flag
- [ ] Add `is_verified_for_transfer BOOLEAN DEFAULT false` - Verification flag
- [ ] Add `transfer_verification_status VARCHAR(50)` - 'pending', 'verified', 'failed'
- [ ] Add `daily_transfer_limit NUMERIC DEFAULT 5000` - Max per day (USD)
- [ ] Add `transaction_limit NUMERIC DEFAULT 50000` - Max per transaction (USD)
- [ ] Add `last_transfer_at TIMESTAMP WITH TIME ZONE` - Last transfer timestamp
- [ ] Add `transfer_count INT DEFAULT 0` - Transfer counter
- [ ] Add `transfer_metadata JSONB` - Flexible JSON metadata

### Step 1.2: Create indexes for transfer queries
- [ ] Create index: `idx_plaid_can_transfer` on (user_id, can_transfer_out) WHERE can_transfer_out = true
- [ ] Create index: `idx_plaid_depository` on (account_type) WHERE account_type = 'depository'

### Step 1.3: Create `transfers` table (21 columns)
- [ ] `id UUID PRIMARY KEY` - Unique transfer ID
- [ ] `user_id UUID NOT NULL REFERENCES users(id)` - Transfer owner
- [ ] `plaid_account_id UUID NOT NULL REFERENCES plaid_accounts(id)` - SOURCE account
- [ ] `beneficiary_id UUID NOT NULL REFERENCES beneficiaries(id)` - DESTINATION account
- [ ] `source_amount DECIMAL(15,2)` - Amount sent (USD)
- [ ] `source_currency VARCHAR(3) DEFAULT 'USD'` - Source currency
- [ ] `target_amount DECIMAL(15,2)` - Amount recipient gets (INR)
- [ ] `target_currency VARCHAR(3)` - Target currency (INR)
- [ ] `exchange_rate DECIMAL(10,4)` - Original quoted rate (1 USD = X INR)
- [ ] `fee_amount DECIMAL(15,2)` - Transfer fee
- [ ] `fee_percentage DECIMAL(5,3)` - Fee %
- [ ] `final_exchange_rate DECIMAL(10,4)` - Actual rate at execution
- [ ] `final_target_amount DECIMAL(15,2)` - Actual recipient amount
- [ ] `chimoney_transaction_id VARCHAR(255)` - Chimoney reference ID
- [ ] `chimoney_reference VARCHAR(255)` - Chimoney reference code
- [ ] `status VARCHAR(50)` - Status with CHECK: pending, processing, completed, failed, cancelled
- [ ] `rate_change_log JSONB` - Rate change tracking
- [ ] `initiated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()` - When started
- [ ] `executed_at TIMESTAMP WITH TIME ZONE` - When sent to Chimoney
- [ ] `completed_at TIMESTAMP WITH TIME ZONE` - When completed
- [ ] `cancelled_at TIMESTAMP WITH TIME ZONE` - If cancelled
- [ ] `ip_address INET` - User IP for audit
- [ ] `user_agent TEXT` - User agent for audit
- [ ] `created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`
- [ ] `updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`

### Step 1.4: Create indexes for transfers table
- [ ] Create index: `idx_transfers_user_id` on (user_id)
- [ ] Create index: `idx_transfers_plaid_account` on (plaid_account_id)
- [ ] Create index: `idx_transfers_beneficiary` on (beneficiary_id)
- [ ] Create index: `idx_transfers_status` on (status)
- [ ] Create index: `idx_transfers_chimoney_id` on (chimoney_transaction_id)
- [ ] Create index: `idx_transfers_created_at` on (created_at DESC)

### Step 1.5: Create `transfer_status_log` table (audit trail, immutable)
- [ ] `id UUID PRIMARY KEY` - Log entry ID
- [ ] `transfer_id UUID NOT NULL REFERENCES transfers(id)` - Which transfer
- [ ] `old_status VARCHAR(50)` - Previous status
- [ ] `new_status VARCHAR(50)` - New status
- [ ] `reason TEXT` - Why status changed
- [ ] `metadata JSONB` - Error details, rate changes, etc.
- [ ] `created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()` - When changed

### Step 1.6: Create indexes for transfer_status_log
- [ ] Create index: `idx_transfer_log_id` on (transfer_id)
- [ ] Create index: `idx_transfer_log_status` on (new_status)
- [ ] Create index: `idx_transfer_log_created_at` on (created_at DESC)

### Step 1.7: Add triggers for updated_at
- [ ] Create trigger on transfers table: `trg_transfers_updated_at`
- [ ] Create trigger on plaid_accounts table: `trg_plaid_accts_updated_at`

---

## 🔐 PHASE 2: BACKEND SERVICES (2 hours)

### Step 2.1: Create `services/encryption/encryptionService.js` (80 lines)
- [ ] Function `encrypt(plaintext, encryptionKey)` - AES-256-CBC with random IV
- [ ] Function `decrypt(encryptedWithIv, encryptionKey)` - Reverse encryption
- [ ] Function `maskData(sensitiveData)` - Show last 4 digits only
- [ ] Function `isValidEncryptionKey(key)` - Validate 64-char hex key
- [ ] Function `generateEncryptionKey()` - Create new encryption key
- [ ] Export all functions

**Key details**:
- Use AES-256-CBC algorithm
- Generate random 16-byte IV per encryption
- Return format: `IV:encrypted` (both hex encoded)
- Never log unencrypted values

### Step 2.2: Create `services/transfer/transferService.js` (250 lines)
- [ ] Function `handleRateChange(originalRate, currentRate, sourceAmount)` - **SMART RATE LOGIC**
  - [ ] If rate improves: return `{ action: 'ACCEPT_SILENTLY', reason: 'favorable' }`
  - [ ] If rate worsens <1%: return `{ action: 'ACCEPT_SILENTLY', reason: 'negligible_change' }`
  - [ ] If rate worsens >1%: return `{ action: 'ALERT_USER', requires_confirmation: true }`
- [ ] Function `getExchangeRate(chimoney, sourceCountry, targetCountry)` - Fetch Chimoney rate
  - [ ] Call Chimoney API `/rate?countryTo=IN`
  - [ ] Extract USD to target currency rate
  - [ ] Return with 30-second expiry
- [ ] Function `calculateTransferAmounts(sourceAmount, exchangeRate, feePercentage)` - Amount breakdown
- [ ] Function `validateTransfer(transfer, plaidAccount, beneficiary)` - Comprehensive validation
- [ ] Function `createStatusLogEntry(transfer, oldStatus, newStatus, reason, metadata)` - Audit trail
- [ ] Function `formatRateChangeMessage(rateDecision, finalRate, originalRate)` - User messages
- [ ] Export all functions

---

## 🔌 PHASE 2: BACKEND APIS (6-8 hours)

### Step 3.1: Create `pages/api/transfers/exchange-rate.js` (95 lines)
**GET /api/transfers/exchange-rate**

- [ ] Validate query parameters: `amount`, `source` (default USD), `target` (default INR)
- [ ] Validate amount: positive number, between $1-$999,999
- [ ] Call Chimoney API to get current rate
- [ ] Extract rate: `Chimoney_response.data[targetCountry].rates[sourceCountry].rate`
- [ ] Calculate amounts:
  - [ ] Target amount = source amount × exchange rate
  - [ ] Fee = source amount × 0.5%
  - [ ] Final amount = target amount - fee
- [ ] Return response with 30-second expiry:
  ```json
  {
    "success": true,
    "data": {
      "exchange_rate": 83.25,
      "expires_at": "ISO string (now + 30s)",
      "source_amount": 500,
      "target_amount": 41625,
      "fee_amount": 2.50,
      "final_amount": 41622.50,
      "rate_valid_for_seconds": 30
    }
  }
  ```
- [ ] Error handling for all failure cases

### Step 3.2: Create `pages/api/transfers/initiate.js` (180 lines)
**POST /api/transfers/initiate**

- [ ] Extract user_id from `x-user-id` header
- [ ] Parse request body: `beneficiary_id`, `plaid_account_id`, `source_amount`, `exchange_rate`, `expires_at`
- [ ] Validate all required fields present
- [ ] Validate amount: positive, between $1-$999,999
- [ ] Check rate hasn't expired (expires_at > now)
- [ ] Fetch beneficiary from DB by ID
  - [ ] Verify user owns this beneficiary
  - [ ] Check `verification_status === 'verified'`
  - [ ] Check `is_active === true`
- [ ] Fetch plaid account from DB by ID
  - [ ] Check `can_transfer_out === true`
  - [ ] Check `is_verified_for_transfer === true`
- [ ] Call `transferService.calculateTransferAmounts()` to get breakdown
- [ ] Call `transferService.validateTransfer()` to validate limits
- [ ] Insert transfer record into DB with `status = 'pending'`
- [ ] Log transfer initiation to `transfer_status_log`
- [ ] Return response:
  ```json
  {
    "success": true,
    "data": {
      "transfer_id": "uuid",
      "status": "pending",
      "initiated_at": "ISO string",
      "valid_until": "expires_at",
      "source_amount": 500,
      "target_amount": 41625
    }
  }
  ```
- [ ] Error handling for all validation failures

### Step 3.3: Create `pages/api/transfers/execute.js` (300 lines)
**POST /api/transfers/execute** - **CORE SMART RATE LOGIC**

- [ ] Extract user_id from `x-user-id` header
- [ ] Parse request body: `transfer_id`, `accept_rate_change` (default false)
- [ ] Fetch transfer from DB (must be status = 'pending')
- [ ] Fetch beneficiary for payout details
- [ ] **STEP 1**: Call Chimoney to get CURRENT exchange rate
  - [ ] Call `/rate?countryTo=IN` API
  - [ ] Extract current rate for USD→INR
- [ ] **STEP 2**: Get original rate from transfer record
- [ ] **STEP 3**: Apply smart rate logic
  - [ ] Call `transferService.handleRateChange(originalRate, currentRate, sourceAmount)`
  - [ ] Get decision: { action, reason, change_percent, loss, ... }
- [ ] **STEP 4**: Handle decision
  - [ ] If `action === 'ALERT_USER'` AND `!accept_rate_change`:
    - [ ] Return ERROR response with requires_confirmation: true
    ```json
    {
      "success": false,
      "error_code": "RATE_CHANGED",
      "original_rate": 83.25,
      "current_rate": 82.50,
      "change_percent": "-1.40",
      "loss_amount_inr": 62,
      "requires_confirmation": true
    }
    ```
  - [ ] Otherwise: proceed to Step 5
- [ ] **STEP 5**: Calculate final amounts with current rate
  - [ ] `final_target_amount = source_amount × currentRate`
  - [ ] Create rate_change_log with original→final comparison
- [ ] **STEP 6**: Update transfer record
  - [ ] Set `status = 'processing'`
  - [ ] Set `final_exchange_rate = currentRate`
  - [ ] Set `final_target_amount = final_target_amount`
  - [ ] Set `executed_at = now`
  - [ ] Set `rate_change_log = rate_change_log`
- [ ] **STEP 7**: Log status change to transfer_status_log
  - [ ] old_status: 'pending'
  - [ ] new_status: 'processing'
  - [ ] reason: "Rate changed from X to Y"
  - [ ] metadata: rate_change_log
- [ ] **STEP 8**: Call Chimoney payout API
  - [ ] Call `/payouts/bank` with account details
  - [ ] Pass: amount, currency, account_number, bank_code, fullname, country
  - [ ] Get back: transaction_id, reference
- [ ] **STEP 9**: Update transfer with Chimoney reference
  - [ ] Set `chimoney_transaction_id`
  - [ ] Set `chimoney_reference`
- [ ] **STEP 10**: Return success response
  ```json
  {
    "success": true,
    "data": {
      "transfer_id": "uuid",
      "status": "processing",
      "chimoney_transaction_id": "chi_xyz",
      "executed_at": "ISO string",
      "original_exchange_rate": 83.25,
      "final_exchange_rate": 83.25,
      "rate_changed": false,
      "rate_improvement": true/false,
      "rate_change_message": "Great news! Rate improved..."
    }
  }
  ```
- [ ] Error handling: Chimoney failure, validation, etc.

---

## 🎨 PHASE 3: FRONTEND COMPONENTS (6-8 hours)

### Step 4.1: Create `components/transfer/TransferInitiation.js` (220 lines)
**First screen: Select beneficiary, enter amount, get rate**

Props: `beneficiaries`, `onNext(transferData)`, `onCancel()`, `disabled`, `user`

- [ ] State: `selectedBeneficiary`, `amount`, `exchangeRate`, `rateExpiry`, `secondsRemaining`
- [ ] State: `loading`, `rateLoading`, `error`
- [ ] Render:
  - [ ] Beneficiary list selector (radio buttons or clickable list)
  - [ ] Amount input field (number, min 1, max 999999)
  - [ ] "Loading..." indicator when fetching rate
  - [ ] Exchange rate card showing:
    - [ ] Current rate (1 USD = ₹X)
    - [ ] Countdown timer (30s remaining)
    - [ ] Breakdown:
      - [ ] You send: $X
      - [ ] Before fees: ₹X
      - [ ] Fee (0.5%): -$X
      - [ ] Recipient gets: ₹X (highlighted)
  - [ ] Error message box if any error
  - [ ] Buttons: Cancel | Review Transfer
- [ ] Functions:
  - [ ] `handleAmountChange(e)` - Fetch rate when amount changes
  - [ ] `fetchExchangeRate(sourceAmount)` - Call GET /api/transfers/exchange-rate
  - [ ] `handleReview()` - Validate inputs, call onNext with:
    ```javascript
    {
      beneficiary_id, beneficiary_name, source_amount, exchange_rate,
      expires_at, amounts: { source_amount, target_amount, fee_amount, final_amount }
    }
    ```
- [ ] Rate countdown timer:
  - [ ] Start 30-second countdown on rate fetch
  - [ ] Update every second
  - [ ] Clear rate on expiry (setExchangeRate(null))
- [ ] Validation:
  - [ ] Amount between $1-$999,999
  - [ ] Beneficiary selected
  - [ ] Exchange rate exists and not expired
- [ ] Responsive design with Tailwind CSS
- [ ] Use Lucide React icons (ChevronRight, Loader, AlertCircle, Zap)

### Step 4.2: Create `components/transfer/TransferReview.js` (210 lines)
**Second screen: Review source/destination, confirm amounts**

Props: `transferData`, `plaidAccounts`, `onConfirm(plaidAccountId)`, `onBack()`, `disabled`

- [ ] State: `selectedAccount`, `loading`, `error`
- [ ] Render:
  - [ ] Header: "Review Transfer"
  - [ ] Source account selector:
    - [ ] List of plaidAccounts
    - [ ] Show account type (Checking/Savings/Credit), mask (****1234), balance
    - [ ] Highlight selected account
  - [ ] Arrow divider (visual)
  - [ ] Destination account display (beneficiary, read-only):
    - [ ] Name, country (India), payment method
  - [ ] Amount details card:
    - [ ] You send (USD)
    - [ ] Exchange rate
    - [ ] Before fees (INR)
    - [ ] Transfer fee (0.5%)
    - [ ] Recipient receives (INR) - highlighted
  - [ ] Warning banner: "This transfer cannot be reversed"
  - [ ] Error message box if any
  - [ ] Buttons: Back | Confirm & Send
- [ ] Functions:
  - [ ] `handleConfirm()` - Validate selected account, call onConfirm(selectedAccount)
- [ ] Validation:
  - [ ] Account selected
  - [ ] Plaid accounts list not empty
- [ ] Responsive design with Tailwind CSS
- [ ] Use Lucide React icons (AlertTriangle, ArrowRight, ChevronLeft, Loader)

### Step 4.3: Create `components/transfer/RateChangeModal.js` (170 lines)
**Modal: Alert if rate worsened >1% before execution**

Props: `visible`, `originalRate`, `currentRate`, `changePercent`, `originalAmount`, `newAmount`, `lossAmount`, `onAccept()`, `onReject()`, `loading`

- [ ] Render (only if visible = true):
  - [ ] Modal overlay (fixed, dark background)
  - [ ] Header with close button
  - [ ] Rate comparison grid:
    - [ ] Quoted rate column (green): 1 USD = ₹X, Recipient: ₹X
    - [ ] Current rate column (red): 1 USD = ₹Y, Recipient: ₹Y
  - [ ] Impact section:
    - [ ] Rate change: -1.40%
    - [ ] Recipient loses: ₹62
  - [ ] Decision section: "What should you do?"
  - [ ] Buttons: Go Back | Accept & Send
- [ ] Render nothing if visible = false
- [ ] Use Lucide React icons (AlertTriangle, X, TrendingDown)
- [ ] Smooth fade-in animation

### Step 4.4: Create `components/transfer/TransferReceipt.js` (200 lines)
**Final screen: Success confirmation with details**

Props: `transferId`, `chimmoneyTransactionId`, `sourceAmount`, `finalAmount`, `originalRate`, `finalRate`, `rateImproved`, `rateChangeMessage`, `beneficiaryName`, `onDone()`

- [ ] State: `copied` - track which ID was copied
- [ ] Render:
  - [ ] Success header with green checkmark icon
  - [ ] Message: "Transfer Sent Successfully!"
  - [ ] Subtitle: "Beneficiary will receive funds within 24 hours"
  - [ ] Rate improvement banner (if rateImproved = true):
    - [ ] "Great news!" + rateChangeMessage
  - [ ] Transaction IDs section:
    - [ ] Transfer ID with copy button
    - [ ] Chimoney Transaction ID with copy button
    - [ ] Show "✓ Copied" message after copy
  - [ ] Transaction details card:
    - [ ] You sent: $X USD
    - [ ] Exchange rate: 1 USD = ₹Y (with ↑↓ if changed)
    - [ ] Recipient gets: ₹Z (highlighted)
  - [ ] Timeline section:
    - [ ] Now: Transfer initiated
    - [ ] 1-2 hours: Chimoney processes
    - [ ] 2-24 hours: Recipient bank receives
  - [ ] Help note: Save Transfer ID for reference
  - [ ] Done button
  - [ ] Footer: "Confirmation email sent"
- [ ] Functions:
  - [ ] `copyToClipboard(text, id)` - Copy to clipboard, show "Copied" for 2s
- [ ] Use Lucide React icons (CheckCircle, Copy, Sparkles, TrendingUp, Calendar, AlertCircle)
- [ ] Responsive design with Tailwind CSS

---

## 🧪 PHASE 4: INTEGRATION & TESTING (4-6 hours)

### Step 5.1: Connect UI to APIs
- [ ] Create parent component that orchestrates all 4 screens
- [ ] Route between screens based on transfer flow state:
  - [ ] TransferInitiation → TransferReview → [RateChangeModal] → TransferReceipt
- [ ] Pass data between screens
- [ ] Handle API responses and errors

### Step 5.2: Manual Test Cases
- [ ] Test exchange rate API:
  - [ ] [ ] Valid amount returns rate with 30s expiry
  - [ ] [ ] Rate countdown timer works
  - [ ] [ ] Invalid amount returns error
- [ ] Test transfer initiation:
  - [ ] [ ] Beneficiary validation works
  - [ ] [ ] Plaid account validation works
  - [ ] [ ] Transfer record created in DB
- [ ] Test all 3 rate scenarios:
  - [ ] [ ] Rate improves → Silent accept, show "Great news!" on receipt
  - [ ] [ ] Rate worsens <1% → Silent accept, show on receipt
  - [ ] [ ] Rate worsens >1% → Show RateChangeModal, ask user to confirm
- [ ] Test error scenarios:
  - [ ] [ ] Expired rate → Error message
  - [ ] [ ] Invalid beneficiary → Error message
  - [ ] [ ] Account not verified → Error message
  - [ ] [ ] Transfer limit exceeded → Error message
  - [ ] [ ] Chimoney API error → Error message
- [ ] Test end-to-end flow:
  - [ ] [ ] Complete transfer from start to success
  - [ ] [ ] Receipt shows all details correctly
  - [ ] [ ] Transaction IDs copy to clipboard

### Step 5.3: Database verification
- [ ] Verify schema changes applied correctly
- [ ] Check indexes created
- [ ] Verify triggers working

### Step 5.4: API logging verification
- [ ] Check transfer_status_log entries created for each status change
- [ ] Verify rate_change_log captured correctly

---

## 📋 PRE-IMPLEMENTATION SETUP

- [ ] Verify environment variables set:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `CHIMONEY_API_KEY`
  - [ ] `ENCRYPTION_KEY` (64 hex chars = 32 bytes)
- [ ] Verify Plaid SDK global loaded in `_app.js`
- [ ] Verify beneficiaries table exists (Phase 6 backend already done)
- [ ] Get Chimoney API documentation for:
  - [ ] Rate endpoint: `/rate?countryTo=IN`
  - [ ] Payout endpoint: `/payouts/bank`
- [ ] Confirm OFAC screening approach with Chimoney (defer to backlog per design)
- [ ] Review SMART_RATE_LOGIC.md before implementing Step 3.3

---

## 📊 TIMELINE SUMMARY

| Phase | Task | Hours | Total |
|-------|------|-------|-------|
| 1 | Database Schema | 1-2 | 1-2 |
| 2 | Backend Services | 2 | 3-4 |
| 2 | Backend APIs | 6-8 | 9-12 |
| 3 | Frontend Components | 6-8 | 15-20 |
| 4 | Integration & Testing | 4-6 | 19-26 |
| **TOTAL** | **All Phases** | **19-26** | **19-26** |

**Estimated completion**: 2-3 developer days

---

## ✅ SUCCESS CRITERIA

- [x] All design decisions documented
- [ ] Database schema applied successfully
- [ ] All 3 backend APIs working correctly
- [ ] All 4 frontend components rendering correctly
- [ ] Smart rate logic tested all 3 scenarios
- [ ] Error handling working for all cases
- [ ] End-to-end flow tested successfully
- [ ] Transaction audit trail complete
- [ ] No unencrypted account data in database

**Reference Documentation**:
- IMPLEMENTATION_READY.md
- SMART_RATE_LOGIC.md
- TRANSFER_DATABASE_SCHEMA.md
- TRANSFER_PLAID_INTEGRATION.md
- COMPLIANCE_REQUIREMENTS.md
