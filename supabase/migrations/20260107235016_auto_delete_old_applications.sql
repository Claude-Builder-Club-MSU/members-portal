-- Function to delete application files from storage
CREATE OR REPLACE FUNCTION delete_application_files(application_id UUID)
RETURNS void AS $$
DECLARE
  app_record RECORD;
BEGIN
  -- Get the application record
  SELECT resume_url, transcript_url INTO app_record
  FROM applications
  WHERE id = application_id;

  -- Delete resume if exists
  IF app_record.resume_url IS NOT NULL THEN
    PERFORM storage.delete_object('applications', app_record.resume_url);
  END IF;

  -- Delete transcript if exists
  IF app_record.transcript_url IS NOT NULL THEN
    PERFORM storage.delete_object('applications', app_record.transcript_url);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old applications
CREATE OR REPLACE FUNCTION cleanup_old_applications()
RETURNS void AS $$
DECLARE
  old_app RECORD;
BEGIN
  -- Find applications that were reviewed more than 30 days ago
  FOR old_app IN
    SELECT id
    FROM applications
    WHERE status IN ('accepted', 'rejected')
    AND reviewed_at < NOW() - INTERVAL '30 days'
  LOOP
    -- Delete the files from storage
    PERFORM delete_application_files(old_app.id);

    -- Delete the application record
    DELETE FROM applications WHERE id = old_app.id;

    RAISE NOTICE 'Deleted application %', old_app.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a scheduled job to run cleanup daily (using pg_cron extension)
-- Note: pg_cron needs to be enabled in your Supabase project
-- You can enable it via: Dashboard -> Database -> Extensions -> pg_cron

-- First, enable pg_cron if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the cleanup to run daily at 2 AM UTC
SELECT cron.schedule(
  'cleanup-old-applications',
  '0 2 * * *', -- Every day at 2 AM
  $$SELECT cleanup_old_applications()$$
);