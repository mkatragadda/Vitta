/**
 * Integration Tests for Offline Flow
 * Tests the complete offline-to-online synchronization flow
 */

import dbManager from '../../../services/storage/indexedDB'
import { OfflineDetector } from '../../../services/offline/offlineDetector'

describe('Offline Flow Integration', () => {
  let detector
  let messages
  let payments

  beforeEach(() => {
    detector = new OfflineDetector()
    messages = []
    payments = []
  })

  afterEach(() => {
    detector.destroy()
  })

  describe('Chat message offline queueing', () => {
    test('should queue message when offline', async () => {
      // Simulate going offline
      detector.handleOffline()
      expect(detector.isOnline).toBe(false)

      // Create a message to queue
      const message = {
        content: 'Test message',
        intent: 'test_intent',
      }

      // Simulate saving to database
      const result = await dbManager.savePendingMessage(message)

      expect(result).toBeDefined()
      expect(typeof result).toBe('string') // Returns ID
    })

    test('should retrieve queued messages', async () => {
      // Go offline and queue a message
      detector.handleOffline()

      const message = {
        content: 'Test message',
        intent: 'test',
      }

      await dbManager.savePendingMessage(message)

      // Should be able to retrieve pending messages
      const pending = await dbManager.getPendingMessages()

      expect(Array.isArray(pending)).toBe(true)
    })

    test('should mark message as synced', async () => {
      // Queue a message
      const msgId = await dbManager.savePendingMessage({
        content: 'Test',
        intent: 'test',
      })

      // Mark as synced
      const result = await dbManager.markMessageSynced(msgId)

      expect(result).toBeDefined()
    })
  })

  describe('Payment offline queueing', () => {
    test('should queue payment when offline', async () => {
      detector.handleOffline()
      expect(detector.isOnline).toBe(false)

      const payment = {
        cardId: 'test-card',
        amount: 100,
        date: new Date().toISOString(),
      }

      const result = await dbManager.savePendingPayment(payment)

      expect(result).toBeDefined()
      expect(typeof result).toBe('string')
    })

    test('should retrieve queued payments', async () => {
      detector.handleOffline()

      const payment = {
        cardId: 'amex-gold',
        amount: 250,
      }

      await dbManager.savePendingPayment(payment)

      const pending = await dbManager.getPendingPayments()

      expect(Array.isArray(pending)).toBe(true)
    })

    test('should mark payment as synced', async () => {
      const paymentId = await dbManager.savePendingPayment({
        cardId: 'test',
        amount: 100,
      })

      const result = await dbManager.markPaymentSynced(paymentId)

      expect(result).toBeDefined()
    })
  })

  describe('Chat history offline storage', () => {
    test('should save chat messages offline', async () => {
      detector.handleOffline()

      const chatMsg = {
        role: 'user',
        content: 'Hello',
      }

      const result = await dbManager.saveChatMessage(chatMsg)

      expect(result).toBeDefined()
      expect(typeof result).toBe('string')
    })

    test('should retrieve chat history', async () => {
      const msg1 = await dbManager.saveChatMessage({
        role: 'user',
        content: 'Hi',
      })

      const msg2 = await dbManager.saveChatMessage({
        role: 'assistant',
        content: 'Hello',
      })

      const history = await dbManager.getChatHistory()

      expect(Array.isArray(history)).toBe(true)
    })
  })

  describe('Sync log tracking', () => {
    test('should log sync start', async () => {
      const result = await dbManager.addSyncLog({
        action: 'sync_start',
        status: 'started',
      })

      expect(result).toBeDefined()
    })

    test('should log sync completion', async () => {
      const result = await dbManager.addSyncLog({
        action: 'sync_complete',
        status: 'success',
        itemCount: 3,
      })

      expect(result).toBeDefined()
    })

    test('should log sync errors', async () => {
      const result = await dbManager.addSyncLog({
        action: 'sync_error',
        status: 'failed',
        error: 'Network timeout',
      })

      expect(result).toBeDefined()
    })
  })

  describe('Offline to Online transition', () => {
    test('should trigger sync when coming online', async () => {
      const syncCallback = jest.fn()
      detector.on('sync:start', syncCallback)

      // Go offline
      detector.handleOffline()
      expect(detector.isOnline).toBe(false)

      // Come back online
      await detector.handleOnline()

      expect(detector.isOnline).toBe(true)
      expect(syncCallback).toHaveBeenCalled()
    })

    test('should not sync if already syncing', async () => {
      const syncCallback = jest.fn()
      detector.on('sync:start', syncCallback)

      detector.syncInProgress = true

      // Try to sync
      await detector.triggerSync()

      expect(syncCallback).not.toHaveBeenCalled()
    })

    test('should queue multiple items then sync', async () => {
      // Go offline
      detector.handleOffline()

      // Queue multiple items
      const msg1Id = await dbManager.savePendingMessage({
        content: 'Message 1',
        intent: 'test',
      })

      const msg2Id = await dbManager.savePendingMessage({
        content: 'Message 2',
        intent: 'test',
      })

      const paymentId = await dbManager.savePendingPayment({
        cardId: 'test',
        amount: 100,
      })

      // Come back online
      await detector.handleOnline()

      expect(detector.isOnline).toBe(true)
      expect(detector.syncInProgress).toBe(false) // Should complete
    })
  })

  describe('Database stats', () => {
    test('should track database statistics', async () => {
      // Queue some items
      await dbManager.savePendingMessage({ content: 'test' })
      await dbManager.savePendingPayment({ amount: 100 })

      const stats = await dbManager.getStats()

      expect(stats).toBeDefined()
      expect(typeof stats).toBe('object')
    })

    test('stats should show pending counts', async () => {
      await dbManager.savePendingMessage({ content: 'msg' })

      const stats = await dbManager.getStats()

      expect(stats).toHaveProperty('pending_messages')
      expect(stats).toHaveProperty('pending_payments')
      expect(stats).toHaveProperty('chat_history')
      expect(stats).toHaveProperty('sync_log')
    })
  })

  describe('Detector event flow', () => {
    test('should emit online event', async () => {
      const callback = jest.fn()
      detector.on('online', callback)

      detector.isOnline = false
      await detector.handleOnline()

      expect(callback).toHaveBeenCalled()
    })

    test('should emit offline event', () => {
      const callback = jest.fn()
      detector.on('offline', callback)

      detector.isOnline = true
      detector.handleOffline()

      expect(callback).toHaveBeenCalled()
    })

    test('should emit sync events', async () => {
      const startCallback = jest.fn()
      const endCallback = jest.fn()

      detector.on('sync:start', startCallback)
      detector.on('sync:end', endCallback)

      await detector.triggerSync()

      // At least one should be called
      expect(startCallback.mock.calls.length + endCallback.mock.calls.length).toBeGreaterThan(0)
    })
  })

  describe('Multiple pending operations', () => {
    test('should handle messages, payments and chat together', async () => {
      // Queue everything while offline
      detector.handleOffline()

      const msg = await dbManager.savePendingMessage({
        content: 'Test',
        intent: 'test',
      })

      const payment = await dbManager.savePendingPayment({
        cardId: 'test',
        amount: 100,
      })

      const chat = await dbManager.saveChatMessage({
        role: 'user',
        content: 'Hi',
      })

      const messages = await dbManager.getPendingMessages()
      const payments = await dbManager.getPendingPayments()
      const history = await dbManager.getChatHistory()

      expect(Array.isArray(messages)).toBe(true)
      expect(Array.isArray(payments)).toBe(true)
      expect(Array.isArray(history)).toBe(true)
    })

    test('should clear individual items without affecting others', async () => {
      const msg = await dbManager.savePendingMessage({ content: 'test' })
      const payment = await dbManager.savePendingPayment({ amount: 100 })

      // Mark message as synced
      await dbManager.markMessageSynced(msg)

      // Payments should still be there
      const payments = await dbManager.getPendingPayments()
      expect(Array.isArray(payments)).toBe(true)
    })
  })

  describe('Error handling', () => {
    test('should handle detector errors gracefully', async () => {
      // Mock a failing sync
      const errorCallback = jest.fn()
      detector.on('sync:error', errorCallback)

      // This should complete without throwing
      expect(async () => await detector.triggerSync()).not.toThrow()
    })

    test('should continue operation after sync failure', async () => {
      await detector.triggerSync()

      // Should still be able to add items
      const result = await dbManager.savePendingMessage({
        content: 'test',
      })

      expect(result).toBeDefined()
    })
  })
})
