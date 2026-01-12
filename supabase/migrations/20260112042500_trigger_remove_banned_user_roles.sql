-- Trigger to automatically remove banned users from user_roles table
-- When a user's is_banned status changes to true, remove their roles

CREATE OR REPLACE FUNCTION remove_banned_user_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only proceed if is_banned changed to true
  IF NEW.is_banned = true AND (OLD.is_banned = false OR OLD.is_banned IS NULL) THEN
    -- Remove all roles for this user
    DELETE FROM user_roles WHERE user_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger on profiles table
DROP TRIGGER IF EXISTS trigger_remove_banned_user_roles ON profiles;
CREATE TRIGGER trigger_remove_banned_user_roles
  AFTER UPDATE OF is_banned ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION remove_banned_user_roles();

COMMENT ON FUNCTION remove_banned_user_roles() IS
  'Automatically removes roles from users when they are banned';

COMMENT ON TRIGGER trigger_remove_banned_user_roles ON profiles IS
  'Trigger that removes user roles when is_banned becomes true';