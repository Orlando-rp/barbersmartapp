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
import { CalendarIcon, Clock, User, Scissors, CheckCircle2, ChevronRight, ChevronLeft, Search, Bell, ListPlus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useBusinessHoursValidation } from "@/hooks/useBusinessHoursValidation";
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

type WizardStep = 'client' | 'service' | 'datetime' | 'confirm';

export const AppointmentForm = ({ appointment, onClose, waitlistPrefill }: AppointmentFormProps) => {
  const { barbershopId, user } = useAuth();
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState<WizardStep>('client');
  
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
  
  const { validateDateTime, generateTimeSlots, checkTimeOverlap, loading: validationLoading } = useBusinessHoursValidation(barbershopId);

  useEffect(() => {
    if (barbershopId) {
      fetchServices();
      fetchStaff();
      fetchClients();
    }
  }, [barbershopId]);

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
    if (selectedBarber && selectedService && barbershopId) {
      fetchMonthAvailability();
    }
  }, [selectedBarber, selectedService, calendarMonth, barbershopId]);

  // Real-time updates for appointments
  useEffect(() => {
    if (!barbershopId || !date || !selectedBarber) return;

    const formattedDate = format(date, "yyyy-MM-dd");
    
    const channel = supabase
      .channel('appointments-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `barbershop_id=eq.${barbershopId}`
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
  }, [barbershopId, date, selectedBarber]);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, phone, email')
        .eq('barbershop_id', barbershopId)
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar clientes:', error);
    }
  };

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('barbershop_id', barbershopId)
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
        .eq('barbershop_id', barbershopId)
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
        barbershop: barbershopId,
        serviceDuration
      });

      // Step 1: Validate if the date is allowed (check blocked dates, business hours, special hours)
      const dateValidation = validateDateTime(date);
      
      if (!dateValidation.isValid) {
        console.log('❌ Data inválida:', dateValidation.reason);
        sonnerToast.error(dateValidation.reason || 'Data não disponível para agendamento');
        setAvailableSlots([]);
        setSelectedTime("");
        return;
      }

      console.log('✅ Data válida:', dateValidation.availableHours);

      // Step 2: Generate all possible time slots based on business hours AND service duration
      const possibleSlots = generateTimeSlots(date, serviceDuration);
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
        .eq('barbershop_id', barbershopId)
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
    if (!selectedBarber || !selectedService || !barbershopId) {
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
        .eq('barbershop_id', barbershopId)
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
        
        // Check if date is valid (business hours)
        const validation = validateDateTime(currentDate);
        
        if (!validation.isValid) {
          availability[dateStr] = 'closed';
          slotCounts[dateStr] = { available: 0, total: 0 };
        } else {
          // Generate possible slots
          const possibleSlots = generateTimeSlots(currentDate, serviceDuration);
          
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

  const canProceedFromClient = clientName && clientPhone;
  const canProceedFromService = selectedService && selectedBarber;
  const canProceedFromDateTime = date && selectedTime;

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
        .eq('barbershop_id', barbershopId)
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
          barbershopId,
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

  const handleNext = () => {
    if (currentStep === 'client' && canProceedFromClient) {
      setCurrentStep('service');
    } else if (currentStep === 'service' && canProceedFromService) {
      setCurrentStep('datetime');
    } else if (currentStep === 'datetime' && canProceedFromDateTime) {
      setCurrentStep('confirm');
    }
  };

  const handleBack = () => {
    if (currentStep === 'service') setCurrentStep('client');
    else if (currentStep === 'datetime') setCurrentStep('service');
    else if (currentStep === 'confirm') setCurrentStep('datetime');
  };

  const handleJoinWaitlist = async () => {
    if (!date || !barbershopId) {
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
        barbershop_id: barbershopId,
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
        .eq('barbershop_id', barbershopId)
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
          .eq('barbershop_id', barbershopId)
          .eq('phone', clientPhone)
          .maybeSingle();

        if (existingClient) {
          finalClientId = existingClient.id;
        } else {
          const { data: newClient, error: clientError } = await supabase
            .from('clients')
            .insert({
              barbershop_id: barbershopId,
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
        barbershop_id: barbershopId,
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
    const steps: WizardStep[] = ['client', 'service', 'datetime', 'confirm'];
    return steps.indexOf(step) + 1;
  };

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
                {currentStep === 'client' && 'Selecione ou cadastre um cliente'}
                {currentStep === 'service' && 'Escolha o serviço e o profissional'}
                {currentStep === 'datetime' && 'Selecione data e horário disponível'}
                {currentStep === 'confirm' && 'Revise e confirme o agendamento'}
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-sm">
              Passo {getStepNumber(currentStep)} de 4
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {(['client', 'service', 'datetime', 'confirm'] as WizardStep[]).map((step, index) => (
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
                {index < 3 && (
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
          {/* Step 1: Client Selection */}
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

          {/* Step 2: Service Selection */}
          {currentStep === 'service' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Scissors className="h-5 w-5 text-primary" />
                Serviço e Profissional
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Serviço *</Label>
                  <Select value={selectedService} onValueChange={setSelectedService}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          <div className="flex items-center justify-between gap-4">
                            <span className="font-medium">{service.name}</span>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{service.duration}min</span>
                              <span>•</span>
                              <span className="font-semibold text-primary">R$ {service.price.toFixed(2)}</span>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Profissional *</Label>
                  <Select value={selectedBarber} onValueChange={setSelectedBarber}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o profissional" />
                    </SelectTrigger>
                    <SelectContent>
                      {staff.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Date & Time Selection */}
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
                            
                            if (isPast || !slotInfo || !selectedBarber || !selectedService) {
                              return <DayContent date={dayDate} {...props} />;
                            }
                            
                            const tooltipText = availability === 'closed' 
                              ? 'Fechado'
                              : availability === 'full'
                              ? 'Sem horários disponíveis'
                              : `${slotInfo.available} de ${slotInfo.total} horários disponíveis`;
                            
                            return (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="w-full h-full flex items-center justify-center">
                                    <DayContent date={dayDate} {...props} />
                                  </span>
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

          {/* Step 4: Confirmation */}
          {currentStep === 'confirm' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Confirmar Agendamento
              </div>

              <div className="space-y-4">
                <Card className="barbershop-card">
                  <CardContent className="pt-6 space-y-4">
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
                          {selectedServiceData?.duration}min - R$ {selectedServiceData?.price.toFixed(2)}
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
              onClick={currentStep === 'client' ? onClose : handleBack}
              disabled={loading}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              {currentStep === 'client' ? 'Cancelar' : 'Voltar'}
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
                  (currentStep === 'client' && !canProceedFromClient) ||
                  (currentStep === 'service' && !canProceedFromService) ||
                  (currentStep === 'datetime' && !canProceedFromDateTime)
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
