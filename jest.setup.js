/**
 * Jest Setup File
 * Runs before each test suite
 */

// Mock environment variables if needed
process.env.NODE_ENV = 'test';

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

// Mock navigator for offline tests
if (typeof global.navigator === 'undefined') {
  global.navigator = {
    onLine: true,
  };
} else if (!global.navigator.onLine) {
  global.navigator.onLine = true;
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

