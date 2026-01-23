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
    PostgrestVersion: "14.1"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      applications: {
        Row: {
          application_type: Database["public"]["Enums"]["application_type"]
          board_position: string | null
          class_id: string | null
          class_role: Database["public"]["Enums"]["class_member_type"] | null
          class_year: string
          created_at: string
          full_name: string
          id: string
          other_commitments: string | null
          previous_experience: string | null
          problem_solved: string | null
          project_detail: string | null
          project_id: string | null
          project_role:
          | Database["public"]["Enums"]["project_member_type"]
          | null
          relevant_experience: string | null
          resume_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["application_status"]
          transcript_url: string | null
          updated_at: string
          user_id: string
          why_position: string | null
        }
        Insert: {
          application_type: Database["public"]["Enums"]["application_type"]
          board_position?: string | null
          class_id?: string | null
          class_role?: Database["public"]["Enums"]["class_member_type"] | null
          class_year: string
          created_at?: string
          full_name: string
          id?: string
          other_commitments?: string | null
          previous_experience?: string | null
          problem_solved?: string | null
          project_detail?: string | null
          project_id?: string | null
          project_role?:
          | Database["public"]["Enums"]["project_member_type"]
          | null
          relevant_experience?: string | null
          resume_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          transcript_url?: string | null
          updated_at?: string
          user_id: string
          why_position?: string | null
        }
        Update: {
          application_type?: Database["public"]["Enums"]["application_type"]
          board_position?: string | null
          class_id?: string | null
          class_role?: Database["public"]["Enums"]["class_member_type"] | null
          class_year?: string
          created_at?: string
          full_name?: string
          id?: string
          other_commitments?: string | null
          previous_experience?: string | null
          problem_solved?: string | null
          project_detail?: string | null
          project_id?: string | null
          project_role?:
          | Database["public"]["Enums"]["project_member_type"]
          | null
          relevant_experience?: string | null
          resume_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          transcript_url?: string | null
          updated_at?: string
          user_id?: string
          why_position?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      class_enrollments: {
        Row: {
          class_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["class_member_type"]
          user_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["class_member_type"]
          user_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
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
          created_at: string
          created_by: string
          description: string | null
          id: string
          location: string | null
          name: string
          semester_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          location?: string | null
          name: string
          semester_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          location?: string | null
          name?: string
          semester_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      event_attendance: {
        Row: {
          attended_at: string | null
          event_id: string
          id: string
          rsvped_at: string | null
          user_id: string
          created_at: string
        }
        Insert: {
          attended_at?: string | null
          event_id: string
          id?: string
          rsvped_at?: string | null
          user_id: string
          created_at?: string
        }
        Update: {
          attended_at?: string | null
          event_id?: string
          id?: string
          rsvped_at?: string | null
          user_id?: string
          created_at?: string
        }
        Relationships: [],
      }
      event_qr_codes: {
        Row: {
          created_at: string
          event_id: string
          id: string
          points: number
          qr_code_url: string | null
          token: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          points: number
          qr_code_url?: string | null
          token: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          points?: number
          qr_code_url?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_qr_codes_event_id_fkey"
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
          created_at: string
          created_by: string
          description: string | null
          event_date: string
          id: string
          location: string
          max_attendance: number
          name: string
          points: number
          qr_code_token: string
          rsvp_required: boolean
          updated_at: string
        }
        Insert: {
          allowed_roles?: Database["public"]["Enums"]["app_role"][]
          created_at?: string
          created_by: string
          description?: string | null
          event_date: string
          id?: string
          location: string
          max_attendance?: number
          name: string
          points?: number
          qr_code_token?: string
          rsvp_required?: boolean
          updated_at?: string
        }
        Update: {
          allowed_roles?: Database["public"]["Enums"]["app_role"][]
          created_at?: string
          created_by?: string
          description?: string | null
          event_date?: string
          id?: string
          location?: string
          max_attendance?: number
          name?: string
          points?: number
          qr_code_token?: string
          rsvp_required?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          class_year: string | null
          created_at: string
          email: string
          full_name: string
          github_username: string | null
          id: string
          is_banned: boolean | null
          linkedin_username: string | null
          points: number
          position: string | null
          profile_picture_url: string | null
          resume_url: string | null
          slack_user_id: string | null
          term_joined: string | null
          theme: Database["public"]["Enums"]["theme"]
          updated_at: string
        }
        Insert: {
          class_year?: string | null
          created_at?: string
          email: string
          full_name: string
          github_username?: string | null
          id: string
          is_banned?: boolean | null
          linkedin_username?: string | null
          points?: number
          position?: string | null
          profile_picture_url?: string | null
          resume_url?: string | null
          slack_user_id?: string | null
          term_joined?: string | null
          theme?: Database["public"]["Enums"]["theme"]
          updated_at?: string
        }
        Update: {
          class_year?: string | null
          created_at?: string
          email?: string
          full_name?: string
          github_username?: string | null
          id?: string
          is_banned?: boolean | null
          linkedin_username?: string | null
          points?: number
          position?: string | null
          profile_picture_url?: string | null
          resume_url?: string | null
          slack_user_id?: string | null
          term_joined?: string | null
          theme?: Database["public"]["Enums"]["theme"]
          updated_at?: string
        }
        Relationships: []
      }
      project_members: {
        Row: {
          created_at: string
          id: string
          project_id: string
          role: Database["public"]["Enums"]["project_member_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          role: Database["public"]["Enums"]["project_member_type"]
          user_id: string
        }
        Update: {
          created_at?: string
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
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          repository_name: string
          semester_id: string | null
          updated_at: string
        }
        Insert: {
          client_name?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          repository_name: string
          semester_id?: string | null
          updated_at?: string
        }
        Update: {
          client_name?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          repository_name?: string
          semester_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      semesters: {
        Row: {
          code: string
          created_at: string | null
          end_date: string
          id: string
          name: string
          start_date: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          end_date: string
          id?: string
          name: string
          start_date: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          end_date?: string
          id?: string
          name?: string
          start_date?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      ban_user_by_id: { Args: { target_user_id: string }; Returns: Json }
      checkin_user_for_event: { Args: { p_token: string }; Returns: Json }
      delete_user_by_id: { Args: { target_user_id: string }; Returns: Json }
    }
    Enums: {
      app_role: "prospect" | "member" | "board" | "e-board"
      application_status: "pending" | "accepted" | "rejected"
      application_type: "board" | "project" | "class"
      class_member_type: "teacher" | "student"
      project_member_type: "lead" | "member"
      theme: "dark" | "light"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["prospect", "member", "board", "e-board"],
      application_status: ["pending", "accepted", "rejected"],
      application_type: ["board", "project", "class"],
      class_member_type: ["teacher", "student"],
      project_member_type: ["lead", "member"],
      theme: ["dark", "light"],
    },
  },
} as const
