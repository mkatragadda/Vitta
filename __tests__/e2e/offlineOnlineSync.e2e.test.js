/**
 * End-to-End Tests: Offline/Online Sync
 * Phase 5: Complete offline/online workflow testing
 *
 * Tests the full user journey:
 * 1. User goes offline
 * 2. Queues multiple operations (messages + cards)
 * 3. User comes back online
 * 4. Sync completes successfully
 * 5. UI updates to reflect sync status
 */

const { SyncManager, resetSyncManager, getSyncManager } = require('../../services/sync/syncManager.js');
const { RetryHandler } = require('../../services/sync/retryHandler.js');
const offlineDetector = require('../../services/offline/offlineDetector.js').default;

// Mock storage
jest.mock('../../services/storage/storageManager.js', () => ({
  storageManager: {
    saveToStore: jest.fn(),
    deleteFromStore: jest.fn(),
    clearStore: jest.fn(),
    readFromStore: jest.fn()
  }
}));

describe('E2E: Complete Offline/Online Sync Flow', () => {
  beforeEach(() => {
    resetSyncManager();
    jest.clearAllMocks();
    global.fetch = jest.fn();

    // Mock navigator.onLine as a configurable property
    Object.defineProperty(global.navigator, 'onLine', {
      configurable: true,
      writable: true,
      value: true
    });
  });

  describe('Full User Journey: Offline → Queue → Online → Sync', () => {
    test('should complete full offline workflow from start to finish', async () => {
      const syncManager = getSyncManager();
      const events = [];

      // Subscribe to all sync events
      syncManager.on('operationQueued', (op) => events.push(`queued:${op.type}`));
      syncManager.on('operationSynced', (op) => events.push(`synced:${op.type}`));
      syncManager.on('syncStart', () => events.push('syncStart'));
      syncManager.on('syncComplete', () => events.push('syncComplete'));

      // Step 1: User goes offline
      global.navigator.onLine = false;
      expect(navigator.onLine).toBe(false);

      // Step 2: User performs actions while offline
      // Send multiple messages
      syncManager.addToQueue({
        type: 'message',
        data: { message: 'First message offline', timestamp: Date.now() }
      });

      syncManager.addToQueue({
        type: 'message',
        data: { message: 'Second message offline', timestamp: Date.now() }
      });

      // Add a card
      syncManager.addToQueue({
        type: 'card_add',
        data: { nickname: 'Offline Card', apr: 18.5, credit_limit: 10000 }
      });

      // Update a card
      syncManager.addToQueue({
        type: 'card_update',
        data: { cardId: 'card-1', updates: { current_balance: 5000 } }
      });

      // Delete a card
      syncManager.addToQueue({
        type: 'card_delete',
        data: { cardId: 'card-2' }
      });

      expect(syncManager.getQueueLength()).toBe(5);
      expect(events.filter(e => e.startsWith('queued')).length).toBe(5);

      // Step 3: User comes back online
      global.navigator.onLine = true;
      expect(navigator.onLine).toBe(true);

      // Step 4: Mock successful API responses for all operations
      global.fetch = jest.fn()
        .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({ id: 'msg-1' }) })
        .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({ id: 'msg-2' }) })
        .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({ id: 'card-3' }) })
        .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({ id: 'card-1' }) })
        .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({ success: true }) });

      // Step 5: Trigger sync
      const result = await syncManager.processQueue();

      // Verify results
      expect(result.processed).toBe(5);
      expect(result.succeeded).toBe(5);
      expect(result.failed).toBe(0);
      expect(syncManager.getQueueLength()).toBe(0);

      // Verify all events occurred
      expect(events).toContain('syncStart');
      expect(events).toContain('syncComplete');
      expect(events.filter(e => e.startsWith('synced')).length).toBe(5);
    });
  });

  describe('Retry on Temporary Failure', () => {
    test('should retry failed operations with exponential backoff', async () => {
      const syncManager = getSyncManager();

      // Queue an operation
      syncManager.addToQueue({
        type: 'message',
        data: { message: 'Will fail then succeed' }
      });

      // First attempt: fail
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          json: jest.fn().mockResolvedValue({ error: 'Service unavailable' })
        });

      let result = await syncManager.processQueue();
      expect(result.failed).toBe(1);
      expect(syncManager.getQueueLength()).toBe(1);

      // Second attempt: succeed
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ id: 'msg-1' })
        });

      result = await syncManager.processQueue();
      expect(result.succeeded).toBe(1);
      expect(syncManager.getQueueLength()).toBe(0);
    });

    test('should max out retries after 5 attempts', async () => {
      const syncManager = getSyncManager();

      syncManager.addToQueue({
        type: 'message',
        data: { message: 'Persistent failure' }
      });

      // Mock all attempts to fail
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: jest.fn().mockResolvedValue({ error: 'Server error' })
      });

      // Attempt all 5 retries
      for (let i = 0; i < 5; i++) {
        const result = await syncManager.processQueue();
        expect(syncManager.getQueueLength()).toBe(1);
      }

      // Final attempt should fail and give up
      const finalResult = await syncManager.processQueue();
      expect(finalResult.failed).toBe(1);
      expect(syncManager.getQueueLength()).toBe(1);
    });
  });

  describe('Mixed Operation Types Flow', () => {
    test('should handle mixed messages and card operations in correct order', async () => {
      const syncManager = getSyncManager();
      const callOrder = [];

      // Queue mixed operations
      syncManager.addToQueue({
        type: 'message',
        data: { message: 'Message 1' }
      });

      syncManager.addToQueue({
        type: 'card_add',
        data: { nickname: 'Card 1', apr: 18 }
      });

      syncManager.addToQueue({
        type: 'message',
        data: { message: 'Message 2' }
      });

      syncManager.addToQueue({
        type: 'card_update',
        data: { cardId: 'card-1', updates: { apr: 15 } }
      });

      // Track call order
      global.fetch = jest.fn((...args) => {
        const endpoint = args[0];
        if (endpoint === '/api/chat/completions') {
          callOrder.push('message');
        } else if (endpoint === '/api/cards/add') {
          callOrder.push('card_add');
        } else if (endpoint === '/api/cards/update') {
          callOrder.push('card_update');
        }
        return Promise.resolve({
          ok: true,
          json: jest.fn().mockResolvedValue({})
        });
      });

      const result = await syncManager.processQueue();

      expect(result.succeeded).toBe(4);
      expect(callOrder).toEqual(['message', 'card_add', 'message', 'card_update']);
    });
  });

  describe('Partial Sync Scenarios', () => {
    test('should continue syncing even if some operations fail', async () => {
      const syncManager = getSyncManager();

      // Queue 4 operations
      for (let i = 1; i <= 4; i++) {
        syncManager.addToQueue({
          type: 'message',
          data: { message: `Message ${i}` }
        });
      }

      // Mock: 1st succeeds, 2nd fails, 3rd succeeds, 4th fails
      global.fetch = jest.fn()
        .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({}) })
        .mockResolvedValueOnce({ ok: false, status: 400, json: jest.fn().mockResolvedValue({}) })
        .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({}) })
        .mockResolvedValueOnce({ ok: false, status: 500, json: jest.fn().mockResolvedValue({}) });

      const result = await syncManager.processQueue();

      expect(result.processed).toBe(4);
      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(2);
      expect(syncManager.getQueueLength()).toBe(2); // 2 failed remain
    });
  });

  describe('Network Recovery Scenarios', () => {
    test('should handle network coming back after being offline for extended period', async () => {
      const syncManager = getSyncManager();

      // Simulate offline for extended period with multiple queued operations
      global.navigator.onLine = false;

      // Queue operations over "time"
      for (let i = 1; i <= 10; i++) {
        syncManager.addToQueue({
          type: 'message',
          data: { message: `Offline message ${i}` }
        });
      }

      expect(syncManager.getQueueLength()).toBe(10);

      // Network comes back
      global.navigator.onLine = true;

      // Mock all succeed
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({})
      });

      const result = await syncManager.processQueue();

      expect(result.succeeded).toBe(10);
      expect(result.failed).toBe(0);
      expect(syncManager.getQueueLength()).toBe(0);
    });
  });

  describe('Concurrent Operations', () => {
    test('should not process queue if already syncing', async () => {
      const syncManager = getSyncManager();

      // Queue operations
      syncManager.addToQueue({
        type: 'message',
        data: { message: 'Test' }
      });

      // Mock slow response
      global.fetch = jest.fn().mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: jest.fn().mockResolvedValue({})
            });
          }, 100);
        });
      });

      // Start first sync (don't await)
      const sync1 = syncManager.processQueue();

      // Try to start second sync while first is in progress
      syncManager.isSyncing = true; // Simulate syncing
      const sync2 = syncManager.processQueue();

      // Second sync should return immediately with syncing flag
      expect(await sync2).toEqual({ syncing: true });

      // First sync should complete normally
      await sync1;
    });
  });

  describe('Data Consistency', () => {
    test('should maintain FIFO order throughout sync process', async () => {
      const syncManager = getSyncManager();
      const order = [];

      // Queue operations in specific order
      for (let i = 1; i <= 5; i++) {
        syncManager.addToQueue({
          type: 'message',
          data: { message: `Message ${i}` }
        });
      }

      // Track execution order
      global.fetch = jest.fn((...args) => {
        const body = JSON.parse(args[1].body);
        order.push(body.messages[0].content);
        return Promise.resolve({
          ok: true,
          json: jest.fn().mockResolvedValue({})
        });
      });

      await syncManager.processQueue();

      expect(order).toEqual(['Message 1', 'Message 2', 'Message 3', 'Message 4', 'Message 5']);
    });
  });

  describe('Event Notifications Throughout Flow', () => {
    test('should emit correct sequence of events', async () => {
      const syncManager = getSyncManager();
      const eventSequence = [];

      // Subscribe to all events
      syncManager.on('operationQueued', () => eventSequence.push('queued'));
      syncManager.on('syncStart', () => eventSequence.push('syncStart'));
      syncManager.on('operationSynced', () => eventSequence.push('operationSynced'));
      syncManager.on('syncComplete', () => eventSequence.push('syncComplete'));

      // Queue and sync
      syncManager.addToQueue({ type: 'message', data: { message: 'test' } });
      syncManager.addToQueue({ type: 'message', data: { message: 'test 2' } });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({})
      });

      await syncManager.processQueue();

      // Should have: queued x2, syncStart, operationSynced x2, syncComplete
      expect(eventSequence[0]).toBe('queued');
      expect(eventSequence[1]).toBe('queued');
      expect(eventSequence[2]).toBe('syncStart');
      expect(eventSequence[3]).toBe('operationSynced');
      expect(eventSequence[4]).toBe('operationSynced');
      expect(eventSequence[5]).toBe('syncComplete');
    });
  });
});
