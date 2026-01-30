import { createClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error(
    "SUPABASE_URL and SUPABASE_ANON_KEY must be set. Did you forget to configure Supabase?",
  );
}

// Define the database schema with snake_case columns
export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: number;
          name: string;
          description: string | null;
        };
        Insert: {
          id?: number;
          name: string;
          description?: string | null;
        };
        Update: {
          id?: number;
          name?: string;
          description?: string | null;
        };
      };
      suppliers: {
        Row: {
          id: number;
          name: string;
          contact_info: string | null;
          address: string | null;
        };
        Insert: {
          id?: number;
          name: string;
          contact_info?: string | null;
          address?: string | null;
        };
        Update: {
          id?: number;
          name?: string;
          contact_info?: string | null;
          address?: string | null;
        };
      };
      products: {
        Row: {
          id: number;
          name: string;
          description: string | null;
          sku: string | null;
          quantity: number;
          cost_price: string;
          selling_price: string;
          category_id: number | null;
          supplier_id: number | null;
          image_url: string | null;
          min_stock_level: number | null;
        };
        Insert: {
          id?: number;
          name: string;
          description?: string | null;
          sku?: string | null;
          quantity?: number;
          cost_price: string;
          selling_price: string;
          category_id?: number | null;
          supplier_id?: number | null;
          image_url?: string | null;
          min_stock_level?: number | null;
        };
        Update: {
          id?: number;
          name?: string;
          description?: string | null;
          sku?: string | null;
          quantity?: number;
          cost_price?: string;
          selling_price?: string;
          category_id?: number | null;
          supplier_id?: number | null;
          image_url?: string | null;
          min_stock_level?: number | null;
        };
      };
      movements: {
        Row: {
          id: number;
          product_id: number;
          type: string;
          quantity: number;
          reason: string | null;
          created_at: string | null;
          user_id: string | null;
        };
        Insert: {
          id?: number;
          product_id: number;
          type: string;
          quantity: number;
          reason?: string | null;
          created_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          id?: number;
          product_id?: number;
          type?: string;
          quantity?: number;
          reason?: string | null;
          created_at?: string | null;
          user_id?: string | null;
        };
      };
      credit_accounts: {
        Row: {
          id: number;
          customer_name: string;
          product_id: number;
          movement_id: number | null;
          quantity: number;
          unit_price: string;
          total_amount: string;
          paid_amount: string;
          remaining_amount: string;
          status: string;
          notes: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: number;
          customer_name: string;
          product_id: number;
          movement_id?: number | null;
          quantity: number;
          unit_price: string;
          total_amount: string;
          paid_amount?: string;
          remaining_amount: string;
          status?: string;
          notes?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: number;
          customer_name?: string;
          product_id?: number;
          movement_id?: number | null;
          quantity?: number;
          unit_price?: string;
          total_amount?: string;
          paid_amount?: string;
          remaining_amount?: string;
          status?: string;
          notes?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      credit_payments: {
        Row: {
          id: number;
          credit_account_id: number;
          amount: string;
          payment_method: string | null;
          notes: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: number;
          credit_account_id: number;
          amount: string;
          payment_method?: string | null;
          notes?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: number;
          credit_account_id?: number;
          amount?: string;
          payment_method?: string | null;
          notes?: string | null;
          created_at?: string | null;
        };
      };
    };
  };
}

export const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);
