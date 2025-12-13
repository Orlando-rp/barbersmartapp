import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { 
  StandardDaySchedule, 
  DAY_OF_WEEK_MAP, 
  DayName,
  getScheduleForDay,
  businessHoursToStandard,
  DEFAULT_DAY_SCHEDULE
} from '@/types/schedule';

interface BusinessHoursDB {
  day_of_week: string;
  is_open: boolean;
  open_time: string;
  close_time: string;
  break_start: string | null;
  break_end: string | null;
}

interface SpecialHoursDB {
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

export const useBusinessHoursValidation = (
  barbershopId: string | null,
  allRelatedBarbershopIds?: string[],
  selectedUnitId?: string
) => {
  const [businessHours, setBusinessHours] = useState<BusinessHoursDB[]>([]);
  const [specialHours, setSpecialHours] = useState<SpecialHoursDB[]>([]);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [staffSchedules, setStaffSchedules] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  // Effective unit for schedule checking
  const effectiveUnitId = selectedUnitId || barbershopId;

  useEffect(() => {
    if (barbershopId) {
      loadValidationData();
    }
  }, [barbershopId, allRelatedBarbershopIds?.join(',')]);

  const loadValidationData = async () => {
    if (!barbershopId) return;

    try {
      setLoading(true);

      // Load business hours
      const { data: hoursData } = await supabase
        .from('business_hours')
        .select('*')
        .eq('barbershop_id', barbershopId);
      setBusinessHours(hoursData || []);

      // Load special hours
      const { data: specialData } = await supabase
        .from('special_hours')
        .select('*')
        .eq('barbershop_id', barbershopId);
      setSpecialHours(specialData || []);

      // Load blocked dates
      const { data: blockedData } = await supabase
        .from('blocked_dates')
        .select('blocked_date')
        .eq('barbershop_id', barbershopId);
      setBlockedDates((blockedData || []).map(b => b.blocked_date));

      // Load staff schedules
      const searchIds = allRelatedBarbershopIds?.length 
        ? allRelatedBarbershopIds 
        : [barbershopId];

      const { data: staffData } = await supabase
        .from('staff')
        .select('id, schedule')
        .in('barbershop_id', searchIds)
        .eq('active', true);
      
      const schedules: Record<string, any> = {};
      (staffData || []).forEach(staff => {
        schedules[staff.id] = staff.schedule;
      });
      setStaffSchedules(schedules);

    } catch (error) {
      console.error('Error loading validation data:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get staff schedule for a specific day using the standardized format
   */
  const getStaffDaySchedule = useCallback((
    staffId: string | undefined, 
    dayOfWeek: DayName
  ): StandardDaySchedule | null => {
    if (!staffId || !staffSchedules[staffId]) return null;
    
    const schedule = staffSchedules[staffId];
    return getScheduleForDay(schedule, dayOfWeek, effectiveUnitId || undefined);
  }, [staffSchedules, effectiveUnitId]);

  /**
   * Get business hours for a specific day
   */
  const getBusinessHoursForDay = useCallback((dayOfWeek: DayName): StandardDaySchedule | null => {
    const hours = businessHours.find(bh => bh.day_of_week === dayOfWeek);
    if (!hours) return null;
    return businessHoursToStandard(hours);
  }, [businessHours]);

  /**
   * Check if a time is within a range
   */
  const isTimeInRange = useCallback((time: string, start: string, end: string): boolean => {
    return time >= start && time < end;
  }, []);

  /**
   * Validate a date/time for appointment scheduling
   * Priority: Blocked dates > Special hours > Staff schedule > Business hours > Default
   */
  const validateDateTime = useCallback((
    date: Date, 
    time?: string, 
    staffId?: string
  ): ValidationResult => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    const dayOfWeek = DAY_OF_WEEK_MAP[date.getDay()];

    // PRIORITY 1: Check blocked dates
    if (blockedDates.includes(formattedDate)) {
      return {
        isValid: false,
        reason: 'Esta data está bloqueada para agendamentos'
      };
    }

    // PRIORITY 2: Check special hours (overrides everything)
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

      if (!time) {
        return { isValid: true, availableHours };
      }

      if (!isTimeInRange(time, availableHours.start, availableHours.end)) {
        return {
          isValid: false,
          reason: `Horário fora do expediente (${availableHours.start} - ${availableHours.end})`
        };
      }

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

    // PRIORITY 3: Check staff individual schedule
    const staffSchedule = getStaffDaySchedule(staffId, dayOfWeek);
    
    // PRIORITY 4: Fall back to business hours
    const businessHoursSchedule = getBusinessHoursForDay(dayOfWeek);
    
    // Determine effective schedule (staff > business > default)
    let effectiveSchedule: StandardDaySchedule;
    let isStaffSchedule = false;
    
    if (staffSchedule) {
      effectiveSchedule = staffSchedule;
      isStaffSchedule = true;
    } else if (businessHoursSchedule) {
      effectiveSchedule = businessHoursSchedule;
    } else {
      // Default: open M-S, closed Sunday
      effectiveSchedule = {
        ...DEFAULT_DAY_SCHEDULE,
        enabled: dayOfWeek !== 'sunday',
      };
    }

    // Check if working on this day
    if (!effectiveSchedule.enabled) {
      return {
        isValid: false,
        reason: isStaffSchedule 
          ? 'Este profissional não trabalha neste dia' 
          : 'Barbearia fechada neste dia da semana'
      };
    }

    const availableHours = {
      start: effectiveSchedule.start,
      end: effectiveSchedule.end,
      breakStart: effectiveSchedule.break_start || undefined,
      breakEnd: effectiveSchedule.break_end || undefined
    };

    if (!time) {
      return { isValid: true, availableHours };
    }

    // Validate specific time
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
  }, [blockedDates, specialHours, getStaffDaySchedule, getBusinessHoursForDay, isTimeInRange]);

  /**
   * Generate available time slots for a date
   */
  const generateTimeSlots = useCallback((
    date: Date, 
    serviceDurationMinutes: number = 30, 
    staffId?: string
  ): string[] => {
    const validation = validateDateTime(date, undefined, staffId);
    
    if (!validation.isValid || !validation.availableHours) {
      return [];
    }

    const slots: string[] = [];
    const { start, end, breakStart, breakEnd } = validation.availableHours;

    const [startHour, startMinute] = start.split(':').map(Number);
    const [endHour, endMinute] = end.split(':').map(Number);
    
    let currentHour = startHour;
    let currentMinute = startMinute;
    const endTimeInMinutes = endHour * 60 + endMinute;

    while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
      const timeString = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
      const slotStartMinutes = currentHour * 60 + currentMinute;
      const slotEndMinutes = slotStartMinutes + serviceDurationMinutes;
      
      // Check if service fits within schedule
      const serviceFitsInSchedule = slotEndMinutes <= endTimeInMinutes;
      
      // Check if slot is during break or would overlap with break
      let isInBreak = false;
      if (breakStart && breakEnd) {
        const [breakStartHour, breakStartMinute] = breakStart.split(':').map(Number);
        const [breakEndHour, breakEndMinute] = breakEnd.split(':').map(Number);
        const breakStartMinutes = breakStartHour * 60 + breakStartMinute;
        const breakEndMinutes = breakEndHour * 60 + breakEndMinute;
        
        // Slot starts during break
        if (slotStartMinutes >= breakStartMinutes && slotStartMinutes < breakEndMinutes) {
          isInBreak = true;
        }
        // Service would overlap with break
        else if (slotStartMinutes < breakStartMinutes && slotEndMinutes > breakStartMinutes) {
          isInBreak = true;
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
  }, [validateDateTime]);

  /**
   * Check if a proposed time slot overlaps with existing appointments
   */
  const checkTimeOverlap = useCallback((
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
        return true;
      }
    }

    return false;
  }, []);

  return {
    validateDateTime,
    generateTimeSlots,
    checkTimeOverlap,
    loading,
    refresh: loadValidationData
  };
};
