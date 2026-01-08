-- Change class_ids and project_ids to use single IDs instead of arrays
-- since users apply to one thing at a time

ALTER TABLE applications
DROP COLUMN class_ids,
DROP COLUMN project_ids,
DROP COLUMN board_positions;

ALTER TABLE applications
ADD COLUMN class_id UUID REFERENCES classes(id),
ADD COLUMN project_id UUID REFERENCES projects(id),
ADD COLUMN board_position TEXT;

-- Add indexes
CREATE INDEX idx_applications_class_id ON applications(class_id);
CREATE INDEX idx_applications_project_id ON applications(project_id);