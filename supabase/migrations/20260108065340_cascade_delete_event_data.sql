-- Function to delete event-related data when an event is deleted
CREATE OR REPLACE FUNCTION delete_event_related_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_qr_code RECORD;
BEGIN
  -- Delete QR code images from storage
  FOR v_qr_code IN
    SELECT qr_code_url
    FROM event_qr_codes
    WHERE event_id = OLD.id AND qr_code_url IS NOT NULL
  LOOP
    -- Extract the file path from the URL
    -- Format: https://project.supabase.co/storage/v1/object/public/events/qr-codes/filename.png
    -- We need: qr-codes/filename.png
    DECLARE
      v_file_path TEXT;
    BEGIN
      v_file_path := substring(v_qr_code.qr_code_url from 'qr-codes/[^?]+');

      IF v_file_path IS NOT NULL THEN
        -- Delete from storage
        PERFORM delete_storage_object('events', v_file_path);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Log error but don't fail the deletion
      RAISE WARNING 'Failed to delete QR code file: %', v_qr_code.qr_code_url;
    END;
  END LOOP;

  -- Delete event_qr_codes records (cascade will handle this, but explicit for clarity)
  DELETE FROM event_qr_codes WHERE event_id = OLD.id;

  -- Delete event_checkins records
  DELETE FROM event_checkins WHERE event_id = OLD.id;

  -- Delete event_attendance records
  DELETE FROM event_attendance WHERE event_id = OLD.id;

  RETURN OLD;
END;
$$;

-- Create trigger to run before event deletion
DROP TRIGGER IF EXISTS trigger_delete_event_related_data ON events;
CREATE TRIGGER trigger_delete_event_related_data
  BEFORE DELETE ON events
  FOR EACH ROW
  EXECUTE FUNCTION delete_event_related_data();

-- Add foreign key constraints with CASCADE if they don't exist
-- This ensures database-level cascade for data integrity

-- event_qr_codes already has FK, add CASCADE
ALTER TABLE event_qr_codes
  DROP CONSTRAINT IF EXISTS event_qr_codes_event_id_fkey,
  ADD CONSTRAINT event_qr_codes_event_id_fkey
    FOREIGN KEY (event_id)
    REFERENCES events(id)
    ON DELETE CASCADE;

-- event_checkins already has FK, add CASCADE
ALTER TABLE event_checkins
  DROP CONSTRAINT IF EXISTS event_checkins_event_id_fkey,
  ADD CONSTRAINT event_checkins_event_id_fkey
    FOREIGN KEY (event_id)
    REFERENCES events(id)
    ON DELETE CASCADE;

-- event_attendance already has FK, add CASCADE
ALTER TABLE event_attendance
  DROP CONSTRAINT IF EXISTS event_attendance_event_id_fkey,
  ADD CONSTRAINT event_attendance_event_id_fkey
    FOREIGN KEY (event_id)
    REFERENCES events(id)
    ON DELETE CASCADE;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION delete_event_related_data() TO authenticated;