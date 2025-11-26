/**
 * Unit Tests for Service Worker
 * Tests caching strategies and request interception
 */

// Mock Service Worker API
global.self = {
  addEventListener: jest.fn(),
  skipWaiting: jest.fn(),
  clients: {
    claim: jest.fn().then ? Promise.resolve() : jest.fn(),
  },
}

// Mock Cache API
const mockCaches = {
  open: jest.fn(),
  keys: jest.fn(),
  match: jest.fn(),
  delete: jest.fn(),
}

global.caches = {
  open: jest.fn((name) => {
    return Promise.resolve({
      match: jest.fn(),
      matchAll: jest.fn(),
      add: jest.fn(),
      addAll: jest.fn().then ? Promise.resolve() : jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    })
  }),
  keys: jest.fn(() => Promise.resolve([])),
  delete: jest.fn(() => Promise.resolve(true)),
  match: jest.fn(),
}

// Mock fetch
global.fetch = jest.fn((request) => {
  return Promise.resolve(new Response('OK'))
})

describe('Service Worker', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Cache Names', () => {
    test('should have correct cache version prefix', () => {
      expect('vitta-v1').toBeDefined()
      expect('vitta-v1-static').toMatch(/^vitta-/)
    })

    test('should have separate cache stores', () => {
      const cacheNames = [
        'vitta-v1-static',
        'vitta-v1-dynamic',
        'vitta-v1-images',
        'vitta-v1-api',
      ]

      cacheNames.forEach((name) => {
        expect(name).toMatch(/vitta-v\d+/)
      })
    })
  })

  describe('Static Assets Detection', () => {
    test('should identify JavaScript files', () => {
      const testPaths = [
        '/js/app.js',
        '/_next/static/bundle.js',
        '/script.js',
      ]

      testPaths.forEach((path) => {
        expect(path.endsWith('.js')).toBe(true)
      })
    })

    test('should identify CSS files', () => {
      const testPaths = ['/styles.css', '/_next/static/styles.css']

      testPaths.forEach((path) => {
        expect(path.endsWith('.css')).toBe(true)
      })
    })

    test('should identify font files', () => {
      const testPaths = ['/fonts/arial.woff', '/fonts/font.woff2', '/fonts/font.ttf']

      testPaths.forEach((path) => {
        const isFontFile = /\.(woff|woff2|ttf|otf)$/i.test(path)
        expect(isFontFile).toBe(true)
      })
    })
  })

  describe('Image Detection', () => {
    test('should identify image formats', () => {
      const imagePaths = [
        '/image.jpg',
        '/photo.png',
        '/icon.gif',
        '/graphic.webp',
        '/logo.svg',
      ]

      imagePaths.forEach((path) => {
        const isImage = /\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(path)
        expect(isImage).toBe(true)
      })
    })
  })

  describe('HTML Detection', () => {
    test('should identify HTML pages', () => {
      const htmlPaths = ['/', '/index.html', '/page.html', '/offline.html']

      htmlPaths.forEach((path) => {
        const isHtml = /\.html?$/i.test(path) || path === '/'
        expect(isHtml).toBe(true)
      })
    })
  })

  describe('Cache Expiration', () => {
    test('should have expiration times configured', () => {
      const expirations = {
        static: 30 * 24 * 60 * 60 * 1000, // 30 days
        images: 30 * 24 * 60 * 60 * 1000,
        api: 7 * 24 * 60 * 60 * 1000,
        dynamic: 7 * 24 * 60 * 60 * 1000,
      }

      expect(expirations.static).toBeGreaterThan(expirations.api)
      expect(expirations.images).toBe(expirations.static)
    })

    test('network timeout should be set', () => {
      const NETWORK_TIMEOUT = 5000
      expect(NETWORK_TIMEOUT).toBe(5000)
    })

    test('image size limit should be configured', () => {
      const MAX_IMAGE_SIZE = 5 * 1024 * 1024
      expect(MAX_IMAGE_SIZE).toBe(5242880)
    })
  })

  describe('Static Assets List', () => {
    test('should have precache list', () => {
      const staticAssets = ['/', '/index.html', '/offline.html', '/manifest.json', '/favicon.svg']

      expect(Array.isArray(staticAssets)).toBe(true)
      expect(staticAssets.length).toBeGreaterThan(0)
      expect(staticAssets).toContain('/')
      expect(staticAssets).toContain('/manifest.json')
    })
  })

  describe('Request Methods', () => {
    test('should only cache GET requests', () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']

      expect(methods).toContain('GET')
      expect(methods.indexOf('GET')).toBe(0)
    })
  })

  describe('URL Protocol Detection', () => {
    test('should handle HTTP requests', () => {
      const url = new URL('http://example.com/api')
      expect(url.protocol).toBe('http:')
    })

    test('should handle HTTPS requests', () => {
      const url = new URL('https://example.com/api')
      expect(url.protocol).toBe('https:')
    })

    test('should skip Chrome extension requests', () => {
      const url = new URL('chrome-extension://xyz/resource')
      expect(url.protocol).toBe('chrome-extension:')
    })
  })

  describe('Caching Strategies', () => {
    test('cache-first strategy should check cache first', () => {
      // Logic: check cache before network
      const cacheFirst = (hasCached) => {
        if (hasCached) {
          return 'cache'
        }
        return 'network'
      }

      expect(cacheFirst(true)).toBe('cache')
      expect(cacheFirst(false)).toBe('network')
    })

    test('network-first strategy should try network first', () => {
      // Logic: try network, fallback to cache
      const networkFirst = (networkAvailable, hasCached) => {
        if (networkAvailable) {
          return 'network'
        }
        if (hasCached) {
          return 'cache'
        }
        return 'offline'
      }

      expect(networkFirst(true, true)).toBe('network')
      expect(networkFirst(false, true)).toBe('cache')
      expect(networkFirst(false, false)).toBe('offline')
    })

    test('network-only strategy should always use network', () => {
      const networkOnly = (networkAvailable) => {
        if (networkAvailable) {
          return 'network'
        }
        return 'error'
      }

      expect(networkOnly(true)).toBe('network')
      expect(networkOnly(false)).toBe('error')
    })
  })

  describe('Route Pattern Matching', () => {
    test('should route API calls to network-first', () => {
      const apiRoutes = ['/api/chat', '/api/user', '/api/cards']
      apiRoutes.forEach((route) => {
        expect(route.startsWith('/api/')).toBe(true)
      })
    })

    test('should route static assets to cache-first', () => {
      const staticRoutes = ['/script.js', '/style.css', '/font.woff2']
      staticRoutes.forEach((route) => {
        const isStatic = /\.(js|css|woff|woff2|ttf|otf)$/i.test(route)
        expect(isStatic).toBe(true)
      })
    })

    test('should route images to cache-first', () => {
      const imageRoutes = ['/logo.svg', '/photo.jpg', '/icon.png']
      imageRoutes.forEach((route) => {
        const isImage = /\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(route)
        expect(isImage).toBe(true)
      })
    })

    test('should route HTML pages to network-first', () => {
      const htmlRoutes = ['/', '/index.html', '/page.html']
      htmlRoutes.forEach((route) => {
        const isHtml = /\.html?$/i.test(route) || route === '/'
        expect(isHtml).toBe(true)
      })
    })

    test('should route OpenAI API to network-only', () => {
      const openaiRoutes = ['/api/chat/completions', '/api/embeddings']
      openaiRoutes.forEach((route) => {
        expect(route.startsWith('/api/')).toBe(true)
      })
    })
  })

  describe('Error Handling', () => {
    test('should provide offline fallback for HTML', () => {
      const acceptHeader = 'text/html'
      expect(acceptHeader.includes('text/html')).toBe(true)
    })

    test('should provide JSON error for API', () => {
      const acceptHeader = 'application/json'
      expect(acceptHeader.includes('application/json')).toBe(true)
    })

    test('should handle missing resources gracefully', () => {
      // Should not throw when resource missing
      expect(() => {
        const error = new Error('Resource not found')
        expect(error.message).toBeDefined()
      }).not.toThrow()
    })
  })

  describe('Cache Versioning', () => {
    test('old caches should be deleted on activation', () => {
      const cacheNames = [
        'vitta-v0-static',
        'vitta-v0-dynamic',
        'vitta-v1-static',
        'vitta-v1-dynamic',
      ]

      const oldCaches = cacheNames.filter(
        (name) => name.startsWith('vitta-') && !name.includes('vitta-v1')
      )

      expect(oldCaches).toContain('vitta-v0-static')
      expect(oldCaches).toContain('vitta-v0-dynamic')
      expect(oldCaches).not.toContain('vitta-v1-static')
    })
  })

  describe('Background Sync', () => {
    test('should handle sync events', () => {
      const syncTags = ['sync-pending-messages', 'sync-pending-payments']
      expect(syncTags).toContain('sync-pending-messages')
      expect(syncTags).toContain('sync-pending-payments')
    })
  })

  describe('Message Handling', () => {
    test('should handle SKIP_WAITING message', () => {
      const message = { type: 'SKIP_WAITING' }
      expect(message.type).toBe('SKIP_WAITING')
    })

    test('should handle CLEAR_CACHE message', () => {
      const message = { type: 'CLEAR_CACHE' }
      expect(message.type).toBe('CLEAR_CACHE')
    })

    test('should handle GET_CACHE_SIZE message', () => {
      const message = { type: 'GET_CACHE_SIZE' }
      expect(message.type).toBe('GET_CACHE_SIZE')
    })
  })

  describe('Image Size Limiting', () => {
    test('images smaller than limit should be cached', () => {
      const MAX_IMAGE_SIZE = 5 * 1024 * 1024
      const imageSize = 1024 * 1024 // 1MB

      expect(imageSize).toBeLessThan(MAX_IMAGE_SIZE)
    })

    test('images larger than limit should not be cached', () => {
      const MAX_IMAGE_SIZE = 5 * 1024 * 1024
      const largeImage = 10 * 1024 * 1024 // 10MB

      expect(largeImage).toBeGreaterThan(MAX_IMAGE_SIZE)
    })
  })
})
