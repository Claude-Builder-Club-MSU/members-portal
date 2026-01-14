-- Drop obsolete functions and triggers that reference dropped tables/columns
-- or are no longer needed due to schema changes

-- Drop the set_eboard_team trigger that may be interfering with application submissions
DROP TRIGGER IF EXISTS on_eboard_role_assigned ON user_roles;
DROP FUNCTION IF EXISTS set_eboard_team();
DROP TRIGGER IF EXISTS trigger_delete_application_files ON applications;

-- Drop the sync_profile_team_with_role function that tries to update the dropped team column
DROP TRIGGER IF EXISTS sync_team_on_role_change ON user_roles;
DROP FUNCTION IF EXISTS sync_profile_team_with_role();

-- Drop unused utility functions and their associated triggers/cron jobs
-- First remove dependencies on generate_qr_token function and drop the unused column
ALTER TABLE events ALTER COLUMN qr_code_token DROP DEFAULT;
DROP INDEX IF EXISTS idx_events_qr_code_token;
ALTER TABLE events DROP COLUMN IF EXISTS qr_code_token;

-- Now drop the functions
DROP FUNCTION IF EXISTS generate_qr_token();
DROP FUNCTION IF EXISTS get_user_profile(UUID);
DROP FUNCTION IF EXISTS get_user_role(UUID);
DROP FUNCTION IF EXISTS has_role(app_role, UUID);
DROP FUNCTION IF EXISTS cleanup_old_applications();
DROP FUNCTION IF EXISTS delete_application_files();
DROP FUNCTION IF EXISTS delete_application_files(UUID);
DROP FUNCTION IF EXISTS delete_storage_object(TEXT, TEXT);