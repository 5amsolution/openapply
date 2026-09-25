export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      agent_runs: {
        Row: {
          drafts_created: number
          error: string | null
          finished_at: string | null
          id: string
          jobs_found: number
          jobs_scored: number
          rule_id: string | null
          started_at: string
          user_id: string
        }
        Insert: {
          drafts_created?: number
          error?: string | null
          finished_at?: string | null
          id?: string
          jobs_found?: number
          jobs_scored?: number
          rule_id?: string | null
          started_at?: string
          user_id: string
        }
        Update: {
          drafts_created?: number
          error?: string | null
          finished_at?: string | null
          id?: string
          jobs_found?: number
          jobs_scored?: number
          rule_id?: string | null
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_runs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "autopilot_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_settings: {
        Row: {
          api_key_enc: string | null
          api_key_hint: string | null
          base_url: string | null
          connected_via: string
          model: string
          monthly_token_limit: number | null
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key_enc?: string | null
          api_key_hint?: string | null
          base_url?: string | null
          connected_via?: string
          model: string
          monthly_token_limit?: number | null
          provider: string
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key_enc?: string | null
          api_key_hint?: string | null
          base_url?: string | null
          connected_via?: string
          model?: string
          monthly_token_limit?: number | null
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_usage: {
        Row: {
          created_at: string
          feature: string
          id: number
          input_tokens: number
          model: string
          output_tokens: number
          provider: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feature: string
          id?: never
          input_tokens?: number
          model: string
          output_tokens?: number
          provider: string
          user_id: string
        }
        Update: {
          created_at?: string
          feature?: string
          id?: never
          input_tokens?: number
          model?: string
          output_tokens?: number
          provider?: string
          user_id?: string
        }
        Relationships: []
      }
      api_cache: {
        Row: {
          expires_at: string
          key: string
          payload: Json
        }
        Insert: {
          expires_at: string
          key: string
          payload: Json
        }
        Update: {
          expires_at?: string
          key?: string
          payload?: Json
        }
        Relationships: []
      }
      api_quota: {
        Row: {
          period: string
          source: string
          used: number
        }
        Insert: {
          period: string
          source: string
          used?: number
        }
        Update: {
          period?: string
          source?: string
          used?: number
        }
        Relationships: []
      }
      applications: {
        Row: {
          answers: Json
          applied_at: string | null
          cover_letter: string | null
          created_at: string
          id: string
          job_id: string
          match_gaps: string[]
          match_score: number | null
          match_strengths: string[]
          match_summary: string | null
          notes: string | null
          origin: string
          rule_id: string | null
          status: string
          tailored_bullets: Json
          tailored_summary: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          applied_at?: string | null
          cover_letter?: string | null
          created_at?: string
          id?: string
          job_id: string
          match_gaps?: string[]
          match_score?: number | null
          match_strengths?: string[]
          match_summary?: string | null
          notes?: string | null
          origin?: string
          rule_id?: string | null
          status?: string
          tailored_bullets?: Json
          tailored_summary?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          applied_at?: string | null
          cover_letter?: string | null
          created_at?: string
          id?: string
          job_id?: string
          match_gaps?: string[]
          match_score?: number | null
          match_strengths?: string[]
          match_summary?: string | null
          notes?: string | null
          origin?: string
          rule_id?: string | null
          status?: string
          tailored_bullets?: Json
          tailored_summary?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "autopilot_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      autopilot_rules: {
        Row: {
          active: boolean
          created_at: string
          daily_limit: number
          exclude_keywords: string[]
          id: string
          keywords: string
          last_run_at: string | null
          location: string
          min_score: number
          name: string
          remote_only: boolean
          sources: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          daily_limit?: number
          exclude_keywords?: string[]
          id?: string
          keywords: string
          last_run_at?: string | null
          location?: string
          min_score?: number
          name: string
          remote_only?: boolean
          sources?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          daily_limit?: number
          exclude_keywords?: string[]
          id?: string
          keywords?: string
          last_run_at?: string | null
          location?: string
          min_score?: number
          name?: string
          remote_only?: boolean
          sources?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      extension_tokens: {
        Row: {
          created_at: string
          id: string
          label: string
          last_used_at: string | null
          token_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string
          last_used_at?: string | null
          token_hash: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          last_used_at?: string | null
          token_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          apply_url: string | null
          company: string
          company_logo: string | null
          description: string
          employment_type: string | null
          external_id: string
          fetched_at: string
          id: string
          location: string
          posted_at: string | null
          remote: boolean
          salary_currency: string | null
          salary_max: number | null
          salary_min: number | null
          salary_period: string | null
          search: unknown
          source: string
          tags: string[]
          title: string
          url: string
        }
        Insert: {
          apply_url?: string | null
          company?: string
          company_logo?: string | null
          description?: string
          employment_type?: string | null
          external_id: string
          fetched_at?: string
          id?: string
          location?: string
          posted_at?: string | null
          remote?: boolean
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          salary_period?: string | null
          search?: unknown
          source: string
          tags?: string[]
          title: string
          url: string
        }
        Update: {
          apply_url?: string | null
          company?: string
          company_logo?: string | null
          description?: string
          employment_type?: string | null
          external_id?: string
          fetched_at?: string
          id?: string
          location?: string
          posted_at?: string | null
          remote?: boolean
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          salary_period?: string | null
          search?: unknown
          source?: string
          tags?: string[]
          title?: string
          url?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          desired_locations: string[]
          desired_titles: string[]
          education: Json
          email: string | null
          experience: Json
          full_name: string | null
          headline: string | null
          id: string
          links: Json
          location: string | null
          needs_sponsorship: boolean | null
          notice_period: string | null
          onboarded: boolean
          phone: string | null
          remote_preference: string
          resume_filename: string | null
          resume_path: string | null
          resume_text: string | null
          salary_expectation: string | null
          skills: string[]
          standard_answers: Json
          summary: string | null
          updated_at: string
          work_authorization: string | null
        }
        Insert: {
          created_at?: string
          desired_locations?: string[]
          desired_titles?: string[]
          education?: Json
          email?: string | null
          experience?: Json
          full_name?: string | null
          headline?: string | null
          id: string
          links?: Json
          location?: string | null
          needs_sponsorship?: boolean | null
          notice_period?: string | null
          onboarded?: boolean
          phone?: string | null
          remote_preference?: string
          resume_filename?: string | null
          resume_path?: string | null
          resume_text?: string | null
          salary_expectation?: string | null
          skills?: string[]
          standard_answers?: Json
          summary?: string | null
          updated_at?: string
          work_authorization?: string | null
        }
        Update: {
          created_at?: string
          desired_locations?: string[]
          desired_titles?: string[]
          education?: Json
          email?: string | null
          experience?: Json
          full_name?: string | null
          headline?: string | null
          id?: string
          links?: Json
          location?: string | null
          needs_sponsorship?: boolean | null
          notice_period?: string | null
          onboarded?: boolean
          phone?: string | null
          remote_preference?: string
          resume_filename?: string | null
          resume_path?: string | null
          resume_text?: string | null
          salary_expectation?: string | null
          skills?: string[]
          standard_answers?: Json
          summary?: string | null
          updated_at?: string
          work_authorization?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      consume_api_quota: {
        Args: { p_limit: number; p_period: string; p_source: string }
        Returns: boolean
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      tags_to_text: { Args: { tags: string[] }; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

