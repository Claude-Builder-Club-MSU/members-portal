-- CREATE FUNCTION TO AUTO-UPDATE is_current BASED ON DATES
CREATE OR REPLACE FUNCTION update_current_semester()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Set all to false first (only update rows that are currently true)
  UPDATE public.semesters SET is_current = false WHERE is_current = true;

  -- Set current semester based on dates (only update rows that are not already current)
  UPDATE public.semesters
  SET is_current = true
  WHERE start_date <= CURRENT_DATE
    AND end_date >= CURRENT_DATE
    AND is_current = false;
END;
$$;