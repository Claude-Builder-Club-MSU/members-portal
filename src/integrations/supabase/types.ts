export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      applications: {
        Row: {
          application_type: Database["public"]["Enums"]["application_type"]
          board_positions: string[] | null
          class_ids: string[] | null
          class_role: Database["public"]["Enums"]["class_member_type"] | null
          class_year: string
          created_at: string | null
          full_name: string
          id: string
          other_commitments: string | null
          previous_experience: string | null
          problem_solved: string | null
          project_detail: string | null
          project_ids: string[] | null
          project_role:
            | Database["public"]["Enums"]["project_member_type"]
            | null
          relevant_experience: string | null
          resume_url: string | null
          status: Database["public"]["Enums"]["application_status"] | null
          transcript_url: string | null
          updated_at: string | null
          user_id: string
          why_join: string | null
          why_position: string | null
        }
        Insert: {
          application_type: Database["public"]["Enums"]["application_type"]
          board_positions?: string[] | null
          class_ids?: string[] | null
          class_role?: Database["public"]["Enums"]["class_member_type"] | null
          class_year: string
          created_at?: string | null
          full_name: string
          id?: string
          other_commitments?: string | null
          previous_experience?: string | null
          problem_solved?: string | null
          project_detail?: string | null
          project_ids?: string[] | null
          project_role?:
            | Database["public"]["Enums"]["project_member_type"]
            | null
          relevant_experience?: string | null
          resume_url?: string | null
          status?: Database["public"]["Enums"]["application_status"] | null
          transcript_url?: string | null
          updated_at?: string | null
          user_id: string
          why_join?: string | null
          why_position?: string | null
        }
        Update: {
          application_type?: Database["public"]["Enums"]["application_type"]
          board_positions?: string[] | null
          class_ids?: string[] | null
          class_role?: Database["public"]["Enums"]["class_member_type"] | null
          class_year?: string
          created_at?: string | null
          full_name?: string
          id?: string
          other_commitments?: string | null
          previous_experience?: string | null
          problem_solved?: string | null
          project_detail?: string | null
          project_ids?: string[] | null
          project_role?:
            | Database["public"]["Enums"]["project_member_type"]
            | null
          relevant_experience?: string | null
          resume_url?: string | null
          status?: Database["public"]["Enums"]["application_status"] | null
          transcript_url?: string | null
          updated_at?: string | null
          user_id?: string
          why_join?: string | null
          why_position?: string | null
        }
        Relationships: []
      }
      class_enrollments: {
        Row: {
          class_id: string
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["class_member_type"]
          user_id: string
        }
        Insert: {
          class_id: string
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["class_member_type"]
          user_id: string
        }
        Update: {
          class_id?: string
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["class_member_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          location: string | null
          name: string
          schedule: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          location?: string | null
          name: string
          schedule?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          location?: string | null
          name?: string
          schedule?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      event_rsvps: {
        Row: {
          attended: boolean | null
          created_at: string | null
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          attended?: boolean | null
          created_at?: string | null
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          attended?: boolean | null
          created_at?: string | null
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          allowed_roles: Database["public"]["Enums"]["app_role"][]
          created_at: string | null
          created_by: string | null
          description: string | null
          event_date: string
          id: string
          location: string
          name: string
          points: number | null
          qr_code_token: string | null
          rsvp_required: boolean | null
          updated_at: string | null
        }
        Insert: {
          allowed_roles?: Database["public"]["Enums"]["app_role"][]
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_date: string
          id?: string
          location: string
          name: string
          points?: number | null
          qr_code_token?: string | null
          rsvp_required?: boolean | null
          updated_at?: string | null
        }
        Update: {
          allowed_roles?: Database["public"]["Enums"]["app_role"][]
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_date?: string
          id?: string
          location?: string
          name?: string
          points?: number | null
          qr_code_token?: string | null
          rsvp_required?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          class_year: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          linkedin_url: string | null
          points: number | null
          profile_picture_url: string | null
          resume_url: string | null
          updated_at: string | null
        }
        Insert: {
          class_year?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          linkedin_url?: string | null
          points?: number | null
          profile_picture_url?: string | null
          resume_url?: string | null
          updated_at?: string | null
        }
        Update: {
          class_year?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          linkedin_url?: string | null
          points?: number | null
          profile_picture_url?: string | null
          resume_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      project_members: {
        Row: {
          created_at: string | null
          id: string
          project_id: string
          role: Database["public"]["Enums"]["project_member_type"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          project_id: string
          role: Database["public"]["Enums"]["project_member_type"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          project_id?: string
          role?: Database["public"]["Enums"]["project_member_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          client_name: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          github_url: string
          id: string
          lead_id: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          client_name?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          github_url: string
          id?: string
          lead_id?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          client_name?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          github_url?: string
          id?: string
          lead_id?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "prospect" | "member" | "board" | "e-board"
      application_status: "pending" | "accepted" | "rejected"
      application_type: "club_admission" | "board" | "project" | "class"
      class_member_type: "teacher" | "student"
      project_member_type: "lead" | "member"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["prospect", "member", "board", "e-board"],
      application_status: ["pending", "accepted", "rejected"],
      application_type: ["club_admission", "board", "project", "class"],
      class_member_type: ["teacher", "student"],
      project_member_type: ["lead", "member"],
    },
  },
} as const
