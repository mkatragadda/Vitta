# Archived SMS Integration Documents (v1.0)

**Archived Date:** 2026-05-17
**Reason:** Consolidated into single comprehensive document

---

## Why These Were Archived

The original SMS integration design was split across multiple documents which made it confusing to follow. These documents have been **consolidated into a single source of truth**:

**New Single Document:** `../SMS_INTEGRATION_COMPLETE.md`

---

## Archived Files

1. **SMS_INTEGRATION_DESIGN.md** - Original Part 1
   - Executive summary
   - System architecture
   - User flows
   - Component specs (partial)

2. **SMS_INTEGRATION_DESIGN_PART2.md** - Original Part 2
   - Database schema (old version using beneficiaries)
   - API specifications
   - Security model
   - Implementation plan

3. **SMS_INTEGRATION_WISE_COMPATIBILITY.md** - Compatibility Analysis
   - Explained why to use wise_recipients instead of beneficiaries
   - Detailed table comparisons
   - Migration guidance

4. **SMS_INTEGRATION_CHANGES_SUMMARY.md** - Change Log
   - Summary of v1.0 → v2.0 changes
   - Breaking changes list
   - Quick migration guide

---

## What Changed in v2.0

### Key Updates

1. **Consolidated Documentation**
   - Single comprehensive document
   - All sections in logical order
   - No redundancy

2. **Design Corrections**
   - Uses `wise_recipients` (not `beneficiaries`)
   - Uses `wise_recipient_nicknames` (not `beneficiary_nicknames`)
   - Ensures zero changes to existing WISE integration

3. **Clarity Improvements**
   - Clear section headings
   - Complete code examples
   - Step-by-step implementation guide

---

## Migration Path

If you started implementation with v1.0 documents:

### Table Renames Required

```sql
-- If you created these tables, rename them:
ALTER TABLE beneficiary_nicknames RENAME TO wise_recipient_nicknames;

-- Update foreign key column:
ALTER TABLE pending_sms_transfers
  RENAME COLUMN beneficiary_id TO wise_recipient_id;
```

### Code Changes Required

```javascript
// OLD (v1.0):
import { beneficiaryService } from './beneficiary-service';
const beneficiary = await beneficiaryService.get(id);

// NEW (v2.0):
import { wiseRecipientService } from './wise/wiseRecipientService';
const wiseRecipient = await wiseRecipientService.get(id);
```

### No Changes Required

- All WISE services (wiseQuoteService, wiseOrchestrator, etc.)
- Token system
- Webhook verification
- Message templates
- Web confirmation screens

---

## Current Documentation

**Primary Document:** `../SMS_INTEGRATION_COMPLETE.md`

**Quick Start:** `../SMS_INTEGRATION_README.md`

---

## Notes

These archived documents are kept for historical reference only. **Do not use them for implementation.**

Use `SMS_INTEGRATION_COMPLETE.md` instead - it contains all corrections, updates, and the latest design.

---

**Archived by:** Claude Code
**Consolidation Version:** 2.0 Final
**Status:** Historical Reference Only
