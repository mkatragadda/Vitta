# Transfer + Plaid Integration Guide

**How to integrate Plaid bank accounts with Chimoney transfers**

---

## 🎯 Complete Payment Flow with Plaid

```
┌─────────────────────────────────────────────────────────────┐
│                    TRANSFER FLOW v2                          │
│              (WITH PLAID SOURCE ACCOUNT)                     │
└─────────────────────────────────────────────────────────────┘

Step 1: User has Plaid-linked bank account(s)
├─ Account: "Checking - Jane Doe"
├─ Routing: 121000248 (Bank of America)
└─ Account: ****1234 (last 4 digits)

Step 2: User selects Plaid account to transfer FROM
└─ Display list of linked Plaid accounts
   "Which account do you want to send from?"

Step 3: User selects beneficiary to transfer TO
└─ Display list of saved beneficiaries
   "Which recipient should receive the money?"

Step 4: User enters amount to send
└─ Amount validates (min $10, max $50,000)

Step 5: System gets exchange rate
└─ Chimoney API: GET /rates

Step 6: CONFIRMATION MODAL shows BOTH accounts
┌─────────────────────────────────────┐
│ FROM (Source):                      │
│ Your Account: Checking - Jane Doe   │
│ Bank: Bank of America               │
│ Account: ****1234                   │
│ Routing: 121000248                  │
├─────────────────────────────────────┤
│ TO (Destination):                   │
│ Recipient: Amit Kumar               │
│ Bank: HDFC Bank                     │
│ Account: ****7890                   │
│ IFSC: HDFC0000123                   │
├─────────────────────────────────────┤
│ Amount Breakdown:                   │
│ You Send: $502.50                   │
│ Fee: $2.50                          │
│ Rate: 1 USD = ₹83.25                │
│ Recipient Gets: ₹41,625             │
└─────────────────────────────────────┘

Step 7: Final confirmation modal
└─ "Yes, Send from Bank of America to Amit Kumar"

Step 8: API calls Chimoney with BOTH accounts:
└─ POST /v0.2.4/payouts/bank {
     // SOURCE (from Plaid)
     source_account: "1234567890",
     source_routing: "121000248",
     source_account_holder: "Jane Doe",

     // DESTINATION (to beneficiary)
     amount: 500,
     account_number: "9876543210",
     bank_code: "HDFC0000123",
     fullname: "Amit Kumar"
   }
```

---

## 📊 Data Architecture

### **User's Plaid Accounts** (Source - WHERE money comes FROM)
```javascript
// Table: plaid_linked_accounts
{
  id: "uuid",
  user_id: "user-uuid",

  // From Plaid API
  plaid_account_id: "account_xyz",
  account_holder_name: "Jane Doe",
  account_type: "depository",  // checking, savings
  subtype: "checking",
  name: "Checking Account",
  official_name: "Bank of America Checking",

  // Bank details (needed for transfers)
  account_number: "1234567890",     // Last 4: ****1234
  routing_number: "121000248",      // US routing number
  bank_name: "Bank of America",

  // Status
  verified: true,
  can_transfer_out: true,

  created_at: "2026-02-28T00:00:00Z"
}
```

### **Beneficiary Accounts** (Destination - WHERE money goes TO)
```javascript
// Table: beneficiaries (already exists)
{
  id: "uuid",
  user_id: "user-uuid",

  // Recipient info
  name: "Amit Kumar",
  phone: "9876543210",
  relationship: "family",

  // Bank details (encrypted)
  recipient_bank_account_encrypted: "...",  // 9876543210
  recipient_ifsc_encrypted: "...",           // HDFC0000123
  recipient_bank_name: "HDFC Bank",

  // Status
  verification_status: "verified",

  created_at: "2026-02-28T00:00:00Z"
}
```

### **Transfer Record** (WITH source account info)
```javascript
// Table: transfers (updated)
{
  id: "txn-uuid",
  user_id: "user-uuid",

  // Source (Plaid account)
  plaid_account_id: "account_xyz",  // NEW

  // Destination (Beneficiary)
  beneficiary_id: "ben-uuid",

  // Amounts
  source_amount: 502.50,
  target_amount: 41625.00,
  exchange_rate: 83.25,
  fee_amount: 2.50,

  // Chimoney reference
  chimoney_transaction_id: "chi_123456",

  // Status
  status: "processing",

  created_at: "2026-02-28T12:46:00Z"
}
```

---

## 🔄 Updated Transfer Initiation Flow

### **Step 1: Get User's Plaid Accounts**

```javascript
// Frontend calls:
GET /api/plaid/accounts
Headers: {
  Authorization: Bearer token,
  X-User-Id: user_uuid
}

// Backend does:
SELECT
  id,
  name,
  official_name,
  account_type,
  subtype,
  account_number,  // SELECT last 4 digits only
  bank_name
FROM plaid_linked_accounts
WHERE user_id = ? AND verified = true AND can_transfer_out = true
ORDER BY created_at DESC;

// Response:
{
  "success": true,
  "accounts": [
    {
      "id": "account_xyz",
      "name": "Checking Account",
      "official_name": "Bank of America Checking",
      "bank_name": "Bank of America",
      "account_display": "****1234",  // Masked
      "type": "checking"
    },
    {
      "id": "account_abc",
      "name": "Savings Account",
      "official_name": "Bank of America Savings",
      "bank_name": "Bank of America",
      "account_display": "****5678",
      "type": "savings"
    }
  ]
}
```

**Frontend component:**
```javascript
// TransferInitiation.js
const [plaidAccounts, setPlaidAccounts] = useState([]);
const [selectedPlaidAccount, setSelectedPlaidAccount] = useState(null);

useEffect(() => {
  const fetchPlaidAccounts = async () => {
    const response = await fetch('/api/plaid/accounts', {
      headers: {
        'X-User-Id': user.id
      }
    });
    const { accounts } = await response.json();
    setPlaidAccounts(accounts);
    if (accounts.length > 0) {
      setSelectedPlaidAccount(accounts[0].id);  // Default to first
    }
  };
  fetchPlaidAccounts();
}, [user.id]);

// Render dropdown:
<div>
  <label>Send from which account?</label>
  <select
    value={selectedPlaidAccount}
    onChange={(e) => setSelectedPlaidAccount(e.target.value)}
  >
    {plaidAccounts.map(account => (
      <option key={account.id} value={account.id}>
        {account.bank_name} - {account.name} ({account.account_display})
      </option>
    ))}
  </select>
</div>
```

---

### **Step 2: Select Beneficiary** (unchanged)

```javascript
// Already implemented
// Shows list of saved beneficiaries with masked account/UPI
```

---

### **Step 3: Get Exchange Rate & Fee** (unchanged)

```javascript
GET /api/transfers/exchange-rate?amount=500
// Returns: exchange_rate, target_amount, fee_amount
```

---

### **Step 4: Review Details** (UPDATED - NOW SHOWS BOTH ACCOUNTS)

```javascript
// TransferReview.js - NOW INCLUDES SOURCE PLAID ACCOUNT

const TransferReview = ({
  selectedPlaidAccount,
  beneficiary,
  transfer,
  onConfirm,
  onEdit
}) => {
  return (
    <div className="w-full max-w-md mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">✓ Review Transfer</h2>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">

        {/* SOURCE ACCOUNT (FROM - Plaid) */}
        <div className="mb-6">
          <h3 className="text-sm font-bold text-gray-600 uppercase mb-4">
            💳 Send FROM Your Account
          </h3>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">Bank</p>
            <p className="text-lg font-bold text-gray-900">
              {selectedPlaidAccount.bank_name}
            </p>

            <p className="text-sm text-gray-600 mt-3">Account</p>
            <p className="text-lg font-mono text-gray-900">
              {selectedPlaidAccount.name} ({selectedPlaidAccount.account_display})
            </p>

            <p className="text-xs text-gray-500 mt-3">
              Routing: {selectedPlaidAccount.routing_number}
            </p>
          </div>
        </div>

        <div className="border-t border-gray-200 my-6" />

        {/* DESTINATION ACCOUNT (TO - Beneficiary) */}
        <div className="mb-6">
          <h3 className="text-sm font-bold text-gray-600 uppercase mb-4">
            🏦 Send TO Recipient
          </h3>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">Recipient Name</p>
            <p className="text-lg font-bold text-gray-900">
              {beneficiary.name}
            </p>

            <p className="text-sm text-gray-600 mt-3">Bank</p>
            <p className="text-lg font-bold text-gray-900">
              {beneficiary.bank_name}
            </p>

            <p className="text-sm text-gray-600 mt-3">Account Number</p>
            <p className="text-lg font-mono text-gray-900 flex items-center gap-2">
              {beneficiary.account_masked}
              <span className="text-xs text-gray-500">(masked)</span>
            </p>

            <p className="text-sm text-gray-600 mt-3">IFSC Code</p>
            <p className="text-lg font-mono text-gray-900">
              {beneficiary.ifsc}
            </p>
          </div>
        </div>

        <div className="border-t border-gray-200 my-6" />

        {/* AMOUNT BREAKDOWN */}
        <div>
          <h3 className="text-sm font-bold text-gray-600 uppercase mb-4">
            💰 Amount Breakdown
          </h3>

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">You Send:</span>
              <span className="font-bold">${transfer.source_amount} USD</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600">Exchange Rate:</span>
              <span className="font-bold">1 USD = ₹{transfer.exchange_rate}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600">Transfer Fee (0.5%):</span>
              <span className="font-bold text-red-600">-${transfer.fee_amount}</span>
            </div>

            <div className="border-t border-gray-200 my-2" />

            <div className="flex justify-between text-lg">
              <span className="font-bold text-gray-900">Total to Pay:</span>
              <span className="font-bold text-gray-900">
                ${transfer.source_amount + transfer.fee_amount} USD
              </span>
            </div>

            <div className="flex justify-between text-lg">
              <span className="font-bold text-gray-900">Recipient Gets:</span>
              <span className="font-bold text-green-600">
                ₹{transfer.target_amount.toLocaleString('en-IN')} INR
              </span>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 my-6" />

        {/* SETTLEMENT INFO */}
        <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2">
          <p className="text-xs text-blue-800">
            ⏱️ Settlement Time: 2-5 business days (NEFT transfer)
          </p>
        </div>

        {/* WARNING */}
        <div className="bg-amber-50 border border-amber-200 rounded px-3 py-2 mt-4">
          <p className="text-xs text-amber-800">
            ⚠️ Once confirmed, this transfer cannot be reversed.
            Please review all details carefully.
          </p>
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="grid grid-cols-3 gap-3">
        <button onClick={onEdit} className="border border-gray-300 ...">
          ← Edit
        </button>
        <button onClick={onConfirm} className="col-span-1 bg-green-600 ...">
          ✓ Confirm
        </button>
        <button onClick={onCancel} className="border border-gray-300 ...">
          Cancel
        </button>
      </div>
    </div>
  );
};
```

---

## 🚀 Updated API: POST /api/transfers/execute

### **Request (WITH Plaid account source)**

```javascript
POST /api/transfers/execute
Headers: {
  Authorization: Bearer token,
  X-User-Id: user_uuid,
  Content-Type: application/json
}

Body: {
  "transfer_id": "txn-xyz-789",
  "plaid_account_id": "account_xyz"  // NEW - which Plaid account to send from
}
```

### **Backend Logic (WITH Plaid + Beneficiary)**

```javascript
export default async function handler(req, res) {
  const { transfer_id, plaid_account_id } = req.body;
  const user_id = req.headers['x-user-id'];

  try {
    // Step 1: Get transfer details
    const transfer = await db.transfers.findOne({
      where: { id: transfer_id, user_id }
    });

    // Step 2: Get Plaid account (SOURCE)
    const plaidAccount = await db.plaid_linked_accounts.findOne({
      where: { id: plaid_account_id, user_id }
    });

    if (!plaidAccount) {
      return res.status(400).json({
        error_code: 'INVALID_SOURCE_ACCOUNT',
        error_message: 'Selected account not found'
      });
    }

    // Step 3: Get beneficiary (DESTINATION)
    const beneficiary = await db.beneficiaries.findOne({
      where: { id: transfer.beneficiary_id, user_id }
    });

    // Step 4: Decrypt beneficiary sensitive fields
    const decrypted = {
      account: decrypt(beneficiary.recipient_bank_account_encrypted, KEY),
      ifsc: decrypt(beneficiary.recipient_ifsc_encrypted, KEY)
    };

    // Step 5: Update transfer status to processing
    await db.transfers.update(
      { status: 'processing' },
      { where: { id: transfer_id } }
    );

    // Step 6: Call Chimoney with BOTH accounts
    const chimoney_response = await chimoney.payouts.bank({
      // SOURCE (User's Plaid account)
      source_account_number: plaidAccount.account_number,
      source_routing_number: plaidAccount.routing_number,
      source_account_holder: plaidAccount.account_holder_name,
      source_account_type: plaidAccount.subtype,
      source_bank_name: plaidAccount.bank_name,

      // DESTINATION (Recipient's bank account)
      amount: transfer.source_amount,
      currency: 'USD',
      account_number: decrypted.account,
      bank_code: decrypted.ifsc,
      fullname: beneficiary.name,
      country: 'NG',  // India

      // Transfer metadata
      narration: 'International transfer via Vitta',
      reference: `TXN_${user_id.slice(0,8)}_${Date.now()}`,
      subAccount: process.env.CHIMONEY_SUB_ACCOUNT
    });

    if (!chimoney_response.success) {
      throw new Error(`Chimoney error: ${chimoney_response.error.message}`);
    }

    // Step 7: Update transfer with Chimoney reference + Plaid account
    await db.transfers.update({
      status: 'processing',
      plaid_account_id,  // Store which Plaid account was used
      chimoney_transaction_id: chimoney_response.data.id,
      chimoney_reference: chimoney_response.data.reference,
      executed_at: new Date()
    }, {
      where: { id: transfer_id }
    });

    // Step 8: Return success response
    return res.json({
      success: true,
      transfer_id,
      plaid_account_id,
      beneficiary_id: transfer.beneficiary_id,
      chimoney_transaction_id: chimoney_response.data.id,
      status: 'processing',
      executed_at: new Date(),
      expected_delivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)  // 5 days
    });

  } catch (error) {
    // Handle errors
    return res.status(400).json({
      success: false,
      error_code: 'TRANSFER_FAILED',
      error_message: error.message,
      suggestion: 'Please try again or contact support'
    });
  }
}
```

---

## 📋 Database Schema Updates

### **Update transfers table**
```sql
ALTER TABLE transfers ADD COLUMN plaid_account_id UUID REFERENCES plaid_linked_accounts(id);

-- When transfer is deleted, we can keep the reference for audit
-- Or use ON DELETE SET NULL if you want to clean up
```

### **Plaid accounts table** (if not already exists)
```sql
CREATE TABLE plaid_linked_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Plaid identifiers
  plaid_account_id VARCHAR(255) UNIQUE NOT NULL,
  plaid_institution_id VARCHAR(255),

  -- Account details
  account_holder_name TEXT NOT NULL,
  account_type VARCHAR(50),  -- depository, credit, loan
  subtype VARCHAR(50),       -- checking, savings, credit card
  name TEXT NOT NULL,        -- "Checking Account"
  official_name TEXT,        -- "Bank of America Checking"

  -- Bank details (needed for transfers)
  account_number VARCHAR(255) NOT NULL,
  routing_number VARCHAR(255),
  bank_name TEXT,

  -- Status
  verified BOOLEAN DEFAULT false,
  can_transfer_out BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_plaid_user_id ON plaid_linked_accounts(user_id);
CREATE INDEX idx_plaid_account_id ON plaid_linked_accounts(plaid_account_id);
```

---

## 🔐 Security Considerations

### **What gets encrypted?**
```javascript
// DON'T encrypt these (safe to store):
✅ account_holder_name
✅ routing_number
✅ bank_name
✅ account_display (****1234)

// DO encrypt these (sensitive):
❌ full account_number (encrypt with AES-256)
// Currently stored unencrypted from Plaid - consider encrypting for production
```

### **What Plaid provides?**
```javascript
// From Plaid API:
{
  "accounts": [
    {
      "account_id": "vzeNDwK7KQIm4yEsVnL2H...",  // Use as plaid_account_id
      "name": "Checking",
      "official_name": "Bank of America Checking",
      "type": "depository",
      "subtype": "checking",
      "mask": "1234",  // Last 4 digits
      "balances": {
        "available": 50000,
        "current": 50000,
        "limit": null
      }
    }
  ],
  "institution": {
    "institution_id": "ins_3",  // Bank of America
    "name": "Bank of America",
    "routing_numbers": ["121000248"],  // Use as routing_number
    "country_codes": ["US"]
  }
}
```

---

## 📱 Complete Component Tree

```
TransferInitiation
├─ Step 1: Select Plaid Account (SOURCE)
│  └─ API: GET /api/plaid/accounts
│     Shows dropdown of linked accounts
│
├─ Step 2: Select Beneficiary (DESTINATION)
│  └─ API: GET /api/beneficiaries/list
│     Shows list of saved recipients
│
├─ Step 3: Enter Amount
│  └─ Client-side validation
│
├─ Step 4: Get Exchange Rate
│  └─ API: GET /api/transfers/exchange-rate
│
└─ Proceed to TransferReview
   │
   ├─ Shows BOTH accounts:
   │  ├─ Source: Plaid account details (masked)
   │  └─ Destination: Beneficiary details (masked)
   │
   ├─ Shows amounts & breakdown
   │
   └─ Buttons: Edit, Confirm, Cancel

TransferReview (onConfirm)
├─ Shows FinalConfirmationModal
└─ API: POST /api/transfers/execute
   └─ Sends plaid_account_id + transfer_id
   └─ Backend calls Chimoney with BOTH accounts
   └─ Returns TransferReceipt

TransferReceipt
├─ Shows transaction ID
├─ Shows source & destination
├─ Shows amounts
└─ Shows status: "Processing"
```

---

## ✅ Implementation Checklist

- [ ] Get Plaid accounts from existing integration
- [ ] Create API endpoint: `GET /api/plaid/accounts`
- [ ] Update `TransferInitiation.js` to include Plaid account selection
- [ ] Update `TransferReview.js` to show both source & destination accounts
- [ ] Update database schema: Add `plaid_account_id` to transfers
- [ ] Update `POST /api/transfers/execute` to accept and use `plaid_account_id`
- [ ] Update Chimoney API call to include source account details
- [ ] Test with real Plaid accounts
- [ ] Mask account numbers in display
- [ ] Verify Chimoney accepts source account details

---

## 🚀 Key Insights

**The complete payment flow is:**

```
User's Plaid Account (SOURCE)
  ↓
User sends money FROM their US bank account
  ↓
Chimoney API processes transfer
  ↓
Recipient's Bank Account in India (DESTINATION)
  ↓
Recipient receives money in their Indian account
```

**Both accounts must be shown in confirmation modal for clarity and compliance.**

