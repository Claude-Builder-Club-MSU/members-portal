-- Update the semesters RLS policy to allow anonymous users
DROP POLICY IF EXISTS "Anyone can view semesters" ON public.semesters;
CREATE POLICY "Anyone can view semesters"
  ON public.semesters
  FOR SELECT
  TO authenticated, anon  -- ✅ Allow both authenticated and anonymous users
  USING (true);