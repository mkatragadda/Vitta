/**
 * BeneficiaryReview Component
 *
 * Review screen that displays beneficiary details before confirmation.
 * Masks sensitive fields (UPI ID, account number) for security.
 * Shows settlement time expectations for the selected payment method.
 *
 * Features:
 * - Display beneficiary summary in readable format
 * - Masked UPI ID (e.g., amit@****)
 * - Masked account number (last 4 digits only, e.g., ****7890)
 * - Settlement time information (2-5 min for UPI, 1-2 days for Bank)
 * - Clear visual hierarchy
 * - Confirm/Edit/Cancel action buttons
 * - Loading state during confirmation
 *
 * @component
 * @example
 * <BeneficiaryReview
 *   beneficiaryData={{
 *     name: 'Amit Kumar',
 *     phone: '9876543210',
 *     paymentMethod: 'upi',
 *     upiId: 'amit@okhdfcbank',
 *     relationship: 'family'
 *   }}
 *   onConfirm={async () => { await api.addBeneficiary(...) }}
 *   onEdit={() => setStep('form')}
 *   onCancel={() => setStep('method-select')}
 *   loading={isLoading}
 * />
 */

import React, { useMemo } from 'react';
import { CheckCircle, ArrowLeft, X } from 'lucide-react';

const BeneficiaryReview = ({ beneficiaryData, onConfirm, onEdit, onCancel, loading = false }) => {
  /**
   * Mask UPI ID by replacing everything after @ with asterisks
   * Examples: amit@okhdfcbank -> amit@****
   * @param {string} upiId - Full UPI ID
   * @returns {string} Masked UPI ID
   */
  const maskUpiId = (upiId) => {
    if (!upiId) return '';
    const [username, bank] = upiId.split('@');
    return `${username}@${bank.substring(0, 4)}${'*'.repeat(Math.max(0, bank.length - 4))}`;
  };

  /**
   * Mask account number to show only last 4 digits
   * Examples: 1234567890 -> ****67890
   * @param {string} account - Full account number
   * @returns {string} Masked account number
   */
  const maskAccountNumber = (account) => {
    if (!account || account.length < 4) return account;
    return `${'*'.repeat(account.length - 4)}${account.slice(-4)}`;
  };

  /**
   * Format phone number for display
   * @param {string} phone - Phone number (10 digits)
   * @returns {string} Formatted phone number
   */
  const formatPhone = (phone) => {
    if (!phone || phone.length !== 10) return phone;
    return `${phone.slice(0, 3)}-${phone.slice(3, 6)}-${phone.slice(6)}`;
  };

  /**
   * Capitalize first letter
   * @param {string} str - String to capitalize
   * @returns {string} Capitalized string
   */
  const capitalize = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  /**
   * Calculate settlement time based on payment method
   * @returns {string} Settlement time description
   */
  const getSettlementTime = () => {
    const method = beneficiaryData.paymentMethod?.toLowerCase();
    if (method === 'upi') {
      return '2-5 minutes';
    } else if (method === 'bank_account') {
      return '1-2 business days';
    }
    return 'N/A';
  };

  /**
   * Get payment method display name
   * @returns {string} Display name for payment method
   */
  const getPaymentMethodDisplay = () => {
    const method = beneficiaryData.paymentMethod?.toLowerCase();
    if (method === 'upi') return 'UPI';
    if (method === 'bank_account') return 'Bank Account';
    return method;
  };

  // Memoize computed values
  const displayData = useMemo(
    () => ({
      paymentMethod: getPaymentMethodDisplay(),
      settlementTime: getSettlementTime(),
      maskedUpi: beneficiaryData.upiId ? maskUpiId(beneficiaryData.upiId) : null,
      maskedAccount: beneficiaryData.account ? maskAccountNumber(beneficiaryData.account) : null,
      formattedPhone: formatPhone(beneficiaryData.phone),
      relationship: capitalize(beneficiaryData.relationship)
    }),
    [beneficiaryData, getPaymentMethodDisplay, getSettlementTime]
  );

  return (
    <div className="w-full max-w-md mx-auto p-4 md:p-6">
      {/* Header */}
      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <CheckCircle size={24} className="text-green-500" />
        Review Beneficiary
      </h2>

      {/* Review card */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6 space-y-4">
        {/* Payment method */}
        <div>
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Payment Method</p>
          <p className="text-lg font-semibold text-gray-900 mt-1">{displayData.paymentMethod}</p>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200" />

        {/* Recipient name */}
        <div>
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Recipient Name</p>
          <p className="text-lg font-semibold text-gray-900 mt-1">{beneficiaryData.name}</p>
        </div>

        {/* Phone number */}
        <div>
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Phone Number</p>
          <p className="text-lg text-gray-900 mt-1 font-mono">{displayData.formattedPhone}</p>
        </div>

        {/* UPI or Bank details based on payment method */}
        {displayData.maskedUpi ? (
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">UPI ID</p>
            <p className="text-lg text-gray-900 mt-1 font-mono flex items-center gap-2">
              {displayData.maskedUpi}
              <span className="text-xs text-gray-500">(masked)</span>
            </p>
          </div>
        ) : null}

        {displayData.maskedAccount ? (
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Account Number</p>
              <p className="text-lg text-gray-900 mt-1 font-mono flex items-center gap-2">
                {displayData.maskedAccount}
                <span className="text-xs text-gray-500">(masked)</span>
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">IFSC Code</p>
              <p className="text-lg text-gray-900 mt-1 font-mono">{beneficiaryData.ifsc}</p>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Bank Name</p>
              <p className="text-lg text-gray-900 mt-1">{beneficiaryData.bankName}</p>
            </div>
          </div>
        ) : null}

        {/* Relationship */}
        <div>
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Relationship</p>
          <p className="text-lg text-gray-900 mt-1">{displayData.relationship}</p>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200" />

        {/* Settlement time */}
        <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Settlement Time</p>
          <p className="text-sm text-blue-900 mt-1 font-medium">{displayData.settlementTime}</p>
        </div>
      </div>

      {/* Info message */}
      <div className="bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-6">
        <p className="text-xs text-amber-800">
          ℹ️ Please verify all details are correct before confirming. You can edit if needed.
        </p>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        {/* Edit button */}
        <button
          type="button"
          onClick={onEdit}
          disabled={loading}
          className="flex items-center justify-center gap-1 px-3 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
          title="Go back and edit details"
        >
          <ArrowLeft size={16} />
          <span className="hidden sm:inline">Edit</span>
        </button>

        {/* Confirm button */}
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 px-4 py-2 col-span-1 md:col-span-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium rounded-lg hover:from-green-700 hover:to-emerald-700 transition disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
          title="Confirm and add beneficiary"
        >
          {loading ? (
            <>
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span className="hidden sm:inline">Confirming...</span>
            </>
          ) : (
            <>
              <CheckCircle size={16} />
              <span className="hidden sm:inline">Confirm</span>
              <span className="sm:hidden">OK</span>
            </>
          )}
        </button>

        {/* Cancel button */}
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="flex items-center justify-center gap-1 px-3 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
          title="Cancel and go back"
        >
          <X size={16} />
          <span className="hidden sm:inline">Cancel</span>
        </button>
      </div>

      {/* Additional info */}
      <div className="mt-6 text-center">
        <p className="text-xs text-gray-600">
          Your data is encrypted and stored securely. We never share your information.
        </p>
      </div>
    </div>
  );
};

export default BeneficiaryReview;
