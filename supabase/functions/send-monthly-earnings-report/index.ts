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
    console.log('🚀 Iniciando envio de relatórios mensais de ganhos...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current date info for the previous month
    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const startOfMonth = previousMonth.toISOString().split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
    
    const monthName = previousMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    console.log(`📅 Processando relatórios de ${monthName} (${startOfMonth} a ${endOfMonth})`);

    // Fetch all active barbershops with WhatsApp config
    const { data: barbershops, error: barbershopsError } = await supabase
      .from('barbershops')
      .select('id, name')
      .eq('active', true);

    if (barbershopsError) {
      console.error('❌ Erro ao buscar barbearias:', barbershopsError);
      throw barbershopsError;
    }

    console.log(`📍 Encontradas ${barbershops?.length || 0} barbearias ativas`);

    let totalReportsSent = 0;
    let totalErrors = 0;

    for (const barbershop of barbershops || []) {
      console.log(`\n🏪 Processando barbearia: ${barbershop.name}`);

      // Check if barbershop has active WhatsApp config
      const { data: whatsappConfig } = await supabase
        .from('whatsapp_config')
        .select('*')
        .eq('barbershop_id', barbershop.id)
        .eq('is_active', true)
        .maybeSingle();

      if (!whatsappConfig) {
        console.log(`⚠️ Barbearia ${barbershop.name} não tem WhatsApp configurado, pulando...`);
        continue;
      }

      // Fetch all active staff for this barbershop
      const { data: staffList, error: staffError } = await supabase
        .from('staff')
        .select('id, user_id, commission_rate')
        .eq('barbershop_id', barbershop.id)
        .eq('active', true);

      if (staffError) {
        console.error(`❌ Erro ao buscar staff de ${barbershop.name}:`, staffError);
        continue;
      }

      console.log(`👥 Encontrados ${staffList?.length || 0} profissionais ativos`);

      for (const staff of staffList || []) {
        try {
          // Get staff profile info
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, preferred_name, phone')
            .eq('id', staff.user_id)
            .single();

          if (!profile?.phone) {
            console.log(`⚠️ Profissional ${profile?.full_name || staff.id} sem telefone cadastrado`);
            continue;
          }
          
          // Use preferred_name if available
          const displayName = profile.preferred_name || profile.full_name;

          // Calculate earnings for this staff member
          const { data: transactions } = await supabase
            .from('transactions')
            .select('amount, commission_rate, commission_amount')
            .eq('barbershop_id', barbershop.id)
            .eq('staff_id', staff.id)
            .eq('type', 'receita')
            .gte('transaction_date', startOfMonth)
            .lte('transaction_date', endOfMonth);

          const servicesCount = transactions?.length || 0;
          const totalRevenue = transactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
          const totalCommission = transactions?.reduce((sum, t) => {
            const commAmount = t.commission_amount || (t.amount * (t.commission_rate || staff.commission_rate || 0) / 100);
            return sum + commAmount;
          }, 0) || 0;

          const avgTicket = servicesCount > 0 ? totalRevenue / servicesCount : 0;

          // Format the report message
          const message = formatReportMessage({
            staffName: displayName,
            barbershopName: barbershop.name,
            monthName,
            servicesCount,
            totalRevenue,
            totalCommission,
            avgTicket,
            commissionRate: staff.commission_rate || 0
          });

          // Send WhatsApp message
          const sendResult = await sendWhatsAppMessage(
            whatsappConfig,
            profile.phone,
            message,
            supabase,
            barbershop.id,
            staff.id
          );

          if (sendResult.success) {
            totalReportsSent++;
            console.log(`✅ Relatório enviado para ${profile.full_name}`);
          } else {
            totalErrors++;
            console.error(`❌ Falha ao enviar para ${profile.full_name}:`, sendResult.error);
          }

        } catch (staffProcessError) {
          totalErrors++;
          console.error(`❌ Erro ao processar staff ${staff.id}:`, staffProcessError);
        }
      }
    }

    console.log(`\n📊 Resumo: ${totalReportsSent} relatórios enviados, ${totalErrors} erros`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        reportsSent: totalReportsSent,
        errors: totalErrors,
        month: monthName
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Erro geral:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

interface ReportData {
  staffName: string;
  barbershopName: string;
  monthName: string;
  servicesCount: number;
  totalRevenue: number;
  totalCommission: number;
  avgTicket: number;
  commissionRate: number;
}

function formatReportMessage(data: ReportData): string {
  const formatCurrency = (value: number) => 
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return `📊 *Relatório Mensal de Ganhos*\n\n` +
    `Olá, *${data.staffName}*! 👋\n\n` +
    `Aqui está o seu resumo de *${data.monthName}* na ${data.barbershopName}:\n\n` +
    `✂️ *Serviços realizados:* ${data.servicesCount}\n` +
    `💰 *Receita gerada:* ${formatCurrency(data.totalRevenue)}\n` +
    `🎯 *Ticket médio:* ${formatCurrency(data.avgTicket)}\n` +
    `📈 *Taxa de comissão:* ${data.commissionRate}%\n\n` +
    `💵 *SUA COMISSÃO TOTAL:* ${formatCurrency(data.totalCommission)}\n\n` +
    `Continue com o ótimo trabalho! 🚀\n` +
    `_Relatório gerado automaticamente pelo BarberSmart_`;
}

async function sendWhatsAppMessage(
  config: any,
  phone: string,
  message: string,
  supabase: any,
  barbershopId: string,
  staffId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Clean phone number
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

    if (config.provider === 'evolution') {
      const response = await fetch(
        `${config.api_url}/message/sendText/${config.instance_name}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': config.api_key,
          },
          body: JSON.stringify({
            number: formattedPhone,
            text: message,
          }),
        }
      );

      const result = await response.json();

      // Log the message
      await supabase.from('whatsapp_logs').insert({
        barbershop_id: barbershopId,
        recipient_phone: formattedPhone,
        message_content: message,
        message_type: 'monthly_report',
        status: response.ok ? 'sent' : 'failed',
        provider: 'evolution',
        external_id: result?.key?.id,
        error_message: response.ok ? null : JSON.stringify(result),
      });

      return { success: response.ok, error: response.ok ? undefined : JSON.stringify(result) };
    }

    // Meta API fallback
    if (config.provider === 'meta' && config.phone_number_id && config.access_token) {
      const response = await fetch(
        `https://graph.facebook.com/v17.0/${config.phone_number_id}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.access_token}`,
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: formattedPhone,
            type: 'text',
            text: { body: message },
          }),
        }
      );

      const result = await response.json();

      await supabase.from('whatsapp_logs').insert({
        barbershop_id: barbershopId,
        recipient_phone: formattedPhone,
        message_content: message,
        message_type: 'monthly_report',
        status: response.ok ? 'sent' : 'failed',
        provider: 'meta',
        external_id: result?.messages?.[0]?.id,
        error_message: response.ok ? null : JSON.stringify(result),
      });

      return { success: response.ok, error: response.ok ? undefined : JSON.stringify(result) };
    }

    return { success: false, error: 'No valid WhatsApp provider configured' };

  } catch (error) {
    console.error('❌ Erro ao enviar WhatsApp:', error);
    return { success: false, error: error.message };
  }
}
