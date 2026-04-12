import React, { useState, useEffect } from 'react';
import { Scan, Globe, ArrowUpRight, ChevronRight, IndianRupee, DollarSign, CheckCircle, X, Sparkles, Clock, AlertCircle, User, Settings, Bell, CreditCard, Building2, Camera, RefreshCw, TrendingUp, MapPin, Calendar, Shield, Lock, Menu, Home as HomeIcon, Receipt, Info, ArrowRight, Plus } from 'lucide-react';
import HomeScreen from './travelpay/HomeScreen';
import ScannerScreen from './travelpay/ScannerScreen';
import PaymentConfirmScreen from './travelpay/PaymentConfirmScreen';
import PaymentSuccessScreen from './travelpay/PaymentSuccessScreen';
import AddFundsScreen from './travelpay/AddFundsScreen';
import TransactionsScreen from './travelpay/TransactionsScreen';

/**
 * Vitta Travel Pay - Standalone App
 * Just-in-Time Wallet Model: Users hold USD, convert to INR when paying
 *
 * Separate from main VittaApp dashboard
 */
export default function VittaTravelPayApp({ userData, onBackToDashboard }) {
  const [currentScreen, setCurrentScreen] = useState('home');
  const [usdBalance, setUsdBalance] = useState(24850.00);
  const [exchangeRate, setExchangeRate] = useState(83.85);
  const [scanData, setScanData] = useState(null);
  const [quote, setQuote] = useState(null);
  const [transferResult, setTransferResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch exchange rate on mount
  useEffect(() => {
    // TODO: Fetch live exchange rate from Wise API
    // For now using static rate
  }, []);

  const handleScanSuccess = async (qrResult) => {
    setLoading(true);
    setError(null);

    try {
      // Parse QR code
      const parseResponse = await fetch('/api/upi/parse-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userData.id,
        },
        body: JSON.stringify({ qrData: qrResult.raw }),
      });

      const parseResult = await parseResponse.json();

      if (!parseResult.success) {
        throw new Error(parseResult.error || 'Failed to parse QR code');
      }

      setScanData(parseResult.data);

      // Create quote
      const quoteResponse = await fetch('/api/wise/quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userData.id,
        },
        body: JSON.stringify({
          sourceAmount: parseResult.data.usdEquivalent,
          sourceCurrency: 'USD',
          targetCurrency: 'INR',
          upiScanId: parseResult.data.scanId,
        }),
      });

      const quoteResult = await quoteResponse.json();

      if (quoteResult.success) {
        setQuote(quoteResult.data);
        setCurrentScreen('payment-confirm');
      } else {
        throw new Error(quoteResult.error || 'Failed to create quote');
      }

    } catch (err) {
      console.error('[TravelPay] Scan error:', err);
      setError(err.message);
      setCurrentScreen('home');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async () => {
    setLoading(true);
    setError(null);

    try {
      const transferResponse = await fetch('/api/wise/transfer/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userData.id,
        },
        body: JSON.stringify({
          sourceAmount: quote.sourceAmount,
          sourceCurrency: 'USD',
          targetCurrency: 'INR',
          upiId: scanData.upiId,
          payeeName: scanData.payeeName,
          upiScanId: scanData.scanId,
          reference: `Vitta payment to ${scanData.payeeName}`,
        }),
      });

      const transferResult = await transferResponse.json();

      if (!transferResult.success) {
        throw new Error(transferResult.error || 'Transfer failed');
      }

      setTransferResult(transferResult.data);
      setUsdBalance(prev => prev - quote.totalDebit);
      setCurrentScreen('payment-success');

    } catch (err) {
      console.error('[TravelPay] Payment error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-teal-950 to-slate-950">
      <style>{`
        @keyframes slide-up { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes scan-line { 0%, 100% { transform: translateY(-100%); } 50% { transform: translateY(100%); } }
        @keyframes pulse-glow { 0%, 100% { box-shadow: 0 0 20px rgba(13, 148, 136, 0.3); } 50% { box-shadow: 0 0 40px rgba(13, 148, 136, 0.6); } }
        @keyframes check-pop { 0% { transform: scale(0); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }

        .slide-up { animation: slide-up 0.4s ease-out; }
        .scan-line { animation: scan-line 2s linear infinite; }
        .pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
        .check-pop { animation: check-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }

        .glass { background: rgba(255, 255, 255, 0.04); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.1); }
        .glass-strong { background: rgba(255, 255, 255, 0.08); backdrop-filter: blur(24px); border: 1px solid rgba(255, 255, 255, 0.15); }
        .glass-teal { background: rgba(13, 148, 136, 0.08); backdrop-filter: blur(24px); border: 1px solid rgba(13, 148, 136, 0.2); }
      `}</style>

      {/* Info Banner */}
      {currentScreen === 'home' && (
        <div className="fixed top-0 left-0 right-0 z-50 px-4 pt-4">
          <div className="max-w-md mx-auto glass rounded-2xl p-3 border border-teal-500/30 bg-teal-500/5">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-teal-300 text-xs font-semibold mb-0.5">Just-in-Time Wallet</p>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Hold USD only. Instant conversion to INR when you pay.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-md mx-auto min-h-screen">
        {currentScreen === 'home' && (
          <HomeScreen
            usdBalance={usdBalance}
            exchangeRate={exchangeRate}
            onScanToPay={() => setCurrentScreen('scanner')}
            onAddFunds={() => setCurrentScreen('add-funds')}
            onViewTransactions={() => setCurrentScreen('transactions')}
            onBackToDashboard={onBackToDashboard}
          />
        )}

        {currentScreen === 'scanner' && (
          <ScannerScreen
            onScanSuccess={handleScanSuccess}
            onClose={() => setCurrentScreen('home')}
          />
        )}

        {currentScreen === 'payment-confirm' && scanData && quote && (
          <PaymentConfirmScreen
            scanData={scanData}
            quote={quote}
            usdBalance={usdBalance}
            exchangeRate={exchangeRate}
            loading={loading}
            error={error}
            onConfirm={handleConfirmPayment}
            onCancel={() => {
              setScanData(null);
              setQuote(null);
              setCurrentScreen('home');
            }}
          />
        )}

        {currentScreen === 'payment-success' && transferResult && scanData && (
          <PaymentSuccessScreen
            transferResult={transferResult}
            scanData={scanData}
            exchangeRate={exchangeRate}
            onDone={() => {
              setTransferResult(null);
              setScanData(null);
              setQuote(null);
              setCurrentScreen('home');
            }}
          />
        )}

        {currentScreen === 'add-funds' && (
          <AddFundsScreen
            currentBalance={usdBalance}
            onClose={() => setCurrentScreen('home')}
          />
        )}

        {currentScreen === 'transactions' && (
          <TransactionsScreen
            userId={userData.id}
            onClose={() => setCurrentScreen('home')}
          />
        )}
      </div>
    </div>
  );
}
