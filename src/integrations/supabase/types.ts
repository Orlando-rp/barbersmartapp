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
  public: {
    Tables: {
      addon_modules: {
        Row: {
          active: boolean | null
          category: string
          created_at: string | null
          description: string | null
          features_enabled: Json
          icon: string | null
          id: string
          name: string
          price: number
          slug: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          category?: string
          created_at?: string | null
          description?: string | null
          features_enabled?: Json
          icon?: string | null
          id?: string
          name: string
          price?: number
          slug: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          category?: string
          created_at?: string | null
          description?: string | null
          features_enabled?: Json
          icon?: string | null
          id?: string
          name?: string
          price?: number
          slug?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          barbershop_id: string
          client_id: string | null
          client_name: string | null
          client_phone: string | null
          created_at: string | null
          duration: number | null
          id: string
          is_paused: boolean | null
          is_recurring: boolean | null
          notes: string | null
          original_date: string | null
          pause_reason: string | null
          paused_at: string | null
          paused_until: string | null
          payment_amount: number | null
          payment_gateway: string | null
          payment_id: string | null
          payment_method_chosen: string | null
          payment_status: string | null
          recurrence_index: number | null
          recurrence_rule: string | null
          recurring_group_id: string | null
          reminder_sent: string | null
          reschedule_suggested: boolean | null
          reschedule_suggested_at: string | null
          service_id: string | null
          service_name: string | null
          service_price: number | null
          staff_id: string | null
          status: Database["public"]["Enums"]["appointment_status"] | null
          updated_at: string | null
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          barbershop_id: string
          client_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string | null
          duration?: number | null
          id?: string
          is_paused?: boolean | null
          is_recurring?: boolean | null
          notes?: string | null
          original_date?: string | null
          pause_reason?: string | null
          paused_at?: string | null
          paused_until?: string | null
          payment_amount?: number | null
          payment_gateway?: string | null
          payment_id?: string | null
          payment_method_chosen?: string | null
          payment_status?: string | null
          recurrence_index?: number | null
          recurrence_rule?: string | null
          recurring_group_id?: string | null
          reminder_sent?: string | null
          reschedule_suggested?: boolean | null
          reschedule_suggested_at?: string | null
          service_id?: string | null
          service_name?: string | null
          service_price?: number | null
          staff_id?: string | null
          status?: Database["public"]["Enums"]["appointment_status"] | null
          updated_at?: string | null
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          barbershop_id?: string
          client_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string | null
          duration?: number | null
          id?: string
          is_paused?: boolean | null
          is_recurring?: boolean | null
          notes?: string | null
          original_date?: string | null
          pause_reason?: string | null
          paused_at?: string | null
          paused_until?: string | null
          payment_amount?: number | null
          payment_gateway?: string | null
          payment_id?: string | null
          payment_method_chosen?: string | null
          payment_status?: string | null
          recurrence_index?: number | null
          recurrence_rule?: string | null
          recurring_group_id?: string | null
          reminder_sent?: string | null
          reschedule_suggested?: boolean | null
          reschedule_suggested_at?: string | null
          service_id?: string | null
          service_name?: string | null
          service_price?: number | null
          staff_id?: string | null
          status?: Database["public"]["Enums"]["appointment_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          barbershop_id: string | null
          changed_fields: string[] | null
          created_at: string
          id: string
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
          operation: Database["public"]["Enums"]["audit_operation"]
          record_id: string
          table_name: string
          user_agent: string | null
          user_email: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          barbershop_id?: string | null
          changed_fields?: string[] | null
          created_at?: string
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          operation: Database["public"]["Enums"]["audit_operation"]
          record_id: string
          table_name: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          barbershop_id?: string | null
          changed_fields?: string[] | null
          created_at?: string
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          operation?: Database["public"]["Enums"]["audit_operation"]
          record_id?: string
          table_name?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      auth_otp_codes: {
        Row: {
          attempts: number | null
          code: string
          created_at: string | null
          expires_at: string
          id: string
          phone: string
          verified: boolean | null
        }
        Insert: {
          attempts?: number | null
          code: string
          created_at?: string | null
          expires_at: string
          id?: string
          phone: string
          verified?: boolean | null
        }
        Update: {
          attempts?: number | null
          code?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          phone?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      barbershop_domains: {
        Row: {
          barbershop_id: string
          created_at: string | null
          custom_domain: string | null
          custom_domain_status: string | null
          dns_verification_token: string | null
          dns_verified_at: string | null
          id: string
          landing_page_config: Json | null
          landing_page_enabled: boolean | null
          primary_domain_type: string | null
          ssl_provisioned_at: string | null
          ssl_status: string | null
          subdomain: string | null
          subdomain_status: string | null
          updated_at: string | null
        }
        Insert: {
          barbershop_id: string
          created_at?: string | null
          custom_domain?: string | null
          custom_domain_status?: string | null
          dns_verification_token?: string | null
          dns_verified_at?: string | null
          id?: string
          landing_page_config?: Json | null
          landing_page_enabled?: boolean | null
          primary_domain_type?: string | null
          ssl_provisioned_at?: string | null
          ssl_status?: string | null
          subdomain?: string | null
          subdomain_status?: string | null
          updated_at?: string | null
        }
        Update: {
          barbershop_id?: string
          created_at?: string | null
          custom_domain?: string | null
          custom_domain_status?: string | null
          dns_verification_token?: string | null
          dns_verified_at?: string | null
          id?: string
          landing_page_config?: Json | null
          landing_page_enabled?: boolean | null
          primary_domain_type?: string | null
          ssl_provisioned_at?: string | null
          ssl_status?: string | null
          subdomain?: string | null
          subdomain_status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "barbershop_domains_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: true
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      barbershops: {
        Row: {
          active: boolean | null
          address: string | null
          cnpj: string | null
          created_at: string | null
          custom_branding: Json | null
          email: string | null
          email_config: Json | null
          id: string
          logo_url: string | null
          name: string
          parent_id: string | null
          phone: string | null
          responsible_email: string | null
          responsible_name: string | null
          responsible_phone: string | null
          settings: Json | null
          slug: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          address?: string | null
          cnpj?: string | null
          created_at?: string | null
          custom_branding?: Json | null
          email?: string | null
          email_config?: Json | null
          id?: string
          logo_url?: string | null
          name: string
          parent_id?: string | null
          phone?: string | null
          responsible_email?: string | null
          responsible_name?: string | null
          responsible_phone?: string | null
          settings?: Json | null
          slug?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          address?: string | null
          cnpj?: string | null
          created_at?: string | null
          custom_branding?: Json | null
          email?: string | null
          email_config?: Json | null
          id?: string
          logo_url?: string | null
          name?: string
          parent_id?: string | null
          phone?: string | null
          responsible_email?: string | null
          responsible_name?: string | null
          responsible_phone?: string | null
          settings?: Json | null
          slug?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "barbershops_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_dates: {
        Row: {
          barbershop_id: string
          blocked_date: string
          created_at: string | null
          id: string
          reason: string
        }
        Insert: {
          barbershop_id: string
          blocked_date: string
          created_at?: string | null
          id?: string
          reason: string
        }
        Update: {
          barbershop_id?: string
          blocked_date?: string
          created_at?: string | null
          id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_dates_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      business_hours: {
        Row: {
          barbershop_id: string
          break_end: string | null
          break_start: string | null
          close_time: string
          created_at: string | null
          day_of_week: string
          id: string
          is_open: boolean | null
          open_time: string
          updated_at: string | null
        }
        Insert: {
          barbershop_id: string
          break_end?: string | null
          break_start?: string | null
          close_time: string
          created_at?: string | null
          day_of_week: string
          id?: string
          is_open?: boolean | null
          open_time: string
          updated_at?: string | null
        }
        Update: {
          barbershop_id?: string
          break_end?: string | null
          break_start?: string | null
          close_time?: string
          created_at?: string | null
          day_of_week?: string
          id?: string
          is_open?: boolean | null
          open_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_hours_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          barbershop_id: string
          config: Json | null
          created_at: string | null
          id: string
          name: string
          status: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          barbershop_id: string
          config?: Json | null
          created_at?: string | null
          id?: string
          name: string
          status?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          barbershop_id?: string
          config?: Json | null
          created_at?: string | null
          id?: string
          name?: string
          status?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_conversations: {
        Row: {
          barbershop_id: string
          bot_response: string
          client_phone: string
          created_at: string | null
          id: string
          user_message: string
        }
        Insert: {
          barbershop_id: string
          bot_response: string
          client_phone: string
          created_at?: string | null
          id?: string
          user_message: string
        }
        Update: {
          barbershop_id?: string
          bot_response?: string
          client_phone?: string
          created_at?: string | null
          id?: string
          user_message?: string
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_conversations_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      client_users: {
        Row: {
          client_id: string
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_users_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          active: boolean | null
          address: string | null
          avatar_url: string | null
          barbershop_id: string
          birth_date: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          notification_enabled: boolean | null
          notification_types: Json | null
          notify_email: boolean | null
          notify_sms: boolean | null
          notify_whatsapp: boolean | null
          phone: string | null
          preferred_name: string | null
          reminder_hours: number | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          address?: string | null
          avatar_url?: string | null
          barbershop_id: string
          birth_date?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          notification_enabled?: boolean | null
          notification_types?: Json | null
          notify_email?: boolean | null
          notify_sms?: boolean | null
          notify_whatsapp?: boolean | null
          phone?: string | null
          preferred_name?: string | null
          reminder_hours?: number | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          address?: string | null
          avatar_url?: string | null
          barbershop_id?: string
          birth_date?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          notification_enabled?: boolean | null
          notification_types?: Json | null
          notify_email?: boolean | null
          notify_sms?: boolean | null
          notify_whatsapp?: boolean | null
          phone?: string | null
          preferred_name?: string | null
          reminder_hours?: number | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          active: boolean | null
          barbershop_id: string
          code: string
          created_at: string | null
          current_uses: number | null
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          max_uses: number | null
          min_purchase_value: number | null
          updated_at: string | null
          valid_from: string
          valid_until: string
        }
        Insert: {
          active?: boolean | null
          barbershop_id: string
          code: string
          created_at?: string | null
          current_uses?: number | null
          description?: string | null
          discount_type: string
          discount_value: number
          id?: string
          max_uses?: number | null
          min_purchase_value?: number | null
          updated_at?: string | null
          valid_from: string
          valid_until: string
        }
        Update: {
          active?: boolean | null
          barbershop_id?: string
          code?: string
          created_at?: string | null
          current_uses?: number | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          max_uses?: number | null
          min_purchase_value?: number | null
          updated_at?: string | null
          valid_from?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupons_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      deploy_history: {
        Row: {
          barbershop_id: string | null
          completed_at: string | null
          created_at: string | null
          deploy_type: string
          details: Json | null
          id: string
          started_at: string | null
          status: string
          triggered_by: string | null
        }
        Insert: {
          barbershop_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          deploy_type: string
          details?: Json | null
          id?: string
          started_at?: string | null
          status?: string
          triggered_by?: string | null
        }
        Update: {
          barbershop_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          deploy_type?: string
          details?: Json | null
          id?: string
          started_at?: string | null
          status?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deploy_history_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      domain_logs: {
        Row: {
          action: string
          barbershop_id: string
          created_at: string | null
          details: Json | null
          id: string
        }
        Insert: {
          action: string
          barbershop_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
        }
        Update: {
          action?: string
          barbershop_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "domain_logs_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      global_payment_config: {
        Row: {
          allow_tenant_credentials: boolean | null
          asaas_api_key: string | null
          asaas_enabled: boolean | null
          asaas_wallet_id: string | null
          asaas_webhook_secret: string | null
          created_at: string | null
          default_gateway: string | null
          id: string
          mercadopago_access_token: string | null
          mercadopago_enabled: boolean | null
          mercadopago_public_key: string | null
          mercadopago_webhook_secret: string | null
          platform_fee_percentage: number | null
          stripe_enabled: boolean | null
          stripe_publishable_key: string | null
          stripe_secret_key: string | null
          stripe_webhook_secret: string | null
          updated_at: string | null
        }
        Insert: {
          allow_tenant_credentials?: boolean | null
          asaas_api_key?: string | null
          asaas_enabled?: boolean | null
          asaas_wallet_id?: string | null
          asaas_webhook_secret?: string | null
          created_at?: string | null
          default_gateway?: string | null
          id?: string
          mercadopago_access_token?: string | null
          mercadopago_enabled?: boolean | null
          mercadopago_public_key?: string | null
          mercadopago_webhook_secret?: string | null
          platform_fee_percentage?: number | null
          stripe_enabled?: boolean | null
          stripe_publishable_key?: string | null
          stripe_secret_key?: string | null
          stripe_webhook_secret?: string | null
          updated_at?: string | null
        }
        Update: {
          allow_tenant_credentials?: boolean | null
          asaas_api_key?: string | null
          asaas_enabled?: boolean | null
          asaas_wallet_id?: string | null
          asaas_webhook_secret?: string | null
          created_at?: string | null
          default_gateway?: string | null
          id?: string
          mercadopago_access_token?: string | null
          mercadopago_enabled?: boolean | null
          mercadopago_public_key?: string | null
          mercadopago_webhook_secret?: string | null
          platform_fee_percentage?: number | null
          stripe_enabled?: boolean | null
          stripe_publishable_key?: string | null
          stripe_secret_key?: string | null
          stripe_webhook_secret?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      loyalty_points: {
        Row: {
          barbershop_id: string
          client_id: string
          created_at: string | null
          id: string
          points: number | null
          total_earned: number | null
          total_redeemed: number | null
          updated_at: string | null
        }
        Insert: {
          barbershop_id: string
          client_id: string
          created_at?: string | null
          id?: string
          points?: number | null
          total_earned?: number | null
          total_redeemed?: number | null
          updated_at?: string | null
        }
        Update: {
          barbershop_id?: string
          client_id?: string
          created_at?: string | null
          id?: string
          points?: number | null
          total_earned?: number | null
          total_redeemed?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_points_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_points_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_transactions: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          loyalty_points_id: string
          points: number
          type: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          loyalty_points_id: string
          points: number
          type: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          loyalty_points_id?: string
          points?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_transactions_loyalty_points_id_fkey"
            columns: ["loyalty_points_id"]
            isOneToOne: false
            referencedRelation: "loyalty_points"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          barbershop_id: string
          content: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          type: string
          updated_at: string | null
          variables: string[] | null
        }
        Insert: {
          barbershop_id: string
          content: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          type: string
          updated_at?: string | null
          variables?: string[] | null
        }
        Update: {
          barbershop_id?: string
          content?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          type?: string
          updated_at?: string | null
          variables?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_settings: {
        Row: {
          allow_online_payment: boolean | null
          allow_pay_at_location: boolean | null
          asaas_api_key: string | null
          asaas_wallet_id: string | null
          barbershop_id: string
          created_at: string | null
          deposit_percentage: number | null
          id: string
          mercadopago_access_token: string | null
          mercadopago_public_key: string | null
          preferred_gateway: string | null
          require_deposit: boolean | null
          stripe_publishable_key: string | null
          stripe_secret_key: string | null
          updated_at: string | null
          use_global_credentials: boolean | null
        }
        Insert: {
          allow_online_payment?: boolean | null
          allow_pay_at_location?: boolean | null
          asaas_api_key?: string | null
          asaas_wallet_id?: string | null
          barbershop_id: string
          created_at?: string | null
          deposit_percentage?: number | null
          id?: string
          mercadopago_access_token?: string | null
          mercadopago_public_key?: string | null
          preferred_gateway?: string | null
          require_deposit?: boolean | null
          stripe_publishable_key?: string | null
          stripe_secret_key?: string | null
          updated_at?: string | null
          use_global_credentials?: boolean | null
        }
        Update: {
          allow_online_payment?: boolean | null
          allow_pay_at_location?: boolean | null
          asaas_api_key?: string | null
          asaas_wallet_id?: string | null
          barbershop_id?: string
          created_at?: string | null
          deposit_percentage?: number | null
          id?: string
          mercadopago_access_token?: string | null
          mercadopago_public_key?: string | null
          preferred_gateway?: string | null
          require_deposit?: boolean | null
          stripe_publishable_key?: string | null
          stripe_secret_key?: string | null
          updated_at?: string | null
          use_global_credentials?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_settings_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: true
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_photos: {
        Row: {
          active: boolean | null
          barbershop_id: string
          category: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          image_url: string
          is_featured: boolean | null
          staff_id: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          barbershop_id: string
          category?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url: string
          is_featured?: boolean | null
          staff_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          barbershop_id?: string
          category?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string
          is_featured?: boolean | null
          staff_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_photos_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_photos_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          barbershop_id: string | null
          created_at: string | null
          full_name: string | null
          id: string
          phone: string | null
          preferred_name: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          barbershop_id?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          preferred_name?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          barbershop_id?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          preferred_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      public_booking_visits: {
        Row: {
          appointment_id: string | null
          barbershop_id: string
          converted: boolean | null
          id: string
          referrer: string | null
          user_agent: string | null
          visited_at: string | null
          visitor_ip: string | null
        }
        Insert: {
          appointment_id?: string | null
          barbershop_id: string
          converted?: boolean | null
          id?: string
          referrer?: string | null
          user_agent?: string | null
          visited_at?: string | null
          visitor_ip?: string | null
        }
        Update: {
          appointment_id?: string | null
          barbershop_id?: string
          converted?: boolean | null
          id?: string
          referrer?: string | null
          user_agent?: string | null
          visited_at?: string | null
          visitor_ip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_booking_visits_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_booking_visits_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          appointment_id: string
          barbershop_id: string
          client_id: string
          comment: string | null
          created_at: string | null
          id: string
          rating: number
          staff_id: string | null
          updated_at: string | null
        }
        Insert: {
          appointment_id: string
          barbershop_id: string
          client_id: string
          comment?: string | null
          created_at?: string | null
          id?: string
          rating: number
          staff_id?: string | null
          updated_at?: string | null
        }
        Update: {
          appointment_id?: string
          barbershop_id?: string
          client_id?: string
          comment?: string | null
          created_at?: string | null
          id?: string
          rating?: number
          staff_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          barbershop_id: string
          created_at: string | null
          id: string
          permissions: Json
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
        }
        Insert: {
          barbershop_id: string
          created_at?: string | null
          id?: string
          permissions?: Json
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Update: {
          barbershop_id?: string
          created_at?: string | null
          id?: string
          permissions?: Json
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      service_categories: {
        Row: {
          active: boolean | null
          barbershop_id: string
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          barbershop_id: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          barbershop_id?: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_categories_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean | null
          barbershop_id: string
          category: string | null
          category_id: string | null
          created_at: string | null
          description: string | null
          duration: number
          id: string
          image_url: string | null
          name: string
          price: number
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          barbershop_id: string
          category?: string | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          duration?: number
          id?: string
          image_url?: string | null
          name: string
          price?: number
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          barbershop_id?: string
          category?: string | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          duration?: number
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      special_hours: {
        Row: {
          barbershop_id: string
          close_time: string | null
          created_at: string | null
          id: string
          is_open: boolean | null
          open_time: string | null
          reason: string | null
          special_date: string
          updated_at: string | null
        }
        Insert: {
          barbershop_id: string
          close_time?: string | null
          created_at?: string | null
          id?: string
          is_open?: boolean | null
          open_time?: string | null
          reason?: string | null
          special_date: string
          updated_at?: string | null
        }
        Update: {
          barbershop_id?: string
          close_time?: string | null
          created_at?: string | null
          id?: string
          is_open?: boolean | null
          open_time?: string | null
          reason?: string | null
          special_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "special_hours_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          active: boolean | null
          barbershop_id: string
          commission_rate: number | null
          commission_type: string | null
          created_at: string | null
          fixed_commission: number | null
          id: string
          is_also_barber: boolean | null
          schedule: Json | null
          specialties: string[] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          barbershop_id: string
          commission_rate?: number | null
          commission_type?: string | null
          created_at?: string | null
          fixed_commission?: number | null
          id?: string
          is_also_barber?: boolean | null
          schedule?: Json | null
          specialties?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          barbershop_id?: string
          commission_rate?: number | null
          commission_type?: string | null
          created_at?: string | null
          fixed_commission?: number | null
          id?: string
          is_also_barber?: boolean | null
          schedule?: Json | null
          specialties?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_services: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          service_id: string
          staff_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          service_id: string
          staff_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          service_id?: string
          staff_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_services_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_units: {
        Row: {
          active: boolean | null
          barbershop_id: string
          commission_rate: number | null
          created_at: string | null
          id: string
          schedule: Json | null
          staff_id: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          barbershop_id: string
          commission_rate?: number | null
          created_at?: string | null
          id?: string
          schedule?: Json | null
          staff_id: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          barbershop_id?: string
          commission_rate?: number | null
          created_at?: string | null
          id?: string
          schedule?: Json | null
          staff_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_units_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_units_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_addons: {
        Row: {
          active: boolean | null
          added_at: string | null
          addon_id: string
          created_at: string | null
          id: string
          subscription_id: string
        }
        Insert: {
          active?: boolean | null
          added_at?: string | null
          addon_id: string
          created_at?: string | null
          id?: string
          subscription_id: string
        }
        Update: {
          active?: boolean | null
          added_at?: string | null
          addon_id?: string
          created_at?: string | null
          id?: string
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_addons_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "addon_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_addons_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          active: boolean | null
          billing_period: string
          created_at: string | null
          description: string | null
          discount_percentage: number | null
          feature_flags: Json | null
          features: Json | null
          highlight_text: string | null
          id: string
          included_addons: string[] | null
          is_base_plan: boolean | null
          is_bundle: boolean | null
          max_appointments_month: number | null
          max_clients: number | null
          max_staff: number | null
          name: string
          price: number
          slug: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          billing_period?: string
          created_at?: string | null
          description?: string | null
          discount_percentage?: number | null
          feature_flags?: Json | null
          features?: Json | null
          highlight_text?: string | null
          id?: string
          included_addons?: string[] | null
          is_base_plan?: boolean | null
          is_bundle?: boolean | null
          max_appointments_month?: number | null
          max_clients?: number | null
          max_staff?: number | null
          name: string
          price?: number
          slug: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          billing_period?: string
          created_at?: string | null
          description?: string | null
          discount_percentage?: number | null
          feature_flags?: Json | null
          features?: Json | null
          highlight_text?: string | null
          id?: string
          included_addons?: string[] | null
          is_base_plan?: boolean | null
          is_bundle?: boolean | null
          max_appointments_month?: number | null
          max_clients?: number | null
          max_staff?: number | null
          name?: string
          price?: number
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          barbershop_id: string | null
          cancelled_at: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_id: string | null
          status: string
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          barbershop_id?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string | null
          status?: string
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          barbershop_id?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string | null
          status?: string
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      system_branding: {
        Row: {
          accent_color: string | null
          allow_tenant_customization: boolean | null
          created_at: string | null
          favicon_url: string | null
          id: string
          logo_dark_url: string | null
          logo_icon_url: string | null
          logo_url: string | null
          primary_color: string | null
          secondary_color: string | null
          system_name: string
          tagline: string | null
          updated_at: string | null
        }
        Insert: {
          accent_color?: string | null
          allow_tenant_customization?: boolean | null
          created_at?: string | null
          favicon_url?: string | null
          id?: string
          logo_dark_url?: string | null
          logo_icon_url?: string | null
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          system_name?: string
          tagline?: string | null
          updated_at?: string | null
        }
        Update: {
          accent_color?: string | null
          allow_tenant_customization?: boolean | null
          created_at?: string | null
          favicon_url?: string | null
          id?: string
          logo_dark_url?: string | null
          logo_icon_url?: string | null
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          system_name?: string
          tagline?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      system_config: {
        Row: {
          created_at: string | null
          id: string
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value?: Json
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      system_messages: {
        Row: {
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          message: string
          published_at: string | null
          target_plans: string[] | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          message: string
          published_at?: string | null
          target_plans?: string[] | null
          title: string
          type?: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          message?: string
          published_at?: string | null
          target_plans?: string[] | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          appointment_id: string | null
          barbershop_id: string
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          staff_id: string | null
          transaction_date: string
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string | null
        }
        Insert: {
          amount: number
          appointment_id?: string | null
          barbershop_id: string
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          staff_id?: string | null
          transaction_date?: string
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string | null
        }
        Update: {
          amount?: number
          appointment_id?: string | null
          barbershop_id?: string
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          staff_id?: string | null
          transaction_date?: string
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      uptime_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          endpoint: string
          id: string
          message: string | null
          resolved: boolean | null
          resolved_at: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          endpoint: string
          id?: string
          message?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          message?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
        }
        Relationships: []
      }
      uptime_config: {
        Row: {
          config_key: string
          config_value: string
          created_at: string | null
          description: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          config_key: string
          config_value: string
          created_at?: string | null
          description?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          config_key?: string
          config_value?: string
          created_at?: string | null
          description?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      uptime_logs: {
        Row: {
          checked_at: string | null
          endpoint: string
          error_message: string | null
          id: string
          is_healthy: boolean | null
          response_time_ms: number | null
          status_code: number | null
        }
        Insert: {
          checked_at?: string | null
          endpoint: string
          error_message?: string | null
          id?: string
          is_healthy?: boolean | null
          response_time_ms?: number | null
          status_code?: number | null
        }
        Update: {
          checked_at?: string | null
          endpoint?: string
          error_message?: string | null
          id?: string
          is_healthy?: boolean | null
          response_time_ms?: number | null
          status_code?: number | null
        }
        Relationships: []
      }
      usage_metrics: {
        Row: {
          appointments_count: number | null
          barbershop_id: string | null
          clients_count: number | null
          created_at: string | null
          id: string
          messages_sent: number | null
          month: string
          revenue: number | null
          staff_count: number | null
          storage_used_mb: number | null
          updated_at: string | null
        }
        Insert: {
          appointments_count?: number | null
          barbershop_id?: string | null
          clients_count?: number | null
          created_at?: string | null
          id?: string
          messages_sent?: number | null
          month: string
          revenue?: number | null
          staff_count?: number | null
          storage_used_mb?: number | null
          updated_at?: string | null
        }
        Update: {
          appointments_count?: number | null
          barbershop_id?: string | null
          clients_count?: number | null
          created_at?: string | null
          id?: string
          messages_sent?: number | null
          month?: string
          revenue?: number | null
          staff_count?: number | null
          storage_used_mb?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_metrics_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      user_barbershops: {
        Row: {
          barbershop_id: string
          created_at: string | null
          id: string
          is_primary: boolean | null
          user_id: string
        }
        Insert: {
          barbershop_id: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          user_id: string
        }
        Update: {
          barbershop_id?: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_barbershops_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          barbershop_id: string | null
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          barbershop_id?: string | null
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          barbershop_id?: string | null
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          barbershop_id: string
          client_id: string | null
          client_name: string
          client_phone: string
          created_at: string | null
          id: string
          notes: string | null
          notified_at: string | null
          preferred_date: string
          preferred_time_end: string | null
          preferred_time_start: string | null
          service_id: string | null
          staff_id: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          barbershop_id: string
          client_id?: string | null
          client_name: string
          client_phone: string
          created_at?: string | null
          id?: string
          notes?: string | null
          notified_at?: string | null
          preferred_date: string
          preferred_time_end?: string | null
          preferred_time_start?: string | null
          service_id?: string | null
          staff_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          barbershop_id?: string
          client_id?: string | null
          client_name?: string
          client_phone?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          notified_at?: string | null
          preferred_date?: string
          preferred_time_end?: string | null
          preferred_time_start?: string | null
          service_id?: string | null
          staff_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_config: {
        Row: {
          barbershop_id: string
          config: Json
          created_at: string | null
          health_status: string | null
          id: string
          is_active: boolean | null
          last_health_check: string | null
          provider: string
          updated_at: string | null
        }
        Insert: {
          barbershop_id: string
          config?: Json
          created_at?: string | null
          health_status?: string | null
          id?: string
          is_active?: boolean | null
          last_health_check?: string | null
          provider: string
          updated_at?: string | null
        }
        Update: {
          barbershop_id?: string
          config?: Json
          created_at?: string | null
          health_status?: string | null
          id?: string
          is_active?: boolean | null
          last_health_check?: string | null
          provider?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_config_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_logs: {
        Row: {
          barbershop_id: string
          created_at: string | null
          error_message: string | null
          id: string
          message_type: string | null
          metadata: Json | null
          provider: string | null
          recipient_phone: string
          status: string | null
          template_name: string | null
        }
        Insert: {
          barbershop_id: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          message_type?: string | null
          metadata?: Json | null
          provider?: string | null
          recipient_phone: string
          status?: string | null
          template_name?: string | null
        }
        Update: {
          barbershop_id?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          message_type?: string | null
          metadata?: Json | null
          provider?: string | null
          recipient_phone?: string
          status?: string | null
          template_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_logs_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          barbershop_id: string
          contact_name: string | null
          created_at: string | null
          direction: string
          id: string
          message: string
          message_type: string | null
          metadata: Json | null
          phone_number: string
          sent_by_name: string | null
          sent_by_user_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          barbershop_id: string
          contact_name?: string | null
          created_at?: string | null
          direction: string
          id?: string
          message: string
          message_type?: string | null
          metadata?: Json | null
          phone_number: string
          sent_by_name?: string | null
          sent_by_user_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          barbershop_id?: string
          contact_name?: string | null
          created_at?: string | null
          direction?: string
          id?: string
          message?: string
          message_type?: string | null
          metadata?: Json | null
          phone_number?: string
          sent_by_name?: string | null
          sent_by_user_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      count_units: { Args: { _headquarters_id: string }; Returns: number }
      get_client_barbershop_id: { Args: { _user_id: string }; Returns: string }
      get_client_id_for_user: { Args: { _user_id: string }; Returns: string }
      get_user_barbershop: { Args: { _user_id: string }; Returns: string }
      get_user_barbershop_id: { Args: { _user_id: string }; Returns: string }
      get_user_barbershops: { Args: { _user_id: string }; Returns: string[] }
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
      is_admin_of_barbershop: {
        Args: { _barbershop_id: string; _user_id: string }
        Returns: boolean
      }
      is_client: { Args: { _user_id: string }; Returns: boolean }
      is_headquarters: { Args: { _barbershop_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      user_belongs_to_barbershop: {
        Args: { _barbershop_id: string; _user_id: string }
        Returns: boolean
      }
      user_has_access_to_barbershop_hierarchy: {
        Args: { _barbershop_id: string; _user_id: string }
        Returns: boolean
      }
      user_has_barbershop_access: {
        Args: { _barbershop_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "admin"
        | "barbeiro"
        | "recepcionista"
        | "cliente"
      appointment_status:
        | "pendente"
        | "confirmado"
        | "concluido"
        | "cancelado"
        | "falta"
      audit_operation: "INSERT" | "UPDATE" | "DELETE"
      payment_method:
        | "dinheiro"
        | "cartao_credito"
        | "cartao_debito"
        | "pix"
        | "transferencia"
      transaction_type: "receita" | "despesa"
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
      app_role: [
        "super_admin",
        "admin",
        "barbeiro",
        "recepcionista",
        "cliente",
      ],
      appointment_status: [
        "pendente",
        "confirmado",
        "concluido",
        "cancelado",
        "falta",
      ],
      audit_operation: ["INSERT", "UPDATE", "DELETE"],
      payment_method: [
        "dinheiro",
        "cartao_credito",
        "cartao_debito",
        "pix",
        "transferencia",
      ],
      transaction_type: ["receita", "despesa"],
    },
  },
} as const
