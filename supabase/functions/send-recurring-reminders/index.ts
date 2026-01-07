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

    console.log('🔔 Iniciando envio de lembretes de agendamentos recorrentes da semana...');

    const now = new Date();
    
    // Calculate the start and end of the current week (Monday to Sunday)
    const dayOfWeek = now.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7 || 7;
    
    // Get the start of next week (Monday) for weekly reminder
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() + daysUntilMonday);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    console.log(`📅 Buscando agendamentos recorrentes de ${startOfWeek.toISOString().split('T')[0]} a ${endOfWeek.toISOString().split('T')[0]}`);

    // Fetch recurring appointments for the upcoming week
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('*')
      .eq('is_recurring', true)
      .in('status', ['pendente', 'confirmado'])
      .gte('appointment_date', startOfWeek.toISOString().split('T')[0])
      .lte('appointment_date', endOfWeek.toISOString().split('T')[0])
      .order('appointment_date', { ascending: true });

    if (appointmentsError) {
      console.error('Erro ao buscar agendamentos:', appointmentsError);
      throw appointmentsError;
    }

    if (!appointments || appointments.length === 0) {
      console.log('✅ Nenhum agendamento recorrente para a próxima semana');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Nenhum agendamento recorrente para a próxima semana',
        sent: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`📋 ${appointments.length} agendamentos recorrentes encontrados`);

    // Group appointments by client (to send consolidated weekly reminder)
    const appointmentsByClient = new Map<string, any[]>();
    
    for (const apt of appointments) {
      const clientKey = `${apt.barbershop_id}:${apt.client_phone}`;
      if (!appointmentsByClient.has(clientKey)) {
        appointmentsByClient.set(clientKey, []);
      }
      appointmentsByClient.get(clientKey)!.push(apt);
    }

    console.log(`👥 ${appointmentsByClient.size} clientes únicos para notificar`);

    let totalSent = 0;
    let totalFailed = 0;

    // Process each client
    for (const [clientKey, clientAppointments] of appointmentsByClient) {
      const barbershopId = clientAppointments[0].barbershop_id;
      const clientPhone = clientAppointments[0].client_phone;
      const clientName = clientAppointments[0].client_name;
      const clientId = clientAppointments[0].client_id;

      try {
        // Get barbershop notification settings
        const { data: barbershopData } = await supabase
          .from('barbershops')
          .select('settings, name')
          .eq('id', barbershopId)
          .single();

        const notificationConfig = barbershopData?.settings?.notification_config || {};
        const recurringReminderConfig = notificationConfig.recurring_reminder || { enabled: true };
        
        if (!recurringReminderConfig.enabled) {
          console.log(`⚠️ Lembretes recorrentes desabilitados para barbearia ${barbershopId}`);
          continue;
        }

        // Get global Evolution API config
        const { data: globalConfig } = await supabase
          .from('system_config')
          .select('value')
          .eq('key', 'evolution_api')
          .maybeSingle();

        if (!globalConfig?.value?.api_url || !globalConfig?.value?.api_key) {
          console.log(`⚠️ Evolution API global não configurada`);
          continue;
        }

        const apiUrl = globalConfig.value.api_url;
        const apiKey = globalConfig.value.api_key;

        // Get tenant's WhatsApp instance
        const { data: whatsappConfig } = await supabase
          .from('whatsapp_config')
          .select('config, is_active')
          .eq('barbershop_id', barbershopId)
          .eq('provider', 'evolution')
          .maybeSingle();

        if (!whatsappConfig?.is_active || !whatsappConfig?.config?.instance_name) {
          console.log(`⚠️ Instância WhatsApp não configurada para barbearia ${barbershopId}`);
          continue;
        }

        const instanceName = whatsappConfig.config.instance_name;

        // Check client notification preferences
        let displayName = clientName;
        if (clientId) {
          const { data: clientData } = await supabase
            .from('clients')
            .select('notification_enabled, notification_types, preferred_name')
            .eq('id', clientId)
            .maybeSingle();
          
          if (clientData) {
            if (!clientData.notification_enabled) {
              console.log(`⚠️ Cliente ${clientName} não deseja receber notificações`);
              continue;
            }
            
            const notificationTypes = clientData.notification_types as Record<string, boolean> | null;
            if (notificationTypes && notificationTypes.recurring_reminder === false) {
              console.log(`⚠️ Cliente ${clientName} não deseja receber lembretes de recorrência`);
              continue;
            }
            
            if (clientData.preferred_name) {
              displayName = clientData.preferred_name;
            }
          }
        }

        if (!clientPhone) {
          console.log(`⚠️ Cliente ${clientName} sem telefone`);
          continue;
        }

        // Build the weekly summary message
        const appointmentList = clientAppointments.map((apt, idx) => {
          const aptDate = new Date(apt.appointment_date);
          const weekday = aptDate.toLocaleDateString('pt-BR', { weekday: 'long' });
          const formattedDate = aptDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
          return `${idx + 1}. ${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${formattedDate} às ${apt.appointment_time.slice(0, 5)}
   ✂️ ${apt.service_name || 'Serviço'}`;
        }).join('\n\n');

        const barbershopName = barbershopData?.name || 'nossa barbearia';
        
        const message = `Olá ${displayName}! 👋

🔔 *Lembrete semanal dos seus agendamentos recorrentes*

Você tem ${clientAppointments.length} agendamento(s) programado(s) para a próxima semana na ${barbershopName}:

${appointmentList}

📍 Não se esqueça! Estamos te esperando. 💈

Caso precise reagendar algum horário, entre em contato conosco com antecedência.`;

        // Format phone number
        let phoneNumber = clientPhone.replace(/\D/g, '');
        if (!phoneNumber.startsWith('55') && phoneNumber.length <= 11) {
          phoneNumber = '55' + phoneNumber;
        }

        // Send via Evolution API (global server + tenant instance)
        const cleanApiUrl = apiUrl.replace(/\/$/, '');
        const response = await fetch(`${cleanApiUrl}/message/sendText/${instanceName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': apiKey
          },
          body: JSON.stringify({
            number: phoneNumber,
            text: message
          })
        });

        const responseData = await response.json();

        if (response.ok) {
          console.log(`✅ Lembrete semanal enviado para ${clientName} (${clientAppointments.length} agendamentos)`);
          
          // Log the message
          await supabase.from('whatsapp_logs').insert({
            barbershop_id: barbershopId,
            recipient_phone: phoneNumber,
            recipient_name: clientName,
            message_content: message,
            message_type: 'recurring_reminder',
            status: 'sent',
            provider: 'evolution',
            response_data: responseData
          });

          totalSent++;
        } else {
          console.error(`❌ Falha ao enviar para ${clientName}:`, responseData);
          
          await supabase.from('whatsapp_logs').insert({
            barbershop_id: barbershopId,
            recipient_phone: phoneNumber,
            recipient_name: clientName,
            message_content: message,
            message_type: 'recurring_reminder',
            status: 'failed',
            provider: 'evolution',
            error_message: JSON.stringify(responseData)
          });

          totalFailed++;
        }
      } catch (sendError) {
        console.error(`❌ Erro ao processar cliente ${clientName}:`, sendError);
        totalFailed++;
      }
    }

    const result = {
      success: true,
      message: `Lembretes de recorrência processados`,
      sent: totalSent,
      failed: totalFailed,
      totalClients: appointmentsByClient.size,
      totalAppointments: appointments.length
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
