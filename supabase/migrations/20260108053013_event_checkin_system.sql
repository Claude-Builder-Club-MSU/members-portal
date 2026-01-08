-- Create table for QR code URLs and event check-ins
CREATE TABLE event_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  points_awarded INTEGER NOT NULL,
  UNIQUE(event_id, user_id) -- Prevent duplicate check-ins
);

-- Create table for secure QR code tokens
CREATE TABLE event_qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE, -- Random token for the URL
  points INTEGER NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- Optional expiration
  qr_code_url TEXT -- Store the generated QR code image URL
);

-- RLS Policies for event_checkins
ALTER TABLE event_checkins ENABLE ROW LEVEL SECURITY;

-- Users can view their own check-ins
CREATE POLICY "Users can view own checkins"
ON event_checkins FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Board/E-board can view all check-ins
CREATE POLICY "Board can view all checkins"
ON event_checkins FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('board', 'e-board')
  )
);

-- System can insert check-ins (via function)
CREATE POLICY "System can insert checkins"
ON event_checkins FOR INSERT
TO authenticated
WITH CHECK (true);

-- RLS Policies for event_qr_codes
ALTER TABLE event_qr_codes ENABLE ROW LEVEL SECURITY;

-- Board/E-board can manage QR codes
CREATE POLICY "Board can manage QR codes"
ON event_qr_codes FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('board', 'e-board')
  )
);

-- Anyone can view active QR codes (for check-in)
CREATE POLICY "Anyone can view active QR codes"
ON event_qr_codes FOR SELECT
TO authenticated
USING (active = true);

-- Function to check in a user and award points
CREATE OR REPLACE FUNCTION checkin_user_for_event(
  p_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_qr_code event_qr_codes%ROWTYPE;
  v_user_id UUID;
  v_points INTEGER;
  v_event_name TEXT;
  v_already_checked_in BOOLEAN;
BEGIN
  -- Get user ID
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  -- Get QR code details
  SELECT * INTO v_qr_code
  FROM event_qr_codes
  WHERE token = p_token AND active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid or expired QR code');
  END IF;

  -- Check if expired
  IF v_qr_code.expires_at IS NOT NULL AND v_qr_code.expires_at < NOW() THEN
    RETURN jsonb_build_object('success', false, 'message', 'QR code has expired');
  END IF;

  -- Check if already checked in
  SELECT EXISTS(
    SELECT 1 FROM event_checkins
    WHERE event_id = v_qr_code.event_id AND user_id = v_user_id
  ) INTO v_already_checked_in;

  IF v_already_checked_in THEN
    RETURN jsonb_build_object('success', false, 'message', 'Already checked in to this event');
  END IF;

  -- Get event name
  SELECT name INTO v_event_name FROM events WHERE id = v_qr_code.event_id;

  -- Insert check-in record
  INSERT INTO event_checkins (event_id, user_id, points_awarded)
  VALUES (v_qr_code.event_id, v_user_id, v_qr_code.points);

  -- Award points to user
  UPDATE profiles
  SET points = points + v_qr_code.points
  WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Successfully checked in!',
    'points_awarded', v_qr_code.points,
    'event_name', v_event_name
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION checkin_user_for_event(TEXT) TO authenticated;