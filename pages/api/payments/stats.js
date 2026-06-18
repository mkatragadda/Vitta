/**
 * GET /api/payments/stats
 * Returns this-week payment stats for the authenticated user from payment_launches.
 * Headers: x-user-id: UUID
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
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
    // Start of current ISO week (Monday 00:00 UTC)
    const now = new Date();
    const dayOfWeek = now.getUTCDay(); // 0=Sun
    const daysFromMonday = (dayOfWeek + 6) % 7;
    const weekStart = new Date(now);
    weekStart.setUTCDate(now.getUTCDate() - daysFromMonday);
    weekStart.setUTCHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('payment_launches')
      .select('amount_inr, usd_equivalent, status')
      .eq('user_id', userId)
      .gte('launched_at', weekStart.toISOString())
      .in('status', ['launched', 'completed']);

    if (error) {
      // Table may not be migrated yet — return empty stats rather than 500
      console.warn('[API/payments/stats] DB error (table may not exist):', error.message);
      return res.status(200).json({
        success: true,
        data: { paymentsThisWeek: 0, totalInr: 0, totalUsd: 0 },
      });
    }

    const rows = data || [];
    const totalInr = rows.reduce((sum, r) => sum + (Number(r.amount_inr) || 0), 0);
    const totalUsd = rows.reduce((sum, r) => sum + (Number(r.usd_equivalent) || 0), 0);

    return res.status(200).json({
      success: true,
      data: {
        paymentsThisWeek: rows.length,
        totalInr: Math.round(totalInr * 100) / 100,
        totalUsd: Math.round(totalUsd * 100) / 100,
      },
    });
  } catch (err) {
    console.error('[API/payments/stats] Error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
