# Vitta Redesign — Implementation TODO

Reference design: `docs/Designs/vitta_all_screens.html`

## Narrative shift
From "travel wallet" → **"India payment brain for NRIs"**
Vitta scans any UPI QR, shows the amount in USD, classifies it as P2P (person) or P2M (merchant),
routes to the right payment app, and remembers everyone you pay.
Money still moves through Wise / GPay / PhonePe — Vitta is the intelligence layer.

## Design tokens (apply everywhere)
- Background: `#071412` solid (replace gradient backgrounds)
- Accent green: `#4ecf9a`
- Card surface: `rgba(255,255,255,0.04)` with `rgba(255,255,255,0.07)` border
- P2P color: `#9b7dff` (purple)
- P2M color: `#ff9055` (orange)
- Text primary: `#fff`
- Text secondary: `rgba(255,255,255,0.32)`

---

## Screens & tasks

### Screen 1 — Landing Page  ✅ DONE
**File:** `components/travelpay/LandingScreen.js` (full rewrite)

- [x] Nav bar: "Vitta" logo + links (How it works / P2P / Merchant) + "Sign in" pill button
- [x] Hero section
  - Pill badge: "Smart India payments for NRIs & travelers"
  - H1: "Every India payment. Finally in USD."
  - Subtitle + secondary note
  - Google Sign-In button (white Google icon + dark teal bg)
  - 3 trust lines (✓ money stays in your accounts, ✓ works with Wise/Remitly/GPay, ✓ any UPI QR)
- [x] Intelligence card (P2P vs P2M side-by-side)
  - Left: P2P — "rahul@upi, ₹5,000 → $59.82 USD, Best remittance route"
  - Center: Vitta "V" orb with "ROUTES" label
  - Right: P2M — "Chai Point, ₹850 → $10.16 USD, Launch UPI app"
- [x] How it works — 3-step strip
  - 01 Scan any UPI QR
  - 02 See who you're paying and what it costs (VPA memory callout)
  - 03 Pay with confidence (P2P / Merchant / Repeat pills)
- [x] Footer CTA: repeat headline + Google Sign-In button

---

### Screen 2 — App Shell + Bottom Nav  ✅ DONE
**File:** `VittaTravelPayApp.js` + `HomeScreen.js`

- [x] Add bottom nav to `VittaTravelPayApp.js`
  - 4 tabs: Home · Pay · Activity · You
  - Active tab: `#4ecf9a` icon + label, inactive: `rgba(255,255,255,0.22)`
  - "Pay" tab opens scanner directly
- [x] Change background from `from-slate-950 via-teal-950 to-slate-950` gradient → flat `#071412`
- [x] Remove hamburger slide-out menu from `HomeScreen.js` (replaced by "You" tab)
- [x] Remove floating info banner from `VittaTravelPayApp.js`
- [x] Bottom nav hidden during scanner / payment-review / add-funds overlays
- [x] `YouScreen.js` placeholder created (sign out + profile info)

---

### Screen 3 — Home Screen  ✅ DONE
**File:** `HomeScreen.js`

- [x] Top bar: "Vitta" logo left + profile avatar right (initial circle)
- [x] Sub-header: "Pay in India" title + "Scan a QR or pay someone again" subtitle
- [x] Live rate pill: `● Live rate · ₹XX.XX / USD` (inline-flex pill, not full width)
- [x] Scan & Pay card (solid green orb icon)
- [x] "Recent payees" section header + conditional "View all →" (only 3+ payees)
- [x] 3 states based on payee count:
  - 0 payees: dashed border empty state, Users icon, "No recent payees yet"
  - 1-2 payees: payee list + teal dashed nudge card "Scan to pay someone new"
  - 3+ payees: payee list + "View all →" link in header
- [x] Recent payee rows from `GET /api/beneficiaries/recent`
  - Avatar: P2P = circle (purple), P2M = rounded-square (orange)
  - Name, date last paid, INR + USD amounts, P2P/P2M badge
- [x] `pages/api/beneficiaries/recent.js` — returns last 5 distinct payees from `payment_launches`

---

### Screen 4 — After Scan: P2P Classification  (not done)
**File:** `PaymentReviewScreen.js`

- [ ] Back link: "← Scan again"
- [ ] Entity card
  - Circle avatar with initials for people
  - Name + UPI ID
  - P2P badge (purple): "Person-to-person"
- [ ] Amount card (teal border): INR large, USD equiv, rate line
- [ ] "Send via" label
- [ ] Options list
  - Recommended (Wise): highlighted with teal border, "Best rate · ~2 min", teal arrow
  - Alternative (Remitly): muted, "Alternative option"
- [ ] Memory note: "Known contact: You sent ₹X to [name] on [date] via Wise"
  - Pulled from `payment_launches` for this UPI ID

---

### Screen 4b — After Scan: P2M Classification  (not done)
**File:** `PaymentReviewScreen.js` (same file, different branch)

- [ ] Rounded-square avatar for merchants
- [ ] P2M badge (orange): "Merchant payment"
- [ ] "Pay with" label
- [ ] Options list
  - Recommended: GPay (if installed), "Installed · tap to launch", teal arrow
  - Alternative: PhonePe
- [ ] Memory note: "Last visit: You paid ₹X here on [date] via Google Pay"

---

### Screen 5 — Activity Screen  (not done)
**File:** `TransactionsScreen.js` → rename to `ActivityScreen.js` + update imports

- [ ] Top bar: "Activity" title + Filter button (adjustments icon)
- [ ] Filter pills: All / P2P / P2M / Wise / GPay (horizontal scroll)
- [ ] Summary strip: "This month $XX · N payments" + "Avg per pay $XX"
- [ ] Transactions grouped by date (Today · Jun 19, Yesterday · Jun 18, Jun 15…)
- [ ] Transaction row
  - Avatar (circle P2P / square P2M)
  - Name + time + P2P/P2M badge + app used (GPay/Wise/PhonePe)
  - INR + USD right-aligned
- [ ] Tap row → navigate to Transaction Detail screen

---

### Screen 6 — Transaction Detail  (not done)
**File:** new `components/travelpay/TransactionDetailScreen.js`

- [ ] Back link: "← Activity"
- [ ] Entity card (same as scan screen)
- [ ] Amount card: "You paid ₹X · $X USD · at rate · date + time"
- [ ] Details table rows
  - Payment type (P2M / P2P)
  - Paid via (Google Pay / Wise / …)
  - UPI ref (from `payment_launches.reference_id` or generated)
  - Status (Completed)
  - Times paid here (count from `payment_launches` for this UPI ID)
- [ ] "Pay [Name] again" green CTA button → triggers scan flow with pre-filled data

---

### Screen 7 — You / Profile  (not done)
**File:** new `components/travelpay/YouScreen.js`

- [ ] User hero card: avatar (initials), name, email, edit pencil icon
- [ ] Stats row: Total payments · Saved payees · This year (USD)
  - Data from `/api/payments/stats` (monthly) + `beneficiaries` count
- [ ] Payments section
  - Saved payees → list view of `beneficiaries`
  - Default payment apps → future (static for now)
  - FX rate alerts → future (static badge "₹95+")
- [ ] Account section
  - Google account → "Connected" badge
  - Notifications → future
  - Privacy & security → future
- [ ] Support section
  - Help & feedback → mailto or static
  - Sign out → calls `onLogout`
- [ ] Version label: "Vitta · v1.0.0"

---

## New APIs needed

| API | Purpose | Status |
|-----|---------|--------|
| `GET /api/beneficiaries/recent` | Last 5 payees with last payment amount/date | ✅ Built |
| `payment_launches.rail` column | Track which app was used (wise/gpay/phonpe) | Check schema |

## Where we left off (2026-06-19)
- Transactions screen was just wired to real `payment_launches` data (Screen 5 above)
- Home screen shows recent 5 transactions inline (step towards Screen 3 above)
- `fetchRecentTransactions()` + `txScreenKey` added to `VittaTravelPayApp.js`
- Next step: **Start Screen 1 — Landing Page rewrite**
