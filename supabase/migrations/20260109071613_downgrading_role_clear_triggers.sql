-- ============================================================================
-- COMPREHENSIVE ROLE-TO-TEAM SYNCHRONIZATION WITH TRANSITION HANDLING
-- ============================================================================
--
-- This trigger handles ALL role transitions and updates profile.team accordingly:
--
-- Role Assignments:
-- - e-board → team = "E-board"
-- - board → team = "Board"
-- - member → team = NULL
-- - prospect → team = NULL
--
-- Role Transitions (examples):
-- - board → e-board: "Board" is replaced with "E-board"
-- - e-board → board: "E-board" is replaced with "Board"
-- - board → member: "Board" is removed (NULL)
-- - e-board → member: "E-board" is removed (NULL)
-- - member → board: NULL is replaced with "Board"
-- - prospect → e-board: NULL is replaced with "E-board"
--
-- ============================================================================

-- Create the comprehensive trigger function
CREATE OR REPLACE FUNCTION sync_profile_team_with_role()
RETURNS TRIGGER AS $$
DECLARE
  old_role TEXT;
  new_role TEXT;
  old_team TEXT;
  new_team TEXT;
BEGIN
  -- Store the roles for logging
  old_role := OLD.role;
  new_role := NEW.role;

  -- Determine the new team based on the new role
  new_team := CASE NEW.role
    WHEN 'e-board' THEN 'E-board'
    WHEN 'board' THEN 'Board'
    ELSE NULL
  END;

  -- Get current team from profile
  SELECT team INTO old_team
  FROM profiles
  WHERE id = NEW.user_id;

  -- Update the profile team
  UPDATE profiles
  SET team = new_team
  WHERE id = NEW.user_id;

  -- Log the change with detailed transition info
  IF TG_OP = 'INSERT' THEN
    RAISE NOTICE 'Role assigned: % → team set to "%"', new_role, COALESCE(new_team, 'NULL');
  ELSIF TG_OP = 'UPDATE' AND old_role IS DISTINCT FROM new_role THEN
    RAISE NOTICE 'Role transition: % → % | Team changed: "%" → "%"',
      old_role, new_role,
      COALESCE(old_team, 'NULL'),
      COALESCE(new_team, 'NULL');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old triggers if they exist
DROP TRIGGER IF EXISTS on_eboard_role_assigned ON user_roles;
DROP TRIGGER IF EXISTS on_role_assigned ON user_roles;
DROP TRIGGER IF EXISTS sync_team_on_role_change ON user_roles;

-- Create the trigger (fires on INSERT and UPDATE)
CREATE TRIGGER sync_team_on_role_change
  AFTER INSERT OR UPDATE OF role ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION sync_profile_team_with_role();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION sync_profile_team_with_role() TO authenticated;

-- ============================================================================
-- TRANSITION EXAMPLES & EXPECTED BEHAVIOR
-- ============================================================================
--
-- Example 1: Promote member to board
-- UPDATE user_roles SET role = 'board' WHERE user_id = '123...';
-- Result: team = NULL → team = "Board"
-- Log: "Role transition: member → board | Team changed: NULL → Board"
--
-- Example 2: Promote board to e-board
-- UPDATE user_roles SET role = 'e-board' WHERE user_id = '123...';
-- Result: team = "Board" → team = "E-board"
-- Log: "Role transition: board → e-board | Team changed: Board → E-board"
--
-- Example 3: Demote e-board to board
-- UPDATE user_roles SET role = 'board' WHERE user_id = '123...';
-- Result: team = "E-board" → team = "Board"
-- Log: "Role transition: e-board → board | Team changed: E-board → Board"
--
-- Example 4: Demote board to member
-- UPDATE user_roles SET role = 'member' WHERE user_id = '123...';
-- Result: team = "Board" → team = NULL
-- Log: "Role transition: board → member | Team changed: Board → NULL"
--
-- Example 5: Demote e-board to member
-- UPDATE user_roles SET role = 'member' WHERE user_id = '123...';
-- Result: team = "E-board" → team = NULL
-- Log: "Role transition: e-board → member | Team changed: E-board → NULL"
--
-- Example 6: Promote prospect to member
-- UPDATE user_roles SET role = 'member' WHERE user_id = '123...';
-- Result: team = NULL → team = NULL (no change)
-- Log: "Role transition: prospect → member | Team changed: NULL → NULL"
--
-- Example 7: Promote prospect to e-board directly
-- UPDATE user_roles SET role = 'e-board' WHERE user_id = '123...';
-- Result: team = NULL → team = "E-board"
-- Log: "Role transition: prospect → e-board | Team changed: NULL → E-board"
--
-- ============================================================================

-- ============================================================================
-- TESTING COMMANDS
-- ============================================================================
--
-- To test this trigger, you can use these commands:
--
-- 1. Check current state:
-- SELECT ur.user_id, ur.role, p.team, p.full_name
-- FROM user_roles ur
-- JOIN profiles p ON p.id = ur.user_id;
--
-- 2. Test promotion to board:
-- UPDATE user_roles SET role = 'board' WHERE user_id = '<some-user-id>';
-- -- Check: SELECT team FROM profiles WHERE id = '<some-user-id>';
-- -- Expected: team = "Board"
--
-- 3. Test promotion to e-board:
-- UPDATE user_roles SET role = 'e-board' WHERE user_id = '<some-user-id>';
-- -- Check: SELECT team FROM profiles WHERE id = '<some-user-id>';
-- -- Expected: team = "E-board"
--
-- 4. Test demotion to member:
-- UPDATE user_roles SET role = 'member' WHERE user_id = '<some-user-id>';
-- -- Check: SELECT team FROM profiles WHERE id = '<some-user-id>';
-- -- Expected: team = NULL
--
-- 5. Test transition from board to e-board:
-- UPDATE user_roles SET role = 'board' WHERE user_id = '<some-user-id>';
-- -- Verify: SELECT team FROM profiles WHERE id = '<some-user-id>'; → "Board"
-- UPDATE user_roles SET role = 'e-board' WHERE user_id = '<some-user-id>';
-- -- Verify: SELECT team FROM profiles WHERE id = '<some-user-id>'; → "E-board"
--
-- ============================================================================

-- ============================================================================
-- KEY FEATURES
-- ============================================================================
--
-- 1. ✅ Automatic team sync: Team is ALWAYS in sync with role
-- 2. ✅ Handles all transitions: Any role change updates team correctly
-- 3. ✅ Replaces old team: When moving board→e-board, "Board" is replaced
-- 4. ✅ Clears team on demotion: board/e-board→member sets team to NULL
-- 5. ✅ Logging: NOTICE messages show what changed (helpful for debugging)
-- 6. ✅ SECURITY DEFINER: Has permission to update profiles
-- 7. ✅ Efficient: Only fires when role actually changes (UPDATE OF role)
--
-- ============================================================================