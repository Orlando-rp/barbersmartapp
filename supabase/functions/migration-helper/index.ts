import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, table, data, upsert_columns } = await req.json();

    console.log(`Migration helper: ${action} on ${table}`, { dataCount: Array.isArray(data) ? data.length : 1 });

    if (action === 'insert') {
      // Insert data into table with upsert (ON CONFLICT DO UPDATE)
      const { data: result, error } = await supabase
        .from(table)
        .upsert(data, { 
          onConflict: upsert_columns || 'id',
          ignoreDuplicates: false 
        })
        .select();

      if (error) {
        console.error(`Error inserting into ${table}:`, error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ 
        success: true, 
        table, 
        inserted: result?.length || 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'count') {
      // Count records in a table
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error(`Error counting ${table}:`, error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ table, count }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'list_tables') {
      // List counts for all main tables
      const tables = [
        'barbershops', 'profiles', 'user_roles', 'user_barbershops',
        'staff', 'staff_units', 'staff_services', 'clients', 'client_users',
        'services', 'service_categories', 'business_hours', 'special_hours', 'blocked_dates',
        'appointments', 'transactions', 'reviews',
        'whatsapp_config', 'message_templates', 'whatsapp_messages', 'whatsapp_logs',
        'campaigns', 'coupons', 'loyalty_points', 'loyalty_transactions',
        'barbershop_domains', 'payment_settings', 'role_permissions',
        'subscription_plans', 'subscriptions', 'subscription_addons', 'addon_modules',
        'waitlist', 'portfolio_photos', 'chatbot_conversations',
        'system_branding', 'global_payment_config'
      ];

      const counts: Record<string, number> = {};
      
      for (const t of tables) {
        try {
          const { count } = await supabase
            .from(t)
            .select('*', { count: 'exact', head: true });
          counts[t] = count || 0;
        } catch (e) {
          counts[t] = -1; // Error
        }
      }

      return new Response(JSON.stringify({ counts }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'delete_all') {
      // Delete all records from a table (use with caution!)
      const { error } = await supabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (error) {
        console.error(`Error deleting from ${table}:`, error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true, table, action: 'deleted_all' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action. Use: insert, count, list_tables, delete_all' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Migration helper error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
