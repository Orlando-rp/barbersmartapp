import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { format, addDays, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar as CalendarIcon, Clock, User, Scissors, Phone, Check, ArrowLeft, ArrowRight } from 'lucide-react';

interface Barbershop {
  id: string;
  name: string;
  address: string;
  phone: string;
}

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  description: string;
}

interface Staff {
  id: string;
  user_id: string;
  profiles: { full_name: string }[] | { full_name: string } | null;
}

interface BusinessHours {
  day_of_week: string;
  is_open: boolean;
  open_time: string;
  close_time: string;
  break_start: string | null;
  break_end: string | null;
}

const dayOfWeekMap: { [key: number]: string } = {
  0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday',
  4: 'thursday', 5: 'friday', 6: 'saturday'
};

const getStaffName = (staff: Staff | null): string => {
  if (!staff?.profiles) return 'Profissional';
  if (Array.isArray(staff.profiles)) {
    return staff.profiles[0]?.full_name || 'Profissional';
  }
  return staff.profiles.full_name || 'Profissional';
};

export default function PublicBooking() {
  const { barbershopId } = useParams<{ barbershopId: string }>();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [barbershop, setBarbershop] = useState<Barbershop | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [businessHours, setBusinessHours] = useState<BusinessHours[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');

  useEffect(() => {
    if (barbershopId) {
      loadBarbershopData();
    }
  }, [barbershopId]);

  useEffect(() => {
    if (selectedDate && selectedStaff && selectedService) {
      loadAvailableSlots();
    }
  }, [selectedDate, selectedStaff, selectedService]);

  const loadBarbershopData = async () => {
    try {
      setLoading(true);

      // Load barbershop info
      const { data: shop, error: shopError } = await supabase
        .from('barbershops')
        .select('id, name, address, phone')
        .eq('id', barbershopId)
        .single();

      if (shopError || !shop) {
        toast({ title: 'Barbearia não encontrada', variant: 'destructive' });
        return;
      }
      setBarbershop(shop);

      // Load active services
      const { data: servicesData } = await supabase
        .from('services')
        .select('id, name, price, duration, description')
        .eq('barbershop_id', barbershopId)
        .eq('active', true)
        .order('name');
      setServices(servicesData || []);

      // Load active staff
      const { data: staffData } = await supabase
        .from('staff')
        .select('id, user_id, profiles(full_name)')
        .eq('barbershop_id', barbershopId)
        .eq('active', true);
      setStaffList(staffData || []);

      // Load business hours
      const { data: hoursData } = await supabase
        .from('business_hours')
        .select('*')
        .eq('barbershop_id', barbershopId);
      setBusinessHours(hoursData || []);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({ title: 'Erro ao carregar dados', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableSlots = async () => {
    if (!selectedDate || !selectedStaff || !selectedService) return;

    const formattedDate = format(selectedDate, 'yyyy-MM-dd');
    const dayOfWeek = dayOfWeekMap[selectedDate.getDay()];

    // Get business hours for this day
    const dayHours = businessHours.find(bh => bh.day_of_week === dayOfWeek);
    if (!dayHours || !dayHours.is_open) {
      setAvailableSlots([]);
      return;
    }

    // Generate all possible slots
    const slots: string[] = [];
    const [startHour, startMinute] = dayHours.open_time.split(':').map(Number);
    const [endHour, endMinute] = dayHours.close_time.split(':').map(Number);
    const endTimeMinutes = endHour * 60 + endMinute;

    let currentHour = startHour;
    let currentMinute = startMinute;

    while (currentHour * 60 + currentMinute + selectedService.duration <= endTimeMinutes) {
      const timeString = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
      
      // Check if slot is during break
      let isInBreak = false;
      if (dayHours.break_start && dayHours.break_end) {
        const slotMinutes = currentHour * 60 + currentMinute;
        const slotEndMinutes = slotMinutes + selectedService.duration;
        const [breakStartHour, breakStartMin] = dayHours.break_start.split(':').map(Number);
        const [breakEndHour, breakEndMin] = dayHours.break_end.split(':').map(Number);
        const breakStartMinutes = breakStartHour * 60 + breakStartMin;
        const breakEndMinutes = breakEndHour * 60 + breakEndMin;

        if (slotMinutes < breakEndMinutes && slotEndMinutes > breakStartMinutes) {
          isInBreak = true;
        }
      }

      if (!isInBreak) {
        slots.push(timeString);
      }

      currentMinute += 30;
      if (currentMinute >= 60) {
        currentHour += 1;
        currentMinute = 0;
      }
    }

    // Get existing appointments for this staff on this date
    const { data: existingAppointments } = await supabase
      .from('appointments')
      .select('appointment_time, duration')
      .eq('barbershop_id', barbershopId)
      .eq('staff_id', selectedStaff.id)
      .eq('appointment_date', formattedDate)
      .neq('status', 'cancelado');

    // Filter out occupied slots
    const bookedSlots = (existingAppointments || []).map(apt => ({
      time: apt.appointment_time,
      duration: apt.duration || 30
    }));

    const availableFilteredSlots = slots.filter(slot => {
      const [slotHour, slotMin] = slot.split(':').map(Number);
      const slotStart = slotHour * 60 + slotMin;
      const slotEnd = slotStart + selectedService.duration;

      for (const booked of bookedSlots) {
        const [bookedHour, bookedMin] = booked.time.split(':').map(Number);
        const bookedStart = bookedHour * 60 + bookedMin;
        const bookedEnd = bookedStart + booked.duration;

        if (slotStart < bookedEnd && slotEnd > bookedStart) {
          return false;
        }
      }
      return true;
    });

    // Filter out past slots if date is today
    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');
    if (formattedDate === today) {
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const finalSlots = availableFilteredSlots.filter(slot => {
        const [h, m] = slot.split(':').map(Number);
        return h * 60 + m > currentMinutes;
      });
      setAvailableSlots(finalSlots);
    } else {
      setAvailableSlots(availableFilteredSlots);
    }
  };

  const isDateDisabled = (date: Date) => {
    if (isBefore(date, startOfDay(new Date()))) return true;
    
    const dayOfWeek = dayOfWeekMap[date.getDay()];
    const dayHours = businessHours.find(bh => bh.day_of_week === dayOfWeek);
    
    return !dayHours || !dayHours.is_open;
  };

  const handleSubmit = async () => {
    if (!selectedService || !selectedStaff || !selectedDate || !selectedTime || !clientName || !clientPhone) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }

    try {
      setSubmitting(true);

      const appointmentData = {
        barbershop_id: barbershopId,
        staff_id: selectedStaff.id,
        service_id: selectedService.id,
        appointment_date: format(selectedDate, 'yyyy-MM-dd'),
        appointment_time: selectedTime,
        duration: selectedService.duration,
        client_name: clientName.trim(),
        client_phone: clientPhone.replace(/\D/g, ''),
        service_name: selectedService.name,
        service_price: selectedService.price,
        status: 'pendente'
      };

      const { error } = await supabase
        .from('appointments')
        .insert(appointmentData);

      if (error) throw error;

      // Try to send WhatsApp confirmation
      try {
        const { data: whatsappConfig } = await supabase
          .from('whatsapp_config')
          .select('config, is_active')
          .eq('barbershop_id', barbershopId)
          .eq('provider', 'evolution')
          .maybeSingle();

        if (whatsappConfig?.is_active && whatsappConfig?.config) {
          const config = whatsappConfig.config as any;
          const staffName = getStaffName(selectedStaff);
          const formattedDate = format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
          
          const message = `Olá ${clientName}! 👋

✅ Seu agendamento foi confirmado!

📅 Data: ${formattedDate}
⏰ Horário: ${selectedTime}
✂️ Serviço: ${selectedService.name}
💈 Profissional: ${staffName}
💰 Valor: R$ ${selectedService.price.toFixed(2)}

Aguardamos você! 💈`;

          await supabase.functions.invoke('send-whatsapp-evolution', {
            body: {
              action: 'sendText',
              apiUrl: config.api_url,
              apiKey: config.api_key,
              instanceName: config.instance_name,
              to: clientPhone,
              message,
              barbershopId,
              recipientName: clientName
            }
          });
        }
      } catch (whatsappError) {
        console.log('WhatsApp notification not sent:', whatsappError);
      }

      setSuccess(true);
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
      toast({ title: 'Erro ao criar agendamento', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return value;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!barbershop) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">Barbearia não encontrada</CardTitle>
            <CardDescription>O link de agendamento é inválido ou expirou.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-600">Agendamento Confirmado!</CardTitle>
            <CardDescription className="mt-4 space-y-2">
              <p><strong>Data:</strong> {selectedDate && format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
              <p><strong>Horário:</strong> {selectedTime}</p>
              <p><strong>Serviço:</strong> {selectedService?.name}</p>
              <p><strong>Profissional:</strong> {getStaffName(selectedStaff)}</p>
              <p className="text-primary font-semibold mt-4">Você receberá uma confirmação por WhatsApp!</p>
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">{barbershop.name}</h1>
          <p className="text-muted-foreground mt-2">Agende seu horário online</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                s === step ? 'bg-primary text-primary-foreground' : 
                s < step ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
              }`}
            >
              {s < step ? <Check className="h-5 w-5" /> : s}
            </div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {step === 1 && <><Scissors className="h-5 w-5" /> Escolha o Serviço</>}
              {step === 2 && <><User className="h-5 w-5" /> Escolha o Profissional</>}
              {step === 3 && <><CalendarIcon className="h-5 w-5" /> Escolha Data e Horário</>}
              {step === 4 && <><Phone className="h-5 w-5" /> Seus Dados</>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Step 1: Service Selection */}
            {step === 1 && (
              <div className="grid gap-3">
                {services.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Nenhum serviço disponível</p>
                ) : (
                  services.map((service) => (
                    <div
                      key={service.id}
                      onClick={() => setSelectedService(service)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedService?.id === service.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{service.name}</h3>
                          {service.description && (
                            <p className="text-sm text-muted-foreground">{service.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary">
                              <Clock className="h-3 w-3 mr-1" />
                              {service.duration} min
                            </Badge>
                          </div>
                        </div>
                        <span className="text-lg font-bold text-primary">
                          R$ {service.price.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Step 2: Staff Selection */}
            {step === 2 && (
              <div className="grid gap-3">
                {staffList.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Nenhum profissional disponível</p>
                ) : (
                  staffList.map((staff) => (
                    <div
                      key={staff.id}
                      onClick={() => setSelectedStaff(staff)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedStaff?.id === staff.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="font-semibold">{getStaffName(staff)}</h3>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Step 3: Date & Time Selection */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <Label className="text-base mb-3 block">Selecione a Data</Label>
                  <div className="flex justify-center">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        setSelectedDate(date);
                        setSelectedTime('');
                      }}
                      disabled={isDateDisabled}
                      fromDate={new Date()}
                      toDate={addDays(new Date(), 60)}
                      locale={ptBR}
                      className="rounded-md border"
                    />
                  </div>
                </div>

                {selectedDate && (
                  <div>
                    <Label className="text-base mb-3 block">Horários Disponíveis</Label>
                    {availableSlots.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">
                        Nenhum horário disponível nesta data
                      </p>
                    ) : (
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                        {availableSlots.map((slot) => (
                          <Button
                            key={slot}
                            variant={selectedTime === slot ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedTime(slot)}
                          >
                            {slot}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Client Info */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="clientName">Seu Nome</Label>
                  <Input
                    id="clientName"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Digite seu nome completo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientPhone">Seu WhatsApp</Label>
                  <Input
                    id="clientPhone"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(formatPhone(e.target.value))}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                  />
                </div>

                {/* Summary */}
                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-3">Resumo do Agendamento</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Serviço:</strong> {selectedService?.name}</p>
                    <p><strong>Profissional:</strong> {getStaffName(selectedStaff)}</p>
                    <p><strong>Data:</strong> {selectedDate && format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                    <p><strong>Horário:</strong> {selectedTime}</p>
                    <p><strong>Valor:</strong> R$ {selectedService?.price.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-6 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                disabled={step === 1}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>

              {step < 4 ? (
                <Button
                  onClick={() => setStep(step + 1)}
                  disabled={
                    (step === 1 && !selectedService) ||
                    (step === 2 && !selectedStaff) ||
                    (step === 3 && (!selectedDate || !selectedTime))
                  }
                >
                  Próximo
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !clientName || !clientPhone}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Confirmar Agendamento
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-muted-foreground text-sm mt-6">
          {barbershop.address && <span>{barbershop.address}</span>}
          {barbershop.phone && <span> • {barbershop.phone}</span>}
        </p>
      </div>
    </div>
  );
}
