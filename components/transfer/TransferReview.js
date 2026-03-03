/**
 * TransferReview Component
 *
 * Second step of the international transfer flow. Displays a full summary of
 * the pending transfer and allows the user to confirm or cancel.
 *
 * On confirm:
 * 1. Calls POST /api/transfers/initiate to create a pending transfer record.
 * 2. Calls POST /api/transfers/execute to execute the transfer.
 * 3. If the execute response includes a rate_decision with action='alert',
 *    shows <RateChangeModal> for user approval.
 * 4. On success, calls onConfirm with the completed transfer data.
 *
 * Props:
 * @param {Object} transferData - Contains rateData, beneficiary, sourceAmount
 * @param {Function} onConfirm  - Called with transfer receipt data on success
 * @param {Function} onCancel   - Called when user clicks Cancel
 *
 * @component
 * @example
 * <TransferReview
 *   transferData={{ rateData, beneficiary, sourceAmount: 500 }}
 *   onConfirm={(receipt) => setTransferReceipt(receipt)}
 *   onCancel={() => setStep('initiation')}
 * />
 */

import React, { useState, useCallback } from 'react';
import {
  ArrowDown,
  CheckCircle,
  X,
  AlertCircle,
  Loader,
  Shield,
  Clock
} from 'lucide-react';
import RateChangeModal from './RateChangeModal';

const TransferReview = ({ transferData, userId, userData, onConfirm, onCancel }) => {
  const { rateData, beneficiary, sourceAmount } = transferData || {};

  // Get available transfer accounts
  const availableAccounts = userData?.cards || [];
  const defaultPlaidAccountId = availableAccounts[0]?.id;

  // Component state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rateDecision, setRateDecision] = useState(null); // Populated when rate changes >1%
  const [pendingTransferId, setPendingTransferId] = useState(null); // From initiate call
  const [selectedSourceAccountId, setSelectedSourceAccountId] = useState(defaultPlaidAccountId);

  /**
   * Format a monetary value with currency symbol.
   * @param {number} value
   * @param {string} currency - ISO currency code
   * @returns {string}
   */
  const formatCurrency = (value, currency = 'USD') => {
    if (value === undefined || value === null) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: currency === 'INR' ? 0 : 2,
      maximumFractionDigits: currency === 'INR' ? 0 : 2
    }).format(value);
  };

  /**
   * Get the payment method display string for the beneficiary.
   * @returns {string}
   */
  const getPaymentDetail = () => {
    if (!beneficiary) return '—';
    if (beneficiary.paymentMethod === 'upi') return `UPI: ${beneficiary.upiId}`;
    const last4 = String(beneficiary.account || '').slice(-4);
    return `Bank Account: ****${last4} · IFSC: ${beneficiary.ifsc || '—'}`;
  };

  /**
   * Get settlement time based on payment method.
   * @returns {string}
   */
  const getSettlementTime = () => {
    if (!beneficiary) return '1-3 business days';
    return beneficiary.paymentMethod === 'upi' ? 'Instant (UPI)' : '1-3 business days';
  };

  /**
   * Step 1 of confirmation: Initiate the transfer to get a transfer_id.
   * Step 2: Execute the transfer; handle smart rate logic from backend.
   * @param {string|null} [rateConfirmation=null] - 'accept_current_rate' if user approved rate drop
   */
  const handleConfirm = useCallback(
    async (rateConfirmation = null) => {
      setLoading(true);
      setError('');

      try {
        let transferId = pendingTransferId;

        // --- Step 1: Initiate (only on first attempt) ---
        if (!transferId) {
          console.log('[TransferReview] Initiating transfer...');
          const initiateResponse = await fetch('/api/transfers/initiate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': userId
            },
            body: JSON.stringify({
              beneficiary_id: beneficiary?.id,
              plaid_transfer_account_id: selectedSourceAccountId,
              source_amount: sourceAmount,
              exchange_rate: rateData?.exchange_rate,
              expires_at: rateData?.expires_at
            })
          });

          const initiateResult = await initiateResponse.json();
          console.log('[TransferReview] Initiate response:', initiateResult);

          if (!initiateResponse.ok || !initiateResult.success) {
            setError(initiateResult.error_message || 'Failed to initiate transfer. Please try again.');
            setLoading(false);
            return;
          }

          transferId = initiateResult.data?.transfer_id;
          setPendingTransferId(transferId);
        }

        // --- Step 2: Execute ---
        console.log('[TransferReview] Executing transfer:', transferId);
        const executeResponse = await fetch('/api/transfers/execute', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': userId
          },
          body: JSON.stringify({
            transfer_id: transferId,
            rate_confirmation: rateConfirmation
          })
        });

        const executeResult = await executeResponse.json();
        console.log('[TransferReview] Execute response:', executeResult);

        // --- Handle rate change alert ---
        if (
          executeResult.rate_decision?.action === 'alert' ||
          executeResult.error_code === 'RATE_CHANGED'
        ) {
          console.log('[TransferReview] Rate changed >1%, showing modal');
          setRateDecision(executeResult.rate_decision);
          setLoading(false);
          return;
        }

        if (!executeResponse.ok || !executeResult.success) {
          setError(executeResult.error_message || 'Transfer execution failed. Please try again.');
          setLoading(false);
          return;
        }

        // --- Success ---
        console.log('[TransferReview] Transfer completed:', executeResult.data);
        onConfirm(executeResult.data);
      } catch (err) {
        console.error('[TransferReview] Network error:', err);
        setError('Network error. Please check your connection and try again.');
        setLoading(false);
      }
    },
    [beneficiary, sourceAmount, pendingTransferId, userId, rateData, selectedSourceAccountId, onConfirm]
  );

  /**
   * Handle user accepting the rate drop in <RateChangeModal>.
   */
  const handleRateAccept = useCallback(() => {
    setRateDecision(null);
    handleConfirm('accept_current_rate');
  }, [handleConfirm]);

  /**
   * Handle user rejecting the rate drop — go back to initiation.
   */
  const handleRateReject = useCallback(() => {
    setRateDecision(null);
    setPendingTransferId(null);
    onCancel();
  }, [onCancel]);

  return (
    <>
      <div className="w-full max-w-lg mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Review Transfer</h2>
          <p className="text-sm text-gray-500 mt-1">Confirm all details before sending</p>
        </div>

        {/* Transfer flow diagram */}
        <div className="mb-5 bg-white border border-gray-200 rounded-xl p-5 space-y-1 shadow-sm">
          {/* Source */}
          <div className="text-center">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              You Send
            </p>
            <p className="text-3xl font-bold text-gray-900">
              {formatCurrency(sourceAmount, 'USD')}
            </p>
          </div>

          {/* Arrow with rate */}
          <div className="flex flex-col items-center py-2 gap-0.5">
            <ArrowDown size={20} className="text-purple-400" />
            <span className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-full px-2 py-0.5">
              1 USD = {rateData?.exchange_rate?.toFixed(2)} INR
            </span>
            <ArrowDown size={20} className="text-purple-400" />
          </div>

          {/* Destination */}
          <div className="text-center">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Recipient Gets
            </p>
            <p className="text-3xl font-bold text-purple-700">
              {formatCurrency(rateData?.target_amount, 'INR')}
            </p>
          </div>
        </div>

        {/* Source account selection */}
        {availableAccounts.length > 0 && (
          <div className="mb-4 bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Transfer From (Source Account)
            </h3>
            <select
              value={selectedSourceAccountId || ''}
              onChange={(e) => setSelectedSourceAccountId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {availableAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.card_name || account.nickname || account.name || 'Account'}
                  {account.current_balance !== undefined &&
                    ` - Balance: $${account.current_balance?.toLocaleString()}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Recipient details */}
        <div className="mb-4 bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Recipient Details
          </h3>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Name</span>
              <span className="font-medium text-gray-900">{beneficiary?.name || '—'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Phone</span>
              <span className="font-medium text-gray-900">{beneficiary?.phone || '—'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Payment</span>
              <span className="font-medium text-gray-900 text-right max-w-[60%] break-words">
                {getPaymentDetail()}
              </span>
            </div>
          </div>
        </div>

        {/* Fee breakdown */}
        <div className="mb-4 bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Fee Breakdown
          </h3>

          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Transfer amount</span>
            <span className="text-gray-900">{formatCurrency(rateData?.source_amount, 'USD')}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-gray-600">
              Service fee ({rateData?.fee_percentage}%)
            </span>
            <span className="text-gray-900">−{formatCurrency(rateData?.fee_amount, 'USD')}</span>
          </div>

          <div className="border-t border-gray-200 pt-2 flex justify-between text-sm font-semibold bg-orange-50 -mx-4 px-4 py-2">
            <span className="text-gray-900">Total charged to your account</span>
            <span className="text-orange-700">{formatCurrency((rateData?.source_amount || 0) + (rateData?.fee_amount || 0), 'USD')}</span>
          </div>

          <div className="border-t border-gray-200 pt-2 flex justify-between text-sm font-semibold">
            <span className="text-gray-900">Recipient receives</span>
            <span className="text-purple-700">{formatCurrency(rateData?.target_amount, 'INR')}</span>
          </div>
        </div>

        {/* Settlement time */}
        <div className="mb-5 flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
          <Clock size={14} className="text-blue-600 shrink-0" />
          <p className="text-xs text-blue-800">
            <span className="font-semibold">Estimated delivery:</span> {getSettlementTime()}
          </p>
        </div>

        {/* Security note */}
        <div className="mb-5 flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
          <Shield size={14} className="text-green-600 shrink-0" />
          <p className="text-xs text-green-800">
            Your transfer is secured with bank-grade encryption.
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
            aria-label="Cancel transfer"
          >
            <X size={18} />
            Cancel
          </button>

          <button
            type="button"
            onClick={() => handleConfirm(null)}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-br from-purple-600 to-blue-500 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            aria-label="Confirm and send transfer"
          >
            {loading ? (
              <>
                <Loader size={18} className="animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle size={18} />
                Confirm &amp; Send
              </>
            )}
          </button>
        </div>

        <p className="mt-3 text-center text-xs text-gray-500">
          By confirming, you agree to the transfer terms and authorize the debit.
        </p>
      </div>

      {/* Rate Change Modal overlay */}
      {rateDecision && (
        <RateChangeModal
          rateDecision={rateDecision}
          onAccept={handleRateAccept}
          onReject={handleRateReject}
        />
      )}
    </>
  );
};

export default TransferReview;
