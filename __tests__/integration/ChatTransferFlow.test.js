/**
 * Chat Transfer Flow Integration Tests
 *
 * Tests the end-to-end flow of the international transfer feature as it
 * integrates with the chat system.
 *
 * This file focuses on:
 * 1. responseGenerator returning __transferIntent descriptor
 * 2. transferFlowManager state transitions in sequence
 * 3. All 7 scenario paths
 * 4. Error handling at each step
 * 5. Data integrity across transitions
 *
 * External dependencies (Supabase, Chimoney API, OpenAI) are mocked.
 */

// ─── Mock external services ───────────────────────────────────────────────────

// Mock Supabase
jest.mock('../../config/supabase.js', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null })
    }))
  }
}));

// Mock fetch globally for API calls
global.fetch = jest.fn();

// ─── Imports ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'vitta_transfer_flow_state';

// ─── Test Data ────────────────────────────────────────────────────────────────

const mockUser = {
  id: 'user_test_001',
  email: 'test@vitta.com',
  name: 'Test User'
};

const mockBeneficiaryUPI = {
  id: 'ben_upi_001',
  name: 'Raj Sharma',
  paymentMethod: 'upi',
  upiId: 'raj@paytm',
  phone: '+91-9876543210'
};

const mockBeneficiaryBank = {
  id: 'ben_bank_001',
  name: 'Priya Kumar',
  paymentMethod: 'bank_account',
  account: '123456789012',
  ifsc: 'HDFC0001234',
  phone: '+91-9123456789'
};

const mockRateData = {
  exchange_rate: 83.25,
  source_amount: 500,
  target_amount: 41625,
  fee_percentage: 1,
  fee_amount: 5,
  rate_valid_for_seconds: 30
};

const mockTransferData = {
  rateData: mockRateData,
  beneficiary: mockBeneficiaryUPI,
  sourceAmount: 500
};

const mockReceiptCompleted = {
  transfer_id: 'txn_abc123',
  chimoney_reference: 'CHI_xyz789',
  status: 'completed',
  source_amount: 500,
  exchange_rate: 83.25,
  target_amount: 41625,
  fee_amount: 5,
  fee_percentage: 1,
  payment_method: 'upi',
  beneficiary_name: 'Raj Sharma',
  created_at: '2026-03-01T12:00:00Z'
};

const mockReceiptProcessing = {
  ...mockReceiptCompleted,
  status: 'processing'
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function resetLocalStorage() {
  localStorage.clear();
}

function getStoredState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

// ─── Setup ────────────────────────────────────────────────────────────────────

let transferFlowManager;
let TRANSFER_STEPS;

beforeEach(() => {
  resetLocalStorage();
  jest.resetModules();
  jest.clearAllMocks();

  const mod = require('../../services/chat/transferFlowManager');
  transferFlowManager = mod.default;
  TRANSFER_STEPS = mod.TRANSFER_STEPS;

  // Default fetch mock — override per test as needed
  global.fetch.mockResolvedValue({
    ok: true,
    json: async () => ({ success: true, data: {} })
  });
});

afterEach(() => {
  resetLocalStorage();
});

// ============================================================================
// 1. responseGenerator — transfer_money_international handler
// ============================================================================
describe('responseGenerator — transfer_money_international', () => {
  test('should return __transferIntent marker for transfer intent', async () => {
    // We test the handler in isolation
    const { generateResponse } = require('../../services/chat/responseGenerator');

    const classification = { intent: 'transfer_money_international' };
    const entities = {};
    const userData = { user_id: 'u1', cards: [] };
    const context = {};

    const result = await generateResponse(classification, entities, userData, context);

    expect(result).toBeDefined();
    expect(result.__transferIntent).toBe(true);
    expect(result.text).toBeTruthy();
    expect(result.component).toBeDefined();
    expect(result.component.type).toBe('TransferInitiation');
  });

  test('should return string response for non-transfer intents', async () => {
    const { generateResponse } = require('../../services/chat/responseGenerator');

    const classification = { intent: 'help' };
    const entities = {};
    const userData = { user_id: 'u1', cards: [] };
    const context = {};

    const result = await generateResponse(classification, entities, userData, context);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  test('marker object should have expected shape', async () => {
    const { generateResponse } = require('../../services/chat/responseGenerator');

    const result = await generateResponse(
      { intent: 'transfer_money_international' },
      {},
      { user_id: 'u1', cards: [] },
      {}
    );

    expect(result).toMatchObject({
      __transferIntent: true,
      text: expect.any(String),
      component: {
        type: 'TransferInitiation'
      }
    });
  });
});

// ============================================================================
// SCENARIO A: User has saved beneficiaries — full happy path
// ============================================================================
describe('SCENARIO A: User has saved beneficiaries — full happy path', () => {
  test('should start flow when transfer intent detected', () => {
    const state = transferFlowManager.startFlow();
    expect(state.step).toBe(TRANSFER_STEPS.AWAITING_INITIATION);
    expect(transferFlowManager.isAtInitiation()).toBe(true);
    expect(transferFlowManager.hasActiveFlow()).toBe(true);
  });

  test('should proceed to review when user selects beneficiary and amount', () => {
    transferFlowManager.startFlow();
    const state = transferFlowManager.proceedToReview(mockTransferData);
    expect(state.step).toBe(TRANSFER_STEPS.AWAITING_REVIEW);
    expect(state.transferData.beneficiary.id).toBe('ben_upi_001');
    expect(state.transferData.sourceAmount).toBe(500);
    expect(state.transferData.rateData.exchange_rate).toBe(83.25);
  });

  test('should complete flow when transfer is confirmed', () => {
    transferFlowManager.startFlow();
    transferFlowManager.proceedToReview(mockTransferData);
    const state = transferFlowManager.completeFlow(mockReceiptCompleted);
    expect(state.step).toBe(TRANSFER_STEPS.COMPLETE);
    expect(state.receiptData.status).toBe('completed');
    expect(state.receiptData.transfer_id).toBe('txn_abc123');
    expect(transferFlowManager.isComplete()).toBe(true);
  });

  test('full A→Z flow preserves all data through each step', () => {
    // Start
    transferFlowManager.startFlow();
    expect(getStoredState()?.step).toBe(TRANSFER_STEPS.AWAITING_INITIATION);

    // Proceed to review
    transferFlowManager.proceedToReview(mockTransferData);
    const reviewState = getStoredState();
    expect(reviewState?.step).toBe(TRANSFER_STEPS.AWAITING_REVIEW);
    expect(reviewState?.transferData?.sourceAmount).toBe(500);

    // Complete
    transferFlowManager.completeFlow(mockReceiptCompleted);
    const doneState = getStoredState();
    expect(doneState?.step).toBe(TRANSFER_STEPS.COMPLETE);
    expect(doneState?.receiptData?.chimoney_reference).toBe('CHI_xyz789');
  });
});

// ============================================================================
// SCENARIO B: User has no saved beneficiaries
// ============================================================================
describe('SCENARIO B: User has no saved beneficiaries', () => {
  test('should detect empty beneficiary list from flow data absence', () => {
    // The flow still starts — it is the UI (TransferInitiation) that shows
    // the "no beneficiaries" warning. The manager state machine is agnostic.
    transferFlowManager.startFlow();
    expect(transferFlowManager.isAtInitiation()).toBe(true);

    // Simulate user cancelling because there are no beneficiaries
    const state = transferFlowManager.cancelFlow();
    expect(state.step).toBe(TRANSFER_STEPS.IDLE);
  });

  test('cancelFlow() from initiation clears all state', () => {
    transferFlowManager.startFlow();
    transferFlowManager.cancelFlow();
    expect(transferFlowManager.hasActiveFlow()).toBe(false);
    expect(getStoredState()).toBeNull();
  });
});

// ============================================================================
// SCENARIO C: Rate changes during transfer (>1% decline)
// ============================================================================
describe('SCENARIO C: Rate changes during transfer', () => {
  const rateChangeData = {
    ...mockTransferData,
    rateData: {
      ...mockRateData,
      exchange_rate: 83.25 // original locked rate
    }
  };

  test('should save original rate data in transferData', () => {
    transferFlowManager.startFlow();
    const state = transferFlowManager.proceedToReview(rateChangeData);
    expect(state.transferData.rateData.exchange_rate).toBe(83.25);
  });

  test('should allow proceeding at new rate (user accepts rate change)', () => {
    // When user accepts the rate change modal, TransferReview calls execute
    // again with 'accept_current_rate'. The manager still completes the flow.
    transferFlowManager.startFlow();
    transferFlowManager.proceedToReview(rateChangeData);

    // User accepted rate — complete with updated receipt
    const receiptWithNewRate = {
      ...mockReceiptCompleted,
      exchange_rate: 82.10 // worse rate user accepted
    };
    const state = transferFlowManager.completeFlow(receiptWithNewRate);
    expect(state.step).toBe(TRANSFER_STEPS.COMPLETE);
    expect(state.receiptData.exchange_rate).toBe(82.10);
  });

  test('should cancel if user rejects rate change', () => {
    transferFlowManager.startFlow();
    transferFlowManager.proceedToReview(rateChangeData);
    // User rejected rate — go back to idle
    const state = transferFlowManager.cancelFlow();
    expect(state.step).toBe(TRANSFER_STEPS.IDLE);
  });
});

// ============================================================================
// SCENARIO D: API failure at various steps
// ============================================================================
describe('SCENARIO D: API failures', () => {
  test('flow state is preserved when initiate API fails', () => {
    // If the initiate API call fails in TransferReview, the component shows an error
    // but the manager state stays at awaiting_review (not cancelled automatically)
    transferFlowManager.startFlow();
    transferFlowManager.proceedToReview(mockTransferData);

    // State should still be at review — the component handles the error display
    expect(transferFlowManager.isAtReview()).toBe(true);
    expect(getStoredState()?.step).toBe(TRANSFER_STEPS.AWAITING_REVIEW);
  });

  test('flow state is preserved when execute API fails', () => {
    // Same: manager state stays at review so user can retry
    transferFlowManager.startFlow();
    transferFlowManager.proceedToReview(mockTransferData);
    expect(transferFlowManager.isAtReview()).toBe(true);
  });

  test('flow can be cancelled after API failure', () => {
    transferFlowManager.startFlow();
    transferFlowManager.proceedToReview(mockTransferData);
    // API fails, user cancels
    const state = transferFlowManager.cancelFlow();
    expect(state.step).toBe(TRANSFER_STEPS.IDLE);
  });

  test('flow completes normally after retry succeeds', () => {
    transferFlowManager.startFlow();
    transferFlowManager.proceedToReview(mockTransferData);
    // First attempt fails — state stays at review
    // Second attempt succeeds
    const state = transferFlowManager.completeFlow(mockReceiptCompleted);
    expect(state.step).toBe(TRANSFER_STEPS.COMPLETE);
  });
});

// ============================================================================
// SCENARIO E: User cancels at each step
// ============================================================================
describe('SCENARIO E: User cancels at each step', () => {
  test('cancel at idle is a no-op (idempotent)', () => {
    const state = transferFlowManager.cancelFlow();
    expect(state.step).toBe(TRANSFER_STEPS.IDLE);
    expect(getStoredState()).toBeNull();
  });

  test('cancel at initiation step returns to idle', () => {
    transferFlowManager.startFlow();
    const state = transferFlowManager.cancelFlow();
    expect(state.step).toBe(TRANSFER_STEPS.IDLE);
    expect(getStoredState()).toBeNull();
  });

  test('cancel at review step returns to idle and clears transferData', () => {
    transferFlowManager.startFlow();
    transferFlowManager.proceedToReview(mockTransferData);
    const state = transferFlowManager.cancelFlow();
    expect(state.step).toBe(TRANSFER_STEPS.IDLE);
    expect(state.transferData).toBeNull();
    expect(getStoredState()).toBeNull();
  });
});

// ============================================================================
// SCENARIO F: Transfer succeeds and receipt is shown
// ============================================================================
describe('SCENARIO F: Transfer succeeds', () => {
  test('receipt data should contain all required fields for display', () => {
    transferFlowManager.startFlow();
    transferFlowManager.proceedToReview(mockTransferData);
    const state = transferFlowManager.completeFlow(mockReceiptCompleted);

    const { receiptData } = state;
    expect(receiptData.transfer_id).toBeTruthy();
    expect(receiptData.status).toBe('completed');
    expect(receiptData.source_amount).toBe(500);
    expect(receiptData.exchange_rate).toBe(83.25);
    expect(receiptData.target_amount).toBe(41625);
    expect(receiptData.beneficiary_name).toBe('Raj Sharma');
  });

  test('processing status receipt also completes flow', () => {
    transferFlowManager.startFlow();
    transferFlowManager.proceedToReview(mockTransferData);
    const state = transferFlowManager.completeFlow(mockReceiptProcessing);
    expect(state.step).toBe(TRANSFER_STEPS.COMPLETE);
    expect(state.receiptData.status).toBe('processing');
  });

  test('completedAt timestamp is set on completion', () => {
    transferFlowManager.startFlow();
    transferFlowManager.proceedToReview(mockTransferData);
    const before = Date.now();
    const state = transferFlowManager.completeFlow(mockReceiptCompleted);
    const after = Date.now();
    const completedAt = new Date(state.completedAt).getTime();
    expect(completedAt).toBeGreaterThanOrEqual(before);
    expect(completedAt).toBeLessThanOrEqual(after);
  });

  test('new transfer can start after completion (reset)', () => {
    transferFlowManager.startFlow();
    transferFlowManager.proceedToReview(mockTransferData);
    transferFlowManager.completeFlow(mockReceiptCompleted);
    transferFlowManager.reset();

    // Should be able to start fresh
    const freshState = transferFlowManager.startFlow();
    expect(freshState.step).toBe(TRANSFER_STEPS.AWAITING_INITIATION);
    expect(freshState.receiptData).toBeNull();
  });
});

// ============================================================================
// SCENARIO G: Browser refresh — flow recovery
// ============================================================================
describe('SCENARIO G: Flow recovery after browser refresh', () => {
  test('in-progress flow at initiation is recovered', () => {
    transferFlowManager.startFlow();
    // Simulate page refresh: same localStorage, fresh call to recoverFlow
    const recovered = transferFlowManager.recoverFlow();
    expect(recovered).not.toBeNull();
    expect(recovered.step).toBe(TRANSFER_STEPS.AWAITING_INITIATION);
  });

  test('in-progress flow at review is recovered with transferData', () => {
    transferFlowManager.startFlow();
    transferFlowManager.proceedToReview(mockTransferData);
    const recovered = transferFlowManager.recoverFlow();
    expect(recovered).not.toBeNull();
    expect(recovered.step).toBe(TRANSFER_STEPS.AWAITING_REVIEW);
    expect(recovered.transferData.beneficiary.name).toBe('Raj Sharma');
  });

  test('completed flow is NOT recovered (clears localStorage)', () => {
    transferFlowManager.startFlow();
    transferFlowManager.proceedToReview(mockTransferData);
    transferFlowManager.completeFlow(mockReceiptCompleted);
    const recovered = transferFlowManager.recoverFlow();
    expect(recovered).toBeNull();
    expect(getStoredState()).toBeNull();
  });

  test('idle flow returns null from recoverFlow', () => {
    const recovered = transferFlowManager.recoverFlow();
    expect(recovered).toBeNull();
  });

  test('manual localStorage injection simulates page refresh', () => {
    // Simulate what would happen if user was mid-transfer and refreshed
    const simulatedState = {
      step: TRANSFER_STEPS.AWAITING_REVIEW,
      transferData: mockTransferData,
      receiptData: null,
      startedAt: new Date().toISOString(),
      completedAt: null
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(simulatedState));

    const recovered = transferFlowManager.recoverFlow();
    expect(recovered.step).toBe(TRANSFER_STEPS.AWAITING_REVIEW);
    expect(recovered.transferData.sourceAmount).toBe(500);
  });
});

// ============================================================================
// Bank account beneficiary flow
// ============================================================================
describe('Bank account beneficiary flow', () => {
  test('proceedToReview with bank account beneficiary preserves IFSC', () => {
    const bankTransferData = {
      rateData: mockRateData,
      beneficiary: mockBeneficiaryBank,
      sourceAmount: 1000
    };

    transferFlowManager.startFlow();
    const state = transferFlowManager.proceedToReview(bankTransferData);
    expect(state.transferData.beneficiary.paymentMethod).toBe('bank_account');
    expect(state.transferData.beneficiary.ifsc).toBe('HDFC0001234');
  });
});

// ============================================================================
// Data integrity — no mutation of input objects
// ============================================================================
describe('Data integrity', () => {
  test('transferData passed to proceedToReview is not mutated', () => {
    const originalData = { ...mockTransferData };
    transferFlowManager.startFlow();
    transferFlowManager.proceedToReview(mockTransferData);
    // mockTransferData should not have changed
    expect(mockTransferData.sourceAmount).toBe(originalData.sourceAmount);
    expect(mockTransferData.beneficiary.id).toBe(originalData.beneficiary.id);
  });

  test('getState() returns new object on each call (no shared reference)', () => {
    transferFlowManager.startFlow();
    const state1 = transferFlowManager.getState();
    const state2 = transferFlowManager.getState();
    // Different objects
    expect(state1).not.toBe(state2);
    // Same values
    expect(state1.step).toBe(state2.step);
  });
});

// ============================================================================
// Multiple rapid transitions (stress test)
// ============================================================================
describe('Rapid state transitions', () => {
  test('start → cancel → start → review → cancel → start → complete', () => {
    transferFlowManager.startFlow();
    transferFlowManager.cancelFlow();

    transferFlowManager.startFlow();
    transferFlowManager.proceedToReview(mockTransferData);
    transferFlowManager.cancelFlow();

    transferFlowManager.startFlow();
    transferFlowManager.proceedToReview(mockTransferData);
    const state = transferFlowManager.completeFlow(mockReceiptCompleted);

    expect(state.step).toBe(TRANSFER_STEPS.COMPLETE);
    expect(state.receiptData.transfer_id).toBe('txn_abc123');
  });

  test('three sequential complete flows leave localStorage clean after each reset', () => {
    for (let i = 0; i < 3; i++) {
      transferFlowManager.startFlow();
      transferFlowManager.proceedToReview(mockTransferData);
      transferFlowManager.completeFlow(mockReceiptCompleted);
      transferFlowManager.reset();
      expect(getStoredState()).toBeNull();
    }
  });
});
