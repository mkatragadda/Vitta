/**
 * TransferInitiation Component
 *
 * First step of the international transfer flow. Allows the user to:
 * - Select a saved beneficiary from a dropdown
 * - Enter a USD amount (1–999,999)
 * - Fetch a live exchange rate with a countdown timer
 * - Review the full fee breakdown before proceeding
 *
 * API Calls:
 * - GET /api/transfers/exchange-rate?amount=&source=USD&target=INR
 *
 * Flow:
 * 1. User selects beneficiary and enters amount
 * 2. User clicks "Get Rate" → rate fetch shows countdown
 * 3. Rate displayed with fee breakdown
 * 4. User clicks "Continue" → calls onProceed with rate data
 *
 * @component
 * @example
 * <TransferInitiation
 *   beneficiaries={[{ id: 'b1', name: 'Amit Kumar', paymentMethod: 'upi', upiId: 'amit@okhdfc' }]}
 *   userData={{ email: 'user@example.com' }}
 *   onProceed={(rateData) => setStep('review')}
 * />
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  DollarSign,
  RefreshCw,
  Clock,
  ChevronDown,
  AlertCircle,
  ArrowRight,
  User
} from 'lucide-react';

const TransferInitiation = ({ beneficiaries = [], userData, onProceed }) => {
  // Form state
  const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState('');
  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState('');

  // Rate state
  const [rateData, setRateData] = useState(null);
  const [rateLoading, setRateLoading] = useState(false);
  const [rateError, setRateError] = useState('');
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  // Countdown timer ref
  const countdownRef = useRef(null);

  /**
   * Clear the active countdown interval
   */
  const clearCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  /**
   * Start counting down from rate_valid_for_seconds.
   * When it hits 0 the rate data is cleared so the user must refetch.
   * @param {number} totalSeconds - Seconds the rate is valid
   */
  const startCountdown = useCallback(
    (totalSeconds) => {
      clearCountdown();
      setSecondsRemaining(totalSeconds);

      countdownRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
            setRateData(null);
            setRateError('Rate expired. Please fetch a new rate.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    [clearCountdown]
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => clearCountdown();
  }, [clearCountdown]);

  /**
   * Validate the USD amount entered by the user.
   * @param {string} value - Raw input string
   * @returns {string} Error message, or empty string if valid
   */
  const validateAmount = (value) => {
    if (!value || value.trim() === '') return 'Amount is required';
    const num = parseFloat(value);
    if (isNaN(num)) return 'Please enter a valid number';
    if (num < 1) return 'Minimum transfer is $1.00';
    if (num > 999999) return 'Maximum transfer is $999,999';
    return '';
  };

  /**
   * Handle amount input change with inline validation.
   * @param {React.ChangeEvent<HTMLInputElement>} e
   */
  const handleAmountChange = (e) => {
    const value = e.target.value;
    // Only allow digits and a single decimal point
    if (value !== '' && !/^\d*\.?\d*$/.test(value)) return;
    setAmount(value);

    // Clear rate when amount changes
    if (rateData) {
      clearCountdown();
      setRateData(null);
      setRateError('');
    }

    if (amountError) {
      setAmountError(validateAmount(value));
    }
  };

  /**
   * Fetch the live exchange rate from the backend.
   */
  const fetchRate = useCallback(async () => {
    const error = validateAmount(amount);
    if (error) {
      setAmountError(error);
      return;
    }

    if (!selectedBeneficiaryId) {
      setRateError('Please select a beneficiary first.');
      return;
    }

    setRateLoading(true);
    setRateError('');
    setRateData(null);
    clearCountdown();

    try {
      console.log('[TransferInitiation] Fetching exchange rate for amount:', amount);
      const response = await fetch(
        `/api/transfers/exchange-rate?amount=${encodeURIComponent(amount)}&source=USD&target=INR`
      );
      const result = await response.json();

      if (!response.ok || !result.success) {
        console.error('[TransferInitiation] Rate fetch failed:', result);
        setRateError(result.error_message || result.error || 'Failed to fetch exchange rate. Please try again.');
        return;
      }

      console.log('[TransferInitiation] Rate fetched successfully:', result.data);
      setRateData(result.data);
      startCountdown(result.data.rate_valid_for_seconds || 30);
    } catch (err) {
      console.error('[TransferInitiation] Network error fetching rate:', err);
      setRateError('Network error. Please check your connection and try again.');
    } finally {
      setRateLoading(false);
    }
  }, [amount, selectedBeneficiaryId, clearCountdown, startCountdown]);

  /**
   * Handle "Continue" — pass rate data + beneficiary to parent.
   */
  const handleProceed = () => {
    if (!rateData || secondsRemaining === 0) {
      setRateError('Please fetch a valid rate before continuing.');
      return;
    }

    const beneficiary = beneficiaries.find((b) => b.id === selectedBeneficiaryId);
    console.log('[TransferInitiation] Proceeding with:', { rateData, beneficiary });

    onProceed({
      rateData,
      beneficiary,
      sourceAmount: parseFloat(amount)
    });
  };

  // Derived UI values
  const selectedBeneficiary = beneficiaries.find((b) => b.id === selectedBeneficiaryId);
  const canFetchRate = amount && !validateAmount(amount) && selectedBeneficiaryId;
  const canProceed = rateData && secondsRemaining > 0 && !rateLoading;
  const isExpiringSoon = secondsRemaining > 0 && secondsRemaining <= 10;

  /**
   * Format currency for display.
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

  return (
    <div className="w-full max-w-lg mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Send Money to India</h2>
        <p className="text-sm text-gray-500 mt-1">USD to INR international transfer</p>
      </div>

      {/* Beneficiary selector */}
      <div className="mb-5">
        <label
          htmlFor="beneficiary-select"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Recipient *
        </label>
        {beneficiaries.length === 0 ? (
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle size={16} className="text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">
              No saved beneficiaries. Please add a recipient first.
            </p>
          </div>
        ) : (
          <div className="relative">
            <select
              id="beneficiary-select"
              value={selectedBeneficiaryId}
              onChange={(e) => {
                setSelectedBeneficiaryId(e.target.value);
                setRateData(null);
                setRateError('');
                clearCountdown();
              }}
              className="w-full px-3 py-2 pr-9 border border-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900"
              aria-label="Select recipient"
            >
              <option value="">Select a recipient...</option>
              {beneficiaries.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} —{' '}
                  {b.paymentMethod === 'upi' ? `UPI: ${b.upiId}` : `Bank: ****${String(b.account || '').slice(-4)}`}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
          </div>
        )}

        {/* Selected beneficiary summary */}
        {selectedBeneficiary && (
          <div className="mt-2 flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
            <User size={14} className="text-purple-500 shrink-0" />
            <span>
              {selectedBeneficiary.name}
              {selectedBeneficiary.paymentMethod === 'upi'
                ? ` · UPI: ${selectedBeneficiary.upiId}`
                : ` · Bank account ending in ****${String(selectedBeneficiary.account || '').slice(-4)}`}
            </span>
          </div>
        )}
      </div>

      {/* Amount input */}
      <div className="mb-5">
        <label htmlFor="amount-input" className="block text-sm font-medium text-gray-700 mb-1">
          Amount (USD) *
        </label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <DollarSign size={16} />
          </div>
          <input
            id="amount-input"
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={handleAmountChange}
            onBlur={() => setAmountError(validateAmount(amount))}
            placeholder="500.00"
            className={`w-full pl-8 pr-3 py-2 border rounded-lg transition focus:outline-none focus:ring-2 focus:ring-purple-500 ${
              amountError
                ? 'border-red-500 bg-red-50 focus:ring-red-500'
                : 'border-gray-300'
            }`}
            aria-label="Transfer amount in USD"
            aria-invalid={!!amountError}
            aria-describedby={amountError ? 'amount-error' : undefined}
          />
        </div>
        {amountError && (
          <p id="amount-error" className="mt-1 text-sm text-red-600 flex items-center gap-1">
            <AlertCircle size={13} />
            {amountError}
          </p>
        )}
        <p className="mt-1 text-xs text-gray-500">Min: $1 · Max: $999,999</p>
      </div>

      {/* Fetch Rate button */}
      <button
        type="button"
        onClick={fetchRate}
        disabled={!canFetchRate || rateLoading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-purple-600 text-purple-600 font-medium rounded-lg hover:bg-purple-50 transition disabled:opacity-40 disabled:cursor-not-allowed mb-5"
        aria-label="Fetch current exchange rate"
      >
        <RefreshCw size={16} className={rateLoading ? 'animate-spin' : ''} />
        {rateLoading ? 'Fetching Rate...' : rateData ? 'Refresh Rate' : 'Get Exchange Rate'}
      </button>

      {/* Rate error */}
      {rateError && (
        <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{rateError}</p>
        </div>
      )}

      {/* Rate breakdown card */}
      {rateData && (
        <div className="mb-6 bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-4 space-y-3">
          {/* Countdown timer */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-700 uppercase tracking-wider">
              Rate Locked
            </span>
            <div
              className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                isExpiringSoon
                  ? 'bg-red-100 text-red-700'
                  : 'bg-green-100 text-green-700'
              }`}
              aria-live="polite"
              aria-label={`Rate expires in ${secondsRemaining} seconds`}
            >
              <Clock size={12} />
              {secondsRemaining}s remaining
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-purple-200" />

          {/* Breakdown rows */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">You send</span>
              <span className="font-semibold text-gray-900">
                {formatCurrency(rateData.source_amount, 'USD')}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Exchange rate</span>
              <span className="font-semibold text-gray-900">
                1 USD = {rateData.exchange_rate?.toFixed(2)} INR
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                Transfer fee ({rateData.fee_percentage}%)
              </span>
              <span className="font-medium text-gray-700">
                −{formatCurrency(rateData.fee_amount, 'USD')}
              </span>
            </div>

            <div className="border-t border-purple-200 pt-2 flex justify-between">
              <span className="text-sm font-semibold text-gray-900">Recipient gets</span>
              <span className="text-lg font-bold text-purple-700">
                {formatCurrency(rateData.target_amount, 'INR')}
              </span>
            </div>
          </div>

          {/* Rate expiry note */}
          {isExpiringSoon && (
            <div className="bg-red-50 border border-red-200 rounded px-3 py-1.5">
              <p className="text-xs text-red-700 font-medium">
                Rate expiring soon! Click &quot;Refresh Rate&quot; to lock a new rate.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Continue button */}
      <button
        type="button"
        onClick={handleProceed}
        disabled={!canProceed}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-br from-purple-600 to-blue-500 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-600 transition disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
        aria-label="Continue to transfer review"
      >
        Continue
        <ArrowRight size={18} />
      </button>

      {!rateData && (
        <p className="mt-3 text-center text-xs text-gray-500">
          Fetch the exchange rate to see full breakdown and continue.
        </p>
      )}
    </div>
  );
};

export default TransferInitiation;
