-- Remove 'club_admission' from the application_type enum

-- 1. Rename existing enum
ALTER TYPE application_type RENAME TO application_type_old;

-- 2. Create new enum without 'club_admission'
CREATE TYPE application_type AS ENUM ('board', 'project', 'class');

-- 3. Alter tables to use new enum
ALTER TABLE applications
  ALTER COLUMN application_type TYPE application_type
  USING application_type::text::application_type;

-- 4. Drop old enum
DROP TYPE application_type_old;
