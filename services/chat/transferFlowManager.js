/**
 * Transfer Flow Manager
 *
 * Manages the state machine for the international money transfer chat flow.
 * When a user expresses transfer intent in chat, this manager tracks their
 * progress through each step: initiation → review → receipt.
 *
 * State Machine:
 *   idle
 *     → awaiting_initiation  (transfer intent detected, component shown)
 *     → awaiting_review      (user clicked Continue from TransferInitiation)
 *     → complete             (transfer executed, receipt shown)
 *
 * The state is persisted to localStorage under STORAGE_KEY so it can survive
 * page refreshes. The stored value is a plain JSON object — no functions.
 *
 * Usage:
 *   import transferFlowManager from './transferFlowManager';
 *
 *   // On transfer intent detected:
 *   transferFlowManager.startFlow();
 *
 *   // On user proceeds from initiation:
 *   transferFlowManager.proceedToReview({ rateData, beneficiary, sourceAmount });
 *
 *   // On transfer confirmed:
 *   transferFlowManager.completeFlow(receiptData);
 *
 *   // On cancel at any step:
 *   transferFlowManager.cancelFlow();
 *
 *   // To check current state:
 *   transferFlowManager.getState();
 *
 *   // To reset (new transfer):
 *   transferFlowManager.reset();
 */

const STORAGE_KEY = 'vitta_transfer_flow_state';

/**
 * Valid steps in the transfer flow.
 * @enum {string}
 */
export const TRANSFER_STEPS = {
  IDLE: 'idle',
  AWAITING_INITIATION: 'awaiting_initiation',
  AWAITING_REVIEW: 'awaiting_review',
  COMPLETE: 'complete'
};

/**
 * Default/empty state object.
 * @returns {Object}
 */
function createInitialState() {
  return {
    step: TRANSFER_STEPS.IDLE,
    transferData: null,   // { rateData, beneficiary, sourceAmount } from initiation
    receiptData: null,    // receipt object from execute API
    startedAt: null,      // ISO string timestamp when flow started
    completedAt: null     // ISO string timestamp when flow completed
  };
}

/**
 * Load persisted state from localStorage.
 * Falls back to initial state on any parse error.
 * @returns {Object}
 */
function loadState() {
  if (typeof window === 'undefined') return createInitialState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw);
    // Validate required fields exist
    if (!parsed || !TRANSFER_STEPS[parsed.step?.toUpperCase?.()?.replace(/-/g, '_')] &&
        !Object.values(TRANSFER_STEPS).includes(parsed.step)) {
      return createInitialState();
    }
    return parsed;
  } catch (err) {
    console.error('[TransferFlowManager] Failed to load state from localStorage:', err);
    return createInitialState();
  }
}

/**
 * Persist state to localStorage.
 * No-op in SSR environments.
 * @param {Object} state
 */
function saveState(state) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('[TransferFlowManager] Failed to save state to localStorage:', err);
  }
}

/**
 * Remove persisted state from localStorage.
 */
function clearState() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('[TransferFlowManager] Failed to clear state from localStorage:', err);
  }
}

/**
 * Transfer Flow Manager singleton.
 * Manages state transitions for the international money transfer chat flow.
 */
const transferFlowManager = {
  /**
   * Get the current flow state.
   * Reads from in-memory copy (which is synced with localStorage).
   * @returns {{ step: string, transferData: Object|null, receiptData: Object|null, startedAt: string|null, completedAt: string|null }}
   */
  getState() {
    return loadState();
  },

  /**
   * Whether any active (non-idle, non-complete) flow step exists.
   * Used to detect if the user was in the middle of a transfer on page reload.
   * @returns {boolean}
   */
  hasActiveFlow() {
    const state = loadState();
    return state.step !== TRANSFER_STEPS.IDLE && state.step !== TRANSFER_STEPS.COMPLETE;
  },

  /**
   * Whether the flow is at the initiation step (TransferInitiation component shown).
   * @returns {boolean}
   */
  isAtInitiation() {
    return loadState().step === TRANSFER_STEPS.AWAITING_INITIATION;
  },

  /**
   * Whether the flow is at the review step (TransferReview component shown).
   * @returns {boolean}
   */
  isAtReview() {
    return loadState().step === TRANSFER_STEPS.AWAITING_REVIEW;
  },

  /**
   * Whether the flow is complete (TransferReceipt component shown).
   * @returns {boolean}
   */
  isComplete() {
    return loadState().step === TRANSFER_STEPS.COMPLETE;
  },

  /**
   * Start a new transfer flow.
   * Transitions: idle → awaiting_initiation.
   * Clears any previous flow state.
   * @returns {Object} New state
   */
  startFlow() {
    const state = {
      ...createInitialState(),
      step: TRANSFER_STEPS.AWAITING_INITIATION,
      startedAt: new Date().toISOString()
    };
    saveState(state);
    console.log('[TransferFlowManager] Flow started → awaiting_initiation');
    return state;
  },

  /**
   * User clicked Continue on TransferInitiation — move to review.
   * Transitions: awaiting_initiation → awaiting_review.
   *
   * @param {{ rateData: Object, beneficiary: Object, sourceAmount: number }} transferData
   * @returns {Object} Updated state
   * @throws {Error} If not currently in awaiting_initiation step
   */
  proceedToReview(transferData) {
    const current = loadState();
    if (current.step !== TRANSFER_STEPS.AWAITING_INITIATION) {
      console.warn('[TransferFlowManager] proceedToReview called from invalid step:', current.step);
    }
    const state = {
      ...current,
      step: TRANSFER_STEPS.AWAITING_REVIEW,
      transferData
    };
    saveState(state);
    console.log('[TransferFlowManager] → awaiting_review', { beneficiary: transferData?.beneficiary?.name });
    return state;
  },

  /**
   * Transfer executed successfully — mark complete.
   * Transitions: awaiting_review → complete.
   *
   * @param {Object} receiptData - Data returned from execute API
   * @returns {Object} Updated state
   */
  completeFlow(receiptData) {
    const current = loadState();
    const state = {
      ...current,
      step: TRANSFER_STEPS.COMPLETE,
      receiptData,
      completedAt: new Date().toISOString()
    };
    saveState(state);
    console.log('[TransferFlowManager] → complete', { transferId: receiptData?.transfer_id });
    return state;
  },

  /**
   * User cancelled or an error occurred — return to idle.
   * Clears all flow data and removes persisted state.
   * @returns {Object} Initial state
   */
  cancelFlow() {
    clearState();
    console.log('[TransferFlowManager] Flow cancelled → idle');
    return createInitialState();
  },

  /**
   * Reset to idle (used for "New Transfer" action from receipt screen).
   * Same as cancelFlow but semantically distinct.
   * @returns {Object} Initial state
   */
  reset() {
    clearState();
    console.log('[TransferFlowManager] Flow reset → idle');
    return createInitialState();
  },

  /**
   * Recover flow state after page refresh.
   * Returns the persisted state if it represents an in-progress flow,
   * otherwise returns null indicating no recovery is needed.
   *
   * @returns {{ step: string, transferData: Object|null } | null}
   */
  recoverFlow() {
    const state = loadState();
    if (state.step === TRANSFER_STEPS.IDLE) return null;
    if (state.step === TRANSFER_STEPS.COMPLETE) {
      // Don't recover completed flows — clear and return null
      clearState();
      return null;
    }
    console.log('[TransferFlowManager] Recovering in-progress flow at step:', state.step);
    return state;
  }
};

export default transferFlowManager;
