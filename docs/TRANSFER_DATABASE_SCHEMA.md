# Transfer Database Schema - What Needs to be Added

**Current state vs. what's needed for transfers**

---

## 📊 Current Plaid Tables

### ✅ Already Exists: `plaid_items`
```sql
-- Plaid bank connection (one per bank/institution)
id, user_id, plaid_item_id, access_token_enc,
institution_id, institution_name, ...
```

### ✅ Already Exists: `plaid_accounts`
```sql
-- Individual accounts within a Plaid connection
id, plaid_item_id, plaid_account_id, mask, name,
official_name, account_type, account_subtype,
current_balance, available_balance, credit_limit,
vitta_card_id, is_active, ...
```

**Current purpose**: Tracking credit card liabilities for payment optimization

---

## 🆕 What We Need to Add (For Transfers)

### **Option 1: Extend plaid_accounts table** ✅ RECOMMENDED
Add transfer-specific columns to existing `plaid_accounts` table:

```sql
-- ALTER plaid_accounts table
ALTER TABLE plaid_accounts ADD COLUMN (
  -- For depository accounts (checking, savings)
  routing_number VARCHAR(9),                    -- US routing number (9 digits)
  account_number_encrypted TEXT,                -- AES-256-CBC encrypted
  account_holder_name TEXT,                     -- From Plaid identity or manual entry

  -- Transfer capability flags
  can_transfer_out BOOLEAN DEFAULT false,       -- Can this account send money?
  is_verified_for_transfer BOOLEAN DEFAULT false,  -- Passed all checks
  transfer_verification_status VARCHAR(50),     -- pending, verified, failed

  -- Transfer limits (per institution/account)
  daily_transfer_limit NUMERIC DEFAULT 5000,   -- Max per day
  transaction_limit NUMERIC DEFAULT 50000,     -- Max per transaction

  -- Audit trail
  last_transfer_at TIMESTAMP,
  transfer_count INT DEFAULT 0,

  -- Metadata
  transfer_metadata JSONB                       -- Any extra data
);

-- Create indexes for transfer queries
CREATE INDEX idx_plaid_accts_can_transfer
  ON plaid_accounts(user_id, can_transfer_out)
  WHERE can_transfer_out = true;

CREATE INDEX idx_plaid_accts_depository
  ON plaid_accounts(account_type)
  WHERE account_type = 'depository';
```

**Why this approach?**
- ✅ Reuses existing table (less migration)
- ✅ Plaid already fetches account details
- ✅ Can mix credit card and bank account data
- ✅ Simpler queries

---

### **Option 2: Create separate table** (Alternative)
```sql
CREATE TABLE plaid_transfer_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plaid_account_id UUID NOT NULL REFERENCES plaid_accounts(id),

  routing_number VARCHAR(9),
  account_number_encrypted TEXT,
  account_holder_name TEXT,

  can_transfer_out BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Why NOT this approach?**
- ❌ Duplicate data (plaid_account already exists)
- ❌ More joins in queries
- ❌ More complex migrations

**Recommendation: Use Option 1 (extend plaid_accounts)**

---

## 🆕 New Tables Needed for Transfers

### **1. transfers table** (REQUIRED)
```sql
CREATE TABLE transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- SOURCE: Plaid account (where money comes FROM)
  plaid_account_id UUID NOT NULL REFERENCES plaid_accounts(id),

  -- DESTINATION: Beneficiary (where money goes TO)
  beneficiary_id UUID NOT NULL REFERENCES beneficiaries(id),

  -- Amounts
  source_amount DECIMAL(15, 2) NOT NULL,      -- What user sends (e.g., 502.50 USD)
  source_currency VARCHAR(3) DEFAULT 'USD',
  target_amount DECIMAL(15, 2) NOT NULL,      -- What recipient gets (e.g., 41625 INR)
  target_currency VARCHAR(3) NOT NULL,        -- INR
  exchange_rate DECIMAL(10, 4) NOT NULL,      -- 83.25 (1 USD = 83.25 INR)
  fee_amount DECIMAL(15, 2) NOT NULL,         -- 2.50
  fee_percentage DECIMAL(5, 3) NOT NULL,      -- 0.5

  -- Chimoney reference
  chimoney_transaction_id VARCHAR(255),       -- chi_9876543210
  chimoney_reference VARCHAR(255),            -- TXN_USD_INR_2026_028

  -- Status
  status VARCHAR(50) DEFAULT 'pending',
    -- pending: Created, not yet sent to Chimoney
    -- processing: Sent to Chimoney, in transit
    -- completed: Delivered to recipient
    -- failed: Chimoney rejected
    -- cancelled: User cancelled (only if pending)

  -- Timestamps
  initiated_at TIMESTAMP DEFAULT NOW(),       -- When user started
  executed_at TIMESTAMP,                      -- When sent to Chimoney
  completed_at TIMESTAMP,                     -- When recipient got it
  cancelled_at TIMESTAMP,                     -- If cancelled

  -- Audit trail
  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_transfers_user_id ON transfers(user_id);
CREATE INDEX idx_transfers_plaid_account ON transfers(plaid_account_id);
CREATE INDEX idx_transfers_beneficiary ON transfers(beneficiary_id);
CREATE INDEX idx_transfers_status ON transfers(status);
CREATE INDEX idx_transfers_chimoney_id ON transfers(chimoney_transaction_id);
CREATE INDEX idx_transfers_created_at ON transfers(created_at DESC);
```

### **2. transfer_status_log table** (AUDIT TRAIL)
```sql
CREATE TABLE transfer_status_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,

  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,

  reason TEXT,  -- "User cancelled", "Chimoney rejected", etc.

  metadata JSONB,  -- { error_code, error_message, chimoney_response }

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_transfer_log_transfer_id ON transfer_status_log(transfer_id);
CREATE INDEX idx_transfer_log_status ON transfer_status_log(new_status);
```

---

## 📋 Complete Schema Update SQL

```sql
-- ============================================================================
-- PART 1: Update plaid_accounts table for transfer support
-- ============================================================================

ALTER TABLE plaid_accounts ADD COLUMN (
  -- Transfer details (for depository/checking accounts)
  routing_number VARCHAR(9),
  account_number_encrypted TEXT,
  account_holder_name TEXT,

  -- Transfer capability
  can_transfer_out BOOLEAN DEFAULT false,
  is_verified_for_transfer BOOLEAN DEFAULT false,
  transfer_verification_status VARCHAR(50),  -- pending, verified, failed

  -- Transfer limits
  daily_transfer_limit NUMERIC DEFAULT 5000,
  transaction_limit NUMERIC DEFAULT 50000,

  -- Audit
  last_transfer_at TIMESTAMP,
  transfer_count INT DEFAULT 0,
  transfer_metadata JSONB
);

-- Create indexes for transfer queries
CREATE INDEX IF NOT EXISTS idx_plaid_can_transfer
  ON plaid_accounts(user_id, can_transfer_out)
  WHERE can_transfer_out = true;

CREATE INDEX IF NOT EXISTS idx_plaid_depository
  ON plaid_accounts(account_type)
  WHERE account_type = 'depository';

-- ============================================================================
-- PART 2: Create transfers table
-- ============================================================================

CREATE TABLE transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plaid_account_id UUID NOT NULL REFERENCES plaid_accounts(id),
  beneficiary_id UUID NOT NULL REFERENCES beneficiaries(id),

  source_amount DECIMAL(15, 2) NOT NULL,
  source_currency VARCHAR(3) DEFAULT 'USD',
  target_amount DECIMAL(15, 2) NOT NULL,
  target_currency VARCHAR(3) NOT NULL,
  exchange_rate DECIMAL(10, 4) NOT NULL,
  fee_amount DECIMAL(15, 2) NOT NULL,
  fee_percentage DECIMAL(5, 3) NOT NULL,

  chimoney_transaction_id VARCHAR(255),
  chimoney_reference VARCHAR(255),

  status VARCHAR(50) DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),

  initiated_at TIMESTAMP DEFAULT NOW(),
  executed_at TIMESTAMP,
  completed_at TIMESTAMP,
  cancelled_at TIMESTAMP,

  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_transfers_user ON transfers(user_id);
CREATE INDEX idx_transfers_plaid_account ON transfers(plaid_account_id);
CREATE INDEX idx_transfers_beneficiary ON transfers(beneficiary_id);
CREATE INDEX idx_transfers_status ON transfers(status);
CREATE INDEX idx_transfers_chimoney ON transfers(chimoney_transaction_id);
CREATE INDEX idx_transfers_created ON transfers(created_at DESC);

-- ============================================================================
-- PART 3: Create transfer_status_log table (audit trail)
-- ============================================================================

CREATE TABLE transfer_status_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_transfer_log_id ON transfer_status_log(transfer_id);
CREATE INDEX idx_transfer_log_status ON transfer_status_log(new_status);

-- ============================================================================
-- PART 4: Add triggers for automatic updated_at
-- ============================================================================

CREATE TRIGGER trg_transfers_updated_at
  BEFORE UPDATE ON transfers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_plaid_accts_updated_at
  BEFORE UPDATE ON plaid_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## 🔐 Encryption for Sensitive Fields

### **What gets encrypted?**

```javascript
// In plaid_accounts table:
account_number_encrypted = AES-256-CBC encrypt(
  account_number: "1234567890",
  key: ENCRYPTION_KEY,
  iv: random_16_bytes
)

// Store encrypted value + IV:
{
  account_number_encrypted: "base64_encrypted_data_with_iv"
}

// When needed for transfer:
decrypted_number = AES-256-CBC decrypt(
  account_number_encrypted,
  key: ENCRYPTION_KEY
)
```

### **Implementation in code:**

```javascript
// services/encryption.js
const crypto = require('crypto');

export const encryptAccountNumber = (accountNumber, encryptionKey) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(encryptionKey, 'hex'),
    iv
  );
  let encrypted = cipher.update(accountNumber, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;  // IV:encrypted
};

export const decryptAccountNumber = (encryptedWithIv, encryptionKey) => {
  const [ivHex, encrypted] = encryptedWithIv.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(encryptionKey, 'hex'),
    iv
  );
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

// Usage:
// Encrypt when storing:
account_number_encrypted = encryptAccountNumber('1234567890', ENCRYPTION_KEY);

// Decrypt when using:
account_number = decryptAccountNumber(account_number_encrypted, ENCRYPTION_KEY);
```

---

## 📊 Data Flow Diagram

```
User links bank via Plaid
  ↓
plaid_items created (connection)
  ↓
plaid_accounts created (individual accounts)
  ↓ (Need to add for transfers)
  ├─ routing_number
  ├─ account_number_encrypted
  ├─ account_holder_name
  └─ can_transfer_out flag
  ↓
User initiates transfer
  ↓
transfers table created
  ├─ references plaid_account_id (SOURCE)
  ├─ references beneficiary_id (DESTINATION)
  └─ status: 'pending'
  ↓
User confirms transfer
  ↓
API calls Chimoney with encrypted account details
  ↓
transfers.status → 'processing'
  ↓
Chimoney executes transfer
  ↓
transfers.status → 'completed'
```

---

## ✅ Migration Checklist

- [ ] Apply SQL updates to add columns to plaid_accounts
- [ ] Create transfers table
- [ ] Create transfer_status_log table
- [ ] Add triggers for updated_at
- [ ] Verify Supabase schema is updated
- [ ] Test INSERT into transfers
- [ ] Test encryption/decryption of account numbers
- [ ] Create indexes
- [ ] Verify queries perform well

---

## 🚀 Ready to Apply?

The schema update SQL can be:
1. Run directly in Supabase SQL editor
2. Pasted into a migration file
3. Applied through Supabase CLI: `supabase db push`

Should I apply this schema update to your Supabase database?

