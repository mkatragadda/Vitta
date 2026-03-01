# Transfer Implementation - PlantUML Diagrams Index

**Complete visual reference for Immediate Transfer feature**

---

## 📊 Available Diagrams

### 1. **Immediate Transfer Sequence Diagram**
📄 File: `IMMEDIATE_TRANSFER_SEQUENCE.puml`

**What it shows**: Complete step-by-step flow from user action to transfer completion

**Main phases**:
```
Phase 1: Transfer Initiation (Steps 1-3)
  ├─ Load beneficiaries
  ├─ Validate amount input
  └─ Get exchange rate from Chimoney

Phase 2: Confirmation (Step 4)
  └─ Review transfer details

Phase 3: Transfer Execution (Steps 5-6)
  ├─ Create transfer record in DB
  ├─ Call Chimoney payout API
  └─ Update transfer with Chimoney ID

Phase 4: Confirmation (Step 7)
  └─ Show receipt with transaction ID

Future: Webhook Status Updates
  └─ Chimoney sends completion webhook
```

**Participants**:
- User (Frontend interaction)
- Frontend (React component)
- Backend API (Next.js routes)
- Supabase (Database)
- Chimoney (Payment API)

**Key takeaways from diagram**:
1. 7 main steps to complete transfer
2. 3 external API calls (2 to Chimoney, 1 to Supabase)
3. Database transaction handling for execute step
4. Sensitive data decryption on server-side only
5. Error handling at each step

---

### 2. **Transfer Flow Diagrams Document**
📄 File: `TRANSFER_FLOW_DIAGRAMS.md`

**Contains**:
- High-level user interaction flow
- API call sequence with request/response examples
- Database state progression
- Security & encryption flow
- Frontend component hierarchy
- Complete data flow diagram
- Implementation checklist

---

### 3. **Implementation Details Document**
📄 File: `IMMEDIATE_TRANSFER_IMPLEMENTATION.md`

**Contains**:
- Detailed breakdown of all 7 steps
- Code snippets for each step
- API request/response examples
- Database queries for each operation
- Error handling reference
- Testing checklist
- Implementation priority

---

## 🔄 Step-by-Step Breakdown (from Sequence Diagram)

### **Step 1: Load Beneficiaries** (Frontend → Backend)
```
User clicks "Send Money"
  ↓
GET /api/beneficiaries/list
Headers: X-User-Id, Authorization
  ↓
SELECT * FROM beneficiaries WHERE user_id = ?
  ↓
Return list to frontend
  ↓
Frontend displays: Name, Method, Masked Account/UPI
```

### **Step 2: Validate Amount Input** (Frontend validation)
```
User enters amount: "500"
  ↓
Frontend validates:
  • Is number? ✓
  • Between $10-$50,000? ✓
  • No special characters? ✓
  ↓
Enable "Continue" button
```

### **Step 3: Get Exchange Rate** (Backend → Chimoney)
```
User clicks "Continue"
  ↓
GET /api/transfers/exchange-rate?amount=500
  ↓
Backend calls:
  Chimoney: GET /v0.2.4/payouts/rates?countryTo=IN
  ↓
  Chimoney returns: { rates: { USD: { rate: 83.25 } } }
  ↓
Backend calculates:
  • target_amount = 500 × 83.25 = 41,625
  • fee = 500 × 0.5% = 2.50
  • total = 502.50
  ↓
Return breakdown to frontend
  ↓
Frontend shows:
  You Send: $502.50
  Rate: 1 USD = ₹83.25
  Recipient Gets: ₹41,625
```

### **Step 4: Review Details** (Frontend display)
```
User reviews confirmation screen:
  ┌─────────────────────────┐
  │ From: You (USD)          │
  │ To: Amit Kumar (UPI)     │
  │ Amount: $502.50          │
  │ Receives: ₹41,625        │
  │ Fee: $2.50               │
  │ Time: 2-5 min            │
  │ ⚠️ Cannot be reversed     │
  └─────────────────────────┘
  ↓
User clicks "Confirm & Send"
```

### **Step 5: Create Transfer Record** (Backend → Database)
```
POST /api/transfers/initiate
  ↓
Backend validates:
  • User authorized? ✓
  • Amount valid? ✓
  • Beneficiary exists? ✓
  ↓
INSERT INTO transfers (
  user_id, beneficiary_id,
  source_amount: 502.50,
  target_amount: 41625,
  exchange_rate: 83.25,
  fee_amount: 2.50,
  status: 'pending'
)
  ↓
Returns transfer_id: "txn-xyz-789"
```

### **Step 6: Execute Transfer** (Backend → Chimoney)
```
POST /api/transfers/execute
Body: { transfer_id: "txn-xyz-789" }
  ↓
Backend:
  1. UPDATE transfers SET status='processing'
  2. SELECT beneficiary details
  3. Decrypt account/UPI (server-side)
  4. POST to Chimoney /v0.2.4/payouts/bank
     {
       amount: 500,
       currency: "USD",
       account_number: "1234567890",
       bank_code: "HDFC0000123",
       fullname: "Amit Kumar",
       country: "NG"
     }
  5. Receive Chimoney response:
     {
       id: "chi_9876543210",
       status: "pending",
       received_amount: 41625
     }
  6. UPDATE transfers SET
       chimoney_transaction_id = "chi_...",
       executed_at = NOW()
  ↓
Returns success response with transaction ID
```

### **Step 7: Show Receipt** (Frontend display)
```
Frontend receives success response
  ↓
Hide loading spinner
  ↓
Display receipt:
  ✓ Transfer Sent Successfully!

  Transaction ID: TXN_USD_INR_2026_028_K7X9M
  Reference: CHI-9876543210

  From: You → Amit Kumar (UPI)
  Sent: $502.50 USD
  Received: ₹41,625 INR
  Status: Processing (2-5 min)
  Time: Feb 28, 2026 12:46 PM

  [Share] [Done] [View History]
```

---

## 🗄️ Database Changes

### New Tables Required:

**transfers table**
```sql
CREATE TABLE transfers (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  beneficiary_id UUID REFERENCES beneficiaries(id),
  source_amount DECIMAL(15,2),
  source_currency VARCHAR(3),
  target_amount DECIMAL(15,2),
  target_currency VARCHAR(3),
  exchange_rate DECIMAL(10,4),
  fee_amount DECIMAL(15,2),
  fee_percentage DECIMAL(5,3),
  chimoney_transaction_id VARCHAR(255),
  chimoney_reference VARCHAR(255),
  status VARCHAR(50),  -- pending, processing, completed, failed
  initiated_at TIMESTAMP,
  executed_at TIMESTAMP,
  completed_at TIMESTAMP,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**transfer_status_log table**
```sql
CREATE TABLE transfer_status_log (
  id UUID PRIMARY KEY,
  transfer_id UUID REFERENCES transfers(id),
  old_status VARCHAR(50),
  new_status VARCHAR(50),
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMP
);
```

---

## 🔗 API Endpoints Created

| Method | Endpoint | Purpose | Chimoney Call |
|--------|----------|---------|---------------|
| GET | `/api/transfers/exchange-rate` | Get live FX rate | ✅ GET /rates |
| POST | `/api/transfers/initiate` | Create transfer record | ❌ No |
| POST | `/api/transfers/execute` | Execute transfer | ✅ POST /payouts/bank |
| GET | `/api/transfers/history` | List transfers (future) | ❌ No |

---

## 📱 Frontend Components Created

| Component | Purpose | States |
|-----------|---------|--------|
| `TransferInitiation` | Select beneficiary, enter amount | form, rate-loaded, error |
| `TransferReview` | Confirm transfer details | review, loading, error |
| `TransferReceipt` | Show success confirmation | success, error |

---

## 🚀 Next Steps (Implementation Order)

```
1️⃣  CREATE DATABASE SCHEMA
    └─ Add transfers & transfer_status_log tables
       Estimated: 30 mins

2️⃣  BUILD CHIMONEY SERVICES
    ├─ services/chimoney/rateService.js
    └─ services/chimoney/payoutService.js
       Estimated: 1 hour

3️⃣  BUILD BACKEND APIS
    ├─ pages/api/transfers/exchange-rate.js
    ├─ pages/api/transfers/initiate.js
    └─ pages/api/transfers/execute.js
       Estimated: 2 hours

4️⃣  BUILD FRONTEND COMPONENTS
    ├─ TransferInitiation.js
    ├─ TransferReview.js
    └─ TransferReceipt.js
       Estimated: 2 hours

5️⃣  INTEGRATION & TESTING
    ├─ Wire into VittaApp
    ├─ End-to-end testing
    └─ Chat intent integration
       Estimated: 1 hour

    TOTAL: ~6.5 hours (1 day)
```

---

## 📋 Testing Strategy

### Unit Tests
- Rate calculation
- Amount validation
- Fee calculation
- Beneficiary authorization

### Integration Tests
- Get rate from Chimoney
- Create transfer record
- Execute transfer with Chimoney
- Error handling

### E2E Tests
- Select beneficiary
- Enter amount
- Get rate
- Review details
- Execute transfer
- See receipt

---

## ⚠️ Error Handling Examples

```javascript
// Client-side errors
"Amount must be between $10 and $50,000"
"Please select a beneficiary"

// Server-side validation
400 BAD_REQUEST: Invalid amount
400 BAD_REQUEST: Beneficiary not found
401 UNAUTHORIZED: User not authenticated

// Chimoney errors
400 CHIMONEY_ERROR: Account not found
400 CHIMONEY_ERROR: Transfer limit exceeded
```

---

## 📚 Related Documentation

- ✅ `BENEFICIARY_CREATION_ALL_CHANGES.md` - How beneficiaries work
- ✅ `IMMEDIATE_TRANSFER_SEQUENCE.puml` - Sequence diagram
- ✅ `IMMEDIATE_TRANSFER_IMPLEMENTATION.md` - Detailed implementation guide
- ✅ `TRANSFER_FLOW_DIAGRAMS.md` - All flow diagrams
- 📝 `supabase/schema.sql` - Database schema (to update)

---

## 💡 Key Design Decisions

1. **Fee Model**: 0.5% flat fee, charged to user
2. **Minimum Amount**: $10 USD
3. **Maximum Amount**: $50,000 USD
4. **Settlement Time**: 2-5 min (UPI), 1-2 days (Bank)
5. **Status Tracking**: pending → processing → completed
6. **Decryption**: Server-side only, never in logs
7. **Transactions**: DB transaction for execute step
8. **Error Mapping**: Chimoney errors → user-friendly messages

---

## ✅ Quality Checklist

Before marking as "Complete":

- [ ] All 3 APIs working (rate, initiate, execute)
- [ ] All 3 components rendering
- [ ] Database schema applied
- [ ] Chimoney API credentials configured
- [ ] Error messages user-friendly
- [ ] Mobile responsive
- [ ] End-to-end transfer tested
- [ ] Receipt displaying correctly
- [ ] Beneficiary details masked properly
- [ ] Transaction logs in database

---

## 📞 Ready to Implement?

Based on the design documents created:

### What you have:
✅ PlantUML sequence diagram (`IMMEDIATE_TRANSFER_SEQUENCE.puml`)
✅ Detailed implementation guide (`IMMEDIATE_TRANSFER_IMPLEMENTATION.md`)
✅ Flow diagrams & documentation (`TRANSFER_FLOW_DIAGRAMS.md`)
✅ Database schema specification
✅ API endpoint specifications
✅ Frontend component specifications
✅ Error handling guide
✅ Testing checklist

### What to build next:
1. Database schema (`supabase/schema.sql`)
2. Chimoney service wrappers
3. Backend API routes (3 endpoints)
4. Frontend components (3 screens)
5. Integration & testing

**Ready to start with the database schema?**

