/**
 * PaymentReviewScreen
 *
 * Three interactive states:
 *   default      — "Pay with UPI app" (teal) + "Use Wise instead" (dim)
 *   upi-sheet    — bottom sheet open with GPay / PhonePe rows
 *   wise-selected — UPI button dimmed, Wise highlighted purple, amber disclaimer,
 *                   "Continue with Wise" CTA
 *
 * On UPI app tap  → log launch → fire deep link → call onLaunched()
 * On Wise confirm → copy UPI ID to clipboard → log launch → open Wise → call onLaunched()
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Scan, X, Check, Pencil, AlertCircle, Loader } from 'lucide-react';
import {
  APP_CATALOG,
  launchUpiApp,
  launchWise,
  detectPlatform,
} from '../../services/upi/upiDeepLink';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const BG        = '#071412';
const ACCENT    = '#4ecf9a';
const P2P_CLR   = '#9b7dff';
const P2M_CLR   = '#ff9055';
const WISE_CLR  = '#9b7dff';
const AMBER     = '#f5be32';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const twoInitials = (name) =>
  (name || '?').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PayeeCard({ parsedUPI }) {
  const isP2P = parsedUPI.upiType === 'p2p';
  const name  = parsedUPI.payeeName || parsedUPI.upiId;
  return (
    <div style={{
      margin: '4px 16px 14px',
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 14, padding: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <div style={{
          width: 42, height: 42, flexShrink: 0,
          borderRadius: isP2P ? '50%' : 11,
          background: isP2P ? 'rgba(139,107,255,0.20)' : 'rgba(255,140,80,0.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, fontWeight: 700,
          color: isP2P ? P2P_CLR : P2M_CLR,
        }}>
          {twoInitials(name)}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: '#fff', fontSize: 14, fontWeight: 700, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.38)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {parsedUPI.upiId}
          </div>
        </div>
      </div>
    </div>
  );
}

function AmountCard({ amountInr, usdEquivalent, rate, rateLoading, rateError, onEdit, editing, amountInput, onAmountChange, onAmountCommit, onAmountKeyDown }) {
  return (
    <div style={{
      margin: '0 16px 16px',
      background: 'rgba(78,207,154,0.05)',
      border: `1px solid rgba(78,207,154,0.16)`,
      borderRadius: 14, padding: '16px 14px',
    }}>
      <div style={{ color: 'rgba(255,255,255,0.38)', fontSize: 11, fontWeight: 500, marginBottom: 6 }}>
        Amount to pay
      </div>

      {editing ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ color: '#fff', fontSize: 26, fontWeight: 800 }}>₹</span>
          <input
            type="number"
            value={amountInput}
            onChange={(e) => onAmountChange(e.target.value)}
            onKeyDown={onAmountKeyDown}
            onBlur={onAmountCommit}
            placeholder="0"
            min="0"
            step="1"
            autoFocus
            style={{
              flex: 1, background: 'transparent', border: 'none',
              borderBottom: `2px solid ${ACCENT}`,
              color: '#fff', fontSize: 26, fontWeight: 800,
              outline: 'none', paddingBottom: 2,
            }}
          />
          <button
            onClick={onAmountCommit}
            style={{
              background: ACCENT, border: 'none', borderRadius: 8,
              color: BG, fontSize: 12, fontWeight: 700,
              padding: '6px 12px', cursor: 'pointer',
            }}
          >
            Set
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ color: '#fff', fontSize: 30, fontWeight: 800, letterSpacing: '-1px' }}>
            ₹{amountInr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <button
            onClick={onEdit}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 11, marginTop: 4,
            }}
          >
            <Pencil size={11} /> Edit
          </button>
        </div>
      )}

      {rateLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.28)', fontSize: 11 }}>
          <Loader size={11} style={{ animation: 'spin 1s linear infinite' }} />
          Fetching rate…
        </div>
      ) : rateError ? (
        <div style={{ color: AMBER, fontSize: 11 }}>Rate unavailable</div>
      ) : usdEquivalent != null ? (
        <>
          <div style={{ color: ACCENT, fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
            ≈ ${usdEquivalent} USD
          </div>
          <div style={{ color: 'rgba(255,255,255,0.28)', fontSize: 11 }}>
            at live rate · ₹{rate?.toFixed(2)} / USD
          </div>
        </>
      ) : null}
    </div>
  );
}

function MemoryNote({ note }) {
  if (!note) return null;
  return (
    <div style={{
      margin: '0 16px 14px',
      background: 'rgba(78,207,154,0.04)',
      border: '1px solid rgba(78,207,154,0.13)',
      borderRadius: 11, padding: '10px 13px',
      display: 'flex', gap: 9, alignItems: 'flex-start',
    }}>
      <span style={{ fontSize: 14, color: ACCENT, flexShrink: 0, marginTop: 1 }}>🧠</span>
      <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, lineHeight: 1.55 }}>
        {note}
      </div>
    </div>
  );
}

// Google Pay icon — white circle with coloured G
function GPay({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Bottom sheet — UPI app chooser
// ---------------------------------------------------------------------------
function UpiAppSheet({ onSelectApp, onClose, launching, isWeb }) {
  return (
    <>
      {/* backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.55)',
          zIndex: 50,
        }}
      />
      {/* sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%',
        transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480,
        background: '#0d1f1a',
        borderRadius: '20px 20px 0 0',
        zIndex: 51,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {/* handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 18px 14px' }}>
          <div>
            <div style={{ color: '#fff', fontSize: 15, fontWeight: 800, letterSpacing: '-0.3px' }}>
              Choose UPI app
            </div>
            {isWeb && (
              <div style={{ color: AMBER, fontSize: 10, fontWeight: 600, marginTop: 2 }}>
                Open on your phone to launch
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ margin: '0 14px 22px', borderRadius: 13, overflow: 'hidden' }}>
          {APP_CATALOG.map((app, idx) => {
            const isFirst = idx === 0;
            return (
              <button
                key={app.id}
                onClick={() => onSelectApp(app.id)}
                disabled={launching === app.id}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '13px 14px',
                  background: isFirst ? '#0a1a17' : BG,
                  border: 'none',
                  borderBottom: idx < APP_CATALOG.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  cursor: 'pointer',
                  opacity: launching && launching !== app.id ? 0.4 : 1,
                }}
              >
                {/* app icon */}
                <div style={{
                  width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                  background: app.id === 'gpay' ? '#fff' : '#5f259f',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {app.id === 'gpay'
                    ? <GPay size={20} />
                    : <span style={{ color: '#fff', fontSize: 13, fontWeight: 800 }}>Ph</span>
                  }
                </div>

                {/* label */}
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ color: '#fff', fontSize: 13, fontWeight: 600, marginBottom: 1 }}>
                    {app.name}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>
                    {launching === app.id ? 'Launching…' : 'Tap to launch'}
                  </div>
                </div>

                {/* recommended badge + arrow */}
                {app.recommended && (
                  <span style={{
                    background: 'rgba(78,207,154,0.12)', color: ACCENT,
                    fontSize: 9, fontWeight: 700,
                    padding: '2px 7px', borderRadius: 5,
                    whiteSpace: 'nowrap', marginRight: 4,
                  }}>
                    Recommended
                  </span>
                )}

                {launching === app.id
                  ? <Loader size={15} color={ACCENT} style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
                  : <span style={{ color: isFirst ? ACCENT : 'rgba(255,255,255,0.20)', fontSize: 18, flexShrink: 0 }}>›</span>
                }
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function PaymentReviewScreen({ parsedUPI, userData, onBack, onLaunched }) {
  // ── FX rate ─────────────────────────────────────────────────────────────────
  const [rate, setRate]             = useState(null);
  const [rateLoading, setRateLoading] = useState(true);
  const [rateError, setRateError]   = useState(false);

  // ── Amount editing ──────────────────────────────────────────────────────────
  const [amountInr, setAmountInr]   = useState(parsedUPI.amount || 0);
  const [editingAmount, setEditingAmount] = useState(!parsedUPI.amount || parsedUPI.amount === 0);
  const [amountInput, setAmountInput] = useState(parsedUPI.amount ? String(parsedUPI.amount) : '');

  // ── Recipient check ─────────────────────────────────────────────────────────
  const [savedNote, setSavedNote]   = useState(null); // "Last visit: …" string or null
  const [savedId, setSavedId]       = useState(null);

  // ── Screen state ────────────────────────────────────────────────────────────
  // 'default' | 'upi-sheet' | 'wise-selected'
  const [mode, setMode]             = useState('default');

  // ── Launch ──────────────────────────────────────────────────────────────────
  const [launching, setLaunching]   = useState(null); // appId or 'wise'
  const [launchError, setLaunchError] = useState(null);
  const [wiseCopied, setWiseCopied] = useState(false);
  const [currentPlatform] = useState(() => detectPlatform());

  // ── Derived ─────────────────────────────────────────────────────────────────
  const usdEquivalent = rate && amountInr > 0
    ? parseFloat((amountInr / rate).toFixed(2))
    : null;

  const upiType = parsedUPI.upiType || (parsedUPI.merchantCode ? 'p2m' : 'unknown');

  // ---------------------------------------------------------------------------
  // Bootstrap
  // ---------------------------------------------------------------------------
  useEffect(() => {
    fetchRate();
    checkRecipient();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchRate = async () => {
    setRateLoading(true);
    setRateError(false);
    try {
      const res  = await fetch('/api/wise/rate?source=USD&target=INR');
      const json = await res.json();
      if (json.success && json.data?.rate) {
        setRate(json.data.rate);
      } else {
        setRateError(true);
      }
    } catch {
      setRateError(true);
    } finally {
      setRateLoading(false);
    }
  };

  const checkRecipient = async () => {
    try {
      const res  = await fetch(
        `/api/beneficiaries/check-upi?upiId=${encodeURIComponent(parsedUPI.upiId)}`,
        { headers: { 'x-user-id': userData.id } }
      );
      const json = await res.json();
      if (json.found && json.beneficiary) {
        setSavedId(json.beneficiary.id);
        // Build memory note from last_paid_at if available
        if (json.beneficiary.last_paid_at) {
          const d = new Date(json.beneficiary.last_paid_at);
          const fmt = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          setSavedNote(`Last visit: You paid here on ${fmt}.`);
        }
      }
    } catch {
      // Non-fatal
    }
  };

  // ---------------------------------------------------------------------------
  // Amount editing
  // ---------------------------------------------------------------------------
  const commitAmount = useCallback(() => {
    const parsed = parseFloat(amountInput);
    if (!isNaN(parsed) && parsed > 0) {
      setAmountInr(parsed);
      setEditingAmount(false);
    }
  }, [amountInput]);

  const handleAmountKeyDown = (e) => {
    if (e.key === 'Enter')  commitAmount();
    if (e.key === 'Escape') { setAmountInput(String(amountInr)); setEditingAmount(false); }
  };

  // ---------------------------------------------------------------------------
  // Log launch helper
  // ---------------------------------------------------------------------------
  const logLaunch = useCallback(async (rail) => {
    const platform = detectPlatform();
    const res = await fetch('/api/payments/launch', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': userData.id },
      body: JSON.stringify({
        recipientUpiId:  parsedUPI.upiId,
        recipientName:   parsedUPI.payeeName || null,
        amountInr,
        usdEquivalent,
        exchangeRate:    rate,
        rail,
        platform,
        upiType,
        savedRecipientId: savedId || null,
      }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Could not log launch');
    return json.launchId;
  }, [parsedUPI, amountInr, usdEquivalent, rate, upiType, savedId, userData.id]);

  // ---------------------------------------------------------------------------
  // UPI app launch
  // ---------------------------------------------------------------------------
  const handleUpiAppSelect = async (appId) => {
    if (!amountInr || amountInr <= 0) {
      setLaunchError('Please set an amount first.');
      setMode('default');
      return;
    }

    setLaunching(appId);
    setLaunchError(null);

    try {
      const launchId = await logLaunch(appId);

      // Fire deep link — must be in user-gesture call stack.
      // On desktop/DevTools this will error in the browser console (expected —
      // intent:// and tez:// have no handler on desktop). The PostLaunchBanner
      // still shows so the user isn't stuck.
      launchUpiApp(appId, {
        upiId:        parsedUPI.upiId,
        payeeName:    parsedUPI.payeeName,
        amountInr,
        merchantCode: parsedUPI.merchantCode,
      });

      // Close sheet BEFORE calling onLaunched so the PostLaunchBanner
      // is not hidden behind the bottom sheet overlay.
      setMode('default');
      onLaunched({ launchId, parsedUPI, amountInr, usdEquivalent, saveContact: !savedId, rail: appId });
    } catch (err) {
      console.error('[PaymentReviewScreen] UPI launch failed:', err.message);
      setLaunchError('Could not launch. Try again.');
      setLaunching(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Wise launch
  // ---------------------------------------------------------------------------
  const handleWiseContinue = async () => {
    if (!amountInr || amountInr <= 0) {
      setLaunchError('Please set an amount first.');
      return;
    }
    setLaunching('wise');
    setLaunchError(null);

    try {
      const launchId = await logLaunch('wise');

      // Copy UPI ID + open Wise — launchWise handles clipboard internally
      const { copied } = await launchWise(parsedUPI.upiId);
      setWiseCopied(copied);

      onLaunched({ launchId, parsedUPI, amountInr, usdEquivalent, saveContact: !savedId, rail: 'wise' });
    } catch (err) {
      console.error('[PaymentReviewScreen] Wise launch failed:', err.message);
      setLaunchError('Could not open Wise. Try again.');
      setLaunching(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const canProceed = amountInr > 0 && !editingAmount;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      minHeight: 'calc(100vh - 64px)',
      background: BG, color: '#fff',
      fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
      WebkitFontSmoothing: 'antialiased',
    }}>
      {/* ── Back ── */}
      <button
        onClick={onBack}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '14px 20px 8px',
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: 500,
        }}
      >
        ‹ Scan again
      </button>

      {/* ── Payee ── */}
      <PayeeCard parsedUPI={parsedUPI} />

      {/* ── Amount ── */}
      <AmountCard
        amountInr={amountInr}
        usdEquivalent={usdEquivalent}
        rate={rate}
        rateLoading={rateLoading}
        rateError={rateError}
        onEdit={() => { setAmountInput(String(amountInr)); setEditingAmount(true); }}
        editing={editingAmount}
        amountInput={amountInput}
        onAmountChange={setAmountInput}
        onAmountCommit={commitAmount}
        onAmountKeyDown={handleAmountKeyDown}
      />

      {/* ── PRIMARY: Pay with UPI app ── */}
      <div style={{ margin: '0 16px 10px', opacity: mode === 'wise-selected' ? 0.5 : 1 }}>
        <button
          onClick={() => { if (mode !== 'wise-selected') setMode('upi-sheet'); }}
          disabled={!canProceed || mode === 'wise-selected'}
          style={{
            width: '100%',
            background: mode === 'wise-selected' ? 'rgba(255,255,255,0.04)' : ACCENT,
            border: mode === 'wise-selected' ? '1px solid rgba(255,255,255,0.08)' : 'none',
            borderRadius: 13, padding: '15px 16px',
            display: 'flex', alignItems: 'center', gap: 12,
            cursor: mode === 'wise-selected' ? 'default' : 'pointer',
          }}
        >
          <div style={{
            width: 36, height: 36, borderRadius: 9, flexShrink: 0,
            background: mode === 'wise-selected' ? 'rgba(255,255,255,0.07)' : 'rgba(7,20,18,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Scan size={18} color={mode === 'wise-selected' ? 'rgba(255,255,255,0.4)' : BG} />
          </div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{
              fontSize: 14, fontWeight: 800, marginBottom: 1,
              color: mode === 'wise-selected' ? 'rgba(255,255,255,0.5)' : BG,
            }}>
              Pay with UPI app
            </div>
            <div style={{ fontSize: 11, color: mode === 'wise-selected' ? 'rgba(255,255,255,0.28)' : 'rgba(7,20,18,0.55)' }}>
              Google Pay, PhonePe &amp; more
            </div>
          </div>
          <span style={{ fontSize: 18, color: mode === 'wise-selected' ? 'rgba(255,255,255,0.2)' : BG, opacity: 0.6 }}>›</span>
        </button>
      </div>

      {/* ── SECONDARY: Use Wise instead / Wise selected ── */}
      {mode !== 'wise-selected' ? (
        <div style={{ margin: '0 16px 14px' }}>
          <button
            onClick={() => setMode('wise-selected')}
            style={{
              width: '100%', background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 13, padding: '12px 14px',
              display: 'flex', alignItems: 'center', gap: 11,
              cursor: 'pointer',
            }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: WISE_CLR,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 13, fontWeight: 800,
            }}>
              W
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, fontWeight: 700, marginBottom: 2 }}>
                Use Wise instead
              </div>
              <div style={{ color: 'rgba(255,255,255,0.30)', fontSize: 10, lineHeight: 1.4 }}>
                For person-to-person transfers only — not for merchants
              </div>
            </div>
            <span style={{ color: 'rgba(255,255,255,0.20)', fontSize: 16 }}>›</span>
          </button>
        </div>
      ) : (
        <>
          {/* Wise selected state */}
          <div style={{ margin: '0 16px 10px' }}>
            <button
              onClick={() => setMode('default')}
              style={{
                width: '100%',
                background: 'rgba(155,125,255,0.10)',
                border: '2px solid rgba(155,125,255,0.40)',
                borderRadius: 13, padding: '13px 14px',
                display: 'flex', alignItems: 'center', gap: 11,
                cursor: 'pointer',
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                background: WISE_CLR,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 15, fontWeight: 800,
              }}>
                W
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ color: '#fff', fontSize: 14, fontWeight: 800, marginBottom: 2 }}>
                  Wise selected
                </div>
                <div style={{ color: 'rgba(255,255,255,0.38)', fontSize: 10, lineHeight: 1.4 }}>
                  Person-to-person transfers only — not for merchants
                </div>
              </div>
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                background: WISE_CLR, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Check size={11} color="#fff" />
              </div>
            </button>
          </div>

          {/* Amber P2P disclaimer */}
          <div style={{
            margin: '0 16px 14px',
            background: 'rgba(245,190,50,0.07)',
            border: '1px solid rgba(245,190,50,0.20)',
            borderRadius: 11, padding: '10px 13px',
            display: 'flex', gap: 9, alignItems: 'flex-start',
          }}>
            <AlertCircle size={14} color={AMBER} style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ color: 'rgba(255,255,255,0.50)', fontSize: 11, lineHeight: 1.55 }}>
              <span style={{ color: AMBER, fontWeight: 600 }}>P2P only: </span>
              Wise works for sending money to a person. If this is a merchant, use a UPI app instead.
            </div>
          </div>

          {/* Wise CTA */}
          <div style={{ margin: '0 16px 14px' }}>
            <button
              onClick={handleWiseContinue}
              disabled={!canProceed || launching === 'wise'}
              style={{
                width: '100%', background: WISE_CLR,
                border: 'none', borderRadius: 13, padding: 15,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                color: '#fff', fontSize: 14, fontWeight: 800,
                cursor: canProceed && launching !== 'wise' ? 'pointer' : 'not-allowed',
                opacity: !canProceed ? 0.5 : 1,
              }}
            >
              {launching === 'wise'
                ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Opening Wise…</>
                : <>→ Continue with Wise</>
              }
            </button>
          </div>

          {wiseCopied && (
            <div style={{
              margin: '-8px 16px 10px',
              color: ACCENT, fontSize: 11, textAlign: 'center',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            }}>
              <Check size={11} /> UPI ID copied — paste it in Wise
            </div>
          )}
        </>
      )}

      {/* ── Memory note ── */}
      <MemoryNote note={savedNote} />

      {/* ── Error ── */}
      {launchError && (
        <div style={{
          margin: '0 16px 10px',
          background: 'rgba(255,80,80,0.08)',
          border: '1px solid rgba(255,80,80,0.25)',
          borderRadius: 11, padding: '10px 13px',
          display: 'flex', gap: 8, alignItems: 'flex-start',
        }}>
          <AlertCircle size={14} color="#f87171" style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ color: '#f87171', fontSize: 11, lineHeight: 1.5 }}>{launchError}</span>
        </div>
      )}

      {/* ── Disclaimer ── */}
      <div style={{ flex: 1 }} />
      <div style={{ padding: '8px 20px 16px', textAlign: 'center', color: 'rgba(255,255,255,0.20)', fontSize: 11 }}>
        Money moves through the app you choose. Vitta shows details only.
      </div>

      {/* ── UPI App Bottom Sheet ── */}
      {mode === 'upi-sheet' && (
        <UpiAppSheet
          onSelectApp={handleUpiAppSelect}
          onClose={() => setMode('default')}
          launching={launching}
          isWeb={currentPlatform === 'web'}
        />
      )}
    </div>
  );
}
