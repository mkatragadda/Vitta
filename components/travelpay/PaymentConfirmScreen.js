import React from 'react';
import { X, DollarSign, IndianRupee, CheckCircle, Loader } from 'lucide-react';

export default function PaymentConfirmScreen({
  scanData,
  quote,
  usdBalance,
  exchangeRate,
  loading,
  error,
  onConfirm,
  onCancel
}) {
  const merchantInitials = scanData.payeeName
    ? scanData.payeeName
        .split(' ')
        .map(word => word[0])
        .join('')
        .substring(0, 3)
        .toUpperCase()
    : 'M';

  const balanceAfter = usdBalance - quote.totalDebit;

  return (
    <div className="h-screen flex flex-col px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onCancel}
          className="w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-white/10 transition-all"
        >
          <X className="w-5 h-5 text-white" />
        </button>
        <h2 className="text-white font-semibold">Confirm Payment</h2>
        <div className="w-10"></div>
      </div>

      {/* Merchant Info */}
      <div className="mb-6">
        <div className="glass-teal rounded-3xl p-6 text-center border border-teal-500/30">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 mx-auto mb-4 flex items-center justify-center">
            <span className="text-white font-bold text-xl">{merchantInitials}</span>
          </div>
          <h3 className="text-white font-bold text-xl mb-1">{scanData.payeeName || 'Merchant'}</h3>
          <p className="text-slate-400 text-sm">{scanData.upiId}</p>
        </div>
      </div>

      {/* Amount Display */}
      <div className="mb-6">
        <div className="text-center mb-4">
          <p className="text-teal-300 text-sm font-semibold mb-3">You Pay</p>
          <div className="flex items-baseline justify-center gap-3 mb-2">
            <DollarSign className="w-8 h-8 text-white" />
            <span className="text-6xl font-bold text-white">{quote.totalDebit.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-slate-400">
            <span className="text-sm">Merchant receives</span>
            <div className="flex items-center gap-1">
              <IndianRupee className="w-4 h-4" />
              <span className="font-semibold">₹{scanData.amount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Transaction Details */}
        <div className="glass rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Exchange Rate</span>
            <span className="text-white font-semibold">₹{quote.exchangeRate.toFixed(2)} per USD</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Transaction Fee</span>
            {quote.feeTotal > 0 ? (
              <div className="text-right">
                <p className="text-white font-semibold">${quote.feeTotal.toFixed(2)}</p>
                <p className="text-xs text-slate-500">Wise: ${quote.feeTransferwise?.toFixed(2) || '0.00'}</p>
              </div>
            ) : (
              <span className="text-emerald-400 font-semibold">FREE</span>
            )}
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Payment Method</span>
            <span className="text-white text-xs">USD Balance</span>
          </div>
        </div>
      </div>

      {/* Balance After */}
      <div className="mb-auto">
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm">Balance After Payment</span>
            <div className="flex items-center gap-1">
              <DollarSign className="w-4 h-4 text-white" />
              <span className={`font-bold text-lg ${
                balanceAfter < 0 ? 'text-red-400' : 'text-white'
              }`}>
                ${balanceAfter.toFixed(2)}
              </span>
            </div>
          </div>
          {balanceAfter < 0 && (
            <p className="text-red-400 text-xs mt-2">Insufficient balance</p>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 glass rounded-2xl p-4 border border-red-500/50 bg-red-500/10">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="pt-4">
        <button
          onClick={onConfirm}
          disabled={loading || balanceAfter < 0}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-400 text-white font-bold shadow-2xl shadow-teal-500/30 mb-3 flex items-center justify-center gap-2 hover:shadow-teal-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5" />
              Pay ${quote.totalDebit.toFixed(2)}
            </>
          )}
        </button>
        <button
          onClick={onCancel}
          disabled={loading}
          className="w-full py-3 rounded-2xl glass text-white font-semibold hover:bg-white/10 transition-all disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
