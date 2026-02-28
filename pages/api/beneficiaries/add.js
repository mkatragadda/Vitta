/**
 * API Endpoint: Add Beneficiary
 *
 * POST /api/beneficiaries/add
 *
 * Purpose:
 * Adds a new beneficiary (recipient) for international money transfers
 * Handles both UPI and Bank Account payment methods
 *
 * Security:
 * - Authorization required (JWT token in Authorization header)
 * - User-scoped queries (can only manage own beneficiaries)
 * - Input validation (format checks)
 * - Sensitive field encryption (AES-256)
 * - Audit logging (IP address, user agent, full response)
 *
 * Request Format:
 * {
 *   "name": "Amit Kumar",
 *   "phone": "9876543210",
 *   "paymentMethod": "upi",
 *   "upiId": "amit@okhdfcbank",
 *   "relationship": "family"
 * }
 *
 * Response Format (Success):
 * {
 *   "success": true,
 *   "beneficiary_id": "uuid",
 *   "name": "Amit Kumar",
 *   "verificationStatus": "verified",
 *   "message": "Beneficiary added successfully..."
 * }
 *
 * Response Format (Error):
 * {
 *   "success": false,
 *   "error_code": "INVALID_UPI_FORMAT",
 *   "error_message": "UPI format invalid",
 *   "suggestion": "Use format: name@bank..."
 * }
 */

import BeneficiaryService from '../../../services/beneficiary/beneficiary-service';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || process.env.NEXT_PUBLIC_ENCRYPTION_KEY;

console.log('[API/beneficiaries/add] Environment Check:');
console.log('[API/beneficiaries/add] ENCRYPTION_KEY exists:', !!ENCRYPTION_KEY);
console.log('[API/beneficiaries/add] ENCRYPTION_KEY length:', ENCRYPTION_KEY?.length || 0);
console.log('[API/beneficiaries/add] ENCRYPTION_KEY value:', ENCRYPTION_KEY ? '***' + ENCRYPTION_KEY.slice(-4) : 'NOT SET');
console.log('[API/beneficiaries/add] SUPABASE_URL exists:', !!SUPABASE_URL);
console.log('[API/beneficiaries/add] SUPABASE_ANON_KEY exists:', !!SUPABASE_ANON_KEY);

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
      create: async (data) => {
        const { data: result, error } = await this.client
          .from('beneficiaries')
          .insert([data])
          .select()
          .single();

        if (error) {
          console.error('[DB] Beneficiaries insert error:', error);
          throw error;
        }
        return result;
      },

      findOne: async ({ where }) => {
        let query = this.client.from('beneficiaries').select('*');

        // Apply WHERE conditions
        for (const [key, value] of Object.entries(where)) {
          query = query.eq(key, value);
        }

        const { data, error } = await query.single();

        // PGRST116 = no rows found (not an error)
        if (error && error.code !== 'PGRST116') {
          console.error('[DB] Beneficiaries query error:', error);
          throw error;
        }

        return data || null;
      },

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
      },

      update: async (updates, { where }) => {
        let query = this.client.from('beneficiaries').update(updates);

        for (const [key, value] of Object.entries(where)) {
          query = query.eq(key, value);
        }

        const { data, error } = await query.select().single();

        if (error) {
          console.error('[DB] Beneficiaries update error:', error);
          throw error;
        }

        return data;
      }
    };

    // Verification logging operations
    this.beneficiary_verification_log = {
      create: async (data) => {
        const { data: result, error } = await this.client
          .from('beneficiary_verification_log')
          .insert([data])
          .select()
          .single();

        if (error) {
          console.error('[DB] Verification log insert error:', error);
          throw error;
        }
        return result;
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
 * Get client IP address from request
 * Handles various proxy headers
 *
 * @param {Object} req - Next.js request object
 * @returns {string} Client IP address
 */
function getClientIP(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0] ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

/**
 * Main API handler
 *
 * @param {Object} req - Next.js request object
 * @param {Object} res - Next.js response object
 */
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('\n========== ADD REQUEST START ==========');
  console.log('[API] POST /api/beneficiaries/add - Request received');
  console.log('[API] Headers:', {
    authorization: req.headers.authorization ? 'Bearer ***' : 'MISSING',
    'x-user-id': req.headers['x-user-id'] || 'MISSING'
  });
  console.log('[API] Body keys:', Object.keys(req.body || {}));

  try {
    // Step 1: Extract and validate authorization
    let userId;
    try {
      userId = extractUserId(req);
    } catch (authError) {
      return res.status(authError.status).json({
        error_code: 'UNAUTHORIZED',
        error_message: authError.message
      });
    }

    console.log('[API] User authorized:', userId);

    // Step 2: Extract request body
    const { name, phone, paymentMethod, upiId, account, ifsc, bankName, relationship, email } =
      req.body;

    console.log('[API] Request body extracted:', {
      name,
      phone,
      paymentMethod,
      relationship
    });

    // Step 3: Validate required fields
    if (!name || !phone || !paymentMethod) {
      return res.status(400).json({
        success: false,
        error_code: 'MISSING_REQUIRED_FIELDS',
        error_message: 'name, phone, and paymentMethod are required',
        suggestion: 'Please provide all required fields'
      });
    }

    // Step 4: Validate encryption key is configured
    console.log('[API] Checking ENCRYPTION_KEY - exists:', !!ENCRYPTION_KEY, 'length:', ENCRYPTION_KEY?.length || 0);
    if (!ENCRYPTION_KEY) {
      console.error('[API] ✗ ENCRYPTION_KEY not configured');
      console.error('[API] Available env vars:', Object.keys(process.env).filter(k => k.includes('ENCRYPT')));
      return res.status(500).json({
        success: false,
        error_code: 'SERVER_ERROR',
        error_message: 'Encryption key not configured',
        suggestion: 'Please contact support'
      });
    }
    console.log('[API] ✓ ENCRYPTION_KEY configured');

    // Step 5: Validate Supabase is configured
    console.log('[API] Validating Supabase - URL:', !!SUPABASE_URL, 'ANON_KEY:', !!SUPABASE_ANON_KEY);
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('[API] ✗ Supabase not configured');
      return res.status(500).json({
        success: false,
        error_code: 'SERVER_ERROR',
        error_message: 'Database not configured'
      });
    }
    console.log('[API] ✓ Supabase configured');

    // Step 6: Initialize Supabase client
    // Use service role key in production for server-side operations
    const supabase =
      SUPABASE_SERVICE_KEY && process.env.NODE_ENV === 'production'
        ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        : createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Step 7: Initialize database adapter and service
    const db = new SupabaseDBAdapter(supabase);
    const beneficiaryService = new BeneficiaryService(db, ENCRYPTION_KEY);

    console.log('[API] Services initialized');

    // Step 8: Call BeneficiaryService.addBeneficiary
    const result = await beneficiaryService.addBeneficiary(userId, {
      name: name.trim(),
      phone: phone.trim(),
      email: email?.trim(),
      paymentMethod: paymentMethod.toLowerCase(),
      upiId: upiId?.toLowerCase().trim(),
      account: account?.trim(),
      ifsc: ifsc?.toUpperCase().trim(),
      bankName: bankName?.trim(),
      relationship: relationship?.toLowerCase() || 'other',
      ipAddress: getClientIP(req),
      userAgent: req.headers['user-agent']
    });

    console.log('[API] Beneficiary operation result:', result.success ? 'Success' : 'Failed');

    // Step 9: Return response
    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    console.error('[API] Unexpected error:', error);

    return res.status(500).json({
      success: false,
      error_code: 'SERVER_ERROR',
      error_message: error.message || 'Failed to add beneficiary',
      suggestion: 'Please try again. If the problem persists, contact support.'
    });
  }
}
