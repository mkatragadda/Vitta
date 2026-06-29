/**
 * GET /api/beneficiaries/recent
 * Returns the last 5 distinct payees for the user, derived from payment_launches.
 * Deduplicates by recipient_upi_id, keeping the most recent launch per payee.
 *
 * Headers: x-user-id: UUID
 *
 * Response: { success: true, data: [ { upiId, name, amountInr, amountUsd, lastPaidAt, upiType, rail } ] }
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

  try {
    // Fetch recent launches (any status) — enough to find 5 distinct payees
    const { data, error } = await supabase
      .from('payment_launches')
      .select('recipient_upi_id, recipient_name, amount_inr, usd_equivalent, launched_at, rail, upi_type')
      .eq('user_id', userId)
      .order('launched_at', { ascending: false })
      .limit(100);

    if (error) {
      console.warn('[API/beneficiaries/recent] DB error:', error.message);
      return res.status(200).json({ success: true, data: [] });
    }

    const rows = data || [];

    // Pass 1: build canonical name and type per UPI ID across ALL fetched rows.
    // Same UPI ID must always show the same name and type regardless of which
    // transaction stored them — scan all 100 rows before deduplicating.
    const canonicalType = {};
    const canonicalName = {};
    for (const row of rows) {
      const key = (row.recipient_upi_id || '').toLowerCase();
      if (!key) continue;

      // Type: P2P is sticky — Wise or QR-without-mc overrides stale P2M entries
      if (canonicalType[key] !== 'p2p') {
        if (row.rail === 'wise' || row.upi_type === 'p2p') {
          canonicalType[key] = 'p2p';
        } else if (row.upi_type === 'p2m') {
          canonicalType[key] = 'p2m';
        }
      }

      // Name: prefer a real name over the raw UPI ID — first found wins
      if (!canonicalName[key]) {
        const name = (row.recipient_name || '').trim();
        if (name && name.toLowerCase() !== key) {
          canonicalName[key] = name;
        }
      }
    }

    // Pass 2: deduplicate — keep first occurrence (most recent) per UPI ID
    const seen = new Set();
    const payees = [];
    for (const row of rows) {
      const key = (row.recipient_upi_id || '').toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);

      payees.push({
        upiId:      key,
        name:       canonicalName[key] || key,
        amountInr:  Number(row.amount_inr)    || 0,
        amountUsd:  Number(row.usd_equivalent) || 0,
        lastPaidAt: row.launched_at,
        upiType:    canonicalType[key] || 'unknown',
        rail:       row.rail,
      });

      if (payees.length === 5) break;
    }

    return res.status(200).json({ success: true, data: payees });
  } catch (err) {
    console.error('[API/beneficiaries/recent] Error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
