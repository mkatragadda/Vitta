import React, { useState } from 'react';
import { X, DollarSign, Building2, CheckCircle } from 'lucide-react';

export default function AddFundsScreen({ currentBalance, onClose }) {
  const [amount, setAmount] = useState('500');
  const quickAmounts = [100, 250, 500, 1000];

  const handleQuickAmount = (amt) => {
    setAmount(amt.toString());
  };

  const handleAddFunds = () => {
    // TODO: Implement actual fund addition via API
    alert(`Adding $${amount} to your wallet`);
  };

  return (
    <div className="h-screen flex flex-col px-6 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-white/10 transition-all"
        >
          <X className="w-5 h-5 text-white" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Add Funds</h1>
          <p className="text-slate-400 text-sm">Add USD to your wallet</p>
        </div>
      </div>

      {/* Current Balance */}
      <div className="mb-6">
        <div className="glass rounded-2xl p-4">
          <p className="text-slate-400 text-xs mb-1">Current Balance</p>
          <div className="flex items-center gap-1">
            <DollarSign className="w-5 h-5 text-white" />
            <span className="text-2xl font-bold text-white">
              {currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Amount Input */}
      <div className="mb-6">
        <label className="text-white font-semibold text-sm mb-3 block">Amount to Add</label>
        <div className="glass-teal rounded-2xl p-6 border-2 border-teal-500/40">
          <div className="flex items-center gap-3">
            <DollarSign className="w-7 h-7 text-teal-400" />
            <input
              type="text"
              placeholder="0.00"
              value={amount}
              onChange={(e) => {
                // Only allow numbers and decimal point
                const value = e.target.value.replace(/[^\d.]/g, '');
                setAmount(value);
              }}
              className="flex-1 bg-transparent text-white text-4xl font-bold outline-none placeholder-slate-600"
            />
          </div>
        </div>

        {/* Quick Amount Buttons */}
        <div className="grid grid-cols-4 gap-2 mt-3">
          {quickAmounts.map(amt => (
            <button
              key={amt}
              onClick={() => handleQuickAmount(amt)}
              className="glass rounded-xl py-2 text-white text-sm font-semibold hover:bg-white/10 transition-all"
            >
              ${amt}
            </button>
          ))}
        </div>
      </div>

      {/* Payment Method */}
      <div className="mb-auto">
        <label className="text-white font-semibold text-sm mb-3 block">From</label>
        <div className="space-y-2">
          <button className="w-full glass-teal rounded-2xl p-4 text-left flex items-center gap-3 border-2 border-teal-500/40 hover:bg-teal-500/10 transition-all">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="text-white font-semibold text-sm">Chase Bank</p>
              <p className="text-slate-400 text-xs">••• 4829</p>
            </div>
            <CheckCircle className="w-5 h-5 text-teal-400" />
          </button>
        </div>
      </div>

      {/* Add Funds Button */}
      <div className="pt-4">
        <button
          onClick={handleAddFunds}
          disabled={!amount || parseFloat(amount) <= 0}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-400 text-white font-bold shadow-2xl shadow-teal-500/30 hover:shadow-teal-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add ${parseFloat(amount || 0).toFixed(2)}
        </button>
        <p className="text-center text-slate-400 text-xs mt-3">Funds available instantly</p>
      </div>
    </div>
  );
}
