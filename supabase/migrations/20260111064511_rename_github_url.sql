-- Rename repository_url to repository_url
ALTER TABLE projects
RENAME COLUMN github_url TO repository_url;

-- Update comment
COMMENT ON COLUMN projects.repository_url IS 'GitHub repository name for this project';