/**
 * TransferFlowManager Unit Tests
 *
 * Tests the state machine transitions, localStorage persistence,
 * and recovery logic for the international transfer chat flow.
 *
 * Scenarios covered:
 * A. Full happy path: idle → initiation → review → complete
 * B. Cancel at initiation step
 * C. Cancel at review step
 * D. New transfer after completion (reset)
 * E. Flow recovery after page refresh (recoverFlow)
 * F. Completed flow is NOT recovered (cleared on recoverFlow)
 * G. State predicates (isAtInitiation, isAtReview, isComplete, hasActiveFlow)
 * H. LocalStorage errors handled gracefully
 * I. Invalid/missing data in localStorage handled gracefully
 */

// We use the real module (not a mock) because the logic is pure state transitions.
// localStorage is provided by jsdom (jest-environment-jsdom).

let transferFlowManager;
let TRANSFER_STEPS;

const STORAGE_KEY = 'vitta_transfer_flow_state';

// Sample test data
const mockRateData = {
  exchange_rate: 83.25,
  source_amount: 500,
  target_amount: 41625,
  fee_percentage: 1,
  fee_amount: 5,
  rate_valid_for_seconds: 30
};

const mockBeneficiary = {
  id: 'ben_001',
  name: 'Priya Kumar',
  paymentMethod: 'upi',
  upiId: 'priya@okhdfc'
};

const mockTransferData = {
  rateData: mockRateData,
  beneficiary: mockBeneficiary,
  sourceAmount: 500
};

const mockReceiptData = {
  transfer_id: 'txn_abc123',
  chimoney_reference: 'CHI_xyz789',
  status: 'completed',
  source_amount: 500,
  exchange_rate: 83.25,
  target_amount: 41625,
  fee_amount: 5,
  fee_percentage: 1,
  payment_method: 'upi',
  beneficiary_name: 'Priya Kumar',
  created_at: '2026-03-01T12:00:00Z'
};

beforeEach(() => {
  // Clear localStorage before each test
  localStorage.clear();

  // Re-import module fresh before each test to reset module-level state
  // (The manager reads from localStorage on each call, so clearing localStorage is sufficient)
  jest.resetModules();
  const mod = require('../../../services/chat/transferFlowManager');
  transferFlowManager = mod.default;
  TRANSFER_STEPS = mod.TRANSFER_STEPS;
});

// ============================================================================
// TRANSFER_STEPS enum
// ============================================================================
describe('TRANSFER_STEPS enum', () => {
  test('should export expected step values', () => {
    expect(TRANSFER_STEPS.IDLE).toBe('idle');
    expect(TRANSFER_STEPS.AWAITING_INITIATION).toBe('awaiting_initiation');
    expect(TRANSFER_STEPS.AWAITING_REVIEW).toBe('awaiting_review');
    expect(TRANSFER_STEPS.COMPLETE).toBe('complete');
  });
});

// ============================================================================
// A. Full happy path
// ============================================================================
describe('Full transfer flow - happy path', () => {
  test('initial getState() returns idle step with null data', () => {
    const state = transferFlowManager.getState();
    expect(state.step).toBe(TRANSFER_STEPS.IDLE);
    expect(state.transferData).toBeNull();
    expect(state.receiptData).toBeNull();
    expect(state.startedAt).toBeNull();
    expect(state.completedAt).toBeNull();
  });

  test('startFlow() transitions to awaiting_initiation and persists to localStorage', () => {
    const state = transferFlowManager.startFlow();
    expect(state.step).toBe(TRANSFER_STEPS.AWAITING_INITIATION);
    expect(state.startedAt).toBeTruthy();
    expect(state.transferData).toBeNull();

    // Verify it was saved to localStorage
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(stored.step).toBe(TRANSFER_STEPS.AWAITING_INITIATION);
  });

  test('proceedToReview() transitions to awaiting_review and saves transferData', () => {
    transferFlowManager.startFlow();
    const state = transferFlowManager.proceedToReview(mockTransferData);

    expect(state.step).toBe(TRANSFER_STEPS.AWAITING_REVIEW);
    expect(state.transferData).toEqual(mockTransferData);
    expect(state.transferData.beneficiary.name).toBe('Priya Kumar');

    // Verify localStorage
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(stored.step).toBe(TRANSFER_STEPS.AWAITING_REVIEW);
    expect(stored.transferData.sourceAmount).toBe(500);
  });

  test('completeFlow() transitions to complete and saves receiptData', () => {
    transferFlowManager.startFlow();
    transferFlowManager.proceedToReview(mockTransferData);
    const state = transferFlowManager.completeFlow(mockReceiptData);

    expect(state.step).toBe(TRANSFER_STEPS.COMPLETE);
    expect(state.receiptData).toEqual(mockReceiptData);
    expect(state.receiptData.transfer_id).toBe('txn_abc123');
    expect(state.completedAt).toBeTruthy();

    // Verify localStorage
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(stored.step).toBe(TRANSFER_STEPS.COMPLETE);
  });

  test('getState() reads from localStorage on each call', () => {
    transferFlowManager.startFlow();
    // Directly manipulate localStorage to simulate external change
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    raw.step = TRANSFER_STEPS.AWAITING_REVIEW;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(raw));

    const state = transferFlowManager.getState();
    expect(state.step).toBe(TRANSFER_STEPS.AWAITING_REVIEW);
  });
});

// ============================================================================
// B. Cancel at initiation step
// ============================================================================
describe('Cancellation at initiation step', () => {
  test('cancelFlow() from initiation returns idle state and clears localStorage', () => {
    transferFlowManager.startFlow();
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();

    const state = transferFlowManager.cancelFlow();
    expect(state.step).toBe(TRANSFER_STEPS.IDLE);
    expect(state.transferData).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});

// ============================================================================
// C. Cancel at review step
// ============================================================================
describe('Cancellation at review step', () => {
  test('cancelFlow() from review returns idle state and clears all data', () => {
    transferFlowManager.startFlow();
    transferFlowManager.proceedToReview(mockTransferData);

    const state = transferFlowManager.cancelFlow();
    expect(state.step).toBe(TRANSFER_STEPS.IDLE);
    expect(state.transferData).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});

// ============================================================================
// D. New transfer after completion
// ============================================================================
describe('Reset / new transfer after completion', () => {
  test('reset() clears all state and localStorage', () => {
    transferFlowManager.startFlow();
    transferFlowManager.proceedToReview(mockTransferData);
    transferFlowManager.completeFlow(mockReceiptData);

    const state = transferFlowManager.reset();
    expect(state.step).toBe(TRANSFER_STEPS.IDLE);
    expect(state.receiptData).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});

// ============================================================================
// E. Flow recovery after page refresh (in-progress)
// ============================================================================
describe('Flow recovery - in-progress', () => {
  test('recoverFlow() returns state when step is awaiting_initiation', () => {
    transferFlowManager.startFlow();
    // Simulate page refresh: create new manager instance by re-reading localStorage
    const recovered = transferFlowManager.recoverFlow();
    expect(recovered).not.toBeNull();
    expect(recovered.step).toBe(TRANSFER_STEPS.AWAITING_INITIATION);
  });

  test('recoverFlow() returns state when step is awaiting_review', () => {
    transferFlowManager.startFlow();
    transferFlowManager.proceedToReview(mockTransferData);

    const recovered = transferFlowManager.recoverFlow();
    expect(recovered).not.toBeNull();
    expect(recovered.step).toBe(TRANSFER_STEPS.AWAITING_REVIEW);
    expect(recovered.transferData).toEqual(mockTransferData);
  });

  test('recoverFlow() returns null when step is idle', () => {
    const recovered = transferFlowManager.recoverFlow();
    expect(recovered).toBeNull();
  });
});

// ============================================================================
// F. Completed flow is NOT recovered
// ============================================================================
describe('Flow recovery - completed flow is cleared', () => {
  test('recoverFlow() returns null and clears localStorage when step is complete', () => {
    transferFlowManager.startFlow();
    transferFlowManager.proceedToReview(mockTransferData);
    transferFlowManager.completeFlow(mockReceiptData);

    const recovered = transferFlowManager.recoverFlow();
    expect(recovered).toBeNull();
    // State should be cleared from localStorage
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});

// ============================================================================
// G. State predicates
// ============================================================================
describe('State predicates', () => {
  test('hasActiveFlow() returns false at idle', () => {
    expect(transferFlowManager.hasActiveFlow()).toBe(false);
  });

  test('hasActiveFlow() returns true at awaiting_initiation', () => {
    transferFlowManager.startFlow();
    expect(transferFlowManager.hasActiveFlow()).toBe(true);
  });

  test('hasActiveFlow() returns true at awaiting_review', () => {
    transferFlowManager.startFlow();
    transferFlowManager.proceedToReview(mockTransferData);
    expect(transferFlowManager.hasActiveFlow()).toBe(true);
  });

  test('hasActiveFlow() returns false at complete', () => {
    transferFlowManager.startFlow();
    transferFlowManager.proceedToReview(mockTransferData);
    transferFlowManager.completeFlow(mockReceiptData);
    expect(transferFlowManager.hasActiveFlow()).toBe(false);
  });

  test('isAtInitiation() returns true only at awaiting_initiation', () => {
    expect(transferFlowManager.isAtInitiation()).toBe(false);
    transferFlowManager.startFlow();
    expect(transferFlowManager.isAtInitiation()).toBe(true);
    transferFlowManager.proceedToReview(mockTransferData);
    expect(transferFlowManager.isAtInitiation()).toBe(false);
  });

  test('isAtReview() returns true only at awaiting_review', () => {
    expect(transferFlowManager.isAtReview()).toBe(false);
    transferFlowManager.startFlow();
    expect(transferFlowManager.isAtReview()).toBe(false);
    transferFlowManager.proceedToReview(mockTransferData);
    expect(transferFlowManager.isAtReview()).toBe(true);
    transferFlowManager.completeFlow(mockReceiptData);
    expect(transferFlowManager.isAtReview()).toBe(false);
  });

  test('isComplete() returns true only when step is complete', () => {
    expect(transferFlowManager.isComplete()).toBe(false);
    transferFlowManager.startFlow();
    expect(transferFlowManager.isComplete()).toBe(false);
    transferFlowManager.proceedToReview(mockTransferData);
    expect(transferFlowManager.isComplete()).toBe(false);
    transferFlowManager.completeFlow(mockReceiptData);
    expect(transferFlowManager.isComplete()).toBe(true);
  });
});

// ============================================================================
// H. localStorage errors handled gracefully
// ============================================================================
describe('localStorage error handling', () => {
  test('getState() returns idle state if localStorage.getItem throws', () => {
    const original = localStorage.getItem.bind(localStorage);
    jest.spyOn(Storage.prototype, 'getItem').mockImplementationOnce(() => {
      throw new Error('Storage quota exceeded');
    });

    const state = transferFlowManager.getState();
    expect(state.step).toBe(TRANSFER_STEPS.IDLE);

    Storage.prototype.getItem.mockRestore();
  });

  test('startFlow() still returns valid state if localStorage.setItem throws', () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new Error('Storage quota exceeded');
    });

    // Should not throw
    const state = transferFlowManager.startFlow();
    expect(state.step).toBe(TRANSFER_STEPS.AWAITING_INITIATION);

    Storage.prototype.setItem.mockRestore();
  });
});

// ============================================================================
// I. Invalid/missing data in localStorage handled gracefully
// ============================================================================
describe('localStorage invalid data handling', () => {
  test('getState() returns idle if stored JSON is corrupt', () => {
    localStorage.setItem(STORAGE_KEY, 'not-valid-json{{{');
    const state = transferFlowManager.getState();
    expect(state.step).toBe(TRANSFER_STEPS.IDLE);
  });

  test('getState() returns idle if stored step is unknown', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ step: 'UNKNOWN_STEP_XYZ', transferData: null }));
    const state = transferFlowManager.getState();
    expect(state.step).toBe(TRANSFER_STEPS.IDLE);
  });

  test('getState() returns idle if stored data is empty object', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({}));
    const state = transferFlowManager.getState();
    expect(state.step).toBe(TRANSFER_STEPS.IDLE);
  });
});

// ============================================================================
// Edge cases
// ============================================================================
describe('Edge cases', () => {
  test('proceedToReview() called from wrong step logs warning but still saves', () => {
    // Don't call startFlow first — wrong step
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const state = transferFlowManager.proceedToReview(mockTransferData);
    expect(state.step).toBe(TRANSFER_STEPS.AWAITING_REVIEW);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  test('completeFlow() with null receipt still transitions to complete', () => {
    transferFlowManager.startFlow();
    transferFlowManager.proceedToReview(mockTransferData);
    const state = transferFlowManager.completeFlow(null);
    expect(state.step).toBe(TRANSFER_STEPS.COMPLETE);
    expect(state.receiptData).toBeNull();
  });

  test('cancelFlow() from idle state returns idle without errors', () => {
    expect(() => transferFlowManager.cancelFlow()).not.toThrow();
    const state = transferFlowManager.getState();
    expect(state.step).toBe(TRANSFER_STEPS.IDLE);
  });

  test('multiple startFlow() calls reset previous state', () => {
    transferFlowManager.startFlow();
    transferFlowManager.proceedToReview(mockTransferData);
    // Start again — should reset to initiation
    const state = transferFlowManager.startFlow();
    expect(state.step).toBe(TRANSFER_STEPS.AWAITING_INITIATION);
    expect(state.transferData).toBeNull();
  });

  test('startedAt is an ISO date string', () => {
    const state = transferFlowManager.startFlow();
    expect(() => new Date(state.startedAt)).not.toThrow();
    expect(new Date(state.startedAt).toString()).not.toBe('Invalid Date');
  });

  test('completedAt is an ISO date string', () => {
    transferFlowManager.startFlow();
    transferFlowManager.proceedToReview(mockTransferData);
    const state = transferFlowManager.completeFlow(mockReceiptData);
    expect(() => new Date(state.completedAt)).not.toThrow();
    expect(new Date(state.completedAt).toString()).not.toBe('Invalid Date');
  });
});
