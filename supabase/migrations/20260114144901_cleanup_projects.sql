ALTER TABLE projects DROP COLUMN IF EXISTS lead_id;

ALTER TABLE projects RENAME COLUMN repository_url TO repository_name;