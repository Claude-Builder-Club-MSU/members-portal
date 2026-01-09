-- Migration: Add semester system and update projects/classes/profiles
-- This migration creates the semesters table and updates related tables

-- 1. CREATE SEMESTERS TABLE
CREATE TABLE IF NOT EXISTS public.semesters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Ensure only one current semester can exist at a time
CREATE UNIQUE INDEX idx_only_one_current_semester
ON public.semesters (is_current)
WHERE is_current = true;

-- Add RLS policies for semesters
ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;

-- Everyone can read semesters
CREATE POLICY "Anyone can view semesters"
  ON public.semesters
  FOR SELECT
  TO authenticated
  USING (true);

-- Only e-board can create/update/delete semesters
CREATE POLICY "E-board can manage semesters"
  ON public.semesters
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'e-board'
    )
  );

-- 2. UPDATE PROFILES TABLE (add position and team)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS position TEXT,
  ADD COLUMN IF NOT EXISTS team TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.position IS 'Job position/title (e.g., "President", "Marketing Director", "Brand Designer")';
COMMENT ON COLUMN public.profiles.team IS 'Team assignment (e.g., "E-board", "Marketing", "Events")';

-- 3. UPDATE PROJECTS TABLE
-- Add new columns first
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS semester_id UUID REFERENCES public.semesters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE;

-- Drop old due_date column
ALTER TABLE public.projects
  DROP COLUMN IF EXISTS due_date;

-- Make start_date and end_date NOT NULL after adding them
-- (We can't do this immediately if there's existing data)
-- ALTER TABLE public.projects
--   ALTER COLUMN start_date SET NOT NULL,
--   ALTER COLUMN end_date SET NOT NULL;

COMMENT ON COLUMN public.projects.semester_id IS 'Reference to semester this project belongs to';
COMMENT ON COLUMN public.projects.start_date IS 'Project start date (copied from semester)';
COMMENT ON COLUMN public.projects.end_date IS 'Project end date (copied from semester)';

-- 4. UPDATE CLASSES TABLE
-- Add new columns
ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS semester_id UUID REFERENCES public.semesters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE;

-- Drop schedule if it exists
ALTER TABLE public.classes
  DROP COLUMN IF EXISTS schedule;

-- Make start_date and end_date NOT NULL after adding them
-- ALTER TABLE public.classes
--   ALTER COLUMN start_date SET NOT NULL,
--   ALTER COLUMN end_date SET NOT NULL;

COMMENT ON COLUMN public.classes.semester_id IS 'Reference to semester this class belongs to';
COMMENT ON COLUMN public.classes.start_date IS 'Class start date (copied from semester)';
COMMENT ON COLUMN public.classes.end_date IS 'Class end date (copied from semester)';

-- 5. CREATE FUNCTION TO AUTO-UPDATE is_current BASED ON DATES
CREATE OR REPLACE FUNCTION update_current_semester()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Set all to false first
  UPDATE public.semesters SET is_current = false;

  -- Set current semester based on dates
  UPDATE public.semesters
  SET is_current = true
  WHERE start_date <= CURRENT_DATE
    AND end_date >= CURRENT_DATE;
END;
$$;

-- 6. CREATE TRIGGER TO UPDATE is_current ON INSERT/UPDATE
CREATE OR REPLACE FUNCTION trigger_update_current_semester()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM update_current_semester();
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_update_current_semester
AFTER INSERT OR UPDATE ON public.semesters
FOR EACH ROW
EXECUTE FUNCTION trigger_update_current_semester();