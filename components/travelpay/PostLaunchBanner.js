/**
 * PostLaunchBanner
 *
 * Slide-up panel shown after the user taps "Open Wise".
 * Asks whether the transfer was completed and records the self-reported answer.
 *
 * Two outcomes:
 *  "Yes, I sent it"  → PATCH /api/payments/launch { status: "completed" }
 *                      → calls onConfirmed({ saveContact })
 *  "I'll do it later"→ PATCH /api/payments/launch { status: "cancelled" }
 *                      → calls onDismissed()
 */

import React, { useState } from 'react';
import { CheckCircle, Clock, Loader, X } from 'lucide-react';

async function patchStatus(launchId, userId, status) {
  const res = await fetch('/api/payments/launch', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
    body: JSON.stringify({ launchId, status }),
  });
  return res.json();
}

export default function PostLaunchBanner({
  launchId,
  userData,
  recipientName,
  amountInr,
  usdEquivalent,
  saveContact,
  onConfirmed,
  onDismissed,
}) {
  const [loading, setLoading] = useState(null); // 'completed' | 'cancelled' | null
  const [error, setError] = useState(null);

  const displayName = recipientName || 'recipient';
  const formattedInr = amountInr
    ? `₹${Number(amountInr).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
    : '';
  const formattedUsd = usdEquivalent ? `$${Number(usdEquivalent).toFixed(2)}` : '';

  const handle = async (status) => {
    setLoading(status);
    setError(null);
    try {
      const result = await patchStatus(launchId, userData.id, status);
      if (!result.success) throw new Error(result.error || 'Update failed');
      if (status === 'completed') {
        onConfirmed({ saveContact });
      } else {
        onDismissed();
      }
    } catch (err) {
      console.error('[PostLaunchBanner] Status update failed:', err.message);
      setError('Could not save status — but your payment info is safe.');
      // Still dismiss after error so the user isn't stuck
      setTimeout(() => {
        if (status === 'completed') onConfirmed({ saveContact });
        else onDismissed();
      }, 1500);
    } finally {
      setLoading(null);
    }
  };

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">

      {/* Panel */}
      <div
        className="w-full max-w-md glass-teal border border-teal-500/40 rounded-t-3xl p-6
          shadow-2xl shadow-teal-900/50 animate-slide-up"
        role="dialog"
        aria-modal="true"
        aria-label="Transfer confirmation"
      >
        {/* Handle bar */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" />

        {/* Heading */}
        <h3 className="text-white font-bold text-lg text-center mb-1">
          Did you complete the transfer?
        </h3>
        <p className="text-slate-400 text-sm text-center mb-5">
          {formattedInr && formattedUsd
            ? `${formattedInr} (${formattedUsd}) to ${displayName} via Wise`
            : `To ${displayName} via Wise`}
        </p>

        {/* Error */}
        {error && (
          <p className="text-amber-400 text-xs text-center mb-3">{error}</p>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={() => handle('completed')}
            disabled={!!loading}
            data-testid="confirm-sent"
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-400
              text-white font-bold shadow-lg shadow-teal-500/30 hover:shadow-teal-500/50
              transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed
              flex items-center justify-center gap-2"
          >
            {loading === 'completed' ? (
              <><Loader className="w-4 h-4 animate-spin" />Saving…</>
            ) : (
              <><CheckCircle className="w-4 h-4" />Yes, I sent it</>
            )}
          </button>

          <button
            onClick={() => handle('cancelled')}
            disabled={!!loading}
            data-testid="confirm-later"
            className="w-full py-3.5 rounded-2xl glass border border-white/10
              text-slate-300 font-semibold hover:bg-white/5 transition-all
              active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed
              flex items-center justify-center gap-2"
          >
            {loading === 'cancelled' ? (
              <><Loader className="w-4 h-4 animate-spin" />Saving…</>
            ) : (
              <><Clock className="w-4 h-4" />I&apos;ll do it later</>
            )}
          </button>
        </div>

        <p className="text-slate-600 text-xs text-center mt-4">
          Your answer helps Vitta track which payments were completed.
        </p>
      </div>
    </div>
  );
}
