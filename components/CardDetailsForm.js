import React, { useState, useEffect } from 'react';
import { ArrowLeft, CreditCard as CreditCardIcon, DollarSign, Calendar, Info, ChevronDown, ChevronUp, Sparkles, CheckCircle } from 'lucide-react';
import { calculateGracePeriod, formatDayOfMonth } from '../utils/statementCycleUtils';

/**
 * Step 2: Card Details Form - Collect user-specific information
 */
const CardDetailsForm = ({ selectedCard, onBack, onSubmit, isSubmitting, isManualEntry = false }) => {
  const [formData, setFormData] = useState({
    // Manual entry fields (only used when selectedCard is null)
    card_name: '',
    issuer: '',
    card_network: 'Visa',
    annual_fee: '0',

    // Common fields
    nickname: '', // Optional user-friendly name
    credit_limit: '',
    current_balance: '',
    apr: selectedCard?.apr_min || '18.99',
    statement_close_date: '', // Actual date when statement closes (for ONE cycle)
    payment_due_date: '', // Actual date when payment is due (for ONE cycle)
    amount_to_pay: '',

    // Reward fields for manual entry
    reward_dining: '1',
    reward_groceries: '1',
    reward_travel: '1',
    reward_gas: '1',
    reward_default: '1'
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [errors, setErrors] = useState({});
  const [calculatedGracePeriod, setCalculatedGracePeriod] = useState(null);

  // Calculate grace period when both dates are entered
  useEffect(() => {
    if (formData.statement_close_date && formData.payment_due_date) {
      const gracePeriod = calculateGracePeriod(formData.statement_close_date, formData.payment_due_date);
      setCalculatedGracePeriod(gracePeriod);
    } else {
      setCalculatedGracePeriod(null);
    }
  }, [formData.statement_close_date, formData.payment_due_date]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Manual entry validation - card name is required
    if (isManualEntry && !formData.card_name) {
      newErrors.card_name = 'Card name is required';
    }

    // Credit limit is required
    if (!formData.credit_limit || formData.credit_limit <= 0) {
      newErrors.credit_limit = 'Credit limit is required';
    }

    // Balance can't exceed credit limit
    if (formData.current_balance && parseFloat(formData.current_balance) > parseFloat(formData.credit_limit)) {
      newErrors.current_balance = 'Balance cannot exceed credit limit';
    }

    // Validate statement dates if provided
    // Both or neither must be provided
    if ((formData.statement_close_date && !formData.payment_due_date) ||
        (!formData.statement_close_date && formData.payment_due_date)) {
      newErrors.statement_close_date = 'Both statement close and payment due dates required';
      newErrors.payment_due_date = 'Both statement close and payment due dates required';
    }

    // If both provided, validate grace period is reasonable (21-27 days typical)
    if (formData.statement_close_date && formData.payment_due_date && calculatedGracePeriod) {
      if (calculatedGracePeriod < 15) {
        newErrors.payment_due_date = 'Grace period too short - payment due should be 21-27 days after statement closes';
      } else if (calculatedGracePeriod > 35) {
        newErrors.payment_due_date = 'Grace period too long - check your dates';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Extract day-of-month from entered dates
    // Use split to avoid timezone issues with date-only strings
    const statementCloseDay = formData.statement_close_date ? parseInt(formData.statement_close_date.split('-')[2], 10) : null;
    const paymentDueDay = formData.payment_due_date ? parseInt(formData.payment_due_date.split('-')[2], 10) : null;

    // Prepare data for submission
    const userDetails = {
      nickname: formData.nickname || null,
      credit_limit: parseFloat(formData.credit_limit) || 0,
      current_balance: parseFloat(formData.current_balance) || 0,
      apr: parseFloat(formData.apr) || 18.99,
      statement_close_day: statementCloseDay,
      payment_due_day: paymentDueDay,
      grace_period_days: calculatedGracePeriod || null,
      amount_to_pay: parseFloat(formData.amount_to_pay) || 0
    };

    // Add manual entry specific fields
    if (isManualEntry) {
      userDetails.card_name = formData.card_name;
      userDetails.issuer = formData.issuer || null;
      userDetails.card_network = formData.card_network;
      userDetails.annual_fee = parseFloat(formData.annual_fee) || 0;

      // Build reward structure from individual fields
      userDetails.reward_structure = {
        dining: parseFloat(formData.reward_dining) || 1,
        groceries: parseFloat(formData.reward_groceries) || 1,
        travel: parseFloat(formData.reward_travel) || 1,
        gas: parseFloat(formData.reward_gas) || 1,
        default: parseFloat(formData.reward_default) || 1
      };
    }

    onSubmit(userDetails);
  };

  const handleSkip = () => {
    // Submit with minimal data
    const minimalDetails = {
      nickname: formData.nickname || null,
      credit_limit: parseFloat(formData.credit_limit) || 0,
      current_balance: 0,
      apr: parseFloat(formData.apr) || 18.99,
      statement_close_day: null,
      payment_due_day: null,
      grace_period_days: null,
      amount_to_pay: 0
    };

    if (!formData.credit_limit) {
      setErrors({ credit_limit: 'Credit limit is required even for quick setup' });
      return;
    }

    onSubmit(minimalDetails);
  };

  const getRewardHighlights = () => {
    if (!selectedCard || !selectedCard.reward_structure) return null;

    const entries = Object.entries(selectedCard.reward_structure)
      .filter(([key]) => key !== 'default')
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    return entries.map(([category, multiplier]) => ({
      category: category.charAt(0).toUpperCase() + category.slice(1),
      multiplier
    }));
  };

  const rewards = selectedCard ? getRewardHighlights() : null;

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6 animate-slide-in-right">
      <div className="max-w-2xl mx-auto">
        {/* Header with Back Button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-6 transition-colors font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to card selection</span>
        </button>

        {/* Card Summary Card - Only show for catalog cards */}
        {selectedCard && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <div className="flex items-start gap-4">
              {selectedCard.image_url ? (
                <div className="w-20 h-14 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 shadow-md">
                  <img
                    src={selectedCard.image_url}
                    alt={selectedCard.card_name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-20 h-14 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md">
                  <CreditCardIcon className="w-8 h-8 text-white" />
                </div>
              )}
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900 mb-1">
                  {selectedCard.card_name}
                </h2>
                <p className="text-sm text-gray-600 mb-3">{selectedCard.issuer}</p>

                {/* Rewards Tags */}
                {rewards && rewards.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {rewards.map((reward, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-lg font-semibold"
                      >
                        <Sparkles className="w-3 h-3" />
                        {reward.multiplier}x {reward.category}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>APR: {selectedCard.apr_min}%</span>
                  <span>•</span>
                  <span>
                    {selectedCard.annual_fee > 0
                      ? `$${selectedCard.annual_fee}/yr fee`
                      : 'No annual fee'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Manual Entry Header */}
        {isManualEntry && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-md">
                <CreditCardIcon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Add New Card Manually</h2>
                <p className="text-gray-600">Enter your card details below</p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-8">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {isManualEntry ? 'Card Information' : 'Your Account Details'}
            </h3>
            <p className="text-gray-600">
              {isManualEntry
                ? 'Enter your card details - all information is stored securely'
                : "Let's personalize this card with your account information"}
            </p>
          </div>

          {/* Manual Entry Fields */}
          {isManualEntry && (
            <>
              {/* Card Name - Required for manual entry */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Card Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.card_name}
                  onChange={(e) => handleChange('card_name', e.target.value)}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-blue-200 transition-all ${
                    errors.card_name ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'
                  }`}
                  placeholder="e.g., Chase Sapphire Preferred, Amex Gold"
                />
                {errors.card_name && (
                  <p className="mt-1 text-sm text-red-600">{errors.card_name}</p>
                )}
              </div>

              {/* Issuer & Network */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Issuer <span className="text-gray-400 text-xs">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.issuer}
                    onChange={(e) => handleChange('issuer', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 transition-all"
                    placeholder="Chase, Amex, Citi, etc."
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Card Network
                  </label>
                  <select
                    value={formData.card_network}
                    onChange={(e) => handleChange('card_network', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 transition-all"
                  >
                    <option value="Visa">Visa</option>
                    <option value="Mastercard">Mastercard</option>
                    <option value="Amex">American Express</option>
                    <option value="Discover">Discover</option>
                  </select>
                </div>
              </div>

              {/* Annual Fee */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Annual Fee <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="number"
                    value={formData.annual_fee}
                    onChange={(e) => handleChange('annual_fee', e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 transition-all"
                    placeholder="0"
                    min="0"
                    step="1"
                  />
                </div>
                <p className="mt-1 text-sm text-gray-500">Enter 0 if there's no annual fee</p>
              </div>
            </>
          )}

          {/* Nickname - Optional */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Card Nickname <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            <input
              type="text"
              value={formData.nickname}
              onChange={(e) => handleChange('nickname', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 transition-all"
              placeholder="e.g., My Travel Card, Grocery Card, etc."
              maxLength="50"
            />
            <p className="mt-1 text-sm text-gray-500 flex items-center gap-1">
              <Info className="w-4 h-4" />
              Give this card a friendly name to identify it in your wallet
            </p>
          </div>

          {/* Credit Limit - Required */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Credit Limit <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="number"
                value={formData.credit_limit}
                onChange={(e) => handleChange('credit_limit', e.target.value)}
                className={`w-full pl-12 pr-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-blue-200 transition-all ${
                  errors.credit_limit ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'
                }`}
                placeholder="10000"
                min="0"
                step="100"
              />
            </div>
            {errors.credit_limit ? (
              <p className="mt-1 text-sm text-red-600">{errors.credit_limit}</p>
            ) : (
              <p className="mt-1 text-sm text-gray-500 flex items-center gap-1">
                <Info className="w-4 h-4" />
                This is your total spending limit on this card
              </p>
            )}
          </div>

          {/* Current Balance - Optional */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Current Balance <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="number"
                value={formData.current_balance}
                onChange={(e) => handleChange('current_balance', e.target.value)}
                className={`w-full pl-12 pr-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-blue-200 transition-all ${
                  errors.current_balance ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'
                }`}
                placeholder="0"
                min="0"
                step="0.01"
              />
            </div>
            {errors.current_balance ? (
              <p className="mt-1 text-sm text-red-600">{errors.current_balance}</p>
            ) : (
              <p className="mt-1 text-sm text-gray-500 flex items-center gap-1">
                <Info className="w-4 h-4" />
                Leave blank if starting fresh (defaults to $0)
              </p>
            )}
          </div>

          {/* Minimum Payment Due - Optional */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Minimum Payment Due <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="number"
                value={formData.amount_to_pay}
                onChange={(e) => handleChange('amount_to_pay', e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 transition-all"
                placeholder="0"
                min="0"
                step="0.01"
              />
            </div>
            <p className="mt-1 text-sm text-gray-500 flex items-center gap-1">
              <Info className="w-4 h-4" />
              Minimum payment amount due on your next statement
            </p>
          </div>

          {/* APR */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              APR (Annual Percentage Rate)
            </label>
            <div className="relative">
              <input
                type="number"
                value={formData.apr}
                onChange={(e) => handleChange('apr', e.target.value)}
                className="w-full pr-12 pl-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 transition-all"
                placeholder="18.99"
                min="0"
                max="99"
                step="0.01"
              />
              <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">%</span>
            </div>
            <p className="mt-1 text-sm text-gray-500 flex items-center gap-1">
              <Info className="w-4 h-4" />
              {selectedCard ? `Default: ${selectedCard.apr_min}% (from card details)` : 'Your card\'s Annual Percentage Rate'}
            </p>
          </div>

          {/* Advanced Options Toggle */}
          <div className="mb-6">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              {showAdvanced ? (
                <>
                  <ChevronUp className="w-5 h-5" />
                  <span>Hide Advanced Options</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-5 h-5" />
                  <span>Show Advanced Options (Statement Cycle)</span>
                </>
              )}
            </button>
          </div>

          {/* Advanced Fields - Payment Schedule */}
          {showAdvanced && (
            <div className="space-y-6 mb-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-100">
              <div className="mb-4">
                <h4 className="text-md font-bold text-gray-900 mb-1">Payment Schedule</h4>
                <p className="text-sm text-gray-600">
                  Help optimize your cash flow by setting your statement cycle dates
                </p>
              </div>

              {/* Statement Close Date */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Statement Close Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="date"
                    value={formData.statement_close_date}
                    onChange={(e) => handleChange('statement_close_date', e.target.value)}
                    className={`w-full pl-12 pr-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-blue-200 transition-all ${
                      errors.statement_close_date ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'
                    }`}
                  />
                </div>
                {errors.statement_close_date ? (
                  <p className="mt-1 text-sm text-red-600">{errors.statement_close_date}</p>
                ) : (
                  <p className="mt-1 text-sm text-gray-600 flex items-center gap-1">
                    <Info className="w-4 h-4" />
                    Select any date from your recent statement (e.g., Jan 15, 2025). We&apos;ll extract the day (15th) and apply it monthly.
                  </p>
                )}
              </div>

              {/* Payment Due Date */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Payment Due Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="date"
                    value={formData.payment_due_date}
                    onChange={(e) => handleChange('payment_due_date', e.target.value)}
                    className={`w-full pl-12 pr-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-blue-200 transition-all ${
                      errors.payment_due_date ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'
                    }`}
                  />
                </div>
                {errors.payment_due_date ? (
                  <p className="mt-1 text-sm text-red-600">{errors.payment_due_date}</p>
                ) : (
                  <p className="mt-1 text-sm text-gray-600 flex items-center gap-1">
                    <Info className="w-4 h-4" />
                    Select the payment due date from that statement (e.g., Feb 10, 2025). Grace period should be 21-27 days.
                  </p>
                )}
              </div>

              {/* Calculated Grace Period */}
              {calculatedGracePeriod !== null && (
                <div className="bg-white rounded-lg p-4 border-2 border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-green-900">Grace Period Calculated</span>
                  </div>
                  <p className="text-sm text-gray-700">
                    You have <span className="font-bold text-green-600">{calculatedGracePeriod} days</span> between statement close and payment due
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    💡 Longer grace periods give you more time to pay without interest
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Rewards Section - Manual Entry Only */}
          {isManualEntry && (
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Reward Multipliers</h4>
              <p className="text-sm text-gray-600 mb-4">
                Enter the rewards multiplier for each category (e.g., 2 for 2x points, 4 for 4% cashback)
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dining
                  </label>
                  <input
                    type="number"
                    value={formData.reward_dining}
                    onChange={(e) => handleChange('reward_dining', e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                    min="1"
                    step="0.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Groceries
                  </label>
                  <input
                    type="number"
                    value={formData.reward_groceries}
                    onChange={(e) => handleChange('reward_groceries', e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                    min="1"
                    step="0.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Travel
                  </label>
                  <input
                    type="number"
                    value={formData.reward_travel}
                    onChange={(e) => handleChange('reward_travel', e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                    min="1"
                    step="0.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gas
                  </label>
                  <input
                    type="number"
                    value={formData.reward_gas}
                    onChange={(e) => handleChange('reward_gas', e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                    min="1"
                    step="0.5"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default (All Other Purchases)
                  </label>
                  <input
                    type="number"
                    value={formData.reward_default}
                    onChange={(e) => handleChange('reward_default', e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                    min="1"
                    step="0.5"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleSkip}
              disabled={isSubmitting}
              className="px-6 py-3 text-gray-600 hover:text-gray-900 font-medium transition-colors disabled:opacity-50"
            >
              Quick Setup (Skip Optional)
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Adding Card...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>Add Card to Wallet</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default CardDetailsForm;
