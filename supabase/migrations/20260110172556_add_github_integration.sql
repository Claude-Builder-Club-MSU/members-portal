-- Add github_access_token column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS github_access_token TEXT;

-- Add comment for documentation
COMMENT ON COLUMN profiles.github_access_token IS 'Encrypted GitHub OAuth access token for API operations';

-- Create index for faster lookups by GitHub username
CREATE INDEX IF NOT EXISTS idx_profiles_github_username
ON profiles(github_username)
WHERE github_username IS NOT NULL;

-- Drop existing policy if it exists, then create new one
DROP POLICY IF EXISTS "Users can update own github info" ON profiles;

CREATE POLICY "Users can update own github info"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);