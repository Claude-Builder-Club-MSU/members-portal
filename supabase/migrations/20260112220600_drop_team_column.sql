-- Drop the team column from profiles table
-- This column was previously used to store team assignments but is no longer needed

ALTER TABLE profiles DROP COLUMN IF EXISTS team;