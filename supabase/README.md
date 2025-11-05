# Vitta Database Schema Management

## 📋 Overview

This directory contains all database schema definitions and migration scripts for the Vitta application.

## 🎯 Source of Truth: `schema.sql`

**IMPORTANT**: `schema.sql` is the **authoritative source** for the database schema.

### Workflow for Schema Changes

When making any database schema changes, **ALWAYS** follow this order:

1. **Update `schema.sql` FIRST** - Modify the master schema definition
2. **Create/Update Migration Script** - Write SQL to migrate existing database to match schema.sql
3. **Update Code** - Modify application code to use new schema
4. **Apply Migration** - Run migration script on actual database
5. **Test** - Verify everything works end-to-end

### Why This Matters

If you modify only the migration script without updating `schema.sql`:
- Code generators reading schema.sql will have outdated information
- New database instances will be created with old schema
- Developers will be confused about the actual schema structure
- Documentation will be out of sync

## 📁 File Descriptions

### Core Schema Files

#### `schema.sql` ⭐ **PRIMARY SOURCE OF TRUTH**
Complete database schema definition including:
- All table definitions with comprehensive inline comments
- All indexes and constraints
- Helper functions and triggers
- Complete column documentation

**When to use**:
- Creating a new database from scratch
- Understanding the intended database structure
- As reference when writing code

**Status**: Always kept up-to-date with latest schema changes

#### `QUICK_FIX.sql` 🔧 **Migration Script**
Migration script to align existing databases with `schema.sql`.

**What it does**:
1. Drops dependent views (if needed)
2. Converts column types (INTEGER → DATE for statement cycles)
3. Adds missing columns (annual_fee, card_network, nickname, etc.)
4. Removes NOT NULL constraints where needed
5. Creates indexes

**How to apply**:
```
1. Go to: https://app.supabase.com/project/YOUR_PROJECT/sql/new
2. Copy and paste entire QUICK_FIX.sql file
3. Click "Run"
```

**Status**: Synchronized with schema.sql

### Seed Data Files

#### `seed_cards.sql` 💳 **Card Catalog Data**
Contains INSERT statements for 114 credit cards from the card catalog:
- All major credit cards (Chase, Amex, Citi, Capital One, etc.)
- Complete details: rewards, fees, APR, images, benefits
- Real card images from offeroptimist.com

**How to apply**:
```sql
-- Run this in Supabase SQL Editor
\i seed_cards.sql
```

**Note**: This file should be run AFTER creating the card_catalog table via schema.sql

#### `apply_schema_and_seed.sql` 🚀 **One-Step Setup**
Complete setup script that:
1. Creates all tables from schema.sql
2. Seeds card_catalog with sample cards (subset of seed_cards.sql)

**Use case**: Quick demo/development setup

## 🔄 Schema Version History

### Current Version (2025-01-04)

**user_credit_cards table changes**:
- ✅ Added `nickname TEXT` - Optional user-friendly card name
- ✅ Made `card_type TEXT` nullable (legacy field)
- ✅ Changed `statement_cycle_start` from INTEGER to DATE
- ✅ Changed `statement_cycle_end` from INTEGER to DATE
- ✅ Added comprehensive inline comments

**Reasoning**:
- `nickname` allows personalized card identification ("My Travel Card")
- `card_type` is legacy field, doesn't need to be required
- DATE types are more accurate than storing just day-of-month integers
- Better documentation helps developers understand schema intent

## 📊 Table Relationships

```
users (id)
  └─→ user_credit_cards (user_id) [1:many]

card_catalog (id)
  └─→ user_credit_cards (catalog_id) [1:many, optional]

users (id)
  └─→ user_behavior (user_id) [1:many]
```

## 🔍 Important Tables

### `user_credit_cards`
Core table storing user's credit card wallet.

**Key Fields**:
- `card_name` (required) - Official card name
- `nickname` (optional) - User's custom name
- `catalog_id` (optional) - Links to card_catalog if from catalog
- `credit_limit` (required) - User's credit limit
- `apr` (required) - User's APR (may differ from catalog default)
- `due_date`, `statement_cycle_start`, `statement_cycle_end` (optional) - All DATE type

**Display Logic**:
```javascript
const displayName = card.nickname || card.card_name;
```

### `card_catalog`
Master catalog of available credit cards (read-only for users).

**Key Fields**:
- `card_name` - Official card name
- `issuer` - Card issuer (Chase, Amex, etc.)
- `card_network` - Visa, Mastercard, Amex, Discover
- `reward_structure` - JSONB with reward multipliers
- `annual_fee` - Annual fee in dollars
- `image_url` - Card image URL

## 🛠️ Common Tasks

### Adding a New Column

1. **Update schema.sql**:
```sql
-- In schema.sql, add column with comments
new_column_name TEXT, -- Description of what this column stores
```

2. **Update QUICK_FIX.sql**:
```sql
-- Add migration step
ALTER TABLE table_name ADD COLUMN IF NOT EXISTS new_column_name TEXT;
```

3. **Update application code** to use new column

4. **Apply migration** via Supabase SQL Editor

### Changing Column Type

1. **Update schema.sql** with new type

2. **Update QUICK_FIX.sql** with conversion logic:
```sql
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'your_table'
        AND column_name = 'your_column'
        AND data_type = 'old_type'
    ) THEN
        ALTER TABLE your_table DROP COLUMN your_column;
        ALTER TABLE your_table ADD COLUMN your_column new_type;
        RAISE NOTICE 'Converted your_column from old_type to new_type';
    END IF;
END $$;
```

3. **Handle dependent views** - Drop them first if they reference the column

4. **Update code** to use new type

5. **Apply migration**

## ⚠️ Common Pitfalls

### ❌ DON'T: Modify database directly without updating schema.sql
```sql
-- BAD: Running this only in Supabase console
ALTER TABLE user_credit_cards ADD COLUMN new_field TEXT;
```
**Problem**: schema.sql is now outdated, causing confusion

### ✅ DO: Update schema.sql first, then create migration
```sql
-- 1. First update schema.sql with the new column
-- 2. Then add to QUICK_FIX.sql or new migration file
ALTER TABLE user_credit_cards ADD COLUMN IF NOT EXISTS new_field TEXT;
-- 3. Finally apply to database
```

### ❌ DON'T: Change column names without migration path
**Problem**: Existing data and code will break

### ✅ DO: Create backward-compatible migrations
```sql
-- Add new column
ALTER TABLE users ADD COLUMN new_name TEXT;
-- Migrate data
UPDATE users SET new_name = old_name;
-- Drop old column after code is updated
-- ALTER TABLE users DROP COLUMN old_name;
```

## 📚 Additional Documentation

Related documentation files:
- `SCHEMA_ALIGNMENT_COMPLETE.md` - Details on recent date type fixes
- `CARD_TYPE_AND_NICKNAME_FIX.md` - Details on card_type and nickname changes
- `FIX_MISSING_COLUMNS.md` - Historical fix for missing catalog columns
- `CARD_DATABASE_COMPLETE.md` - Card catalog population guide

## 🔗 Useful Links

- [Supabase SQL Editor](https://app.supabase.com/project/YOUR_PROJECT/sql/new)
- [Supabase Table Editor](https://app.supabase.com/project/YOUR_PROJECT/editor)
- [PostgreSQL Data Types](https://www.postgresql.org/docs/current/datatype.html)
- [JSONB Functions](https://www.postgresql.org/docs/current/functions-json.html)

## 📞 Need Help?

If you encounter schema-related issues:

1. **Check schema.sql** - Does it match what you expect?
2. **Check actual database** - Run `\d user_credit_cards` in psql or check Supabase Table Editor
3. **Check QUICK_FIX.sql** - Does it have migration steps for your changes?
4. **Check documentation** - See related .md files in root directory

---

**Last Updated**: 2025-01-04
**Maintainer**: Vitta Development Team
