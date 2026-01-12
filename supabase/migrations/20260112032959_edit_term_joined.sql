-- Migration: Change term_joined from UUID to TEXT (semester code)
-- Run this AFTER the initial add_term_joined.sql migration

-- Drop the trigger first
DROP TRIGGER IF EXISTS trigger_set_term_joined ON profiles;

-- Drop the function
DROP FUNCTION IF EXISTS set_term_joined();

-- Drop the index
DROP INDEX IF EXISTS idx_profiles_term_joined;

-- Drop the column (this removes the FK constraint automatically)
ALTER TABLE profiles
DROP COLUMN IF EXISTS term_joined;

-- Re-add column as TEXT
ALTER TABLE profiles
ADD COLUMN term_joined TEXT;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_term_joined ON profiles(term_joined);

-- Function to auto-calculate term_joined based on created_at
-- Now sets the semester CODE instead of ID
CREATE OR REPLACE FUNCTION set_term_joined()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  matching_semester_code TEXT;
BEGIN
  -- Find semester where profile creation date falls between:
  -- (start_date - 1 month) and end_date
  -- Get the CODE instead of ID
  BEGIN
    SELECT code INTO matching_semester_code
    FROM public.semesters
    WHERE NEW.created_at::date >= (start_date - INTERVAL '1 month')::date
      AND NEW.created_at::date <= end_date::date
    LIMIT 1;
  EXCEPTION
    WHEN OTHERS THEN
      -- If semester lookup fails for any reason (permissions, data issues, etc.),
      -- set to NULL to prevent signup failures
      matching_semester_code := NULL;
      RAISE WARNING 'Failed to determine term_joined for user %: %', NEW.id, SQLERRM;
  END;

  -- Set term_joined to the matching semester code (or NULL if no match/lookup failed)
  NEW.term_joined := matching_semester_code;

  RETURN NEW;
END;
$$;

-- Create trigger to auto-set term_joined on profile creation
CREATE TRIGGER trigger_set_term_joined
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_term_joined();

-- Grant execute permission
GRANT EXECUTE ON FUNCTION set_term_joined() TO authenticated, anon, service_role;

-- Ensure the function can be executed by the postgres user (service role)
-- This ensures SECURITY DEFINER works properly
GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT ON public.semesters TO service_role;

-- Backfill existing profiles with semester codes
UPDATE profiles p
SET term_joined = (
  SELECT s.code
  FROM semesters s
  WHERE p.created_at::date >= (s.start_date - INTERVAL '1 month')::date
    AND p.created_at::date <= s.end_date::date
  LIMIT 1
)
WHERE term_joined IS NULL;

COMMENT ON COLUMN profiles.term_joined IS
  'The semester code when the user joined the club (e.g., "W26", "F25"). Auto-calculated based on created_at timestamp. Matches if created_at is between (semester.start_date - 1 month) and semester.end_date, allowing members to join up to 1 month before classes start.';

COMMENT ON FUNCTION set_term_joined() IS
  'Automatically sets term_joined to the semester code based on which semester the profile was created in. Includes a 1-month buffer before semester start_date to allow early signups.';