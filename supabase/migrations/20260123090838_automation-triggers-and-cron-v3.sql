-- v3 automation cleanup
-- This migration supersedes earlier automation migrations by:
-- - removing the application-acceptance trigger/function that depended on app.settings.*
-- - unscheduling the old daily cron job
-- After this, application updates are driven entirely by the edge function
-- `process-application-update` that you call explicitly from the app.

-- 1) Drop the old trigger + function if they still exist
DROP TRIGGER IF EXISTS on_application_accepted ON applications;
DROP FUNCTION IF EXISTS trigger_application_acceptance();