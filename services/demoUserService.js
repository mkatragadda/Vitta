/**
 * Demo User Service
 *
 * Handles authentication for demo user (vittademo@gmail.com).
 * This service is STRICTLY isolated to the demo email to prevent unauthorized access.
 *
 * Demo Credentials (hardcoded for demo purposes only):
 * - Email: vittademo@gmail.com
 * - Password: vitta26demo
 * - User ID: demo-vitta-wallet (fixed, persistent across sessions)
 *
 * Security Notes:
 * - Only vittademo@gmail.com can authenticate with demo credentials
 * - User ID is fixed to enable consistent demo experience
 * - No real data is persisted beyond React state
 * - Falls back to in-memory demo mode if Supabase is unavailable
 */

import { supabase, isSupabaseConfigured } from '../config/supabase';

// ============================================================================
// CONSTANTS - Demo User Configuration
// ============================================================================

const DEMO_CREDENTIALS = {
  email: 'vittademo@gmail.com',
  password: 'vitta26demo',
  userId: '12345678-1234-5678-9abc-def012345678', // Valid UUID v4 (all hex chars: 0-9, a-f)
  name: 'Demo User'
};

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email format
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} { valid: boolean, error?: string }
 */
const validatePassword = (password) => {
  if (!password) {
    return { valid: false, error: 'Password is required' };
  }
  if (password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters' };
  }
  return { valid: true };
};

// ============================================================================
// AUTHENTICATION
// ============================================================================

/**
 * Authenticate demo user with email and password
 *
 * @param {string} email - Email address
 * @param {string} password - Password
 * @returns {Promise<Object>} {
 *   success: boolean,
 *   user?: { id, email, name, picture, provider, isDemoMode },
 *   error?: string
 * }
 */
export const authenticateDemoUser = async (email, password) => {
  console.log('[demoUserService] Demo login attempt with email:', email);

  // Validation
  if (!email || !password) {
    console.log('[demoUserService] Missing email or password');
    return {
      success: false,
      error: 'Email and password are required'
    };
  }

  if (!isValidEmail(email)) {
    console.log('[demoUserService] Invalid email format');
    return {
      success: false,
      error: 'Invalid email format'
    };
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    console.log('[demoUserService] Password validation failed:', passwordValidation.error);
    return {
      success: false,
      error: passwordValidation.error
    };
  }

  // CRITICAL: Only allow demo credentials for demo email
  if (email !== DEMO_CREDENTIALS.email) {
    console.log('[demoUserService] Non-demo email attempted:', email);
    return {
      success: false,
      error: 'Invalid email or password'
    };
  }

  // CRITICAL: Check exact password match
  if (password !== DEMO_CREDENTIALS.password) {
    console.log('[demoUserService] Invalid password for demo email');
    // Return generic error to prevent email enumeration
    return {
      success: false,
      error: 'Invalid email or password'
    };
  }

  // ============================================================================
  // Credentials matched - authenticate the demo user
  // ============================================================================

  try {
    // Try to get or create demo user in Supabase
    if (isSupabaseConfigured()) {
      console.log('[demoUserService] Attempting to get/create demo user in Supabase');
      const user = await getOrCreateDemoUserInDatabase();

      if (user) {
        console.log('[demoUserService] Demo user authenticated from database:', user.email);
        return {
          success: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            picture: user.picture || null,
            provider: 'demo',
            isDemoMode: false // Authenticated via database
          }
        };
      }
    }

    // Fallback to in-memory demo mode
    console.log('[demoUserService] Using in-memory demo mode (Supabase unavailable)');
    return {
      success: true,
      user: {
        id: DEMO_CREDENTIALS.userId,
        email: DEMO_CREDENTIALS.email,
        name: DEMO_CREDENTIALS.name,
        picture: null,
        provider: 'demo',
        isDemoMode: true // In-memory demo mode
      }
    };
  } catch (error) {
    console.error('[demoUserService] Error during demo authentication:', error);

    // Fallback to in-memory demo on any error
    return {
      success: true,
      user: {
        id: DEMO_CREDENTIALS.userId,
        email: DEMO_CREDENTIALS.email,
        name: DEMO_CREDENTIALS.name,
        picture: null,
        provider: 'demo',
        isDemoMode: true
      }
    };
  }
};

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

/**
 * Get or create demo user in Supabase database
 * Uses fixed UUID to ensure consistent user ID across sessions
 *
 * @returns {Promise<Object|null>} User object from database or null on error
 */
async function getOrCreateDemoUserInDatabase() {
  if (!isSupabaseConfigured()) {
    console.log('[demoUserService] Supabase not configured');
    return null;
  }

  try {
    // Step 1: Try to find existing demo user by ID
    const demoUserId = DEMO_CREDENTIALS.userId;
    console.log('[demoUserService] Demo user ID:', demoUserId);
    console.log('[demoUserService] Demo user ID length:', demoUserId.length);
    console.log('[demoUserService] Demo user ID chars:', [...demoUserId].join('-'));
    console.log('[demoUserService] Checking for existing demo user by ID:', demoUserId);
    console.log('[demoUserService] About to query Supabase with userId:', demoUserId, 'Type:', typeof demoUserId);
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', demoUserId)
      .single();

    if (!fetchError && existingUser) {
      console.log('[demoUserService] Demo user exists in database');
      return existingUser;
    }

    // PGRST116 = no rows returned (user doesn't exist) - this is expected
    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('[demoUserService] Unexpected error fetching user:', fetchError.code, fetchError.message);
      throw fetchError;
    }

    // Step 2: User doesn't exist, create it with fixed ID
    console.log('[demoUserService] Creating new demo user with fixed ID:', demoUserId);
    console.log('[demoUserService] About to insert user with ID:', demoUserId, 'Type:', typeof demoUserId);
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        id: demoUserId,
        email: DEMO_CREDENTIALS.email,
        name: DEMO_CREDENTIALS.name,
        provider: 'demo',
        picture: null
      })
      .select()
      .single();

    if (insertError) {
      console.error('[demoUserService] Error creating demo user:', insertError);

      // If insert failed due to RLS or other constraints, try to find existing user by email
      console.log('[demoUserService] Fallback: checking by email');
      const { data: userByEmail } = await supabase
        .from('users')
        .select('*')
        .eq('email', DEMO_CREDENTIALS.email)
        .single();

      if (userByEmail) {
        console.log('[demoUserService] Found demo user by email (different ID)');
        return userByEmail;
      }

      throw insertError;
    }

    console.log('[demoUserService] Demo user created successfully');
    return newUser;
  } catch (error) {
    console.error('[demoUserService] Error in getOrCreateDemoUserInDatabase:', error.message);
    return null; // Return null to trigger fallback to in-memory mode
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if an email is the demo email
 * @param {string} email - Email to check
 * @returns {boolean} True if email is the demo email
 */
export const isDemoEmail = (email) => {
  return email === DEMO_CREDENTIALS.email;
};

/**
 * Check if a user is a demo user
 * @param {Object} user - User object
 * @returns {boolean} True if user is demo user
 */
export const isDemoUser = (user) => {
  if (!user) {
    return false;
  }
  return user.id === DEMO_CREDENTIALS.userId || user.provider === 'demo';
};

/**
 * Get demo credentials (for reference only)
 * @returns {Object} Demo credentials object
 */
export const getDemoCredentials = () => {
  return {
    email: DEMO_CREDENTIALS.email,
    // DO NOT export password - this is just for verification
    userId: DEMO_CREDENTIALS.userId
  };
};
