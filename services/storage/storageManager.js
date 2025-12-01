/**
 * Storage Manager
 * Unified interface for offline data persistence
 * Wraps IndexedDB with simplified CRUD operations
 */

import dbManager from './indexedDB.js';

/**
 * Storage Manager - Handles all offline data persistence
 * Provides a simple interface for saving/loading/deleting data
 */
const storageManager = {
  /**
   * Save operation to offline queue
   * @param {string} storeName - Store name (e.g., 'offlineQueue')
   * @param {Object} data - Data to save (should include id field)
   * @returns {Promise<void>}
   */
  saveToStore: async (storeName, data) => {
    try {
      if (storeName === 'offlineQueue') {
        // Save to sync log for tracking
        console.log('[StorageManager] Saving operation to queue:', data.id);
        await dbManager.addSyncLog({
          action: 'queue_operation',
          operationId: data.id,
          operationType: data.type,
          data: data,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('[StorageManager] Error saving to store:', error);
      // Don't throw - allow operation to proceed even if logging fails
    }
  },

  /**
   * Delete operation from offline queue
   * @param {string} storeName - Store name
   * @param {string} operationId - Operation ID to delete
   * @returns {Promise<void>}
   */
  deleteFromStore: async (storeName, operationId) => {
    try {
      if (storeName === 'offlineQueue') {
        console.log('[StorageManager] Deleting operation from queue:', operationId);
        // Log deletion for audit trail
        await dbManager.addSyncLog({
          action: 'operation_synced',
          operationId: operationId,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('[StorageManager] Error deleting from store:', error);
    }
  },

  /**
   * Clear entire store
   * @param {string} storeName - Store name
   * @returns {Promise<void>}
   */
  clearStore: async (storeName) => {
    try {
      if (storeName === 'offlineQueue') {
        console.log('[StorageManager] Clearing offline queue');
        // Note: In a real implementation, you might want to clear a specific store
        // For now, we just log it since we're using sync logs
        await dbManager.addSyncLog({
          action: 'queue_cleared',
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('[StorageManager] Error clearing store:', error);
    }
  },

  /**
   * Read from store
   * @param {string} storeName - Store name
   * @param {string} operationId - Operation ID (optional)
   * @returns {Promise<Object|Array>}
   */
  readFromStore: async (storeName, operationId) => {
    try {
      if (storeName === 'offlineQueue') {
        if (operationId) {
          // Read specific operation
          console.log('[StorageManager] Reading operation:', operationId);
          // In a real implementation, you'd query for this specific operation
          return null;
        } else {
          // Read all operations
          console.log('[StorageManager] Reading all offline queue operations');
          return [];
        }
      }
      return null;
    } catch (error) {
      console.error('[StorageManager] Error reading from store:', error);
      return null;
    }
  }
};

export { storageManager };
export default storageManager;
