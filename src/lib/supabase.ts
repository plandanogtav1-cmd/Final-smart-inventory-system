import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: string;
          sku: string;
          name: string;
          description: string;
          category: string;
          unit_price: number;
          cost_price: number;
          current_stock: number;
          min_stock_threshold: number;
          max_stock_threshold: number;
          reorder_point: number;
          reorder_quantity: number;
          supplier_id: string | null;
          is_active: boolean;
          image_url: string;
          created_at: string;
          updated_at: string;
        };
      };
      suppliers: {
        Row: {
          id: string;
          name: string;
          contact_person: string;
          email: string;
          phone: string;
          address: string;
          lead_time_days: number;
          rating: number;
          is_active: boolean;
          created_at: string;
        };
      };
      customers: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string;
          address: string;
          customer_type: string;
          total_purchases: number;
          created_at: string;
        };
      };
      sales: {
        Row: {
          id: string;
          product_id: string;
          customer_id: string | null;
          quantity: number;
          unit_price: number;
          total_amount: number;
          sale_date: string;
          payment_method: string;
          status: string;
          created_at: string;
        };
      };
      alerts: {
        Row: {
          id: string;
          product_id: string;
          alert_type: string;
          severity: string;
          message: string;
          is_read: boolean;
          is_resolved: boolean;
          created_at: string;
        };
      };
      forecasts: {
        Row: {
          id: string;
          product_id: string;
          forecast_date: string;
          predicted_demand: number;
          confidence_score: number;
          factors: Record<string, unknown>;
          recommendation: string;
          created_at: string;
        };
      };
      chat_history: {
        Row: {
          id: string;
          user_id: string;
          message: string;
          response: string;
          context_data: Record<string, unknown>;
          created_at: string;
        };
      };
    };
  };
}
