/**
 * End-to-End Tests: Card Operation Integration
 * Phase 5: Complete card operation workflow testing
 *
 * Tests card-specific operations:
 * 1. Add card while offline
 * 2. Update card while offline
 * 3. Delete card while offline
 * 4. Mixed card and message operations
 * 5. Card operation sync and persistence
 */

const { SyncManager, resetSyncManager, getSyncManager } = require('../../services/sync/syncManager.js');

jest.mock('../../services/storage/storageManager.js', () => ({
  storageManager: {
    saveToStore: jest.fn(),
    deleteFromStore: jest.fn(),
    clearStore: jest.fn(),
    readFromStore: jest.fn()
  }
}));

describe('E2E: Card Operation Integration', () => {
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

  describe('Complete Card Management Workflow', () => {
    test('should complete full card add → update → delete workflow offline', async () => {
      const syncManager = getSyncManager();
      global.navigator.onLine = false;

      // Step 1: Add a card
      const addOpId = syncManager.addToQueue({
        type: 'card_add',
        data: {
          nickname: 'New Card',
          apr: 18.99,
          credit_limit: 15000,
          user_id: 'user-1'
        }
      });

      // Step 2: Update the card (simulating getting updated APR)
      const updateOpId = syncManager.addToQueue({
        type: 'card_update',
        data: {
          cardId: 'card-1',
          updates: { apr: 17.99, current_balance: 5000 }
        }
      });

      // Step 3: Update again (paying down balance)
      const update2OpId = syncManager.addToQueue({
        type: 'card_update',
        data: {
          cardId: 'card-1',
          updates: { current_balance: 2500 }
        }
      });

      // Step 4: Delete the card (user closed it)
      const deleteOpId = syncManager.addToQueue({
        type: 'card_delete',
        data: { cardId: 'card-1' }
      });

      expect(syncManager.getQueueLength()).toBe(4);

      // Go online and sync
      global.navigator.onLine = true;

      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ id: 'card-1' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ id: 'card-1' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ id: 'card-1' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ success: true })
        });

      const result = await syncManager.processQueue();

      expect(result.succeeded).toBe(4);
      expect(result.failed).toBe(0);
      expect(syncManager.getQueueLength()).toBe(0);
    });
  });

  describe('Card Operation with Message Interleaving', () => {
    test('should maintain FIFO order with mixed card and message operations', async () => {
      const syncManager = getSyncManager();
      global.navigator.onLine = false;

      const operations = [];

      // Simulate user interactions: chat → add card → chat → update card
      syncManager.addToQueue({
        type: 'message',
        data: { message: 'What cards do I have?' }
      });
      operations.push('message');

      syncManager.addToQueue({
        type: 'card_add',
        data: { nickname: 'New Amex', apr: 19 }
      });
      operations.push('card_add');

      syncManager.addToQueue({
        type: 'message',
        data: { message: 'Thanks for adding the card' }
      });
      operations.push('message');

      syncManager.addToQueue({
        type: 'card_update',
        data: { cardId: 'card-1', updates: { current_balance: 1000 } }
      });
      operations.push('card_update');

      syncManager.addToQueue({
        type: 'message',
        data: { message: 'What payment should I make?' }
      });
      operations.push('message');

      expect(syncManager.getQueueLength()).toBe(5);

      // Track sync order
      global.navigator.onLine = true;
      const syncOrder = [];

      global.fetch = jest.fn((...args) => {
        if (args[0] === '/api/chat/completions') {
          syncOrder.push('message');
        } else if (args[0] === '/api/cards/add') {
          syncOrder.push('card_add');
        } else if (args[0] === '/api/cards/update') {
          syncOrder.push('card_update');
        }
        return Promise.resolve({
          ok: true,
          json: jest.fn().mockResolvedValue({})
        });
      });

      const result = await syncManager.processQueue();

      expect(result.succeeded).toBe(5);
      expect(syncOrder).toEqual(operations);
    });
  });

  describe('Multiple Card Operations Simultaneously Offline', () => {
    test('should queue operations for multiple cards', async () => {
      const syncManager = getSyncManager();
      global.navigator.onLine = false;

      // Add multiple cards
      const card1Id = syncManager.addToQueue({
        type: 'card_add',
        data: { nickname: 'Card 1', apr: 18 }
      });

      const card2Id = syncManager.addToQueue({
        type: 'card_add',
        data: { nickname: 'Card 2', apr: 19 }
      });

      const card3Id = syncManager.addToQueue({
        type: 'card_add',
        data: { nickname: 'Card 3', apr: 17 }
      });

      // Update cards
      syncManager.addToQueue({
        type: 'card_update',
        data: { cardId: 'card-1', updates: { current_balance: 5000 } }
      });

      syncManager.addToQueue({
        type: 'card_update',
        data: { cardId: 'card-2', updates: { current_balance: 3000 } }
      });

      // Delete one card
      syncManager.addToQueue({
        type: 'card_delete',
        data: { cardId: 'card-3' }
      });

      expect(syncManager.getQueueLength()).toBe(6);

      // Sync all
      global.navigator.onLine = true;
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({})
      });

      const result = await syncManager.processQueue();

      expect(result.succeeded).toBe(6);
      expect(global.fetch).toHaveBeenCalledTimes(6);
    });
  });

  describe('Card Operation Failures and Retries', () => {
    test('should retry failed card add operation', async () => {
      const syncManager = getSyncManager();

      syncManager.addToQueue({
        type: 'card_add',
        data: { nickname: 'Test Card', apr: 18 }
      });

      // First attempt fails
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValue({ error: 'Invalid APR' })
      });

      let result = await syncManager.processQueue();
      expect(result.failed).toBe(1);
      expect(syncManager.getQueueLength()).toBe(1);

      // Second attempt succeeds
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ id: 'card-100' })
      });

      result = await syncManager.processQueue();
      expect(result.succeeded).toBe(1);
      expect(syncManager.getQueueLength()).toBe(0);
    });

    test('should handle partial card operation failure', async () => {
      const syncManager = getSyncManager();

      // Queue 3 operations
      syncManager.addToQueue({
        type: 'card_add',
        data: { nickname: 'Card 1', apr: 18 }
      });

      syncManager.addToQueue({
        type: 'card_update',
        data: { cardId: 'card-1', updates: { apr: 17 } }
      });

      syncManager.addToQueue({
        type: 'card_delete',
        data: { cardId: 'card-2' }
      });

      // Mock: add succeeds, update fails, delete succeeds
      global.fetch = jest.fn()
        .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({ id: 'card-1' }) })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          json: jest.fn().mockResolvedValue({ error: 'Card not found' })
        })
        .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({ success: true }) });

      const result = await syncManager.processQueue();

      expect(result.processed).toBe(3);
      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(1);
      expect(syncManager.getQueueLength()).toBe(1); // Update operation remains
    });
  });

  describe('Card Operation API Validation', () => {
    test('should send correct API endpoint for each card operation', async () => {
      const syncManager = getSyncManager();

      syncManager.addToQueue({
        type: 'card_add',
        data: { nickname: 'Add Test', apr: 18 }
      });

      syncManager.addToQueue({
        type: 'card_update',
        data: { cardId: 'card-123', updates: { apr: 17 } }
      });

      syncManager.addToQueue({
        type: 'card_delete',
        data: { cardId: 'card-456' }
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({})
      });

      await syncManager.processQueue();

      // Verify correct endpoints were called
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
        '/api/cards/card-456',
        expect.any(Object)
      );
    });

    test('should include all required fields in card operation payloads', async () => {
      const syncManager = getSyncManager();

      const cardData = {
        nickname: 'Test Card',
        apr: 18.99,
        credit_limit: 15000,
        user_id: 'user-123'
      };

      syncManager.addToQueue({
        type: 'card_add',
        data: cardData
      });

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ id: 'card-1' })
      });

      await syncManager.processQueue();

      const callArgs = global.fetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.card).toBeDefined();
      expect(body.card.nickname).toBe(cardData.nickname);
      expect(body.card.apr).toBe(cardData.apr);
      expect(body.card.credit_limit).toBe(cardData.credit_limit);
      expect(body.isFromQueue).toBe(true);
    });
  });

  describe('Card Operation Events', () => {
    test('should emit events for each card operation', async () => {
      const syncManager = getSyncManager();
      const cardEvents = [];

      syncManager.on('operationQueued', (op) => {
        if (['card_add', 'card_update', 'card_delete'].includes(op.type)) {
          cardEvents.push(`queued:${op.type}`);
        }
      });

      syncManager.on('operationSynced', (op) => {
        if (['card_add', 'card_update', 'card_delete'].includes(op.type)) {
          cardEvents.push(`synced:${op.type}`);
        }
      });

      // Queue operations
      syncManager.addToQueue({
        type: 'card_add',
        data: { nickname: 'Card', apr: 18 }
      });

      syncManager.addToQueue({
        type: 'card_update',
        data: { cardId: 'card-1', updates: { apr: 17 } }
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({})
      });

      await syncManager.processQueue();

      expect(cardEvents).toContain('queued:card_add');
      expect(cardEvents).toContain('queued:card_update');
      expect(cardEvents).toContain('synced:card_add');
      expect(cardEvents).toContain('synced:card_update');
    });
  });

  describe('Large-Scale Card Operations', () => {
    test('should handle bulk card operations', async () => {
      const syncManager = getSyncManager();
      global.navigator.onLine = false;

      // Simulate user bulk importing 50 cards
      for (let i = 0; i < 50; i++) {
        syncManager.addToQueue({
          type: 'card_add',
          data: {
            nickname: `Card ${i + 1}`,
            apr: 15 + Math.random() * 10,
            credit_limit: 5000 + i * 100
          }
        });
      }

      expect(syncManager.getQueueLength()).toBe(50);

      // Sync all
      global.navigator.onLine = true;
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({})
      });

      const result = await syncManager.processQueue();

      expect(result.succeeded).toBe(50);
      expect(result.failed).toBe(0);
      expect(syncManager.getQueueLength()).toBe(0);
      expect(global.fetch).toHaveBeenCalledTimes(50);
    });
  });
});
