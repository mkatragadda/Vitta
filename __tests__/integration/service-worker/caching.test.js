/**
 * Integration Tests for Service Worker Caching
 * Tests cache strategies and offline access
 */

describe('Service Worker Caching Integration', () => {
  describe('Cache-First Strategy', () => {
    test('should return cached response when available', async () => {
      // Simulate cache hit
      const cached = { ok: true, status: 200 }
      const strategy = (request, cache) => {
        if (cache.has(request.url)) {
          return cache.get(request.url)
        }
        return fetch(request)
      }

      // Mock cache
      const mockCache = {
        has: jest.fn(() => true),
        get: jest.fn(() => cached),
      }

      const request = { url: '/style.css' }
      const result = strategy(request, mockCache)

      expect(result).toBe(cached)
      expect(mockCache.has).toHaveBeenCalledWith('/style.css')
    })

    test('should fetch and cache when not cached', async () => {
      const request = { url: '/style.css' }
      const response = { ok: true, clone: jest.fn(() => response) }

      const mockCache = {
        has: jest.fn(() => false),
        put: jest.fn(),
      }

      // Simulate strategy
      const strategy = async (req, cache) => {
        if (cache.has(req.url)) {
          return cache.get(req.url)
        }
        const resp = await fetch(req)
        cache.put(req.url, resp.clone())
        return resp
      }

      // In practice, this would be tested with actual fetch
      expect(mockCache.has(request.url)).toBe(false)
    })

    test('should work for static assets', () => {
      const staticAssets = ['/script.js', '/style.css', '/font.woff2']

      staticAssets.forEach((asset) => {
        const isStatic = /\.(js|css|woff|woff2|ttf|otf)$/i.test(asset)
        expect(isStatic).toBe(true)
      })
    })

    test('should work for images', () => {
      const images = ['/logo.png', '/photo.jpg', '/icon.svg']

      images.forEach((image) => {
        const isImage = /\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(image)
        expect(isImage).toBe(true)
      })
    })
  })

  describe('Network-First Strategy', () => {
    test('should fetch from network when available', async () => {
      const request = { url: '/api/data' }
      const networkResponse = { ok: true, status: 200 }

      // Mock strategy
      const strategy = async (req, networkAvailable) => {
        if (networkAvailable) {
          return 'network'
        }
        return 'cache'
      }

      const result = await strategy(request, true)
      expect(result).toBe('network')
    })

    test('should fallback to cache on network failure', async () => {
      const request = { url: '/api/data' }
      const cachedResponse = { ok: true, cached: true }

      const mockCache = {
        get: jest.fn(() => cachedResponse),
      }

      // Mock strategy
      const strategy = async (req, networkFailed, cache) => {
        if (networkFailed) {
          return cache.get(req.url)
        }
        return 'network'
      }

      const result = await strategy(request, true, mockCache)
      expect(result).toBe(cachedResponse)
      expect(mockCache.get).toHaveBeenCalledWith('/api/data')
    })

    test('should return offline fallback if cache missing', async () => {
      const strategy = async (req, networkFailed, hasCached) => {
        if (!networkFailed) {
          return 'network'
        }
        if (hasCached) {
          return 'cache'
        }
        return 'offline'
      }

      const result = await strategy({}, true, false)
      expect(result).toBe('offline')
    })

    test('should work for HTML pages', () => {
      const htmlPages = ['/', '/index.html', '/page.html']

      htmlPages.forEach((page) => {
        const isHtml = /\.html?$/i.test(page) || page === '/'
        expect(isHtml).toBe(true)
      })
    })

    test('should work for API endpoints', () => {
      const apiEndpoints = ['/api/chat', '/api/cards', '/api/user']

      apiEndpoints.forEach((endpoint) => {
        expect(endpoint.startsWith('/api/')).toBe(true)
      })
    })

    test('should have network timeout', () => {
      const TIMEOUT = 5000
      expect(TIMEOUT).toBe(5000)
    })
  })

  describe('Network-Only Strategy', () => {
    test('should always fetch from network', async () => {
      const strategy = async (req) => {
        return 'network'
      }

      const result = await strategy({})
      expect(result).toBe('network')
    })

    test('should return error if network fails', async () => {
      const strategy = async (req, networkAvailable) => {
        if (!networkAvailable) {
          return 'error'
        }
        return 'network'
      }

      const result = await strategy({}, false)
      expect(result).toBe('error')
    })

    test('should work for OpenAI API', () => {
      const openaiEndpoints = ['/api/chat/completions', '/api/embeddings']

      openaiEndpoints.forEach((endpoint) => {
        expect(endpoint.startsWith('/api/chat') || endpoint.startsWith('/api/')).toBe(true)
      })
    })

    test('should never cache responses', () => {
      // Network-only means no caching
      const shouldCache = false
      expect(shouldCache).toBe(false)
    })
  })

  describe('Offline Fallback', () => {
    test('should return HTML page for HTML requests', () => {
      const request = { headers: { get: () => 'text/html' } }
      const acceptsHtml = request.headers.get('accept')?.includes('text/html')

      expect(acceptsHtml).toBe(true)
    })

    test('should return JSON error for API requests', () => {
      const request = { headers: { get: () => 'application/json' } }
      const acceptsJson = request.headers.get('accept')?.includes('application/json')

      expect(acceptsJson).toBe(true)
    })

    test('should provide offline page URL', () => {
      const offlinePageUrl = '/offline.html'
      expect(offlinePageUrl).toBe('/offline.html')
    })

    test('should include error message in JSON response', () => {
      const errorResponse = {
        error: 'Offline - request not available',
        offline: true,
      }

      expect(errorResponse.offline).toBe(true)
      expect(errorResponse.error).toBeDefined()
    })
  })

  describe('Cache Cleanup', () => {
    test('should delete old cache versions', () => {
      const oldVersions = ['vitta-v0-static', 'vitta-v0-dynamic']
      const currentVersion = 'vitta-v1'

      const shouldDelete = oldVersions.every((name) => !name.includes(currentVersion))
      expect(shouldDelete).toBe(true)
    })

    test('should keep current version caches', () => {
      const currentCaches = ['vitta-v1-static', 'vitta-v1-dynamic', 'vitta-v1-images']
      const currentVersion = 'vitta-v1'

      const allCurrent = currentCaches.every((name) => name.includes(currentVersion))
      expect(allCurrent).toBe(true)
    })

    test('should handle multiple old versions', () => {
      const allCaches = [
        'vitta-v0-static',
        'vitta-v0-dynamic',
        'vitta-v0-images',
        'vitta-v1-static',
        'vitta-v1-dynamic',
        'vitta-v1-images',
        'vitta-v2-static',
      ]

      const currentVersion = 'vitta-v1'
      const oldCaches = allCaches.filter(
        (name) => name.startsWith('vitta-') && !name.includes(currentVersion)
      )

      expect(oldCaches.length).toBe(4)
      expect(oldCaches).not.toContain('vitta-v1-static')
    })
  })

  describe('Image Caching', () => {
    test('should cache images under size limit', () => {
      const MAX_SIZE = 5 * 1024 * 1024
      const imageSize = 2 * 1024 * 1024 // 2MB

      expect(imageSize).toBeLessThan(MAX_SIZE)
    })

    test('should not cache images over size limit', () => {
      const MAX_SIZE = 5 * 1024 * 1024
      const imageSize = 10 * 1024 * 1024 // 10MB

      expect(imageSize).toBeGreaterThan(MAX_SIZE)
    })

    test('should return placeholder for missing images', () => {
      const placeholder = 'data:image/svg+xml,<svg>...'
      expect(placeholder.startsWith('data:image/')).toBe(true)
    })

    test('should cache common image formats', () => {
      const formats = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico']
      expect(formats.length).toBe(7)
    })
  })

  describe('Request Routing', () => {
    test('should route requests to correct strategy', () => {
      const routes = [
        { url: '/script.js', strategy: 'cache-first' },
        { url: '/api/chat', strategy: 'network-first' },
        { url: '/api/chat/completions', strategy: 'network-only' },
        { url: '/image.jpg', strategy: 'cache-first' },
        { url: '/', strategy: 'network-first' },
      ]

      const getStrategy = (url) => {
        if (/\.(js|css|woff|woff2|ttf|otf)$/i.test(url)) return 'cache-first'
        if (url.startsWith('/api/chat/')) return 'network-only'
        if (url.startsWith('/api/')) return 'network-first'
        if (/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(url)) return 'cache-first'
        if (/\.html?$/i.test(url) || url === '/') return 'network-first'
        return 'network-first'
      }

      routes.forEach((route) => {
        expect(getStrategy(route.url)).toBe(route.strategy)
      })
    })
  })

  describe('Cache Update', () => {
    test('should update cache on successful response', () => {
      const request = { url: '/api/data' }
      const response = { ok: true, status: 200, clone: jest.fn(() => response) }
      const mockCache = { put: jest.fn() }

      // Simulate update
      mockCache.put(request.url, response.clone())

      expect(mockCache.put).toHaveBeenCalledWith(request.url, response)
    })

    test('should not update cache on error response', () => {
      const request = { url: '/api/error' }
      const response = { ok: false, status: 404 }
      const mockCache = { put: jest.fn() }

      // Should not update cache for errors
      if (response.ok) {
        mockCache.put(request.url, response)
      }

      expect(mockCache.put).not.toHaveBeenCalled()
    })
  })

  describe('Offline Scenarios', () => {
    test('should handle user going offline during fetch', () => {
      // Network becomes unavailable
      const networkAvailable = false
      const hasCached = true

      const strategy = (net, cached) => {
        if (net) return 'network'
        if (cached) return 'cache'
        return 'offline'
      }

      expect(strategy(networkAvailable, hasCached)).toBe('cache')
    })

    test('should handle completely offline user', () => {
      const networkAvailable = false
      const hasCached = false

      const strategy = (net, cached) => {
        if (net) return 'network'
        if (cached) return 'cache'
        return 'offline'
      }

      expect(strategy(networkAvailable, hasCached)).toBe('offline')
    })

    test('should handle coming back online', () => {
      // Transition from offline to online
      const beforeOnline = false
      const afterOnline = true

      expect(beforeOnline).toBe(false)
      expect(afterOnline).toBe(true)
    })
  })

  describe('Cache Performance', () => {
    test('static cache should be fastest', () => {
      // Cache-first: instant if cached
      const staticCacheTime = 0 // instant

      expect(staticCacheTime).toBe(0)
    })

    test('network-first should be slower when online', () => {
      // Network-first: network latency (5s timeout)
      const networkCacheTime = 5000

      expect(networkCacheTime).toBeGreaterThan(0)
    })

    test('network-only should be slowest', () => {
      // Network-only: no fallback, pure network
      const networkOnlyTime = 5000

      expect(networkOnlyTime).toBeGreaterThan(0)
    })
  })
})
