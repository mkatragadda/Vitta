/**
 * POST /api/upi/parse-qr
 * Parse UPI QR code and save scan to database
 *
 * Body:
 * - qrData: string (required, raw QR code data)
 */

import { parseUPIQR } from '../../../utils/upiParser';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User ID required' });
    }

    const { qrData } = req.body;

    if (!qrData || typeof qrData !== 'string') {
      return res.status(400).json({ success: false, error: 'qrData is required' });
    }

    // Parse UPI QR code
    const parsed = parseUPIQR(qrData);

    if (!parsed) {
      return res.status(400).json({
        success: false,
        error: 'Invalid UPI QR code format',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        upiId: parsed.upiId,
        payeeName: parsed.payeeName,
        amount: parsed.amount,
        currency: parsed.currency,
        note: parsed.note,
        merchantCode: parsed.merchantCode,
      },
    });

  } catch (error) {
    console.error('[API/upi/parse-qr] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to parse QR code',
    });
  }
}
