# Payment Rails Design
## Multi-App UPI Launch — Vitta Phase 1

**Status:** Design (updated to match mockups)
**Author:** Engineering
**Last Updated:** 2026-06-26

---

## 1. Overview

### Problem
Vitta currently only launches Wise after a QR scan. Wise is a remittance service (USD → INR), not a UPI app. For most payments — especially P2M (merchants) — users want to pay directly via Google Pay, PhonePe, or Paytm using UPI, where the UPI ID and amount are pre-filled automatically.

### Goal
After scanning a UPI QR code, show one clear primary action ("Pay with UPI app") and one secondary alternative (Wise). Tapping the primary opens a bottom sheet with specific installed apps. Tapping any app fires the UPI deep link. The launch is logged for analytics.

### Non-goals
- Vitta does not initiate or confirm money movement
- No payment status polling
- No integration with payment app SDKs or webhooks

---

## 2. UX Principle: Progressive Disclosure

**Do NOT** show all apps as peer options on the main screen. Instead:

- **Main screen**: One primary CTA + one secondary escape hatch
- **Bottom sheet**: Specific UPI app choices (Google Pay, PhonePe, etc.)
- **Wise**: Always secondary, always has a P2P-only disclaimer

This reduces decision load. The user doesn't need to classify P2P vs P2M — Vitta handles the visual weighting automatically.

---

## 3. User Flow

```
Scan QR → parse → detect P2P or P2M
  │
  ▼
PaymentReviewScreen — Default State
  ├── Payee card (name, UPI ID, avatar styled by P2P/P2M)
  ├── Amount card (INR + USD equivalent + live rate)
  ├── [Pay with UPI app]   ← PRIMARY — always teal, always first
  ├── [Use Wise instead]   ← SECONDARY — always dimmer, always second
  └── Memory note          ← only if saved contact ("Last visit: …")

  ↓ Tap "Pay with UPI app"
  ↓
Bottom sheet: "Choose UPI app"
  ├── Google Pay  [Recommended]  → log launch (rail=gpay) → deep link → app opens
  └── PhonePe                   → log launch (rail=phonepe) → deep link → app opens

  ↓ Tap "Use Wise instead"
  ↓
PaymentReviewScreen — Wise Selected State
  ├── UPI button dimmed (opacity 0.5)
  ├── Wise: purple border + checkmark + "Wise selected"
  ├── Amber disclaimer: "P2P only: Wise works for sending money to a person…"
  └── [Continue with Wise]  ← purple CTA → log launch (rail=wise) → open Wise
```

---

## 4. Screen States

### State A — Default (neither option tapped yet)

```
← Scan again

┌──────────────────────────────────┐
│  [CP]  Chai Point                │  payee card — orange rounded-sq avatar (P2M)
│        chaipointblr@upi          │  circle avatar for P2P (purple)
└──────────────────────────────────┘

┌──────────────────────────────────┐  teal border
│  Amount to pay                   │
│  ₹850                            │  30px w800
│  ≈ $10.16 USD                    │  15px teal w700
│  at live rate · ₹84.42 / USD     │  11px dim
└──────────────────────────────────┘

╔══════════════════════════════════╗  PRIMARY — teal bg
║  [▣]  Pay with UPI app      ›   ║
║       Google Pay, PhonePe & more ║
╚══════════════════════════════════╝

┌──────────────────────────────────┐  SECONDARY — dim, small
│  [W]  Use Wise instead      ›   │
│       For person-to-person only  │
└──────────────────────────────────┘

🧠 Last visit: You paid ₹720 here on Jun 17 via Google Pay.   ← memory note
```

### State B — UPI bottom sheet (after tapping "Pay with UPI app")

```
┌──────────────────────────────────┐
│         ────                     │  drag handle
│  Choose UPI app                  │  15px w800
│                                  │
│  ┌────────────────────────────┐  │
│  │ [G]  Google Pay     [Rec] →│  │  top row highlighted, teal arrow, Recommended badge
│  ├────────────────────────────┤  │
│  │ [Ph] PhonePe           →  │  │  standard row, dim arrow
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

### State C — Wise selected

```
← Scan again

[payee card — same]

[amount card — same]

░░░░ Pay with UPI app ░░░░            ← dimmed, opacity 0.5

┌──────────────────────────────────┐  purple border, 2px
│  [W]  Wise selected          ✓  │
│       Person-to-person only      │
└──────────────────────────────────┘

⚠️  P2P only: Wise works for sending money to a person.
    If this is a merchant, use a UPI app instead.

╔══════════════════════════════════╗  purple bg
║  →  Continue with Wise           ║
╚══════════════════════════════════╝
```

---

## 5. UPI Deep Link Protocol

### Standard UPI parameters (NPCI spec)

| Param | Field         | Required | Example            |
|-------|---------------|----------|--------------------|
| `pa`  | Payee address | Yes      | `merchant@okicici` |
| `pn`  | Payee name    | No       | `Chai+Point`       |
| `am`  | Amount (INR)  | No*      | `850.00`           |
| `cu`  | Currency      | Yes      | `INR`              |
| `tn`  | Note          | No       | `Vitta+Payment`    |
| `mc`  | Merchant code | P2M only | `5411`             |

*Omit `am` when QR has no pre-filled amount — app will prompt the user.

### Per-app URLs

#### Google Pay

| Platform | URL |
|----------|-----|
| iOS      | `tez://upi/pay?{params}` |
| Android  | `intent://upi/pay?{params}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;S.browser_fallback_url=https://play.google.com/store/apps/details?id=com.google.android.apps.nbu.paisa.user;end` |
| Web      | Not launchable — show copy fallback |

#### PhonePe

| Platform | URL |
|----------|-----|
| iOS      | `phonepe://pay?{params}` |
| Android  | `intent://pay?{params}#Intent;scheme=upi;package=com.phonepe.app;S.browser_fallback_url=https://play.google.com/store/apps/details?id=com.phonepe.app;end` |

#### Wise

Wise is **not a UPI app**. It is a remittance rail. UPI deep links do not apply.

| Platform | URL |
|----------|-----|
| iOS/Android | `wise://` — opens app; user enters UPI ID manually |
| Web         | `https://wise.com/send` |

Because Wise requires manual UPI ID entry, Vitta copies the UPI ID to the clipboard automatically when "Continue with Wise" is tapped and shows a "Copied" confirmation.

---

## 6. App Ordering in Bottom Sheet

The bottom sheet always shows apps in this order:

1. **Google Pay** — Recommended badge, teal arrow
2. **PhonePe** — standard row
3. *(Paytm can be added later as a third row)*

Wise is **not** in the bottom sheet. It is only reachable via "Use Wise instead" on the main screen.

> The original design doc proposed ordering by P2P/P2M. The mockup approach is simpler: GPay is always first (most widely used in India), Wise is always a separate escape hatch. No runtime ordering logic needed.

---

## 7. Visual Tokens

### Payee avatar

| UPI type | Shape         | Background                     | Color      |
|----------|---------------|--------------------------------|------------|
| P2P      | Circle (50%)  | `rgba(139,107,255,0.20)`       | `#9b7dff`  |
| P2M      | Rounded sq 11px| `rgba(255,140,80,0.18)`       | `#ff9055`  |

### Primary UPI button

```
background: #4ecf9a
border-radius: 13px
padding: 15px 16px
icon container: 36×36px, bg rgba(7,20,18,0.15), border-radius 9px
title: 14px w800 color #071412
subtitle: 11px color rgba(7,20,18,0.55)
arrow: opacity 0.6 color #071412
```

### Secondary Wise button (default)

```
background: rgba(255,255,255,0.03)
border: 1px solid rgba(255,255,255,0.08)
border-radius: 13px
padding: 12px 14px
icon: 32×32px, bg #9b7dff, w icon white w800 13px
name: 12px w700 rgba(255,255,255,0.65)
note: 10px rgba(255,255,255,0.30)
```

### Wise selected state

```
background: rgba(155,125,255,0.10)
border: 2px solid rgba(155,125,255,0.40)
icon: 36×36px #9b7dff
name: 14px w800 #fff ("Wise selected")
checkmark circle: 22px #9b7dff
```

### Amber disclaimer (Wise selected)

```
background: rgba(245,190,50,0.07)
border: 1px solid rgba(245,190,50,0.20)
border-radius: 11px
padding: 10px 13px
icon: triangle warning, color #f5be32
text: 11px rgba(255,255,255,0.50), "P2P only" strong in #f5be32
```

### Bottom sheet rows

```
Container: bg #0d1f1a, border-radius 20px 20px 0 0
Handle: 36×4px, rgba(255,255,255,0.15)
Title: 15px w800

Top row (Recommended):
  background: #0a1a17 (slightly lighter)
  icon: 34×34px, 9px radius
  name: 13px w600 #fff
  hint: 11px rgba(255,255,255,0.35)
  "Recommended" badge: bg rgba(78,207,154,0.12), color #4ecf9a, 9px w700, padding 2px 7px
  arrow: #4ecf9a

Standard row:
  background: #071412
  arrow: rgba(255,255,255,0.20)

GPay icon: white bg, Google brand colors (rendered as Google G)
PhonePe icon: #5f259f bg, white wallet icon
```

### Memory note

```
background: rgba(78,207,154,0.04)
border: 1px solid rgba(78,207,154,0.13)
border-radius: 11px
padding: 10px 13px
icon: brain, #4ecf9a, 14px
text: 11px rgba(255,255,255,0.45), strong in #4ecf9a
```

---

## 8. Database Schema

### Changes to `payment_launches`

```sql
ALTER TABLE payment_launches
  ADD COLUMN IF NOT EXISTS platform TEXT
    CHECK (platform IN ('ios', 'android', 'web')),
  ADD COLUMN IF NOT EXISTS upi_type TEXT
    CHECK (upi_type IN ('p2p', 'p2m', 'unknown'));
```

Both columns are additive and backward-compatible. Existing rows get NULL.

---

## 9. Service Layer

### New: `services/upi/upiDeepLink.js`

```
Exports:
  detectPlatform()
    → 'ios' | 'android' | 'web'  (from navigator.userAgent)

  buildUpiParams(upiId, payeeName, amountInr, note)
    → URLSearchParams string: pa=...&pn=...&am=...&cu=INR&tn=...

  launchUpiApp(appId, platform, upiId, payeeName, amountInr)
    → fires window.location.href with the correct scheme/intent URL
    → returns the URL string (for logging)

  copyToClipboard(text)
    → navigator.clipboard.writeText(text)
```

App IDs: `'gpay'`, `'phonepe'`

### Updated: `services/payments/paymentLaunchService.js`

Add `platform` and `upiType` to the `logLaunch()` row. No signature change — they come in via the `data` bag.

### Updated: `pages/api/payments/launch.js`

Destructure `platform` and `upiType` from `req.body` and pass to `svc.logLaunch()`.

---

## 10. Files Touched

| File | Type | Change |
|------|------|--------|
| `supabase/schema.sql` | Schema | Add `platform`, `upi_type` to `payment_launches` |
| `services/upi/upiDeepLink.js` | New | Deep link builder, platform detection |
| `services/payments/paymentLaunchService.js` | Update | Accept `platform`, `upiType` |
| `pages/api/payments/launch.js` | Update | Destructure + forward new fields |
| `components/travelpay/PaymentReviewScreen.js` | Redesign | New UI per mockups |

No other files change. `VittaTravelPayApp.js` already passes `parsedUPI`, `userData`, `onBack`, `onLaunched` — props are unchanged.

---

## 11. Open Questions

1. **App-not-installed on iOS**: If GPay isn't installed, Safari shows an error page. Detection approach: `setTimeout` — if the page is still active 2s after the deep link attempt, show "App not installed — try another option."

2. **Paytm as third option**: Add as a third row in the bottom sheet. Same intent URL pattern, package `net.one97.paytm`, iOS scheme `paytmmp://`.

3. **Clipboard on iOS PWA**: `navigator.clipboard.writeText()` requires HTTPS and a user gesture. The "Continue with Wise" button tap satisfies the gesture requirement. Fallback: show a copyable text field.

---

## 12. Implementation Sequence

1. `supabase/schema.sql` — add two columns (non-breaking SQL)
2. `services/upi/upiDeepLink.js` — new file, pure functions, no UI
3. `paymentLaunchService.js` + `launch.js` — minor field additions
4. `PaymentReviewScreen.js` — full redesign per mockups above
5. Manual test on real iOS + Android device (deep links cannot be verified in Chrome DevTools)
