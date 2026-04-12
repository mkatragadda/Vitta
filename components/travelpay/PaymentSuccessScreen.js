import React from 'react';
import { CheckCircle } from 'lucide-react';

export default function PaymentSuccessScreen({
  transferResult,
  scanData,
  exchangeRate,
  onDone
}) {
  // Extract merchant initials for display
  const merchantInitials = scanData.payeeName
    ? scanData.payeeName
        .split(' ')
        .map(word => word[0])
        .join('')
        .substring(0, 3)
        .toUpperCase()
    : 'M';

  // Get transaction details from transfer result
  const usdPaid = transferResult.sourceAmount || 0;
  const inrReceived = scanData.amount || 0;
  const transactionId = transferResult.transferId
    ? transferResult.transferId.substring(0, 7).toUpperCase()
    : 'VT' + Math.random().toString(36).substring(2, 8).toUpperCase();

  return (
    <div className="h-screen flex flex-col items-center justify-center px-6">
      {/* Success Icon */}
      <div className="w-28 h-28 rounded-full bg-gradient-to-br from-teal-500 to-emerald-400 flex items-center justify-center mb-8 shadow-2xl shadow-teal-500/50">
        <CheckCircle className="w-16 h-16 text-white check-pop" />
      </div>

      {/* Success Message */}
      <h1 className="text-3xl font-bold text-white mb-2">Payment Successful!</h1>
      <p className="text-slate-400 text-center mb-8">
        Merchant received ₹{inrReceived.toFixed(2)} instantly
      </p>

      {/* Transaction Details Card */}
      <div className="w-full glass-teal rounded-3xl p-6 mb-8 border border-teal-500/30">
        {/* Merchant Info */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <span className="text-white font-bold text-xl">{merchantInitials}</span>
          </div>
          <div className="flex-1">
            <p className="text-white font-bold">{scanData.payeeName || 'Merchant'}</p>
            <p className="text-slate-400 text-sm">Just now</p>
          </div>
        </div>

        {/* Transaction Breakdown */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">You Paid (USD)</span>
            <span className="text-white font-bold">${usdPaid.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Merchant Got (INR)</span>
            <span className="text-white font-bold">₹{inrReceived.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Exchange Rate</span>
            <span className="text-white">₹{exchangeRate.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Transaction ID</span>
            <span className="text-teal-400 text-xs font-mono">{transactionId}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <button
        onClick={onDone}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-400 text-white font-bold shadow-2xl shadow-teal-500/30 mb-3 hover:shadow-teal-500/50 transition-all"
      >
        Done
      </button>
      <button className="text-teal-400 font-semibold hover:text-teal-300 transition-colors">
        Share Receipt
      </button>
    </div>
  );
}
