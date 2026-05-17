# SMS Integration Design - Changes Summary

**Date:** 2026-05-17
**Version:** 2.0 (WISE Compatible)

---

## 🚨 CRITICAL UPDATE: Using wise_recipients Instead of beneficiaries

The SMS integration design has been **updated** to use the existing `wise_recipients` table instead of the `beneficiaries` table. This ensures compatibility with the existing WISE integration.

---

## Key Design Changes

### ❌ Original Design
- Used `beneficiaries` table
- Created separate recipient management for SMS
- Required changes to WISE integration

### ✅ Updated Design
- Uses `wise_recipients` table (existing WISE infrastructure)
- Reuses existing recipient lookup and creation logic
- **ZERO changes to existing WISE services**
- Consistent with QR code transfer flow

---

## Updated Table Names

| Original Name (v1.0) | Updated Name (v2.0) | Purpose |
|---------------------|---------------------|---------|
| `beneficiary_nicknames` | `wise_recipient_nicknames` | Map nicknames to WISE recipients |
| `pending_sms_transfers.beneficiary_id` | `pending_sms_transfers.wise_recipient_id` | Reference to WISE recipient |

---

## NO CHANGES Required to Existing Code

### ✅ Existing WISE Services (Unchanged)

All these services work as-is with SMS integration:

1. **wiseQuoteService.js** - NO CHANGES
   - Already accepts `recipientId` from `wise_recipients`
   - SMS flow passes `wise_recipient.id`

2. **wiseRecipientService.js** - NO CHANGES
   - Already handles recipient lookup/creation
   - SMS flow uses same lookup logic

3. **wiseTransferService.js** - NO CHANGES
   - Already accepts `recipientId` from `wise_recipients`
   - SMS flow uses same transfer creation

4. **wiseOrchestrator.js** - NO CHANGES
   - Already orchestrates full transfer flow
   - SMS flow calls same orchestrator

### ✅ Existing Database Tables (Unchanged)

All WISE tables remain untouched:
- `wise_recipients` (existing - used by SMS)
- `wise_quotes` (existing - used by SMS)
- `wise_transfers` (existing - used by SMS)
- `wise_payments` (existing - used by SMS)
- `wise_transfer_events` (existing - used by SMS)

---

## Updated Architecture Flow

```
SMS: "Send $500 to mom"
  ↓
Parse intent: amount=$500, recipient="mom"
  ↓
Lookup nickname → wise_recipient_nicknames
  ↓
Get WISE recipient → wise_recipients (EXISTING TABLE)
  ↓
Create quote → wiseQuoteService (EXISTING SERVICE, NO CHANGES)
  ↓
Create pending transfer → pending_sms_transfers (NEW TABLE)
  ↓
Generate token → SMS with link
  ↓
User confirms on web
  ↓
Execute transfer → wiseOrchestrator (EXISTING SERVICE, NO CHANGES)
  ↓
Money transferred via WISE API ✅
```

---

## New Tables (SMS-Specific Only)

### 1. `wise_recipient_nicknames`
Maps friendly names to WISE recipients
```sql
CREATE TABLE wise_recipient_nicknames (
  wise_recipient_id UUID REFERENCES wise_recipients(id)
  nickname VARCHAR(100) -- e.g., "mom", "dad"
);
```

### 2. `pending_sms_transfers`
Stores pending transfers before web confirmation
```sql
CREATE TABLE pending_sms_transfers (
  wise_recipient_id UUID REFERENCES wise_recipients(id)
  wise_quote_id UUID REFERENCES wise_quotes(id)
  wise_transfer_id UUID REFERENCES wise_transfers(id)
);
```

### 3. `user_phone_numbers`
Links phone numbers to user accounts

### 4. `sms_conversations`
Tracks multi-turn SMS conversations

### 5. `sms_transfer_tokens`
Secure one-time confirmation tokens

### 6. `sms_messages_log`
Audit trail of all SMS messages

---

## Updated Migration File

**File:** `supabase/migrations/003_sms_integration.sql`

**Key Changes:**
```sql
-- ✅ CHANGED: References wise_recipients
CREATE TABLE wise_recipient_nicknames (
  wise_recipient_id UUID REFERENCES wise_recipients(id)
);

-- ✅ CHANGED: Uses wise_recipient_id
CREATE TABLE pending_sms_transfers (
  wise_recipient_id UUID REFERENCES wise_recipients(id) NOT NULL
);
```

**Complete migration available in:** `SMS_INTEGRATION_WISE_COMPATIBILITY.md`

---

## Implementation Checklist (Updated)

### Phase 1: Foundation (2-3 hours)
- [ ] Run database migration (003_sms_integration.sql)
- [ ] Create AgentPhone client service
- [ ] Implement webhook handler
- [ ] Test webhook receiving

### Phase 2: Intent Parsing (1-2 hours)
- [ ] Build SMS intent parser
- [ ] Implement entity extraction
- [ ] **✅ UPDATED:** Create `wise_recipient` matcher (was beneficiary matcher)
- [ ] Add conversation state manager

### Phase 3: Pending Transfers (1.5 hours)
- [ ] Implement pending transfer service
- [ ] **✅ UPDATED:** Use `wise_recipients` table (not beneficiaries)
- [ ] Build token generation
- [ ] **✅ NO CHANGES:** Integrate with existing wiseQuoteService

### Phase 4: Web Confirmation (2 hours)
- [ ] Create `/transfer/confirm/[token]` page
- [ ] **✅ UPDATED:** Display wise_recipient details (not beneficiary)
- [ ] **✅ NO CHANGES:** Call existing wiseOrchestrator for execution

### Phase 5: Integration & Testing (1.5 hours)
- [ ] Connect all components
- [ ] **✅ UPDATED:** Test with wise_recipients
- [ ] **✅ NO CHANGES:** Verify existing WISE services still work

---

## Documentation Files

### Primary Docs (Read These)
1. **SMS_INTEGRATION_WISE_COMPATIBILITY.md** ⭐ (THIS IS KEY)
   - Detailed comparison of beneficiaries vs wise_recipients
   - Complete architecture with WISE integration
   - Updated database schema
   - Shows exactly what changed and why

2. **SMS_INTEGRATION_DESIGN.md** (Part 1)
   - System architecture (updated for wise_recipients)
   - User flows
   - Component specifications

3. **SMS_INTEGRATION_DESIGN_PART2.md** (Part 2)
   - Database schema (updated for wise_recipients)
   - API specifications
   - Security model
   - Implementation plan

### Quick Reference
4. **SMS_INTEGRATION_README.md**
   - Quick start guide
   - Implementation checklist
   - File structure

---

## Breaking Changes from v1.0

### ⚠️ If You Started Implementation with v1.0

**Changes Required:**
1. Rename table: `beneficiary_nicknames` → `wise_recipient_nicknames`
2. Update foreign key: `beneficiary_id` → `wise_recipient_id`
3. Update service imports: Use `wiseRecipientService` instead of `beneficiaryService`
4. Update queries: Query `wise_recipients` instead of `beneficiaries`

**No Changes Required:**
- All WISE integration services
- All WISE database tables
- Token system
- Webhook handlers
- Message templates
- Web confirmation screens

---

## Quick Comparison

| Aspect | v1.0 (Original) | v2.0 (Updated) | Impact |
|--------|-----------------|----------------|--------|
| Recipient Table | `beneficiaries` | `wise_recipients` | ✅ Better |
| WISE Services | Required changes | No changes | ✅ Better |
| Data Consistency | Separate systems | Single system | ✅ Better |
| QR + SMS Integration | Incompatible | Compatible | ✅ Better |
| Implementation Time | 8-10 hours | 8-10 hours | Same |

---

## Final Recommendation

**✅ USE v2.0 DESIGN** (wise_recipients)

**Reasons:**
1. Zero changes to existing WISE integration
2. Consistent with QR code transfer flow
3. Shared recipient database (better UX)
4. Simpler codebase (no parallel systems)
5. Future-proof for other WISE integrations

**⚠️ DON'T USE v1.0 DESIGN** (beneficiaries)

**Reasons:**
1. Would require changes to working WISE code
2. Creates parallel recipient management
3. Inconsistent with existing flows
4. More complex to maintain

---

## Questions?

**Q: Do I need to migrate existing beneficiaries?**
A: No. beneficiaries table is for Chimoney transfers only. SMS uses WISE, so it uses wise_recipients.

**Q: Will QR code transfers still work?**
A: Yes, zero impact. QR already uses wise_recipients.

**Q: Do existing WISE services need updates?**
A: No, they work as-is with SMS.

**Q: Can I use recipients created via QR in SMS?**
A: Yes! Just add a nickname via the nickname management API.

**Q: What if I already started with v1.0?**
A: Update table/field names as listed in "Breaking Changes" section above.

---

## Next Steps

1. ✅ Read `SMS_INTEGRATION_WISE_COMPATIBILITY.md` (detailed tech spec)
2. ✅ Review updated migration in that doc
3. ✅ Start Phase 1 implementation with correct table names
4. ✅ No changes needed to existing WISE code

---

**STATUS: Design Complete & WISE Compatible ✅**
