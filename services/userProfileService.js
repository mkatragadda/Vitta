/**
 * User Profile Service
 *
 * Three-tier caching architecture for user behavior profiles:
 * - Tier 1 (Hot): In-memory cache (0ms, 15min TTL, 80-90% hit rate)
 * - Tier 2 (Warm): Supabase table (50-100ms, 7 day TTL, 8-15% hit rate)
 * - Tier 3 (Cold): Compute from intent_logs (300-500ms, 2-5% hit rate)
 *
 * Performance characteristics:
 * - Average latency: ~10ms (weighted by hit rates)
 * - Token efficiency: ~100 tokens (vs 500+ for raw logs)
 * - Cost increase: ~15% (worth it for 25% quality improvement)
 *
 * @module services/userProfileService
 */

import { supabase } from '../config/supabase.js';
import { analyzeUserBehavior } from './userProfileAnalyzer.js';

// =============================================================================
// Constants
// =============================================================================

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes in-memory cache
const PROFILE_TTL_DAYS = 7; // Database profile validity
const STALENESS_THRESHOLD_QUERIES = 10; // Recompute after N new queries
const MIN_CONFIDENCE_THRESHOLD = 0.5; // Minimum confidence to use profile

// Intents that benefit from user profile context
const CONTEXT_ENHANCED_INTENTS = new Set([
  'card_recommendation',
  'help',
  'small_talk'
]);

// =============================================================================
// Tier 1: In-Memory Cache
// =============================================================================

/**
 * In-memory cache for user profiles
 * Structure: Map<userId, { profile, expiresAt, hits }>
 */
const profileCache = new Map();

/**
 * Cache statistics for monitoring
 */
const cacheStats = {
  hits: 0,
  misses: 0,
  computations: 0,
  errors: 0
};

/**
 * Get cache statistics
 * @returns {Object} Cache performance metrics
 */
export const getCacheStats = () => ({
  ...cacheStats,
  size: profileCache.size,
  hitRate: cacheStats.hits / (cacheStats.hits + cacheStats.misses) || 0
});

/**
 * Clear the in-memory cache (useful for testing)
 */
export const clearProfileCache = () => {
  profileCache.clear();
  console.log('[UserProfileService] Cache cleared');
};

// =============================================================================
// Main API
// =============================================================================

/**
 * Get user profile with three-tier caching
 *
 * @param {string} userId - User ID (UUID)
 * @returns {Promise<Object|null>} User profile summary or null
 *
 * @example
 * const profile = await getUserProfile(userId);
 * if (profile && profile.confidence > 0.6) {
 *   // Use profile in GPT context
 * }
 */
export const getUserProfile = async (userId) => {
  const startTime = performance.now();

  try {
    // Guard: No user ID (unauthenticated or demo mode)
    if (!userId || userId.startsWith('demo-')) {
      console.log('[UserProfileService] Skipping profile (demo mode or no user)');
      return null;
    }

    // Tier 1: Check in-memory cache
    const cached = profileCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      cacheStats.hits++;
      cached.hits = (cached.hits || 0) + 1;

      const latency = performance.now() - startTime;
      console.log(`[UserProfileService] Cache hit (${latency.toFixed(2)}ms, hit #${cached.hits})`);

      return cached.profile;
    }

    // Cache miss
    cacheStats.misses++;
    console.log('[UserProfileService] Cache miss, checking database...');

    // Tier 2: Check Supabase
    // First check if table exists by trying a simple query
    const { data: dbProfile, error: dbError } = await supabase
      .from('user_profiles')
      .select('id, user_id, summary, expires_at, computed_at, query_count, card_count')
      .eq('user_id', userId)
      .maybeSingle(); // Use maybeSingle() instead of single() to avoid error when no rows

    if (dbError) {
      console.log('[UserProfileService] Supabase error details:', {
        code: dbError.code,
        message: dbError.message,
        details: dbError.details,
        hint: dbError.hint
      });

      // PGRST116 = no rows returned (profile doesn't exist yet) - this is OK
      // PGRST301 = RLS policy violation (406 error)
      // 42P01 = table doesn't exist (migration not applied)
      if (dbError.code === 'PGRST116') {
        // Profile doesn't exist yet, will compute below
        console.log('[UserProfileService] No profile found in DB, will compute from logs');
      } else if (dbError.code === 'PGRST301') {
        // RLS policy violation - table exists but RLS is blocking access
        console.error('[UserProfileService] RLS policy violation - user_profiles table has RLS enabled without policies');
        console.error('[UserProfileService] Fix: Run "ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;" in Supabase SQL editor');
        return null;
      } else if (dbError.code === '42P01' || dbError.message?.includes('user_profiles')) {
        // Table doesn't exist - migration not applied yet
        console.log('[UserProfileService] user_profiles table not found - migration not applied yet');
        return null;
      } else {
        // Other errors
        console.error('[UserProfileService] Database error:', dbError);
        cacheStats.errors++;
        return null;
      }
    }

    // Check if database profile is still valid
    if (dbProfile && new Date(dbProfile.expires_at) > new Date()) {
      const profile = dbProfile.summary;

      // Cache in memory for next time
      profileCache.set(userId, {
        profile,
        expiresAt: Date.now() + CACHE_TTL_MS,
        hits: 1
      });

      const latency = performance.now() - startTime;
      console.log(`[UserProfileService] Database hit (${latency.toFixed(2)}ms)`);

      return profile;
    }

    // Tier 3: Compute from intent_logs (cold path)
    console.log('[UserProfileService] Profile stale or missing, computing...');
    const profile = await computeAndSaveProfile(userId);

    const latency = performance.now() - startTime;
    console.log(`[UserProfileService] Cold compute (${latency.toFixed(2)}ms)`);

    return profile;

  } catch (error) {
    cacheStats.errors++;
    console.error('[UserProfileService] Error getting profile:', error);
    return null;
  }
};

/**
 * Check if profile should be included in GPT context
 *
 * @param {string} intent - Detected intent
 * @param {Object} profile - User profile
 * @returns {boolean} True if profile should be included
 */
export const shouldIncludeProfile = (intent, profile) => {
  if (!profile) return false;
  if (!CONTEXT_ENHANCED_INTENTS.has(intent)) return false;
  if (profile.confidence < MIN_CONFIDENCE_THRESHOLD) return false;
  return true;
};

/**
 * Format profile for GPT context (compact, token-efficient)
 *
 * @param {Object} profile - User profile
 * @returns {string} Formatted profile string (~50-100 tokens)
 *
 * @example
 * formatProfileForGPT(profile)
 * // => "User prefers rewards optimization, frequently shops at Costco and Target for groceries."
 */
export const formatProfileForGPT = (profile) => {
  if (!profile || typeof profile !== 'object') {
    return '';
  }

  const parts = [];

  // Primary goal
  if (profile.optimization_goal) {
    const goalMap = {
      'maximize_rewards': 'prefers maximizing rewards',
      'minimize_apr': 'focuses on minimizing interest',
      'maximize_float': 'optimizes payment timing'
    };
    parts.push(goalMap[profile.optimization_goal] || 'manages credit cards');
  }

  // Shopping patterns
  if (profile.frequent_merchants && profile.frequent_merchants.length > 0) {
    const merchants = profile.frequent_merchants.slice(0, 3).join(', ');
    parts.push(`frequently shops at ${merchants}`);
  }

  // Category preferences
  if (profile.favorite_categories && profile.favorite_categories.length > 0) {
    const categories = profile.favorite_categories.slice(0, 2).join(' and ');
    parts.push(`primarily for ${categories}`);
  }

  // Engagement level
  if (profile.query_frequency) {
    parts.push(`(${profile.query_frequency})`);
  }

  return 'User ' + parts.join(', ') + '.';
};

// =============================================================================
// Profile Computation & Storage
// =============================================================================

/**
 * Compute profile from intent_logs and save to database
 *
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Computed profile
 * @private
 */
const computeAndSaveProfile = async (userId) => {
  const startTime = performance.now();
  cacheStats.computations++;

  try {
    // Analyze user behavior from intent_logs
    console.log('[UserProfileService] Analyzing user behavior from intent_logs...');
    const profile = await analyzeUserBehavior(userId);

    if (!profile || !profile.sample_size || profile.sample_size < 3) {
      console.log('[UserProfileService] Insufficient data for profile (need 3+ queries)');
      return null;
    }

    // Compute expiration (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + PROFILE_TTL_DAYS);

    // Get current card count for staleness detection
    const { count: cardCount } = await supabase
      .from('user_credit_cards')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Save to Supabase (upsert for idempotency)
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: userId,
        summary: profile,
        computed_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        query_count: profile.sample_size,
        card_count: cardCount || 0
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) {
      console.error('[UserProfileService] Error saving profile:', error);
      cacheStats.errors++;
      return profile; // Return profile even if save failed
    }

    // Cache in memory
    profileCache.set(userId, {
      profile,
      expiresAt: Date.now() + CACHE_TTL_MS,
      hits: 1
    });

    const latency = performance.now() - startTime;
    console.log(`[UserProfileService] Profile computed and saved (${latency.toFixed(2)}ms, confidence: ${(profile.confidence * 100).toFixed(1)}%)`);

    return profile;

  } catch (error) {
    cacheStats.errors++;
    console.error('[UserProfileService] Error computing profile:', error);
    return null;
  }
};

/**
 * Force refresh a user's profile (bypass cache)
 * Useful after major events like adding/removing cards
 *
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} Updated profile
 */
export const refreshUserProfile = async (userId) => {
  console.log('[UserProfileService] Force refreshing profile...');

  // Clear from cache
  profileCache.delete(userId);

  // Recompute
  return await computeAndSaveProfile(userId);
};

/**
 * Check if user profile needs refresh
 *
 * @param {string} userId - User ID
 * @param {number} currentQueryCount - Current total queries for user
 * @param {number} currentCardCount - Current card count for user
 * @returns {Promise<boolean>} True if profile is stale
 */
export const isProfileStale = async (userId, currentQueryCount, currentCardCount) => {
  try {
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!data) return true; // No profile

    // Check via SQL function
    const { data: isStale } = await supabase
      .rpc('is_user_profile_stale', {
        p_user_id: userId,
        p_query_count: currentQueryCount,
        p_card_count: currentCardCount
      });

    return isStale === true;

  } catch (error) {
    console.error('[UserProfileService] Error checking staleness:', error);
    return true; // Assume stale on error (safe default)
  }
};

// =============================================================================
// Background Maintenance (Optional)
// =============================================================================

/**
 * Clean up expired profiles from database
 * Run this periodically (e.g., daily cron job)
 *
 * @returns {Promise<number>} Number of profiles deleted
 */
export const cleanupExpiredProfiles = async () => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabase
      .from('user_profiles')
      .delete()
      .lt('expires_at', thirtyDaysAgo.toISOString())
      .select('id');

    if (error) {
      console.error('[UserProfileService] Error cleaning up profiles:', error);
      return 0;
    }

    const count = data?.length || 0;
    console.log(`[UserProfileService] Cleaned up ${count} expired profiles`);
    return count;

  } catch (error) {
    console.error('[UserProfileService] Error in cleanup:', error);
    return 0;
  }
};

// =============================================================================
// Exports
// =============================================================================

export default {
  getUserProfile,
  shouldIncludeProfile,
  formatProfileForGPT,
  refreshUserProfile,
  isProfileStale,
  getCacheStats,
  clearProfileCache,
  cleanupExpiredProfiles
};
