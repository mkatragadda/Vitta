# Beneficiary Creation Flow - Complete Steps

**Status**: Planning Phase (Awaiting Approval)
**Date**: Feb 21, 2026
**Scope**: End-to-end beneficiary/recipient creation process

---

## Overview

This document outlines ALL steps required for a user to successfully create a beneficiary (recipient) for international money transfers.

---

## User Journey - Step by Step

### **Step 1: User Initiates Beneficiary Addition**

**Where**: Recipients management screen/modal
**User Action**: Clicks "Add Recipient" or "Add Beneficiary" button

**What Happens**:
- Clear form displayed to user
- User selects payment method (UPI or Bank Account)
- Form fields appear based on selection

---

### **Step 2: User Selects Payment Method**

**Options**:
1. **UPI (Unified Payments Interface)** - For UPI-based transfers
   - Fastest settlement (2-5 minutes)
   - Simpler form (fewer fields)
   - Requires: Name, Phone, UPI ID

2. **Bank Account** - For traditional bank transfers
   - Slower settlement (1-2 days)
   - More detailed form
   - Requires: Name, Phone, Account Number, IFSC, Bank Name

---

### **Step 3: Frontend Validation (Client-Side)**

**Before sending to server, validate**:

#### For Both Methods:
- [ ] Name: 2-255 characters
- [ ] Phone: 10 digits, starts with 6-9 (Indian format)
- [ ] At least one field filled beyond these

#### For UPI:
- [ ] UPI format: `username@bankname` (e.g., `amit@okhdfcbank`)
- [ ] Characters allowed: a-z, 0-9, . _ -
- [ ] Must have @ symbol separating user and bank

#### For Bank Account:
- [ ] Account number: 9-18 digits only
- [ ] IFSC code: Exactly 11 alphanumeric characters (A-Z, 0-9)
- [ ] Bank name: Not empty

**If any validation fails**:
- Show specific error message to user
- Highlight problematic field
- Allow user to correct and resubmit

---

### **Step 4: User Reviews Details**

**Display Summary Screen**:
- Name: [user entered]
- Phone: [user entered]
- Payment Method: UPI / Bank Account
- UPI ID or Account Details: [masked for security]
- Settlement Time: "2-5 minutes (UPI)" or "1-2 days (Bank)"

**User Actions**:
- [ ] Click "Confirm & Add" → Go to Step 5
- [ ] Click "Edit" → Go back to Step 2
- [ ] Click "Cancel" → Exit flow, no changes saved

---

### **Step 5: Send to Backend API**

**Endpoint**: `POST /api/transfers/recipients/add`

**Request Headers**:
```
Authorization: Bearer {jwt-token}
X-User-Id: {user-id-from-token}
Content-Type: application/json
```

**Request Body**:
```json
{
  "name": "Amit Kumar",
  "phone": "9876543210",
  "paymentMethod": "upi",
  "upi": "amit@okhdfcbank",
  "bankName": null,
  "relationship": "family"
}
```

OR for bank account:
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

---

### **Step 6: Backend - Check Authorization**

**Verify**:
- [ ] Authorization header present
- [ ] X-User-Id header present
- [ ] JWT token valid and not expired

**If fails**:
- Return: `401 Unauthorized`
- Message: "Please login again"

---

### **Step 7: Backend - Validate Input Format**

**Server-side validation** (comprehensive checks):

```
Name:
  ✓ Length: 2-255 characters
  ✓ Not null or empty
  ✓ Trim whitespace

Phone:
  ✓ Exactly 10 digits
  ✓ First digit: 6-9
  ✓ Pattern: /^[6-9]\d{9}$/

Payment Method:
  ✓ Must be: "upi" OR "bank_account"

If UPI:
  ✓ UPI ID provided
  ✓ Pattern: /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/
  ✓ Example valid: amit@okhdfcbank, rajesh.sharma@icici

If Bank:
  ✓ Account provided
  ✓ Account pattern: /^\d{9,18}$/
  ✓ IFSC provided
  ✓ IFSC pattern: /^[A-Z0-9]{11}$/
  ✓ Example valid: HDFC0000001, SBIN0001234
```

**If validation fails**:
- Return: `400 Bad Request`
- Include error code + message + suggestion
- Example response:
```json
{
  "success": false,
  "error_code": "INVALID_UPI_FORMAT",
  "error_message": "UPI format invalid",
  "suggestion": "Use format: name@bank (e.g., amit@okhdfcbank)"
}
```

---

### **Step 8: Backend - Check for Duplicates**

**Query database for existing recipients**:

#### For UPI:
```sql
SELECT * FROM recipients
WHERE user_id = {current_user_id}
AND payment_method = 'upi'
AND is_active = true
```

Then decrypt `recipient_upi_encrypted` and compare with submitted UPI (case-insensitive)

#### For Bank Account:
```sql
SELECT * FROM recipients
WHERE user_id = {current_user_id}
AND payment_method = 'bank_account'
AND recipient_bank_ifsc = {submitted_ifsc}
AND is_active = true
```

Then decrypt `recipient_bank_account_encrypted` and compare with submitted account

**Three Scenarios**:

**Scenario A: Exact Duplicate Found (Verified)**
```
Status: verification_status = 'verified'
Action: Return existing recipient, don't create new
Response:
{
  "success": true,
  "recipient_id": "existing-id-123",
  "name": "Amit Kumar",
  "isDuplicate": true,
  "message": "This recipient already exists in your list"
}
```

**Scenario B: Duplicate Found (Failed Previous Attempt)**
```
Status: verification_status = 'failed'
Action: Allow retry, proceed with new verification
Response: Continue to Step 9 (new verification)
```

**Scenario C: Duplicate Found (Still Verifying)**
```
Status: verification_status = 'pending'
Action: Block, ask user to wait
Response:
{
  "success": false,
  "error_code": "VERIFICATION_IN_PROGRESS",
  "error_message": "This recipient is currently being verified",
  "isDuplicate": true,
  "suggestion": "Please wait for the verification to complete"
}
```

**No Duplicate Found**:
- Continue to Step 9

---

### **Step 9: Backend - Encrypt Sensitive Fields**

**Fields to Encrypt**:
- UPI ID (if UPI method)
- Account Number (if Bank method)

**Encryption Method**: AES-256-CBC
```
1. Generate random 16-byte IV
2. Encrypt plaintext using AES-256-CBC
3. Store as: {hex(IV)}:{hex(encrypted)}
```

**Example**:
```
Plain: amit@okhdfcbank
IV: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
Encrypted: abc123def456...
Stored: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6:abc123def456...
```

**Fields NOT Encrypted**:
- IFSC code (non-sensitive, needed for lookups)
- Bank name (non-sensitive)
- Phone number (non-sensitive)
- Name (non-sensitive)

---

### **Step 10: Backend - Create Recipient Record in Database**

**Insert into `recipients` table**:

```sql
INSERT INTO recipients (
  id,                              -- UUID generated
  user_id,                         -- From JWT token
  recipient_name,                  -- User input
  recipient_phone,                 -- User input
  payment_method,                  -- 'upi' or 'bank_account'
  recipient_upi_encrypted,         -- Encrypted, or NULL
  recipient_bank_account_encrypted,-- Encrypted, or NULL
  recipient_bank_ifsc,             -- Plain, or NULL
  recipient_bank_name,             -- Plain, or NULL
  verification_status,             -- 'verified' (local validation only)
  verified_at,                     -- Current timestamp
  verified_by_system,              -- 'local_validation'
  verification_attempts,           -- 1
  last_verification_attempt,       -- Current timestamp
  relationship_to_user,            -- From user input
  is_active,                       -- true
  created_at,                      -- Current timestamp
  updated_at                       -- Current timestamp
)
```

**If insert fails**:
- Return: `500 Server Error`
- Log error for debugging
- Message: "Failed to create recipient. Please try again."

---

### **Step 11: Backend - Log Verification Attempt**

**Insert into `recipient_verification_log` table**:

```sql
INSERT INTO recipient_verification_log (
  id,                       -- UUID generated
  recipient_id,             -- From Step 10
  user_id,                  -- From JWT token
  verification_status,      -- 'verified'
  attempt_number,           -- 1
  ip_address,               -- From request headers
  user_agent,               -- From request headers
  verification_response,    -- JSON with method + timestamp
  created_at                -- Current timestamp
)
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

---

### **Step 12: Backend - Return Success Response**

**Response Code**: `200 OK`

**Response Body**:
```json
{
  "success": true,
  "recipient_id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Amit Kumar",
  "verificationStatus": "verified",
  "message": "Recipient added successfully and is ready to use",
  "isDuplicate": false
}
```

---

### **Step 13: Frontend - Handle Success Response**

**Display Success**:
- [ ] Show toast/notification: "Recipient added successfully!"
- [ ] Clear form
- [ ] Redirect to recipients list OR recipients management screen
- [ ] Show newly added recipient in list

**Store Response**:
- [ ] recipient_id for future transactions
- [ ] Update local state to reflect new recipient

---

### **Step 14: Frontend - Display New Recipient**

**Recipients List Screen Updates**:
- Add new recipient to top of list
- Show: Name, Phone, Payment Method, Verification Status
- Provide actions: Use for Transfer, Edit, Delete

---

## Error Handling Summary

| Error | Code | User Message | Suggestion |
|-------|------|--------------|-----------|
| Missing auth | 401 | Unauthorized | Please login again |
| Invalid name | 400 | Name too short/long | Name must be 2-255 characters |
| Invalid phone | 400 | Invalid phone number | Phone must be 10 digits (6-9 start) |
| Invalid UPI | 400 | Invalid UPI format | Use format: name@bank |
| Invalid account | 400 | Invalid account number | Account must be 9-18 digits |
| Invalid IFSC | 400 | Invalid IFSC code | IFSC must be 11 alphanumeric |
| Duplicate verified | 200 | Recipient exists | This recipient already exists |
| Duplicate pending | 400 | Verification in progress | Please wait for completion |
| DB error | 500 | Server error | Try again or contact support |

---

## Security Considerations

✅ **Encryption**:
- Sensitive fields encrypted before storage
- Random IV per field
- AES-256-CBC cipher

✅ **Authorization**:
- User-scoped queries
- Can only see/manage own recipients
- JWT token validation required

✅ **Validation**:
- Client-side: Quick feedback
- Server-side: Authoritative validation
- Both mandatory

✅ **Audit Trail**:
- IP address logged
- User agent logged
- Full response logged
- All attempts recorded

✅ **Data Protection**:
- Sensitive fields masked in responses
- No account numbers in UI
- Masked UPI in logs (***@bank)

---

## Database Schema Requirements

### `recipients` Table:
```sql
- id (UUID, PK)
- user_id (FK to users.id, required)
- recipient_name (VARCHAR, required)
- recipient_phone (VARCHAR, required)
- payment_method (VARCHAR, 'upi' or 'bank_account')
- recipient_upi_encrypted (VARCHAR, nullable)
- recipient_bank_account_encrypted (VARCHAR, nullable)
- recipient_bank_ifsc (VARCHAR, nullable)
- recipient_bank_name (VARCHAR, nullable)
- verification_status (VARCHAR, 'verified'/'failed'/'pending')
- verified_at (TIMESTAMP)
- verified_by_system (VARCHAR)
- verification_attempts (INT)
- last_verification_attempt (TIMESTAMP)
- relationship_to_user (VARCHAR)
- is_active (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### `recipient_verification_log` Table:
```sql
- id (UUID, PK)
- recipient_id (FK to recipients.id, nullable)
- user_id (FK to users.id, required)
- verification_status (VARCHAR)
- attempt_number (INT)
- ip_address (VARCHAR)
- user_agent (VARCHAR)
- verification_response (JSON/TEXT)
- created_at (TIMESTAMP)
```

---

## Implementation Checklist

**Phase 1: Backend Services**
- [ ] Create `services/chimoney/recipient-service.js`
  - [ ] `addRecipient()` method
  - [ ] `checkDuplicateRecipient()` helper
  - [ ] `validateRecipientInput()` helper
  - [ ] AES encryption/decryption helpers
  - [ ] UUID generation

**Phase 2: API Endpoints**
- [ ] Create `pages/api/transfers/recipients/add.js`
  - [ ] Input validation
  - [ ] Authorization check
  - [ ] Duplicate detection
  - [ ] Encryption
  - [ ] Database insertion
  - [ ] Error handling
  - [ ] Response formatting

**Phase 3: Frontend Components**
- [ ] Create recipient form component
  - [ ] Payment method selector
  - [ ] Dynamic form fields
  - [ ] Client-side validation
  - [ ] Error display

**Phase 4: Integration**
- [ ] Connect API endpoint to form
- [ ] Handle success/error responses
- [ ] Update recipients list
- [ ] Test all error scenarios

**Phase 5: Testing**
- [ ] Unit tests for validation
- [ ] Unit tests for encryption
- [ ] Unit tests for duplicate detection
- [ ] Integration tests for API
- [ ] E2E tests for UI flow

---

## Questions for Review

Before implementation, please clarify:

1. **Encryption Key Management**:
   - Where should the AES-256 encryption key be stored? (.env, Supabase secrets, KMS)
   - Should it be rotatable?

2. **Duplicate Detection**:
   - Should we allow case-insensitive UPI matching? (e.g., Amit@OKHDFCBANK == amit@okhdfcbank)
   - Should we detect similar names (e.g., "Amit Kumar" vs "amit kumar")?

3. **Relationship Field**:
   - Should this be a fixed list (family, business, friend, other) or free text?
   - Is this optional or required?

4. **Phone Number**:
   - Only India (+91)? Or support multiple countries?
   - Should we store as +919876543210 or just 9876543210?

5. **Future Extensibility**:
   - Any other payment methods planned (Wallet, Mobile Money)?
   - Should the structure support them already?

---

**Ready for your review and approval before implementation.**
