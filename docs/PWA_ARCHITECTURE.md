# Vitta Progressive Web App (PWA) Architecture Design

## Executive Summary

This document outlines the complete architectural design for converting Vitta into a fully-featured Progressive Web App (PWA). The design enables offline-first functionality, installability, push notifications, and enhanced performance while maintaining the existing SPA architecture.

**Key Goals:**
- ✅ Offline-first capability with progressive sync
- ✅ Native app-like installation on mobile/desktop
- ✅ Fast loading with intelligent caching strategies
- ✅ Zero data loss with queued offline transactions
- ✅ Seamless online/offline transition
- ✅ Background sync for critical operations

---

## 1. PWA Core Architecture Overview

### 1.1 Technology Stack Additions

```
Current Stack:
├── Next.js 14 (Pages Router)
├── React 18
├── Tailwind CSS
├── Supabase (PostgreSQL + pgvector)
└── OpenAI API

PWA Additions:
├── Service Workers (Native API)
├── IndexedDB (Offline data storage)
├── Web App Manifest
├── Workbox (Service Worker tools)
├── next-pwa (Next.js PWA plugin) [OPTIONAL but recommended]
└── Background Sync API
```

### 1.2 Architecture Layers

```
┌─────────────────────────────────────────────┐
│         User Interface (React)              │
│  (VittaApp, Components, Services)           │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│    Service Worker Layer                     │
│  ├─ Request Interception                    │
│  ├─ Cache Management                        │
│  ├─ Offline Fallback                        │
│  └─ Background Sync Triggers                │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│    Offline Storage Layer                    │
│  ├─ IndexedDB (Structured data)            │
│  ├─ localStorage (Session/preferences)     │
│  └─ Cache API (HTTP responses)             │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│    Network/Sync Layer                       │
│  ├─ Online Detection                       │
│  ├─ Request Queuing                        │
│  └─ Background Sync API                    │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│    Backend Services                         │
│  ├─ Supabase API                           │
│  ├─ OpenAI API                             │
│  └─ API Routes (/pages/api/*)              │
└─────────────────────────────────────────────┘
```

---

## 2. Service Worker Strategy

### 2.1 Service Worker Architecture

**File Structure:**
```
public/
├── sw.js                    # Main Service Worker
└── sw-handlers/
    ├── cache-strategy.js    # Caching logic
    ├── offline-fallback.js  # Offline responses
    └── sync-handler.js      # Background sync
```

### 2.2 Caching Strategy (Cache-First with Network Fallback)

**Strategy Selection by Route:**

```javascript
ROUTES:
├── API Routes (/api/*)
│   └── Strategy: Network-First (5s timeout)
│       │ Purpose: Fresh data when online
│       └── Fallback: Cached response or offline queue
│
├── Static Assets (*.js, *.css, *.jpg, *.png, *.svg)
│   └── Strategy: Cache-First + Network Update
│       │ Purpose: Fast initial load, update in background
│       └── Cache Duration: 30 days
│
├── HTML Pages (*.html)
│   └── Strategy: Network-First with Cache Fallback
│       │ Purpose: Fresh content when online
│       └── Cache Duration: 7 days
│
├── OpenAI API (/api/chat/*)
│   └── Strategy: Network-Only
│       │ Purpose: Must have fresh AI responses
│       └── Cache: Not applicable
│
└── Chat History & User Data
    └── Strategy: Custom (IndexedDB + Sync)
        │ Purpose: Complete offline support
        └── Sync: Background sync when online
```

### 2.3 IndexedDB Schema for Offline Storage

```javascript
DATABASES:
├── vitta_offline
│   ├── Stores:
│   │   ├── pending_messages
│   │   │   ├── Key: timestamp
│   │   │   ├── Fields: {id, message, intent, timestamp, synced}
│   │   │   └── Indexes: [synced, timestamp]
│   │   │
│   │   ├── pending_payments
│   │   │   ├── Key: transactionId
│   │   │   ├── Fields: {id, cardId, amount, date, timestamp, synced}
│   │   │   └── Indexes: [synced, cardId]
│   │   │
│   │   ├── pending_cards
│   │   │   ├── Key: tempCardId
│   │   │   ├── Fields: {tempId, cardData, timestamp, synced}
│   │   │   └── Indexes: [synced]
│   │   │
│   │   ├── chat_history
│   │   │   ├── Key: messageId
│   │   │   ├── Fields: {id, role, content, timestamp, synced}
│   │   │   └── Indexes: [synced, timestamp]
│   │   │
│   │   ├── user_preferences
│   │   │   ├── Key: 'current'
│   │   │   ├── Fields: {theme, notifications, language, syncInterval}
│   │   │   └── Single record
│   │   │
│   │   └── sync_log
│   │       ├── Key: syncId
│   │       ├── Fields: {id, action, status, timestamp, retries, error}
│   │       └── Indexes: [status, timestamp]
│   │
│   ├── Version: 1 (with migration strategy for future versions)
│   └── Quota: Up to 50MB per origin (browser dependent)
│
└── vitta_cache (Optional, for prefetch data)
    ├── card_database (Pre-cached card info)
    ├── intent_embeddings (Pre-cached embeddings)
    └── user_cards_snapshot (Last known user cards)
```

---

## 3. Web App Manifest & Metadata

### 3.1 Web App Manifest Structure

**File:** `public/manifest.json`

```json
{
  "name": "Vitta - Smart Credit Card Assistant",
  "short_name": "Vitta",
  "description": "Your intelligent credit card platform. AI-powered insights for card optimization and payment strategy.",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "background_color": "#ffffff",
  "theme_color": "#6366f1",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/maskable-icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/icons/maskable-icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "categories": ["finance", "productivity"],
  "screenshots": [
    {
      "src": "/screenshots/screenshot-540x720.png",
      "sizes": "540x720",
      "type": "image/png",
      "form_factor": "narrow"
    },
    {
      "src": "/screenshots/screenshot-1280x720.png",
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide"
    }
  ],
  "shortcuts": [
    {
      "name": "Chat with Vitta",
      "short_name": "Chat",
      "description": "Start a new chat conversation",
      "url": "/?screen=chat",
      "icons": [
        {
          "src": "/icons/chat-192x192.png",
          "sizes": "192x192"
        }
      ]
    },
    {
      "name": "Payment Strategy",
      "short_name": "Payments",
      "description": "View payment recommendations",
      "url": "/?screen=optimizer",
      "icons": [
        {
          "src": "/icons/payments-192x192.png",
          "sizes": "192x192"
        }
      ]
    }
  ],
  "share_target": {
    "action": "/share",
    "method": "POST",
    "enctype": "multipart/form-data",
    "params": {
      "title": "title",
      "text": "text",
      "url": "url"
    }
  }
}
```

### 3.2 HTML Meta Tags & Head Configuration

**File:** `pages/_document.js` (Updated)

```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" />
<meta name="description" content="AI-powered credit card optimization and payment strategy assistant" />
<meta name="theme-color" content="#6366f1" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="Vitta" />

<!-- PWA Manifest -->
<link rel="manifest" href="/manifest.json" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="icon" type="image/png" href="/favicon-32x32.png" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />

<!-- Service Worker Registration Script -->
<script async src="/register-sw.js"></script>
```

---

## 4. Offline-First Data Synchronization

### 4.1 Sync Architecture

```
┌─────────────────────────────────────────┐
│         User Action (Chat, Payment)     │
└────────────────┬────────────────────────┘
                 │
         ┌───────▼────────┐
         │ Online Check   │
         └───────┬────────┘
                 │
      ┌──────────┴──────────┐
      │                     │
   ONLINE              OFFLINE
      │                     │
      ▼                     ▼
  Send to      Save to IndexedDB +
  Backend      Queue for Sync
      │                     │
      └──────────┬──────────┘
                 │
         ┌───────▼────────────┐
         │ Sync in Progress?  │
         └───────┬────────────┘
                 │
      ┌──────────┴──────────┐
      │                     │
     YES                   NO
      │                     │
      ▼                     ▼
  Update UI         Retry w/ Backoff
  Show Success      Max Retries: 3
                    Timeout: 30s
```

### 4.2 Sync Handler Functions

**Key Operations to Queue:**

```javascript
OPERATIONS:
├── Chat Messages
│   ├── Trigger: User sends message while offline
│   ├── Queue: pending_messages store
│   ├── Retry: Exponential backoff (1s, 5s, 30s)
│   └── Confirm: Mark synced when server ACK received
│
├── Payment Transactions
│   ├── Trigger: User submits payment while offline
│   ├── Queue: pending_payments store
│   ├── Retry: Same as messages
│   └── Confirm: Update transaction ID from server
│
├── Card Additions
│   ├── Trigger: User adds new card while offline
│   ├── Queue: pending_cards store
│   ├── Retry: Same as above
│   └── Confirm: Sync permanent card ID
│
└── User Preferences
    ├── Trigger: User changes settings while offline
    ├── Storage: localStorage + IndexedDB
    ├── Merge: Client-server sync on reconnect
    └── Conflict: Client-wins strategy for UX
```

---

## 5. Installation & App Shell

### 5.1 Installation Flow

```
├── Desktop (Chrome, Edge, Firefox)
│   ├── Trigger: Install button in address bar
│   ├── Behavior: Opens as standalone window
│   ├── Shortcuts: App menu with quick actions
│   └── Update: Background update check
│
├── iOS Safari
│   ├── Trigger: Share > Add to Home Screen
│   ├── Behavior: Full screen, status bar integrated
│   ├── Shortcuts: None (iOS limitation)
│   └── Update: Manual reinstall required
│
└── Android (Chrome, Firefox)
    ├── Trigger: Install prompt or menu
    ├── Behavior: Like native app in app drawer
    ├── Shortcuts: App menu with quick actions
    └── Update: Automatic (Play Store mechanism)
```

### 5.2 App Shell Strategy

**Minimal App Shell:** Load critical UI immediately

```javascript
SHELL COMPONENTS:
├── HTML Structure
│   ├── Header/Navigation
│   ├── Main Content Container
│   └── Footer/Controls
│
├── Critical CSS (Inline)
│   ├── Layout structure
│   ├── Basic colors/fonts
│   └── Buttons/interactive states
│
├── Critical JS (Async)
│   ├── Service Worker registration
│   ├── Online/offline detection
│   └── Initial app state loading
│
└── Deferred Resources
    ├── Font files (preload, not critical)
    ├── Chat history (load in background)
    └── Card images (progressive loading)
```

---

## 6. Performance Optimization Strategy

### 6.1 Lighthouse PWA Score Targets

```
Target Scores:
├── Performance: ≥ 90
├── Accessibility: ≥ 90
├── Best Practices: ≥ 90
├── SEO: ≥ 90
└── PWA: ≥ 90 (all checklist items)
```

### 6.2 Performance Metrics

```
CORE WEB VITALS:
├── Largest Contentful Paint (LCP): < 2.5s
├── First Input Delay (FID): < 100ms
├── Cumulative Layout Shift (CLS): < 0.1
├── First Contentful Paint (FCP): < 1.8s
└── Time to Interactive (TTI): < 3.8s
```

### 6.3 Caching & Bundle Optimization

```
STRATEGIES:
├── Code Splitting
│   ├── Route-based splitting
│   ├── Component lazy loading
│   └── Conditional imports (chat, PDF parsing)
│
├── Image Optimization
│   ├── WebP format with PNG fallback
│   ├── Responsive images (srcset)
│   ├── Lazy loading (native loading="lazy")
│   └── Compress: 80-85% quality
│
├── Font Loading
│   ├── System fonts priority
│   ├── Self-hosted subset fonts
│   ├── Font display: swap (text visible immediately)
│   └── Preload critical fonts only
│
└── API Response Caching
    ├── Card data: 7 days (rarely changes)
    ├── User data: 1 hour (frequently changes)
    ├── Embeddings: 30 days (static reference)
    └── Chat responses: Never (ephemeral)
```

---

## 7. Security & Data Privacy

### 7.1 Security Considerations

```
HTTPS REQUIREMENT:
├── Mandatory for Service Worker registration
├── Self-signed certificates for local dev
└── Production: Standard HTTPS certificate

STORAGE SECURITY:
├── IndexedDB
│   ├── Stored locally on device only
│   ├── No encryption (browser default)
│   ├── Same-origin policy enforced
│   └── Risk: Physical device compromise
│
├── localStorage
│   ├── User preferences only
│   ├── No sensitive data (no tokens)
│   └── Cleared on logout
│
└── Cache API
    ├── HTTP responses cached
    ├── Headers respected (no cache if private)
    └── Cleared on service worker uninstall
```

### 7.2 Data Privacy Approach

```
OFFLINE DATA STORAGE:
├── Chat History
│   ├── Stored: Local IndexedDB only
│   ├── Synced: User-initiated sync only
│   ├── Retention: Until user clears
│   └── Privacy: Not transmitted until user acts
│
├── Pending Transactions
│   ├── Stored: IndexedDB + encrypted metadata
│   ├── Synced: Automatic when online
│   ├── Retention: Deleted after successful sync
│   └── Fallback: User can clear if sync fails
│
└── User Preferences
    ├── Stored: localStorage only
    ├── Synced: Only theme, language preferences
    ├── Sensitive: Password/tokens never offline
    └── Cleared: On app logout
```

### 7.3 Authentication & Session Management

```
AUTHENTICATION FLOW:
├── Initial Login
│   ├── Google OAuth (online only)
│   ├── Session token stored in memory
│   └── User data cached to IndexedDB
│
├── Offline Operation
│   ├── Token not refreshed (offline)
│   ├── All operations use cached data
│   ├── Sync queue ready for when online
│   └── If token expires: Prompt login when online
│
└── Re-authentication
    ├── Trigger: Token expired on sync attempt
    ├── Flow: Show login prompt over UI
    ├── After: Resume pending sync
    └── Storage: Clear if logout triggered
```

---

## 8. Implementation Roadmap

### 8.1 Phase 1: Foundation (Week 1-2)

**Goals:** Core PWA infrastructure

| Task | File Changes | Priority |
|------|-------------|----------|
| Update manifest.json | `public/manifest.json` | P0 |
| Update _document.js with meta tags | `pages/_document.js` | P0 |
| Create register-sw.js | `public/register-sw.js` | P0 |
| Create Service Worker template | `public/sw.js` | P0 |
| Create IndexedDB utilities | `services/storage/indexedDB.js` | P0 |
| Add offline detection service | `services/offline/offlineDetector.js` | P0 |

### 8.2 Phase 2: Service Worker (Week 2-3)

**Goals:** Request interception, caching strategies

| Task | File Changes | Priority |
|------|-------------|----------|
| Implement cache strategies | `public/sw.js` | P0 |
| Create cache manager utility | `services/cache/cacheManager.js` | P0 |
| Implement offline fallback page | `pages/offline.js` | P1 |
| Add stale-while-revalidate logic | `public/sw.js` | P1 |

### 8.3 Phase 3: Data Sync (Week 3-4)

**Goals:** Offline queue, background sync

| Task | File Changes | Priority |
|------|-------------|----------|
| Create sync manager service | `services/sync/syncManager.js` | P0 |
| Create sync queue handler | `services/sync/syncQueue.js` | P0 |
| Implement Background Sync API integration | `services/sync/backgroundSync.js` | P1 |
| Add retry logic with exponential backoff | `services/sync/retryHandler.js` | P0 |
| Update conversationEngineV2.js for offline | `services/chat/conversationEngineV2.js` | P0 |

### 8.4 Phase 4: UI Integration (Week 4-5)

**Goals:** Online/offline indicators, UX enhancements

| Task | File Changes | Priority |
|------|-------------|----------|
| Create offline indicator component | `components/OfflineIndicator.js` | P0 |
| Create sync status component | `components/SyncStatus.js` | P0 |
| Update VittaApp.js for sync state | `components/VittaApp.js` | P0 |
| Add sync UI feedback (toasts) | `components/SyncFeedback.js` | P1 |
| Create offline notification handler | `services/notifications/offlineNotifier.js` | P1 |

### 8.5 Phase 5: Optimization (Week 5-6)

**Goals:** Performance tuning, Lighthouse scores

| Task | File Changes | Priority |
|------|-------------|----------|
| Implement route-based code splitting | `pages/_app.js` | P1 |
| Optimize bundle size | `next.config.js` | P1 |
| Create image optimization utility | `services/images/imageOptimizer.js` | P1 |
| Add performance monitoring | `services/monitoring/performanceMonitor.js` | P2 |
| Update sitemap.xml for SEO | `public/sitemap.xml` | P2 |

### 8.6 Phase 6: Testing & Deployment (Week 6-7)

**Goals:** QA, production readiness

| Task | File Changes | Priority |
|------|-------------|----------|
| Unit tests for offline services | `__tests__/unit/offline/*` | P1 |
| Integration tests for sync | `__tests__/integration/sync/*` | P1 |
| E2E tests for offline flow | `__tests__/e2e/offline/*` | P1 |
| Update deployment config | `.vercel/config.json` (if using Vercel) | P0 |
| Create PWA deployment checklist | `docs/PWA_DEPLOYMENT.md` | P0 |

---

## 9. File Structure Overview

### 9.1 New Files to Create

```
public/
├── manifest.json                    ← Web app manifest
├── register-sw.js                   ← Service Worker registration
├── sw.js                            ← Main Service Worker
├── offline.html                     ← Offline fallback page
├── robots.txt                       ← SEO robots rules
├── sitemap.xml                      ← SEO sitemap
├── icons/
│   ├── icon-192x192.png
│   ├── icon-512x512.png
│   ├── maskable-icon-192x192.png
│   ├── maskable-icon-512x512.png
│   └── ...
└── screenshots/
    ├── screenshot-540x720.png
    └── screenshot-1280x720.png

services/
├── storage/
│   ├── indexedDB.js                 ← IndexedDB CRUD operations
│   ├── storageManager.js            ← Unified storage interface
│   └── migrations.js                ← DB version migrations
├── offline/
│   ├── offlineDetector.js           ← Online/offline detection
│   ├── offlineStateManager.js       ← Offline state tracking
│   └── offlineQueue.js              ← Queued operations storage
├── sync/
│   ├── syncManager.js               ← Main sync orchestrator
│   ├── syncQueue.js                 ← Queue operations
│   ├── backgroundSync.js            ← Background Sync API
│   ├── retryHandler.js              ← Retry logic
│   └── conflictResolver.js          ← Sync conflict handling
├── cache/
│   ├── cacheManager.js              ← Cache API utilities
│   └── cacheStrategies.js           ← Different caching patterns
├── notifications/
│   └── offlineNotifier.js           ← Offline notifications
└── monitoring/
    └── performanceMonitor.js        ← Performance metrics

components/
├── OfflineIndicator.js              ← Offline UI indicator
├── SyncStatus.js                    ← Sync progress indicator
├── SyncFeedback.js                  ← Toast notifications
└── OfflineModeBanner.js             ← Offline mode banner

pages/
├── offline.js                       ← Offline fallback page
└── _document.js                     �� Updated meta tags

docs/
├── PWA_ARCHITECTURE.md              ← This document
├── PWA_DEPLOYMENT.md                ← Deployment guide
├── PWA_OFFLINE_FLOW.md              ← Offline flow documentation
└── PWA_TROUBLESHOOTING.md           ← Common issues & solutions

__tests__/
├── unit/
│   ├── offline/
│   │   ├── offlineDetector.test.js
│   │   └── syncManager.test.js
│   └── storage/
│       └── indexedDB.test.js
├── integration/
│   ├── sync/
│   │   └── endToEndSync.test.js
│   └── offline/
│       └── offlineOperation.test.js
└── e2e/
    ├── offline-chat.test.js
    └── offline-payment.test.js
```

### 9.2 Files to Modify

```
next.config.js
  ├── Add PWA plugin configuration
  ├── Optimize images
  └── Configure build settings

pages/_document.js
  ├── Add manifest link
  ├── Add theme color meta tags
  ├── Add viewport configuration
  └── Register Service Worker

pages/_app.js
  ├── Add offline state management
  ├── Add sync state tracking
  └── Initialize storage/cache services

components/VittaApp.js
  ├── Add offline state hooks
  ├── Add sync status display
  ├── Handle offline navigation
  └── Display sync indicators

services/chat/conversationEngineV2.js
  ├── Add offline message queuing
  ├── Check network before API calls
  └── Handle offline fallback responses

package.json
  ├── Add workbox-* dependencies
  ├── Add pwa-asset-generator (dev only)
  └── Add service worker build scripts

tailwind.config.js
  ├── Add offline indicator styles
  └── Add sync animation styles
```

---

## 10. Implementation Examples

### 10.1 Service Worker Request Interception Pattern

```javascript
// public/sw.js
const CACHE_STRATEGIES = {
  'cache-first': async (request) => {
    const cache = await caches.open('vitta-v1');
    const cached = await cache.match(request);
    if (cached) return cached;

    try {
      const response = await fetch(request);
      cache.put(request, response.clone());
      return response;
    } catch (error) {
      return createOfflineFallback(request);
    }
  },

  'network-first': async (request) => {
    try {
      const response = await fetch(request);
      const cache = await caches.open('vitta-v1');
      cache.put(request, response.clone());
      return response;
    } catch (error) {
      const cache = await caches.open('vitta-v1');
      return cache.match(request) || createOfflineFallback(request);
    }
  }
};

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(CACHE_STRATEGIES['network-first'](event.request));
  } else if (url.pathname.match(/\.(js|css|png|jpg|svg)$/)) {
    event.respondWith(CACHE_STRATEGIES['cache-first'](event.request));
  }
});
```

### 10.2 IndexedDB Storage Utility Pattern

```javascript
// services/storage/indexedDB.js
class IndexedDBManager {
  async open() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('vitta_offline', 1);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        this.createStores(db);
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async savePendingMessage(message) {
    const db = await this.open();
    const transaction = db.transaction('pending_messages', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = transaction.objectStore('pending_messages').add(message);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}
```

### 10.3 Offline Detection Hook Pattern

```javascript
// services/offline/offlineDetector.js
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Trigger sync when coming online
      triggerOfflineSync();
    };

    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
```

---

## 11. Offline-First Best Practices

### 11.1 User Experience During Offline

```
SCENARIOS:

1. User Opens App Offline
   ├── Show app shell immediately
   ├── Load cached chat history
   ├── Display last known card balances
   ├── Show "Offline Mode" banner
   └── Disable actions requiring sync

2. User Sends Chat Message
   ├── Show message immediately (optimistic UI)
   ├── Store to IndexedDB with pending flag
   ├── Show sync indicator
   ├── When online: Attempt sync (3 retries)
   ├── Success: Mark as synced, confirm
   └── Failure: Show retry option or discard

3. User Makes Payment
   ├── Validate locally with cached data
   ├── Store transaction to IndexedDB
   ├── Show pending indicator
   ├── When online: Process payment
   ├── Success: Update local state from server
   └── Failure: Keep in queue, show action items

4. User Goes From Online to Offline
   ├── Don't interrupt current operation
   ├── Queue next operations
   ├── Show transition indicator (2-3s)
   └── Explain limitations clearly
```

### 11.2 Conflict Resolution Strategy

```
APPROACH: Last-Write-Wins with Client Preference

├── Chat History
│   └── No conflicts (append-only)
│
├── User Preferences
│   ├── Client value wins if changed offline
│   ├── Notify user of conflict (toast)
│   └── Provide undo option
│
├── Payment Transactions
│   ├── Server-side deduplication (idempotent)
│   ├── Client sees duplicate: Show error message
│   └── User can dismiss if duplicate is OK
│
└── Card Data
    ├── Server is source of truth
    ├── Client refreshes on sync
    └── Show "Updated" indicator
```

---

## 12. Success Criteria & Testing

### 12.1 Feature Checklist

- [ ] App installs on Android/iOS/Desktop
- [ ] App works fully offline with cached data
- [ ] Chat messages queue and sync when online
- [ ] Payments queue and sync when online
- [ ] User can view offline history
- [ ] Sync status visible with progress
- [ ] Failed syncs can be retried
- [ ] Service Worker updates in background
- [ ] Works on 3G/4G/LTE networks
- [ ] Lighthouse PWA score ≥ 90

### 12.2 Performance Benchmarks

```
Metric                  Current    Target
─────────────────────────────────────────
Lighthouse PWA Score    N/A        ≥ 90
Lighthouse Performance  ~60-70     ≥ 90
First Paint             ~2.5s      < 1.8s
First Contentful Paint  ~2.8s      < 1.8s
Largest Paint           ~3.2s      < 2.5s
Time to Interactive     ~4.5s      < 3.8s
Offline Load Time       N/A        < 1.0s
Sync Time (small msg)   N/A        < 2.0s
Sync Time (payment)     N/A        < 5.0s
```

---

## 13. Deployment Considerations

### 13.1 Hosting Requirements

```
HTTP/2 SUPPORT: Required
  └── All modern hosts support this

HTTPS REQUIREMENT: Mandatory
  ├── Self-signed OK for development
  └── Valid certificate required for production

GZIP COMPRESSION: Recommended
  └── Most hosts enable automatically

CORS HEADERS: May need updates
  ├── Service Worker can't bypass CORS
  ├── API endpoints must allow SW origin
  └── Test with real deployment

CACHE HEADERS: Critical for PWA
  ├── Static assets: Cache-Control: max-age=2592000
  ├── HTML pages: Cache-Control: max-age=604800
  ├── API responses: Vary headers (if cached)
  └── Service Worker: No cache (always fresh)
```

### 13.2 Vercel-Specific Configuration

```javascript
// vercel.json
{
  "headers": [
    {
      "source": "/service-worker.js",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        }
      ]
    },
    {
      "source": "/static/:path*",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

---

## 14. Next Steps & Resources

### 14.1 Implementation Start

1. Review this architecture with team
2. Create feature branch: `feat/pwa-conversion`
3. Start Phase 1 implementation
4. Set up Lighthouse CI for score tracking
5. Create deployment PR with checklist

### 14.2 Useful Resources

- [MDN: Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Google PWA Checklist](https://web.dev/pwa-checklist/)
- [Service Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [IndexedDB Guide](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Background Sync API](https://developer.mozilla.org/en-US/docs/Web/API/Background_Sync_API)

---

## 15. Architecture Decision Record (ADR)

### Why Service Workers over other approaches?

✅ **Service Workers** (Chosen)
- Native browser API (no dependency)
- Offline support with cache control
- Background sync capability
- Push notifications support
- Works across all browsers

❌ **AppCache** (Legacy)
- Deprecated and removed from browsers
- No longer recommended

❌ **WebSockets for sync**
- Requires persistent connection
- Not suitable for intermittent offline
- Drains battery on mobile

### Why IndexedDB over localStorage?

✅ **IndexedDB** (Chosen for structured data)
- Supports large amounts of data (50MB+)
- Structured queries with indexes
- Async API (doesn't block UI)
- Transactional guarantees
- Better for complex data

✅ **localStorage** (Chosen for preferences)
- Simple key-value storage
- Synchronous (ok for small data)
- Good for session state

---

## 16. Risk & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| IndexedDB quota exceeded | Data loss | Monitor usage, implement cleanup policy |
| Sync conflicts | Data inconsistency | Server deduplication + conflict resolution |
| Service Worker bugs | Cache corruption | Implement cache versioning + cleanup |
| Offline UI complexity | User confusion | Clear offline banners + disabled states |
| Large bundle size | Slower installs | Code splitting + lazy loading |
| Browser compatibility | Limited audience | Progressive enhancement + fallbacks |

---

This architecture provides a complete roadmap for PWA conversion with clear phases, file structure, and implementation patterns. The next step is detailed technical planning for Phase 1.
