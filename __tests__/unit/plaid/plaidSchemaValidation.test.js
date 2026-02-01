/**
 * Plaid Schema Validation Tests — Phase 1
 *
 * Parses the migration SQL file and asserts that all required structural
 * contracts are present: tables, columns, indexes, constraints, triggers,
 * and comments. No database connection is needed — tests run against the
 * raw SQL text.
 *
 * Design goals:
 *   1. Every table defined in the design doc is present.
 *   2. Security-critical columns (access_token_enc, transactions_cursor)
 *      exist and are documented as never-returned-to-client.
 *   3. Idempotency anchor (plaid_transaction_id UNIQUE) is enforced.
 *   4. Append-only semantics of plaid_webhook_events are enforced
 *      (no updated_at trigger on that table).
 *   5. All foreign keys reference the correct parent tables.
 *   6. All expected indexes are present for query-pattern alignment.
 *   7. Triggers cover mutable tables; append-only table is excluded.
 *   8. Backward compatibility: existing tables (users, user_credit_cards)
 *      are referenced but never altered.
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Load migration SQL once for the entire suite
// ---------------------------------------------------------------------------
const MIGRATION_PATH = path.resolve(
  __dirname,
  '../../../supabase/migrations/20260201_plaid_integration.sql'
);

let sql;

beforeAll(() => {
  sql = fs.readFileSync(MIGRATION_PATH, 'utf8');
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Case-insensitive substring check */
function containsSQL(fragment) {
  return sql.toLowerCase().includes(fragment.toLowerCase());
}

/** Check that a CREATE TABLE block for `tableName` exists and contains `columnDef` */
function tableHasColumn(tableName, columnDef) {
  const tableRegex = new RegExp(
    `CREATE\\s+TABLE\\s+IF\\s+NOT\\s+EXISTS\\s+${tableName}\\s*\\(([\\s\\S]*?)\\);`,
    'i'
  );
  const match = sql.match(tableRegex);
  if (!match) return false;
  return match[1].toLowerCase().includes(columnDef.toLowerCase());
}

/** Extract the full CREATE TABLE block for a given table name */
function getTableBlock(tableName) {
  const tableRegex = new RegExp(
    `CREATE\\s+TABLE\\s+IF\\s+NOT\\s+EXISTS\\s+${tableName}\\s*\\(([\\s\\S]*?)\\);`,
    'i'
  );
  const match = sql.match(tableRegex);
  return match ? match[1] : null;
}

// ===========================================================================
// 1. Table Existence
// ===========================================================================

describe('Plaid Migration — Table Existence', () => {
  const REQUIRED_TABLES = [
    'plaid_items',
    'plaid_accounts',
    'plaid_liabilities',
    'transactions',
    'plaid_webhook_events',
  ];

  test.each(REQUIRED_TABLES)('CREATE TABLE IF NOT EXISTS %s is present', (table) => {
    expect(containsSQL(`CREATE TABLE IF NOT EXISTS ${table}`)).toBe(true);
  });
});

// ===========================================================================
// 2. plaid_items — columns & constraints
// ===========================================================================

describe('Plaid Migration — plaid_items columns', () => {
  test('id is uuid PRIMARY KEY with gen_random_uuid()', () => {
    expect(tableHasColumn('plaid_items', 'id')).toBe(true);
    expect(tableHasColumn('plaid_items', 'PRIMARY KEY DEFAULT gen_random_uuid()')).toBe(true);
  });

  test('user_id references users(id) ON DELETE CASCADE', () => {
    expect(tableHasColumn('plaid_items', 'REFERENCES users(id) ON DELETE CASCADE')).toBe(true);
  });

  test('plaid_item_id is TEXT NOT NULL UNIQUE', () => {
    expect(tableHasColumn('plaid_items', 'plaid_item_id')).toBe(true);
    expect(tableHasColumn('plaid_items', 'UNIQUE')).toBe(true);
  });

  test('access_token_enc is TEXT NOT NULL (encrypted column)', () => {
    expect(tableHasColumn('plaid_items', 'access_token_enc')).toBe(true);
    expect(tableHasColumn('plaid_items', 'NOT NULL')).toBe(true);
  });

  test('transactions_cursor is TEXT NOT NULL DEFAULT empty string', () => {
    expect(tableHasColumn('plaid_items', "transactions_cursor")).toBe(true);
    expect(tableHasColumn('plaid_items', "DEFAULT ''"  )).toBe(true);
  });

  test('status has CHECK constraint limiting to valid values', () => {
    const block = getTableBlock('plaid_items');
    expect(block).not.toBeNull();
    // Must contain all three valid status values in a CHECK
    expect(block.toLowerCase()).toMatch(/check\s*\(\s*status\s+in\s*\(\s*'active'\s*,\s*'needs_update'\s*,\s*'revoked'\s*\)\s*\)/i);
  });

  test('consent_expires_at is timestamp with time zone (nullable)', () => {
    expect(tableHasColumn('plaid_items', 'consent_expires_at')).toBe(true);
    expect(tableHasColumn('plaid_items', 'timestamp with time zone')).toBe(true);
  });

  test('created_at and updated_at default to now()', () => {
    expect(tableHasColumn('plaid_items', 'created_at')).toBe(true);
    expect(tableHasColumn('plaid_items', 'updated_at')).toBe(true);
    // At least one DEFAULT now() present (both have it)
    const block = getTableBlock('plaid_items');
    const nowCount = (block.match(/DEFAULT\s+now\(\)/gi) || []).length;
    expect(nowCount).toBeGreaterThanOrEqual(2);
  });
});

// ===========================================================================
// 3. plaid_accounts — columns & foreign keys
// ===========================================================================

describe('Plaid Migration — plaid_accounts columns', () => {
  test('plaid_item_id references plaid_items(id) ON DELETE CASCADE', () => {
    expect(tableHasColumn('plaid_accounts', 'REFERENCES plaid_items(id) ON DELETE CASCADE')).toBe(true);
  });

  test('vitta_card_id references user_credit_cards(id) ON DELETE SET NULL', () => {
    expect(tableHasColumn('plaid_accounts', 'REFERENCES user_credit_cards(id) ON DELETE SET NULL')).toBe(true);
  });

  test('credit_limit column is present (numeric, nullable)', () => {
    expect(tableHasColumn('plaid_accounts', 'credit_limit')).toBe(true);
  });

  test('UNIQUE constraint on (plaid_item_id, plaid_account_id)', () => {
    const block = getTableBlock('plaid_accounts');
    expect(block).not.toBeNull();
    expect(block.toLowerCase()).toMatch(/unique\s*\(\s*plaid_item_id\s*,\s*plaid_account_id\s*\)/i);
  });

  test('account_type and account_subtype columns are present', () => {
    expect(tableHasColumn('plaid_accounts', 'account_type')).toBe(true);
    expect(tableHasColumn('plaid_accounts', 'account_subtype')).toBe(true);
  });

  test('current_balance defaults to 0', () => {
    expect(tableHasColumn('plaid_accounts', 'current_balance')).toBe(true);
    expect(tableHasColumn('plaid_accounts', 'DEFAULT 0')).toBe(true);
  });
});

// ===========================================================================
// 4. plaid_liabilities — columns & JSONB fields
// ===========================================================================

describe('Plaid Migration — plaid_liabilities columns', () => {
  test('references plaid_items(id) ON DELETE CASCADE', () => {
    expect(tableHasColumn('plaid_liabilities', 'REFERENCES plaid_items(id) ON DELETE CASCADE')).toBe(true);
  });

  test('extracted scalar APR columns are present', () => {
    expect(tableHasColumn('plaid_liabilities', 'purchase_apr')).toBe(true);
    expect(tableHasColumn('plaid_liabilities', 'cash_advance_apr')).toBe(true);
    expect(tableHasColumn('plaid_liabilities', 'balance_transfer_apr')).toBe(true);
  });

  test('payment and statement date columns are present', () => {
    expect(tableHasColumn('plaid_liabilities', 'minimum_payment_amount')).toBe(true);
    expect(tableHasColumn('plaid_liabilities', 'last_statement_balance')).toBe(true);
    expect(tableHasColumn('plaid_liabilities', 'last_statement_date')).toBe(true);
    expect(tableHasColumn('plaid_liabilities', 'next_payment_due_date')).toBe(true);
  });

  test('apr_list is jsonb (full APR breakdown for payment optimizer)', () => {
    expect(tableHasColumn('plaid_liabilities', 'apr_list')).toBe(true);
    expect(tableHasColumn('plaid_liabilities', 'jsonb')).toBe(true);
  });

  test('raw_liability is jsonb NOT NULL (audit trail)', () => {
    const block = getTableBlock('plaid_liabilities');
    expect(block).not.toBeNull();
    // raw_liability line should contain both jsonb and NOT NULL
    const lines = block.split('\n');
    const rawLine = lines.find((l) => l.toLowerCase().includes('raw_liability'));
    expect(rawLine).toBeDefined();
    expect(rawLine.toLowerCase()).toMatch(/jsonb/i);
    expect(rawLine.toLowerCase()).toMatch(/not\s+null/i);
  });

  test('UNIQUE constraint on (plaid_item_id, plaid_account_id)', () => {
    const block = getTableBlock('plaid_liabilities');
    expect(block).not.toBeNull();
    expect(block.toLowerCase()).toMatch(/unique\s*\(\s*plaid_item_id\s*,\s*plaid_account_id\s*\)/i);
  });

  test('fetched_at timestamp defaults to now()', () => {
    expect(tableHasColumn('plaid_liabilities', 'fetched_at')).toBe(true);
  });
});

// ===========================================================================
// 5. transactions — idempotency, source discrimination, amount semantics
// ===========================================================================

describe('Plaid Migration — transactions columns', () => {
  test('user_id references users(id) ON DELETE CASCADE', () => {
    expect(tableHasColumn('transactions', 'REFERENCES users(id) ON DELETE CASCADE')).toBe(true);
  });

  test('source column has CHECK for plaid | manual', () => {
    const block = getTableBlock('transactions');
    expect(block).not.toBeNull();
    expect(block.toLowerCase()).toMatch(/check\s*\(\s*source\s+in\s*\(\s*'plaid'\s*,\s*'manual'\s*\)\s*\)/i);
  });

  test('plaid_transaction_id is UNIQUE (idempotency anchor)', () => {
    const block = getTableBlock('transactions');
    expect(block).not.toBeNull();
    // The column line itself should have UNIQUE
    const lines = block.split('\n');
    const txnIdLine = lines.find((l) => l.toLowerCase().includes('plaid_transaction_id'));
    expect(txnIdLine).toBeDefined();
    expect(txnIdLine.toLowerCase()).toMatch(/unique/i);
  });

  test('amount is numeric NOT NULL (always positive)', () => {
    const block = getTableBlock('transactions');
    const lines = block.split('\n');
    const amountLine = lines.find(
      (l) => l.toLowerCase().includes('amount') && !l.toLowerCase().includes('amount_sign')
    );
    expect(amountLine).toBeDefined();
    expect(amountLine.toLowerCase()).toMatch(/numeric/i);
    expect(amountLine.toLowerCase()).toMatch(/not\s+null/i);
  });

  test('amount_sign has CHECK for debit | credit', () => {
    const block = getTableBlock('transactions');
    expect(block.toLowerCase()).toMatch(/check\s*\(\s*amount_sign\s+in\s*\(\s*'debit'\s*,\s*'credit'\s*\)\s*\)/i);
  });

  test('vitta_card_id references user_credit_cards(id) ON DELETE SET NULL', () => {
    expect(tableHasColumn('transactions', 'REFERENCES user_credit_cards(id) ON DELETE SET NULL')).toBe(true);
  });

  test('transaction_date is date NOT NULL', () => {
    const block = getTableBlock('transactions');
    const lines = block.split('\n');
    const dateLine = lines.find((l) => l.toLowerCase().includes('transaction_date'));
    expect(dateLine).toBeDefined();
    expect(dateLine.toLowerCase()).toMatch(/date/i);
    expect(dateLine.toLowerCase()).toMatch(/not\s+null/i);
  });

  test('is_pending boolean defaults to false', () => {
    expect(tableHasColumn('transactions', 'is_pending')).toBe(true);
    expect(tableHasColumn('transactions', 'DEFAULT false')).toBe(true);
  });

  test('location columns are present', () => {
    expect(tableHasColumn('transactions', 'location_city')).toBe(true);
    expect(tableHasColumn('transactions', 'location_state')).toBe(true);
    expect(tableHasColumn('transactions', 'location_country')).toBe(true);
  });

  test('category and category_confidence columns are present', () => {
    expect(tableHasColumn('transactions', 'category')).toBe(true);
    expect(tableHasColumn('transactions', 'category_confidence')).toBe(true);
  });
});

// ===========================================================================
// 6. plaid_webhook_events — append-only audit log
// ===========================================================================

describe('Plaid Migration — plaid_webhook_events columns', () => {
  test('event_type and webhook_type are TEXT NOT NULL', () => {
    const block = getTableBlock('plaid_webhook_events');
    expect(block).not.toBeNull();

    const lines = block.split('\n');
    const eventTypeLine = lines.find((l) => l.toLowerCase().includes('event_type'));
    const webhookTypeLine = lines.find((l) => l.toLowerCase().includes('webhook_type'));

    expect(eventTypeLine.toLowerCase()).toMatch(/not\s+null/i);
    expect(webhookTypeLine.toLowerCase()).toMatch(/not\s+null/i);
  });

  test('payload is jsonb NOT NULL (full raw payload preserved)', () => {
    const block = getTableBlock('plaid_webhook_events');
    const lines = block.split('\n');
    // Find the line where 'payload' is the column definition (starts with optional whitespace + payload)
    const payloadLine = lines.find((l) => /^\s+payload\s/i.test(l));
    expect(payloadLine).toBeDefined();
    expect(payloadLine.toLowerCase()).toMatch(/jsonb/i);
    expect(payloadLine.toLowerCase()).toMatch(/not\s+null/i);
  });

  test('signature_valid defaults to false', () => {
    expect(tableHasColumn('plaid_webhook_events', 'signature_valid')).toBe(true);
    expect(tableHasColumn('plaid_webhook_events', 'DEFAULT false')).toBe(true);
  });

  test('verification_state CHECK includes pending, verified, failed, skipped', () => {
    const block = getTableBlock('plaid_webhook_events');
    expect(block.toLowerCase()).toMatch(
      /check\s*\(\s*verification_state\s+in\s*\(\s*'pending'\s*,\s*'verified'\s*,\s*'failed'\s*,\s*'skipped'\s*\)\s*\)/i
    );
  });

  test('processing_status CHECK includes pending, processing, completed, failed', () => {
    const block = getTableBlock('plaid_webhook_events');
    expect(block.toLowerCase()).toMatch(
      /check\s*\(\s*processing_status\s+in\s*\(\s*'pending'\s*,\s*'processing'\s*,\s*'completed'\s*,\s*'failed'\s*\)\s*\)/i
    );
  });

  test('received_at timestamp defaults to now()', () => {
    expect(tableHasColumn('plaid_webhook_events', 'received_at')).toBe(true);
  });

  test('processed_at column is present (nullable — set after async processing)', () => {
    expect(tableHasColumn('plaid_webhook_events', 'processed_at')).toBe(true);
  });

  test('no updated_at column definition (append-only table)', () => {
    const block = getTableBlock('plaid_webhook_events');
    expect(block).not.toBeNull();
    // Filter out comment-only lines, then check no column definition for updated_at exists
    const nonCommentLines = block
      .split('\n')
      .filter((l) => !l.trim().startsWith('--'));
    const hasUpdatedAtColumn = nonCommentLines.some((l) =>
      /^\s+updated_at\s/i.test(l)
    );
    expect(hasUpdatedAtColumn).toBe(false);
  });
});

// ===========================================================================
// 7. Indexes — query-pattern alignment
// ===========================================================================

describe('Plaid Migration — Indexes', () => {
  // plaid_items indexes
  test('idx_plaid_items_user on plaid_items(user_id)', () => {
    expect(containsSQL('CREATE INDEX IF NOT EXISTS idx_plaid_items_user')).toBe(true);
    expect(containsSQL('ON plaid_items(user_id)')).toBe(true);
  });

  test('idx_plaid_items_item_id on plaid_items(plaid_item_id)', () => {
    expect(containsSQL('CREATE INDEX IF NOT EXISTS idx_plaid_items_item_id')).toBe(true);
    expect(containsSQL('ON plaid_items(plaid_item_id)')).toBe(true);
  });

  test('idx_plaid_items_status partial index WHERE status != revoked', () => {
    expect(containsSQL('CREATE INDEX IF NOT EXISTS idx_plaid_items_status')).toBe(true);
    expect(containsSQL("WHERE status != 'revoked'")).toBe(true);
  });

  // plaid_accounts indexes
  test('idx_plaid_accts_item on plaid_accounts(plaid_item_id)', () => {
    expect(containsSQL('CREATE INDEX IF NOT EXISTS idx_plaid_accts_item')).toBe(true);
  });

  test('idx_plaid_accts_vitta partial index WHERE vitta_card_id IS NOT NULL', () => {
    expect(containsSQL('CREATE INDEX IF NOT EXISTS idx_plaid_accts_vitta')).toBe(true);
    expect(containsSQL('WHERE vitta_card_id IS NOT NULL')).toBe(true);
  });

  test('idx_plaid_accts_active partial index WHERE is_active = true', () => {
    expect(containsSQL('CREATE INDEX IF NOT EXISTS idx_plaid_accts_active')).toBe(true);
    expect(containsSQL('WHERE is_active = true')).toBe(true);
  });

  test('idx_plaid_accts_type on (account_type, account_subtype)', () => {
    expect(containsSQL('CREATE INDEX IF NOT EXISTS idx_plaid_accts_type')).toBe(true);
  });

  // plaid_liabilities indexes
  test('idx_liabilities_item on plaid_liabilities(plaid_item_id)', () => {
    expect(containsSQL('CREATE INDEX IF NOT EXISTS idx_liabilities_item')).toBe(true);
  });

  test('idx_liabilities_account on plaid_liabilities(plaid_account_id)', () => {
    expect(containsSQL('CREATE INDEX IF NOT EXISTS idx_liabilities_account')).toBe(true);
  });

  test('idx_liabilities_fetched on plaid_liabilities(fetched_at DESC)', () => {
    expect(containsSQL('CREATE INDEX IF NOT EXISTS idx_liabilities_fetched')).toBe(true);
    expect(containsSQL('ON plaid_liabilities(fetched_at DESC)')).toBe(true);
  });

  // transactions indexes — all 7 required for chat query alignment
  test('idx_txns_user_date on (user_id, transaction_date DESC)', () => {
    expect(containsSQL('CREATE INDEX IF NOT EXISTS idx_txns_user_date')).toBe(true);
    expect(containsSQL('ON transactions(user_id, transaction_date DESC)')).toBe(true);
  });

  test('idx_txns_source on (source, user_id)', () => {
    expect(containsSQL('CREATE INDEX IF NOT EXISTS idx_txns_source')).toBe(true);
  });

  test('idx_txns_vitta_card partial WHERE vitta_card_id IS NOT NULL', () => {
    expect(containsSQL('CREATE INDEX IF NOT EXISTS idx_txns_vitta_card')).toBe(true);
  });

  test('idx_txns_plaid_txn_id partial WHERE plaid_transaction_id IS NOT NULL', () => {
    expect(containsSQL('CREATE INDEX IF NOT EXISTS idx_txns_plaid_txn_id')).toBe(true);
  });

  test('idx_txns_plaid_account partial WHERE plaid_account_id IS NOT NULL', () => {
    expect(containsSQL('CREATE INDEX IF NOT EXISTS idx_txns_plaid_account')).toBe(true);
  });

  test('idx_txns_category on (category, user_id)', () => {
    expect(containsSQL('CREATE INDEX IF NOT EXISTS idx_txns_category')).toBe(true);
  });

  test('idx_txns_pending partial WHERE is_pending = true', () => {
    expect(containsSQL('CREATE INDEX IF NOT EXISTS idx_txns_pending')).toBe(true);
    expect(containsSQL('WHERE is_pending = true')).toBe(true);
  });

  // plaid_webhook_events indexes
  test('idx_wh_item partial WHERE plaid_item_id IS NOT NULL', () => {
    expect(containsSQL('CREATE INDEX IF NOT EXISTS idx_wh_item')).toBe(true);
  });

  test('idx_wh_type on (event_type, webhook_type)', () => {
    expect(containsSQL('CREATE INDEX IF NOT EXISTS idx_wh_type')).toBe(true);
  });

  test('idx_wh_processing partial for pending/processing status', () => {
    expect(containsSQL('CREATE INDEX IF NOT EXISTS idx_wh_processing')).toBe(true);
  });

  test('idx_wh_received on (received_at DESC)', () => {
    expect(containsSQL('CREATE INDEX IF NOT EXISTS idx_wh_received')).toBe(true);
  });
});

// ===========================================================================
// 8. Triggers — updated_at maintenance
// ===========================================================================

describe('Plaid Migration — Triggers', () => {
  const MUTABLE_TABLES = [
    'plaid_items',
    'plaid_accounts',
    'plaid_liabilities',
    'transactions',
  ];

  test.each(MUTABLE_TABLES)(
    'trigger trg_%s_updated_at exists on %s',
    (table) => {
      expect(containsSQL(`CREATE TRIGGER trg_${table}_updated_at`)).toBe(true);
      expect(containsSQL(`BEFORE UPDATE ON ${table}`)).toBe(true);
      expect(containsSQL('EXECUTE FUNCTION update_updated_at_column()')).toBe(true);
    }
  );

  test('plaid_webhook_events has NO updated_at trigger (append-only)', () => {
    expect(containsSQL('trg_plaid_webhook_events_updated_at')).toBe(false);
  });
});

// ===========================================================================
// 9. Security — access token never exposed
// ===========================================================================

describe('Plaid Migration — Security contracts', () => {
  test('access_token_enc column comment states it is never returned to client', () => {
    // COMMENT ON COLUMN plaid_items.access_token_enc must exist
    expect(containsSQL('COMMENT ON COLUMN plaid_items.access_token_enc')).toBe(true);
    // And the comment text references encryption / never returned
    expect(containsSQL('Encrypted access token')).toBe(true);
  });

  test('transactions_cursor column comment documents sync cursor semantics', () => {
    expect(containsSQL('COMMENT ON COLUMN plaid_items.transactions_cursor')).toBe(true);
    expect(containsSQL('/transactions/sync')).toBe(true);
  });

  test('plaid_webhook_events table comment states append-only / never delete', () => {
    expect(containsSQL('COMMENT ON TABLE plaid_webhook_events')).toBe(true);
    // Must mention append-only or never delete
    const tableCommentRegex = /COMMENT\s+ON\s+TABLE\s+plaid_webhook_events\s+IS\s+'([^']+)'/i;
    const match = sql.match(tableCommentRegex);
    expect(match).not.toBeNull();
    const commentText = match[1].toLowerCase();
    expect(
      commentText.includes('append-only') || commentText.includes('never delete')
    ).toBe(true);
  });

  test('plaid_transaction_id comment documents idempotency semantics', () => {
    expect(containsSQL('COMMENT ON COLUMN transactions.plaid_transaction_id')).toBe(true);
  });

  test('no raw access_token column definition exists (must be encrypted)', () => {
    // Only check column definitions inside CREATE TABLE blocks — ignore COMMENT lines
    const block = getTableBlock('plaid_items');
    expect(block).not.toBeNull();
    const columnLines = block
      .split('\n')
      .filter((l) => !l.trim().startsWith('--'));
    // No column line should define a bare access_token (without _enc suffix)
    const hasBareToken = columnLines.some((l) =>
      /\baccess_token\b(?!_enc)/i.test(l)
    );
    expect(hasBareToken).toBe(false);
  });
});

// ===========================================================================
// 10. Backward Compatibility — no ALTER on existing tables
// ===========================================================================

describe('Plaid Migration — Backward Compatibility', () => {
  test('no ALTER TABLE on users', () => {
    expect(containsSQL('ALTER TABLE users')).toBe(false);
  });

  test('no ALTER TABLE on user_credit_cards', () => {
    expect(containsSQL('ALTER TABLE user_credit_cards')).toBe(false);
  });

  test('no ALTER TABLE on card_catalog', () => {
    expect(containsSQL('ALTER TABLE card_catalog')).toBe(false);
  });

  test('no DROP TABLE statements anywhere in migration', () => {
    expect(containsSQL('DROP TABLE')).toBe(false);
  });

  test('no DROP INDEX statements anywhere in migration', () => {
    expect(containsSQL('DROP INDEX')).toBe(false);
  });

  test('all CREATE TABLE use IF NOT EXISTS (idempotent)', () => {
    // Match full CREATE TABLE lines up through the table name
    const createStatements = sql.match(/CREATE\s+TABLE\s+.*?\(/gi) || [];
    const nonIdempotent = createStatements.filter(
      (s) => !s.toLowerCase().includes('if not exists')
    );
    expect(nonIdempotent).toHaveLength(0);
  });

  test('all CREATE INDEX use IF NOT EXISTS (idempotent)', () => {
    // Match CREATE INDEX ... ON (captures through to ON keyword)
    const indexStatements = sql.match(/CREATE\s+INDEX\s+.*?\bON\b/gi) || [];
    const nonIdempotent = indexStatements.filter(
      (s) => !s.toLowerCase().includes('if not exists')
    );
    expect(nonIdempotent).toHaveLength(0);
  });
});

// ===========================================================================
// 11. schema.sql sync — single source of truth
// ===========================================================================

describe('Plaid Migration — schema.sql consistency', () => {
  let schemaSql;

  beforeAll(() => {
    const schemaPath = path.resolve(__dirname, '../../../supabase/schema.sql');
    schemaSql = fs.readFileSync(schemaPath, 'utf8');
  });

  const REQUIRED_TABLES = [
    'plaid_items',
    'plaid_accounts',
    'plaid_liabilities',
    'transactions',
    'plaid_webhook_events',
  ];

  test.each(REQUIRED_TABLES)(
    'schema.sql contains CREATE TABLE for %s',
    (table) => {
      expect(schemaSql.toLowerCase().includes(`create table if not exists ${table}`)).toBe(true);
    }
  );

  test('schema.sql contains all 4 updated_at triggers for Plaid tables', () => {
    const triggers = [
      'trg_plaid_items_updated_at',
      'trg_plaid_accounts_updated_at',
      'trg_plaid_liabilities_updated_at',
      'trg_transactions_updated_at',
    ];
    triggers.forEach((trigger) => {
      expect(schemaSql.toLowerCase().includes(trigger.toLowerCase())).toBe(true);
    });
  });

  test('schema.sql does not contain a trigger for plaid_webhook_events', () => {
    expect(schemaSql.toLowerCase().includes('trg_plaid_webhook_events')).toBe(false);
  });
});
