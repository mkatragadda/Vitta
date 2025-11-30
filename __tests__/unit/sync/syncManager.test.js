/**
 * SyncManager Unit Tests
 * Tests queue management, sync operations, and event handling
 */

const { SyncManager, resetSyncManager } = require('../../../services/sync/syncManager.js');

// Mock dependencies
jest.mock('../../../services/storage/storageManager.js', () => ({
  storageManager: {
    saveToStore: jest.fn(),
    deleteFromStore: jest.fn(),
    clearStore: jest.fn(),
    readFromStore: jest.fn()
  }
}));

describe('SyncManager', () => {
  let syncManager;
  const { storageManager } = require('../../../services/storage/storageManager.js');

  beforeEach(() => {
    resetSyncManager();
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('queue management', () => {
    test('should add operation to queue', () => {
      const operation = {
        type: 'message',
        data: { message: 'test message' }
      };

      const syncManager = new SyncManager();
      const opId = syncManager.addToQueue(operation);

      expect(opId).toBeDefined();
      expect(syncManager.getQueueLength()).toBe(1);
      expect(storageManager.saveToStore).toHaveBeenCalled();
    });

    test('should add multiple operations to queue', () => {
      const syncManager = new SyncManager();
      syncManager.addToQueue({ type: 'message', data: { message: 'msg1' } });
      syncManager.addToQueue({ type: 'card_add', data: { name: 'Amex' } });
      syncManager.addToQueue({ type: 'card_update', data: { apr: 5.5 } });

      expect(syncManager.getQueueLength()).toBe(3);
    });

    test('should generate unique operation IDs', () => {
      const syncManager = new SyncManager();
      const id1 = syncManager.addToQueue({ type: 'message', data: {} });
      const id2 = syncManager.addToQueue({ type: 'message', data: {} });
      const id3 = syncManager.addToQueue({ type: 'message', data: {} });

      expect(id1).not.toEqual(id2);
      expect(id2).not.toEqual(id3);
      expect(id1).not.toEqual(id3);
    });

    test('should return array of queue items', () => {
      const syncManager = new SyncManager();
      syncManager.addToQueue({ type: 'message', data: { message: 'test' } });
      syncManager.addToQueue({ type: 'card_add', data: { name: 'Amex' } });

      const items = syncManager.getQueueItems();
      expect(items.length).toBe(2);
      expect(items[0].type).toBe('message');
      expect(items[1].type).toBe('card_add');
    });

    test('should clear entire queue', () => {
      const syncManager = new SyncManager();
      syncManager.addToQueue({ type: 'message', data: {} });
      syncManager.addToQueue({ type: 'message', data: {} });

      expect(syncManager.getQueueLength()).toBe(2);

      syncManager.clearQueue();
      expect(syncManager.getQueueLength()).toBe(0);
      expect(storageManager.clearStore).toHaveBeenCalledWith('offlineQueue');
    });
  });

  describe('sync status', () => {
    test('should start with idle status', () => {
      const syncManager = new SyncManager();
      expect(syncManager.getSyncStatus()).toBe('idle');
    });

    test('should return queue length', () => {
      const syncManager = new SyncManager();
      expect(syncManager.getQueueLength()).toBe(0);

      syncManager.addToQueue({ type: 'message', data: {} });
      expect(syncManager.getQueueLength()).toBe(1);

      syncManager.addToQueue({ type: 'message', data: {} });
      expect(syncManager.getQueueLength()).toBe(2);
    });
  });

  describe('event handling', () => {
    test('should emit operationQueued event', (done) => {
      const syncManager = new SyncManager();
      const operation = { type: 'message', data: { message: 'test' } };

      syncManager.on('operationQueued', (queuedOp) => {
        expect(queuedOp.type).toBe('message');
        expect(queuedOp.data.message).toBe('test');
        done();
      });

      syncManager.addToQueue(operation);
    });

    test('should emit syncStart event', (done) => {
      const syncManager = new SyncManager();
      syncManager.addToQueue({ type: 'message', data: {} });

      syncManager.on('syncStart', (data) => {
        expect(data.queueSize).toBe(1);
        done();
      });

      // Mock successful sync
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ id: 'msg-1' })
      });

      syncManager.processQueue();
    });

    test('should allow multiple listeners on same event', () => {
      const syncManager = new SyncManager();
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      syncManager.on('operationQueued', callback1);
      syncManager.on('operationQueued', callback2);

      syncManager.addToQueue({ type: 'message', data: {} });

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    test('should unregister event listener', () => {
      const syncManager = new SyncManager();
      const callback = jest.fn();

      syncManager.on('operationQueued', callback);
      syncManager.off('operationQueued', callback);

      syncManager.addToQueue({ type: 'message', data: {} });

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('processQueue', () => {
    test('should return immediately if syncing already in progress', async () => {
      const syncManager = new SyncManager();
      syncManager.addToQueue({ type: 'message', data: {} });
      syncManager.isSyncing = true;

      const result = await syncManager.processQueue();
      expect(result.syncing).toBe(true);
    });

    test('should return success if queue is empty', async () => {
      const syncManager = new SyncManager();
      const result = await syncManager.processQueue();

      expect(result.success).toBe(true);
      expect(result.processed).toBe(0);
    });

    test('should process queued messages', async () => {
      const syncManager = new SyncManager();
      syncManager.addToQueue({ type: 'message', data: { message: 'test msg' } });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({})
      });

      const result = await syncManager.processQueue();

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/chat/completions',
        expect.objectContaining({
          method: 'POST'
        })
      );
    });

    test('should handle sync failures with retry', async () => {
      const syncManager = new SyncManager();
      syncManager.addToQueue({ type: 'message', data: { message: 'test' } });

      // Mock failed response
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: jest.fn().mockResolvedValue({ error: 'Server error' })
      });

      const result = await syncManager.processQueue();

      expect(result.failed).toBe(1);
      expect(result.succeeded).toBe(0);
    });

    test('should update queue length after sync', async () => {
      const syncManager = new SyncManager();
      syncManager.addToQueue({ type: 'message', data: { message: 'test' } });

      expect(syncManager.getQueueLength()).toBe(1);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({})
      });

      await syncManager.processQueue();

      // After successful sync, queue should be cleared
      expect(syncManager.getQueueLength()).toBe(0);
    });
  });

  describe('operation types', () => {
    test('should handle message type', async () => {
      const syncManager = new SyncManager();
      syncManager.addToQueue({
        type: 'message',
        data: { message: 'Hello' }
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({})
      });

      await syncManager.processQueue();

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/chat/completions',
        expect.any(Object)
      );
    });

    test('should handle card_add type', async () => {
      const syncManager = new SyncManager();
      syncManager.addToQueue({
        type: 'card_add',
        data: { name: 'Amex Gold' }
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({})
      });

      await syncManager.processQueue();

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/cards/add',
        expect.any(Object)
      );
    });

    test('should handle card_update type', async () => {
      const syncManager = new SyncManager();
      syncManager.addToQueue({
        type: 'card_update',
        data: { cardId: '123', updates: { apr: 5.5 } }
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({})
      });

      await syncManager.processQueue();

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/cards/update',
        expect.any(Object)
      );
    });

    test('should handle card_delete type', async () => {
      const syncManager = new SyncManager();
      syncManager.addToQueue({
        type: 'card_delete',
        data: { cardId: '123' }
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({})
      });

      await syncManager.processQueue();

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/cards/123',
        expect.any(Object)
      );
    });
  });

  describe('singleton pattern', () => {
    test('should reuse same instance with getSyncManager', () => {
      const { getSyncManager } = require('../../../services/sync/syncManager.js');

      const manager1 = getSyncManager();
      const manager2 = getSyncManager();

      expect(manager1).toBe(manager2);
    });

    test('should reset to new instance', () => {
      const { getSyncManager, resetSyncManager } = require('../../../services/sync/syncManager.js');

      const manager1 = getSyncManager();
      resetSyncManager();
      const manager2 = getSyncManager();

      expect(manager1).not.toBe(manager2);
    });
  });

  describe('partial queue processing', () => {
    test('should continue processing if one operation fails', async () => {
      const syncManager = new SyncManager();
      syncManager.addToQueue({ type: 'message', data: { message: 'msg1' } });
      syncManager.addToQueue({ type: 'message', data: { message: 'msg2' } });
      syncManager.addToQueue({ type: 'message', data: { message: 'msg3' } });

      // First fails, second succeeds, third succeeds
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: jest.fn().mockResolvedValue({ error: 'Bad request' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({})
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({})
        });

      const result = await syncManager.processQueue();

      expect(result.failed).toBe(1);
      expect(result.succeeded).toBe(2);
    });
  });
});
