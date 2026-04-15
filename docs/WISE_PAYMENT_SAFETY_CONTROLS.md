# Wise Payment Safety Controls

## ⚠️ IMPORTANT: Real Money Transfer Protection

This document explains how to control **REAL MONEY** transfers via the Wise API.

---

## Understanding the Payment Flow

### Current Flow (4 Steps)

When a user clicks "Pay" on the Payment Confirmation screen, these steps execute:

1. **Create Quote** (Step 1) - Get exchange rate, fees, etc. ✅ **NO money moved**
2. **Create/Get Recipient** (Step 2) - Set up UPI recipient account ✅ **NO money moved**
3. **Create Transfer** (Step 3) - Create transfer record in Wise ✅ **NO money moved**
4. **Fund Transfer** (Step 4) - ⚠️ **REAL MONEY MOVED HERE!**

---

## Safety Controls

### Environment Variable: `WISE_AUTO_FUND`

Controls whether Step 4 (Fund Transfer) executes automatically.

**Location:** `.env.local`

```bash
# SAFE MODE (Default for Testing)
# Transfer created but NOT funded - no real money moved
WISE_AUTO_FUND=false
NEXT_PUBLIC_WISE_AUTO_FUND=false

# LIVE MODE (Production)
# Transfer created AND funded immediately - REAL MONEY MOVED!
WISE_AUTO_FUND=true
NEXT_PUBLIC_WISE_AUTO_FUND=true
```

### How It Works

#### Safe Mode (`WISE_AUTO_FUND=false`)

```javascript
// User clicks "Pay"
executeTransfer({
  autoFund: false // Stops before Step 4
})

// Result:
// ✅ Quote created
// ✅ Recipient created
// ✅ Transfer created
// ⏸️  Transfer NOT funded
// 💰 NO REAL MONEY MOVED

// Logs will show:
[WiseOrchestrator] Step 4/4: ⏸️  SKIPPED (Safe Mode - No Funding)
[WiseOrchestrator] Transfer created but NOT funded
```

#### Live Mode (`WISE_AUTO_FUND=true`)

```javascript
// User clicks "Pay"
executeTransfer({
  autoFund: true // Executes Step 4
})

// Result:
// ✅ Quote created
// ✅ Recipient created
// ✅ Transfer created
// 💰 Transfer FUNDED - REAL MONEY MOVED!

// Logs will show:
[WiseOrchestrator] Step 4/4: 💰 FUNDING TRANSFER (REAL MONEY)...
[WiseOrchestrator] ⚠️  WARNING: About to move REAL MONEY via Wise API!
[WiseOrchestrator] ✅ Transfer funded successfully!
```

---

## Testing Workflow

### 1. Initial Testing (Safe Mode)

**Goal:** Test the entire flow without moving real money

```bash
# In .env.local
WISE_AUTO_FUND=false
NEXT_PUBLIC_WISE_AUTO_FUND=false
```

**What to test:**
- ✅ QR code scanning works
- ✅ Quote creation works (gets real exchange rates)
- ✅ Recipient creation works
- ✅ Transfer creation works
- ✅ Database records are saved correctly
- ⏸️  NO real money is moved

**UI Shows:**
```
⚠️ 🔒 Safe Mode: Testing Only
Transfer will be created but NOT funded.
No real money will be moved. Perfect for testing!

[Button: "Create Transfer (No Charge)"]
```

### 2. Pre-Production Verification

**Goal:** Verify all APIs work correctly before enabling real transfers

**Checklist:**
- [ ] All Wise API calls succeed (check logs)
- [ ] Exchange rates are accurate
- [ ] Fee calculations are correct
- [ ] Database records are created properly
- [ ] UI shows correct amounts
- [ ] Error handling works correctly

### 3. Production (Live Mode)

**Goal:** Enable real money transfers

**⚠️ ONLY DO THIS AFTER COMPLETE TESTING!**

```bash
# In .env.local
WISE_AUTO_FUND=true
NEXT_PUBLIC_WISE_AUTO_FUND=true
```

**Restart server:**
```bash
npm run dev
```

**UI Shows:**
```
⚠️ 💰 Live Mode: Real Money Transfer
Clicking "Confirm Payment" will IMMEDIATELY transfer
REAL MONEY from your Wise account to the merchant.
This action cannot be undone.

[Button: "Confirm Payment $5.62"]
```

---

## Manual Funding (Advanced)

If you create a transfer in Safe Mode but want to fund it later:

### Using API Endpoint

```bash
# Fund an existing transfer
POST /api/wise/transfer/fund
Headers: {
  "x-user-id": "user-id-123"
}
Body: {
  "transferId": "transfer-uuid-from-database"
}
```

### Using Service Directly

```javascript
import WiseOrchestrator from './services/wise/wiseOrchestrator';

// Fund a transfer that was created without funding
await orchestrator.fundExistingTransfer(transferId);
```

### Logs for Manual Funding

```
========== WISE ORCHESTRATOR - FUND TRANSFER ==========
[WiseOrchestrator] ⚠️  WARNING: About to FUND transfer with REAL MONEY!
[WiseOrchestrator] Transfer ID: abc-123-def
=======================================================

[WiseOrchestrator] 💰 Funding transfer...
[WiseOrchestrator] ✅ Transfer funded successfully!
[WiseOrchestrator] Payment ID: payment-456-xyz
```

---

## Monitoring and Logs

### Key Log Messages

**Safe Mode Enabled:**
```
[WiseOrchestrator] ⚠️  AUTO-FUND: NO (SAFE MODE)
[WiseOrchestrator] Step 4/4: ⏸️  SKIPPED (Safe Mode - No Funding)
[WiseOrchestrator] Funded: NO
```

**Live Mode - Real Money:**
```
[WiseOrchestrator] ⚠️  AUTO-FUND: YES (REAL MONEY)
[WiseOrchestrator] Step 4/4: 💰 FUNDING TRANSFER (REAL MONEY)...
[WiseOrchestrator] ⚠️  WARNING: About to move REAL MONEY via Wise API!
[WiseOrchestrator] Funded: YES
```

### Database Checks

**Verify transfers are created correctly:**
```sql
-- Check recent transfers
SELECT
  id,
  source_amount,
  target_amount,
  is_funded,
  status,
  wise_status,
  created_at
FROM wise_transfers
ORDER BY created_at DESC
LIMIT 10;
```

**Check if a transfer was funded:**
```sql
SELECT
  t.id,
  t.is_funded,
  t.funded_at,
  p.wise_payment_status,
  p.payment_completed_at
FROM wise_transfers t
LEFT JOIN wise_payments p ON p.wise_transfer_id = t.id
WHERE t.id = 'transfer-id-here';
```

---

## Troubleshooting

### Issue: Transfers not being created

**Check:**
1. Wise API credentials are correct
2. Exchange rates are being fetched
3. Check server logs for errors

**Safe Mode:** This is fine! No money is being lost.

### Issue: Cannot enable Live Mode

**Checklist:**
1. ✅ All tests pass in Safe Mode
2. ✅ Wise account has sufficient balance
3. ✅ UPI recipient details are correct
4. ✅ Exchange rates are reasonable
5. ✅ Fees are calculated correctly

### Issue: Transfer created but not showing as funded

**If WISE_AUTO_FUND=false:**
- ✅ This is expected! You're in Safe Mode
- To fund it, use `fundExistingTransfer(transferId)`

**If WISE_AUTO_FUND=true:**
- ❌ Check server logs for errors
- Check Wise API response
- Verify Wise account balance

---

## Security Best Practices

### 1. Always Start in Safe Mode
```bash
WISE_AUTO_FUND=false  # Default
```

### 2. Use Live Mode Only in Production
Never commit `WISE_AUTO_FUND=true` to version control.

### 3. Monitor All Transfers
Check database regularly:
```sql
SELECT COUNT(*), is_funded
FROM wise_transfers
WHERE created_at > NOW() - INTERVAL '1 day'
GROUP BY is_funded;
```

### 4. Set Up Alerts
- Alert on unexpected funded transfers
- Alert on high transfer amounts
- Alert on failed transfers

---

## Quick Reference

| Mode | WISE_AUTO_FUND | Real Money? | Use Case |
|------|----------------|-------------|----------|
| **Safe Mode** | `false` | ❌ NO | Development, Testing |
| **Live Mode** | `true` | ✅ YES | Production Only |

**Change Mode:**
1. Edit `.env.local`
2. Change `WISE_AUTO_FUND` value
3. Restart dev server: `npm run dev`
4. UI will update automatically

**Verify Current Mode:**
- Check payment confirmation screen banner
- Check server logs when creating transfer
- Check database `is_funded` field

---

## Contact

For issues or questions:
- Check server logs first (look for `[WiseOrchestrator]` messages)
- Review Wise API documentation
- Contact support if real money issues occur
