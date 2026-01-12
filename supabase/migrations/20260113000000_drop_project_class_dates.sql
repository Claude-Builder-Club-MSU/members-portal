-- Drop start_date and end_date columns from projects and classes tables
-- These dates are now handled by the semester system

-- Drop columns from projects table
ALTER TABLE projects DROP COLUMN IF EXISTS start_date;
ALTER TABLE projects DROP COLUMN IF EXISTS end_date;

-- Drop columns from classes table
ALTER TABLE classes DROP COLUMN IF EXISTS start_date;
ALTER TABLE classes DROP COLUMN IF EXISTS end_date;

-- Drop is_current column and related functions/triggers from semesters table
ALTER TABLE semesters DROP COLUMN IF EXISTS is_current;

-- Drop the functions related to is_current
DROP FUNCTION IF EXISTS update_current_semester();
DROP TRIGGER IF EXISTS auto_update_current_semester ON semesters;
DROP FUNCTION IF EXISTS trigger_update_current_semester();

-- Drop the trigger related to is_current

-- Add ON DELETE CASCADE to applications.project_id and applications.class_id foreign keys

-- First, drop existing foreign keys (if they exist)

-- Drop the existing foreign key constraints on applications.project_id and applications.class_id
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_project_id_fkey;
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_class_id_fkey;

-- Add new foreign key constraints with ON DELETE CASCADE
ALTER TABLE applications
  ADD CONSTRAINT applications_project_id_fkey
    FOREIGN KEY (project_id)
    REFERENCES projects(id)
    ON DELETE CASCADE;

ALTER TABLE applications
  ADD CONSTRAINT applications_class_id_fkey
    FOREIGN KEY (class_id)
    REFERENCES classes(id)
    ON DELETE CASCADE;


