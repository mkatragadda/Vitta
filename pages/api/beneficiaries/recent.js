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
      .select('recipient_upi_id, recipient_name, amount_inr, usd_equivalent, launched_at, rail')
      .eq('user_id', userId)
      .order('launched_at', { ascending: false })
      .limit(100);

    if (error) {
      console.warn('[API/beneficiaries/recent] DB error:', error.message);
      return res.status(200).json({ success: true, data: [] });
    }

    // Deduplicate — keep first occurrence (most recent) per UPI ID
    const seen = new Set();
    const payees = [];
    for (const row of data || []) {
      const key = (row.recipient_upi_id || '').toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);

      // Derive P2P vs P2M from the rail used:
      // Wise = international remittance → person-to-person
      // GPay / PhonePe / Paytm / bank = local UPI → typically merchant
      const upiType = row.rail === 'wise' ? 'p2p' : 'p2m';

      payees.push({
        upiId:      key,
        name:       row.recipient_name || key,
        amountInr:  Number(row.amount_inr)    || 0,
        amountUsd:  Number(row.usd_equivalent) || 0,
        lastPaidAt: row.launched_at,
        upiType,
        rail: row.rail,
      });

      if (payees.length === 5) break;
    }

    return res.status(200).json({ success: true, data: payees });
  } catch (err) {
    console.error('[API/beneficiaries/recent] Error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
