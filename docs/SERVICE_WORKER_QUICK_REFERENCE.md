# Service Worker: Quick Reference

## 🎯 **How It Works**

### Development (localhost:3000) → Service Worker **OFF**
```
User Request → Browser → Next.js Dev Server
✅ Direct connection, no caching
✅ Hot reload works
✅ API calls go directly
```

### Production (app.getvitta.com) → Service Worker **ON**
```
User Request → Service Worker → Network/Cache
✅ Caches static assets
✅ Offline support
✅ Faster load times
✅ PWA capabilities
```

---

## 🔄 **Production Flow**

### 1. **First Visit**
```
1. User visits app.getvitta.com
2. Service worker registers
3. Pre-caches: HTML, CSS, JS, manifest, icons
4. User can use app normally
```

### 2. **Subsequent Visits**
```
1. User visits app.getvitta.com
2. Service worker intercepts requests
3. Static assets served from cache (instant)
4. API calls: Try network first, fallback to cache
5. Faster load times!
```

### 3. **Offline Usage**
```
1. User goes offline
2. Service worker intercepts requests
3. Cached pages work normally
4. Uncached pages show offline.html
5. API calls queued for sync when back online
```

---

## 📦 **What Gets Cached in Production**

| Resource Type | Strategy | Duration | Offline? |
|--------------|----------|----------|----------|
| JavaScript/CSS | Cache-First | 30 days | ✅ Yes |
| Images | Cache-First | 30 days | ✅ Yes |
| HTML Pages | Network-First | 7 days | ✅ Yes |
| API Calls | Network-First | 7 days | ⚠️ Limited |
| OpenAI API | Network-Only | Never | ❌ No |

---

## 🚫 **What's NEVER Cached** (Privacy)

1. **OpenAI API responses** - Always fresh, never cached
2. **User authentication** - Not stored
3. **Credit card data** - Not stored
4. **POST/PUT/DELETE requests** - Not intercepted

---

## ✅ **Current Setup Status**

✅ **Development**: Service worker disabled (localhost)
✅ **Production**: Service worker fully enabled (any other domain)
✅ **Security**: OpenAI API never cached
✅ **Performance**: Static assets cached for speed
✅ **Offline**: Works offline for cached content

---

## 🔍 **Verify Production Works**

After deploying to production:

1. Open your production URL (e.g., `app.getvitta.com`)
2. Open DevTools → Application tab
3. Check "Service Workers":
   - Should show: "activated and is running"
4. Check "Cache Storage":
   - Should see caches like `vitta-v2-static`
5. Test offline:
   - Go offline in DevTools
   - Refresh page
   - Should still see cached content

---

## 📝 **Key Files**

- `public/sw.js` - Service worker logic (auto-detects dev vs prod)
- `public/register-sw.js` - Registration script (auto-detects dev vs prod)
- `pages/_document.js` - Includes inline cleanup for dev
- `public/manifest.json` - PWA manifest

**No configuration needed** - it automatically detects the environment!

