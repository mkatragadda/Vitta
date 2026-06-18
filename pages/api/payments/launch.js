/**
 * /api/payments/launch
 *
 * POST  — log a new payment launch (user is about to open Wise)
 * PATCH — update the status after user returns (self-reported completion)
 *
 * Auth: x-user-id header (UUID) required for both methods.
 *
 * POST body:
 *   { recipientUpiId, recipientName?, amountInr, usdEquivalent?,
 *     exchangeRate?, rail?, savedRecipientId?, note? }
 * POST response 201:
 *   { success: true, launchId: "uuid" }
 *
 * PATCH body:  { launchId, status: "completed"|"cancelled"|"failed" }
 * PATCH response 200:
 *   { success: true }
 *
 * Error responses follow { success: false, error: "message" } shape.
 */

import { createClient } from '@supabase/supabase-js';
import PaymentLaunchService from '../../../services/payments/paymentLaunchService';

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase configuration is missing');
  return createClient(url, key);
}

// ---------------------------------------------------------------------------
// POST — log a new launch
// ---------------------------------------------------------------------------
async function handlePost(req, res, userId) {
  const {
    recipientUpiId,
    recipientName,
    amountInr,
    usdEquivalent,
    exchangeRate,
    rail,
    savedRecipientId,
    note,
  } = req.body;

  if (!recipientUpiId || !amountInr) {
    return res.status(400).json({
      success: false,
      error: 'recipientUpiId and amountInr are required',
    });
  }

  let supabase;
  try {
    supabase = getSupabaseClient();
  } catch (err) {
    console.error('[launch POST] Config error:', err.message);
    return res.status(500).json({ success: false, error: 'Server configuration error' });
  }

  const svc = new PaymentLaunchService(supabase);

  const result = await svc.logLaunch(userId, {
    recipientUpiId,
    recipientName,
    amountInr,
    usdEquivalent,
    exchangeRate,
    rail,
    savedRecipientId,
    note,
  });

  if (!result.success) {
    const status = result.error?.includes('required') ? 400 : 500;
    return res.status(status).json({ success: false, error: result.error });
  }

  return res.status(201).json({ success: true, launchId: result.launchId });
}

// ---------------------------------------------------------------------------
// PATCH — update status (self-reported by user)
// ---------------------------------------------------------------------------
async function handlePatch(req, res, userId) {
  const { launchId, status } = req.body;

  if (!launchId || !status) {
    return res.status(400).json({
      success: false,
      error: 'launchId and status are required',
    });
  }

  let supabase;
  try {
    supabase = getSupabaseClient();
  } catch (err) {
    console.error('[launch PATCH] Config error:', err.message);
    return res.status(500).json({ success: false, error: 'Server configuration error' });
  }

  const svc = new PaymentLaunchService(supabase);
  const result = await svc.updateStatus(launchId, userId, status);

  if (!result.success) {
    const status4xx = result.error?.match(/required|invalid|cannot/i) ? 400 : 404;
    return res.status(status4xx).json({ success: false, error: result.error });
  }

  return res.status(200).json({ success: true });
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
export default async function handler(req, res) {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ success: false, error: 'x-user-id header is required' });
  }

  if (req.method === 'POST') return handlePost(req, res, userId);
  if (req.method === 'PATCH') return handlePatch(req, res, userId);

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
