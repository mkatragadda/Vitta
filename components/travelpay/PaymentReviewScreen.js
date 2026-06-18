/**
 * PaymentReviewScreen
 *
 * Shows parsed UPI details, a live USD equivalent, and the "Open Wise" CTA.
 * Vitta does not move money — it hands the user off to Wise with maximum
 * context so they can complete the transfer themselves.
 *
 * Flow:
 *  1. Mount → fetch live FX rate + check whether recipient is already saved.
 *  2. User reviews amount (editable when the QR had no pre-filled amount).
 *  3. User taps "Open Wise":
 *     a. Log launch via POST /api/payments/launch.
 *     b. Open Wise app (mobile) or Wise web (desktop).
 *     c. Call onLaunched() so the parent can show the PostLaunchBanner.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Copy, Check, ExternalLink, Loader, AlertCircle,
  UserCheck, UserPlus, Pencil, X,
} from 'lucide-react';
import { detectPlatform, buildWiseWebUrl, buildPaymentSummary } from '../../utils/wiseLauncher';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CopyButton({ text, field, copiedField, onCopy }) {
  const copied = copiedField === field;
  return (
    <button
      onClick={() => onCopy(text, field)}
      aria-label={copied ? 'Copied' : `Copy ${field}`}
      className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-all
        bg-teal-500/10 border border-teal-500/30 text-teal-300 hover:bg-teal-500/20 active:scale-95"
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function RecipientBadge({ status }) {
  if (status.loading) {
    return (
      <span className="flex items-center gap-1 text-xs text-slate-400">
        <Loader className="w-3 h-3 animate-spin" />
        Checking contacts…
      </span>
    );
  }
  if (status.found) {
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold
        bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
        <UserCheck className="w-3 h-3" />
        Saved contact
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold
      bg-slate-500/15 text-slate-400 border border-slate-500/30">
      <UserPlus className="w-3 h-3" />
      New recipient
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function PaymentReviewScreen({ parsedUPI, userData, onBack, onLaunched }) {
  const [rate, setRate] = useState(null);
  const [rateLoading, setRateLoading] = useState(true);
  const [rateError, setRateError] = useState(false);

  // Amount — editable when the QR had no pre-filled amount
  const [amountInr, setAmountInr] = useState(parsedUPI.amount || 0);
  const [editingAmount, setEditingAmount] = useState(!parsedUPI.amount || parsedUPI.amount === 0);
  const [amountInput, setAmountInput] = useState(parsedUPI.amount ? String(parsedUPI.amount) : '');

  // Recipient existence check
  const [recipientStatus, setRecipientStatus] = useState({ loading: true, found: false, beneficiary: null });

  // Save-contact toggle — only offered when the recipient isn't already saved
  const [saveContact, setSaveContact] = useState(false);

  // Launch state
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState(null);

  // Clipboard feedback
  const [copiedField, setCopiedField] = useState(null);

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------
  const usdEquivalent = rate && amountInr > 0
    ? parseFloat((amountInr / rate).toFixed(2))
    : null;

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------
  useEffect(() => {
    fetchRate();
    checkRecipient();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Default the save toggle once we know whether the recipient exists
  useEffect(() => {
    if (!recipientStatus.loading) {
      setSaveContact(!recipientStatus.found);
    }
  }, [recipientStatus.loading, recipientStatus.found]);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------
  const fetchRate = async () => {
    setRateLoading(true);
    setRateError(false);
    try {
      const res = await fetch('/api/wise/rate?source=USD&target=INR');
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
    setRecipientStatus({ loading: true, found: false, beneficiary: null });
    try {
      const res = await fetch(
        `/api/beneficiaries/check-upi?upiId=${encodeURIComponent(parsedUPI.upiId)}`,
        { headers: { 'x-user-id': userData.id } }
      );
      const json = await res.json();
      setRecipientStatus({
        loading: false,
        found: json.found ?? false,
        beneficiary: json.beneficiary ?? null,
      });
    } catch {
      // Non-fatal — treat as new recipient
      setRecipientStatus({ loading: false, found: false, beneficiary: null });
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
    if (e.key === 'Enter') commitAmount();
    if (e.key === 'Escape') {
      setAmountInput(amountInr ? String(amountInr) : '');
      setEditingAmount(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Clipboard
  // ---------------------------------------------------------------------------
  const copyToClipboard = useCallback(async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Clipboard API unavailable (e.g. HTTP in dev) — silently ignore
    }
  }, []);

  const copySummary = useCallback(() => {
    const summary = buildPaymentSummary({
      upiId: parsedUPI.upiId,
      payeeName: parsedUPI.payeeName,
      amountInr,
      usdEquivalent,
      exchangeRate: rate,
    });
    copyToClipboard(summary, 'summary');
  }, [parsedUPI, amountInr, usdEquivalent, rate, copyToClipboard]);

  // ---------------------------------------------------------------------------
  // Launch
  // ---------------------------------------------------------------------------
  const handleLaunch = async () => {
    if (!amountInr || amountInr <= 0) {
      setLaunchError('Please enter an amount before continuing.');
      return;
    }
    setLaunching(true);
    setLaunchError(null);

    try {
      // 1. Log the launch — do this before opening the external app so the
      //    record exists even if the user never returns to Vitta.
      const launchRes = await fetch('/api/payments/launch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userData.id,
        },
        body: JSON.stringify({
          recipientUpiId: parsedUPI.upiId,
          recipientName: parsedUPI.payeeName || null,
          amountInr,
          usdEquivalent,
          exchangeRate: rate,
          rail: 'wise',
          savedRecipientId: recipientStatus.beneficiary?.id || null,
        }),
      });

      const launchJson = await launchRes.json();
      if (!launchJson.success) {
        throw new Error(launchJson.error || 'Could not log payment launch');
      }

      // 2. Build Wise URL with best-effort amount pre-fill.
      const wiseUrl = buildWiseWebUrl({ amountInr, usdEquivalent });

      // 3. Open Wise synchronously (must be in the user-gesture call stack
      //    or popup blockers will fire).
      window.open(wiseUrl, '_blank');

      // 4. On real mobile hardware, try the Wise app scheme so the installed
      //    app can intercept. Chrome DevTools responsive mode spoofs the UA
      //    AND maxTouchPoints, but navigator.platform still reports the host
      //    OS (MacIntel / Win32) — use that to filter out simulated devices.
      const uaPlatform = detectPlatform(navigator.userAgent);
      const nativePlatform = (navigator.platform || '').toLowerCase();
      const isRealMobile = (uaPlatform === 'ios' || uaPlatform === 'android')
        && /iphone|ipad|ipod|android/.test(nativePlatform);
      if (isRealMobile) {
        try { window.location.href = 'wise://'; } catch { /* ignore */ }
      }

      // 5. Notify parent — it will show the PostLaunchBanner.
      onLaunched({
        launchId: launchJson.launchId,
        parsedUPI,
        amountInr,
        usdEquivalent,
        saveContact: saveContact && !recipientStatus.found,
      });

    } catch (err) {
      console.error('[PaymentReviewScreen] Launch failed:', err.message);
      setLaunchError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLaunching(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const displayName = parsedUPI.payeeName || parsedUPI.upiId;
  const initials = displayName
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-950 via-teal-950 to-slate-950 pb-[env(safe-area-inset-bottom)]">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-4">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-white/10 transition-all"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h2 className="text-white font-semibold text-base">Review Payment</h2>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto px-5 space-y-4 pb-6">

        {/* ── Recipient card ─────────────────────────────────────────────── */}
        <div className="glass-teal rounded-3xl p-5 border border-teal-500/30">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-400 flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-lg">{initials}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white font-bold text-lg truncate">{displayName}</p>
              <p className="text-slate-400 text-sm truncate">{parsedUPI.upiId}</p>
              <div className="mt-1.5">
                <RecipientBadge status={recipientStatus} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Amount ─────────────────────────────────────────────────────── */}
        <div className="glass rounded-2xl p-5 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 text-sm font-medium">Amount (INR)</span>
            {!editingAmount && (
              <button
                onClick={() => { setAmountInput(String(amountInr)); setEditingAmount(true); }}
                className="flex items-center gap-1 text-teal-400 text-xs hover:text-teal-300"
                aria-label="Edit amount"
              >
                <Pencil className="w-3 h-3" />
                Edit
              </button>
            )}
          </div>

          {editingAmount ? (
            <div className="flex items-center gap-2">
              <span className="text-white text-2xl font-bold">₹</span>
              <input
                type="number"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                onKeyDown={handleAmountKeyDown}
                onBlur={commitAmount}
                placeholder="0"
                min="0"
                step="0.01"
                autoFocus
                className="flex-1 bg-transparent text-white text-2xl font-bold outline-none
                  border-b-2 border-teal-500 pb-1"
                aria-label="Amount in INR"
              />
              <button
                onClick={commitAmount}
                className="px-3 py-1.5 rounded-xl bg-teal-500 text-white text-sm font-semibold"
              >
                Set
              </button>
            </div>
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-white text-4xl font-bold">
                ₹{amountInr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}

          {/* USD equivalent */}
          <div className="mt-3 pt-3 border-t border-white/10">
            {rateLoading ? (
              <span className="text-slate-500 text-xs flex items-center gap-1">
                <Loader className="w-3 h-3 animate-spin" />
                Fetching live rate…
              </span>
            ) : rateError ? (
              <span className="text-amber-400 text-xs">Rate unavailable — Wise will show the exact amount</span>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">
                  ≈ <span className="text-white font-semibold">${usdEquivalent} USD</span>
                </span>
                <span className="text-slate-500 text-xs">₹{rate?.toFixed(2)}/USD</span>
              </div>
            )}
          </div>
        </div>

        {/* ── How to pay guide ───────────────────────────────────────────── */}
        <div className="glass rounded-2xl p-4 border border-white/10 space-y-3">
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">
            How to complete in Wise
          </p>

          {/* Step 1 — copy UPI ID */}
          <div className="flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-teal-500/20 border border-teal-500/40 text-teal-400
              text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
            <div className="flex-1 min-w-0">
              <p className="text-slate-400 text-xs mb-1">Copy UPI ID → paste as recipient in Wise</p>
              <div className="flex items-center justify-between gap-2 bg-white/5 rounded-lg px-3 py-2">
                <p className="text-white text-sm font-mono truncate">{parsedUPI.upiId}</p>
                <CopyButton
                  text={parsedUPI.upiId}
                  field="upiId"
                  copiedField={copiedField}
                  onCopy={copyToClipboard}
                />
              </div>
            </div>
          </div>

          {/* Step 2 — copy amount */}
          {amountInr > 0 && (
            <div className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-teal-500/20 border border-teal-500/40 text-teal-400
                text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
              <div className="flex-1">
                <p className="text-slate-400 text-xs mb-1">Confirm amount in Wise (pre-filled if supported)</p>
                <div className="flex items-center justify-between gap-2 bg-white/5 rounded-lg px-3 py-2">
                  <p className="text-white text-sm font-mono">
                    ₹{amountInr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                  <CopyButton
                    text={String(amountInr)}
                    field="amount"
                    copiedField={copiedField}
                    onCopy={copyToClipboard}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3 — copy all */}
          <div className="flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-teal-500/20 border border-teal-500/40 text-teal-400
              text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{amountInr > 0 ? 3 : 2}</span>
            <div className="flex-1">
              <p className="text-slate-400 text-xs mb-1">Or copy everything at once</p>
              <button
                onClick={copySummary}
                className="w-full py-2 rounded-xl glass text-teal-300 text-xs font-semibold
                  border border-teal-500/20 hover:bg-teal-500/10 transition-all flex items-center justify-center gap-1.5"
              >
                {copiedField === 'summary' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedField === 'summary' ? 'Copied!' : 'Copy all payment details'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Save contact toggle (only for new recipients) ──────────────── */}
        {!recipientStatus.loading && !recipientStatus.found && (
          <button
            onClick={() => setSaveContact((v) => !v)}
            className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all
              ${saveContact
                ? 'bg-teal-500/10 border-teal-500/40 text-teal-300'
                : 'glass border-white/10 text-slate-400'}`}
          >
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0
              ${saveContact ? 'bg-teal-500 border-teal-500' : 'border-slate-500'}`}>
              {saveContact && <Check className="w-3 h-3 text-white" />}
            </div>
            <div className="text-left">
              <p className="font-semibold text-sm">
                Remember {parsedUPI.payeeName ? parsedUPI.payeeName.split(' ')[0] : 'this recipient'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Save to contacts so next payment is one tap
              </p>
            </div>
          </button>
        )}

        {/* ── Error ──────────────────────────────────────────────────────── */}
        {launchError && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-red-300 text-sm">{launchError}</p>
          </div>
        )}

        {/* ── Disclaimer ─────────────────────────────────────────────────── */}
        <p className="text-center text-slate-600 text-xs px-4">
          Vitta shows you the details.&nbsp;
          <span className="text-slate-500">Money moves through Wise — not Vitta.</span>
        </p>
      </div>

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      <div className="px-5 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <button
          onClick={handleLaunch}
          disabled={launching || !amountInr || amountInr <= 0 || editingAmount}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-400
            text-white font-bold text-base shadow-2xl shadow-teal-500/30
            hover:shadow-teal-500/50 transition-all active:scale-[0.98]
            disabled:opacity-50 disabled:cursor-not-allowed
            flex items-center justify-center gap-2"
        >
          {launching ? (
            <><Loader className="w-5 h-5 animate-spin" />Opening Wise…</>
          ) : (
            <><ExternalLink className="w-5 h-5" />Open Wise</>
          )}
        </button>
      </div>
    </div>
  );
}
