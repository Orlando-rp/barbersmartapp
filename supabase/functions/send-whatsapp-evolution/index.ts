import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      action, 
      apiUrl, 
      apiKey, 
      instanceName, 
      to, 
      message, 
      barbershopId, 
      recipientName, 
      createdBy 
    } = await req.json();

    console.log(`Evolution API action: ${action}, instance: ${instanceName}`);

    // Use provided credentials or fall back to env vars
    const evolutionApiUrl = apiUrl || Deno.env.get('EVOLUTION_API_URL');
    const evolutionApiKey = apiKey || Deno.env.get('EVOLUTION_API_KEY');

    if (!evolutionApiUrl) {
      console.error('Evolution API URL not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Evolution API URL não configurada' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (evolutionApiKey) {
      headers['apikey'] = evolutionApiKey;
    }

    let endpoint = '';
    let method = 'GET';
    let body: any = undefined;

    switch (action) {
      case 'checkApi':
        // Check if API is online
        endpoint = '/';
        method = 'GET';
        break;

      case 'createInstance':
        // Create new instance
        endpoint = '/instance/create';
        method = 'POST';
        body = JSON.stringify({
          instanceName,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS'
        });
        break;

      case 'connect':
        // Get QR code for connection
        endpoint = `/instance/connect/${instanceName}`;
        method = 'GET';
        break;

      case 'connectionState':
        // Check connection status
        endpoint = `/instance/connectionState/${instanceName}`;
        method = 'GET';
        break;

      case 'logout':
        // Disconnect instance
        endpoint = `/instance/logout/${instanceName}`;
        method = 'DELETE';
        break;

      case 'sendText':
        // Send text message
        endpoint = `/message/sendText/${instanceName}`;
        method = 'POST';
        
        // Format phone number
        let formattedPhone = to.replace(/\D/g, '');
        if (!formattedPhone.startsWith('55') && formattedPhone.length <= 11) {
          formattedPhone = '55' + formattedPhone;
        }
        
        body = JSON.stringify({
          number: formattedPhone,
          text: message
        });
        break;

      default:
        return new Response(
          JSON.stringify({ success: false, error: `Ação desconhecida: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    console.log(`Making request to: ${evolutionApiUrl}${endpoint}`);

    const response = await fetch(`${evolutionApiUrl}${endpoint}`, {
      method,
      headers,
      body
    });

    const responseText = await response.text();
    console.log(`Response status: ${response.status}, body: ${responseText.substring(0, 500)}`);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { raw: responseText };
    }

    // If sending message, log to database
    if (action === 'sendText' && barbershopId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const logEntry = {
        barbershop_id: barbershopId,
        recipient_phone: to,
        recipient_name: recipientName || null,
        message_content: message,
        status: response.ok ? 'sent' : 'failed',
        error_message: response.ok ? null : (data?.error || data?.message || 'Erro desconhecido'),
        provider: 'evolution',
        created_by: createdBy || null
      };

      const { error: logError } = await supabase
        .from('whatsapp_logs')
        .insert(logEntry);

      if (logError) {
        console.error('Error logging message:', logError);
      }
    }

    if (!response.ok) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: data?.error || data?.message || 'Erro na Evolution API',
          details: data
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, ...data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-whatsapp-evolution function:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
