/**
 * Feature Flags Configuration
 * Controls which features are enabled/disabled across the application
 *
 * Usage:
 *   import { FEATURE_FLAGS } from '../config/features';
 *   if (FEATURE_FLAGS.TRAVEL_PAY_ENABLED) { ... }
 */

export const FEATURE_FLAGS = {
  // ============================================================================
  // TRAVEL PAY FEATURES (New)
  // ============================================================================
  TRAVEL_PAY_ENABLED: process.env.NEXT_PUBLIC_TRAVEL_PAY_ENABLED === 'true',
  QR_SCANNER_ENABLED: true,
  WISE_ENABLED: true,

  // ============================================================================
  // LEGACY FEATURES (Credit Card Optimizer)
  // ============================================================================
  LEGACY_CREDIT_CARDS: process.env.NEXT_PUBLIC_LEGACY_FEATURES_ENABLED === 'true',
  LEGACY_OPTIMIZER: false,
  LEGACY_EXPENSE_FEED: false,

  // ============================================================================
  // THIRD-PARTY INTEGRATIONS
  // ============================================================================
  CHIMONEY_ENABLED: false,  // Disabled in favor of Wise
  PLAID_ENABLED: true,      // Keep for bank linking
  GOOGLE_AUTH_ENABLED: true, // Keep for authentication

  // ============================================================================
  // EXPERIMENTAL FEATURES
  // ============================================================================
  BATCH_TRANSFERS_ENABLED: false,
  MULTI_CURRENCY_ENABLED: false,
  PUSH_NOTIFICATIONS_ENABLED: false,
};

/**
 * Check if a feature is enabled
 * @param {string} featureName - Name of the feature flag
 * @returns {boolean}
 */
export const isFeatureEnabled = (featureName) => {
  return FEATURE_FLAGS[featureName] === true;
};

/**
 * Get all enabled features
 * @returns {string[]} Array of enabled feature names
 */
export const getEnabledFeatures = () => {
  return Object.keys(FEATURE_FLAGS).filter(key => FEATURE_FLAGS[key] === true);
};

export default FEATURE_FLAGS;
