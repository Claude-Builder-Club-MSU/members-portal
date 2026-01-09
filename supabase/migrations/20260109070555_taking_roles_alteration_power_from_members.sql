-- ============================================================================
-- MEGA POLICY MIGRATION - Centralize Control to Board Only
-- ============================================================================
--
-- This migration consolidates all permission fixes into one comprehensive update.
--
-- PHILOSOPHY: Users should NOT be able to self-manage their roles or memberships.
-- Only board/e-board members have the authority to:
-- - Change user roles (promote/demote)
-- - Add/remove project members
-- - Enroll/unenroll class participants
-- - Accept/reject applications
--
-- EXCEPTION: Users can create their initial profile and role during signup.
--
-- ============================================================================
-- PART 1: USER ROLES TABLE - Board Only Management
-- ============================================================================

-- Remove user ability to update their own role
DROP POLICY IF EXISTS "user_roles_update_own" ON user_roles;
DROP POLICY IF EXISTS "Users can update own role" ON user_roles;

-- Keep the signup policy (users need to create initial role)
-- This policy should already exist: "Users can insert own role during signup"
-- or "user_roles_insert_own" - we're not dropping it

-- Board can insert roles for any user
CREATE POLICY "Board can insert user roles"
  ON user_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('board', 'e-board')
    )
  );

-- Board can update any user's role
CREATE POLICY "Board can update user roles"
  ON user_roles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('board', 'e-board')
    )
  );

-- Board can delete user roles
CREATE POLICY "Board can delete user roles"
  ON user_roles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('board', 'e-board')
    )
  );

-- ============================================================================
-- PART 2: PROJECT MEMBERS TABLE - Board Only Management
-- ============================================================================

-- Remove user ability to add themselves to projects
DROP POLICY IF EXISTS "project_members_insert_own" ON project_members;

-- Remove user ability to remove themselves from projects
DROP POLICY IF EXISTS "project_members_delete_own" ON project_members;

-- Board can add any user to any project
CREATE POLICY "Board can insert project members"
  ON project_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('board', 'e-board')
    )
  );

-- Board can update project member roles
CREATE POLICY "Board can update project members"
  ON project_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('board', 'e-board')
    )
  );

-- Board can remove members from projects
CREATE POLICY "Board can delete project members"
  ON project_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('board', 'e-board')
    )
  );

-- ============================================================================
-- PART 3: CLASS ENROLLMENTS TABLE - Board Only Management
-- ============================================================================

-- Remove user ability to enroll themselves in classes
DROP POLICY IF EXISTS "class_enrollments_insert_own" ON class_enrollments;

-- Remove user ability to unenroll themselves from classes
DROP POLICY IF EXISTS "class_enrollments_delete_own" ON class_enrollments;

-- Board can enroll any user in any class
CREATE POLICY "Board can insert class enrollments"
  ON class_enrollments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('board', 'e-board')
    )
  );

-- Board can update class enrollment roles
CREATE POLICY "Board can update class enrollments"
  ON class_enrollments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('board', 'e-board')
    )
  );

-- Board can remove users from classes
CREATE POLICY "Board can delete class enrollments"
  ON class_enrollments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('board', 'e-board')
    )
  );

-- ============================================================================
-- SUMMARY OF CHANGES
-- ============================================================================
--
-- USER ROLES:
-- ✅ Board can insert/update/delete any user's role
-- ❌ Users cannot update their own role (no self-promotion)
-- ✅ Users can still insert initial role during signup
--
-- PROJECT MEMBERS:
-- ✅ Board can insert/update/delete any project membership
-- ❌ Users cannot add themselves to projects
-- ❌ Users cannot remove themselves from projects
--
-- CLASS ENROLLMENTS:
-- ✅ Board can insert/update/delete any class enrollment
-- ❌ Users cannot enroll themselves in classes
-- ❌ Users cannot unenroll themselves from classes
--
-- RESULT:
-- All role and membership management is centralized to board/e-board only.
-- Users must apply through the applications system and wait for board approval.
-- This prevents unauthorized access and maintains proper club hierarchy.
--
-- ============================================================================