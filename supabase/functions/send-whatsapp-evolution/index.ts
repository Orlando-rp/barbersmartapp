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
      instanceToken, // Token específico para a instância
      phoneNumber,   // Número do telefone (opcional)
      to, 
      message,
      originalMessage, // Mensagem original sem formatação (para armazenamento)
      barbershopId, 
      recipientName, 
      createdBy,
      sentByUserId,
      sentByName
    } = await req.json();

    console.log(`[Evolution API] Action: ${action}, Instance: ${instanceName || 'N/A'}`);

    // Use provided credentials or fall back to env vars
    const evolutionApiUrl = apiUrl || Deno.env.get('EVOLUTION_API_URL');
    const evolutionApiKey = apiKey || Deno.env.get('EVOLUTION_API_KEY');

    if (!evolutionApiUrl) {
      console.error('[Evolution API] URL not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Evolution API URL não configurada' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Remove trailing slash from URL
    const baseUrl = evolutionApiUrl.replace(/\/+$/, '');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (evolutionApiKey) {
      headers['apikey'] = evolutionApiKey;
    }

    let endpoint = '';
    let method = 'GET';
    let body: string | undefined = undefined;

    switch (action) {
      case 'checkApi':
      case 'checkServer':
        // Check if API is online
        endpoint = '/';
        method = 'GET';
        break;

      case 'createInstance': {
        // Create new instance with webhook configured
        endpoint = '/instance/create';
        method = 'POST';
        const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
        const webhookUrl = `${supabaseUrl}/functions/v1/evolution-webhook`;
        console.log(`[Evolution API] Creating instance with webhook: ${webhookUrl}`);
        
        const createPayload: any = {
          instanceName,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
          webhook: {
            url: webhookUrl,
            byEvents: false,
            base64: false,
            headers: {},
            events: ['MESSAGES_UPSERT']
          }
        };
        
        // Adicionar token se fornecido
        if (instanceToken) {
          createPayload.token = instanceToken;
        }
        
        // Adicionar número se fornecido (para pairing code)
        if (phoneNumber) {
          createPayload.number = phoneNumber;
        }
        
        body = JSON.stringify(createPayload);
        break;
      }

      case 'connect': {
        // Get QR code for connection - first try to create instance with webhook, then get QR
        console.log(`[Evolution API] Getting QR code for instance: ${instanceName}`);
        
        const supabaseUrlConnect = Deno.env.get('SUPABASE_URL') || '';
        const webhookUrlConnect = `${supabaseUrlConnect}/functions/v1/evolution-webhook`;
        
        // Preparar payload de criação
        const connectPayload: any = {
          instanceName,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
          webhook: {
            url: webhookUrlConnect,
            byEvents: false,
            base64: false,
            headers: {},
            events: ['MESSAGES_UPSERT']
          }
        };
        
        // Adicionar token se fornecido
        if (instanceToken) {
          connectPayload.token = instanceToken;
        }
        
        // Adicionar número se fornecido
        if (phoneNumber) {
          connectPayload.number = phoneNumber;
        }
        
        // Try to create instance first with webhook (will fail if exists, that's ok)
        try {
          const createRes = await fetch(`${baseUrl}/instance/create`, {
            method: 'POST',
            headers,
            body: JSON.stringify(connectPayload)
          });
          const createData = await createRes.text();
          console.log(`[Evolution API] Create instance response: ${createData.substring(0, 500)}`);
        } catch (e) {
          console.log(`[Evolution API] Instance may already exist: ${e}`);
        }

        // Now get the QR code
        endpoint = `/instance/connect/${instanceName}`;
        method = 'GET';
        break;
      }

      case 'connectionState':
        // Check connection status
        endpoint = `/instance/connectionState/${instanceName}`;
        method = 'GET';
        break;

      case 'instanceInfo':
        // Get instance info including connected phone number
        endpoint = `/instance/fetchInstances?instanceName=${instanceName}`;
        method = 'GET';
        break;

      case 'fetchInstances':
        // List all instances
        endpoint = '/instance/fetchInstances';
        method = 'GET';
        break;

      case 'logout':
        // Disconnect instance (just logout, keeps instance)
        endpoint = `/instance/logout/${instanceName}`;
        method = 'DELETE';
        break;

      case 'deleteInstance':
        // Delete instance completely from Evolution API
        console.log(`[Evolution API] Deleting instance: ${instanceName}`);
        endpoint = `/instance/delete/${instanceName}`;
        method = 'DELETE';
        break;

      case 'restart':
        // Restart instance
        endpoint = `/instance/restart/${instanceName}`;
        method = 'PUT';
        break;

      case 'sendText':
        // Send text message
        endpoint = `/message/sendText/${instanceName}`;
        method = 'POST';
        
        // Format phone number - ensure it has country code
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
        console.error(`[Evolution API] Unknown action: ${action}`);
        return new Response(
          JSON.stringify({ success: false, error: `Ação desconhecida: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    const fullUrl = `${baseUrl}${endpoint}`;
    console.log(`[Evolution API] Request: ${method} ${fullUrl}`);

    const response = await fetch(fullUrl, {
      method,
      headers,
      body
    });

    const responseText = await response.text();
    console.log(`[Evolution API] Response status: ${response.status}`);
    console.log(`[Evolution API] Response body: ${responseText.substring(0, 500)}`);

    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { raw: responseText };
    }

    // If sending message, log to database
    if (action === 'sendText' && barbershopId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Log to whatsapp_logs (existing behavior)
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
          console.error('[Evolution API] Error logging message:', logError);
        }

        // Also store in whatsapp_messages for chat UI
        if (response.ok) {
          const phoneNumber = to?.replace(/\D/g, '');
          const { error: msgError } = await supabase
            .from('whatsapp_messages')
            .insert({
              barbershop_id: barbershopId,
              phone_number: phoneNumber,
              contact_name: recipientName || null,
              message: originalMessage || message, // Use original message if provided
              direction: 'outgoing',
              status: 'sent',
              message_type: 'text',
              sent_by_user_id: sentByUserId || null,
              sent_by_name: sentByName || null,
              metadata: {
                message_id: data?.key?.id || data?.id
              }
            });

          if (msgError) {
            console.error('[Evolution API] Error storing message for chat:', msgError);
          } else {
            console.log('[Evolution API] Message stored for chat UI');
          }
        }
      } catch (logErr) {
        console.error('[Evolution API] Failed to log message:', logErr);
      }
    }

    if (!response.ok) {
      // Handle 404 for connectionState - instance doesn't exist yet
      if (response.status === 404 && action === 'connectionState') {
        return new Response(
          JSON.stringify({ 
            success: true, 
            state: 'close',
            instance: { state: 'close' },
            message: 'Instância não existe'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: data?.error || data?.message || `Erro na Evolution API (${response.status})`,
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
    console.error('[Evolution API] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
