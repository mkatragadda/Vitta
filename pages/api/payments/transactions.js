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
      .select('id, recipient_upi_id, recipient_name, amount_inr, usd_equivalent, rail, launched_at')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('launched_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.warn('[API/payments/transactions] DB error:', error.message);
      return res.status(200).json({ success: true, data: [] });
    }

    // Also fetch this-month totals
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    const { data: monthData } = await supabase
      .from('payment_launches')
      .select('amount_inr, usd_equivalent')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .gte('launched_at', monthStart.toISOString());

    const monthRows = monthData || [];
    const monthTotalInr = monthRows.reduce((s, r) => s + (Number(r.amount_inr) || 0), 0);
    const monthTotalUsd = monthRows.reduce((s, r) => s + (Number(r.usd_equivalent) || 0), 0);

    return res.status(200).json({
      success: true,
      data: data || [],
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
