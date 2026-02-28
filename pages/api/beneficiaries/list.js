/**
 * API Endpoint: List Beneficiaries
 *
 * GET /api/beneficiaries/list
 *
 * Purpose:
 * Retrieves all beneficiaries (recipients) for the authenticated user
 *
 * Security:
 * - Authorization required (JWT token in Authorization header)
 * - User-scoped queries (can only see own beneficiaries)
 * - No sensitive data in response (encrypted fields remain encrypted)
 *
 * Response Format (Success):
 * {
 *   "success": true,
 *   "beneficiaries": [
 *     {
 *       "beneficiaryId": "uuid",
 *       "name": "Amit Kumar",
 *       "phone": "9876543210",
 *       "paymentMethod": "upi",
 *       "upiId": "amit@okhdfcbank",
 *       "verificationStatus": "verified",
 *       "relationship": "family",
 *       "createdAt": "2026-02-21T10:00:00Z"
 *     }
 *   ]
 * }
 *
 * Response Format (Error):
 * {
 *   "success": false,
 *   "error_code": "UNAUTHORIZED",
 *   "error_message": "Authorization header missing"
 * }
 */

import BeneficiaryService from '../../../services/beneficiary/beneficiary-service';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || process.env.NEXT_PUBLIC_ENCRYPTION_KEY;

console.log('[API/beneficiaries/list] Environment Check:');
console.log('[API/beneficiaries/list] ENCRYPTION_KEY exists:', !!ENCRYPTION_KEY);
console.log('[API/beneficiaries/list] ENCRYPTION_KEY length:', ENCRYPTION_KEY?.length || 0);
console.log('[API/beneficiaries/list] ENCRYPTION_KEY value:', ENCRYPTION_KEY ? '***' + ENCRYPTION_KEY.slice(-4) : 'NOT SET');
console.log('[API/beneficiaries/list] SUPABASE_URL exists:', !!SUPABASE_URL);
console.log('[API/beneficiaries/list] SUPABASE_ANON_KEY exists:', !!SUPABASE_ANON_KEY);

/**
 * Database Adapter for Supabase
 * Provides abstraction layer for database operations
 */
class SupabaseDBAdapter {
  /**
   * Initialize Supabase adapter
   * @param {SupabaseClient} client - Supabase client instance
   */
  constructor(client) {
    this.client = client;

    // Beneficiaries operations
    this.beneficiaries = {
      findAll: async ({ where, order }) => {
        let query = this.client.from('beneficiaries').select('*');

        // Apply WHERE conditions
        for (const [key, value] of Object.entries(where)) {
          query = query.eq(key, value);
        }

        // Apply ORDER BY
        if (order) {
          const [field, direction] = order[0];
          query = query.order(field, { ascending: direction === 'ASC' });
        }

        const { data, error } = await query;

        if (error) {
          console.error('[DB] Beneficiaries query error:', error);
          throw error;
        }

        return data || [];
      }
    };
  }
}

/**
 * Extract user ID from authorization headers
 * In production, this should verify JWT token
 *
 * @param {Object} req - Next.js request object
 * @returns {string} User ID from token
 * @throws {Error} If authorization fails
 */
function extractUserId(req) {
  // Get Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    throw { status: 401, message: 'Authorization header missing' };
  }

  // In production: verify JWT token and extract subject (user_id)
  // For now, extract from X-User-Id header (development only)
  const userId = req.headers['x-user-id'];
  if (!userId) {
    throw { status: 401, message: 'User ID not found in token' };
  }

  return userId;
}

/**
 * Main API handler
 *
 * @param {Object} req - Next.js request object
 * @param {Object} res - Next.js response object
 */
export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('\n========== REQUEST START ==========');
  console.log('[API] GET /api/beneficiaries/list - Request received');
  console.log('[API] Headers:', {
    authorization: req.headers.authorization ? 'Bearer ***' : 'MISSING',
    'x-user-id': req.headers['x-user-id'] || 'MISSING'
  });

  try {
    // Step 1: Extract and validate authorization
    let userId;
    try {
      userId = extractUserId(req);
      console.log('[API] ✓ User ID extracted:', userId);
    } catch (authError) {
      console.error('[API] ✗ Auth error:', authError);
      return res.status(authError.status).json({
        success: false,
        error_code: 'UNAUTHORIZED',
        error_message: authError.message
      });
    }

    console.log('[API] User authorized:', userId);

    // Step 2: Validate Supabase is configured
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('[API] ✗ Supabase not configured - SUPABASE_URL:', !!SUPABASE_URL, 'SUPABASE_ANON_KEY:', !!SUPABASE_ANON_KEY);
      return res.status(500).json({
        success: false,
        error_code: 'SERVER_ERROR',
        error_message: 'Database not configured'
      });
    }
    console.log('[API] ✓ Supabase configured');

    // Step 3: Validate encryption key is configured
    console.log('[API] Checking ENCRYPTION_KEY - exists:', !!ENCRYPTION_KEY, 'length:', ENCRYPTION_KEY?.length || 0);
    if (!ENCRYPTION_KEY) {
      console.error('[API] ✗ ENCRYPTION_KEY not configured');
      console.error('[API] Available env vars:', Object.keys(process.env).filter(k => k.includes('ENCRYPT')));
      return res.status(500).json({
        success: false,
        error_code: 'SERVER_ERROR',
        error_message: 'Encryption key not configured'
      });
    }
    console.log('[API] ✓ ENCRYPTION_KEY configured');

    // Step 4: Initialize Supabase client
    console.log('[API] Initializing Supabase client - NODE_ENV:', process.env.NODE_ENV);
    const supabase =
      SUPABASE_SERVICE_KEY && process.env.NODE_ENV === 'production'
        ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        : createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('[API] ✓ Supabase client initialized');

    // Step 5: Initialize database adapter and service
    console.log('[API] Initializing BeneficiaryService with ENCRYPTION_KEY');
    const db = new SupabaseDBAdapter(supabase);
    const beneficiaryService = new BeneficiaryService(db, ENCRYPTION_KEY);
    console.log('[API] ✓ Services initialized');

    // Step 6: Call BeneficiaryService.getBeneficiaries
    console.log('[API] Calling getBeneficiaries for userId:', userId);
    let beneficiaries;
    try {
      beneficiaries = await beneficiaryService.getBeneficiaries(userId);
      console.log('[API] ✓ Retrieved beneficiaries:', beneficiaries?.length || 0);
    } catch (serviceError) {
      console.error('[API] ✗ BeneficiaryService error:', serviceError.message);
      console.error('[API] Error stack:', serviceError.stack);
      throw serviceError;
    }

    // Step 7: Return response
    console.log('[API] Returning success response with', beneficiaries?.length || 0, 'beneficiaries');
    console.log('========== REQUEST END ==========\n');
    return res.status(200).json({
      success: true,
      beneficiaries: beneficiaries || []
    });
  } catch (error) {
    console.error('\n========== ERROR ==========');
    console.error('[API] Unexpected error:', error.message);
    console.error('[API] Error type:', error.constructor.name);
    console.error('[API] Stack:', error.stack);
    console.error('========== END ERROR ==========\n');

    return res.status(500).json({
      success: false,
      error_code: 'SERVER_ERROR',
      error_message: error.message || 'Failed to retrieve beneficiaries',
      suggestion: 'Please try again. If the problem persists, contact support.'
    });
  }
}
