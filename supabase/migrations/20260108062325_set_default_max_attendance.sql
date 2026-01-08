-- Set default max_attendance to 50 for events table
ALTER TABLE events
ALTER COLUMN max_attendance SET DEFAULT 50;

-- Update any existing events that might have NULL or 0 max_attendance
UPDATE events
SET max_attendance = 50
WHERE max_attendance IS NULL OR max_attendance = 0;