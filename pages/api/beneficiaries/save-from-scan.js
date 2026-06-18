/**
 * POST /api/beneficiaries/save-from-scan
 * Save a UPI contact captured from a QR scan.
 * Phone is not required (QR data doesn't carry it).
 *
 * Headers: x-user-id: UUID
 * Body: { upiId, name }
 */

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Service role key bypasses RLS — required for server-side writes to beneficiaries.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function encryptField(plaintext, keyHex) {
  const key = Buffer.from(keyHex, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ success: false, error: 'x-user-id header required' });
  }

  const { upiId, name } = req.body || {};

  if (!upiId || typeof upiId !== 'string') {
    return res.status(400).json({ success: false, error: 'upiId is required' });
  }
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ success: false, error: 'name is required' });
  }
  if (!upiId.includes('@')) {
    return res.status(400).json({ success: false, error: 'Invalid UPI ID format' });
  }

  const encKey = process.env.ENCRYPTION_KEY;
  if (!encKey) {
    return res.status(500).json({ success: false, error: 'Encryption not configured' });
  }

  try {
    const normalizedUpi = upiId.toLowerCase().trim();

    // Check for existing active contact with the same UPI ID
    const { data: existing } = await supabase
      .from('beneficiaries')
      .select('id, name')
      .eq('user_id', userId)
      .eq('payment_method', 'upi')
      .eq('is_active', true);

    // Decrypt and compare in-memory (same pattern as findByUpiId)
    if (existing?.length) {
      for (const row of existing) {
        try {
          const [ivHex, encHex] = (row.upi_encrypted || '').split(':');
          if (!ivHex || !encHex) continue;
          const key = Buffer.from(encKey, 'hex');
          const iv = Buffer.from(ivHex, 'hex');
          const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
          const decrypted = Buffer.concat([
            decipher.update(Buffer.from(encHex, 'hex')),
            decipher.final(),
          ]).toString('utf8');
          if (decrypted.toLowerCase() === normalizedUpi) {
            return res.status(200).json({
              success: true,
              alreadyExists: true,
              beneficiaryId: row.id,
              message: `${row.name} is already in your contacts`,
            });
          }
        } catch { /* skip rows that fail to decrypt */ }
      }
    }

    const upiEncrypted = encryptField(normalizedUpi, encKey);

    const { data: inserted, error: insertError } = await supabase
      .from('beneficiaries')
      .insert({
        user_id: userId,
        name: name.trim(),
        payment_method: 'upi',
        upi_encrypted: upiEncrypted,
        relationship: 'other',
        verification_status: 'verified',
        verified_at: new Date().toISOString(),
        verified_by_system: 'qr_scan',
        is_active: true,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('[API/save-from-scan] Insert error:', insertError.message);
      return res.status(500).json({ success: false, error: insertError.message });
    }

    return res.status(201).json({
      success: true,
      alreadyExists: false,
      beneficiaryId: inserted.id,
      message: `${name.trim()} saved to your contacts`,
    });
  } catch (err) {
    console.error('[API/save-from-scan] Error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
