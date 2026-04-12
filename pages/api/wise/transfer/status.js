/**
 * API Route: Get Transfer Status
 * GET /api/wise/transfer/status?transferId=xxx
 *
 * Returns current status and details of a transfer
 */

import { createClient } from '@supabase/supabase-js';
import WiseClient from '../../../../services/wise/wiseClient.js';
import WiseQuoteService from '../../../../services/wise/wiseQuoteService.js';
import WiseRecipientService from '../../../../services/wise/wiseRecipientService.js';
import WiseTransferService from '../../../../services/wise/wiseTransferService.js';
import WisePaymentService from '../../../../services/wise/wisePaymentService.js';
import WiseOrchestrator from '../../../../services/wise/wiseOrchestrator.js';

const wiseConfig = {
  apiKey: process.env.WISE_API_KEY,
  profileId: process.env.WISE_PROFILE_ID,
  baseURL: process.env.WISE_BASE_URL || 'https://api.sandbox.transferwise.tech',
  environment: process.env.WISE_ENVIRONMENT || 'sandbox',
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Get user ID from header
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User ID required' });
    }

    // Validate Wise configuration
    if (!wiseConfig.apiKey || !wiseConfig.profileId) {
      return res.status(500).json({
        success: false,
        error: 'Wise API not configured. Please contact support.',
      });
    }

    // Extract and validate query parameters
    const { transferId } = req.query;

    if (!transferId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: transferId',
      });
    }

    // Initialize services
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const wiseClient = new WiseClient(wiseConfig);
    const quoteService = new WiseQuoteService(wiseClient, supabase);
    const recipientService = new WiseRecipientService(wiseClient, supabase);
    const transferService = new WiseTransferService(wiseClient, supabase);
    const paymentService = new WisePaymentService(wiseClient, supabase);

    const orchestrator = new WiseOrchestrator({
      quoteService,
      recipientService,
      transferService,
      paymentService,
      supabase,
    });

    // Get transfer status
    const status = await orchestrator.getTransferStatus(transferId);

    // Return status
    return res.status(200).json({
      success: true,
      data: status,
    });

  } catch (error) {
    console.error('[API /wise/transfer/status] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get transfer status',
    });
  }
}
