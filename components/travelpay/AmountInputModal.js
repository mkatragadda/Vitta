import React, { useState } from 'react';
import { X, IndianRupee } from 'lucide-react';

/**
 * AmountInputModal
 * Modal for entering INR amount when QR code doesn't contain amount
 */
export default function AmountInputModal({
  isOpen,
  onClose,
  onSubmit,
  payeeName,
  upiId
}) {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    const numAmount = parseFloat(amount);

    // Validation
    if (!amount || amount.trim() === '') {
      setError('Please enter an amount');
      return;
    }

    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (numAmount < 1) {
      setError('Amount must be at least ₹1');
      return;
    }

    // Submit
    onSubmit(numAmount);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Modal */}
        <div
          className="bg-gradient-to-b from-slate-900 to-slate-950 rounded-3xl max-w-md w-full shadow-2xl border border-teal-500/30"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <h2 className="text-white text-xl font-bold">Enter Amount</h2>
            <button
              onClick={onClose}
              className="glass p-2 rounded-xl text-slate-300 hover:bg-white/10 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Payee Info */}
            {payeeName && (
              <div className="mb-6 p-4 glass-teal rounded-2xl border border-teal-500/30">
                <p className="text-teal-300 text-xs font-semibold uppercase mb-1">
                  Paying to
                </p>
                <p className="text-white font-semibold">{payeeName}</p>
                {upiId && (
                  <p className="text-slate-400 text-sm mt-1">{upiId}</p>
                )}
              </div>
            )}

            {/* Amount Input */}
            <div className="mb-6">
              <label className="text-slate-300 text-sm font-semibold mb-2 block">
                Amount (INR)
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-teal-400">
                  <IndianRupee className="w-6 h-6" />
                </div>
                <input
                  type="number"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setError('');
                  }}
                  onKeyPress={handleKeyPress}
                  placeholder="0.00"
                  autoFocus
                  className="w-full pl-14 pr-4 py-4 glass-teal rounded-2xl border border-teal-500/30 bg-teal-500/5 text-white text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 placeholder-slate-600"
                />
              </div>
              {error && (
                <p className="text-red-400 text-sm mt-2 ml-1">{error}</p>
              )}
            </div>

            {/* Quick Amount Buttons */}
            <div className="mb-6">
              <p className="text-slate-400 text-xs font-semibold mb-3">
                Quick Select
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[100, 200, 500, 1000, 2000, 5000].map((quickAmount) => (
                  <button
                    key={quickAmount}
                    onClick={() => {
                      setAmount(quickAmount.toString());
                      setError('');
                    }}
                    className="glass-teal rounded-xl py-3 px-2 border border-teal-500/30 text-teal-300 text-sm font-semibold hover:bg-teal-500/20 transition-all"
                  >
                    ₹{quickAmount}
                  </button>
                ))}
              </div>
            </div>

            {/* Info Note */}
            <div className="mb-6 p-3 glass rounded-xl border border-slate-700">
              <p className="text-slate-400 text-xs leading-relaxed">
                💡 The QR code you scanned doesn't include an amount. Please enter the amount you want to pay.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 glass rounded-xl py-4 px-4 text-slate-300 font-semibold hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-xl py-4 px-4 text-white font-bold hover:shadow-2xl hover:shadow-teal-500/50 transition-all"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
