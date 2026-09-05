// Generado por `npm run types:db` desde el esquema real de Supabase.
// NO editar a mano: el paso "database types are current" del CI vuelve a
// generarlo y falla si este archivo no coincide con la base.
//
// El archivo que había antes en db.ts estaba escrito a mano y describía el
// esquema de enero. Por eso se genera.

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
      categories: {
        Row: {
          description: string | null
          id: number
          name: string
          organization_id: string
        }
        Insert: {
          description?: string | null
          id?: number
          name: string
          organization_id: string
        }
        Update: {
          description?: string | null
          id?: number
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_accounts: {
        Row: {
          created_at: string | null
          customer_name: string
          id: number
          movement_id: number | null
          notes: string | null
          organization_id: string
          paid_amount: number
          product_id: number
          quantity: number
          remaining_amount: number
          status: string
          total_amount: number
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_name: string
          id?: number
          movement_id?: number | null
          notes?: string | null
          organization_id: string
          paid_amount?: number
          product_id: number
          quantity: number
          remaining_amount: number
          status?: string
          total_amount: number
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_name?: string
          id?: number
          movement_id?: number | null
          notes?: string | null
          organization_id?: string
          paid_amount?: number
          product_id?: number
          quantity?: number
          remaining_amount?: number
          status?: string
          total_amount?: number
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_accounts_movement_organization_fkey"
            columns: ["movement_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "movements"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "credit_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_accounts_product_organization_fkey"
            columns: ["product_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      credit_payments: {
        Row: {
          amount: number
          created_at: string | null
          credit_account_id: number
          id: number
          notes: string | null
          organization_id: string
          payment_method: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          credit_account_id: number
          id?: number
          notes?: string | null
          organization_id: string
          payment_method?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          credit_account_id?: number
          id?: number
          notes?: string | null
          organization_id?: string
          payment_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_payments_account_organization_fkey"
            columns: ["credit_account_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "credit_accounts"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "credit_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      movements: {
        Row: {
          created_at: string | null
          entered_quantity: number | null
          id: number
          loose_quantity: number | null
          organization_id: string
          pack_id: number | null
          product_id: number
          quantity: number
          reason: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          entered_quantity?: number | null
          id?: number
          loose_quantity?: number | null
          organization_id: string
          pack_id?: number | null
          product_id: number
          quantity: number
          reason?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          entered_quantity?: number | null
          id?: number
          loose_quantity?: number | null
          organization_id?: string
          pack_id?: number | null
          product_id?: number
          quantity?: number
          reason?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movements_pack_organization_fkey"
            columns: ["pack_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "product_packs"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "movements_product_organization_fkey"
            columns: ["product_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      organization_memberships: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_packs: {
        Row: {
          cost: number | null
          created_at: string
          id: number
          label: string
          organization_id: string
          price: number | null
          product_id: number
          units: number
        }
        Insert: {
          cost?: number | null
          created_at?: string
          id?: number
          label: string
          organization_id: string
          price?: number | null
          product_id: number
          units: number
        }
        Update: {
          cost?: number | null
          created_at?: string
          id?: number
          label?: string
          organization_id?: string
          price?: number | null
          product_id?: number
          units?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_packs_product_organization_fkey"
            columns: ["product_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: number | null
          cost_price: number
          description: string | null
          id: number
          image_url: string | null
          min_stock_level: number | null
          name: string
          organization_id: string
          quantity: number
          retired_at: string | null
          selling_price: number
          sku: string | null
          supplier_id: number | null
          unit_label: string
        }
        Insert: {
          category_id?: number | null
          cost_price: number
          description?: string | null
          id?: number
          image_url?: string | null
          min_stock_level?: number | null
          name: string
          organization_id: string
          quantity?: number
          retired_at?: string | null
          selling_price: number
          sku?: string | null
          supplier_id?: number | null
          unit_label?: string
        }
        Update: {
          category_id?: number | null
          cost_price?: number
          description?: string | null
          id?: number
          image_url?: string | null
          min_stock_level?: number | null
          name?: string
          organization_id?: string
          quantity?: number
          retired_at?: string | null
          selling_price?: number
          sku?: string | null
          supplier_id?: number | null
          unit_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_organization_fkey"
            columns: ["category_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_supplier_organization_fkey"
            columns: ["supplier_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          contact_info: string | null
          id: number
          name: string
          organization_id: string
        }
        Insert: {
          address?: string | null
          contact_info?: string | null
          id?: number
          name: string
          organization_id: string
        }
        Update: {
          address?: string | null
          contact_info?: string | null
          id?: number
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      customer_debts: {
        Row: {
          customer_name: string | null
          organization_id: string | null
          paid_accounts: number | null
          partial_accounts: number | null
          pending_accounts: number | null
          total_accounts: number | null
          total_debt: number | null
          total_paid: number | null
          total_remaining: number | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      create_credit_sale: {
        Args: {
          p_customer_name: string
          p_loose_quantity?: number
          p_notes?: string
          p_organization_id: string
          p_pack_id?: number
          p_product_id: number
          p_quantity: number
          p_user_id?: string
        }
        Returns: {
          created_at: string | null
          customer_name: string
          id: number
          movement_id: number | null
          notes: string | null
          organization_id: string
          paid_amount: number
          product_id: number
          quantity: number
          remaining_amount: number
          status: string
          total_amount: number
          unit_price: number
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "credit_accounts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      create_inventory_movement: {
        Args: {
          p_loose_quantity?: number
          p_organization_id: string
          p_pack_id?: number
          p_product_id: number
          p_quantity: number
          p_reason?: string
          p_type: string
          p_user_id?: string
        }
        Returns: {
          created_at: string | null
          entered_quantity: number | null
          id: number
          loose_quantity: number | null
          organization_id: string
          pack_id: number | null
          product_id: number
          quantity: number
          reason: string | null
          type: string
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "movements"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      is_active_organization_member: {
        Args: { target_organization_id: string }
        Returns: boolean
      }
      is_platform_admin: { Args: never; Returns: boolean }
      register_credit_payment: {
        Args: {
          p_amount: number
          p_credit_account_id: number
          p_notes?: string
          p_organization_id: string
          p_payment_method?: string
        }
        Returns: {
          amount: number
          created_at: string | null
          credit_account_id: number
          id: number
          notes: string | null
          organization_id: string
          payment_method: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "credit_payments"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      retire_product: {
        Args: { p_organization_id: string; p_product_id: number }
        Returns: {
          category_id: number | null
          cost_price: number
          description: string | null
          id: number
          image_url: string | null
          min_stock_level: number | null
          name: string
          organization_id: string
          quantity: number
          retired_at: string | null
          selling_price: number
          sku: string | null
          supplier_id: number | null
          unit_label: string
        }[]
        SetofOptions: {
          from: "*"
          to: "products"
          isOneToOne: false
          isSetofReturn: true
        }
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
