/**
 * Send Appointment Reminders via WhatsApp
 * 
 * Usa whatsapp-resolver para resolver configuração por barbearia
 * com fallback automático para global se necessário.
 * 
 * @version 2025-01-02.reminders-v2
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  resolveWhatsAppConfig,
  sendWhatsAppMessage,
  formatPhoneNumber,
  RESOLVER_VERSION
} from "../_shared/whatsapp-resolver.ts";

const FUNCTION_VERSION = '2025-01-02.reminders-v2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'X-Function-Version': FUNCTION_VERSION
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log(`🔔 [reminders] Starting... Version: ${FUNCTION_VERSION}`);

    const now = new Date();
    
    // Buscar agendamentos pendentes sem lembrete enviado
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
        sent: 0,
        functionVersion: FUNCTION_VERSION
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`📋 ${appointments.length} agendamentos encontrados`);

    // Agrupar por barbearia
    const appointmentsByBarbershop = appointments.reduce((acc: Record<string, any[]>, apt) => {
      if (!acc[apt.barbershop_id]) {
        acc[apt.barbershop_id] = [];
      }
      acc[apt.barbershop_id].push(apt);
      return acc;
    }, {});

    let totalSent = 0;
    let totalFailed = 0;

    // Processar cada barbearia
    for (const [barbershopId, barbershopAppointments] of Object.entries(appointmentsByBarbershop)) {
      console.log(`🏪 Processando barbearia ${barbershopId}: ${barbershopAppointments.length} agendamentos`);

      // Buscar settings da barbearia
      const { data: barbershopData } = await supabase
        .from('barbershops')
        .select('settings, name')
        .eq('id', barbershopId)
        .single();

      const notificationConfig = barbershopData?.settings?.notification_config || {};
      const reminderConfig = notificationConfig.appointment_reminder || { enabled: true, hours_before: 24 };
      
      if (!reminderConfig.enabled) {
        console.log(`⚠️ Lembretes desabilitados para barbearia ${barbershopId}`);
        continue;
      }

      const reminderHours = reminderConfig.hours_before || 24;

      // Resolver configuração WhatsApp para esta barbearia
      const whatsappConfig = await resolveWhatsAppConfig(supabase, barbershopId, { 
        requireConnected: true 
      });

      if (!whatsappConfig) {
        console.log(`⚠️ WhatsApp não configurado para barbearia ${barbershopId}`);
        continue;
      }

      console.log(`📱 Usando instância: ${whatsappConfig.instanceName} (source: ${whatsappConfig.source})`);

      // Processar cada agendamento
      for (const appointment of barbershopAppointments as any[]) {
        try {
          // Calcular tempo até o agendamento
          const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
          const hoursUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
          
          // Verificar se é hora de enviar
          const shouldSendNow = hoursUntilAppointment <= reminderHours && hoursUntilAppointment >= (reminderHours - 1);
          const isOverdue = hoursUntilAppointment < reminderHours && hoursUntilAppointment > 0;
          
          if (!shouldSendNow && !isOverdue) {
            continue;
          }

          // Verificar preferências do cliente
          let displayName = appointment.client_name;
          if (appointment.client_id) {
            const { data: clientData } = await supabase
              .from('clients')
              .select('notification_enabled, notification_types, preferred_name')
              .eq('id', appointment.client_id)
              .maybeSingle();
            
            if (clientData) {
              if (!clientData.notification_enabled) {
                console.log(`⚠️ Cliente ${appointment.client_name} desabilitou notificações`);
                continue;
              }
              
              const notificationTypes = clientData.notification_types as Record<string, boolean> | null;
              if (notificationTypes && !notificationTypes.appointment_reminder) {
                console.log(`⚠️ Cliente ${appointment.client_name} desabilitou lembretes`);
                continue;
              }
              
              if (clientData.preferred_name) {
                displayName = clientData.preferred_name;
              }
            }
          }

          if (!appointment.client_phone) {
            console.log(`⚠️ Agendamento ${appointment.id} sem telefone`);
            continue;
          }

          // Formatar data
          const appointmentDate = new Date(appointment.appointment_date);
          const formattedDate = appointmentDate.toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });

          // Calcular label de tempo
          const hoursUntil = Math.round((appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60));
          let timeLabel = '';
          if (hoursUntil <= 2) timeLabel = 'em breve';
          else if (hoursUntil <= 6) timeLabel = `em ${hoursUntil} horas`;
          else if (hoursUntil <= 24) timeLabel = 'amanhã';
          else timeLabel = `em ${Math.round(hoursUntil / 24)} dia(s)`;

          const message = `Olá ${displayName}! 👋

🔔 Lembrete: Você tem um agendamento ${timeLabel}!

📅 Data: ${formattedDate}
⏰ Horário: ${appointment.appointment_time}
✂️ Serviço: ${appointment.service_name || 'Não especificado'}

Aguardamos você! 💈

Caso precise reagendar, entre em contato conosco.`;

          // Enviar mensagem
          const result = await sendWhatsAppMessage(whatsappConfig, appointment.client_phone, message, {
            supabase,
            barbershopId,
            messageType: 'reminder',
            recipientName: appointment.client_name,
            appointmentId: appointment.id
          });

          if (result.success) {
            console.log(`✅ Lembrete enviado para ${appointment.client_name}`);
            
            // Marcar como enviado
            await supabase
              .from('appointments')
              .update({ reminder_sent: new Date().toISOString() })
              .eq('id', appointment.id);

            totalSent++;
          } else {
            console.error(`❌ Falha ao enviar para ${appointment.client_name}:`, result.error);
            totalFailed++;
          }
        } catch (sendError) {
          console.error(`❌ Erro ao processar agendamento ${appointment.id}:`, sendError);
          totalFailed++;
        }
      }
    }

    const resultData = {
      success: true,
      message: 'Lembretes processados',
      sent: totalSent,
      failed: totalFailed,
      total: appointments.length,
      functionVersion: FUNCTION_VERSION
    };

    console.log('📊 Resultado:', resultData);

    return new Response(JSON.stringify(resultData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Erro geral:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      functionVersion: FUNCTION_VERSION
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
