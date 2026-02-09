/**
 * FXRateCard Component
 *
 * Displays current USD/INR exchange rate with target rate input.
 * Used in the demo flow to let users set their target exchange rate for monitoring.
 *
 * Props:
 *  - currentRate: number - Current USD/INR rate (e.g., 83.5)
 *  - amount: number - Amount in USD to convert
 *  - defaultRate: number - Pre-filled target rate
 *  - onSetRate: (rate) => void - Callback when user submits target rate
 */

import React, { useState } from 'react';
import { TrendingUp } from 'lucide-react';

const FXRateCard = ({
  currentRate = 83.5,
  amount = 5000,
  defaultRate = 84,
  onSetRate,
}) => {
  const [targetRate, setTargetRate] = useState(defaultRate || '');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    const rate = parseFloat(targetRate);

    if (!targetRate || isNaN(rate)) {
      setError('Please enter a valid rate');
      return;
    }

    if (rate < currentRate) {
      setError(`Target rate must be higher than current rate (${currentRate})`);
      return;
    }

    setError('');
    onSetRate?.(rate);
  };

  const estimatedINR = (amount * targetRate).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-gray-900">Exchange Rate Monitor</h3>
      </div>

      {/* Current Rate */}
      <div className="bg-white rounded p-3 space-y-2">
        <p className="text-xs text-gray-600 font-medium">Current USD/INR Rate</p>
        <p className="text-2xl font-bold text-blue-600">
          $1 = ₹{currentRate.toFixed(2)}
        </p>
      </div>

      {/* Target Rate Input */}
      <div className="space-y-2">
        <label className="text-xs text-gray-700 font-medium block">
          Target Rate (when to execute transfer)
        </label>
        <input
          type="number"
          step="0.01"
          value={targetRate}
          onChange={(e) => {
            setTargetRate(e.target.value);
            setError('');
          }}
          placeholder={`e.g., ${(currentRate + 0.5).toFixed(2)}`}
          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            error ? 'border-red-300' : 'border-gray-300'
          }`}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>

      {/* Estimated Amount */}
      <div className="bg-white rounded p-3">
        <p className="text-xs text-gray-600 font-medium mb-1">
          Estimated Amount in INR
        </p>
        <p className="text-lg font-bold text-green-600">
          ₹{estimatedINR}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          For ${amount.toLocaleString()} at ₹{targetRate || defaultRate}
        </p>
      </div>

      {/* Action Button */}
      <button
        onClick={handleSubmit}
        className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors"
      >
        Set Target Rate & Monitor
      </button>
    </div>
  );
};

export default FXRateCard;
