// Cleanup WhatsApp Messages - Auto-delete messages older than 7 days
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

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('[Cleanup WhatsApp] Starting cleanup of messages older than 7 days');

    // Calculate date 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoffDate = sevenDaysAgo.toISOString();

    console.log('[Cleanup WhatsApp] Cutoff date:', cutoffDate);

    // Delete messages older than 7 days
    const { data, error, count } = await supabase
      .from('whatsapp_messages')
      .delete()
      .lt('created_at', cutoffDate)
      .select('id');

    if (error) {
      console.error('[Cleanup WhatsApp] Error deleting messages:', error);
      throw error;
    }

    const deletedCount = data?.length || 0;
    console.log(`[Cleanup WhatsApp] Successfully deleted ${deletedCount} messages`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        deletedCount,
        cutoffDate,
        message: `Deleted ${deletedCount} messages older than 7 days`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Cleanup WhatsApp] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
