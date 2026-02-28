# Beneficiary Creation - Steps & Implementation

**Status**: Ready for Implementation (Awaiting Approval)
**Scope**: ONLY Beneficiary Creation (NOT Transfer Initiation)
**Date**: Feb 21, 2026

---

## Overview

This document covers ONLY the steps to add and manage beneficiaries. Transfer initiation will be handled separately.

---

## Step-by-Step Beneficiary Creation Process

### **STEP 1: User Initiates Beneficiary Addition**

**UI Component**: Recipients Management Screen
**User Action**: Clicks "Add Beneficiary" button

**What Happens**:
- Modal or new screen opens
- Empty form displayed
- No form fields visible yet

**Component**: `AddBeneficiaryFlow.js`

---

### **STEP 2: User Selects Payment Method**

**Options Presented**:
1. **UPI** - Fast (2-5 min settlement)
2. **Bank Account** - Slow (1-2 day settlement)

**User Action**: Clicks on payment method

**Form Fields Appear**:
- **If UPI Selected**:
  - Name (text)
  - Phone (tel)
  - UPI ID (text)
  - Relationship (select)

- **If Bank Selected**:
  - Name (text)
  - Phone (tel)
  - Account Number (text)
  - IFSC Code (text)
  - Bank Name (text)
  - Relationship (select)

**Component**: `BeneficiaryFormUPI.js` or `BeneficiaryFormBank.js`

---

### **STEP 3: Client-Side Validation (Frontend)**

**Real-time validation as user types**:

#### For BOTH Methods:
```
Name:
  ✓ Length: 2-255 characters
  ✓ Not empty
  ✓ Show error: "Name must be 2-255 characters"

Phone:
  ✓ Exactly 10 digits
  ✓ First digit: 6-9 (Indian format)
  ✓ Show error: "Phone must be 10 digits starting with 6-9"
```

#### For UPI Only:
```
UPI ID:
  ✓ Format: user@bank
  ✓ Pattern: /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/
  ✓ Show error: "UPI format invalid. Use: name@bank"
  ✓ Example: amit@okhdfcbank
```

#### For Bank Account Only:
```
Account Number:
  ✓ Length: 9-18 digits
  ✓ Pattern: /^\d{9,18}$/
  ✓ Show error: "Account must be 9-18 digits"

IFSC Code:
  ✓ Length: Exactly 11 characters
  ✓ Pattern: /^[A-Z0-9]{11}$/
  ✓ Auto-uppercase
  ✓ Show error: "IFSC must be 11 alphanumeric characters"
  ✓ Example: HDFC0000001

Bank Name:
  ✓ Not empty
  ✓ Show error: "Bank name required"
```

**Relationship (All Methods)**:
```
Options:
  - Family
  - Friend
  - Business
  - Other
```

**Validation Behavior**:
- Show errors INLINE as user types (not on blur)
- Disable form fields that are invalid
- Show green checkmark when valid
- Clear error when user fixes field

**Component**: `BeneficiaryFormUPI.js` and `BeneficiaryFormBank.js`

---

### **STEP 4: User Clicks "Review"**

**User Action**: After filling all required fields, clicks "Review & Confirm"

**Form Validation**:
- Check all fields valid
- If NOT valid: Show which fields have errors, don't proceed
- If valid: Show review screen

**Component**: Still in form component, check validation before allowing next step

---

### **STEP 5: Display Review Screen**

**Show Summary**:
```
Payment Method: UPI / Bank Account

For UPI:
  Name: [user entered]
  Phone: [user entered]
  UPI ID: [masked] ****@bank (show only last part)
  Settlement Time: 2-5 minutes

For Bank:
  Name: [user entered]
  Phone: [user entered]
  Account: [masked] ****7890 (show only last 4 digits)
  IFSC: [user entered]
  Bank: [user entered]
  Settlement Time: 1-2 days
```

**User Actions**:
- [ ] "Confirm & Add" → Go to STEP 6
- [ ] "Edit" → Go back to STEP 2 (keep data in form)
- [ ] "Cancel" → Close modal, discard data

**Component**: `BeneficiaryReview.js`

---

### **STEP 6: Send Data to Backend API**

**Endpoint**: `POST /api/beneficiaries/add`

**Request Headers**:
```javascript
{
  Authorization: "Bearer {jwt_token}",
  X-User-Id: "{user_id_from_token}",
  Content-Type: "application/json"
}
```

**Request Body for UPI**:
```json
{
  "name": "Amit Kumar",
  "phone": "9876543210",
  "paymentMethod": "upi",
  "upiId": "amit@okhdfcbank",
  "relationship": "family"
}
```

**Request Body for Bank**:
```json
{
  "name": "Amit Kumar",
  "phone": "9876543210",
  "paymentMethod": "bank_account",
  "account": "1234567890123456",
  "ifsc": "HDFC0000001",
  "bankName": "HDFC Bank",
  "relationship": "family"
}
```

**Component**: `AddBeneficiaryFlow.js` makes HTTP request

---

### **STEP 7: Backend - Extract & Verify Authorization**

**Endpoint Handler**: `pages/api/beneficiaries/add.js`

**Check**:
```javascript
1. Authorization header present?
   - If NO → Return 401 "Unauthorized"

2. X-User-Id header present?
   - If NO → Return 401 "User ID missing"

3. Extract user_id from header
   - Use this to scope all database queries
```

**Component**: API endpoint

---

### **STEP 8: Backend - Server-Side Validation**

**Comprehensive format validation**:

```javascript
Validate name:
  ✓ Not null/empty
  ✓ Length: 2-255 chars
  ✗ If invalid → Return 400 "Invalid name"

Validate phone:
  ✓ Exactly 10 digits
  ✓ First digit: 6-9
  ✗ If invalid → Return 400 "Invalid phone"

Validate payment method:
  ✓ Must be "upi" OR "bank_account"
  ✗ If invalid → Return 400 "Invalid payment method"

If UPI:
  Validate UPI ID:
    ✓ Format: user@bank
    ✓ Pattern: /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/
    ✗ If invalid → Return 400 "Invalid UPI format"

If Bank:
  Validate account:
    ✓ Length: 9-18 digits
    ✓ Pattern: /^\d{9,18}$/
    ✗ If invalid → Return 400 "Invalid account"

  Validate IFSC:
    ✓ Length: Exactly 11 chars
    ✓ Pattern: /^[A-Z0-9]{11}$/
    ✗ If invalid → Return 400 "Invalid IFSC"

  Validate bank name:
    ✓ Not empty
    ✗ If invalid → Return 400 "Bank name required"
```

**Error Response Format** (400):
```json
{
  "success": false,
  "error_code": "INVALID_UPI_FORMAT",
  "error_message": "UPI format invalid",
  "suggestion": "Use format: name@bank (e.g., amit@okhdfcbank)"
}
```

**Component**: API endpoint validation logic

---

### **STEP 9: Backend - Check for Duplicates**

**Query Database**:

#### For UPI:
```sql
SELECT * FROM beneficiaries
WHERE user_id = {current_user}
AND payment_method = 'upi'
AND is_active = true
```

Then compare decrypted UPI IDs (case-insensitive)

#### For Bank:
```sql
SELECT * FROM beneficiaries
WHERE user_id = {current_user}
AND payment_method = 'bank_account'
AND ifsc = {submitted_ifsc}
AND is_active = true
```

Then compare decrypted account numbers

**Three Possible Outcomes**:

**Outcome A: Exact Duplicate Found (Already Verified)**
```
Status in DB: verification_status = 'verified'

Action: Return existing beneficiary, don't create new

Response (200):
{
  "success": true,
  "beneficiary_id": "existing-123",
  "name": "Amit Kumar",
  "isDuplicate": true,
  "message": "This beneficiary already exists in your list"
}
```

**Outcome B: Duplicate Found (Previous Attempt Failed)**
```
Status in DB: verification_status = 'failed'

Action: Allow retry, continue to STEP 10

Response: Continue with new beneficiary creation
```

**Outcome C: Duplicate Found (Still Verifying)**
```
Status in DB: verification_status = 'pending'

Action: Block user, ask to wait

Response (400):
{
  "success": false,
  "error_code": "VERIFICATION_IN_PROGRESS",
  "error_message": "This beneficiary is being verified",
  "isDuplicate": true,
  "suggestion": "Please wait for verification to complete"
}
```

**Outcome D: No Duplicate Found**
```
Action: Continue to STEP 10
```

**Component**: API endpoint duplicate check logic

---

### **STEP 10: Backend - Encrypt Sensitive Fields**

**Fields to Encrypt**:
- UPI ID (if UPI method)
- Account Number (if Bank method)

**Encryption Process**:
```
Method: AES-256-CBC

For each sensitive field:
  1. Generate random 16-byte IV
  2. Encrypt plaintext using AES-256-CBC
  3. Format: {hex(IV)}:{hex(encrypted)}
  4. Store this string in database

Example:
  Plain: amit@okhdfcbank
  IV: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
  Encrypted: abc123def456xyz789...
  Stored: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6:abc123def456xyz789...
```

**Fields NOT Encrypted** (don't need to be):
- IFSC code (non-sensitive)
- Bank name (non-sensitive)
- Phone number (non-sensitive)
- Name (non-sensitive)

**Component**: API endpoint encryption logic in RecipientService

---

### **STEP 11: Backend - Create Beneficiary Record**

**Insert into `beneficiaries` Table**:

```sql
INSERT INTO beneficiaries (
  id,                              -- UUID generated
  user_id,                         -- From JWT token (STEP 7)
  name,                            -- From request body
  phone,                           -- From request body
  payment_method,                  -- 'upi' or 'bank_account'
  upi_encrypted,                   -- Encrypted (if UPI), NULL otherwise
  account_encrypted,               -- Encrypted (if Bank), NULL otherwise
  ifsc,                            -- Plain (if Bank), NULL otherwise
  bank_name,                       -- Plain (if Bank), NULL otherwise
  verification_status,             -- 'verified' (local validation complete)
  verified_at,                     -- Current timestamp
  verified_by_system,              -- 'local_validation'
  verification_attempts,           -- 1
  last_verification_attempt,       -- Current timestamp
  relationship,                    -- From request body
  is_active,                       -- true
  created_at,                      -- Current timestamp
  updated_at                       -- Current timestamp
)
VALUES (...)
```

**If Insert Succeeds**:
- Continue to STEP 12

**If Insert Fails**:
- Return 500 "Failed to create beneficiary"
- Log error for debugging
- Don't proceed

**Component**: API endpoint database insertion

---

### **STEP 12: Backend - Log Verification Attempt**

**Insert into `beneficiary_verification_log` Table**:

```sql
INSERT INTO beneficiary_verification_log (
  id,                       -- UUID generated
  beneficiary_id,           -- From STEP 11
  user_id,                  -- From JWT token
  verification_status,      -- 'verified'
  attempt_number,           -- 1
  ip_address,               -- From request headers
  user_agent,               -- From request headers
  verification_response,    -- JSON with details
  created_at                -- Current timestamp
)
VALUES (...)
```

**Logged Data**:
```json
{
  "verification_status": "verified",
  "method": "local_validation",
  "payment_method": "upi",
  "timestamp": "2026-02-21T14:30:00Z",
  "ip_address": "192.168.1.1",
  "user_agent": "Mozilla/5.0..."
}
```

**Purpose**: Audit trail - track all verification attempts

**Component**: API endpoint logging logic

---

### **STEP 13: Backend - Return Success Response**

**Response Code**: 200 OK

**Response Body**:
```json
{
  "success": true,
  "beneficiary_id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Amit Kumar",
  "phone": "9876543210",
  "paymentMethod": "upi",
  "verificationStatus": "verified",
  "message": "Beneficiary added successfully and is ready to use",
  "isDuplicate": false
}
```

**Component**: API endpoint returns response

---

### **STEP 14: Frontend - Handle Success Response**

**In AddBeneficiaryFlow.js**:
```javascript
1. Receive success response
2. Extract beneficiary_id
3. Show success toast: "Beneficiary added!"
4. Clear form data
5. Call onBeneficiaryAdded() callback
6. Close modal OR redirect to beneficiaries list
```

**Component**: `AddBeneficiaryFlow.js` handles response

---

### **STEP 15: Frontend - Update Beneficiaries List**

**Update UI**:
```
Beneficiaries List Screen:
  - Show newly added beneficiary at top
  - Display: Name, Phone, Method, Status badge
  - Action buttons: Delete, (Use for Transfer - separate flow)
  - Show "Verified" status badge
```

**Component**: `BeneficiariesList.js` updates to include new item

---

### **STEP 16: User Can Now Use This Beneficiary**

**Available Actions**:
- ✅ Delete this beneficiary
- ✅ Initiate transfer to this beneficiary (separate flow)
- ✅ Add more beneficiaries

---

## Error Handling Summary

| Scenario | Status | Error Code | User Message | Action |
|----------|--------|-----------|--------------|--------|
| Invalid name | 400 | INVALID_NAME | Name must be 2-255 chars | Show error, allow retry |
| Invalid phone | 400 | INVALID_PHONE | Phone must be 10 digits | Show error, allow retry |
| Invalid UPI format | 400 | INVALID_UPI_FORMAT | UPI format invalid | Show error, allow retry |
| Invalid account | 400 | INVALID_ACCOUNT_NUMBER | Account must be 9-18 digits | Show error, allow retry |
| Invalid IFSC | 400 | INVALID_IFSC_CODE | IFSC must be 11 alphanumeric | Show error, allow retry |
| Duplicate (verified) | 200 | - | Beneficiary exists | Show existing, don't create new |
| Duplicate (pending) | 400 | VERIFICATION_IN_PROGRESS | Still being verified | Block, ask user to wait |
| Duplicate (failed) | - | - | Allow retry | Continue to create new |
| DB error | 500 | SERVER_ERROR | Server error | Retry or contact support |
| Not authorized | 401 | UNAUTHORIZED | Please login again | Redirect to login |

---

## Files Needed for Beneficiary Creation Only

### Backend (2 files)

1. **`services/beneficiary/beneficiary-service.js`** (~500 lines)
   - Business logic for beneficiary management
   - Methods: addBeneficiary, getBeneficiaries, deleteBeneficiary
   - Duplicate detection, encryption, validation

2. **`pages/api/beneficiaries/add.js`** (~200 lines)
   - API endpoint for adding beneficiary
   - Authorization, validation, error handling

### Frontend (3 files)

3. **`components/beneficiary/AddBeneficiaryFlow.js`** (~300 lines)
   - Main flow orchestrator (steps 1-6, 14)
   - State management for form
   - API call handling

4. **`components/beneficiary/BeneficiaryFormUPI.js`** (~200 lines)
   - UPI form (step 2-5)
   - Validation, error display
   - Review screen

5. **`components/beneficiary/BeneficiaryFormBank.js`** (~250 lines)
   - Bank form (step 2-5)
   - Validation, error display
   - Review screen

### Database (1 file)

6. **`supabase/schema.sql`** - Add 2 tables:
   - `beneficiaries` table
   - `beneficiary_verification_log` table

### Configuration (1 file)

7. **`.env.local`** - Add 1 variable:
   - `ENCRYPTION_KEY` (for AES-256 encryption)

---

## Implementation Checklist

- [ ] **Database**: Create beneficiaries table and verification_log table in supabase/schema.sql
- [ ] **Service**: Create BeneficiaryService with addBeneficiary() and helpers
- [ ] **API**: Create POST /api/beneficiaries/add endpoint
- [ ] **Frontend Form UPI**: Create BeneficiaryFormUPI component with validation
- [ ] **Frontend Form Bank**: Create BeneficiaryFormBank component with validation
- [ ] **Frontend Flow**: Create AddBeneficiaryFlow orchestrator
- [ ] **Integration**: Connect form to API, handle responses
- [ ] **List View**: Create BeneficiariesList to display added beneficiaries
- [ ] **Testing**: Test all validation, error cases, happy path

---

## Database Schema (Only for Beneficiaries)

```sql
CREATE TABLE beneficiaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,

  payment_method VARCHAR(50) NOT NULL,

  upi_encrypted VARCHAR(500),
  account_encrypted VARCHAR(500),
  ifsc VARCHAR(20),
  bank_name VARCHAR(255),

  verification_status VARCHAR(50),
  verified_at TIMESTAMP,
  verified_by_system VARCHAR(50),
  verification_attempts INT DEFAULT 0,
  last_verification_attempt TIMESTAMP,

  relationship VARCHAR(100),
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT check_payment_method CHECK (payment_method IN ('upi', 'bank_account')),
  CONSTRAINT check_verification_status CHECK (verification_status IN ('pending', 'verified', 'failed'))
);

CREATE INDEX idx_beneficiaries_user_id ON beneficiaries(user_id);
CREATE INDEX idx_beneficiaries_verification_status ON beneficiaries(verification_status);

---

CREATE TABLE beneficiary_verification_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  beneficiary_id UUID REFERENCES beneficiaries(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  verification_status VARCHAR(50) NOT NULL,
  attempt_number INT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  verification_response JSONB,

  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT check_log_status CHECK (verification_status IN ('pending', 'verified', 'failed'))
);

CREATE INDEX idx_verification_log_beneficiary_id ON beneficiary_verification_log(beneficiary_id);
CREATE INDEX idx_verification_log_user_id ON beneficiary_verification_log(user_id);
```

---

## Summary

**16 Steps Total**:
- ✅ Steps 1-6: Frontend user interaction
- ✅ Steps 7-13: Backend processing
- ✅ Steps 14-16: Frontend success handling

**7 Files to Create**:
- 2 Backend (Service + API)
- 3 Frontend (Form UPI + Form Bank + Flow)
- 1 Database (Schema)
- 1 Configuration (.env)

**Ready for Implementation**: ✅

---

**Clarification Questions** (answer before implementation):

1. **Encryption Key**: Where should `ENCRYPTION_KEY` be stored? (.env, Supabase secrets, AWS KMS)
2. **UPI Matching**: Should UPI comparison be case-insensitive? (amit@bank vs AMIT@BANK)
3. **Relationship Field**: Fixed options (Family/Friend/Business/Other) or free text?
4. **Phone Format**: Only India (+91) or multiple countries?
5. **IFSC Storage**: Auto-uppercase or require user to enter correctly?

---

**Status**: Ready for your approval to start implementation

