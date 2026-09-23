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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      profiles: {
        Row: {
          age_band: string | null
          concerns: string[]
          created_at: string
          display_name: string | null
          free_scan_used: boolean
          id: string
          onboarding_completed_at: string | null
          primary_goal: string | null
          reminder_enabled: boolean
          reminder_hour: number
          reminder_weekday: number
          skin_type: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          age_band?: string | null
          concerns?: string[]
          created_at?: string
          display_name?: string | null
          free_scan_used?: boolean
          id: string
          onboarding_completed_at?: string | null
          primary_goal?: string | null
          reminder_enabled?: boolean
          reminder_hour?: number
          reminder_weekday?: number
          skin_type?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          age_band?: string | null
          concerns?: string[]
          created_at?: string
          display_name?: string | null
          free_scan_used?: boolean
          id?: string
          onboarding_completed_at?: string | null
          primary_goal?: string | null
          reminder_enabled?: boolean
          reminder_hour?: number
          reminder_weekday?: number
          skin_type?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      routine_logs: {
        Row: {
          completed_at: string
          id: string
          log_date: string
          routine_id: string
          slot: string
          step_key: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          log_date: string
          routine_id: string
          slot: string
          step_key: string
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          log_date?: string
          routine_id?: string
          slot?: string
          step_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_logs_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      routines: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          source_scan_id: string | null
          steps: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          source_scan_id?: string | null
          steps?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          source_scan_id?: string | null
          steps?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routines_source_scan_id_fkey"
            columns: ["source_scan_id"]
            isOneToOne: false
            referencedRelation: "scans"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_results: {
        Row: {
          clarity: number
          created_at: string
          evenness: number
          firmness: number
          focus_areas: Json
          headline: string
          hydration: number
          id: string
          observations: Json
          overall: number
          pores: number
          raw: Json | null
          redness: number
          refer_to_professional: boolean
          scan_id: string
          texture: number
          user_id: string
        }
        Insert: {
          clarity: number
          created_at?: string
          evenness: number
          firmness: number
          focus_areas?: Json
          headline: string
          hydration: number
          id?: string
          observations?: Json
          overall: number
          pores: number
          raw?: Json | null
          redness: number
          refer_to_professional?: boolean
          scan_id: string
          texture: number
          user_id: string
        }
        Update: {
          clarity?: number
          created_at?: string
          evenness?: number
          firmness?: number
          focus_areas?: Json
          headline?: string
          hydration?: number
          id?: string
          observations?: Json
          overall?: number
          pores?: number
          raw?: Json | null
          redness?: number
          refer_to_professional?: boolean
          scan_id?: string
          texture?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scan_results_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: true
            referencedRelation: "scans"
            referencedColumns: ["id"]
          },
        ]
      }
      scans: {
        Row: {
          capture_quality: Json | null
          completed_at: string | null
          created_at: string
          failure_reason: string | null
          id: string
          image_path: string
          model: string | null
          prompt_version: string | null
          status: string
          user_id: string
        }
        Insert: {
          capture_quality?: Json | null
          completed_at?: string | null
          created_at?: string
          failure_reason?: string | null
          id?: string
          image_path: string
          model?: string | null
          prompt_version?: string | null
          status?: string
          user_id: string
        }
        Update: {
          capture_quality?: Json | null
          completed_at?: string | null
          created_at?: string
          failure_reason?: string | null
          id?: string
          image_path?: string
          model?: string | null
          prompt_version?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_my_account: { Args: never; Returns: undefined }
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
