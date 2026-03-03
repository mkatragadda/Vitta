/**
 * RateChangeModal Component
 *
 * Alert modal shown when the exchange rate has declined by more than 1%
 * between the time the user fetched a locked rate and when the transfer
 * was executed. The user can either:
 * - Accept the current (lower) rate and proceed with the transfer.
 * - Reject and return to the initiation step to modify the amount or wait.
 *
 * Props:
 * @param {Object} rateDecision        - Rate decision object from the execute API
 * @param {number} rateDecision.original_rate   - Rate the user locked in
 * @param {number} rateDecision.current_rate    - Rate at time of execution
 * @param {number} rateDecision.change_percent  - Percentage decline (positive = decline)
 * @param {number} rateDecision.loss_amount     - Extra INR the recipient would have received
 * @param {Function} onAccept          - Called when user approves transfer at new rate
 * @param {Function} onReject          - Called when user wants to go back
 *
 * @component
 * @example
 * <RateChangeModal
 *   rateDecision={{
 *     original_rate: 83.50,
 *     current_rate: 82.10,
 *     change_percent: 1.68,
 *     loss_amount: 700
 *   }}
 *   onAccept={() => executeWithNewRate()}
 *   onReject={() => setStep('initiation')}
 * />
 */

import React, { useEffect, useRef } from 'react';
import { AlertTriangle, TrendingDown, Check, X } from 'lucide-react';

const RateChangeModal = ({ rateDecision, onAccept, onReject }) => {
  const modalRef = useRef(null);
  const acceptButtonRef = useRef(null);

  // Focus the modal container for keyboard accessibility
  useEffect(() => {
    if (modalRef.current) {
      modalRef.current.focus();
    }
  }, []);

  /**
   * Handle keyboard events — Escape closes the modal (reject).
   * @param {React.KeyboardEvent} e
   */
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onReject();
    }
  };

  /**
   * Format INR value with commas.
   * @param {number} value
   * @returns {string}
   */
  const formatINR = (value) => {
    if (value === undefined || value === null) return '—';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const originalRate = rateDecision?.original_rate;
  const currentRate = rateDecision?.current_rate;
  const changePercent = rateDecision?.change_percent;
  const lossAmount = rateDecision?.loss_amount;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rate-change-title"
      aria-describedby="rate-change-description"
      onKeyDown={handleKeyDown}
    >
      {/* Modal panel */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl outline-none"
      >
        {/* Warning header */}
        <div className="bg-amber-50 rounded-t-2xl px-6 py-5 border-b border-amber-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-full shrink-0">
              <AlertTriangle size={24} className="text-amber-600" />
            </div>
            <div>
              <h2
                id="rate-change-title"
                className="text-lg font-bold text-amber-900"
              >
                Exchange Rate Changed
              </h2>
              <p className="text-sm text-amber-700 mt-0.5">
                The rate has dropped since you locked it in.
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Rate comparison */}
          <div
            id="rate-change-description"
            className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3"
          >
            {/* Original rate */}
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Rate You Locked
                </p>
                <p className="text-lg font-bold text-gray-900 mt-0.5">
                  1 USD = {originalRate?.toFixed(2)} INR
                </p>
              </div>
            </div>

            {/* Divider with change indicator */}
            <div className="flex items-center gap-2">
              <div className="flex-1 border-t border-gray-200" />
              <div className="flex items-center gap-1 px-2 py-0.5 bg-red-100 rounded-full">
                <TrendingDown size={12} className="text-red-600" />
                <span className="text-xs font-semibold text-red-700">
                  −{changePercent?.toFixed(2)}%
                </span>
              </div>
              <div className="flex-1 border-t border-gray-200" />
            </div>

            {/* Current rate */}
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Current Rate
                </p>
                <p className="text-lg font-bold text-red-700 mt-0.5">
                  1 USD = {currentRate?.toFixed(2)} INR
                </p>
              </div>
            </div>
          </div>

          {/* Impact summary */}
          {lossAmount !== undefined && lossAmount !== null && (
            <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-800">
                  Recipient will receive {formatINR(lossAmount)} less
                </p>
                <p className="text-xs text-red-700 mt-0.5">
                  Due to the rate change, the recipient will receive less INR than originally shown.
                </p>
              </div>
            </div>
          )}

          {/* Decision prompt */}
          <p className="text-sm text-gray-700 text-center">
            Do you want to proceed at the current rate, or go back to modify your transfer?
          </p>
        </div>

        {/* Action buttons */}
        <div className="px-6 pb-6 flex flex-col sm:flex-row gap-3">
          {/* Reject — go back */}
          <button
            type="button"
            onClick={onReject}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
            aria-label="Go back and modify transfer"
          >
            <X size={18} />
            Go Back
          </button>

          {/* Accept — proceed at new rate */}
          <button
            ref={acceptButtonRef}
            type="button"
            onClick={onAccept}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg transition focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
            aria-label="Accept new rate and continue with transfer"
          >
            <Check size={18} />
            Accept &amp; Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default RateChangeModal;
