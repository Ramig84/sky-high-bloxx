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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      endless_scores: {
        Row: {
          created_at: string
          floors: number
          id: string
          name: string
          player_id: string
          run_id: string | null
          score: number
        }
        Insert: {
          created_at?: string
          floors: number
          id?: string
          name: string
          player_id: string
          run_id?: string | null
          score: number
        }
        Update: {
          created_at?: string
          floors?: number
          id?: string
          name?: string
          player_id?: string
          run_id?: string | null
          score?: number
        }
        Relationships: []
      }
      game_runs: {
        Row: {
          finished_at: string | null
          floors: number | null
          id: string
          level: number
          mode: string
          perfects: number | null
          reward: number | null
          stars: number | null
          started_at: string
          user_id: string
        }
        Insert: {
          finished_at?: string | null
          floors?: number | null
          id?: string
          level: number
          mode: string
          perfects?: number | null
          reward?: number | null
          stars?: number | null
          started_at?: string
          user_id: string
        }
        Update: {
          finished_at?: string | null
          floors?: number | null
          id?: string
          level?: number
          mode?: string
          perfects?: number | null
          reward?: number | null
          stars?: number | null
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mission_claims: {
        Row: {
          claimed_at: string
          day: string
          kind: string
          user_id: string
        }
        Insert: {
          claimed_at?: string
          day: string
          kind: string
          user_id: string
        }
        Update: {
          claimed_at?: string
          day?: string
          kind?: string
          user_id?: string
        }
        Relationships: []
      }
      player_profiles: {
        Row: {
          block: string
          coins: number
          crane: string
          created_at: string
          endless_best: number
          guest_imported: boolean
          last_award_at: string | null
          last_gift_day: string | null
          name: string
          owned_blocks: string[]
          owned_cranes: string[]
          stars: number[]
          streak_count: number
          streak_day: string | null
          user_id: string
        }
        Insert: {
          block?: string
          coins?: number
          crane?: string
          created_at?: string
          endless_best?: number
          guest_imported?: boolean
          last_award_at?: string | null
          last_gift_day?: string | null
          name?: string
          owned_blocks?: string[]
          owned_cranes?: string[]
          stars?: number[]
          streak_count?: number
          streak_day?: string | null
          user_id: string
        }
        Update: {
          block?: string
          coins?: number
          crane?: string
          created_at?: string
          endless_best?: number
          guest_imported?: boolean
          last_award_at?: string | null
          last_gift_day?: string | null
          name?: string
          owned_blocks?: string[]
          owned_cranes?: string[]
          stars?: number[]
          streak_count?: number
          streak_day?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      award_run_coins: {
        Args: { _amount: number }
        Returns: {
          block: string
          coins: number
          crane: string
          created_at: string
          endless_best: number
          guest_imported: boolean
          last_award_at: string | null
          last_gift_day: string | null
          name: string
          owned_blocks: string[]
          owned_cranes: string[]
          stars: number[]
          streak_count: number
          streak_day: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "player_profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      buy_or_equip: {
        Args: { _item: string; _kind: string }
        Returns: {
          block: string
          coins: number
          crane: string
          created_at: string
          endless_best: number
          guest_imported: boolean
          last_award_at: string | null
          last_gift_day: string | null
          name: string
          owned_blocks: string[]
          owned_cranes: string[]
          stars: number[]
          streak_count: number
          streak_day: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "player_profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      claim_daily_gift: { Args: never; Returns: Json }
      claim_daily_reward: { Args: never; Returns: Json }
      claim_daily_streak: { Args: never; Returns: Json }
      claim_mission: { Args: { _kind: string }; Returns: Json }
      daily_level_for: { Args: { _day: string }; Returns: number }
      ensure_player_profile: {
        Args: never
        Returns: {
          block: string
          coins: number
          crane: string
          created_at: string
          endless_best: number
          guest_imported: boolean
          last_award_at: string | null
          last_gift_day: string | null
          name: string
          owned_blocks: string[]
          owned_cranes: string[]
          stars: number[]
          streak_count: number
          streak_day: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "player_profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      finish_game_run: {
        Args: {
          _floors: number
          _perfects: number
          _run: string
          _stars: number
        }
        Returns: Json
      }
      import_guest_progress: {
        Args: { _best: number; _coins: number; _name: string; _stars: number[] }
        Returns: {
          block: string
          coins: number
          crane: string
          created_at: string
          endless_best: number
          guest_imported: boolean
          last_award_at: string | null
          last_gift_day: string | null
          name: string
          owned_blocks: string[]
          owned_cranes: string[]
          stars: number[]
          streak_count: number
          streak_day: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "player_profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mission_status: { Args: never; Returns: Json }
      start_game_run: {
        Args: { _level: number; _mode: string }
        Returns: string
      }
      submit_endless_score: {
        Args: { _run: string; _score: number }
        Returns: boolean
      }
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
