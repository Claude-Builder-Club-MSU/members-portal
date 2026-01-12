-- Fix term_joined trigger permissions and ensure semesters table access
-- This addresses the "unexpect_failure" error during signup

-- Ensure the set_term_joined function has proper permissions
GRANT EXECUTE ON FUNCTION set_term_joined() TO authenticated, anon, service_role;

-- Update semesters RLS policy to be more explicit about allowing access
-- The existing policy should work, but let's ensure it's properly applied
DROP POLICY IF EXISTS "Anyone can view semesters" ON public.semesters;
CREATE POLICY "Anyone can view semesters"
  ON public.semesters
  FOR SELECT
  TO authenticated, anon, service_role
  USING (true);

-- Also ensure the function can be executed by the postgres user (service role)
-- This ensures SECURITY DEFINER works properly
GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT ON public.semesters TO service_role;

-- Re-create the trigger to ensure it's properly registered
DROP TRIGGER IF EXISTS trigger_set_term_joined ON profiles;
CREATE TRIGGER trigger_set_term_joined
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_term_joined();

COMMENT ON FUNCTION set_term_joined() IS
  'Automatically sets term_joined to the semester code based on which semester the profile was created in. Includes a 1-month buffer before semester start_date to allow early signups. Now includes error handling to prevent signup failures.';