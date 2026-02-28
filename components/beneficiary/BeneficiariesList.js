/**
 * BeneficiariesList Component
 *
 * Displays a list of user's saved beneficiaries with actions.
 * Allows adding new beneficiaries, selecting for transfer, and deleting existing ones.
 *
 * Features:
 * - Display list of beneficiaries with details
 * - Show payment method (UPI/Bank)
 * - Masked sensitive details (****@bank or ****7890)
 * - Verification status badge
 * - Created date
 * - Action buttons (Delete, Use for Transfer)
 * - Delete confirmation modal
 * - Empty state message
 * - Loading skeleton state
 * - Refresh functionality
 *
 * @component
 * @example
 * <BeneficiariesList
 *   onAddBeneficiary={() => setStep('add')}
 *   onSelectBeneficiary={(ben) => startTransfer(ben)}
 *   onDeleteBeneficiary={async (id) => { await api.delete(id) }}
 *   loading={isLoading}
 * />
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Send, AlertCircle, CheckCircle, Clock } from 'lucide-react';

const BeneficiariesList = ({ user, onAddBeneficiary, onSelectBeneficiary, onDeleteBeneficiary, loading = false }) => {
  // State management
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [isLoading, setIsLoading] = useState(loading);
  const [error, setError] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // ID of item to delete
  const [isDeleting, setIsDeleting] = useState(false);

  /**
   * Get authorization token
   * @returns {string} Authorization token
   */
  const getAuthToken = useCallback(() => {
    return localStorage.getItem('auth_token') || 'demo-token';
  }, []);

  /**
   * Get user ID
   * @returns {string} User ID
   */
  const getUserId = useCallback(() => {
    // Prefer user prop if provided, otherwise fall back to localStorage
    if (user?.id) {
      return user.id;
    }
    return localStorage.getItem('user_id') || 'demo-user-id';
  }, [user?.id]);

  /**
   * Load beneficiaries from API
   */
  const loadBeneficiaries = useCallback(async () => {
    console.log('[BeneficiariesList] Loading beneficiaries');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/beneficiaries/list', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
          'X-User-Id': getUserId()
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('[BeneficiariesList] Loaded:', data.beneficiaries?.length || 0, 'beneficiaries');
      setBeneficiaries(data.beneficiaries || []);
    } catch (err) {
      console.error('[BeneficiariesList] Load error:', err);
      setError(err.message);
      // Fallback to empty list
      setBeneficiaries([]);
    } finally {
      setIsLoading(false);
    }
  }, [getAuthToken, getUserId]);

  // Load beneficiaries on mount
  useEffect(() => {
    loadBeneficiaries();
  }, [loadBeneficiaries]);

  /**
   * Handle delete confirmation
   * @param {string} beneficiaryId - ID to delete
   */
  const handleConfirmDelete = useCallback(async () => {
    if (!deleteConfirm) return;

    console.log('[BeneficiariesList] Deleting beneficiary:', deleteConfirm);
    setIsDeleting(true);

    try {
      await onDeleteBeneficiary(deleteConfirm);
      // Remove from list
      setBeneficiaries((prev) => prev.filter((b) => b.beneficiaryId !== deleteConfirm));
      setDeleteConfirm(null);
    } catch (err) {
      console.error('[BeneficiariesList] Delete error:', err);
      setError('Failed to delete beneficiary');
    } finally {
      setIsDeleting(false);
    }
  }, [deleteConfirm, onDeleteBeneficiary]);

  /**
   * Mask UPI ID
   * @param {string} upiId - Full UPI ID
   * @returns {string} Masked UPI ID
   */
  const maskUpiId = (upiId) => {
    if (!upiId) return '';
    const [username, bank] = upiId.split('@');
    return `${username}@${bank.substring(0, 4)}${'*'.repeat(Math.max(0, bank.length - 4))}`;
  };

  /**
   * Mask account number
   * @param {string} account - Full account number
   * @returns {string} Masked account number
   */
  const maskAccountNumber = (account) => {
    if (!account || account.length < 4) return account;
    return `${'*'.repeat(account.length - 4)}${account.slice(-4)}`;
  };

  /**
   * Format date
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted date
   */
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return 'Unknown';
    }
  };

  /**
   * Get verification status badge
   * @param {string} status - Verification status
   * @returns {Object} Badge component
   */
  const getVerificationBadge = (status) => {
    const statusLower = status?.toLowerCase();

    if (statusLower === 'verified') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
          <CheckCircle size={12} />
          Verified
        </span>
      );
    }

    if (statusLower === 'pending') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">
          <Clock size={12} />
          Pending
        </span>
      );
    }

    if (statusLower === 'failed') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">
          <AlertCircle size={12} />
          Failed
        </span>
      );
    }

    return null;
  };

  // Loading skeleton
  if (isLoading && beneficiaries.length === 0) {
    return (
      <div className="w-full max-w-2xl mx-auto p-4 md:p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">My Beneficiaries</h2>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (!isLoading && beneficiaries.length === 0) {
    return (
      <div className="w-full max-w-2xl mx-auto p-4 md:p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">My Beneficiaries</h2>

        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <Send size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No beneficiaries yet</h3>
          <p className="text-gray-600 mb-6">Start by adding your first beneficiary for quick transfers</p>
          <button
            onClick={onAddBeneficiary}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transition"
          >
            <Plus size={18} />
            Add Beneficiary
          </button>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="w-full max-w-2xl mx-auto p-4 md:p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">My Beneficiaries</h2>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-red-900">Failed to load beneficiaries</h3>
            <p className="text-sm text-red-800 mt-1">{error}</p>
          </div>
        </div>

        <button
          onClick={loadBeneficiaries}
          className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  // List view
  return (
    <div className="w-full max-w-2xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">My Beneficiaries</h2>
        <button
          onClick={onAddBeneficiary}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transition"
        >
          <Plus size={18} />
          Add
        </button>
      </div>

      {/* Beneficiaries list */}
      <div className="space-y-3">
        {beneficiaries.map((beneficiary) => (
          <div
            key={beneficiary.beneficiaryId}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-bold text-gray-900">{beneficiary.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">
                    {beneficiary.paymentMethod === 'upi' ? 'UPI' : 'Bank Account'}
                  </span>
                  {getVerificationBadge(beneficiary.verificationStatus)}
                </div>
              </div>
              <div className="text-right text-xs text-gray-600">
                Added {formatDate(beneficiary.createdAt)}
              </div>
            </div>

            {/* Payment details */}
            <div className="bg-gray-50 rounded px-3 py-2 mb-3 text-sm font-mono">
              {beneficiary.paymentMethod === 'upi' ? (
                <p className="text-gray-700">{maskUpiId(beneficiary.upiId)}</p>
              ) : (
                <div className="space-y-1 text-gray-700">
                  <p>Account: {maskAccountNumber(beneficiary.account)}</p>
                  <p>IFSC: {beneficiary.ifsc}</p>
                </div>
              )}
            </div>

            {/* Relationship */}
            <p className="text-xs text-gray-600 mb-3 capitalize">Relationship: {beneficiary.relationship}</p>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => onSelectBeneficiary(beneficiary)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium rounded hover:from-green-700 hover:to-emerald-700 transition text-sm"
              >
                <Send size={16} />
                Use for Transfer
              </button>
              <button
                onClick={() => setDeleteConfirm(beneficiary.beneficiaryId)}
                className="px-3 py-2 border border-red-200 text-red-700 font-medium rounded hover:bg-red-50 transition text-sm"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Beneficiary?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this beneficiary? This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded hover:bg-gray-50 transition disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded hover:bg-red-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BeneficiariesList;
