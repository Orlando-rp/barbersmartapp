import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

interface BusinessHours {
  day_of_week: string;
  is_open: boolean;
  open_time: string;
  close_time: string;
  break_start: string | null;
  break_end: string | null;
}

interface SpecialHours {
  special_date: string;
  is_open: boolean;
  open_time: string | null;
  close_time: string | null;
  break_start: string | null;
  break_end: string | null;
}

interface ValidationResult {
  isValid: boolean;
  reason?: string;
  availableHours?: { start: string; end: string; breakStart?: string; breakEnd?: string };
}

const dayOfWeekMap: { [key: number]: string } = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday'
};

export const useBusinessHoursValidation = (barbershopId: string | null) => {
  const [businessHours, setBusinessHours] = useState<BusinessHours[]>([]);
  const [specialHours, setSpecialHours] = useState<SpecialHours[]>([]);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (barbershopId) {
      loadValidationData();
    }
  }, [barbershopId]);

  const loadValidationData = async () => {
    if (!barbershopId) return;

    try {
      setLoading(true);

      // Load business hours
      const { data: hoursData, error: hoursError } = await supabase
        .from('business_hours')
        .select('*')
        .eq('barbershop_id', barbershopId);

      if (hoursError && hoursError.code !== 'PGRST116') throw hoursError;
      setBusinessHours(hoursData || []);

      // Load special hours
      const { data: specialData, error: specialError } = await supabase
        .from('special_hours')
        .select('*')
        .eq('barbershop_id', barbershopId);

      if (specialError && specialError.code !== 'PGRST116') throw specialError;
      setSpecialHours(specialData || []);

      // Load blocked dates
      const { data: blockedData, error: blockedError } = await supabase
        .from('blocked_dates')
        .select('blocked_date')
        .eq('barbershop_id', barbershopId);

      if (blockedError && blockedError.code !== 'PGRST116') throw blockedError;
      setBlockedDates((blockedData || []).map(b => b.blocked_date));
    } catch (error) {
      console.error('Erro ao carregar dados de validação:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateDateTime = (date: Date, time?: string): ValidationResult => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    const dayOfWeek = dayOfWeekMap[date.getDay()];

    // Check if date is blocked
    if (blockedDates.includes(formattedDate)) {
      return {
        isValid: false,
        reason: 'Esta data está bloqueada para agendamentos'
      };
    }

    // Check for special hours first (overrides regular hours)
    const specialHour = specialHours.find(sh => sh.special_date === formattedDate);
    if (specialHour) {
      if (!specialHour.is_open) {
        return {
          isValid: false,
          reason: 'Barbearia fechada nesta data (horário especial)'
        };
      }

      const availableHours = {
        start: specialHour.open_time!,
        end: specialHour.close_time!,
        breakStart: specialHour.break_start || undefined,
        breakEnd: specialHour.break_end || undefined
      };

      // If no specific time provided, just return the hours
      if (!time) {
        return { isValid: true, availableHours };
      }

      // Validate specific time against special hours
      if (!isTimeInRange(time, availableHours.start, availableHours.end)) {
        return {
          isValid: false,
          reason: `Horário fora do expediente (${availableHours.start} - ${availableHours.end})`
        };
      }

      // Check if time is during break
      if (availableHours.breakStart && availableHours.breakEnd) {
        if (isTimeInRange(time, availableHours.breakStart, availableHours.breakEnd)) {
          return {
            isValid: false,
            reason: `Horário está no intervalo (${availableHours.breakStart} - ${availableHours.breakEnd})`
          };
        }
      }

      return { isValid: true, availableHours };
    }

    // Check regular business hours
    const businessHour = businessHours.find(bh => bh.day_of_week === dayOfWeek);
    
    if (!businessHour) {
      return {
        isValid: false,
        reason: 'Horário de funcionamento não configurado para este dia'
      };
    }

    if (!businessHour.is_open) {
      return {
        isValid: false,
        reason: 'Barbearia fechada neste dia da semana'
      };
    }

    const availableHours = {
      start: businessHour.open_time,
      end: businessHour.close_time,
      breakStart: businessHour.break_start || undefined,
      breakEnd: businessHour.break_end || undefined
    };

    // If no specific time provided, just return the hours
    if (!time) {
      return { isValid: true, availableHours };
    }

    // Validate specific time against business hours
    if (!isTimeInRange(time, availableHours.start, availableHours.end)) {
      return {
        isValid: false,
        reason: `Horário fora do expediente (${availableHours.start} - ${availableHours.end})`
      };
    }

    // Check if time is during break
    if (availableHours.breakStart && availableHours.breakEnd) {
      if (isTimeInRange(time, availableHours.breakStart, availableHours.breakEnd)) {
        return {
          isValid: false,
          reason: `Horário está no intervalo (${availableHours.breakStart} - ${availableHours.breakEnd})`
        };
      }
    }

    return { isValid: true, availableHours };
  };

  const generateTimeSlots = (date: Date): string[] => {
    const validation = validateDateTime(date);
    
    if (!validation.isValid || !validation.availableHours) {
      return [];
    }

    const slots: string[] = [];
    const { start, end, breakStart, breakEnd } = validation.availableHours;

    // Parse times
    const [startHour, startMinute] = start.split(':').map(Number);
    const [endHour, endMinute] = end.split(':').map(Number);
    
    let currentHour = startHour;
    let currentMinute = startMinute;

    // Generate slots in 30-minute intervals
    while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
      const timeString = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
      
      // Skip if in break period
      if (breakStart && breakEnd) {
        if (!isTimeInRange(timeString, breakStart, breakEnd)) {
          slots.push(timeString);
        }
      } else {
        slots.push(timeString);
      }

      // Increment by 30 minutes
      currentMinute += 30;
      if (currentMinute >= 60) {
        currentHour += 1;
        currentMinute = 0;
      }
    }

    return slots;
  };

  const isTimeInRange = (time: string, start: string, end: string): boolean => {
    return time >= start && time < end;
  };

  return {
    validateDateTime,
    generateTimeSlots,
    loading,
    refresh: loadValidationData
  };
};
