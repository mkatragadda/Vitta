# Recipient Addition & Verification Design
## Chimoney API Integration for UPI & Bank Account

**Status**: Design Phase
**Date**: Feb 21, 2026
**Scope**: India transfers via UPI and Bank Account
**Focus**: User-friendly recipient management with Chimoney verification

---

## 1. Overview

### Problem
Users need to add recipients (beneficiaries) for international money transfers. Recipients must be verified to ensure legitimate transactions and compliance.

### Solution
Two-step recipient addition:
1. **User Input**: Collect recipient details
2. **Chimoney Verification**: Validate details via Chimoney API (no OTP required)

---

## 2. Payment Method Types

### UPI (Unified Payments Interface)
- **Most Common**: 95% of users prefer UPI
- **Settlement**: 2-5 minutes
- **Field**: Phone number + UPI handle (optional)
- **Example**: `9876543210` or `amit@okhdfcbank`

### Bank Account
- **Traditional Method**: 5% of users
- **Settlement**: 1-2 days
- **Fields**: Account number, IFSC code, Account holder name
- **Example**:
  - Account: 1234567890123456
  - IFSC: HDFC0000001
  - Name: Amit Kumar

---

## 3. Database Schema

### Key Relationship: User → Recipient → Verification Log

```
users (id, email, name)
  ↓
  └─→ recipients (id, user_id, name, payment_method, ...)
        ↓
        └─→ recipient_verification_log (id, recipient_id, user_id, status, ...)
```

- **users.id** = User account
- **recipients.user_id** = User who owns/adds the recipient (FK to users.id)
- **recipient_verification_log.user_id** = User who initiated verification (FK to users.id) - typically same as recipient owner

---

### `recipients` Table (Existing)
```sql
CREATE TABLE recipients (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  corridor_id UUID NOT NULL REFERENCES transfer_corridors(id),

  -- Basic Info
  recipient_name VARCHAR(255) NOT NULL,
  recipient_phone VARCHAR(20),
  recipient_email VARCHAR(255),

  -- Payment Method: 'upi' or 'bank_account'
  payment_method VARCHAR(50) NOT NULL,

  -- UPI Fields (Encrypted)
  recipient_upi_encrypted VARCHAR(500),        -- e.g., amit@okhdfcbank

  -- Bank Account Fields (Encrypted)
  recipient_bank_account_encrypted VARCHAR(500),  -- e.g., 1234567890123456
  recipient_bank_ifsc VARCHAR(20),                -- e.g., HDFC0000001
  recipient_bank_name VARCHAR(255),               -- e.g., HDFC Bank

  -- Chimoney Verification
  chimoney_recipient_id VARCHAR(255),             -- Unique ID from Chimoney
  verification_status VARCHAR(50),                -- 'pending', 'verified', 'failed'
  verified_at TIMESTAMP,
  verified_by_system VARCHAR(50),                 -- 'chimoney_api', 'manual_review'
  verification_error TEXT,                        -- Error details if failed
  verification_attempts INT DEFAULT 0,
  last_verification_attempt TIMESTAMP,

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,

  -- Compliance
  relationship_to_user VARCHAR(100),              -- 'family', 'business', 'friend'
  verified_documents JSONB,                       -- ID proof, address proof, etc.

  CONSTRAINT upi_xor_bank CHECK (
    (payment_method = 'upi' AND recipient_upi_encrypted IS NOT NULL) OR
    (payment_method = 'bank_account' AND recipient_bank_account_encrypted IS NOT NULL)
  ),
  UNIQUE(user_id, chimoney_recipient_id)
);

CREATE INDEX idx_recipients_user ON recipients(user_id);
CREATE INDEX idx_recipients_verified ON recipients(verification_status);
CREATE INDEX idx_recipients_chimoney ON recipients(chimoney_recipient_id);
```

### `recipient_verification_log` Table (New - Audit Trail)
```sql
CREATE TABLE recipient_verification_log (
  id UUID PRIMARY KEY,
  recipient_id UUID NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Verification Details
  verification_status VARCHAR(50),                -- 'pending', 'success', 'failed'
  verification_timestamp TIMESTAMP,
  chimoney_response JSONB,                        -- Full Chimoney API response
  error_message TEXT,
  error_code VARCHAR(100),

  -- Attempt Details
  attempt_number INT,
  retry_reason VARCHAR(255),                      -- Why retry happened

  -- Context
  ip_address INET,
  user_agent VARCHAR(500),
  triggered_by VARCHAR(50),                       -- 'user_action', 'auto_retry'

  created_at TIMESTAMP
);

CREATE INDEX idx_verification_log_recipient ON recipient_verification_log(recipient_id);
CREATE INDEX idx_verification_log_user ON recipient_verification_log(user_id);
CREATE INDEX idx_verification_log_status ON recipient_verification_log(verification_status);
```

---

### Schema Clarification: `user_id` Fields

**`recipients.user_id`**:
- The ID of the **user who owns/added this recipient**
- Foreign key: `REFERENCES users(id) ON DELETE CASCADE`
- When user deletes their account, all their recipients are deleted

**`recipient_verification_log.user_id`**:
- The ID of the **user who initiated the verification**
- Foreign key: `REFERENCES users(id) ON DELETE CASCADE`
- Typically the same as `recipients.user_id` (the recipient owner)
- Maintains audit trail of who verified each recipient
- Allows querying all verification attempts by a specific user

---

## 4. User Flows

### Flow 1: Add UPI Recipient

```
┌─────────────────────────────────────┐
│ User clicks: Add Recipient          │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│ Select Payment Method:              │
│ [UPI] [Bank Account]               │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│ Fill UPI Form:                          │
│ • Name: Amit Kumar                      │
│ • Phone: +91 9876543210                 │
│ • UPI: amit@okhdfcbank                  │
│ • Relationship: Family                  │
│ [Continue]                              │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│ Review & Confirm:                       │
│ ✓ Name: Amit Kumar                      │
│ ✓ UPI: amit@okhdfcbank                  │
│ ✓ Type: UPI Transfer (2-5 min)         │
│ [Confirm & Verify]                      │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│ Backend: Call Chimoney API              │
│ POST /recipients/verify                 │
│ {                                       │
│   name: "Amit Kumar"                    │
│   phone: "919876543210"                 │
│   upi_id: "amit@okhdfcbank"             │
│ }                                       │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴────────┐
       │                │
    SUCCESS          FAILURE
       │                │
       ▼                ▼
┌─────────────┐  ┌──────────────────┐
│ ✓ Verified! │  │ ❌ Verification  │
│ Recipient   │  │ Failed           │
│ ready to    │  │ Reason: Invalid  │
│ use         │  │ UPI format       │
└─────────────┘  │ [Retry] [Cancel] │
                 └──────────────────┘
```

### Flow 2: Add Bank Account Recipient

```
┌─────────────────────────────────────┐
│ User clicks: Add Recipient          │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│ Select: Bank Account                │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│ Fill Bank Account Form:                     │
│ • Name: Amit Kumar                          │
│ • Account: 1234567890123456                 │
│ • IFSC: HDFC0000001                         │
│ • Bank: HDFC Bank (auto-filled)             │
│ • Phone: +91 9876543210                     │
│ • Relationship: Family                      │
│ [Continue]                                  │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│ Review & Confirm:                           │
│ ✓ Name: Amit Kumar                          │
│ ✓ Account: ****7890 (masked)                │
│ ✓ IFSC: HDFC0000001                         │
│ ✓ Type: Bank Transfer (1-2 days)            │
│ ⚠ Settlement takes 1-2 days                │
│ [Confirm & Verify]                          │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│ Backend: Chimoney API                       │
│ POST /recipients/verify                     │
│ {                                           │
│   name: "Amit Kumar"                        │
│   phone: "919876543210"                     │
│   bank_account: "1234567890123456"          │
│   bank_ifsc: "HDFC0000001"                  │
│ }                                           │
└──────────────┬──────────────────────────────┘
               │
       ┌───────┴────────┐
       │                │
    SUCCESS          FAILURE
       │                │
       ▼                ▼
┌─────────────┐  ┌──────────────────┐
│ ✓ Verified! │  │ ❌ Verification  │
│ Recipient   │  │ Failed           │
│ ready to    │  │ Reason: Invalid  │
│ use         │  │ account number   │
└─────────────┘  │ [Retry] [Cancel] │
                 └──────────────────┘
```

---

## 5. Chimoney API Integration

### Step 1: LOCAL VERIFICATION ONLY (No Chimoney Call)

**Process**:
1. User enters recipient bank details
2. **Client-side validation** in form (format, length)
3. **Server-side validation** before saving (comprehensive checks)
4. **Save to Vitta recipients table** (mark as verified)
5. **NO Chimoney API call** for beneficiary creation

**Why Skip Chimoney Beneficiary Creation?**
- ✅ Payout API doesn't use beneficiaryId anyway
- ✅ Single source of truth: only our recipients table
- ✅ Fewer API calls = faster flow + lower costs
- ✅ Simpler architecture (no Chimoney beneficiary sync needed)
- ✅ Full control over recipient data

---

### Step 2: PAYOUT - Use Direct Bank Details

**Endpoint**: `POST https://api.chimoney.io/v0.2.4/payouts/bank`

**Request**:
```json
{
  "accountNumber": "1234567890123456",
  "bankCode": "HDFC0000001",
  "fullName": "Amit Kumar",
  "amount": 500,
  "currency": "INR",
  "reference": "TXN-123456-20260221"
}
```

**Response (Success)**:
```json
{
  "status": "success",
  "message": "Bank payout initiated successfully",
  "data": {
    "id": "payout_12345",
    "reference": "TXN-123456-20260221",
    "status": "NEW",
    "amount": 500,
    "currency": "INR",
    "bankName": "HDFC Bank",
    "accountNumber": "1234567890123456",
    "fullName": "Amit Kumar",
    "createdAt": "2026-02-21T14:30:00Z"
  }
}
```

---

## Simplified Chimoney Integration Flow

```
RECIPIENT ADDITION PHASE
  ↓
  1. User enters bank details
  2. Client-side validation (format, length, etc.)
  3. Check for duplicates in Vitta DB
  4. Server-side validation (comprehensive format checks)
  5. Store in recipients table:
     - name, phone, account, IFSC (encrypted)
     - verification_status: "verified"
     - verified_at: now
  6. Mark as ready to use
  ❌ NO Chimoney API call

SENDING MONEY PHASE
  ↓
  1. User selects recipient from recipients list
  2. POST /v0.2.4/payouts/bank with:
     - accountNumber (from recipients table)
     - bankCode (from recipients table)
     - fullName (from recipients table)
     - amount, currency, reference
  3. Chimoney processes payout
  4. Return payout_id to user

UI PREPOPULATION
  ↓
  When user wants to send money again:
  - Show list of recipients from our DB
  - No re-verification needed (already verified)
  - Direct payout with stored details
```

### Error Codes

| Code | Meaning | User Message | Action |
|------|---------|--------------|--------|
| `INVALID_UPI_FORMAT` | UPI format wrong | "Invalid UPI format. Use: name@bank" | Retry with correct format |
| `INVALID_PHONE_FORMAT` | Phone number invalid | "Phone number should be 10 digits" | Retry with 10-digit number |
| `INVALID_ACCOUNT_NUMBER` | Bank account wrong | "Account number should be 9-18 digits" | Retry with correct length |
| `INVALID_IFSC_CODE` | IFSC code invalid | "IFSC code should be 11 characters" | Retry with 11-char code |
| `ACCOUNT_NOT_FOUND` | Account doesn't exist | "Account not found. Check details." | Verify with bank |
| `ACCOUNT_BLOCKED` | Account inactive | "Account is blocked or inactive" | Contact recipient |
| `NAME_MISMATCH` | Name doesn't match | "Name doesn't match account holder" | Verify correct name |
| `RATE_LIMIT_EXCEEDED` | Too many attempts | "Too many attempts. Try later." | Wait 15 minutes |
| `API_ERROR` | Chimoney API error | "Verification service unavailable" | Retry in 5 minutes |

---

## 6. Duplicate Detection & Handling

### Why Duplicate Detection Matters

1. **Cost Optimization**: Avoid Chimoney API calls for recipients already verified
2. **User Experience**: Immediate feedback instead of waiting for API
3. **Data Integrity**: Prevent multiple records for same recipient
4. **Business Logic**: Allow users to reuse verified recipients

### Three Scenarios

| Scenario | Status | Action |
|----------|--------|--------|
| **Verified Duplicate** | `verified` | Return existing recipient ID, don't call Chimoney |
| **Failed Attempt** | `failed` | Allow retry (new Chimoney verification attempt) |
| **In Progress** | `pending` | Show "verification in progress" message, block retry |

### Duplicate Check Process

```
User enters recipient details
           ↓
   Validate format
           ↓
   Check for duplicate by payment method
           ↓
   ┌───────┴────────┐
   │                │
 FOUND           NOT FOUND
   │                │
   ├─→ verified → Return existing ✓
   ├─→ pending → Show "in progress" ✗
   ├─→ failed → Allow retry (continue)
   │
NOT FOUND → Proceed with Chimoney verification
```

### Database Queries for Duplicate Detection

**For UPI**:
```sql
SELECT * FROM recipients
WHERE user_id = $1
  AND payment_method = 'upi';
  -- Then decrypt and compare recipient_upi_encrypted
```

**For Bank Account**:
```sql
SELECT * FROM recipients
WHERE user_id = $1
  AND payment_method = 'bank_account'
  AND recipient_bank_ifsc = $2;
  -- Then decrypt and compare recipient_bank_account_encrypted
```

---

## 7. Backend Implementation

### Service: `services/transfers/recipientService.js`

```javascript
/**
 * Add and verify a recipient with Chimoney API
 */
export const addRecipient = async (userId, recipientData) => {
  // 1. Validate input
  validateRecipientInput(recipientData);

  // 2. Check for duplicate recipient BEFORE Chimoney API call
  const duplicateCheck = await checkDuplicateRecipient(userId, recipientData);
  if (duplicateCheck.exists) {
    return duplicateCheck.response;
  }

  // 3. Prepare data for Chimoney beneficiary creation
  const chimoneyPayload = prepareChimoneyPayload(recipientData);

  // 4. Call Chimoney to CREATE beneficiary
  const beneficiaryResult = await chimoney.createBeneficiary(chimoneyPayload);

  // 5. Handle creation response
  if (beneficiaryResult.status === 'success') {
    // Success: Save recipient to DB with Chimoney beneficiary_id
    const recipient = await db.recipients.create({
      user_id: userId,
      recipient_name: recipientData.name,
      recipient_phone: recipientData.phone,
      payment_method: recipientData.paymentMethod,

      // Encrypt sensitive data
      recipient_upi_encrypted: encrypt(recipientData.upi),
      recipient_bank_account_encrypted: encrypt(recipientData.account),
      recipient_bank_ifsc: recipientData.ifsc,

      // Chimoney beneficiary reference (NOT used in payout, but kept for records)
      chimoney_recipient_id: beneficiaryResult.data.id,
      verification_status: 'verified',
      verified_at: new Date(),
      verified_by_system: 'chimoney_api',

      // Compliance
      relationship_to_user: recipientData.relationship,

      created_at: new Date()
    });

    // Log success
    await logVerification(recipient.id, userId, 'success', beneficiaryResult);

    return {
      success: true,
      recipient_id: recipient.id,
      message: 'Recipient added successfully'
    };
  } else {
    // Failed: Log error (no recipient yet) but still record user_id for audit trail
    await logVerification(null, userId, 'failed', beneficiaryResult);

    return {
      success: false,
      error_code: verificationResult.error_code,
      error_message: verificationResult.error_message,
      suggestion: verificationResult.suggestion
    };
  }
};

/**
 * Check if recipient already exists for this user
 * Prevents duplicate API calls and improves UX
 */
async function checkDuplicateRecipient(userId, recipientData) {
  let existing = null;

  if (recipientData.paymentMethod === 'upi') {
    // For UPI: Check if user already has recipient with same UPI
    existing = await db.recipients.findOne({
      where: {
        user_id: userId,
        payment_method: 'upi'
      }
    });

    // Decrypt and compare UPI ID
    if (existing) {
      const decryptedUpi = decrypt(existing.recipient_upi_encrypted, ENCRYPTION_KEY);
      if (decryptedUpi === recipientData.upi.toLowerCase()) {
        // Found exact duplicate
        if (existing.verification_status === 'verified') {
          // Already verified - can reuse
          return {
            exists: true,
            response: {
              success: true,
              recipient_id: existing.id,
              name: existing.recipient_name,
              verificationStatus: 'verified',
              isDuplicate: true,
              message: 'This recipient already exists in your list'
            }
          };
        } else if (existing.verification_status === 'failed') {
          // Previous attempt failed - allow retry
          return { exists: false }; // Continue with verification
        } else if (existing.verification_status === 'pending') {
          // Still being verified - ask user to wait
          return {
            exists: true,
            response: {
              success: false,
              error_code: 'VERIFICATION_IN_PROGRESS',
              message: 'This recipient is currently being verified. Please wait.',
              isDuplicate: true
            }
          };
        }
      }
    }
  } else if (recipientData.paymentMethod === 'bank_account') {
    // For Bank Account: Check if user already has recipient with same account+IFSC
    existing = await db.recipients.findOne({
      where: {
        user_id: userId,
        payment_method: 'bank_account',
        recipient_bank_ifsc: recipientData.ifsc
      }
    });

    // Decrypt and compare account number
    if (existing) {
      const decryptedAccount = decrypt(existing.recipient_bank_account_encrypted, ENCRYPTION_KEY);
      if (decryptedAccount === recipientData.account) {
        // Found exact duplicate
        if (existing.verification_status === 'verified') {
          return {
            exists: true,
            response: {
              success: true,
              recipient_id: existing.id,
              name: existing.recipient_name,
              verificationStatus: 'verified',
              isDuplicate: true,
              message: 'This recipient already exists in your list'
            }
          };
        } else if (existing.verification_status === 'failed') {
          return { exists: false }; // Allow retry
        } else if (existing.verification_status === 'pending') {
          return {
            exists: true,
            response: {
              success: false,
              error_code: 'VERIFICATION_IN_PROGRESS',
              message: 'This recipient is currently being verified. Please wait.',
              isDuplicate: true
            }
          };
        }
      }
    }
  }

  // No duplicate found
  return { exists: false };
}

/**
 * Validate recipient input before API call
 */
function validateRecipientInput(data) {
  // Name validation
  if (!data.name || data.name.length < 2 || data.name.length > 255) {
    throw new Error('Name must be 2-255 characters');
  }

  // Phone validation
  if (!data.phone || !/^[6-9]\d{9}$/.test(data.phone)) {
    throw new Error('Phone must be 10-digit Indian number');
  }

  // Payment method validation
  if (!['upi', 'bank_account'].includes(data.paymentMethod)) {
    throw new Error('Invalid payment method');
  }

  // UPI validation
  if (data.paymentMethod === 'upi') {
    if (!data.upi || !/^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/.test(data.upi)) {
      throw new Error('Invalid UPI format');
    }
  }

  // Bank account validation
  if (data.paymentMethod === 'bank_account') {
    if (!data.account || !/^\d{9,18}$/.test(data.account)) {
      throw new Error('Account must be 9-18 digits');
    }
    if (!data.ifsc || !/^[A-Z0-9]{11}$/.test(data.ifsc)) {
      throw new Error('IFSC must be 11 alphanumeric characters');
    }
  }
}

/**
 * Prepare payload for Chimoney API - Create Beneficiary
 * POST https://api.chimoney.io/v0.2.4/beneficiary/bank
 */
function prepareChimoneyPayload(data) {
  // For bank accounts, prepare beneficiary creation payload
  if (data.paymentMethod === 'bank_account') {
    return {
      accountNumber: data.account,
      bankCode: data.ifsc,
      fullName: data.name,
      country: 'IN',
      currency: 'INR'
    };
  }

  // For UPI, prepare UPI beneficiary creation payload (if Chimoney supports it)
  // Note: Check Chimoney docs for UPI endpoint - may be different
  if (data.paymentMethod === 'upi') {
    return {
      fullName: data.name,
      phone: data.phone,
      upiHandle: data.upi,
      country: 'IN',
      currency: 'INR'
    };
  }
}

/**
 * Log verification attempt
 */
async function logVerification(recipientId, userId, status, response) {
  await db.recipient_verification_log.create({
    recipient_id: recipientId,
    user_id: userId,                           // User who initiated verification
    verification_status: status,
    verification_timestamp: new Date(),
    chimoney_response: response,
    error_message: response.error_message,
    error_code: response.error_code,
    attempt_number: 1,
    triggered_by: 'user_action'
  });
}
```

---

## 7. API Endpoints

### POST /api/transfers/recipients/add

**Request**:
```json
{
  "name": "Amit Kumar",
  "phone": "9876543210",
  "paymentMethod": "upi",
  "upi": "amit@okhdfcbank",
  "relationship": "family"
}
```

**Response (Success - 200)**:
```json
{
  "success": true,
  "recipient": {
    "id": "rec-uuid-123",
    "name": "Amit Kumar",
    "phone": "9876543210",
    "paymentMethod": "upi",
    "upiHidden": "amit@****",
    "verificationStatus": "verified",
    "verifiedAt": "2026-02-21T14:30:00Z"
  },
  "message": "Recipient added successfully"
}
```

**Response (Failure - 400)**:
```json
{
  "success": false,
  "error": "VERIFICATION_FAILED",
  "errorCode": "INVALID_UPI_FORMAT",
  "message": "UPI ID format is invalid",
  "suggestion": "Please enter UPI in format: username@bankname"
}
```

**Response (Duplicate - Already Verified - 200)**:
```json
{
  "success": true,
  "recipient": {
    "id": "rec-uuid-123",
    "name": "Amit Kumar",
    "phone": "9876543210",
    "paymentMethod": "upi",
    "upiHidden": "amit@****",
    "verificationStatus": "verified",
    "verifiedAt": "2026-02-21T14:30:00Z"
  },
  "isDuplicate": true,
  "message": "This recipient already exists in your list"
}
```

**Response (Duplicate - Verification In Progress - 400)**:
```json
{
  "success": false,
  "error": "VERIFICATION_IN_PROGRESS",
  "errorCode": "VERIFICATION_IN_PROGRESS",
  "message": "This recipient is currently being verified. Please wait.",
  "isDuplicate": true,
  "suggestion": "Check back in a few moments"
}
```

### GET /api/transfers/recipients

**Response**:
```json
{
  "recipients": [
    {
      "id": "rec-uuid-123",
      "name": "Amit Kumar",
      "phone": "9876543210",
      "paymentMethod": "upi",
      "upiHidden": "amit@****",
      "verificationStatus": "verified",
      "lastUsed": "2026-02-21T10:00:00Z",
      "createdAt": "2026-02-20T14:30:00Z"
    }
  ]
}
```

### DELETE /api/transfers/recipients/:id

**Response**:
```json
{
  "success": true,
  "message": "Recipient deleted successfully"
}
```

---

## 8. Frontend Components

### RecipientForm Component

```jsx
<RecipientForm
  paymentMethod="upi" // or "bank_account"
  onSubmit={handleAddRecipient}
  loading={isLoading}
  error={error}
>
  {/* Payment Method Selector */}
  <PaymentMethodTabs />

  {/* Common Fields */}
  <InputField
    label="Full Name"
    name="name"
    required
  />

  <PhoneInput
    label="Phone Number"
    name="phone"
    country="IN"
    required
  />

  <SelectField
    label="Relationship"
    name="relationship"
    options={['family', 'friend', 'business', 'other']}
  />

  {/* Conditional Fields */}
  {paymentMethod === 'upi' && (
    <InputField
      label="UPI ID"
      name="upi"
      placeholder="amit@okhdfcbank"
      pattern="^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$"
    />
  )}

  {paymentMethod === 'bank_account' && (
    <>
      <InputField
        label="Account Number"
        name="account"
        placeholder="1234567890123456"
        pattern="^\d{9,18}$"
      />
      <InputField
        label="IFSC Code"
        name="ifsc"
        placeholder="HDFC0000001"
        pattern="^[A-Z0-9]{11}$"
      />
      <SelectField
        label="Bank"
        name="bank"
        options={MAJOR_INDIAN_BANKS}
      />
    </>
  )}

  {/* Submit */}
  <button type="submit" disabled={loading}>
    {loading ? 'Verifying...' : 'Verify & Add Recipient'}
  </button>
</RecipientForm>
```

### RecipientReview Component

```jsx
<RecipientReview
  recipient={recipientData}
  onConfirm={handleConfirm}
  onEdit={handleEdit}
>
  <Box>
    <Text>Name: {recipient.name}</Text>
    <Text>Phone: {recipient.phone}</Text>

    {recipient.paymentMethod === 'upi' ? (
      <>
        <Text>Payment Method: UPI</Text>
        <Text>UPI: {recipient.upi}</Text>
        <Text size="sm" color="gray">Settlement: 2-5 minutes</Text>
      </>
    ) : (
      <>
        <Text>Payment Method: Bank Account</Text>
        <Text>Account: ****{recipient.account.slice(-4)}</Text>
        <Text>IFSC: {recipient.ifsc}</Text>
        <Text size="sm" color="gray">Settlement: 1-2 days</Text>
      </>
    )}

    <Text>Relationship: {recipient.relationship}</Text>
  </Box>

  <Alert type="info">
    Your recipient will be verified with our partner bank
  </Alert>

  <ButtonGroup>
    <Button variant="secondary" onClick={onEdit}>Edit</Button>
    <Button variant="primary" onClick={onConfirm}>Confirm</Button>
  </ButtonGroup>
</RecipientReview>
```

### RecipientList Component

```jsx
<RecipientList
  recipients={recipients}
  onSelect={handleSelectRecipient}
  onDelete={handleDeleteRecipient}
  onAdd={handleAddRecipient}
>
  {recipients.length === 0 ? (
    <Empty
      title="No recipients yet"
      action={() => <Button onClick={onAdd}>Add Recipient</Button>}
    />
  ) : (
    recipients.map(recipient => (
      <RecipientCard
        key={recipient.id}
        recipient={recipient}
        onSelect={() => onSelect(recipient.id)}
        onDelete={() => onDelete(recipient.id)}
      >
        <Box>
          <Badge>{recipient.paymentMethod}</Badge>
          <Badge color="green">{recipient.verificationStatus}</Badge>
        </Box>
        <Text>{recipient.name}</Text>
        <Text size="sm">{recipient.phone}</Text>
        {recipient.paymentMethod === 'upi' ? (
          <Text size="sm">{recipient.upiHidden}</Text>
        ) : (
          <Text size="sm">Account: ****{recipient.accountHidden}</Text>
        )}
      </RecipientCard>
    ))
  )}
</RecipientList>
```

---

## 9. Error Handling & Retry Logic

### Verification Failure Handling

```javascript
// Max 3 attempts per recipient per day
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 5 * 60 * 1000; // 5 minutes

export async function handleVerificationFailure(recipientId, error) {
  const attempts = await db.recipients.update(
    { id: recipientId },
    {
      verification_attempts: { increment: 1 },
      last_verification_attempt: new Date()
    }
  );

  // Determine if user can retry
  if (attempts >= MAX_ATTEMPTS) {
    return {
      canRetry: false,
      message: 'Max attempts reached. Try again later.'
    };
  }

  // Allow retry
  return {
    canRetry: true,
    nextRetryAt: new Date(Date.now() + RETRY_DELAY_MS),
    attemptsRemaining: MAX_ATTEMPTS - attempts
  };
}
```

### Transient Error Retry

```javascript
// Retry with exponential backoff for API errors
async function verifyWithRetry(payload, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await chimoney.verifyRecipient(payload);
    } catch (error) {
      // Retry only for transient errors
      if (isTransientError(error) && i < maxRetries - 1) {
        const delayMs = Math.pow(2, i) * 1000; // 1s, 2s, 4s
        await sleep(delayMs);
        continue;
      }
      throw error;
    }
  }
}

function isTransientError(error) {
  return error.statusCode >= 500 || error.statusCode === 429;
}
```

---

## 10. Security Considerations

### Data Encryption

```javascript
// Encrypt sensitive recipient data before storage
const encryptRecipient = (data) => {
  if (data.upi) {
    data.upi_encrypted = encrypt(data.upi, ENCRYPTION_KEY);
    delete data.upi;
  }

  if (data.account) {
    data.account_encrypted = encrypt(data.account, ENCRYPTION_KEY);
    delete data.account;
  }

  return data;
};

// Decrypt only when needed (during Chimoney API call)
const decryptForChimoney = (recipient) => {
  if (recipient.upi_encrypted) {
    recipient.upi = decrypt(recipient.upi_encrypted, ENCRYPTION_KEY);
  }

  if (recipient.account_encrypted) {
    recipient.account = decrypt(recipient.account_encrypted, ENCRYPTION_KEY);
  }

  return recipient;
};
```

### Rate Limiting

```javascript
// Rate limit verification attempts
const rateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,            // Max 5 verifications
  keyGenerator: (req) => req.user.id
});

app.post('/api/transfers/recipients/add', rateLimiter, addRecipientHandler);
```

### Audit Trail

```javascript
// Log all verification attempts for compliance
await db.recipient_verification_log.create({
  id: generateUUID(),
  recipient_id: recipientId,                  // Reference to recipient being verified
  user_id: userId,                           // User who initiated verification (FK to users)
  verification_status: status,               // 'success' or 'failed'
  verification_timestamp: new Date(),
  chimoney_response: response,               // Full Chimoney API response
  error_message: response.error_message,     // Error details if failed
  error_code: response.error_code,           // Error code from Chimoney
  attempt_number: attemptCount,              // Which attempt this is (1, 2, 3)
  retry_reason: null,                        // Why retry occurred (if applicable)
  ip_address: req.ip,                        // Client IP for security audit
  user_agent: req.headers['user-agent'],     // Client user agent
  triggered_by: 'user_action',               // Who triggered: 'user_action' or 'auto_retry'
  created_at: new Date()
});
```

**Audit Trail Benefits**:
- ✅ **Compliance**: Immutable record of all verification attempts
- ✅ **Security**: Track IP addresses and user agents for fraud detection
- ✅ **Debugging**: Full Chimoney responses stored for troubleshooting
- ✅ **Analytics**: Understand verification success rates and error patterns
- ✅ **User Support**: Trace why a recipient verification failed

---

## 11. Testing Strategy

### Unit Tests

```javascript
describe('addRecipient', () => {
  it('should verify UPI recipient successfully', async () => {
    const result = await addRecipient(userId, {
      name: 'Amit Kumar',
      phone: '9876543210',
      paymentMethod: 'upi',
      upi: 'amit@okhdfcbank',
      relationship: 'family'
    });

    expect(result.success).toBe(true);
    expect(result.recipient_id).toBeDefined();
  });

  it('should reject invalid UPI format', async () => {
    const result = await addRecipient(userId, {
      name: 'Amit Kumar',
      phone: '9876543210',
      paymentMethod: 'upi',
      upi: 'invalid-upi', // Invalid format
      relationship: 'family'
    });

    expect(result.success).toBe(false);
    expect(result.error_code).toBe('INVALID_UPI_FORMAT');
  });

  it('should verify bank account recipient', async () => {
    const result = await addRecipient(userId, {
      name: 'Amit Kumar',
      phone: '9876543210',
      paymentMethod: 'bank_account',
      account: '1234567890123456',
      ifsc: 'HDFC0000001',
      relationship: 'family'
    });

    expect(result.success).toBe(true);
  });

  // Duplicate Detection Tests
  it('should detect duplicate verified UPI recipient', async () => {
    // First add
    await addRecipient(userId, {
      name: 'Amit Kumar',
      phone: '9876543210',
      paymentMethod: 'upi',
      upi: 'amit@okhdfcbank',
      relationship: 'family'
    });

    // Second add (duplicate)
    const result = await addRecipient(userId, {
      name: 'Amit Kumar',
      phone: '9876543210',
      paymentMethod: 'upi',
      upi: 'amit@okhdfcbank',
      relationship: 'family'
    });

    expect(result.success).toBe(true);
    expect(result.isDuplicate).toBe(true);
    expect(result.message).toContain('already exists');
  });

  it('should detect duplicate verified bank account recipient', async () => {
    // First add
    await addRecipient(userId, {
      name: 'Amit Kumar',
      phone: '9876543210',
      paymentMethod: 'bank_account',
      account: '1234567890123456',
      ifsc: 'HDFC0000001',
      relationship: 'family'
    });

    // Second add (duplicate)
    const result = await addRecipient(userId, {
      name: 'Amit Kumar',
      phone: '9876543210',
      paymentMethod: 'bank_account',
      account: '1234567890123456',
      ifsc: 'HDFC0000001',
      relationship: 'family'
    });

    expect(result.success).toBe(true);
    expect(result.isDuplicate).toBe(true);
  });

  it('should allow retry if previous verification failed', async () => {
    // Mock Chimoney to fail first time
    chimoney.verifyRecipient
      .mockRejectedValueOnce({ error: 'Invalid format' })
      .mockResolvedValueOnce({ success: true, recipient_id: 'ch_rec_123' });

    // First attempt (fails)
    const result1 = await addRecipient(userId, {
      name: 'Amit Kumar',
      phone: '9876543210',
      paymentMethod: 'upi',
      upi: 'amit@okhdfcbank',
      relationship: 'family'
    });

    expect(result1.success).toBe(false);

    // Second attempt (should retry, not return duplicate)
    const result2 = await addRecipient(userId, {
      name: 'Amit Kumar',
      phone: '9876543210',
      paymentMethod: 'upi',
      upi: 'amit@okhdfcbank',
      relationship: 'family'
    });

    // Second attempt should call Chimoney again and succeed
    expect(result2.success).toBe(true);
  });

  it('should reject duplicate if verification in progress', async () => {
    // Mock pending verification
    await db.recipients.create({
      id: 'rec-uuid-123',
      user_id: userId,
      payment_method: 'upi',
      recipient_upi_encrypted: encrypt('amit@okhdfcbank'),
      verification_status: 'pending'
    });

    const result = await addRecipient(userId, {
      name: 'Amit Kumar',
      phone: '9876543210',
      paymentMethod: 'upi',
      upi: 'amit@okhdfcbank',
      relationship: 'family'
    });

    expect(result.success).toBe(false);
    expect(result.error_code).toBe('VERIFICATION_IN_PROGRESS');
    expect(result.isDuplicate).toBe(true);
  });
});
```

### Integration Tests

```javascript
describe('Recipient Addition E2E', () => {
  it('should add UPI recipient and verify with Chimoney', async () => {
    // Mock Chimoney API
    chimoney.verifyRecipient.mockResolvedValue({
      success: true,
      recipient_id: 'ch_rec_123',
      verification_status: 'verified'
    });

    // Call endpoint
    const response = await request(app)
      .post('/api/transfers/recipients/add')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Amit Kumar',
        phone: '9876543210',
        paymentMethod: 'upi',
        upi: 'amit@okhdfcbank',
        relationship: 'family'
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    // Verify recipient saved
    const saved = await db.recipients.findOne({ id: response.body.recipient.id });
    expect(saved.verification_status).toBe('verified');
  });
});
```

---

## 12. Implementation Timeline

### Phase 1: Setup (1-2 days)
- [ ] Create database tables
- [ ] Setup Chimoney API client
- [ ] Implement validation

### Phase 2: Backend (3-4 days)
- [ ] Implement addRecipient service
- [ ] Create API endpoints
- [ ] Add error handling & retry logic
- [ ] Implement encryption

### Phase 3: Frontend (3-4 days)
- [ ] Create RecipientForm component
- [ ] Create RecipientReview component
- [ ] Create RecipientList component
- [ ] Integrate with chat interface

### Phase 4: Testing (2-3 days)
- [ ] Unit tests
- [ ] Integration tests
- [ ] End-to-end tests
- [ ] Manual QA

### Phase 5: Deployment (1 day)
- [ ] Staging deployment
- [ ] Production rollout
- [ ] Monitoring & support

---

## 13. Success Metrics

- ✅ Recipient added successfully rate: >95%
- ✅ Verification success rate: >90%
- ✅ Average verification time: <5 seconds
- ✅ User satisfaction: >4.5/5
- ✅ Zero data breaches (encryption + audit logs)
- ✅ Support tickets related to recipients: <5% of total

---

## 14. Next Steps

1. **Design Review**: Get stakeholder approval on this design
2. **Chimoney Integration**: Set up Chimoney sandbox for testing
3. **Backend Implementation**: Start Phase 2 development
4. **Frontend Design**: Finalize UI mockups with design team
5. **Testing Setup**: Prepare test scenarios and data

---

**Document Version**: 1.0
**Date**: Feb 21, 2026
**Status**: Ready for Implementation
