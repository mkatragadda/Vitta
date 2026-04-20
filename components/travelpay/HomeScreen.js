import React, { useState } from 'react';
import { Scan, DollarSign, Sparkles, TrendingUp, Plus, Menu, LogOut, X, User } from 'lucide-react';

export default function HomeScreen({
  usdBalance,
  exchangeRate,
  onScanToPay,
  onAddFunds,
  onViewTransactions,
  onLogout,
  userName,
  userEmail
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  return (
    <div className="h-screen flex flex-col px-6 py-6">
      {/* Header */}
      <div className="mb-6 mt-16">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-white">Vitta</h1>
          <button
            onClick={() => setIsMenuOpen(true)}
            className="glass p-3 rounded-xl text-slate-300 hover:bg-white/10 transition-all"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
        <p className="text-slate-400 text-sm">Your travel wallet</p>
      </div>

      {/* USD Balance Card */}
      <div className="mb-6">
        <div className="glass-teal rounded-3xl p-6 border border-teal-500/30">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-teal-300 text-xs font-semibold uppercase mb-2">Available Balance</p>
              <div className="flex items-baseline gap-2">
                <DollarSign className="w-7 h-7 text-white" />
                {usdBalance !== null ? (
                  <>
                    <span className="text-5xl font-bold text-white">
                      {Math.floor(usdBalance).toLocaleString()}
                    </span>
                    <span className="text-2xl text-slate-400">
                      .{String(Math.round((usdBalance % 1) * 100)).padStart(2, '0')}
                    </span>
                  </>
                ) : (
                  <span className="text-3xl text-slate-400 animate-pulse">Loading...</span>
                )}
              </div>
            </div>
            <button
              onClick={onAddFunds}
              className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-sm font-semibold hover:bg-emerald-500/30 transition-all flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>

          <div className="pt-4 border-t border-white/10">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Live Rate</span>
              <div className="flex items-center gap-2">
                {exchangeRate ? (
                  <>
                    <span className="text-white font-semibold">₹{exchangeRate.toFixed(2)} per USD</span>
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  </>
                ) : (
                  <span className="text-slate-400 text-xs">Loading rate...</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Action - Scan & Pay */}
      <div className="mb-6">
        <button
          onClick={onScanToPay}
          className="w-full glass-teal rounded-3xl p-8 hover:bg-teal-500/10 transition-all border-2 border-teal-500/40 pulse-glow"
        >
          <div className="flex flex-col items-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-teal-500 to-emerald-400 flex items-center justify-center mb-4 shadow-2xl shadow-teal-500/40">
              <Scan className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-white text-2xl font-bold mb-2">Scan & Pay</h2>
            <p className="text-slate-400 text-sm">Pay with UPI in India</p>
          </div>
        </button>
      </div>

      {/* Activity Summary */}
      <div className="mb-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold text-sm">This Week</h3>
          <button
            onClick={onViewTransactions}
            className="text-teal-400 text-sm font-semibold hover:text-teal-300"
          >
            View All →
          </button>
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Scan className="w-4 h-4 text-teal-400" />
                <span className="text-slate-400 text-xs">Scanned</span>
              </div>
              <p className="text-white text-xl font-bold">5 times</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-400 text-xs">Spent</span>
              </div>
              <p className="text-white text-xl font-bold">$42.50</p>
            </div>
          </div>
        </div>
      </div>

      {/* AI Helper */}
      <div className="pt-4">
        <button className="w-full glass rounded-2xl p-4 flex items-center gap-3 hover:bg-white/5 transition-all">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-emerald-400 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-emerald-300 text-xs font-semibold">AI Assistant</p>
            <p className="text-white text-sm">Ask me anything</p>
          </div>
        </button>
      </div>

      {/* Slide-out Menu */}
      {isMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => setIsMenuOpen(false)}
          />

          {/* Menu Panel */}
          <div className="fixed top-0 right-0 bottom-0 w-80 bg-gradient-to-b from-slate-900 to-slate-950 border-l border-teal-500/30 z-50 shadow-2xl">
            <div className="flex flex-col h-full">
              {/* Menu Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <h2 className="text-white text-xl font-bold">Menu</h2>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="glass p-2 rounded-xl text-slate-300 hover:bg-white/10 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User Info */}
              {userName && (
                <div className="p-6 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-emerald-400 flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-semibold">{userName}</p>
                      <p className="text-slate-400 text-sm">{userEmail}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Menu Items */}
              <div className="flex-1 p-6">
                {/* Add more menu items here if needed */}
              </div>

              {/* Logout Button */}
              <div className="p-6 border-t border-white/10">
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    if (onLogout) onLogout();
                  }}
                  className="w-full glass-teal rounded-xl p-4 flex items-center gap-3 hover:bg-red-500/10 transition-all border border-red-500/30 text-red-400"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-semibold">Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
