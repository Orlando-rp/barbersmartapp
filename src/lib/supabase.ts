import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nmsblmmhigwsevnqmhwn.supabase.co';
const supabaseAnonKey = 'sb_publishable_tDfYcwUClvCdECz1NttPNw_GbBcs-8p';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      barbershops: {
        Row: {
          id: string;
          name: string;
          address: string | null;
          phone: string | null;
          email: string | null;
          logo_url: string | null;
          settings: any;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['barbershops']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['barbershops']['Insert']>;
      };
      profiles: {
        Row: {
          id: string;
          barbershop_id: string | null;
          full_name: string | null;
          avatar_url: string | null;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: 'super_admin' | 'admin' | 'barbeiro' | 'recepcionista';
          barbershop_id: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_roles']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['user_roles']['Insert']>;
      };
      clients: {
        Row: {
          id: string;
          barbershop_id: string;
          name: string;
          email: string | null;
          phone: string;
          birth_date: string | null;
          address: string | null;
          notes: string | null;
          tags: string[];
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['clients']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['clients']['Insert']>;
      };
      services: {
        Row: {
          id: string;
          barbershop_id: string;
          name: string;
          description: string | null;
          category: string;
          price: number;
          duration: number;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['services']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['services']['Insert']>;
      };
      appointments: {
        Row: {
          id: string;
          barbershop_id: string;
          client_id: string | null;
          staff_id: string | null;
          service_id: string | null;
          appointment_date: string;
          appointment_time: string;
          status: 'pendente' | 'confirmado' | 'concluido' | 'cancelado' | 'falta';
          notes: string | null;
          client_name: string | null;
          client_phone: string | null;
          service_name: string | null;
          service_price: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['appointments']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['appointments']['Insert']>;
      };
      staff: {
        Row: {
          id: string;
          barbershop_id: string;
          user_id: string;
          specialties: string[] | null;
          commission_rate: number;
          schedule: any;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['staff']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['staff']['Insert']>;
      };
      transactions: {
        Row: {
          id: string;
          barbershop_id: string;
          appointment_id: string | null;
          type: 'receita' | 'despesa';
          amount: number;
          category: string | null;
          payment_method: 'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'pix' | 'transferencia' | null;
          description: string | null;
          transaction_date: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['transactions']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['transactions']['Insert']>;
      };
      campaigns: {
        Row: {
          id: string;
          barbershop_id: string;
          name: string;
          type: string;
          status: string;
          config: any;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['campaigns']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['campaigns']['Insert']>;
      };
      coupons: {
        Row: {
          id: string;
          barbershop_id: string;
          code: string;
          description: string | null;
          discount_type: 'percentage' | 'fixed';
          discount_value: number;
          min_purchase_value: number;
          max_uses: number | null;
          current_uses: number;
          valid_from: string;
          valid_until: string;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['coupons']['Row'], 'id' | 'current_uses' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['coupons']['Insert']>;
      };
      loyalty_points: {
        Row: {
          id: string;
          barbershop_id: string;
          client_id: string;
          points: number;
          total_earned: number;
          total_redeemed: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['loyalty_points']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['loyalty_points']['Insert']>;
      };
      loyalty_transactions: {
        Row: {
          id: string;
          loyalty_points_id: string;
          points: number;
          type: 'earned' | 'redeemed' | 'expired';
          description: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['loyalty_transactions']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['loyalty_transactions']['Insert']>;
      };
      whatsapp_logs: {
        Row: {
          id: string;
          barbershop_id: string;
          recipient_phone: string;
          recipient_name: string | null;
          message_type: string;
          message_content: string;
          status: string;
          whatsapp_message_id: string | null;
          error_message: string | null;
          appointment_id: string | null;
          campaign_id: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['whatsapp_logs']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['whatsapp_logs']['Insert']>;
      };
    };
  };
};
