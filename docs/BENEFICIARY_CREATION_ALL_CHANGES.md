# Beneficiary Creation - Complete Changes Overview

**Status**: Ready for Implementation (Awaiting Approval)
**Scope**: End-to-end backend + frontend implementation
**Date**: Feb 21, 2026

---

## Files to Create (NEW)

### Backend Services (2 files)

#### 1. `services/chimoney/recipient-service.js` (~550 lines)
**Purpose**: Business logic for recipient/beneficiary management

**Exports**:
- `class RecipientService`
  - `constructor(db, encryptionKey)`
  - `addRecipient(userId, recipientData)` - Add new recipient
  - `getRecipients(userId)` - Get all recipients
  - `getRecipient(userId, recipientId)` - Get single recipient
  - `deleteRecipient(userId, recipientId)` - Soft delete
  - `_checkDuplicateRecipient(userId, recipientData)` - Check duplicates
  - `_validateRecipientInput(data)` - Validate input
  - `_validatePaymentMethod(data)` - Payment method validation
  - `_encryptSensitiveFields(data)` - Encrypt UPI/account
  - `_encryptField(plaintext)` - AES encryption
  - `_decryptField(encryptedData)` - AES decryption
  - `_decryptRecipient(recipient)` - Decrypt recipient object
  - `_logVerification(recipientId, userId, status, details)` - Audit log
  - `_mapErrorCode(error)` - Error mapping
  - `_getSuggestion(error)` - User-friendly suggestions
  - `_generateUUID()` - UUID generation

**Dependencies**:
```javascript
const crypto = require('crypto');
```

**Key Features**:
- Duplicate detection (verified/failed/pending scenarios)
- AES-256-CBC encryption with random IV
- Comprehensive input validation
- User-scoped database queries
- Verification logging

---

#### 2. `services/chimoney/chimoney-client.js` (~400 lines)
**Purpose**: Chimoney API client for payout operations

**Exports**:
- `class ChimoneyClient`
  - `constructor(apiKey, options)`
  - `initiatePayoutBank(params, options)` - Bank payout
  - `initiatePayoutUPI(params, options)` - UPI payout
  - `getPayoutStatus(payoutId)` - Get payout status
  - `_makeRequest(endpoint, method, body, retryCount)` - HTTP requests
  - `_validatePayoutParams(params)` - Validate params
  - `_mapErrorCode(error)` - Map errors
  - `_getSuggestion(error)` - User suggestions
  - `_maskAccountNumber(accountNumber)` - Mask for logging
  - `_maskUPI(upiId)` - Mask for logging

**Dependencies**:
```javascript
// Fetch API (native)
```

**Key Features**:
- Retry logic: Exponential backoff (1s, 2s, 4s)
- 30-second timeout on all requests
- Error handling for network, 5xx, 4xx errors
- Logging with data masking
- Comprehensive validation

---

### API Endpoints (3 files)

#### 3. `pages/api/transfers/recipients/add.js` (~200 lines)
**Purpose**: Add new recipient endpoint

**Method**: POST
**Route**: `/api/transfers/recipients/add`

**Request**:
```javascript
{
  Authorization: "Bearer {token}",
  X-User-Id: "{user_id}",
  Content-Type: "application/json"
}
Body: {
  name: string,
  phone: string,
  paymentMethod: "upi" | "bank_account",
  upi?: string,
  account?: string,
  ifsc?: string,
  bankName?: string,
  relationship?: string,
  corridorId?: string
}
```

**Response Success** (200):
```javascript
{
  success: true,
  recipient_id: string,
  name: string,
  verificationStatus: "verified",
  message: string,
  isDuplicate: boolean
}
```

**Response Error** (400/500):
```javascript
{
  success: false,
  error_code: string,
  error_message: string,
  suggestion: string
}
```

**Key Operations**:
1. Extract user ID from auth header
2. Validate input format
3. Initialize RecipientService
4. Call `addRecipient()`
5. Return response

**Dependencies**:
```javascript
import RecipientService from '../../../../services/chimoney/recipient-service';
import { createClient } from '@supabase/supabase-js';
```

---

#### 4. `pages/api/transfers/recipients/index.js` (~150 lines)
**Purpose**: List and delete recipients

**Methods**: GET, DELETE
**Route**: `/api/transfers/recipients`

**GET Request**:
```javascript
{
  Authorization: "Bearer {token}",
  X-User-Id: "{user_id}"
}
```

**GET Response** (200):
```javascript
{
  success: true,
  recipients: [
    {
      id: string,
      name: string,
      phone: string,
      paymentMethod: "upi" | "bank_account",
      upi?: string (decrypted),
      account?: string (decrypted),
      ifsc?: string,
      bankName?: string,
      relationship: string,
      verificationStatus: string,
      verifiedAt: timestamp,
      createdAt: timestamp
    }
  ],
  count: number
}
```

**DELETE Request**:
```javascript
{
  Authorization: "Bearer {token}",
  X-User-Id: "{user_id}",
  query: { recipientId: string }
}
```

**DELETE Response** (200):
```javascript
{
  success: true,
  message: "Recipient deleted successfully"
}
```

**Key Operations**:
- GET: Query recipients, decrypt sensitive fields
- DELETE: Soft delete (mark is_active = false)

**Dependencies**: Same as add.js

---

#### 5. `pages/api/transfers/initiate.js` (~300 lines)
**Purpose**: Initiate money transfer to recipient

**Method**: POST
**Route**: `/api/transfers/initiate`

**Request**:
```javascript
{
  Authorization: "Bearer {token}",
  X-User-Id: "{user_id}",
  Content-Type: "application/json"
}
Body: {
  recipientId: string,
  amount: number,
  corridorId?: string,
  reference?: string
}
```

**Response Success** (200):
```javascript
{
  success: true,
  transferId: string,
  payoutId: string,
  status: string,
  amount: number,
  currency: "INR",
  reference: string,
  message: string,
  recipient: {
    id: string,
    name: string,
    method: string
  }
}
```

**Response Error** (400/404/500):
```javascript
{
  success: false,
  error_code: string,
  error_message: string,
  suggestion: string
}
```

**Key Operations**:
1. Extract user ID from auth
2. Validate amount > 0
3. Get recipient details
4. Call ChimoneyClient for payout
5. Store transfer record
6. Return response

**Dependencies**:
```javascript
import ChimoneyClient from '../../../services/chimoney/chimoney-client';
import RecipientService from '../../../services/chimoney/recipient-service';
```

---

#### 6. `pages/api/transfers/webhooks/chimoney.js` (~250 lines)
**Purpose**: Handle Chimoney webhook for payment status updates

**Method**: POST
**Route**: `/api/transfers/webhooks/chimoney`

**Request** (from Chimoney):
```javascript
Headers: {
  X-Signature: string (HMAC signature, production only)
}
Body: {
  id: string (payout ID),
  status: "NEW" | "PROCESSING" | "SUCCESS" | "FAILED",
  reference: string,
  amount: number,
  currency: string,
  createdAt: timestamp,
  completedAt?: timestamp,
  failureReason?: string
}
```

**Response** (200):
```javascript
{
  acknowledged: true,
  transferId?: string,
  newStatus?: string
}
```

**Key Operations**:
1. Verify webhook signature (production)
2. Find transfer by payout ID
3. Map Chimoney status to internal status
4. Update transfer record
5. Create status log entry
6. Generate user notification

**Dependencies**: Same as above

---

### Frontend Components (5 files)

#### 7. `components/transfers/AddRecipientFlow.js` (~400 lines)
**Purpose**: Main flow for adding recipients

**Props**:
```javascript
{
  onRecipientAdded: (recipient) => void,
  onCancel: () => void,
  corridorId?: string
}
```

**State**:
```javascript
{
  step: "method-select" | "form" | "review" | "loading" | "success" | "error",
  paymentMethod: "upi" | "bank_account" | null,
  formData: {},
  errors: {},
  loading: boolean,
  error: { code: string, message: string, suggestion: string } | null
}
```

**Steps**:
1. **method-select**: User selects UPI or Bank
2. **form**: User enters details
3. **review**: Show summary before submission
4. **loading**: Submitting to API
5. **success**: Show confirmation
6. **error**: Show error with retry

**Key Features**:
- Progressive disclosure (steps)
- Client-side validation
- Error recovery with suggestions
- Loading states
- Success confirmation

**Components Used**:
- `RecipientFormUPI` - UPI form
- `RecipientFormBank` - Bank form
- `RecipientReview` - Review screen
- `ErrorBanner` - Error display

---

#### 8. `components/transfers/RecipientFormUPI.js` (~200 lines)
**Purpose**: UPI recipient form

**Props**:
```javascript
{
  onSubmit: (data) => void,
  onCancel: () => void,
  loading: boolean,
  initialData?: {}
}
```

**Fields**:
- Name (text input)
- Phone (tel input)
- UPI ID (text input)
- Relationship (select)

**Validation**:
- Name: 2-255 chars, shows error inline
- Phone: 10 digits starting 6-9
- UPI: user@bank format with regex
- Real-time validation as user types

**Features**:
- Error highlighting
- Helper text
- Disabled submit while loading
- Cancel button

---

#### 9. `components/transfers/RecipientFormBank.js` (~250 lines)
**Purpose**: Bank recipient form

**Props**: Same as RecipientFormUPI

**Fields**:
- Name (text input)
- Phone (tel input)
- Account Number (text input)
- IFSC Code (text input)
- Bank Name (text input, auto-filled based on IFSC)
- Relationship (select)

**Validation**:
- Name: 2-255 chars
- Phone: 10 digits starting 6-9
- Account: 9-18 digits
- IFSC: 11 alphanumeric chars (uppercase)
- All required

**Features**:
- Bank lookup by IFSC (optional, nice-to-have)
- Error highlighting
- Real-time validation
- Progress indicator
- Disabled submit while loading

---

#### 10. `components/transfers/RecipientsList.js` (~300 lines)
**Purpose**: Display list of recipients

**Props**:
```javascript
{
  onSelectRecipient: (recipient) => void,
  onDeleteRecipient: (recipientId) => void,
  onAddRecipient: () => void,
  loading: boolean
}
```

**State**:
```javascript
{
  recipients: [],
  loading: boolean,
  error: string | null,
  deleteConfirm: { id: string, name: string } | null
}
```

**Features**:
- List of recipients with cards
- Each card shows: Name, Phone, Method, Status
- Actions: Select (for transfer), Delete
- Delete confirmation modal
- Empty state (no recipients yet)
- Refresh button
- Add new recipient button

**Displays**:
- Recipient name
- Payment method (UPI / Bank)
- Last 4 digits of UPI/account (masked)
- Verification status badge
- Action buttons

---

#### 11. `components/transfers/TransferInitiation.js` (~350 lines)
**Purpose**: Initiate transfer from recipient

**Props**:
```javascript
{
  recipient: {},
  onTransferInitiated: (transfer) => void,
  onCancel: () => void,
  corridorId?: string
}
```

**State**:
```javascript
{
  amount: number | null,
  loading: boolean,
  error: { code: string, message: string } | null,
  success: { transferId: string, reference: string } | null
}
```

**Flow**:
1. Display recipient details
2. User enters amount
3. Show estimated fees (if applicable)
4. User confirms
5. Submit to API
6. Show success with transaction ID

**Validations**:
- Amount > 0
- Amount < max transfer limit
- Recipient verified
- User authorized

**Features**:
- Amount input with keyboard
- Fee calculation/display
- Recipient summary
- Confirmation step
- Success screen with reference ID
- Error handling

---

### Utilities/Helpers (1 file)

#### 12. `services/chimoney/db-adapter.js` (OPTIONAL, ~150 lines)
**Purpose**: Database adapter layer for Supabase

**Exports**:
- `class SupabaseDBAdapter`
  - `constructor(supabaseClient)`
  - Recipients CRUD operations
  - Verification log operations
  - Transfer operations
  - Notification operations

**Benefits**:
- Reusable across API endpoints
- Easy to swap for different DB
- Type-safe operations

**OR**: Inline in each API endpoint (simpler, less abstraction)

---

## Files to Modify (EXISTING)

### 1. `supabase/schema.sql` - Add Tables

**Tables to Add/Verify**:

```sql
-- Beneficiaries/Recipients table
CREATE TABLE recipients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  corridor_id UUID REFERENCES transfer_corridors(id),

  recipient_name VARCHAR(255) NOT NULL,
  recipient_phone VARCHAR(20),
  recipient_email VARCHAR(255),

  payment_method VARCHAR(50) NOT NULL,

  recipient_upi_encrypted VARCHAR(500),
  recipient_bank_account_encrypted VARCHAR(500),
  recipient_bank_ifsc VARCHAR(20),
  recipient_bank_name VARCHAR(255),

  chimoney_recipient_id VARCHAR(255),
  verification_status VARCHAR(50),
  verified_at TIMESTAMP,
  verified_by_system VARCHAR(50),
  verification_error TEXT,
  verification_attempts INT DEFAULT 0,
  last_verification_attempt TIMESTAMP,

  is_active BOOLEAN DEFAULT true,
  relationship_to_user VARCHAR(100),
  verified_documents JSONB,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT check_payment_method CHECK (payment_method IN ('upi', 'bank_account')),
  CONSTRAINT check_verification_status CHECK (verification_status IN ('pending', 'verified', 'failed'))
);

CREATE INDEX idx_recipients_user_id ON recipients(user_id);
CREATE INDEX idx_recipients_verification_status ON recipients(verification_status);

-- Verification log for audit trail
CREATE TABLE recipient_verification_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID REFERENCES recipients(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  verification_status VARCHAR(50) NOT NULL,
  attempt_number INT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  verification_response JSONB,
  verified_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT check_log_status CHECK (verification_status IN ('pending', 'verified', 'failed'))
);

CREATE INDEX idx_verification_log_recipient_id ON recipient_verification_log(recipient_id);
CREATE INDEX idx_verification_log_user_id ON recipient_verification_log(user_id);

-- Transfers table
CREATE TABLE transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES recipients(id),
  corridor_id UUID REFERENCES transfer_corridors(id),

  chimoney_payout_id VARCHAR(255),
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  payment_method VARCHAR(50),
  reference VARCHAR(255) UNIQUE,

  status VARCHAR(50),
  initiated_at TIMESTAMP,
  completed_at TIMESTAMP,

  error_code VARCHAR(100),
  error_message TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT check_transfer_status CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'))
);

CREATE INDEX idx_transfers_user_id ON transfers(user_id);
CREATE INDEX idx_transfers_recipient_id ON transfers(recipient_id);
CREATE INDEX idx_transfers_chimoney_payout_id ON transfers(chimoney_payout_id);
CREATE INDEX idx_transfers_reference ON transfers(reference);

-- Transfer status audit log
CREATE TABLE transfer_status_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transfer_id UUID NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
  old_status VARCHAR(50),
  new_status VARCHAR(50),
  chimoney_status VARCHAR(50),
  chimoney_response JSONB,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_transfer_status_log_transfer_id ON transfer_status_log(transfer_id);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transfer_id UUID REFERENCES transfers(id) ON DELETE CASCADE,

  type VARCHAR(100),
  title VARCHAR(255),
  message TEXT,
  status VARCHAR(50) DEFAULT 'UNREAD',
  data JSONB,

  created_at TIMESTAMP DEFAULT NOW(),
  read_at TIMESTAMP,

  CONSTRAINT check_notification_status CHECK (status IN ('UNREAD', 'READ', 'ARCHIVED'))
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
```

---

### 2. `.env.local` - Add Environment Variables

**Variables to Add**:
```bash
# Chimoney API
CHIMONEY_API_KEY=your_api_key_here
CHIMONEY_WEBHOOK_SECRET=your_webhook_secret_here

# Encryption
ENCRYPTION_KEY=your_32_char_hex_key_here

# Database
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

### 3. `package.json` - Verify Dependencies

**Check/Add**:
```json
{
  "dependencies": {
    "crypto": "builtin",
    "@supabase/supabase-js": "^2.x.x",
    "react": "^18.x.x",
    "next": "^14.x.x"
  }
}
```

**Note**: `crypto` is Node.js built-in, Supabase client likely already installed

---

### 4. `pages/_app.js` - Optional: Add Chimoney SDK

**If Chimoney has client SDK** (currently not needed):
```javascript
// Load Chimoney SDK globally if available
import { ChimoneyScript } from 'chimoney-sdk';

export default function App({ Component, pageProps }) {
  useEffect(() => {
    // Initialize Chimoney if needed
  }, []);

  return <Component {...pageProps} />;
}
```

---

### 5. `pages/index.js` or Main Dashboard - Add Navigation

**Add button/link to Recipients management**:
```javascript
<button onClick={() => navigate('recipients')}>
  Manage Recipients
</button>
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────┐
│        User Interface (React)           │
├─────────────────────────────────────────┤
│  AddRecipientFlow                       │
│  ├─ RecipientFormUPI                    │
│  ├─ RecipientFormBank                   │
│  ├─ RecipientReview                     │
│  └─ RecipientsList                      │
└──────────────────┬──────────────────────┘
                   │ HTTP POST/GET/DELETE
                   ▼
┌─────────────────────────────────────────┐
│        API Layer (Next.js)              │
├─────────────────────────────────────────┤
│  POST /api/transfers/recipients/add     │
│  GET /api/transfers/recipients          │
│  DELETE /api/transfers/recipients       │
│  POST /api/transfers/initiate           │
│  POST /api/transfers/webhooks/chimoney  │
└──────────────────┬──────────────────────┘
                   │ Function calls
                   ▼
┌─────────────────────────────────────────┐
│      Business Logic (Services)          │
├─────────────────────────────────────────┤
│  RecipientService                       │
│  ├─ addRecipient()                      │
│  ├─ getRecipients()                     │
│  ├─ deleteRecipient()                   │
│  └─ _checkDuplicateRecipient()          │
│                                          │
│  ChimoneyClient                         │
│  ├─ initiatePayoutBank()                │
│  ├─ initiatePayoutUPI()                 │
│  └─ getPayoutStatus()                   │
└──────────────────┬──────────────────────┘
                   │ SQL + Encryption
                   ▼
┌─────────────────────────────────────────┐
│      Database (Supabase)                │
├─────────────────────────────────────────┤
│  recipients                             │
│  recipient_verification_log             │
│  transfers                              │
│  transfer_status_log                    │
│  notifications                          │
└─────────────────────────────────────────┘
                   ▲
                   │ Webhooks
                   │
            ┌──────────────┐
            │ Chimoney API │
            └──────────────┘
```

---

## Summary of Changes

| Category | Count | Items |
|----------|-------|-------|
| **NEW Backend Services** | 2 | RecipientService, ChimoneyClient |
| **NEW API Endpoints** | 4 | Add, List, Delete, Initiate + Webhook |
| **NEW Frontend Components** | 5 | AddFlow, FormUPI, FormBank, List, Initiation |
| **NEW Utilities** | 1 | DB Adapter (optional) |
| **MODIFIED Files** | 2 | schema.sql, .env.local |
| **Total NEW Lines** | ~2500+ | Services, APIs, Components |
| **Total MODIFIED Lines** | ~100+ | Schema, env, navigation |
| **New Database Tables** | 5 | recipients, verification_log, transfers, status_log, notifications |
| **New Database Indexes** | 6 | For performance |

---

## Implementation Order

**Recommended sequence**:

1. ✅ Create database tables (schema.sql)
2. ✅ Add environment variables (.env.local)
3. ✅ Create RecipientService (services layer)
4. ✅ Create API: POST /recipients/add
5. ✅ Create ChimoneyClient (services layer)
6. ✅ Create API: POST /transfers/initiate
7. ✅ Create API: GET/DELETE /recipients
8. ✅ Create API: POST /webhooks/chimoney
9. ✅ Create RecipientFormUPI component
10. ✅ Create RecipientFormBank component
11. ✅ Create RecipientReview component
12. ✅ Create AddRecipientFlow component
13. ✅ Create RecipientsList component
14. ✅ Create TransferInitiation component
15. ✅ Add navigation/routing
16. ✅ Test all flows

---

## Deployment Checklist

Before going to production:

- [ ] Environment variables set in deployment platform
- [ ] Database migrations run (schema.sql)
- [ ] Chimoney API credentials configured
- [ ] Encryption key generated and stored securely
- [ ] Webhook URL configured in Chimoney dashboard
- [ ] SSL certificate for webhooks
- [ ] Rate limiting configured
- [ ] Error tracking (Sentry/etc) configured
- [ ] Logging configured
- [ ] Database backups enabled
- [ ] Load testing completed
- [ ] Security audit completed

---

**Ready for approval to proceed with implementation.**
