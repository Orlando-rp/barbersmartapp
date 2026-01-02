/**
 * Send Recurring Appointment Reminders via WhatsApp
 * 
 * Envia lembretes semanais para clientes com agendamentos recorrentes.
 * Usa whatsapp-resolver para resolver configuração por barbearia.
 * 
 * @version 2025-01-02.recurring-v2
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  resolveWhatsAppConfig,
  sendWhatsAppMessage,
  RESOLVER_VERSION
} from "../_shared/whatsapp-resolver.ts";

const FUNCTION_VERSION = '2025-01-02.recurring-v2';

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
    console.log(`🔔 [recurring-reminders] Starting... Version: ${FUNCTION_VERSION}`);

    const now = new Date();
    
    // Calcular início e fim da próxima semana (segunda a domingo)
    const dayOfWeek = now.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7 || 7;
    
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() + daysUntilMonday);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    console.log(`📅 Buscando agendamentos de ${startOfWeek.toISOString().split('T')[0]} a ${endOfWeek.toISOString().split('T')[0]}`);

    // Buscar agendamentos recorrentes da próxima semana
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
        sent: 0,
        functionVersion: FUNCTION_VERSION
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`📋 ${appointments.length} agendamentos recorrentes encontrados`);

    // Agrupar por cliente
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

    // Processar cada cliente
    for (const [clientKey, clientAppointments] of appointmentsByClient) {
      const barbershopId = clientAppointments[0].barbershop_id;
      const clientPhone = clientAppointments[0].client_phone;
      const clientName = clientAppointments[0].client_name;
      const clientId = clientAppointments[0].client_id;

      try {
        // Buscar settings da barbearia
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

        // Resolver configuração WhatsApp
        const whatsappConfig = await resolveWhatsAppConfig(supabase, barbershopId, {
          requireConnected: true
        });

        if (!whatsappConfig) {
          console.log(`⚠️ WhatsApp não configurado para barbearia ${barbershopId}`);
          continue;
        }

        // Verificar preferências do cliente
        let displayName = clientName;
        if (clientId) {
          const { data: clientData } = await supabase
            .from('clients')
            .select('notification_enabled, notification_types, preferred_name')
            .eq('id', clientId)
            .maybeSingle();
          
          if (clientData) {
            if (!clientData.notification_enabled) {
              console.log(`⚠️ Cliente ${clientName} desabilitou notificações`);
              continue;
            }
            
            const notificationTypes = clientData.notification_types as Record<string, boolean> | null;
            if (notificationTypes && notificationTypes.recurring_reminder === false) {
              console.log(`⚠️ Cliente ${clientName} desabilitou lembretes de recorrência`);
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

        // Construir lista de agendamentos
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

        // Enviar mensagem
        const result = await sendWhatsAppMessage(whatsappConfig, clientPhone, message, {
          supabase,
          barbershopId,
          messageType: 'recurring_reminder',
          recipientName: clientName
        });

        if (result.success) {
          console.log(`✅ Lembrete semanal enviado para ${clientName} (${clientAppointments.length} agendamentos)`);
          totalSent++;
        } else {
          console.error(`❌ Falha ao enviar para ${clientName}:`, result.error);
          totalFailed++;
        }
      } catch (sendError) {
        console.error(`❌ Erro ao processar cliente ${clientName}:`, sendError);
        totalFailed++;
      }
    }

    const resultData = {
      success: true,
      message: 'Lembretes de recorrência processados',
      sent: totalSent,
      failed: totalFailed,
      totalClients: appointmentsByClient.size,
      totalAppointments: appointments.length,
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
