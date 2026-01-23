-- supabase/migrations/YYYYMMDDHHMMSS_add_slack_integration.sql

-- Add Slack user ID to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS slack_user_id TEXT;

-- Add Slack channel IDs to projects and classes
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS slack_channel_id TEXT;

ALTER TABLE classes
ADD COLUMN IF NOT EXISTS slack_channel_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_slack_user_id ON profiles(slack_user_id);
CREATE INDEX IF NOT EXISTS idx_projects_slack_channel_id ON projects(slack_channel_id);
CREATE INDEX IF NOT EXISTS idx_classes_slack_channel_id ON classes(slack_channel_id);

-- Create a trigger function to handle application acceptance
CREATE OR REPLACE FUNCTION handle_application_acceptance()
RETURNS TRIGGER AS $$
DECLARE
  applicant_role TEXT;
BEGIN
  -- Only process if status changed to 'accepted'
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    -- Check if this is a project or class application
    IF NEW.application_type IN ('project', 'class') THEN
      -- Get user's current role
      SELECT role INTO applicant_role
      FROM user_roles
      WHERE user_id = NEW.user_id;

      -- If prospect, upgrade to member
      IF applicant_role = 'prospect' THEN
        UPDATE user_roles
        SET role = 'member'
        WHERE user_id = NEW.user_id;
      END IF;

      -- Add to project if project application
      IF NEW.application_type = 'project' AND NEW.project_id IS NOT NULL THEN
        INSERT INTO project_members (project_id, user_id, role)
        VALUES (NEW.project_id, NEW.user_id, NEW.project_role)
        ON CONFLICT DO NOTHING;
      END IF;

      -- Add to class if class application
      IF NEW.application_type = 'class' AND NEW.class_id IS NOT NULL THEN
        INSERT INTO class_enrollments (class_id, user_id, role)
        VALUES (NEW.class_id, NEW.user_id, NEW.class_role)
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_application_acceptance ON applications;
CREATE TRIGGER on_application_acceptance
  AFTER UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION handle_application_acceptance();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;