-- ============================================================================
-- SIMPLIFIED EVENT ATTENDANCE TABLE
-- Drops event_checkins table and creates event_attendance for RSVP/attendance tracking
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop event_checkins table and related objects
-- ============================================================================

-- Drop any views that depend on event_checkins
DROP VIEW IF EXISTS event_attendance_stats CASCADE;
DROP VIEW IF EXISTS user_attendance_history CASCADE;

-- Drop the checkin function if it exists
DROP FUNCTION IF EXISTS checkin_user_for_event(TEXT) CASCADE;

-- Drop the event_checkins table
DROP TABLE IF EXISTS event_checkins CASCADE;

-- ============================================================================
-- STEP 2: Drop old event_attendance if it exists
-- ============================================================================

DROP TABLE IF EXISTS event_attendance CASCADE;

-- ============================================================================
-- STEP 3: Create new event_attendance table
-- ============================================================================

CREATE TABLE event_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rsvped_at TIMESTAMPTZ,
  attended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one record per user per event
  UNIQUE(event_id, user_id),

  -- If attended, must have RSVPed first (or at same time for walk-ins)
  CHECK (attended_at IS NULL OR rsvped_at IS NOT NULL)
);

-- Add indexes for common queries
CREATE INDEX idx_event_attendance_event_id ON event_attendance(event_id);
CREATE INDEX idx_event_attendance_user_id ON event_attendance(user_id);
CREATE INDEX idx_event_attendance_rsvped ON event_attendance(event_id, rsvped_at) WHERE rsvped_at IS NOT NULL;
CREATE INDEX idx_event_attendance_attended ON event_attendance(event_id, attended_at) WHERE attended_at IS NOT NULL;

-- Add table comments
COMMENT ON TABLE event_attendance IS 'Tracks RSVPs and attendance for events';
COMMENT ON COLUMN event_attendance.rsvped_at IS 'When user RSVPed. NULL means no RSVP (e.g., walk-in or manually added by board)';
COMMENT ON COLUMN event_attendance.attended_at IS 'When user attended. NULL means RSVPed but did not attend (no-show)';

-- ============================================================================
-- STEP 4: Enable Row Level Security
-- ============================================================================

ALTER TABLE event_attendance ENABLE ROW LEVEL SECURITY;

-- Users can view their own attendance records
CREATE POLICY "Users can view own attendance"
ON event_attendance FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Board/E-board can view all attendance records
CREATE POLICY "Board can view all attendance"
ON event_attendance FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('board', 'e-board')
  )
);

-- Users can RSVP to events
CREATE POLICY "Users can RSVP to events"
ON event_attendance FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can cancel their RSVP (delete if haven't attended yet)
CREATE POLICY "Users can cancel RSVP"
ON event_attendance FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
  AND attended_at IS NULL
);

-- Board/E-board can manage all attendance records
CREATE POLICY "Board can manage attendance"
ON event_attendance FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('board', 'e-board')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('board', 'e-board')
  )
);

-- ============================================================================
-- COMPLETE
-- ============================================================================