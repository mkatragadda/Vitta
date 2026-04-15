import React, { useState } from 'react';
import { X, DollarSign, IndianRupee, CheckCircle, Loader, AlertTriangle } from 'lucide-react';

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
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const merchantInitials = scanData.payeeName
    ? scanData.payeeName
        .split(' ')
        .map(word => word[0])
        .join('')
        .substring(0, 3)
        .toUpperCase()
    : 'M';

  const balanceAfter = usdBalance - quote.totalDebit;
  const isLiveMode = process.env.NEXT_PUBLIC_WISE_AUTO_FUND !== 'false';

  // Handle button click - show modal in Live Mode, direct confirm in Safe Mode
  const handlePaymentClick = () => {
    if (isLiveMode) {
      setShowConfirmModal(true);
    } else {
      onConfirm();
    }
  };

  // Handle final confirmation from modal
  const handleFinalConfirm = () => {
    setShowConfirmModal(false);
    onConfirm();
  };

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

      {/* Safety Warning Banner */}
      <div className="mb-4 glass-teal rounded-2xl p-4 border border-yellow-500/50 bg-yellow-500/10">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-yellow-400 font-bold text-lg">⚠️</span>
          </div>
          <div className="flex-1">
            <p className="text-yellow-300 font-semibold text-sm mb-1">
              {process.env.NEXT_PUBLIC_WISE_AUTO_FUND === 'false'
                ? '🔒 Safe Mode: Testing Only'
                : '💰 Live Mode: Real Money Transfer'}
            </p>
            <p className="text-slate-300 text-xs leading-relaxed">
              {process.env.NEXT_PUBLIC_WISE_AUTO_FUND === 'false'
                ? 'Transfer will be created but NOT funded. No real money will be moved. Perfect for testing!'
                : 'Clicking "Confirm Payment" will IMMEDIATELY transfer REAL MONEY from your Wise account to the merchant. This action cannot be undone.'}
            </p>
          </div>
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
          onClick={handlePaymentClick}
          disabled={loading || balanceAfter < 0}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-400 text-white font-bold shadow-2xl shadow-teal-500/30 mb-3 flex items-center justify-center gap-2 hover:shadow-teal-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              {isLiveMode
                ? 'Processing Payment...'
                : 'Creating Transfer...'}
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5" />
              {isLiveMode
                ? `Confirm Payment $${quote.totalDebit.toFixed(2)}`
                : `Create Transfer (No Charge)`}
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

      {/* Live Mode Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
          <div className="glass-teal rounded-3xl p-6 max-w-md w-full border-2 border-red-500/50 shadow-2xl shadow-red-500/20">
            {/* Warning Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
            </div>

            {/* Title */}
            <h3 className="text-white font-bold text-xl text-center mb-3">
              Confirm Real Money Transfer
            </h3>

            {/* Warning Message */}
            <div className="mb-6 space-y-3">
              <p className="text-slate-300 text-sm text-center leading-relaxed">
                You are about to transfer <span className="font-bold text-white">${quote.totalDebit.toFixed(2)} USD</span> from your Wise account to:
              </p>

              <div className="glass rounded-2xl p-4 border border-teal-500/30">
                <p className="text-white font-semibold text-center mb-1">{scanData.payeeName}</p>
                <p className="text-slate-400 text-xs text-center">{scanData.upiId}</p>
              </div>

              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                <p className="text-red-300 text-xs font-semibold text-center">
                  ⚠️ This action is IMMEDIATE and CANNOT be undone
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleFinalConfirm}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold shadow-lg shadow-red-500/30 hover:shadow-red-500/50 transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                Yes, Transfer ${quote.totalDebit.toFixed(2)}
              </button>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="w-full py-3 rounded-2xl glass text-white font-semibold hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
