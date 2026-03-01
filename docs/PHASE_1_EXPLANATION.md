# Phase 1: Database Schema - Detailed Explanation

## 📋 Overview

Phase 1 adds database support for immediate international transfers. It extends existing tables and creates 2 new tables.

**Total Changes**:
- Modify: `plaid_accounts` table (+11 columns)
- Create: `transfers` table (21 columns)
- Create: `transfer_status_log` table (5 columns)
- Add: 9 indexes for performance
- Add: 2 triggers for audit automation

---

## 🔧 PART 1: Extend plaid_accounts Table

### Why?
Plaid accounts need transfer-specific metadata. Currently plaid_accounts only tracks credit card data. We're adding columns to identify which bank accounts can be used for transfers.

### Changes Added (11 columns):

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `routing_number` | VARCHAR(9) | NULL | US bank routing number (9 digits) |
| `account_number_encrypted` | TEXT | NULL | Account number (AES-256 encrypted) |
| `account_holder_name` | TEXT | NULL | Who owns the account (for compliance) |
| `can_transfer_out` | BOOLEAN | false | Is this account enabled for transfers? |
| `is_verified_for_transfer` | BOOLEAN | false | Passed all verification checks? |
| `transfer_verification_status` | VARCHAR(50) | NULL | Status: 'pending', 'verified', 'failed' |
| `daily_transfer_limit` | NUMERIC | 5000 | Max USD per day |
| `transaction_limit` | NUMERIC | 50000 | Max USD per transaction |
| `last_transfer_at` | TIMESTAMP | NULL | When was last transfer? (audit) |
| `transfer_count` | INT | 0 | How many transfers done? (metrics) |
| `transfer_metadata` | JSONB | NULL | Flexible JSON for future data |

### Why This Structure?

**Hybrid Approach**:
- ❌ DON'T store full account numbers permanently
- ✅ Store `account_number_encrypted` temporarily (during transfer execution)
- ✅ Fetch from Plaid API on-demand (never persist in Vitta)
- ✅ Pass directly to Chimoney (immediate execution)

**Benefits**:
- 80% less compliance burden
- Simpler PCI requirements
- Faster implementation

### Indexes Added:

```sql
-- Find all transferable accounts for a user
idx_plaid_can_transfer ON plaid_accounts(user_id, can_transfer_out)
  WHERE can_transfer_out = true

-- Find depository accounts (checking/savings, not credit cards)
idx_plaid_depository ON plaid_accounts(account_type)
  WHERE account_type = 'depository'
```

---

## 💸 PART 2: Create transfers Table

### Purpose
Track all transfer transactions from initiation through completion. Full lifecycle tracking for audit and debugging.

### 21 Columns Grouped by Purpose:

#### Core Identifiers (3 columns)
| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID | Unique transfer ID |
| `user_id` | UUID | Which user owns this transfer (FK: users.id) |
| `plaid_account_id` | UUID | SOURCE account - where money comes FROM (FK: plaid_accounts.id) |
| `beneficiary_id` | UUID | DESTINATION account - where money goes TO (FK: beneficiaries.id) |

#### Amount & Currency (6 columns)
| Column | Type | Purpose |
|--------|------|---------|
| `source_amount` | DECIMAL(15,2) | Amount user sends (USD), e.g., 500.00 |
| `source_currency` | VARCHAR(3) | Source currency (USD) |
| `target_amount` | DECIMAL(15,2) | Amount recipient QUOTED to receive (INR), e.g., 41,625 |
| `target_currency` | VARCHAR(3) | Target currency (INR) |
| `exchange_rate` | DECIMAL(10,4) | Original quoted rate: 1 USD = X INR, e.g., 83.2500 |
| `fee_amount` | DECIMAL(15,2) | Transfer fee in USD (0.5% of source), e.g., 2.50 |
| `fee_percentage` | DECIMAL(5,3) | Fee percentage, e.g., 0.500 |

#### Final Execution Amounts (2 columns)
| Column | Type | Purpose |
|--------|------|---------|
| `final_exchange_rate` | DECIMAL(10,4) | ACTUAL rate at execution (may differ due to smart rate logic) |
| `final_target_amount` | DECIMAL(15,2) | ACTUAL amount recipient gets (calculated with final rate) |

**Example**:
- Original: 1 USD = ₹83.25 → recipient gets ₹41,625
- At execution: 1 USD = ₹83.50 (rate improved!)
- Final: recipient gets ₹41,750 (₹125 more!)

#### Chimoney Reference (2 columns)
| Column | Type | Purpose |
|--------|------|---------|
| `chimoney_transaction_id` | VARCHAR(255) | Chimoney's transaction ID (e.g., "chi_9876543210") |
| `chimoney_reference` | VARCHAR(255) | Chimoney's reference code (e.g., "TXN_USD_INR_2026_028") |

#### Status & Workflow (1 column)
| Column | Type | Values | Purpose |
|--------|------|--------|---------|
| `status` | VARCHAR(50) | pending, processing, completed, failed, cancelled | Where in the workflow? |

**Status Workflow**:
```
pending
  ↓ (user confirms in UI)
processing
  ↓ (Chimoney executes)
completed  OR  failed  OR  cancelled
```

#### Rate Change Tracking (1 column)
| Column | Type | Purpose |
|--------|------|---------|
| `rate_change_log` | JSONB | JSON log of rate changes (see below) |

**Example rate_change_log**:
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
| `initiated_at` | TIMESTAMP | When user started transfer (set to NOW()) |
| `executed_at` | TIMESTAMP | When sent to Chimoney (manual in execute API) |
| `completed_at` | TIMESTAMP | When recipient got money (webhook callback) |
| `cancelled_at` | TIMESTAMP | If user cancelled (only if status was 'pending') |

#### Audit Trail (2 columns)
| Column | Type | Purpose |
|--------|------|---------|
| `ip_address` | INET | User's IP address (for fraud detection) |
| `user_agent` | TEXT | Browser user agent (for security audit) |

#### Standard Timestamps (2 columns)
| Column | Type | Purpose |
|--------|------|---------|
| `created_at` | TIMESTAMP | When record inserted (database) |
| `updated_at` | TIMESTAMP | When record last updated (trigger) |

### Indexes on transfers Table:

```sql
idx_transfers_user_id
  -- Query: "Show all transfers for user X"
  ON transfers(user_id)

idx_transfers_plaid_account
  -- Query: "Show all transfers from account Y"
  ON transfers(plaid_account_id)

idx_transfers_beneficiary
  -- Query: "Show all transfers to beneficiary Z"
  ON transfers(beneficiary_id)

idx_transfers_status
  -- Query: "Show all processing transfers" (for webhook polling)
  ON transfers(status)

idx_transfers_chimoney_id
  -- Query: "Find transfer by Chimoney ID" (for webhooks)
  ON transfers(chimoney_transaction_id)

idx_transfers_created_at
  -- Query: "Show recent transfers" (for dashboard)
  ON transfers(created_at DESC)
```

---

## 📊 PART 3: Create transfer_status_log Table

### Purpose
Immutable audit trail. Every time transfer status changes, log it. Never modify/delete these records.

### 5 Columns:

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID | Log entry ID |
| `transfer_id` | UUID | Which transfer? (FK: transfers.id) |
| `old_status` | VARCHAR(50) | Previous status (NULL if new transfer) |
| `new_status` | VARCHAR(50) | New status (e.g., "pending" → "processing") |
| `reason` | TEXT | Why did status change? (e.g., "User confirmed rate change") |
| `metadata` | JSONB | Additional data (error messages, rate changes, etc.) |
| `created_at` | TIMESTAMP | When this status change happened |

### Example Log Entries:

**Entry 1: Transfer created**
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
  },
  "created_at": "2026-02-28 12:00:00"
}
```

**Entry 2: User confirms rate change**
```json
{
  "transfer_id": "abc123",
  "old_status": "pending",
  "new_status": "pending",  // Still pending, just logged
  "reason": "User confirmed unfavorable rate change",
  "metadata": {
    "original_rate": 83.25,
    "current_rate": 82.50,
    "change_percent": -1.40,
    "accepted": true
  },
  "created_at": "2026-02-28 12:00:05"
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
  },
  "created_at": "2026-02-28 12:00:06"
}
```

### Indexes:

```sql
idx_transfer_log_id
  -- Query: "Show all status changes for transfer X"
  ON transfer_status_log(transfer_id)

idx_transfer_log_status
  -- Query: "Show all transfers that changed to 'completed'"
  ON transfer_status_log(new_status)

idx_transfer_log_created_at
  -- Query: "Show recent status changes"
  ON transfer_status_log(created_at DESC)
```

---

## ⏱️ PART 4: Triggers for updated_at

### Automatic Timestamp Update

**Trigger 1**: On transfers table
```sql
CREATE TRIGGER trg_transfers_updated_at BEFORE UPDATE ON transfers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
```

**Trigger 2**: On plaid_accounts table
```sql
CREATE TRIGGER trg_plaid_accts_updated_at BEFORE UPDATE ON plaid_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
```

### What this does:
- Every time a row is updated, automatically set `updated_at = NOW()`
- No need to manually set in application code
- Ensures accurate "last modified" tracking

---

## 🔐 Security Considerations

### Encryption
- `account_number_encrypted` field uses AES-256-CBC (application layer)
- Encryption key from environment: `ENCRYPTION_KEY` (64 hex chars = 32 bytes)
- Random IV per encryption
- Decrypt only when executing transfer to Chimoney
- Never log decrypted values

### Foreign Keys
- All FK relationships have `ON DELETE CASCADE`
- If user deleted: all their transfers deleted automatically
- If beneficiary deleted: all transfers to that beneficiary deleted

### Access Control
- `user_id` on transfers table enables row-level security
- Users can only see their own transfers
- Implement WHERE `user_id = $1` in all queries

---

## 📝 Example Data Relationships

```
User: john_doe
  ├─ Plaid Account: Chase Checking (****1234)
  │   └─ Transfer 1: $500 to Raj (completed)
  │   └─ Transfer 2: $1000 to Priya (processing)
  │
  └─ Plaid Account: Wells Fargo Savings (****5678)
      └─ Transfer 3: $250 to Amit (pending)

Beneficiary: Raj (UPI)
  └─ Transfer 1 (from john_doe): $500 → ₹41,625

Beneficiary: Priya (Bank Account)
  └─ Transfer 2 (from john_doe): $1000 → ₹83,250
```

---

## ✅ How to Apply This

### Option 1: Run SQL File Directly
1. Open Supabase dashboard → SQL Editor
2. Create new query
3. Copy contents of `PHASE_1_DATABASE_SCHEMA.sql`
4. Execute
5. Verify with queries at bottom of file

### Option 2: Use Supabase CLI
```bash
# If you have a migrations folder set up
supabase migration new add_transfer_tables
# Copy SQL into migration file
supabase db push
```

### Option 3: Copy-Paste Each Section
If you prefer caution:
1. Execute PART 1 first (alter plaid_accounts)
2. Verify plaid_accounts has new columns
3. Execute PART 2 (create transfers)
4. Execute PART 3 (create transfer_status_log)
5. Execute PART 4 (add triggers)

---

## 🧪 Verification

After applying, run these queries to verify:

```sql
-- Check plaid_accounts columns added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'plaid_accounts' AND column_name LIKE '%transfer%'
ORDER BY ordinal_position;

-- Check transfers table created
SELECT COUNT(*) FROM information_schema.tables
WHERE table_name = 'transfers';

-- Check transfer_status_log table created
SELECT COUNT(*) FROM information_schema.tables
WHERE table_name = 'transfer_status_log';

-- Check all indexes
SELECT indexname FROM pg_indexes
WHERE tablename IN ('plaid_accounts', 'transfers', 'transfer_status_log')
ORDER BY indexname;

-- Check triggers
SELECT trigger_name FROM information_schema.triggers
WHERE trigger_name LIKE '%transfer%' OR trigger_name LIKE '%plaid_accts%';
```

---

## 🚀 What's Next?

After Phase 1 completes:
- ✅ Database ready for transfer data
- ⏳ Phase 2: Create backend services & APIs
- ⏳ Phase 3: Create frontend components
- ⏳ Phase 4: Integration & testing
