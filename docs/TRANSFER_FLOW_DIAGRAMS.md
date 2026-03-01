# Transfer Flow Diagrams & Documentation Index

## 📊 Sequence Diagram
See: `IMMEDIATE_TRANSFER_SEQUENCE.puml`

**Visual representation of the complete flow from start to finish**

```
PlantUML Sequence Diagram includes:
├── Phase 1: Beneficiary Selection & Amount Entry
├── Phase 2: Exchange Rate Fetching (Chimoney API)
├── Phase 3: Review & Confirmation
├── Phase 4: Transfer Record Creation
├── Phase 5: Chimoney Payout Execution
├── Phase 6: Receipt Display
└── Future: Webhook Status Updates
```

---

## 📋 Implementation Details
See: `IMMEDIATE_TRANSFER_IMPLEMENTATION.md`

**Complete step-by-step guide with code snippets**

```
Includes:
├── Step 1: Load Beneficiaries
├── Step 2: Validate Amount
├── Step 3: Get Exchange Rate
├── Step 4: Review Details
├── Step 5: Create Transfer Record
├── Step 6: Execute Transfer (Chimoney)
├── Step 7: Show Receipt
├── Error Handling Guide
├── Testing Checklist
└── Implementation Priority
```

---

## 🎯 High-Level Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                 USER INTERACTION FLOW                        │
└─────────────────────────────────────────────────────────────┘

     ┌──────────────────────────────┐
     │   Transfer Initiation Page   │
     │                              │
     │ 1. Select Beneficiary        │
     │ 2. Enter Amount ($)          │
     │ 3. Get Exchange Rate         │
     │ 4. Review Details            │
     └──────────────────────────────┘
                  ↓
          [Confirm & Send]
                  ↓
     ┌──────────────────────────────┐
     │  Review & Confirmation Page  │
     │                              │
     │ Show full transfer details   │
     │ Payment method details       │
     │ Amount breakdown             │
     │ Settlement time              │
     │ "Cannot be reversed" warning │
     └──────────────────────────────┘
                  ↓
          [Confirm & Send]
                  ↓
     ┌──────────────────────────────┐
     │   API: POST /transfers/init   │
     │   API: POST /transfers/exec   │
     │   Chimoney: POST /payouts     │
     │   Database: INSERT transfers  │
     └──────────────────────────────┘
                  ↓
     ┌──────────────────────────────┐
     │  Confirmation & Receipt Page │
     │                              │
     │ ✓ Transfer Sent!             │
     │ Transaction ID               │
     │ Recipient details            │
     │ Amount breakdown             │
     │ Settlement estimate          │
     │ "What happens next" info     │
     └──────────────────────────────┘
```

---

## 🔄 API Call Sequence

```
┌──────────────────────────────────────────────────────────────┐
│           API CALLS IN ORDER OF EXECUTION                    │
└──────────────────────────────────────────────────────────────┘

Step 1: Get Beneficiaries
┌─────────────────────────────────────────────────────────────┐
│ GET /api/beneficiaries/list                                 │
│ Headers: Authorization, X-User-Id                           │
│ Response: { beneficiaries: [...] }                          │
└─────────────────────────────────────────────────────────────┘
                        ↓
Step 2: Get Exchange Rate
┌─────────────────────────────────────────────────────────────┐
│ GET /api/transfers/exchange-rate?amount=500&...             │
│ Calls: Chimoney GET /v0.2.4/payouts/rates                   │
│ Response: {                                                  │
│   exchange_rate: 83.25,                                     │
│   target_amount: 41625,                                     │
│   fee_amount: 2.50,                                         │
│   total_to_pay: 502.50                                      │
│ }                                                            │
└─────────────────────────────────────────────────────────────┘
                        ↓
Step 3: Create Transfer Record
┌─────────────────────────────────────────────────────────────┐
│ POST /api/transfers/initiate                                │
│ Headers: Authorization, X-User-Id                           │
│ Body: {                                                      │
│   beneficiary_id, source_amount, exchange_rate, fee_amount  │
│ }                                                            │
│ Response: { transfer_id: "txn-xyz", status: "pending" }     │
│ DB Action: INSERT into transfers (status='pending')         │
└─────────────────────────────────────────────────────────────┘
                        ↓
Step 4: Execute Transfer
┌─────────────────────────────────────────────────────────────┐
│ POST /api/transfers/execute                                 │
│ Headers: Authorization, X-User-Id                           │
│ Body: { transfer_id: "txn-xyz" }                            │
│                                                              │
│ Backend does:                                                │
│ 1. START TRANSACTION                                        │
│ 2. UPDATE transfers (status='processing')                   │
│ 3. SELECT beneficiary details                               │
│ 4. DECRYPT sensitive fields (AES-256)                       │
│ 5. Call Chimoney POST /v0.2.4/payouts/bank                  │
│ 6. UPDATE transfers (status='processing', chimoney_id=...)  │
│ 7. COMMIT TRANSACTION                                       │
│                                                              │
│ Response: {                                                  │
│   success: true,                                            │
│   transfer_id: "txn-xyz",                                   │
│   chimoney_transaction_id: "chi_123456",                    │
│   status: "processing",                                     │
│   expected_delivery: "2026-02-28T12:51:00Z"                 │
│ }                                                            │
└─────────────────────────────────────────────────────────────┘
                        ↓
        [Frontend shows receipt]
```

---

## 📊 Database State Changes

```
┌──────────────────────────────────────────────────────────────┐
│         TRANSFERS TABLE STATE PROGRESSION                    │
└──────────────────────────────────────────────────────────────┘

Step 1: POST /transfers/initiate
┌──────────────────────────────────────────┐
│ transfers {                              │
│   id: "txn-xyz-789",                     │
│   user_id: "user-uuid",                  │
│   beneficiary_id: "ben-uuid",            │
│   source_amount: 502.50,                 │
│   target_amount: 41625.00,               │
│   exchange_rate: 83.25,                  │
│   fee_amount: 2.50,                      │
│   status: "pending",  ←─ CREATED         │
│   initiated_at: NOW(),                   │
│   chimoney_transaction_id: NULL,         │
│   executed_at: NULL                      │
│ }                                        │
└──────────────────────────────────────────┘
                    ↓
Step 2: POST /transfers/execute (Chimoney success)
┌──────────────────────────────────────────┐
│ transfers {                              │
│   id: "txn-xyz-789",                     │
│   user_id: "user-uuid",                  │
│   beneficiary_id: "ben-uuid",            │
│   source_amount: 502.50,                 │
│   target_amount: 41625.00,               │
│   exchange_rate: 83.25,                  │
│   fee_amount: 2.50,                      │
│   status: "processing",  ←─ UPDATED      │
│   initiated_at: "2026-02-28T12:45:00Z",  │
│   chimoney_transaction_id: "chi_123456", ←─ ADDED
│   chimoney_reference: "TXN_...",         ←─ ADDED
│   executed_at: "2026-02-28T12:46:00Z"    ←─ ADDED
│ }                                        │
└──────────────────────────────────────────┘
                    ↓
Step 3: Webhook (Future - status update)
┌──────────────────────────────────────────┐
│ transfers {                              │
│   ... (same fields)                      │
│   status: "completed",  ←─ UPDATED       │
│   completed_at: "2026-02-28T12:51:00Z"   ←─ ADDED
│ }                                        │
└──────────────────────────────────────────┘
```

---

## 🔐 Security & Encryption Flow

```
┌──────────────────────────────────────────────────────────────┐
│       SENSITIVE DATA HANDLING & ENCRYPTION                   │
└──────────────────────────────────────────────────────────────┘

When Adding Beneficiary:
┌─────────────────────────────────────────────────┐
│ User Input:                                     │
│ - UPI ID: "amit@okhdfcbank"                     │
│ - Bank Account: "1234567890"                    │
│                          ↓ (POST /beneficiaries/add)
│ Backend Encryption (AES-256-CBC):              │
│ - upi_encrypted = encrypt("amit@...", KEY, IV) │
│ - account_encrypted = encrypt("1234...", ...)  │
│                          ↓
│ Database Storage:                               │
│ - beneficiaries.recipient_upi_encrypted = ...  │
│ - beneficiaries.recipient_bank_account_encrypted = ... │
│ - beneficiaries.recipient_ifsc = HDFC0000123   │
│                                                 │
│ (Actual UPI/account NEVER in plaintext)        │
└─────────────────────────────────────────────────┘

When Executing Transfer:
┌─────────────────────────────────────────────────┐
│ 1. Fetch encrypted data:                        │
│    SELECT recipient_upi_encrypted,              │
│           recipient_bank_account_encrypted      │
│    FROM beneficiaries WHERE id = ?              │
│                          ↓
│ 2. Decrypt (server-side only):                  │
│    upi = decrypt(encrypted_value, ENCRYPTION_KEY) │
│    account = decrypt(encrypted_value, ENCRYPTION_KEY) │
│                          ↓
│ 3. Use decrypted values for Chimoney:           │
│    POST /v0.2.4/payouts/bank {                 │
│      account_number: "1234567890",              │
│      bank_code: "HDFC0000123",                  │
│      fullname: "Amit Kumar"                     │
│    }                                            │
│                          ↓
│ 4. Chimoney executes transfer                   │
│                                                 │
│ (Decrypted values NEVER logged or exposed)      │
└─────────────────────────────────────────────────┘
```

---

## 📱 Frontend Component Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                 COMPONENT TREE                               │
└─────────────────────────────────────────────────────────────┘

VittaApp (main component)
│
├─ BeneficiaryManagementScreen
│  └─ AddBeneficiaryFlow ✅ (Already done)
│
└─ TransferScreen (NEW)
   │
   ├─ TransferInitiation (Step 1-4)
   │  ├─ BeneficiariesList (reuse existing)
   │  ├─ Amount Input Field
   │  └─ Rate Display (from API)
   │
   ├─ TransferReview (Step 5)
   │  └─ Confirmation Modal
   │
   └─ TransferReceipt (Step 6)
      ├─ Success Message
      └─ Receipt Details
```

---

## 🔗 Related Documentation

- **Beneficiary Management**: See `BENEFICIARY_CREATION_ALL_CHANGES.md`
- **Chimoney API Reference**: See `docs/` (will create)
- **Database Schema**: See `supabase/schema.sql`
- **API Error Codes**: See implementation docs

---

## 📈 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                   COMPLETE DATA FLOW                         │
└─────────────────────────────────────────────────────────────┘

                         ┌────────────┐
                         │    User    │
                         └────────────┘
                              │
                    [Select Beneficiary]
                    [Enter Amount: $500]
                              │
                    ┌─────────▼─────────┐
                    │   Frontend App    │
                    │ (React Component) │
                    └─────────┬─────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
    ┌─────────▼──────┐ ┌─────▼────────┐ ┌────▼─────────┐
    │ GET /exchange  │ │ POST /initiate│ │ POST /execute│
    │    (Chimoney)  │ │   (Database)  │ │  (Chimoney)  │
    └─────────┬──────┘ └─────┬────────┘ └────┬─────────┘
              │               │               │
              │               │               │
    ┌─────────▼──────┐ ┌─────▼────────┐ ┌────▼─────────┐
    │   Chimoney     │ │  Supabase    │ │   Chimoney   │
    │   /rates       │ │  transfers   │ │  /payouts    │
    │   GET Rate     │ │  INSERT      │ │  POST Payout │
    │   Response: 83 │ │  Response: ID│ │  Response: TX│
    └─────────┬──────┘ └─────┬────────┘ └────┬─────────┘
              │               │               │
              └───────────────┼───────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   Frontend App    │
                    │  Display Receipt  │
                    │  Show Status:     │
                    │  "Processing"     │
                    └───────────────────┘
```

---

## ✅ Implementation Checklist

**Use this when building each component:**

### Backend APIs
- [ ] `services/chimoney/rateService.js` - GET rates
- [ ] `pages/api/transfers/exchange-rate.js` - Expose rate API
- [ ] `services/chimoney/payoutService.js` - POST payout
- [ ] `pages/api/transfers/initiate.js` - Create transfer record
- [ ] `pages/api/transfers/execute.js` - Execute transfer
- [ ] Error handling for all APIs
- [ ] Database migrations (transfers table)

### Frontend Components
- [ ] `TransferInitiation.js` - Select + Amount
- [ ] `TransferReview.js` - Confirmation
- [ ] `TransferReceipt.js` - Receipt
- [ ] Responsive design (mobile/tablet/desktop)
- [ ] Loading states & animations
- [ ] Error messages
- [ ] Form validation

### Integration
- [ ] Wire into VittaApp navigation
- [ ] Test with real beneficiaries
- [ ] Test with Chimoney API
- [ ] End-to-end flow testing
- [ ] Error scenario testing
- [ ] Mobile testing

---

## 📞 Key Questions for Implementation

1. Should we show a confirmation modal before calling Chimoney?
2. Should we poll for status or wait for webhook?
3. Should we store the fee percentage in config or hardcode?
4. Should transfer be cancelable after initiated but before executed?
5. Should we track transfer metrics (volume, success rate)?

