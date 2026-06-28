# Repay Recent Payee — Design
## Re-initiate payment from HomeScreen without re-scanning

**Status:** Design — pending review  
**Last Updated:** 2026-06-27

---

## 1. Problem

After paying someone, the user has to scan their QR code again for the next payment.  
Recent payees are shown on the HomeScreen but tapping them does nothing.  
Goal: one tap on a recent payee row → pay them again, no scan required.

---

## 2. Data Available (no new API needed)

`/api/beneficiaries/recent` already returns everything needed:

```
upiId       → pa param for deep link
name        → pn param + display
amountInr   → pre-fill amount (editable)
amountUsd   → show USD equivalent
lastPaidAt  → "Last paid Jun 17" context
upiType     → p2p / p2m (avatar shape + app ordering)
rail        → last app used (reference only)
```

`PaymentReviewScreen` already accepts exactly this shape as `parsedUPI`.  
No schema changes, no new API endpoints.

---

## 3. User Flow

```
HomeScreen — recent payees list
  │
  └── Tap payee row
        │
        ▼
   QuickPaySheet  (bottom sheet, same z-index pattern as UPI app sheet)
    │
    ├── "Pay ₹850 again"          → setScanData(prefilled) → payment-review screen
    │    (last amount, one tap)
    │
    └── "Pay different amount"    → AmountInputModal (already exists)
              │
              └── user enters amount → setScanData(prefilled + new amount) → payment-review screen
```

PaymentReviewScreen is **unchanged** — it receives the same `parsedUPI` shape it gets from a scan.  
The only new prop is `sourceLabel` for the back button text.

---

## 4. Screen Designs

### 4.1 HomeScreen — PayeeRow (updated)

Rows become tappable. Add a right-facing indicator so tap intent is clear.

```
┌──────────────────────────────────────────────┐
│  [CP]  Chai Point                ₹850   [›]  │   ← right arrow replaces P2M badge position
│        Jun 17                    $10.16       │
│                             [P2M]             │
└──────────────────────────────────────────────┘
```

The row gets a subtle hover/active state (`rgba(255,255,255,0.02)` background on press).  
No other changes to HomeScreen layout.

---

### 4.2 QuickPaySheet

Bottom sheet — same style as UPI app chooser sheet.

```
┌──────────────────────────────────────────────┐
│                  ────                         │  drag handle
│                                              │
│  [CP]  Chai Point                            │  payee mini-card
│        chaipointblr@upi        [P2M]         │
│                                              │
│  Last paid ₹850.00 ($10.16) · Jun 17         │  context line — dim, 11px
│                                              │
│ ╔════════════════════════════════════════════╗│
│ ║  Pay ₹850 again                        →  ║│  teal bg — primary
│ ╚════════════════════════════════════════════╝│
│                                              │
│  ┌──────────────────────────────────────────┐│
│  │  Pay different amount               →   ││  secondary — glass bg
│  └──────────────────────────────────────────┘│
│                                              │
└──────────────────────────────────────────────┘
```

Tokens:
```
sheet bg:       #0d1f1a  (same as UpiAppSheet)
payee card:     rgba(255,255,255,0.04) border rgba(255,255,255,0.08)
context line:   rgba(255,255,255,0.35), fontSize 11
primary CTA:    bg #4ecf9a, color #071412, fontSize 14 w800, radius 13
secondary CTA:  glass bg, border rgba(255,255,255,0.08), color rgba(255,255,255,0.65), fontSize 14
```

---

### 4.3 PaymentReviewScreen — back button label

Currently hardcoded `← Scan again`. When coming from repay flow, show `← Payees`.

Controlled by a new optional prop: `sourceLabel="Payees"` (default `"Scan again"`).

---

## 5. Component Architecture

```
VittaTravelPayApp (state owner)
  │
  ├── HomeScreen
  │     └── PayeeRow (tappable) ──onPress──→ onPayeePress(payee)
  │
  ├── QuickPaySheet  [NEW — conditional render, same level as UpiAppSheet]
  │     ├── "Pay ₹X again"        → handleRepay(payee, payee.amountInr)
  │     └── "Pay different amount" → setShowAmountModal(true), setPendingScanData(...)
  │
  ├── AmountInputModal (existing — reused unchanged)
  │
  └── PaymentReviewScreen
        └── new prop: sourceLabel="Payees"
```

---

## 6. State changes in VittaTravelPayApp

Add two new state variables:

```javascript
const [quickPayPayee, setQuickPayPayee] = useState(null); // drives QuickPaySheet visibility
```

Reuse existing:
- `pendingScanData` + `showAmountModal` — for "pay different amount" path
- `scanData` + `setCurrentScreen('payment-review')` — for both repay paths

New handler:

```javascript
// Called when user taps a payee row
const handlePayeePress = (payee) => {
  setQuickPayPayee(payee);
};

// Called when "Pay ₹X again" tapped in sheet
const handleQuickRepay = (payee) => {
  setQuickPayPayee(null);
  setScanData({
    upiId:      payee.upiId,
    payeeName:  payee.name,
    amount:     payee.amountInr,
    upiType:    payee.upiType,
    merchantCode: '',         // not available from history — omit
  });
  setCurrentScreen('payment-review');
};

// Called when "Pay different amount" tapped in sheet
const handleRepayDifferentAmount = (payee) => {
  setQuickPayPayee(null);
  setPendingScanData({
    upiId:      payee.upiId,
    payeeName:  payee.name,
    upiType:    payee.upiType,
    merchantCode: '',
  });
  setShowAmountModal(true);
};
```

---

## 7. Files Touched

| File | Change |
|------|--------|
| `components/travelpay/HomeScreen.js` | Add `onPayeePress` prop; make PayeeRow tappable; add `›` indicator |
| `components/travelpay/QuickPaySheet.js` | **New** — bottom sheet component |
| `components/VittaTravelPayApp.js` | Add `quickPayPayee` state + 3 handlers; wire QuickPaySheet; pass `sourceLabel` |
| `components/travelpay/PaymentReviewScreen.js` | Accept `sourceLabel` prop for back button |

No API changes. No schema changes. No new dependencies.

---

## 8. Edge Cases

| Case | Handling |
|------|----------|
| Amount was 0 in history | `amountInr` from API is 0 → skip "Pay ₹0 again"; show only "Pay different amount" |
| Payee name is just UPI ID | Show UPI ID in both the card and CTA: "Pay again" (no amount prefix) |
| User taps row during scan | QuickPaySheet won't appear — PayeeRow only renders on HomeScreen |
| Very long payee name | Truncate with ellipsis (already handled by PayeeRow styles) |

---

## 9. Open Questions for Review

1. **Should "Pay ₹X again" pre-confirm the amount or open PaymentReviewScreen editable?**  
   Proposal: always open PaymentReviewScreen (editable) — same path for both options, amount just pre-filled. User can change it before choosing an app.

2. **Should the last rail be highlighted in the app chooser?**  
   e.g. if user paid via GPay last time, show "Last used" badge on GPay row.  
   Proposal: Yes — easy to add, helpful context. `payee.rail` is already in the data.

3. **5-payee limit on HomeScreen — should repay expose more?**  
   Current limit: 5 recent payees from API.  
   Proposal: No change for now — "View all →" on Activity tab shows full history.

---

## 10. Implementation Sequence (pending your approval)

1. `QuickPaySheet.js` — new component, no dependencies
2. `HomeScreen.js` — make PayeeRow tappable, add `onPayeePress`
3. `VittaTravelPayApp.js` — wire state + handlers + QuickPaySheet render
4. `PaymentReviewScreen.js` — `sourceLabel` prop (3-line change)
