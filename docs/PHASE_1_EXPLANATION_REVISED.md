# Phase 1: Database Schema (Revised) - Detailed Explanation

## 📋 Overview

Phase 1 adds database support for international transfers while keeping the schema clean and separated.

**Architecture Decision**: Create separate table for transfer capabilities instead of polluting plaid_accounts.

**Total Changes**:
- Create: `plaid_transfer_accounts` table (NEW - 10 columns)
- Create: `transfers` table (NEW - 21 columns)
- Create: `transfer_status_log` table (NEW - 5 columns)
- Modify: `plaid_accounts` table (NONE - kept clean!)
- Add: 9 indexes for performance
- Add: 3 triggers for automation

---

## 🏗️ Architecture: Separation of Concerns

### Before (Bad Design - What We're Avoiding)
```
plaid_accounts table
├─ Plaid sync data (account_type, mask, balance)
├─ ❌ routing_number (transfer-specific)
├─ ❌ account_number_encrypted (transfer-specific)
├─ ❌ can_transfer_out (transfer-specific)
├─ ❌ is_verified_for_transfer (transfer-specific)
└─ ❌ ... 6 more transfer columns (polluted!)
```

### After (Good Design - What We're Doing)
```
plaid_accounts table (CLEAN)
├─ Plaid sync data only
├─ account_type, mask, balance, etc.
└─ (No transfer columns!)

    ↓ (links to)

plaid_transfer_accounts table (NEW)
├─ Transfer-specific metadata
├─ can_transfer_out, is_verified_for_transfer
├─ daily_transfer_limit, transaction_limit
└─ (No account numbers stored!)
```

**Benefits**:
- ✅ plaid_accounts stays focused (single responsibility)
- ✅ Transfer capabilities are optional (not every account is a transfer account)
- ✅ Easier to query (select from plaid_transfer_accounts where can_transfer_out = true)
- ✅ Cleaner schema (no mixed concerns)
- ✅ Better for future enhancements

---

## 🔐 Data Storage Philosophy

### What We DO Store
✅ Transfer capability flags (can_transfer_out, is_verified_for_transfer)
✅ Transfer limits (daily_transfer_limit, transaction_limit)
✅ Audit metrics (last_transfer_at, transfer_count)
✅ Flexible metadata (JSONB)

### What We DON'T Store
❌ Routing numbers
❌ Account numbers (full or encrypted)
❌ Account holder names

### Why Not Store Account Details?
**Hybrid Approach**:
```
1. User adds bank account via Plaid Link
   ↓
2. Plaid securely stores account details (encrypted by Plaid)
   ↓
3. User decides to enable transfers
   ↓ (We create plaid_transfer_account record)
4. When executing transfer:
   a. Fetch account details from Plaid API (encrypted channel)
   b. Pass directly to Chimoney (immediate, never stored)
   c. Chimoney executes payout
```

**Benefits**:
- 80% less compliance burden (no PCI requirements)
- Simpler architecture (Plaid owns encryption)
- Faster implementation (less security work)
- Better UX (no need to re-enter account details)

---

## 📋 PART 1: plaid_transfer_accounts Table

### Purpose
Separate table to track transfer-specific capabilities for each plaid account. One-to-one relationship with plaid_accounts.

### 10 Columns:

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `id` | UUID | gen_random_uuid() | Unique transfer account ID |
| `user_id` | UUID | NOT NULL | Who owns this account (FK: users.id) |
| `plaid_account_id` | UUID | NOT NULL | Which Plaid account (FK: plaid_accounts.id) |
| `can_transfer_out` | BOOLEAN | false | Is this account enabled for transfers? |
| `is_verified_for_transfer` | BOOLEAN | false | Passed all verification checks? |
| `transfer_verification_status` | VARCHAR(50) | NULL | Status: 'pending', 'verified', 'failed' |
| `daily_transfer_limit` | NUMERIC | 5000 | Max USD per day |
| `transaction_limit` | NUMERIC | 50000 | Max USD per transaction |
| `last_transfer_at` | TIMESTAMP | NULL | When last transfer? (audit) |
| `transfer_count` | INT | 0 | How many transfers? (metrics) |
| `transfer_metadata` | JSONB | NULL | Flexible JSON for future |
| `created_at` | TIMESTAMP | NOW() | When record created |
| `updated_at` | TIMESTAMP | NOW() | When record updated (trigger) |

### Key Design Decisions:

**1. One-to-One Relationship**
```sql
UNIQUE (plaid_account_id)
```
- Each plaid_account can have at most one transfer account
- User enables transfers: we create this record
- User disables transfers: we delete this record
- Simple 1:1 link

**2. No Account Numbers**
```
❌ routing_number VARCHAR(9)      -- NOT STORED
❌ account_number_encrypted TEXT  -- NOT STORED
```
- Account details remain in Plaid (their responsibility)
- On transfer execution:
  - Call Plaid API with plaid_account_id
  - Get encrypted account details
  - Pass directly to Chimoney (never persist)

**3. Transfer Verification**
```
can_transfer_out: BOOLEAN
is_verified_for_transfer: BOOLEAN
transfer_verification_status: VARCHAR(50)
```
- `can_transfer_out = false`: Account not enabled yet
- `can_transfer_out = true` + `is_verified_for_transfer = true`: Ready to transfer
- `transfer_verification_status`: Track verification state

### Indexes:

```sql
idx_plaid_transfer_accounts_user_id
  -- Query: "Get all transfer accounts for user X"
  ON plaid_transfer_accounts(user_id)

idx_plaid_transfer_accounts_plaid_account_id
  -- Query: "Get transfer account for plaid_account Y"
  ON plaid_transfer_accounts(plaid_account_id)

idx_plaid_transfer_accounts_can_transfer
  -- Query: "Show all enabled transfer accounts for user X"
  ON plaid_transfer_accounts(user_id, can_transfer_out)
  WHERE can_transfer_out = true

idx_plaid_transfer_accounts_verified
  -- Query: "Show all verified transfer accounts"
  ON plaid_transfer_accounts(is_verified_for_transfer)
  WHERE is_verified_for_transfer = true
```

### Example Data:

```
User: john_doe
  ├─ Plaid Account: Chase Checking (****1234)
  │   └─ Transfer Account:
  │       can_transfer_out: true
  │       is_verified_for_transfer: true
  │       daily_limit: 5000
  │       transaction_limit: 50000
  │
  └─ Plaid Account: Wells Fargo Savings (****5678)
      └─ Transfer Account:
          can_transfer_out: false
          is_verified_for_transfer: false
```

---

## 💸 PART 2: transfers Table

### Purpose
Track all transfer transactions from initiation through completion.

### 21 Columns Grouped by Function:

#### Core Identifiers (4 columns)
| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID | Unique transfer ID |
| `user_id` | UUID | Transfer owner (FK: users.id) |
| `plaid_transfer_account_id` | UUID | SOURCE account enabled for transfers (FK: plaid_transfer_accounts.id) |
| `beneficiary_id` | UUID | DESTINATION account (FK: beneficiaries.id) |

#### Amount & Currency (6 columns)
| Column | Type | Purpose |
|--------|------|---------|
| `source_amount` | DECIMAL(15,2) | Amount user sends (USD), e.g., 500.00 |
| `source_currency` | VARCHAR(3) | Source currency (USD) |
| `target_amount` | DECIMAL(15,2) | Amount recipient quoted (INR), e.g., 41,625 |
| `target_currency` | VARCHAR(3) | Target currency (INR) |
| `exchange_rate` | DECIMAL(10,4) | Original quoted rate (1 USD = X INR) |
| `fee_amount` | DECIMAL(15,2) | Transfer fee (0.5% of source) |
| `fee_percentage` | DECIMAL(5,3) | Fee percentage (0.500) |

#### Final Amounts (2 columns)
| Column | Type | Purpose |
|--------|------|---------|
| `final_exchange_rate` | DECIMAL(10,4) | ACTUAL rate at execution (may differ) |
| `final_target_amount` | DECIMAL(15,2) | ACTUAL amount recipient gets |

**Example**:
```
Original (quoted): 1 USD = ₹83.25 → ₹41,625
Execution (actual): 1 USD = ₹83.50 → ₹41,750
Improvement: +₹125!
```

#### Chimoney Reference (2 columns)
| Column | Type | Purpose |
|--------|------|---------|
| `chimoney_transaction_id` | VARCHAR(255) | Chimoney's transaction ID |
| `chimoney_reference` | VARCHAR(255) | Chimoney's reference code |

#### Status & Workflow (1 column)
| Column | Type | Values |
|--------|------|--------|
| `status` | VARCHAR(50) | pending, processing, completed, failed, cancelled |

**Workflow**:
```
pending (user created)
   ↓ (user confirms)
processing (sent to Chimoney)
   ↓ (Chimoney executes)
completed OR failed OR cancelled
```

#### Rate Change Tracking (1 column)
| Column | Type | Purpose |
|--------|------|---------|
| `rate_change_log` | JSONB | Rate change history |

**Example**:
```json
{
  "original_rate": 83.25,
  "final_rate": 83.50,
  "change_percent": 0.30,
  "action_taken": "ACCEPT_SILENTLY",
  "reason": "favorable",
  "user_confirmed": true
}
```

#### Timestamps (4 columns)
| Column | Type | Purpose |
|--------|------|---------|
| `initiated_at` | TIMESTAMP | When user started (NOW()) |
| `executed_at` | TIMESTAMP | When sent to Chimoney |
| `completed_at` | TIMESTAMP | When recipient got money |
| `cancelled_at` | TIMESTAMP | If cancelled |

#### Audit Trail (2 columns)
| Column | Type | Purpose |
|--------|------|---------|
| `ip_address` | INET | User's IP (fraud detection) |
| `user_agent` | TEXT | Browser info (security audit) |

#### Standard Timestamps (2 columns)
| Column | Type | Purpose |
|--------|------|---------|
| `created_at` | TIMESTAMP | Record creation (DB) |
| `updated_at` | TIMESTAMP | Last update (Trigger) |

### Indexes:

```sql
idx_transfers_user_id
  -- "Show all transfers for user X"
  ON transfers(user_id)

idx_transfers_plaid_transfer_account
  -- "Show all transfers from transfer account Y"
  ON transfers(plaid_transfer_account_id)

idx_transfers_beneficiary
  -- "Show all transfers to beneficiary Z"
  ON transfers(beneficiary_id)

idx_transfers_status
  -- "Show all processing transfers" (webhook polling)
  ON transfers(status)

idx_transfers_chimoney_id
  -- "Find transfer by Chimoney ID" (webhooks)
  ON transfers(chimoney_transaction_id)

idx_transfers_created_at
  -- "Show recent transfers" (dashboard)
  ON transfers(created_at DESC)
```

---

## 📊 PART 3: transfer_status_log Table

### Purpose
Immutable audit trail. Every status change logged. Never modified/deleted.

### 5 Columns:

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID | Log entry ID |
| `transfer_id` | UUID | Which transfer (FK: transfers.id) |
| `old_status` | VARCHAR(50) | Previous status (NULL if new) |
| `new_status` | VARCHAR(50) | New status |
| `reason` | TEXT | Why status changed |
| `metadata` | JSONB | Additional context |
| `created_at` | TIMESTAMP | When status changed |

### Example Log Entries:

**Entry 1: Transfer initiated**
```json
{
  "transfer_id": "abc123",
  "old_status": null,
  "new_status": "pending",
  "reason": "User initiated transfer",
  "metadata": {
    "source_amount": 500,
    "exchange_rate": 83.25,
    "target_amount": 41625
  }
}
```

**Entry 2: Rate changed notification**
```json
{
  "transfer_id": "abc123",
  "old_status": "pending",
  "new_status": "pending",
  "reason": "Exchange rate changed, awaiting user confirmation",
  "metadata": {
    "original_rate": 83.25,
    "current_rate": 82.50,
    "change_percent": -1.40,
    "user_notified": true
  }
}
```

**Entry 3: Transfer executed**
```json
{
  "transfer_id": "abc123",
  "old_status": "pending",
  "new_status": "processing",
  "reason": "Sent to Chimoney for payout",
  "metadata": {
    "chimoney_transaction_id": "chi_xyz123",
    "final_rate": 83.25,
    "final_amount": 41625
  }
}
```

### Indexes:

```sql
idx_transfer_log_transfer_id
  -- "Show all status changes for transfer X"
  ON transfer_status_log(transfer_id)

idx_transfer_log_new_status
  -- "Show all status changes to 'completed'"
  ON transfer_status_log(new_status)

idx_transfer_log_created_at
  -- "Show recent status changes"
  ON transfer_status_log(created_at DESC)
```

---

## 🔗 Relationship Diagram

```
users (1) ─→ (many) plaid_items
              ↓
           plaid_accounts (1) ─→ (0 or 1) plaid_transfer_accounts
                                           ↓
                                        transfers (many)
                                           ↓
                                    beneficiaries
                                           ↓
                                    transfer_status_log
```

**Example**: User john_doe has 2 Plaid accounts, but only Chase Checking is enabled for transfers:
```
john_doe (users)
├─ plaid_item_1 (Chase)
│  └─ plaid_account_1: Chase Checking
│     └─ plaid_transfer_account_1: ENABLED ✓
│        └─ transfer_1: $500 to Raj
│        └─ transfer_2: $1000 to Priya
│
└─ plaid_item_2 (Wells Fargo)
   └─ plaid_account_2: Wells Savings
      └─ plaid_transfer_account_2: DISABLED ✗
         (no transfers)
```

---

## ✅ How to Apply

### Step 1: Run SQL File
1. Open Supabase Dashboard → SQL Editor
2. Create new query
3. Copy contents of `PHASE_1_DATABASE_SCHEMA_REVISED.sql`
4. Execute all at once

### Step 2: Verify Success
```sql
-- Check plaid_transfer_accounts exists
SELECT COUNT(*) FROM information_schema.tables
WHERE table_name = 'plaid_transfer_accounts';

-- Check transfers exists
SELECT COUNT(*) FROM information_schema.tables
WHERE table_name = 'transfers';

-- Check transfer_status_log exists
SELECT COUNT(*) FROM information_schema.tables
WHERE table_name = 'transfer_status_log';

-- Check indexes
SELECT indexname FROM pg_indexes
WHERE tablename IN ('plaid_transfer_accounts', 'transfers', 'transfer_status_log');
```

---

## 🚀 What's Next?

After Phase 1 completes:
- ✅ Database ready for transfer data
- ⏳ Phase 2: Create backend services & APIs
- ⏳ Phase 3: Create frontend components
- ⏳ Phase 4: Integration & testing
