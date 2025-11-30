/**
 * Card Operation Sync Service
 * Wraps cardService operations to support offline queuing and syncing
 * Phase 3: Enables offline card management with automatic sync on reconnect
 */

import { addCard, updateCard, deleteCard } from '../cardService.js';

let syncManager = null;

/**
 * Dynamically load sync manager to avoid circular dependencies
 * Exported for testing purposes
 */
export async function loadSyncManager() {
  if (!syncManager && typeof window !== 'undefined') {
    try {
      const { getSyncManager: getSM } = await import('./syncManager.js');
      syncManager = getSM();
    } catch (error) {
      console.warn('[CardOperationSync] Failed to load syncManager:', error.message);
    }
  }
  return syncManager;
}

/**
 * Get or load sync manager
 */
async function getSyncManagerInstance() {
  if (!syncManager) {
    await loadSyncManager();
  }
  return syncManager;
}

/**
 * Add a card with offline support
 * Queues the operation if offline, otherwise syncs immediately
 * @param {Object} cardData - Card information
 * @param {string} cardData.user_id - User's ID
 * @param {string} cardData.nickname - Card nickname
 * @param {number} cardData.apr - Annual Percentage Rate
 * @param {number} cardData.credit_limit - Total available credit
 * @param {number} cardData.current_balance - Current balance owed
 * @returns {Promise<Object>} Created card object with queued status
 */
export const addCardWithOfflineSupport = async (cardData) => {
  console.log('[CardOperationSync] Adding card:', cardData.nickname);

  // Check if offline
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    console.log('[CardOperationSync] User is offline, queuing card_add operation');
    const sm = await getSyncManagerInstance();

    if (sm) {
      const operationId = sm.addToQueue({
        type: 'card_add',
        data: {
          ...cardData,
          timestamp: Date.now()
        }
      });

      // Return optimistic card object with queued status
      return {
        id: `pending-${operationId}`,
        ...cardData,
        queued: true,
        operationId,
        pendingSync: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        message: '📤 Card queued! Will be added when you\'re back online.'
      };
    }
  }

  // Online: sync immediately
  try {
    const result = await addCard(cardData);
    console.log('[CardOperationSync] Card added successfully:', result.id);
    return {
      ...result,
      queued: false,
      pendingSync: false
    };
  } catch (error) {
    console.error('[CardOperationSync] Error adding card:', error);
    throw error;
  }
};

/**
 * Update a card with offline support
 * Queues the operation if offline, otherwise syncs immediately
 * @param {string} cardId - Card's ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated card object with queued status
 */
export const updateCardWithOfflineSupport = async (cardId, updates) => {
  console.log('[CardOperationSync] Updating card:', cardId);

  // Check if offline
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    console.log('[CardOperationSync] User is offline, queuing card_update operation');
    const sm = await getSyncManagerInstance();

    if (sm) {
      const operationId = sm.addToQueue({
        type: 'card_update',
        data: {
          cardId,
          updates,
          timestamp: Date.now()
        }
      });

      // Return optimistic update with queued status
      return {
        id: cardId,
        ...updates,
        queued: true,
        operationId,
        pendingSync: true,
        updated_at: new Date().toISOString(),
        message: '📤 Changes queued! Will be saved when you\'re back online.'
      };
    }
  }

  // Online: sync immediately
  try {
    const result = await updateCard(cardId, updates);
    console.log('[CardOperationSync] Card updated successfully:', cardId);
    return {
      ...result,
      queued: false,
      pendingSync: false
    };
  } catch (error) {
    console.error('[CardOperationSync] Error updating card:', error);
    throw error;
  }
};

/**
 * Delete a card with offline support
 * Queues the operation if offline, otherwise syncs immediately
 * @param {string} cardId - Card's ID
 * @returns {Promise<Object>} Result object with queued status
 */
export const deleteCardWithOfflineSupport = async (cardId) => {
  console.log('[CardOperationSync] Deleting card:', cardId);

  // Check if offline
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    console.log('[CardOperationSync] User is offline, queuing card_delete operation');
    const sm = await getSyncManagerInstance();

    if (sm) {
      const operationId = sm.addToQueue({
        type: 'card_delete',
        data: {
          cardId,
          timestamp: Date.now()
        }
      });

      // Return queued status
      return {
        success: true,
        queued: true,
        operationId,
        pendingSync: true,
        cardId,
        message: '📤 Deletion queued! Card will be deleted when you\'re back online.'
      };
    }
  }

  // Online: sync immediately
  try {
    const result = await deleteCard(cardId);
    console.log('[CardOperationSync] Card deleted successfully:', cardId);
    return {
      success: result,
      queued: false,
      pendingSync: false,
      cardId
    };
  } catch (error) {
    console.error('[CardOperationSync] Error deleting card:', error);
    throw error;
  }
};

/**
 * Get pending card operations from queue
 * Useful for filtering UI to show "pending" badges on cards
 * @returns {Promise<Array>} Array of pending card operations
 */
export const getPendingCardOperations = async () => {
  try {
    const sm = await getSyncManagerInstance();
    if (!sm) return [];

    const queueItems = sm.getQueueItems();
    const cardOps = queueItems.filter(op =>
      op.type === 'card_add' ||
      op.type === 'card_update' ||
      op.type === 'card_delete'
    );

    console.log('[CardOperationSync] Found pending card operations:', cardOps.length);
    return cardOps;
  } catch (error) {
    console.error('[CardOperationSync] Error getting pending operations:', error);
    return [];
  }
};

/**
 * Subscribe to card sync events
 * @param {string} event - Event type: 'operationQueued', 'operationSynced', 'operationFailed'
 * @param {Function} callback - Callback function
 * @returns {Function} Unsubscribe function
 */
export const onCardSyncEvent = async (event, callback) => {
  try {
    const sm = await getSyncManagerInstance();
    if (!sm) return () => {};

    // Only listen for card-related events
    const cardEventTypes = ['card_add', 'card_update', 'card_delete'];

    // Wrap callback to filter for card operations
    const wrappedCallback = (operation) => {
      if (cardEventTypes.includes(operation.type)) {
        callback(operation);
      }
    };

    // Map friendly event names to sync manager events
    const eventMap = {
      'operationQueued': 'operationQueued',
      'operationSynced': 'operationSynced',
      'operationFailed': 'operationFailed'
    };

    const syncEvent = eventMap[event] || event;
    sm.on(syncEvent, wrappedCallback);

    // Return unsubscribe function
    return () => sm.off(syncEvent, wrappedCallback);
  } catch (error) {
    console.error('[CardOperationSync] Error subscribing to card sync events:', error);
    return () => {};
  }
};

export default {
  addCardWithOfflineSupport,
  updateCardWithOfflineSupport,
  deleteCardWithOfflineSupport,
  getPendingCardOperations,
  onCardSyncEvent
};
