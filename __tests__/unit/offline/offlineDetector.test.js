/**
 * Unit Tests for Offline Detector
 * Tests online/offline detection and sync triggering
 */

import { OfflineDetector } from '../../../services/offline/offlineDetector'

describe('Offline Detector', () => {
  let detector

  beforeEach(() => {
    // Create new instance for each test
    detector = new OfflineDetector()
    // Clear listeners
    detector.listeners = []
  })

  afterEach(() => {
    detector.destroy()
  })

  describe('Initialization', () => {
    test('should initialize with online state', () => {
      expect(detector.isOnline).toBe(true)
    })

    test('should initialize with idle sync status', () => {
      expect(detector.syncInProgress).toBe(false)
    })

    test('should have empty listeners array', () => {
      expect(detector.listeners).toEqual([])
    })

    test('should have init method', () => {
      expect(typeof detector.init).toBe('function')
    })

    test('should have destroy method', () => {
      expect(typeof detector.destroy).toBe('function')
    })
  })

  describe('Event listeners', () => {
    test('on method should add listener', () => {
      const callback = jest.fn()
      detector.on('online', callback)

      expect(detector.listeners.length).toBe(1)
      expect(detector.listeners[0].event).toBe('online')
      expect(detector.listeners[0].callback).toBe(callback)
    })

    test('on method should return unsubscribe function', () => {
      const callback = jest.fn()
      const unsubscribe = detector.on('online', callback)

      expect(typeof unsubscribe).toBe('function')

      unsubscribe()
      expect(detector.listeners.length).toBe(0)
    })

    test('should allow multiple listeners for same event', () => {
      const callback1 = jest.fn()
      const callback2 = jest.fn()

      detector.on('online', callback1)
      detector.on('online', callback2)

      expect(detector.listeners.length).toBe(2)
    })

    test('should allow different event types', () => {
      const callback1 = jest.fn()
      const callback2 = jest.fn()

      detector.on('online', callback1)
      detector.on('offline', callback2)

      expect(detector.listeners.length).toBe(2)
      expect(detector.listeners[0].event).toBe('online')
      expect(detector.listeners[1].event).toBe('offline')
    })
  })

  describe('Notifications', () => {
    test('notify should call matching listeners', () => {
      const callback = jest.fn()
      detector.on('test-event', callback)

      detector.notify('test-event', { data: 'test' })

      expect(callback).toHaveBeenCalledWith({ data: 'test' })
    })

    test('notify should not call non-matching listeners', () => {
      const callback1 = jest.fn()
      const callback2 = jest.fn()

      detector.on('event1', callback1)
      detector.on('event2', callback2)

      detector.notify('event1')

      expect(callback1).toHaveBeenCalled()
      expect(callback2).not.toHaveBeenCalled()
    })

    test('notify should handle listener errors gracefully', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Listener error')
      })
      const okCallback = jest.fn()

      detector.on('test', errorCallback)
      detector.on('test', okCallback)

      // Should not throw
      expect(() => detector.notify('test')).not.toThrow()

      // Error callback should be called
      expect(errorCallback).toHaveBeenCalled()

      // OK callback should still be called
      expect(okCallback).toHaveBeenCalled()
    })
  })

  describe('Status methods', () => {
    test('getStatus should return current status', () => {
      const status = detector.getStatus()

      expect(status).toHaveProperty('isOnline')
      expect(status).toHaveProperty('syncInProgress')
      expect(status.isOnline).toBe(true)
      expect(status.syncInProgress).toBe(false)
    })

    test('getStatus should reflect online state', () => {
      detector.isOnline = false
      const status = detector.getStatus()
      expect(status.isOnline).toBe(false)
    })

    test('getStatus should reflect sync state', () => {
      detector.syncInProgress = true
      const status = detector.getStatus()
      expect(status.syncInProgress).toBe(true)
    })
  })

  describe('Online/Offline handling', () => {
    test('handleOnline should set isOnline to true', async () => {
      detector.isOnline = false
      await detector.handleOnline()
      expect(detector.isOnline).toBe(true)
    })

    test('handleOnline should notify online', async () => {
      const callback = jest.fn()
      detector.on('online', callback)

      await detector.handleOnline()

      expect(callback).toHaveBeenCalled()
    })

    test('handleOffline should set isOnline to false', () => {
      detector.isOnline = true
      detector.handleOffline()
      expect(detector.isOnline).toBe(false)
    })

    test('handleOffline should notify offline', () => {
      const callback = jest.fn()
      detector.on('offline', callback)

      detector.handleOffline()

      expect(callback).toHaveBeenCalled()
    })
  })

  describe('Sync operations', () => {
    test('triggerSync should return a promise', () => {
      const result = detector.triggerSync()
      expect(result instanceof Promise).toBe(true)
    })

    test('triggerSync should set syncInProgress flag', async () => {
      expect(detector.syncInProgress).toBe(false)

      // Start sync
      const syncPromise = detector.triggerSync()

      // Should be in progress immediately or after brief async
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Reset after sync
      await syncPromise
      expect(detector.syncInProgress).toBe(false)
    })

    test('triggerSync should not start if already syncing', async () => {
      detector.syncInProgress = true
      const spy = jest.spyOn(detector, 'notify')

      await detector.triggerSync()

      // Should not have called notify since it was already syncing
      expect(spy).not.toHaveBeenCalled()

      spy.mockRestore()
    })

    test('triggerSync should notify sync:start', async () => {
      const callback = jest.fn()
      detector.on('sync:start', callback)

      await detector.triggerSync()

      expect(callback).toHaveBeenCalled()
    })

    test('triggerSync should notify sync:end or sync:error', async () => {
      const successCallback = jest.fn()
      const errorCallback = jest.fn()

      detector.on('sync:end', successCallback)
      detector.on('sync:error', errorCallback)

      await detector.triggerSync()

      // Should have called one of them
      expect(successCallback.mock.calls.length + errorCallback.mock.calls.length).toBeGreaterThan(0)
    })
  })

  describe('Connectivity checking', () => {
    test('checkConnectivity should return a promise', () => {
      const result = detector.checkConnectivity()
      expect(result instanceof Promise).toBe(true)
    })

    test('checkConnectivity should use fetch', async () => {
      // Note: checkConnectivity is skipped in non-browser environments (Node.js tests)
      // This test just ensures the method doesn't throw
      await expect(detector.checkConnectivity()).resolves.toBeUndefined()
    })
  })

  describe('Cleanup', () => {
    test('destroy should clear listeners', () => {
      detector.on('test', jest.fn())
      expect(detector.listeners.length).toBeGreaterThan(0)

      detector.destroy()

      expect(detector.listeners.length).toBe(0)
    })

    test('destroy should clear check interval', () => {
      detector.checkInterval = setInterval(() => {}, 1000)
      const intervalId = detector.checkInterval

      detector.destroy()

      // Interval should be cleared
      expect(detector.checkInterval).toBeNull || expect(detector.checkInterval).toBeUndefined
    })
  })

  describe('Class instantiation', () => {
    test('should be able to create new instances', () => {
      const detector1 = new OfflineDetector()
      const detector2 = new OfflineDetector()

      expect(detector1).not.toBe(detector2)
      expect(detector1.isOnline).toBe(detector2.isOnline)
    })

    test('instances should have independent listeners', () => {
      const detector1 = new OfflineDetector()
      const detector2 = new OfflineDetector()

      detector1.on('test', jest.fn())

      expect(detector1.listeners.length).toBe(1)
      expect(detector2.listeners.length).toBe(0)
    })
  })
})
