-- ============================================================================
-- AUTO-SET PROFILE TEAM FOR E-BOARD MEMBERS
-- ============================================================================
--
-- This trigger automatically updates a user's profile.team to "E-board"
-- when they are assigned the 'e-board' role in the user_roles table.
--
-- Triggers on: INSERT and UPDATE of user_roles table
-- ============================================================================

-- Create the trigger function
CREATE OR REPLACE FUNCTION set_eboard_team()
RETURNS TRIGGER AS $$
BEGIN
  -- If the role is being set to 'e-board', update their profile.team
  IF NEW.role = 'e-board' THEN
    UPDATE profiles
    SET team = 'E-board'
    WHERE id = NEW.user_id;

    RAISE NOTICE 'Set team to E-board for user %', NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_eboard_role_assigned ON user_roles;
CREATE TRIGGER on_eboard_role_assigned
  AFTER INSERT OR UPDATE ON user_roles
  FOR EACH ROW
  WHEN (NEW.role = 'e-board')
  EXECUTE FUNCTION set_eboard_team();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION set_eboard_team() TO authenticated;

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================
--
-- When a board member promotes someone to e-board:
-- UPDATE user_roles SET role = 'e-board' WHERE user_id = '123...';
-- → Automatically sets profiles.team = 'E-board' for that user
--
-- When accepting an e-board application:
-- (The application acceptance trigger sets the role, which fires this trigger)
-- → Automatically sets profiles.team = 'E-board'
--
-- ============================================================================

-- ============================================================================
-- NOTES
-- ============================================================================
--
-- 1. This only handles e-board role → E-board team assignment
-- 2. If you want to handle other roles/teams, extend the function:
--    - board role → Board team
--    - member role → Clear team or set default
--
-- 3. The trigger uses SECURITY DEFINER so it has permission to update profiles
--    even if the calling user doesn't have direct UPDATE access
--
-- 4. The WHEN clause makes the trigger more efficient - it only fires when
--    the role is actually 'e-board', not on every user_roles change
--
-- ============================================================================