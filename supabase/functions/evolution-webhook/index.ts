// Evolution API Webhook Handler v2.1 - Receives incoming WhatsApp messages
// Updated: 2025-12-10 - Fixed instance extraction for string format
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
    const payload = await req.json();
    
    console.log('[Evolution Webhook] Received payload:', JSON.stringify(payload, null, 2));

    // Evolution API sends different event types
    const event = payload.event;
    
    // Only process incoming messages (not sent messages)
    if (event !== 'messages.upsert') {
      console.log('[Evolution Webhook] Ignoring event:', event);
      return new Response(
        JSON.stringify({ success: true, message: 'Event ignored' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = payload.data;
    const instance = payload.instance;
    
    // Evolution API 2.0 - instance can be a string OR an object
    const instanceName = typeof instance === 'string' 
      ? instance 
      : (instance?.instanceName || payload.instanceName || payload.instance_name);
    
    console.log('[Evolution Webhook] Instance value:', instance);
    console.log('[Evolution Webhook] Extracted instanceName:', instanceName);
    
    // Get API URL and key from payload or environment
    const apiUrl = payload.server_url || payload.apiUrl || Deno.env.get('EVOLUTION_API_URL');
    const payloadApiKey = payload.apikey;

    // Extract message details from Evolution API format
    const messageData = data?.message || data;
    const key = data?.key || messageData?.key;
    
    // Skip if it's a message from the bot itself (fromMe = true)
    if (key?.fromMe === true) {
      console.log('[Evolution Webhook] Ignoring outgoing message');
      return new Response(
        JSON.stringify({ success: true, message: 'Outgoing message ignored' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get sender phone number
    const remoteJid = key?.remoteJid || data?.remoteJid;
    if (!remoteJid) {
      console.log('[Evolution Webhook] No remoteJid found');
      return new Response(
        JSON.stringify({ success: true, message: 'No sender found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract phone number from JID (format: 5511999999999@s.whatsapp.net)
    const from = remoteJid.split('@')[0];

    // Get message text - Evolution API can have different message types
    let messageText = '';
    const message = messageData?.message || messageData;
    
    if (message?.conversation) {
      messageText = message.conversation;
    } else if (message?.extendedTextMessage?.text) {
      messageText = message.extendedTextMessage.text;
    } else if (message?.imageMessage?.caption) {
      messageText = message.imageMessage.caption;
    } else if (message?.videoMessage?.caption) {
      messageText = message.videoMessage.caption;
    } else if (message?.documentMessage?.caption) {
      messageText = message.documentMessage.caption;
    } else if (typeof message === 'string') {
      messageText = message;
    }

    if (!messageText) {
      console.log('[Evolution Webhook] No text message found, might be media only');
      return new Response(
        JSON.stringify({ success: true, message: 'No text content' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Evolution Webhook] Message from ${from}: ${messageText}`);

    // Find barbershop - try multiple strategies
    let barbershopId: string | null = null;

    // Strategy 1: Extract from instance name pattern: barbershop-{uuid}
    if (instanceName?.startsWith('barbershop-')) {
      barbershopId = instanceName.replace('barbershop-', '');
      console.log('[Evolution Webhook] Found barbershop from instance name pattern:', barbershopId);
    }

    // Strategy 2: Look up by instance_name in whatsapp_config
    if (!barbershopId && instanceName) {
      const { data: configs } = await supabase
        .from('whatsapp_config')
        .select('barbershop_id, config')
        .eq('provider', 'evolution');

      const matchingConfig = configs?.find(c => c.config?.instance_name === instanceName);
      if (matchingConfig) {
        barbershopId = matchingConfig.barbershop_id;
        console.log('[Evolution Webhook] Found barbershop by instance_name config:', barbershopId);
      }
    }

    // Strategy 3: Look up by connected_phone number (most reliable)
    if (!barbershopId) {
      // The "to" number (recipient of incoming message) is the connected WhatsApp
      const ownerJid = data?.key?.participant || instance?.owner || payload.owner;
      let ownerPhone = ownerJid?.split('@')[0];
      
      // Also try to find by any config that has this webhook configured
      const { data: configs } = await supabase
        .from('whatsapp_config')
        .select('barbershop_id, config')
        .eq('provider', 'evolution')
        .eq('is_active', true);

      if (configs && configs.length > 0) {
        // If only one active Evolution config, use it
        if (configs.length === 1) {
          barbershopId = configs[0].barbershop_id;
          console.log('[Evolution Webhook] Found single active barbershop:', barbershopId);
        } else if (ownerPhone) {
          // Try to match by connected phone
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
      console.error('[Evolution Webhook] Could not determine barbershop. Instance:', instanceName, 'Payload keys:', Object.keys(payload));
      return new Response(
        JSON.stringify({ error: 'Barbershop not found for instance' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if chatbot is enabled for this barbershop
    const { data: chatbotConfig } = await supabase
      .from('whatsapp_config')
      .select('chatbot_enabled, config')
      .eq('barbershop_id', barbershopId)
      .eq('provider', 'evolution')
      .maybeSingle();

    console.log('[Evolution Webhook] Chatbot config:', JSON.stringify(chatbotConfig, null, 2));

    if (!chatbotConfig?.chatbot_enabled) {
      console.log('[Evolution Webhook] Chatbot not enabled for barbershop:', barbershopId);
      return new Response(
        JSON.stringify({ success: true, message: 'Chatbot not enabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Evolution API config from chatbot config or global
    let evolutionApiUrl = chatbotConfig?.config?.api_url || apiUrl;
    let evolutionApiKey = chatbotConfig?.config?.api_key;
    const configInstanceName = chatbotConfig?.config?.instance_name || instanceName;

    if (!evolutionApiUrl || !evolutionApiKey) {
      // Try to get from global system_config
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

    // Forward to chatbot function
    const chatbotPayload = {
      message: messageText,
      from: from,
      barbershopId: barbershopId,
      instanceName: configInstanceName,
      apiUrl: evolutionApiUrl,
      apiKey: evolutionApiKey
    };

    console.log('[Evolution Webhook] Forwarding to chatbot:', JSON.stringify(chatbotPayload, null, 2));

    // Call the chatbot function
    const chatbotResponse = await fetch(`${supabaseUrl}/functions/v1/whatsapp-chatbot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`
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
