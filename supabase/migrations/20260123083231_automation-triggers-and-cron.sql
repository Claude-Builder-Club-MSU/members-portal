-- No additional columns needed - we'll check Slack/GitHub directly

-- Delete old cron job and function
SELECT cron.unschedule('process-project-automation');
DROP FUNCTION IF EXISTS process_project_automation();

-- Function to trigger application acceptance automation
CREATE OR REPLACE FUNCTION trigger_application_acceptance()
RETURNS TRIGGER AS $$
DECLARE
  user_profile RECORD;
  application_data RECORD;
BEGIN
  -- Only trigger on status change to 'accepted'
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN

    -- Get user profile
    SELECT * INTO user_profile
    FROM profiles
    WHERE id = NEW.user_id;

    -- Get full application data
    SELECT * INTO application_data
    FROM applications
    WHERE id = NEW.id;

    -- Call edge function asynchronously
    PERFORM
      net.http_post(
        url := current_setting('app.settings.supabase_url') || '/functions/v1/process-application-acceptance',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key')
        ),
        body := jsonb_build_object(
          'application_id', NEW.id,
          'user_id', NEW.user_id,
          'application_type', NEW.application_type,
          'board_position', NEW.board_position,
          'project_id', NEW.project_id,
          'class_id', NEW.class_id,
          'user_email', user_profile.email,
          'user_name', user_profile.full_name
        )
      );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for application acceptance
DROP TRIGGER IF EXISTS on_application_accepted ON applications;
CREATE TRIGGER on_application_accepted
  AFTER UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION trigger_application_acceptance();

-- Create a cron job to run daily at 9 AM UTC
SELECT cron.schedule(
  'daily-start-automation-check',
  '0 9 * * *',
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/process-start-automation',
      headers := jsonb_build_object(
        'Authorization',
        'Bearer ' || current_setting('app.settings.service_role_key')
      )
    ) AS request_id;
  $$
);


-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION trigger_application_acceptance() TO authenticated;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_start_date ON projects(semester_id);
CREATE INDEX IF NOT EXISTS idx_classes_start_date ON classes(semester_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);