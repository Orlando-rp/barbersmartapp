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

interface StaffSchedule {
  [day: string]: {
    is_open: boolean;
    open_time: string;
    close_time: string;
    break_start: string | null;
    break_end: string | null;
  };
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
  const [staffSchedules, setStaffSchedules] = useState<Record<string, StaffSchedule | null>>({});
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
      try {
        const { data: hoursData, error: hoursError } = await supabase
          .from('business_hours')
          .select('*')
          .eq('barbershop_id', barbershopId);

        if (hoursError && !hoursError.message?.includes('does not exist')) {
          console.warn('Erro ao carregar business_hours:', hoursError);
        }
        setBusinessHours(hoursData || []);
      } catch (err) {
        console.warn('Tabela business_hours não disponível');
        setBusinessHours([]);
      }

      // Load special hours (table may not exist)
      try {
        const { data: specialData, error: specialError } = await supabase
          .from('special_hours')
          .select('*')
          .eq('barbershop_id', barbershopId);

        if (specialError && !specialError.message?.includes('does not exist')) {
          console.warn('Erro ao carregar special_hours:', specialError);
        }
        setSpecialHours(specialData || []);
      } catch (err) {
        console.warn('Tabela special_hours não disponível');
        setSpecialHours([]);
      }

      // Load blocked dates (table may not exist)
      try {
        const { data: blockedData, error: blockedError } = await supabase
          .from('blocked_dates')
          .select('blocked_date')
          .eq('barbershop_id', barbershopId);

        if (blockedError && !blockedError.message?.includes('does not exist')) {
          console.warn('Erro ao carregar blocked_dates:', blockedError);
        }
        setBlockedDates((blockedData || []).map(b => b.blocked_date));
      } catch (err) {
        console.warn('Tabela blocked_dates não disponível');
        setBlockedDates([]);
      }

      // Load staff schedules
      try {
        const { data: staffData, error: staffError } = await supabase
          .from('staff')
          .select('id, schedule')
          .eq('barbershop_id', barbershopId)
          .eq('active', true);

        if (staffError && !staffError.message?.includes('does not exist')) {
          console.warn('Erro ao carregar staff schedules:', staffError);
        }
        
        const schedules: Record<string, StaffSchedule | null> = {};
        (staffData || []).forEach(staff => {
          schedules[staff.id] = staff.schedule as StaffSchedule | null;
        });
        setStaffSchedules(schedules);
      } catch (err) {
        console.warn('Erro ao carregar horários do staff');
        setStaffSchedules({});
      }
    } catch (error) {
      console.error('Erro ao carregar dados de validação:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get staff schedule for a specific day
  const getStaffScheduleForDay = (staffId: string | undefined, dayOfWeek: string): BusinessHours | null => {
    if (!staffId || !staffSchedules[staffId]) return null;
    
    const schedule = staffSchedules[staffId];
    if (!schedule || !schedule[dayOfWeek]) return null;
    
    const daySchedule = schedule[dayOfWeek];
    return {
      day_of_week: dayOfWeek,
      is_open: daySchedule.is_open,
      open_time: daySchedule.open_time,
      close_time: daySchedule.close_time,
      break_start: daySchedule.break_start,
      break_end: daySchedule.break_end,
    };
  };

  const validateDateTime = (date: Date, time?: string, staffId?: string): ValidationResult => {
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

    // Check for individual staff schedule first (if staffId provided)
    const staffSchedule = getStaffScheduleForDay(staffId, dayOfWeek);
    
    // Use staff schedule if available, otherwise fall back to barbershop hours
    const effectiveHours = staffSchedule || businessHours.find(bh => bh.day_of_week === dayOfWeek);
    
    if (!effectiveHours) {
      return {
        isValid: false,
        reason: 'Horário de funcionamento não configurado para este dia'
      };
    }

    if (!effectiveHours.is_open) {
      return {
        isValid: false,
        reason: staffSchedule 
          ? 'Este profissional não trabalha neste dia' 
          : 'Barbearia fechada neste dia da semana'
      };
    }

    const availableHours = {
      start: effectiveHours.open_time,
      end: effectiveHours.close_time,
      breakStart: effectiveHours.break_start || undefined,
      breakEnd: effectiveHours.break_end || undefined
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

  const generateTimeSlots = (date: Date, serviceDurationMinutes: number = 30, staffId?: string): string[] => {
    const validation = validateDateTime(date, undefined, staffId);
    
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

    // Calculate end time in minutes for comparison
    const endTimeInMinutes = endHour * 60 + endMinute;

    // Generate slots in 30-minute intervals
    while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
      const timeString = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
      const slotStartMinutes = currentHour * 60 + currentMinute;
      const slotEndMinutes = slotStartMinutes + serviceDurationMinutes;
      
      // Check if service would end after business hours
      const serviceFitsInSchedule = slotEndMinutes <= endTimeInMinutes;
      
      // Check if slot is during break
      let isInBreak = false;
      if (breakStart && breakEnd) {
        isInBreak = isTimeInRange(timeString, breakStart, breakEnd);
        
        // Also check if service would overlap with break
        if (!isInBreak && serviceFitsInSchedule) {
          const [breakStartHour, breakStartMinute] = breakStart.split(':').map(Number);
          const [breakEndHour, breakEndMinute] = breakEnd.split(':').map(Number);
          const breakStartMinutes = breakStartHour * 60 + breakStartMinute;
          const breakEndMinutes = breakEndHour * 60 + breakEndMinute;
          
          // Service would overlap with break if it starts before break and ends during/after break start
          if (slotStartMinutes < breakStartMinutes && slotEndMinutes > breakStartMinutes) {
            isInBreak = true;
          }
        }
      }
      
      if (serviceFitsInSchedule && !isInBreak) {
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

  const checkTimeOverlap = (
    startTime: string,
    durationMinutes: number,
    bookedAppointments: { time: string; duration: number }[]
  ): boolean => {
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const slotStart = startHour * 60 + startMinute;
    const slotEnd = slotStart + durationMinutes;

    for (const booked of bookedAppointments) {
      const [bookedHour, bookedMinute] = booked.time.split(':').map(Number);
      const bookedStart = bookedHour * 60 + bookedMinute;
      const bookedEnd = bookedStart + booked.duration;

      // Check for any overlap
      if (slotStart < bookedEnd && slotEnd > bookedStart) {
        return true; // There is an overlap
      }
    }

    return false; // No overlap
  };

  return {
    validateDateTime,
    generateTimeSlots,
    checkTimeOverlap,
    loading,
    refresh: loadValidationData
  };
};
