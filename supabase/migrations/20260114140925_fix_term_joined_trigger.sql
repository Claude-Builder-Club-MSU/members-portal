-- Function to auto-calculate term_joined based on created_at
-- Sets the semester CODE based on profile creation date
CREATE OR REPLACE FUNCTION set_term_joined()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  matching_semester_code TEXT := NULL;
  profile_created_date DATE;
BEGIN
  -- Get the profile creation date safely
  BEGIN
    profile_created_date := NEW.created_at::date;
  EXCEPTION
    WHEN OTHERS THEN
      -- If we can't get the date, set term_joined to NULL and log
      RAISE WARNING 'Invalid created_at timestamp for user %, setting term_joined to NULL', NEW.id;
      NEW.term_joined := NULL;
      RETURN NEW;
  END;

  -- Find the semester where the profile creation date falls within the range
  -- Range: (semester.start_date - 1 month) to semester.end_date
  -- This allows members to join up to 1 month before classes officially start
  BEGIN
    SELECT s.code INTO matching_semester_code
    FROM public.semesters s
    WHERE profile_created_date >= (s.start_date - INTERVAL '1 month')::date
      AND profile_created_date <= s.end_date::date
    ORDER BY s.start_date DESC  -- Prefer the most recent matching semester
    LIMIT 1;

    -- Log successful matches for debugging
    IF matching_semester_code IS NOT NULL THEN
      RAISE NOTICE 'Assigned term_joined = % for user % (created: %)',
                   matching_semester_code, NEW.id, profile_created_date;
    END IF;

  EXCEPTION
    WHEN OTHERS THEN
      -- If semester lookup fails for any reason, set to NULL and log the error
      -- This prevents signup failures while still allowing the profile to be created
      matching_semester_code := NULL;
      RAISE WARNING 'Failed to determine term_joined for user % (created: %): %',
                    NEW.id, profile_created_date, SQLERRM;
  END;

  -- Set term_joined to the matching semester code (or NULL if no match/failure)
  NEW.term_joined := matching_semester_code;

  RETURN NEW;
END;
$$;

-- Create or replace the trigger
DROP TRIGGER IF EXISTS trigger_set_term_joined ON profiles;
CREATE TRIGGER trigger_set_term_joined
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_term_joined();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION set_term_joined() TO authenticated, anon, service_role;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT ON public.semesters TO service_role;

COMMENT ON FUNCTION set_term_joined() IS
  'Automatically sets term_joined to the appropriate semester code based on profile creation date. Includes comprehensive error handling to prevent signup failures.';