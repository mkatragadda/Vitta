/**
 * IndexedDB Manager
 * Handles offline data storage for Vitta
 * Manages multiple object stores for pending operations and history
 */

class IndexedDBManager {
  constructor() {
    this.db = null
    this.dbName = 'vitta_offline'
    this.dbVersion = 1
    this.stores = {
      pending_messages: {
        keyPath: 'id',
        indexes: [
          { name: 'synced', keyPath: 'synced' },
          { name: 'timestamp', keyPath: 'timestamp' },
        ],
      },
      pending_payments: {
        keyPath: 'id',
        indexes: [
          { name: 'synced', keyPath: 'synced' },
          { name: 'cardId', keyPath: 'cardId' },
        ],
      },
      chat_history: {
        keyPath: 'id',
        indexes: [
          { name: 'synced', keyPath: 'synced' },
          { name: 'timestamp', keyPath: 'timestamp' },
        ],
      },
      sync_log: {
        keyPath: 'id',
        indexes: [
          { name: 'status', keyPath: 'status' },
          { name: 'timestamp', keyPath: 'timestamp' },
        ],
      },
    }
  }

  /**
   * Open or create database
   */
  async open() {
    if (this.db) {
      return this.db
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onerror = () => {
        console.error('[IndexedDB] Open failed:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        console.log('[IndexedDB] Database opened successfully')
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = event.target.result
        this.createStores(db)
      }
    })
  }

  /**
   * Create object stores
   */
  createStores(db) {
    Object.entries(this.stores).forEach(([storeName, config]) => {
      if (db.objectStoreNames.contains(storeName)) {
        return
      }

      const store = db.createObjectStore(storeName, { keyPath: config.keyPath })

      config.indexes.forEach((index) => {
        store.createIndex(index.name, index.keyPath)
      })

      console.log(`[IndexedDB] Created store: ${storeName}`)
    })
  }

  /**
   * Save pending message
   */
  async savePendingMessage(message) {
    const db = await this.open()
    return this.put('pending_messages', {
      id: `msg_${Date.now()}_${Math.random()}`,
      ...message,
      timestamp: Date.now(),
      synced: false,
    })
  }

  /**
   * Get all pending messages (not synced)
   */
  async getPendingMessages() {
    const db = await this.open()
    return this.getAllByIndex('pending_messages', 'synced', false)
  }

  /**
   * Mark message as synced
   */
  async markMessageSynced(messageId) {
    const db = await this.open()
    const message = await this.get('pending_messages', messageId)
    if (message) {
      message.synced = true
      return this.put('pending_messages', message)
    }
  }

  /**
   * Save pending payment
   */
  async savePendingPayment(payment) {
    const db = await this.open()
    return this.put('pending_payments', {
      id: `pay_${Date.now()}_${Math.random()}`,
      ...payment,
      timestamp: Date.now(),
      synced: false,
    })
  }

  /**
   * Get all pending payments (not synced)
   */
  async getPendingPayments() {
    const db = await this.open()
    return this.getAllByIndex('pending_payments', 'synced', false)
  }

  /**
   * Mark payment as synced
   */
  async markPaymentSynced(paymentId) {
    const db = await this.open()
    const payment = await this.get('pending_payments', paymentId)
    if (payment) {
      payment.synced = true
      return this.put('pending_payments', payment)
    }
  }

  /**
   * Save chat history entry
   */
  async saveChatMessage(message) {
    const db = await this.open()
    return this.put('chat_history', {
      id: `chat_${Date.now()}_${Math.random()}`,
      ...message,
      timestamp: Date.now(),
      synced: false,
    })
  }

  /**
   * Get all chat history
   */
  async getChatHistory() {
    const db = await this.open()
    return this.getAll('chat_history')
  }

  /**
   * Save sync log entry
   */
  async addSyncLog(entry) {
    const db = await this.open()
    return this.put('sync_log', {
      id: `sync_${Date.now()}_${Math.random()}`,
      ...entry,
      timestamp: Date.now(),
    })
  }

  /**
   * Generic put operation (create/update)
   */
  async put(storeName, data) {
    const db = await this.open()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.put(data)

      request.onsuccess = () => {
        console.log(`[IndexedDB] Saved to ${storeName}:`, data.id || data)
        resolve(request.result)
      }

      request.onerror = () => {
        console.error(`[IndexedDB] Put failed for ${storeName}:`, request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Generic get operation
   */
  async get(storeName, key) {
    const db = await this.open()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.get(key)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get all records
   */
  async getAll(storeName) {
    const db = await this.open()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get all records matching an index value
   */
  async getAllByIndex(storeName, indexName, value) {
    const db = await this.open()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const index = store.index(indexName)
      const request = index.getAll(value)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Delete record
   */
  async delete(storeName, key) {
    const db = await this.open()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.delete(key)

      request.onsuccess = () => {
        console.log(`[IndexedDB] Deleted from ${storeName}:`, key)
        resolve()
      }
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Clear entire store
   */
  async clearStore(storeName) {
    const db = await this.open()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.clear()

      request.onsuccess = () => {
        console.log(`[IndexedDB] Cleared store: ${storeName}`)
        resolve()
      }
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get database stats
   */
  async getStats() {
    const db = await this.open()
    const stats = {}

    for (const storeName of Object.keys(this.stores)) {
      const store = await this.getAll(storeName)
      stats[storeName] = {
        count: store.length,
        pendingCount: store.filter((item) => !item.synced).length,
      }
    }

    return stats
  }
}

// Create and export singleton instance
const dbManager = new IndexedDBManager()

export default dbManager
