-- ============================================================================
-- FIX: Application Access Control - Board View & Update Only
-- ============================================================================
--
-- Problems Fixed:
-- 1. Board members cannot see other users' applications (missing SELECT policy)
-- 2. Regular users can update their own applications after submission (security issue)
--
-- Solution:
-- - Allow board/e-board to view ALL applications
-- - Remove ability for users to update their own applications
-- - Allow ONLY board/e-board to update applications (for accept/reject status)
-- ============================================================================

-- Drop the existing policy that allows users to update their own applications
DROP POLICY IF EXISTS "applications_update_own" ON applications;

-- Add policy for board/e-board to view all applications
CREATE POLICY "Board can view all applications"
  ON applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('board', 'e-board')
    )
  );

-- Add policy for board/e-board to update all applications (for status changes)
CREATE POLICY "Board can update all applications"
  ON applications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('board', 'e-board')
    )
  );

-- Note: Users can still:
-- - View their own applications (applications_select_own policy)
-- - Create applications (applications_insert_own policy)
-- - Delete their own applications (applications_delete_own policy)
--
-- But they can NO LONGER update applications after submission.