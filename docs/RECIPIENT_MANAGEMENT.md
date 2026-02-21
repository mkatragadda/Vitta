# Recipient Management Design (Chimoney API Verification)

**Verification Approach**: Recipients are verified directly via Chimoney API without requiring user OTP input. Since Vitta controls both pull (US bank) and push (India recipient), the verification is server-side and automatic. Chimoney validates the recipient details (name, phone/account) and returns verification status before storage.

---

## 1. Recipient Storage Flow

```
User: "Send $500 to Amit. His number is +91-9876543210"
    ↓
Backend: Validate recipient details
├─ ✅ Phone format valid (+91 prefix, 10 digits)
├─ ✅ Not duplicate for this user
└─ ✅ Recipient not already verified
    ↓
Backend: Verify with Chimoney API
├─ Call: POST /recipients/verify
├─ Payload: { name, phone, payment_method }
└─ Response: { verified: true, recipient_id, account_type }
    ↓
Backend: Encrypt and persist recipient
├─ Store: name, phone, payment_method, chimoney_recipient_id
├─ Set: verified_at = now(), created_at = now()
└─ Ready for future transfers
    ↓
Chat: "Ready to send ₹41,750 to Amit?"
    ↓
User confirms → Transfer executes
```

---

## 2. Database Schema

### Recipients Table

```sql
CREATE TABLE recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),

  -- Recipient contact info
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),  -- For UPI (+91-XXXXXXXXXX)
  account_number VARCHAR(20),  -- For Bank Transfer
  ifsc_code VARCHAR(11),  -- For Bank Transfer

  -- Payment method used
  payment_method VARCHAR(50) NOT NULL,  -- 'upi' or 'bank_transfer'

  -- Chimoney Verification
  chimoney_recipient_id VARCHAR(255),  -- Unique ID from Chimoney API
  verified_at TIMESTAMP,  -- When verified via Chimoney
  verification_status VARCHAR(50) DEFAULT 'pending',  -- 'pending', 'verified', 'failed'
  verification_error TEXT,  -- Error message if verification failed

  -- Usage tracking
  transfer_count INT DEFAULT 0,
  last_transfer_at TIMESTAMP,
  total_amount_sent DECIMAL(12,2) DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  -- Constraints
  UNIQUE(user_id, phone),  -- One phone per user for UPI
  UNIQUE(user_id, account_number, ifsc_code),  -- One account per user
  UNIQUE(chimoney_recipient_id)  -- Chimoney IDs unique across system
);

-- Indexes
CREATE INDEX idx_recipients_user ON recipients(user_id);
CREATE INDEX idx_recipients_phone ON recipients(user_id, phone);
CREATE INDEX idx_recipients_account ON recipients(user_id, account_number);
CREATE INDEX idx_recipients_chimoney ON recipients(chimoney_recipient_id);
CREATE INDEX idx_recipients_last_transfer ON recipients(last_transfer_at);

-- RLS: Users can only see their own recipients
ALTER TABLE recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_isolation ON recipients
  USING (user_id = auth.uid());
```

---

## 3. Recipient APIs

### 3.1 Add/Store Recipient (with Chimoney Verification)

```typescript
// POST /api/transfers/recipients/add

import chimoney from '@/services/chimoney/chimeney-client';

export default async function handler(req, res) {
  const { name, phone, account_number, ifsc_code, payment_method } = req.body;
  const userId = req.user.id;

  try {
    // Validate input
    if (!name || !payment_method) {
      return res.status(400).json({
        error: 'MISSING_FIELDS',
        message: 'Name and payment_method are required'
      });
    }

    // Validate phone format for UPI
    if (payment_method === 'upi' && phone) {
      const phoneRegex = /^\+91[6-9]\d{9}$/;
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({
          error: 'INVALID_PHONE',
          message: 'Invalid Indian phone number. Format: +91XXXXXXXXXX'
        });
      }
    }

    // Check if recipient already exists for this user
    const existing = await db
      .from('recipients')
      .select('id, chimoney_recipient_id')
      .eq('user_id', userId)
      .eq('phone', phone)
      .eq('payment_method', payment_method)
      .single();

    if (existing.data) {
      // Already stored and verified, return it
      if (existing.data.verification_status === 'verified') {
        return res.status(200).json({
          success: true,
          already_exists: true,
          recipient_id: existing.data.id,
          message: 'This recipient is already in your list'
        });
      }
    }

    // Step 1: Verify recipient with Chimoney API
    let chimmoneyVerification;
    try {
      chimmoneyVerification = await chimoney.recipients.verify({
        name: name,
        phone: payment_method === 'upi' ? phone : null,
        account_number: payment_method === 'bank_transfer' ? account_number : null,
        ifsc_code: payment_method === 'bank_transfer' ? ifsc_code : null,
        payment_method: payment_method
      });
    } catch (chimmonyError) {
      console.error('[Chimoney Verification] Error:', chimmonyError);
      return res.status(400).json({
        error: 'VERIFICATION_FAILED',
        message: `Recipient verification failed: ${chimmonyError.message}`,
        details: chimmonyError.response?.data || {}
      });
    }

    if (!chimmoneyVerification.verified) {
      return res.status(400).json({
        error: 'VERIFICATION_FAILED',
        message: 'Recipient could not be verified. Please check the details.',
        details: chimmoneyVerification.error_message
      });
    }

    // Step 2: Store new recipient with Chimoney ID
    const newRecipient = await db
      .from('recipients')
      .insert({
        user_id: userId,
        name: name,
        phone: payment_method === 'upi' ? phone : null,
        account_number: payment_method === 'bank_transfer' ? account_number : null,
        ifsc_code: payment_method === 'bank_transfer' ? ifsc_code : null,
        payment_method: payment_method,
        chimoney_recipient_id: chimmoneyVerification.recipient_id,
        verified_at: new Date().toISOString(),
        verification_status: 'verified',
        created_at: new Date().toISOString()
      })
      .select('*')
      .single();

    res.status(201).json({
      success: true,
      recipient_id: newRecipient.data.id,
      message: `${name} added and verified`,
      recipient: {
        id: newRecipient.data.id,
        name: newRecipient.data.name,
        phone: newRecipient.data.phone,
        payment_method: newRecipient.data.payment_method,
        verified_at: newRecipient.data.verified_at
      }
    });

  } catch (error) {
    console.error('[Recipient Add] Error:', error);
    res.status(500).json({
      error: 'ADD_RECIPIENT_FAILED',
      message: 'Failed to add recipient',
      details: error.message
    });
  }
}
```

### 3.2 Get User's Recipients

```typescript
// GET /api/transfers/recipients

export default async function handler(req, res) {
  const userId = req.user.id;

  try {
    const recipients = await db
      .from('recipients')
      .select('*')
      .eq('user_id', userId)
      .order('last_transfer_at', { ascending: false });

    res.status(200).json({
      success: true,
      count: recipients.data.length,
      recipients: recipients.data.map(r => ({
        id: r.id,
        name: r.name,
        phone: r.phone,
        payment_method: r.payment_method,
        transfer_count: r.transfer_count,
        last_transfer_at: r.last_transfer_at,
        total_sent: r.total_amount_sent
      }))
    });

  } catch (error) {
    console.error('[Get Recipients] Error:', error);
    res.status(500).json({
      error: 'GET_RECIPIENTS_FAILED',
      message: 'Failed to fetch recipients'
    });
  }
}
```

### 3.3 Update Recipient (Track Usage)

```typescript
// POST /api/transfers/recipients/:id/track

// Called after successful transfer
export default async function handler(req, res) {
  const { recipientId } = req.body;
  const { amount } = req.body;
  const userId = req.user.id;

  try {
    // Update transfer count and total amount
    const updated = await db
      .from('recipients')
      .update({
        transfer_count: db.raw('transfer_count + 1'),
        total_amount_sent: db.raw(`total_amount_sent + ${amount}`),
        last_transfer_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', recipientId)
      .eq('user_id', userId)
      .select('*')
      .single();

    res.status(200).json({
      success: true,
      recipient: updated.data
    });

  } catch (error) {
    console.error('[Track Recipient] Error:', error);
    res.status(500).json({
      error: 'TRACK_FAILED',
      message: 'Failed to update recipient'
    });
  }
}
```

### 3.4 Delete Recipient

```typescript
// DELETE /api/transfers/recipients/:id

export default async function handler(req, res) {
  const { id } = req.query;
  const userId = req.user.id;

  try {
    await db
      .from('recipients')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    res.status(200).json({
      success: true,
      message: 'Recipient removed'
    });

  } catch (error) {
    console.error('[Delete Recipient] Error:', error);
    res.status(500).json({
      error: 'DELETE_FAILED',
      message: 'Failed to delete recipient'
    });
  }
}
```

### 3.5 Chimoney Recipient Verification API

**Chimoney Endpoint**: POST `/v1/recipients/verify`

**Request**:
```json
{
  "name": "Amit Kumar",
  "phone": "+91-9876543210",  // For UPI
  "account_number": "1234567890",  // For Bank Transfer
  "ifsc_code": "HDFC0001234",  // For Bank Transfer
  "payment_method": "upi"  // or "bank_transfer"
}
```

**Success Response (200)**:
```json
{
  "verified": true,
  "recipient_id": "chim_rec_xyz123",
  "account_type": "upi",
  "name": "Amit Kumar",
  "account_valid": true
}
```

**Failure Response (400)**:
```json
{
  "verified": false,
  "error_message": "Invalid phone number format",
  "error_code": "INVALID_PHONE"
}
```

**Key Points**:
- ✅ Chimoney validates recipient details on server-side
- ✅ No OTP sent to recipient (non-intrusive verification)
- ✅ Recipient ID returned for future transfers
- ✅ Verification happens synchronously before storage
- ⚠️ Handle rate limits: Retry with exponential backoff (1s, 2s, 4s max)
- ⚠️ Timeout: 30-second max for verification call

---

## 4. Chat Integration Flow

### Simple Recipient Collection

```
User: "Send $500 to Amit. His number is +91-9876543210"
    ↓
Chat parses intent and entities:
├─ Intent: send_money_international
├─ Amount: 500
├─ Recipient name: Amit
├─ Recipient phone: +91-9876543210
└─ Payment method: upi (auto-detected from phone)
    ↓
Chat → Backend: POST /api/transfers/recipients/add
    ↓
Backend: Store recipient
    ↓
Chat: "Ready to send ₹41,750 to Amit?"
    ↓
User: "Yes"
    ↓
Chat: Proceed with transfer
```

### Reuse Previous Recipient

```
User: "Send $300 to Amit"
    ↓
Chat recognizes "Amit" from previous transfers
    ↓
Chat → Backend: GET /api/transfers/recipients?name=Amit
    ↓
Backend: Returns Amit's stored details
    ↓
Chat: "Send ₹25,050 to Amit Kumar (+91-9876543210)?"
    ↓
User: "Yes"
    ↓
Transfer executes (no need to re-enter details)
```

---

## 5. Frontend Component

```typescript
// components/chat/RecipientForm.jsx

import React, { useState } from 'react';

export default function RecipientForm({
  onSubmit,
  previousRecipients = []
}) {
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [newRecipientName, setNewRecipientName] = useState('');
  const [newRecipientPhone, setNewRecipientPhone] = useState('');
  const [useNew, setUseNew] = useState(false);

  const handleSubmit = () => {
    if (selectedRecipient) {
      onSubmit(selectedRecipient);
    } else if (newRecipientName && newRecipientPhone) {
      onSubmit({
        name: newRecipientName,
        phone: newRecipientPhone,
        payment_method: 'upi'
      });
    }
  };

  return (
    <div className="space-y-4 border rounded-lg p-4">
      <h3 className="font-semibold">Who are you sending to?</h3>

      {/* Show previous recipients */}
      {previousRecipients.length > 0 && !useNew && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">Recent recipients:</p>
          {previousRecipients.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedRecipient(r)}
              className={`w-full text-left p-3 border rounded-lg ${
                selectedRecipient?.id === r.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <p className="font-medium">{r.name}</p>
              <p className="text-sm text-gray-600">{r.phone}</p>
              <p className="text-xs text-gray-500">
                Last sent: {new Date(r.last_transfer_at).toLocaleDateString()}
              </p>
            </button>
          ))}
          <button
            onClick={() => setUseNew(true)}
            className="w-full text-blue-600 text-sm py-2 border border-blue-200 rounded-lg hover:bg-blue-50"
          >
            + Add new recipient
          </button>
        </div>
      )}

      {/* New recipient form */}
      {(previousRecipients.length === 0 || useNew) && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={newRecipientName}
              onChange={(e) => setNewRecipientName(e.target.value)}
              placeholder="e.g., Amit Kumar"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Phone Number (India)
            </label>
            <input
              type="tel"
              value={newRecipientPhone}
              onChange={(e) => setNewRecipientPhone(e.target.value)}
              placeholder="+91-9876543210"
              className="w-full px-3 py-2 border rounded-lg font-mono"
            />
          </div>
          {useNew && previousRecipients.length > 0 && (
            <button
              onClick={() => setUseNew(false)}
              className="text-gray-600 text-sm"
            >
              ← Back to recent
            </button>
          )}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!selectedRecipient && !newRecipientName}
        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
      >
        Continue
      </button>
    </div>
  );
}
```

---

## 6. Transfer Flow Integration

```
STEP 1: Get recipient details (new or saved)
    ↓
STEP 2: Get FX rate quote from Chimoney
    ↓
STEP 3: Lock rate for 5 minutes
    ↓
STEP 4: Collect transfer confirmation
    ↓
STEP 5: Pull money from US bank (Plaid auth)
    ↓
STEP 6: Call Chimoney initiate transfer
    ↓
STEP 7: Update recipient tracking
    └─ transfer_count += 1
    └─ total_amount_sent += amount
    └─ last_transfer_at = now()
    ↓
STEP 8: Notify user
    └─ "₹41,750 sent to Amit Kumar"
```

---

## 7. Database Queries for Chat Context

```sql
-- Get top 3 recent recipients for suggestions
SELECT id, name, phone, last_transfer_at
FROM recipients
WHERE user_id = $1
ORDER BY last_transfer_at DESC NULLS LAST
LIMIT 3;

-- Get recipient by partial name match
SELECT id, name, phone, payment_method
FROM recipients
WHERE user_id = $1
  AND name ILIKE $2 || '%'
ORDER BY last_transfer_at DESC;

-- Show recipient stats
SELECT
  name,
  transfer_count,
  total_amount_sent,
  last_transfer_at
FROM recipients
WHERE user_id = $1
ORDER BY transfer_count DESC;
```

---

## 8. Security Notes

✅ **Data Security**:
- Recipient phone/account encrypted in Supabase
- RLS policies enforce user isolation
- No PII in logs

✅ **Validation**:
- Phone format validation (India-specific)
- Prevent duplicate recipients
- Sanitize name input

✅ **Privacy**:
- Users can delete recipients anytime
- Transfer history not tied to recipient ID (separate audit logs)
- Recipient data auto-cleaned after 1 year of no transfers (optional)

---

## 9. Summary

**Verification via Chimoney API**:
- ✅ Chimoney validates recipient details (name, phone, account)
- ✅ No OTP required (server-side verification only)
- ✅ Recipient ID stored for future transfers
- ✅ Verification happens synchronously during recipient creation

**Why No OTP**:
- Vitta pulls from user's own US bank account (authorized via Plaid)
- Vitta pushes to recipient in India (Vitta controls payment execution)
- Chimoney API provides validation without user interruption

**Benefits of This Approach**:
- **Fast Verification**: Server-side validation in ~1-2 seconds
- **No User Interruption**: No SMS OTP to recipient
- **Better UX**: Especially for repeat recipients (instant reuse)
- **Maintains Compliance**: Vitta controls both pull and push
- **Clear Audit Trail**: Verification timestamp and status tracked

**Recipient Workflow**:
1. **First Transfer**: User enters recipient details → Verified via Chimoney API → Stored with recipient_id
2. **Future Transfers**: Click previous recipient → No re-entry or re-verification needed
3. **Tracking**: Every transfer updates recipient usage stats (transfer_count, total_amount_sent, last_transfer_at)
4. **Management**: Users can add, view, or delete recipients anytime
5. **Failed Verification**: User receives clear error message with actionable fix (e.g., "Invalid phone format, use +91XXXXXXXXXX")
