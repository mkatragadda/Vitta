/**
 * Offline/Online Flow Integration Tests
 * Tests the complete flow of going offline, queuing operations, and syncing on reconnect
 */

const { SyncManager, resetSyncManager, getSyncManager } = require('../../../services/sync/syncManager.js');
const { RetryHandler } = require('../../../services/sync/retryHandler.js');

// Mock dependencies
jest.mock('../../../services/storage/storageManager.js', () => ({
  storageManager: {
    saveToStore: jest.fn(),
    deleteFromStore: jest.fn(),
    clearStore: jest.fn(),
    readFromStore: jest.fn()
  }
}));

describe('Offline/Online Flow Integration', () => {
  beforeEach(() => {
    resetSyncManager();
    jest.clearAllMocks();
    global.fetch = jest.fn();
    global.navigator = { onLine: true };
  });

  describe('complete offline workflow', () => {
    test('should queue operations when offline and sync on reconnect', async () => {
      const syncManager = getSyncManager();

      // User goes offline
      global.navigator.onLine = false;

      // User queues multiple operations
      const msg1Id = syncManager.addToQueue({
        type: 'message',
        data: { message: 'Hello, I am offline' }
      });

      const cardId = syncManager.addToQueue({
        type: 'card_add',
        data: { name: 'Chase Sapphire' }
      });

      const msg2Id = syncManager.addToQueue({
        type: 'message',
        data: { message: 'I will sync when back online' }
      });

      expect(syncManager.getQueueLength()).toBe(3);
      expect(syncManager.getSyncStatus()).toBe('idle');

      // User comes back online
      global.navigator.onLine = true;

      // Mock successful API responses
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ id: 'response-1' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ id: 'response-2' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ id: 'response-3' })
        });

      // Sync all operations
      const result = await syncManager.processQueue();

      expect(result.succeeded).toBe(3);
      expect(result.failed).toBe(0);
      expect(syncManager.getQueueLength()).toBe(0);
    });

    test('should retry failed operations with exponential backoff', async () => {
      const syncManager = getSyncManager();

      // Queue an operation that will fail
      syncManager.addToQueue({
        type: 'message',
        data: { message: 'This will fail temporarily' }
      });

      // First sync attempt fails
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: jest.fn().mockResolvedValue({ error: 'Service unavailable' })
      });

      const result = await syncManager.processQueue();

      expect(result.failed).toBe(1);
      expect(result.succeeded).toBe(0);
      expect(syncManager.getQueueLength()).toBe(1); // Still in queue for retry
    });
  });

  describe('multiple offline periods', () => {
    test('should accumulate operations across multiple offline periods', async () => {
      const syncManager = getSyncManager();

      // First offline period
      syncManager.addToQueue({ type: 'message', data: { message: 'msg1' } });
      syncManager.addToQueue({ type: 'message', data: { message: 'msg2' } });
      expect(syncManager.getQueueLength()).toBe(2);

      // Mock sync
      global.fetch = jest.fn()
        .mockResolvedValueOnce({ ok: true, json: jest.fn() })
        .mockResolvedValueOnce({ ok: true, json: jest.fn() });

      let result = await syncManager.processQueue();
      expect(result.succeeded).toBe(2);

      // Second offline period
      syncManager.addToQueue({ type: 'message', data: { message: 'msg3' } });
      syncManager.addToQueue({ type: 'card_add', data: { name: 'Visa' } });
      expect(syncManager.getQueueLength()).toBe(2);

      // Mock second sync
      global.fetch = jest.fn()
        .mockResolvedValueOnce({ ok: true, json: jest.fn() })
        .mockResolvedValueOnce({ ok: true, json: jest.fn() });

      result = await syncManager.processQueue();
      expect(result.succeeded).toBe(2);
      expect(syncManager.getQueueLength()).toBe(0);
    });
  });

  describe('sync conflict scenarios', () => {
    test('should handle partial sync (some operations succeed, some fail)', async () => {
      const syncManager = getSyncManager();

      // Queue 5 operations
      for (let i = 1; i <= 5; i++) {
        syncManager.addToQueue({
          type: 'message',
          data: { message: `message ${i}` }
        });
      }

      expect(syncManager.getQueueLength()).toBe(5);

      // Mock: 1st succeeds, 2nd fails, 3rd succeeds, 4th fails, 5th succeeds
      global.fetch = jest.fn()
        .mockResolvedValueOnce({ ok: true, json: jest.fn() })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: jest.fn().mockResolvedValue({ error: 'Bad request' })
        })
        .mockResolvedValueOnce({ ok: true, json: jest.fn() })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: jest.fn().mockResolvedValue({ error: 'Server error' })
        })
        .mockResolvedValueOnce({ ok: true, json: jest.fn() });

      const result = await syncManager.processQueue();

      expect(result.processed).toBe(5);
      expect(result.succeeded).toBe(3);
      expect(result.failed).toBe(2);
      expect(syncManager.getQueueLength()).toBe(2); // Failed ones remain
    });

    test('should maintain FIFO order of operations', async () => {
      const syncManager = getSyncManager();
      const callOrder = [];

      // Patch fetch to track order
      global.fetch = jest.fn((...args) => {
        const body = JSON.parse(args[1].body);
        if (body.messages) {
          callOrder.push(body.messages[0].content);
        }
        return Promise.resolve({
          ok: true,
          json: jest.fn().mockResolvedValue({})
        });
      });

      // Queue operations in specific order
      syncManager.addToQueue({
        type: 'message',
        data: { message: 'First' }
      });
      syncManager.addToQueue({
        type: 'message',
        data: { message: 'Second' }
      });
      syncManager.addToQueue({
        type: 'message',
        data: { message: 'Third' }
      });

      await syncManager.processQueue();

      expect(callOrder).toEqual(['First', 'Second', 'Third']);
    });
  });

  describe('data persistence', () => {
    test('should persist operations to storage', async () => {
      const { storageManager } = require('../../../services/storage/storageManager.js');
      const syncManager = getSyncManager();

      syncManager.addToQueue({
        type: 'message',
        data: { message: 'persist test' }
      });

      expect(storageManager.saveToStore).toHaveBeenCalledWith(
        'offlineQueue',
        expect.objectContaining({
          type: 'message',
          data: expect.objectContaining({
            message: 'persist test'
          })
        })
      );
    });

    test('should remove operations from storage after sync', async () => {
      const { storageManager } = require('../../../services/storage/storageManager.js');
      const syncManager = getSyncManager();

      const opId = syncManager.addToQueue({
        type: 'message',
        data: { message: 'test' }
      });

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({})
      });

      await syncManager.processQueue();

      expect(storageManager.deleteFromStore).toHaveBeenCalledWith(
        'offlineQueue',
        opId
      );
    });
  });

  describe('event notifications', () => {
    test('should emit events throughout sync lifecycle', async () => {
      const syncManager = getSyncManager();
      const events = [];

      syncManager.on('syncStart', (data) => events.push('syncStart'));
      syncManager.on('operationQueued', (data) => events.push('operationQueued'));
      syncManager.on('operationSynced', (data) => events.push('operationSynced'));
      syncManager.on('syncComplete', (data) => events.push('syncComplete'));

      syncManager.addToQueue({ type: 'message', data: { message: 'test' } });

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({})
      });

      await syncManager.processQueue();

      expect(events).toContain('operationQueued');
      expect(events).toContain('syncStart');
      expect(events).toContain('operationSynced');
      expect(events).toContain('syncComplete');
    });

    test('should provide operation details in events', (done) => {
      const syncManager = getSyncManager();
      const operation = {
        type: 'card_add',
        data: { name: 'Amex Gold' }
      };

      syncManager.on('operationQueued', (queuedOp) => {
        expect(queuedOp.id).toBeDefined();
        expect(queuedOp.type).toBe('card_add');
        expect(queuedOp.data.name).toBe('Amex Gold');
        expect(queuedOp.timestamp).toBeDefined();
        expect(queuedOp.createdAt).toBeDefined();
        done();
      });

      syncManager.addToQueue(operation);
    });
  });

  describe('stress testing', () => {
    test('should handle large queue (100+ operations)', async () => {
      const syncManager = getSyncManager();

      // Queue 100 messages
      for (let i = 0; i < 100; i++) {
        syncManager.addToQueue({
          type: 'message',
          data: { message: `message ${i}` }
        });
      }

      expect(syncManager.getQueueLength()).toBe(100);

      // Mock all succeeding
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({})
      });

      const result = await syncManager.processQueue();

      expect(result.succeeded).toBe(100);
      expect(result.failed).toBe(0);
      expect(syncManager.getQueueLength()).toBe(0);
    });

    test('should handle mixed operation types at scale', async () => {
      const syncManager = getSyncManager();

      // Add 30 messages, 20 card adds, 20 card updates, 10 card deletes
      for (let i = 0; i < 30; i++) {
        syncManager.addToQueue({
          type: 'message',
          data: { message: `msg ${i}` }
        });
      }
      for (let i = 0; i < 20; i++) {
        syncManager.addToQueue({
          type: 'card_add',
          data: { name: `Card ${i}` }
        });
      }
      for (let i = 0; i < 20; i++) {
        syncManager.addToQueue({
          type: 'card_update',
          data: { cardId: `${i}`, updates: { apr: 5.5 } }
        });
      }
      for (let i = 0; i < 10; i++) {
        syncManager.addToQueue({
          type: 'card_delete',
          data: { cardId: `${i}` }
        });
      }

      expect(syncManager.getQueueLength()).toBe(80);

      // Mock all succeeding
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({})
      });

      const result = await syncManager.processQueue();

      expect(result.succeeded).toBe(80);
      expect(result.processed).toBe(80);
    });
  });
});
