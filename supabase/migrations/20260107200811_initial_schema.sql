-- Create enums
CREATE TYPE app_role AS ENUM ('prospect', 'member', 'board', 'e-board');
CREATE TYPE application_status AS ENUM ('pending', 'accepted', 'rejected');
CREATE TYPE application_type AS ENUM ('club_admission', 'board', 'project', 'class');
CREATE TYPE class_member_type AS ENUM ('teacher', 'student');
CREATE TYPE project_member_type AS ENUM ('lead', 'member');

-- Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  class_year TEXT,
  linkedin_url TEXT,
  resume_url TEXT,
  profile_picture_url TEXT,
  points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create user_roles table
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'prospect',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create classes table
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  schedule TEXT,
  location TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create class_enrollments table
CREATE TABLE class_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  role class_member_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, class_id)
);

-- Create projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  repository_url TEXT NOT NULL,
  client_name TEXT,
  lead_id UUID REFERENCES auth.users(id),
  due_date TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create project_members table
CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role project_member_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, project_id)
);

-- Generate random token function for QR codes
CREATE OR REPLACE FUNCTION generate_qr_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(16), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Create events table
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  location TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  rsvp_required BOOLEAN NOT NULL DEFAULT FALSE,
  qr_code_token TEXT NOT NULL DEFAULT generate_qr_token(),
  max_attendance INTEGER NOT NULL DEFAULT 9999,
  allowed_roles app_role[] NOT NULL DEFAULT ARRAY['prospect', 'member', 'board', 'e-board']::app_role[],
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(qr_code_token)
);

-- Create event_attendance table (renamed from event_rsvps)
CREATE TABLE event_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  rsvped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attended BOOLEAN NOT NULL DEFAULT FALSE,
  attended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, event_id)
);

-- Create applications table
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_type application_type NOT NULL,
  full_name TEXT NOT NULL,
  class_year TEXT NOT NULL,
  status application_status NOT NULL DEFAULT 'pending',

  -- Common fields
  relevant_experience TEXT,
  other_commitments TEXT,
  resume_url TEXT,
  transcript_url TEXT,

  -- Board application fields
  board_positions TEXT[],
  why_position TEXT,
  previous_experience TEXT,

  -- Project application fields
  project_ids TEXT[],
  project_role project_member_type,
  project_detail TEXT,
  problem_solved TEXT,

  -- Class application fields
  class_ids TEXT[],
  class_role class_member_type,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create helper functions
CREATE OR REPLACE FUNCTION get_user_role(_user_id UUID)
RETURNS app_role AS $$
  SELECT role FROM user_roles WHERE user_id = _user_id LIMIT 1;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION has_role(_role app_role, _user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = _role);
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION get_user_profile(_user_id UUID)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  class_year TEXT,
  linkedin_url TEXT,
  resume_url TEXT,
  profile_picture_url TEXT,
  points INTEGER,
  role app_role
) AS $$
  SELECT
    p.id,
    p.email,
    p.full_name,
    p.class_year,
    p.linkedin_url,
    p.resume_url,
    p.profile_picture_url,
    p.points,
    ur.role
  FROM profiles p
  LEFT JOIN user_roles ur ON ur.user_id = p.id
  WHERE p.id = _user_id;
$$ LANGUAGE SQL STABLE;

-- Create indexes for performance
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_class_enrollments_user_id ON class_enrollments(user_id);
CREATE INDEX idx_class_enrollments_class_id ON class_enrollments(class_id);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);
CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_event_attendance_user_id ON event_attendance(user_id);
CREATE INDEX idx_event_attendance_event_id ON event_attendance(event_id);
CREATE INDEX idx_applications_user_id ON applications(user_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_events_event_date ON events(event_date);
CREATE INDEX idx_events_qr_code_token ON events(qr_code_token);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (you'll want to customize these based on your needs)

-- Profiles: Everyone can view, users can update their own
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- User roles: Everyone can view, only admins can modify (add admin policies later)
CREATE POLICY "User roles are viewable by everyone"
  ON user_roles FOR SELECT
  USING (true);

-- Classes: Everyone can view
CREATE POLICY "Classes are viewable by everyone"
  ON classes FOR SELECT
  USING (true);

-- Projects: Everyone can view
CREATE POLICY "Projects are viewable by everyone"
  ON projects FOR SELECT
  USING (true);

-- Events: Everyone can view events they're allowed to see based on role
CREATE POLICY "Users can view events for their role"
  ON events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = ANY(allowed_roles)
    )
  );

-- Event attendance: Users can view their own, can RSVP
CREATE POLICY "Users can view own attendance"
  ON event_attendance FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can RSVP to events"
  ON event_attendance FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Applications: Users can view and create their own
CREATE POLICY "Users can view own applications"
  ON applications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create applications"
  ON applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);