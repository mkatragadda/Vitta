/**
 * GET /api/payments/transactions
 * Returns confirmed payment history for the user from payment_launches.
 * Only includes rows where status = 'completed' (user self-reported sending).
 *
 * Headers: x-user-id: UUID
 * Query:   limit (default 50), offset (default 0)
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ success: false, error: 'x-user-id header required' });
  }

  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const offset = Number(req.query.offset) || 0;

  try {
    const { data, error } = await supabase
      .from('payment_launches')
      .select('id, recipient_upi_id, recipient_name, amount_inr, usd_equivalent, rail, upi_type, launched_at')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('launched_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.warn('[API/payments/transactions] DB error:', error.message);
      return res.status(200).json({ success: true, data: [] });
    }

    // Also fetch this-month totals — include exchange_rate so we can derive USD
    // for rows where usd_equivalent was stored as 0 (exchange rate unavailable at launch)
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    const { data: monthData } = await supabase
      .from('payment_launches')
      .select('amount_inr, usd_equivalent, exchange_rate')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .gte('launched_at', monthStart.toISOString());

    const monthRows = monthData || [];
    // INR total is always reliable — sum directly
    const monthTotalInr = monthRows.reduce((s, r) => s + (Number(r.amount_inr) || 0), 0);
    // USD: use stored usd_equivalent; if missing/zero, derive from stored exchange_rate
    const monthTotalUsd = monthRows.reduce((s, r) => {
      const stored = Number(r.usd_equivalent) || 0;
      if (stored > 0) return s + stored;
      const rate = Number(r.exchange_rate) || 0;
      return s + (rate > 0 ? (Number(r.amount_inr) || 0) / rate : 0);
    }, 0);

    const rows = data || [];

    // Build canonical name and type per UPI ID across all fetched rows.
    // Same UPI ID must always show the same name and type regardless of which
    // individual transaction stored them.
    const canonicalType = {};
    const canonicalName = {};
    for (const row of rows) {
      const key  = (row.recipient_upi_id || '').toLowerCase();
      if (!key) continue;

      // Type: P2P is sticky — once determined by Wise or QR, never overridden
      if (canonicalType[key] !== 'p2p') {
        if (row.rail === 'wise' || row.upi_type === 'p2p') {
          canonicalType[key] = 'p2p';
        } else if (row.upi_type === 'p2m') {
          canonicalType[key] = 'p2m';
        }
      }

      // Name: prefer a real name (not just the UPI ID itself) — first one found wins
      if (!canonicalName[key]) {
        const name = (row.recipient_name || '').trim();
        if (name && name.toLowerCase() !== key) {
          canonicalName[key] = name;
        }
      }
    }

    // Stamp each row with canonical values so the client renders consistently
    const enriched = rows.map(row => {
      const key = (row.recipient_upi_id || '').toLowerCase();
      return {
        ...row,
        resolved_upi_type: canonicalType[key] || null,
        resolved_name:     canonicalName[key] || row.recipient_name || row.recipient_upi_id || 'Unknown',
      };
    });

    return res.status(200).json({
      success: true,
      data: enriched,
      monthStats: {
        count: monthRows.length,
        totalInr: Math.round(monthTotalInr * 100) / 100,
        totalUsd: Math.round(monthTotalUsd * 100) / 100,
      },
    });
  } catch (err) {
    console.error('[API/payments/transactions] Error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
