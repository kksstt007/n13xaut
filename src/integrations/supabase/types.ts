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
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          meta: Json | null
          target: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          meta?: Json | null
          target?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          meta?: Json | null
          target?: string | null
        }
        Relationships: []
      }
      deposit_methods: {
        Row: {
          asset: string
          created_at: string
          deposit_address: string
          enabled: boolean
          fee: number
          id: string
          min_deposit: number
          network: string
          notes: string | null
        }
        Insert: {
          asset?: string
          created_at?: string
          deposit_address: string
          enabled?: boolean
          fee?: number
          id?: string
          min_deposit?: number
          network: string
          notes?: string | null
        }
        Update: {
          asset?: string
          created_at?: string
          deposit_address?: string
          enabled?: boolean
          fee?: number
          id?: string
          min_deposit?: number
          network?: string
          notes?: string | null
        }
        Relationships: []
      }
      deposits: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          id: string
          method_id: string | null
          network: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          tx_hash: string | null
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string
          id?: string
          method_id?: string | null
          network: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tx_hash?: string | null
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          id?: string
          method_id?: string | null
          network?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tx_hash?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deposits_method_id_fkey"
            columns: ["method_id"]
            isOneToOne: false
            referencedRelation: "deposit_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_submissions: {
        Row: {
          created_at: string
          document_back_url: string | null
          document_front_url: string | null
          document_number: string
          document_type: string
          full_name: string
          id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          selfie_url: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_back_url?: string | null
          document_front_url?: string | null
          document_number: string
          document_type: string
          full_name: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_back_url?: string | null
          document_front_url?: string | null
          document_number?: string
          document_type?: string
          full_name?: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      market_settings: {
        Row: {
          base_price: number
          drift_bias: number
          id: number
          updated_at: string
          volatility: number
        }
        Insert: {
          base_price?: number
          drift_bias?: number
          id?: number
          updated_at?: string
          volatility?: number
        }
        Update: {
          base_price?: number
          drift_bias?: number
          id?: number
          updated_at?: string
          volatility?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          banned: boolean
          country: string | null
          created_at: string
          display_name: string | null
          id: string
          phone: string | null
          referral_code: string | null
          referred_by: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          banned?: boolean
          country?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          phone?: string | null
          referral_code?: string | null
          referred_by?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          banned?: boolean
          country?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          referral_code?: string | null
          referred_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          commission: number
          created_at: string
          id: string
          referee_id: string
          referrer_id: string
        }
        Insert: {
          commission?: number
          created_at?: string
          id?: string
          referee_id: string
          referrer_id: string
        }
        Update: {
          commission?: number
          created_at?: string
          id?: string
          referee_id?: string
          referrer_id?: string
        }
        Relationships: []
      }
      trade_overrides: {
        Row: {
          default_result: string | null
          next_result: string | null
          updated_at: string
          user_id: string
          win_payout_pct: number
        }
        Insert: {
          default_result?: string | null
          next_result?: string | null
          updated_at?: string
          user_id: string
          win_payout_pct?: number
        }
        Update: {
          default_result?: string | null
          next_result?: string | null
          updated_at?: string
          user_id?: string
          win_payout_pct?: number
        }
        Relationships: []
      }
      trades: {
        Row: {
          amount: number
          close_price: number | null
          closes_at: string
          direction: string
          duration_sec: number
          id: string
          open_price: number
          opened_at: string
          payout_pct: number
          pnl: number | null
          result: string | null
          settled_at: string | null
          status: string
          symbol: string
          user_id: string
        }
        Insert: {
          amount: number
          close_price?: number | null
          closes_at: string
          direction: string
          duration_sec: number
          id?: string
          open_price: number
          opened_at?: string
          payout_pct?: number
          pnl?: number | null
          result?: string | null
          settled_at?: string | null
          status?: string
          symbol?: string
          user_id: string
        }
        Update: {
          amount?: number
          close_price?: number | null
          closes_at?: string
          direction?: string
          duration_sec?: number
          id?: string
          open_price?: number
          opened_at?: string
          payout_pct?: number
          pnl?: number | null
          result?: string | null
          settled_at?: string | null
          status?: string
          symbol?: string
          user_id?: string
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
          role: Database["public"]["Enums"]["app_role"]
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
      wallets: {
        Row: {
          locked: number
          updated_at: string
          usdt_balance: number
          user_id: string
        }
        Insert: {
          locked?: number
          updated_at?: string
          usdt_balance?: number
          user_id: string
        }
        Update: {
          locked?: number
          updated_at?: string
          usdt_balance?: number
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_addresses: {
        Row: {
          address: string
          created_at: string
          id: string
          label: string | null
          network: string
          user_id: string
        }
        Insert: {
          address: string
          created_at?: string
          id?: string
          label?: string | null
          network: string
          user_id: string
        }
        Update: {
          address?: string
          created_at?: string
          id?: string
          label?: string | null
          network?: string
          user_id?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          address: string
          admin_note: string | null
          amount: number
          created_at: string
          fee: number
          id: string
          network: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          address: string
          admin_note?: string | null
          amount: number
          created_at?: string
          fee?: number
          id?: string
          network: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          address?: string
          admin_note?: string | null
          amount?: number
          created_at?: string
          fee?: number
          id?: string
          network?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
