import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { CalendarIcon, Clock, User, Scissors, CheckCircle2, ChevronRight, ChevronLeft, Search, Bell, ListPlus, Building2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn, formatDuration } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useBusinessHoursValidation } from "@/hooks/useBusinessHoursValidation";
import { useSharedBarbershopId } from "@/hooks/useSharedBarbershopId";
import { useStaffServices } from "@/hooks/useStaffServices";
import { toast as sonnerToast } from "sonner";
import { DayProps, DayContent } from "react-day-picker";

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

type WizardStep = 'unit' | 'professional' | 'service' | 'datetime' | 'client' | 'confirm';

export const AppointmentForm = ({ appointment, onClose, waitlistPrefill }: AppointmentFormProps) => {
  const { barbershopId, barbershops, user } = useAuth();
  const { sharedBarbershopId, allRelatedBarbershopIds } = useSharedBarbershopId();
  const { staffProvidesService, staffHasServiceRestrictions } = useStaffServices(sharedBarbershopId);
  const { toast } = useToast();
  
  // Se o usuário tem múltiplas barbearias, começa na seleção de unidade
  const hasMultipleUnits = barbershops && barbershops.length > 1;
  const [currentStep, setCurrentStep] = useState<WizardStep>(hasMultipleUnits ? 'unit' : 'professional');
  const [selectedUnitId, setSelectedUnitId] = useState<string>(barbershopId || "");
  
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
  
  // Usa a unidade selecionada no wizard ou o barbershopId do contexto
  const effectiveBarbershopId = selectedUnitId || barbershopId;
  
  const { validateDateTime, generateTimeSlots, checkTimeOverlap, loading: validationLoading } = useBusinessHoursValidation(effectiveBarbershopId);

  // Busca serviços e clientes da matriz (dados compartilhados)
  useEffect(() => {
    if (sharedBarbershopId && allRelatedBarbershopIds.length > 0) {
      fetchServices();
      fetchClients();
    }
  }, [sharedBarbershopId, allRelatedBarbershopIds]);

  // Busca staff da unidade específica e reseta seleções quando unidade muda
  useEffect(() => {
    if (effectiveBarbershopId) {
      fetchStaff();
      // Reseta profissional, serviço, data e horário quando a unidade muda
      // para garantir que apenas profissionais da unidade selecionada apareçam
      if (selectedUnitId && selectedUnitId !== barbershopId) {
        setSelectedBarber("");
        setSelectedService("");
        setDate(undefined);
        setSelectedTime("");
      }
    }
  }, [effectiveBarbershopId, selectedUnitId]);

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
    try {
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('id, user_id')
        .eq('barbershop_id', effectiveBarbershopId)
        .eq('active', true);

      if (staffError) throw staffError;

      if (!staffData || staffData.length === 0) {
        setStaff([]);
        return;
      }

      const userIds = staffData.map(s => s.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const transformedStaff = staffData.map((member) => {
        const profile = profilesData?.find(p => p.id === member.user_id);
        return {
          id: member.id,
          name: profile?.full_name || 'Nome não disponível'
        };
      });
      
      setStaff(transformedStaff);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar equipe',
        description: error.message,
        variant: 'destructive',
      });
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
      date: Date;
      time: string;
      serviceName: string;
      barberName: string;
    }
  ) => {
    try {
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

      // Montar mensagem de confirmação
      const message = `Olá ${data.clientName}! 👋

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
      date: Date;
      time: string;
      serviceName: string;
      barberName: string;
    }
  ) => {
    try {
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

  const handleSubmit = async () => {
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
        const { error: appointmentError } = await supabase
          .from('appointments')
          .update(appointmentData)
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

        // Enviar confirmação via WhatsApp
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

      onClose?.();
    } catch (error: any) {
      toast({
        title: appointment ? 'Erro ao atualizar agendamento' : 'Erro ao criar agendamento',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
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
  
  const selectedUnitData = barbershops?.find(b => b.id === selectedUnitId);

  const selectedServiceData = services.find(s => s.id === selectedService);
  const selectedBarberData = staff.find(s => s.id === selectedBarber);

  return (
    <div className="w-full">
      <Card className="barbershop-card w-full border-0 shadow-none">
        <CardHeader className="space-y-4 px-6 pt-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <CalendarIcon className="h-6 w-6 text-primary" />
                {appointment ? 'Editar Agendamento' : 'Novo Agendamento'}
              </CardTitle>
              <CardDescription className="mt-2">
                {currentStep === 'unit' && 'Selecione a unidade para o agendamento'}
                {currentStep === 'professional' && 'Escolha o profissional'}
                {currentStep === 'service' && 'Escolha o serviço desejado'}
                {currentStep === 'datetime' && 'Selecione data e horário disponível'}
                {currentStep === 'client' && 'Selecione ou cadastre um cliente'}
                {currentStep === 'confirm' && 'Revise e confirme o agendamento'}
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-sm">
              Passo {getStepNumber(currentStep)} de {totalSteps}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {wizardSteps.map((step, index) => (
              <div key={step} className="flex items-center flex-1">
                <div className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all",
                  currentStep === step ? "border-primary bg-primary text-primary-foreground" :
                  getStepNumber(currentStep) > getStepNumber(step) ? "border-primary bg-primary/10 text-primary" :
                  "border-muted-foreground/30 text-muted-foreground"
                )}>
                  {getStepNumber(currentStep) > getStepNumber(step) ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <span className="text-xs font-semibold">{index + 1}</span>
                  )}
                </div>
                {index < wizardSteps.length - 1 && (
                  <div className={cn(
                    "flex-1 h-0.5 mx-2 transition-all",
                    getStepNumber(currentStep) > getStepNumber(step) ? "bg-primary" : "bg-muted-foreground/30"
                  )} />
                )}
              </div>
            ))}
          </div>
        </CardHeader>

        <CardContent className="space-y-6 px-6 pb-6">
          {/* Step 1: Unit Selection (only for multi-unit users) */}
          {currentStep === 'unit' && hasMultipleUnits && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Building2 className="h-5 w-5 text-primary" />
                Selecione a Unidade
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {barbershops?.map((unit) => (
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
                      "p-4 rounded-lg border-2 text-left transition-all",
                      selectedUnitId === unit.id
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-primary/50"
                    )}
                  >
                    <div className="font-medium">{unit.name}</div>
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
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <User className="h-5 w-5 text-primary" />
                Informações do Cliente
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                  <Input
                    placeholder="Buscar cliente existente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
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
                        <div className="font-medium">{client.name}</div>
                        <div className="text-sm text-muted-foreground">{client.phone}</div>
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
                      ou cadastre novo cliente
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="client-name">Nome Completo *</Label>
                    <Input
                      id="client-name"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Nome do cliente"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client-phone">Telefone *</Label>
                    <Input
                      id="client-phone"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Professional Selection */}
          {currentStep === 'professional' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <User className="h-5 w-5 text-primary" />
                Selecione o Profissional
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {staff.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => setSelectedBarber(member.id)}
                    className={cn(
                      "p-4 rounded-lg border-2 text-left transition-all",
                      selectedBarber === member.id
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-primary/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={member.avatar_url} alt={member.name} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {member.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || <User className="h-5 w-5" />}
                        </AvatarFallback>
                      </Avatar>
                      <div className="font-medium">{member.name}</div>
                    </div>
                  </button>
                ))}
              </div>
              
              {staff.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum profissional disponível para esta unidade.
                </div>
              )}
            </div>
          )}

          {/* Step 3: Service Selection */}
          {currentStep === 'service' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Scissors className="h-5 w-5 text-primary" />
                Selecione o Serviço
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
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {filteredServices.map((service) => (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() => setSelectedService(service.id)}
                          className={cn(
                            "p-4 rounded-lg border-2 text-left transition-all",
                            selectedService === service.id
                              ? "border-primary bg-primary/5"
                              : "border-muted hover:border-primary/50"
                          )}
                        >
                          <div className="font-medium">{service.name}</div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Clock className="h-3 w-3" />
                            <span>{formatDuration(service.duration)}</span>
                            <span>•</span>
                            <span className="font-semibold text-primary">R$ {service.price.toFixed(2)}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                    
                    {filteredServices.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        Nenhum serviço disponível para este profissional.
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* Step 4: Date & Time Selection */}
          {currentStep === 'datetime' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Clock className="h-5 w-5 text-primary" />
                Data e Horário
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Selecione a Data *</Label>
                  <div className="border rounded-lg p-4 bg-card">
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
                    <div className="flex flex-wrap gap-3 text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-chart-2/30 border border-chart-2/50" />
                        <span className="text-muted-foreground">Disponível</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-chart-4/40 border border-chart-4/60" />
                        <span className="text-muted-foreground">Poucos horários</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-destructive/20 border border-destructive/40" />
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
                  <Label>Horários Disponíveis *</Label>
                  {!date || !selectedBarber ? (
                    <div className="border rounded-lg p-8 text-center text-muted-foreground">
                      {!selectedBarber ? 'Selecione um profissional primeiro' : 'Selecione uma data'}
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="border rounded-lg p-6 text-center space-y-4">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
                        <Clock className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground mb-1">Dia lotado</p>
                        <p className="text-sm text-muted-foreground">Todos os horários estão ocupados para esta data</p>
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
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Confirmar Agendamento
              </div>

              <div className="space-y-4">
                <Card className="barbershop-card">
                  <CardContent className="pt-6 space-y-4">
                    {/* Mostrar unidade selecionada se multi-unidade */}
                    {hasMultipleUnits && selectedUnitData && (
                      <div className="flex items-start gap-3">
                        <Scissors className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Unidade</p>
                          <p className="font-semibold">{selectedUnitData.name}</p>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-start gap-3">
                      <User className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Cliente</p>
                        <p className="font-semibold">{clientName}</p>
                        <p className="text-sm text-muted-foreground">{clientPhone}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Scissors className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Serviço</p>
                        <p className="font-semibold">{selectedServiceData?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDuration(selectedServiceData?.duration || 0)} - R$ {selectedServiceData?.price.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <User className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Profissional</p>
                        <p className="font-semibold">{selectedBarberData?.name}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <CalendarIcon className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Data e Horário</p>
                        <p className="font-semibold">
                          {date && format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </p>
                        <p className="text-sm text-muted-foreground">{selectedTime}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Adicione observações sobre o agendamento..."
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={currentStep === 'unit' || (currentStep === 'professional' && !hasMultipleUnits) ? onClose : handleBack}
              disabled={loading}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              {currentStep === 'unit' || (currentStep === 'professional' && !hasMultipleUnits) ? 'Cancelar' : 'Voltar'}
            </Button>

            {currentStep === 'confirm' ? (
              <Button
                type="button"
                variant="premium"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? 'Salvando...' : (appointment ? 'Atualizar Agendamento' : 'Confirmar Agendamento')}
                <CheckCircle2 className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="premium"
                onClick={handleNext}
                disabled={
                  (currentStep === 'unit' && !canProceedFromUnit) ||
                  (currentStep === 'professional' && !canProceedFromProfessional) ||
                  (currentStep === 'service' && !canProceedFromService) ||
                  (currentStep === 'datetime' && !canProceedFromDateTime) ||
                  (currentStep === 'client' && !canProceedFromClient)
                }
              >
                Próximo
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
