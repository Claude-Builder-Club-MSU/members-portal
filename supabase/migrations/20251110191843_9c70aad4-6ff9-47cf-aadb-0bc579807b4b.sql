-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('prospect', 'member', 'board', 'e-board');

-- Create enum for application types
CREATE TYPE public.application_type AS ENUM ('club_admission', 'board', 'project', 'class');

-- Create enum for application status
CREATE TYPE public.application_status AS ENUM ('pending', 'accepted', 'rejected');

-- Create enum for project member type
CREATE TYPE public.project_member_type AS ENUM ('lead', 'member');

-- Create enum for class member type
CREATE TYPE public.class_member_type AS ENUM ('teacher', 'student');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  class_year TEXT,
  linkedin_url TEXT,
  resume_url TEXT,
  profile_picture_url TEXT,
  points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'prospect',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create applications table
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_type application_type NOT NULL,
  status application_status DEFAULT 'pending',
  
  -- Common fields
  full_name TEXT NOT NULL,
  class_year TEXT NOT NULL,
  resume_url TEXT,
  transcript_url TEXT,
  
  -- Type-specific fields (stored as JSONB for flexibility)
  board_positions TEXT[], -- For board applications
  project_ids UUID[], -- For project applications
  project_role project_member_type, -- lead or member
  class_ids UUID[], -- For class applications
  class_role class_member_type, -- teacher or student
  
  -- Essay questions
  why_join TEXT,
  why_position TEXT,
  relevant_experience TEXT,
  other_commitments TEXT,
  project_detail TEXT,
  problem_solved TEXT,
  previous_experience TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Create events table
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  location TEXT NOT NULL,
  rsvp_required BOOLEAN DEFAULT false,
  allowed_roles app_role[] NOT NULL DEFAULT ARRAY['prospect', 'member', 'board', 'e-board']::app_role[],
  qr_code_token UUID DEFAULT gen_random_uuid(),
  points INTEGER DEFAULT 20,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Create event_rsvps table
CREATE TABLE public.event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attended BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;

-- Create classes table
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  schedule TEXT, -- e.g., "Mondays 6-8 PM"
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- Create class_enrollments table
CREATE TABLE public.class_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role class_member_type NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, user_id)
);

ALTER TABLE public.class_enrollments ENABLE ROW LEVEL SECURITY;

-- Create projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  client_name TEXT,
  description TEXT,
  github_url TEXT NOT NULL,
  due_date DATE,
  lead_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Create project_members table
CREATE TABLE public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role project_member_type NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Function to check if user has a specific role
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

-- Function to get user's highest role (returns priority: e-board > board > member > prospect)
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

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  
  -- Assign default role as prospect
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'prospect');
  
  RETURN NEW;
END;
$$;

-- Trigger to create profile and assign role on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Add update triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS Policies

-- Profiles: Users can view all profiles but only update their own
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- User roles: Users can view their own roles, e-board can view and manage all
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'e-board'));

CREATE POLICY "E-board can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'e-board'));

-- Applications: Users can view and create own applications, board+ can view all
CREATE POLICY "Users can view own applications"
  ON public.applications FOR SELECT
  USING (
    auth.uid() = user_id 
    OR public.has_role(auth.uid(), 'board')
    OR public.has_role(auth.uid(), 'e-board')
  );

CREATE POLICY "Users can create own applications"
  ON public.applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Board can update applications"
  ON public.applications FOR UPDATE
  USING (public.has_role(auth.uid(), 'board') OR public.has_role(auth.uid(), 'e-board'));

-- Events: All authenticated users can view events they're allowed to see
CREATE POLICY "Users can view allowed events"
  ON public.events FOR SELECT
  USING (
    public.get_user_role(auth.uid()) = ANY(allowed_roles)
  );

CREATE POLICY "Board can manage events"
  ON public.events FOR ALL
  USING (public.has_role(auth.uid(), 'board') OR public.has_role(auth.uid(), 'e-board'));

-- Event RSVPs: Users can manage own RSVPs
CREATE POLICY "Users can view event RSVPs"
  ON public.event_rsvps FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'board')
    OR public.has_role(auth.uid(), 'e-board')
  );

CREATE POLICY "Users can create own RSVPs"
  ON public.event_rsvps FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Board can update RSVPs"
  ON public.event_rsvps FOR UPDATE
  USING (public.has_role(auth.uid(), 'board') OR public.has_role(auth.uid(), 'e-board'));

-- Classes: Members+ can view, board+ can manage
CREATE POLICY "Members can view classes"
  ON public.classes FOR SELECT
  USING (
    public.has_role(auth.uid(), 'member')
    OR public.has_role(auth.uid(), 'board')
    OR public.has_role(auth.uid(), 'e-board')
  );

CREATE POLICY "Board can manage classes"
  ON public.classes FOR ALL
  USING (public.has_role(auth.uid(), 'board') OR public.has_role(auth.uid(), 'e-board'));

-- Class enrollments: Users can view own enrollments, board can manage
CREATE POLICY "Users can view class enrollments"
  ON public.class_enrollments FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'board')
    OR public.has_role(auth.uid(), 'e-board')
  );

CREATE POLICY "Board can manage enrollments"
  ON public.class_enrollments FOR ALL
  USING (public.has_role(auth.uid(), 'board') OR public.has_role(auth.uid(), 'e-board'));

-- Projects: Members+ can view, board+ can manage
CREATE POLICY "Members can view projects"
  ON public.projects FOR SELECT
  USING (
    public.has_role(auth.uid(), 'member')
    OR public.has_role(auth.uid(), 'board')
    OR public.has_role(auth.uid(), 'e-board')
  );

CREATE POLICY "Board can manage projects"
  ON public.projects FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'board') OR public.has_role(auth.uid(), 'e-board'));

CREATE POLICY "Board and leads can update projects"
  ON public.projects FOR UPDATE
  USING (
    auth.uid() = lead_id
    OR public.has_role(auth.uid(), 'board')
    OR public.has_role(auth.uid(), 'e-board')
  );

CREATE POLICY "Board can delete projects"
  ON public.projects FOR DELETE
  USING (public.has_role(auth.uid(), 'board') OR public.has_role(auth.uid(), 'e-board'));

-- Project members: Users can view own memberships, board can manage
CREATE POLICY "Users can view project members"
  ON public.project_members FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'board')
    OR public.has_role(auth.uid(), 'e-board')
  );

CREATE POLICY "Board can manage project members"
  ON public.project_members FOR ALL
  USING (public.has_role(auth.uid(), 'board') OR public.has_role(auth.uid(), 'e-board'));