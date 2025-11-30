/**
 * Offline Detection Service
 * Monitors network connectivity and triggers sync operations
 */

import dbManager from '../storage/indexedDB'

class OfflineDetector {
  constructor() {
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true
    this.syncInProgress = false
    this.listeners = []
    this.checkInterval = null
  }

  /**
   * Initialize detection
   */
  init() {
    if (typeof window === 'undefined') {
      console.log('[OfflineDetector] Skipping init (server-side)')
      return
    }

    window.addEventListener('online', () => this.handleOnline())
    window.addEventListener('offline', () => this.handleOffline())

    // Also check periodically (for networks that don't fire events reliably)
    this.checkInterval = setInterval(() => this.checkConnectivity(), 30000)

    console.log('[OfflineDetector] Initialized')
  }

  /**
   * Handle coming online
   */
  async handleOnline() {
    console.log('[OfflineDetector] Coming online')
    this.isOnline = true
    this.notify('online')

    // Trigger sync of pending operations
    await this.triggerSync()
  }

  /**
   * Handle going offline
   */
  handleOffline() {
    console.log('[OfflineDetector] Going offline')
    this.isOnline = false
    this.notify('offline')
  }

  /**
   * Trigger sync of all pending operations
   */
  async triggerSync() {
    if (this.syncInProgress) {
      console.log('[OfflineDetector] Sync already in progress')
      return
    }

    this.syncInProgress = true
    this.notify('sync:start')

    try {
      // Dynamically import syncManager to avoid circular dependencies
      const { getSyncManager } = await import('../sync/syncManager.js')
      const syncManager = getSyncManager()

      console.log(`[OfflineDetector] Triggering sync for ${syncManager.getQueueLength()} queued operations`)

      // Log sync attempt
      await dbManager.addSyncLog({
        action: 'auto_sync',
        status: 'started',
        operationCount: syncManager.getQueueLength(),
      })

      // Process the queue
      const syncResult = await syncManager.processQueue()

      console.log(`[OfflineDetector] Sync complete: ${syncResult.succeeded} succeeded, ${syncResult.failed} failed`)

      // Log sync completion
      await dbManager.addSyncLog({
        action: 'auto_sync',
        status: 'completed',
        succeeded: syncResult.succeeded,
        failed: syncResult.failed,
      })

      this.notify('sync:end', { success: syncResult.failed === 0, result: syncResult })
    } catch (error) {
      console.error('[OfflineDetector] Sync failed:', error)

      await dbManager.addSyncLog({
        action: 'auto_sync',
        status: 'failed',
        error: error.message,
      })

      this.notify('sync:error', { error })
    } finally {
      this.syncInProgress = false
    }
  }

  /**
   * Check connectivity (helpful for unreliable networks)
   */
  async checkConnectivity() {
    if (typeof window === 'undefined') {
      return
    }

    try {
      const response = await fetch('/manifest.json', {
        method: 'HEAD',
        cache: 'no-cache',
      })

      if (!this.isOnline) {
        console.log('[OfflineDetector] Detected online (via fetch)')
        this.handleOnline()
      }
    } catch (error) {
      if (this.isOnline) {
        console.log('[OfflineDetector] Detected offline (via fetch)')
        this.handleOffline()
      }
    }
  }

  /**
   * Subscribe to events
   */
  on(event, callback) {
    this.listeners.push({ event, callback })

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(
        (l) => !(l.event === event && l.callback === callback)
      )
    }
  }

  /**
   * Notify listeners
   */
  notify(event, data = {}) {
    this.listeners.forEach((listener) => {
      if (listener.event === event) {
        try {
          listener.callback(data)
        } catch (error) {
          console.error(`[OfflineDetector] Listener error for ${event}:`, error)
        }
      }
    })

    // Also dispatch as custom events for global listeners
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(`offline:${event}`, { detail: data })
      )
    }
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress,
    }
  }

  /**
   * Clean up
   */
  destroy() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
    }
    this.listeners = []
  }
}

// Create and export singleton
const offlineDetector = new OfflineDetector()

// Auto-initialize on import (if in browser)
if (typeof window !== 'undefined') {
  offlineDetector.init()
}

export { OfflineDetector }
export default offlineDetector
