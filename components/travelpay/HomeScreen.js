import React from 'react';
import { Scan, ArrowRight, Users } from 'lucide-react';

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

const PayeeRow = ({ payee, showDivider }) => {
  const isP2P = payee.upiType === 'p2p';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '11px 12px', background: 'rgba(255,255,255,0.06)', cursor: 'pointer',
      borderBottom: showDivider ? '1px solid rgba(255,255,255,0.05)' : 'none',
    }}>
      <div style={{
        width: 32, height: 32,
        borderRadius: isP2P ? '50%' : '8px',
        background: isP2P ? 'rgba(139,107,255,0.24)' : 'rgba(255,140,80,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700,
        color: isP2P ? P2P_CLR : P2M_CLR,
        flexShrink: 0,
      }}>
        {twoInitials(payee.name)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: '#fff', fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {payee.name}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 1 }}>
          {formatDate(payee.lastPaidAt)}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 600 }}>
          ₹{payee.amountInr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.28)', fontSize: 10 }}>
          ${payee.amountUsd.toFixed(2)}
        </div>
        <span style={{
          display: 'inline-block', marginTop: 2,
          background: isP2P ? 'rgba(139,107,255,0.12)' : 'rgba(255,140,80,0.12)',
          color: isP2P ? P2P_CLR : P2M_CLR,
          fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
        }}>
          {isP2P ? 'P2P' : 'P2M'}
        </span>
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
}) {
  const isEmpty  = recentPayees.length === 0;
  const isSparse = recentPayees.length > 0 && recentPayees.length < 3;
  const isFull   = recentPayees.length >= 3;

  return (
    // fill full screen height minus bottom nav (64px)
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 64px)' }}>

      {/* ── TOP BAR ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 10px' }}>
        <span style={{ color: '#fff', fontSize: 16, fontWeight: 700, letterSpacing: '-0.4px' }}>Vitta</span>
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          background: 'rgba(78,207,154,0.12)',
          border: '1px solid rgba(78,207,154,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color: ACCENT,
        }}>
          {twoInitials(userName)}
        </div>
      </div>

      {/* ── TITLE ── */}
      <div style={{ padding: '2px 20px 12px' }}>
        <div style={{ color: '#fff', fontSize: 20, fontWeight: 700, letterSpacing: '-0.4px', marginBottom: 3 }}>Pay in India</div>
        <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>Scan a QR or pay someone again</div>
      </div>

      {/* ── LIVE RATE PILL ── */}
      <div style={{ padding: '0 20px 14px' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(78,207,154,0.08)',
          border: '1px solid rgba(78,207,154,0.18)',
          borderRadius: 20, padding: '5px 12px',
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: ACCENT }} />
          {exchangeRate ? (
            <span style={{ color: ACCENT, fontSize: 11, fontWeight: 600 }}>
              Live rate · ₹{exchangeRate.toFixed(2)} / USD
            </span>
          ) : (
            <span style={{ color: 'rgba(78,207,154,0.5)', fontSize: 11 }}>Fetching…</span>
          )}
        </div>
      </div>

      {/* ── SCAN & PAY ── */}
      <div style={{ margin: '0 16px 18px' }}>
        <button
          onClick={onScanToPay}
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 18, padding: '26px 14px',
            cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}
        >
          <div style={{
            width: 58, height: 58, borderRadius: '50%',
            background: ACCENT,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 12,
          }}>
            <Scan size={26} color="#071412" strokeWidth={2.5} />
          </div>
          <div style={{ color: '#fff', fontSize: 16, fontWeight: 700, marginBottom: 3 }}>Scan &amp; Pay</div>
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>Scan any UPI QR in India</div>
        </button>
      </div>

      {/* ── PAYEES SECTION — fills all remaining height ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingBottom: 16 }}>

        {/* section header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px 8px' }}>
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>Recent payees</span>
          {isFull && (
            <button
              onClick={onViewActivity}
              style={{ background: 'none', border: 'none', color: ACCENT, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
            >
              View all →
            </button>
          )}
        </div>

        {/* ── EMPTY: fills remaining space ── */}
        {isEmpty && (
          <div style={{
            flex: 1, margin: '0 16px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px dashed rgba(255,255,255,0.1)',
            borderRadius: 13,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '28px 16px', textAlign: 'center',
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: '50%',
              background: 'rgba(78,207,154,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 11,
            }}>
              <Users size={20} color={ACCENT} />
            </div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 700, marginBottom: 5 }}>
              No recent payees yet
            </div>
            <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, lineHeight: 1.6 }}>
              Scan a UPI QR to make your first payment.<br />It&apos;ll show up here.
            </div>
          </div>
        )}

        {/* ── SPARSE: list + nudge that GROWS to fill gap ── */}
        {isSparse && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', margin: '0 16px', gap: 10 }}>
            {/* payee rows */}
            <div style={{ borderRadius: 13, overflow: 'hidden' }}>
              {recentPayees.map((p, i) => (
                <PayeeRow key={p.upiId} payee={p} showDivider={i < recentPayees.length - 1} />
              ))}
            </div>

            {/* nudge card — flex:1 fills all remaining space */}
            <button
              onClick={onScanToPay}
              style={{
                flex: 1,
                background: 'rgba(78,207,154,0.04)',
                border: '1px dashed rgba(78,207,154,0.15)',
                borderRadius: 12, padding: '14px',
                display: 'flex', alignItems: 'center', gap: 11,
                cursor: 'pointer', width: '100%', textAlign: 'left',
                minHeight: 70,
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(78,207,154,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Scan size={17} color={ACCENT} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: 700, marginBottom: 3 }}>
                  Scan to pay someone new
                </div>
                <div style={{ color: 'rgba(255,255,255,0.28)', fontSize: 11, lineHeight: 1.45 }}>
                  They&apos;ll appear here for quick repeat payments.
                </div>
              </div>
              <ArrowRight size={16} color="rgba(78,207,154,0.5)" style={{ flexShrink: 0 }} />
            </button>
          </div>
        )}

        {/* ── FULL: list only ── */}
        {isFull && (
          <div style={{
            margin: '0 16px',
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 13, overflow: 'hidden',
          }}>
            {recentPayees.map((p, i) => (
              <PayeeRow key={p.upiId} payee={p} showDivider={i < recentPayees.length - 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
