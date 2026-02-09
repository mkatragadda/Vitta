/**
 * RecipientForm Component
 *
 * Collects recipient bank details for the transfer.
 * Pre-filled with demo data for demo user flow.
 *
 * Props:
 *  - name: string - Default recipient name
 *  - bank: string - Default bank name
 *  - account: string - Default account number
 *  - ifsc: string - Default IFSC code
 *  - onSubmit: (data) => void - Callback with recipient details
 *  - onCancel: () => void - Callback when user cancels
 */

import React, { useState } from 'react';
import { Users, Building2 } from 'lucide-react';

const RecipientForm = ({
  name = 'Mom',
  bank = 'HDFC Bank',
  account = '50100123456789',
  ifsc = 'HDFC0001234',
  onSubmit,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    name,
    bank,
    account,
    ifsc,
  });

  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Recipient name is required';
    }
    if (!formData.bank.trim()) {
      newErrors.bank = 'Bank name is required';
    }
    if (!formData.account.trim()) {
      newErrors.account = 'Account number is required';
    }
    if (!formData.ifsc.trim()) {
      newErrors.ifsc = 'IFSC code is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit?.(formData);
    }
  };

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const labelClass = 'text-xs font-medium text-gray-700 block mb-1';

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-gray-900">Recipient Details</h3>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded p-3">
        <p className="text-xs text-blue-800">
          Please confirm the recipient details for the transfer to India.
        </p>
      </div>

      {/* Name Field */}
      <div>
        <label className={labelClass}>Recipient Name *</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Mom, Dad, Spouse"
          className={`${inputClass} ${errors.name ? 'border-red-300' : ''}`}
        />
        {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
      </div>

      {/* Bank Field */}
      <div>
        <label className={labelClass}>Bank Name *</label>
        <input
          type="text"
          value={formData.bank}
          onChange={(e) => setFormData({ ...formData, bank: e.target.value })}
          placeholder="e.g., HDFC Bank, ICICI Bank"
          className={`${inputClass} ${errors.bank ? 'border-red-300' : ''}`}
        />
        {errors.bank && <p className="text-xs text-red-600 mt-1">{errors.bank}</p>}
      </div>

      {/* Account Number Field */}
      <div>
        <label className={labelClass}>Account Number *</label>
        <input
          type="text"
          value={formData.account}
          onChange={(e) =>
            setFormData({ ...formData, account: e.target.value })
          }
          placeholder="e.g., 50100123456789"
          className={`${inputClass} ${errors.account ? 'border-red-300' : ''}`}
        />
        {errors.account && (
          <p className="text-xs text-red-600 mt-1">{errors.account}</p>
        )}
      </div>

      {/* IFSC Code Field */}
      <div>
        <label className={labelClass}>IFSC Code *</label>
        <input
          type="text"
          value={formData.ifsc}
          onChange={(e) => setFormData({ ...formData, ifsc: e.target.value })}
          placeholder="e.g., HDFC0001234"
          className={`${inputClass} ${errors.ifsc ? 'border-red-300' : ''}`}
        />
        {errors.ifsc && <p className="text-xs text-red-600 mt-1">{errors.ifsc}</p>}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleSubmit}
          className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors"
        >
          Confirm & Monitor
        </button>
        <button
          onClick={onCancel}
          className="flex-1 bg-gray-200 text-gray-800 py-2.5 rounded-lg font-medium text-sm hover:bg-gray-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default RecipientForm;
