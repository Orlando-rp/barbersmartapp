import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to format date in Portuguese
function formatDatePtBr(date: Date): string {
  const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  
  const dayName = days[date.getDay()];
  const day = date.getDate();
  const month = months[date.getMonth()];
  
  return `${dayName}, ${day} ${month}`;
}

// Helper function to convert time string to minutes
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// Helper function to get day of week (0-6)
function getDayOfWeek(date: Date): number {
  return date.getDay();
}

// Find available time slots for a given date
async function findAvailableSlots(
  supabase: any,
  barbershopId: string,
  staffId: string,
  date: Date,
  serviceDuration: number = 30
): Promise<string[]> {
  const dayOfWeek = getDayOfWeek(date);
  const dateStr = date.toISOString().split('T')[0];
  
  // Get business hours for this day
  const { data: businessHours } = await supabase
    .from('business_hours')
    .select('*')
    .eq('barbershop_id', barbershopId)
    .eq('day_of_week', dayOfWeek)
    .eq('is_open', true)
    .single();
  
  if (!businessHours) {
    return [];
  }
  
  // Check for special hours (closed days, holidays)
  const { data: specialHours } = await supabase
    .from('special_hours')
    .select('*')
    .eq('barbershop_id', barbershopId)
    .eq('date', dateStr);
  
  if (specialHours?.length > 0 && specialHours.some((sh: any) => !sh.is_open)) {
    return [];
  }
  
  // Get staff schedule if exists
  const { data: staffSchedule } = await supabase
    .from('staff_schedules')
    .select('*')
    .eq('staff_id', staffId)
    .eq('day_of_week', dayOfWeek)
    .eq('is_working', true)
    .single();
  
  // Use staff schedule if available, otherwise use business hours
  const openTime = staffSchedule?.start_time || businessHours.open_time;
  const closeTime = staffSchedule?.end_time || businessHours.close_time;
  
  // Get existing appointments for this date and staff
  const { data: existingAppointments } = await supabase
    .from('appointments')
    .select('time, duration')
    .eq('barbershop_id', barbershopId)
    .eq('staff_id', staffId)
    .eq('date', dateStr)
    .in('status', ['agendado', 'confirmado']);
  
  // Generate all possible slots
  const slots: string[] = [];
  const startMinutes = timeToMinutes(openTime);
  const endMinutes = timeToMinutes(closeTime);
  const interval = 30; // 30 min intervals
  
  for (let minutes = startMinutes; minutes + serviceDuration <= endMinutes; minutes += interval) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    
    // Check if slot conflicts with existing appointments
    let isAvailable = true;
    const slotStart = minutes;
    const slotEnd = minutes + serviceDuration;
    
    for (const apt of existingAppointments || []) {
      const aptStart = timeToMinutes(apt.time);
      const aptEnd = aptStart + (apt.duration || 30);
      
      if (slotStart < aptEnd && slotEnd > aptStart) {
        isAvailable = false;
        break;
      }
    }
    
    if (isAvailable) {
      slots.push(timeStr);
    }
  }
  
  return slots;
}

// Find next available slots across multiple days
async function findNextAvailableSlots(
  supabase: any,
  barbershopId: string,
  staffId: string,
  serviceDuration: number,
  maxSlots: number = 3,
  daysToSearch: number = 7
): Promise<{ date: string; time: string; formatted: string }[]> {
  const results: { date: string; time: string; formatted: string }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  for (let i = 1; i <= daysToSearch && results.length < maxSlots; i++) {
    const searchDate = new Date(today);
    searchDate.setDate(searchDate.getDate() + i);
    
    const slots = await findAvailableSlots(supabase, barbershopId, staffId, searchDate, serviceDuration);
    
    for (const slot of slots) {
      if (results.length >= maxSlots) break;
      
      results.push({
        date: searchDate.toISOString().split('T')[0],
        time: slot,
        formatted: `${formatDatePtBr(searchDate)} às ${slot}`,
      });
    }
  }
  
  return results;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('[suggest-reschedule-noshow] Starting no-show reschedule suggestions...');
    
    // Find appointments with status 'falta' that haven't had a suggestion sent
    const { data: noShowAppointments, error: fetchError } = await supabase
      .from('appointments')
      .select(`
        id,
        date,
        time,
        duration,
        barbershop_id,
        staff_id,
        client_id,
        clients!inner (
          id,
          name,
          phone,
          notification_enabled,
          notification_types
        ),
        barbershops!inner (
          id,
          name,
          settings
        ),
        services (
          name,
          duration
        )
      `)
      .eq('status', 'falta')
      .is('reschedule_suggested_at', null)
      .order('date', { ascending: false })
      .limit(50);
    
    if (fetchError) {
      console.error('[suggest-reschedule-noshow] Error fetching appointments:', fetchError);
      throw fetchError;
    }
    
    console.log(`[suggest-reschedule-noshow] Found ${noShowAppointments?.length || 0} no-show appointments to process`);
    
    let sentCount = 0;
    let skippedCount = 0;
    
    for (const appointment of noShowAppointments || []) {
      try {
        const client = appointment.clients;
        const barbershop = appointment.barbershops;
        
        // Check client notification preferences
        if (!client.notification_enabled) {
          console.log(`[suggest-reschedule-noshow] Client ${client.id} has notifications disabled, skipping`);
          skippedCount++;
          continue;
        }
        
        const clientNotificationTypes = client.notification_types || {};
        if (clientNotificationTypes.no_show_reschedule === false) {
          console.log(`[suggest-reschedule-noshow] Client ${client.id} has no_show_reschedule disabled, skipping`);
          skippedCount++;
          continue;
        }
        
        // Check barbershop notification settings
        const barbershopSettings = barbershop.settings || {};
        const notificationConfig = barbershopSettings.notification_config || {};
        if (notificationConfig.no_show_reschedule?.enabled === false) {
          console.log(`[suggest-reschedule-noshow] Barbershop ${barbershop.id} has no_show_reschedule disabled, skipping`);
          skippedCount++;
          continue;
        }
        
        // Check if client has phone
        if (!client.phone) {
          console.log(`[suggest-reschedule-noshow] Client ${client.id} has no phone, skipping`);
          skippedCount++;
          continue;
        }
        
        // Find next available slots
        const serviceDuration = appointment.services?.duration || appointment.duration || 30;
        const availableSlots = await findNextAvailableSlots(
          supabase,
          appointment.barbershop_id,
          appointment.staff_id,
          serviceDuration,
          3,
          7
        );
        
        if (availableSlots.length === 0) {
          console.log(`[suggest-reschedule-noshow] No available slots found for appointment ${appointment.id}, skipping`);
          skippedCount++;
          continue;
        }
        
        // Build message
        const clientName = client.name?.split(' ')[0] || 'Cliente';
        const appointmentTime = appointment.time.substring(0, 5);
        
        let slotsText = availableSlots
          .map((slot, index) => `${index + 1}️⃣ ${slot.formatted}`)
          .join('\n');
        
        const message = `Olá ${clientName}! 👋

Sentimos sua falta hoje no horário das ${appointmentTime}. 😢

Que tal reagendar? Temos os seguintes horários disponíveis:

${slotsText}

Responda com o número do horário desejado ou entre em contato para outras opções.

Esperamos você em breve! 💈

_${barbershop.name}_`;
        
        // Send WhatsApp message via Evolution API
        const { data: whatsappConfig } = await supabase
          .from('whatsapp_config')
          .select('*')
          .eq('barbershop_id', appointment.barbershop_id)
          .single();
        
        if (!whatsappConfig?.api_url || !whatsappConfig?.api_key || !whatsappConfig?.instance_name) {
          console.log(`[suggest-reschedule-noshow] No WhatsApp config for barbershop ${appointment.barbershop_id}, skipping`);
          skippedCount++;
          continue;
        }
        
        // Format phone number
        let phone = client.phone.replace(/\D/g, '');
        if (!phone.startsWith('55')) {
          phone = '55' + phone;
        }
        
        // Send message
        const sendResponse = await fetch(`${whatsappConfig.api_url}/message/sendText/${whatsappConfig.instance_name}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': whatsappConfig.api_key,
          },
          body: JSON.stringify({
            number: phone,
            text: message,
          }),
        });
        
        const sendResult = await sendResponse.json();
        
        if (!sendResponse.ok) {
          console.error(`[suggest-reschedule-noshow] Failed to send message for appointment ${appointment.id}:`, sendResult);
          
          // Log failure
          await supabase.from('whatsapp_logs').insert({
            barbershop_id: appointment.barbershop_id,
            phone: client.phone,
            message_type: 'no_show_reschedule',
            message_content: message,
            status: 'failed',
            error_message: JSON.stringify(sendResult),
          });
          
          skippedCount++;
          continue;
        }
        
        console.log(`[suggest-reschedule-noshow] Successfully sent reschedule suggestion for appointment ${appointment.id}`);
        
        // Update appointment with reschedule_suggested_at
        await supabase
          .from('appointments')
          .update({ reschedule_suggested_at: new Date().toISOString() })
          .eq('id', appointment.id);
        
        // Log success
        await supabase.from('whatsapp_logs').insert({
          barbershop_id: appointment.barbershop_id,
          phone: client.phone,
          message_type: 'no_show_reschedule',
          message_content: message,
          status: 'sent',
          metadata: {
            appointment_id: appointment.id,
            suggested_slots: availableSlots,
            message_id: sendResult.key?.id,
          },
        });
        
        sentCount++;
        
      } catch (error) {
        console.error(`[suggest-reschedule-noshow] Error processing appointment ${appointment.id}:`, error);
        skippedCount++;
      }
    }
    
    console.log(`[suggest-reschedule-noshow] Completed: ${sentCount} sent, ${skippedCount} skipped`);
    
    return new Response(
      JSON.stringify({
        success: true,
        processed: noShowAppointments?.length || 0,
        sent: sentCount,
        skipped: skippedCount,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
    
  } catch (error) {
    console.error('[suggest-reschedule-noshow] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
