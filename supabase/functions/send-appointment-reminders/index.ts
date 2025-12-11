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

    const now = new Date();
    
    // Buscar agendamentos que precisam de lembrete
    // Vamos buscar agendamentos pendentes que ainda não receberam lembrete
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('*, client_id')
      .eq('status', 'pendente')
      .is('reminder_sent', null)
      .gte('appointment_date', now.toISOString().split('T')[0]);

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

    console.log(`📋 ${appointments.length} agendamentos encontrados para verificar`);

    // Filtrar agendamentos que devem receber lembrete com base no horário de antecedência do cliente
    const appointmentsToRemind: any[] = [];
    
    for (const appointment of appointments) {
      // Calcular horário do agendamento
      const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
      const hoursUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      // Verificar preferências do cliente
      let reminderHours = 24; // Padrão: 24 horas
      let shouldSendReminder = true;
      
      if (appointment.client_id) {
        const { data: clientData } = await supabase
          .from('clients')
          .select('notification_enabled, notification_types, reminder_hours')
          .eq('id', appointment.client_id)
          .maybeSingle();
        
        if (clientData) {
          // Verificar se cliente deseja receber notificações
          if (!clientData.notification_enabled) {
            console.log(`⚠️ Cliente ${appointment.client_name} não deseja receber notificações`);
            shouldSendReminder = false;
            continue;
          }
          
          // Verificar se quer receber lembretes
          const notificationTypes = clientData.notification_types as Record<string, boolean> | null;
          if (notificationTypes && !notificationTypes.appointment_reminder) {
            console.log(`⚠️ Cliente ${appointment.client_name} não deseja receber lembretes`);
            shouldSendReminder = false;
            continue;
          }
          
          // Usar o tempo de antecedência configurado pelo cliente
          reminderHours = clientData.reminder_hours || 24;
        }
      }
      
      // Verificar se está no momento certo para enviar (dentro de 1 hora da janela configurada)
      const shouldSendNow = hoursUntilAppointment <= reminderHours && hoursUntilAppointment >= (reminderHours - 1);
      
      // Também enviar se já passou do horário de lembrete mas ainda não foi enviado
      const isOverdue = hoursUntilAppointment < reminderHours && hoursUntilAppointment > 0;
      
      if (shouldSendReminder && (shouldSendNow || isOverdue)) {
        appointmentsToRemind.push({
          ...appointment,
          reminderHours
        });
      }
    }

    console.log(`📋 ${appointmentsToRemind.length} agendamentos elegíveis para lembrete agora`);

    if (appointmentsToRemind.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Nenhum agendamento no momento de envio de lembrete',
        sent: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Group appointments by barbershop
    const appointmentsByBarbershop = appointmentsToRemind.reduce((acc: Record<string, any[]>, apt) => {
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

          // Build reminder message based on time until appointment
          const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
          const hoursUntil = Math.round((appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60));
          
          let timeLabel = '';
          if (hoursUntil <= 2) {
            timeLabel = 'em breve';
          } else if (hoursUntil <= 6) {
            timeLabel = `em ${hoursUntil} horas`;
          } else if (hoursUntil <= 24) {
            timeLabel = 'amanhã';
          } else {
            timeLabel = `em ${Math.round(hoursUntil / 24)} dia(s)`;
          }

          const message = `Olá ${appointment.client_name}! 👋

🔔 Lembrete: Você tem um agendamento ${timeLabel}!

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
            console.log(`✅ Lembrete enviado para ${appointment.client_name} (${appointment.reminderHours}h de antecedência)`);
            
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
      total: appointmentsToRemind.length
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
