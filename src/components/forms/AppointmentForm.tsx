import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { StaffAvatar } from "@/components/ui/smart-avatar";
import { CalendarIcon, Clock, User, Scissors, CheckCircle2, ChevronRight, ChevronLeft, Search, Bell, ListPlus, Building2, Repeat } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn, formatDuration } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useBusinessHoursValidation } from "@/hooks/useBusinessHoursValidation";
import { useSharedBarbershopId } from "@/hooks/useSharedBarbershopId";
import { useStaffServices } from "@/hooks/useStaffServices";
import { useSelectableUnits } from "@/hooks/useSelectableUnits";
import { toast as sonnerToast } from "sonner";
import { DayProps, DayContent } from "react-day-picker";
import { RecurrenceSelector, RecurrenceType } from "@/components/booking/RecurrenceSelector";
import { RecurrenceConflictDialog } from "@/components/booking/RecurrenceConflictDialog";
import { RecurrenceActionDialog, RecurrenceActionScope } from "@/components/booking/RecurrenceActionDialog";
import { RecurrenceBadge } from "@/components/booking/RecurrenceBadge";
import { 
  RecurrenceConfig, 
  GeneratedDate, 
  generateRecurrenceGroupId,
  calculateTotalPrice,
  formatRecurrenceSummary
} from "@/lib/recurrenceUtils";

interface WaitlistPrefill {
  clientName?: string;
  clientPhone?: string;
  serviceId?: string;
  staffId?: string;
  preferredDate?: string;
  preferredTimeStart?: string;
}

interface AppointmentFormProps {
  appointment?: any;
  onClose?: () => void;
  waitlistPrefill?: WaitlistPrefill;
}

type WizardStep = 'unit' | 'professional' | 'service' | 'datetime' | 'recurrence' | 'client' | 'confirm';

export const AppointmentForm = ({ appointment, onClose, waitlistPrefill }: AppointmentFormProps) => {
  const { barbershopId, barbershops, user } = useAuth();
  const { sharedBarbershopId, allRelatedBarbershopIds } = useSharedBarbershopId();
  const { toast } = useToast();
  
  // Filtrar unidades selecionáveis (excluindo matrizes com filiais)
  const { selectableUnits, hasMultipleUnits } = useSelectableUnits(barbershops);
  
  // Se o usuário tem múltiplas unidades, começa na seleção de unidade
  const [currentStep, setCurrentStep] = useState<WizardStep>(hasMultipleUnits ? 'unit' : 'professional');
  const [selectedUnitId, setSelectedUnitId] = useState<string>(barbershopId || "");
  
  // Usa a unidade selecionada no wizard ou o barbershopId do contexto
  // Definido aqui para poder ser usado pelo useStaffServices
  const effectiveBarbershopId = selectedUnitId || barbershopId;
  
  // Hook de serviços do staff - usa a unidade efetiva selecionada
  const { staffProvidesService, staffHasServiceRestrictions } = useStaffServices(effectiveBarbershopId);
  
  const [clientId, setClientId] = useState(appointment?.client_id || "");
  const [clientName, setClientName] = useState(appointment?.client_name || waitlistPrefill?.clientName || "");
  const [clientPhone, setClientPhone] = useState(appointment?.client_phone || waitlistPrefill?.clientPhone || "");
  const [selectedService, setSelectedService] = useState(appointment?.service_id || waitlistPrefill?.serviceId || "");
  const [selectedBarber, setSelectedBarber] = useState(appointment?.staff_id || waitlistPrefill?.staffId || "");
  const [date, setDate] = useState<Date | undefined>(
    appointment?.appointment_date 
      ? new Date(appointment.appointment_date) 
      : waitlistPrefill?.preferredDate 
        ? new Date(waitlistPrefill.preferredDate) 
        : undefined
  );
  const [selectedTime, setSelectedTime] = useState(appointment?.appointment_time || waitlistPrefill?.preferredTimeStart?.slice(0, 5) || "");
  const [notes, setNotes] = useState(appointment?.notes || "");
  const [loading, setLoading] = useState(false);
  
  const [services, setServices] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [dateValidationMessage, setDateValidationMessage] = useState<string>("");
  const [dayAvailability, setDayAvailability] = useState<Record<string, 'available' | 'partial' | 'full' | 'closed'>>({});
  const [daySlotCounts, setDaySlotCounts] = useState<Record<string, { available: number; total: number }>>({});
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [showWaitlistForm, setShowWaitlistForm] = useState(false);
  const [waitlistNotes, setWaitlistNotes] = useState("");
  const [savingWaitlist, setSavingWaitlist] = useState(false);
  
  // Recurrence edit state
  const [recurrenceActionOpen, setRecurrenceActionOpen] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);
  const [recurrenceScope, setRecurrenceScope] = useState<RecurrenceActionScope>('single');
  
  // Check if editing a recurring appointment
  const isEditingRecurring = appointment?.is_recurring && appointment?.recurrence_group_id;
  
  // Refs para controlar quando resetar as seleções
  const isFirstRender = useRef(true);
  const prevEffectiveBarbershopId = useRef<string | null>(null);
  
  const { validateDateTime, generateTimeSlots, checkTimeOverlap, loading: validationLoading } = useBusinessHoursValidation(effectiveBarbershopId, allRelatedBarbershopIds, effectiveBarbershopId);

  // Busca serviços e clientes da matriz (dados compartilhados)
  useEffect(() => {
    if (sharedBarbershopId && allRelatedBarbershopIds.length > 0) {
      fetchServices();
      fetchClients();
    }
  }, [sharedBarbershopId, allRelatedBarbershopIds]);

  // Reseta seleções quando unidade muda (não na montagem inicial)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevEffectiveBarbershopId.current = effectiveBarbershopId;
      return;
    }
    
    // Só reseta se a unidade realmente mudou
    if (prevEffectiveBarbershopId.current !== effectiveBarbershopId && effectiveBarbershopId) {
      console.log('[AppointmentForm] Unidade mudou de', prevEffectiveBarbershopId.current, 'para:', effectiveBarbershopId);
      setSelectedBarber("");
      setSelectedService("");
      setDate(undefined);
      setSelectedTime("");
      prevEffectiveBarbershopId.current = effectiveBarbershopId;
    }
  }, [effectiveBarbershopId]);

  // Busca staff da unidade específica
  useEffect(() => {
    if (effectiveBarbershopId) {
      console.log('[AppointmentForm] Buscando staff para unidade:', effectiveBarbershopId);
      fetchStaff();
    }
  }, [effectiveBarbershopId]);

  useEffect(() => {
    if (date && selectedBarber && selectedService) {
      fetchAvailableSlots();
    } else {
      setAvailableSlots([]);
      setSelectedTime("");
    }
  }, [date, selectedBarber, selectedService]);

  // Fetch day availability for calendar visualization
  useEffect(() => {
    if (selectedBarber && selectedService && effectiveBarbershopId) {
      fetchMonthAvailability();
    }
  }, [selectedBarber, selectedService, calendarMonth, effectiveBarbershopId]);

  // Real-time updates for appointments
  useEffect(() => {
    if (!effectiveBarbershopId || !date || !selectedBarber) return;

    const formattedDate = format(date, "yyyy-MM-dd");
    
    const channel = supabase
      .channel('appointments-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `barbershop_id=eq.${effectiveBarbershopId}`
        },
        (payload: any) => {
          console.log('Appointment changed:', payload);
          
          // Verificar se a mudança afeta o profissional e data selecionados
          const affectsCurrentView = 
            payload.new?.staff_id === selectedBarber && 
            payload.new?.appointment_date === formattedDate;
          
          const wasAffected = 
            payload.old?.staff_id === selectedBarber && 
            payload.old?.appointment_date === formattedDate;

          if (affectsCurrentView || wasAffected) {
            // Atualizar horários disponíveis
            fetchAvailableSlots();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [effectiveBarbershopId, date, selectedBarber]);

  const fetchClients = async () => {
    if (!sharedBarbershopId || allRelatedBarbershopIds.length === 0) return;
    
    try {
      // Busca clientes de todas as unidades relacionadas (dados compartilhados)
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, phone, email')
        .in('barbershop_id', allRelatedBarbershopIds)
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar clientes:', error);
    }
  };

  const fetchServices = async () => {
    if (!sharedBarbershopId || allRelatedBarbershopIds.length === 0) return;
    
    try {
      // Busca serviços de todas as unidades relacionadas (dados compartilhados)
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .in('barbershop_id', allRelatedBarbershopIds)
        .eq('active', true);

      if (error) throw error;
      setServices(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar serviços',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const fetchStaff = async () => {
    if (!effectiveBarbershopId) {
      console.log('[AppointmentForm] fetchStaff: sem effectiveBarbershopId');
      setStaff([]);
      return;
    }
    
    console.log('[AppointmentForm] fetchStaff: buscando para unidade:', effectiveBarbershopId);
    
    try {
      // First, check if this is a unit (has parent_id) or matriz
      const { data: barbershop } = await supabase
        .from('barbershops')
        .select('id, parent_id')
        .eq('id', effectiveBarbershopId)
        .single();

      let staffData: any[] = [];

      if (barbershop?.parent_id) {
        // This is a unit - fetch staff via staff_units table
        console.log('[AppointmentForm] Esta é uma unidade, buscando via staff_units');
        
        const { data: staffUnitsData, error: suError } = await supabase
          .from('staff_units')
          .select(`
            staff_id,
            schedule,
            commission_rate,
            staff:staff_id (
              id,
              user_id,
              schedule
            )
          `)
          .eq('barbershop_id', effectiveBarbershopId)
          .eq('active', true);

        if (suError) throw suError;

        if (staffUnitsData && staffUnitsData.length > 0) {
          const userIds = staffUnitsData.map((su: any) => su.staff?.user_id).filter(Boolean);
          
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', userIds);

          staffData = staffUnitsData.map((su: any) => {
            const profile = profilesData?.find(p => p.id === su.staff?.user_id);
            return {
              id: su.staff?.id,
              name: profile?.full_name || 'Nome não disponível',
              // Use unit-specific schedule if available, otherwise staff's default
              schedule: su.schedule || su.staff?.schedule,
              avatar_url: profile?.avatar_url
            };
          }).filter((s: any) => s.id);
        }
      } else {
        // This is matriz - fetch staff directly from staff table
        console.log('[AppointmentForm] Esta é a matriz, buscando diretamente de staff');
        
        const { data: directStaff, error: staffError } = await supabase
          .from('staff')
          .select('id, user_id, schedule')
          .eq('barbershop_id', effectiveBarbershopId)
          .eq('active', true);

        if (staffError) throw staffError;

        if (directStaff && directStaff.length > 0) {
          const userIds = directStaff.map(s => s.user_id);
          
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', userIds);

          staffData = directStaff.map(member => {
            const profile = profilesData?.find(p => p.id === member.user_id);
            return {
              id: member.id,
              name: profile?.full_name || 'Nome não disponível',
              schedule: member.schedule,
              avatar_url: profile?.avatar_url
            };
          });
        }
      }
      
      console.log('[AppointmentForm] fetchStaff: staff transformado:', staffData);
      setStaff(staffData);
    } catch (error: any) {
      console.error('[AppointmentForm] fetchStaff: erro:', error);
      toast({
        title: 'Erro ao carregar equipe',
        description: error.message,
        variant: 'destructive',
      });
      setStaff([]);
    }
  };

  const fetchAvailableSlots = async () => {
    if (!date || !selectedBarber || !selectedService) {
      setAvailableSlots([]);
      return;
    }

    try {
      const formattedDate = format(date, "yyyy-MM-dd");
      const service = services.find(s => s.id === selectedService);
      const serviceDuration = service?.duration || 30;
      
      console.log('🔍 Validando data/hora com business hours:', {
        date: formattedDate,
        barber: selectedBarber,
        barbershop: effectiveBarbershopId,
        serviceDuration
      });

      // Step 1: Validate if the date is allowed (check blocked dates, business hours, special hours, staff schedule)
      const dateValidation = validateDateTime(date, undefined, selectedBarber);
      
      if (!dateValidation.isValid) {
        console.log('❌ Data inválida:', dateValidation.reason);
        sonnerToast.error(dateValidation.reason || 'Data não disponível para agendamento');
        setAvailableSlots([]);
        setSelectedTime("");
        return;
      }

      console.log('✅ Data válida:', dateValidation.availableHours);

      // Step 2: Generate all possible time slots based on business hours, staff schedule AND service duration
      const possibleSlots = generateTimeSlots(date, serviceDuration, selectedBarber);
      console.log('⏰ Horários possíveis gerados (considerando duração do serviço):', possibleSlots);

      if (possibleSlots.length === 0) {
        sonnerToast.warning('Nenhum horário disponível para esta data com este serviço');
        setAvailableSlots([]);
        return;
      }

      // Step 3: Check which slots are already booked (with duration info)
      const { data, error } = await supabase
        .from('appointments')
        .select('appointment_time, id, status, service_id')
        .eq('barbershop_id', effectiveBarbershopId)
        .eq('staff_id', selectedBarber)
        .eq('appointment_date', formattedDate)
        .in('status', ['pendente', 'confirmado', 'concluido']);

      if (error) throw error;

      console.log('📅 Agendamentos encontrados:', data);

      // Get service durations for booked appointments
      const bookedAppointments = (data || [])
        .filter(apt => !appointment || apt.id !== appointment.id)
        .map(apt => {
          const bookedService = services.find(s => s.id === apt.service_id);
          return {
            time: apt.appointment_time,
            duration: bookedService?.duration || 30
          };
        });
      
      console.log('🚫 Agendamentos ocupados com duração:', bookedAppointments);
      
      setBookedSlots(bookedAppointments.map(b => b.time));
      
      // Step 4: Filter out slots that would overlap with booked appointments
      const available = possibleSlots.filter(slot => {
        // Check if this slot (with service duration) overlaps with any booked appointment
        return !checkTimeOverlap(slot, serviceDuration, bookedAppointments);
      });
      
      console.log('✅ Horários finais disponíveis (sem conflitos):', available);
      
      setAvailableSlots(available);
      
      // If selected time is no longer available, clear it
      if (selectedTime && !available.includes(selectedTime) && (!appointment || appointment.appointment_time !== selectedTime)) {
        console.log('⚠️ Limpando horário selecionado:', selectedTime);
        setSelectedTime("");
      }
    } catch (error: any) {
      console.error('❌ Erro ao carregar horários:', error);
      sonnerToast.error('Erro ao carregar horários disponíveis');
      setAvailableSlots([]);
    }
  };

  const fetchMonthAvailability = async () => {
    if (!selectedBarber || !selectedService || !effectiveBarbershopId) {
      setDayAvailability({});
      return;
    }

    try {
      const service = services.find(s => s.id === selectedService);
      const serviceDuration = service?.duration || 30;

      // Get the start and end of the visible month
      const startOfMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
      const endOfMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0);
      
      // Fetch all appointments for the month
      const { data: monthAppointments, error } = await supabase
        .from('appointments')
        .select('appointment_date, appointment_time, service_id')
        .eq('barbershop_id', effectiveBarbershopId)
        .eq('staff_id', selectedBarber)
        .gte('appointment_date', format(startOfMonth, 'yyyy-MM-dd'))
        .lte('appointment_date', format(endOfMonth, 'yyyy-MM-dd'))
        .in('status', ['pendente', 'confirmado', 'concluido']);

      if (error) throw error;

      const availability: Record<string, 'available' | 'partial' | 'full' | 'closed'> = {};
      const slotCounts: Record<string, { available: number; total: number }> = {};
      
      // Check each day of the month
      const currentDate = new Date(startOfMonth);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      while (currentDate <= endOfMonth) {
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        
        // Skip past dates
        if (currentDate < today) {
          currentDate.setDate(currentDate.getDate() + 1);
          continue;
        }
        
        // Check if date is valid (business hours + staff schedule)
        const validation = validateDateTime(currentDate, undefined, selectedBarber);
        
        if (!validation.isValid) {
          availability[dateStr] = 'closed';
          slotCounts[dateStr] = { available: 0, total: 0 };
        } else {
          // Generate possible slots based on staff schedule
          const possibleSlots = generateTimeSlots(currentDate, serviceDuration, selectedBarber);
          
          if (possibleSlots.length === 0) {
            availability[dateStr] = 'closed';
            slotCounts[dateStr] = { available: 0, total: 0 };
          } else {
            // Get appointments for this day
            const dayAppointments = (monthAppointments || [])
              .filter(apt => apt.appointment_date === dateStr)
              .map(apt => {
                const bookedService = services.find(s => s.id === apt.service_id);
                return {
                  time: apt.appointment_time,
                  duration: bookedService?.duration || 30
                };
              });
            
            // Calculate available slots
            const availableCount = possibleSlots.filter(slot => 
              !checkTimeOverlap(slot, serviceDuration, dayAppointments)
            ).length;
            
            const totalSlots = possibleSlots.length;
            const occupancyRate = (totalSlots - availableCount) / totalSlots;
            
            slotCounts[dateStr] = { available: availableCount, total: totalSlots };
            
            if (availableCount === 0) {
              availability[dateStr] = 'full';
            } else if (occupancyRate >= 0.7) {
              availability[dateStr] = 'partial';
            } else {
              availability[dateStr] = 'available';
            }
          }
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      setDayAvailability(availability);
      setDaySlotCounts(slotCounts);
    } catch (error) {
      console.error('Erro ao calcular disponibilidade do mês:', error);
    }
  };

  const selectClient = (client: any) => {
    setClientId(client.id);
    setClientName(client.name);
    setClientPhone(client.phone);
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm)
  );

  const canProceedFromProfessional = selectedBarber !== "";
  const canProceedFromService = selectedService !== "";
  const canProceedFromDateTime = date && selectedTime;
  const canProceedFromClient = clientName && clientPhone;

  const sendWhatsAppConfirmation = async (
    appointmentId: string,
    data: {
      clientName: string;
      clientPhone: string;
      clientId?: string;
      date: Date;
      time: string;
      serviceName: string;
      barberName: string;
    }
  ) => {
    try {
      // Verificar configurações de notificação da barbearia
      const { data: barbershopData } = await supabase
        .from('barbershops')
        .select('settings')
        .eq('id', effectiveBarbershopId)
        .single();

      const notificationConfig = barbershopData?.settings?.notification_config || {};
      const barbershopSetting = notificationConfig.appointment_created;
      if (barbershopSetting && !barbershopSetting.enabled) {
        console.log('Notificações de criação desabilitadas nas configurações da barbearia');
        return;
      }

      // Verificar preferências de notificação do cliente (se cadastrado) e buscar nome preferido
      let clientDisplayName = data.clientName;
      if (data.clientId) {
        const { data: clientData } = await supabase
          .from('clients')
          .select('notification_enabled, notification_types, preferred_name, name')
          .eq('id', data.clientId)
          .maybeSingle();

        if (clientData) {
          // Usar nome preferido se disponível
          clientDisplayName = clientData.preferred_name || clientData.name || data.clientName;
          
          if (!clientData.notification_enabled) {
            console.log('Cliente optou por não receber notificações');
            return;
          }
          const notificationTypes = clientData.notification_types as Record<string, boolean> | null;
          if (notificationTypes && !notificationTypes.appointment_created) {
            console.log('Cliente não deseja receber confirmações de agendamento');
            return;
          }
        }
      }

      // Buscar configuração do Evolution API
      const { data: whatsappConfig, error: configError } = await supabase
        .from('whatsapp_config')
        .select('config, is_active')
        .eq('barbershop_id', effectiveBarbershopId)
        .eq('provider', 'evolution')
        .maybeSingle();

      if (configError) {
        console.log('Erro ao buscar config WhatsApp:', configError);
        return;
      }

      if (!whatsappConfig?.is_active || !whatsappConfig?.config) {
        console.log('WhatsApp Evolution não configurado ou inativo, pulando confirmação');
        return;
      }

      const evolutionConfig = whatsappConfig.config as {
        api_url: string;
        api_key: string;
        instance_name: string;
      };

      // Montar mensagem de confirmação usando nome preferido
      const message = `Olá ${clientDisplayName}! 👋

✅ Seu agendamento foi confirmado:

📅 Data: ${format(data.date, "dd/MM/yyyy", { locale: ptBR })}
⏰ Horário: ${data.time}
✂️ Serviço: ${data.serviceName}
👤 Profissional: ${data.barberName}

Nos vemos em breve! 💈`;

      // Enviar via Evolution API
      const { error } = await supabase.functions.invoke('send-whatsapp-evolution', {
        body: {
          action: 'sendText',
          apiUrl: evolutionConfig.api_url,
          apiKey: evolutionConfig.api_key,
          instanceName: evolutionConfig.instance_name,
          to: data.clientPhone,
          message: message,
          barbershopId: effectiveBarbershopId,
          recipientName: data.clientName,
          appointmentId,
          createdBy: user?.id
        }
      });

      if (error) {
        console.error('Erro ao enviar WhatsApp:', error);
      } else {
        console.log('✅ Confirmação enviada via WhatsApp Evolution');
      }
    } catch (error) {
      console.error('Erro ao enviar confirmação WhatsApp:', error);
      // Não bloquear o fluxo se WhatsApp falhar
    }
  };

  const sendWhatsAppUpdateNotification = async (
    appointmentId: string,
    data: {
      clientName: string;
      clientPhone: string;
      clientId?: string;
      date: Date;
      time: string;
      serviceName: string;
      barberName: string;
    }
  ) => {
    try {
      // Verificar configurações de notificação da barbearia
      const { data: barbershopData } = await supabase
        .from('barbershops')
        .select('settings')
        .eq('id', effectiveBarbershopId)
        .single();

      const notificationConfig = barbershopData?.settings?.notification_config || {};
      const barbershopSetting = notificationConfig.appointment_updated;
      if (barbershopSetting && !barbershopSetting.enabled) {
        console.log('Notificações de alteração desabilitadas nas configurações da barbearia');
        return;
      }

      // Verificar preferências de notificação do cliente (se cadastrado)
      if (data.clientId) {
        const { data: clientData } = await supabase
          .from('clients')
          .select('notification_enabled, notification_types')
          .eq('id', data.clientId)
          .maybeSingle();

        if (clientData) {
          if (!clientData.notification_enabled) {
            console.log('Cliente optou por não receber notificações');
            return;
          }
          const notificationTypes = clientData.notification_types as Record<string, boolean> | null;
          if (notificationTypes && !notificationTypes.appointment_updated) {
            console.log('Cliente não deseja receber notificações de alteração');
            return;
          }
        }
      }

      const { data: whatsappConfig, error: configError } = await supabase
        .from('whatsapp_config')
        .select('config, is_active')
        .eq('barbershop_id', effectiveBarbershopId)
        .eq('provider', 'evolution')
        .maybeSingle();

      if (configError || !whatsappConfig?.is_active || !whatsappConfig?.config) {
        console.log('WhatsApp Evolution não configurado ou inativo');
        return;
      }

      const evolutionConfig = whatsappConfig.config as {
        api_url: string;
        api_key: string;
        instance_name: string;
      };

      const message = `Olá ${data.clientName}! 📝

Seu agendamento foi alterado:

📅 Nova Data: ${format(data.date, "dd/MM/yyyy", { locale: ptBR })}
⏰ Novo Horário: ${data.time}
✂️ Serviço: ${data.serviceName}
👤 Profissional: ${data.barberName}

Se tiver alguma dúvida, entre em contato conosco. 💈`;

      const { error } = await supabase.functions.invoke('send-whatsapp-evolution', {
        body: {
          action: 'sendText',
          apiUrl: evolutionConfig.api_url,
          apiKey: evolutionConfig.api_key,
          instanceName: evolutionConfig.instance_name,
          to: data.clientPhone,
          message: message,
          barbershopId: effectiveBarbershopId,
          recipientName: data.clientName,
          appointmentId,
          createdBy: user?.id
        }
      });

      if (error) {
        console.error('Erro ao enviar WhatsApp de alteração:', error);
      } else {
        console.log('✅ Notificação de alteração enviada via WhatsApp');
      }
    } catch (error) {
      console.error('Erro ao enviar notificação WhatsApp:', error);
    }
  };

  const canProceedFromUnit = selectedUnitId !== "";

  const handleNext = () => {
    if (currentStep === 'unit' && canProceedFromUnit) {
      setCurrentStep('professional');
    } else if (currentStep === 'professional' && canProceedFromProfessional) {
      setCurrentStep('service');
    } else if (currentStep === 'service' && canProceedFromService) {
      setCurrentStep('datetime');
    } else if (currentStep === 'datetime' && canProceedFromDateTime) {
      setCurrentStep('client');
    } else if (currentStep === 'client' && canProceedFromClient) {
      setCurrentStep('confirm');
    }
  };

  const handleBack = () => {
    if (currentStep === 'professional' && hasMultipleUnits) setCurrentStep('unit');
    else if (currentStep === 'service') setCurrentStep('professional');
    else if (currentStep === 'datetime') setCurrentStep('service');
    else if (currentStep === 'client') setCurrentStep('datetime');
    else if (currentStep === 'confirm') setCurrentStep('client');
  };

  const handleJoinWaitlist = async () => {
    if (!date || !effectiveBarbershopId) {
      toast({
        title: "Erro",
        description: "Selecione uma data para entrar na lista de espera.",
        variant: "destructive",
      });
      return;
    }

    setSavingWaitlist(true);

    try {
      const formattedDate = format(date, "yyyy-MM-dd");
      
      const { error } = await supabase.from('waitlist').insert({
        barbershop_id: effectiveBarbershopId,
        client_id: clientId || null,
        client_name: clientName,
        client_phone: clientPhone,
        preferred_date: formattedDate,
        preferred_time_start: null,
        preferred_time_end: null,
        service_id: selectedService || null,
        staff_id: selectedBarber || null,
        status: 'waiting',
        notes: waitlistNotes || null,
      });

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Você foi adicionado à lista de espera. Avisaremos quando houver disponibilidade.",
      });

      setShowWaitlistForm(false);
      setWaitlistNotes("");
      onClose?.();
    } catch (error: any) {
      console.error('Erro ao adicionar à lista de espera:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível adicionar à lista de espera.",
        variant: "destructive",
      });
    } finally {
      setSavingWaitlist(false);
    }
  };

  // Handle submit with recurrence scope check
  const handleSubmitClick = async () => {
    // If editing a recurring appointment, show scope dialog first
    if (isEditingRecurring && !pendingSubmit) {
      setRecurrenceActionOpen(true);
      return;
    }
    
    await handleSubmit(recurrenceScope);
  };

  // Handle recurrence action confirmation
  const handleRecurrenceConfirm = async (scope: RecurrenceActionScope) => {
    setRecurrenceScope(scope);
    setPendingSubmit(true);
    setRecurrenceActionOpen(false);
    await handleSubmit(scope);
    setPendingSubmit(false);
  };

  const handleSubmit = async (scope: RecurrenceActionScope = 'single') => {
    if (!date) {
      toast({
        title: "Erro",
        description: "Por favor, selecione uma data.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Verificar conflito de horário
      const formattedDate = format(date, "yyyy-MM-dd");
      
      // Validate date and time before booking
      const validation = validateDateTime(date, selectedTime);
      if (!validation.isValid) {
        toast({
          title: "Horário Indisponível",
          description: validation.reason,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      console.log('🔍 Verificando conflito:', {
        date: formattedDate,
        time: selectedTime,
        barber: selectedBarber
      });
      
      const { data: conflictingAppointments, error: conflictError } = await supabase
        .from('appointments')
        .select('id, status')
        .eq('barbershop_id', effectiveBarbershopId)
        .eq('staff_id', selectedBarber)
        .eq('appointment_date', formattedDate)
        .eq('appointment_time', selectedTime)
        .in('status', ['pendente', 'confirmado', 'concluido']);

      if (conflictError) throw conflictError;

      console.log('⚠️ Conflitos encontrados:', conflictingAppointments);

      // Se está editando, ignorar o próprio agendamento
      const hasConflict = appointment 
        ? conflictingAppointments?.some(apt => apt.id !== appointment.id)
        : conflictingAppointments && conflictingAppointments.length > 0;

      if (hasConflict) {
        console.log('❌ Conflito detectado!');
        toast({
          title: "Horário Indisponível",
          description: "Este horário já está ocupado para o profissional selecionado. Por favor, escolha outro horário.",
          variant: "destructive",
        });
        setLoading(false);
        setCurrentStep('datetime');
        return;
      }

      let finalClientId = clientId;
      
      if (!finalClientId) {
        const { data: existingClient } = await supabase
          .from('clients')
          .select('id')
          .eq('barbershop_id', effectiveBarbershopId)
          .eq('phone', clientPhone)
          .maybeSingle();

        if (existingClient) {
          finalClientId = existingClient.id;
        } else {
          const { data: newClient, error: clientError } = await supabase
            .from('clients')
            .insert({
              barbershop_id: effectiveBarbershopId,
              name: clientName,
              phone: clientPhone,
              active: true,
            })
            .select('id')
            .single();

          if (clientError) throw clientError;
          finalClientId = newClient.id;
        }
      }

      const service = services.find(s => s.id === selectedService);

      const appointmentData = {
        barbershop_id: effectiveBarbershopId,
        client_id: finalClientId,
        staff_id: selectedBarber,
        service_id: selectedService,
        appointment_date: format(date, "yyyy-MM-dd"),
        appointment_time: selectedTime,
        status: appointment?.status || 'pendente',
        notes,
        client_name: clientName,
        client_phone: clientPhone,
        service_name: service?.name,
        service_price: service?.price,
      };

      if (appointment) {
        // Handle recurring appointment updates based on scope
        if (isEditingRecurring && scope !== 'single') {
          const service = services.find(s => s.id === selectedService);
          
          // Calculate date difference for future/all updates
          const originalDate = new Date(appointment.appointment_date);
          const newDate = date;
          const daysDiff = Math.floor((newDate.getTime() - originalDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (scope === 'all') {
            // Update all appointments in series
            const { data: seriesAppointments, error: fetchError } = await supabase
              .from('appointments')
              .select('id, appointment_date')
              .eq('recurrence_group_id', appointment.recurrence_group_id)
              .neq('status', 'cancelado')
              .neq('status', 'concluido');
            
            if (fetchError) throw fetchError;
            
            // Update each appointment with the same relative change
            for (const apt of seriesAppointments || []) {
              const aptDate = new Date(apt.appointment_date);
              aptDate.setDate(aptDate.getDate() + daysDiff);
              
              await supabase
                .from('appointments')
                .update({
                  staff_id: selectedBarber,
                  service_id: selectedService,
                  appointment_date: format(aptDate, "yyyy-MM-dd"),
                  appointment_time: selectedTime,
                  notes,
                  service_name: service?.name,
                  service_price: service?.price,
                })
                .eq('id', apt.id);
            }
            
            toast({
              title: "Série Atualizada!",
              description: `Todos os agendamentos da série foram atualizados.`,
            });
          } else if (scope === 'future') {
            // Update this and future appointments
            const { data: futureAppointments, error: fetchError } = await supabase
              .from('appointments')
              .select('id, appointment_date')
              .eq('recurrence_group_id', appointment.recurrence_group_id)
              .gte('recurrence_index', appointment.recurrence_index)
              .neq('status', 'cancelado')
              .neq('status', 'concluido');
            
            if (fetchError) throw fetchError;
            
            for (const apt of futureAppointments || []) {
              const aptDate = new Date(apt.appointment_date);
              aptDate.setDate(aptDate.getDate() + daysDiff);
              
              await supabase
                .from('appointments')
                .update({
                  staff_id: selectedBarber,
                  service_id: selectedService,
                  appointment_date: format(aptDate, "yyyy-MM-dd"),
                  appointment_time: selectedTime,
                  notes,
                  service_name: service?.name,
                  service_price: service?.price,
                })
                .eq('id', apt.id);
            }
            
            toast({
              title: "Agendamentos Atualizados!",
              description: `Este e os próximos agendamentos foram atualizados.`,
            });
          }
        } else {
          // Single appointment update (regular or single from recurring)
          const updateData: any = {
            ...appointmentData,
          };
          
          // If editing single from recurring, save original_date
          if (isEditingRecurring && scope === 'single') {
            updateData.original_date = appointment.appointment_date;
          }
          
          const { error: appointmentError } = await supabase
            .from('appointments')
            .update(updateData)
            .eq('id', appointment.id);

          if (appointmentError) throw appointmentError;

          toast({
            title: "Agendamento Atualizado!",
            description: `Agendamento para ${clientName} atualizado com sucesso.`,
          });

          // Enviar notificação de alteração via WhatsApp
          sendWhatsAppUpdateNotification(appointment.id, {
            clientName,
            clientPhone,
            date,
            time: selectedTime,
            serviceName: service?.name || 'Serviço',
            barberName: selectedBarberData?.name || 'Profissional'
          });
        }
      } else {
        const { data: insertedData, error: appointmentError } = await supabase
          .from('appointments')
          .insert(appointmentData)
          .select()
          .single();

        if (appointmentError) throw appointmentError;

        toast({
          title: "Agendamento Criado!",
          description: `Agendamento para ${clientName} em ${format(date, "dd/MM/yyyy")} às ${selectedTime}`,
        });

        // Enviar confirmação via WhatsApp (não bloqueia o fechamento)
        if (insertedData?.id) {
          sendWhatsAppConfirmation(insertedData.id, {
            clientName,
            clientPhone,
            date,
            time: selectedTime,
            serviceName: service?.name || 'Serviço',
            barberName: selectedBarberData?.name || 'Profissional'
          });
        }
      }

      // Fecha o modal após sucesso
      setLoading(false);
      setTimeout(() => {
        onClose?.();
      }, 100);
    } catch (error: any) {
      toast({
        title: appointment ? 'Erro ao atualizar agendamento' : 'Erro ao criar agendamento',
        description: error.message,
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const getStepNumber = (step: WizardStep): number => {
    const steps: WizardStep[] = hasMultipleUnits 
      ? ['unit', 'professional', 'service', 'datetime', 'client', 'confirm']
      : ['professional', 'service', 'datetime', 'client', 'confirm'];
    return steps.indexOf(step) + 1;
  };
  
  const totalSteps = hasMultipleUnits ? 6 : 5;
  const wizardSteps: WizardStep[] = hasMultipleUnits 
    ? ['unit', 'professional', 'service', 'datetime', 'client', 'confirm']
    : ['professional', 'service', 'datetime', 'client', 'confirm'];
  
  const selectedUnitData = selectableUnits.find(b => b.id === selectedUnitId);

  const selectedServiceData = services.find(s => s.id === selectedService);
  const selectedBarberData = staff.find(s => s.id === selectedBarber);

  return (
    <div className="w-full">
      <Card className="barbershop-card w-full border-0 shadow-none">
        <CardHeader className="space-y-3 sm:space-y-4 px-3 sm:px-6 pt-4 sm:pt-6">
          <div className="flex items-start sm:items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-2xl flex-wrap">
                <CalendarIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
                <span className="truncate">{appointment ? 'Editar Agendamento' : 'Novo Agendamento'}</span>
                {isEditingRecurring && (
                  <RecurrenceBadge
                    recurrenceIndex={appointment?.recurrence_index ?? 0}
                    totalInSeries={appointment?.totalInSeries}
                    recurrenceRule={appointment?.recurrence_rule}
                    isRescheduled={appointment?.original_date && appointment?.original_date !== appointment?.appointment_date}
                    className="text-xs"
                  />
                )}
              </CardTitle>
              <CardDescription className="mt-1 sm:mt-2 text-xs sm:text-sm line-clamp-2">
                {currentStep === 'unit' && 'Selecione a unidade para o agendamento'}
                {currentStep === 'professional' && 'Escolha o profissional'}
                {currentStep === 'service' && 'Escolha o serviço desejado'}
                {currentStep === 'datetime' && 'Selecione data e horário disponível'}
                {currentStep === 'client' && 'Selecione ou cadastre um cliente'}
                {currentStep === 'confirm' && 'Revise e confirme o agendamento'}
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs sm:text-sm flex-shrink-0 whitespace-nowrap">
              Passo {getStepNumber(currentStep)} de {totalSteps}
            </Badge>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1">
            {wizardSteps.map((step, index) => (
              <div key={step} className="flex items-center flex-1 min-w-0">
                <div className={cn(
                  "flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 transition-all flex-shrink-0",
                  currentStep === step ? "border-primary bg-primary text-primary-foreground" :
                  getStepNumber(currentStep) > getStepNumber(step) ? "border-primary bg-primary/10 text-primary" :
                  "border-muted-foreground/30 text-muted-foreground"
                )}>
                  {getStepNumber(currentStep) > getStepNumber(step) ? (
                    <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4" />
                  ) : (
                    <span className="text-[10px] sm:text-xs font-semibold">{index + 1}</span>
                  )}
                </div>
                {index < wizardSteps.length - 1 && (
                  <div className={cn(
                    "flex-1 h-0.5 mx-0.5 sm:mx-2 transition-all min-w-2",
                    getStepNumber(currentStep) > getStepNumber(step) ? "bg-primary" : "bg-muted-foreground/30"
                  )} />
                )}
              </div>
            ))}
          </div>
        </CardHeader>

        <CardContent className="space-y-4 sm:space-y-6 px-3 sm:px-6 pb-4 sm:pb-6">
          {/* Step 1: Unit Selection (only for multi-unit users) */}
          {currentStep === 'unit' && hasMultipleUnits && (
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2 text-base sm:text-lg font-semibold">
                <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                <span className="truncate">Selecione a Unidade</span>
              </div>
              
              <div className="grid grid-cols-1 gap-2 sm:gap-3">
                {selectableUnits.map((unit) => (
                  <button
                    key={unit.id}
                    type="button"
                    onClick={() => {
                      setSelectedUnitId(unit.id);
                      // Limpa dados anteriores ao trocar de unidade
                      setSelectedService("");
                      setSelectedBarber("");
                      setDate(undefined);
                      setSelectedTime("");
                    }}
                    className={cn(
                      "p-3 sm:p-4 rounded-lg border-2 text-left transition-all",
                      selectedUnitId === unit.id
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-primary/50"
                    )}
                  >
                    <div className="font-medium text-sm sm:text-base truncate">{unit.name}</div>
                    {unit.is_primary && (
                      <Badge variant="secondary" className="mt-1 text-xs">
                        Unidade Principal
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Step 5: Client Selection */}
          {currentStep === 'client' && (
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2 text-base sm:text-lg font-semibold">
                <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                <span className="truncate">Informações do Cliente</span>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                  <Input
                    placeholder="Buscar cliente existente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 text-sm"
                  />
                </div>

                {searchTerm && filteredClients.length > 0 && (
                  <div className="absolute w-full left-0 right-0 border rounded-lg max-h-48 overflow-y-auto bg-card shadow-lg z-20">
                    {filteredClients.map((client) => (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => {
                          selectClient(client);
                          setSearchTerm("");
                        }}
                        className="w-full p-3 text-left hover:bg-muted/50 transition-colors border-b last:border-b-0"
                      >
                        <div className="font-medium text-sm">{client.name}</div>
                        <div className="text-xs sm:text-sm text-muted-foreground">{client.phone}</div>
                      </button>
                    ))}
                  </div>
                )}

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      ou cadastre novo
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="client-name" className="text-sm">Nome Completo *</Label>
                    <Input
                      id="client-name"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Nome do cliente"
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client-phone" className="text-sm">Telefone *</Label>
                    <Input
                      id="client-phone"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="(11) 99999-9999"
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Professional Selection */}
          {currentStep === 'professional' && (
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2 text-base sm:text-lg font-semibold">
                <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                <span className="truncate">Selecione o Profissional</span>
              </div>

              <div className="space-y-4">
                <Select value={selectedBarber} onValueChange={setSelectedBarber}>
                  <SelectTrigger className="w-full text-sm">
                    <SelectValue placeholder="Selecione um profissional..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-[9999]">
                    {staff.map((member) => (
                      <SelectItem key={member.id} value={member.id} className="text-sm">
                        <div className="flex items-center gap-2">
                          <StaffAvatar
                            src={member.avatar_url}
                            alt={member.name}
                            fallbackText={member.name}
                            size="xs"
                            className="flex-shrink-0"
                            fallbackClassName="bg-primary/10 text-primary"
                          />
                          <span>{member.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                    {staff.length === 0 && (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        Nenhum profissional disponível
                      </div>
                    )}
                  </SelectContent>
                </Select>
                
                {/* Detalhes do profissional selecionado */}
                {selectedBarberData && (
                  <div className="p-3 sm:p-4 rounded-lg border bg-muted/30 flex items-center gap-3">
                    <StaffAvatar
                      src={selectedBarberData.avatar_url}
                      alt={selectedBarberData.name}
                      fallbackText={selectedBarberData.name}
                      className="h-12 w-12 flex-shrink-0"
                      fallbackClassName="bg-primary/10 text-primary"
                    />
                    <div>
                      <div className="font-medium text-sm sm:text-base">{selectedBarberData.name}</div>
                      <div className="text-xs text-muted-foreground">Profissional selecionado</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Service Selection */}
          {currentStep === 'service' && (
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2 text-base sm:text-lg font-semibold">
                <Scissors className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                <span className="truncate">Selecione o Serviço</span>
              </div>

              {(() => {
                // Filtra serviços baseado no profissional selecionado
                const filteredServices = services.filter(service => {
                  // Se o profissional não tem restrições de serviço configuradas, mostra todos
                  if (!staffHasServiceRestrictions(selectedBarber)) {
                    return true;
                  }
                  // Se tem restrições, mostra apenas os serviços que ele atende
                  return staffProvidesService(selectedBarber, service.id);
                });

                return (
                  <div className="space-y-4">
                    <Select value={selectedService} onValueChange={setSelectedService}>
                      <SelectTrigger className="w-full text-sm">
                        <SelectValue placeholder="Selecione um serviço..." />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-[9999]">
                        {filteredServices.map((service) => (
                          <SelectItem key={service.id} value={service.id} className="text-sm">
                            <div className="flex items-center justify-between gap-4 w-full">
                              <span>{service.name}</span>
                              <span className="text-muted-foreground text-xs">
                                {formatDuration(service.duration)} • R$ {service.price.toFixed(2)}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                        {filteredServices.length === 0 && (
                          <div className="text-center py-4 text-muted-foreground text-sm">
                            Nenhum serviço disponível
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                    
                    {/* Detalhes do serviço selecionado */}
                    {selectedServiceData && (
                      <div className="p-3 sm:p-4 rounded-lg border bg-muted/30">
                        <div className="font-medium text-sm sm:text-base">{selectedServiceData.name}</div>
                        {selectedServiceData.description && (
                          <p className="text-xs sm:text-sm text-muted-foreground mt-1">{selectedServiceData.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs sm:text-sm">
                          <Badge variant="secondary" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatDuration(selectedServiceData.duration)}
                          </Badge>
                          <span className="font-semibold text-primary">R$ {selectedServiceData.price.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Step 4: Date & Time Selection */}
          {currentStep === 'datetime' && (
            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-center gap-2 text-base sm:text-lg font-semibold">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                <span className="truncate">Data e Horário</span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:gap-6">
                <div className="space-y-2">
                  <Label className="text-sm">Selecione a Data *</Label>
                  <div className="border rounded-lg p-2 sm:p-4 bg-card overflow-x-auto">
                    <TooltipProvider delayDuration={200}>
                      <Calendar
                        mode="single"
                        selected={date}
                        month={calendarMonth}
                        onMonthChange={setCalendarMonth}
                        onSelect={(newDate) => {
                          if (newDate) {
                            const validation = validateDateTime(newDate);
                            if (!validation.isValid) {
                              setDateValidationMessage(validation.reason || "Data indisponível");
                              sonnerToast.error(validation.reason || "Data indisponível");
                            } else {
                              setDateValidationMessage("");
                              setDate(newDate);
                            }
                          }
                        }}
                        disabled={(date) => {
                          const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
                          if (isPast) return true;
                          
                          const dateStr = format(date, 'yyyy-MM-dd');
                          if (dayAvailability[dateStr] === 'full' || dayAvailability[dateStr] === 'closed') {
                            return true;
                          }
                          
                          const validation = validateDateTime(date);
                          return !validation.isValid;
                        }}
                        modifiers={{
                          available: (date) => {
                            const dateStr = format(date, 'yyyy-MM-dd');
                            return dayAvailability[dateStr] === 'available';
                          },
                          partial: (date) => {
                            const dateStr = format(date, 'yyyy-MM-dd');
                            return dayAvailability[dateStr] === 'partial';
                          },
                          full: (date) => {
                            const dateStr = format(date, 'yyyy-MM-dd');
                            return dayAvailability[dateStr] === 'full';
                          },
                        }}
                        modifiersStyles={{
                          available: {
                            backgroundColor: 'hsl(var(--chart-2) / 0.15)',
                            borderRadius: '9999px',
                          },
                          partial: {
                            backgroundColor: 'hsl(var(--chart-4) / 0.2)',
                            borderRadius: '9999px',
                          },
                          full: {
                            backgroundColor: 'hsl(var(--destructive) / 0.15)',
                            borderRadius: '9999px',
                            color: 'hsl(var(--muted-foreground))',
                          },
                        }}
                        components={{
                          DayContent: ({ date: dayDate, ...props }) => {
                            const dateStr = format(dayDate, 'yyyy-MM-dd');
                            const slotInfo = daySlotCounts[dateStr];
                            const availability = dayAvailability[dateStr];
                            const isPast = dayDate < new Date(new Date().setHours(0, 0, 0, 0));
                            
                            if (isPast || !selectedBarber || !selectedService) {
                              return <span>{dayDate.getDate()}</span>;
                            }
                            
                            const tooltipText = availability === 'closed' 
                              ? 'Fechado'
                              : availability === 'full'
                              ? 'Sem horários disponíveis'
                              : slotInfo
                              ? `${slotInfo.available} de ${slotInfo.total} horários disponíveis`
                              : 'Carregando...';
                            
                            // Determine indicator color
                            let indicatorClass = '';
                            if (availability === 'available') {
                              indicatorClass = 'bg-green-500';
                            } else if (availability === 'partial') {
                              indicatorClass = 'bg-amber-500';
                            } else if (availability === 'full') {
                              indicatorClass = 'bg-red-500';
                            }
                            
                            return (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="relative w-full h-full flex flex-col items-center justify-center">
                                    <span>{dayDate.getDate()}</span>
                                    {indicatorClass && (
                                      <div 
                                        className={cn(
                                          "absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full",
                                          indicatorClass
                                        )}
                                      />
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">
                                  <p>{tooltipText}</p>
                                </TooltipContent>
                              </Tooltip>
                            );
                          }
                        }}
                        locale={ptBR}
                        className="pointer-events-auto w-full mx-auto"
                      />
                    </TooltipProvider>
                  </div>
                  
                  {/* Legend */}
                  {selectedBarber && selectedService && (
                    <div className="flex flex-wrap gap-2 sm:gap-3 text-[10px] sm:text-xs mt-2">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-chart-2/30 border border-chart-2/50" />
                        <span className="text-muted-foreground">Disponível</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-chart-4/40 border border-chart-4/60" />
                        <span className="text-muted-foreground">Poucos</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-destructive/20 border border-destructive/40" />
                        <span className="text-muted-foreground">Lotado</span>
                      </div>
                    </div>
                  )}
                  
                  {dateValidationMessage && (
                    <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                      {dateValidationMessage}
                    </div>
                  )}
                  {date && !dateValidationMessage && (
                    <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                      {(() => {
                        const validation = validateDateTime(date);
                        if (validation.availableHours) {
                          return (
                            <>
                              <div className="font-medium text-foreground mb-1">Horário de funcionamento:</div>
                              <div>{validation.availableHours.start} às {validation.availableHours.end}</div>
                              {validation.availableHours.breakStart && validation.availableHours.breakEnd && (
                                <div className="text-xs mt-1">
                                  Intervalo: {validation.availableHours.breakStart} às {validation.availableHours.breakEnd}
                                </div>
                              )}
                            </>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Horários Disponíveis *</Label>
                  {!date || !selectedBarber ? (
                    <div className="border rounded-lg p-6 sm:p-8 text-center text-muted-foreground text-sm">
                      {!selectedBarber ? 'Selecione um profissional primeiro' : 'Selecione uma data'}
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="border rounded-lg p-4 sm:p-6 text-center space-y-3 sm:space-y-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
                        <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground mb-1 text-sm sm:text-base">Dia lotado</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">Todos os horários ocupados</p>
                      </div>
                      
                      {!showWaitlistForm ? (
                        <div className="pt-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowWaitlistForm(true)}
                            className="gap-2"
                          >
                            <ListPlus className="h-4 w-4" />
                            Entrar na Lista de Espera
                          </Button>
                          <p className="text-xs text-muted-foreground mt-2">
                            Avisaremos quando um horário ficar disponível
                          </p>
                        </div>
                      ) : (
                        <div className="text-left space-y-4 border-t pt-4">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Bell className="h-4 w-4 text-primary" />
                            Lista de Espera
                          </div>
                          
                          <div className="bg-muted/50 rounded-lg p-3 text-sm">
                            <div className="flex justify-between mb-1">
                              <span className="text-muted-foreground">Cliente:</span>
                              <span className="font-medium">{clientName}</span>
                            </div>
                            <div className="flex justify-between mb-1">
                              <span className="text-muted-foreground">Telefone:</span>
                              <span className="font-medium">{clientPhone}</span>
                            </div>
                            <div className="flex justify-between mb-1">
                              <span className="text-muted-foreground">Data:</span>
                              <span className="font-medium">{date && format(date, "dd/MM/yyyy")}</span>
                            </div>
                            {selectedServiceData && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Serviço:</span>
                                <span className="font-medium">{selectedServiceData.name}</span>
                              </div>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="waitlist-notes" className="text-xs">Observações (opcional)</Label>
                            <Textarea
                              id="waitlist-notes"
                              value={waitlistNotes}
                              onChange={(e) => setWaitlistNotes(e.target.value)}
                              placeholder="Ex: Prefiro horário pela manhã..."
                              rows={2}
                              className="text-sm"
                            />
                          </div>

                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setShowWaitlistForm(false);
                                setWaitlistNotes("");
                              }}
                              disabled={savingWaitlist}
                            >
                              Cancelar
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={handleJoinWaitlist}
                              disabled={savingWaitlist}
                              className="flex-1"
                            >
                              {savingWaitlist ? 'Salvando...' : 'Confirmar Inscrição'}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="border rounded-lg p-4 max-h-[400px] overflow-y-auto bg-card">
                      <div className="grid grid-cols-3 gap-2">
                        {availableSlots.map((time) => {
                          const isSelected = selectedTime === time;
                          
                          return (
                            <Button
                              key={time}
                              type="button"
                              variant={isSelected ? "default" : "outline"}
                              onClick={() => setSelectedTime(time)}
                              className={cn(
                                "relative transition-all hover:scale-105",
                                isSelected && "ring-2 ring-primary ring-offset-2"
                              )}
                            >
                              {time}
                              {isSelected && <CheckCircle2 className="absolute right-1 top-1 h-3 w-3" />}
                            </Button>
                          );
                        })}
                      </div>
                      <div className="mt-3 pt-3 border-t text-xs text-muted-foreground text-center">
                        {availableSlots.length} {availableSlots.length === 1 ? 'horário disponível' : 'horários disponíveis'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Confirmation */}
          {currentStep === 'confirm' && (
            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-center gap-2 text-base sm:text-lg font-semibold">
                <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                <span className="truncate">Confirmar Agendamento</span>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <Card className="barbershop-card">
                  <CardContent className="pt-4 sm:pt-6 space-y-3 sm:space-y-4 px-3 sm:px-6">
                    {/* Mostrar unidade selecionada se multi-unidade */}
                    {hasMultipleUnits && selectedUnitData && (
                      <div className="flex items-start gap-2 sm:gap-3">
                        <Scissors className="h-4 w-4 sm:h-5 sm:w-5 text-primary mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm text-muted-foreground">Unidade</p>
                          <p className="font-semibold text-sm sm:text-base truncate">{selectedUnitData.name}</p>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-start gap-2 sm:gap-3">
                      <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm text-muted-foreground">Cliente</p>
                        <p className="font-semibold text-sm sm:text-base truncate">{clientName}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">{clientPhone}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 sm:gap-3">
                      <Scissors className="h-4 w-4 sm:h-5 sm:w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm text-muted-foreground">Serviço</p>
                        <p className="font-semibold text-sm sm:text-base truncate">{selectedServiceData?.name}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {formatDuration(selectedServiceData?.duration || 0)} - R$ {selectedServiceData?.price.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 sm:gap-3">
                      <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm text-muted-foreground">Profissional</p>
                        <p className="font-semibold text-sm sm:text-base truncate">{selectedBarberData?.name}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 sm:gap-3">
                      <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm text-muted-foreground">Data e Horário</p>
                        <p className="font-semibold text-sm sm:text-base">
                          {date && format(date, "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                        <p className="text-xs sm:text-sm text-muted-foreground">{selectedTime}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-sm">Observações</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Adicione observações sobre o agendamento..."
                    rows={2}
                    className="text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-4 sm:pt-6 border-t gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={currentStep === 'unit' || (currentStep === 'professional' && !hasMultipleUnits) ? onClose : handleBack}
              disabled={loading}
              className="text-xs sm:text-sm"
            >
              <ChevronLeft className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">{currentStep === 'unit' || (currentStep === 'professional' && !hasMultipleUnits) ? 'Cancelar' : 'Voltar'}</span>
              <span className="xs:hidden">{currentStep === 'unit' || (currentStep === 'professional' && !hasMultipleUnits) ? 'Cancelar' : 'Voltar'}</span>
            </Button>

            {currentStep === 'confirm' ? (
              <Button
                type="button"
                variant="premium"
                size="sm"
                onClick={handleSubmitClick}
                disabled={loading}
                className="text-xs sm:text-sm"
              >
                <span className="hidden sm:inline">{loading ? 'Salvando...' : (appointment ? 'Atualizar Agendamento' : 'Confirmar Agendamento')}</span>
                <span className="sm:hidden">{loading ? 'Salvando...' : 'Confirmar'}</span>
                <CheckCircle2 className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="premium"
                size="sm"
                onClick={handleNext}
                disabled={
                  (currentStep === 'unit' && !canProceedFromUnit) ||
                  (currentStep === 'professional' && !canProceedFromProfessional) ||
                  (currentStep === 'service' && !canProceedFromService) ||
                  (currentStep === 'datetime' && !canProceedFromDateTime) ||
                  (currentStep === 'client' && !canProceedFromClient)
                }
                className="text-xs sm:text-sm"
              >
                Próximo
                <ChevronRight className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Recurrence Action Dialog for editing recurring appointments */}
      {isEditingRecurring && (
        <RecurrenceActionDialog
          open={recurrenceActionOpen}
          onOpenChange={setRecurrenceActionOpen}
          action="reschedule"
          currentIndex={appointment?.recurrence_index ?? 0}
          totalInSeries={appointment?.totalInSeries ?? 0}
          onConfirm={handleRecurrenceConfirm}
        />
      )}
    </div>
  );
};
