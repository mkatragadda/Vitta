/**
 * BeneficiaryFormUPI Component
 *
 * Form for adding a UPI-based beneficiary (recipient).
 * Handles input validation, error display, and submission.
 *
 * Features:
 * - Name input with 2-255 character validation
 * - Phone input with 10-digit validation (starts with 6-9)
 * - UPI ID input with format validation (user@bank)
 * - Relationship dropdown (family, friend, business, other)
 * - Real-time validation feedback
 * - Field error display
 * - Submit/Cancel buttons
 * - Accessible form structure with proper labels
 *
 * @component
 * @example
 * <BeneficiaryFormUPI
 *   onSubmit={async (data) => { await api.addBeneficiary(data) }}
 *   onCancel={() => setStep('method-select')}
 *   loading={isLoading}
 * />
 */

import React, { useState, useCallback } from 'react';
import { AlertCircle, Check } from 'lucide-react';

const BeneficiaryFormUPI = ({ onSubmit, onCancel, loading = false, initialData, errors: propErrors = {} }) => {
  // State management
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    phone: initialData?.phone || '',
    upiId: initialData?.upiId || '',
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
    upiId: (value) => {
      if (!value.trim()) return 'UPI ID is required';
      const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/;
      if (!upiRegex.test(value.toLowerCase())) {
        return 'Use format: name@bank (e.g., amit@okhdfcbank)';
      }
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
   * Handle input change with real-time validation
   * @param {Object} e - Change event
   */
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Real-time validation if field has been touched
    if (touched[name]) {
      const error = validateField(name, value);
      setFieldErrors((prev) => ({
        ...prev,
        [name]: error
      }));
    }
  }, [touched, validateField]);

  /**
   * Handle field blur - mark as touched and validate
   * @param {Object} e - Blur event
   */
  const handleBlur = useCallback((e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));

    const error = validateField(name, value);
    setFieldErrors((prev) => ({
      ...prev,
      [name]: error
    }));
  }, [validateField]);

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
      upiId: true,
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
        upiId: formData.upiId.toLowerCase().trim(),
        paymentMethod: 'upi',
        relationship: formData.relationship.toLowerCase()
      });
    } catch (error) {
      console.error('[BeneficiaryFormUPI] Submission error:', error);
    }
  };

  // Format phone number for display
  const formatPhoneDisplay = (phone) => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  // Get current error for field (prop error takes precedence)
  const getFieldError = (fieldName) => {
    return propErrors[fieldName] || fieldErrors[fieldName];
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto p-4 md:p-6">
      {/* Form title */}
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Add UPI Beneficiary</h2>

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

      {/* UPI ID field */}
      <div className="mb-4">
        <label htmlFor="upiId" className="block text-sm font-medium text-gray-700 mb-1">
          UPI ID *
        </label>
        <input
          id="upiId"
          type="text"
          name="upiId"
          value={formData.upiId}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="amit@okhdfcbank"
          disabled={loading}
          className={`w-full px-3 py-2 border rounded-lg transition ${
            getFieldError('upiId')
              ? 'border-red-500 bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500'
              : 'border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500'
          } disabled:bg-gray-100 disabled:cursor-not-allowed`}
          aria-invalid={!!getFieldError('upiId')}
          aria-describedby={getFieldError('upiId') ? 'upiId-error' : undefined}
        />
        {getFieldError('upiId') && (
          <p id="upiId-error" className="text-red-500 text-sm mt-1 flex items-center gap-1">
            <AlertCircle size={14} />
            {getFieldError('upiId')}
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

export default BeneficiaryFormUPI;
