-- ============================================================================
-- MIGRATION: Add Waitlist Fields to Users Table
-- ============================================================================
-- Purpose: Enable waitlist functionality for gradual user onboarding
-- Date: 2025-01-09
-- Author: Vitta Team
--
-- Changes:
--   - Add is_approved field to control user access
--   - Add waitlist_joined_at to track when user joined waitlist
--   - Add approved_at to track when admin approved user
--   - Add index for performance on is_approved lookups
--
-- Rollback: See rollback section at bottom of file
-- ============================================================================

-- Add new columns to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS waitlist_joined_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Create index for fast approval checks
CREATE INDEX IF NOT EXISTS idx_users_is_approved ON users(is_approved);

-- ============================================================================
-- DATA MIGRATION: Approve all existing users (backward compatibility)
-- ============================================================================
-- All users created before this migration are automatically approved
-- This ensures existing users can continue to access the app
-- ============================================================================

UPDATE users
SET
  is_approved = true,
  approved_at = NOW()
WHERE is_approved = false
  AND created_at < NOW();

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these after migration to verify success:
--
-- 1. Check new columns exist:
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'users'
--   AND column_name IN ('is_approved', 'waitlist_joined_at', 'approved_at');
--
-- 2. Verify existing users are approved:
-- SELECT COUNT(*) as approved_count
-- FROM users
-- WHERE is_approved = true;
--
-- 3. Check index was created:
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'users'
--   AND indexname = 'idx_users_is_approved';
--
-- ============================================================================

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
-- Run these commands to undo this migration:
--
-- DROP INDEX IF EXISTS idx_users_is_approved;
-- ALTER TABLE users DROP COLUMN IF EXISTS is_approved;
-- ALTER TABLE users DROP COLUMN IF EXISTS waitlist_joined_at;
-- ALTER TABLE users DROP COLUMN IF EXISTS approved_at;
-- ============================================================================
