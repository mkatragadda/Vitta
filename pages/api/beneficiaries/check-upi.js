/**
 * GET /api/beneficiaries/check-upi?upiId=xxx
 *
 * Check whether a UPI VPA is already saved in the requesting user's contacts.
 * Used by PaymentReviewScreen before suggesting "Save to contacts" so we only
 * propose adding someone who isn't already there.
 *
 * Auth:    x-user-id header (UUID)
 * Query:   upiId — the UPI address to look up (e.g. "amit@okicici")
 *
 * Response 200:
 *   { success: true, found: true,  beneficiary: { id, name, relationship } }
 *   { success: true, found: false, beneficiary: null }
 *
 * Response 400: missing / malformed params
 * Response 401: missing auth header
 * Response 405: wrong HTTP method
 * Response 500: server / config error
 */

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const UPI_REGEX = /^[\w.-]+@[\w]+$/;

// ---------------------------------------------------------------------------
// Crypto helpers (mirrors BeneficiaryService — kept inline to avoid coupling)
// ---------------------------------------------------------------------------

function decryptField(encryptedData, encryptionKey) {
  if (!encryptedData) return null;
  try {
    const [ivHex, encrypted] = encryptedData.split(':');
    if (!ivHex || !encrypted) return null;
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(encryptionKey, 'hex'),
      Buffer.from(ivHex, 'hex')
    );
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Auth
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ success: false, error: 'x-user-id header is required' });
  }

  // Input
  const { upiId } = req.query;
  if (!upiId || typeof upiId !== 'string') {
    return res.status(400).json({ success: false, error: 'upiId query parameter is required' });
  }
  const normalised = upiId.trim().toLowerCase();
  if (!UPI_REGEX.test(normalised)) {
    return res.status(400).json({ success: false, error: 'upiId must be a valid UPI address (e.g. name@bank)' });
  }

  // Config
  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || process.env.NEXT_PUBLIC_ENCRYPTION_KEY;
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!ENCRYPTION_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
    console.error('[check-upi] Missing server configuration');
    return res.status(500).json({ success: false, error: 'Server configuration error' });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // Fetch all active UPI beneficiaries for this user.
    // We decrypt in-process because UPI IDs are stored with AES-256 — we cannot
    // filter by encrypted value in SQL.  Contact lists are small so O(n) is fine.
    const { data: rows, error } = await supabase
      .from('beneficiaries')
      .select('id, name, relationship, upi_encrypted')
      .eq('user_id', userId)
      .eq('payment_method', 'upi')
      .eq('is_active', true);

    if (error) {
      console.error('[check-upi] DB query failed:', error.message);
      return res.status(500).json({ success: false, error: 'Failed to query contacts' });
    }

    const match = (rows || []).find((row) => {
      const decrypted = decryptField(row.upi_encrypted, ENCRYPTION_KEY);
      return decrypted && decrypted.toLowerCase() === normalised;
    });

    if (match) {
      return res.status(200).json({
        success: true,
        found: true,
        beneficiary: {
          id: match.id,
          name: match.name,
          relationship: match.relationship,
        },
      });
    }

    return res.status(200).json({ success: true, found: false, beneficiary: null });

  } catch (err) {
    console.error('[check-upi] Unexpected error:', err.message);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
