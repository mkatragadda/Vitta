# PWA Implementation Specifications - Technical Details

## 1. Dependencies to Add

### 1.1 Required Dependencies

```bash
npm install --save-dev workbox-webpack-plugin workbox-cli
npm install workbox-window workbox-precaching
```

### 1.2 Package.json Updates

```json
{
  "dependencies": {
    "workbox-window": "^7.0.0"
  },
  "devDependencies": {
    "workbox-webpack-plugin": "^7.0.0",
    "workbox-cli": "^7.0.0",
    "pwa-asset-generator": "^6.2.0"
  },
  "scripts": {
    "pwa:generate-icons": "pwa-asset-generator ./public/icon-base.png ./public/icons --background '#ffffff' --type png --splash-only"
  }
}
```

---

## 2. File-by-File Implementation Guide

### 2.1 `next.config.js` - PWA Configuration

**Changes Required:**
- Add Workbox PWA plugin
- Configure static asset optimization
- Set up cache headers

**Implementation:**
```javascript
/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  buildExcludes: [/middleware-manifest.json$/],
  publicExcludes: ['!robots.txt', '!sitemap.xml', '!manifest.json'],
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.(jpg|jpeg|png|gif|webp|svg|ico)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'vitta-images',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
    {
      urlPattern: /^https:\/\/.*\.(js|css)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'vitta-static',
        expiration: {
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
    {
      urlPattern: /^https:\/\/api\.openai\.com\/.*$/,
      handler: 'NetworkOnly',
    },
  ],
});

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  webpack: (config, { isServer, dev }) => {
    if (!dev && !isServer) {
      config.plugins.push(
        new (require('webpack').IgnorePlugin)({
          resourceRegExp: /^\.\/admin\/.*/,
          contextRegExp: /pages$/,
        })
      );
    }
    return config;
  },
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  // PWA headers
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
        ],
      },
    ];
  },
};

module.exports = withPWA(nextConfig);
```

**File Status:** MODIFY `next.config.js`

---

### 2.2 `pages/_document.js` - Meta Tags & Manifest

**Changes Required:**
- Add manifest link
- Add PWA meta tags
- Configure viewport for mobile
- Add apple-touch-icon

**Full Updated Content:**
```javascript
import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Basic Meta */}
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" />
        <meta name="description" content="AI-powered credit card optimization and payment strategy assistant" />

        {/* PWA Meta Tags */}
        <meta name="theme-color" content="#6366f1" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Vitta" />

        {/* App Favicons */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" type="image/png" href="/favicon-32x32.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* Google Identity Services */}
        <script src="https://accounts.google.com/gsi/client" async defer></script>

        {/* Service Worker Registration */}
        <script async src="/register-sw.js"></script>
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
```

**File Status:** MODIFY `pages/_document.js`

---

### 2.3 `pages/_app.js` - Offline State Management

**Changes Required:**
- Add offline state detection hook
- Initialize storage services
- Add sync status tracking

**Full Updated Content:**
```javascript
import '../styles/globals.css'
import Script from 'next/script'
import { useState, useEffect } from 'react'
import { initializeStorageServices } from '../services/storage/storageManager'
import { OfflineDetector } from '../services/offline/offlineDetector'

function App({ Component, pageProps }) {
  const [isOnline, setIsOnline] = useState(true)
  const [syncStatus, setSyncStatus] = useState('idle') // idle, syncing, error
  const [storageReady, setStorageReady] = useState(false)

  // Initialize storage on app load
  useEffect(() => {
    const initStorage = async () => {
      try {
        await initializeStorageServices()
        setStorageReady(true)
      } catch (error) {
        console.error('[App] Storage initialization failed:', error)
        // Continue anyway, app can work without offline support
        setStorageReady(true)
      }
    }

    initStorage()
  }, [])

  // Monitor online/offline status
  useEffect(() => {
    const detector = new OfflineDetector()

    const handleOnline = () => {
      console.log('[App] Coming online')
      setIsOnline(true)
      setSyncStatus('syncing')
      // Trigger sync of pending operations
      detector.triggerSync().finally(() => {
        setSyncStatus('idle')
      })
    }

    const handleOffline = () => {
      console.log('[App] Going offline')
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Pass offline state to components via context
  const offlineContext = {
    isOnline,
    syncStatus,
    storageReady,
  }

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
      />
      <Component {...pageProps} offlineContext={offlineContext} />
    </>
  )
}

export default App
```

**File Status:** MODIFY `pages/_app.js`

---

### 2.4 `public/manifest.json` - Web App Manifest

**File Status:** CREATE `public/manifest.json`

```json
{
  "name": "Vitta - Smart Credit Card Assistant",
  "short_name": "Vitta",
  "description": "Your intelligent credit card platform. AI-powered insights for card optimization and payment strategy.",
  "start_url": "/?utm_source=pwa",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "dir": "ltr",
  "lang": "en",
  "background_color": "#ffffff",
  "theme_color": "#6366f1",
  "prefer_related_applications": false,
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
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
      "form_factor": "narrow",
      "label": "Chat with Vitta"
    },
    {
      "src": "/screenshots/screenshot-1280x720.png",
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide",
      "label": "Payment recommendations"
    }
  ],
  "shortcuts": [
    {
      "name": "Chat with Vitta",
      "short_name": "Chat",
      "description": "Start a new chat conversation",
      "url": "/?screen=chat&utm_source=pwa-shortcut",
      "icons": [
        {
          "src": "/icons/shortcut-chat-96x96.png",
          "sizes": "96x96",
          "type": "image/png"
        }
      ]
    },
    {
      "name": "Payment Strategy",
      "short_name": "Payments",
      "description": "View payment recommendations",
      "url": "/?screen=optimizer&utm_source=pwa-shortcut",
      "icons": [
        {
          "src": "/icons/shortcut-payments-96x96.png",
          "sizes": "96x96",
          "type": "image/png"
        }
      ]
    },
    {
      "name": "My Cards",
      "short_name": "Cards",
      "description": "View your credit cards",
      "url": "/?screen=cards&utm_source=pwa-shortcut",
      "icons": [
        {
          "src": "/icons/shortcut-cards-96x96.png",
          "sizes": "96x96",
          "type": "image/png"
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

---

### 2.5 `public/register-sw.js` - Service Worker Registration

**File Status:** CREATE `public/register-sw.js`

```javascript
// Service Worker Registration Script
// This file is loaded synchronously in _document.js

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    })
      .then(registration => {
        console.log('[SW] Registration successful:', registration.scope);

        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60000); // Check every minute

        // Listen for new service worker ready
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('[SW] Update found');

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker available
              console.log('[SW] New version available');

              // Send message to UI about new update
              window.dispatchEvent(
                new CustomEvent('swUpdateAvailable', {
                  detail: { registration }
                })
              );
            }
          });
        });
      })
      .catch(error => {
        console.warn('[SW] Registration failed:', error);
      });

    // Handle messages from Service Worker
    navigator.serviceWorker.addEventListener('message', event => {
      console.log('[SW] Message received:', event.data);

      if (event.data && event.data.type === 'SYNC_STARTED') {
        window.dispatchEvent(
          new CustomEvent('syncStarted', { detail: event.data })
        );
      }

      if (event.data && event.data.type === 'SYNC_COMPLETED') {
        window.dispatchEvent(
          new CustomEvent('syncCompleted', { detail: event.data })
        );
      }
    });
  });

  // Handle clicks on SW install button
  let deferredPrompt;

  window.addEventListener('beforeinstallprompt', event => {
    console.log('[SW] Install prompt available');
    event.preventDefault();
    deferredPrompt = event;

    window.dispatchEvent(
      new CustomEvent('installPromptAvailable', { detail: deferredPrompt })
    );
  });

  window.addEventListener('appinstalled', () => {
    console.log('[SW] PWA was installed');
    deferredPrompt = null;

    window.dispatchEvent(new CustomEvent('appInstalled'));
  });
}
```

---

### 2.6 `public/sw.js` - Main Service Worker

**File Status:** CREATE `public/sw.js`

```javascript
// Service Worker for Vitta PWA
// Handles caching, offline support, and background sync

const CACHE_VERSION = 'vitta-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;
const API_CACHE = `${CACHE_VERSION}-api`;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/favicon.svg',
];

// Installation: Precache static assets
self.addEventListener('install', event => {
  console.log('[SW] Installing...');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('[SW] Precaching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activation: Clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');

  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name.startsWith('vitta-v') && name !== CACHE_VERSION)
          .map(name => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Implement caching strategies
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip Chrome extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Strategy: Cache-first for static assets
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirstStrategy(event.request));
  }
  // Strategy: Network-first for API calls
  else if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(event.request));
  }
  // Strategy: Network-first for HTML pages
  else if (url.pathname.endsWith('.html') || url.pathname === '/') {
    event.respondWith(networkFirstStrategy(event.request));
  }
  // Strategy: Cache-first for images
  else if (isImage(url.pathname)) {
    event.respondWith(cacheFirstImages(event.request));
  }
  // Default: Network-first with cache fallback
  else {
    event.respondWith(networkFirstStrategy(event.request));
  }
});

// Cache-first strategy
async function cacheFirstStrategy(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('[SW] Fetch failed for:', request.url, error);
    return getOfflineFallback(request);
  }
}

// Network-first strategy
async function networkFirstStrategy(request) {
  const timeout = 5000; // 5 second timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(request, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    console.log('[SW] Network failed, using cache:', request.url);

    // Try cache
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    // Return offline fallback
    return getOfflineFallback(request);
  }
}

// Cache-first for images with size limit
async function cacheFirstImages(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);

    if (response.ok) {
      // Only cache successful images
      const size = response.headers.get('content-length');
      if (!size || size < 5 * 1024 * 1024) { // Only cache if < 5MB
        cache.put(request, response.clone());
      }
    }

    return response;
  } catch (error) {
    // Return placeholder for failed images
    return new Response(
      'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23f3f4f6" width="100" height="100"/></svg>',
      { headers: { 'Content-Type': 'image/svg+xml' } }
    );
  }
}

// Get offline fallback response
async function getOfflineFallback(request) {
  // Check what type of request this is
  const url = new URL(request.url);

  if (request.headers.get('accept')?.includes('text/html')) {
    // Return offline page for HTML requests
    const cache = await caches.open(STATIC_CACHE);
    return cache.match('/offline.html') || new Response('Offline');
  }

  if (request.headers.get('accept')?.includes('application/json')) {
    // Return empty JSON for API requests
    return new Response(JSON.stringify({ offline: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response('Offline', {
    status: 503,
    statusText: 'Service Unavailable',
  });
}

// Helper: Check if URL is static asset
function isStaticAsset(pathname) {
  return /\.(js|css|woff|woff2|ttf|otf)$/i.test(pathname);
}

// Helper: Check if URL is image
function isImage(pathname) {
  return /\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(pathname);
}

// Background Sync (future: implement when sync handler is ready)
self.addEventListener('sync', event => {
  console.log('[SW] Background sync event:', event.tag);

  if (event.tag === 'sync-pending-messages') {
    event.waitUntil(syncPendingMessages());
  }

  if (event.tag === 'sync-pending-payments') {
    event.waitUntil(syncPendingPayments());
  }
});

async function syncPendingMessages() {
  console.log('[SW] Syncing pending messages...');
  // Implementation in syncManager.js
  return Promise.resolve();
}

async function syncPendingPayments() {
  console.log('[SW] Syncing pending payments...');
  // Implementation in syncManager.js
  return Promise.resolve();
}

// Message handler for client communication
self.addEventListener('message', event => {
  console.log('[SW] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(DYNAMIC_CACHE);
  }
});
```

---

### 2.7 `pages/offline.js` - Offline Fallback Page

**File Status:** CREATE `pages/offline.js`

```javascript
import { useState, useEffect } from 'react'

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    if (isOnline) {
      // Redirect back to app when online
      window.location.href = '/'
    }
  }, [isOnline])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-500">
      <div className="text-center px-6 py-12 bg-white rounded-lg shadow-lg max-w-md">
        <div className="mb-6">
          <div className="inline-block p-4 bg-purple-100 rounded-full">
            <svg className="w-12 h-12 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16H5m11 0h3m-11-8h.01M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2z" />
            </svg>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-4">You're Offline</h1>
        <p className="text-gray-600 mb-6">
          It looks like you've lost your internet connection. Your changes will be saved automatically when you're back online.
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
          <p className="text-sm text-blue-800 font-semibold mb-2">What you can do:</p>
          <ul className="text-sm text-blue-700 space-y-2">
            <li>✓ View your saved cards and chat history</li>
            <li>✓ Compose messages (they'll send when online)</li>
            <li>✓ Review payment recommendations</li>
          </ul>
        </div>

        <button
          onClick={() => window.location.href = '/'}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
        >
          Go to App
        </button>

        <p className="text-xs text-gray-500 mt-6">
          {isOnline ? (
            <span className="text-green-600">✓ You're back online!</span>
          ) : (
            <span>Waiting for connection...</span>
          )}
        </p>
      </div>
    </div>
  )
}
```

---

### 2.8 `services/storage/indexedDB.js` - IndexedDB Manager

**File Status:** CREATE `services/storage/indexedDB.js`

```javascript
/**
 * IndexedDB Manager
 * Handles offline data storage for Vitta
 */

class IndexedDBManager {
  constructor() {
    this.db = null;
    this.dbName = 'vitta_offline';
    this.dbVersion = 1;
    this.stores = {
      pending_messages: {
        keyPath: 'id',
        indexes: [
          { name: 'synced', keyPath: 'synced' },
          { name: 'timestamp', keyPath: 'timestamp' },
        ],
      },
      pending_payments: {
        keyPath: 'id',
        indexes: [
          { name: 'synced', keyPath: 'synced' },
          { name: 'cardId', keyPath: 'cardId' },
        ],
      },
      chat_history: {
        keyPath: 'id',
        indexes: [
          { name: 'synced', keyPath: 'synced' },
          { name: 'timestamp', keyPath: 'timestamp' },
        ],
      },
      sync_log: {
        keyPath: 'id',
        indexes: [
          { name: 'status', keyPath: 'status' },
          { name: 'timestamp', keyPath: 'timestamp' },
        ],
      },
    };
  }

  /**
   * Open or create database
   */
  async open() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('[IndexedDB] Open failed:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[IndexedDB] Database opened successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        this.createStores(db);
      };
    });
  }

  /**
   * Create object stores
   */
  createStores(db) {
    Object.entries(this.stores).forEach(([storeName, config]) => {
      if (db.objectStoreNames.contains(storeName)) {
        return;
      }

      const store = db.createObjectStore(storeName, { keyPath: config.keyPath });

      config.indexes.forEach(index => {
        store.createIndex(index.name, index.keyPath);
      });

      console.log(`[IndexedDB] Created store: ${storeName}`);
    });
  }

  /**
   * Save pending message
   */
  async savePendingMessage(message) {
    const db = await this.open();
    return this.put('pending_messages', {
      id: `msg_${Date.now()}_${Math.random()}`,
      ...message,
      timestamp: Date.now(),
      synced: false,
    });
  }

  /**
   * Get all pending messages
   */
  async getPendingMessages() {
    const db = await this.open();
    return this.getAllByIndex('pending_messages', 'synced', false);
  }

  /**
   * Mark message as synced
   */
  async markMessageSynced(messageId) {
    const db = await this.open();
    const message = await this.get('pending_messages', messageId);
    if (message) {
      message.synced = true;
      return this.put('pending_messages', message);
    }
  }

  /**
   * Save sync log entry
   */
  async addSyncLog(entry) {
    return this.put('sync_log', {
      id: `sync_${Date.now()}_${Math.random()}`,
      ...entry,
      timestamp: Date.now(),
    });
  }

  /**
   * Generic put operation
   */
  async put(storeName, data) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => {
        console.log(`[IndexedDB] Saved to ${storeName}:`, data);
        resolve(request.result);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Generic get operation
   */
  async get(storeName, key) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all records matching an index value
   */
  async getAllByIndex(storeName, indexName, value) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete record
   */
  async delete(storeName, key) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear entire store
   */
  async clearStore(storeName) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => {
        console.log(`[IndexedDB] Cleared store: ${storeName}`);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }
}

// Singleton instance
const dbManager = new IndexedDBManager();

export default dbManager;
```

---

### 2.9 `services/offline/offlineDetector.js` - Online/Offline Detection

**File Status:** CREATE `services/offline/offlineDetector.js`

```javascript
/**
 * Offline Detection Service
 * Monitors network connectivity and triggers sync
 */

import dbManager from '../storage/indexedDB';

class OfflineDetector {
  constructor() {
    this.isOnline = navigator.onLine;
    this.syncInProgress = false;
    this.listeners = [];
  }

  /**
   * Initialize detection
   */
  init() {
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());

    // Also check periodically (for networks that don't fire events reliably)
    setInterval(() => this.checkConnectivity(), 30000);

    console.log('[OfflineDetector] Initialized');
  }

  /**
   * Handle coming online
   */
  async handleOnline() {
    console.log('[OfflineDetector] Coming online');
    this.isOnline = true;
    this.notify('online');

    // Trigger sync of pending operations
    await this.triggerSync();
  }

  /**
   * Handle going offline
   */
  handleOffline() {
    console.log('[OfflineDetector] Going offline');
    this.isOnline = false;
    this.notify('offline');
  }

  /**
   * Trigger sync of all pending operations
   */
  async triggerSync() {
    if (this.syncInProgress) {
      console.log('[OfflineDetector] Sync already in progress');
      return;
    }

    this.syncInProgress = true;
    this.notify('sync:start');

    try {
      const messages = await dbManager.getPendingMessages();
      console.log(`[OfflineDetector] Found ${messages.length} pending messages`);

      // Here you would call syncManager to sync all pending operations
      // await syncManager.syncAll();

      this.notify('sync:end', { success: true });
    } catch (error) {
      console.error('[OfflineDetector] Sync failed:', error);
      this.notify('sync:error', { error });
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Check connectivity (helpful for unreliable networks)
   */
  async checkConnectivity() {
    try {
      const response = await fetch('/manifest.json', {
        method: 'HEAD',
        cache: 'no-cache',
      });

      if (!this.isOnline) {
        console.log('[OfflineDetector] Detected online (via fetch)');
        this.handleOnline();
      }
    } catch (error) {
      if (this.isOnline) {
        console.log('[OfflineDetector] Detected offline (via fetch)');
        this.handleOffline();
      }
    }
  }

  /**
   * Subscribe to events
   */
  on(event, callback) {
    this.listeners.push({ event, callback });
    return () => {
      this.listeners = this.listeners.filter(
        l => !(l.event === event && l.callback === callback)
      );
    };
  }

  /**
   * Notify listeners
   */
  notify(event, data = {}) {
    this.listeners.forEach(listener => {
      if (listener.event === event) {
        listener.callback(data);
      }
    });

    // Also dispatch as custom events for global listeners
    window.dispatchEvent(
      new CustomEvent(`offline:${event}`, { detail: data })
    );
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress,
    };
  }
}

// Create and export singleton
const offlineDetector = new OfflineDetector();
offlineDetector.init();

export { OfflineDetector };
export default offlineDetector;
```

---

## 3. Key Service Integration Points

### 3.1 Update `services/chat/conversationEngineV2.js`

**Changes:**
- Add offline message queueing
- Check network before API calls
- Fallback to cached responses

**Pseudocode:**
```javascript
async function processUserMessage(message) {
  // Save to IndexedDB immediately
  await dbManager.savePendingMessage({
    content: message,
    intent: null,
    synced: false,
  });

  if (!navigator.onLine) {
    return { offline: true, queued: true };
  }

  // Proceed with normal flow
  // ...
}
```

### 3.2 Update `components/VittaApp.js`

**Changes:**
- Import offline state from _app.js
- Display offline indicator
- Disable online-only operations

**Pseudocode:**
```javascript
function VittaApp({ offlineContext }) {
  const { isOnline, syncStatus } = offlineContext;

  return (
    <div>
      {!isOnline && <OfflineIndicator />}
      {syncStatus === 'syncing' && <SyncStatus />}

      {/* Rest of component */}
    </div>
  );
}
```

---

## 4. Testing Checklist

- [ ] Service Worker installs and activates
- [ ] Manifest.json loads correctly
- [ ] App installs on Android (Chrome)
- [ ] App installs on iOS (Safari)
- [ ] App works offline with cached data
- [ ] Chat history loads when offline
- [ ] Messages queue when offline
- [ ] Messages sync when coming online
- [ ] All 3 payment transaction types queue correctly
- [ ] Sync retry works with exponential backoff
- [ ] Failed sync shows error message
- [ ] Sync completes successfully
- [ ] User can view pending sync operations
- [ ] Service Worker updates in background
- [ ] Lighthouse PWA score ≥ 90

---

## 5. Debugging Tips

**Check Service Worker status:**
```javascript
// In browser console
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => {
    console.log('SW State:', reg.active?.state);
    console.log('SW Scope:', reg.scope);
  });
});
```

**View IndexedDB data:**
```javascript
// DevTools > Application > IndexedDB > vitta_offline
```

**Test offline:**
```
DevTools > Network > Offline (checkbox)
```

**Clear all data:**
```javascript
// Full clear
indexedDB.databases().forEach(db => {
  indexedDB.deleteDatabase(db.name);
});
```

---

This specification provides exact implementation details for each critical file.
