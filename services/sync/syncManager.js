/**
 * Sync Manager - Orchestrates syncing of all pending offline operations
 *
 * Manages a queue of offline operations (messages, card changes) and syncs
 * them when the user comes back online. Uses event emitter pattern for
 * notifications and implements singleton pattern for single instance.
 *
 * Operations: message, card_add, card_update, card_delete
 * Status: idle, syncing, error
 */

import { RetryHandler } from './retryHandler.js';
import { storageManager } from '../storage/storageManager.js';

class SyncManager {
  constructor() {
    this.queue = [];
    this.isSyncing = false;
    this.syncStatus = 'idle'; // idle, syncing, error
    this.eventListeners = {};
    this.retryHandlers = new Map(); // One handler per operation ID
    this.lastSyncTime = null;

    console.log('[SyncManager] Initialized');
  }

  /**
   * Add operation to sync queue
   *
   * @param {Object} operation - Operation to queue
   * @param {string} operation.type - Type: message, card_add, card_update, card_delete
   * @param {Object} operation.data - Operation data
   * @returns {string} Operation ID (UUID)
   */
  addToQueue(operation) {
    const operationId = this.generateId();
    const queuedOp = {
      id: operationId,
      type: operation.type,
      data: operation.data,
      timestamp: Date.now(),
      retries: 0,
      lastRetryTime: null,
      createdAt: Date.now()
    };

    this.queue.push(queuedOp);
    this.retryHandlers.set(operationId, new RetryHandler(5, 1000));

    // Persist to IndexedDB
    storageManager.saveToStore('offlineQueue', queuedOp);

    console.log(`[SyncManager] Added ${operation.type} to queue (ID: ${operationId}), queue size: ${this.queue.length}`);
    this.emit('operationQueued', queuedOp);

    return operationId;
  }

  /**
   * Process all queued operations
   * Syncs operations one by one, retrying failed ones
   *
   * @returns {Promise<Object>} Sync result with successes and failures
   */
  async processQueue() {
    if (this.isSyncing) {
      console.log('[SyncManager] Sync already in progress, skipping');
      return { syncing: true };
    }

    if (this.queue.length === 0) {
      console.log('[SyncManager] Queue is empty, nothing to sync');
      return { success: true, processed: 0 };
    }

    this.isSyncing = true;
    this.syncStatus = 'syncing';
    this.emit('syncStart', { queueSize: this.queue.length });

    const result = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      errors: []
    };

    // Process each item in queue
    for (let i = 0; i < this.queue.length; i++) {
      const operation = this.queue[i];
      const success = await this.syncOperation(operation);

      result.processed++;

      if (success) {
        result.succeeded++;
        // Remove from queue and storage
        this.queue.splice(i, 1);
        i--; // Adjust index since we removed an item
        await storageManager.deleteFromStore('offlineQueue', operation.id);
        this.retryHandlers.delete(operation.id);
      } else {
        result.failed++;
      }
    }

    this.isSyncing = false;
    this.syncStatus = result.failed === 0 ? 'idle' : 'error';
    this.lastSyncTime = Date.now();

    console.log(`[SyncManager] Sync complete: ${result.succeeded} succeeded, ${result.failed} failed`);
    this.emit('syncComplete', result);

    return result;
  }

  /**
   * Sync a single operation to the server
   *
   * @private
   * @param {Object} operation - Operation to sync
   * @returns {Promise<boolean>} True if successful, false if failed
   */
  async syncOperation(operation) {
    console.log(`[SyncManager] Syncing ${operation.type} (ID: ${operation.id})`);

    try {
      // Call appropriate handler based on operation type
      switch (operation.type) {
        case 'message':
          return await this.syncMessage(operation);
        case 'card_add':
          return await this.syncCardAdd(operation);
        case 'card_update':
          return await this.syncCardUpdate(operation);
        case 'card_delete':
          return await this.syncCardDelete(operation);
        default:
          console.warn(`[SyncManager] Unknown operation type: ${operation.type}`);
          return false;
      }
    } catch (error) {
      console.error(`[SyncManager] Error syncing operation: ${error.message}`);
      return false;
    }
  }

  /**
   * Sync a message to the server
   *
   * @private
   * @param {Object} operation - Message operation
   * @returns {Promise<boolean>} True if successful
   */
  async syncMessage(operation) {
    try {
      const response = await fetch('/api/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: operation.data.message }],
          queuedMessageId: operation.id,
          isFromQueue: true
        })
      });

      if (response.ok) {
        console.log(`[SyncManager] Message synced (ID: ${operation.id})`);
        this.emit('operationSynced', operation);
        return true;
      } else {
        const errorData = await response.json();
        throw new Error(`API error: ${response.status} - ${errorData.error}`);
      }
    } catch (error) {
      console.error(`[SyncManager] Failed to sync message: ${error.message}`);
      return this.handleRetry(operation);
    }
  }

  /**
   * Sync a card add operation
   *
   * @private
   * @param {Object} operation - Card add operation
   * @returns {Promise<boolean>} True if successful
   */
  async syncCardAdd(operation) {
    try {
      const response = await fetch('/api/cards/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card: operation.data,
          queuedCardId: operation.id,
          isFromQueue: true
        })
      });

      if (response.ok) {
        console.log(`[SyncManager] Card add synced (ID: ${operation.id})`);
        this.emit('operationSynced', operation);
        return true;
      } else {
        throw new Error(`API error: ${response.status}`);
      }
    } catch (error) {
      console.error(`[SyncManager] Failed to sync card add: ${error.message}`);
      return this.handleRetry(operation);
    }
  }

  /**
   * Sync a card update operation
   *
   * @private
   * @param {Object} operation - Card update operation
   * @returns {Promise<boolean>} True if successful
   */
  async syncCardUpdate(operation) {
    try {
      const response = await fetch('/api/cards/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId: operation.data.cardId,
          updates: operation.data.updates,
          queuedCardId: operation.id,
          isFromQueue: true
        })
      });

      if (response.ok) {
        console.log(`[SyncManager] Card update synced (ID: ${operation.id})`);
        this.emit('operationSynced', operation);
        return true;
      } else {
        throw new Error(`API error: ${response.status}`);
      }
    } catch (error) {
      console.error(`[SyncManager] Failed to sync card update: ${error.message}`);
      return this.handleRetry(operation);
    }
  }

  /**
   * Sync a card delete operation
   *
   * @private
   * @param {Object} operation - Card delete operation
   * @returns {Promise<boolean>} True if successful
   */
  async syncCardDelete(operation) {
    try {
      const response = await fetch(`/api/cards/${operation.data.cardId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queuedCardId: operation.id,
          isFromQueue: true
        })
      });

      if (response.ok) {
        console.log(`[SyncManager] Card delete synced (ID: ${operation.id})`);
        this.emit('operationSynced', operation);
        return true;
      } else {
        throw new Error(`API error: ${response.status}`);
      }
    } catch (error) {
      console.error(`[SyncManager] Failed to sync card delete: ${error.message}`);
      return this.handleRetry(operation);
    }
  }

  /**
   * Handle retry logic for failed operation
   *
   * @private
   * @param {Object} operation - Failed operation
   * @returns {boolean} False (operation not synced, scheduled for retry)
   */
  handleRetry(operation) {
    const retryHandler = this.retryHandlers.get(operation.id);

    if (!retryHandler || !retryHandler.shouldRetry()) {
      console.error(`[SyncManager] Operation ${operation.id} exceeded max retries`);
      this.emit('operationFailed', operation);
      return false;
    }

    const delay = retryHandler.getNextDelay();
    operation.retries++;
    operation.lastRetryTime = Date.now();

    // Schedule retry after delay
    setTimeout(() => {
      if (navigator.onLine) {
        console.log(`[SyncManager] Retrying operation ${operation.id}`);
        this.syncOperation(operation).then(success => {
          if (success) {
            // Remove from queue on success
            const index = this.queue.indexOf(operation);
            if (index > -1) {
              this.queue.splice(index, 1);
              storageManager.deleteFromStore('offlineQueue', operation.id);
              this.retryHandlers.delete(operation.id);
            }
          }
        });
      }
    }, delay);

    return false; // Not synced yet
  }

  /**
   * Get current sync status
   *
   * @returns {string} Status: idle, syncing, or error
   */
  getSyncStatus() {
    return this.syncStatus;
  }

  /**
   * Get queue length
   *
   * @returns {number} Number of items in queue
   */
  getQueueLength() {
    return this.queue.length;
  }

  /**
   * Get all queued items
   *
   * @returns {Array} Array of operations in queue
   */
  getQueueItems() {
    return [...this.queue];
  }

  /**
   * Clear entire queue (use with caution!)
   */
  clearQueue() {
    const clearedCount = this.queue.length;
    this.queue = [];
    this.retryHandlers.clear();
    storageManager.clearStore('offlineQueue');
    console.warn(`[SyncManager] Cleared ${clearedCount} items from queue`);
  }

  /**
   * Register event listener
   *
   * @param {string} event - Event name (syncStart, syncComplete, operationQueued, etc.)
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  /**
   * Unregister event listener
   *
   * @param {string} event - Event name
   * @param {Function} callback - Callback function to remove
   */
  off(event, callback) {
    if (this.eventListeners[event]) {
      this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
    }
  }

  /**
   * Emit event to all listeners
   *
   * @private
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[SyncManager] Error in event listener for ${event}: ${error.message}`);
        }
      });
    }
  }

  /**
   * Generate unique ID for operations
   *
   * @private
   * @returns {string} UUID-style ID
   */
  generateId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
let syncManagerInstance = null;

/**
 * Get singleton instance of SyncManager
 *
 * @returns {SyncManager} Singleton instance
 */
function getSyncManager() {
  if (!syncManagerInstance) {
    syncManagerInstance = new SyncManager();
  }
  return syncManagerInstance;
}

// For testing: allow instance reset
function resetSyncManager() {
  syncManagerInstance = new SyncManager();
}

module.exports = {
  SyncManager,
  getSyncManager,
  resetSyncManager
};
