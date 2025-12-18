import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { formatDuration } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { format, addDays, isBefore, startOfDay, eachDayOfInterval, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Calendar as CalendarIcon, Clock, User, Scissors, Phone, Check, ArrowLeft, ArrowRight, Bell, AlertCircle, Building2, MapPin, Star } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  DAY_OF_WEEK_MAP, 
  DayName,
  getScheduleForDay,
  businessHoursToStandard,
  DEFAULT_DAY_SCHEDULE
} from '@/types/schedule';

// Animation variants for step transitions
const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 50 : -50,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 50 : -50,
    opacity: 0,
  }),
};

const stepTransition = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 30,
};

interface Barbershop {
  id: string;
  name: string;
  address: string;
  phone: string;
  parent_id: string | null;
  custom_branding?: {
    logo_url?: string;
    logo_url_dark?: string;
    primary_color?: string;
    secondary_color?: string;
    accent_color?: string;
    system_name?: string;
    tagline?: string;
  };
}

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  description: string;
  image_url?: string;
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

// Helper to convert hex to HSL for CSS variables
const hexToHsl = (hex: string): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '';
  
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

export default function PublicBooking() {
  const { barbershopId } = useParams<{ barbershopId: string }>();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(0); // -1 for back, 1 for forward
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Branding state
  const [matrizBranding, setMatrizBranding] = useState<Barbershop['custom_branding']>(null);
  const [matrizName, setMatrizName] = useState<string>('');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // Detect dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      const isDark = document.documentElement.classList.contains('dark') ||
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(isDark);
    };
    
    checkDarkMode();
    
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', checkDarkMode);
    
    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', checkDarkMode);
    };
  }, []);

  // Unit selection state
  const [availableUnits, setAvailableUnits] = useState<Barbershop[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<Barbershop | null>(null);
  const [hasMultipleUnits, setHasMultipleUnits] = useState(false);

  const [barbershop, setBarbershop] = useState<Barbershop | null>(null);
  const [allRelatedBarbershopIds, setAllRelatedBarbershopIds] = useState<string[]>([]);
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

  // Apply custom branding colors
  useEffect(() => {
    if (matrizBranding?.primary_color) {
      const hsl = hexToHsl(matrizBranding.primary_color);
      if (hsl) {
        document.documentElement.style.setProperty('--booking-primary', hsl);
      }
    }
    if (matrizBranding?.accent_color) {
      const hsl = hexToHsl(matrizBranding.accent_color);
      if (hsl) {
        document.documentElement.style.setProperty('--booking-accent', hsl);
      }
    }
    
    return () => {
      document.documentElement.style.removeProperty('--booking-primary');
      document.documentElement.style.removeProperty('--booking-accent');
    };
  }, [matrizBranding]);

  useEffect(() => {
    if (barbershopId) {
      resolveBarbershopAndLoad();
      trackVisit();
    }
  }, [barbershopId]);

  // Resolve barbershopId (UUID or subdomain) to matriz and load data
  const resolveBarbershopAndLoad = async () => {
    try {
      setLoading(true);

      // Check if barbershopId is a UUID or a subdomain
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(barbershopId || '');
      
      let matrizId: string | null = null;

      if (!isUUID) {
        // It's a subdomain - look up in barbershop_domains
        const { data: domainData } = await supabase
          .from('barbershop_domains')
          .select('barbershop_id')
          .eq('subdomain', barbershopId?.toLowerCase())
          .eq('subdomain_status', 'active')
          .maybeSingle();

        if (domainData?.barbershop_id) {
          matrizId = domainData.barbershop_id;
        } else {
          toast({ title: 'Link de agendamento não encontrado', variant: 'destructive' });
          setLoading(false);
          return;
        }
      } else {
        // It's a UUID - check if it's a unit or matriz
        const { data: shop, error: shopError } = await supabase
          .from('barbershops')
          .select('id, parent_id')
          .eq('id', barbershopId)
          .single();

        if (shopError || !shop) {
          toast({ title: 'Barbearia não encontrada', variant: 'destructive' });
          setLoading(false);
          return;
        }

        // If it's a unit, get the matriz
        matrizId = shop.parent_id || shop.id;
      }

      // Load matriz data
      const { data: matriz, error: matrizError } = await supabase
        .from('barbershops')
        .select('id, name, address, phone, parent_id, custom_branding')
        .eq('id', matrizId)
        .single();

      if (matrizError || !matriz) {
        toast({ title: 'Barbearia não encontrada', variant: 'destructive' });
        setLoading(false);
        return;
      }

      setBarbershop(matriz);
      setMatrizName(matriz.name);

      // Load branding
      if (matriz.custom_branding) {
        setMatrizBranding(matriz.custom_branding);
      } else {
        const { data: systemBranding } = await supabase
          .from('system_branding')
          .select('*')
          .limit(1)
          .maybeSingle();
        
        if (systemBranding) {
          setMatrizBranding({
            logo_url: systemBranding.logo_url,
            logo_url_dark: systemBranding.logo_dark_url,
            primary_color: systemBranding.primary_color,
            secondary_color: systemBranding.secondary_color,
            accent_color: systemBranding.accent_color,
            system_name: matriz.name,
            tagline: systemBranding.tagline,
          });
        }
      }

      // Check if there are child units
      const { data: childUnits } = await supabase
        .from('barbershops')
        .select('id, name, address, phone, parent_id, custom_branding')
        .eq('parent_id', matrizId)
        .eq('active', true);

      if (childUnits && childUnits.length > 0) {
        // Multiple units - show unit selection (Step 0)
        setAvailableUnits(childUnits);
        setHasMultipleUnits(true);
        setStep(0);
        setLoading(false);
      } else {
        // Single location - skip to Step 1
        setHasMultipleUnits(false);
        setSelectedUnit(matriz);
        setStep(1);
        await loadBarbershopData(matriz.id);
      }
    } catch (error) {
      console.error('Erro ao carregar barbearia:', error);
      toast({ title: 'Erro ao carregar dados', variant: 'destructive' });
      setLoading(false);
    }
  };

  const handleUnitSelect = async (unitId: string) => {
    const unit = availableUnits.find(u => u.id === unitId);
    if (unit) {
      setSelectedUnit(unit);
      setLoading(true);
      await loadBarbershopData(unit.id);
      setStep(1);
    }
  };

  const trackVisit = async () => {
    if (!barbershopId) return;
    try {
      await supabase.from('public_booking_visits').insert({
        barbershop_id: barbershopId,
        referrer: document.referrer || null,
        user_agent: navigator.userAgent,
      });
    } catch (error) {
      console.log('Visit tracking skipped');
    }
  };

  useEffect(() => {
    if (selectedDate && selectedStaff && selectedService) {
      loadAvailableSlots();
    }
  }, [selectedDate, selectedStaff, selectedService]);

  useEffect(() => {
    if (selectedStaff && selectedService && businessHours.length > 0) {
      calculateMonthAvailability();
    }
  }, [selectedStaff, selectedService, businessHours]);

  const loadBarbershopData = async (unitId: string) => {
    try {
      setLoading(true);

      const { data: shop, error: shopError } = await supabase
        .from('barbershops')
        .select('id, name, address, phone, parent_id, custom_branding')
        .eq('id', unitId)
        .single();

      if (shopError || !shop) {
        toast({ title: 'Barbearia não encontrada', variant: 'destructive' });
        return;
      }
      
      setBarbershop(shop);

      const rootId = shop.parent_id || shop.id;
      
      const { data: relatedData } = await supabase
        .from('barbershops')
        .select('id')
        .or(`id.eq.${rootId},parent_id.eq.${rootId}`);

      const allIds = relatedData?.map(b => b.id) || [unitId];
      setAllRelatedBarbershopIds(allIds);

      const { data: servicesData } = await supabase
        .from('services')
        .select('id, name, price, duration, description, image_url')
        .in('barbershop_id', allIds)
        .eq('active', true)
        .order('name');
      setServices(servicesData || []);

      // Load staff - check if this is a unit (has parent_id) or matriz
      let staffData: Staff[] = [];
      
      if (shop.parent_id) {
        // This is a unit - fetch staff via staff_units
        const { data: staffUnitsData, error: suError } = await supabase
          .from('staff_units')
          .select(`
            staff_id,
            schedule,
            commission_rate,
            staff:staff_id (
              id,
              user_id,
              schedule,
              profiles:user_id (full_name, avatar_url)
            )
          `)
          .eq('barbershop_id', unitId)
          .eq('active', true);

        if (!suError && staffUnitsData) {
          staffData = staffUnitsData.map((su: any) => ({
            id: su.staff?.id,
            user_id: su.staff?.user_id,
            // Use unit-specific schedule if available, otherwise staff's default schedule
            schedule: su.schedule || su.staff?.schedule,
            profiles: su.staff?.profiles,
          })).filter((s: any) => s.id);
        }
      } else {
        // This is matriz - fetch staff directly
        const { data: directStaff, error: dsError } = await supabase
          .from('staff')
          .select('id, user_id, schedule, profiles:user_id (full_name, avatar_url)')
          .eq('barbershop_id', unitId)
          .eq('active', true);

        if (!dsError && directStaff) {
          staffData = directStaff as Staff[];
        }
      }
      
      setStaffList(staffData);

      const { data: staffServicesData } = await supabase
        .from('staff_services')
        .select('staff_id, service_id');
      setStaffServices(staffServicesData || []);

      const { data: hoursData } = await supabase
        .from('business_hours')
        .select('*')
        .eq('barbershop_id', unitId);
      setBusinessHours(hoursData || []);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({ title: 'Erro ao carregar dados', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Staff list - show all active staff (no filtering needed since staff comes before service)
  const filteredStaffList = staffList;

  // Filter services by selected staff - show only services the staff provides
  const filteredServices = selectedStaff 
    ? services.filter(service => {
        const staffHasServiceEntries = staffServices.some(ss => ss.staff_id === selectedStaff.id);
        // If staff has no service entries, assume they provide all services
        if (!staffHasServiceEntries) return true;
        return staffServices.some(ss => ss.staff_id === selectedStaff.id && ss.service_id === service.id);
      })
    : services;

  // Use standardized schedule functions
  const staffWorksOnDate = (staff: Staff, date: Date): boolean => {
    if (!staff.schedule) return true;
    const dayOfWeek = DAY_OF_WEEK_MAP[date.getDay()];
    
    // Use centralized function to get schedule
    const daySchedule = getScheduleForDay(
      staff.schedule, 
      dayOfWeek, 
      selectedUnit?.id || barbershopId || undefined
    );
    
    return daySchedule?.enabled ?? true;
  };

  const getStaffScheduleForDayInternal = (staff: Staff, date: Date): { 
    start: string; 
    end: string; 
    break_start?: string | null; 
    break_end?: string | null;
  } | null => {
    if (!staff.schedule) return null;
    const dayOfWeek = DAY_OF_WEEK_MAP[date.getDay()];
    
    // Use centralized function
    const daySchedule = getScheduleForDay(
      staff.schedule, 
      dayOfWeek, 
      selectedUnit?.id || barbershopId || undefined
    );
    
    if (daySchedule?.enabled) {
      return { 
        start: daySchedule.start, 
        end: daySchedule.end,
        break_start: daySchedule.break_start,
        break_end: daySchedule.break_end
      };
    }
    return null;
  };

  const loadAvailableSlots = async () => {
    if (!selectedDate || !selectedStaff || !selectedService) return;

    const formattedDate = format(selectedDate, 'yyyy-MM-dd');
    const dayOfWeek = DAY_OF_WEEK_MAP[selectedDate.getDay()];

    if (!staffWorksOnDate(selectedStaff, selectedDate)) {
      setAvailableSlots([]);
      return;
    }

    const staffDaySchedule = getStaffScheduleForDayInternal(selectedStaff, selectedDate);
    const dayHours = businessHours.find(bh => bh.day_of_week === dayOfWeek);
    if (!dayHours || !dayHours.is_open) {
      setAvailableSlots([]);
      return;
    }

    const openTime = staffDaySchedule?.start || dayHours.open_time;
    const closeTime = staffDaySchedule?.end || dayHours.close_time;

    const slots: string[] = [];
    const [startHour, startMinute] = openTime.split(':').map(Number);
    const [endHour, endMinute] = closeTime.split(':').map(Number);
    const endTimeMinutes = endHour * 60 + endMinute;

    let currentHour = startHour;
    let currentMinute = startMinute;

    while (currentHour * 60 + currentMinute + selectedService.duration <= endTimeMinutes) {
      const timeString = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
      
      let isInBreak = false;
      // Verificar breaks - priorizar staff schedule, senão usar business hours
      const breakStart = staffDaySchedule?.break_start || dayHours.break_start;
      const breakEnd = staffDaySchedule?.break_end || dayHours.break_end;
      
      if (breakStart && breakEnd) {
        const slotMinutes = currentHour * 60 + currentMinute;
        const slotEndMinutes = slotMinutes + selectedService.duration;
        const [breakStartHour, breakStartMin] = breakStart.split(':').map(Number);
        const [breakEndHour, breakEndMin] = breakEnd.split(':').map(Number);
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

    // Usar selectedUnit.id para buscar agendamentos da unidade correta
    const effectiveUnitId = selectedUnit?.id || barbershopId;
    const { data: existingAppointments } = await supabase
      .from('appointments')
      .select('appointment_time, duration')
      .eq('barbershop_id', effectiveUnitId)
      .eq('staff_id', selectedStaff.id)
      .eq('appointment_date', formattedDate)
      .neq('status', 'cancelado');

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
    
    const dayOfWeek = DAY_OF_WEEK_MAP[date.getDay()];
    const dayHours = businessHours.find(bh => bh.day_of_week === dayOfWeek);
    
    if (!dayHours || !dayHours.is_open) return true;
    
    if (selectedStaff) {
      return !staffWorksOnDate(selectedStaff, date);
    }
    
    return false;
  };

  const isDateDisabled = (date: Date) => {
    if (isBefore(date, startOfDay(new Date()))) return true;
    const dayOfWeek = DAY_OF_WEEK_MAP[date.getDay()];
    const dayHours = businessHours.find(bh => bh.day_of_week === dayOfWeek);
    return !dayHours || !dayHours.is_open;
  };

  const calculateMonthAvailability = async () => {
    if (!selectedStaff || !selectedService) return;

    const startDate = new Date();
    const endDate = addDays(startDate, 60);
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    
    const newAvailability = new Map<string, { available: number; total: number }>();
    
    for (const day of days) {
      if (isDateDisabledForStaff(day)) {
        newAvailability.set(format(day, 'yyyy-MM-dd'), { available: 0, total: 0 });
        continue;
      }

      const dayOfWeek = DAY_OF_WEEK_MAP[day.getDay()];
      const staffDaySchedule = getStaffScheduleForDayInternal(selectedStaff, day);
      const dayHours = businessHours.find(bh => bh.day_of_week === dayOfWeek);
      
      if (!dayHours || !dayHours.is_open) {
        newAvailability.set(format(day, 'yyyy-MM-dd'), { available: 0, total: 0 });
        continue;
      }

      const openTime = staffDaySchedule?.start || dayHours.open_time;
      const closeTime = staffDaySchedule?.end || dayHours.close_time;

      const [startHour, startMinute] = openTime.split(':').map(Number);
      const [endHour, endMinute] = closeTime.split(':').map(Number);
      const totalMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
      const totalSlots = Math.floor(totalMinutes / 30);

      newAvailability.set(format(day, 'yyyy-MM-dd'), { available: totalSlots, total: totalSlots });
    }
    
    setDayAvailability(newAvailability);
  };

  const getDateAvailabilityStatus = (date: Date): 'available' | 'partial' | 'full' | 'closed' => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const availability = dayAvailability.get(dateKey);
    
    if (!availability || availability.total === 0) return 'closed';
    
    const ratio = availability.available / availability.total;
    if (ratio >= 0.5) return 'available';
    if (ratio > 0) return 'partial';
    return 'full';
  };

  const renderDayContent = (date: Date): { indicatorClass: string; tooltipText: string } => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const availability = dayAvailability.get(dateKey);
    
    if (!availability || availability.total === 0) {
      return { indicatorClass: '', tooltipText: 'Fechado' };
    }
    
    const ratio = availability.available / availability.total;
    if (ratio >= 0.5) {
      return { 
        indicatorClass: 'bg-success', 
        tooltipText: `${availability.available} horários disponíveis` 
      };
    }
    if (ratio > 0) {
      return { 
        indicatorClass: 'bg-warning', 
        tooltipText: `Poucos horários (${availability.available} restantes)` 
      };
    }
    return { indicatorClass: 'bg-destructive', tooltipText: 'Sem horários disponíveis' };
  };

  const handleSubmit = async () => {
    if (!selectedService || !selectedStaff || !selectedDate || !selectedTime || !clientName || !clientPhone) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }

    try {
      setSubmitting(true);

      // Use selectedUnit.id for proper unit assignment, fallback to barbershop.id (matriz)
      // Never use barbershopId directly as it could be a subdomain string
      const effectiveUnitId = selectedUnit?.id || barbershop?.id;
      
      if (!effectiveUnitId) {
        toast({ title: 'Erro: Unidade não selecionada', variant: 'destructive' });
        setSubmitting(false);
        return;
      }

      const appointmentData = {
        barbershop_id: effectiveUnitId,
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

      try {
        const { data: whatsappConfig } = await supabase
          .from('whatsapp_config')
          .select('config, is_active')
          .eq('barbershop_id', effectiveUnitId)
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

      // Use selectedUnit.id for proper unit assignment, fallback to barbershop.id (matriz)
      const effectiveUnitId = selectedUnit?.id || barbershop?.id;
      
      if (!effectiveUnitId) {
        toast({ title: 'Erro: Unidade não selecionada', variant: 'destructive' });
        setSubmittingWaitlist(false);
        return;
      }

      const waitlistData = {
        barbershop_id: effectiveUnitId,
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

      const { count } = await supabase
        .from('waitlist')
        .select('*', { count: 'exact', head: true })
        .eq('barbershop_id', effectiveUnitId)
        .eq('preferred_date', format(selectedDate, 'yyyy-MM-dd'))
        .eq('staff_id', selectedStaff.id)
        .eq('status', 'waiting');

      setWaitlistPosition(count || 1);

      try {
        const { data: whatsappConfig } = await supabase
          .from('whatsapp_config')
          .select('config, is_active')
          .eq('barbershop_id', effectiveUnitId)
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

  useEffect(() => {
    setShowWaitlistForm(false);
    setWaitlistSuccess(false);
    setWaitlistPosition(null);
  }, [selectedDate]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-muted animate-pulse" />
            <Loader2 className="h-8 w-8 animate-spin text-accent absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-muted-foreground text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  // Not found state
  if (!barbershop) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-destructive/20">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-destructive">Barbearia não encontrada</CardTitle>
            <CardDescription>O link de agendamento é inválido ou expirou.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full overflow-hidden">
          {/* Success Header with gradient */}
          <div className="bg-gradient-to-r from-success/90 to-success p-8 text-center">
            <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
              <Check className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-2xl font-serif font-semibold text-white">Agendamento Confirmado!</h2>
          </div>
          
          <CardContent className="p-6 space-y-4">
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">Data</span>
                <span className="font-medium">{selectedDate && format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">Horário</span>
                <span className="font-medium">{selectedTime}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">Serviço</span>
                <span className="font-medium truncate ml-4">{selectedService?.name}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">Profissional</span>
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={getStaffAvatar(selectedStaff) || undefined} />
                    <AvatarFallback className="bg-accent/20 text-accent text-xs">
                      {getStaffInitials(selectedStaff)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{getStaffName(selectedStaff)}</span>
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">Valor</span>
                <span className="font-semibold text-lg text-accent">R$ {selectedService?.price.toFixed(2)}</span>
              </div>
            </div>
            
            <div className="bg-accent/10 rounded-lg p-4 text-center">
              <p className="text-sm text-accent font-medium">📱 Você receberá uma confirmação por WhatsApp!</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalSteps = hasMultipleUnits ? 5 : 4;
  const stepLabels = hasMultipleUnits 
    ? ['Unidade', 'Profissional', 'Serviço', 'Data', 'Dados']
    : ['Profissional', 'Serviço', 'Data', 'Dados'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Premium Header with Branding */}
      <div className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        
        <div className="relative max-w-2xl mx-auto px-4 pt-8 pb-6">
          {/* Logo and Branding */}
          <div className="text-center mb-6">
            {(() => {
              // Determine which logo to use based on dark mode
              const logoUrl = isDarkMode && matrizBranding?.logo_url_dark 
                ? matrizBranding.logo_url_dark 
                : matrizBranding?.logo_url;
              
              return logoUrl ? (
                <div className="mb-4">
                  <img 
                    src={logoUrl} 
                    alt={matrizName}
                    className="h-16 sm:h-20 mx-auto object-contain"
                    onError={(e) => {
                      // Fallback if image fails to load
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              ) : (
                <div className="mb-4 mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center shadow-lg shadow-accent/25">
                  <Scissors className="h-8 w-8 sm:h-10 sm:w-10 text-accent-foreground" />
                </div>
              );
            })()}
            
            <h1 className="text-2xl sm:text-3xl font-serif font-semibold text-foreground">
              {matrizBranding?.system_name || matrizName || barbershop?.name}
            </h1>
            
            {matrizBranding?.tagline && (
              <p className="text-muted-foreground mt-1 text-sm">{matrizBranding.tagline}</p>
            )}
            
            <p className="text-accent font-medium mt-3 text-sm sm:text-base">
              Agende seu horário online
            </p>
          </div>

          {/* Progress Steps - Modern Style */}
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            {(hasMultipleUnits ? [0, 1, 2, 3, 4] : [1, 2, 3, 4]).map((s, index) => (
              <div key={s} className="flex items-center">
                <div
                  className={`relative w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center font-medium text-sm transition-all duration-300 ${
                    s === step 
                      ? 'bg-accent text-accent-foreground shadow-lg shadow-accent/30 scale-110' 
                      : s < step 
                        ? 'bg-accent/20 text-accent' 
                        : 'bg-muted/50 text-muted-foreground'
                  }`}
                >
                  {s < step ? (
                    <Check className="h-4 w-4 sm:h-5 sm:w-5" />
                  ) : (
                    <span>{hasMultipleUnits ? index + 1 : s}</span>
                  )}
                </div>
                {index < (hasMultipleUnits ? 4 : 3) && (
                  <div className={`w-6 sm:w-10 h-0.5 mx-1 transition-colors ${
                    s < step ? 'bg-accent' : 'bg-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>
          
          {/* Step Label */}
          <p className="text-center text-xs text-muted-foreground mt-3">
            {stepLabels[hasMultipleUnits ? step : step - 1]}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 pb-8">
        <Card className="border-0 shadow-xl shadow-primary/5 bg-card/80 backdrop-blur">
          <CardHeader className="px-4 sm:px-6 pb-2">
            <CardTitle className="flex items-center gap-3 text-lg sm:text-xl">
              {step === 0 && <><Building2 className="h-5 w-5 text-accent" /> Escolha a Unidade</>}
              {step === 1 && <><User className="h-5 w-5 text-accent" /> Escolha o Profissional</>}
              {step === 2 && <><Scissors className="h-5 w-5 text-accent" /> Escolha o Serviço</>}
              {step === 3 && <><CalendarIcon className="h-5 w-5 text-accent" /> Data e Horário</>}
              {step === 4 && <><Phone className="h-5 w-5 text-accent" /> Seus Dados</>}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="px-4 sm:px-6 overflow-hidden">
            <AnimatePresence mode="wait" custom={direction}>
              {/* Step 0: Unit Selection */}
              {step === 0 && hasMultipleUnits && (
                <motion.div
                  key="step-0"
                  custom={direction}
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={stepTransition}
                  className="space-y-4"
                >
                  <p className="text-sm text-muted-foreground mb-4">
                    Selecione a unidade mais próxima de você
                  </p>
                  <div className="grid gap-3">
                    {availableUnits.map((unit, index) => (
                      <motion.div
                        key={unit.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handleUnitSelect(unit.id)}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                          selectedUnit?.id === unit.id
                            ? 'border-accent bg-accent/5 shadow-md'
                            : 'border-border hover:border-accent/50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2.5 rounded-lg ${
                            selectedUnit?.id === unit.id ? 'bg-accent text-accent-foreground' : 'bg-muted'
                          }`}>
                            <Building2 className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base">{unit.name}</h3>
                            {unit.address && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                                <span className="truncate">{unit.address}</span>
                              </p>
                            )}
                          </div>
                          {selectedUnit?.id === unit.id && (
                            <Check className="h-5 w-5 text-accent flex-shrink-0" />
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

            {/* Step 1: Staff Selection (Profissional primeiro) */}
            {step === 1 && (
              <motion.div
                key="step-1"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={stepTransition}
                className="grid gap-3"
              >
                {filteredStaffList.length === 0 ? (
                  <div className="text-center py-12">
                    <User className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-muted-foreground">Nenhum profissional disponível</p>
                  </div>
                ) : (
                  filteredStaffList.map((staff, index) => (
                    <motion.div
                      key={staff.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => {
                        setSelectedStaff(staff);
                        setSelectedService(null); // Reset service when staff changes
                        setSelectedDate(undefined);
                        setSelectedTime('');
                      }}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                        selectedStaff?.id === staff.id
                          ? 'border-accent bg-accent/5 shadow-md'
                          : 'border-border hover:border-accent/50'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <Avatar className="h-14 w-14 border-2 border-background shadow">
                          <AvatarImage src={getStaffAvatar(staff) || undefined} alt={getStaffName(staff)} />
                          <AvatarFallback className="bg-gradient-to-br from-accent/20 to-accent/10 text-accent font-semibold text-lg">
                            {getStaffInitials(staff)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h3 className="font-semibold text-base">{getStaffName(staff)}</h3>
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                            <span className="text-xs text-muted-foreground">Profissional</span>
                          </div>
                        </div>
                        {selectedStaff?.id === staff.id && (
                          <Check className="h-5 w-5 text-accent" />
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </motion.div>
            )}

            {/* Step 2: Service Selection (Serviço filtrado pelo profissional) */}
            {step === 2 && (
              <motion.div
                key="step-2"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={stepTransition}
                className="grid gap-3"
              >
                {filteredServices.length === 0 ? (
                  <div className="text-center py-12">
                    <Scissors className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-muted-foreground">Nenhum serviço disponível para este profissional</p>
                    <Button variant="link" onClick={() => { setDirection(-1); setStep(1); }} className="mt-2">
                      Escolher outro profissional
                    </Button>
                  </div>
                ) : (
                  filteredServices.map((service, index) => (
                    <motion.div
                      key={service.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      onClick={() => setSelectedService(service)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                        selectedService?.id === service.id
                          ? 'border-accent bg-accent/5 shadow-md'
                          : 'border-border hover:border-accent/50'
                      }`}
                    >
                      <div className="flex gap-4">
                        {service.image_url && (
                          <img 
                            src={service.image_url} 
                            alt={service.name}
                            className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <div className="min-w-0">
                              <h3 className="font-semibold text-base truncate">{service.name}</h3>
                              {service.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{service.description}</p>
                              )}
                            </div>
                            <span className="text-lg font-bold text-accent flex-shrink-0">
                              R$ {service.price.toFixed(2)}
                            </span>
                          </div>
                          <Badge variant="secondary" className="mt-2 text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatDuration(service.duration)}
                          </Badge>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </motion.div>
            )}

            {/* Step 3: Date & Time Selection */}
            {step === 3 && (
              <motion.div
                key="step-3"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={stepTransition}
                className="space-y-6"
              >
                <div>
                  <Label className="text-sm font-medium mb-3 block">Selecione a Data</Label>
                  
                  {/* Legend */}
                  <div className="flex items-center justify-center gap-4 mb-4 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-success" />
                      <span>Disponível</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-warning" />
                      <span>Poucos</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-destructive" />
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
                        className="rounded-xl border p-3"
                        modifiers={{
                          available: (date) => getDateAvailabilityStatus(date) === 'available',
                          partial: (date) => getDateAvailabilityStatus(date) === 'partial',
                          full: (date) => getDateAvailabilityStatus(date) === 'full',
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
                    <Label className="text-sm font-medium mb-3 block">Horários Disponíveis</Label>
                    {availableSlots.length === 0 ? (
                      <div className="space-y-4">
                        {!showWaitlistForm && !waitlistSuccess ? (
                          <div className="text-center py-8 bg-warning/5 rounded-xl border border-warning/20">
                            <AlertCircle className="h-12 w-12 text-warning mx-auto mb-3" />
                            <p className="font-medium mb-2">Nenhum horário disponível</p>
                            <p className="text-sm text-muted-foreground mb-4 px-4">
                              Entre na lista de espera e avisaremos quando abrir vaga!
                            </p>
                            <Button onClick={() => setShowWaitlistForm(true)} variant="outline" className="gap-2">
                              <Bell className="h-4 w-4" />
                              Entrar na Lista de Espera
                            </Button>
                          </div>
                        ) : waitlistSuccess ? (
                          <div className="text-center py-8 bg-success/5 rounded-xl border border-success/20">
                            <Check className="h-12 w-12 text-success mx-auto mb-3" />
                            <p className="font-medium mb-2">Você está na lista!</p>
                            {waitlistPosition && (
                              <Badge className="mb-3 bg-accent text-accent-foreground">
                                Posição #{waitlistPosition}
                              </Badge>
                            )}
                            <p className="text-sm text-muted-foreground">
                              Avisaremos pelo WhatsApp quando houver vaga.
                            </p>
                          </div>
                        ) : (
                          <div className="p-4 bg-muted/30 rounded-xl border space-y-4">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Bell className="h-4 w-4" />
                              <span>Lista de Espera para {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}</span>
                            </div>
                            
                            <div className="grid gap-3">
                              <div className="space-y-1.5">
                                <Label htmlFor="waitlistName" className="text-sm">Seu Nome *</Label>
                                <Input
                                  id="waitlistName"
                                  value={clientName}
                                  onChange={(e) => setClientName(e.target.value)}
                                  placeholder="Digite seu nome"
                                  className="h-11"
                                />
                              </div>
                              
                              <div className="space-y-1.5">
                                <Label htmlFor="waitlistPhone" className="text-sm">Seu WhatsApp *</Label>
                                <Input
                                  id="waitlistPhone"
                                  value={clientPhone}
                                  onChange={(e) => setClientPhone(formatPhone(e.target.value))}
                                  placeholder="(00) 00000-0000"
                                  maxLength={15}
                                  className="h-11"
                                />
                              </div>
                              
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                  <Label htmlFor="timeStart" className="text-xs">Horário início</Label>
                                  <Input
                                    id="timeStart"
                                    type="time"
                                    value={waitlistPreferredTimeStart}
                                    onChange={(e) => setWaitlistPreferredTimeStart(e.target.value)}
                                    className="h-10"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label htmlFor="timeEnd" className="text-xs">Horário fim</Label>
                                  <Input
                                    id="timeEnd"
                                    type="time"
                                    value={waitlistPreferredTimeEnd}
                                    onChange={(e) => setWaitlistPreferredTimeEnd(e.target.value)}
                                    className="h-10"
                                  />
                                </div>
                              </div>
                              
                              <div className="space-y-1.5">
                                <Label htmlFor="waitlistNotes" className="text-xs">Observações</Label>
                                <Textarea
                                  id="waitlistNotes"
                                  value={waitlistNotes}
                                  onChange={(e) => setWaitlistNotes(e.target.value)}
                                  placeholder="Ex: Prefiro manhã..."
                                  rows={2}
                                />
                              </div>
                            </div>
                            
                            <div className="flex gap-2 pt-2">
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
                                className="flex-1 bg-accent hover:bg-accent/90"
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
                      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                        {availableSlots.map((slot) => (
                          <Button
                            key={slot}
                            variant={selectedTime === slot ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedTime(slot)}
                            className={`text-sm font-medium ${
                              selectedTime === slot 
                                ? 'bg-accent hover:bg-accent/90 text-accent-foreground shadow-md' 
                                : 'hover:border-accent/50'
                            }`}
                          >
                            {slot}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 4: Client Info */}
            {step === 4 && (
              <motion.div
                key="step-4"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={stepTransition}
                className="space-y-5"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="clientName" className="text-sm font-medium">Seu Nome</Label>
                  <Input
                    id="clientName"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Digite seu nome completo"
                    className="h-12 text-base"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="clientPhone" className="text-sm font-medium">Seu WhatsApp</Label>
                  <Input
                    id="clientPhone"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(formatPhone(e.target.value))}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                    className="h-12 text-base"
                  />
                </div>

                {/* Summary Card */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="mt-6 p-4 bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl border"
                >
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-accent" />
                    Resumo do Agendamento
                  </h4>
                  <div className="space-y-3 text-sm">
                    {hasMultipleUnits && selectedUnit && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Unidade</span>
                        <span className="font-medium truncate ml-4">{selectedUnit.name}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Serviço</span>
                      <span className="font-medium truncate ml-4">{selectedService?.name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Profissional</span>
                      <span className="font-medium">{getStaffName(selectedStaff)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Data</span>
                      <span className="font-medium">{selectedDate && format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Horário</span>
                      <span className="font-medium">{selectedTime}</span>
                    </div>
                    <div className="pt-3 mt-3 border-t border-border/50 flex justify-between items-center">
                      <span className="text-muted-foreground">Valor Total</span>
                      <span className="text-xl font-bold text-accent">R$ {selectedService?.price.toFixed(2)}</span>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-6 pt-4 border-t border-border/50 gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setDirection(-1);
                  if (step === 1 && hasMultipleUnits) {
                    // Going back to unit selection - reset all selections
                    setSelectedStaff(null);
                    setSelectedService(null);
                    setSelectedDate(undefined);
                    setSelectedTime('');
                    setStep(0);
                  } else if (step === 2) {
                    // Going back to staff selection - reset service selection
                    setSelectedService(null);
                    setStep(1);
                  } else {
                    setStep(step - 1);
                  }
                }}
                disabled={step === 0 || (step === 1 && !hasMultipleUnits)}
                className="h-11"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>

              {step < 4 ? (
                <Button
                  onClick={() => {
                    setDirection(1);
                    setStep(step + 1);
                  }}
                  disabled={
                    (step === 0 && !selectedUnit) ||
                    (step === 1 && !selectedStaff) ||
                    (step === 2 && !selectedService) ||
                    (step === 3 && (!selectedDate || !selectedTime))
                  }
                  className="h-11 bg-accent hover:bg-accent/90 text-accent-foreground"
                >
                  Próximo
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !clientName || !clientPhone}
                  className="h-11 bg-accent hover:bg-accent/90 text-accent-foreground min-w-[140px]"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Confirmar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 space-y-2">
          {(selectedUnit || barbershop)?.address && (
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {(selectedUnit || barbershop)?.address}
            </p>
          )}
          {(selectedUnit || barbershop)?.phone && (
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              {(selectedUnit || barbershop)?.phone}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
