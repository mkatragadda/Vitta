/**
 * AddBeneficiaryFlow Component
 *
 * Multi-step orchestrator component that manages the beneficiary creation flow.
 * Handles state transitions, API calls, error handling, and success/retry logic.
 *
 * Flow:
 * 1. method-select: User chooses UPI or Bank Account
 * 2. form: User enters beneficiary details
 * 3. review: User confirms details
 * 4. loading: API call in progress
 * 5. success: Confirmation with beneficiary ID
 * 6. error: Error message with retry option
 *
 * Features:
 * - Multi-step flow orchestration
 * - Full state management for all child components
 * - API integration with /api/beneficiaries/add
 * - Error handling with user-friendly messages
 * - Retry logic for failed attempts
 * - Success confirmation screen
 * - Cancel from any step
 *
 * @component
 * @example
 * <AddBeneficiaryFlow
 *   onBeneficiaryAdded={(beneficiary) => {
 *     setSelectedBeneficiary(beneficiary);
 *     setStep('list');
 *   }}
 *   onCancel={() => setStep('list')}
 * />
 */

import React, { useState, useCallback } from 'react';
import { AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import BeneficiaryFormUPI from './BeneficiaryFormUPI';
import BeneficiaryFormBank from './BeneficiaryFormBank';
import BeneficiaryReview from './BeneficiaryReview';

const AddBeneficiaryFlow = ({ user, onBeneficiaryAdded, onCancel, corridorId }) => {
  // Flow state management
  const [step, setStep] = useState('method-select');
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  /**
   * Get authorization token
   * In production, this would get the JWT token from auth context
   * @returns {string} Authorization token
   */
  const getAuthToken = useCallback(() => {
    // In a real app, this would come from auth context or localStorage
    // For now, return a placeholder that would be replaced with real auth
    return localStorage.getItem('auth_token') || 'demo-token';
  }, []);

  /**
   * Get user ID for API calls
   * From auth context via user prop
   * @returns {string} User ID
   */
  const getUserId = useCallback(() => {
    // Use the user prop passed from parent component
    if (!user?.id) {
      console.warn('[AddBeneficiaryFlow] No user ID available - user prop not passed correctly');
    }
    return user?.id || localStorage.getItem('user_id') || 'demo-user-id';
  }, [user?.id]);

  /**
   * Handle payment method selection
   * @param {string} method - Selected payment method ('upi' or 'bank_account')
   */
  const handleMethodSelect = useCallback((method) => {
    console.log('[AddBeneficiaryFlow] Method selected:', method);
    setPaymentMethod(method);
    setStep('form');
    setError(null);
  }, []);

  /**
   * Handle form submission
   * @param {Object} data - Form data
   */
  const handleFormSubmit = useCallback(
    async (data) => {
      console.log('[AddBeneficiaryFlow] Form submitted:', { paymentMethod, ...data });
      setFormData(data);
      setStep('review');
    },
    [paymentMethod]
  );

  /**
   * Handle review confirmation - make API call
   * @param {Object} reviewData - Data from review component
   */
  const handleReviewConfirm = useCallback(async () => {
    console.log('[AddBeneficiaryFlow] Review confirmed, calling API');
    setStep('loading');
    setError(null);

    try {
      const response = await fetch('/api/beneficiaries/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`,
          'X-User-Id': getUserId()
        },
        body: JSON.stringify({
          ...formData,
          paymentMethod
        })
      });

      console.log('[AddBeneficiaryFlow] API response status:', response.status);

      const result = await response.json();

      if (!response.ok) {
        // API returned an error
        console.error('[AddBeneficiaryFlow] API error:', result);
        setError({
          code: result.error_code || 'UNKNOWN_ERROR',
          message: result.error_message || 'Failed to add beneficiary',
          suggestion: result.suggestion || 'Please try again later',
          isDuplicate: result.isDuplicate || false,
          duplicateVerificationStatus: result.verificationStatus
        });
        setStep('error');
        return;
      }

      // Success
      console.log('[AddBeneficiaryFlow] Beneficiary added successfully:', result.beneficiary_id);
      setSuccess({
        beneficiaryId: result.beneficiary_id,
        name: formData.name,
        message: result.message || 'Beneficiary added successfully'
      });
      setStep('success');

      // Call parent callback
      if (onBeneficiaryAdded) {
        onBeneficiaryAdded({
          beneficiaryId: result.beneficiary_id,
          ...formData,
          paymentMethod
        });
      }
    } catch (err) {
      console.error('[AddBeneficiaryFlow] Network error:', err);
      setError({
        code: 'NETWORK_ERROR',
        message: 'Network error',
        suggestion: 'Please check your internet connection and try again',
        isDuplicate: false
      });
      setStep('error');
    }
  }, [formData, paymentMethod, getAuthToken, getUserId, onBeneficiaryAdded]);

  /**
   * Handle edit - go back to form
   */
  const handleEdit = useCallback(() => {
    console.log('[AddBeneficiaryFlow] Edit requested, returning to form');
    setStep('form');
  }, []);

  /**
   * Handle error retry - reset and go back to form
   */
  const handleRetry = useCallback(() => {
    console.log('[AddBeneficiaryFlow] Retry requested');
    setError(null);
    setStep('form');
  }, []);

  /**
   * Handle cancel - close flow
   */
  const handleCancel = useCallback(() => {
    console.log('[AddBeneficiaryFlow] Cancelled');
    onCancel?.();
  }, [onCancel]);

  /**
   * Handle success close - close flow
   */
  const handleSuccessClose = useCallback(() => {
    console.log('[AddBeneficiaryFlow] Success confirmed');
    onCancel?.();
  }, [onCancel]);

  // Render based on current step
  if (step === 'method-select') {
    return (
      <div className="w-full max-w-md mx-auto p-4 md:p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Add Beneficiary</h2>
        <p className="text-gray-600 mb-8">Choose how you want to send money:</p>

        <div className="space-y-4">
          {/* UPI option */}
          <button
            onClick={() => handleMethodSelect('upi')}
            className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left"
          >
            <h3 className="font-bold text-gray-900">UPI Transfer</h3>
            <p className="text-sm text-gray-600 mt-1">Fast and instant (2-5 minutes)</p>
          </button>

          {/* Bank Account option */}
          <button
            onClick={() => handleMethodSelect('bank_account')}
            className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left"
          >
            <h3 className="font-bold text-gray-900">Bank Account Transfer</h3>
            <p className="text-sm text-gray-600 mt-1">Standard transfer (1-2 business days)</p>
          </button>
        </div>

        {/* Cancel button */}
        <button
          onClick={handleCancel}
          className="w-full mt-6 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition"
        >
          Cancel
        </button>
      </div>
    );
  }

  if (step === 'form') {
    return (
      <>
        <button
          onClick={() => setStep('method-select')}
          className="mb-4 flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm"
        >
          <ArrowLeft size={16} />
          Change method
        </button>

        {paymentMethod === 'upi' ? (
          <BeneficiaryFormUPI
            onSubmit={handleFormSubmit}
            onCancel={handleCancel}
            loading={loading}
          />
        ) : (
          <BeneficiaryFormBank
            onSubmit={handleFormSubmit}
            onCancel={handleCancel}
            loading={loading}
          />
        )}
      </>
    );
  }

  if (step === 'review') {
    return (
      <BeneficiaryReview
        beneficiaryData={{
          ...formData,
          paymentMethod
        }}
        onConfirm={handleReviewConfirm}
        onEdit={handleEdit}
        onCancel={handleCancel}
        loading={loading}
      />
    );
  }

  if (step === 'loading') {
    return (
      <div className="w-full max-w-md mx-auto p-4 md:p-6 text-center">
        <div className="mb-6 flex justify-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Adding Beneficiary</h2>
        <p className="text-gray-600">Please wait while we save your beneficiary...</p>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="w-full max-w-md mx-auto p-4 md:p-6">
        <div className="text-center mb-6">
          <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900">Something went wrong</h2>
        </div>

        {/* Error details */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h3 className="font-bold text-red-900 mb-2">{error?.message}</h3>
          {error?.suggestion && (
            <p className="text-sm text-red-800 mb-2">{error.suggestion}</p>
          )}
          {error?.isDuplicate && (
            <div className="text-sm text-red-800 bg-red-100 rounded px-3 py-2 mt-2">
              <p className="font-medium">This beneficiary already exists.</p>
              {error.duplicateVerificationStatus === 'verified' && (
                <p className="mt-1">You can use it for transfers immediately.</p>
              )}
              {error.duplicateVerificationStatus === 'failed' && (
                <p className="mt-1">You can try adding again.</p>
              )}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleRetry}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transition"
          >
            Try Again
          </button>
          <button
            onClick={handleCancel}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="w-full max-w-md mx-auto p-4 md:p-6">
        <div className="text-center mb-6">
          <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900">Beneficiary Added!</h2>
        </div>

        {/* Success details */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              <span className="font-medium text-gray-900">{success?.name}</span> is ready to receive money.
            </p>
            <p className="text-xs text-gray-500">
              Beneficiary ID: <span className="font-mono">{success?.beneficiaryId}</span>
            </p>
          </div>
        </div>

        {/* Info message */}
        <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2 mb-6">
          <p className="text-xs text-blue-800">
            ✓ Your beneficiary has been verified and saved. You can now use them for transfers.
          </p>
        </div>

        {/* Done button */}
        <button
          onClick={handleSuccessClose}
          className="w-full px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium rounded-lg hover:from-green-700 hover:to-emerald-700 transition"
        >
          Done
        </button>
      </div>
    );
  }

  return null;
};

export default AddBeneficiaryFlow;
