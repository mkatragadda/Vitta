import { supabase, isSupabaseConfigured } from '../config/supabase';

/**
 * User Service - Handles all user database operations
 *
 * Expected Supabase table schema:
 *
 * Table name: users
 * Columns:
 * - id: uuid (primary key, auto-generated)
 * - email: text (unique, not null)
 * - name: text
 * - picture: text (profile picture URL from Google)
 * - provider: text (e.g., 'google', 'demo')
 * - google_id: text (unique, Google user ID)
 * - created_at: timestamp (auto-generated)
 * - updated_at: timestamp (auto-generated)
 */

/**
 * Create or update user in Supabase after Google OAuth login
 * @param {Object} userData - User data from Google OAuth
 * @param {string} userData.email - User's email
 * @param {string} userData.name - User's full name
 * @param {string} userData.picture - Profile picture URL
 * @param {string} userData.sub - Google user ID
 * @returns {Promise<Object>} User object from database
 */
export const saveGoogleUser = async (userData) => {
  // Skip if Supabase is not configured (demo mode)
  if (!isSupabaseConfigured()) {
    console.log('[Vitta] Supabase not configured - running in demo mode');
    return {
      id: 'demo-' + Date.now(),
      email: userData.email,
      name: userData.name,
      picture: userData.picture,
      provider: 'google',
      isDemoMode: true
    };
  }

  try {
    const userPayload = {
      email: userData.email,
      name: userData.name,
      picture: userData.picture,
      provider: 'google',
      google_id: userData.sub,
      updated_at: new Date().toISOString()
    };

    // Check if user already exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('email', userData.email)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = no rows returned (user doesn't exist)
      console.error('[Vitta] Error checking existing user:', fetchError);
      throw fetchError;
    }

    if (existingUser) {
      // Update existing user
      const { data, error } = await supabase
        .from('users')
        .update(userPayload)
        .eq('id', existingUser.id)
        .select()
        .single();

      if (error) {
        console.error('[Vitta] Error updating user:', error);
        throw error;
      }

      console.log('[Vitta] User updated successfully:', data.email);
      return data;
    } else {
      // Insert new user
      const { data, error } = await supabase
        .from('users')
        .insert([userPayload])
        .select()
        .single();

      if (error) {
        console.error('[Vitta] Error creating user:', error);
        throw error;
      }

      console.log('[Vitta] New user created successfully:', data.email);
      return data;
    }
  } catch (error) {
    console.error('[Vitta] Error in saveGoogleUser:', error);
    // Return demo mode user on error to prevent login failure
    return {
      id: 'demo-' + Date.now(),
      email: userData.email,
      name: userData.name,
      picture: userData.picture,
      provider: 'google',
      isDemoMode: true,
      error: error.message
    };
  }
};

/**
 * Get user by email
 * @param {string} email - User's email
 * @returns {Promise<Object|null>} User object or null if not found
 */
export const getUserByEmail = async (email) => {
  if (!isSupabaseConfigured()) {
    console.log('[Vitta] Supabase not configured - demo mode');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // User not found
      }
      console.error('[Vitta] Error fetching user:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('[Vitta] Error in getUserByEmail:', error);
    return null;
  }
};

/**
 * Get user by ID
 * @param {string} userId - User's ID
 * @returns {Promise<Object|null>} User object or null if not found
 */
export const getUserById = async (userId) => {
  if (!isSupabaseConfigured()) {
    console.log('[Vitta] Supabase not configured - demo mode');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // User not found
      }
      console.error('[Vitta] Error fetching user:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('[Vitta] Error in getUserById:', error);
    return null;
  }
};

/**
 * Delete user by ID
 * @param {string} userId - User's ID
 * @returns {Promise<boolean>} True if deleted successfully
 */
export const deleteUser = async (userId) => {
  if (!isSupabaseConfigured()) {
    console.log('[Vitta] Supabase not configured - demo mode');
    return false;
  }

  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) {
      console.error('[Vitta] Error deleting user:', error);
      throw error;
    }

    console.log('[Vitta] User deleted successfully:', userId);
    return true;
  } catch (error) {
    console.error('[Vitta] Error in deleteUser:', error);
    return false;
  }
};

/**
 * Get or create demo user with fixed ID
 * Used for vittademo@gmail.com demo flow
 *
 * @param {string} email - Demo user email
 * @param {string} fixedUserId - Fixed UUID for consistency across sessions
 * @returns {Promise<Object>} User object with demo user
 */
export const getOrCreateDemoUser = async (email, fixedUserId) => {
  if (!isSupabaseConfigured()) {
    console.log('[userService] Supabase not configured - returning in-memory demo user');
    return {
      id: fixedUserId,
      email: email,
      name: 'Demo User',
      picture: null,
      provider: 'demo',
      isDemoMode: true
    };
  }

  try {
    // Try to find existing user by fixed ID
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', fixedUserId)
      .single();

    if (!fetchError && existingUser) {
      console.log('[userService] Demo user found by ID:', email);
      return existingUser;
    }

    // PGRST116 = no rows returned
    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    // Try to find by email as fallback
    const { data: userByEmail } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (userByEmail) {
      console.log('[userService] Demo user found by email');
      return userByEmail;
    }

    // Create new demo user with fixed ID
    console.log('[userService] Creating new demo user with fixed ID');
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        id: fixedUserId,
        email: email,
        name: 'Demo User',
        provider: 'demo',
        picture: null
      })
      .select()
      .single();

    if (insertError) {
      console.error('[userService] Error creating demo user:', insertError);
      // Fallback to in-memory
      throw insertError;
    }

    console.log('[userService] Demo user created successfully');
    return newUser;
  } catch (error) {
    console.error('[userService] Error in getOrCreateDemoUser:', error);
    // Fallback to in-memory demo user on any error
    return {
      id: fixedUserId,
      email: email,
      name: 'Demo User',
      picture: null,
      provider: 'demo',
      isDemoMode: true
    };
  }
};
