import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Initialize Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { to, message, type = 'text', barbershopId, recipientName, appointmentId, campaignId, createdBy } = await req.json();

    console.log('Received WhatsApp request:', { to, type, barbershopId });

    const WHATSAPP_TOKEN = Deno.env.get('WHATSAPP_API_TOKEN');
    const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');

    if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
      throw new Error('WhatsApp credentials not configured');
    }

    // Remove non-numeric characters from phone number
    const phoneNumber = to.replace(/\D/g, '');

    // Prepare message payload
    const payload: any = {
      messaging_product: 'whatsapp',
      to: phoneNumber,
      type: type,
    };

    if (type === 'text') {
      payload.text = { body: message };
    } else if (type === 'template') {
      // For template messages
      payload.template = message;
    }

    console.log('Sending WhatsApp message:', { to: phoneNumber, type });

    // Send message via WhatsApp Business API
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    const responseData = await response.json();

    if (!response.ok) {
      console.error('WhatsApp API error:', responseData);
      throw new Error(responseData.error?.message || 'Failed to send WhatsApp message');
    }

    console.log('WhatsApp message sent successfully:', responseData);

    // Save log to database
    if (barbershopId) {
      const logData = {
        barbershop_id: barbershopId,
        recipient_phone: phoneNumber,
        recipient_name: recipientName || null,
        message_type: type,
        message_content: message,
        status: 'sent',
        whatsapp_message_id: responseData.messages?.[0]?.id || null,
        appointment_id: appointmentId || null,
        campaign_id: campaignId || null,
        created_by: createdBy || null,
      };

      const { error: logError } = await supabase
        .from('whatsapp_logs')
        .insert(logData);

      if (logError) {
        console.error('Failed to save WhatsApp log:', logError);
      } else {
        console.log('WhatsApp log saved successfully');
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: responseData.messages?.[0]?.id,
        data: responseData 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in send-whatsapp function:', error);

    // Save failed log to database
    if (barbershopId) {
      const logData = {
        barbershop_id: barbershopId,
        recipient_phone: to?.replace(/\D/g, '') || 'unknown',
        recipient_name: recipientName || null,
        message_type: type,
        message_content: message || '',
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        appointment_id: appointmentId || null,
        campaign_id: campaignId || null,
        created_by: createdBy || null,
      };

      await supabase.from('whatsapp_logs').insert(logData).catch(console.error);
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
