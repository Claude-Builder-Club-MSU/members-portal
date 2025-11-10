-- Fix search path for security definer functions using CASCADE
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Recreate has_role with proper search path
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Recreate get_user_role with proper search path
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role
      WHEN 'e-board' THEN 4
      WHEN 'board' THEN 3
      WHEN 'member' THEN 2
      WHEN 'prospect' THEN 1
    END DESC
  LIMIT 1
$$;

-- Recreate handle_new_user with proper search path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'prospect');
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Recreate all RLS policies that were dropped
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'e-board'));
CREATE POLICY "E-board can manage all roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'e-board'));
CREATE POLICY "Users can view own applications" ON public.applications FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'board') OR public.has_role(auth.uid(), 'e-board'));
CREATE POLICY "Board can update applications" ON public.applications FOR UPDATE USING (public.has_role(auth.uid(), 'board') OR public.has_role(auth.uid(), 'e-board'));
CREATE POLICY "Board can manage events" ON public.events FOR ALL USING (public.has_role(auth.uid(), 'board') OR public.has_role(auth.uid(), 'e-board'));
CREATE POLICY "Users can view event RSVPs" ON public.event_rsvps FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'board') OR public.has_role(auth.uid(), 'e-board'));
CREATE POLICY "Board can update RSVPs" ON public.event_rsvps FOR UPDATE USING (public.has_role(auth.uid(), 'board') OR public.has_role(auth.uid(), 'e-board'));
CREATE POLICY "Members can view classes" ON public.classes FOR SELECT USING (public.has_role(auth.uid(), 'member') OR public.has_role(auth.uid(), 'board') OR public.has_role(auth.uid(), 'e-board'));
CREATE POLICY "Board can manage classes" ON public.classes FOR ALL USING (public.has_role(auth.uid(), 'board') OR public.has_role(auth.uid(), 'e-board'));
CREATE POLICY "Users can view class enrollments" ON public.class_enrollments FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'board') OR public.has_role(auth.uid(), 'e-board'));
CREATE POLICY "Board can manage enrollments" ON public.class_enrollments FOR ALL USING (public.has_role(auth.uid(), 'board') OR public.has_role(auth.uid(), 'e-board'));
CREATE POLICY "Members can view projects" ON public.projects FOR SELECT USING (public.has_role(auth.uid(), 'member') OR public.has_role(auth.uid(), 'board') OR public.has_role(auth.uid(), 'e-board'));
CREATE POLICY "Board can manage projects" ON public.projects FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'board') OR public.has_role(auth.uid(), 'e-board'));
CREATE POLICY "Board and leads can update projects" ON public.projects FOR UPDATE USING (auth.uid() = lead_id OR public.has_role(auth.uid(), 'board') OR public.has_role(auth.uid(), 'e-board'));
CREATE POLICY "Board can delete projects" ON public.projects FOR DELETE USING (public.has_role(auth.uid(), 'board') OR public.has_role(auth.uid(), 'e-board'));
CREATE POLICY "Users can view project members" ON public.project_members FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'board') OR public.has_role(auth.uid(), 'e-board'));
CREATE POLICY "Board can manage project members" ON public.project_members FOR ALL USING (public.has_role(auth.uid(), 'board') OR public.has_role(auth.uid(), 'e-board'));
CREATE POLICY "Board can view all application files" ON storage.objects FOR SELECT USING (bucket_id = 'applications' AND (public.has_role(auth.uid(), 'board') OR public.has_role(auth.uid(), 'e-board')));