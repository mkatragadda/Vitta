/**
 * VittaTravelPayApp
 *
 * Screen state machine:
 *   home → scanner → payment-review → home  (PostLaunchBanner overlays review)
 *   home | activity | you  ←→ bottom nav tabs
 */

import React, { useState, useEffect } from 'react';
import { Home, Scan, Clock, User } from 'lucide-react';
import HomeScreen from './travelpay/HomeScreen';
import ScannerScreen from './travelpay/ScannerScreen';
import PaymentReviewScreen from './travelpay/PaymentReviewScreen';
import PostLaunchBanner from './travelpay/PostLaunchBanner';
import AddFundsScreen from './travelpay/AddFundsScreen';
import TransactionsScreen from './travelpay/TransactionsScreen';
import YouScreen from './travelpay/YouScreen';
import AmountInputModal from './travelpay/AmountInputModal';

const NAV_TABS = [
  { id: 'home',     label: 'Home',     Icon: Home  },
  { id: 'scanner',  label: 'Pay',      Icon: Scan  },
  { id: 'activity', label: 'Activity', Icon: Clock },
  { id: 'you',      label: 'You',      Icon: User  },
];

// Screens that take over the full viewport — hide bottom nav during these
const OVERLAY_SCREENS = ['scanner', 'payment-review', 'add-funds'];

export default function VittaTravelPayApp({ userData, onLogout }) {
  const [currentScreen, setCurrentScreen] = useState('home');
  const [exchangeRate, setExchangeRate]   = useState(null);
  const [weeklyStats, setWeeklyStats]     = useState(null);
  const [recentPayees, setRecentPayees]   = useState([]);
  const [txScreenKey, setTxScreenKey]     = useState(0);

  const [scanData, setScanData]           = useState(null);
  const [showAmountModal, setShowAmountModal] = useState(false);
  const [pendingScanData, setPendingScanData] = useState(null);
  const [launchContext, setLaunchContext] = useState(null);

  // ---------------------------------------------------------------------------
  // Bootstrap
  // ---------------------------------------------------------------------------
  useEffect(() => {
    fetchLiveRate();
    fetchWeeklyStats();
    fetchRecentPayees();
  }, []);

  const fetchLiveRate = async () => {
    try {
      const res  = await fetch('/api/wise/rate?source=USD&target=INR');
      const json = await res.json();
      if (json.success && json.data?.rate) setExchangeRate(json.data.rate);
    } catch {
      setExchangeRate(83.85);
    }
  };

  const fetchWeeklyStats = async () => {
    try {
      const res  = await fetch('/api/payments/stats', { headers: { 'x-user-id': userData.id } });
      const json = await res.json();
      if (json.success) setWeeklyStats(json.data);
    } catch { /* non-critical */ }
  };

  const fetchRecentPayees = async () => {
    try {
      const res  = await fetch('/api/beneficiaries/recent', { headers: { 'x-user-id': userData.id } });
      const json = await res.json();
      if (json.success) setRecentPayees(json.data || []);
    } catch { /* non-critical */ }
  };

  // ---------------------------------------------------------------------------
  // Bottom nav handler
  // ---------------------------------------------------------------------------
  const handleTabPress = (tabId) => {
    if (tabId === 'scanner') {
      setCurrentScreen('scanner');
      return;
    }
    if (tabId === 'activity') {
      setTxScreenKey(k => k + 1);
    }
    setCurrentScreen(tabId);
  };

  // Which tab appears active in the nav
  const activeTab = OVERLAY_SCREENS.includes(currentScreen) ? null : currentScreen;

  // ---------------------------------------------------------------------------
  // Scan → parse → review
  // ---------------------------------------------------------------------------
  const handleScanSuccess = async (qrResult) => {
    try {
      const res  = await fetch('/api/upi/parse-qr', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userData.id },
        body:    JSON.stringify({ qrData: qrResult.raw }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to parse QR code');

      if (!json.data.amount || json.data.amount === 0) {
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

  const handleConfirmed = async ({ saveContact }) => {
    const ctx = launchContext;
    setLaunchContext(null);
    setScanData(null);
    setCurrentScreen('home');
    fetchWeeklyStats();
    fetchRecentPayees();

    if (saveContact && ctx?.parsedUPI?.upiId) {
      try {
        await fetch('/api/beneficiaries/save-from-scan', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-id': userData.id },
          body:    JSON.stringify({
            upiId: ctx.parsedUPI.upiId,
            name:  ctx.parsedUPI.payeeName || ctx.parsedUPI.upiId,
          }),
        });
      } catch (err) {
        console.error('[TravelPayApp] Save contact failed:', err.message);
      }
    }
  };

  const handleDismissed = () => {
    setLaunchContext(null);
    setScanData(null);
    setCurrentScreen('home');
    fetchWeeklyStats();
  };

  const showBottomNav = !OVERLAY_SCREENS.includes(currentScreen) && !launchContext;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div style={{ background: '#071412', minHeight: '100vh' }}>
      <style>{`
        @keyframes slide-up    { from { transform:translateY(30px);opacity:0 } to { transform:translateY(0);opacity:1 } }
        @keyframes scan-line   { 0%,100%{transform:translateY(-100%)} 50%{transform:translateY(100%)} }
        @keyframes pulse-glow  { 0%,100%{box-shadow:0 0 20px rgba(13,148,136,0.3)} 50%{box-shadow:0 0 40px rgba(13,148,136,0.6)} }

        .animate-slide-up { animation: slide-up 0.35s ease-out; }
        .scan-line        { animation: scan-line 2s linear infinite; }
        .pulse-glow       { animation: pulse-glow 2s ease-in-out infinite; }

        .glass        { background:rgba(255,255,255,0.04); backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,0.1); }
        .glass-strong { background:rgba(255,255,255,0.08); backdrop-filter:blur(24px); border:1px solid rgba(255,255,255,0.15); }
        .glass-teal   { background:rgba(13,148,136,0.08);  backdrop-filter:blur(24px); border:1px solid rgba(13,148,136,0.2); }
      `}</style>

      {/* ── SCREEN CONTENT ── */}
      <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', paddingBottom: showBottomNav ? 64 : 0 }}>

        {currentScreen === 'home' && (
          <HomeScreen
            exchangeRate={exchangeRate}
            weeklyStats={weeklyStats}
            recentPayees={recentPayees}
            userName={userData?.name}
            onScanToPay={() => setCurrentScreen('scanner')}
            onViewActivity={() => handleTabPress('activity')}
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

        {currentScreen === 'activity' && (
          <TransactionsScreen
            key={txScreenKey}
            userId={userData.id}
            onClose={() => setCurrentScreen('home')}
          />
        )}

        {currentScreen === 'you' && (
          <YouScreen
            userData={userData}
            onLogout={onLogout}
          />
        )}
      </div>

      {/* ── BOTTOM NAV ── */}
      {showBottomNav && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: 480,
          background: '#071412',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          display: 'flex',
          paddingBottom: 'env(safe-area-inset-bottom)',
          zIndex: 100,
        }}>
          {NAV_TABS.map(({ id, label, Icon }) => {
            const isActive = activeTab === id;
            const color = isActive ? '#4ecf9a' : 'rgba(255,255,255,0.28)';
            return (
              <button
                key={id}
                onClick={() => handleTabPress(id)}
                style={{
                  flex: 1,
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 3,
                  padding: '10px 0 12px',
                  background: 'none', border: 'none', cursor: 'pointer',
                }}
              >
                <Icon size={20} color={color} strokeWidth={isActive ? 2.2 : 1.8} />
                <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500, color, letterSpacing: '0.2px' }}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── OVERLAYS ── */}
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

      <AmountInputModal
        isOpen={showAmountModal}
        onClose={() => { setShowAmountModal(false); setPendingScanData(null); setCurrentScreen('home'); }}
        onSubmit={handleAmountSubmit}
        payeeName={pendingScanData?.payeeName}
        upiId={pendingScanData?.upiId}
      />
    </div>
  );
}
