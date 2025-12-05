import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    // Update all waitlist entries where preferred_date is in the past and status is 'waiting' or 'notified'
    const { data, error, count } = await supabase
      .from("waitlist")
      .update({ 
        status: "expired",
        updated_at: new Date().toISOString()
      })
      .lt("preferred_date", today)
      .in("status", ["waiting", "notified"])
      .select();

    if (error) {
      console.error("Error expiring waitlist entries:", error);
      throw error;
    }

    const expiredCount = data?.length || 0;
    console.log(`Expired ${expiredCount} waitlist entries`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        expired_count: expiredCount,
        message: `${expiredCount} entradas expiradas automaticamente`
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
  } catch (error) {
    console.error("Error in expire-waitlist function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});
