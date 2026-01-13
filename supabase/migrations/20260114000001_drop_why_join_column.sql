-- Drop the why_join column from applications table if it exists
-- This column was removed from the application model

ALTER TABLE applications DROP COLUMN IF EXISTS why_join;