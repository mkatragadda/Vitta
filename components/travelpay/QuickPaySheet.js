/**
 * QuickPaySheet
 *
 * Single-screen repay flow — everything visible at once, no scrolling.
 * Layout: compact payee header (name + editable amount) → app buttons → Wise.
 *
 * Props:
 *   payee           — { upiId, name, amountInr, amountUsd, lastPaidAt, upiType, rail }
 *   onAppSelected   — (payee, amountInr, appId) — called AFTER deep link fires
 *   onClose         — dismiss sheet
 */

import React, { useState, useRef } from 'react';
import { X, Pencil, Check } from 'lucide-react';
import {
  APP_CATALOG,
  launchUpiApp,
  launchWise,
  detectPlatform,
} from '../../services/upi/upiDeepLink';

const ACCENT = '#4ecf9a';
const P2P    = '#9b7dff';
const P2M    = '#ff9055';

const twoInitials = (name) =>
  (name || '?').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

// ── App icons ─────────────────────────────────────────────────────────────────
function GPay({ size = 24 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 2,
      background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.5, fontWeight: 800,
      background: 'linear-gradient(135deg,#4285f4,#34a853,#fbbc05,#ea4335)',
      color: '#fff',
    }}>
      <span style={{ fontSize: size * 0.46, fontWeight: 900, color: '#fff', textShadow: '0 0 4px rgba(0,0,0,0.4)' }}>G</span>
    </div>
  );
}

function PhonePeIcon({ size = 24 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 2,
      background: '#5f259f',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.46, fontWeight: 900, color: '#fff',
    }}>P</div>
  );
}

function WiseIcon({ size = 24 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 2,
      background: '#9edd65',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.44, fontWeight: 900, color: '#163300',
    }}>W</div>
  );
}

function AppIcon({ appId, size }) {
  if (appId === 'gpay')    return <GPay size={size} />;
  if (appId === 'phonepe') return <PhonePeIcon size={size} />;
  return null;
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function QuickPaySheet({ payee, onAppSelected, onClose }) {
  const [launching, setLaunching] = useState(null);
  const [currentAmount, setCurrentAmount] = useState(() => payee?.amountInr || 0);
  const [editingAmount, setEditingAmount] = useState(false);
  const [amountInput, setAmountInput]     = useState('');
  const inputRef = useRef(null);

  if (!payee) return null;

  const isP2P = payee.upiType === 'p2p';
  const name  = payee.name || payee.upiId;

  // ── Amount editing ───────────────────────────────────────────────────────────
  const startEdit = () => {
    setAmountInput(currentAmount > 0 ? String(Math.round(currentAmount)) : '');
    setEditingAmount(true);
    setTimeout(() => inputRef.current?.focus(), 30);
  };

  const commitAmount = () => {
    const parsed = parseFloat(amountInput);
    if (!isNaN(parsed) && parsed > 0) setCurrentAmount(parsed);
    setEditingAmount(false);
  };

  // ── Launch handlers ──────────────────────────────────────────────────────────
  const handleUpiTap = (appId) => {
    if (launching) return;
    if (currentAmount <= 0) { startEdit(); return; }
    setLaunching(appId);
    launchUpiApp(appId, {
      upiId:        payee.upiId,
      payeeName:    payee.name,
      amountInr:    currentAmount,
      merchantCode: '',
    });
    onAppSelected(payee, currentAmount, appId);
  };

  // Non-iOS (Android + desktop): call launchWise which fires intent:// or window.open
  const handleWiseTap = async () => {
    if (launching) return;
    if (currentAmount <= 0) { startEdit(); return; }
    setLaunching('wise');
    await launchWise(payee.upiId, currentAmount);
    onAppSelected(payee, currentAmount, 'wise');
  };

  // iOS only: Wise rebranded from TransferWise but kept the old URL scheme.
  // The iOS app registers 'transferwise://' (not 'wise://') — confirmed by bundle
  // ID com.transferwise.TransferWise. Universal Links to wise.com/send aren't
  // registered in their apple-app-site-association so they just open Safari.
  // Strategy: fire transferwise://send (opens Wise if installed), detect via
  // visibilitychange whether the app opened, and fall back to wise.com after 1.5 s.
  const handleWiseIosTap = (e) => {
    if (launching) { e.preventDefault(); return; }
    if (currentAmount <= 0) { e.preventDefault(); startEdit(); return; }
    setLaunching('wise');
    navigator?.clipboard?.writeText(payee.upiId).catch(() => {});
    onAppSelected(payee, currentAmount, 'wise');

    let appOpened = false;
    const markOpened = () => { appOpened = true; };
    document.addEventListener('visibilitychange', markOpened, { once: true });
    window.addEventListener('pagehide', markOpened, { once: true });

    // Fallback: Wise not installed → open web with sendAmount prefilled
    // (wise.com web supports sendAmount/sourceCurrency/targetCurrency params)
    const webUrl = currentAmount > 0
      ? `https://wise.com/send?sendAmount=${currentAmount}&sourceCurrency=INR&targetCurrency=INR`
      : 'https://wise.com/send';
    setTimeout(() => {
      document.removeEventListener('visibilitychange', markOpened);
      if (!appOpened) window.open(webUrl, '_blank', 'noopener');
    }, 1500);

    // Don't preventDefault — let the anchor fire transferwise://send.
    // This keeps the navigation inside the original user-gesture stack,
    // which is required for custom URL schemes to work on iOS Safari.
  };

  const fmtInr    = (n) => n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  const isIOS     = detectPlatform() === 'ios';
  const wiseStyle = {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '12px 14px', width: '100%',
    background: 'rgba(255,255,255,0.03)',
    opacity: (launching && launching !== 'wise') ? 0.35 : 1,
    transition: 'opacity 0.15s',
  };
  const wiseInner = (
    <>
      <WiseIcon size={26} />
      <div style={{ flex:1, textAlign:'left' }}>
        <div style={{ color:'rgba(255,255,255,0.60)', fontSize:13, fontWeight:600, marginBottom:1 }}>
          Wise
        </div>
        <div style={{ color:'rgba(255,255,255,0.25)', fontSize:10 }}>
          {isP2P ? 'Person-to-person · opens Wise app' : 'P2P only · not for merchants'}
        </div>
      </div>
      <span style={{ color: launching === 'wise' ? ACCENT : 'rgba(255,255,255,0.15)', fontSize:18 }}>
        {launching === 'wise' ? '···' : '›'}
      </span>
    </>
  );

  return (
    <>
      {/* Backdrop — above nav bar (z-100) */}
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:104 }} />

      {/* Sheet — above nav bar */}
      <div style={{
        position: 'fixed', bottom: 0,
        left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480,
        background: '#0d1f1a',
        borderRadius: '20px 20px 0 0',
        zIndex: 105,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {/* Drag handle */}
        <div style={{ display:'flex', justifyContent:'center', paddingTop:10, paddingBottom:2 }}>
          <div style={{ width:32, height:4, borderRadius:2, background:'rgba(255,255,255,0.12)' }} />
        </div>

        {/* ── Payee row: avatar · name + UPI · amount ── */}
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px 14px' }}>
          {/* Avatar */}
          <div style={{
            width: 42, height: 42, flexShrink: 0,
            borderRadius: isP2P ? '50%' : 11,
            background: isP2P ? 'rgba(139,107,255,0.22)' : 'rgba(255,140,80,0.20)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 800, color: isP2P ? P2P : P2M,
          }}>
            {twoInitials(name)}
          </div>

          {/* Name + UPI */}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ color:'#fff', fontSize:14, fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:2 }}>
              {name}
            </div>
            <div style={{ color:'rgba(255,255,255,0.33)', fontSize:11, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {payee.upiId}
            </div>
          </div>

          {/* Amount — tappable / editable */}
          <div style={{ flexShrink:0, textAlign:'right' }}>
            {editingAmount ? (
              /* Edit mode */
              <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                <span style={{ color:'rgba(255,255,255,0.5)', fontSize:15, fontWeight:700 }}>₹</span>
                <input
                  ref={inputRef}
                  type="number"
                  inputMode="decimal"
                  value={amountInput}
                  onChange={e => setAmountInput(e.target.value)}
                  onBlur={commitAmount}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitAmount(); } }}
                  placeholder="0"
                  style={{
                    width: 80, padding: '4px 8px',
                    background: 'rgba(78,207,154,0.10)',
                    border: '1.5px solid rgba(78,207,154,0.5)',
                    borderRadius: 8,
                    color: '#fff', fontSize: 16, fontWeight: 800,
                    textAlign: 'right', outline: 'none',
                  }}
                />
                <button
                  onClick={commitAmount}
                  style={{ background:'rgba(78,207,154,0.15)', border:'none', borderRadius:6, padding:'5px 6px', cursor:'pointer' }}
                >
                  <Check size={13} color={ACCENT} />
                </button>
              </div>
            ) : (
              /* Display mode */
              <button onClick={startEdit} style={{ background:'none', border:'none', cursor:'pointer', padding:0, textAlign:'right' }}>
                <div style={{ color:'#fff', fontSize:18, fontWeight:800, letterSpacing:'-0.5px' }}>
                  {currentAmount > 0 ? `₹${fmtInr(currentAmount)}` : <span style={{ color:'rgba(255,255,255,0.3)', fontSize:14 }}>₹?</span>}
                </div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:3, marginTop:2 }}>
                  <Pencil size={9} color={ACCENT} />
                  <span style={{ color:ACCENT, fontSize:9, fontWeight:600 }}>edit</span>
                </div>
              </button>
            )}
          </div>

          {/* Close button */}
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.25)', padding:4, marginLeft:2, flexShrink:0 }}>
            <X size={17} />
          </button>
        </div>

        {/* ── App list ── */}
        <div style={{ margin:'0 16px', borderRadius:13, overflow:'hidden', border:'1px solid rgba(255,255,255,0.07)' }}>
          {APP_CATALOG.map((app, i) => {
            const isLastUsed  = payee.rail === app.id;
            const isLaunching = launching === app.id;
            return (
              <button
                key={app.id}
                onClick={() => handleUpiTap(app.id)}
                disabled={!!launching}
                style={{
                  width: '100%',
                  background: isLastUsed ? 'rgba(78,207,154,0.08)' : 'rgba(255,255,255,0.03)',
                  border: 'none',
                  borderBottom: i < APP_CATALOG.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  padding: '12px 14px',
                  display: 'flex', alignItems: 'center', gap: 12,
                  cursor: launching ? 'not-allowed' : 'pointer',
                  opacity: (launching && !isLaunching) ? 0.35 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                <AppIcon appId={app.id} size={26} />
                <div style={{ flex:1, textAlign:'left' }}>
                  <div style={{ color: isLastUsed ? ACCENT : '#fff', fontSize:13, fontWeight:700, marginBottom:1 }}>
                    {app.name}
                  </div>
                  <div style={{ color:'rgba(255,255,255,0.28)', fontSize:10 }}>Free · instant</div>
                </div>
                {isLastUsed && (
                  <span style={{ background:'rgba(78,207,154,0.12)', color:ACCENT, fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:4 }}>
                    LAST USED
                  </span>
                )}
                <span style={{ color: isLaunching ? ACCENT : 'rgba(255,255,255,0.18)', fontSize:18 }}>
                  {isLaunching ? '···' : '›'}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── "or" divider ── */}
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 20px' }}>
          <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.06)' }} />
          <span style={{ color:'rgba(255,255,255,0.18)', fontSize:11 }}>or</span>
          <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.06)' }} />
        </div>

        {/* ── Wise row ── */}
        <div style={{ margin:'0 16px', borderRadius:13, overflow:'hidden', border:'1px solid rgba(255,255,255,0.07)' }}>
          {isIOS ? (
            /* iOS: real anchor so the tap triggers iOS Universal Link → Wise app.
               window.location / window.open bypasses Universal Links entirely. */
            <a
              href="transferwise://send"
              onClick={handleWiseIosTap}
              style={{ ...wiseStyle, textDecoration: 'none', cursor: launching ? 'not-allowed' : 'pointer' }}
            >
              {wiseInner}
            </a>
          ) : (
            <button
              onClick={handleWiseTap}
              disabled={!!launching}
              style={{ ...wiseStyle, border: 'none', cursor: launching ? 'not-allowed' : 'pointer' }}
            >
              {wiseInner}
            </button>
          )}
        </div>

        <div style={{ height:20 }} />
      </div>
    </>
  );
}
