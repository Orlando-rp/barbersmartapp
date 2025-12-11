import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { formatDuration } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { format, addDays, isBefore, startOfDay, eachDayOfInterval, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Calendar as CalendarIcon, Clock, User, Scissors, Phone, Check, ArrowLeft, ArrowRight, Bell, AlertCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

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
  schedule: any;
  profiles: { full_name: string; avatar_url: string | null }[] | { full_name: string; avatar_url: string | null } | null;
}

interface StaffService {
  staff_id: string;
  service_id: string;
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

const getStaffAvatar = (staff: Staff | null): string | null => {
  if (!staff?.profiles) return null;
  if (Array.isArray(staff.profiles)) {
    return staff.profiles[0]?.avatar_url || null;
  }
  return staff.profiles.avatar_url || null;
};

const getStaffInitials = (staff: Staff | null): string => {
  const name = getStaffName(staff);
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
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
  const [staffServices, setStaffServices] = useState<StaffService[]>([]);
  const [businessHours, setBusinessHours] = useState<BusinessHours[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [dayAvailability, setDayAvailability] = useState<Map<string, { available: number; total: number }>>(new Map());

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  
  // Waitlist state
  const [showWaitlistForm, setShowWaitlistForm] = useState(false);
  const [waitlistNotes, setWaitlistNotes] = useState('');
  const [waitlistPreferredTimeStart, setWaitlistPreferredTimeStart] = useState('');
  const [waitlistPreferredTimeEnd, setWaitlistPreferredTimeEnd] = useState('');
  const [submittingWaitlist, setSubmittingWaitlist] = useState(false);
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);
  const [waitlistPosition, setWaitlistPosition] = useState<number | null>(null);

  useEffect(() => {
    if (barbershopId) {
      loadBarbershopData();
      trackVisit();
    }
  }, [barbershopId]);

  // Track page visit for analytics
  const trackVisit = async () => {
    if (!barbershopId) return;
    
    try {
      await supabase.from('public_booking_visits').insert({
        barbershop_id: barbershopId,
        referrer: document.referrer || null,
        user_agent: navigator.userAgent,
      });
    } catch (error) {
      // Silent fail - analytics shouldn't break the page
      console.log('Visit tracking skipped');
    }
  };

  useEffect(() => {
    if (selectedDate && selectedStaff && selectedService) {
      loadAvailableSlots();
    }
  }, [selectedDate, selectedStaff, selectedService]);

  // Calculate availability for calendar visualization
  useEffect(() => {
    if (selectedStaff && selectedService && businessHours.length > 0) {
      calculateMonthAvailability();
    }
  }, [selectedStaff, selectedService, businessHours]);

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

      // Load active staff with schedule and avatar
      const { data: staffData } = await supabase
        .from('staff')
        .select('id, user_id, schedule, profiles(full_name, avatar_url)')
        .eq('barbershop_id', barbershopId)
        .eq('active', true);
      setStaffList(staffData || []);

      // Load staff services relationships
      const { data: staffServicesData } = await supabase
        .from('staff_services')
        .select('staff_id, service_id');
      setStaffServices(staffServicesData || []);

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

  // Filter staff that can perform the selected service
  const filteredStaffList = selectedService 
    ? staffList.filter(staff => {
        // If no staff_services entries exist for this staff, they can do all services
        const staffHasServiceEntries = staffServices.some(ss => ss.staff_id === staff.id);
        if (!staffHasServiceEntries) return true;
        
        // Otherwise, check if service is in their list
        return staffServices.some(ss => ss.staff_id === staff.id && ss.service_id === selectedService.id);
      })
    : staffList;

  // Check if staff works on a specific date based on their schedule
  const staffWorksOnDate = (staff: Staff, date: Date): boolean => {
    if (!staff.schedule) return true; // If no individual schedule, use barbershop hours
    
    const dayOfWeek = dayOfWeekMap[date.getDay()];
    
    // Check if schedule is multi-unit format
    if (staff.schedule.units) {
      // Multi-unit: check if any unit has this day
      for (const unitSchedule of Object.values(staff.schedule.units) as any[]) {
        if (unitSchedule[dayOfWeek]?.enabled) {
          return true;
        }
      }
      return false;
    }
    
    // Single unit schedule format
    const daySchedule = staff.schedule[dayOfWeek];
    return daySchedule?.enabled === true;
  };

  // Get staff schedule for a specific day
  const getStaffScheduleForDay = (staff: Staff, date: Date): { start: string; end: string } | null => {
    if (!staff.schedule) return null;
    
    const dayOfWeek = dayOfWeekMap[date.getDay()];
    
    // Check if schedule is multi-unit format
    if (staff.schedule.units) {
      // Check current barbershop first
      if (staff.schedule.units[barbershopId]) {
        const daySchedule = staff.schedule.units[barbershopId][dayOfWeek];
        if (daySchedule?.enabled) {
          return { start: daySchedule.start, end: daySchedule.end };
        }
      }
      return null;
    }
    
    // Single unit schedule format
    const daySchedule = staff.schedule[dayOfWeek];
    if (daySchedule?.enabled) {
      return { start: daySchedule.start, end: daySchedule.end };
    }
    return null;
  };

  const loadAvailableSlots = async () => {
    if (!selectedDate || !selectedStaff || !selectedService) return;

    const formattedDate = format(selectedDate, 'yyyy-MM-dd');
    const dayOfWeek = dayOfWeekMap[selectedDate.getDay()];

    // First check if staff works on this day
    if (!staffWorksOnDate(selectedStaff, selectedDate)) {
      setAvailableSlots([]);
      return;
    }

    // Get staff-specific schedule for the day
    const staffDaySchedule = getStaffScheduleForDay(selectedStaff, selectedDate);

    // Get business hours for this day
    const dayHours = businessHours.find(bh => bh.day_of_week === dayOfWeek);
    if (!dayHours || !dayHours.is_open) {
      setAvailableSlots([]);
      return;
    }

    // Use staff schedule if available, otherwise use barbershop hours
    const openTime = staffDaySchedule?.start || dayHours.open_time;
    const closeTime = staffDaySchedule?.end || dayHours.close_time;

    // Generate all possible slots based on staff or barbershop schedule
    const slots: string[] = [];
    const [startHour, startMinute] = openTime.split(':').map(Number);
    const [endHour, endMinute] = closeTime.split(':').map(Number);
    const endTimeMinutes = endHour * 60 + endMinute;

    let currentHour = startHour;
    let currentMinute = startMinute;

    while (currentHour * 60 + currentMinute + selectedService.duration <= endTimeMinutes) {
      const timeString = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
      
      // Check if slot is during break (only if not using staff schedule)
      let isInBreak = false;
      if (!staffDaySchedule && dayHours.break_start && dayHours.break_end) {
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

  const isDateDisabledForStaff = (date: Date) => {
    if (isBefore(date, startOfDay(new Date()))) return true;
    
    const dayOfWeek = dayOfWeekMap[date.getDay()];
    const dayHours = businessHours.find(bh => bh.day_of_week === dayOfWeek);
    
    // Check if barbershop is open
    if (!dayHours || !dayHours.is_open) return true;
    
    // If staff is selected, also check their schedule
    if (selectedStaff) {
      return !staffWorksOnDate(selectedStaff, date);
    }
    
    return false;
  };

  const isDateDisabled = (date: Date) => {
    if (isBefore(date, startOfDay(new Date()))) return true;
    
    const dayOfWeek = dayOfWeekMap[date.getDay()];
    const dayHours = businessHours.find(bh => bh.day_of_week === dayOfWeek);
    
    return !dayHours || !dayHours.is_open;
  };

  // Calculate availability for the next 60 days
  const calculateMonthAvailability = async () => {
    if (!selectedStaff || !selectedService || !barbershopId) return;

    const today = startOfDay(new Date());
    const endDate = addDays(today, 60);
    const days = eachDayOfInterval({ start: today, end: endDate });
    
    const availabilityMap = new Map<string, { available: number; total: number }>();

    // Get all appointments for this staff in the date range
    const { data: existingAppointments } = await supabase
      .from('appointments')
      .select('appointment_date, appointment_time, duration')
      .eq('barbershop_id', barbershopId)
      .eq('staff_id', selectedStaff.id)
      .gte('appointment_date', format(today, 'yyyy-MM-dd'))
      .lte('appointment_date', format(endDate, 'yyyy-MM-dd'))
      .neq('status', 'cancelado');

    const appointmentsByDate = new Map<string, { time: string; duration: number }[]>();
    (existingAppointments || []).forEach(apt => {
      const dateKey = apt.appointment_date;
      if (!appointmentsByDate.has(dateKey)) {
        appointmentsByDate.set(dateKey, []);
      }
      appointmentsByDate.get(dateKey)!.push({
        time: apt.appointment_time,
        duration: apt.duration || 30
      });
    });

    for (const day of days) {
      const dateKey = format(day, 'yyyy-MM-dd');
      const dayOfWeek = dayOfWeekMap[day.getDay()];
      const dayHours = businessHours.find(bh => bh.day_of_week === dayOfWeek);

      // Skip closed days or days staff doesn't work
      if (!dayHours?.is_open || !staffWorksOnDate(selectedStaff, day)) {
        availabilityMap.set(dateKey, { available: 0, total: 0 });
        continue;
      }

      // Get staff-specific schedule for the day
      const staffDaySchedule = getStaffScheduleForDay(selectedStaff, day);
      const openTime = staffDaySchedule?.start || dayHours.open_time;
      const closeTime = staffDaySchedule?.end || dayHours.close_time;

      // Generate all possible slots
      const [startHour, startMinute] = openTime.split(':').map(Number);
      const [endHour, endMinute] = closeTime.split(':').map(Number);
      const endTimeMinutes = endHour * 60 + endMinute;

      let totalSlots = 0;
      let availableCount = 0;
      let currentHour = startHour;
      let currentMinute = startMinute;

      const bookedSlots = appointmentsByDate.get(dateKey) || [];

      while (currentHour * 60 + currentMinute + selectedService.duration <= endTimeMinutes) {
        const slotMinutes = currentHour * 60 + currentMinute;
        const slotEndMinutes = slotMinutes + selectedService.duration;

        // Check break time (only if not using staff schedule)
        let isInBreak = false;
        if (!staffDaySchedule && dayHours.break_start && dayHours.break_end) {
          const [breakStartHour, breakStartMin] = dayHours.break_start.split(':').map(Number);
          const [breakEndHour, breakEndMin] = dayHours.break_end.split(':').map(Number);
          const breakStartMinutes = breakStartHour * 60 + breakStartMin;
          const breakEndMinutes = breakEndHour * 60 + breakEndMin;

          if (slotMinutes < breakEndMinutes && slotEndMinutes > breakStartMinutes) {
            isInBreak = true;
          }
        }

        if (!isInBreak) {
          totalSlots++;

          // Check if slot is available (not booked)
          const isBooked = bookedSlots.some(booked => {
            const [bookedHour, bookedMin] = booked.time.split(':').map(Number);
            const bookedStart = bookedHour * 60 + bookedMin;
            const bookedEnd = bookedStart + booked.duration;
            return slotMinutes < bookedEnd && slotEndMinutes > bookedStart;
          });

          if (!isBooked) {
            availableCount++;
          }
        }

        currentMinute += 30;
        if (currentMinute >= 60) {
          currentHour += 1;
          currentMinute = 0;
        }
      }

      // Filter past slots if today
      if (isSameDay(day, new Date())) {
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        
        // Recalculate for today considering current time
        availableCount = 0;
        currentHour = startHour;
        currentMinute = startMinute;
        
        while (currentHour * 60 + currentMinute + selectedService.duration <= endTimeMinutes) {
          const slotMinutes = currentHour * 60 + currentMinute;
          const slotEndMinutes = slotMinutes + selectedService.duration;

          if (slotMinutes > currentMinutes) {
            let isInBreak = false;
            if (!staffDaySchedule && dayHours.break_start && dayHours.break_end) {
              const [breakStartHour, breakStartMin] = dayHours.break_start.split(':').map(Number);
              const [breakEndHour, breakEndMin] = dayHours.break_end.split(':').map(Number);
              const breakStartMinutes = breakStartHour * 60 + breakStartMin;
              const breakEndMinutes = breakEndHour * 60 + breakEndMin;

              if (slotMinutes < breakEndMinutes && slotEndMinutes > breakStartMinutes) {
                isInBreak = true;
              }
            }

            if (!isInBreak) {
              const isBooked = bookedSlots.some(booked => {
                const [bookedHour, bookedMin] = booked.time.split(':').map(Number);
                const bookedStart = bookedHour * 60 + bookedMin;
                const bookedEnd = bookedStart + booked.duration;
                return slotMinutes < bookedEnd && slotEndMinutes > bookedStart;
              });

              if (!isBooked) {
                availableCount++;
              }
            }
          }

          currentMinute += 30;
          if (currentMinute >= 60) {
            currentHour += 1;
            currentMinute = 0;
          }
        }
      }

      availabilityMap.set(dateKey, { available: availableCount, total: totalSlots });
    }

    setDayAvailability(availabilityMap);
  };

  // Get availability status for a date
  const getDateAvailabilityStatus = (date: Date): 'available' | 'partial' | 'full' | 'closed' => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const availability = dayAvailability.get(dateKey);

    if (!availability || availability.total === 0) return 'closed';
    if (availability.available === 0) return 'full';
    if (availability.available < availability.total * 0.3) return 'partial';
    return 'available';
  };

  // Custom day content with availability indicator
  const renderDayContent = (day: Date) => {
    const status = getDateAvailabilityStatus(day);
    const dateKey = format(day, 'yyyy-MM-dd');
    const availability = dayAvailability.get(dateKey);

    let indicatorClass = '';
    let tooltipText = '';

    switch (status) {
      case 'available':
        indicatorClass = 'bg-green-500';
        tooltipText = `${availability?.available} horários disponíveis`;
        break;
      case 'partial':
        indicatorClass = 'bg-amber-500';
        tooltipText = `${availability?.available} horários restantes`;
        break;
      case 'full':
        indicatorClass = 'bg-red-500';
        tooltipText = 'Sem horários disponíveis';
        break;
      case 'closed':
        tooltipText = 'Fechado ou profissional não trabalha';
        break;
    }

    return {
      indicatorClass,
      tooltipText,
      available: availability?.available || 0
    };
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

  const handleWaitlistSubmit = async () => {
    if (!selectedService || !selectedStaff || !selectedDate || !clientName || !clientPhone) {
      toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }

    try {
      setSubmittingWaitlist(true);

      const waitlistData = {
        barbershop_id: barbershopId,
        client_name: clientName.trim(),
        client_phone: clientPhone.replace(/\D/g, ''),
        preferred_date: format(selectedDate, 'yyyy-MM-dd'),
        preferred_time_start: waitlistPreferredTimeStart || null,
        preferred_time_end: waitlistPreferredTimeEnd || null,
        service_id: selectedService.id,
        staff_id: selectedStaff.id,
        notes: waitlistNotes || null,
        status: 'waiting'
      };

      const { data: insertedEntry, error } = await supabase
        .from('waitlist')
        .insert(waitlistData)
        .select('id')
        .single();

      if (error) throw error;

      // Calculate position in queue for this date and staff
      const { count } = await supabase
        .from('waitlist')
        .select('*', { count: 'exact', head: true })
        .eq('barbershop_id', barbershopId)
        .eq('preferred_date', format(selectedDate, 'yyyy-MM-dd'))
        .eq('staff_id', selectedStaff.id)
        .eq('status', 'waiting');

      setWaitlistPosition(count || 1);

      // Try to send WhatsApp notification about waitlist
      try {
        const { data: whatsappConfig } = await supabase
          .from('whatsapp_config')
          .select('config, is_active')
          .eq('barbershop_id', barbershopId)
          .eq('provider', 'evolution')
          .maybeSingle();

        if (whatsappConfig?.is_active && whatsappConfig?.config) {
          const config = whatsappConfig.config as any;
          const formattedDate = format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
          
          const message = `Olá ${clientName}! 👋

📋 Você foi adicionado à lista de espera!

📅 Data desejada: ${formattedDate}
✂️ Serviço: ${selectedService.name}
💈 Profissional: ${getStaffName(selectedStaff)}

Entraremos em contato assim que um horário ficar disponível! 📲`;

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

      setWaitlistSuccess(true);
    } catch (error) {
      console.error('Erro ao entrar na lista de espera:', error);
      toast({ title: 'Erro ao entrar na lista de espera', variant: 'destructive' });
    } finally {
      setSubmittingWaitlist(false);
    }
  };

  // Reset waitlist form when changing date
  useEffect(() => {
    setShowWaitlistForm(false);
    setWaitlistSuccess(false);
    setWaitlistPosition(null);
  }, [selectedDate]);

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
            <CardDescription className="mt-4 space-y-3">
              <p><strong>Data:</strong> {selectedDate && format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
              <p><strong>Horário:</strong> {selectedTime}</p>
              <p><strong>Serviço:</strong> {selectedService?.name}</p>
              <div className="flex items-center justify-center gap-3 py-2">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={getStaffAvatar(selectedStaff) || undefined} alt={getStaffName(selectedStaff)} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                    {getStaffInitials(selectedStaff)}
                  </AvatarFallback>
                </Avatar>
                <span><strong>Profissional:</strong> {getStaffName(selectedStaff)}</span>
              </div>
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
                              {formatDuration(service.duration)}
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
                {filteredStaffList.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      Nenhum profissional disponível para o serviço selecionado
                    </p>
                    <Button 
                      variant="link" 
                      onClick={() => setStep(1)}
                      className="mt-2"
                    >
                      Escolher outro serviço
                    </Button>
                  </div>
                ) : (
                  filteredStaffList.map((staff) => (
                    <div
                      key={staff.id}
                      onClick={() => {
                        setSelectedStaff(staff);
                        // Reset date and time when changing staff
                        setSelectedDate(undefined);
                        setSelectedTime('');
                      }}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedStaff?.id === staff.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={getStaffAvatar(staff) || undefined} alt={getStaffName(staff)} />
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {getStaffInitials(staff)}
                          </AvatarFallback>
                        </Avatar>
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
                  
                  {/* Legend */}
                  <div className="flex items-center justify-center gap-4 mb-4 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span>Disponível</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      <span>Poucos horários</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <span>Lotado</span>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <TooltipProvider>
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          setSelectedDate(date);
                          setSelectedTime('');
                        }}
                        disabled={isDateDisabledForStaff}
                        fromDate={new Date()}
                        toDate={addDays(new Date(), 60)}
                        locale={ptBR}
                        className="rounded-md border pointer-events-auto"
                        modifiers={{
                          available: (date) => getDateAvailabilityStatus(date) === 'available',
                          partial: (date) => getDateAvailabilityStatus(date) === 'partial',
                          full: (date) => getDateAvailabilityStatus(date) === 'full',
                        }}
                        modifiersStyles={{
                          available: { 
                            position: 'relative',
                          },
                          partial: { 
                            position: 'relative',
                          },
                          full: { 
                            position: 'relative',
                          },
                        }}
                        components={{
                          DayContent: ({ date }) => {
                            const dayInfo = renderDayContent(date);
                            const isDisabled = isDateDisabledForStaff(date);
                            
                            if (isDisabled) {
                              return <span>{date.getDate()}</span>;
                            }
                            
                            return (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="relative w-full h-full flex items-center justify-center">
                                    <span>{date.getDate()}</span>
                                    {dayInfo.indicatorClass && (
                                      <div 
                                        className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${dayInfo.indicatorClass}`}
                                      />
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">
                                  {dayInfo.tooltipText}
                                </TooltipContent>
                              </Tooltip>
                            );
                          }
                        }}
                      />
                    </TooltipProvider>
                  </div>
                </div>

                {selectedDate && (
                  <div>
                    <Label className="text-base mb-3 block">Horários Disponíveis</Label>
                    {availableSlots.length === 0 ? (
                      <div className="space-y-4">
                        {!showWaitlistForm && !waitlistSuccess ? (
                          <div className="text-center py-6 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                            <AlertCircle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
                            <p className="text-foreground font-medium mb-2">
                              Nenhum horário disponível nesta data
                            </p>
                            <p className="text-muted-foreground text-sm mb-4">
                              Mas não desista! Entre na lista de espera e seremos notificados quando um horário abrir.
                            </p>
                            <Button onClick={() => setShowWaitlistForm(true)} variant="outline" className="gap-2">
                              <Bell className="h-4 w-4" />
                              Entrar na Lista de Espera
                            </Button>
                          </div>
                        ) : waitlistSuccess ? (
                          <div className="text-center py-6 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                            <Check className="h-10 w-10 text-green-500 mx-auto mb-3" />
                            <p className="text-foreground font-medium mb-2">
                              Você está na lista de espera!
                            </p>
                            {waitlistPosition && (
                              <div className="bg-primary/10 text-primary font-semibold py-2 px-4 rounded-full inline-block mb-3">
                                Sua posição na fila: #{waitlistPosition}
                              </div>
                            )}
                            <p className="text-muted-foreground text-sm">
                              Entraremos em contato pelo WhatsApp quando um horário ficar disponível.
                            </p>
                          </div>
                        ) : (
                          <div className="p-4 bg-muted/50 rounded-lg border space-y-4">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Bell className="h-4 w-4" />
                              <span>Lista de Espera para {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}</span>
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="waitlistName">Seu Nome *</Label>
                              <Input
                                id="waitlistName"
                                value={clientName}
                                onChange={(e) => setClientName(e.target.value)}
                                placeholder="Digite seu nome completo"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="waitlistPhone">Seu WhatsApp *</Label>
                              <Input
                                id="waitlistPhone"
                                value={clientPhone}
                                onChange={(e) => setClientPhone(formatPhone(e.target.value))}
                                placeholder="(00) 00000-0000"
                                maxLength={15}
                              />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <Label htmlFor="timeStart">Horário preferido (início)</Label>
                                <Input
                                  id="timeStart"
                                  type="time"
                                  value={waitlistPreferredTimeStart}
                                  onChange={(e) => setWaitlistPreferredTimeStart(e.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="timeEnd">Horário preferido (fim)</Label>
                                <Input
                                  id="timeEnd"
                                  type="time"
                                  value={waitlistPreferredTimeEnd}
                                  onChange={(e) => setWaitlistPreferredTimeEnd(e.target.value)}
                                />
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="waitlistNotes">Observações (opcional)</Label>
                              <Textarea
                                id="waitlistNotes"
                                value={waitlistNotes}
                                onChange={(e) => setWaitlistNotes(e.target.value)}
                                placeholder="Ex: Prefiro horários pela manhã, tenho flexibilidade..."
                                rows={2}
                              />
                            </div>
                            
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                onClick={() => setShowWaitlistForm(false)}
                                className="flex-1"
                              >
                                Cancelar
                              </Button>
                              <Button
                                onClick={handleWaitlistSubmit}
                                disabled={submittingWaitlist || !clientName || !clientPhone}
                                className="flex-1"
                              >
                                {submittingWaitlist ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Bell className="h-4 w-4 mr-2" />
                                )}
                                Confirmar
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
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
