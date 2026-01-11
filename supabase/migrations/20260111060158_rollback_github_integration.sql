-- Rollback github integration changes

-- Drop the policy we created
DROP POLICY IF EXISTS "Users can update own github info" ON profiles;

-- Drop the index
DROP INDEX IF EXISTS idx_profiles_github_username;

-- Remove the comment
COMMENT ON COLUMN profiles.github_access_token IS NULL;

-- Drop the github_access_token column
ALTER TABLE profiles
DROP COLUMN IF EXISTS github_access_token;