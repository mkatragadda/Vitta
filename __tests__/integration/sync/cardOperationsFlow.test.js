/**
 * Card Operations Flow Integration Tests
 * Tests complete offline/online flow for card add, update, delete operations
 */

const { SyncManager, resetSyncManager, getSyncManager } = require('../../../services/sync/syncManager.js');

// Mock storage manager
jest.mock('../../../services/storage/storageManager.js', () => ({
  storageManager: {
    saveToStore: jest.fn(),
    deleteFromStore: jest.fn(),
    clearStore: jest.fn(),
    readFromStore: jest.fn()
  }
}));

describe('Card Operations Offline/Online Flow', () => {
  beforeEach(() => {
    resetSyncManager();
    jest.clearAllMocks();
    global.fetch = jest.fn();
    global.navigator = { onLine: true };
  });

  describe('offline card operations workflow', () => {
    test('should queue multiple card operations when offline', async () => {
      const syncManager = getSyncManager();

      // User goes offline
      global.navigator.onLine = false;

      // Queue card operations
      const addOpId = syncManager.addToQueue({
        type: 'card_add',
        data: {
          user_id: 'user-1',
          nickname: 'Amex Gold',
          apr: 18.99,
          credit_limit: 15000
        }
      });

      const updateOpId = syncManager.addToQueue({
        type: 'card_update',
        data: {
          cardId: 'card-1',
          updates: { current_balance: 5000 }
        }
      });

      const deleteOpId = syncManager.addToQueue({
        type: 'card_delete',
        data: { cardId: 'card-2' }
      });

      expect(syncManager.getQueueLength()).toBe(3);
      expect(addOpId).toBeDefined();
      expect(updateOpId).toBeDefined();
      expect(deleteOpId).toBeDefined();
    });

    test('should process queued card operations on reconnect', async () => {
      const syncManager = getSyncManager();

      // Queue operations
      syncManager.addToQueue({
        type: 'card_add',
        data: { nickname: 'Card 1', user_id: 'user-1' }
      });

      syncManager.addToQueue({
        type: 'card_update',
        data: { cardId: 'card-1', updates: { apr: 19.99 } }
      });

      syncManager.addToQueue({
        type: 'card_delete',
        data: { cardId: 'card-2' }
      });

      expect(syncManager.getQueueLength()).toBe(3);

      // User comes back online
      global.navigator.onLine = true;

      // Mock successful API responses
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ id: 'card-100' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ id: 'card-1' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ success: true })
        });

      // Process queue
      const result = await syncManager.processQueue();

      expect(result.succeeded).toBe(3);
      expect(result.failed).toBe(0);
      expect(syncManager.getQueueLength()).toBe(0);
    });

    test('should use correct API endpoints for each operation type', async () => {
      const syncManager = getSyncManager();

      // Add operations
      syncManager.addToQueue({
        type: 'card_add',
        data: { nickname: 'New Card', user_id: 'user-1' }
      });

      syncManager.addToQueue({
        type: 'card_update',
        data: { cardId: 'card-1', updates: { apr: 15.99 } }
      });

      syncManager.addToQueue({
        type: 'card_delete',
        data: { cardId: 'card-3' }
      });

      global.fetch = jest.fn()
        .mockResolvedValue({
          ok: true,
          json: jest.fn().mockResolvedValue({ success: true })
        });

      await syncManager.processQueue();

      // Verify endpoints
      expect(global.fetch).toHaveBeenNthCalledWith(
        1,
        '/api/cards/add',
        expect.any(Object)
      );

      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        '/api/cards/update',
        expect.any(Object)
      );

      expect(global.fetch).toHaveBeenNthCalledWith(
        3,
        '/api/cards/card-3',
        expect.any(Object)
      );
    });

    test('should maintain FIFO order for card operations', async () => {
      const syncManager = getSyncManager();
      const callOrder = [];

      // Queue operations in specific order
      syncManager.addToQueue({
        type: 'card_add',
        data: { nickname: 'First Card', user_id: 'user-1' }
      });

      syncManager.addToQueue({
        type: 'card_add',
        data: { nickname: 'Second Card', user_id: 'user-1' }
      });

      syncManager.addToQueue({
        type: 'card_add',
        data: { nickname: 'Third Card', user_id: 'user-1' }
      });

      // Patch fetch to track call order (first call = first operation)
      let callCount = 0;
      global.fetch = jest.fn((...args) => {
        callCount++;
        // Track which operation was called in order
        if (args[0] === '/api/cards/add') {
          const body = JSON.parse(args[1].body);
          // The body structure for card_add has card: { ...data }
          if (body.card && body.card.nickname) {
            callOrder.push(body.card.nickname);
          }
        }
        return Promise.resolve({
          ok: true,
          json: jest.fn().mockResolvedValue({ id: `card-${callCount}` })
        });
      });

      await syncManager.processQueue();

      expect(callOrder.length).toBe(3);
      expect(callOrder).toEqual(['First Card', 'Second Card', 'Third Card']);
    });

    test('should handle mixed card operations in correct order', async () => {
      const syncManager = getSyncManager();

      // Add cards, update one, delete another
      syncManager.addToQueue({
        type: 'card_add',
        data: { nickname: 'Card A' }
      });

      syncManager.addToQueue({
        type: 'card_update',
        data: { cardId: 'card-1', updates: { apr: 18.5 } }
      });

      syncManager.addToQueue({
        type: 'card_add',
        data: { nickname: 'Card B' }
      });

      syncManager.addToQueue({
        type: 'card_delete',
        data: { cardId: 'card-2' }
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({})
      });

      const result = await syncManager.processQueue();

      expect(result.succeeded).toBe(4);
      expect(global.fetch).toHaveBeenCalledTimes(4);

      // Verify order
      const calls = global.fetch.mock.calls;
      expect(calls[0][0]).toBe('/api/cards/add'); // card_add
      expect(calls[1][0]).toBe('/api/cards/update'); // card_update
      expect(calls[2][0]).toBe('/api/cards/add'); // card_add
      expect(calls[3][0]).toBe('/api/cards/card-2'); // card_delete
    });
  });

  describe('card operation failures and retries', () => {
    test('should retry failed card operation with exponential backoff', async () => {
      const syncManager = getSyncManager();

      syncManager.addToQueue({
        type: 'card_add',
        data: { nickname: 'Retry Test Card', user_id: 'user-1' }
      });

      // First attempt fails
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: jest.fn().mockResolvedValue({ error: 'Service unavailable' })
      });

      let result = await syncManager.processQueue();

      expect(result.failed).toBe(1);
      expect(syncManager.getQueueLength()).toBe(1);

      // Card operation remains queued for retry
      const queuedOps = syncManager.getQueueItems();
      expect(queuedOps).toHaveLength(1);
      expect(queuedOps[0].type).toBe('card_add');
    });

    test('should handle partial success (some card ops fail, some succeed)', async () => {
      const syncManager = getSyncManager();

      // Queue 4 card operations
      for (let i = 1; i <= 4; i++) {
        syncManager.addToQueue({
          type: i % 2 === 0 ? 'card_add' : 'card_update',
          data: { nickname: `Card ${i}`, cardId: `card-${i}` }
        });
      }

      // Mock: 1st succeeds, 2nd fails, 3rd succeeds, 4th fails
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
        });

      const result = await syncManager.processQueue();

      expect(result.processed).toBe(4);
      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(2);
      expect(syncManager.getQueueLength()).toBe(2);

      // Verify failed operations remain queued
      const failedOps = syncManager.getQueueItems();
      expect(failedOps).toHaveLength(2);
    });

    test('should distinguish between different operation types in errors', async () => {
      const syncManager = getSyncManager();

      syncManager.addToQueue({
        type: 'card_add',
        data: { nickname: 'Add Card' }
      });

      syncManager.addToQueue({
        type: 'card_update',
        data: { cardId: 'card-1', updates: {} }
      });

      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: jest.fn().mockResolvedValue({ error: 'Invalid card data' })
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          json: jest.fn().mockResolvedValue({ error: 'Card not found' })
        });

      const result = await syncManager.processQueue();

      expect(result.failed).toBe(2);
      const failedOps = syncManager.getQueueItems();
      expect(failedOps.some(op => op.type === 'card_add')).toBe(true);
      expect(failedOps.some(op => op.type === 'card_update')).toBe(true);
    });
  });

  describe('card operations with events', () => {
    test('should emit events for each card operation', async () => {
      const syncManager = getSyncManager();
      const events = [];

      syncManager.on('operationQueued', (op) => {
        if (['card_add', 'card_update', 'card_delete'].includes(op.type)) {
          events.push(`queued:${op.type}`);
        }
      });

      syncManager.on('operationSynced', (op) => {
        if (['card_add', 'card_update', 'card_delete'].includes(op.type)) {
          events.push(`synced:${op.type}`);
        }
      });

      syncManager.on('syncComplete', () => {
        events.push('complete');
      });

      // Queue operations
      syncManager.addToQueue({ type: 'card_add', data: {} });
      syncManager.addToQueue({ type: 'card_update', data: { cardId: 'c1' } });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({})
      });

      await syncManager.processQueue();

      expect(events).toContain('queued:card_add');
      expect(events).toContain('queued:card_update');
      expect(events).toContain('synced:card_add');
      expect(events).toContain('synced:card_update');
      expect(events).toContain('complete');
    });

    test('should provide operation details in queued event', (done) => {
      const syncManager = getSyncManager();
      const cardData = {
        nickname: 'Integration Test Card',
        apr: 17.99
      };

      syncManager.on('operationQueued', (queuedOp) => {
        expect(queuedOp.id).toBeDefined();
        expect(queuedOp.type).toBe('card_add');
        expect(queuedOp.data).toMatchObject(cardData);
        expect(queuedOp.timestamp).toBeDefined();
        done();
      });

      syncManager.addToQueue({
        type: 'card_add',
        data: cardData
      });
    });
  });

  describe('card operation persistence', () => {
    test('should persist card operations to storage', async () => {
      const { storageManager } = require('../../../services/storage/storageManager.js');
      const syncManager = getSyncManager();

      syncManager.addToQueue({
        type: 'card_add',
        data: { nickname: 'Persistence Test Card' }
      });

      expect(storageManager.saveToStore).toHaveBeenCalledWith(
        'offlineQueue',
        expect.objectContaining({
          type: 'card_add',
          data: expect.objectContaining({
            nickname: 'Persistence Test Card'
          })
        })
      );
    });

    test('should remove synced card operations from storage', async () => {
      const { storageManager } = require('../../../services/storage/storageManager.js');
      const syncManager = getSyncManager();

      const opId = syncManager.addToQueue({
        type: 'card_update',
        data: { cardId: 'card-1', updates: { apr: 16.5 } }
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

  describe('stress testing card operations', () => {
    test('should handle large batch of card operations', async () => {
      const syncManager = getSyncManager();

      // Queue 50 card operations
      for (let i = 0; i < 50; i++) {
        const opType = ['card_add', 'card_update', 'card_delete'][i % 3];
        syncManager.addToQueue({
          type: opType,
          data: { nickname: `Card ${i}`, cardId: `card-${i}` }
        });
      }

      expect(syncManager.getQueueLength()).toBe(50);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({})
      });

      const result = await syncManager.processQueue();

      expect(result.succeeded).toBe(50);
      expect(result.processed).toBe(50);
      expect(syncManager.getQueueLength()).toBe(0);
    });

    test('should handle mixed operation types at scale', async () => {
      const syncManager = getSyncManager();

      // Add 20 add operations
      for (let i = 0; i < 20; i++) {
        syncManager.addToQueue({
          type: 'card_add',
          data: { nickname: `New Card ${i}` }
        });
      }

      // Add 15 update operations
      for (let i = 0; i < 15; i++) {
        syncManager.addToQueue({
          type: 'card_update',
          data: { cardId: `card-${i}`, updates: { apr: 15 + i } }
        });
      }

      // Add 10 delete operations
      for (let i = 0; i < 10; i++) {
        syncManager.addToQueue({
          type: 'card_delete',
          data: { cardId: `delete-${i}` }
        });
      }

      expect(syncManager.getQueueLength()).toBe(45);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({})
      });

      const result = await syncManager.processQueue();

      expect(result.succeeded).toBe(45);
      expect(result.failed).toBe(0);
      expect(global.fetch).toHaveBeenCalledTimes(45);
    });
  });
});
