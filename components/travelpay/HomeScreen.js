import React from 'react';
import { Scan, ArrowRight } from 'lucide-react';

const ACCENT  = '#4ecf9a';
const P2P_CLR = '#9b7dff';
const P2M_CLR = '#ff9055';

const twoInitials = (name) =>
  (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

const formatDate = (ts) => {
  const d   = new Date(ts);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yestStart  = new Date(todayStart - 86400000);
  if (d >= todayStart) return 'Today';
  if (d >= yestStart)  return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// A "real name" is something that doesn't look like a UPI ID (no @ in the middle)
const isRealName = (name) => name && !name.includes('@');

const PayeeRow = ({ payee, showDivider, onPress }) => {
  const isP2P     = payee.upiType === 'p2p';
  const isP2M     = payee.upiType === 'p2m';
  const showBadge = isP2P || isP2M;
  const hasName   = isRealName(payee.name);
  // Primary display: real name if available, otherwise the UPI ID
  const displayName = hasName ? payee.name : payee.upiId;

  return (
    <div
      onClick={() => onPress && onPress(payee)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '11px 12px', background: 'rgba(255,255,255,0.06)', cursor: 'pointer',
        borderBottom: showDivider ? '1px solid rgba(255,255,255,0.05)' : 'none',
        WebkitTapHighlightColor: 'transparent',
        transition: 'background 0.12s',
      }}
      onTouchStart={e => e.currentTarget.style.background = 'rgba(255,255,255,0.09)'}
      onTouchEnd={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
    >
      <div style={{
        width: 36, height: 36, flexShrink: 0,
        borderRadius: isP2P ? '50%' : '9px',
        background: isP2P ? 'rgba(139,107,255,0.24)' : 'rgba(255,140,80,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 700,
        color: isP2P ? P2P_CLR : P2M_CLR,
      }}>
        {twoInitials(displayName)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Primary: real name (bold) or UPI ID (smaller, muted — clearly an identifier) */}
        {hasName ? (
          <div style={{ color: '#fff', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {payee.name}
          </div>
        ) : (
          <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {payee.upiId}
          </div>
        )}
        {/* Secondary line: UPI ID (when we have a real name) + date + Pay again */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2, overflow: 'hidden' }}>
          {hasName && (
            <>
              <span style={{ color: 'rgba(255,255,255,0.22)', fontSize: 10, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 110 }}>
                {payee.upiId}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 10, flexShrink: 0 }}>·</span>
            </>
          )}
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, flexShrink: 0 }}>
            {formatDate(payee.lastPaidAt)}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: 10, flexShrink: 0 }}>·</span>
          <span style={{ color: ACCENT, fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
            Pay again
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, fontWeight: 700 }}>
            ₹{payee.amountInr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.38)', fontSize: 10 }}>
            ${payee.amountUsd.toFixed(2)}
          </div>
          {showBadge && (
            <span style={{
              display: 'inline-block', marginTop: 2,
              background: isP2P ? 'rgba(139,107,255,0.12)' : 'rgba(255,140,80,0.12)',
              color: isP2P ? P2P_CLR : P2M_CLR,
              fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
            }}>
              {isP2P ? 'P2P' : 'P2M'}
            </span>
          )}
        </div>
        <span style={{ color: 'rgba(78,207,154,0.55)', fontSize: 17, lineHeight: 1 }}>›</span>
      </div>
    </div>
  );
};

export default function HomeScreen({
  exchangeRate,
  recentPayees = [],
  userName,
  onScanToPay,
  onViewActivity,
  onPayeePress,
}) {
  const isEmpty  = recentPayees.length === 0;
  const isSparse = recentPayees.length > 0 && recentPayees.length < 3;
  const isFull   = recentPayees.length >= 3;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 64px)' }}>

      {/* ── TOP BAR ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 10px' }}>
        <span style={{ color: '#fff', fontSize: 18, fontWeight: 800, letterSpacing: '-0.5px' }}>Vitta</span>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'rgba(78,207,154,0.12)',
          border: '1px solid rgba(78,207,154,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, color: ACCENT,
        }}>
          {twoInitials(userName)}
        </div>
      </div>

      {/* ── TITLE ── */}
      <div style={{ padding: '2px 20px 12px' }}>
        <div style={{ color: '#fff', fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 4 }}>Pay in India</div>
        <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>Scan a QR or pay someone again</div>
      </div>

      {/* ── LIVE RATE — full width ── */}
      <div style={{ padding: '0 16px 14px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(78,207,154,0.08)',
          border: '1px solid rgba(78,207,154,0.18)',
          borderRadius: 12, padding: '10px 14px',
        }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: ACCENT, flexShrink: 0 }} />
          {exchangeRate ? (
            <>
              <span style={{ color: ACCENT, fontSize: 12, fontWeight: 600 }}>
                Live rate · ₹{exchangeRate.toFixed(2)} / USD
              </span>
              <span style={{ marginLeft: 'auto', color: 'rgba(78,207,154,0.45)', fontSize: 11, fontWeight: 600 }}>
                INR / USD
              </span>
            </>
          ) : (
            <span style={{ color: 'rgba(78,207,154,0.5)', fontSize: 12 }}>Fetching rate…</span>
          )}
        </div>
      </div>

      {/* ── SCAN & PAY ── */}
      <div style={{ margin: '0 16px 20px' }}>
        <button
          onClick={onScanToPay}
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 18, padding: '36px 14px',
            cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}
        >
          <div style={{
            width: 66, height: 66, borderRadius: '50%',
            background: ACCENT,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 14,
          }}>
            <Scan size={28} color="#071412" strokeWidth={2.5} />
          </div>
          <div style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 5 }}>Scan &amp; Pay</div>
          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>Scan any UPI QR in India</div>
        </button>
      </div>

      {/* ── SECTION HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px 8px' }}>
        <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>Recent payees</span>
        {isFull && (
          <button
            onClick={onViewActivity}
            style={{ background: 'none', border: 'none', color: ACCENT, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            View all →
          </button>
        )}
      </div>

      {/* ── EMPTY STATE: fill nudge card ── */}
      {isEmpty && (
        <div style={{ flex: 1, margin: '0 16px 10px', display: 'flex', flexDirection: 'column' }}>
          <button
            onClick={onScanToPay}
            style={{
              flex: 1,
              background: 'rgba(78,207,154,0.04)',
              border: '1px dashed rgba(78,207,154,0.16)',
              borderRadius: 13,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 10, cursor: 'pointer',
              padding: '20px 16px', textAlign: 'center',
            }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'rgba(78,207,154,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Scan size={22} color={ACCENT} />
            </div>
            <div>
              <div style={{ color: 'rgba(255,255,255,0.60)', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                Scan to make your first payment
              </div>
              <div style={{ color: 'rgba(255,255,255,0.36)', fontSize: 11, lineHeight: 1.5 }}>
                People and merchants you pay will appear here.
              </div>
            </div>
            <ArrowRight size={16} color="rgba(78,207,154,0.45)" />
          </button>
        </div>
      )}

      {/* ── SPARSE: compact list + nudge fills remaining space ── */}
      {isSparse && (
        <>
          <div style={{ margin: '0 16px 10px', borderRadius: 13, overflow: 'hidden' }}>
            {recentPayees.map((p, i) => (
              <PayeeRow key={p.upiId} payee={p} showDivider={i < recentPayees.length - 1} onPress={onPayeePress} />
            ))}
          </div>

          {/* nudge card stretches to fill all remaining vertical space */}
          <div style={{ flex: 1, margin: '0 16px 10px', display: 'flex', flexDirection: 'column' }}>
            <button
              onClick={onScanToPay}
              style={{
                flex: 1,
                background: 'rgba(78,207,154,0.04)',
                border: '1px dashed rgba(78,207,154,0.16)',
                borderRadius: 13,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 10, cursor: 'pointer',
                padding: '20px 16px', textAlign: 'center',
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: 'rgba(78,207,154,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Scan size={20} color={ACCENT} />
              </div>
              <div>
                <div style={{ color: 'rgba(255,255,255,0.60)', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                  Scan to pay someone new
                </div>
                <div style={{ color: 'rgba(255,255,255,0.36)', fontSize: 11, lineHeight: 1.5 }}>
                  People and merchants you pay will appear here.
                </div>
              </div>
            </button>
          </div>
        </>
      )}

      {/* ── FULL: list only ── */}
      {isFull && (
        <div style={{ margin: '0 16px', borderRadius: 13, overflow: 'hidden' }}>
          {recentPayees.map((p, i) => (
            <PayeeRow key={p.upiId} payee={p} showDivider={i < recentPayees.length - 1} onPress={onPayeePress} />
          ))}
        </div>
      )}

      {/* spacer only for full state — empty and sparse use flex:1 fill cards */}
      {isFull && <div style={{ flex: 1 }} />}
    </div>
  );
}
