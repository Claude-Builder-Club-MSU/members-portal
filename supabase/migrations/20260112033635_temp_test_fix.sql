-- Temporary migration to disable term_joined trigger for testing
-- This will isolate whether the semester lookup is causing the transaction abort

-- Drop the trigger that sets term_joined during profile creation
DROP TRIGGER IF EXISTS trigger_set_term_joined ON profiles;

-- Optional: Drop the term_joined column temporarily if you want to completely remove it
-- ALTER TABLE profiles DROP COLUMN IF EXISTS term_joined;

-- Optional: Drop the function if it's no longer needed for testing
-- DROP FUNCTION IF EXISTS set_term_joined();