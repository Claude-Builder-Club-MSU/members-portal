// Enums
export type AppRole = 'prospect' | 'member' | 'board' | 'e-board';
export type ApplicationStatus = 'pending' | 'accepted' | 'rejected';
export type ApplicationType = 'board' | 'project' | 'class';
export type ClassMemberType = 'teacher' | 'student';
export type ProjectMemberType = 'lead' | 'member';

// Core Models
export interface Profile {
  id: string;
  email: string;
  full_name: string;
  class_year: string | null;
  linkedin_url: string | null;
  resume_url: string | null;
  profile_picture_url: string | null;
  points: number;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

// Academic Models
export interface Class {
  id: string;
  name: string;
  description: string | null;
  schedule: string | null;
  location: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ClassEnrollment {
  id: string;
  user_id: string;
  class_id: string;
  role: ClassMemberType;
  created_at: string;
}

// Project Models
export interface Project {
  id: string;
  name: string;
  description: string | null;
  github_url: string;
  client_name: string | null;
  lead_id: string | null;
  due_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: string;
  user_id: string;
  project_id: string;
  role: ProjectMemberType;
  created_at: string;
}

// Event Models
export interface Event {
  id: string;
  name: string;
  description: string | null;
  event_date: string;
  location: string;
  points: number;
  rsvp_required: boolean;
  qr_code_token: string;
  max_attendance: number;
  allowed_roles: AppRole[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface EventAttendance {
  id: string;
  user_id: string;
  event_id: string;
  rsvped_at: string;
  attended: boolean;
  attended_at: string | null;
  created_at: string;
}

// Application Model
export interface Application {
  id: string;
  user_id: string;
  application_type: ApplicationType;
  full_name: string;
  class_year: string;
  status: ApplicationStatus;

  // Common fields
  why_join: string | null;
  relevant_experience: string | null;
  other_commitments: string | null;
  resume_url: string | null;
  transcript_url: string | null;

  // Board application specific
  board_positions: string[] | null;
  why_position: string | null;
  previous_experience: string | null;

  // Project application specific
  project_ids: string[] | null;
  project_role: ProjectMemberType | null;
  project_detail: string | null;
  problem_solved: string | null;

  // Class application specific
  class_ids: string[] | null;
  class_role: ClassMemberType | null;

  created_at: string;
  updated_at: string;
}

// Helper function return types
export interface UserProfileWithRole {
  id: string;
  email: string;
  full_name: string | null;
  class_year: string | null;
  linkedin_url: string | null;
  resume_url: string | null;
  profile_picture_url: string | null;
  points: number | null;
  role: AppRole | null;
}