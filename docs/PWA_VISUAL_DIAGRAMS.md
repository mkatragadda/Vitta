# PWA Architecture - Visual Diagrams & Flowcharts

## 1. PWA Request Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    User Interaction                             │
│          (Chat Message, Payment, View Card)                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
              ┌──────────────────────────┐
              │ Check Network Status     │
              │ navigator.onLine         │
              └───┬─────────────┬────────┘
                  │             │
           ONLINE │             │ OFFLINE
                  ▼             ▼
        ┌──────────────┐  ┌──────────────────────┐
        │ Send to API  │  │ Save to IndexedDB    │
        │ Immediately  │  │ Mark as "pending"    │
        └──────┬───────┘  │ Show "Sync pending"  │
               │          └──────┬───────────────┘
         ┌─────▼──────┐          │
         │ Response?  │          │
         └─────┬──────┘          │
          ┌────┴────┐            │
      200 │         │ Error      │
          ▼         ▼            │
        ✅        ❌ Retry       │
      Display     (max 3x)      │
      Response                  │
                                │
                                │ (Comes Online)
                                ▼
                    ┌─────────────────────┐
                    │ Service Worker:     │
                    │ "online" event      │
                    │ Trigger Sync        │
                    └────────┬────────────┘
                             │
              ┌──────────────▼──────────────┐
              │ Sync Manager:               │
              │ Process all pending ops     │
              │ - Chat messages             │
              │ - Payments                  │
              │ - Card operations           │
              └────────┬───────────────────┘
                       │
         ┌─────────────┼─────────────┐
         ▼             ▼             ▼
      Success      Conflict      Failed (retry)
         │             │             │
         ▼             ▼             ▼
     Update UI    Resolve         Retry with
     Mark synced  Manually        Backoff
                  (user choice)   (1s, 5s, 30s)
```

---

## 2. Service Worker Lifecycle Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                     SW Lifecycle                                 │
└──────────────────────────────────────────────────────────────────┘

1. REGISTRATION
   └─ register-sw.js loads
      └─ navigator.serviceWorker.register('/sw.js')
         └─ Browser downloads sw.js

2. INSTALLATION
   └─ SW installs
      └─ Precache critical assets (manifest, offline.html)
         ├─ Unpack Cache: vitta-v1-static
         └─ Skip waiting if immediately needed

3. ACTIVATION
   └─ Old SWs are terminated
      └─ Delete old cache versions
         ├─ Remove vitta-v0-*
         └─ Claim all clients

4. FETCH INTERCEPTION
   └─ Every request goes through SW
      ├─ Static assets (*.js, *.css)
      │  └─ Cache-First Strategy
      │     ├─ Check cache (HIT → return)
      │     └─ No cache → fetch & cache
      │
      ├─ API calls (/api/*)
      │  └─ Network-First Strategy
      │     ├─ Try fetch (online → return)
      │     └─ Offline → check cache
      │
      └─ Images (*.png, *.jpg)
         └─ Cache-First with size limits
            ├─ Cache if < 5MB
            └─ Placeholder if missing

5. UPDATES
   └─ Browser checks for new SW every 24h
      └─ New version available
         ├─ Download & install
         ├─ Clients notified
         └─ New SW activates on reload

6. UNINSTALL (optional)
   └─ Stop registering in register-sw.js
      └─ Delete cache programmatically
         └─ Fallback to normal web app
```

---

## 3. IndexedDB Schema Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│              vitta_offline Database (v1)                        │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────┐
│ pending_messages (ObjectStore)    │
├──────────────────────────────────┤
│ Key: id (string)                 │
├──────────────────────────────────┤
│ Fields:                          │
│  ├─ id: "msg_1700000000_0.12"  │
│  ├─ content: "Add $50 groceries" │
│  ├─ intent: "add_expense"        │
│  ├─ timestamp: 1700000000000     │
│  └─ synced: false                │
├──────────────────────────────────┤
│ Indexes:                         │
│  ├─ synced (false → pending)     │
│  └─ timestamp (for ordering)     │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ pending_payments (ObjectStore)    │
├──────────────────────────────────┤
│ Key: id (string)                 │
├──────────────────────────────────┤
│ Fields:                          │
│  ├─ id: "pay_1700000000_0.34"   │
│  ├─ cardId: "amex-gold"          │
│  ├─ amount: 500                  │
│  ├─ date: "2024-11-23"           │
│  ├─ timestamp: 1700000000000     │
│  └─ synced: false                │
├──────────────────────────────────┤
│ Indexes:                         │
���  ├─ synced (false → pending)     │
│  └─ cardId (group by card)       │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ chat_history (ObjectStore)       │
├──────────────────────────────────┤
│ Key: id (string)                 │
├──────────────────────────────────┤
│ Fields:                          │
│  ├─ id: "msg_1700000001_0.56"   │
│  ├─ role: "user" | "assistant"   │
│  ├─ content: "message text"      │
│  ├─ timestamp: 1700000001000     │
│  └─ synced: true/false           │
├──────────────────────────────────┤
│ Indexes:                         │
│  ├─ synced                       │
│  └─ timestamp (for display order)│
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ sync_log (ObjectStore)           │
├──────────────────────────────────┤
│ Key: id (string)                 │
├──────────────────────────────────┤
│ Fields:                          │
│  ├─ id: "sync_1700000002_0.78"  │
│  ├─ action: "sync_message"       │
│  ├─ status: "success"|"failed"   │
│  ├─ timestamp: 1700000002000     │
│  ├─ retries: 2                   │
│  └─ error: "Network timeout"     │
├──────────────────────────────────┤
│ Indexes:                         │
│  ├─ status (for querying)        │
│  └─ timestamp (for logs)         │
└──────────────────────────────────┘

Total Database Size: ~50MB max (browser limit)
```

---

## 4. Component Dependency Tree

```
┌──────────────────────────────────────────────────────────┐
│                       pages/index.js                     │
│                      (App Entry Point)                   │
└────────────────────────┬─────────────────────────────────┘
                         │
         ┌───────────────▼───────────────┐
         │    components/VittaApp.js     │
         │  (Main App Container)         │
         └───┬─────────────────────┬─────┘
             │                     │
             ▼                     ▼
    ┌──────────────────┐   ┌──────────────────┐
    │ OfflineIndicator │   │  SyncStatus      │
    │  (if offline)    │   │ (if syncing)     │
    └──────────────────┘   └──────────────────┘
             │
             ▼
    ┌──────────────────────────────────────┐
    │  Screen Routing                      │
    │  ├─ Dashboard                        │
    │  ├─ CreditCardScreen                │
    │  ├─ PaymentOptimizer                │
    │  ├─ VittaChatInterface              │
    │  └─ ...                             │
    └──────────────────────────────────────┘
             │
             ▼
    ┌──────────────────────────────────────┐
    │  Services (Imported Globally)        │
    ├──────────────────────────────────────┤
    │ • conversationEngineV2               │
    │ • cardService                        │
    │ • userService                        │
    │ • offlineDetector                    │
    │ • syncManager                        │
    │ • indexedDB                          │
    └──────────────────────────────────────┘
             │
             ▼
    ┌──────────────────────────────────────┐
    │  External APIs/Storage               │
    ├──────────────────────────────────────┤
    │ • Supabase (online only)             │
    │ • OpenAI (online only)               │
    │ • IndexedDB (offline available)      │
    │ • Cache API (SW managed)             │
    │ • localStorage (preferences)         │
    └──────────────────────────────────────┘
```

---

## 5. Caching Strategy Decision Tree

```
                    HTTP Request
                         │
                         ▼
              ┌──────────────────────┐
              │  Check URL Pattern   │
              └──┬───┬───┬───┬──────┘
                 │   │   │   │
      ┌──────────┘   │   │   └──────────┐
      │              │   │              │
      │              │   │              │
      ▼              ▼   ▼              ▼
   Static        API    HTML          Image
   (*.js,        (/api/ pages        (*.png,
    *.css)       /chat)   (*.html)     *.jpg)
      │              │       │         │
      ▼              ▼       ▼         ▼
   CACHE-       NETWORK-  NETWORK-  CACHE-
   FIRST        FIRST     FIRST     FIRST
      │              │       │         │
      ├─ Check       ├─ Try  ├─ Try  ├─ Check
      │  cache       │ net   │ net   │ cache
      │  (fast)      │ (5s   │ (5s   │ (fast)
      │              │ timeout)timeout)
      │              │       │       │
      ├─ If hit      ├─ If   ├─ If  ├─ If hit
      │  return      │ OK    │ OK   │ return
      │              │ cache │ cache│
      │              │ return│ return│
      │              │       │      │
      ├─ If miss     ├─ If   ├─ If  ├─ If miss
      │  fetch       │ timeout
      │  (slow)      │ check  │ timeout
      │              │ cache  │ check cache
      │              │ (slow) │ (slow)
      │              │        │
      └─ Cache ──────┴─ Cache ┴─ Cache
         result    (same)   (same)
         (cold)

      Result: Return whatever is fastest,
              fallback to next option
```

---

## 6. Offline Message Queue Flow

```
┌──────────────────────────────────────┐
│      User Composes Chat Message      │
│    "Add $50 Groceries from Whole Foods"
└───────��──────────┬───────────────────┘
                   │
                   ▼
          ┌─────────────────┐
          │ Check: Online?  │
          └────┬────────┬───┘
               │        │
            YES│        │NO
               │        │
               ▼        ▼
        ┌──────────┐  ┌──────────────────────────┐
        │Send Now  │  │Save to IndexedDB         │
        │To API    │  │Set synced: false         │
        └────┬─────┘  │Show "Pending" badge     │
             │        │Queue for sync           │
        ┌────▼────┐   └──────┬─────────────────┘
    200 │         │         │
        ▼         ▼         │ (Later: User comes online)
     Success   Retry       │
       OR      (max 3x)    │
     Failure              │
        │                  │
        ▼                  ▼
     Mark         ┌─────────────────────┐
     Synced       │Service Worker:      │
                  │onOnline event       │
                  │Trigger: syncManager │
                  └────────┬────────────┘
                           │
                    ┌──────▼──────┐
                    │Query DB:    │
                    │pending_msgs │
                    │synced=false │
                    └────────┬────┘
                             │
                    ┌────────▼───────┐
                    │For each msg:   │
                    │Send to API     │
                    │(batch or serial)
                    └────────┬───────┘
                             │
                 ┌───────────┼───────────┐
              200│           │          Error
                 ▼           ▼           ▼
             Success    Duplicate    Retry
               │        (conflict)    │
               ▼              │       ▼
            Update DB    Handle by   Backoff:
            synced=true  conflict    1s → 5s → 30s
            Update UI    resolver    Then fail
            Remove badge             │
                              ┌──────▼─────┐
                              │Log error   │
                              │Show toast  │
                              │Offer retry │
                              └────────────┘
```

---

## 7. Installation Flow (User Perspective)

```
ANDROID CHROME:
┌─────────────────────────────────┐
│ 1. User opens Vitta app         │
│    in Chrome browser            │
└──────────────┬──────────────────┘
               │
               ▼
        ┌─────────────────────────┐
        │ 2. Service Worker       │
        │    registers (silent)   │
        └──────────┬──────────────┘
                   │
                   ▼
        ┌─────────────────────────┐
        │ 3. "Install" button     │
        │    appears in address   │
        │    bar                  │
        └──────────┬──────────────┘
                   │
        ┌─────────┤─────────┐
        │          │         │
      CLICK      IGNORE   LATER
        │          │         │
        ▼          ▼         ▼
     Install  Continue  Icon stays
      app      using    in address
        │      web app  bar
        ▼
    ┌─────────────────────┐
    │ 4. Homescreen       │
    │    launcher shows   │
    │    install prompt   │
    └──────────┬─────────┘
               │
               ▼
        ┌──────────────────┐
        │ 5. App installs  │
        │    to home       │
        │    screen        │
        └────────┬─────────┘
                 │
                 ▼
        ┌──────────────────────────┐
        │ 6. Users taps icon       │
        │    App opens fullscreen  │
        │    (no address bar)      │
        │    Like native app       │
        └──────────────────────────┘

iOS SAFARI:
┌──────────────────────────────┐
│ 1. User opens Vitta in Safari│
└────────────┬─────────────────┘
             │
             ▼
    ┌────────────────────┐
    │ 2. SW registers    │
    │    (but limited    │
    │     features)      │
    └────────┬───────────┘
             │
    ┌────────▼──────────────┐
    │ 3. User taps Share    │
    │    button             │
    └────────┬──────────────┘
             │
    ┌────────▼──────────────────────┐
    │ 4. Select "Add to Home Screen"│
    └────────┬─────────────────────┘
             │
    ┌────────▼───────────────────┐
    │ 5. Name app (pre-filled)   │
    │    User confirms           │
    └────────┬──────────────────┘
             │
    ┌────────▼───────────────────┐
    │ 6. App installs to home    │
    │    Opens fullscreen        │
    │    (Safari UI integration)  │
    └────────────────────────────┘

DESKTOP (Windows/Mac):
┌─────────────────────────────┐
│ 1. User opens app in Chrome │
└──────────┬──────────────────┘
           │
           ▼
    ┌─────────────────────┐
    │ 2. Install button   │
    │    appears in       │
    │    address bar or   │
    │    menu             │
    └────────┬────────────┘
             │
    ┌────────┤─────────┐
    │         │         │
  CLICK     IGNORE   LATER
    │         │         │
    ▼         ▼         ▼
  Click   Continue  Icon in
  install  using    menu
    │     web app    stays
    ▼
 ┌──────────────────┐
 │ Install dialog   │
 │ "Install Vitta?" │
 │ [Install] [X]    │
 └────────┬─────────┘
          │
          ▼
 ┌──────────────────────┐
 │ App installs to:     │
 │ - Start menu         │
 │ - Desktop (optional) │
 │ - Opens as window    │
 │   (no Chrome UI)     │
 └──────────────────────┘
```

---

## 8. Sync Conflict Resolution Flow

```
                 Sync Conflict Detected
                      │
                      ▼
         ┌────────────────────────┐
         │ What type of data?     │
         └─┬───┬─────┬──────┬────┘
           │   │     │      │
         CHAT │ CARD PAYMENT PREF
           │  │     │      │
           ▼  ▼     ▼      ▼
          │  │     │      │
  User has   Client  Client  Local
  newer    added new  tried to  prefs
  messages card     pay the    changed
          already   same      while
          exists   payment    offline
          on     twice
          server

           │      │      │       │
           ▼      ▼      ▼       ▼
         APPEND  SKIP  DEDUPE  MERGE
         ONLY    DUP   USING   CLIENT
                     SERVER   WINS
                     ID
           │      │      │       │
           └──────┼──────┼───────┘
                  │      │
                  ▼      ▼
            Server is source    User sees
            of truth, but       warning:
            client persists     "Settings
            update              changed"
                                 │
                                 ▼
                            ┌──────────────┐
                            │ Show toast   │
                            │ Offer undo   │
                            └──────────────┘
```

---

## 9. Retry Logic Exponential Backoff

```
        Sync Attempt (Message, Payment, etc)
                    │
                    ▼
            ┌─────────────────┐
            │ Try Send API    │
            └────┬────────┬───┘
                 │        │
              SUCCESS    FAIL
                 │        │
                 ▼        ▼
            Mark      Retry Logic
            Synced    Starts Here
            Done          │
                          ▼
                    ┌──────────────┐
                    │ Wait 1000ms  │
                    │ (1 second)   │
                    └────────┬─────┘
                             │
                             ▼
                    ┌──────────────┐
        Attempt 1 →│ Retry Send   │
                    │ Attempt #1   │
                    └────┬─────┬───┘
                         │     │
                      OK  │     │ FAIL
                         ▼     ▼
                        Done   │
                               │
                        ┌──────▼───────┐
                        │ Wait 5000ms  │
                        │ (5 seconds)  │
                        └────────┬─────┘
                                 │
                                 ▼
                        ┌──────────────┐
                        │ Retry Send   │
            Attempt 2 →│ Attempt #2   │
                        └────┬─────┬───┘
                             │     │
                          OK  │     │ FAIL
                             ▼     ▼
                            Done   │
                                   │
                           ┌───────▼────────┐
                           │ Wait 30000ms   │
                           │ (30 seconds)   │
                           └────────┬───────┘
                                    │
                                    ▼
                           ┌──────────────┐
                           │ Retry Send   │
                Attempt 3 →│ Attempt #3   │
                           └────┬─────┬───┘
                                │     │
                             OK  │     │ FAIL
                                ▼     ▼
                               Done   │
                                      │
                              ┌───────▼────────┐
                              │ GIVE UP        │
                              │ Log error      │
                              │ Show to user   │
                              │ Offer manual   │
                              │ retry option   │
                              └────────────────┘

Timeline:
0ms    → Attempt 1
1000ms → Attempt 2
6000ms → Attempt 3
36000ms → Give up (10 seconds total)
```

---

## 10. Bundle Size Impact Diagram

```
Current Bundle (Vitta):
┌────────────────────────────────────┐
│ JS: ~250 KB (gzipped)               │
│ CSS: ~50 KB (gzipped)               │
│ Libs: React, Next, Tailwind, etc    │
│ Total: ~300 KB                      │
└────────────────────────────────────┘

After PWA Conversion:
┌────────────────────────────────────┐
│ Previous: 300 KB                    │
│ + register-sw.js: 2 KB              │
│ + sw.js: 5 KB (not in main bundle)  │
│ + offline services: 10 KB           │
│ + sync manager: 5 KB                │
│ + components: 5 KB                  │
│ ────────────────────────────────    │
│ Total NEW code: 27 KB               │
│ ────────────────────────────────    │
│ New Total: 327 KB (~9% increase)    │
│                                     │
│ BUT: Code splitting reduces this    │
│ - sw.js loaded separately           │
│ - sync services lazy loaded         │
│ - Main bundle: 305 KB (only 5% ↑)   │
└────────────────────────────────────┘

Mitigation:
✓ Service Worker not in main bundle
✓ Lazy load offline services
✓ Minify & compress all code
✓ Tree-shake unused dependencies
```

---

## 11. Performance Timeline Comparison

```
BEFORE PWA (Online Connection):
┌─────────────────────────────────────────┐
│ 0ms    : Click app link                 │
│ 100ms  : Browser requests HTML          │
│ 200ms  : HTML downloaded                │
│ 300ms  : CSS/JS start downloading       │
│ 500ms  : CSS downloaded                 │
│ 800ms  : JS downloaded & parsing        │
│ 900ms  : React initialization           │
│ 1200ms : First Paint (blank page)       │
│ 1500ms : Chat messages load             │
│ 1800ms : Fully Interactive (LCP)        │
└─────────────────────────────────────────┘

AFTER PWA (Online - First Visit):
┌─────────────────────────────────────────┐
│ 0ms    : Click app link / icon          │
│ 50ms   : App shell loads from cache     │
│ 150ms  : JS loads from cache            │
│ 300ms  : React initialization           │
│ 500ms  : Service Worker activates       │
│ 600ms  : IndexedDB opens                │
│ 800ms  : First Paint (UI visible)       │
│ 1000ms : Load last chat history         │
│ 1200ms : Fully Interactive (LCP)        │
└─────────────────────────────────────────┘
        IMPROVEMENT: ~33% faster!

AFTER PWA (Online - Return Visit):
┌─────────────────────────────────────────┐
│ 0ms    : Tap icon (instant)             │
│ 20ms   : App shell cached               │
│ 50ms   : All assets from cache          │
│ 100ms  : React initializes              │
│ 200ms  : IndexedDB opens                │
│ 300ms  : First Paint (instant feel)     │
│ 400ms  : Load cached chat history       │
│ 500ms  : Fully Interactive              │
└─────────────────────────────────────────┘
        IMPROVEMENT: ~72% faster!

OFFLINE (After Any Visit):
┌─────────────────────────────────────────┐
│ 0ms    : Tap icon (instant)             │
│ 20ms   : App shell cached               │
│ 50ms   : All assets from cache          │
│ 100ms  : React initializes              │
│ 150ms  : IndexedDB opens                │
│ 200ms  : First Paint (instant)          │
│ 300ms  : Load cached chat history       │
│ 400ms  : Fully Interactive              │
│         NO NETWORK REQUIRED!            │
└─────────────────────────────────────────┘
        Works 100% offline!
```

---

## 12. Sync Status States

```
                    Idle
                    (nothing queued)
                      │
                      ▼
         ┌──────────────────────┐
         │ User takes action    │
         │ while offline        │
         └──────────┬───────────┘
                    │
                    ▼
            ┌────────────────┐
            │ Queued/Pending │─────┐
            │ (Show badge)   │     │
            └────────────────┘     │
                    │              │
                    │ User comes   │
                    │ online       │
                    ▼              │
           ┌──────────────────┐   │
           │ Syncing/In Flight│   │
           │ (Show spinner)   │   │
           └────┬──────────┬──┘   │
                │          │      │
            SUCCESS      FAILED   │
                │          │      │
                ▼          ▼      │
           ┌────────┐  ┌────────┐ │
           │ Synced │  │ Error  │─┤
           │ (Idle) │  │(Queued)│ │
           └────────┘  └────────┘ │
                          │       │
                          │ User │
                          │ retry│
                          └──────┘
```

---

## 13. File Upload Priority

```
┌────────────────────────────────────────────┐
│        Documentation Files Priority         │
└────────────────────────────────────────────┘

CRITICAL (Blocks implementation):
  1. PWA_ARCHITECTURE.md (complete design)
  2. PWA_IMPLEMENTATION_SPECS.md (code details)
  3. PWA_FILES_SUMMARY.md (inventory)

IMPORTANT (Guides development):
  4. PWA_EXECUTIVE_SUMMARY.md (overview)
  5. PWA_VISUAL_DIAGRAMS.md (this file)

SUPPORTING (After implementation):
  6. PWA_DEPLOYMENT.md (production guide)
  7. PWA_TROUBLESHOOTING.md (common issues)

RECOMMENDED (Best practices):
  8. PWA_OFFLINE_FLOW.md (detailed flow)
  9. PWA_TESTING_GUIDE.md (QA guide)
```

---

This visual guide complements the technical documentation with diagrams and flowcharts for easier understanding of PWA architecture and flows.
