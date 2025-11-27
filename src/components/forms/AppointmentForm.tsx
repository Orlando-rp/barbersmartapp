import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Clock, User, Scissors, CheckCircle2, ChevronRight, ChevronLeft, Search } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

interface AppointmentFormProps {
  appointment?: any;
  onClose?: () => void;
}

const timeSlots = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00"
];

type WizardStep = 'client' | 'service' | 'datetime' | 'confirm';

export const AppointmentForm = ({ appointment, onClose }: AppointmentFormProps) => {
  const { barbershopId } = useAuth();
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState<WizardStep>('client');
  
  const [clientId, setClientId] = useState(appointment?.client_id || "");
  const [clientName, setClientName] = useState(appointment?.client_name || "");
  const [clientPhone, setClientPhone] = useState(appointment?.client_phone || "");
  const [selectedService, setSelectedService] = useState(appointment?.service_id || "");
  const [selectedBarber, setSelectedBarber] = useState(appointment?.staff_id || "");
  const [date, setDate] = useState<Date | undefined>(
    appointment?.appointment_date ? new Date(appointment.appointment_date) : undefined
  );
  const [selectedTime, setSelectedTime] = useState(appointment?.appointment_time || "");
  const [notes, setNotes] = useState(appointment?.notes || "");
  const [loading, setLoading] = useState(false);
  
  const [services, setServices] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);

  useEffect(() => {
    if (barbershopId) {
      fetchServices();
      fetchStaff();
      fetchClients();
    }
  }, [barbershopId]);

  useEffect(() => {
    if (date && selectedBarber) {
      fetchAvailableSlots();
    } else {
      setAvailableSlots([]);
      setSelectedTime("");
    }
  }, [date, selectedBarber]);

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
    if (!date || !selectedBarber) {
      setAvailableSlots([]);
      return;
    }

    try {
      const formattedDate = format(date, "yyyy-MM-dd");
      
      console.log('🔍 Buscando horários para:', {
        date: formattedDate,
        barber: selectedBarber,
        barbershop: barbershopId
      });
      
      const { data, error } = await supabase
        .from('appointments')
        .select('appointment_time, id, status')
        .eq('barbershop_id', barbershopId)
        .eq('staff_id', selectedBarber)
        .eq('appointment_date', formattedDate)
        .in('status', ['pendente', 'confirmado', 'concluido']);

      if (error) throw error;

      console.log('📅 Agendamentos encontrados:', data);

      const booked = (data || [])
        .filter(apt => !appointment || apt.id !== appointment.id)
        .map(apt => apt.appointment_time);
      
      console.log('🚫 Horários ocupados:', booked);
      
      setBookedSlots(booked);
      
      // Apenas horários realmente disponíveis
      const available = timeSlots.filter(slot => !booked.includes(slot));
      
      console.log('✅ Horários disponíveis:', available);
      
      setAvailableSlots(available);
      
      // Se o horário selecionado não está mais disponível, limpar
      if (selectedTime && !available.includes(selectedTime) && (!appointment || appointment.appointment_time !== selectedTime)) {
        console.log('⚠️ Limpando horário selecionado:', selectedTime);
        setSelectedTime("");
      }
    } catch (error: any) {
      console.error('❌ Erro ao carregar horários:', error);
      setAvailableSlots([]);
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

  const sendWhatsAppConfirmation = async (data: {
    clientName: string;
    clientPhone: string;
    date: Date;
    time: string;
    serviceName: string;
    barberName: string;
  }) => {
    try {
      const message = `Olá ${data.clientName}! 

Seu agendamento foi confirmado:
📅 Data: ${format(data.date, "dd/MM/yyyy", { locale: ptBR })}
⏰ Horário: ${data.time}
✂️ Serviço: ${data.serviceName}
👤 Profissional: ${data.barberName}

Nos vemos em breve! 💈`;

      const { error } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          to: data.clientPhone,
          message: message,
          type: 'text'
        }
      });

      if (error) {
        console.error('Erro ao enviar WhatsApp:', error);
      } else {
        console.log('✅ Confirmação enviada via WhatsApp');
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
        const { error: appointmentError } = await supabase
          .from('appointments')
          .insert(appointmentData);

        if (appointmentError) throw appointmentError;

        toast({
          title: "Agendamento Criado!",
          description: `Agendamento para ${clientName} em ${format(date, "dd/MM/yyyy")} às ${selectedTime}`,
        });

        // Enviar confirmação via WhatsApp
        sendWhatsAppConfirmation({
          clientName,
          clientPhone,
          date,
          time: selectedTime,
          serviceName: service?.name || 'Serviço',
          barberName: selectedBarberData?.name || 'Profissional'
        });
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
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      locale={ptBR}
                      className="pointer-events-auto w-full mx-auto"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Horários Disponíveis *</Label>
                  {!date || !selectedBarber ? (
                    <div className="border rounded-lg p-8 text-center text-muted-foreground">
                      {!selectedBarber ? 'Selecione um profissional primeiro' : 'Selecione uma data'}
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="border rounded-lg p-8 text-center">
                      <p className="text-muted-foreground mb-2">Nenhum horário disponível</p>
                      <p className="text-sm text-muted-foreground">Tente outra data</p>
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
