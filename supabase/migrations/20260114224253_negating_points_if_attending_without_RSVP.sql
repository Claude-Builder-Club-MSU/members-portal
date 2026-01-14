-- Update the checkin_user_for_event function to deduct points for RSVP violations

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
  v_event events%ROWTYPE;
  v_has_rsvped BOOLEAN;
  v_already_checked_in BOOLEAN;
  v_penalty_points INTEGER;
BEGIN
  -- Get user ID
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  -- Get QR code details
  SELECT * INTO v_qr_code
  FROM event_qr_codes
  WHERE token = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid or expired QR code');
  END IF;

  -- Get event details
  SELECT * INTO v_event FROM events WHERE id = v_qr_code.event_id;

  -- Check if user has RSVPed
  SELECT EXISTS(
    SELECT 1 FROM event_attendance
    WHERE event_id = v_qr_code.event_id AND user_id = v_user_id
    AND rsvped_at IS NOT NULL
  ) INTO v_has_rsvped;

  -- Check if already checked in
  SELECT EXISTS(
    SELECT 1 FROM event_attendance
    WHERE event_id = v_qr_code.event_id AND user_id = v_user_id
    AND attended_at IS NOT NULL
  ) INTO v_already_checked_in;

  IF v_already_checked_in THEN
    RETURN jsonb_build_object('success', false, 'message', 'Already checked in to this event');
  END IF;

  -- Calculate points to award/deduct
  IF v_event.rsvp_required AND NOT v_has_rsvped THEN
    -- RSVP violation: deduct points equal to the event's point value
    v_penalty_points := -v_qr_code.points;

    -- Log the violation
    RAISE LOG 'RSVP VIOLATION: User % checked in to RSVP-required event "%" without RSVP - deducting % points (token: %)',
      v_user_id, v_event.name, v_penalty_points, p_token;
  ELSE
    -- Normal checkin: award full points
    v_penalty_points := v_qr_code.points;
  END IF;

  -- Insert or update attendance record
  INSERT INTO event_attendance (event_id, user_id, rsvped_at, attended_at)
  VALUES (
    v_qr_code.event_id,
    v_user_id,
    CASE WHEN v_has_rsvped THEN (SELECT rsvped_at FROM event_attendance
                                  WHERE event_id = v_qr_code.event_id AND user_id = v_user_id)
         ELSE CASE WHEN NOT v_event.rsvp_required THEN NOW() ELSE NULL END END,
    NOW()
  )
  ON CONFLICT (event_id, user_id)
  DO UPDATE SET
    attended_at = NOW();

  -- Apply points (positive or negative)
  UPDATE profiles
  SET points = GREATEST(0, points + v_penalty_points)  -- Ensure points don't go below 0
  WHERE id = v_user_id;

  -- Return appropriate message based on whether it was a violation
  IF v_event.rsvp_required AND NOT v_has_rsvped THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Checked in, but points deducted for not RSVPing to this RSVP-required event.',
      'event_name', v_event.name,
      'points_awarded', v_penalty_points
    );
  ELSE
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Successfully checked in!',
      'event_name', v_event.name,
      'points_awarded', v_penalty_points
    );
  END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION checkin_user_for_event(TEXT) TO authenticated;