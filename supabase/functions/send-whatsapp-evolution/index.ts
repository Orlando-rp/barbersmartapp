// Evolution API WhatsApp integration - v3.0 - Simplified for external Supabase
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to get Supabase client - uses standard env vars
function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  console.log('[Evolution API] Using Supabase:', supabaseUrl);
  return createClient(supabaseUrl, supabaseKey);
}

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
      instanceToken,
      phoneNumber,
      to, 
      message,
      originalMessage,
      barbershopId, 
      recipientName, 
      createdBy,
      sentByUserId,
      sentByName
    } = await req.json();

    console.log(`[Evolution API v3.0] Action received: "${action}", Instance: ${instanceName || 'N/A'}`);

    const evolutionApiUrl = apiUrl || Deno.env.get('EVOLUTION_API_URL');
    const evolutionApiKey = apiKey || Deno.env.get('EVOLUTION_API_KEY');

    if (!evolutionApiUrl) {
      console.error('[Evolution API] URL not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Evolution API URL não configurada' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // Get webhook URL from SUPABASE_URL
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const webhookUrl = `${supabaseUrl}/functions/v1/evolution-webhook`;

    switch (action) {
      case 'checkApi':
      case 'checkServer':
        endpoint = '/';
        method = 'GET';
        break;

      case 'createInstance': {
        endpoint = '/instance/create';
        method = 'POST';
        console.log(`[Evolution API] Creating instance with webhook: ${webhookUrl}`);
        
        const createPayload: any = {
          instanceName,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
          webhook: {
            enabled: true,
            url: webhookUrl,
            byEvents: false,
            base64: false,
            events: [
              'MESSAGES_UPSERT',
              'MESSAGES_UPDATE',
              'MESSAGES_DELETE',
              'SEND_MESSAGE',
              'CONNECTION_UPDATE',
              'QRCODE_UPDATED'
            ]
          },
          websocket: false,
          rabbitmq: false,
          sqs: false,
          chatwoot: false
        };
        
        if (instanceToken) {
          createPayload.token = instanceToken;
        }
        
        if (phoneNumber) {
          createPayload.number = phoneNumber;
        }
        
        body = JSON.stringify(createPayload);
        console.log('[Evolution API] Create payload:', body);
        break;
      }

      case 'connect': {
        console.log(`[Evolution API] Getting QR code for instance: ${instanceName}`);
        
        const connectPayload: any = {
          instanceName,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
          webhook: {
            enabled: true,
            url: webhookUrl,
            byEvents: false,
            base64: false,
            events: [
              'MESSAGES_UPSERT',
              'MESSAGES_UPDATE',
              'MESSAGES_DELETE',
              'SEND_MESSAGE',
              'CONNECTION_UPDATE',
              'QRCODE_UPDATED'
            ]
          },
          websocket: false,
          rabbitmq: false,
          sqs: false,
          chatwoot: false
        };
        
        if (instanceToken) {
          connectPayload.token = instanceToken;
        }
        
        if (phoneNumber) {
          connectPayload.number = phoneNumber;
        }
        
        try {
          console.log('[Evolution API] Attempting to create/update instance with webhook config');
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

        endpoint = `/instance/connect/${instanceName}`;
        method = 'GET';
        break;
      }

      case 'connectionState':
        endpoint = `/instance/connectionState/${instanceName}`;
        method = 'GET';
        break;

      case 'instanceInfo':
        endpoint = `/instance/fetchInstances?instanceName=${instanceName}`;
        method = 'GET';
        break;

      case 'fetchInstances':
        endpoint = '/instance/fetchInstances';
        method = 'GET';
        break;

      case 'logout':
        endpoint = `/instance/logout/${instanceName}`;
        method = 'DELETE';
        break;

      case 'deleteInstance':
        console.log(`[Evolution API] Deleting instance: ${instanceName}`);
        endpoint = `/instance/delete/${instanceName}`;
        method = 'DELETE';
        break;

      case 'restart':
        endpoint = `/instance/restart/${instanceName}`;
        method = 'PUT';
        break;

      case 'getWebhook': {
        endpoint = `/webhook/find/${instanceName}`;
        method = 'GET';
        console.log('[Evolution API] Getting webhook config for:', instanceName);
        break;
      }

      case 'setWebhook': {
        endpoint = `/webhook/set/${instanceName}`;
        method = 'POST';
        
        body = JSON.stringify({
          webhook: {
            enabled: true,
            url: webhookUrl,
            webhookByEvents: false,
            webhookBase64: false,
            events: [
              'MESSAGES_UPSERT',
              'MESSAGES_UPDATE',
              'MESSAGES_DELETE',
              'SEND_MESSAGE',
              'CONNECTION_UPDATE',
              'QRCODE_UPDATED'
            ]
          }
        });
        console.log('[Evolution API] Setting webhook:', body);
        console.log('[Evolution API] Webhook URL:', webhookUrl);
        break;
      }

      case 'sendText':
        endpoint = `/message/sendText/${instanceName}`;
        method = 'POST';
        
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
      console.log('[Evolution API] Attempting to log message. BarbershopId:', barbershopId, 'To:', to);
      
      try {
        const supabase = getSupabaseClient();

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

        console.log('[Evolution API] Log entry:', JSON.stringify(logEntry, null, 2));

        const { error: logError } = await supabase
          .from('whatsapp_logs')
          .insert(logEntry);

        if (logError) {
          console.error('[Evolution API] Error logging message:', logError);
        } else {
          console.log('[Evolution API] Message logged to whatsapp_logs');
        }

        const phoneNumber = to?.replace(/\D/g, '');
        const chatMessage = {
          barbershop_id: barbershopId,
          phone_number: phoneNumber,
          contact_name: recipientName || null,
          message: originalMessage || message,
          direction: 'outgoing',
          status: response.ok ? 'sent' : 'failed',
          message_type: 'text',
          sent_by_user_id: sentByUserId || null,
          sent_by_name: sentByName || null,
          metadata: {
            message_id: data?.key?.id || data?.id,
            api_response_ok: response.ok
          }
        };

        console.log('[Evolution API] Chat message entry:', JSON.stringify(chatMessage, null, 2));

        const { data: insertedMsg, error: msgError } = await supabase
          .from('whatsapp_messages')
          .insert(chatMessage)
          .select()
          .single();

        if (msgError) {
          console.error('[Evolution API] Error storing message for chat:', JSON.stringify(msgError, null, 2));
        } else {
          console.log('[Evolution API] Message stored for chat UI:', insertedMsg?.id);
        }
      } catch (logErr) {
        console.error('[Evolution API] Failed to log message:', logErr);
      }
    }

    if (!response.ok) {
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
