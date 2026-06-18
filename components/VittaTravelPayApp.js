/**
 * VittaTravelPayApp
 *
 * Standalone orchestrator for the India-payment flow.
 * Phase 1 philosophy: Vitta remembers who you pay and opens the right app.
 * Money moves through Wise (or another rail) — not through Vitta.
 *
 * Screen state machine:
 *   home → scanner → payment-review → home  (PostLaunchBanner overlays review)
 *   home → add-funds
 *   home → transactions
 */

import React, { useState, useEffect } from 'react';
import { Info } from 'lucide-react';
import HomeScreen from './travelpay/HomeScreen';
import ScannerScreen from './travelpay/ScannerScreen';
import PaymentReviewScreen from './travelpay/PaymentReviewScreen';
import PostLaunchBanner from './travelpay/PostLaunchBanner';
import AddFundsScreen from './travelpay/AddFundsScreen';
import TransactionsScreen from './travelpay/TransactionsScreen';
import AmountInputModal from './travelpay/AmountInputModal';

export default function VittaTravelPayApp({ userData, onLogout }) {
  const [currentScreen, setCurrentScreen] = useState('home');
  const [exchangeRate, setExchangeRate] = useState(null);

  // Scan data — set after a successful QR parse
  const [scanData, setScanData] = useState(null);

  // Amount modal — shown when the QR has no pre-filled amount
  const [showAmountModal, setShowAmountModal] = useState(false);
  const [pendingScanData, setPendingScanData] = useState(null);

  // Post-launch banner — shown after user taps "Open Wise"
  const [launchContext, setLaunchContext] = useState(null);

  // ---------------------------------------------------------------------------
  // Bootstrap: fetch live FX rate for home screen display
  // ---------------------------------------------------------------------------
  useEffect(() => {
    fetchLiveRate();
  }, []);

  const fetchLiveRate = async () => {
    try {
      const res = await fetch('/api/wise/rate?source=USD&target=INR');
      const json = await res.json();
      if (json.success && json.data?.rate) {
        setExchangeRate(json.data.rate);
      }
    } catch {
      setExchangeRate(83.85); // safe display fallback
    }
  };

  // ---------------------------------------------------------------------------
  // Scan → parse → review
  // ---------------------------------------------------------------------------
  const handleScanSuccess = async (qrResult) => {
    try {
      const res = await fetch('/api/upi/parse-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userData.id },
        body: JSON.stringify({ qrData: qrResult.raw }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to parse QR code');

      if (!json.data.amount || json.data.amount === 0) {
        // Amount not in QR — ask the user
        setPendingScanData(json.data);
        setShowAmountModal(true);
        return;
      }

      setScanData(json.data);
      setCurrentScreen('payment-review');
    } catch (err) {
      console.error('[TravelPayApp] Scan error:', err.message);
      setCurrentScreen('home');
    }
  };

  const handleAmountSubmit = (enteredAmount) => {
    const resolved = { ...pendingScanData, amount: enteredAmount };
    setPendingScanData(null);
    setShowAmountModal(false);
    setScanData(resolved);
    setCurrentScreen('payment-review');
  };

  // ---------------------------------------------------------------------------
  // Launch → banner → done
  // ---------------------------------------------------------------------------
  const handleLaunched = ({ launchId, parsedUPI, amountInr, usdEquivalent, saveContact }) => {
    setLaunchContext({ launchId, parsedUPI, amountInr, usdEquivalent, saveContact });
  };

  const handleConfirmed = ({ saveContact }) => {
    setLaunchContext(null);
    setScanData(null);
    // If the user wants to save the contact, navigate to the add-beneficiary
    // flow pre-populated.  For Phase 1 we simply return home; the contacts
    // screen (and pre-fill) is a Phase 2 addition.
    setCurrentScreen('home');
  };

  const handleDismissed = () => {
    setLaunchContext(null);
    setScanData(null);
    setCurrentScreen('home');
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-teal-950 to-slate-950">
      <style>{`
        @keyframes slide-up { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes scan-line { 0%, 100% { transform: translateY(-100%); } 50% { transform: translateY(100%); } }
        @keyframes pulse-glow { 0%, 100% { box-shadow: 0 0 20px rgba(13,148,136,0.3); } 50% { box-shadow: 0 0 40px rgba(13,148,136,0.6); } }

        .animate-slide-up { animation: slide-up 0.35s ease-out; }
        .scan-line { animation: scan-line 2s linear infinite; }
        .pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }

        .glass         { background: rgba(255,255,255,0.04); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); }
        .glass-strong  { background: rgba(255,255,255,0.08); backdrop-filter: blur(24px); border: 1px solid rgba(255,255,255,0.15); }
        .glass-teal    { background: rgba(13,148,136,0.08);  backdrop-filter: blur(24px); border: 1px solid rgba(13,148,136,0.2); }
      `}</style>

      {/* Info banner — home screen only */}
      {currentScreen === 'home' && (
        <div className="fixed top-0 left-0 right-0 z-50 px-4 pt-4">
          <div className="max-w-md mx-auto glass rounded-2xl p-3 border border-teal-500/30 bg-teal-500/5">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-teal-300 text-xs font-semibold mb-0.5">India Payment Brain</p>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Scan any UPI QR · Vitta remembers who you pay · Opens the right app for you.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-md mx-auto min-h-screen">

        {currentScreen === 'home' && (
          <HomeScreen
            exchangeRate={exchangeRate}
            usdBalance={null}          // no Wise wallet in Phase 1
            onScanToPay={() => setCurrentScreen('scanner')}
            onAddFunds={() => setCurrentScreen('add-funds')}
            onViewTransactions={() => setCurrentScreen('transactions')}
            onLogout={onLogout}
            userName={userData?.name}
            userEmail={userData?.email}
          />
        )}

        {currentScreen === 'scanner' && (
          <ScannerScreen
            onScanSuccess={handleScanSuccess}
            onClose={() => setCurrentScreen('home')}
          />
        )}

        {currentScreen === 'payment-review' && scanData && (
          <PaymentReviewScreen
            parsedUPI={scanData}
            userData={userData}
            onBack={() => { setScanData(null); setCurrentScreen('home'); }}
            onLaunched={handleLaunched}
          />
        )}

        {currentScreen === 'add-funds' && (
          <AddFundsScreen
            currentBalance={null}
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

      {/* PostLaunchBanner — overlays whatever screen is showing */}
      {launchContext && (
        <PostLaunchBanner
          launchId={launchContext.launchId}
          userData={userData}
          recipientName={launchContext.parsedUPI?.payeeName}
          amountInr={launchContext.amountInr}
          usdEquivalent={launchContext.usdEquivalent}
          saveContact={launchContext.saveContact}
          onConfirmed={handleConfirmed}
          onDismissed={handleDismissed}
        />
      )}

      {/* Amount input modal — when QR has no pre-filled amount */}
      <AmountInputModal
        isOpen={showAmountModal}
        onClose={() => {
          setShowAmountModal(false);
          setPendingScanData(null);
          setCurrentScreen('home');
        }}
        onSubmit={handleAmountSubmit}
        payeeName={pendingScanData?.payeeName}
        upiId={pendingScanData?.upiId}
      />
    </div>
  );
}
