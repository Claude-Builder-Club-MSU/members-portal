


-- Remove old trigger and function (if exist)
DROP TRIGGER IF EXISTS on_application_accepted ON applications;
DROP FUNCTION IF EXISTS handle_application_acceptance();

-- Function to automatically assign roles/memberships when application is accepted (without club admission logic)
CREATE OR REPLACE FUNCTION handle_application_acceptance()
RETURNS TRIGGER AS $$
DECLARE
  applicant_id UUID;
BEGIN
  -- Only proceed if status changed to 'accepted'
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    applicant_id := NEW.user_id;

    -- Club admission logic removed

    -- Handle board application: -> board
    IF NEW.application_type = 'board' THEN
      UPDATE user_roles
      SET role = 'board'
      WHERE user_id = applicant_id;

      RAISE NOTICE 'Updated user % to board', applicant_id;

    -- Handle class application: add to class_enrollments
    ELSIF NEW.application_type = 'class' AND NEW.class_id IS NOT NULL THEN
      INSERT INTO class_enrollments (user_id, class_id, role)
      VALUES (applicant_id, NEW.class_id, NEW.class_role)
      ON CONFLICT (user_id, class_id) DO NOTHING;

      RAISE NOTICE 'Enrolled user % in class %', applicant_id, NEW.class_id;

    -- Handle project application: add to project_members
    ELSIF NEW.application_type = 'project' AND NEW.project_id IS NOT NULL THEN
      INSERT INTO project_members (user_id, project_id, role)
      VALUES (applicant_id, NEW.project_id, NEW.project_role)
      ON CONFLICT (user_id, project_id) DO NOTHING;

      RAISE NOTICE 'Added user % to project %', applicant_id, NEW.project_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new trigger
CREATE TRIGGER on_application_accepted
  AFTER UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION handle_application_acceptance();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION handle_application_acceptance() TO authenticated;


