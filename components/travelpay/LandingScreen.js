import React from 'react';
import { Scan, Zap, Shield, TrendingDown, Globe, ArrowRight, Sparkles } from 'lucide-react';

export default function LandingScreen({ onGoogleSignIn }) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-950 via-teal-950 to-slate-950">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col px-6 py-8 pb-32">
        {/* Logo */}
        <div className="mb-8 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-400 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Vitta</h1>
          </div>
        </div>

        {/* Main Hero */}
        <div className="flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full">
          <div className="text-center mb-12">
            <div className="inline-flex flex-wrap items-center justify-center gap-2 px-4 py-2 rounded-full glass-teal border border-teal-500/30 text-teal-300 text-sm font-semibold mb-6 max-w-full text-center">
              <Globe className="w-4 h-4 shrink-0" />
              Travel wallet for NRIs &amp; India Tourists
            </div>

            <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4 leading-tight">
              Pay Anywhere in
              <span className="block bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent">
                India with USD
              </span>
            </h2>

            <p className="text-lg sm:text-xl text-slate-300 mb-8 leading-relaxed">
              Built for US NRIs and India travelers. Scan any UPI QR code and pay instantly in INR using your US
              money — no cash, no card declines, no manual transfers. Pay like a local at shops and restaurants.
            </p>

            {/* CTA Button */}
            <button
              onClick={onGoogleSignIn}
              className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-lg font-bold hover:shadow-2xl hover:shadow-teal-500/50 transition-all transform hover:scale-105 active:scale-95"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </button>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {/* Feature 1 */}
            <div className="glass rounded-2xl p-6 border border-teal-500/20 hover:border-teal-500/40 transition-all">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500/20 to-emerald-500/20 flex items-center justify-center mb-4">
                <Scan className="w-6 h-6 text-teal-400" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Scan & Pay Instantly</h3>
              <p className="text-slate-400 text-sm">
                Scan any UPI QR at shops and restaurants and pay in one tap — no separate remittance step.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="glass rounded-2xl p-6 border border-emerald-500/20 hover:border-emerald-500/40 transition-all">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center mb-4">
                <TrendingDown className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Low Fees with Wise</h3>
              <p className="text-slate-400 text-sm">
                Get the best exchange rates with transparent, low-cost transfers
              </p>
            </div>

            {/* Feature 3 */}
            <div className="glass rounded-2xl p-6 border border-purple-500/20 hover:border-purple-500/40 transition-all">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Real-Time Conversion</h3>
              <p className="text-slate-400 text-sm">
                Automatic USD to INR conversion at live market rates
              </p>
            </div>

            {/* Feature 4 */}
            <div className="glass rounded-2xl p-6 border border-blue-500/20 hover:border-blue-500/40 transition-all">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Secure & Tracked</h3>
              <p className="text-slate-400 text-sm">
                All transactions secured and tracked in one place
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="px-6 pb-12">
        <div className="glass-teal rounded-3xl p-8 border border-teal-500/30 max-w-2xl mx-auto">
          <h3 className="text-white text-2xl font-bold mb-6 text-center">How It Works</h3>

          <div className="space-y-4">
            {/* Step 1 */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center text-white font-bold text-sm">
                1
              </div>
              <div>
                <h4 className="text-white font-semibold mb-1">Sign in & Add USD</h4>
                <p className="text-slate-400 text-sm">Connect your Google account and add USD to your Vitta wallet</p>
              </div>
            </div>

            <div className="h-8 ml-4 border-l-2 border-teal-500/30"></div>

            {/* Step 2 */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold text-sm">
                2
              </div>
              <div>
                <h4 className="text-white font-semibold mb-1">Scan UPI QR Code</h4>
                <p className="text-slate-400 text-sm">At any shop in India, scan the UPI QR code to pay</p>
              </div>
            </div>

            <div className="h-8 ml-4 border-l-2 border-emerald-500/30"></div>

            {/* Step 3 */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                3
              </div>
              <div>
                <h4 className="text-white font-semibold mb-1">Instant Payment</h4>
                <p className="text-slate-400 text-sm">We convert USD to INR and send payment instantly via Wise</p>
              </div>
            </div>
          </div>

          {/* Final CTA */}
          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <button
              onClick={onGoogleSignIn}
              className="inline-flex items-center gap-2 text-teal-300 font-semibold hover:text-teal-200 transition-colors"
            >
              Get Started Now
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-6 text-center">
        <p className="text-slate-500 text-sm">
          Powered by Wise • Secure payments for travelers
        </p>
      </div>
    </div>
  );
}
