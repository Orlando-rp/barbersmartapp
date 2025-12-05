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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔔 Iniciando envio de lembretes de agendamento...');

    // Calculate time window: appointments between 23 and 25 hours from now
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const windowStart = new Date(tomorrow.getTime() - 60 * 60 * 1000); // 23h from now
    const windowEnd = new Date(tomorrow.getTime() + 60 * 60 * 1000); // 25h from now

    const tomorrowDate = tomorrow.toISOString().split('T')[0];
    
    console.log(`📅 Buscando agendamentos para: ${tomorrowDate}`);

    // Get all appointments for tomorrow that haven't been reminded yet
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('*')
      .eq('appointment_date', tomorrowDate)
      .eq('status', 'scheduled')
      .is('reminder_sent', null);

    if (appointmentsError) {
      console.error('Erro ao buscar agendamentos:', appointmentsError);
      throw appointmentsError;
    }

    if (!appointments || appointments.length === 0) {
      console.log('✅ Nenhum agendamento pendente de lembrete');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Nenhum agendamento pendente de lembrete',
        sent: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`📋 ${appointments.length} agendamentos encontrados`);

    // Group appointments by barbershop
    const appointmentsByBarbershop = appointments.reduce((acc: Record<string, any[]>, apt) => {
      if (!acc[apt.barbershop_id]) {
        acc[apt.barbershop_id] = [];
      }
      acc[apt.barbershop_id].push(apt);
      return acc;
    }, {});

    let totalSent = 0;
    let totalFailed = 0;

    // Process each barbershop
    for (const [barbershopId, barbershopAppointments] of Object.entries(appointmentsByBarbershop)) {
      console.log(`🏪 Processando barbearia ${barbershopId}: ${barbershopAppointments.length} agendamentos`);

      // Get WhatsApp Evolution config for this barbershop
      const { data: whatsappConfig, error: configError } = await supabase
        .from('whatsapp_config')
        .select('config, is_active')
        .eq('barbershop_id', barbershopId)
        .eq('provider', 'evolution')
        .maybeSingle();

      if (configError || !whatsappConfig?.is_active || !whatsappConfig?.config) {
        console.log(`⚠️ WhatsApp não configurado para barbearia ${barbershopId}, pulando...`);
        continue;
      }

      const evolutionConfig = whatsappConfig.config as {
        api_url: string;
        api_key: string;
        instance_name: string;
      };

      // Send reminder for each appointment
      for (const appointment of barbershopAppointments as any[]) {
        try {
          if (!appointment.client_phone) {
            console.log(`⚠️ Agendamento ${appointment.id} sem telefone, pulando...`);
            continue;
          }

          // Format date
          const appointmentDate = new Date(appointment.appointment_date);
          const formattedDate = appointmentDate.toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });

          // Build reminder message
          const message = `Olá ${appointment.client_name}! 👋

🔔 Lembrete: Você tem um agendamento amanhã!

📅 Data: ${formattedDate}
⏰ Horário: ${appointment.appointment_time}
✂️ Serviço: ${appointment.service_name || 'Não especificado'}

Aguardamos você! 💈

Caso precise reagendar, entre em contato conosco.`;

          // Format phone number
          let phoneNumber = appointment.client_phone.replace(/\D/g, '');
          if (!phoneNumber.startsWith('55') && phoneNumber.length <= 11) {
            phoneNumber = '55' + phoneNumber;
          }

          // Send via Evolution API
          const apiUrl = evolutionConfig.api_url.replace(/\/$/, '');
          const response = await fetch(`${apiUrl}/message/sendText/${evolutionConfig.instance_name}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': evolutionConfig.api_key
            },
            body: JSON.stringify({
              number: phoneNumber,
              text: message
            })
          });

          const responseData = await response.json();

          if (response.ok) {
            console.log(`✅ Lembrete enviado para ${appointment.client_name}`);
            
            // Mark appointment as reminded
            await supabase
              .from('appointments')
              .update({ reminder_sent: new Date().toISOString() })
              .eq('id', appointment.id);

            // Log the message
            await supabase.from('whatsapp_logs').insert({
              barbershop_id: barbershopId,
              recipient_phone: phoneNumber,
              recipient_name: appointment.client_name,
              message_content: message,
              message_type: 'reminder',
              status: 'sent',
              provider: 'evolution',
              appointment_id: appointment.id,
              response_data: responseData
            });

            totalSent++;
          } else {
            console.error(`❌ Falha ao enviar para ${appointment.client_name}:`, responseData);
            
            // Log the failure
            await supabase.from('whatsapp_logs').insert({
              barbershop_id: barbershopId,
              recipient_phone: phoneNumber,
              recipient_name: appointment.client_name,
              message_content: message,
              message_type: 'reminder',
              status: 'failed',
              provider: 'evolution',
              appointment_id: appointment.id,
              error_message: JSON.stringify(responseData)
            });

            totalFailed++;
          }
        } catch (sendError) {
          console.error(`❌ Erro ao processar agendamento ${appointment.id}:`, sendError);
          totalFailed++;
        }
      }
    }

    const result = {
      success: true,
      message: `Lembretes processados`,
      sent: totalSent,
      failed: totalFailed,
      total: appointments.length
    };

    console.log('📊 Resultado:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Erro geral:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
