-- ============================================================================
-- Migration: Add platform + upi_type to payment_launches
-- Run this once in Supabase SQL Editor
-- Safe to re-run (IF NOT EXISTS / IF NOT VALID guards)
-- ============================================================================

-- Add platform column (iOS/Android/web — for deep-link debug analytics)
ALTER TABLE payment_launches
  ADD COLUMN IF NOT EXISTS platform TEXT;

-- Add upi_type column (P2P/P2M — from QR classification)
ALTER TABLE payment_launches
  ADD COLUMN IF NOT EXISTS upi_type TEXT;

-- Add CHECK constraints only if they don't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payment_launches_platform_check'
  ) THEN
    ALTER TABLE payment_launches
      ADD CONSTRAINT payment_launches_platform_check
      CHECK (platform IN ('ios', 'android', 'web'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payment_launches_upi_type_check'
  ) THEN
    ALTER TABLE payment_launches
      ADD CONSTRAINT payment_launches_upi_type_check
      CHECK (upi_type IN ('p2p', 'p2m', 'unknown'));
  END IF;
END
$$;

-- Verify
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'payment_launches'
  AND column_name IN ('platform', 'upi_type')
ORDER BY column_name;
