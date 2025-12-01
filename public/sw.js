/**
 * Vitta Service Worker
 * Handles caching, offline support, and request interception
 *
 * Caching Strategies:
 * - Static Assets (JS, CSS): Cache-First (30 days)
 * - Images: Cache-First (30 days) with size limit
 * - API Calls: Network-First (5s timeout, fallback to cache)
 * - HTML Pages: Network-First (5s timeout, fallback to cache)
 * - OpenAI API: Network-Only (never cache AI responses)
 */

const CACHE_VERSION = 'vitta-v2'
const STATIC_CACHE = `${CACHE_VERSION}-static`
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`
const IMAGE_CACHE = `${CACHE_VERSION}-images`
const API_CACHE = `${CACHE_VERSION}-api`

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/favicon.svg',
]

const CACHE_EXPIRATION = {
  static: 30 * 24 * 60 * 60 * 1000, // 30 days
  images: 30 * 24 * 60 * 60 * 1000, // 30 days
  api: 7 * 24 * 60 * 60 * 1000, // 7 days
  dynamic: 7 * 24 * 60 * 60 * 1000, // 7 days
}

const NETWORK_TIMEOUT = 5000 // 5 seconds for network requests
const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB for images

// ============================================================================
// Installation: Precache static assets
// ============================================================================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...')

  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Precaching static assets')
      return cache.addAll(STATIC_ASSETS).catch((error) => {
        console.warn('[SW] Some assets failed to precache:', error)
        // Continue anyway, not all assets may be available
        return Promise.resolve()
      })
    }).then(() => {
      console.log('[SW] Skipping waiting - activating immediately')
      return self.skipWaiting()
    })
  )
})

// ============================================================================
// Activation: Clean up old caches
// ============================================================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...')

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('vitta-') && name !== CACHE_VERSION)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name)
            return caches.delete(name)
          })
      )
    }).then(() => {
      console.log('[SW] Service Worker activated')
      return self.clients.claim()
    })
  )
})

// ============================================================================
// Fetch: Implement caching strategies
// ============================================================================
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // CRITICAL: Skip ALL interception in development (localhost)
  // This prevents service worker from interfering with Next.js dev server
  if (url.hostname === 'localhost' || 
      url.hostname === '127.0.0.1' ||
      url.hostname.includes('localhost')) {
    // Let requests pass through to network without interception
    return;
  }

  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return
  }

  // Skip Chrome extension requests
  if (url.protocol === 'chrome-extension:') {
    return
  }

  // Skip websocket and other non-http protocols
  if (!url.protocol.startsWith('http')) {
    return
  }

  // Route requests to appropriate caching strategy
  if (isStaticAsset(url.pathname)) {
    // Static assets: Cache-first
    event.respondWith(cacheFirstStrategy(event.request))
  } else if (url.pathname.startsWith('/api/chat/') || url.pathname.startsWith('/api/embeddings') || url.host === 'api.openai.com') {
    // OpenAI API: Network-only (check this BEFORE general /api/ routes)
    event.respondWith(networkOnlyStrategy(event.request))
  } else if (url.pathname.startsWith('/api/')) {
    // API calls: Network-first
    event.respondWith(networkFirstStrategy(event.request))
  } else if (isImage(url.pathname)) {
    // Images: Cache-first with size limit
    event.respondWith(cacheFirstImages(event.request))
  } else if (isHtmlPage(url.pathname)) {
    // HTML pages: Network-first
    event.respondWith(networkFirstStrategy(event.request))
  } else {
    // Default: Network-first
    event.respondWith(networkFirstStrategy(event.request))
  }
})

// ============================================================================
// Cache-First Strategy
// ============================================================================
async function cacheFirstStrategy(request) {
  const cacheName = STATIC_CACHE
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)

  if (cached) {
    console.log('[SW] Cache hit:', request.url)
    return cached
  }

  try {
    console.log('[SW] Fetching:', request.url)
    const response = await fetch(request)

    if (response.ok) {
      const clonedResponse = response.clone()
      cache.put(request, clonedResponse)
    }

    return response
  } catch (error) {
    console.error('[SW] Fetch failed for:', request.url, error)
    return getOfflineFallback(request)
  }
}

// ============================================================================
// Network-First Strategy
// ============================================================================
async function networkFirstStrategy(request) {
  const cacheName = DYNAMIC_CACHE
  const cache = await caches.open(cacheName)

  try {
    console.log('[SW] Attempting network request:', request.url)
    const response = await fetchWithTimeout(request, NETWORK_TIMEOUT)

    if (response.ok) {
      const clonedResponse = response.clone()
      cache.put(request, clonedResponse)
    }

    return response
  } catch (error) {
    console.log('[SW] Network failed, checking cache for:', request.url)

    // Try cache
    const cached = await cache.match(request)
    if (cached) {
      console.log('[SW] Returning cached response:', request.url)
      return cached
    }

    // Return offline fallback
    console.log('[SW] No cache available, returning fallback:', request.url)
    return getOfflineFallback(request)
  }
}

// ============================================================================
// Network-Only Strategy (OpenAI)
// ============================================================================
async function networkOnlyStrategy(request) {
  try {
    console.log('[SW] Network-only request:', request.url)
    const response = await fetchWithTimeout(request, NETWORK_TIMEOUT)
    return response
  } catch (error) {
    console.error('[SW] Network-only request failed:', request.url, error)
    // Return JSON error response
    return new Response(
      JSON.stringify({
        error: 'Network error - offline or request failed',
        offline: true,
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

// ============================================================================
// Cache-First for Images (with size limits)
// ============================================================================
async function cacheFirstImages(request) {
  const cacheName = IMAGE_CACHE
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)

  if (cached) {
    console.log('[SW] Image cache hit:', request.url)
    return cached
  }

  try {
    console.log('[SW] Fetching image:', request.url)
    const response = await fetchWithTimeout(request, NETWORK_TIMEOUT)

    if (response.ok) {
      // Check size before caching
      const size = response.headers.get('content-length')
      if (!size || parseInt(size) < MAX_IMAGE_SIZE) {
        const clonedResponse = response.clone()
        cache.put(request, clonedResponse)
      }
    }

    return response
  } catch (error) {
    console.error('[SW] Image fetch failed:', request.url, error)

    // Return placeholder SVG for failed images
    return new Response(
      'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23f3f4f6" width="100" height="100"/></svg>',
      {
        headers: { 'Content-Type': 'image/svg+xml' },
      }
    )
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Fetch with timeout
 */
function fetchWithTimeout(request, timeout) {
  return Promise.race([
    fetch(request),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Fetch timeout')), timeout)
    ),
  ])
}

/**
 * Get offline fallback response
 */
async function getOfflineFallback(request) {
  const url = new URL(request.url)

  // HTML request - return offline page
  if (request.headers.get('accept')?.includes('text/html')) {
    try {
      const cache = await caches.open(STATIC_CACHE)
      return await cache.match('/offline.html')
    } catch (error) {
      console.error('[SW] Offline page not found:', error)
      return new Response(
        '<!DOCTYPE html><html><body><h1>Offline</h1><p>Please check your connection.</p></body></html>',
        {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/html' },
        }
      )
    }
  }

  // API request - return JSON error
  if (request.headers.get('accept')?.includes('application/json')) {
    return new Response(
      JSON.stringify({
        error: 'Offline - request not available',
        offline: true,
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  // Default fallback
  return new Response('Offline', {
    status: 503,
    statusText: 'Service Unavailable',
  })
}

/**
 * Check if URL is a static asset
 */
function isStaticAsset(pathname) {
  return /\.(js|css|woff|woff2|ttf|otf)$/i.test(pathname)
}

/**
 * Check if URL is an image
 */
function isImage(pathname) {
  return /\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(pathname)
}

/**
 * Check if URL is an HTML page
 */
function isHtmlPage(pathname) {
  return /\.html?$/i.test(pathname) || pathname === '/'
}

// ============================================================================
// Background Sync (placeholder for Phase 3)
// ============================================================================
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag)

  if (event.tag === 'sync-pending-messages') {
    event.waitUntil(syncPendingMessages())
  }

  if (event.tag === 'sync-pending-payments') {
    event.waitUntil(syncPendingPayments())
  }
})

async function syncPendingMessages() {
  console.log('[SW] Syncing pending messages...')
  // Implementation in Phase 3: syncManager
  return Promise.resolve()
}

async function syncPendingPayments() {
  console.log('[SW] Syncing pending payments...')
  // Implementation in Phase 3: syncManager
  return Promise.resolve()
}

// ============================================================================
// Message Handler (client communication)
// ============================================================================
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data)

  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] SKIP_WAITING command received')
    self.skipWaiting()
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('[SW] CLEAR_CACHE command received')
    caches.delete(DYNAMIC_CACHE)
  }

  if (event.data && event.data.type === 'GET_CACHE_SIZE') {
    getCacheSize().then((size) => {
      event.ports[0].postMessage({
        type: 'CACHE_SIZE',
        size: size,
      })
    })
  }
})

/**
 * Get total cache size
 */
async function getCacheSize() {
  if (!navigator.storage || !navigator.storage.estimate) {
    return 0
  }

  try {
    const estimate = await navigator.storage.estimate()
    return estimate.usage || 0
  } catch (error) {
    console.error('[SW] Error estimating cache size:', error)
    return 0
  }
}

console.log('[SW] Service Worker loaded and ready')
