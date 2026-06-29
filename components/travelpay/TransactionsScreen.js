import React, { useState, useEffect } from 'react';
import { Loader } from 'lucide-react';

const ACCENT = '#4ecf9a';

const railLabel = (rail) => {
  if (!rail) return '';
  const map = { wise: 'Wise', gpay: 'GPay', phonepe: 'PhonePe', paytm: 'Paytm', bank: 'Bank' };
  return map[rail] || rail;
};

// resolved_upi_type is computed server-side per UPI ID (canonical across all transactions)
const upiLabel = (type) => type === 'p2p' ? 'P2P' : 'P2M';
const upiColor = (type) => type === 'p2p' ? '#9b7dff' : '#ff9055';
const upiBg    = (type) => type === 'p2p' ? 'rgba(139,107,255,0.12)' : 'rgba(255,140,80,0.12)';

const initials = (name) =>
  (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

const getDateLabel = (ts) => {
  const d = new Date(ts);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yestStart  = new Date(todayStart - 86400000);
  if (d >= todayStart) return 'Today';
  if (d >= yestStart)  return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatTime = (ts) =>
  new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

export default function TransactionsScreen({ userId, onClose }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [monthStats, setMonthStats]     = useState({ totalInr: 0, totalUsd: 0, count: 0 });

  useEffect(() => { fetchTransactions(); }, [userId]);

  const fetchTransactions = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res  = await fetch('/api/payments/transactions', { headers: { 'x-user-id': userId } });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setTransactions(json.data || []);
      const ms = json.monthStats || {};
      setMonthStats({ totalInr: ms.totalInr || 0, totalUsd: ms.totalUsd || 0, count: ms.count || 0 });
    } catch (e) {
      console.error('[TransactionsScreen]', e.message);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  // Group by date label
  const groups = transactions.reduce((acc, tx) => {
    const label = getDateLabel(tx.launched_at);
    (acc[label] = acc[label] || []).push(tx);
    return acc;
  }, {});

  const groupOrder = Object.keys(groups);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 64px)' }}>

      {/* ── TOP BAR ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 10px' }}>
        <span style={{ color: '#fff', fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>Activity</span>
      </div>

      {/* ── MONTHLY STATS ── */}
      <div style={{ margin: '4px 16px 16px', display: 'flex', gap: 10 }}>
        <div style={{
          flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12, padding: '12px 14px',
        }}>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 4 }}>This month</div>
          <div style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>
            ₹{Math.round(monthStats.totalInr).toLocaleString('en-IN')}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 2 }}>
            ≈ ${monthStats.totalUsd.toFixed(2)}
          </div>
        </div>
        <div style={{
          flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12, padding: '12px 14px',
        }}>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 4 }}>Payments</div>
          <div style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>{monthStats.count}</div>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 2 }}>this month</div>
        </div>
      </div>

      {/* ── TRANSACTION LIST ── */}
      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader size={24} color={ACCENT} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : groupOrder.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, marginBottom: 6 }}>No completed payments yet</div>
          <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>Scan a UPI QR to get started</div>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 16 }}>
          {groupOrder.map(dateLabel => (
            <div key={dateLabel}>
              {/* date group header */}
              <div style={{
                padding: '8px 20px 4px',
                color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: 700,
                letterSpacing: '0.6px', textTransform: 'uppercase',
              }}>
                {dateLabel}
              </div>

              {/* transaction rows */}
              <div style={{ margin: '0 16px', borderRadius: 12, overflow: 'hidden' }}>
                {groups[dateLabel].map((tx, i) => {
                  const type       = tx.resolved_upi_type || null;
                  const isP2P      = type === 'p2p';
                  const resolvedName = tx.resolved_name || tx.recipient_name || tx.recipient_upi_id || 'Unknown';
                  const hasName    = resolvedName && !resolvedName.includes('@');
                  const name       = hasName ? resolvedName : tx.recipient_upi_id || 'Unknown';
                  const showDiv = i < groups[dateLabel].length - 1;
                  return (
                    <div key={tx.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px',
                      background: 'rgba(255,255,255,0.05)',
                      borderBottom: showDiv ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    }}>
                      {/* avatar — circle for P2P, rounded square for P2M, neutral for unknown */}
                      <div style={{
                        width: 32, height: 32, flexShrink: 0,
                        borderRadius: type === null ? '8px' : isP2P ? '50%' : '8px',
                        background: type === null ? 'rgba(255,255,255,0.08)' : isP2P ? 'rgba(139,107,255,0.24)' : 'rgba(255,140,80,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700,
                        color: type === null ? 'rgba(255,255,255,0.45)' : isP2P ? '#9b7dff' : '#ff9055',
                      }}>
                        {initials(name)}
                      </div>

                      {/* name + meta */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {hasName ? (
                          <div style={{ color: '#fff', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {name}
                          </div>
                        ) : (
                          <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {name}
                          </div>
                        )}
                        <div style={{ color: 'rgba(255,255,255,0.38)', fontSize: 11, marginTop: 1 }}>
                          {formatTime(tx.launched_at)}
                          {tx.rail && <span style={{ marginLeft: 6, color: 'rgba(255,255,255,0.2)' }}>· {railLabel(tx.rail)}</span>}
                        </div>
                      </div>

                      {/* amounts + badge */}
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, fontWeight: 700 }}>
                          ₹{Number(tx.amount_inr).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.38)', fontSize: 10 }}>
                          ${Number(tx.usd_equivalent || 0).toFixed(2)}
                        </div>
                        {type && (
                          <span style={{
                            display: 'inline-block', marginTop: 2,
                            background: upiBg(type), color: upiColor(type),
                            fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
                          }}>
                            {upiLabel(type)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
