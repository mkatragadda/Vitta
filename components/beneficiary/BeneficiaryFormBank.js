/**
 * BeneficiaryFormBank Component
 *
 * Form for adding a bank account-based beneficiary (recipient).
 * Handles account validation, IFSC auto-uppercase, and error display.
 *
 * Features:
 * - Name input with 2-255 character validation
 * - Phone input with 10-digit validation (starts with 6-9)
 * - Account number input with 9-18 digit validation
 * - IFSC code input with 11-character validation (auto-uppercase)
 * - Bank name input (required)
 * - Relationship dropdown (family, friend, business, other)
 * - Real-time validation feedback
 * - Field error display
 * - Submit/Cancel buttons
 * - Accessible form structure with proper labels
 *
 * @component
 * @example
 * <BeneficiaryFormBank
 *   onSubmit={async (data) => { await api.addBeneficiary(data) }}
 *   onCancel={() => setStep('method-select')}
 *   loading={isLoading}
 * />
 */

import React, { useState, useCallback } from 'react';
import { AlertCircle, Check } from 'lucide-react';

const BeneficiaryFormBank = ({ onSubmit, onCancel, loading = false, initialData, errors: propErrors = {} }) => {
  // State management
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    phone: initialData?.phone || '',
    account: initialData?.account || '',
    ifsc: initialData?.ifsc || '',
    bankName: initialData?.bankName || '',
    relationship: initialData?.relationship || 'family'
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Validation rules
  const validationRules = {
    name: (value) => {
      if (!value.trim()) return 'Name is required';
      if (value.length < 2) return 'Name must be at least 2 characters';
      if (value.length > 255) return 'Name cannot exceed 255 characters';
      return null;
    },
    phone: (value) => {
      if (!value.trim()) return 'Phone number is required';
      const phoneDigits = value.replace(/\D/g, '');
      if (phoneDigits.length !== 10) return 'Phone must be 10 digits';
      if (!/^[6-9]/.test(phoneDigits)) return 'Phone must start with 6-9';
      return null;
    },
    account: (value) => {
      if (!value.trim()) return 'Account number is required';
      const accountDigits = value.replace(/\D/g, '');
      if (accountDigits.length < 9 || accountDigits.length > 18) {
        return 'Account must be 9-18 digits';
      }
      return null;
    },
    ifsc: (value) => {
      if (!value.trim()) return 'IFSC code is required';
      const ifscCode = value.toUpperCase().trim();
      if (ifscCode.length !== 11) return 'IFSC must be 11 characters';
      if (!/^[A-Z0-9]{11}$/.test(ifscCode)) return 'IFSC must be alphanumeric';
      return null;
    },
    bankName: (value) => {
      if (!value.trim()) return 'Bank name is required';
      return null;
    },
    relationship: (value) => {
      if (!value) return 'Relationship is required';
      return null;
    }
  };

  /**
   * Validate a single field
   * @param {string} fieldName - Field to validate
   * @param {string} value - Field value
   * @returns {string|null} Error message or null if valid
   */
  const validateField = useCallback((fieldName, value) => {
    const validator = validationRules[fieldName];
    if (!validator) return null;
    return validator(value);
  }, [validationRules]);

  /**
   * Handle input change with real-time validation and auto-formatting
   * @param {Object} e - Change event
   */
  const handleChange = useCallback(
    (e) => {
      const { name, value } = e.target;
      let processedValue = value;

      // Auto-uppercase IFSC
      if (name === 'ifsc') {
        processedValue = value.toUpperCase();
      }

      setFormData((prev) => ({ ...prev, [name]: processedValue }));

      // Real-time validation if field has been touched
      if (touched[name]) {
        const error = validateField(name, processedValue);
        setFieldErrors((prev) => ({
          ...prev,
          [name]: error
        }));
      }
    },
    [touched, validateField]
  );

  /**
   * Handle field blur - mark as touched and validate
   * @param {Object} e - Blur event
   */
  const handleBlur = useCallback(
    (e) => {
      const { name, value } = e.target;
      setTouched((prev) => ({ ...prev, [name]: true }));

      const error = validateField(name, value);
      setFieldErrors((prev) => ({
        ...prev,
        [name]: error
      }));
    },
    [validateField]
  );

  /**
   * Validate all fields before submission
   * @returns {boolean} True if all fields are valid
   */
  const validateAllFields = useCallback(() => {
    const errors = {};
    let isValid = true;

    Object.keys(formData).forEach((fieldName) => {
      const error = validateField(fieldName, formData[fieldName]);
      if (error) {
        errors[fieldName] = error;
        isValid = false;
      }
    });

    setFieldErrors(errors);
    setTouched({
      name: true,
      phone: true,
      account: true,
      ifsc: true,
      bankName: true,
      relationship: true
    });

    return isValid;
  }, [formData, validateField]);

  /**
   * Handle form submission
   * @param {Object} e - Form event
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateAllFields()) {
      return;
    }

    try {
      await onSubmit({
        name: formData.name.trim(),
        phone: formData.phone.replace(/\D/g, ''),
        account: formData.account.replace(/\D/g, ''),
        ifsc: formData.ifsc.toUpperCase().trim(),
        bankName: formData.bankName.trim(),
        paymentMethod: 'bank_account',
        relationship: formData.relationship.toLowerCase()
      });
    } catch (error) {
      console.error('[BeneficiaryFormBank] Submission error:', error);
    }
  };

  // Format phone number for display
  const formatPhoneDisplay = (phone) => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  // Format account number for display
  const formatAccountDisplay = (account) => {
    const digits = account.replace(/\D/g, '');
    if (digits.length <= 4) return digits;
    if (digits.length <= 8) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
    return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8)}`;
  };

  // Get current error for field (prop error takes precedence)
  const getFieldError = (fieldName) => {
    return propErrors[fieldName] || fieldErrors[fieldName];
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto p-4 md:p-6">
      {/* Form title */}
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Add Bank Beneficiary</h2>

      {/* Name field */}
      <div className="mb-4">
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Recipient Name *
        </label>
        <input
          id="name"
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="Amit Kumar"
          disabled={loading}
          className={`w-full px-3 py-2 border rounded-lg transition ${
            getFieldError('name')
              ? 'border-red-500 bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500'
              : 'border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500'
          } disabled:bg-gray-100 disabled:cursor-not-allowed`}
          aria-invalid={!!getFieldError('name')}
          aria-describedby={getFieldError('name') ? 'name-error' : undefined}
        />
        {getFieldError('name') && (
          <p id="name-error" className="text-red-500 text-sm mt-1 flex items-center gap-1">
            <AlertCircle size={14} />
            {getFieldError('name')}
          </p>
        )}
      </div>

      {/* Phone field */}
      <div className="mb-4">
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
          Phone Number *
        </label>
        <input
          id="phone"
          type="tel"
          name="phone"
          value={formatPhoneDisplay(formData.phone)}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="9876543210"
          disabled={loading}
          maxLength="12"
          className={`w-full px-3 py-2 border rounded-lg transition ${
            getFieldError('phone')
              ? 'border-red-500 bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500'
              : 'border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500'
          } disabled:bg-gray-100 disabled:cursor-not-allowed`}
          aria-invalid={!!getFieldError('phone')}
          aria-describedby={getFieldError('phone') ? 'phone-error' : undefined}
        />
        {getFieldError('phone') && (
          <p id="phone-error" className="text-red-500 text-sm mt-1 flex items-center gap-1">
            <AlertCircle size={14} />
            {getFieldError('phone')}
          </p>
        )}
      </div>

      {/* Account number field */}
      <div className="mb-4">
        <label htmlFor="account" className="block text-sm font-medium text-gray-700 mb-1">
          Account Number * <span className="text-xs text-gray-500">(9-18 digits)</span>
        </label>
        <input
          id="account"
          type="text"
          name="account"
          value={formatAccountDisplay(formData.account)}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="1234567890"
          disabled={loading}
          maxLength="21"
          className={`w-full px-3 py-2 border rounded-lg transition ${
            getFieldError('account')
              ? 'border-red-500 bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500'
              : 'border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500'
          } disabled:bg-gray-100 disabled:cursor-not-allowed`}
          aria-invalid={!!getFieldError('account')}
          aria-describedby={getFieldError('account') ? 'account-error' : undefined}
        />
        {getFieldError('account') && (
          <p id="account-error" className="text-red-500 text-sm mt-1 flex items-center gap-1">
            <AlertCircle size={14} />
            {getFieldError('account')}
          </p>
        )}
      </div>

      {/* IFSC field */}
      <div className="mb-4">
        <label htmlFor="ifsc" className="block text-sm font-medium text-gray-700 mb-1">
          IFSC Code * <span className="text-xs text-gray-500">(11 characters)</span>
        </label>
        <input
          id="ifsc"
          type="text"
          name="ifsc"
          value={formData.ifsc}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="HDFC0000001"
          disabled={loading}
          maxLength="11"
          className={`w-full px-3 py-2 border rounded-lg transition font-mono ${
            getFieldError('ifsc')
              ? 'border-red-500 bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500'
              : 'border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500'
          } disabled:bg-gray-100 disabled:cursor-not-allowed`}
          aria-invalid={!!getFieldError('ifsc')}
          aria-describedby={getFieldError('ifsc') ? 'ifsc-error' : undefined}
        />
        {getFieldError('ifsc') && (
          <p id="ifsc-error" className="text-red-500 text-sm mt-1 flex items-center gap-1">
            <AlertCircle size={14} />
            {getFieldError('ifsc')}
          </p>
        )}
      </div>

      {/* Bank name field */}
      <div className="mb-4">
        <label htmlFor="bankName" className="block text-sm font-medium text-gray-700 mb-1">
          Bank Name *
        </label>
        <input
          id="bankName"
          type="text"
          name="bankName"
          value={formData.bankName}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="HDFC Bank"
          disabled={loading}
          className={`w-full px-3 py-2 border rounded-lg transition ${
            getFieldError('bankName')
              ? 'border-red-500 bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500'
              : 'border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500'
          } disabled:bg-gray-100 disabled:cursor-not-allowed`}
          aria-invalid={!!getFieldError('bankName')}
          aria-describedby={getFieldError('bankName') ? 'bankName-error' : undefined}
        />
        {getFieldError('bankName') && (
          <p id="bankName-error" className="text-red-500 text-sm mt-1 flex items-center gap-1">
            <AlertCircle size={14} />
            {getFieldError('bankName')}
          </p>
        )}
      </div>

      {/* Relationship dropdown */}
      <div className="mb-6">
        <label htmlFor="relationship" className="block text-sm font-medium text-gray-700 mb-1">
          Relationship *
        </label>
        <select
          id="relationship"
          name="relationship"
          value={formData.relationship}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={loading}
          className={`w-full px-3 py-2 border rounded-lg transition ${
            getFieldError('relationship')
              ? 'border-red-500 bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500'
              : 'border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500'
          } disabled:bg-gray-100 disabled:cursor-not-allowed`}
          aria-invalid={!!getFieldError('relationship')}
          aria-describedby={getFieldError('relationship') ? 'relationship-error' : undefined}
        >
          <option value="">Select relationship...</option>
          <option value="family">Family</option>
          <option value="friend">Friend</option>
          <option value="business">Business</option>
          <option value="other">Other</option>
        </select>
        {getFieldError('relationship') && (
          <p id="relationship-error" className="text-red-500 text-sm mt-1 flex items-center gap-1">
            <AlertCircle size={14} />
            {getFieldError('relationship')}
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 mt-6">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transition disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Adding...
            </>
          ) : (
            <>
              <Check size={16} />
              Add Beneficiary
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default BeneficiaryFormBank;
