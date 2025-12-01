# Service Worker: Development vs Production

## Overview

The service worker behaves differently in development and production to optimize for each environment's needs.

---

## 🔧 **Development Mode** (localhost)

### Behavior: **DISABLED**

The service worker is **completely disabled** in development to prevent interference with Next.js hot reloading and API calls.

### Detection
- Automatically detects: `localhost`, `127.0.0.1`, or any hostname containing "localhost"
- Works on any port (3000, 3001, etc.)

### What Happens

1. **On Page Load:**
   - Inline script in `_document.js` immediately unregisters any existing service workers
   - Clears all caches
   - Prevents service worker registration

2. **Service Worker File (`sw.js`):**
   - Fetch handler immediately returns without intercepting requests
   - All requests pass through to the network normally

3. **Registration Script (`register-sw.js`):**
   - Detects development mode
   - Unregisters service workers
   - Skips registration entirely

### Benefits
- ✅ No caching interference with Next.js dev server
- ✅ Hot reloading works correctly
- ✅ API calls go directly to the server
- ✅ Faster development iteration

---

## 🚀 **Production Mode** (deployed domains)

### Behavior: **FULLY ACTIVE**

The service worker is **fully enabled** in production to provide offline support, caching, and PWA capabilities.

### Detection
- Any domain that is **NOT** localhost (e.g., `app.getvitta.com`, `vitta.vercel.app`)
- Automatic detection based on hostname

### What Happens

1. **On Page Load:**
   - Service worker registers automatically
   - Pre-caches static assets (HTML, CSS, JS, manifest)
   - Sets up caching strategies

2. **Caching Strategies:**

   ```
   ┌─────────────────────────────────────────────────────┐
   │ Static Assets (JS, CSS, fonts)                      │
   │ → Cache-First (30 days)                             │
   │ → Serves from cache, updates in background          │
   └─────────────────────────────────────────────────────┘
   
   ┌─────────────────────────────────────────────────────┐
   │ Images                                               │
   │ → Cache-First (30 days, max 5MB)                    │
   │ → Falls back to placeholder if offline              │
   └─────────────────────────────────────────────────────┘
   
   ┌─────────────────────────────────────────────────────┐
   │ API Calls (/api/*)                                  │
   │ → Network-First (5s timeout)                        │
   │ → Falls back to cache if network fails              │
   └─────────────────────────────────────────────────────┘
   
   ┌─────────────────────────────────────────────────────┐
   │ OpenAI API (/api/chat/completions, /api/embeddings) │
   │ → Network-Only (never cached)                       │
   │ → Requires internet connection                      │
   └─────────────────────────────────────────────────────┘
   
   ┌─────────────────────────────────────────────────────┐
   │ HTML Pages                                           │
   │ → Network-First (5s timeout)                        │
   │ → Falls back to offline.html if offline             │
   └─────────────────────────────────────────────────────┘
   ```

3. **Offline Support:**
   - Users can still view cached pages when offline
   - Offline page shown when navigating to uncached routes
   - API calls queued for sync when back online

4. **PWA Features:**
   - Install prompt for "Add to Home Screen"
   - Works as standalone app when installed
   - Background sync for queued operations

---

## 📋 **Implementation Details**

### Service Worker Registration Flow

```javascript
// register-sw.js
1. Check if hostname === 'localhost' or '127.0.0.1'
   ├─ YES → Unregister service workers, clear caches, return early
   └─ NO → Continue to registration

2. Register service worker:
   ├─ Register /sw.js with scope '/'
   ├─ Set up update checks (every 60 seconds)
   ├─ Listen for update notifications
   └─ Handle install prompts
```

### Service Worker Fetch Handler

```javascript
// sw.js - fetch event
1. Check if hostname === 'localhost'
   ├─ YES → Return immediately (no interception)
   └─ NO → Continue to routing

2. Route request based on type:
   ├─ Static assets → Cache-first
   ├─ Images → Cache-first (with size limit)
   ├─ OpenAI API → Network-only
   ├─ Other APIs → Network-first
   └─ HTML pages → Network-first
```

---

## 🔐 **Security & Privacy**

### What's NOT Cached

1. **OpenAI API Calls** - Never cached (privacy + freshness)
   - `/api/chat/completions`
   - `/api/embeddings`
   - Direct calls to `api.openai.com`

2. **User Data** - Not stored in service worker cache
   - User authentication
   - Credit card data
   - Personal information

3. **POST/PUT/DELETE Requests** - Service worker only handles GET requests

### What IS Cached (Safely)

1. **Static Assets** - Public JavaScript, CSS, fonts
2. **Images** - Public images (with size limits)
3. **HTML Pages** - Cached for offline viewing (non-sensitive pages)

---

## 🧪 **Testing Production Behavior**

### Test Service Worker Locally

You can test production behavior locally by:

1. **Build for production:**
   ```bash
   npm run build
   npm start
   ```

2. **Use a production-like domain:**
   - Edit `/etc/hosts` to map `vitta.local` to `127.0.0.1`
   - Access via `http://vitta.local:3000`
   - Service worker will register as production

### Verify Service Worker in Production

1. Open DevTools → Application tab
2. Check Service Workers section:
   - Should show registered service worker
   - Status: "activated and is running"
3. Check Cache Storage:
   - Should see cache versions (e.g., `vitta-v2-static`)
   - Should contain cached assets

---

## 📊 **Performance Benefits in Production**

1. **Faster Load Times:**
   - Static assets served from cache (instant)
   - Images cached locally
   - Reduced server load

2. **Offline Capability:**
   - App works offline for cached pages
   - Better user experience on poor connections

3. **Bandwidth Savings:**
   - Reduced data usage for repeat visits
   - Faster subsequent page loads

4. **PWA Installation:**
   - Users can install app to home screen
   - Works like native app

---

## 🔄 **Update Mechanism**

When you deploy a new version:

1. **Service worker detects update:**
   - Checks for new version every 60 seconds
   - Compares file hash/version

2. **New service worker installs:**
   - Downloads new `sw.js` in background
   - Prepares new cache

3. **User notification:**
   - App can show "Update available" message
   - User refreshes to activate new version

4. **Cache cleanup:**
   - Old caches automatically deleted
   - Only current version cached

---

## 🐛 **Troubleshooting**

### Service Worker Not Registering in Production

**Check:**
1. Domain is not localhost
2. HTTPS enabled (required for service workers)
3. `sw.js` file accessible at `/sw.js`
4. Browser console for registration errors

### Service Worker Stuck / Not Updating

**Solution:**
1. Unregister service worker in DevTools
2. Clear all caches
3. Hard refresh page

### Cached Content Not Updating

**Solution:**
1. Service worker checks for updates every 60 seconds
2. Or manually trigger update in DevTools
3. Or change cache version in `sw.js` (line 13: `CACHE_VERSION`)

---

## 📝 **Summary**

| Feature | Development | Production |
|---------|------------|------------|
| Service Worker | ❌ Disabled | ✅ Enabled |
| Caching | ❌ None | ✅ Full caching |
| Offline Support | ❌ No | ✅ Yes |
| PWA Install | ❌ No | ✅ Yes |
| Hot Reload | ✅ Works | ❌ N/A |
| API Interception | ❌ No | ✅ Yes (network-first) |
| OpenAI API Caching | ❌ N/A | ❌ Never cached |

---

## 🔗 **Related Files**

- `public/sw.js` - Service worker implementation
- `public/register-sw.js` - Service worker registration
- `public/manifest.json` - PWA manifest
- `pages/_document.js` - HTML document with inline cleanup script

