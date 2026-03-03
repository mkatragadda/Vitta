/**
 * TransferReceipt Component
 *
 * Final step of the international transfer flow. Displays a success confirmation
 * screen with all transaction details after a transfer is completed.
 *
 * Features:
 * - Success status with transaction reference IDs
 * - Summary: amount sent, exchange rate, amount received
 * - Settlement timeline (instant for UPI, 1-3 days for bank)
 * - Expandable transaction details section
 * - "New Transfer" and "Back to Home" action buttons
 *
 * Props:
 * @param {Object} transferData       - Receipt data returned from execute API
 * @param {string} transferData.transfer_id         - Internal transfer UUID
 * @param {string} transferData.chimoney_reference  - Chimoney transaction reference
 * @param {string} transferData.status              - 'completed' or 'processing'
 * @param {number} transferData.source_amount       - USD amount sent
 * @param {number} transferData.exchange_rate       - Rate used
 * @param {number} transferData.target_amount       - INR amount to recipient
 * @param {number} transferData.fee_amount          - Fee charged in USD
 * @param {string} transferData.payment_method      - 'upi' or 'bank_account'
 * @param {string} transferData.beneficiary_name    - Recipient name
 * @param {string} transferData.created_at          - ISO timestamp
 * @param {Function} onNewTransfer   - Called when user starts a new transfer
 * @param {Function} onHome          - Called when user navigates home
 *
 * @component
 * @example
 * <TransferReceipt
 *   transferData={{
 *     transfer_id: 'txn_abc123',
 *     chimoney_reference: 'CHI_789xyz',
 *     status: 'completed',
 *     source_amount: 500,
 *     exchange_rate: 83.25,
 *     target_amount: 41625,
 *     fee_amount: 2.5,
 *     payment_method: 'upi',
 *     beneficiary_name: 'Amit Kumar',
 *     created_at: '2026-03-01T12:00:00Z'
 *   }}
 *   onNewTransfer={() => setStep('initiation')}
 *   onHome={() => setCurrentScreen('main')}
 * />
 */

import React, { useState } from 'react';
import {
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Plus,
  Home,
  Copy,
  Check
} from 'lucide-react';

const TransferReceipt = ({ transferData, onNewTransfer, onHome }) => {
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [copiedField, setCopiedField] = useState(null); // 'transfer_id' | 'chimoney_ref'

  const {
    transfer_id,
    chimoney_reference,
    status = 'completed',
    source_amount,
    exchange_rate,
    target_amount,
    fee_amount,
    fee_percentage,
    payment_method,
    beneficiary_name,
    created_at
  } = transferData || {};

  /**
   * Copy text to clipboard and briefly show a check icon.
   * @param {string} text  - Text to copy
   * @param {string} field - 'transfer_id' | 'chimoney_ref'
   */
  const handleCopy = async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('[TransferReceipt] Clipboard copy failed:', err);
    }
  };

  /**
   * Format a monetary value with the given currency.
   * @param {number} value
   * @param {string} currency
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
   * Format an ISO date string into a readable local datetime.
   * @param {string} isoString
   * @returns {string}
   */
  const formatDate = (isoString) => {
    if (!isoString) return '—';
    try {
      return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(new Date(isoString));
    } catch {
      return isoString;
    }
  };

  /**
   * Get settlement timeline text based on payment method.
   * @returns {{ headline: string, detail: string }}
   */
  const getSettlementInfo = () => {
    if (payment_method === 'upi') {
      return {
        headline: 'Instant',
        detail: 'UPI transfers typically arrive within 2-5 minutes.'
      };
    }
    return {
      headline: '1-3 Business Days',
      detail: 'Bank transfers are processed within 1-3 business days depending on the recipient bank.'
    };
  };

  const settlement = getSettlementInfo();
  const isProcessing = status === 'processing';

  return (
    <div className="w-full max-w-lg mx-auto p-4 md:p-6">
      {/* Success header */}
      <div className="text-center mb-6">
        <div className="flex justify-center mb-3">
          <div
            className={`p-3 rounded-full ${
              isProcessing ? 'bg-amber-100' : 'bg-green-100'
            }`}
          >
            {isProcessing ? (
              <Clock size={32} className="text-amber-600" />
            ) : (
              <CheckCircle size={32} className="text-green-600" />
            )}
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">
          {isProcessing ? 'Transfer Processing' : 'Transfer Sent!'}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {isProcessing
            ? 'Your transfer is being processed and will arrive soon.'
            : `Successfully sent to ${beneficiary_name || 'recipient'}`}
        </p>
      </div>

      {/* Amount summary card */}
      <div className="mb-5 bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-5 text-center">
        <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider mb-1">
          Amount Sent
        </p>
        <p className="text-4xl font-bold text-gray-900 mb-1">
          {formatCurrency(source_amount, 'USD')}
        </p>
        <p className="text-sm text-gray-500">
          at 1 USD = {exchange_rate?.toFixed(2)} INR
        </p>

        <div className="mt-3 pt-3 border-t border-purple-200">
          <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider mb-1">
            Recipient Gets
          </p>
          <p className="text-2xl font-bold text-purple-700">
            {formatCurrency(target_amount, 'INR')}
          </p>
        </div>
      </div>

      {/* Transaction references */}
      <div className="mb-5 bg-white border border-gray-200 rounded-xl p-4 space-y-3 shadow-sm">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Transaction Reference
        </h3>

        {/* Transfer ID */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-gray-500">Transfer ID</p>
            <p className="text-sm font-mono text-gray-900 truncate" title={transfer_id}>
              {transfer_id || '—'}
            </p>
          </div>
          {transfer_id && (
            <button
              type="button"
              onClick={() => handleCopy(transfer_id, 'transfer_id')}
              className="shrink-0 p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
              aria-label="Copy transfer ID"
              title="Copy transfer ID"
            >
              {copiedField === 'transfer_id' ? (
                <Check size={14} className="text-green-600" />
              ) : (
                <Copy size={14} />
              )}
            </button>
          )}
        </div>

        {/* Chimoney reference */}
        {chimoney_reference && (
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Chimoney Reference</p>
              <p
                className="text-sm font-mono text-gray-900 truncate"
                title={chimoney_reference}
              >
                {chimoney_reference}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(chimoney_reference, 'chimoney_ref')}
              className="shrink-0 p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
              aria-label="Copy Chimoney reference"
              title="Copy Chimoney reference"
            >
              {copiedField === 'chimoney_ref' ? (
                <Check size={14} className="text-green-600" />
              ) : (
                <Copy size={14} />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Settlement timeline */}
      <div className="mb-5 flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <Clock size={16} className="text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-900">
            Estimated delivery: {settlement.headline}
          </p>
          <p className="text-xs text-blue-700 mt-0.5">{settlement.detail}</p>
        </div>
      </div>

      {/* Expandable details */}
      <div className="mb-6 border border-gray-200 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setDetailsExpanded((prev) => !prev)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition text-left"
          aria-expanded={detailsExpanded}
          aria-controls="transfer-details"
        >
          <span className="text-sm font-medium text-gray-700">Transaction Details</span>
          {detailsExpanded ? (
            <ChevronUp size={16} className="text-gray-500" />
          ) : (
            <ChevronDown size={16} className="text-gray-500" />
          )}
        </button>

        {detailsExpanded && (
          <div
            id="transfer-details"
            className="px-4 py-4 bg-white space-y-2.5 border-t border-gray-200"
          >
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Status</span>
              <span
                className={`font-semibold ${
                  isProcessing ? 'text-amber-600' : 'text-green-600'
                }`}
              >
                {isProcessing ? 'Processing' : 'Completed'}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Recipient</span>
              <span className="font-medium text-gray-900">{beneficiary_name || '—'}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Payment method</span>
              <span className="font-medium text-gray-900 capitalize">
                {payment_method === 'upi' ? 'UPI' : 'Bank Account'}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Amount sent</span>
              <span className="font-medium text-gray-900">
                {formatCurrency(source_amount, 'USD')}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Service fee</span>
              <span className="font-medium text-gray-900">
                {formatCurrency(fee_amount, 'USD')}
                {fee_percentage ? ` (${fee_percentage}%)` : ''}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Exchange rate</span>
              <span className="font-medium text-gray-900">
                1 USD = {exchange_rate?.toFixed(2)} INR
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Amount received</span>
              <span className="font-semibold text-purple-700">
                {formatCurrency(target_amount, 'INR')}
              </span>
            </div>

            <div className="border-t border-gray-100 pt-2 flex justify-between text-sm">
              <span className="text-gray-600">Date &amp; Time</span>
              <span className="font-medium text-gray-900">{formatDate(created_at)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={onHome}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
          aria-label="Go back to home"
        >
          <Home size={18} />
          Back to Home
        </button>

        <button
          type="button"
          onClick={onNewTransfer}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-br from-purple-600 to-blue-500 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-600 transition focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          aria-label="Start a new transfer"
        >
          <Plus size={18} />
          New Transfer
        </button>
      </div>

      {/* Privacy note */}
      <p className="mt-4 text-center text-xs text-gray-500">
        A confirmation will be available in your transfer history.
      </p>
    </div>
  );
};

export default TransferReceipt;
