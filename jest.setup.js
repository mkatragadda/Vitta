/**
 * Jest Setup File
 * Runs before each test suite
 */

// Mock environment variables if needed
process.env.NODE_ENV = 'test';

// Polyfill structuredClone FIRST - before anything else uses it
if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = (obj) => {
    return JSON.parse(JSON.stringify(obj));
  };
}

// Setup navigator.onLine as settable property BEFORE anything else
let mockOnlineState = true;
delete global.navigator; // Remove any existing read-only navigator
global.navigator = Object.create(Object.prototype, {
  onLine: {
    get() {
      return mockOnlineState;
    },
    set(value) {
      mockOnlineState = value;
      // Trigger events if window exists
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        try {
          window.dispatchEvent(new Event(value ? 'online' : 'offline'));
        } catch (e) {
          // Ignore if events not supported
        }
      }
    },
    configurable: true,
    enumerable: true,
  },
});

// Mock IndexedDB for Node.js environment
const {
  indexedDB,
  IDBKeyRange,
  IDBCursor,
  IDBCursorWithValue,
  IDBDatabase,
  IDBFactory,
  IDBIndex,
  IDBObjectStore,
  IDBOpenDBRequest,
  IDBRequest,
  IDBTransaction,
  IDBVersionChangeEvent,
} = require('fake-indexeddb');

if (typeof global !== 'undefined' && !global.indexedDB) {
  global.indexedDB = indexedDB;
  global.IDBKeyRange = IDBKeyRange;
  global.IDBCursor = IDBCursor;
  global.IDBCursorWithValue = IDBCursorWithValue;
  global.IDBDatabase = IDBDatabase;
  global.IDBFactory = IDBFactory;
  global.IDBIndex = IDBIndex;
  global.IDBObjectStore = IDBObjectStore;
  global.IDBOpenDBRequest = IDBOpenDBRequest;
  global.IDBRequest = IDBRequest;
  global.IDBTransaction = IDBTransaction;
  global.IDBVersionChangeEvent = IDBVersionChangeEvent;
}


// Mock fetch if not available
if (!global.fetch) {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
    })
  );
}

// Global test utilities
global.console = {
  ...console,
  // Suppress console.log in tests (keep error/warn for debugging)
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  // Keep error and warn for debugging test failures
  error: console.error,
  warn: console.warn,
};

// Add custom matchers if needed
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

