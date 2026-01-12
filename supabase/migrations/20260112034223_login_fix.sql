-- Function to sync profile team with role changes
-- Updates the profile.team field when user roles change
CREATE OR REPLACE FUNCTION sync_profile_team_with_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_team TEXT := NULL;
  current_team TEXT;
BEGIN
  -- Determine the new team based on the role
  -- Only certain roles get specific teams
  new_team := CASE NEW.role
    WHEN 'e-board' THEN 'E-board'
    WHEN 'board' THEN 'Board'
    ELSE NULL  -- prospect, member get NULL team
  END;

  -- For INSERT operations (new role assignment), always update the team
  -- For UPDATE operations, only update if the role actually changed
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role) THEN
    BEGIN
      -- Get current team for logging (optional)
      SELECT team INTO current_team
      FROM public.profiles
      WHERE id = NEW.user_id;

      -- Update the profile team - use explicit schema qualification
      UPDATE public.profiles
      SET team = new_team,
          updated_at = NOW()
      WHERE id = NEW.user_id;

      -- Log the change
      IF TG_OP = 'INSERT' THEN
        RAISE NOTICE 'Role assigned: % → team set to "%" for user %',
                     NEW.role, COALESCE(new_team, 'NULL'), NEW.user_id;
      ELSIF TG_OP = 'UPDATE' THEN
        RAISE NOTICE 'Role transition: % → % | Team changed: "%" → "%" for user %',
                     OLD.role, NEW.role,
                     COALESCE(current_team, 'NULL'),
                     COALESCE(new_team, 'NULL'),
                     NEW.user_id;
      END IF;

    EXCEPTION
      WHEN OTHERS THEN
        -- Log the error but don't fail the transaction
        -- This prevents role assignments from failing due to team sync issues
        RAISE WARNING 'Failed to sync team for user % role %: %',
                      NEW.user_id, NEW.role, SQLERRM;
        -- Continue with the role change even if team sync fails
    END;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop the old trigger if it exists
DROP TRIGGER IF EXISTS sync_team_on_role_change ON user_roles;

-- Create the improved trigger
CREATE TRIGGER sync_team_on_role_change
  AFTER INSERT OR UPDATE OF role ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION sync_profile_team_with_role();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION sync_profile_team_with_role() TO authenticated, service_role;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT, UPDATE ON public.profiles TO service_role;

COMMENT ON FUNCTION sync_profile_team_with_role() IS
  'Synchronizes profile.team with user role changes. Includes error handling to prevent role assignment failures.';