// Evolution API Webhook Handler v3.0 - Simplified for external Supabase
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
  console.log('[Evolution Webhook] Using Supabase:', supabaseUrl);
  return createClient(supabaseUrl, supabaseKey);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = getSupabaseClient();
  
  // Use same Supabase URL for calling chatbot function
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  try {
    const payload = await req.json();
    
    console.log('[Evolution Webhook] Received payload:', JSON.stringify(payload, null, 2));

    const eventRaw = payload.event || '';
    const eventNormalized = eventRaw.toLowerCase().replace(/[_-]/g, '.');
    
    console.log('[Evolution Webhook] Event raw:', eventRaw, '| Normalized:', eventNormalized);
    
    const isMessageEvent = eventNormalized === 'messages.upsert';
    
    if (!isMessageEvent) {
      console.log('[Evolution Webhook] Ignoring event:', eventRaw);
      return new Response(
        JSON.stringify({ success: true, message: 'Event ignored' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let data = payload.data;
    if (Array.isArray(data)) {
      data = data[0];
      console.log('[Evolution Webhook] Data was array, using first element');
    }
    
    const instance = payload.instance;
    
    const instanceName = typeof instance === 'string' 
      ? instance 
      : (instance?.instanceName || payload.instanceName || payload.instance_name || instance?.instance?.instanceName);
    
    console.log('[Evolution Webhook] Instance value:', instance);
    console.log('[Evolution Webhook] Extracted instanceName:', instanceName);
    
    const apiUrl = payload.server_url || payload.apiUrl || Deno.env.get('EVOLUTION_API_URL');
    const payloadApiKey = payload.apikey;

    const messageData = data?.message || data;
    const key = data?.key || messageData?.key;
    
    if (key?.fromMe === true) {
      console.log('[Evolution Webhook] Ignoring outgoing message (fromMe)');
      return new Response(
        JSON.stringify({ success: true, message: 'Outgoing message ignored' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const remoteJid = key?.remoteJid || data?.remoteJid;
    if (!remoteJid) {
      console.log('[Evolution Webhook] No remoteJid found');
      return new Response(
        JSON.stringify({ success: true, message: 'No sender found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const from = remoteJid.split('@')[0];

    let messageText = '';
    let messageType = 'text';
    const message = messageData?.message || messageData;
    
    if (message?.conversation) {
      messageText = message.conversation;
    } else if (message?.extendedTextMessage?.text) {
      messageText = message.extendedTextMessage.text;
    } else if (message?.imageMessage?.caption) {
      messageText = message.imageMessage.caption;
      messageType = 'image';
    } else if (message?.videoMessage?.caption) {
      messageText = message.videoMessage.caption;
      messageType = 'video';
    } else if (message?.documentMessage?.caption) {
      messageText = message.documentMessage.caption;
      messageType = 'document';
    } else if (message?.audioMessage) {
      messageText = '[Áudio]';
      messageType = 'audio';
    } else if (typeof message === 'string') {
      messageText = message;
    }

    const contactName = data?.pushName || payload.pushName || null;

    console.log(`[Evolution Webhook] Message from ${from} (${contactName}): ${messageText}`);

    // Find barbershop
    let barbershopId: string | null = null;

    if (instanceName?.startsWith('barbershop-')) {
      barbershopId = instanceName.replace('barbershop-', '');
      console.log('[Evolution Webhook] Found barbershop from instance name pattern:', barbershopId);
    }

    if (!barbershopId && instanceName) {
      const { data: configs, error: configError } = await supabase
        .from('whatsapp_config')
        .select('barbershop_id, config')
        .eq('provider', 'evolution');

      if (configError) {
        console.error('[Evolution Webhook] Error fetching configs:', configError);
      } else {
        console.log('[Evolution Webhook] Found configs:', configs?.length, 'Looking for instance:', instanceName);
        
        let matchingConfig = configs?.find(c => c.config?.instance_name === instanceName);
        
        if (!matchingConfig && instanceName.startsWith('bs-')) {
          const shortId = instanceName.replace('bs-', '');
          matchingConfig = configs?.find(c => c.barbershop_id?.startsWith(shortId));
          if (matchingConfig) {
            console.log('[Evolution Webhook] Found barbershop by shortId prefix:', shortId);
          }
        }
        
        if (matchingConfig) {
          barbershopId = matchingConfig.barbershop_id;
          console.log('[Evolution Webhook] Found barbershop by config:', barbershopId);
        }
      }
    }

    if (!barbershopId) {
      const ownerJid = data?.key?.participant || instance?.owner || payload.owner;
      let ownerPhone = ownerJid?.split('@')[0];
      
      const { data: configs } = await supabase
        .from('whatsapp_config')
        .select('barbershop_id, config')
        .eq('provider', 'evolution')
        .eq('is_active', true);

      if (configs && configs.length > 0) {
        if (configs.length === 1) {
          barbershopId = configs[0].barbershop_id;
          console.log('[Evolution Webhook] Found single active barbershop:', barbershopId);
        } else if (ownerPhone) {
          const matchingConfig = configs.find(c => 
            c.config?.connected_phone?.includes(ownerPhone) ||
            ownerPhone.includes(c.config?.connected_phone)
          );
          if (matchingConfig) {
            barbershopId = matchingConfig.barbershop_id;
            console.log('[Evolution Webhook] Found barbershop by connected_phone:', barbershopId);
          }
        }
      }
    }

    if (!barbershopId) {
      console.error('[Evolution Webhook] Could not determine barbershop. Instance:', instanceName);
      return new Response(
        JSON.stringify({ error: 'Barbershop not found for instance' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store incoming message
    if (messageText) {
      console.log('[Evolution Webhook] Storing incoming message for chat UI');
      const { error: msgError } = await supabase
        .from('whatsapp_messages')
        .insert({
          barbershop_id: barbershopId,
          phone_number: from,
          contact_name: contactName,
          message: messageText,
          direction: 'incoming',
          message_type: messageType,
          status: 'sent',
          metadata: {
            instance_name: instanceName,
            message_id: key?.id
          }
        });
      
      if (msgError) {
        console.error('[Evolution Webhook] Error storing message:', msgError);
      } else {
        console.log('[Evolution Webhook] Message stored successfully');
      }
    }

    // Check chatbot - chatbot_enabled is stored in config JSONB
    const { data: chatbotConfig } = await supabase
      .from('whatsapp_config')
      .select('config')
      .eq('barbershop_id', barbershopId)
      .eq('provider', 'evolution')
      .maybeSingle();

    console.log('[Evolution Webhook] Chatbot config:', JSON.stringify(chatbotConfig, null, 2));

    const isChatbotEnabled = chatbotConfig?.config?.chatbot_enabled === true;
    
    if (!isChatbotEnabled) {
      console.log('[Evolution Webhook] Chatbot not enabled for barbershop:', barbershopId);
      return new Response(
        JSON.stringify({ success: true, message: 'Message stored, chatbot not enabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!messageText) {
      console.log('[Evolution Webhook] No text message found');
      return new Response(
        JSON.stringify({ success: true, message: 'No text content for chatbot' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Evolution API config
    let evolutionApiUrl = chatbotConfig?.config?.api_url || apiUrl;
    let evolutionApiKey = chatbotConfig?.config?.api_key;
    const configInstanceName = chatbotConfig?.config?.instance_name || instanceName;

    if (!evolutionApiUrl || !evolutionApiKey) {
      const { data: globalConfig } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'evolution_api')
        .maybeSingle();
      
      if (globalConfig?.value) {
        evolutionApiUrl = evolutionApiUrl || globalConfig.value.api_url;
        evolutionApiKey = evolutionApiKey || globalConfig.value.api_key;
      }
    }

    console.log('[Evolution Webhook] API URL:', evolutionApiUrl);
    console.log('[Evolution Webhook] Instance:', configInstanceName);

    // Forward to chatbot
    const chatbotPayload = {
      message: messageText,
      from: from,
      barbershopId: barbershopId,
      instanceName: configInstanceName,
      apiUrl: evolutionApiUrl,
      apiKey: evolutionApiKey
    };

    console.log('[Evolution Webhook] Forwarding to chatbot:', JSON.stringify(chatbotPayload, null, 2));

    // Call chatbot function using same Supabase URL
    const chatbotResponse = await fetch(`${supabaseUrl}/functions/v1/whatsapp-chatbot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify(chatbotPayload)
    });

    const chatbotResult = await chatbotResponse.json();
    console.log('[Evolution Webhook] Chatbot response:', JSON.stringify(chatbotResult, null, 2));

    return new Response(
      JSON.stringify({ 
        success: true, 
        chatbotResponse: chatbotResult 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Evolution Webhook] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
