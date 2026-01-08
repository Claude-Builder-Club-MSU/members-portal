-- Add columns to track who reviewed the application and when
ALTER TABLE applications
ADD COLUMN reviewed_by UUID REFERENCES auth.users(id),
ADD COLUMN reviewed_at TIMESTAMPTZ;

-- Add index for performance
CREATE INDEX idx_applications_reviewed_by ON applications(reviewed_by);