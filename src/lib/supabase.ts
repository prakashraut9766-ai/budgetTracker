import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          icon: string;
          color: string;
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          icon?: string;
          color?: string;
          is_default?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          icon?: string;
          color?: string;
          is_default?: boolean;
          created_at?: string;
        };
      };
      expenses: {
        Row: {
          id: string;
          user_id: string;
          category_id: string | null;
          amount: number;
          description: string;
          merchant: string | null;
          date: string;
          input_method: 'manual' | 'sms' | 'voice' | 'ocr';
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category_id?: string | null;
          amount: number;
          description: string;
          merchant?: string | null;
          date?: string;
          input_method?: 'manual' | 'sms' | 'voice' | 'ocr';
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          category_id?: string | null;
          amount?: number;
          description?: string;
          merchant?: string | null;
          date?: string;
          input_method?: 'manual' | 'sms' | 'voice' | 'ocr';
          notes?: string | null;
          created_at?: string;
        };
      };
      budgets: {
        Row: {
          id: string;
          user_id: string;
          type: 'daily' | 'weekly' | 'monthly';
          amount: number;
          category_id: string | null;
          start_date: string;
          end_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: 'daily' | 'weekly' | 'monthly';
          amount: number;
          category_id?: string | null;
          start_date: string;
          end_date: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: 'daily' | 'weekly' | 'monthly';
          amount?: number;
          category_id?: string | null;
          start_date?: string;
          end_date?: string;
          created_at?: string;
        };
      };
    };
  };
};
